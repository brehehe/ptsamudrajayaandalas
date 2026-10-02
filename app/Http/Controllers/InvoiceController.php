<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateInvoiceWorkflowRequest;
use App\Models\Invoice;
use App\Models\PortCall;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']), 403);
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
        abort_unless($request->user()?->isOperationalAdmin() || $request->user()?->isOwner(), 403);
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

        $portCall = PortCall::query()->with(['workOrder', 'costReconciliation'])->findOrFail($validated['port_call_id']);
        if (! $portCall->reconciled_at || ! $portCall->costReconciliation) {
            throw ValidationException::withMessages(['port_call_id' => 'Invoice klien hanya dapat dibuat setelah rekonsiliasi biaya selesai.']);
        }
        if ($portCall->workOrder?->company_id && $portCall->workOrder->company_id !== $validated['company_id']) {
            throw ValidationException::withMessages(['company_id' => 'Perusahaan tidak sesuai dengan SPK/Kunjungan yang dipilih.']);
        }
        $shipRequest = ShipRequest::query()->with('items')->findOrFail($validated['request_id']);
        if ($shipRequest->port_call_id !== $portCall->id) {
            throw ValidationException::withMessages(['request_id' => 'Pengajuan tidak terhubung ke Kunjungan/Job yang dipilih.']);
        }
        if ($shipRequest->items->isEmpty() || $shipRequest->items->contains(fn ($item) => $item->director_status !== 'approved')) {
            throw ValidationException::withMessages(['request_id' => 'Semua item invoice harus sudah disetujui Direktur.']);
        }

        $prefix = $validated['invoice_type'] === 'agency' ? 'INV-AGY' : 'INV-RMB';
        $invNumber = sprintf('%s-%s-%s', $prefix, now()->format('ymd'), Str::upper(Str::random(6)));

        $subtotal = (float) $validated['subtotal'];
        $addon = (float) ($validated['addon_total'] ?? 0);
        $tax = (float) ($validated['tax'] ?? 0);
        $grandTotal = $subtotal + $addon + $tax;

        $invoice = Invoice::create([
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

        activity('client-invoice')
            ->performedOn($invoice)
            ->causedBy($request->user())
            ->withProperties(['port_call_id' => $portCall->id, 'type' => $validated['invoice_type']])
            ->log('Invoice klien dibuat');

        return redirect()->back()->with('success', "Invoice {$invNumber} berhasil dibuat sebagai draft.");
    }

    public function release(UpdateInvoiceWorkflowRequest $request, string $id): RedirectResponse
    {
        $validated = $request->validated();
        abort_unless($validated['action'] === 'release', 422);
        $invoice = DB::transaction(function () use ($request, $id): Invoice {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($id);
            if ($invoice->status !== 'draft') {
                throw ValidationException::withMessages(['action' => 'Hanya invoice draft yang dapat dirilis.']);
            }
            $invoice->update([
                'status' => 'released',
                'signed_document_path' => $request->file('document')->store('sja/client-invoices/signed', 'local'),
                'printed_at' => now(),
                'signed_at' => now(),
                'released_at' => now(),
            ]);

            return $invoice;
        });

        return redirect()->back()->with('success', "Invoice {$invoice->invoice_number} resmi dirilis dan siap dikirim ke klien.");
    }

    public function markSent(UpdateInvoiceWorkflowRequest $request, string $id): RedirectResponse
    {
        $validated = $request->validated();
        abort_unless($validated['action'] === 'mark_sent', 422);
        $invoice = DB::transaction(function () use ($request, $id): Invoice {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($id);
            if ($invoice->status !== 'released' || ! $invoice->signed_document_path) {
                throw ValidationException::withMessages(['action' => 'Invoice harus dirilis dan mempunyai dokumen bertanda tangan sebelum dikirim.']);
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
        abort_unless($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']), 403);
        $path = match ($type) {
            'signed' => $invoice->signed_document_path,
            'delivery' => $invoice->delivery_proof_path,
            default => abort(404),
        };
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download($path);
    }
}
