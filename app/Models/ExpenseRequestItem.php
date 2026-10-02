<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseRequestItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'expense_request_id',
        'cost_document_item_id',
        'request_item_id',
        'description',
        'amount',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function expenseRequest(): BelongsTo
    {
        return $this->belongsTo(ExpenseRequest::class);
    }

    public function costDocumentItem(): BelongsTo
    {
        return $this->belongsTo(CostDocumentItem::class);
    }
}
