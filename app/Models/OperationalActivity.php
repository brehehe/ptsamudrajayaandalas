<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class OperationalActivity extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'operational_activities';

    protected $fillable = [
        'activity_date',
        'activity_time',
        'location_name',
        'latitude',
        'longitude',
        'is_vessel_related',
        'ship_id',
        'port_call_id',
        'request_id',
        'category',
        'title',
        'detail',
        'photos',
        'created_by',
        'vessel_position',
        'cargo_activity',
        'cargo_quantity',
        'cargo_unit',
        'progress_percent',
        'constraints',
        'next_plan',
    ];

    protected function casts(): array
    {
        return [
            'activity_date' => 'date:Y-m-d',
            'is_vessel_related' => 'boolean',
            'latitude' => 'float',
            'longitude' => 'float',
            'photos' => 'array',
            'cargo_quantity' => 'decimal:2',
            'progress_percent' => 'integer',
        ];
    }

    public function ship(): BelongsTo
    {
        return $this->belongsTo(Ship::class, 'ship_id');
    }

    public function portCall(): BelongsTo
    {
        return $this->belongsTo(PortCall::class, 'port_call_id');
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(ShipRequest::class, 'request_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
