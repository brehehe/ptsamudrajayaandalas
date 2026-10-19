<?php

namespace App\Http\Controllers;

use App\Http\Requests\RequestReportIndexRequest;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Support\RequestReportPdfGenerator;
use App\Support\RequestReportXlsxGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class RequestReportController extends Controller
{
    public function index(RequestReportIndexRequest $request): Response
    {
        $validated = $request->validated();
        $from = CarbonImmutable::parse($validated['from'] ?? now()->startOfMonth()->toDateString());
        $to = CarbonImmutable::parse($validated['to'] ?? now()->endOfMonth()->toDateString());
        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? 'all';
        $companyId = $validated['company_id'] ?? null;
        $shipId = $validated['ship_id'] ?? null;
        $job = $validated['job'] ?? null;
        $sort = $validated['sort'] ?? 'date';
        $direction = $validated['direction'] ?? 'desc';
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $query = $this->filteredQuery($from, $to, $search, $status, $like, $companyId, $shipId, $job);

        $requestIds = (clone $query)->select('requests.id');
        $requestItemsQuery = RequestItem::query()->whereIn('request_id', $requestIds);
        $totalHpp = (float) (clone $requestItemsQuery)->sum(DB::raw('COALESCE(quantity, 0) * COALESCE(hpp_price, 0)'));

        $summary = [
            'total_requests' => (clone $query)->count(),
            'total_items' => (clone $requestItemsQuery)->count(),
            'total_hpp' => $totalHpp,
            'waiting_requests' => (clone $query)->whereIn('status', [
                'Menunggu Approval',
                'Menunggu Approval Direktur',
            ])->count(),
            'completed_requests' => (clone $query)->where('status', 'Selesai')->count(),
            'rejected_requests' => (clone $query)->whereIn('status', ['Ditolak', 'Dibatalkan'])->count(),
        ];

        $requests = $query
            ->with([
                'ship:id,name',
                'company:id,name',
                'port:id,name',
                'portCall:id,job_number',
                'creator:id,name',
                'items:id,request_id,quantity,hpp_price,director_status',
            ])
            ->orderBy($this->sortColumn($sort), $direction)
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ShipRequest $shipRequest): array => $this->reportRow($shipRequest));

        $companies = ShipCompany::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        $ships = Ship::query()
            ->with('company:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'ship_company_id']);

        $jobs = PortCall::query()
            ->latest('created_at')
            ->limit(100)
            ->get(['id', 'job_number', 'ship_id']);

        return Inertia::render('Reports/Requests', [
            'summary' => $summary,
            'requests' => $requests,
            'companies' => $companies,
            'ships' => $ships,
            'jobs' => $jobs,
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'search' => $search ?? '',
                'status' => $status,
                'company_id' => $companyId ?? '',
                'ship_id' => $shipId ?? '',
                'job' => $job ?? '',
                'sort' => $sort,
                'direction' => $direction,
            ],
            'can_export' => $this->canExport($request),
        ]);
    }

    public function export(
        RequestReportIndexRequest $request,
        RequestReportXlsxGenerator $xlsxGenerator,
    ): BinaryFileResponse {
        abort_unless($this->canExport($request), 403);

        $validated = $request->validated();
        $from = CarbonImmutable::parse($validated['from'] ?? now()->startOfMonth()->toDateString());
        $to = CarbonImmutable::parse($validated['to'] ?? now()->endOfMonth()->toDateString());
        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? 'all';
        $companyId = $validated['company_id'] ?? null;
        $shipId = $validated['ship_id'] ?? null;
        $job = $validated['job'] ?? null;
        $sort = $validated['sort'] ?? 'date';
        $direction = $validated['direction'] ?? 'desc';
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $requests = $this->filteredQuery($from, $to, $search, $status, $like, $companyId, $shipId, $job)
            ->with([
                'ship:id,name',
                'company:id,name',
                'port:id,name',
                'portCall:id,job_number',
                'creator:id,name',
                'items:id,request_id,item_name,quantity,hpp_price,director_status',
            ])
            ->orderBy($this->sortColumn($sort), $direction)
            ->orderByDesc('id')
            ->lazy(250);

        $path = $xlsxGenerator->generate($requests, [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'search' => $search ?? '',
            'status' => $status,
            'company_id' => $companyId ?? '',
            'ship_id' => $shipId ?? '',
            'job' => $job ?? '',
        ]);
        $filename = sprintf(
            'laporan-pengajuan-%s-sampai-%s.xlsx',
            $from->format('Y-m-d'),
            $to->format('Y-m-d'),
        );

        $response = response()->download($path, $filename, [
            'Content-Type' => RequestReportXlsxGenerator::contentType(),
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ])->deleteFileAfterSend(true);
        $response->setPrivate();
        $response->setMaxAge(0);
        $response->headers->addCacheControlDirective('no-store');

        return $response;
    }

    public function document(
        Request $request,
        ShipRequest $shipRequest,
        RequestReportPdfGenerator $pdfGenerator,
    ): HttpResponse {
        abort_unless(
            $request->user()?->can('reports.view')
                || $request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']),
            403,
        );
        Gate::authorize('view', $shipRequest);

        $filename = 'laporan-pengajuan-'.str($shipRequest->request_number)->slug('-').'.pdf';
        $disposition = $request->boolean('download') ? 'attachment' : 'inline';

        return response($pdfGenerator->generate($shipRequest), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** @return array<string, mixed> */
    private function reportRow(ShipRequest $shipRequest): array
    {
        $totalHpp = (float) $shipRequest->items->sum(
            fn (RequestItem $item): float => (float) $item->quantity * (float) $item->hpp_price,
        );
        $detailIdentifier = $shipRequest->portCall?->job_number ?: $shipRequest->request_number;

        return [
            'id' => $shipRequest->id,
            'request_number' => $shipRequest->request_number,
            'batch_number' => $shipRequest->batch_number,
            'request_date' => $shipRequest->request_date?->toDateString(),
            'service_type' => match ($shipRequest->service_type) {
                'clearance_in' => 'Clearance In',
                'clearance_out' => 'Clearance Out',
                default => $shipRequest->service_type ?: 'Kebutuhan Kapal',
            },
            'status' => $shipRequest->status,
            'ship_name' => $shipRequest->ship?->name ?? '-',
            'company_name' => $shipRequest->company?->name ?? '-',
            'port_name' => $shipRequest->port?->name ?? '-',
            'job_number' => $shipRequest->portCall?->job_number ?? '-',
            'creator_name' => $shipRequest->creator?->name ?? '-',
            'item_count' => $shipRequest->items->count(),
            'approved_item_count' => $shipRequest->items->where('director_status', 'approved')->count(),
            'total_hpp' => $totalHpp,
            'detail_url' => route('requests.detail', [
                'id' => $detailIdentifier,
                'req' => $shipRequest->id,
            ], false),
            'document_url' => route('reports.requests.document', $shipRequest, false),
        ];
    }

    private function filteredQuery(
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $search,
        string $status,
        string $like,
        ?string $companyId = null,
        ?string $shipId = null,
        ?string $job = null,
    ): Builder {
        return ShipRequest::query()
            ->whereDate('request_date', '>=', $from->toDateString())
            ->whereDate('request_date', '<=', $to->toDateString())
            ->when($status !== 'all', fn (Builder $builder) => $builder->where('status', $status))
            ->when($companyId, fn (Builder $builder) => $builder->where(function ($cq) use ($companyId): void {
                $cq->where('company_id', $companyId)
                    ->orWhereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId));
            }))
            ->when($shipId, fn (Builder $builder) => $builder->where('ship_id', $shipId))
            ->when($job, fn (Builder $builder) => $builder->whereHas('portCall', function (Builder $pq) use ($like, $job): void {
                $pq->where('job_number', $like, "%{$job}%");
                if (Str::isUuid($job)) {
                    $pq->orWhere('id', $job);
                }
            }))
            ->when($search, fn (Builder $builder) => $builder->where(function (Builder $searchQuery) use ($like, $search): void {
                $searchQuery->where('request_number', $like, "%{$search}%")
                    ->orWhere('batch_number', $like, "%{$search}%")
                    ->orWhere('service_type', $like, "%{$search}%")
                    ->orWhereHas('ship', fn (Builder $shipQuery) => $shipQuery->where('name', $like, "%{$search}%"))
                    ->orWhereHas('company', fn (Builder $companyQuery) => $companyQuery->where('name', $like, "%{$search}%"))
                    ->orWhereHas('portCall', fn (Builder $portCallQuery) => $portCallQuery->where('job_number', $like, "%{$search}%"))
                    ->orWhereHas('items', fn (Builder $itemQuery) => $itemQuery->where('item_name', $like, "%{$search}%"));
            }));
    }

    private function sortColumn(string $sort): string
    {
        return [
            'date' => 'request_date',
            'number' => 'request_number',
            'status' => 'status',
            'name' => 'service_type',
        ][$sort];
    }

    private function canExport(Request $request): bool
    {
        return ($request->user()?->can('reports.export') ?? false)
            || ($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']) ?? false);
    }
}
