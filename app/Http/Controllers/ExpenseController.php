<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCompanyExpenseRequest;
use App\Http\Requests\StoreOutgoingPaymentRequest;
use App\Models\CostDocument;
use App\Models\ExpenseRequest;
use App\Models\OutgoingPayment;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Support\WorkflowNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpenseController extends Controller
{
    public function __construct(private readonly WorkflowNotifier $workflowNotifier) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']), 403);
        $validated = $request->validate([
            'tab' => ['nullable', Rule::in(['vendor_invoices', 'company_expenses'])],
            'type' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['all', 'pending', 'verified'])],
            'search' => ['nullable', 'string', 'max:100'],
            'company_id' => ['nullable', 'string'],
            'ship_id' => ['nullable', 'string'],
            'job' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);
        $tab = $validated['tab'] ?? 'vendor_invoices';
        $type = $validated['type'] ?? 'all';
        $status = $validated['status'] ?? 'all';
        $search = $validated['search'] ?? null;
        $companyId = $validated['company_id'] ?? null;
        $shipId = $validated['ship_id'] ?? null;
        $job = $validated['job'] ?? null;
        $startDate = $validated['start_date'] ?? null;
        $endDate = $validated['end_date'] ?? null;

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

        if ($companyId) {
            $query->whereHas('portCall', function ($pq) use ($companyId) {
                $pq->where(function ($sub) use ($companyId) {
                    $sub->whereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId))
                        ->orWhereHas('workOrder', fn ($wq) => $wq->where('company_id', $companyId));
                });
            });
        }

        if ($shipId) {
            $query->whereHas('portCall', fn ($pq) => $pq->where('ship_id', $shipId));
        }

        if ($job) {
            $query->whereHas('portCall', fn ($pq) => $pq->where('job_number', 'ilike', "%{$job}%")->orWhere('id', $job));
        }

        if ($startDate) {
            $query->whereDate('payment_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('payment_date', '<=', $endDate);
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

        $companyExpenseRequests = ExpenseRequest::query()
            ->where('scope', 'company')
            ->with(['creator:id,name', 'reviewer:id,name', 'realizer:id,name', 'items:id,expense_request_id,description,amount'])
            ->when($search, fn ($expenseQuery, $value) => $expenseQuery->where(function ($scope) use ($value) {
                $scope->where('request_number', 'ilike', "%{$value}%")
                    ->orWhere('category', 'ilike', "%{$value}%")
                    ->orWhereHas('items', fn ($itemQuery) => $itemQuery->where('description', 'ilike', "%{$value}%"));
            }))
            ->latest('created_at')
            ->paginate(10, ['*'], 'company_page')
            ->withQueryString();

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

        $companies = ShipCompany::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $ships = Ship::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'ship_company_id']);
        $jobs = PortCall::query()->latest('created_at')->limit(100)->get(['id', 'job_number', 'ship_id']);

        return Inertia::render('Expenses/Index', [
            'expenses' => $expenses,
            'payableVendorInvoices' => $payableVendorInvoices,
            'companyExpenseRequests' => $companyExpenseRequests,
            'companies' => $companies,
            'ships' => $ships,
            'jobs' => $jobs,
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
                'company_id' => $companyId ?? '',
                'ship_id' => $shipId ?? '',
                'job' => $job ?? '',
                'start_date' => $startDate ?? '',
                'end_date' => $endDate ?? '',
            ],
            'activeTab' => $tab,
            'abilities' => [
                'manage' => $request->user()->isOperationalAdmin(),
                'create_company_expense' => $request->user()->isOperationalAdmin(),
                'decide_company_expense' => $request->user()->isDirector(),
                'realize_company_expense' => $request->user()->isOperationalAdmin(),
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

    public function storeCompanyExpense(StoreCompanyExpenseRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $documentPath = $request->hasFile('supporting_document')
            ? $request->file('supporting_document')->store('sja/company-expenses/supporting-documents', 'local')
            : null;

        try {
            $expenseRequest = DB::transaction(function () use ($request, $validated, $documentPath): ExpenseRequest {
                $expenseRequest = ExpenseRequest::create([
                    'request_number' => sprintf('PNG-SJA-%s-%s', now()->format('ymd'), Str::upper(Str::random(6))),
                    'port_call_id' => null,
                    'scope' => 'company',
                    'category' => $validated['category'],
                    'version' => 1,
                    'status' => 'waiting_director',
                    'currency' => 'IDR',
                    'total' => $validated['amount'],
                    'notes' => $validated['notes'] ?? null,
                    'supporting_document_path' => $documentPath,
                    'created_by' => $request->user()->id,
                    'submitted_at' => now(),
                ]);
                $expenseRequest->items()->create([
                    'description' => $validated['description'],
                    'amount' => $validated['amount'],
                ]);

                activity('company-expense')
                    ->performedOn($expenseRequest)
                    ->causedBy($request->user())
                    ->withProperties(['category' => $validated['category'], 'amount' => (float) $validated['amount']])
                    ->log('Pengajuan biaya nonkapal dikirim ke Direktur');

                return $expenseRequest;
            }, attempts: 3);
        } catch (\Throwable $exception) {
            if ($documentPath) {
                Storage::disk('local')->delete($documentPath);
            }

            throw $exception;
        }

        $this->workflowNotifier->notifyCompanyExpenseSubmission($expenseRequest, $request->user());

        return redirect()->back()->with('success', "Pengajuan {$expenseRequest->request_number} berhasil dikirim ke Direktur.");
    }

    public function decideCompanyExpense(Request $request, ExpenseRequest $expenseRequest): RedirectResponse
    {
        abort_unless($request->user()?->isDirector(), 403);
        $validated = $request->validate([
            'decision' => ['required', Rule::in(['approve', 'reject'])],
            'notes' => ['nullable', 'required_if:decision,reject', 'string', 'max:1000'],
        ]);

        $decidedExpense = DB::transaction(function () use ($request, $expenseRequest, $validated): ExpenseRequest {
            $lockedExpense = ExpenseRequest::query()->lockForUpdate()->findOrFail($expenseRequest->id);
            if ($lockedExpense->scope !== 'company' || $lockedExpense->status !== 'waiting_director') {
                throw ValidationException::withMessages(['decision' => 'Pengajuan ini sudah diputuskan atau tidak lagi tersedia.']);
            }

            $lockedExpense->update([
                'status' => $validated['decision'] === 'approve' ? 'approved' : 'rejected',
                'notes' => $validated['notes'] ?? $lockedExpense->notes,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            activity('company-expense')
                ->performedOn($lockedExpense)
                ->causedBy($request->user())
                ->withProperties(['decision' => $validated['decision'], 'notes' => $validated['notes'] ?? null])
                ->log($validated['decision'] === 'approve' ? 'Biaya nonkapal disetujui Direktur' : 'Biaya nonkapal ditolak Direktur');

            return $lockedExpense;
        }, attempts: 3);

        $this->workflowNotifier->notifyCompanyExpenseDecision($decidedExpense, $request->user());

        return redirect()->back()->with('success', 'Keputusan pengajuan biaya perusahaan berhasil disimpan.');
    }

    public function realizeCompanyExpense(Request $request, ExpenseRequest $expenseRequest): RedirectResponse
    {
        abort_unless($request->user()?->isOperationalAdmin(), 403);
        $validated = $request->validate([
            'realized_amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'realized_date' => ['required', 'date', 'before_or_equal:today'],
            'payment_reference' => ['required', 'string', 'max:100'],
            'payment_proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);
        $proofPath = $request->file('payment_proof')->store('sja/company-expenses/payment-proofs', 'local');

        try {
            DB::transaction(function () use ($request, $expenseRequest, $validated, $proofPath): void {
                $lockedExpense = ExpenseRequest::query()->lockForUpdate()->findOrFail($expenseRequest->id);
                if ($lockedExpense->scope !== 'company' || $lockedExpense->status !== 'approved') {
                    throw ValidationException::withMessages(['realized_amount' => 'Hanya pengajuan yang sudah disetujui dan belum dibayar yang dapat direalisasikan.']);
                }

                $lockedExpense->update([
                    'status' => 'realized',
                    'realized_amount' => $validated['realized_amount'],
                    'realized_date' => $validated['realized_date'],
                    'payment_reference' => $validated['payment_reference'],
                    'payment_proof_path' => $proofPath,
                    'realized_by' => $request->user()->id,
                    'realized_at' => now(),
                ]);

                activity('company-expense')
                    ->performedOn($lockedExpense)
                    ->causedBy($request->user())
                    ->withProperties(['realized_amount' => (float) $validated['realized_amount']])
                    ->log('Realisasi biaya nonkapal dicatat');
            }, attempts: 3);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($proofPath);
            throw $exception;
        }

        return redirect()->back()->with('success', 'Realisasi biaya perusahaan berhasil dicatat.');
    }

    public function downloadCompanyExpenseDocument(Request $request, ExpenseRequest $expenseRequest, string $type): StreamedResponse
    {
        Gate::authorize('view', $expenseRequest);
        abort_unless($expenseRequest->scope === 'company', 404);
        $path = match ($type) {
            'supporting' => $expenseRequest->supporting_document_path,
            'payment' => $expenseRequest->payment_proof_path,
            default => null,
        };
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return $request->boolean('view')
            ? Storage::disk('local')->response($path)
            : Storage::disk('local')->download($path);
    }
}
