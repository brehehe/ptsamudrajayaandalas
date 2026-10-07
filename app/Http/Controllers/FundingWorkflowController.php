<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReviewExpenseRequest;
use App\Http\Requests\StoreFundingBatchRequest;
use App\Http\Requests\StoreFundingWorkflowRequest;
use App\Http\Requests\UpdateFundingWorkflowRequest;
use App\Models\CostDocument;
use App\Models\ExpenseRequest;
use App\Models\FundingReceipt;
use App\Models\FundingRequest;
use App\Models\OutgoingPayment;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FundingWorkflowController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ExpenseRequest::class);
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);
        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? 'all';
        $user = $request->user();

        $expenseRequests = ExpenseRequest::query()
            ->whereDoesntHave(
                'items.costDocumentItem.costDocument',
                fn ($document) => $document->where('document_type', 'vendor_invoice'),
            )
            ->with([
                'portCall.ship',
                'portCall.port',
                'creator:id,name',
                'reviewer:id,name',
                'items.costDocumentItem.costDocument.vendor',
                'fundingRequest.receipts.recorder:id,name',
                'fundingRequest.payments.recorder:id,name',
                'fundingRequest.payments.beneficiary:id,name',
                'fundingRequest.payments.verifier:id,name',
                'fundingRequest.payments.allocations.costDocument.vendor:id,name',
            ])
            ->when($user->isStaff(), fn ($query) => $query->where(function ($scope) use ($user) {
                $scope->where('created_by', $user->id)
                    ->orWhereHas('fundingRequest.payments', fn ($payment) => $payment->where('beneficiary_user_id', $user->id));
            }))
            ->when($status !== 'all', function ($query) use ($status) {
                $query->where(function ($scope) use ($status) {
                    $scope->where('status', $status)
                        ->orWhereHas('fundingRequest', fn ($funding) => $funding->where('status', $status));
                });
            })
            ->when($search, fn ($query, $value) => $query->where(function ($scope) use ($value) {
                $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                $scope->where('request_number', $like, "%{$value}%")
                    ->orWhere('notes', $like, "%{$value}%")
                    ->orWhereHas('portCall.ship', fn ($ship) => $ship->where('name', $like, "%{$value}%"));
            }))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Funding/Index', [
            'expenseRequests' => $expenseRequests,
            'portCalls' => PortCall::query()
                ->with(['ship:id,name', 'port:id,name'])
                ->whereIn('status', ['scheduled', 'anchored', 'berthed', 'departed'])
                ->whereHas('requests.items', fn ($query) => $query
                    ->where('director_status', 'approved')
                    ->where('hpp_price', '>', 0)
                    ->whereDoesntHave('costDocumentItem')
                    ->whereDoesntHave('expenseRequestItem'))
                ->latest('eta_at')
                ->get(['id', 'job_number', 'ship_id', 'port_id']),
            'availableOperationalItems' => RequestItem::query()
                ->where('director_status', 'approved')
                ->where('hpp_price', '>', 0)
                ->whereDoesntHave('costDocumentItem')
                ->whereDoesntHave('expenseRequestItem')
                ->whereHas('request', fn ($query) => $query->whereNotNull('port_call_id'))
                ->with([
                    'request:id,request_number,port_call_id',
                    'request.portCall:id,job_number,ship_id,port_id',
                    'request.portCall.ship:id,name',
                    'request.portCall.port:id,name',
                ])
                ->orderBy('required_date')
                ->get([
                    'id',
                    'request_id',
                    'item_name',
                    'quantity',
                    'unit',
                    'hpp_price',
                ]),
            'operationalUsers' => User::query()
                ->where('is_active', true)
                ->whereHas('roles', fn ($query) => $query->whereIn('name', ['Lapangan', 'Tim Lapangan', 'Staf Operasional']))
                ->orderBy('name')
                ->get(['id', 'name']),
            'filters' => ['search' => $search ?? '', 'status' => $status],
            'abilities' => [
                'create' => Gate::allows('create', ExpenseRequest::class),
                'adminReview' => $user->isOperationalAdmin(),
                'directorApprove' => $user->isDirector(),
                'manageFunding' => $user->isOperationalAdmin(),
            ],
        ]);
    }

    public function store(StoreFundingWorkflowRequest $request): RedirectResponse
    {
        Gate::authorize('create', ExpenseRequest::class);
        $validated = $request->validated();

        $expenseRequest = DB::transaction(function () use ($request, $validated): ExpenseRequest {
            $documentPath = $request->file('document')?->store('sja/vendor-invoices', 'local');
            $isAdmin = $request->user()->isOperationalAdmin();
            $requestItems = RequestItem::query()
                ->whereIn('id', $validated['request_item_ids'])
                ->with([
                    'request:id,port_call_id',
                    'costDocumentItem:id,request_item_id',
                    'expenseRequestItem:id,request_item_id',
                ])
                ->lockForUpdate()
                ->get();

            if ($requestItems->count() !== count($validated['request_item_ids'])) {
                throw ValidationException::withMessages(['request_item_ids' => 'Satu atau beberapa item pengajuan tidak tersedia.']);
            }

            foreach ($requestItems as $requestItem) {
                if ($requestItem->director_status !== 'approved') {
                    throw ValidationException::withMessages(['request_item_ids' => "Item {$requestItem->item_name} belum disetujui Direktur."]);
                }
                if ($requestItem->request?->port_call_id !== $validated['port_call_id']) {
                    throw ValidationException::withMessages(['request_item_ids' => 'Semua item harus berasal dari Kunjungan/Job yang dipilih.']);
                }
                if ($requestItem->costDocumentItem || $requestItem->expenseRequestItem) {
                    throw ValidationException::withMessages(['request_item_ids' => "Item {$requestItem->item_name} sudah dipakai pada invoice atau pengajuan pendanaan lain."]);
                }
                if ((float) $requestItem->hpp_price <= 0) {
                    throw ValidationException::withMessages(['request_item_ids' => "HPP item {$requestItem->item_name} belum valid."]);
                }
            }

            $total = (float) $requestItems->sum(
                fn (RequestItem $requestItem): float => (float) $requestItem->hpp_price * (float) $requestItem->quantity,
            );

            $costDocument = CostDocument::create([
                'port_call_id' => $validated['port_call_id'],
                'vendor_id' => null,
                'document_type' => 'operational',
                'document_number' => null,
                'issuer_name' => $request->user()->name,
                'document_date' => $validated['document_date'],
                'received_date' => now()->toDateString(),
                'currency' => 'IDR',
                'estimated_total' => $total,
                'verified_total' => $total,
                'status' => $isAdmin ? 'verified' : 'received',
                'payment_status' => 'unpaid',
                'document_path' => $documentPath,
                'recorded_by' => $request->user()->id,
                'verified_by' => $isAdmin ? $request->user()->id : null,
                'verified_at' => $isAdmin ? now() : null,
            ]);
            $expenseRequest = ExpenseRequest::create([
                'request_number' => sprintf('FND-SJA-%s-%s', now()->format('ymd'), Str::upper(Str::random(6))),
                'port_call_id' => $validated['port_call_id'],
                'version' => 1,
                'status' => $isAdmin ? 'waiting_director' : 'waiting_admin_review',
                'currency' => 'IDR',
                'total' => $total,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
                'reviewed_by' => $isAdmin ? $request->user()->id : null,
                'submitted_at' => now(),
                'reviewed_at' => $isAdmin ? now() : null,
            ]);
            foreach ($requestItems as $requestItem) {
                $amount = (float) $requestItem->hpp_price * (float) $requestItem->quantity;
                $costItem = $costDocument->items()->create([
                    'request_item_id' => $requestItem->id,
                    'description' => $requestItem->item_name,
                    'quantity' => $requestItem->quantity,
                    'unit' => $requestItem->unit ?: 'Paket',
                    'amount' => $amount,
                    'billable' => true,
                    'billing_classification' => 'reimburse',
                ]);
                $expenseRequest->items()->create([
                    'cost_document_item_id' => $costItem->id,
                    'request_item_id' => $requestItem->id,
                    'description' => $requestItem->item_name,
                    'amount' => $amount,
                ]);
            }

            activity('funding-workflow')
                ->performedOn($expenseRequest)
                ->causedBy($request->user())
                ->withProperties([
                    'source_type' => $validated['source_type'],
                    'request_item_ids' => $requestItems->pluck('id')->all(),
                    'amount' => $total,
                ])
                ->log('Pengajuan pendanaan dibuat');

            return $expenseRequest;
        });

        return back()->with('success', "Pengajuan {$expenseRequest->request_number} berhasil dibuat.");
    }

    public function storeBatch(StoreFundingBatchRequest $request): RedirectResponse
    {
        throw ValidationException::withMessages([
            'invoice_ids' => 'Invoice vendor tidak lagi menggunakan batch pendanaan. Lanjutkan pembayaran melalui menu Pengeluaran.',
        ]);
    }

    public function adminReview(ReviewExpenseRequest $request, ExpenseRequest $expenseRequest): RedirectResponse
    {
        abort_unless($request->user()->isOperationalAdmin(), 403);

        return $this->reviewExpense($request, $expenseRequest, false);
    }

    public function directorReview(ReviewExpenseRequest $request, ExpenseRequest $expenseRequest): RedirectResponse
    {
        abort_unless($request->user()->isDirector(), 403);

        return $this->reviewExpense($request, $expenseRequest, true);
    }

    public function updateFunding(UpdateFundingWorkflowRequest $request, FundingRequest $fundingRequest): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($request, $fundingRequest, $validated): void {
            $funding = FundingRequest::query()->lockForUpdate()->findOrFail($fundingRequest->id);

            match ($validated['action']) {
                'submit_kopra' => $this->submitKopra($request, $funding, $validated),
                'approve_kopra', 'reject_kopra' => $this->decideKopra($request, $funding, $validated),
                'record_receipt' => $this->recordReceipt($request, $funding, $validated),
                'record_payment' => $this->recordPayment($request, $funding, $validated),
                default => throw ValidationException::withMessages(['action' => 'Aksi tidak sesuai tahap pendanaan.']),
            };
        });

        return back()->with('success', 'Tahap pendanaan berhasil diperbarui.');
    }

    public function updatePayment(UpdateFundingWorkflowRequest $request, OutgoingPayment $payment): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($request, $payment, $validated): void {
            $lockedPayment = OutgoingPayment::query()->lockForUpdate()->findOrFail($payment->id);

            if ($validated['action'] === 'submit_usage') {
                abort_unless(
                    $request->user()->id === $lockedPayment->beneficiary_user_id
                    || $request->user()->isOperationalAdmin(),
                    403,
                );
                if ($lockedPayment->payment_destination !== 'operational' || $lockedPayment->verification_status !== 'waiting_usage_proof') {
                    throw ValidationException::withMessages(['action' => 'Bukti penggunaan dana tidak dapat dikirim pada status ini.']);
                }
                if ((float) $validated['actual_amount'] + (float) $validated['remaining_amount'] !== (float) $lockedPayment->amount) {
                    throw ValidationException::withMessages(['actual_amount' => 'Nominal aktual dan sisa dana harus sama dengan dana yang ditransfer.']);
                }

                $lockedPayment->update([
                    'actual_amount' => $validated['actual_amount'],
                    'remaining_amount' => $validated['remaining_amount'],
                    'usage_proof_path' => $request->file('proof')->store('sja/operational-realizations', 'local'),
                    'notes' => $validated['notes'] ?? $lockedPayment->notes,
                    'realized_at' => now(),
                    'verification_status' => 'waiting_admin_verification',
                ]);
            } elseif ($validated['action'] === 'verify_usage') {
                abort_unless($request->user()->isOperationalAdmin(), 403);
                if (! in_array($lockedPayment->verification_status, ['pending', 'waiting_admin_verification'], true)) {
                    throw ValidationException::withMessages(['action' => 'Pembayaran ini sudah diverifikasi atau belum mempunyai bukti yang lengkap.']);
                }
                $lockedPayment->update([
                    'verification_status' => 'verified',
                    'verified_by' => $request->user()->id,
                    'verified_at' => now(),
                ]);
                if ($lockedPayment->payment_destination === 'vendor') {
                    $this->applyVerifiedVendorPayment($lockedPayment);
                }
                $this->completeFundingWhenSettled($lockedPayment->fundingRequest);
            } else {
                throw ValidationException::withMessages(['action' => 'Aksi pembayaran tidak valid.']);
            }

            activity('funding-workflow')
                ->performedOn($lockedPayment)
                ->causedBy($request->user())
                ->withProperties(['action' => $validated['action']])
                ->log('Realisasi pembayaran pendanaan diperbarui');
        });

        return back()->with('success', 'Bukti dan realisasi pembayaran berhasil diperbarui.');
    }

    public function download(Request $request, string $type, string $id): StreamedResponse
    {
        Gate::authorize('viewAny', ExpenseRequest::class);
        [$disk, $path] = match ($type) {
            'cost' => ['local', CostDocument::findOrFail($id)->document_path],
            'funding' => ['local', FundingRequest::findOrFail($id)->document_path],
            'receipt' => ['local', FundingReceipt::findOrFail($id)->proof_path],
            'payment' => ['local', OutgoingPayment::findOrFail($id)->proof_path],
            'usage' => ['local', OutgoingPayment::findOrFail($id)->usage_proof_path],
            default => abort(404),
        };
        abort_unless($path && Storage::disk($disk)->exists($path), 404);

        return $request->boolean('view')
            ? Storage::disk($disk)->response($path)
            : Storage::disk($disk)->download($path);
    }

    private function reviewExpense(ReviewExpenseRequest $request, ExpenseRequest $expenseRequest, bool $directorStage): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($request, $expenseRequest, $validated, $directorStage): void {
            $expense = ExpenseRequest::query()->lockForUpdate()->findOrFail($expenseRequest->id);
            $expectedStatus = $directorStage ? 'waiting_director' : 'waiting_admin_review';

            if ($expense->status !== $expectedStatus && ! (! $directorStage && $expense->status === 'revision')) {
                throw ValidationException::withMessages(['decision' => 'Pengajuan sudah diproses atau belum mencapai tahap ini.']);
            }
            if ($directorStage && $expense->created_by === $request->user()->id) {
                abort(403, 'Pembuat pengajuan tidak dapat menyetujui pengajuannya sendiri.');
            }

            $nextStatus = match ($validated['decision']) {
                'approve' => $directorStage ? 'approved_director' : 'waiting_director',
                'revision' => 'revision',
                default => 'rejected',
            };
            $expense->update([
                'status' => $nextStatus,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'notes' => $validated['notes'] ?? $expense->notes,
            ]);

            if ($directorStage && $validated['decision'] === 'approve') {
                $expense->fundingRequest()->firstOrCreate([], [
                    'requested_amount' => $expense->total,
                    'approved_amount' => $validated['approved_amount'],
                    'status' => 'approved_director',
                    'created_by' => $expense->created_by,
                    'authorized_by' => $request->user()->id,
                    'authorized_at' => now(),
                    'decision_notes' => $validated['notes'] ?? null,
                ]);
            }

            activity('funding-workflow')
                ->performedOn($expense)
                ->causedBy($request->user())
                ->withProperties(['stage' => $directorStage ? 'director' : 'admin', 'decision' => $validated['decision']])
                ->log('Pengajuan biaya ditinjau');
        });

        return back()->with('success', 'Keputusan pengajuan berhasil disimpan.');
    }

    /** @param array<string, mixed> $validated */
    private function submitKopra(UpdateFundingWorkflowRequest $request, FundingRequest $funding, array $validated): void
    {
        abort_unless($request->user()->isOperationalAdmin(), 403);
        if ($funding->status !== 'approved_director') {
            throw ValidationException::withMessages(['action' => 'Pengajuan belum disetujui Direktur atau sudah diajukan ke Kopra.']);
        }
        if (FundingRequest::where('kopra_reference', $validated['kopra_reference'])->whereKeyNot($funding->id)->exists()) {
            throw ValidationException::withMessages(['kopra_reference' => 'Nomor pengajuan Kopra sudah digunakan.']);
        }

        $funding->update([
            'kopra_reference' => $validated['kopra_reference'],
            'submitted_date' => $validated['submitted_date'],
            'kopra_submitted_at' => now(),
            'status' => 'kopra_submitted',
            'decision_notes' => $validated['notes'] ?? $funding->decision_notes,
        ]);
    }

    /** @param array<string, mixed> $validated */
    private function decideKopra(UpdateFundingWorkflowRequest $request, FundingRequest $funding, array $validated): void
    {
        abort_unless($request->user()->isDirector(), 403);
        if ($funding->status !== 'kopra_submitted') {
            throw ValidationException::withMessages(['action' => 'Pengajuan belum tercatat dikirim ke Kopra atau sudah diputuskan.']);
        }

        if ($validated['action'] === 'reject_kopra') {
            $funding->update(['status' => 'kopra_rejected', 'decision_notes' => $validated['notes'] ?? 'Ditolak pada tahap Kopra']);

            return;
        }

        if ((float) $validated['approved_amount'] > (float) $funding->requested_amount) {
            throw ValidationException::withMessages(['approved_amount' => 'Nominal persetujuan Kopra tidak boleh melebihi nilai pengajuan.']);
        }
        $funding->update([
            'approved_amount' => $validated['approved_amount'],
            'status' => 'kopra_approved',
            'authorized_by' => $request->user()->id,
            'authorized_at' => now(),
            'kopra_approved_at' => now(),
            'decision_notes' => $validated['notes'] ?? $funding->decision_notes,
        ]);
    }

    /** @param array<string, mixed> $validated */
    private function recordReceipt(UpdateFundingWorkflowRequest $request, FundingRequest $funding, array $validated): void
    {
        abort_unless($request->user()->isOperationalAdmin(), 403);
        if (! in_array($funding->status, ['kopra_approved', 'funds_received_partial'], true)) {
            throw ValidationException::withMessages(['action' => 'Dana hanya dapat dicatat setelah persetujuan Kopra.']);
        }
        if (FundingReceipt::where('reference_number', $validated['reference_number'])->exists()) {
            throw ValidationException::withMessages(['reference_number' => 'Referensi pencairan sudah pernah dicatat.']);
        }

        $receivedTotal = (float) $funding->receipts()->sum('amount');
        $approvedAmount = (float) $funding->approved_amount;
        if ($receivedTotal + (float) $validated['amount'] > $approvedAmount) {
            throw ValidationException::withMessages(['amount' => 'Total dana cair tidak boleh melebihi nominal yang disetujui Kopra.']);
        }

        $funding->receipts()->create([
            'received_date' => $validated['received_date'],
            'amount' => $validated['amount'],
            'destination_account' => $validated['destination_account'],
            'reference_number' => $validated['reference_number'],
            'proof_path' => $request->file('proof')->store('sja/funding-receipts', 'local'),
            'recorded_by' => $request->user()->id,
        ]);
        $newTotal = $receivedTotal + (float) $validated['amount'];
        $funding->update([
            'status' => $newTotal >= $approvedAmount ? 'funds_received' : 'funds_received_partial',
            'destination_account' => $validated['destination_account'],
            'disbursed_at' => $newTotal >= $approvedAmount ? now() : null,
        ]);
    }

    /** @param array<string, mixed> $validated */
    private function recordPayment(UpdateFundingWorkflowRequest $request, FundingRequest $funding, array $validated): void
    {
        abort_unless($request->user()->isOperationalAdmin(), 403);
        if (! in_array($funding->status, ['funds_received', 'funds_received_partial', 'payment_in_progress'], true)) {
            throw ValidationException::withMessages(['action' => 'Pembayaran hanya dapat dicatat setelah dana diterima.']);
        }
        if (OutgoingPayment::where('reference_number', $validated['reference_number'])->exists()) {
            throw ValidationException::withMessages(['reference_number' => 'Referensi pembayaran sudah pernah dicatat.']);
        }

        $available = (float) $funding->receipts()->sum('amount') - (float) $funding->payments()->sum('amount');
        if ((float) $validated['amount'] > $available) {
            throw ValidationException::withMessages(['amount' => 'Nominal pembayaran melebihi dana cair yang belum dialokasikan.']);
        }

        $payment = $funding->payments()->create([
            'port_call_id' => $funding->expenseRequest->port_call_id,
            'payment_type' => 'Transfer Operasional',
            'payment_date' => $validated['payment_date'],
            'amount' => $validated['amount'],
            'currency' => 'IDR',
            'recipient' => $validated['recipient'],
            'reference_number' => $validated['reference_number'],
            'proof_path' => $request->file('proof')->store('sja/outgoing-payments', 'local'),
            'verification_status' => 'waiting_usage_proof',
            'recorded_by' => $request->user()->id,
            'beneficiary_user_id' => $validated['beneficiary_user_id'] ?? null,
            'payment_destination' => $validated['payment_destination'],
            'notes' => $validated['notes'] ?? null,
        ]);
        $funding->update(['status' => 'waiting_usage_proof']);
    }

    private function completeFundingWhenSettled(?FundingRequest $funding): void
    {
        if (! $funding) {
            return;
        }
        $received = (float) $funding->receipts()->sum('amount');
        $verifiedPayments = (float) $funding->payments()->where('verification_status', 'verified')->sum('amount');

        $vendorDocuments = CostDocument::query()
            ->where('document_type', 'vendor_invoice')
            ->whereHas('items.expenseRequestItem', fn ($query) => $query->where('expense_request_id', $funding->expense_request_id))
            ->get(['id', 'payment_status']);
        $vendorInvoicesSettled = $vendorDocuments->isEmpty()
            || $vendorDocuments->every(fn (CostDocument $document) => $document->payment_status === 'paid');

        if ($received > 0 && $verifiedPayments >= $received && $vendorInvoicesSettled) {
            $funding->update(['status' => 'completed']);
            $funding->expenseRequest()->update(['status' => 'completed']);
        }
    }

    private function applyVerifiedVendorPayment(OutgoingPayment $payment): void
    {
        $payment->load('allocations.costDocument');
        foreach ($payment->allocations as $allocation) {
            $document = CostDocument::query()->lockForUpdate()->findOrFail($allocation->cost_document_id);
            $paid = (float) $document->paymentAllocations()
                ->whereHas('payment', fn ($query) => $query->where('verification_status', 'verified'))
                ->sum('amount');
            $total = (float) $document->verified_total;
            $document->update([
                'paid_amount' => min($paid, $total),
                'payment_status' => $paid >= $total ? 'paid' : 'partially_paid',
                'paid_at' => $paid >= $total ? now() : null,
            ]);
        }
    }
}
