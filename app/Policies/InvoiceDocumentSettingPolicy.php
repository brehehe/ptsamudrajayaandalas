<?php

namespace App\Policies;

use App\Models\InvoiceDocumentSetting;
use App\Models\User;

class InvoiceDocumentSettingPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $this->canManage($user);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, InvoiceDocumentSetting $invoiceDocumentSetting): bool
    {
        return $this->canManage($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->canManage($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, InvoiceDocumentSetting $invoiceDocumentSetting): bool
    {
        return $this->canManage($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, InvoiceDocumentSetting $invoiceDocumentSetting): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, InvoiceDocumentSetting $invoiceDocumentSetting): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, InvoiceDocumentSetting $invoiceDocumentSetting): bool
    {
        return false;
    }

    private function canManage(User $user): bool
    {
        return $user->hasAnyPermission(['settings.manage', 'masters.manage']);
    }
}
