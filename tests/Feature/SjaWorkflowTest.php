<?php

use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;

test('landing page is accessible and displays maritime identity', function () {
    $response = $this->get('/');

    $response->assertStatus(200);
});

test('dashboard redirects unauthenticated users to login', function () {
    $response = $this->get('/dashboard');

    $response->assertRedirect('/login');
});

test('authenticated user can view dashboard', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(200);
});

test('authenticated user can view vessels index', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/vessels');

    $response->assertStatus(200);
});

test('authenticated user can view requests index', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/requests');

    $response->assertStatus(200);
});

test('authenticated user can view vessel detail page', function () {
    $user = User::factory()->create();
    $ship = Ship::create([
        'name' => 'KM Test Samudra',
        'imo_number' => '9876543',
        'ship_type' => 'Container Ship',
        'status' => 'Sandar',
        'agent_name' => 'PT Samudra Jaya Andalas',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->get("/vessels/{$ship->id}");

    $response->assertStatus(200);
});

test('authenticated user can create a new ship request', function () {
    $user = User::factory()->create();
    $ship = Ship::create([
        'name' => 'KM Test Samudra 2',
        'imo_number' => '9876544',
        'ship_type' => 'Bulk Carrier',
        'status' => 'Labuh',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->post('/requests', [
        'ship_id' => $ship->id,
        'need_type' => 'Air (Fresh Water)',
        'quantity' => 10,
        'unit' => 'Ton',
        'required_at' => '2026-01-15 08:00',
        'notes' => 'Permintaan air tawar dermaga utara',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('requests', [
        'ship_id' => $ship->id,
        'status' => 'Menunggu Approval',
    ]);
});

test('authenticated user can view component library showcase', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/components');

    $response->assertStatus(200);
});

test('authenticated user can view profile page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/profile');

    $response->assertStatus(200);
});

test('authenticated user can view specific target vessel detail', function () {
    $user = User::factory()->create();
    $ship = Ship::firstOrCreate(
        ['id' => '01a08f28-d41b-7227-a3a9-3d49046e2237'],
        [
            'name' => 'KM Samudra Perkasa',
            'imo_number' => '9812345',
            'ship_type' => 'Container Ship',
            'status' => 'Sandar',
            'agent_name' => 'PT Samudra Jaya Andalas',
            'is_active' => true,
        ]
    );

    $response = $this->actingAs($user)->get("/vessels/{$ship->id}");

    $response->assertStatus(200);
});

test('authenticated user can create a shipping company', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/companies', [
        'name' => 'PT Andalas Maritim Lines',
        'code' => 'AML',
        'phone' => '031-9988776',
        'email' => 'ops@andalaslines.com',
        'address' => 'Jl. Nilam Timur No. 10, Surabaya',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('ship_companies', [
        'name' => 'PT Andalas Maritim Lines',
        'code' => 'AML',
    ]);
});

test('authenticated user can create a ship and assign to company or create company on the fly', function () {
    $user = User::factory()->create();

    // 1. Create a company first
    $company = ShipCompany::create([
        'name' => 'PT Lintas Samudra Raya',
        'code' => 'LSR',
        'is_active' => true,
    ]);

    // 2. Add ship 1 to this company
    $response1 = $this->actingAs($user)->post('/vessels', [
        'name' => 'KM Lintas Raya 01',
        'imo_number' => '9988111',
        'ship_type' => 'Container Ship',
        'status' => 'Sandar',
        'ship_company_id' => $company->id,
    ]);
    $response1->assertRedirect();

    // 3. Add ship 2 to this same company (1 company has many ships)
    $response2 = $this->actingAs($user)->post('/vessels', [
        'name' => 'KM Lintas Raya 02',
        'imo_number' => '9988112',
        'ship_type' => 'General Cargo',
        'status' => 'Akan Datang',
        'ship_company_id' => $company->id,
    ]);
    $response2->assertRedirect();

    $this->assertEquals(2, $company->fresh()->ships()->count());

    // 4. Add ship 3 with a brand new company created on the fly
    $response3 = $this->actingAs($user)->post('/vessels', [
        'name' => 'TB Perkasa 99',
        'imo_number' => '9988113',
        'ship_type' => 'Tugboat / Barge',
        'status' => 'Labuh',
        'is_new_company' => true,
        'new_company_name' => 'PT Armada Bahari Nusantara',
        'new_company_code' => 'ABN',
        'new_company_phone' => '031-1234567',
    ]);
    $response3->assertRedirect();

    $this->assertDatabaseHas('ship_companies', [
        'name' => 'PT Armada Bahari Nusantara',
        'code' => 'ABN',
    ]);

    $newCompany = ShipCompany::where('code', 'ABN')->first();
    $this->assertNotNull($newCompany);
    $this->assertDatabaseHas('ships', [
        'name' => 'TB Perkasa 99',
        'ship_company_id' => $newCompany->id,
    ]);
});

test('dashboard provides all bu titik occ operational datasets', function () {
    $user = User::factory()->create(['name' => 'Bu Titik', 'email' => 'titik@samudrajaya.co.id']);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Dashboard')
        ->has('kpi')
        ->has('latest_requests')
        ->has('attention_ships')
        ->has('schedules')
        ->has('notifications')
        ->has('activity_chart')
        ->has('needs_today')
        ->has('financial_overview')
        ->has('financial_overview.chart')
        ->has('financial_overview.recent_invoices')
        ->where('kpi.kapal_aktif', fn ($val) => is_numeric($val))
        ->where('latest_requests.0.request_number', 'REQ-00245')
    );
});
