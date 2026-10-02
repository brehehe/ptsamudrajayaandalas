<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CostReconciliation extends Model
{
    use HasUuids;

    protected $fillable = [
        'port_call_id',
        'completion_note_id',
        'initial_total',
        'actual_total',
        'variance',
        'adjustment',
        'status',
        'notes',
        'reconciled_by',
        'reconciled_at',
    ];

    protected function casts(): array
    {
        return [
            'initial_total' => 'decimal:2',
            'actual_total' => 'decimal:2',
            'variance' => 'decimal:2',
            'adjustment' => 'decimal:2',
            'reconciled_at' => 'datetime',
        ];
    }

    public function portCall(): BelongsTo
    {
        return $this->belongsTo(PortCall::class);
    }

    public function completionNote(): BelongsTo
    {
        return $this->belongsTo(CompletionNote::class);
    }

    public function reconciler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }
}
