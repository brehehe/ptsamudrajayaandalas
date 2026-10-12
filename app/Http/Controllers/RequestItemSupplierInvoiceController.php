<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRequestItemSupplierInvoiceRequest;
use App\Models\RequestItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RequestItemSupplierInvoiceController extends Controller
{
    public function store(StoreRequestItemSupplierInvoiceRequest $request, RequestItem $requestItem): RedirectResponse
    {
        $requestItem->loadMissing('request');
        Gate::authorize('reviewPricing', $requestItem->request);

        if ($requestItem->isLocked() || $requestItem->status === 'diajukan_ke_direktur' || $requestItem->is_invoiced) {
            throw ValidationException::withMessages([
                'supplier_invoice_document' => 'Nota supplier tidak dapat diubah setelah item dikirim atau disetujui Direktur.',
            ]);
        }

        $validated = $request->validated();
        $oldPath = $requestItem->supplier_invoice_path;
        $newPath = $request->hasFile('supplier_invoice_document')
            ? $request->file('supplier_invoice_document')->store('sja/vendor-invoices', 'local')
            : $oldPath;

        try {
            DB::transaction(function () use ($request, $requestItem, $validated, $newPath): void {
                $lockedItem = RequestItem::query()->lockForUpdate()->findOrFail($requestItem->id);
                if ($lockedItem->isLocked() || $lockedItem->status === 'diajukan_ke_direktur' || $lockedItem->is_invoiced) {
                    throw ValidationException::withMessages([
                        'supplier_invoice_document' => 'Nota supplier tidak dapat diubah setelah item dikirim atau disetujui Direktur.',
                    ]);
                }

                $lockedItem->update([
                    'vendor_id' => $validated['vendor_id'],
                    'hpp_price' => $validated['hpp_price'],
                    'supplier_invoice_number' => $validated['supplier_invoice_number'],
                    'supplier_invoice_date' => $validated['supplier_invoice_date'],
                    'supplier_invoice_received_date' => $validated['supplier_invoice_received_date'],
                    'supplier_invoice_due_date' => $validated['supplier_invoice_due_date'] ?? null,
                    'supplier_invoice_path' => $newPath,
                    'supplier_invoice_uploaded_by' => $request->user()->id,
                ]);

                activity('request-item-supplier-invoice')
                    ->performedOn($lockedItem)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $lockedItem->request_id,
                        'vendor_id' => $lockedItem->vendor_id,
                        'document_number' => $lockedItem->supplier_invoice_number,
                    ])
                    ->log('Admin melengkapi nota invoice supplier item pengajuan');
            });
        } catch (\Throwable $exception) {
            if ($newPath && $newPath !== $oldPath) {
                Storage::disk('local')->delete($newPath);
            }

            throw $exception;
        }

        if ($oldPath && $newPath !== $oldPath) {
            Storage::disk('local')->delete($oldPath);
        }

        return back()->with('success', "Nota supplier untuk {$requestItem->item_name} berhasil disimpan.");
    }

    public function show(Request $request, RequestItem $requestItem): StreamedResponse
    {
        $requestItem->loadMissing('request');
        Gate::authorize('view', $requestItem->request);
        abort_unless($requestItem->supplier_invoice_path, 404);
        abort_unless(Storage::disk('local')->exists($requestItem->supplier_invoice_path), 404);

        return $request->boolean('download')
            ? Storage::disk('local')->download($requestItem->supplier_invoice_path)
            : Storage::disk('local')->response($requestItem->supplier_invoice_path);
    }
}
