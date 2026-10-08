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
        ['name' => 'Bu Titik', 'email' => 'titik@gmail.com', 'role' => 'Admin'],
        ['name' => 'Pak Prima', 'email' => 'prima@gmail.com', 'role' => 'Lapangan'],
        ['name' => 'Pak Ryan', 'email' => 'ryan@gmail.com', 'role' => 'Direktur'],
        ['name' => 'Hendra Wijaya', 'email' => 'owner@gmail.com', 'role' => 'Owner'],
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
        ->where('role_dashboard.is_read_only', $role === 'Owner')
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
    'direktur' => ['Direktur', 'direktur', '/approvals', ['approval_queue', 'financial_trend', 'director_pipeline']],
    'owner' => ['Owner', 'owner', '/reports', ['financial_trend', 'collection_mix', 'business_pipeline']],
]);

test('admin master users index exposes only admin and operational role management', function () {
    $admin = User::firstOrCreate(
        ['email' => 'titik@gmail.com'],
        ['name' => 'Bu Titik', 'password' => Hash::make('password')]
    );
    $admin->syncRoles(['Admin']);

    $fieldUser = User::factory()->create([
        'name' => 'Pak Prima',
        'email' => 'field-only@gmail.com',
    ]);
    $fieldUser->syncRoles(['Lapangan']);

    $director = User::factory()->create([
        'name' => 'Pak Ryan',
        'email' => 'director-visible@gmail.com',
    ]);
    $director->syncRoles(['Direktur']);

    $owner = User::factory()->create([
        'name' => 'Hendra Wijaya',
        'email' => 'owner-visible@gmail.com',
    ]);
    $owner->syncRoles(['Owner']);

    $response = $this->actingAs($admin)->get('/master/users');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Master/Users/Index')
        ->has('users', 4)
        ->where('users.0.email', $admin->email)
        ->where('users.1.email', $owner->email)
        ->where('users.2.email', $fieldUser->email)
        ->where('users.3.email', $director->email)
        ->where('users.0.can_update', true)
        ->where('users.0.can_delete', false)
        ->where('users.1.can_update', false)
        ->where('users.1.can_delete', false)
        ->where('users.2.can_update', true)
        ->where('users.2.can_delete', true)
        ->where('users.3.can_update', false)
        ->where('users.3.can_delete', false)
        ->where('roles', ['Admin', 'Lapangan'])
        ->where('can_manage', true)
    );
});

test('admin can create admin users but cannot create director users', function () {
    $admin = User::firstOrCreate(
        ['email' => 'titik@gmail.com'],
        ['name' => 'Bu Titik', 'password' => Hash::make('password')]
    );
    $admin->syncRoles(['Admin']);

    $payload = [
        'name' => 'Admin Baru',
        'email' => 'adminbaru@gmail.com',
        'password' => 'password123',
        'role' => 'Admin',
    ];

    $response = $this->actingAs($admin)->post('/master/users', $payload);

    $response->assertRedirect();
    $newUser = User::where('email', 'adminbaru@gmail.com')->first();
    expect($newUser)->not->toBeNull();
    expect($newUser->hasRole('Admin'))->toBeTrue();

    $this->actingAs($admin)->post('/master/users', [
        ...$payload,
        'name' => 'Direktur Tidak Sah',
        'email' => 'direkturtidaksah@gmail.com',
        'role' => 'Direktur',
    ])->assertSessionHasErrors('role');

    expect(User::where('email', 'direkturtidaksah@gmail.com')->exists())->toBeFalse();
});

test('admin can update operational users to admin', function () {
    $admin = User::firstOrCreate(
        ['email' => 'titik@gmail.com'],
        ['name' => 'Bu Titik', 'password' => Hash::make('password')]
    );
    $admin->syncRoles(['Admin']);

    $targetUser = User::create([
        'name' => 'Staff To Update',
        'email' => 'stafftoupdate@gmail.com',
        'password' => Hash::make('oldpassword'),
    ]);
    $targetUser->syncRoles(['Lapangan']);

    $updatePayload = [
        'name' => 'Staff Updated Name',
        'email' => 'stafftoupdate@gmail.com',
        'role' => 'Admin',
        'password' => 'newsecretpassword',
    ];

    $response = $this->actingAs($admin)->put("/master/users/{$targetUser->id}", $updatePayload);

    $response->assertRedirect();
    $targetUser->refresh();
    expect($targetUser->name)->toBe('Staff Updated Name');
    expect($targetUser->hasRole('Admin'))->toBeTrue();
    expect(Hash::check('newsecretpassword', $targetUser->password))->toBeTrue();
});

