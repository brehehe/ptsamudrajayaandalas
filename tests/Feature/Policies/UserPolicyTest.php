<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['Owner', 'Direktur', 'Admin', 'Lapangan'] as $roleName) {
        Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
    }
});

test('only management roles can access and create master users', function (string $role, bool $allowed) {
    $actor = User::factory()->create();
    $actor->syncRoles([$role]);

    expect($actor->can('viewAny', User::class))->toBe($allowed)
        ->and($actor->can('create', User::class))->toBe($allowed);
})->with([
    'owner' => ['Owner', true],
    'director' => ['Direktur', true],
    'admin' => ['Admin', true],
    'operational' => ['Lapangan', false],
]);

test('account management follows the role hierarchy', function (string $actorRole, string $targetRole, bool $allowed) {
    $actor = User::factory()->create();
    $actor->syncRoles([$actorRole]);

    $target = User::factory()->create();
    $target->syncRoles([$targetRole]);

    expect($actor->can('update', $target))->toBe($allowed)
        ->and($actor->can('delete', $target))->toBe($allowed);
})->with([
    'owner manages owner' => ['Owner', 'Owner', true],
    'owner manages director' => ['Owner', 'Direktur', true],
    'owner manages admin' => ['Owner', 'Admin', true],
    'owner manages operational' => ['Owner', 'Lapangan', true],
    'director cannot manage owner' => ['Direktur', 'Owner', false],
    'director manages director' => ['Direktur', 'Direktur', true],
    'director manages admin' => ['Direktur', 'Admin', true],
    'director manages operational' => ['Direktur', 'Lapangan', true],
    'admin cannot manage owner' => ['Admin', 'Owner', false],
    'admin cannot manage director' => ['Admin', 'Direktur', false],
    'admin manages admin' => ['Admin', 'Admin', true],
    'admin manages operational' => ['Admin', 'Lapangan', true],
    'operational cannot manage owner' => ['Lapangan', 'Owner', false],
    'operational cannot manage director' => ['Lapangan', 'Direktur', false],
    'operational cannot manage admin' => ['Lapangan', 'Admin', false],
    'operational cannot manage operational' => ['Lapangan', 'Lapangan', false],
]);

test('a management user cannot delete their own account', function (string $role) {
    $actor = User::factory()->create();
    $actor->syncRoles([$role]);

    expect($actor->can('delete', $actor))->toBeFalse();
})->with(['Owner', 'Direktur', 'Admin']);
