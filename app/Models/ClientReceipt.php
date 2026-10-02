<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientReceipt extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'client_receipts';

    protected $fillable = [
        'company_id',
        'received_date',
        'amount',
        'currency',
        'destination_account',
        'bank_reference',
        'proof_path',
        'status',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'received_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(ShipCompany::class, 'company_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(ClientReceiptAllocation::class);
    }
}
