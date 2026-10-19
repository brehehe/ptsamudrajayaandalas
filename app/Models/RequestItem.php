<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RequestItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'request_items';

    protected $fillable = [
        'request_id',
        'product_id',
        'service_id',
        'item_type',
        'item_name',
        'unit',
        'quantity',
        'required_date',
        'required_time',
        'hpp_price',
        'selling_price',
        'status',
        'is_urgent',
        'notes',
        'vendor_id',
        'attachment_path',
        'supplier_invoice_number',
        'supplier_invoice_date',
        'supplier_invoice_received_date',
        'supplier_invoice_due_date',
        'supplier_invoice_path',
        'supplier_invoice_uploaded_by',
        'director_status',
        'director_notes',
        'is_invoiced',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'hpp_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'is_urgent' => 'boolean',
            'is_invoiced' => 'boolean',
            'required_date' => 'date',
            'supplier_invoice_date' => 'date',
            'supplier_invoice_received_date' => 'date',
            'supplier_invoice_due_date' => 'date',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(ShipRequest::class, 'request_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function supplierInvoiceUploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supplier_invoice_uploaded_by');
    }

    public function hasCompleteSupplierInvoice(): bool
    {
        return (float) $this->hpp_price > 0
            && filled($this->supplier_invoice_number)
            && $this->supplier_invoice_date !== null
            && $this->supplier_invoice_received_date !== null
            && filled($this->supplier_invoice_path)
            && $this->supplier_invoice_uploaded_by !== null;
    }

    public function costDocumentItem(): HasOne
    {
        return $this->hasOne(CostDocumentItem::class);
    }

    public function expenseRequestItem(): HasOne
    {
        return $this->hasOne(ExpenseRequestItem::class);
    }

    public function invoiceItem(): HasOne
    {
        return $this->hasOne(InvoiceItem::class);
    }

    public function invoiceSources(): HasMany
    {
        return $this->hasMany(InvoiceItemSource::class);
    }

    public function isJasa(): bool
    {
        return $this->item_type === 'jasa' || ($this->product && $this->product->item_type === 'jasa');
    }

    public function isLocked(): bool
    {
        return $this->director_status === 'approved';
    }

    protected static function booted(): void
    {
        static::updating(function (RequestItem $item) {
            if (
                $item->getOriginal('director_status') === 'approved'
                && $item->isDirty('hpp_price')
            ) {
                throw new \DomainException('HPP yang telah disetujui Direktur tidak dapat diubah tanpa proses revisi.');
            }
        });
    }
}
