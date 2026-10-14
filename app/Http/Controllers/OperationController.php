<?php

namespace App\Http\Controllers;

use App\Actions\ResolveClearanceProduct;
use App\Http\Requests\StoreOperationalActivityRequest;
use App\Http\Requests\UpdatePortCallStatusRequest;
use App\Models\DailyReport;
use App\Models\OperationalActivity;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Product;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Support\WorkflowNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OperationController extends Controller
{
    public function __construct(
        private readonly ResolveClearanceProduct $resolveClearanceProduct,
        private readonly WorkflowNotifier $workflowNotifier,
    ) {}

    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'aktivitas'); // 'aktivitas' | 'kunjungan' | 'laporan'
        $search = $request->query('search');
        $companyId = $request->query('company_id');
        $shipId = $request->query('ship_id');
        $jobNumber = $request->query('job');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $portCallsQuery = PortCall::query()
            ->with(['ship.company', 'port', 'workOrder', 'dailyReports.officer'])
            ->orderByDesc('created_at');

        $dailyReportsQuery = DailyReport::query()
            ->with(['portCall.ship', 'portCall.port', 'officer'])
            ->orderByDesc('report_date')
            ->orderByDesc('created_at');

        $operationalActivitiesQuery = OperationalActivity::with(['ship.company', 'creator', 'request.portCall'])
            ->orderByDesc('activity_date')
            ->orderByDesc('activity_time')
            ->orderByDesc('created_at');

        if ($companyId) {
            $portCallsQuery->whereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId));
            $dailyReportsQuery->whereHas('portCall.ship', fn ($sq) => $sq->where('ship_company_id', $companyId));
            $operationalActivitiesQuery->whereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId));
        }

        if ($shipId) {
            $portCallsQuery->where('ship_id', $shipId);
            $dailyReportsQuery->whereHas('portCall', fn ($pq) => $pq->where('ship_id', $shipId));
            $operationalActivitiesQuery->where('ship_id', $shipId);
        }

        if ($jobNumber) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $portCallsQuery->where('job_number', $like, "%{$jobNumber}%");
            $dailyReportsQuery->whereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$jobNumber}%"));
            $operationalActivitiesQuery->whereHas('request.portCall', fn ($pq) => $pq->where('job_number', $like, "%{$jobNumber}%"));
        }

        if ($startDate) {
            $portCallsQuery->whereDate('created_at', '>=', $startDate);
            $dailyReportsQuery->whereDate('report_date', '>=', $startDate);
            $operationalActivitiesQuery->whereDate('activity_date', '>=', $startDate);
        }

        if ($endDate) {
            $portCallsQuery->whereDate('created_at', '<=', $endDate);
            $dailyReportsQuery->whereDate('report_date', '<=', $endDate);
            $operationalActivitiesQuery->whereDate('activity_date', '<=', $endDate);
        }

        if ($search) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $portCallsQuery->where(function ($q) use ($search, $like) {
                $q->where('job_number', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('port', fn ($pq) => $pq->where('name', $like, "%{$search}%"));
            });

            $dailyReportsQuery->where(function ($q) use ($search, $like) {
                $q->where('summary', $like, "%{$search}%")
                    ->orWhereHas('portCall.ship', fn ($sq) => $sq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('officer', fn ($oq) => $oq->where('name', $like, "%{$search}%"));
            });

            $operationalActivitiesQuery->where(function ($q) use ($search, $like) {
                $q->where('activity_name', $like, "%{$search}%")
                    ->orWhere('description', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', $like, "%{$search}%"));
            });
        }

        $portCalls = $portCallsQuery->get();
        $dailyReports = $dailyReportsQuery->get();
        $operationalActivities = $operationalActivitiesQuery->get();
        $ships = Ship::where('is_active', true)->orderBy('name')->get();
        $companies = ShipCompany::where('is_active', true)->orderBy('name')->get();
        $ports = Port::where('is_active', true)->orderBy('name')->get();
        $requests = ShipRequest::with('ship')
            ->whereIn('status', ['Menunggu Approval', 'Dalam Proses', 'Selesai', 'Draft'])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Operations/Index', [
            'portCalls' => $portCalls,
            'dailyReports' => $dailyReports,
            'operationalActivities' => $operationalActivities,
            'ships' => $ships,
            'companies' => $companies,
            'requests' => $requests,
            'ports' => $ports,
            'counts' => [
                'kunjungan' => PortCall::count(),
                'laporan' => DailyReport::count(),
                'aktivitas' => OperationalActivity::count(),
                'berthed' => PortCall::where('status', 'berthed')->count(),
                'anchored' => PortCall::where('status', 'anchored')->count(),
            ],
            'activeTab' => $tab,
            'search' => $search ?? '',
            'filters' => [
                'search' => $search ?? '',
                'company_id' => $companyId ?? '',
                'ship_id' => $shipId ?? '',
                'job' => $jobNumber ?? '',
                'start_date' => $startDate ?? '',
                'end_date' => $endDate ?? '',
            ],
        ]);
    }

    public function storeActivity(StoreOperationalActivityRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $isVesselRelated = (bool) $validated['is_vessel_related'];
        $usesCustomCategory = in_array(
            $validated['category'] ?? null,
            ['Lainnya', 'Aktivitas Lainnya'],
            true,
        );

        $photoPaths = [];
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $file) {
                $path = $file->store('activities', 'public');
                $photoPaths[] = '/storage/'.$path;
            }
        }

        OperationalActivity::create([
            'activity_date' => $validated['activity_date'],
            'activity_time' => $validated['activity_time'] ?? now()->format('H:i'),
            'location_name' => $validated['location_name'],
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'is_vessel_related' => $isVesselRelated,
            'ship_id' => $isVesselRelated ? ($validated['ship_id'] ?? null) : null,
            'port_call_id' => $isVesselRelated ? ($validated['port_call_id'] ?? null) : null,
            'request_id' => $isVesselRelated ? ($validated['request_id'] ?? null) : null,
            'category' => $usesCustomCategory
                ? $validated['category_other']
                : ($validated['category'] ?? 'Kegiatan Kapal'),
            'title' => $validated['title'],
            'detail' => $validated['detail'],
            'photos' => $photoPaths,
            'created_by' => $request->user()?->id,
            'vessel_position' => $isVesselRelated ? ($validated['vessel_position'] ?? null) : null,
            'cargo_activity' => $validated['cargo_activity'] ?? null,
            'cargo_quantity' => $validated['cargo_quantity'] ?? null,
            'cargo_unit' => $validated['cargo_unit'] ?? null,
            'progress_percent' => $validated['progress_percent'] ?? null,
            'constraints' => $validated['constraints'] ?? null,
            'next_plan' => $validated['next_plan'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Aktivitas lapangan berhasil dicatat.');
    }

    public function storeDailyReport(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'port_call_id' => ['required', 'exists:port_calls,id'],
            'report_date' => ['required', 'date'],
            'summary' => ['required', 'string', 'min:5', 'max:2000'],
            'no_activity' => ['nullable', 'boolean'],
        ]);

        DailyReport::create([
            'port_call_id' => $validated['port_call_id'],
            'officer_id' => $request->user()->id,
            'report_date' => $validated['report_date'],
            'summary' => $validated['summary'],
            'no_activity' => $validated['no_activity'] ?? false,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Laporan harian lapangan berhasil dikirim.');
    }

    public function updateStatus(UpdatePortCallStatusRequest $request, string $id): RedirectResponse
    {
        $validated = $request->validated();

        return DB::transaction(function () use ($request, $validated, $id): RedirectResponse {
            $portCall = PortCall::lockForUpdate()->findOrFail($id);
            Gate::authorize('updateStatus', $portCall);
            $previousStatus = $portCall->status;
            $nextStatus = $validated['status'];
            $transitions = [
                'scheduled' => ['anchored', 'berthed'],
                'anchored' => ['berthed', 'departed'],
                'berthed' => ['anchored', 'departed'],
                'departed' => ['completed'],
            ];

            if (($validated['expected_status'] ?? $previousStatus) !== $previousStatus
                || ! in_array($nextStatus, $transitions[$previousStatus] ?? [], true)) {
                throw ValidationException::withMessages(['status' => 'Status kunjungan sudah berubah atau transisi tidak diizinkan. Muat ulang halaman.']);
            }

            if ($previousStatus === 'scheduled' && ($reason = $portCall->clearanceInBlockReason())) {
                throw ValidationException::withMessages(['status' => $reason]);
            }

            $occurredAt = isset($validated['occurred_at'])
                ? Carbon::parse($validated['occurred_at'])->setTimezone(config('app.timezone'))
                : now();
            $lastEventAt = $portCall->berthed_at ?? $portCall->arrived_at;
            if ($lastEventAt && $occurredAt->lt($lastEventAt)) {
                throw ValidationException::withMessages(['occurred_at' => 'Tanggal kejadian tidak boleh mendahului kedatangan atau sandar terakhir.']);
            }

            if ($previousStatus === 'scheduled' || $nextStatus === 'departed') {
                if ($nextStatus === 'departed') {
                    $portCall->update(['completion_note_due_at' => $validated['completion_note_due_at'] ?? $portCall->completion_note_due_at]);
                }

                return $this->submitClearanceRequest(
                    $request,
                    $portCall,
                    $previousStatus,
                    $nextStatus,
                    $occurredAt,
                );
            }

            $updateData = ['status' => $nextStatus];
            if ($nextStatus === 'berthed') {
                $updateData['berthed_at'] = $occurredAt;
            }

            $portCall->update($updateData);
            $shipStatus = match ($nextStatus) {
                'anchored' => 'Labuh',
                'berthed' => 'Sandar',
                default => 'Selesai',
            };
            $portCall->ship()->update(['status' => $shipStatus]);

            activity('clearance')->performedOn($portCall)->causedBy($request->user())
                ->withProperties(['from' => $previousStatus, 'to' => $nextStatus, 'occurred_at' => $occurredAt->toIso8601String()])
                ->log('Status operasional kunjungan diperbarui');

            return redirect()->back()->with('success', "Status kunjungan {$portCall->job_number} diperbarui menjadi {$shipStatus}.");
        });
    }

    private function submitClearanceRequest(
        Request $request,
        PortCall $portCall,
        string $previousStatus,
        string $nextStatus,
        Carbon $occurredAt,
    ): RedirectResponse {
        $isClearanceIn = $previousStatus === 'scheduled';
        $serviceType = $isClearanceIn ? 'clearance_in' : 'clearance_out';
        $label = $isClearanceIn ? 'Clearance In' : 'Clearance Out';

        $activeRequest = ShipRequest::where('port_call_id', $portCall->id)
            ->where('service_type', $serviceType)
            ->whereNotIn('status', ['Ditolak', 'Dibatalkan'])
            ->first();

        if ($activeRequest) {
            return redirect()->back()->with('error', "Pengajuan {$label} {$activeRequest->request_number} masih berstatus {$activeRequest->status}.");
        }

        $clearanceRequest = ShipRequest::create([
            'request_number' => sprintf(
                $isClearanceIn ? 'REQ-CIN-%s-%04d' : 'REQ-COUT-%s-%04d',
                date('y'),
                ShipRequest::count() + 1,
            ),
            'ship_id' => $portCall->ship_id,
            'company_id' => $portCall->ship?->ship_company_id,
            'port_id' => $portCall->port_id,
            'port_call_id' => $portCall->id,
            'service_type' => $serviceType,
            'requested_port_call_status' => $nextStatus,
            'operational_occurred_at' => $occurredAt,
            'created_by' => $request->user()->id,
            'status' => 'Menunggu Approval',
            'request_date' => now()->toDateString(),
            'notes' => "Pengajuan {$label} untuk kapal {$portCall->ship?->name} ({$portCall->job_number})",
        ]);

        $this->createClearanceRequestItems($clearanceRequest, $serviceType, $nextStatus, $label);

        $this->workflowNotifier->notifyClearanceSubmission($clearanceRequest, $request->user(), $label);

        activity('clearance')->performedOn($portCall)->causedBy($request->user())
            ->withProperties([
                'from' => $previousStatus,
                'requested_to' => $nextStatus,
                'occurred_at' => $occurredAt->toIso8601String(),
                'request_id' => $clearanceRequest->id,
            ])
            ->log("Pengajuan {$label} dibuat");

        return redirect()->back()->with(
            'success',
            "Pengajuan {$label} {$portCall->job_number} berhasil dibuat.",
        );
    }

    private function createClearanceRequestItems(
        ShipRequest $clearanceRequest,
        string $serviceType,
        string $nextStatus,
        string $label,
    ): void {
        if ($serviceType === 'clearance_in' && $nextStatus === 'berthed') {
            $products = Product::query()
                ->whereIn('code', ['PRD-PLD-TAKTIS', 'PRD-PLD-EPB'])
                ->where('is_active', true)
                ->get()
                ->keyBy('code');

            foreach ([
                ['code' => 'PRD-PLD-TAKTIS', 'name' => 'Taktis Penyandaran'],
                ['code' => 'PRD-PLD-EPB', 'name' => 'Pembayaran EPB (Pandu Tunda)'],
            ] as $definition) {
                $product = $products->get($definition['code']);

                RequestItem::create([
                    'request_id' => $clearanceRequest->id,
                    'product_id' => $product?->id,
                    'vendor_id' => $product?->vendor_id,
                    'item_type' => $product?->item_type ?? 'jasa',
                    'item_name' => $definition['name'],
                    'unit' => $product?->unit ?? 'Kegiatan',
                    'quantity' => 1,
                    'required_date' => now()->toDateString(),
                    'hpp_price' => $product?->hpp_default ?? 0,
                    'selling_price' => 0,
                    'is_urgent' => true,
                    'status' => 'pending',
                    'director_status' => 'pending',
                ]);
            }

            return;
        }

        $product = $this->resolveClearanceProduct->handle($serviceType);
        RequestItem::create([
            'request_id' => $clearanceRequest->id,
            'product_id' => $product?->id,
            'vendor_id' => $product?->vendor_id,
            'item_type' => 'jasa',
            'item_name' => "{$label} (Syahbandar & Karantina)",
            'unit' => 'Dokumen',
            'quantity' => 1,
            'required_date' => now()->toDateString(),
            'hpp_price' => $product?->hpp_default ?? 0,
            'selling_price' => 0,
            'is_urgent' => true,
            'status' => 'pending',
            'director_status' => 'pending',
        ]);
    }
}
