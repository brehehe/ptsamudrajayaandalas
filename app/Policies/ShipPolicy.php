<?php

namespace App\Policies;

use App\Models\Ship;
use App\Models\User;

class ShipPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([
            'Owner',
            'Direktur',
            'Admin',
            'Admin Sistem',
            'Lapangan',
            'Tim Lapangan',
            'Staf Operasional',
        ]);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Ship $ship): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isOperationalAdmin() || $user->isStaff();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Ship $ship): bool
    {
        return $user->isOperationalAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Ship $ship): bool
    {
        return $user->isOperationalAdmin();
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Ship $ship): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Ship $ship): bool
    {
        return false;
    }
}
