<?php

namespace App\Policies;

use App\Models\CompletionNote;
use App\Models\User;

class CompletionNotePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem', 'Lapangan', 'Tim Lapangan', 'Staf Operasional']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CompletionNote $completionNote): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isOperationalAdmin() || $user->isOwner();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CompletionNote $completionNote): bool
    {
        return ($user->isOperationalAdmin() || $user->isOwner())
            && $completionNote->status !== 'reconciled';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CompletionNote $completionNote): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, CompletionNote $completionNote): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CompletionNote $completionNote): bool
    {
        return false;
    }
}
