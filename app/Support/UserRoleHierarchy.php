<?php

namespace App\Support;

use App\Models\User;

final class UserRoleHierarchy
{
    /** @var list<string> */
    public const ROLES = ['Owner', 'Direktur', 'Admin', 'Lapangan'];

    /** @var array<string, string> */
    private const ROLE_ALIASES = [
        'Admin Sistem' => 'Admin',
        'Staf Operasional' => 'Lapangan',
        'Tim Lapangan' => 'Lapangan',
    ];

    /**
     * @return list<string>
     */
    public static function assignableRoles(User $actor): array
    {
        if ($actor->isOwner()) {
            return self::ROLES;
        }

        if ($actor->isDirector()) {
            return ['Direktur', 'Admin', 'Lapangan'];
        }

        if ($actor->isOperationalAdmin()) {
            return ['Admin', 'Lapangan'];
        }

        return [];
    }

    public static function canManage(User $actor, User $target): bool
    {
        $assignableRoles = self::assignableRoles($actor);

        if ($assignableRoles === []) {
            return false;
        }

        $targetRoles = $target->roles
            ->pluck('name')
            ->map(fn (string $role): string => self::ROLE_ALIASES[$role] ?? $role);

        if ($targetRoles->isEmpty()) {
            return true;
        }

        return $targetRoles->every(
            fn (string $role): bool => in_array($role, $assignableRoles, true),
        );
    }
}
