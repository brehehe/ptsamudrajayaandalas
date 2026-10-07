<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    app()->setLocale('id');
});

test('master port returns clear Indonesian validation errors for every required field', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $response = $this->actingAs($admin)
        ->from(route('master.ports.index'))
        ->post(route('master.ports.store'), []);

    $response->assertRedirect(route('master.ports.index'))
        ->assertSessionHasErrors([
            'code' => 'Kode wajib diisi.',
            'name' => 'Nama wajib diisi.',
            'city' => 'Kota/Kabupaten wajib diisi.',
            'country' => 'Negara wajib diisi.',
            'timezone' => 'Zona waktu wajib diisi.',
        ]);
});

test('upcoming ship arrival rejects an incomplete selection through Laravel validation', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $response = $this->actingAs($admin)
        ->from(route('vessels.index'))
        ->post(route('ship-arrivals.store'), [
            'ship_selection_type' => 'existing',
            'company_selection_type' => 'existing',
        ]);

    $response->assertRedirect(route('vessels.index'))
        ->assertSessionHasErrors(['ship_id', 'ship_company_id', 'eta']);
});

test('daily report returns field-level Laravel validation errors', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));

    $response = $this->actingAs($user)
        ->from(route('operations.index'))
        ->post(route('operations.daily-reports.store'), []);

    $response->assertRedirect(route('operations.index'))
        ->assertSessionHasErrors([
            'port_call_id' => 'Kunjungan / job wajib diisi.',
            'report_date' => 'Tanggal kegiatan wajib diisi.',
            'summary' => 'Ringkasan aktivitas wajib diisi.',
        ]);
});
