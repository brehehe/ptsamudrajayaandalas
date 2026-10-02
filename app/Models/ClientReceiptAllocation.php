<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientReceiptAllocation extends Model
{
    use HasUuids;

    protected $fillable = ['client_receipt_id', 'invoice_id', 'amount'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(ClientReceipt::class, 'client_receipt_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
