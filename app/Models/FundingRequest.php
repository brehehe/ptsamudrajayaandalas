<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FundingRequest extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'expense_request_id',
        'kopra_reference',
        'submitted_date',
        'requested_amount',
        'approved_amount',
        'status',
        'document_path',
        'created_by',
        'authorized_by',
        'authorized_at',
        'kopra_submitted_at',
        'kopra_approved_at',
        'disbursed_at',
        'destination_account',
        'decision_notes',
    ];

    protected function casts(): array
    {
        return [
            'submitted_date' => 'date',
            'requested_amount' => 'decimal:2',
            'approved_amount' => 'decimal:2',
            'authorized_at' => 'datetime',
            'kopra_submitted_at' => 'datetime',
            'kopra_approved_at' => 'datetime',
            'disbursed_at' => 'datetime',
        ];
    }

    public function expenseRequest(): BelongsTo
    {
        return $this->belongsTo(ExpenseRequest::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(FundingReceipt::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(OutgoingPayment::class);
    }
}
