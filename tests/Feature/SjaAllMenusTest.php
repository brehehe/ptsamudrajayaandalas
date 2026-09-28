<?php

use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    // Ensure roles exist
    Role::firstOrCreate(['name' => 'Tim Lapangan', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
});

test('authenticated user can access Kebutuhan menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/needs');

    $response->assertStatus(200);
});

test('authenticated user can access Approval menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/approvals');

    $response->assertStatus(200);
});

test('authenticated user can access Operasional menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/operations');

    $response->assertStatus(200);
});

test('authenticated user can access Pengeluaran menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/expenses');

    $response->assertStatus(200);
});

test('authenticated user can access Invoice & Tagihan menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/invoices');

    $response->assertStatus(200);
});

test('authenticated user can access Piutang menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/receivables');

    $response->assertStatus(200);
});

test('authenticated user can access Laporan menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/reports');

    $response->assertStatus(200);
});

test('authenticated user can access Master Data Pelabuhan menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/master/ports');

    $response->assertStatus(200);
});

test('authenticated user can access Master Data Vendor menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/master/vendors');

    $response->assertStatus(200);
});

test('authenticated user can access Master Data User menu', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/master/users');

    $response->assertStatus(200);
});

test('director can approve a pending ship request', function () {
    $user = User::factory()->create();
    $company = ShipCompany::create([
        'code' => 'TEST',
        'name' => 'PT Test Armada',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'name' => 'KM Uji Coba',
        'imo_number' => '1234567',
        'ship_company_id' => $company->id,
        'status' => 'Sandar',
        'is_active' => true,
    ]);
    $request = ShipRequest::create([
        'request_number' => 'REQ-TEST-0001',
        'ship_id' => $ship->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
        'notes' => 'Test butuh air tawar',
    ]);

    $response = $this->actingAs($user)->post("/approvals/requests/{$request->id}/approve");

    $response->assertSessionHas('success');
    expect($request->fresh()->status)->toBe('Disetujui');
});

test('authenticated user can access Dashboard and receives SJA mobile and desktop props', function () {
    $user = User::where('email', 'prima@samudrajaya.co.id')->first() ?? User::factory()->create();

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Dashboard')
        ->has('kpi')
        ->has('summary_today')
        ->has('today_ships')
        ->has('recent_activities')
        ->has('submission_info')
        ->has('prima_header')
    );
});
