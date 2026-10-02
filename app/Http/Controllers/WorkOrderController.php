<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWorkOrderRequest;
use App\Http\Requests\UpdateWorkOrderStatusRequest;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkOrderController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', WorkOrder::class);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:all,draft,active,in_progress,operational_completed,awaiting_completion_note,billing,completed,closed'],
        ]);
        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? 'all';
        $user = $request->user();

        $visibleWorkOrders = WorkOrder::query()
            ->when($user->isStaff(), fn ($query) => $query->where(function ($scope) use ($user) {
                $scope->where('assigned_to', $user->id)->orWhere('created_by', $user->id);
            }));

        $stats = (clone $visibleWorkOrders)
            ->selectRaw('COUNT(*) AS total')
            ->selectRaw("SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft")
            ->selectRaw("SUM(CASE WHEN status IN ('active', 'accepted', 'in_progress', 'operational_completed', 'completed') THEN 1 ELSE 0 END) AS active")
            ->selectRaw("SUM(CASE WHEN status = 'awaiting_completion_note' THEN 1 ELSE 0 END) AS awaiting_completion_note")
            ->selectRaw("SUM(CASE WHEN status = 'billing' THEN 1 ELSE 0 END) AS billing")
            ->selectRaw("SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed")
            ->first();

        $workOrders = (clone $visibleWorkOrders)
            ->with([
                'company:id,name',
                'ship:id,name,ship_company_id,imo_number,ship_type',
                'port:id,name',
                'creator:id,name',
                'assignee:id,name',
                'items:id,work_order_id,name,description',
                'portCall:id,work_order_id,job_number,status',
            ])
            ->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->when($search, fn ($query, $value) => $query->where(function ($scope) use ($value) {
                $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                $scope->where('system_number', $like, "%{$value}%")
                    ->orWhere('client_number', $like, "%{$value}%")
                    ->orWhereHas('ship', fn ($ship) => $ship->where('name', $like, "%{$value}%"))
                    ->orWhereHas('company', fn ($company) => $company->where('name', $like, "%{$value}%"));
            }))
            ->orderByDesc('received_at')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        $workOrders->getCollection()->each(function (WorkOrder $workOrder) use ($user): void {
            $nextStatus = $workOrder->nextStatus();
            $workOrder->setAttribute('next_status', $nextStatus);
            $workOrder->setAttribute(
                'can_transition',
                $nextStatus !== null && Gate::forUser($user)->allows('transition', [$workOrder, $nextStatus]),
            );
        });

        return Inertia::render('WorkOrders/Index', [
            'workOrders' => $workOrders,
            'stats' => [
                'total' => (int) ($stats?->total ?? 0),
                'draft' => (int) ($stats?->draft ?? 0),
                'active' => (int) ($stats?->active ?? 0),
                'awaiting_completion_note' => (int) ($stats?->awaiting_completion_note ?? 0),
                'billing' => (int) ($stats?->billing ?? 0),
                'closed' => (int) ($stats?->closed ?? 0),
            ],
            'filters' => ['search' => $search ?? '', 'status' => $status],
            'canCreate' => Gate::allows('create', WorkOrder::class),
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', WorkOrder::class);

        $user = $request->user();
        $assignees = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($query) => $query->whereIn('name', ['Admin', 'Admin Sistem', 'Lapangan', 'Tim Lapangan', 'Staf Operasional']))
            ->when($user->isStaff(), fn ($query) => $query->whereKey($user->id))
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('WorkOrders/Create', [
            'companies' => ShipCompany::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
            'ships' => Ship::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'ship_company_id', 'imo_number', 'ship_type', 'gross_tonnage']),
            'ports' => Port::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'city']),
            'assignees' => $assignees,
            'defaultAssigneeId' => $user->isStaff() ? $user->id : null,
            'canManageMasterVessels' => $user->isOwner() || $user->isOperationalAdmin(),
        ]);
    }

    public function store(StoreWorkOrderRequest $request): RedirectResponse
    {
        Gate::authorize('create', WorkOrder::class);
        $validated = $request->validated();

        $workOrder = DB::transaction(function () use ($request, $validated): WorkOrder {
            $documentPath = $request->file('document')?->store('sja/spk', 'local');
            $systemNumber = sprintf(
                'SPK-SJA-%s-%s',
                now()->format('ymd'),
                Str::upper(Str::random(6)),
            );

            $workOrder = WorkOrder::create([
                'system_number' => $systemNumber,
                'client_number' => $validated['client_number'] ?? null,
                'company_id' => $validated['company_id'],
                'document_date' => $validated['document_date'],
                'received_at' => $validated['received_at'],
                'source' => 'manual',
                'status' => $validated['status'],
                'document_path' => $documentPath,
                'client_pic_name' => $validated['client_pic_name'] ?? null,
                'client_pic_contact' => $validated['client_pic_contact'] ?? null,
                'created_by' => $request->user()->id,
                'assigned_to' => $validated['assigned_to'],
                'submitted_at' => $validated['status'] === 'active' ? now() : null,
                'planned_ship_id' => $validated['ship_id'],
                'planned_port_id' => $validated['port_id'],
                'planned_eta_at' => $validated['eta_at'],
                'planned_etd_at' => $validated['etd_at'] ?? null,
            ]);

            $workOrder->items()->create([
                'name' => $validated['activity_name'],
                'description' => $validated['activity_description'] ?? null,
            ]);

            PortCall::create([
                'job_number' => 'JOB-'.$workOrder->system_number,
                'work_order_id' => $workOrder->id,
                'ship_id' => $validated['ship_id'],
                'port_id' => $validated['port_id'],
                'status' => 'scheduled',
                'eta_at' => $validated['eta_at'],
                'etd_at' => $validated['etd_at'] ?? null,
                'financial_status' => 'pending_reconciliation',
            ]);

            activity('work-order')
                ->performedOn($workOrder)
                ->causedBy($request->user())
                ->withProperties(['status' => $validated['status'], 'assigned_to' => $validated['assigned_to']])
                ->log('SPK dan kunjungan kapal dibuat');

            return $workOrder;
        });

        return redirect()
            ->route('work-orders.index')
            ->with('success', "SPK {$workOrder->system_number} berhasil dibuat.");
    }

    public function updateStatus(UpdateWorkOrderStatusRequest $request, WorkOrder $workOrder): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($request, $workOrder, $validated): void {
            $lockedWorkOrder = WorkOrder::query()->lockForUpdate()->findOrFail($workOrder->id);

            if ($lockedWorkOrder->nextStatus() !== $validated['status']) {
                throw ValidationException::withMessages([
                    'status' => "SPK berstatus {$lockedWorkOrder->status} tidak dapat langsung menjadi {$validated['status']}.",
                ]);
            }

            Gate::authorize('transition', [$lockedWorkOrder, $validated['status']]);

            $oldStatus = $lockedWorkOrder->status;
            if ($validated['status'] === 'awaiting_completion_note') {
                $this->assertCanAwaitCompletionNote($lockedWorkOrder);
            }
            if ($validated['status'] === 'billing') {
                $this->assertCanStartBilling($lockedWorkOrder);
            }
            if ($validated['status'] === 'closed') {
                $this->assertCanClose($lockedWorkOrder);
            }
            $lockedWorkOrder->update([
                'status' => $validated['status'],
                'operational_completed_at' => $validated['status'] === 'operational_completed'
                    ? now()
                    : $lockedWorkOrder->operational_completed_at,
                'closed_at' => $validated['status'] === 'closed' ? now() : null,
                'revision_reason' => $validated['notes'] ?? $lockedWorkOrder->revision_reason,
                'reviewed_by' => $request->user()->isOperationalAdmin() || $request->user()->isOwner()
                    ? $request->user()->id
                    : $lockedWorkOrder->reviewed_by,
                'reviewed_at' => $request->user()->isOperationalAdmin() || $request->user()->isOwner()
                    ? now()
                    : $lockedWorkOrder->reviewed_at,
            ]);

            activity('work-order')
                ->performedOn($lockedWorkOrder)
                ->causedBy($request->user())
                ->withProperties(['from' => $oldStatus, 'to' => $validated['status'], 'notes' => $validated['notes'] ?? null])
                ->log('Status SPK diperbarui');
        });

        return back()->with('success', "Status {$workOrder->system_number} berhasil diperbarui.");
    }

    public function download(Request $request, WorkOrder $workOrder): StreamedResponse
    {
        Gate::authorize('view', $workOrder);
        abort_unless($workOrder->document_path && Storage::disk('local')->exists($workOrder->document_path), 404);

        return Storage::disk('local')->download($workOrder->document_path);
    }

    private function assertCanClose(WorkOrder $workOrder): void
    {
        $portCall = $workOrder->portCall()
            ->with(['completionNote', 'invoices', 'costDocuments', 'expenseRequests'])
            ->first();

        if (! $portCall || $portCall->status !== 'departed') {
            throw ValidationException::withMessages(['status' => 'Kegiatan belum dapat ditutup karena kapal belum berangkat.']);
        }
        if ($portCall->completionNote?->status !== 'reconciled' || ! $portCall->reconciled_at) {
            throw ValidationException::withMessages(['status' => 'Nota Rampung belum diverifikasi dan direkonsiliasi.']);
        }
        if ($portCall->costDocuments()->where('document_type', 'vendor_invoice')->where('payment_status', '!=', 'paid')->exists()) {
            throw ValidationException::withMessages(['status' => 'Masih ada invoice vendor yang belum dibayar penuh.']);
        }
        if (! $portCall->invoices()->exists() || $portCall->invoices()->where('status', '!=', 'paid')->exists()) {
            throw ValidationException::withMessages(['status' => 'Invoice klien belum dibuat atau belum lunas seluruhnya.']);
        }
        if ($portCall->expenseRequests()->whereNotIn('status', ['completed', 'rejected'])->exists()) {
            throw ValidationException::withMessages(['status' => 'Masih ada pengajuan pendanaan terbuka untuk kunjungan ini.']);
        }
        if ($portCall->requests()->whereNotIn('status', ['Selesai', 'Ditolak', 'Dibatalkan'])->exists()) {
            throw ValidationException::withMessages(['status' => 'Masih ada pengajuan operasional terbuka untuk kunjungan ini.']);
        }
    }

    private function assertCanAwaitCompletionNote(WorkOrder $workOrder): void
    {
        if ($workOrder->portCall()->value('status') !== 'departed') {
            throw ValidationException::withMessages([
                'status' => 'SPK baru dapat menunggu Nota Rampung setelah kapal tercatat berangkat.',
            ]);
        }
    }

    private function assertCanStartBilling(WorkOrder $workOrder): void
    {
        $portCall = $workOrder->portCall()->with('completionNote')->first();

        if (! $portCall || $portCall->completionNote?->status !== 'reconciled' || ! $portCall->reconciled_at) {
            throw ValidationException::withMessages([
                'status' => 'Penagihan baru dapat dimulai setelah Nota Rampung diverifikasi dan biaya direkonsiliasi.',
            ]);
        }
    }
}
