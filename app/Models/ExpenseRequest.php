<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseRequest extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'request_number',
        'scope',
        'category',
        'port_call_id',
        'version',
        'status',
        'currency',
        'total',
        'notes',
        'supporting_document_path',
        'realized_amount',
        'realized_date',
        'payment_reference',
        'payment_proof_path',
        'realized_by',
        'realized_at',
        'created_by',
        'reviewed_by',
        'submitted_at',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'realized_amount' => 'decimal:2',
            'realized_date' => 'date',
            'realized_at' => 'datetime',
        ];
    }

    public function portCall(): BelongsTo
    {
        return $this->belongsTo(PortCall::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function realizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'realized_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ExpenseRequestItem::class);
    }

    public function fundingRequest(): HasOne
    {
        return $this->hasOne(FundingRequest::class);
    }
}
