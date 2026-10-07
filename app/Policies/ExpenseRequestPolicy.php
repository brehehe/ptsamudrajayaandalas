<?php

namespace App\Policies;

use App\Models\ExpenseRequest;
use App\Models\User;

class ExpenseRequestPolicy
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
    public function view(User $user, ExpenseRequest $expenseRequest): bool
    {
        if ($user->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem'])) {
            return true;
        }

        return $expenseRequest->created_by === $user->id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['Admin', 'Admin Sistem', 'Lapangan', 'Tim Lapangan', 'Staf Operasional']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ExpenseRequest $expenseRequest): bool
    {
        if ($user->hasAnyRole(['Admin', 'Admin Sistem'])) {
            return true;
        }

        return $expenseRequest->created_by === $user->id
            && in_array($expenseRequest->status, ['draft', 'revision'], true);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ExpenseRequest $expenseRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ExpenseRequest $expenseRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ExpenseRequest $expenseRequest): bool
    {
        return false;
    }
}
