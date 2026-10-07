<?php

namespace App\Policies;

use App\Models\CostDocument;
use App\Models\User;

class CostDocumentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CostDocument $costDocument): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isOperationalAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CostDocument $costDocument): bool
    {
        return $user->isOperationalAdmin()
            && in_array($costDocument->status, ['received', 'verified', 'rejected'], true)
            && $costDocument->payment_status === 'unpaid';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CostDocument $costDocument): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, CostDocument $costDocument): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CostDocument $costDocument): bool
    {
        return false;
    }
}
