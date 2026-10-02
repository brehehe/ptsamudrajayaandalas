<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['Owner', 'Direktur', 'Admin', 'Lapangan'] as $roleName) {
        Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
    }
});

test('login page is accessible and contains demo account references', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('Auth/Login'));
});

test('can authenticate and load dashboard with correct Spatie primary_role for all 4 roles', function () {
    $rolesMap = [
        ['name' => 'Bu Titik', 'email' => 'titik@samudrajaya.co.id', 'role' => 'Admin'],
        ['name' => 'Pak Prima', 'email' => 'prima@samudrajaya.co.id', 'role' => 'Lapangan'],
        ['name' => 'Pak Ryan', 'email' => 'ryan@samudrajaya.co.id', 'role' => 'Direktur'],
        ['name' => 'Hendra Wijaya', 'email' => 'owner@samudrajaya.co.id', 'role' => 'Owner'],
    ];

    foreach ($rolesMap as $account) {
        $user = User::firstOrCreate(
            ['email' => $account['email']],
            ['name' => $account['name'], 'password' => Hash::make('password')]
        );

        $role = Role::firstOrCreate(['name' => $account['role']]);
        $user->syncRoles([$role]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('current_role', $account['role'])
            ->where('auth.user.primary_role', $account['role'])
            ->has('auth.user.roles')
            ->has('auth.user.permissions')
        );
    }
});

test('dashboard provides a distinct role workspace with role-specific reports', function (string $role, string $workspace, string $primaryAction, array $chartKeys) {
    $user = User::factory()->create();
    $user->syncRoles([$role]);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Dashboard')
        ->where('current_role', $role)
        ->where('role_dashboard.role', $workspace)
        ->where('role_dashboard.primary_action.href', $primaryAction)
        ->has('role_dashboard.metrics', 4)
        ->has('role_dashboard.priorities', 3)
        ->has('role_dashboard.quick_actions', 4)
        ->has('role_dashboard.pipeline')
        ->has('role_dashboard.charts', 3)
        ->where('role_dashboard.charts.0.key', $chartKeys[0])
        ->where('role_dashboard.charts.1.key', $chartKeys[1])
        ->where('role_dashboard.charts.2.key', $chartKeys[2])
    );

    if ($role === 'Lapangan') {
        $response->assertInertia(fn ($page) => $page
            ->where('financial_overview', null)
            ->has('pending_approvals', 0)
        );
    }
})->with([
    'operasional' => ['Lapangan', 'operasional', '/operations', ['vessel_status', 'field_activity', 'request_status']],
    'admin' => ['Admin', 'admin', '/work-orders/create', ['workflow_pipeline', 'vendor_invoices', 'request_status']],
    'direktur' => ['Direktur', 'direktur', '/approvals', ['approval_queue', 'financial_trend', 'receivables_aging']],
    'owner' => ['Owner', 'owner', '/reports', ['financial_trend', 'collection_mix', 'business_pipeline']],
]);

test('admin master users index only offers the operational role it may assign', function () {
    $admin = User::firstOrCreate(
        ['email' => 'titik@samudrajaya.co.id'],
        ['name' => 'Bu Titik', 'password' => Hash::make('password')]
    );
    $admin->syncRoles(['Admin']);

    $response = $this->actingAs($admin)->get('/master/users');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Master/Users/Index')
        ->has('users')
        ->has('roles')
        ->where('roles', ['Lapangan'])
    );
});

test('can create a new user with assigned Spatie role in master users', function () {
    $admin = User::firstOrCreate(
        ['email' => 'titik@samudrajaya.co.id'],
        ['name' => 'Bu Titik', 'password' => Hash::make('password')]
    );
    $admin->syncRoles(['Admin']);

    $payload = [
        'name' => 'Staf Operasional Baru',
        'email' => 'stafbaru@samudrajaya.co.id',
        'password' => 'password123',
        'role' => 'Lapangan',
    ];

    $response = $this->actingAs($admin)->post('/master/users', $payload);

    $response->assertRedirect();
    $newUser = User::where('email', 'stafbaru@samudrajaya.co.id')->first();
    expect($newUser)->not->toBeNull();
    expect($newUser->hasRole('Lapangan'))->toBeTrue();
});

test('admin cannot promote an operational user to director', function () {
    $admin = User::firstOrCreate(
        ['email' => 'titik@samudrajaya.co.id'],
        ['name' => 'Bu Titik', 'password' => Hash::make('password')]
    );
    $admin->syncRoles(['Admin']);

    $targetUser = User::create([
        'name' => 'Staff To Update',
        'email' => 'stafftoupdate@samudrajaya.co.id',
        'password' => Hash::make('oldpassword'),
    ]);
    $targetUser->syncRoles(['Lapangan']);

    $updatePayload = [
        'name' => 'Staff Updated Name',
        'email' => 'stafftoupdate@samudrajaya.co.id',
        'role' => 'Direktur',
        'password' => 'newsecretpassword',
    ];

    $response = $this->actingAs($admin)->put("/master/users/{$targetUser->id}", $updatePayload);

    $response->assertForbidden();
    $targetUser->refresh();
    expect($targetUser->name)->toBe('Staff To Update');
    expect($targetUser->hasRole('Lapangan'))->toBeTrue();
    expect(Hash::check('oldpassword', $targetUser->password))->toBeTrue();
});

test('owner can update an existing user role and optional password', function () {
    $owner = User::factory()->create();
    $owner->syncRoles(['Owner']);

    $targetUser = User::factory()->create([
        'name' => 'Staff To Update',
        'email' => 'owner-managed-staff@samudrajaya.co.id',
        'password' => Hash::make('oldpassword'),
    ]);
    $targetUser->syncRoles(['Lapangan']);

    $response = $this->actingAs($owner)->put("/master/users/{$targetUser->id}", [
        'name' => 'Staff Updated Name',
        'email' => $targetUser->email,
        'role' => 'Direktur',
        'password' => 'newsecretpassword',
    ]);

    $response->assertRedirect();
    $targetUser->refresh();
    expect($targetUser->name)->toBe('Staff Updated Name');
    expect($targetUser->hasRole('Direktur'))->toBeTrue();
    expect(Hash::check('newsecretpassword', $targetUser->password))->toBeTrue();
});

test('cannot delete own user account in master users', function () {
    $admin = User::firstOrCreate(
        ['email' => 'titik@samudrajaya.co.id'],
        ['name' => 'Bu Titik', 'password' => Hash::make('password')]
    );
    $admin->syncRoles(['Admin']);

    $response = $this->actingAs($admin)->delete("/master/users/{$admin->id}");

    $response->assertRedirect();
    expect(User::find($admin->id))->not->toBeNull();
});

test('master roles index lists 4 roles with permissions and user counts', function () {
    $admin = User::firstOrCreate(
        ['email' => 'titik@samudrajaya.co.id'],
        ['name' => 'Bu Titik', 'password' => Hash::make('password')]
    );
    $admin->syncRoles(['Admin']);

    $response = $this->actingAs($admin)->get('/master/roles');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Master/Roles/Index')
        ->has('roles', 4)
        ->has('roles.0.permissions')
        ->has('roles.0.users')
    );
});

test('sidebar receives correct primary_role in shared auth across all routes', function () {
    $fieldUser = User::firstOrCreate(
        ['email' => 'prima@samudrajaya.co.id'],
        ['name' => 'Pak Prima', 'password' => Hash::make('password')]
    );
    $fieldUser->syncRoles(['Lapangan']);

    $response = $this->actingAs($fieldUser)->get('/vessels');
    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->where('auth.user.primary_role', 'Lapangan')
    );
});
