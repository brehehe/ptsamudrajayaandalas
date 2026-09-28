<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function isJasa(): bool
    {
        return $this->item_type === 'jasa' || ($this->product && $this->product->item_type === 'jasa');
    }
}
