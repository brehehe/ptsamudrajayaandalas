<?php

namespace App\Http\Controllers;

use App\Models\ClientReceipt;
use App\Models\Invoice;
use App\Models\ShipCompany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReceivableController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');

        $unpaidInvoicesQuery = Invoice::query()
            ->with(['company', 'portCall.ship'])
            ->where('outstanding_amount', '>', 0)
            ->whereIn('status', ['released', 'sent']);

        $receiptsQuery = ClientReceipt::query()
            ->with(['company', 'recorder'])
            ->orderByDesc('received_date');

        if ($search) {
            $unpaidInvoicesQuery->where(function ($q) use ($search) {
                $q->where('invoice_number', 'ilike', "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', 'ilike', "%{$search}%"));
            });

            $receiptsQuery->where(function ($q) use ($search) {
                $q->where('bank_reference', 'ilike', "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', 'ilike', "%{$search}%"));
            });
        }

        $unpaidInvoices = $unpaidInvoicesQuery->orderBy('due_date')->get();
        $receipts = $receiptsQuery->get();

        // Calculate Aging
        $now = now();
        $aging = [
            'current' => 0.0, // < 30 days
            'overdue_30' => 0.0, // 30 - 60 days
            'overdue_60' => 0.0, // > 60 days
            'total' => 0.0,
        ];

        foreach ($unpaidInvoices as $inv) {
            $amt = (float) $inv->outstanding_amount;
            $aging['total'] += $amt;
            $daysPastDue = $inv->due_date ? $now->diffInDays($inv->due_date, false) : 0;

            if ($daysPastDue >= -30) {
                $aging['current'] += $amt;
            } elseif ($daysPastDue >= -60) {
                $aging['overdue_30'] += $amt;
            } else {
                $aging['overdue_60'] += $amt;
            }
        }

        $companies = ShipCompany::orderBy('name')->get();

        return Inertia::render('Receivables/Index', [
            'unpaidInvoices' => $unpaidInvoices,
            'receipts' => $receipts,
            'aging' => $aging,
            'companies' => $companies,
            'search' => $search ?? '',
        ]);
    }

    public function storeReceipt(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'company_id' => ['required', 'exists:ship_companies,id'],
            'received_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:1'],
            'destination_account' => ['required', 'string', 'max:255'],
            'bank_reference' => ['required', 'string', 'max:100'],
            'invoice_id' => ['nullable', 'exists:invoices,id'],
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $receipt = ClientReceipt::create([
                'company_id' => $validated['company_id'],
                'received_date' => $validated['received_date'],
                'amount' => $validated['amount'],
                'currency' => 'IDR',
                'destination_account' => $validated['destination_account'],
                'bank_reference' => $validated['bank_reference'],
                'proof_path' => 'proofs/receipt-manual.pdf',
                'status' => 'confirmed',
                'recorded_by' => $request->user()->id,
            ]);

            // If an invoice is specified, allocate payment
            if (! empty($validated['invoice_id'])) {
                $invoice = Invoice::lockForUpdate()->find($validated['invoice_id']);
                if ($invoice) {
                    $newPaid = min((float) $invoice->grand_total, (float) $invoice->paid_amount + (float) $validated['amount']);
                    $newOutstanding = max(0, (float) $invoice->grand_total - $newPaid);
                    $invoice->update([
                        'paid_amount' => $newPaid,
                        'outstanding_amount' => $newOutstanding,
                        'status' => $newOutstanding == 0 ? 'paid' : 'sent',
                    ]);
                }
            }

            return redirect()->back()->with('success', "Penerimaan pembayaran dari klien ref {$validated['bank_reference']} berhasil dicatat.");
        });
    }
}
