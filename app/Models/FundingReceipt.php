<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FundingReceipt extends Model
{
    use HasUuids;

    protected $fillable = [
        'funding_request_id',
        'received_date',
        'amount',
        'destination_account',
        'reference_number',
        'proof_path',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'received_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function fundingRequest(): BelongsTo
    {
        return $this->belongsTo(FundingRequest::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
