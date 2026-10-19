<?php

use App\Models\Invoice;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\UploadedFile;
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
        ->where('vessels.0.total_hpp', 0)
        ->where('vessels.0.total_invoiced', 0)
        ->where('vessels.0.margin', 0)
        ->where('vessels.0.margin_available', false)
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
        ->where('vessels.0.visit_id', $secondVisit->id)
        ->where('vessels.0.image', null)
        ->where('vessels.0.status', 'Akan Datang')
        ->where('vessels.1.id', $ship->id)
        ->where('vessels.1.visit_id', $firstVisit->id)
        ->where('vessels.1.image', null)
        ->where('vessels.1.status', 'Selesai')
        ->where('counts.semua', 2)
        ->where('counts.selesai', 1)
    );
});

test('vessels index orders the latest visit first at the top', function () {
    $user = User::factory()->create();
    $company = ShipCompany::create(['name' => 'PT Order Test', 'is_active' => true]);
    $port = Port::create(['name' => 'Pelabuhan Order Test', 'code' => 'POT', 'city' => 'Gresik', 'is_active' => true]);
    $ship1 = Ship::create(['name' => 'KM Kapal Lama', 'ship_company_id' => $company->id, 'is_active' => true]);
    $ship2 = Ship::create(['name' => 'KM Kapal Baru', 'ship_company_id' => $company->id, 'is_active' => true]);

    $oldVisit = createVesselIndexVisit($ship1, $port, $user, [
        'job_number' => 'JOB-OLD-001',
        'created_at' => now()->subHours(2),
    ]);
    $newVisit = createVesselIndexVisit($ship2, $port, $user, [
        'job_number' => 'JOB-NEW-002',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($user)->get(route('vessels.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Vessels/Index')
        ->where('selectedSort', 'terbaru')
        ->where('vessels.0.visit_id', $newVisit->id)
        ->where('vessels.0.job_number', 'JOB-NEW-002')
        ->where('vessels.1.visit_id', $oldVisit->id)
        ->where('vessels.1.job_number', 'JOB-OLD-001')
    );
});

test('vessels index sorts visits on the server', function (string $sort, string $expectedFirstJob) {
    $user = User::factory()->create();
    $company = ShipCompany::create(['name' => 'PT Sort Kapal', 'is_active' => true]);
    $port = Port::create(['name' => 'Pelabuhan Sort Kapal', 'code' => 'PSK', 'city' => 'Gresik', 'is_active' => true]);
    $alphaShip = Ship::create(['name' => 'KM Alfa', 'ship_company_id' => $company->id, 'is_active' => true]);
    $zuluShip = Ship::create(['name' => 'KM Zulu', 'ship_company_id' => $company->id, 'is_active' => true]);

    createVesselIndexVisit($alphaShip, $port, $user, [
        'job_number' => 'JOB-ALFA',
        'eta_at' => now()->addDays(2),
    ]);
    createVesselIndexVisit($zuluShip, $port, $user, [
        'job_number' => 'JOB-ZULU',
        'eta_at' => now()->addDay(),
    ]);

    $response = $this->actingAs($user)->get(route('vessels.index', ['sort' => $sort]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Vessels/Index')
        ->where('selectedSort', $sort)
        ->where('vessels.0.job_number', $expectedFirstJob)
    );
})->with([
    'eta terdekat' => ['terdekat', 'JOB-ZULU'],
    'nama kapal' => ['nama', 'JOB-ALFA'],
]);

test('vessels index rejects an unsupported sort value', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->from(route('vessels.index'))
        ->get(route('vessels.index', ['sort' => 'acak']));

    $response->assertRedirect(route('vessels.index'));
    $response->assertSessionHasErrors('sort');
});

test('vessel list exposes hpp billing and margin for every visit', function () {
    $user = User::factory()->create();
    $company = ShipCompany::create(['name' => 'PT Margin Kapal', 'is_active' => true]);
    $port = Port::create(['name' => 'Pelabuhan Margin', 'code' => 'MRG', 'city' => 'Gresik', 'is_active' => true]);
    $ship = Ship::create([
        'name' => 'KM Margin Terlihat',
        'ship_company_id' => $company->id,
        'status' => 'Selesai',
        'is_active' => true,
    ]);
    $portCall = createVesselIndexVisit($ship, $port, $user, ['status' => 'completed']);
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-MARGIN-VESSEL-001',
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_call_id' => $portCall->id,
        'created_by' => $user->id,
        'status' => 'Disetujui',
        'request_date' => today(),
    ]);
    $shipRequest->items()->create([
        'item_name' => 'Biaya Kapal',
        'unit' => 'Paket',
        'quantity' => 2,
        'hpp_price' => 100000,
        'selling_price' => 0,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    Invoice::create([
        'invoice_number' => 'INV-MARGIN-VESSEL-001',
        'port_call_id' => $portCall->id,
        'company_id' => $company->id,
        'request_id' => $shipRequest->id,
        'invoice_type' => 'agency',
        'invoice_date' => today(),
        'due_date' => today()->addDays(14),
        'subtotal' => 500000,
        'grand_total' => 500000,
        'outstanding_amount' => 500000,
        'status' => 'released',
    ]);

    $this->actingAs($user)
        ->get(route('vessels.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Vessels/Index')
            ->where('vessels.0.total_hpp', 200000)
            ->where('vessels.0.total_invoiced', 500000)
            ->where('vessels.0.margin', 300000)
            ->where('vessels.0.margin_available', true));
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

    $response = $this->actingAs($user)->get(route('reports.index', [
        'search' => 'KM Laporan Selesai',
        'status' => 'completed',
    ]));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/Index')
        ->has('portCalls.data', 1)
        ->where('portCalls.data.0.job_number', 'JOB-REPORT-001')
        ->where('portCalls.data.0.ship_name', 'KM Laporan Selesai')
        ->where('portCalls.data.0.status', 'completed')
        ->where('filters.search', 'KM Laporan Selesai')
        ->where('filters.status', 'completed')
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
    $user->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

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
        ->where('canViewFinancials', true)
        ->where('canUpdateShip', true)
    );
});

test('staff operasional cannot view financials on vessel show page', function () {
    $company = ShipCompany::create([
        'code' => 'KSS',
        'name' => 'PT Pelayaran Sarana Sukses',
        'is_active' => true,
    ]);
    $port = Port::create([
        'name' => 'Pelabuhan Tanjung Priok',
        'code' => 'IDTPP',
        'city' => 'Jakarta',
        'is_active' => true,
    ]);
    $staffRole = Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']);
    $staffUser = User::factory()->create();
    $staffUser->assignRole($staffRole);

    $ship = Ship::create([
        'name' => 'KM Sarana Staff',
        'imo_number' => 'IMO-9812349',
        'ship_type' => 'Cargo Ship',
        'status' => 'Labuh',
        'eta' => now(),
        'port_id' => $port->id,
        'ship_company_id' => $company->id,
        'is_active' => true,
    ]);

    $response = $this->actingAs($staffUser)->get(route('vessels.show', $ship->id));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Vessels/Show')
        ->where('canViewFinancials', false)
    );
});

