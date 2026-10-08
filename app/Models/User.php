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

#[Fillable(['name', 'email', 'password', 'employee_id', 'phone', 'job_title', 'is_active', 'account_status', 'invitation_sent_at', 'activated_at', 'last_login_at'])]
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
            'is_active' => 'boolean',
            'invitation_sent_at' => 'datetime',
            'activated_at' => 'datetime',
            'last_login_at' => 'datetime',
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
     * Get the browser devices registered for push notifications.
     *
     * @return HasMany<PushSubscription, $this>
     */
    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
    }

    /**
     * Check if user has staff role.
     */
    public function isStaff(): bool
    {
        return $this->hasRole(['Tim Lapangan', 'Staf Operasional', 'Lapangan']);
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

    /**
     * Get primary Spatie role name.
     */
    public function getPrimaryRoleName(): string
    {
        if ($this->hasRole('Owner')) {
            return 'Owner';
        }
        if ($this->hasRole('Direktur')) {
            return 'Direktur';
        }
        if ($this->hasRole(['Lapangan', 'Tim Lapangan', 'Staf Operasional'])) {
            return 'Lapangan';
        }
        if ($this->hasRole(['Admin', 'Admin Sistem'])) {
            return 'Admin';
        }

        return $this->roles->first()?->name ?? 'Tanpa Role';
    }
}
