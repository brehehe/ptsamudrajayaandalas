<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOutgoingPaymentRequest;
use App\Models\CostDocument;
use App\Models\OutgoingPayment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']), 403);
        $validated = $request->validate([
            'type' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['all', 'pending', 'verified'])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $type = $validated['type'] ?? 'all';
        $status = $validated['status'] ?? 'all';
        $search = $validated['search'] ?? null;

        $query = OutgoingPayment::query()->with([
            'portCall.ship:id,name',
            'portCall.port:id,name',
            'recorder:id,name',
            'verifier:id,name',
            'allocations:id,outgoing_payment_id,cost_document_id,amount',
            'allocations.costDocument:id,document_number',
        ]);

        if ($type !== 'all') {
            $query->where('payment_type', 'ilike', "%{$type}%");
        }

        if ($status === 'verified') {
            $query->where('verification_status', 'verified');
        } elseif ($status === 'pending') {
            $query->where('verification_status', 'pending');
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'ilike', "%{$search}%")
                    ->orWhere('recipient', 'ilike', "%{$search}%")
                    ->orWhere('payment_type', 'ilike', "%{$search}%")
                    ->orWhereHas('allocations.costDocument', fn ($invoice) => $invoice->where('document_number', 'ilike', "%{$search}%"))
                    ->orWhereHas('portCall.ship', fn ($sq) => $sq->where('name', 'ilike', "%{$search}%"));
            });
        }

        $expenses = $query
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        $totalAmount = OutgoingPayment::sum('amount');
        $verifiedAmount = OutgoingPayment::where('verification_status', 'verified')->sum('amount');
        $pendingAmount = OutgoingPayment::where('verification_status', 'pending')->sum('amount');

        $payableVendorInvoices = collect();
        if ($request->user()->isOperationalAdmin()) {
            $payableVendorInvoices = CostDocument::query()
                ->select([
                    'id',
                    'port_call_id',
                    'vendor_id',
                    'document_number',
                    'issuer_name',
                    'verified_total',
                    'paid_amount',
                    'payment_status',
                    'due_date',
                    'received_date',
                ])
                ->where('document_type', 'vendor_invoice')
                ->where('status', 'verified')
                ->whereIn('payment_status', ['unpaid', 'partially_paid'])
                ->whereDoesntHave(
                    'paymentAllocations.payment',
                    fn ($payment) => $payment->whereIn('verification_status', ['pending', 'waiting_admin_verification']),
                )
                ->withSum([
                    'paymentAllocations as allocated_amount' => fn ($allocation) => $allocation
                        ->whereHas('payment', fn ($payment) => $payment->whereIn('verification_status', [
                            'pending',
                            'waiting_admin_verification',
                            'verified',
                        ])),
                ], 'amount')
                ->with([
                    'vendor:id,name',
                    'portCall:id,job_number,ship_id,port_id',
                    'portCall.ship:id,name',
                    'portCall.port:id,name',
                ])
                ->orderBy('due_date')
                ->orderBy('received_date')
                ->orderBy('id')
                ->get()
                ->map(function (CostDocument $invoice): ?array {
                    $outstandingAmount = max(
                        0,
                        (float) $invoice->verified_total - (float) ($invoice->allocated_amount ?? 0),
                    );

                    if ($outstandingAmount <= 0) {
                        return null;
                    }

                    return [
                        'id' => $invoice->id,
                        'document_number' => $invoice->document_number,
                        'vendor_name' => $invoice->vendor?->name ?? $invoice->issuer_name,
                        'verified_total' => (float) $invoice->verified_total,
                        'paid_amount' => (float) $invoice->paid_amount,
                        'outstanding_amount' => $outstandingAmount,
                        'payable_amount' => $outstandingAmount,
                        'due_date' => $invoice->due_date?->toDateString(),
                        'port_call' => [
                            'job_number' => $invoice->portCall?->job_number,
                            'ship_name' => $invoice->portCall?->ship?->name,
                            'port_name' => $invoice->portCall?->port?->name,
                        ],
                    ];
                })
                ->filter()
                ->values();
        }

        return Inertia::render('Expenses/Index', [
            'expenses' => $expenses,
            'payableVendorInvoices' => $payableVendorInvoices,
            'stats' => [
                'total' => (float) $totalAmount,
                'verified' => (float) $verifiedAmount,
                'pending' => (float) $pendingAmount,
                'count' => OutgoingPayment::count(),
            ],
            'filters' => [
                'type' => $type,
                'status' => $status,
                'search' => $search ?? '',
            ],
            'abilities' => [
                'manage' => $request->user()->isOperationalAdmin(),
            ],
        ]);
    }

    public function store(StoreOutgoingPaymentRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $payment = DB::transaction(function () use ($request, $validated): OutgoingPayment {
            $invoice = CostDocument::query()
                ->with('vendor:id,name')
                ->lockForUpdate()
                ->findOrFail($validated['cost_document_id']);

            if ($invoice->document_type !== 'vendor_invoice' || $invoice->status !== 'verified') {
                throw ValidationException::withMessages([
                    'cost_document_id' => 'Invoice vendor belum terverifikasi atau tidak tersedia untuk pembayaran.',
                ]);
            }

            if (! in_array($invoice->payment_status, ['unpaid', 'partially_paid'], true)) {
                throw ValidationException::withMessages([
                    'cost_document_id' => 'Invoice vendor ini sudah dibayar penuh.',
                ]);
            }

            $allocatedAmount = (float) $invoice->paymentAllocations()
                ->whereHas('payment', fn ($paymentQuery) => $paymentQuery->whereIn('verification_status', [
                    'pending',
                    'waiting_admin_verification',
                    'verified',
                ]))
                ->sum('amount');
            $outstandingAmount = max(0, (float) $invoice->verified_total - $allocatedAmount);

            if ((float) $validated['amount'] > $outstandingAmount) {
                throw ValidationException::withMessages([
                    'amount' => 'Nominal pembayaran melebihi sisa invoice vendor yang belum dialokasikan.',
                ]);
            }

            $verifiedAt = now();
            $payment = OutgoingPayment::create([
                'port_call_id' => $invoice->port_call_id,
                'payment_type' => 'Pembayaran Vendor',
                'recipient' => $invoice->vendor?->name ?? $invoice->issuer_name,
                'amount' => $validated['amount'],
                'currency' => 'IDR',
                'payment_date' => $validated['payment_date'],
                'reference_number' => $validated['reference_number'],
                'proof_path' => $request->file('proof')->store('sja/outgoing-payments', 'local'),
                'verification_status' => 'verified',
                'recorded_by' => $request->user()->id,
                'verified_by' => $request->user()->id,
                'verified_at' => $verifiedAt,
                'payment_destination' => 'vendor',
                'notes' => $validated['notes'] ?? null,
            ]);

            $payment->allocations()->create([
                'cost_document_id' => $invoice->id,
                'amount' => $validated['amount'],
            ]);

            $paidAmount = (float) $invoice->paymentAllocations()
                ->whereHas('payment', fn ($paymentQuery) => $paymentQuery->where('verification_status', 'verified'))
                ->sum('amount');
            $invoiceTotal = (float) $invoice->verified_total;
            $isPaid = $paidAmount >= $invoiceTotal;

            $invoice->update([
                'paid_amount' => min($paidAmount, $invoiceTotal),
                'payment_status' => $isPaid ? 'paid' : 'partially_paid',
                'paid_at' => $isPaid ? $verifiedAt : null,
            ]);

            activity('vendor-payment')
                ->performedOn($payment)
                ->causedBy($request->user())
                ->withProperties([
                    'cost_document_id' => $invoice->id,
                    'invoice_number' => $invoice->document_number,
                    'amount' => (float) $validated['amount'],
                    'payment_status' => $invoice->payment_status,
                ])
                ->log('Pembayaran invoice vendor dicatat dan diselesaikan');

            return $payment;
        });

        return redirect()->back()->with('success', "Pembayaran {$payment->reference_number} berhasil dicatat. Status invoice langsung diperbarui.");
    }
}
