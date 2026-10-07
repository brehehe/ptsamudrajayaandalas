<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrder;

class WorkOrderPolicy
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
    public function view(User $user, WorkOrder $workOrder): bool
    {
        if ($user->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem'])) {
            return true;
        }

        return $workOrder->assigned_to === $user->id || $workOrder->created_by === $user->id;
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
    public function update(User $user, WorkOrder $workOrder): bool
    {
        if ($workOrder->status === 'closed') {
            return false;
        }

        return $user->hasAnyRole(['Admin', 'Admin Sistem'])
            || $workOrder->assigned_to === $user->id
            || $workOrder->created_by === $user->id;
    }

    public function transition(User $user, WorkOrder $workOrder, string $targetStatus): bool
    {
        if ($workOrder->nextStatus() !== $targetStatus) {
            return false;
        }

        if ($user->isOperationalAdmin()) {
            return true;
        }

        return $user->isStaff()
            && in_array($targetStatus, ['active', 'in_progress', 'operational_completed'], true)
            && ($workOrder->assigned_to === $user->id || $workOrder->created_by === $user->id);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, WorkOrder $workOrder): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, WorkOrder $workOrder): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, WorkOrder $workOrder): bool
    {
        return false;
    }
}
