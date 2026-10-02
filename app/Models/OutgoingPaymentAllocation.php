<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutgoingPaymentAllocation extends Model
{
    use HasUuids;

    protected $fillable = ['outgoing_payment_id', 'cost_document_id', 'amount'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(OutgoingPayment::class, 'outgoing_payment_id');
    }

    public function costDocument(): BelongsTo
    {
        return $this->belongsTo(CostDocument::class);
    }
}
