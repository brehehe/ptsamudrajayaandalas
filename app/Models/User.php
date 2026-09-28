<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, \Spatie\Permission\Traits\HasRoles;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get all ship requests created by this user.
     *
     * @return HasMany<ShipRequest, $this>
     */
    public function requests(): HasMany
    {
        return $this->hasMany(ShipRequest::class, 'created_by');
    }

    /**
     * Check if user has staff role.
     */
    public function isStaff(): bool
    {
        return $this->hasRole(['Tim Lapangan', 'Staf Operasional']);
    }

    /**
     * Check if user has operational admin role.
     */
    public function isOperationalAdmin(): bool
    {
        return $this->hasRole(['Admin', 'Admin Sistem']);
    }

    /**
     * Check if user has director role.
     */
    public function isDirector(): bool
    {
        return $this->hasRole('Direktur');
    }

    /**
     * Check if user has owner role.
     */
    public function isOwner(): bool
    {
        return $this->hasRole('Owner');
    }
}
