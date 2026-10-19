<?php

use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('dashboard accepts filter parameters and scopes records accordingly', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $companyA = ShipCompany::create(['name' => 'PT Pelayaran Alpha', 'is_active' => true]);
    $companyB = ShipCompany::create(['name' => 'PT Pelayaran Beta', 'is_active' => true]);

    $shipA = Ship::create(['name' => 'KM Alpha Satu', 'ship_company_id' => $companyA->id, 'is_active' => true]);
    $shipB = Ship::create(['name' => 'KM Beta Dua', 'ship_company_id' => $companyB->id, 'is_active' => true]);

    $port = Port::create(['name' => 'Pelabuhan Merak', 'code' => 'MRK', 'city' => 'Cilegon', 'country' => 'Indonesia', 'is_active' => true]);

    PortCall::create([
        'job_number' => 'JOB-ALPHA-01',
        'ship_id' => $shipA->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'eta_at' => today()->setTime(8, 0),
        'berthed_at' => today()->setTime(9, 0),
    ]);

    PortCall::create([
        'job_number' => 'JOB-BETA-02',
        'ship_id' => $shipB->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'eta_at' => today()->setTime(10, 0),
        'berthed_at' => today()->setTime(11, 0),
    ]);

    $response = $this->actingAs($admin)->get(route('dashboard', [
        'ship_id' => $shipA->id,
        'period' => 'hari_ini',
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Dashboard')
        ->where('filters.ship_id', $shipA->id)
        ->where('filters.period', 'hari_ini')
        ->where('kpi.kapal_aktif', 1)
        ->has('today_ships', 1)
        ->where('today_ships.0.name', 'KM Alpha Satu')
    );
});

test('approvals index provides all_requests_total_hpp and waiting_requests_total_hpp', function () {
    $director = User::factory()->create();
    $director->assignRole(Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']));

    $company = ShipCompany::create(['name' => 'PT Samudra Mandiri', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Samudra Test', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['name' => 'Pelabuhan Uji', 'code' => 'UJI', 'city' => 'Jakarta', 'country' => 'Indonesia', 'is_active' => true]);

    $request = ShipRequest::create([
        'request_number' => 'REQ-TEST-001',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'company_id' => $company->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => today(),
        'created_by' => $director->id,
    ]);

    RequestItem::create([
        'request_id' => $request->id,
        'item_name' => 'Sertifikat Kesyahbandaran',
        'quantity' => 2,
        'unit' => 'dokumen',
        'selling_price' => 2_000_000,
        'hpp_price' => 1_500_000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    $response = $this->actingAs($director)->get(route('approvals.index', ['tab' => 'menunggu']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Approvals/Index')
        ->has('all_requests_total_hpp')
        ->has('waiting_requests_total_hpp')
        ->where('waiting_requests_total_hpp', fn ($val) => $val >= 3_000_000)
    );
});
