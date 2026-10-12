<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItemSource extends Model
{
    use HasUuids;

    protected $fillable = [
        'invoice_item_id',
        'request_item_id',
        'allocated_quantity',
        'source_cost',
    ];

    protected function casts(): array
    {
        return [
            'allocated_quantity' => 'decimal:2',
            'source_cost' => 'decimal:2',
        ];
    }

    public function invoiceItem(): BelongsTo
    {
        return $this->belongsTo(InvoiceItem::class);
    }

    public function requestItem(): BelongsTo
    {
        return $this->belongsTo(RequestItem::class);
    }
}
