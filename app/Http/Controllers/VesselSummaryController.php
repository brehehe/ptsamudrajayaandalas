<?php

namespace App\Http\Controllers;

use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Support\ReportExportManager;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class VesselSummaryController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:100'],
            'company_id' => ['nullable', 'string'],
            'ship_id' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'sort' => ['nullable', 'string'],
            'all_time' => ['nullable'],
        ]);

        $isAllTime = filter_var($validated['all_time'] ?? false, FILTER_VALIDATE_BOOLEAN)
            || ($validated['from'] ?? null) === 'all';

        $from = $isAllTime
            ? CarbonImmutable::parse('2020-01-01')->startOfDay()
            : CarbonImmutable::parse($validated['from'] ?? now()->startOfMonth()->toDateString())->startOfDay();

        $to = $isAllTime
            ? CarbonImmutable::parse('2035-12-31')->endOfDay()
            : CarbonImmutable::parse($validated['to'] ?? now()->endOfMonth()->toDateString())->endOfDay();

        $search = $validated['search'] ?? null;
        $companyId = $validated['company_id'] ?? null;
        $shipId = $validated['ship_id'] ?? null;
        $status = $validated['status'] ?? 'all';
        $sort = $validated['sort'] ?? 'margin_desc';

        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        // Retrieve active ships with filtered port calls
        $shipsQuery = Ship::query()
            ->with([
                'company:id,name',
                'port:id,name',
                'portCalls' => function ($pq) use ($from, $to, $isAllTime) {
                    if (! $isAllTime) {
                        $pq->where(function ($sub) use ($from, $to) {
                            $sub->whereBetween('created_at', [$from, $to])
                                ->orWhereBetween('eta_at', [$from->toDateString(), $to->toDateString()]);
                        });
                    }
                    $pq->with([
                        'port:id,name',
                        'invoices' => fn ($iq) => $iq->whereIn('status', ['released', 'sent', 'paid']),
                        'requests.items' => fn ($itq) => $itq->where('director_status', 'approved'),
                        'outgoingPayments' => fn ($opq) => $opq->where('verification_status', 'verified'),
                    ])->orderByDesc('created_at');
                },
            ])
            ->where('is_active', true);

        if ($companyId) {
            $shipsQuery->where('ship_company_id', $companyId);
        }

        if ($shipId) {
            $shipsQuery->where('id', $shipId);
        }

        if ($search) {
            $shipsQuery->where(function ($sq) use ($like, $search): void {
                $sq->where('name', $like, "%{$search}%")
                    ->orWhere('call_sign', $like, "%{$search}%")
                    ->orWhere('imo_number', $like, "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"));
            });
        }

        $allShips = $shipsQuery->orderBy('name')->get();

        $vesselsList = [];
        $fleetRevenue = 0.0;
        $fleetAgency = 0.0;
        $fleetReimburse = 0.0;
        $fleetPaid = 0.0;
        $fleetOutstanding = 0.0;
        $fleetExpense = 0.0;
        $fleetTotalJobs = 0;
        $activeVesselsInPeriod = 0;

        foreach ($allShips as $ship) {
            /** @var Collection<int, PortCall> $calls */
            $calls = $ship->portCalls;
            $callsCount = $calls->count();

            // Status filter check
            if ($status !== 'all' && $status !== '') {
                $latestCallStatus = $calls->first()?->status;
                if ($status === 'active' && $callsCount === 0) {
                    continue;
                }
                if ($status !== 'active' && $latestCallStatus !== $status) {
                    continue;
                }
            }

            if ($callsCount > 0) {
                $activeVesselsInPeriod++;
            }

            // Invoices calculations
            $allInvoices = $calls->flatMap->invoices;
            $shipRevenue = (float) $allInvoices->sum('grand_total');
            $shipAgency = (float) $allInvoices->where('invoice_type', 'agency')->sum('grand_total');
            $shipReimburse = (float) $allInvoices->where('invoice_type', 'reimburse')->sum('grand_total');
            $shipPaid = (float) $allInvoices->sum('paid_amount');
            $shipOutstanding = (float) $allInvoices->sum('outstanding_amount');

            // Approved request items expenses
            $approvedItems = $calls->flatMap->requests->flatMap->items;
            $shipExpense = (float) $approvedItems->sum(
                fn ($i): float => (float) $i->hpp_price * (float) $i->quantity
            );

            // Group top expense categories for this vessel
            $categorySums = [];
            foreach ($approvedItems as $item) {
                $cat = $item->item_type ?? 'Kebutuhan Umum';
                $cost = (float) $item->hpp_price * (float) $item->quantity;
                $categorySums[$cat] = ($categorySums[$cat] ?? 0.0) + $cost;
            }
            arsort($categorySums);
            $topCategories = array_slice($categorySums, 0, 3, true);

            // Margin calculations
            $margin = $shipRevenue - $shipExpense;
            $marginPercentage = $shipRevenue > 0 ? round(($margin / $shipRevenue) * 100, 2) : 0.0;

            // Stay duration average
            $stayDurations = $calls
                ->filter(fn ($pc) => $pc->eta_at && ($pc->departed_at || $pc->etd_at))
                ->map(function ($pc) {
                    $end = $pc->departed_at ?? $pc->etd_at;

                    return max(0.5, $pc->eta_at->diffInHours($end) / 24);
                });
            $avgStay = $stayDurations->isNotEmpty() ? round($stayDurations->average(), 1) : 0.0;

            // Latest port call details
            $latestCall = $calls->first();
            $activeStatus = $latestCall?->status ?? ($callsCount > 0 ? 'completed' : 'idle');

            // Detailed port call list for interactive modal/drawer
            $portCallsDetails = $calls->map(function (PortCall $call): array {
                $inv = (float) $call->invoices->sum('grand_total');
                $paid = (float) $call->invoices->sum('paid_amount');
                $out = (float) $call->invoices->sum('outstanding_amount');
                $items = $call->requests->flatMap->items;
                $exp = (float) $items->sum(fn ($i): float => (float) $i->hpp_price * (float) $i->quantity);
                $jobMargin = $inv - $exp;

                $stayDays = '-';
                if ($call->eta_at) {
                    $end = $call->departed_at ?? $call->etd_at ?? now();
                    $stayDays = max(1, round($call->eta_at->diffInHours($end) / 24, 1)).' hari';
                }

                return [
                    'id' => $call->id,
                    'job_number' => $call->job_number,
                    'port_name' => $call->port?->name ?? 'Pelabuhan',
                    'status' => $call->status,
                    'eta' => $call->eta_at?->toDateString(),
                    'etd' => $call->etd_at?->toDateString(),
                    'stay_duration' => $stayDays,
                    'revenue' => $inv,
                    'paid' => $paid,
                    'outstanding' => $out,
                    'expense' => $exp,
                    'margin' => $jobMargin,
                    'margin_percentage' => $inv > 0 ? round(($jobMargin / $inv) * 100, 1) : 0.0,
                    'items_count' => $items->count(),
                ];
            })->values()->all();

            $vesselsList[] = [
                'id' => $ship->id,
                'name' => $ship->name,
                'call_sign' => $ship->call_sign ?? '-',
                'imo_number' => $ship->imo_number ?? '-',
                'flag' => $ship->flag ?? 'Indonesia',
                'ship_type' => $ship->ship_type ?? 'Kapal Niaga',
                'gross_tonnage' => (float) ($ship->gross_tonnage ?? 0),
                'company' => $ship->company ? [
                    'id' => $ship->company->id,
                    'name' => $ship->company->name,
                ] : null,
                'home_port' => $ship->port?->name ?? '-',
                'port_calls_count' => $callsCount,
                'active_status' => $activeStatus,
                'latest_job_number' => $latestCall?->job_number ?? '-',
                'latest_eta' => $latestCall?->eta_at?->toDateString() ?? '-',
                'avg_stay_days' => $avgStay,
                'revenue' => [
                    'total' => $shipRevenue,
                    'agency' => $shipAgency,
                    'reimburse' => $shipReimburse,
                    'paid' => $shipPaid,
                    'outstanding' => $shipOutstanding,
                    'collection_rate' => $shipRevenue > 0 ? round(($shipPaid / $shipRevenue) * 100, 1) : 0.0,
                ],
                'expense' => [
                    'total' => $shipExpense,
                    'item_count' => $approvedItems->count(),
                    'top_categories' => $topCategories,
                ],
                'margin' => [
                    'amount' => $margin,
                    'percentage' => $marginPercentage,
                    'status' => $margin > 0 ? 'profit' : ($margin < 0 ? 'deficit' : 'neutral'),
                ],
                'avg_revenue_per_call' => $callsCount > 0 ? round($shipRevenue / $callsCount) : 0,
                'avg_margin_per_call' => $callsCount > 0 ? round($margin / $callsCount) : 0,
                'port_calls' => $portCallsDetails,
            ];

            // Fleet aggregates
            $fleetRevenue += $shipRevenue;
            $fleetAgency += $shipAgency;
            $fleetReimburse += $shipReimburse;
            $fleetPaid += $shipPaid;
            $fleetOutstanding += $shipOutstanding;
            $fleetExpense += $shipExpense;
            $fleetTotalJobs += $callsCount;
        }

        // Sorting
        usort($vesselsList, function (array $a, array $b) use ($sort): int {
            return match ($sort) {
                'margin_asc' => $a['margin']['amount'] <=> $b['margin']['amount'],
                'revenue_desc' => $b['revenue']['total'] <=> $a['revenue']['total'],
                'revenue_asc' => $a['revenue']['total'] <=> $b['revenue']['total'],
                'expense_desc' => $b['expense']['total'] <=> $a['expense']['total'],
                'trips_desc' => $b['port_calls_count'] <=> $a['port_calls_count'],
                'name_asc' => strcasecmp($a['name'], $b['name']),
                'name_desc' => strcasecmp($b['name'], $a['name']),
                default => $b['margin']['amount'] <=> $a['margin']['amount'], // margin_desc
            };
        });

        $fleetMargin = $fleetRevenue - $fleetExpense;
        $fleetMarginPercentage = $fleetRevenue > 0 ? round(($fleetMargin / $fleetRevenue) * 100, 2) : 0.0;

        $companies = ShipCompany::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $ships = Ship::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'ship_company_id']);

        return Inertia::render('Reports/VesselSummary', [
            'vessels' => $vesselsList,
            'summary' => [
                'total_vessels' => count($allShips),
                'matched_vessels' => count($vesselsList),
                'active_vessels' => $activeVesselsInPeriod,
                'total_jobs' => $fleetTotalJobs,
                'fleet_revenue' => $fleetRevenue,
                'fleet_agency_revenue' => $fleetAgency,
                'fleet_reimburse_revenue' => $fleetReimburse,
                'fleet_paid' => $fleetPaid,
                'fleet_outstanding' => $fleetOutstanding,
                'fleet_expense' => $fleetExpense,
                'fleet_margin' => $fleetMargin,
                'fleet_margin_percentage' => $fleetMarginPercentage,
                'avg_revenue_per_vessel' => $activeVesselsInPeriod > 0 ? round($fleetRevenue / $activeVesselsInPeriod) : 0,
                'avg_margin_per_vessel' => $activeVesselsInPeriod > 0 ? round($fleetMargin / $activeVesselsInPeriod) : 0,
            ],
            'filters' => [
                'from' => $isAllTime ? '' : $from->toDateString(),
                'to' => $isAllTime ? '' : $to->toDateString(),
                'all_time' => $isAllTime,
                'search' => $search ?? '',
                'company_id' => $companyId ?? '',
                'ship_id' => $shipId ?? '',
                'status' => $status,
                'sort' => $sort,
            ],
            'companies' => $companies,
            'ships' => $ships,
        ]);
    }

    public function export(Request $request, ReportExportManager $exportManager): BinaryFileResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'format' => ['nullable', 'string', 'in:xlsx,pdf'],
            'search' => ['nullable', 'string'],
            'company_id' => ['nullable', 'string'],
            'ship_id' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
        ]);

        $format = $validated['format'] ?? 'xlsx';
        $from = CarbonImmutable::parse($validated['from'] ?? now()->startOfMonth()->toDateString());
        $to = CarbonImmutable::parse($validated['to'] ?? now()->endOfMonth()->toDateString());

        $result = $exportManager->generate('vessel_summary', $format, [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'search' => $validated['search'] ?? null,
            'company_id' => $validated['company_id'] ?? null,
            'ship_id' => $validated['ship_id'] ?? null,
            'status' => $validated['status'] ?? 'all',
        ]);

        $fullPath = Storage::disk('local')->path($result['file_path']);

        $contentType = $format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf';

        return response()->download($fullPath, $result['filename'], [
            'Content-Type' => $contentType,
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ])->deleteFileAfterSend(true);
    }
}
