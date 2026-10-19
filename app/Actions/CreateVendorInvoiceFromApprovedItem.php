<?php

namespace App\Actions;

use App\Models\CostDocument;
use App\Models\RequestItem;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CreateVendorInvoiceFromApprovedItem
{
    public function handle(RequestItem $requestItem, User $director): ?CostDocument
    {
        $requestItem = RequestItem::query()
            ->with(['request:id,port_call_id', 'vendor:id,name', 'costDocumentItem.costDocument'])
            ->lockForUpdate()
            ->findOrFail($requestItem->id);

        if ($requestItem->costDocumentItem?->costDocument) {
            return $requestItem->costDocumentItem->costDocument;
        }

        if ($requestItem->director_status !== 'approved') {
            throw ValidationException::withMessages([
                'supplier_invoice' => "Item '{$requestItem->item_name}' belum disetujui Direktur.",
            ]);
        }

        // Data lama dapat sudah berada di antrean Direktur sebelum aturan nota per item diberlakukan.
        // Pengajuan baru tetap dijaga oleh RequestController sebelum dapat diteruskan ke Direktur.
        if (! $requestItem->hasCompleteSupplierInvoice() || ! $requestItem->request?->port_call_id) {
            return null;
        }

        $invoice = CostDocument::query()
            ->where('vendor_id', $requestItem->vendor_id)
            ->where('document_number', $requestItem->supplier_invoice_number)
            ->lockForUpdate()
            ->first();

        if ($invoice && $invoice->port_call_id !== $requestItem->request?->port_call_id) {
            throw ValidationException::withMessages([
                'supplier_invoice' => "Nomor invoice {$requestItem->supplier_invoice_number} sudah digunakan oleh vendor ini pada Job lain.",
            ]);
        }

        if ($invoice && $invoice->payment_status !== 'unpaid') {
            throw ValidationException::withMessages([
                'supplier_invoice' => "Invoice {$requestItem->supplier_invoice_number} sudah memiliki pembayaran dan tidak dapat ditambah item baru.",
            ]);
        }

        $invoice ??= CostDocument::create([
            'port_call_id' => $requestItem->request->port_call_id,
            'vendor_id' => $requestItem->vendor_id,
            'document_type' => 'vendor_invoice',
            'document_number' => $requestItem->supplier_invoice_number,
            'issuer_name' => $requestItem->vendor?->name ?? 'Tanpa vendor/supplier',
            'document_date' => $requestItem->supplier_invoice_date,
            'received_date' => $requestItem->supplier_invoice_received_date,
            'due_date' => $requestItem->supplier_invoice_due_date,
            'currency' => 'IDR',
            'estimated_total' => 0,
            'verified_total' => 0,
            'tax_amount' => 0,
            'status' => 'verified',
            'payment_status' => 'unpaid',
            'document_path' => $requestItem->supplier_invoice_path,
            'recorded_by' => $requestItem->supplier_invoice_uploaded_by,
            'verified_by' => $director->id,
            'verified_at' => now(),
        ]);

        $invoice->items()->firstOrCreate(
            ['request_item_id' => $requestItem->id],
            [
                'description' => $requestItem->item_name,
                'quantity' => $requestItem->quantity,
                'unit' => $requestItem->unit ?: 'Paket',
                'amount' => (float) $requestItem->hpp_price * (float) $requestItem->quantity,
                'billable' => true,
                'billing_classification' => 'reimburse',
            ],
        );

        $total = (float) $invoice->items()->sum('amount') + (float) $invoice->tax_amount;
        $invoice->update([
            'estimated_total' => $total,
            'verified_total' => $total,
            'status' => 'verified',
            'verified_by' => $director->id,
            'verified_at' => now(),
        ]);

        activity('vendor-invoice')
            ->performedOn($invoice)
            ->causedBy($director)
            ->withProperties([
                'request_item_id' => $requestItem->id,
                'request_id' => $requestItem->request_id,
                'total' => $total,
                'source' => 'director_approval',
            ])
            ->log('Invoice vendor otomatis siap dibayar setelah item disetujui Direktur');

        return $invoice->fresh();
    }
}
