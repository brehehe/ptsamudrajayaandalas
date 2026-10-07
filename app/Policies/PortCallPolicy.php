<?php

namespace App\Policies;

use App\Models\PortCall;
use App\Models\User;

class PortCallPolicy
{
    public function updateStatus(User $user, PortCall $portCall): bool
    {
        return $user->isOperationalAdmin()
            || $user->isStaff();
    }
}
