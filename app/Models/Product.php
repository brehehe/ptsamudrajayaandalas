<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'products';

    protected $fillable = [
        'code',
        'name',
        'category',
        'item_type', // 'jasa' | 'non_jasa'
        'unit',
        'hpp_default',
        'selling_price_default',
        'vendor_id',
        'price_sandar',
        'price_labuh',
        'tax_rate',
        'image',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'hpp_default' => 'decimal:2',
            'selling_price_default' => 'decimal:2',
            'price_sandar' => 'decimal:2',
            'price_labuh' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function portPrices(): HasMany
    {
        return $this->hasMany(ProductPortPrice::class, 'product_id');
    }

    public function requestItems(): HasMany
    {
        return $this->hasMany(RequestItem::class, 'product_id');
    }

    /**
     * Scope for Jasa (Keagenan, Clearance, Sandar/Labuh, Crew Handling)
     */
    public function scopeJasa($query)
    {
        return $query->where('item_type', 'jasa');
    }

    /**
     * Scope for Non-Jasa (Barang, Reimbursement, BBM, Air Tawar, Mooring)
     */
    public function scopeNonJasa($query)
    {
        return $query->where('item_type', 'non_jasa');
    }
}
