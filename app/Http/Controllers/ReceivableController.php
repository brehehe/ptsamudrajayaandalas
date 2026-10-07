<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreClientReceiptRequest;
use App\Models\ClientReceipt;
use App\Models\Invoice;
use App\Models\ShipCompany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReceivableController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']), 403);
        $search = $request->query('search');

        $unpaidInvoicesQuery = Invoice::query()
            ->with(['company', 'portCall.ship'])
            ->where('outstanding_amount', '>', 0)
            ->whereIn('status', ['released', 'sent']);

        $receiptsQuery = ClientReceipt::query()
            ->with(['company', 'recorder', 'allocations.invoice:id,invoice_number'])
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
            'abilities' => [
                'manage' => $request->user()->isOperationalAdmin(),
            ],
        ]);
    }

    public function storeReceipt(StoreClientReceiptRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        return DB::transaction(function () use ($request, $validated): RedirectResponse {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($validated['invoice_id']);
            if ($invoice->company_id !== $validated['company_id']) {
                throw ValidationException::withMessages(['invoice_id' => 'Invoice tidak dimiliki oleh perusahaan yang dipilih.']);
            }
            if (! in_array($invoice->status, ['released', 'sent'], true)) {
                throw ValidationException::withMessages(['invoice_id' => 'Pembayaran hanya dapat dialokasikan ke invoice yang sudah dirilis.']);
            }
            if ((float) $validated['amount'] > (float) $invoice->outstanding_amount) {
                throw ValidationException::withMessages(['amount' => 'Nominal pembayaran melebihi sisa piutang invoice.']);
            }

            $receipt = ClientReceipt::create([
                'company_id' => $validated['company_id'],
                'received_date' => $validated['received_date'],
                'amount' => $validated['amount'],
                'currency' => 'IDR',
                'destination_account' => $validated['destination_account'],
                'bank_reference' => $validated['bank_reference'],
                'proof_path' => $request->file('proof')->store('sja/client-receipts', 'local'),
                'status' => 'confirmed',
                'recorded_by' => $request->user()->id,
            ]);
            $receipt->allocations()->create([
                'invoice_id' => $invoice->id,
                'amount' => $validated['amount'],
            ]);

            $newPaid = (float) $invoice->paid_amount + (float) $validated['amount'];
            $newOutstanding = max(0, (float) $invoice->grand_total - $newPaid);
            $invoice->update([
                'paid_amount' => $newPaid,
                'outstanding_amount' => $newOutstanding,
                'status' => $newOutstanding <= 0 ? 'paid' : 'sent',
                'paid_at' => $newOutstanding <= 0 ? now() : null,
            ]);

            activity('client-receipt')
                ->performedOn($receipt)
                ->causedBy($request->user())
                ->withProperties(['invoice_id' => $invoice->id, 'amount' => (float) $validated['amount']])
                ->log('Pembayaran klien dicatat dan dialokasikan');

            return redirect()->back()->with('success', "Penerimaan pembayaran dari klien ref {$validated['bank_reference']} berhasil dicatat.");
        });
    }

    public function downloadReceipt(Request $request, ClientReceipt $clientReceipt): StreamedResponse
    {
        abort_unless($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']), 403);
        abort_unless($clientReceipt->proof_path && Storage::disk('local')->exists($clientReceipt->proof_path), 404);

        return Storage::disk('local')->download($clientReceipt->proof_path);
    }
}
