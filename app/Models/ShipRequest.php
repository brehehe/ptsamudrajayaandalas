<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class ShipRequest extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'requests';

    protected $fillable = [
        'request_number',
        'batch_number',
        'ship_id',
        'created_by',
        'status',
        'request_date',
        'notes',
        'completed_at',
        'cancelled_at',
        'port_call_id',
        'port_id',
        'service_type',
        'requested_port_call_status',
        'operational_occurred_at',
        'company_id',
        'forwarded_to_director_at',
        'director_reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'request_date' => 'date',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'operational_occurred_at' => 'datetime',
            'forwarded_to_director_at' => 'datetime',
            'director_reviewed_at' => 'datetime',
        ];
    }

    public function ship(): BelongsTo
    {
        return $this->belongsTo(Ship::class, 'ship_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(ShipCompany::class, 'company_id');
    }

    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'port_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function portCall(): BelongsTo
    {
        return $this->belongsTo(PortCall::class, 'port_call_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'request_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RequestItem::class, 'request_id');
    }

    /**
     * Derive the request status without blocking approved items behind items
     * that are still waiting for review.
     *
     * @param  Collection<int, RequestItem>  $items
     */
    public function resolveWorkflowStatus(Collection $items): string
    {
        $allItemsCompleted = $items->isNotEmpty()
            && $items->every(fn (RequestItem $item): bool => $item->director_status === 'approved'
                && $item->status === 'selesai');

        if ($allItemsCompleted) {
            return 'Selesai';
        }

        $hasFulfillmentProgress = $items->contains(
            fn (RequestItem $item): bool => $item->director_status === 'approved'
                && in_array($item->status, ['dalam_proses', 'selesai'], true)
        );

        if ($hasFulfillmentProgress) {
            return 'Dalam Proses';
        }

        $awaitingDirector = $items->contains(
            fn (RequestItem $item): bool => $item->status === 'diajukan_ke_direktur'
                && $item->director_status === 'pending'
        );

        if ($awaitingDirector) {
            return 'Menunggu Approval Direktur';
        }

        $approvedItems = $items->where('director_status', 'approved')->count();
        $rejectedItems = $items->where('director_status', 'rejected')->count();

        if ($items->isNotEmpty() && $approvedItems === $items->count()) {
            return 'Disetujui';
        }

        if ($approvedItems > 0) {
            return 'Disetujui Sebagian';
        }

        if ($items->isNotEmpty() && $rejectedItems === $items->count()) {
            return 'Ditolak';
        }

        return 'Menunggu Approval';
    }
}