test('authorized users can upload and delete vessel photo', function () {
    Storage::fake('public');

    $company = ShipCompany::create([
        'code' => 'FTO',
        'name' => 'PT Armada Foto',
        'is_active' => true,
    ]);
    $port = Port::create([
        'name' => 'Pelabuhan Tanjung Perak',
        'code' => 'IDTPR',
        'city' => 'Surabaya',
        'is_active' => true,
    ]);
    $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $adminUser = User::factory()->create();
    $adminUser->assignRole($adminRole);

    $ship = Ship::create([
        'name' => 'KM Foto Test',
        'imo_number' => 'IMO-9812340',
        'ship_type' => 'Supply Vessel',
        'status' => 'Sandar',
        'port_id' => $port->id,
        'ship_company_id' => $company->id,
        'is_active' => true,
    ]);

    $photo = UploadedFile::fake()->image('kapal.jpg');

    $response = $this->actingAs($adminUser)->post(route('vessels.photo.update', $ship->id), [
        'image' => $photo,
    ]);

    $response->assertRedirect();
    $ship->refresh();
    expect($ship->image)->toStartWith('/storage/sja/vessels/');

    $delResponse = $this->actingAs($adminUser)->delete(route('vessels.photo.delete', $ship->id));
    $delResponse->assertRedirect();
    $ship->refresh();
    expect($ship->image)->toBeNull();
});
