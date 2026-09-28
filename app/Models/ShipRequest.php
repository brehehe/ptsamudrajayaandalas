<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShipRequest extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'requests';

    protected $fillable = [
        'request_number',
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
}
