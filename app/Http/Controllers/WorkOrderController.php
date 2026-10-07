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
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity as ActivityLog;
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

        // $visibleWorkOrders = WorkOrder::query()
        //     ->when($user->isStaff(), fn ($query) => $query->where(function ($scope) use ($user) {
        //         $scope->where('assigned_to', $user->id)->orWhere('created_by', $user->id);
        //     }));

        $visibleWorkOrders = WorkOrder::query();

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

    public function show(Request $request, WorkOrder $workOrder): Response
    {
        Gate::authorize('view', $workOrder);

        $user = $request->user();
        $canViewFinancial = $user->isOwner() || $user->isDirector() || $user->isOperationalAdmin();
        $relations = [
            'company:id,name,address,phone,email',
            'ship:id,name,imo_number,call_sign,flag,ship_type,gross_tonnage,image',
            'port:id,code,name,city,country',
            'creator:id,name',
            'assignee:id,name',
            'items:id,work_order_id,name,description',
            'portCall.ship:id,name,imo_number,ship_type,image',
            'portCall.port:id,code,name,city',
            'portCall.requests' => fn ($query) => $query->latest('created_at'),
            'portCall.requests.creator:id,name',
            'portCall.requests.items' => fn ($query) => $query->oldest('created_at'),
            'portCall.requests.items.vendor:id,name',
            'portCall.operationalActivities' => fn ($query) => $query
                ->latest('activity_date')
                ->latest('activity_time')
                ->limit(50),
            'portCall.operationalActivities.creator:id,name',
            'portCall.dailyReports' => fn ($query) => $query
                ->latest('report_date')
                ->latest('created_at')
                ->limit(30),
            'portCall.dailyReports.officer:id,name',
        ];

        if ($canViewFinancial) {
            $relations = [
                ...$relations,
                'portCall.expenseRequests' => fn ($query) => $query->latest('created_at'),
                'portCall.expenseRequests.fundingRequest',
                'portCall.costDocuments' => fn ($query) => $query->latest('received_date'),
                'portCall.costDocuments.vendor:id,name',
                'portCall.outgoingPayments' => fn ($query) => $query->latest('payment_date'),
                'portCall.invoices' => fn ($query) => $query->latest('invoice_date'),
                'portCall.completionNote',
                'portCall.costReconciliation',
            ];
        }

        $workOrder->load($relations);
        $portCall = $workOrder->portCall;
        $shipRequests = $portCall?->requests ?? collect();
        $operationalActivities = $portCall?->operationalActivities ?? collect();
        $dailyReports = $portCall?->dailyReports ?? collect();

        return Inertia::render('WorkOrders/Show', [
            'workOrder' => [
                'id' => $workOrder->id,
                'system_number' => $workOrder->system_number,
                'client_number' => $workOrder->client_number,
                'document_date' => $workOrder->document_date,
                'received_at' => $workOrder->received_at,
                'source' => $workOrder->source,
                'status' => $workOrder->status,
                'revision_reason' => $workOrder->revision_reason,
                'submitted_at' => $workOrder->submitted_at,
                'reviewed_at' => $workOrder->reviewed_at,
                'planned_eta_at' => $workOrder->planned_eta_at,
                'planned_etd_at' => $workOrder->planned_etd_at,
                'operational_completed_at' => $workOrder->operational_completed_at,
                'closed_at' => $workOrder->closed_at,
                'document_url' => $workOrder->document_path
                    ? route('work-orders.document', $workOrder)
                    : null,
                'company' => $workOrder->company,
                'ship' => $workOrder->ship,
                'port' => $workOrder->port,
                'creator' => $workOrder->creator,
                'assignee' => $workOrder->assignee,
                'items' => $workOrder->items,
                'port_call' => $portCall ? [
                    'id' => $portCall->id,
                    'job_number' => $portCall->job_number,
                    'status' => $portCall->status,
                    'financial_status' => $portCall->financial_status,
                    'eta_at' => $portCall->eta_at,
                    'etd_at' => $portCall->etd_at,
                    'arrived_at' => $portCall->arrived_at,
                    'berthed_at' => $portCall->berthed_at,
                    'departed_at' => $portCall->departed_at,
                    'reconciled_at' => $portCall->reconciled_at,
                ] : null,
            ],
            'requests' => $shipRequests->map(fn ($shipRequest) => [
                'id' => $shipRequest->id,
                'request_number' => $shipRequest->request_number,
                'service_type' => $shipRequest->service_type,
                'status' => $shipRequest->status,
                'request_date' => $shipRequest->request_date,
                'requested_port_call_status' => $shipRequest->requested_port_call_status,
                'completed_at' => $shipRequest->completed_at,
                'creator' => $shipRequest->creator,
                'items' => $shipRequest->items->map(fn ($item) => [
                    'id' => $item->id,
                    'item_name' => $item->item_name,
                    'quantity' => $item->quantity,
                    'unit' => $item->unit,
                    'status' => $item->status,
                    'director_status' => $item->director_status,
                    'is_urgent' => $item->is_urgent,
                    'vendor' => $item->vendor,
                ])->values(),
            ])->values(),
            'operationalActivities' => $operationalActivities->map(fn ($activity) => [
                'id' => $activity->id,
                'activity_date' => $activity->activity_date,
                'activity_time' => $activity->activity_time,
                'category' => $activity->category,
                'title' => $activity->title,
                'detail' => $activity->detail,
                'location_name' => $activity->location_name,
                'vessel_position' => $activity->vessel_position,
                'creator' => $activity->creator,
            ])->values(),
            'dailyReports' => $dailyReports->map(fn ($report) => [
                'id' => $report->id,
                'report_date' => $report->report_date,
                'status' => $report->status,
                'no_activity' => $report->no_activity,
                'summary' => $report->summary,
                'submitted_at' => $report->submitted_at,
                'officer' => $report->officer,
            ])->values(),
            'financial' => $canViewFinancial && $portCall ? [
                'expense_requests' => $portCall->expenseRequests->map(fn ($expenseRequest) => [
                    'id' => $expenseRequest->id,
                    'request_number' => $expenseRequest->request_number,
                    'status' => $expenseRequest->status,
                    'total' => $expenseRequest->total,
                    'funding_status' => $expenseRequest->fundingRequest?->status,
                ])->values(),
                'vendor_invoices' => $portCall->costDocuments
                    ->where('document_type', 'vendor_invoice')
                    ->map(fn ($costDocument) => [
                        'id' => $costDocument->id,
                        'document_number' => $costDocument->document_number,
                        'vendor_name' => $costDocument->vendor?->name ?? $costDocument->issuer_name,
                        'status' => $costDocument->status,
                        'payment_status' => $costDocument->payment_status,
                        'verified_total' => $costDocument->verified_total,
                    ])->values(),
                'outgoing_payments' => $portCall->outgoingPayments->map(fn ($payment) => [
                    'id' => $payment->id,
                    'payment_type' => $payment->payment_type,
                    'recipient' => $payment->recipient,
                    'amount' => $payment->amount,
                    'verification_status' => $payment->verification_status,
                    'payment_date' => $payment->payment_date,
                ])->values(),
                'client_invoices' => $portCall->invoices->map(fn ($invoice) => [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'invoice_type' => $invoice->invoice_type,
                    'status' => $invoice->status,
                    'grand_total' => $invoice->grand_total,
                    'outstanding_amount' => $invoice->outstanding_amount,
                ])->values(),
                'completion_note' => $portCall->completionNote,
                'reconciliation' => $portCall->costReconciliation,
            ] : null,
            'counts' => [
                'requests' => $shipRequests->count(),
                'request_items' => $shipRequests->sum(fn ($shipRequest) => $shipRequest->items->count()),
                'activities' => $operationalActivities->count(),
                'daily_reports' => $dailyReports->count(),
                'vendor_invoices' => $canViewFinancial && $portCall
                    ? $portCall->costDocuments->where('document_type', 'vendor_invoice')->count()
                    : null,
                'funding_requests' => $canViewFinancial && $portCall
                    ? $portCall->expenseRequests->count()
                    : null,
                'client_invoices' => $canViewFinancial && $portCall
                    ? $portCall->invoices->count()
                    : null,
            ],
            'history' => $this->buildHistory($workOrder, $portCall),
            'capabilities' => [
                'can_view_financial' => $canViewFinancial,
            ],
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
                ->get(['id', 'name', 'ship_company_id', 'imo_number', 'ship_type', 'gross_tonnage', 'image']),
            'ports' => Port::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'city']),
            'assignees' => $assignees,
            'defaultAssigneeId' => $user->isStaff() ? $user->id : null,
            'canManageMasterVessels' => $user->isOperationalAdmin(),
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
                'reviewed_by' => $request->user()->isOperationalAdmin()
                    ? $request->user()->id
                    : $lockedWorkOrder->reviewed_by,
                'reviewed_at' => $request->user()->isOperationalAdmin()
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

    /**
     * @return Collection<int, array{id: string, type: string, title: string, description: ?string, status: ?string, actor: ?string, occurred_at: string}>
     */
    private function buildHistory(WorkOrder $workOrder, ?PortCall $portCall): Collection
    {
        $history = collect([
            [
                'id' => "work-order-{$workOrder->id}",
                'type' => 'spk',
                'title' => 'SPK dibuat',
                'description' => $workOrder->system_number,
                'status' => 'created',
                'actor' => $workOrder->creator?->name,
                'occurred_at' => $workOrder->created_at->toIso8601String(),
            ],
        ]);

        ActivityLog::query()
            ->with('causer')
            ->where('subject_type', WorkOrder::class)
            ->where('subject_id', (string) $workOrder->id)
            ->where('description', '!=', 'SPK dan kunjungan kapal dibuat')
            ->oldest('created_at')
            ->get()
            ->each(function (ActivityLog $activity) use ($history): void {
                $from = $activity->properties->get('from');
                $to = $activity->properties->get('to');
                $description = $from && $to ? "{$from} → {$to}" : null;

                $history->push([
                    'id' => "activity-log-{$activity->id}",
                    'type' => 'status',
                    'title' => $activity->description,
                    'description' => $description,
                    'status' => is_string($to) ? $to : null,
                    'actor' => $activity->causer?->name,
                    'occurred_at' => $activity->created_at->toIso8601String(),
                ]);
            });

        if (! $portCall) {
            return $history->sortByDesc('occurred_at')->values();
        }

        $history->push([
            'id' => "port-call-{$portCall->id}",
            'type' => 'kunjungan',
            'title' => 'Kunjungan kapal dibuat',
            'description' => $portCall->job_number,
            'status' => $portCall->status,
            'actor' => null,
            'occurred_at' => $portCall->created_at->toIso8601String(),
        ]);

        collect([
            ['key' => 'arrived', 'title' => 'Kapal tiba', 'date' => $portCall->arrived_at],
            ['key' => 'berthed', 'title' => 'Kapal sandar', 'date' => $portCall->berthed_at],
            ['key' => 'departed', 'title' => 'Kapal berangkat', 'date' => $portCall->departed_at],
        ])->each(function (array $event) use ($history, $portCall): void {
            if (! $event['date']) {
                return;
            }

            $history->push([
                'id' => "port-call-{$portCall->id}-{$event['key']}",
                'type' => 'kunjungan',
                'title' => $event['title'],
                'description' => $portCall->job_number,
                'status' => $event['key'],
                'actor' => null,
                'occurred_at' => $event['date']->toIso8601String(),
            ]);
        });

        $portCall->requests->each(function ($shipRequest) use ($history): void {
            $history->push([
                'id' => "request-{$shipRequest->id}",
                'type' => 'kebutuhan',
                'title' => 'Pengajuan kebutuhan dibuat',
                'description' => $shipRequest->request_number,
                'status' => $shipRequest->status,
                'actor' => $shipRequest->creator?->name,
                'occurred_at' => $shipRequest->created_at->toIso8601String(),
            ]);
        });

        $portCall->operationalActivities->each(function ($activity) use ($history): void {
            $history->push([
                'id' => "operational-activity-{$activity->id}",
                'type' => 'aktivitas',
                'title' => $activity->title,
                'description' => $activity->category,
                'status' => $activity->vessel_position,
                'actor' => $activity->creator?->name,
                'occurred_at' => $activity->created_at->toIso8601String(),
            ]);
        });

        $portCall->dailyReports->each(function ($report) use ($history): void {
            $history->push([
                'id' => "daily-report-{$report->id}",
                'type' => 'laporan',
                'title' => 'Laporan harian dicatat',
                'description' => $report->summary,
                'status' => $report->status,
                'actor' => $report->officer?->name,
                'occurred_at' => ($report->submitted_at ?? $report->created_at)->toIso8601String(),
            ]);
        });

        if ($portCall->relationLoaded('completionNote') && $portCall->completionNote) {
            $completionNote = $portCall->completionNote;
            $history->push([
                'id' => "completion-note-{$completionNote->id}",
                'type' => 'nota',
                'title' => 'Nota Rampung dicatat',
                'description' => $completionNote->document_number,
                'status' => $completionNote->status,
                'actor' => null,
                'occurred_at' => ($completionNote->uploaded_at ?? $completionNote->created_at)->toIso8601String(),
            ]);
        }

        if ($portCall->relationLoaded('costDocuments')) {
            $portCall->costDocuments
                ->where('document_type', 'vendor_invoice')
                ->each(function ($costDocument) use ($history): void {
                    $history->push([
                        'id' => "vendor-invoice-{$costDocument->id}",
                        'type' => 'keuangan',
                        'title' => 'Invoice vendor diterima',
                        'description' => $costDocument->document_number,
                        'status' => $costDocument->payment_status,
                        'actor' => null,
                        'occurred_at' => $costDocument->created_at->toIso8601String(),
                    ]);
                });
        }

        if ($portCall->relationLoaded('invoices')) {
            $portCall->invoices->each(function ($invoice) use ($history): void {
                $history->push([
                    'id' => "client-invoice-{$invoice->id}",
                    'type' => 'keuangan',
                    'title' => 'Invoice klien dibuat',
                    'description' => $invoice->invoice_number,
                    'status' => $invoice->status,
                    'actor' => null,
                    'occurred_at' => $invoice->created_at->toIso8601String(),
                ]);
            });
        }

        return $history
            ->filter(fn (array $event) => filled($event['occurred_at']))
            ->sortByDesc('occurred_at')
            ->values();
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
