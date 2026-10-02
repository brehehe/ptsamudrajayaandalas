<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'invoices';

    protected $fillable = [
        'request_id',
        'port_call_id',
        'company_id',
        'invoice_number',
        'invoice_type',
        'invoice_date',
        'due_date',
        'subtotal',
        'addon_total',
        'discount',
        'tax',
        'grand_total',
        'paid_amount',
        'outstanding_amount',
        'currency',
        'status',
        'delivery_status',
        'signed_document_path',
        'version',
        'notes',
        'released_at',
        'printed_at',
        'signed_at',
        'sent_at',
        'paid_at',
        'delivery_proof_path',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'due_date' => 'date',
            'released_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'addon_total' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'outstanding_amount' => 'decimal:2',
            'printed_at' => 'datetime',
            'signed_at' => 'datetime',
            'sent_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function portCall(): BelongsTo
    {
        return $this->belongsTo(PortCall::class, 'port_call_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(ShipCompany::class, 'company_id');
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(ShipRequest::class, 'request_id');
    }

    public function receiptAllocations(): HasMany
    {
        return $this->hasMany(ClientReceiptAllocation::class);
    }
}
