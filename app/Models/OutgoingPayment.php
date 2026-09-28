<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class OutgoingPayment extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'outgoing_payments';

    protected $fillable = [
        'port_call_id',
        'payment_type',
        'payment_date',
        'amount',
        'currency',
        'recipient',
        'reference_number',
        'proof_path',
        'verification_status',
        'recorded_by',
        'verified_by',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'verified_at' => 'datetime',
            'amount' => 'decimal:2',
        ];
    }

    public function portCall(): BelongsTo
    {
        return $this->belongsTo(PortCall::class, 'port_call_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
