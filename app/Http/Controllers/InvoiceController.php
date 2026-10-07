<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceWorkflowRequest;
use App\Models\Invoice;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
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
            ->with(['portCall.ship:id,name,imo_number', 'company:id,name', 'request:id,request_number'])
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

        $companies = ShipCompany::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);
        $portCalls = PortCall::query()
            ->with([
                'ship:id,name',
                'port:id,name',
                'workOrder:id,company_id',
                'workOrder.company:id,name',
            ])
            ->whereNotNull('reconciled_at')
            ->whereHas('costReconciliation')
            ->whereHas('requests.items')
            ->latest('reconciled_at')
            ->get(['id', 'job_number', 'work_order_id', 'ship_id', 'port_id'])
            ->map(fn (PortCall $portCall): array => [
                'id' => $portCall->id,
                'job_number' => $portCall->job_number,
                'ship' => $portCall->ship ? ['name' => $portCall->ship->name] : null,
                'port' => $portCall->port ? ['name' => $portCall->port->name] : null,
                'company_id' => $portCall->workOrder?->company_id,
                'company' => $portCall->workOrder?->company ? [
                    'id' => $portCall->workOrder->company->id,
                    'name' => $portCall->workOrder->company->name,
                ] : null,
            ]);
        $shipRequests = ShipRequest::query()
            ->whereIn('port_call_id', $portCalls->pluck('id'))
            ->whereHas('items')
            ->with([
                'ship:id,name',
                'items.product:id,item_type',
                'items.vendor:id,name',
                'items.invoiceItem:id,invoice_id,request_item_id',
                'items.invoiceItem.invoice:id,invoice_number,status',
            ])
            ->latest('request_date')
            ->get(['id', 'request_number', 'port_call_id', 'ship_id', 'company_id', 'status'])
            ->map(fn (ShipRequest $shipRequest): array => [
                'id' => $shipRequest->id,
                'request_number' => $shipRequest->request_number,
                'port_call_id' => $shipRequest->port_call_id,
                'company_id' => $shipRequest->company_id,
                'status' => $shipRequest->status,
                'ship' => $shipRequest->ship ? ['name' => $shipRequest->ship->name] : null,
                'items' => $shipRequest->items->map(function (RequestItem $item): array {
                    $billingType = $item->isJasa() ? 'agency' : 'reimburse';
                    $usedInvoice = $item->invoiceItem?->invoice;
                    $unavailableReason = match (true) {
                        $usedInvoice !== null => "Sudah masuk invoice {$usedInvoice->invoice_number}",
                        $item->is_invoiced => 'Sudah ditagihkan',
                        $item->director_status !== 'approved' => 'Belum disetujui Direktur',
                        BigDecimal::of((string) ($item->selling_price ?? '0'))->isLessThanOrEqualTo(BigDecimal::zero()) => 'Harga jual belum tersedia',
                        default => null,
                    };

                    return [
                        'id' => $item->id,
                        'item_name' => $item->item_name,
                        'vendor_name' => $item->vendor?->name,
                        'quantity' => (string) $item->quantity,
                        'unit' => $item->unit ?: 'Paket',
                        'selling_price' => (string) ($item->selling_price ?? '0'),
                        'director_status' => $item->director_status,
                        'billing_type' => $billingType,
                        'is_invoiced' => (bool) $item->is_invoiced,
                        'used_invoice_number' => $usedInvoice?->invoice_number,
                        'unavailable_reason' => $unavailableReason,
                    ];
                })->values(),
            ]);

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
            $invoice = DB::transaction(function () use ($request, $validated, $supportingDocumentPath): Invoice {
                $portCall = PortCall::query()
                    ->with(['workOrder:id,company_id', 'costReconciliation:id,port_call_id'])
                    ->lockForUpdate()
                    ->findOrFail($validated['port_call_id']);

                if (! $portCall->reconciled_at || ! $portCall->costReconciliation) {
                    throw ValidationException::withMessages(['port_call_id' => 'Invoice klien hanya dapat dibuat setelah rekonsiliasi biaya selesai.']);
                }
                if ($portCall->workOrder?->company_id !== $validated['company_id']) {
                    throw ValidationException::withMessages(['company_id' => 'Perusahaan harus mengikuti SPK/Kunjungan yang dipilih.']);
                }

                $shipRequest = ShipRequest::query()->lockForUpdate()->findOrFail($validated['request_id']);
                if ($shipRequest->port_call_id !== $portCall->id) {
                    throw ValidationException::withMessages(['request_id' => 'Pengajuan tidak terhubung ke Kunjungan/Job yang dipilih.']);
                }
                if ($shipRequest->company_id && $shipRequest->company_id !== $validated['company_id']) {
                    throw ValidationException::withMessages(['request_id' => 'Perusahaan pada pengajuan tidak sesuai dengan SPK/Kunjungan yang dipilih.']);
                }

                $selectedIds = collect($validated['request_item_ids'])->unique()->values();
                $requestItems = RequestItem::query()
                    ->where('request_id', $shipRequest->id)
                    ->whereIn('id', $selectedIds)
                    ->with(['product:id,item_type', 'vendor:id,name', 'invoiceItem:id,invoice_id,request_item_id'])
                    ->lockForUpdate()
                    ->get();

                if ($requestItems->count() !== $selectedIds->count()) {
                    throw ValidationException::withMessages(['request_item_ids' => 'Satu atau beberapa item tidak berasal dari pengajuan yang dipilih.']);
                }

                $subtotal = BigDecimal::zero();
                $lineSnapshots = [];

                foreach ($requestItems as $item) {
                    if ($item->director_status !== 'approved') {
                        throw ValidationException::withMessages(['request_item_ids' => "Item {$item->item_name} belum disetujui Direktur."]);
                    }
                    if ($item->is_invoiced || $item->invoiceItem) {
                        throw ValidationException::withMessages(['request_item_ids' => "Item {$item->item_name} sudah dipakai pada invoice lain."]);
                    }

                    $billingType = $item->isJasa() ? 'agency' : 'reimburse';
                    if ($billingType !== $validated['invoice_type']) {
                        $typeLabel = $billingType === 'agency' ? 'Jasa Keagenan' : 'Reimburse';
                        throw ValidationException::withMessages(['request_item_ids' => "Item {$item->item_name} hanya dapat masuk invoice {$typeLabel}."]);
                    }

                    $unitPrice = BigDecimal::of((string) ($item->selling_price ?? '0'))->toScale(2, RoundingMode::HalfUp);
                    if ($unitPrice->isLessThanOrEqualTo(BigDecimal::zero())) {
                        throw ValidationException::withMessages(['request_item_ids' => "Harga jual item {$item->item_name} belum valid."]);
                    }
                    $lineSubtotal = $unitPrice
                        ->multipliedBy((string) $item->quantity)
                        ->toScale(2, RoundingMode::HalfUp);
                    $subtotal = $subtotal->plus($lineSubtotal);
                    $lineSnapshots[] = [
                        'request_item' => $item,
                        'unit_price' => (string) $unitPrice,
                        'subtotal' => (string) $lineSubtotal,
                    ];
                }

                $addon = BigDecimal::of((string) ($validated['addon_total'] ?? '0'))->toScale(2, RoundingMode::HalfUp);
                $tax = BigDecimal::of((string) ($validated['tax'] ?? '0'))->toScale(2, RoundingMode::HalfUp);
                $grandTotal = $subtotal->plus($addon)->plus($tax)->toScale(2, RoundingMode::HalfUp);
                $prefix = $validated['invoice_type'] === 'agency' ? 'INV-AGY' : 'INV-RMB';
                $invoiceNumber = sprintf('%s-%s-%s', $prefix, now()->format('ymd'), Str::upper(Str::random(6)));

                $invoice = Invoice::create([
                    'invoice_number' => $invoiceNumber,
                    'port_call_id' => $portCall->id,
                    'company_id' => $validated['company_id'],
                    'request_id' => $shipRequest->id,
                    'invoice_type' => $validated['invoice_type'],
                    'invoice_date' => now()->toDateString(),
                    'due_date' => $validated['due_date'],
                    'subtotal' => (string) $subtotal->toScale(2, RoundingMode::HalfUp),
                    'addon_total' => (string) $addon,
                    'discount' => '0.00',
                    'tax' => (string) $tax,
                    'grand_total' => (string) $grandTotal,
                    'paid_amount' => '0.00',
                    'outstanding_amount' => (string) $grandTotal,
                    'currency' => 'IDR',
                    'status' => 'draft',
                    'delivery_status' => 'pending',
                    'supporting_document_path' => $supportingDocumentPath,
                    'notes' => $validated['notes'] ?? null,
                    'version' => 1,
                ]);

                foreach ($lineSnapshots as $lineSnapshot) {
                    /** @var RequestItem $requestItem */
                    $requestItem = $lineSnapshot['request_item'];
                    $invoice->items()->create([
                        'request_item_id' => $requestItem->id,
                        'description' => $requestItem->item_name,
                        'vendor_name' => $requestItem->vendor?->name,
                        'quantity' => $requestItem->quantity,
                        'unit' => $requestItem->unit ?: 'Paket',
                        'unit_price' => $lineSnapshot['unit_price'],
                        'subtotal' => $lineSnapshot['subtotal'],
                    ]);
                    $requestItem->update(['is_invoiced' => true]);
                }

                activity('client-invoice')
                    ->performedOn($invoice)
                    ->causedBy($request->user())
                    ->withProperties([
                        'port_call_id' => $portCall->id,
                        'type' => $validated['invoice_type'],
                        'request_item_ids' => $selectedIds->all(),
                        'grand_total' => (string) $grandTotal,
                    ])
                    ->log('Invoice klien dibuat dari item kebutuhan');

                return $invoice;
            }, attempts: 3);
        } catch (Throwable $exception) {
            if ($supportingDocumentPath) {
                Storage::disk('local')->delete($supportingDocumentPath);
            }

            throw $exception;
        }

        return redirect()->back()->with('success', "Invoice {$invoice->invoice_number} berhasil dibuat dari item terpilih.");
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
