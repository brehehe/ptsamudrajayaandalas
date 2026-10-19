<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReportIndexRequest;
use App\Models\ClientReceipt;
use App\Models\CostDocument;
use App\Models\DailyReport;
use App\Models\ExpenseRequest;
use App\Models\Invoice;
use App\Models\OperationalActivity;
use App\Models\OutgoingPayment;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(ReportIndexRequest $request): Response
    {
        $validated = $request->validated();
        $from = CarbonImmutable::parse($validated['from'] ?? now()->startOfMonth()->toDateString())->startOfDay();
        $to = CarbonImmutable::parse($validated['to'] ?? now()->endOfMonth()->toDateString())->endOfDay();
        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? 'all';
        $companyId = $validated['company_id'] ?? null;
        $shipId = $validated['ship_id'] ?? null;
        $job = $validated['job'] ?? null;
        $routeReport = $request->route('report');
        $activeTab = is_string($routeReport)
            ? $routeReport
            : ($validated['tab'] ?? 'ringkasan_margin');
        $sort = $validated['sort'] ?? 'date';
        $direction = $validated['direction'] ?? 'desc';
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $portCallsQuery = PortCall::query()
            ->with([
                'ship.company:id,name',
                'port:id,name',
                'workOrder:id,company_id,client_number',
                'workOrder.company:id,name',
                'completionNote:id,port_call_id,document_number,status,actual_amount',
                'invoices' => fn ($query) => $query
                    ->whereBetween('invoice_date', [$from->toDateString(), $to->toDateString()])
                    ->whereIn('status', ['released', 'sent', 'paid']),
                'requests.items:id,request_id,quantity,hpp_price,director_status',
            ])
            ->whereBetween('created_at', [$from, $to]);

        if ($status !== 'all') {
            $portCallsQuery->where('status', $status);
        }

        if ($companyId) {
            $portCallsQuery->where(function ($query) use ($companyId) {
                $query->whereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId))
                    ->orWhereHas('workOrder', fn ($wq) => $wq->where('company_id', $companyId));
            });
        }

        if ($shipId) {
            $portCallsQuery->where('ship_id', $shipId);
        }

        if ($job) {
            $portCallsQuery->where(function ($query) use ($like, $job): void {
                $query->where('job_number', $like, "%{$job}%");
                if (Str::isUuid($job)) {
                    $query->orWhere('id', $job);
                }
            });
        }

        if ($search) {
            $portCallsQuery->where(function ($query) use ($like, $search): void {
                $query->where('job_number', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($shipQuery) => $shipQuery->where('name', $like, "%{$search}%"))
                    ->orWhereHas('ship.company', fn ($companyQuery) => $companyQuery->where('name', $like, "%{$search}%"))
                    ->orWhereHas('workOrder', fn ($workOrderQuery) => $workOrderQuery
                        ->where('client_number', $like, "%{$search}%")
                        ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', $like, "%{$search}%")))
                    ->orWhereHas('port', fn ($portQuery) => $portQuery->where('name', $like, "%{$search}%"));
            });
        }

        $portCalls = (clone $portCallsQuery)
            ->orderByDesc('created_at')
            ->get();
        $portCallIds = $portCalls->pluck('id');
        $structuredPortCallIds = PortCall::query()
            ->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->when($companyId, fn ($query) => $query->where(function ($companyQuery) use ($companyId): void {
                $companyQuery->whereHas('ship', fn ($shipQuery) => $shipQuery->where('ship_company_id', $companyId))
                    ->orWhereHas('workOrder', fn ($workOrderQuery) => $workOrderQuery->where('company_id', $companyId));
            }))
            ->when($shipId, fn ($query) => $query->where('ship_id', $shipId))
            ->when($job, fn ($query) => $query->where(function ($jobQuery) use ($like, $job): void {
                $jobQuery->where('job_number', $like, "%{$job}%");
                if (Str::isUuid($job)) {
                    $jobQuery->orWhere('id', $job);
                }
            }))
            ->pluck('id');
        $hasStructuredPortCallFilter = $companyId !== null
            || $shipId !== null
            || $job !== null
            || $status !== 'all';
        $searchPortCallIds = $search
            ? PortCall::query()
                ->when($hasStructuredPortCallFilter, fn ($query) => $query->whereIn('id', $structuredPortCallIds))
                ->where(function ($query) use ($like, $search): void {
                    $query->where('job_number', $like, "%{$search}%")
                        ->orWhereHas('ship', fn ($shipQuery) => $shipQuery->where('name', $like, "%{$search}%"))
                        ->orWhereHas('ship.company', fn ($companyQuery) => $companyQuery->where('name', $like, "%{$search}%"))
                        ->orWhereHas('workOrder', fn ($workOrderQuery) => $workOrderQuery
                            ->where('client_number', $like, "%{$search}%")
                            ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', $like, "%{$search}%")))
                        ->orWhereHas('port', fn ($portQuery) => $portQuery->where('name', $like, "%{$search}%"));
                })
                ->pluck('id')
            : collect();
        $transactionPortCallIds = $search ? $searchPortCallIds : $structuredPortCallIds;
        $hasOperationalFilter = $companyId !== null
            || $shipId !== null
            || $job !== null
            || $search !== null
            || $status !== 'all';
        $hasPortCallOnlyFilter = $shipId !== null
            || $job !== null
            || $search !== null
            || $status !== 'all';

        $invoiceReportQuery = Invoice::query()
            ->whereBetween('invoice_date', [$from->toDateString(), $to->toDateString()])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->when($shipId || $job || $status !== 'all', fn ($query) => $query->whereIn('port_call_id', $structuredPortCallIds))
            ->when($search, fn ($query) => $query->where(function ($searchQuery) use ($like, $search, $searchPortCallIds): void {
                $searchQuery->where('invoice_number', $like, "%{$search}%")
                    ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', $like, "%{$search}%"))
                    ->orWhereIn('port_call_id', $searchPortCallIds);
            }));

        $invoiceQuery = (clone $invoiceReportQuery)->whereIn('status', ['released', 'sent', 'paid']);

        $totalInvoiced = (float) (clone $invoiceQuery)->sum('grand_total');
        $agencyRevenue = (float) (clone $invoiceQuery)->where('invoice_type', 'agency')->sum('grand_total');
        $reimburseRevenue = (float) (clone $invoiceQuery)->where('invoice_type', 'reimburse')->sum('grand_total');
        $totalArPaid = (float) (clone $invoiceQuery)->sum('paid_amount');
        $totalArOutstanding = (float) (clone $invoiceQuery)->sum('outstanding_amount');

        $totalHpp = (float) RequestItem::query()
            ->where('director_status', 'approved')
            ->whereHas('request', fn ($query) => $query->whereIn('port_call_id', $portCallIds))
            ->get(['quantity', 'hpp_price'])
            ->sum(fn (RequestItem $item): float => (float) $item->hpp_price * (float) $item->quantity);

        $nonVesselExpenses = $hasOperationalFilter
            ? 0.0
            : (float) ExpenseRequest::query()
                ->where('scope', 'company')
                ->where('status', 'realized')
                ->whereBetween('realized_date', [$from->toDateString(), $to->toDateString()])
                ->sum('realized_amount');

        $shipMargin = $totalInvoiced - $totalHpp;
        $companyNetResult = $shipMargin - $nonVesselExpenses;
        $grossMarginPercent = $totalInvoiced > 0 ? round(($shipMargin / $totalInvoiced) * 100, 2) : 0;
        $netMarginPercent = $totalInvoiced > 0 ? round(($companyNetResult / $totalInvoiced) * 100, 2) : 0;

        $vendorInvoiceQuery = CostDocument::query()
            ->where('document_type', 'vendor_invoice')
            ->whereBetween('received_date', [$from->toDateString(), $to->toDateString()])
            ->when($hasOperationalFilter, fn ($query) => $query->whereIn('port_call_id', $portCallIds));

        $totalApInvoiced = (float) (clone $vendorInvoiceQuery)->sum('verified_total');
        $totalApPaid = (float) (clone $vendorInvoiceQuery)->sum('paid_amount');
        $totalApOutstanding = max(0, (float) (clone $vendorInvoiceQuery)->sum(DB::raw('COALESCE(verified_total, 0) - COALESCE(paid_amount, 0)')));

        $clientReceiptQuery = ClientReceipt::query()
            ->whereBetween('received_date', [$from->toDateString(), $to->toDateString()])
            ->where('status', 'confirmed')
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->when($hasPortCallOnlyFilter, fn ($query) => $query->whereHas(
                'allocations.invoice',
                fn ($invoiceAllocationQuery) => $invoiceAllocationQuery->whereIn('port_call_id', $transactionPortCallIds),
            ));
        $cashIn = (float) (clone $clientReceiptQuery)->sum('amount');

        $outgoingPaymentReportQuery = OutgoingPayment::query()
            ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
            ->when($hasStructuredPortCallFilter, fn ($query) => $query->whereIn('port_call_id', $structuredPortCallIds))
            ->when($search, fn ($query) => $query->where(function ($searchQuery) use ($like, $search, $searchPortCallIds): void {
                $searchQuery->where('reference_number', $like, "%{$search}%")
                    ->orWhere('recipient', $like, "%{$search}%")
                    ->orWhere('payment_type', $like, "%{$search}%")
                    ->orWhereIn('port_call_id', $searchPortCallIds);
            }));
        $outgoingPaymentQuery = (clone $outgoingPaymentReportQuery)->where('verification_status', 'verified');
        $cashOut = (float) (clone $outgoingPaymentQuery)->sum('amount');
        $netCashFlow = $cashIn - $cashOut;

        $portStayDays = $portCalls
            ->filter(fn ($pc) => $pc->eta_at && ($pc->departed_at || $pc->etd_at))
            ->map(function ($pc) {
                $end = $pc->departed_at ?? $pc->etd_at;

                return max(0.5, $pc->eta_at->diffInHours($end) / 24);
            });
        $avgPortStay = $portStayDays->isNotEmpty() ? round($portStayDays->average(), 1) : 0;

        $summary = [
            'total_port_calls' => $portCalls->count(),
            'active_vessels' => $portCalls->whereIn('status', ['anchored', 'berthed'])->count(),
            'completed_vessels' => $portCalls->whereIn('status', ['departed', 'completed'])->count(),
            'scheduled_vessels' => $portCalls->where('status', 'scheduled')->count(),
            'avg_port_stay_days' => $avgPortStay,
            'total_invoiced' => $totalInvoiced,
            'agency_revenue' => $agencyRevenue,
            'reimburse_revenue' => $reimburseRevenue,
            'total_hpp' => $totalHpp,
            'non_vessel_expenses' => $nonVesselExpenses,
            'ship_margin' => $shipMargin,
            'gross_margin_percentage' => $grossMarginPercent,
            'company_net_result' => $companyNetResult,
            'net_margin_percentage' => $netMarginPercent,
            'completed_requests' => ShipRequest::whereIn('port_call_id', $portCallIds)->where('status', 'Selesai')->count(),
            'pending_requests' => ShipRequest::whereIn('port_call_id', $portCallIds)->whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur'])->count(),
            'in_progress_requests' => ShipRequest::whereIn('port_call_id', $portCallIds)->whereIn('status', ['Dalam Proses', 'Disetujui', 'Diproses'])->count(),
            'ar_invoiced' => $totalInvoiced,
            'ar_paid' => $totalArPaid,
            'ar_outstanding' => $totalArOutstanding,
            'ar_collection_rate' => $totalInvoiced > 0 ? round(($totalArPaid / $totalInvoiced) * 100, 1) : 0,
            'ap_invoiced' => $totalApInvoiced,
            'ap_paid' => $totalApPaid,
            'ap_outstanding' => $totalApOutstanding,
            'cash_in' => $cashIn,
            'cash_out' => $cashOut,
            'net_cash_flow' => $netCashFlow,
        ];

        $portCallPage = (clone $portCallsQuery)
            ->orderBy($sort === 'status' ? 'status' : ($sort === 'number' ? 'job_number' : 'created_at'), $direction)
            ->paginate(10, ['*'], 'job_page')
            ->withQueryString()
            ->through(fn (PortCall $call): array => $this->portCallReportRow($call));

        $invoiceRecords = (clone $invoiceReportQuery)->get(['id', 'status', 'grand_total']);
        $receivables = (clone $invoiceQuery)
            ->where('outstanding_amount', '>', 0)
            ->get(['id', 'due_date', 'outstanding_amount']);

        $invoicePage = $this->applyReportSort(clone $invoiceReportQuery, $activeTab === 'invoice' ? $sort : 'date', $direction, [
            'date' => 'invoice_date',
            'amount' => 'grand_total',
            'status' => 'status',
            'number' => 'invoice_number',
        ])
            ->with([
                'company:id,name',
                'portCall:id,job_number,ship_id',
                'portCall.ship:id,name',
            ])
            ->paginate(10, ['*'], 'invoice_page')
            ->withQueryString()
            ->through(fn (Invoice $invoice): array => $this->invoiceReportRow($invoice));

        $receivablePage = $this->applyReportSort(
            (clone $invoiceQuery)->where('outstanding_amount', '>', 0),
            $activeTab === 'piutang' ? $sort : 'date',
            $direction,
            [
                'date' => 'due_date',
                'amount' => 'outstanding_amount',
                'status' => 'status',
                'number' => 'invoice_number',
            ],
        )
            ->with([
                'company:id,name',
                'portCall:id,job_number,ship_id',
                'portCall.ship:id,name',
            ])
            ->paginate(10, ['*'], 'receivable_page')
            ->withQueryString()
            ->through(fn (Invoice $invoice): array => $this->receivableReportRow($invoice));

        $paymentRecords = (clone $outgoingPaymentReportQuery)->get(['id', 'verification_status', 'amount']);
        $expensePage = $this->applyReportSort(
            clone $outgoingPaymentReportQuery,
            $activeTab === 'pengeluaran' ? $sort : 'date',
            $direction,
            [
                'date' => 'payment_date',
                'amount' => 'amount',
                'status' => 'verification_status',
                'number' => 'reference_number',
            ],
        )
            ->with([
                'portCall:id,job_number,ship_id',
                'portCall.ship:id,name',
                'recorder:id,name',
                'verifier:id,name',
            ])
            ->paginate(10, ['*'], 'expense_page')
            ->withQueryString()
            ->through(fn (OutgoingPayment $payment): array => $this->expenseReportRow($payment));

        $activityQuery = OperationalActivity::query()
            ->whereBetween('activity_date', [$from->toDateString(), $to->toDateString()])
            ->when($companyId, fn ($query) => $query->where(function ($companyQuery) use ($companyId): void {
                $companyQuery->whereHas('ship', fn ($shipQuery) => $shipQuery->where('ship_company_id', $companyId))
                    ->orWhereHas('portCall.workOrder', fn ($workOrderQuery) => $workOrderQuery->where('company_id', $companyId));
            }))
            ->when($shipId, fn ($query) => $query->where('ship_id', $shipId))
            ->when($job || $status !== 'all', fn ($query) => $query->whereIn('port_call_id', $structuredPortCallIds))
            ->when($search, fn ($query) => $query->where(function ($searchQuery) use ($like, $search, $searchPortCallIds): void {
                $searchQuery->where('title', $like, "%{$search}%")
                    ->orWhere('detail', $like, "%{$search}%")
                    ->orWhere('location_name', $like, "%{$search}%")
                    ->orWhere('category', $like, "%{$search}%")
                    ->orWhereIn('port_call_id', $searchPortCallIds);
            }));

        $dailyReportQuery = DailyReport::query()
            ->whereBetween('report_date', [$from->toDateString(), $to->toDateString()])
            ->when($hasStructuredPortCallFilter, fn ($query) => $query->whereIn('port_call_id', $structuredPortCallIds))
            ->when($search, fn ($query) => $query->where(function ($searchQuery) use ($like, $search, $searchPortCallIds): void {
                $searchQuery->where('summary', $like, "%{$search}%")
                    ->orWhereHas('officer', fn ($officerQuery) => $officerQuery->where('name', $like, "%{$search}%"))
                    ->orWhereIn('port_call_id', $searchPortCallIds);
            }));

        $activities = (clone $activityQuery)->get(['id', 'activity_date', 'ship_id', 'created_by', 'constraints']);
        $dailyReports = (clone $dailyReportQuery)->get(['id', 'report_date', 'officer_id']);
        $activityPage = $this->applyReportSort(
            clone $activityQuery,
            $activeTab === 'aktivitas' ? $sort : 'date',
            $direction,
            [
                'date' => 'activity_date',
                'status' => 'category',
                'name' => 'title',
                'progress' => 'progress_percent',
            ],
        )
            ->with([
                'ship:id,name',
                'portCall:id,job_number',
                'creator:id,name',
            ])
            ->paginate(10, ['*'], 'activity_page')
            ->withQueryString()
            ->through(fn (OperationalActivity $activity): array => $this->activityReportRow($activity));

        $companies = ShipCompany::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $ships = Ship::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'ship_company_id']);
        $jobs = PortCall::query()->latest('created_at')->limit(100)->get(['id', 'job_number', 'ship_id']);

        return Inertia::render('Reports/Index', [
            'summary' => $summary,
            'financialTrend' => $this->financialTrend(
                $from,
                $to,
                (clone $invoiceQuery)->get(['invoice_date', 'grand_total']),
                (clone $clientReceiptQuery)->get(['received_date', 'amount']),
                (clone $outgoingPaymentQuery)->get(['payment_date', 'amount']),
            ),
            'portCalls' => $portCallPage,
            'invoiceReport' => [
                'summary' => [
                    'total_documents' => $invoiceRecords->count(),
                    'released_documents' => $invoiceRecords->whereIn('status', ['released', 'sent'])->count(),
                    'paid_documents' => $invoiceRecords->where('status', 'paid')->count(),
                    'billed_amount' => $totalInvoiced,
                    'paid_amount' => $totalArPaid,
                    'outstanding_amount' => $totalArOutstanding,
                ],
                'chart' => $this->invoiceStatusChart($invoiceRecords),
                'rows' => $invoicePage,
            ],
            'receivableReport' => [
                'summary' => [
                    'open_documents' => $receivables->count(),
                    'outstanding_amount' => $totalArOutstanding,
                    'overdue_amount' => (float) $receivables
                        ->filter(fn (Invoice $invoice): bool => $invoice->due_date?->isBefore(today()) ?? false)
                        ->sum('outstanding_amount'),
                    'current_amount' => (float) $receivables
                        ->filter(fn (Invoice $invoice): bool => $invoice->due_date === null || ! $invoice->due_date->isBefore(today()))
                        ->sum('outstanding_amount'),
                    'collection_rate' => $summary['ar_collection_rate'],
                ],
                'chart' => $this->receivableAgingChart($receivables),
                'rows' => $receivablePage,
            ],
            'expenseReport' => [
                'summary' => [
                    'total_documents' => $paymentRecords->count(),
                    'total_recorded' => (float) $paymentRecords->sum('amount'),
                    'verified_amount' => (float) $paymentRecords->where('verification_status', 'verified')->sum('amount'),
                    'pending_amount' => (float) $paymentRecords->whereIn('verification_status', ['pending', 'waiting_usage_proof', 'waiting_admin_verification'])->sum('amount'),
                    'rejected_amount' => (float) $paymentRecords->where('verification_status', 'rejected')->sum('amount'),
                ],
                'chart' => $this->expenseStatusChart($paymentRecords),
                'rows' => $expensePage,
            ],
            'activityReport' => [
                'summary' => [
                    'total_activities' => $activities->count(),
                    'daily_reports' => $dailyReports->count(),
                    'ships_covered' => $activities->pluck('ship_id')->filter()->unique()->count(),
                    'officers' => $activities->pluck('created_by')->merge($dailyReports->pluck('officer_id'))->filter()->unique()->count(),
                    'with_constraints' => $activities->filter(fn (OperationalActivity $activity): bool => filled($activity->constraints))->count(),
                ],
                'chart' => $this->activityTrend($from, $to, $activities, $dailyReports),
                'rows' => $activityPage,
            ],
            'vesselDailyExpenseSummary' => $this->vesselDailyExpenseSummary($from, $to, $shipId, $companyId, $job, $search),
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
                'tab' => $activeTab,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    /** @param  array<string, string>  $columns */
    private function applyReportSort(Builder $query, string $sort, string $direction, array $columns): Builder
    {
        $column = $columns[$sort] ?? $columns['date'];

        return $query->orderBy($column, $direction)->orderByDesc('id');
    }

    /** @return array<string, mixed> */
    private function portCallReportRow(PortCall $call): array
    {
        $invTotal = (float) $call->invoices->sum('grand_total');
        $agencyTotal = (float) $call->invoices->where('invoice_type', 'agency')->sum('grand_total');
        $reimbursementTotal = (float) $call->invoices->where('invoice_type', 'reimburse')->sum('grand_total');
        $paidTotal = (float) $call->invoices->sum('paid_amount');
        $hppTotal = (float) $call->requests->sum(fn (ShipRequest $shipRequest): float => (float) $shipRequest->items
            ->where('director_status', 'approved')
            ->sum(fn (RequestItem $item): float => (float) $item->hpp_price * (float) $item->quantity));
        $margin = $invTotal - $hppTotal;
        $stayDuration = '-';

        if ($call->eta_at && ($call->departed_at || $call->etd_at)) {
            $end = $call->departed_at ?? $call->etd_at;
            $days = max(1, round($call->eta_at->diffInHours($end) / 24, 1));
            $stayDuration = "{$days} hari";
        }

        return [
            'id' => $call->id,
            'job_number' => $call->job_number,
            'client_spk' => $call->workOrder?->client_number,
            'ship_name' => $call->ship?->name ?? 'N/A',
            'company_name' => $call->ship?->company?->name ?? $call->workOrder?->company?->name ?? 'N/A',
            'port_name' => $call->port?->name ?? '-',
            'status' => $call->status,
            'eta' => $call->eta_at?->toDateString(),
            'etd' => $call->etd_at?->toDateString(),
            'departed_at' => $call->departed_at?->toDateString(),
            'stay_duration' => $stayDuration,
            'total_invoiced' => $invTotal,
            'agency_invoiced' => $agencyTotal,
            'reimbursement_invoiced' => $reimbursementTotal,
            'paid_invoiced' => $paidTotal,
            'total_hpp' => $hppTotal,
            'margin' => $margin,
            'margin_percentage' => $invTotal > 0 ? round(($margin / $invTotal) * 100, 2) : 0,
            'invoice_count' => $call->invoices->count(),
            'request_count' => $call->requests->count(),
            'has_completion_note' => $call->completionNote !== null,
        ];
    }

    /** @return array<string, mixed> */
    private function invoiceReportRow(Invoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'invoice_type' => $invoice->invoice_type,
            'invoice_date' => $invoice->invoice_date?->toDateString(),
            'due_date' => $invoice->due_date?->toDateString(),
            'company_name' => $invoice->company?->name ?? '-',
            'ship_name' => $invoice->portCall?->ship?->name ?? '-',
            'job_number' => $invoice->portCall?->job_number ?? '-',
            'grand_total' => (float) $invoice->grand_total,
            'paid_amount' => (float) $invoice->paid_amount,
            'outstanding_amount' => (float) $invoice->outstanding_amount,
            'status' => $invoice->status,
        ];
    }

    /** @return array<string, mixed> */
    private function receivableReportRow(Invoice $invoice): array
    {
        $daysOverdue = $invoice->due_date?->isBefore(today())
            ? $invoice->due_date->startOfDay()->diffInDays(today()->startOfDay())
            : 0;

        return [
            ...$this->invoiceReportRow($invoice),
            'days_overdue' => $daysOverdue,
            'aging' => $this->receivableAgingLabel($invoice),
        ];
    }

    /** @return array<string, mixed> */
    private function expenseReportRow(OutgoingPayment $payment): array
    {
        return [
            'id' => $payment->id,
            'reference_number' => $payment->reference_number,
            'payment_type' => $payment->payment_type,
            'payment_date' => $payment->payment_date?->toDateString(),
            'recipient' => $payment->recipient,
            'job_number' => $payment->portCall?->job_number ?? '-',
            'ship_name' => $payment->portCall?->ship?->name ?? '-',
            'amount' => (float) $payment->amount,
            'verification_status' => $payment->verification_status,
            'recorded_by' => $payment->recorder?->name ?? '-',
            'verified_by' => $payment->verifier?->name,
        ];
    }

    /** @return array<string, mixed> */
    private function activityReportRow(OperationalActivity $activity): array
    {
        return [
            'id' => $activity->id,
            'activity_date' => $activity->activity_date?->toDateString(),
            'activity_time' => $activity->activity_time,
            'title' => $activity->title,
            'category' => $activity->category,
            'location_name' => $activity->location_name,
            'ship_name' => $activity->ship?->name ?? '-',
            'job_number' => $activity->portCall?->job_number ?? '-',
            'officer_name' => $activity->creator?->name ?? '-',
            'progress_percent' => $activity->progress_percent,
            'has_constraints' => filled($activity->constraints),
        ];
    }

    /** @param  Collection<int, Invoice>  $invoices */
    private function invoiceStatusChart(Collection $invoices): array
    {
        return [
            'key' => 'report_invoice_status',
            'type' => 'donut',
            'title' => 'Komposisi Status Invoice',
            'subtitle' => 'Jumlah dokumen invoice sesuai periode dan filter laporan.',
            'format' => 'number',
            'center_label' => 'invoice',
            'segments' => [
                ['label' => 'Draft', 'value' => $invoices->where('status', 'draft')->count(), 'color' => '#94A3B8'],
                ['label' => 'Dirilis', 'value' => $invoices->where('status', 'released')->count(), 'color' => '#0060F4'],
                ['label' => 'Terkirim', 'value' => $invoices->where('status', 'sent')->count(), 'color' => '#8B5CF6'],
                ['label' => 'Lunas', 'value' => $invoices->where('status', 'paid')->count(), 'color' => '#16A36A'],
                ['label' => 'Dibatalkan', 'value' => $invoices->where('status', 'cancelled')->count(), 'color' => '#C62840'],
            ],
        ];
    }

    /** @param  Collection<int, Invoice>  $receivables */
    private function receivableAgingChart(Collection $receivables): array
    {
        return [
            'key' => 'report_receivable_aging',
            'type' => 'donut',
            'title' => 'Umur Piutang Klien',
            'subtitle' => 'Nilai sisa tagihan dikelompokkan berdasarkan jatuh tempo invoice.',
            'format' => 'currency',
            'center_label' => 'piutang',
            'segments' => [
                [
                    'label' => 'Belum jatuh tempo',
                    'value' => (float) $receivables
                        ->filter(fn (Invoice $invoice): bool => $invoice->due_date === null || ! $invoice->due_date->isBefore(today()))
                        ->sum('outstanding_amount'),
                    'color' => '#0060F4',
                ],
                [
                    'label' => 'Lewat 1–30 hari',
                    'value' => (float) $receivables
                        ->filter(fn (Invoice $invoice): bool => $this->receivableDaysOverdue($invoice) >= 1 && $this->receivableDaysOverdue($invoice) <= 30)
                        ->sum('outstanding_amount'),
                    'color' => '#F59E0B',
                ],
                [
                    'label' => 'Lewat 31–60 hari',
                    'value' => (float) $receivables
                        ->filter(fn (Invoice $invoice): bool => $this->receivableDaysOverdue($invoice) >= 31 && $this->receivableDaysOverdue($invoice) <= 60)
                        ->sum('outstanding_amount'),
                    'color' => '#8B5CF6',
                ],
                [
                    'label' => 'Lewat >60 hari',
                    'value' => (float) $receivables
                        ->filter(fn (Invoice $invoice): bool => $this->receivableDaysOverdue($invoice) > 60)
                        ->sum('outstanding_amount'),
                    'color' => '#C62840',
                ],
            ],
        ];
    }

    /** @param  Collection<int, OutgoingPayment>  $payments */
    private function expenseStatusChart(Collection $payments): array
    {
        return [
            'key' => 'report_expense_status',
            'type' => 'donut',
            'title' => 'Status Pengeluaran',
            'subtitle' => 'Nilai pembayaran keluar berdasarkan tahap verifikasi yang tercatat.',
            'format' => 'currency',
            'center_label' => 'tercatat',
            'segments' => [
                [
                    'label' => 'Terverifikasi',
                    'value' => (float) $payments->where('verification_status', 'verified')->sum('amount'),
                    'color' => '#16A36A',
                ],
                [
                    'label' => 'Menunggu',
                    'value' => (float) $payments->whereIn('verification_status', ['pending', 'waiting_usage_proof', 'waiting_admin_verification'])->sum('amount'),
                    'color' => '#F59E0B',
                ],
                [
                    'label' => 'Ditolak',
                    'value' => (float) $payments->where('verification_status', 'rejected')->sum('amount'),
                    'color' => '#C62840',
                ],
            ],
        ];
    }

    /**
     * @param  Collection<int, OperationalActivity>  $activities
     * @param  Collection<int, DailyReport>  $dailyReports
     * @return array<string, mixed>
     */
    private function activityTrend(
        CarbonImmutable $from,
        CarbonImmutable $to,
        Collection $activities,
        Collection $dailyReports,
    ): array {
        $ranges = $this->trendRanges($from, $to);

        return [
            'key' => 'report_activity_trend',
            'type' => 'bars',
            'title' => 'Tren Aktivitas Operasional',
            'subtitle' => 'Catatan aktivitas lapangan dan laporan harian sesuai periode laporan.',
            'format' => 'number',
            'series' => [
                ['key' => 'activities', 'label' => 'Aktivitas', 'color' => '#0060F4'],
                ['key' => 'daily_reports', 'label' => 'Laporan Harian', 'color' => '#16A36A'],
            ],
            'points' => $ranges->map(fn (array $range): array => [
                'label' => $range['label'],
                'values' => [
                    'activities' => $activities
                        ->filter(fn (OperationalActivity $activity): bool => $activity->activity_date?->betweenIncluded($range['start'], $range['end']) ?? false)
                        ->count(),
                    'daily_reports' => $dailyReports
                        ->filter(fn (DailyReport $dailyReport): bool => $dailyReport->report_date?->betweenIncluded($range['start'], $range['end']) ?? false)
                        ->count(),
                ],
            ])->values()->all(),
        ];
    }

    private function receivableAgingLabel(Invoice $invoice): string
    {
        $daysOverdue = $this->receivableDaysOverdue($invoice);

        if ($daysOverdue === 0) {
            return 'Belum jatuh tempo';
        }

        if ($daysOverdue <= 30) {
            return 'Lewat 1–30 hari';
        }

        if ($daysOverdue <= 60) {
            return 'Lewat 31–60 hari';
        }

        return 'Lewat >60 hari';
    }

    private function receivableDaysOverdue(Invoice $invoice): int
    {
        if ($invoice->due_date === null || ! $invoice->due_date->isBefore(today())) {
            return 0;
        }

        return (int) $invoice->due_date->startOfDay()->diffInDays(today()->startOfDay());
    }

    /**
     * @param  Collection<int, Invoice>  $invoices
     * @param  Collection<int, ClientReceipt>  $receipts
     * @param  Collection<int, OutgoingPayment>  $payments
     * @return array<string, mixed>
     */
    private function financialTrend(
        CarbonImmutable $from,
        CarbonImmutable $to,
        Collection $invoices,
        Collection $receipts,
        Collection $payments,
    ): array {
        $ranges = $this->trendRanges($from, $to);

        return [
            'key' => 'report_financial_trend',
            'type' => 'bars',
            'title' => 'Tren Keuangan Periode',
            'subtitle' => 'Tagihan, kas masuk terkonfirmasi, dan kas keluar terverifikasi sesuai filter laporan.',
            'format' => 'currency',
            'series' => [
                ['key' => 'invoiced', 'label' => 'Tagihan', 'color' => '#0060F4'],
                ['key' => 'cash_in', 'label' => 'Kas Masuk', 'color' => '#16A36A'],
                ['key' => 'cash_out', 'label' => 'Kas Keluar', 'color' => '#F59E0B'],
            ],
            'points' => $ranges->map(fn (array $range): array => [
                'label' => $range['label'],
                'values' => [
                    'invoiced' => (float) $invoices
                        ->filter(fn (Invoice $invoice): bool => $invoice->invoice_date?->betweenIncluded($range['start'], $range['end']) ?? false)
                        ->sum('grand_total'),
                    'cash_in' => (float) $receipts
                        ->filter(fn (ClientReceipt $receipt): bool => $receipt->received_date?->betweenIncluded($range['start'], $range['end']) ?? false)
                        ->sum('amount'),
                    'cash_out' => (float) $payments
                        ->filter(fn (OutgoingPayment $payment): bool => $payment->payment_date?->betweenIncluded($range['start'], $range['end']) ?? false)
                        ->sum('amount'),
                ],
            ])->values()->all(),
        ];
    }

    /** @return Collection<int, array{start: CarbonImmutable, end: CarbonImmutable, label: string}> */
    private function trendRanges(CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        $dayCount = $from->startOfDay()->diffInDays($to->startOfDay());
        $ranges = collect();

        if ($dayCount <= 14) {
            for ($cursor = $from->startOfDay(); $cursor->lte($to); $cursor = $cursor->addDay()) {
                $ranges->push([
                    'start' => $cursor,
                    'end' => $cursor->endOfDay(),
                    'label' => $cursor->locale('id')->translatedFormat('d M'),
                ]);
            }

            return $ranges;
        }

        if ($dayCount <= 120) {
            for ($cursor = $from->startOfDay(); $cursor->lte($to); $cursor = $cursor->addWeek()) {
                $rangeEnd = $cursor->addDays(6)->endOfDay();
                $ranges->push([
                    'start' => $cursor,
                    'end' => $rangeEnd->gt($to) ? $to : $rangeEnd,
                    'label' => $cursor->locale('id')->translatedFormat('d M'),
                ]);
            }

            return $ranges;
        }

        for ($cursor = $from->startOfMonth(); $cursor->lte($to); $cursor = $cursor->addMonth()) {
            $rangeStart = $cursor->lt($from) ? $from : $cursor;
            $monthEnd = $cursor->endOfMonth();
            $ranges->push([
                'start' => $rangeStart,
                'end' => $monthEnd->gt($to) ? $to : $monthEnd,
                'label' => $cursor->locale('id')->translatedFormat('M y'),
            ]);
        }

        return $ranges;
    }

    /**
     * Prepare monitoring summary for daily expenses per vessel (from arrival/sandar to departure/current date).
     * Accessible by Admin, Direktur, and Owner with print support.
     *
     * @return array<string, mixed>
     */
    private function vesselDailyExpenseSummary(
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $shipId,
        ?string $companyId,
        ?string $job,
        ?string $search
    ): array {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $portCalls = PortCall::query()
            ->with([
                'ship:id,name,ship_company_id',
                'ship.company:id,name',
                'workOrder:id,company_id,client_number',
                'workOrder.company:id,name',
                'port:id,name',
                'requests' => fn ($q) => $q->with([
                    'items' => fn ($iq) => $iq->orderBy('required_date')->orderBy('created_at'),
                ]),
            ])
            ->when($shipId, fn ($q) => $q->where('ship_id', $shipId))
            ->when($companyId, fn ($q) => $q->where(function ($cq) use ($companyId): void {
                $cq->whereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId))
                    ->orWhereHas('workOrder', fn ($wq) => $wq->where('company_id', $companyId));
            }))
            ->when($job, fn ($q) => $q->where(function ($jq) use ($like, $job): void {
                $jq->where('job_number', $like, "%{$job}%");
                if (Str::isUuid($job)) {
                    $jq->orWhere('id', $job);
                }
            }))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($like, $search): void {
                $sq->where('job_number', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($shq) => $shq->where('name', $like, "%{$search}%"));
            }))
            ->orderByDesc('created_at')
            ->get();

        $vesselsData = [];
        $grandTotalCost = 0;
        $grandItemCount = 0;

        foreach ($portCalls as $call) {
            $shipName = $call->ship?->name ?? 'Kapal Tidak Diketahui';
            $companyName = $call->ship?->company?->name ?? $call->workOrder?->company?->name ?? '-';

            $stayDays = '-';
            if ($call->eta_at) {
                $end = $call->departed_at ?? $call->etd_at ?? now();
                $stayDays = max(1, round($call->eta_at->diffInHours($end) / 24, 1)).' hari';
            }

            $itemsList = [];
            $runningTotal = 0;

            foreach ($call->requests as $req) {
                foreach ($req->items as $item) {
                    $itemCost = (float) $item->hpp_price * (float) $item->quantity;
                    $runningTotal += $itemCost;
                    $itemDate = $item->required_date
                        ? CarbonImmutable::parse($item->required_date)->toDateString()
                        : ($req->request_date ? CarbonImmutable::parse($req->request_date)->toDateString() : $req->created_at?->toDateString());

                    $itemsList[] = [
                        'id' => $item->id,
                        'date' => $itemDate,
                        'request_number' => $req->request_number,
                        'item_name' => $item->item_name,
                        'item_type' => $item->item_type,
                        'quantity' => (float) $item->quantity,
                        'unit' => $item->unit,
                        'hpp_price' => (float) $item->hpp_price,
                        'total_cost' => $itemCost,
                        'cumulative_cost' => $runningTotal,
                        'director_status' => $item->director_status,
                        'status' => $item->status,
                        'notes' => $item->notes,
                    ];
                }
            }

            // Filter items by from/to if specified
            $filteredItems = array_values(array_filter($itemsList, function ($it) use ($from, $to) {
                if (! $it['date']) {
                    return true;
                }

                return $it['date'] >= $from->toDateString() && $it['date'] <= $to->toDateString();
            }));

            // Recalculate running total for the filtered items
            $vesselRunning = 0;
            foreach ($filteredItems as &$fItem) {
                $vesselRunning += $fItem['total_cost'];
                $fItem['cumulative_cost'] = $vesselRunning;
            }
            unset($fItem);

            $vesselTotal = (float) array_sum(array_column($filteredItems, 'total_cost'));
            $grandTotalCost += $vesselTotal;
            $grandItemCount += count($filteredItems);

            if (count($filteredItems) > 0 || $shipId !== null) {
                $vesselsData[] = [
                    'port_call_id' => $call->id,
                    'job_number' => $call->job_number,
                    'client_spk' => $call->workOrder?->client_number,
                    'ship_name' => $shipName,
                    'company_name' => $companyName,
                    'port_name' => $call->port?->name ?? 'Pelabuhan',
                    'status' => $call->status,
                    'eta' => $call->eta_at?->toDateString(),
                    'etd' => $call->etd_at?->toDateString(),
                    'departed_at' => $call->departed_at?->toDateString(),
                    'stay_duration' => $stayDays,
                    'total_expense' => $vesselTotal,
                    'item_count' => count($filteredItems),
                    'items' => $filteredItems,
                ];
            }
        }

        return [
            'total_vessels' => count($vesselsData),
            'total_expenses' => $grandTotalCost,
            'total_items' => $grandItemCount,
            'vessels' => $vesselsData,
        ];
    }
}
