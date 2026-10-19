<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceRequest;
use App\Http\Requests\UpdateInvoiceWorkflowRequest;
use App\Models\Invoice;
use App\Models\InvoiceItemSource;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Support\InvoiceDocumentSettings;
use App\Support\InvoicePdfGenerator;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class InvoiceController extends Controller
{
    public function __construct(private InvoiceDocumentSettings $invoiceDocumentSettings) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Invoice::class);
        $validated = $request->validate([
            'type' => ['nullable', 'in:all,agency,reimburse'],
            'status' => ['nullable', 'in:all,draft,released,sent,paid'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $type = $validated['type'] ?? 'all';
        $status = $validated['status'] ?? 'all';
        $search = $validated['search'] ?? null;

        $query = Invoice::query()
            ->with([
                'portCall.ship:id,name,imo_number',
                'company:id,name',
                'request:id,request_number',
                'items.sources:id,invoice_item_id,source_cost',
            ])
            ->withCount('items');

        if ($type !== 'all') {
            $query->where('invoice_type', $type);
        }

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'ilike', "%{$search}%")
                    ->orWhere('subject', 'ilike', "%{$search}%")
                    ->orWhere('notes', 'ilike', "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', 'ilike', "%{$search}%"))
                    ->orWhereHas('portCall.ship', fn ($sq) => $sq->where('name', 'ilike', "%{$search}%"));
            });
        }

        $invoices = $query
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString()
            ->through(function (Invoice $invoice): Invoice {
                $totalHpp = (float) $invoice->items->sum(
                    fn ($item): float => (float) $item->sources->sum('source_cost'),
                );
                $margin = (float) $invoice->grand_total - $totalHpp;

                $invoice->setAttribute('total_hpp', $totalHpp);
                $invoice->setAttribute('margin', $margin);
                $invoice->setAttribute(
                    'margin_percentage',
                    (float) $invoice->grand_total > 0 ? round(($margin / (float) $invoice->grand_total) * 100, 2) : 0,
                );

                return $invoice;
            });

        $totalInvoiceHpp = (float) InvoiceItemSource::query()
            ->whereHas('invoiceItem.invoice')
            ->sum('source_cost');
        $totalInvoiced = (float) Invoice::sum('grand_total');

        $stats = [
            'total_invoiced' => $totalInvoiced,
            'total_hpp' => $totalInvoiceHpp,
            'total_margin' => $totalInvoiced - $totalInvoiceHpp,
            'total_paid' => (float) Invoice::sum('paid_amount'),
            'total_outstanding' => (float) Invoice::sum('outstanding_amount'),
            'count' => Invoice::count(),
            'agency_count' => Invoice::where('invoice_type', 'agency')->count(),
            'reimburse_count' => Invoice::where('invoice_type', 'reimburse')->count(),
        ];

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'stats' => $stats,
            'filters' => [
                'type' => $type,
                'status' => $status,
                'search' => $search ?? '',
            ],
            'abilities' => [
                'manage' => Gate::allows('create', Invoice::class),
            ],
        ]);
    }

    public function store(StoreInvoiceRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $supportingDocumentPath = $request->hasFile('supporting_document')
            ? $request->file('supporting_document')->store('sja/client-invoices/supporting-documents', 'local')
            : null;

        try {
            $invoice = DB::transaction(
                fn (): Invoice => $this->persistInvoice($request, $validated, null, $supportingDocumentPath),
                attempts: 3,
            );
        } catch (Throwable $exception) {
            if ($supportingDocumentPath) {
                Storage::disk('local')->delete($supportingDocumentPath);
            }

            throw $exception;
        }

        return redirect()->route('invoices.index')
            ->with('success', "Invoice {$invoice->invoice_number} berhasil dibuat dari item terpilih.");
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Invoice::class);
        $validated = $request->validate([
            'job' => ['nullable', 'uuid', 'exists:port_calls,id'],
        ]);

        return Inertia::render('Invoices/Form', [
            ...$this->formData(),
            'initialPortCallId' => $validated['job'] ?? null,
        ]);
    }

    public function edit(Invoice $invoice): Response
    {
        Gate::authorize('view', $invoice);
        $invoice->load(['items' => fn ($query) => $query->with('sources')->orderBy('sort_order')]);

        return Inertia::render('Invoices/Form', $this->formData($invoice));
    }

    public function update(UpdateInvoiceRequest $request, Invoice $invoice): RedirectResponse
    {
        Gate::authorize('update', $invoice);
        $validated = $request->validated();
        $newSupportingDocumentPath = $request->hasFile('supporting_document')
            ? $request->file('supporting_document')->store('sja/client-invoices/supporting-documents', 'local')
            : null;
        $oldSupportingDocumentPath = $invoice->supporting_document_path;

        try {
            $invoice = DB::transaction(
                fn (): Invoice => $this->persistInvoice($request, $validated, $invoice, $newSupportingDocumentPath),
                attempts: 3,
            );
        } catch (Throwable $exception) {
            if ($newSupportingDocumentPath) {
                Storage::disk('local')->delete($newSupportingDocumentPath);
            }

            throw $exception;
        }

        if ($newSupportingDocumentPath && $oldSupportingDocumentPath) {
            Storage::disk('local')->delete($oldSupportingDocumentPath);
        }

        return redirect()->route('invoices.index')
            ->with('success', "Invoice {$invoice->invoice_number} berhasil diperbarui.");
    }

    /**
     * @return array<string, mixed>
     */
    private function formData(?Invoice $editingInvoice = null): array
    {
        $editingInvoiceId = $editingInvoice?->id;
        $editingPortCallId = $editingInvoice?->port_call_id;

        $editingLines = $editingInvoice?->items
            ->sortBy('sort_order')
            ->values()
            ->map(fn ($item): array => [
                'id' => $item->id,
                'section_title' => $item->section_title,
                'description' => $item->description,
                'quantity' => (string) $item->quantity,
                'unit' => $item->unit,
                'unit_price' => (string) $item->unit_price,
                'allocated_hpp' => (string) ((float) $item->sources->sum('source_cost')),
                'source_item_ids' => $item->sources->pluck('request_item_id')
                    ->when(
                        $item->sources->isEmpty() && $item->request_item_id,
                        fn ($ids) => $ids->push($item->request_item_id),
                    )
                    ->unique()
                    ->values()
                    ->all(),
            ])
            ->all() ?? [];

        $portCalls = PortCall::query()
            ->with([
                'ship:id,name,ship_company_id',
                'ship.company:id,name',
                'port:id,name',
                'workOrder:id,company_id,client_number',
                'workOrder.company:id,name',
            ])
            ->where(function ($query) use ($editingPortCallId): void {
                $query->whereHas('completionNote');
                if ($editingPortCallId) {
                    $query->orWhereKey($editingPortCallId);
                }
            })
            ->whereHas('requests.items')
            ->latest('departed_at')
            ->get(['id', 'job_number', 'work_order_id', 'ship_id', 'port_id', 'eta_at', 'etd_at', 'departed_at'])
            ->map(fn (PortCall $portCall): array => [
                'id' => $portCall->id,
                'job_number' => $portCall->job_number,
                'client_spk_number' => $portCall->workOrder?->client_number,
                'eta_at' => $portCall->eta_at?->toDateString(),
                'etd_at' => $portCall->etd_at?->toDateString(),
                'company_id' => $portCall->workOrder?->company_id ?? $portCall->ship?->ship_company_id,
                'company' => ($portCall->workOrder?->company ?? $portCall->ship?->company)?->only(['id', 'name', 'address']),
                'ship' => $portCall->ship?->only(['id', 'name']),
                'port' => $portCall->port?->only(['id', 'name']),
            ]);

        $shipRequests = ShipRequest::query()
            ->whereIn('port_call_id', $portCalls->pluck('id'))
            ->whereHas('items')
            ->with([
                'items.product:id,item_type',
                'items.vendor:id,name',
                'items.invoiceItem:id,invoice_id,request_item_id',
                'items.invoiceItem.invoice:id,invoice_number,status',
                'items.invoiceSources.invoiceItem:id,invoice_id',
                'items.invoiceSources.invoiceItem.invoice:id,invoice_number,status',
            ])
            ->latest('request_date')
            ->latest('created_at')
            ->get(['id', 'request_number', 'port_call_id', 'company_id', 'status'])
            ->map(fn (ShipRequest $shipRequest): array => [
                'id' => $shipRequest->id,
                'request_number' => $shipRequest->request_number,
                'port_call_id' => $shipRequest->port_call_id,
                'items' => $shipRequest->items->map(function (RequestItem $item) use ($editingInvoiceId, $shipRequest): array {
                    $usedSource = $item->invoiceSources
                        ->first(fn ($source) => $source->invoiceItem?->invoice_id !== $editingInvoiceId);
                    $usedInvoice = $usedSource?->invoiceItem?->invoice ?? $item->invoiceItem?->invoice;
                    $belongsToEditingInvoice = $item->invoiceSources
                        ->contains(fn ($source) => $source->invoiceItem?->invoice_id === $editingInvoiceId)
                        || $item->invoiceItem?->invoice_id === $editingInvoiceId;
                    $unavailableReason = match (true) {
                        $usedInvoice !== null && ! $belongsToEditingInvoice => "Sudah masuk invoice {$usedInvoice->invoice_number}",
                        $item->is_invoiced && ! $belongsToEditingInvoice => 'Sudah ditagihkan',
                        $item->director_status !== 'approved' => 'Belum disetujui Direktur',
                        default => null,
                    };

                    return [
                        'id' => $item->id,
                        'request_id' => $item->request_id,
                        'request_number' => $shipRequest->request_number,
                        'item_name' => $item->item_name,
                        'vendor_name' => $item->vendor?->name,
                        'quantity' => (string) $item->quantity,
                        'unit' => $item->unit ?: 'Paket',
                        'hpp_unit_price' => (string) $item->hpp_price,
                        'hpp_total' => (string) ((float) $item->hpp_price * (float) $item->quantity),
                        'default_price' => '0',
                        'billing_type' => $item->isJasa() ? 'agency' : 'reimburse',
                        'unavailable_reason' => $unavailableReason,
                    ];
                })->values(),
            ]);

        return [
            'companies' => ShipCompany::query()
                ->whereIn('id', $portCalls->pluck('company_id')->filter()->unique())
                ->orderBy('name')
                ->get(['id', 'name', 'address']),
            'portCalls' => $portCalls,
            'shipRequests' => $shipRequests,
            'documentSettings' => $this->invoiceDocumentSettings->all(),
            'previewDate' => now()->toDateString(),
            'abilities' => [
                'update' => $editingInvoice ? Gate::allows('update', $editingInvoice) : true,
            ],
            'invoice' => $editingInvoice ? [
                'id' => $editingInvoice->id,
                'invoice_number' => $editingInvoice->invoice_number,
                'invoice_date' => $editingInvoice->invoice_date?->toDateString(),
                'port_call_id' => $editingInvoice->port_call_id,
                'company_id' => $editingInvoice->company_id,
                'invoice_type' => $editingInvoice->invoice_type,
                'status' => $editingInvoice->status,
                'subject' => $editingInvoice->subject,
                'origin_port_name' => $editingInvoice->origin_port_name,
                'destination_port_name' => $editingInvoice->destination_port_name,
                'due_date' => $editingInvoice->due_date?->toDateString(),
                'addon_total' => (string) $editingInvoice->addon_total,
                'tax' => (string) $editingInvoice->tax,
                'notes' => $editingInvoice->notes,
                'supporting_document_path' => $editingInvoice->supporting_document_path,
                'signed_document_path' => $editingInvoice->signed_document_path,
                'lines' => $editingLines,
            ] : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function persistInvoice(
        Request $request,
        array $validated,
        ?Invoice $existingInvoice,
        ?string $supportingDocumentPath,
    ): Invoice {
        $invoice = $existingInvoice
            ? Invoice::query()->lockForUpdate()->findOrFail($existingInvoice->id)
            : null;

        if ($invoice) {
            Gate::authorize('update', $invoice);
            if ($invoice->status !== 'draft') {
                throw ValidationException::withMessages(['invoice' => 'Hanya invoice draft yang dapat diperbarui.']);
            }
        }

        $portCall = PortCall::query()
            ->with(['workOrder:id,company_id', 'ship:id,ship_company_id', 'completionNote:id,port_call_id'])
            ->lockForUpdate()
            ->findOrFail($validated['port_call_id']);

        if (! $portCall->completionNote && $invoice?->port_call_id !== $portCall->id) {
            throw ValidationException::withMessages(['port_call_id' => 'Unggah Nota Rampung Job sebelum membuat invoice klien.']);
        }
        $jobCompanyId = $portCall->workOrder?->company_id ?? $portCall->ship?->ship_company_id;
        if ($jobCompanyId !== $validated['company_id']) {
            throw ValidationException::withMessages(['company_id' => 'Perusahaan harus mengikuti SPK/Job yang dipilih.']);
        }

        $lines = collect($validated['lines']);
        $selectedIds = $lines
            ->flatMap(fn (array $line) => $line['source_item_ids'] ?? [])
            ->unique()
            ->values();

        if ($selectedIds->isEmpty()) {
            throw ValidationException::withMessages([
                'lines' => 'Pilih minimal satu item sumber dari pengajuan agar HPP dan margin tetap dapat ditelusuri.',
            ]);
        }

        $currentInvoiceItems = $invoice?->items()->with('sources')->get() ?? collect();
        $currentItemIds = $currentInvoiceItems
            ->flatMap(fn ($item) => $item->sources->pluck('request_item_id')->push($item->request_item_id))
            ->filter()
            ->unique()
            ->values();
        $lockedItems = RequestItem::query()
            ->whereIn('id', $selectedIds->merge($currentItemIds)->unique())
            ->with([
                'request:id,request_number,port_call_id,company_id',
                'product:id,item_type',
                'vendor:id,name',
                'invoiceItem:id,invoice_id,request_item_id',
                'invoiceSources.invoiceItem:id,invoice_id',
            ])
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
        $requestItems = $selectedIds->map(fn (string $id) => $lockedItems->get($id))->filter();

        if ($requestItems->count() !== $selectedIds->count()) {
            throw ValidationException::withMessages(['lines' => 'Satu atau beberapa item pengajuan tidak tersedia.']);
        }

        $subtotal = BigDecimal::zero();
        $lineSnapshots = [];

        foreach ($requestItems as $item) {
            if ($item->request?->port_call_id !== $portCall->id) {
                throw ValidationException::withMessages(['lines' => "Item {$item->item_name} tidak berasal dari Job yang dipilih."]);
            }
            if ($item->request?->company_id && $item->request->company_id !== $validated['company_id']) {
                throw ValidationException::withMessages(['lines' => "Perusahaan pada item {$item->item_name} tidak sesuai dengan SPK."]);
            }
            if ($item->director_status !== 'approved') {
                throw ValidationException::withMessages(['lines' => "Item {$item->item_name} belum disetujui Direktur."]);
            }
            $usedByAnotherInvoice = $item->invoiceSources
                ->contains(fn ($source) => $source->invoiceItem?->invoice_id !== $invoice?->id);
            if ($usedByAnotherInvoice || ($item->invoiceItem && $item->invoiceItem->invoice_id !== $invoice?->id)) {
                throw ValidationException::withMessages(['lines' => "Item {$item->item_name} sudah dipakai pada invoice lain."]);
            }
            if ($item->is_invoiced && ! $currentItemIds->contains($item->id)) {
                throw ValidationException::withMessages(['lines' => "Item {$item->item_name} sudah ditagihkan."]);
            }

            $billingType = $item->isJasa() ? 'agency' : 'reimburse';
            if ($billingType !== $validated['invoice_type']) {
                $typeLabel = $billingType === 'agency' ? 'Jasa Keagenan' : 'Reimbursement';
                throw ValidationException::withMessages(['lines' => "Item {$item->item_name} hanya dapat masuk invoice {$typeLabel}."]);
            }
        }

        $hasCustomAllocations = $lines->contains(
            fn ($l) => isset($l['allocated_hpp']) && $l['allocated_hpp'] !== null && $l['allocated_hpp'] !== ''
        );

        if ($hasCustomAllocations) {
            $totalAllocatedHpp = BigDecimal::zero();
            foreach ($lines as $line) {
                $lineHpp = BigDecimal::of((string) ($line['allocated_hpp'] ?? '0'))->toScale(2, RoundingMode::HalfUp);
                $totalAllocatedHpp = $totalAllocatedHpp->plus($lineHpp);
            }

            $totalSelectedHpp = BigDecimal::zero();
            foreach ($requestItems as $item) {
                $itemTotal = BigDecimal::of((string) $item->hpp_price)
                    ->multipliedBy(BigDecimal::of((string) $item->quantity))
                    ->toScale(2, RoundingMode::HalfUp);
                $totalSelectedHpp = $totalSelectedHpp->plus($itemTotal);
            }

            $diff = $totalAllocatedHpp->minus($totalSelectedHpp);
            if ($diff->abs()->isGreaterThan(BigDecimal::of('1.00'))) {
                $statusDiff = $diff->isPositive() ? 'melebihi' : 'kurang dari';
                $diffStr = number_format((float) (string) $diff->abs(), 0, ',', '.');
                $allocatedStr = number_format((float) (string) $totalAllocatedHpp, 0, ',', '.');
                $selectedStr = number_format((float) (string) $totalSelectedHpp, 0, ',', '.');

                throw ValidationException::withMessages([
                    'lines' => "Total alokasi HPP baris (Rp {$allocatedStr}) {$statusDiff} total HPP item pengajuan terpilih (Rp {$selectedStr}) sebesar Rp {$diffStr}. Total alokasi HPP harus sama persis dengan HPP item terpilih (tidak boleh lebih ataupun kurang).",
                ]);
            }
        }

        foreach ($lines as $lineIndex => $line) {
            $unitPrice = BigDecimal::of((string) $line['unit_price'])->toScale(2, RoundingMode::HalfUp);
            $quantity = BigDecimal::of((string) $line['quantity'])->toScale(2, RoundingMode::HalfUp);
            $lineSubtotal = $unitPrice->multipliedBy($quantity)->toScale(2, RoundingMode::HalfUp);
            $subtotal = $subtotal->plus($lineSubtotal);
            $lineSnapshots[] = [
                'section_title' => filled($line['section_title'] ?? null) ? trim($line['section_title']) : null,
                'description' => trim($line['description']),
                'quantity' => (string) $quantity,
                'unit' => trim($line['unit']),
                'unit_price' => (string) $unitPrice,
                'allocated_hpp' => isset($line['allocated_hpp']) && $line['allocated_hpp'] !== null && $line['allocated_hpp'] !== ''
                    ? (string) $line['allocated_hpp']
                    : null,
                'subtotal' => (string) $lineSubtotal,
                'source_item_ids' => collect($line['source_item_ids'] ?? [])->unique()->values(),
                'sort_order' => $lineIndex,
            ];
        }

        $addon = BigDecimal::of((string) ($validated['addon_total'] ?? '0'))->toScale(2, RoundingMode::HalfUp);
        $tax = BigDecimal::of((string) ($validated['tax'] ?? '0'))->toScale(2, RoundingMode::HalfUp);
        $grandTotal = $subtotal->plus($addon)->plus($tax)->toScale(2, RoundingMode::HalfUp);
        $paidAmount = BigDecimal::of((string) ($invoice?->paid_amount ?? '0'))->toScale(2, RoundingMode::HalfUp);
        $outstandingAmount = $grandTotal->minus($paidAmount)->toScale(2, RoundingMode::HalfUp);
        if ($outstandingAmount->isLessThan(BigDecimal::zero())) {
            $outstandingAmount = BigDecimal::zero()->toScale(2);
        }

        $invoiceAttributes = [
            'port_call_id' => $portCall->id,
            'company_id' => $validated['company_id'],
            'request_id' => $requestItems->first()?->request_id,
            'invoice_type' => $validated['invoice_type'],
            'subject' => filled($validated['subject'] ?? null) ? trim($validated['subject']) : null,
            'origin_port_name' => filled($validated['origin_port_name'] ?? null) ? trim($validated['origin_port_name']) : null,
            'destination_port_name' => filled($validated['destination_port_name'] ?? null) ? trim($validated['destination_port_name']) : null,
            'due_date' => $validated['due_date'],
            'subtotal' => (string) $subtotal->toScale(2, RoundingMode::HalfUp),
            'addon_total' => (string) $addon,
            'tax' => (string) $tax,
            'grand_total' => (string) $grandTotal,
            'outstanding_amount' => (string) $outstandingAmount,
            'supporting_document_path' => $supportingDocumentPath ?? $invoice?->supporting_document_path,
            'notes' => $validated['notes'] ?? null,
        ];

        if ($invoice) {
            $invoice->update([
                ...$invoiceAttributes,
                'version' => $invoice->version + 1,
            ]);
        } else {
            $prefix = $validated['invoice_type'] === 'agency' ? 'INV-AGY' : 'INV-RMB';
            $invoice = Invoice::create([
                ...$invoiceAttributes,
                'invoice_number' => sprintf('%s-%s-%s', $prefix, now()->format('ymd'), Str::upper(Str::random(6))),
                'invoice_date' => now()->toDateString(),
                'discount' => '0.00',
                'paid_amount' => '0.00',
                'currency' => 'IDR',
                'status' => 'draft',
                'delivery_status' => 'pending',
                'version' => 1,
            ]);
        }

        RequestItem::query()->whereIn('id', $currentItemIds)->update(['is_invoiced' => false]);
        $invoice->items()->delete();

        $sourceUsageCounts = $lines
            ->flatMap(fn (array $line) => collect($line['source_item_ids'] ?? [])->unique())
            ->countBy();
        $sourceUsagePositions = [];

        foreach ($lineSnapshots as $lineSnapshot) {
            $sourceItems = $lineSnapshot['source_item_ids']
                ->map(fn (string $sourceItemId) => $lockedItems->get($sourceItemId))
                ->filter();
            $invoiceItem = $invoice->items()->create([
                'request_item_id' => $sourceItems->count() === 1 ? $sourceItems->first()->id : null,
                'sort_order' => $lineSnapshot['sort_order'],
                'is_custom' => $sourceItems->isEmpty(),
                'section_title' => $lineSnapshot['section_title'],
                'description' => $lineSnapshot['description'],
                'vendor_name' => $sourceItems->pluck('vendor.name')->filter()->unique()->implode(', ') ?: null,
                'quantity' => $lineSnapshot['quantity'],
                'unit' => $lineSnapshot['unit'],
                'unit_price' => $lineSnapshot['unit_price'],
                'subtotal' => $lineSnapshot['subtotal'],
            ]);

            foreach ($sourceItems as $requestItem) {
                $usageCount = (int) $sourceUsageCounts->get($requestItem->id, 1);
                $usagePosition = ($sourceUsagePositions[$requestItem->id] ?? 0) + 1;
                $sourceUsagePositions[$requestItem->id] = $usagePosition;
                $fullQuantity = BigDecimal::of((string) $requestItem->quantity)->toScale(2, RoundingMode::HalfUp);
                $fullCost = BigDecimal::of((string) $requestItem->hpp_price)
                    ->multipliedBy($fullQuantity)
                    ->toScale(2, RoundingMode::HalfUp);

                if ($lineSnapshot['allocated_hpp'] !== null) {
                    $lineAllocatedHpp = BigDecimal::of((string) $lineSnapshot['allocated_hpp'])->toScale(2, RoundingMode::HalfUp);
                    if ($sourceItems->count() === 1) {
                        $costShare = $lineAllocatedHpp;
                    } else {
                        $totalCombinedCost = $sourceItems->sum(fn ($si) => (float) $si->hpp_price * (float) $si->quantity);
                        $ratio = $totalCombinedCost > 0
                            ? ((float) $requestItem->hpp_price * (float) $requestItem->quantity) / $totalCombinedCost
                            : 1 / $sourceItems->count();
                        $costShare = $lineAllocatedHpp
                            ->multipliedBy(BigDecimal::of((string) $ratio))
                            ->toScale(2, RoundingMode::HalfUp);
                    }
                    $quantityRatio = $fullCost->isPositive()
                        ? (float) (string) $costShare->dividedBy($fullCost, 4, RoundingMode::HalfUp)
                        : (1 / $usageCount);
                    $quantityShare = $fullQuantity->multipliedBy(BigDecimal::of((string) min(1, max(0, $quantityRatio))))
                        ->toScale(2, RoundingMode::HalfUp);
                } else {
                    $quantityShare = $usagePosition === $usageCount
                        ? $fullQuantity->minus(
                            $fullQuantity->dividedBy($usageCount, 2, RoundingMode::HalfUp)->multipliedBy($usageCount - 1),
                        )
                        : $fullQuantity->dividedBy($usageCount, 2, RoundingMode::HalfUp);
                    $costShare = $usagePosition === $usageCount
                        ? $fullCost->minus(
                            $fullCost->dividedBy($usageCount, 2, RoundingMode::HalfUp)->multipliedBy($usageCount - 1),
                        )
                        : $fullCost->dividedBy($usageCount, 2, RoundingMode::HalfUp);
                }

                $invoiceItem->sources()->create([
                    'request_item_id' => $requestItem->id,
                    'allocated_quantity' => (string) $quantityShare,
                    'source_cost' => (string) $costShare,
                ]);
                $requestItem->update(['is_invoiced' => true]);
            }
        }

        activity('client-invoice')
            ->performedOn($invoice)
            ->causedBy($request->user())
            ->withProperties([
                'port_call_id' => $portCall->id,
                'type' => $validated['invoice_type'],
                'request_item_ids' => $selectedIds->all(),
                'invoice_lines' => count($lineSnapshots),
                'grand_total' => (string) $grandTotal,
            ])
            ->log($existingInvoice ? 'Invoice klien diperbarui' : 'Invoice klien dibuat dari item kebutuhan');

        return $invoice;
    }

    public function release(
        UpdateInvoiceWorkflowRequest $request,
        InvoicePdfGenerator $invoicePdfGenerator,
        string $id,
    ): RedirectResponse {
        $validated = $request->validated();
        abort_unless($validated['action'] === 'release', 422);
        $invoice = DB::transaction(function () use ($request, $validated, $invoicePdfGenerator, $id): Invoice {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($id);
            Gate::authorize('release', $invoice);
            if ($invoice->status !== 'draft') {
                throw ValidationException::withMessages(['action' => 'Hanya invoice draft yang dapat dirilis.']);
            }

            $documentSource = $validated['document_source'];
            if ($documentSource === 'generated') {
                $documentPath = "sja/client-invoices/generated/{$invoice->id}-v{$invoice->version}.pdf";
                Storage::disk('local')->put($documentPath, $invoicePdfGenerator->generate($invoice));
            } else {
                $documentPath = $request->file('document')->store('sja/client-invoices/signed', 'local');
            }

            $invoice->update([
                'status' => 'released',
                'signed_document_path' => $documentPath,
                'document_source' => $documentSource,
                'printed_at' => now(),
                'signed_at' => $documentSource === 'upload' ? now() : null,
                'released_at' => now(),
            ]);

            return $invoice;
        });

        return redirect()->back()->with('success', "Invoice {$invoice->invoice_number} resmi dirilis dan siap dikirim ke klien.");
    }

    public function generatedDocument(
        Request $request,
        Invoice $invoice,
        InvoicePdfGenerator $invoicePdfGenerator,
    ): HttpResponse {
        Gate::authorize('view', $invoice);

        $filename = Str::slug($invoice->invoice_number).'.pdf';
        $disposition = $request->boolean('view') ? 'inline' : 'attachment';

        return response($invoicePdfGenerator->generate($invoice), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => sprintf('%s; filename="%s"', $disposition, $filename),
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function markSent(UpdateInvoiceWorkflowRequest $request, string $id): RedirectResponse
    {
        $validated = $request->validated();
        abort_unless($validated['action'] === 'mark_sent', 422);
        $invoice = DB::transaction(function () use ($request, $id): Invoice {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($id);
            Gate::authorize('markSent', $invoice);
            if ($invoice->status !== 'released' || ! $invoice->signed_document_path) {
                throw ValidationException::withMessages(['action' => 'Invoice harus dirilis dan mempunyai dokumen final sebelum dikirim.']);
            }
            $invoice->update([
                'status' => 'sent',
                'delivery_status' => 'delivered',
                'delivery_proof_path' => $request->file('delivery_proof')->store('sja/client-invoices/delivery-proofs', 'local'),
                'sent_at' => now(),
            ]);

            return $invoice;
        });

        return redirect()->back()->with('success', "Status invoice {$invoice->invoice_number} tercatat telah dikirim ke klien.");
    }

    public function download(Request $request, Invoice $invoice, string $type): StreamedResponse
    {
        Gate::authorize('view', $invoice);
        $path = match ($type) {
            'signed' => $invoice->signed_document_path,
            'delivery' => $invoice->delivery_proof_path,
            'supporting' => $invoice->supporting_document_path,
            default => abort(404),
        };
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return $request->boolean('view')
            ? Storage::disk('local')->response($path)
            : Storage::disk('local')->download($path);
    }
}
