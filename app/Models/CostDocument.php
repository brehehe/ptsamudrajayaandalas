<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CostDocument extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'port_call_id',
        'vendor_id',
        'document_type',
        'document_number',
        'issuer_name',
        'document_date',
        'received_date',
        'currency',
        'estimated_total',
        'verified_total',
        'status',
        'document_path',
        'recorded_by',
        'verified_by',
        'verified_at',
        'due_date',
        'tax_amount',
        'payment_status',
        'paid_amount',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'document_date' => 'date',
            'received_date' => 'date',
            'estimated_total' => 'decimal:2',
            'verified_total' => 'decimal:2',
            'verified_at' => 'datetime',
            'due_date' => 'date',
            'tax_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function portCall(): BelongsTo
    {
        return $this->belongsTo(PortCall::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(CostDocumentItem::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function paymentAllocations(): HasMany
    {
        return $this->hasMany(OutgoingPaymentAllocation::class);
    }
}
