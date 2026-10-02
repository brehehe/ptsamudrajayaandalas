<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'funding_request_id',
        'beneficiary_user_id',
        'payment_destination',
        'notes',
        'actual_amount',
        'remaining_amount',
        'usage_proof_path',
        'realized_at',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'verified_at' => 'datetime',
            'amount' => 'decimal:2',
            'actual_amount' => 'decimal:2',
            'remaining_amount' => 'decimal:2',
            'realized_at' => 'datetime',
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

    public function fundingRequest(): BelongsTo
    {
        return $this->belongsTo(FundingRequest::class);
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(User::class, 'beneficiary_user_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(OutgoingPaymentAllocation::class);
    }
}
