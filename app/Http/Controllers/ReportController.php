<?php

namespace App\Http\Controllers;

use App\Models\ExpenseRequest;
use App\Models\Invoice;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\ShipRequest;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']), 403);
        $validated = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:all,scheduled,anchored,berthed,departed,completed'],
        ]);
        $from = CarbonImmutable::parse($validated['from'] ?? now()->startOfMonth()->toDateString())->startOfDay();
        $to = CarbonImmutable::parse($validated['to'] ?? now()->endOfMonth()->toDateString())->endOfDay();
        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? 'all';
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $portCallsQuery = PortCall::query()
            ->with([
                'ship.company:id,name',
                'port:id,name',
                'invoices' => fn ($query) => $query
                    ->whereBetween('invoice_date', [$from->toDateString(), $to->toDateString()])
                    ->whereIn('status', ['released', 'sent', 'paid']),
                'requests.items:id,request_id,quantity,hpp_price,director_status',
            ])
            ->whereBetween('created_at', [$from, $to]);

        if ($status !== 'all') {
            $portCallsQuery->where('status', $status);
        }

        if ($search) {
            $portCallsQuery->where(function ($query) use ($like, $search): void {
                $query->where('job_number', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($shipQuery) => $shipQuery->where('name', $like, "%{$search}%"))
                    ->orWhereHas('ship.company', fn ($companyQuery) => $companyQuery->where('name', $like, "%{$search}%"))
                    ->orWhereHas('port', fn ($portQuery) => $portQuery->where('name', $like, "%{$search}%"));
            });
        }

        $portCalls = $portCallsQuery
            ->orderByDesc('created_at')
            ->get();

        $invoiceQuery = Invoice::query()
            ->whereBetween('invoice_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('status', ['released', 'sent', 'paid']);
        $totalInvoiced = (float) (clone $invoiceQuery)->sum('grand_total');
        $agencyRevenue = (float) (clone $invoiceQuery)->where('invoice_type', 'agency')->sum('grand_total');
        $reimburseRevenue = (float) (clone $invoiceQuery)->where('invoice_type', 'reimburse')->sum('grand_total');
        $totalHpp = (float) RequestItem::query()
            ->where('director_status', 'approved')
            ->whereHas('request.portCall', fn ($query) => $query->whereBetween('created_at', [$from, $to]))
            ->get(['quantity', 'hpp_price'])
            ->sum(fn (RequestItem $item): float => (float) $item->hpp_price * (float) $item->quantity);
        $nonVesselExpenses = (float) ExpenseRequest::query()
            ->where('scope', 'company')
            ->where('status', 'realized')
            ->whereBetween('realized_date', [$from->toDateString(), $to->toDateString()])
            ->sum('realized_amount');
        $shipMargin = $totalInvoiced - $totalHpp;
        $companyNetResult = $shipMargin - $nonVesselExpenses;

        $summary = [
            'total_port_calls' => $portCalls->count(),
            'active_vessels' => $portCalls->whereIn('status', ['anchored', 'berthed'])->count(),
            'total_invoiced' => $totalInvoiced,
            'agency_revenue' => $agencyRevenue,
            'reimburse_revenue' => $reimburseRevenue,
            'total_hpp' => $totalHpp,
            'non_vessel_expenses' => $nonVesselExpenses,
            'ship_margin' => $shipMargin,
            'company_net_result' => $companyNetResult,
            'completed_requests' => ShipRequest::whereBetween('created_at', [$from, $to])->where('status', 'Selesai')->count(),
            'pending_requests' => ShipRequest::whereBetween('created_at', [$from, $to])->whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur'])->count(),
        ];

        // Format port call rows for report table
        $reportData = $portCalls->map(function ($call) {
            $invTotal = $call->invoices->sum('grand_total');
            $agencyTotal = $call->invoices->where('invoice_type', 'agency')->sum('grand_total');
            $reimbursementTotal = $call->invoices->where('invoice_type', 'reimburse')->sum('grand_total');
            $hppTotal = $call->requests->sum(fn (ShipRequest $shipRequest): float => (float) $shipRequest->items
                ->where('director_status', 'approved')
                ->sum(fn (RequestItem $item): float => (float) $item->hpp_price * (float) $item->quantity));
            $margin = (float) ($invTotal - $hppTotal);

            return [
                'id' => $call->id,
                'job_number' => $call->job_number,
                'ship_name' => $call->ship ? $call->ship->name : 'N/A',
                'company_name' => $call->ship && $call->ship->company ? $call->ship->company->name : 'N/A',
                'port_name' => $call->port ? $call->port->name : '-',
                'status' => $call->status,
                'eta' => $call->eta_at ? $call->eta_at->format('d M Y') : '-',
                'etd' => $call->etd_at ? $call->etd_at->format('d M Y') : '-',
                'total_invoiced' => (float) $invTotal,
                'agency_invoiced' => (float) $agencyTotal,
                'reimbursement_invoiced' => (float) $reimbursementTotal,
                'total_hpp' => $hppTotal,
                'margin' => $margin,
                'margin_percentage' => $invTotal > 0 ? round(($margin / (float) $invTotal) * 100, 2) : 0,
                'invoice_count' => $call->invoices->count(),
                'request_count' => $call->requests->count(),
            ];
        });

        return Inertia::render('Reports/Index', [
            'summary' => $summary,
            'portCalls' => $reportData,
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'search' => $search ?? '',
                'status' => $status,
            ],
        ]);
    }
}
