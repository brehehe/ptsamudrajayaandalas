<?php

use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function createVesselIndexVisit(
    Ship $ship,
    Port $port,
    User $user,
    array $attributes = []
): PortCall {
    $workOrder = WorkOrder::create([
        'system_number' => Str::uuid()->toString(),
        'status' => 'accepted',
        'assigned_to' => $user->id,
    ]);

    return PortCall::create([
        'job_number' => Str::uuid()->toString(),
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'work_order_id' => $workOrder->id,
        'status' => 'scheduled',
        'financial_status' => 'pending_reconciliation',
        'eta_at' => now(),
        ...$attributes,
    ]);
}

test('authenticated user can view vessels index with correct props and counts', function () {
    $user = User::factory()->create();

    $company = ShipCompany::create([
        'name' => 'PT Pelayaran Samudra Test',
        'code' => 'PST',
        'is_active' => true,
    ]);

    $port = Port::firstOrCreate(
        ['name' => 'Pelabuhan Gresik'],
        ['code' => 'GRS', 'city' => 'Gresik', 'country' => 'Indonesia', 'is_active' => true]
    );

    $ship = Ship::create([
        'name' => 'KM Test Kapal 01',
        'imo_number' => 'IMO-9999901',
        'ship_type' => 'Cargo Ship',
        'status' => 'Labuh',
        'image' => '/storage/sja/vessels/km-test-kapal-01.webp',
        'eta' => now(),
        'port_id' => $port->id,
        'ship_company_id' => $company->id,
        'is_active' => true,
    ]);
    createVesselIndexVisit($ship, $port, $user);

    $response = $this->actingAs($user)->get(route('vessels.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Vessels/Index')
        ->has('vessels', 1)
        ->where('vessels.0.name', 'KM Test Kapal 01')
        ->where('vessels.0.image', '/storage/sja/vessels/km-test-kapal-01.webp')
        ->where('vessels.0.status', 'Akan Datang')
        ->has('companies')
        ->has('counts', fn (Assert $counts) => $counts
            ->has('semua')
            ->has('akan_datang')
            ->has('labuh')
            ->has('sandar')
            ->has('selesai')
        )
        ->has('activeStatus')
    );
});

test('each visit is listed separately while the vessel remains one master record', function () {
    $user = User::factory()->create();
    $company = ShipCompany::create([
        'name' => 'PT Dua Kunjungan',
        'code' => 'DKJ',
        'is_active' => true,
    ]);
    $port = Port::create([
        'name' => 'Pelabuhan Dua Kunjungan',
        'code' => 'PDK',
        'city' => 'Gresik',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'name' => 'KM Berulang',
        'imo_number' => 'IMO-REPEAT-01',
        'ship_company_id' => $company->id,
        'status' => 'Selesai',
        'is_active' => true,
    ]);
    $firstVisit = createVesselIndexVisit($ship, $port, $user, [
        'job_number' => 'JOB-REPEAT-001',
        'status' => 'completed',
        'eta_at' => now()->subMonth(),
    ]);
    $secondVisit = createVesselIndexVisit($ship, $port, $user, [
        'job_number' => 'JOB-REPEAT-002',
        'eta_at' => now()->addDay(),
    ]);

    $response = $this->actingAs($user)->get(route('vessels.index'));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Vessels/Index')
        ->has('vessels', 2)
        ->where('vessels.0.id', $ship->id)
        ->where('vessels.0.visit_id', $firstVisit->id)
        ->where('vessels.0.image', null)
        ->where('vessels.0.status', 'Selesai')
        ->where('vessels.1.id', $ship->id)
        ->where('vessels.1.visit_id', $secondVisit->id)
        ->where('vessels.1.image', null)
        ->where('vessels.1.status', 'Akan Datang')
        ->where('counts.semua', 2)
        ->where('counts.selesai', 1)
    );
});

test('master vessels shows one record with its visit count', function () {
    $user = User::factory()->create();
    $company = ShipCompany::create([
        'name' => 'PT Master Armada',
        'code' => 'MST',
        'is_active' => true,
    ]);
    $port = Port::create([
        'name' => 'Pelabuhan Master Armada',
        'code' => 'PMA',
        'city' => 'Gresik',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'name' => 'KM Master Tunggal',
        'imo_number' => 'IMO-MASTER-01',
        'ship_company_id' => $company->id,
        'is_active' => true,
    ]);
    createVesselIndexVisit($ship, $port, $user, ['job_number' => 'JOB-MASTER-001']);
    createVesselIndexVisit($ship, $port, $user, ['job_number' => 'JOB-MASTER-002']);

    $response = $this->actingAs($user)->get(route('master.vessels.index'));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Master/Vessels/Index')
        ->has('vessels', 1)
        ->where('vessels.0.id', $ship->id)
        ->where('vessels.0.name', 'KM Master Tunggal')
        ->where('vessels.0.port_calls_count', 2)
    );
});

test('completed visits remain available in operational reports', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']));
    $company = ShipCompany::create([
        'name' => 'PT Laporan Kunjungan',
        'code' => 'LPK',
        'is_active' => true,
    ]);
    $port = Port::create([
        'name' => 'Pelabuhan Laporan',
        'code' => 'PLP',
        'city' => 'Gresik',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'name' => 'KM Laporan Selesai',
        'imo_number' => 'IMO-REPORT-01',
        'ship_company_id' => $company->id,
        'status' => 'Selesai',
        'is_active' => true,
    ]);
    createVesselIndexVisit($ship, $port, $user, [
        'job_number' => 'JOB-REPORT-001',
        'status' => 'completed',
        'departed_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($user)->get(route('reports.index'));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/Index')
        ->has('portCalls', 1)
        ->where('portCalls.0.job_number', 'JOB-REPORT-001')
        ->where('portCalls.0.ship_name', 'KM Laporan Selesai')
        ->where('portCalls.0.status', 'completed')
    );
});

test('vessels index filters by status and search', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('vessels.index', [
        'status' => 'Labuh',
        'search' => 'Sarana',
    ]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Vessels/Index')
        ->where('activeStatus', 'Labuh')
        ->where('search', 'Sarana')
    );
});

test('authenticated user can view vessel show page with products from master', function () {
    $user = User::factory()->create();

    $company = ShipCompany::create([
        'name' => 'PT. Intan Borneo Wisesa Test',
        'code' => 'IBW',
        'address' => 'Jl. KH Kholil 18, Gresik',
        'is_active' => true,
    ]);

    $port = Port::firstOrCreate(
        ['name' => 'Pelabuhan Gresik'],
        ['code' => 'GRS', 'city' => 'Gresik', 'country' => 'Indonesia', 'is_active' => true]
    );

    $ship = Ship::create([
        'name' => 'KM Sarana Sukses',
        'imo_number' => 'IMO-9812345',
        'ship_type' => 'Cargo Ship',
        'status' => 'Labuh',
        'eta' => now(),
        'port_id' => $port->id,
        'ship_company_id' => $company->id,
        'gross_tonnage' => 1330,
        'length' => 74.22,
        'call_sign' => 'PMSM',
        'captain_name' => 'Sony Robinson',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->get(route('vessels.show', $ship->id));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Vessels/Show')
        ->has('vessel')
        ->has('products')
        ->where('vessel.name', 'KM Sarana Sukses')
    );
});
