<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CostDocumentItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'cost_document_id',
        'request_item_id',
        'description',
        'quantity',
        'unit',
        'amount',
        'billable',
        'billing_classification',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'amount' => 'decimal:2',
            'billable' => 'boolean',
        ];
    }

    public function costDocument(): BelongsTo
    {
        return $this->belongsTo(CostDocument::class);
    }

    public function requestItem(): BelongsTo
    {
        return $this->belongsTo(RequestItem::class);
    }

    public function expenseRequestItem(): HasOne
    {
        return $this->hasOne(ExpenseRequestItem::class);
    }
}
