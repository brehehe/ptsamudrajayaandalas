<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Port extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'ports';

    protected $fillable = [
        'code',
        'name',
        'city',
        'country',
        'timezone',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function portCalls(): HasMany
    {
        return $this->hasMany(PortCall::class, 'port_id');
    }
}
