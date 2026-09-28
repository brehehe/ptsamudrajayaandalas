<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPortPrice extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'product_port_prices';

    protected $fillable = [
        'product_id',
        'port_id',
        'service_type', // 'Sandar' | 'Labuh'
        'selling_price',
        'hpp_price',
    ];

    protected function casts(): array
    {
        return [
            'selling_price' => 'decimal:2',
            'hpp_price' => 'decimal:2',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'port_id');
    }
}
