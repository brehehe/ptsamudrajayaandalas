<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ship extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'ships';

    protected $fillable = [
        'ship_company_id',
        'imo_number',
        'name',
        'call_sign',
        'flag',
        'ship_type',
        'gross_tonnage',
        'status',
        'eta',
        'agent_name',
        'image',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'gross_tonnage' => 'decimal:2',
            'eta' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(ShipCompany::class, 'ship_company_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(ShipRequest::class, 'ship_id');
    }

    public function portCalls(): HasMany
    {
        return $this->hasMany(PortCall::class, 'ship_id');
    }
}
