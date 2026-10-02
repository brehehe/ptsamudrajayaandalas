<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompletionNote extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'port_call_id',
        'document_number',
        'departed_at',
        'issued_at',
        'downloaded_at',
        'uploaded_at',
        'due_at',
        'document_path',
        'actual_amount',
        'status',
        'notes',
        'uploaded_by',
        'verified_by',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'departed_at' => 'datetime',
            'issued_at' => 'date',
            'downloaded_at' => 'date',
            'uploaded_at' => 'datetime',
            'due_at' => 'datetime',
            'actual_amount' => 'decimal:2',
            'verified_at' => 'datetime',
        ];
    }

    public function portCall(): BelongsTo
    {
        return $this->belongsTo(PortCall::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function reconciliation(): HasOne
    {
        return $this->hasOne(CostReconciliation::class);
    }
}
