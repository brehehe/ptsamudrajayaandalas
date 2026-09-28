<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\PortCall;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        $type = $request->query('type', 'all'); // 'all' | 'agency' | 'reimburse'
        $status = $request->query('status', 'all');
        $search = $request->query('search');

        $query = Invoice::query()->with(['portCall.ship', 'company', 'request']);

        if ($type !== 'all') {
            $query->where('invoice_type', $type);
        }

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'ilike', "%{$search}%")
                    ->orWhere('notes', 'ilike', "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', 'ilike', "%{$search}%"))
                    ->orWhereHas('portCall.ship', fn ($sq) => $sq->where('name', 'ilike', "%{$search}%"));
            });
        }

        $invoices = $query->orderByDesc('invoice_date')->get();

        $stats = [
            'total_invoiced' => (float) Invoice::sum('grand_total'),
            'total_paid' => (float) Invoice::sum('paid_amount'),
            'total_outstanding' => (float) Invoice::sum('outstanding_amount'),
            'count' => Invoice::count(),
            'agency_count' => Invoice::where('invoice_type', 'agency')->count(),
            'reimburse_count' => Invoice::where('invoice_type', 'reimburse')->count(),
        ];

        $companies = ShipCompany::orderBy('name')->get();
        $portCalls = PortCall::with(['ship', 'port'])->get();
        $shipRequests = ShipRequest::with('ship')->get();

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'companies' => $companies,
            'portCalls' => $portCalls,
            'shipRequests' => $shipRequests,
            'stats' => $stats,
            'filters' => [
                'type' => $type,
                'status' => $status,
                'search' => $search ?? '',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'port_call_id' => ['required', 'exists:port_calls,id'],
            'company_id' => ['required', 'exists:ship_companies,id'],
            'request_id' => ['required', 'exists:requests,id'],
            'invoice_type' => ['required', 'in:agency,reimburse'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'addon_total' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'due_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $prefix = $validated['invoice_type'] === 'agency' ? 'INV-AGY-26-' : 'INV-RMB-26-';
        $count = Invoice::where('invoice_type', $validated['invoice_type'])->count() + 1;
        $invNumber = sprintf('%s%04d', $prefix, $count);

        $subtotal = (float) $validated['subtotal'];
        $addon = (float) ($validated['addon_total'] ?? 0);
        $tax = (float) ($validated['tax'] ?? 0);
        $grandTotal = $subtotal + $addon + $tax;

        Invoice::create([
            'invoice_number' => $invNumber,
            'port_call_id' => $validated['port_call_id'],
            'company_id' => $validated['company_id'],
            'request_id' => $validated['request_id'],
            'invoice_type' => $validated['invoice_type'],
            'invoice_date' => now()->toDateString(),
            'due_date' => $validated['due_date'],
            'subtotal' => $subtotal,
            'addon_total' => $addon,
            'discount' => 0,
            'tax' => $tax,
            'grand_total' => $grandTotal,
            'paid_amount' => 0,
            'outstanding_amount' => $grandTotal,
            'currency' => 'IDR',
            'status' => 'draft',
            'delivery_status' => 'pending',
            'notes' => $validated['notes'],
            'version' => 1,
        ]);

        return redirect()->back()->with('success', "Invoice {$invNumber} berhasil dibuat sebagai draft.");
    }

    public function release(Request $request, string $id): RedirectResponse
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->update([
            'status' => 'released',
            'released_at' => now(),
        ]);

        return redirect()->back()->with('success', "Invoice {$invoice->invoice_number} resmi dirilis dan siap dikirim ke klien.");
    }

    public function markSent(Request $request, string $id): RedirectResponse
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->update([
            'status' => 'sent',
            'delivery_status' => 'delivered',
        ]);

        return redirect()->back()->with('success', "Status invoice {$invoice->invoice_number} tercatat telah dikirim ke klien.");
    }
}