test('director can manage director admin and operational users but not owners', function () {
    $director = User::factory()->create(['name' => 'Direktur Utama']);
    $director->syncRoles(['Direktur']);

    $owner = User::factory()->create(['name' => 'Owner Utama']);
    $owner->syncRoles(['Owner']);

    $admin = User::factory()->create(['name' => 'Admin Lama']);
    $admin->syncRoles(['Admin']);

    $this->actingAs($director)
        ->get('/master/users')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Master/Users/Index')
            ->where('roles', ['Direktur', 'Admin', 'Lapangan'])
            ->where('can_manage', true)
        );

    $this->actingAs($director)->put("/master/users/{$admin->id}", [
        'name' => 'Admin Baru',
        'email' => $admin->email,
        'role' => 'Admin',
    ])->assertRedirect();

    $this->actingAs($director)->put("/master/users/{$owner->id}", [
        'name' => 'Owner Diubah',
        'email' => $owner->email,
        'role' => 'Direktur',
    ])->assertForbidden();

    expect($admin->fresh()->name)->toBe('Admin Baru')
        ->and($owner->fresh()->name)->toBe('Owner Utama');
});

test('owner can create update and delete every managed role', function () {
    $owner = User::factory()->create();
    $owner->syncRoles(['Owner']);

    $this->actingAs($owner)
        ->get('/master/users')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Master/Users/Index')
            ->where('roles', ['Owner', 'Direktur', 'Admin', 'Lapangan'])
            ->where('can_manage', true)
            ->has('users', 1)
        );

    $this->actingAs($owner)->post('/master/users', [
        'name' => 'Owner Kedua',
        'email' => 'owner-kedua@gmail.com',
        'password' => 'password123',
        'role' => 'Owner',
    ])->assertRedirect();

    $targetUser = User::where('email', 'owner-kedua@gmail.com')->firstOrFail();

    $this->actingAs($owner)->put("/master/users/{$targetUser->id}", [
        'name' => 'Direktur Baru',
        'email' => $targetUser->email,
        'role' => 'Direktur',
    ])->assertRedirect();

    expect($targetUser->fresh()->name)->toBe('Direktur Baru')
        ->and($targetUser->hasRole('Direktur'))->toBeTrue();

    $this->actingAs($owner)
        ->delete("/master/users/{$targetUser->id}")
        ->assertRedirect();

    $this->assertDatabaseMissing('users', ['id' => $targetUser->id]);
});

test('management roles cannot delete their own account', function (string $role) {
    $user = User::factory()->create();
    $user->syncRoles([$role]);

    $response = $this->actingAs($user)->delete("/master/users/{$user->id}");

    $response->assertRedirect()->assertSessionHas('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
    $this->assertModelExists($user);
})->with(['Owner', 'Direktur', 'Admin']);

test('operational users cannot access or mutate master users', function () {
    $operational = User::factory()->create();
    $operational->syncRoles(['Lapangan']);

    $this->actingAs($operational)
        ->get('/master/users')
        ->assertForbidden();

    $this->actingAs($operational)->post('/master/users', [
        'name' => 'Akun Tidak Sah',
        'email' => 'akun-tidak-sah@gmail.com',
        'password' => 'password123',
        'role' => 'Lapangan',
    ])->assertForbidden();

    expect(User::where('email', 'akun-tidak-sah@gmail.com')->exists())->toBeFalse();
});

test('master roles index lists 4 roles with permissions and user counts', function () {
    $admin = User::firstOrCreate(
        ['email' => 'titik@gmail.com'],
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
        ['email' => 'prima@gmail.com'],
        ['name' => 'Pak Prima', 'password' => Hash::make('password')]
    );
    $fieldUser->syncRoles(['Lapangan']);

    $response = $this->actingAs($fieldUser)->get('/vessels');
    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->where('auth.user.primary_role', 'Lapangan')
    );
});
