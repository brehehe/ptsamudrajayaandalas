<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVendorInvoiceRequest;
use App\Http\Requests\VerifyVendorInvoiceRequest;
use App\Models\CostDocument;
use App\Models\PortCall;
use App\Models\Vendor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VendorInvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', CostDocument::class);
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:all,received,verified,rejected,batched,unpaid,partially_paid,paid'],
        ]);
        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? 'all';
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $invoices = CostDocument::query()
            ->where('document_type', 'vendor_invoice')
            ->with([
                'portCall.ship:id,name',
                'portCall.port:id,name',
                'vendor:id,name',
                'recorder:id,name',
                'items.expenseRequestItem.expenseRequest:id,request_number,status',
            ])
            ->when($status !== 'all', function ($query) use ($status) {
                if (in_array($status, ['unpaid', 'partially_paid', 'paid'], true)) {
                    $query->where('payment_status', $status);
                } elseif ($status === 'batched') {
                    $query->whereHas('items.expenseRequestItem');
                } else {
                    $query->where('status', $status);
                }
            })
            ->when($search, fn ($query, $value) => $query->where(function ($scope) use ($like, $value) {
                $scope->where('document_number', $like, "%{$value}%")
                    ->orWhere('issuer_name', $like, "%{$value}%")
                    ->orWhereHas('vendor', fn ($vendor) => $vendor->where('name', $like, "%{$value}%"))
                    ->orWhereHas('portCall.ship', fn ($ship) => $ship->where('name', $like, "%{$value}%"));
            }))
            ->latest('received_date')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('VendorInvoices/Index', [
            'invoices' => $invoices,
            'portCalls' => PortCall::query()
                ->with(['ship:id,name', 'port:id,name'])
                ->whereIn('status', ['scheduled', 'anchored', 'berthed', 'departed'])
                ->latest('eta_at')
                ->get(['id', 'job_number', 'ship_id', 'port_id']),
            'vendors' => Vendor::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => ['search' => $search ?? '', 'status' => $status],
            'abilities' => [
                'create' => Gate::allows('create', CostDocument::class),
                'verify' => $request->user()->isOperationalAdmin() || $request->user()->isOwner(),
            ],
        ]);
    }

    public function store(StoreVendorInvoiceRequest $request): RedirectResponse
    {
        Gate::authorize('create', CostDocument::class);
        $validated = $request->validated();

        $invoice = DB::transaction(function () use ($request, $validated): CostDocument {
            $vendor = Vendor::query()->lockForUpdate()->findOrFail($validated['vendor_id']);
            $subtotal = (float) $validated['amount'];
            $tax = (float) ($validated['tax_amount'] ?? 0);

            $invoice = CostDocument::create([
                'port_call_id' => $validated['port_call_id'],
                'vendor_id' => $vendor->id,
                'document_type' => 'vendor_invoice',
                'document_number' => $validated['document_number'],
                'issuer_name' => $vendor->name,
                'document_date' => $validated['document_date'],
                'received_date' => $validated['received_date'],
                'due_date' => $validated['due_date'] ?? null,
                'currency' => 'IDR',
                'estimated_total' => $subtotal + $tax,
                'verified_total' => $subtotal + $tax,
                'tax_amount' => $tax,
                'status' => 'received',
                'payment_status' => 'unpaid',
                'document_path' => $request->file('document')->store('sja/vendor-invoices', 'local'),
                'recorded_by' => $request->user()->id,
            ]);
            $invoice->items()->create([
                'description' => $validated['description'],
                'quantity' => 1,
                'unit' => 'Paket',
                'amount' => $subtotal + $tax,
                'billable' => true,
                'billing_classification' => 'reimburse',
            ]);

            activity('vendor-invoice')
                ->performedOn($invoice)
                ->causedBy($request->user())
                ->withProperties(['vendor_id' => $vendor->id, 'total' => $subtotal + $tax])
                ->log('Invoice vendor diterima');

            return $invoice;
        });

        return back()->with('success', "Invoice vendor {$invoice->document_number} berhasil dicatat dan menunggu verifikasi.");
    }

    public function verify(VerifyVendorInvoiceRequest $request, CostDocument $costDocument): RedirectResponse
    {
        Gate::authorize('update', $costDocument);
        abort_unless($costDocument->document_type === 'vendor_invoice', 404);
        $validated = $request->validated();

        DB::transaction(function () use ($request, $costDocument, $validated): void {
            $invoice = CostDocument::query()->lockForUpdate()->findOrFail($costDocument->id);
            if ($invoice->status !== 'received') {
                throw ValidationException::withMessages(['decision' => 'Invoice ini sudah pernah diperiksa.']);
            }

            $invoice->update([
                'status' => $validated['decision'] === 'verify' ? 'verified' : 'rejected',
                'verified_total' => $validated['decision'] === 'verify' ? $validated['verified_total'] : $invoice->verified_total,
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
            ]);
            if ($validated['decision'] === 'verify') {
                $invoice->items()->first()?->update(['amount' => $validated['verified_total']]);
            }

            activity('vendor-invoice')
                ->performedOn($invoice)
                ->causedBy($request->user())
                ->withProperties(['decision' => $validated['decision'], 'notes' => $validated['notes'] ?? null])
                ->log('Invoice vendor diperiksa');
        });

        return back()->with('success', 'Hasil verifikasi invoice vendor berhasil disimpan.');
    }

    public function download(CostDocument $costDocument): StreamedResponse
    {
        Gate::authorize('view', $costDocument);
        abort_unless($costDocument->document_type === 'vendor_invoice', 404);
        if (! $costDocument->document_path || ! Storage::disk('local')->exists($costDocument->document_path)) {
            throw ValidationException::withMessages(['document' => 'Dokumen invoice tidak tersedia.']);
        }

        return Storage::disk('local')->download($costDocument->document_path);
    }
}
