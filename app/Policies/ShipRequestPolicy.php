<?php

namespace App\Policies;

use App\Models\ShipRequest;
use App\Models\User;

class ShipRequestPolicy
{
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

    public function view(User $user, ShipRequest $shipRequest): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->isOperationalAdmin() || $user->isStaff();
    }

    public function addItem(User $user, ShipRequest $shipRequest): bool
    {
        return $this->create($user)
            && ! in_array($shipRequest->status, ['Selesai', 'Dibatalkan'], true);
    }

    public function reviewPricing(User $user, ShipRequest $shipRequest): bool
    {
        return $user->isOperationalAdmin();
    }

    public function decide(User $user, ShipRequest $shipRequest): bool
    {
        return $user->isDirector();
    }

    public function process(User $user, ShipRequest $shipRequest): bool
    {
        return $user->isOperationalAdmin();
    }
}
