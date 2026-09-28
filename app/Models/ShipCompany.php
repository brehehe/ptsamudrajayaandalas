<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShipCompany extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'ship_companies';

    protected $fillable = [
        'code',
        'name',
        'address',
        'phone',
        'email',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Relationship: 1 Perusahaan hasMany Kapal (Ships)
     */
    public function ships(): HasMany
    {
        return $this->hasMany(Ship::class, 'ship_company_id');
    }
}
