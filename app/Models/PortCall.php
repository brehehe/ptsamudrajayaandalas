<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class PortCall extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'port_calls';

    protected $fillable = [
        'job_number',
        'work_order_id',
        'ship_id',
        'port_id',
        'status',
        'eta_at',
        'etd_at',
        'arrived_at',
        'berthed_at',
        'departed_at',
        'financial_status',
        'arrival_payment_exception',
        'arrival_payment_exception_note',
        'completion_note_due_at',
        'reconciled_at',
    ];

    protected function casts(): array
    {
        return [
            'eta_at' => 'datetime',
            'etd_at' => 'datetime',
            'arrived_at' => 'datetime',
            'berthed_at' => 'datetime',
            'departed_at' => 'datetime',
            'arrival_payment_exception' => 'boolean',
            'completion_note_due_at' => 'datetime',
            'reconciled_at' => 'datetime',
        ];
    }

    public function ship(): BelongsTo
    {
        return $this->belongsTo(Ship::class, 'ship_id');
    }

    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'port_id');
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class, 'work_order_id');
    }

    public function dailyReports(): HasMany
    {
        return $this->hasMany(DailyReport::class, 'port_call_id');
    }

    public function outgoingPayments(): HasMany
    {
        return $this->hasMany(OutgoingPayment::class, 'port_call_id');
    }

    public function verifiedArrivalPayments(): HasMany
    {
        return $this->outgoingPayments()
            ->where('payment_type', 'Pelindo Kedatangan')
            ->where('verification_status', 'verified')
            ->whereNotNull('verified_by')
            ->whereNotNull('verified_at')
            ->where('amount', '>', 0);
    }

    public function clearanceInBlockReason(): ?string
    {
        if ($this->status !== 'scheduled') {
            return 'Clearance In sudah dicatat untuk kunjungan ini.';
        }

        return null;
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'port_call_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(ShipRequest::class, 'port_call_id');
    }

    public function expenseRequests(): HasMany
    {
        return $this->hasMany(ExpenseRequest::class);
    }

    public function costDocuments(): HasMany
    {
        return $this->hasMany(CostDocument::class);
    }

    public function completionNote(): HasOne
    {
        return $this->hasOne(CompletionNote::class);
    }

    public function costReconciliation(): HasOne
    {
        return $this->hasOne(CostReconciliation::class);
    }
}
