<?php

use App\Models\Port;
use App\Models\PortCall;
use App\Models\Product;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('operational user can view request wizard creation page', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));

    $response = $this->actingAs($user)->get('/requests/create');

    $response->assertStatus(200);
});

test('lapangan user can submit wizard request with multiple items', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $port = Port::create([
        'code' => 'IDJKT',
        'name' => 'Pelabuhan Tanjung Priok',
        'city' => 'Jakarta Utara',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);

    $jasaProduct = Product::create([
        'code' => 'SRV-TEST-01',
        'name' => 'Jasa Keagenan Kapal',
        'category' => 'Jasa Keagenan',
        'item_type' => 'jasa',
        'unit' => 'Pkt',
        'hpp_default' => 5000000,
        'selling_price_default' => 8500000,
        'price_sandar' => 8500000,
        'price_labuh' => 6500000,
        'tax_rate' => 2.00,
        'is_active' => true,
    ]);

    $nonJasaProduct = Product::create([
        'code' => 'BRG-TEST-01',
        'name' => 'Air Tawar (Fresh Water)',
        'category' => 'Perbekalan',
        'item_type' => 'non_jasa',
        'unit' => 'Ton',
        'hpp_default' => 45000,
        'selling_price_default' => 60000,
        'price_sandar' => 60000,
        'price_labuh' => 75000,
        'tax_rate' => 0.00,
        'is_active' => true,
    ]);

    $postData = [
        'port_id' => $port->id,
        'service_type' => 'Sandar',
        'is_new_company' => true,
        'new_company_name' => 'PT Pelayaran Samudra Nusantara',
        'is_new_ship' => true,
        'new_ship_name' => 'TB Nusantara Glory 01',
        'new_ship_imo' => 'IMO9988771',
        'notes' => 'Pengajuan mendesak untuk bunkering dan clearance',
        'items' => [
            [
                'product_id' => $jasaProduct->id,
                'item_name' => 'Jasa Keagenan Kapal',
                'item_type' => 'jasa',
                'quantity' => 1,
                'unit' => 'Pkt',
                'required_date' => now()->addDay()->toDateString(),
                'required_time' => '09:00',
                'is_urgent' => true,
                'notes' => 'Harap proses clearance secepatnya',
            ],
            [
                'product_id' => $nonJasaProduct->id,
                'item_name' => 'Air Tawar (Fresh Water)',
                'item_type' => 'non_jasa',
                'quantity' => 50,
                'unit' => 'Ton',
                'required_date' => now()->addDay()->toDateString(),
                'required_time' => '10:00',
                'is_urgent' => false,
                'notes' => 'Dermaga 03 utara',
            ],
        ],
    ];

    $response = $this->actingAs($user)->post('/requests/wizard', $postData);

    $response->assertRedirect('/requests');

    $this->assertDatabaseHas('ship_companies', [
        'name' => 'PT Pelayaran Samudra Nusantara',
    ]);

    $this->assertDatabaseHas('ships', [
        'name' => 'TB Nusantara Glory 01',
    ]);

    $this->assertDatabaseHas('requests', [
        'service_type' => 'Sandar',
        'status' => 'Menunggu Approval',
    ]);

    $this->assertDatabaseHas('request_items', [
        'item_name' => 'Jasa Keagenan Kapal',
        'quantity' => 1,
        'is_urgent' => true,
    ]);

    $this->assertDatabaseHas('request_items', [
        'item_name' => 'Air Tawar (Fresh Water)',
        'quantity' => 50,
        'is_urgent' => false,
    ]);
});

test('admin can forward selected items to director and split invoices', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $director = User::factory()->create();
    $director->assignRole(Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']));
    $company = ShipCompany::create([
        'code' => 'MSA',
        'name' => 'PT Mitra Samudra Agency',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM Andalas Express',
        'imo_number' => 'IMO9123456',
        'status' => 'Sandar',
        'is_active' => true,
    ]);
    $port = Port::create([
        'code' => 'IDPLM',
        'name' => 'Pelabuhan Boom Baru Palembang',
        'city' => 'Palembang',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);

    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-TEST-001',
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'created_by' => $admin->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

    $itemJasa = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_name' => 'Jasa Keagenan & Clearance',
        'item_type' => 'jasa',
        'unit' => 'Pkt',
        'quantity' => 1,
        'selling_price' => 5000000,
        'hpp_price' => 3000000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);

    $itemReimburse = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_name' => 'BBM Solar Industri HSD',
        'item_type' => 'non_jasa',
        'unit' => 'Liter',
        'quantity' => 1000,
        'selling_price' => 15000000,
        'hpp_price' => 14000000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);

    // 1. Admin forwards to director
    $response = $this->actingAs($admin)->post("/requests/{$shipRequest->id}/forward-director", [
        'selected_items' => [$itemJasa->id, $itemReimburse->id],
        'item_prices' => [
            [
                'id' => $itemJasa->id,
                'selling_price' => 5500000,
                'hpp_price' => 3000000,
            ],
            [
                'id' => $itemReimburse->id,
                'selling_price' => 15500000,
                'hpp_price' => 14000000,
            ],
        ],
    ]);

    $response->assertRedirect();
    $shipRequest->refresh();
    expect($shipRequest->status)->toBe('Menunggu Approval Direktur');

    // 2. Direktur approves items
    $this->actingAs($director)->post("/approvals/items/{$itemJasa->id}", [
        'decision' => 'approved',
        'notes' => 'Disetujui untuk diproses',
    ]);
    $this->actingAs($director)->post("/approvals/items/{$itemReimburse->id}", [
        'decision' => 'approved',
        'notes' => 'Disetujui untuk dipesan ke vendor',
    ]);

    $itemJasa->refresh();
    $itemReimburse->refresh();
    expect($itemJasa->director_status)->toBe('approved');
    expect($itemReimburse->director_status)->toBe('approved');

    // 3. Admin splits invoices into Keagenan and Reimburse
    $splitResponse = $this->actingAs($admin)->post("/requests/{$shipRequest->id}/split-invoices", [
        'invoice_type' => 'both',
        'materai' => 10000,
    ]);

    $splitResponse->assertRedirect();

    $this->assertDatabaseHas('invoices', [
        'company_id' => $company->id,
        'invoice_type' => 'agency',
    ]);

    $this->assertDatabaseHas('invoices', [
        'company_id' => $company->id,
        'invoice_type' => 'reimburse',
    ]);
});

test('user can append additional need items to an existing active request', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $ship = Ship::create([
        'name' => 'KM Glory 88',
        'imo_number' => 'IMO8877665',
        'status' => 'Sandar',
        'is_active' => true,
    ]);

    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-TEST-SUSULAN',
        'ship_id' => $ship->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($user)->post("/requests/{$shipRequest->id}/items", [
        'item_name' => 'Emergency Mooring Boat Support',
        'quantity' => 2,
        'unit' => 'Unit',
        'notes' => 'Permintaan susulan dari Nahkoda saat kapal bersiap lepas tali dermaga',
        'is_urgent' => true,
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('request_items', [
        'request_id' => $shipRequest->id,
        'item_name' => 'Emergency Mooring Boat Support',
        'quantity' => 2,
        'is_urgent' => true,
    ]);
});

test('lapangan user can submit multi kapal request and view filtered tabs', function () {
    Role::firstOrCreate(['name' => 'Lapangan']);
    $user = User::factory()->create(['name' => 'Prima Lapangan', 'email' => 'prima.multi@sja.co.id']);
    $user->assignRole('Lapangan');

    $company = ShipCompany::create([
        'code' => 'SJA',
        'name' => 'PT Samudra Jaya Andalas',
        'is_active' => true,
    ]);

    $ship1 = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM CLARITY 08',
        'imo_number' => 'IMO9900111',
        'status' => 'Sandar',
        'is_active' => true,
    ]);

    $ship2 = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM SARANA LINTAS NUSANTARA',
        'imo_number' => 'IMO9900222',
        'status' => 'Sandar',
        'is_active' => true,
    ]);

    $port = Port::firstOrCreate(
        ['code' => 'TJP'],
        ['name' => 'Pelabuhan Tanjung Perak', 'city' => 'Surabaya', 'country' => 'Indonesia', 'is_active' => true]
    );

    $visit1 = PortCall::create([
        'job_number' => 'JOB-REQUEST-MULTI-001',
        'ship_id' => $ship1->id,
        'port_id' => $port->id,
        'status' => 'scheduled',
        'eta_at' => '2026-09-18 08:00:00',
    ]);

    $visit2 = PortCall::create([
        'job_number' => 'JOB-REQUEST-MULTI-002',
        'ship_id' => $ship2->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'eta_at' => '2026-09-18 09:00:00',
    ]);

    $multiPayload = [
        'ships' => [
            [
                'ship_id' => $ship1->id,
                'port_call_id' => $visit1->id,
                'request_type' => 'Kedatangan (Clearance In)',
                'department' => 'Deck',
                'requester_name' => 'Budi Santoso',
                'requester_phone' => '0812 3456 7890',
                'required_date' => '2026-09-18',
                'required_time' => '10:00',
                'requested_port_call_status' => 'berthed',
                'operational_occurred_at' => '2026-09-18',
                'items' => [
                    [
                        'item_name' => 'Air Tawar',
                        'quantity' => 60,
                        'unit' => 'Ton',
                        'notes' => 'Untuk kebutuhan operasional kapal',
                    ],
                ],
            ],
            [
                'ship_id' => $ship2->id,
                'port_call_id' => $visit2->id,
                'request_type' => 'Perpanjangan Surat / Endors Surat Laut',
                'department' => 'Deck',
                'requester_name' => 'Budi Santoso',
                'requester_phone' => '0812 3456 7890',
                'required_date' => '2026-09-18',
                'required_time' => '10:00',
                'items' => [],
            ],
        ],
        'notes' => 'Mohon diproses sesuai prioritas kapal yang akan sandar.',
    ];

    $response = $this->actingAs($user)->post(route('requests.store-multi'), $multiPayload);
    $response->assertRedirect(route('requests.index'));

    $this->assertDatabaseHas('requests', [
        'ship_id' => $ship1->id,
        'port_call_id' => $visit1->id,
        'service_type' => 'clearance_in',
        'requested_port_call_status' => 'berthed',
        'status' => 'Menunggu Approval',
    ]);

    $this->assertDatabaseHas('requests', [
        'ship_id' => $ship2->id,
        'port_call_id' => $visit2->id,
        'service_type' => 'Perpanjangan Surat / Endors Surat Laut',
        'status' => 'Menunggu Approval',
    ]);

    $this->assertDatabaseHas('request_items', [
        'item_name' => 'Air Tawar',
        'quantity' => 60,
        'unit' => 'Ton',
    ]);

    // Test tabs on index
    $indexResponse = $this->actingAs($user)->get(route('requests.index', ['tab' => 'menunggu']));
    $indexResponse->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Requests/Index')
            ->has('counts.semua')
            ->has('counts.menunggu')
            ->has('counts.diproses')
            ->has('counts.selesai')
        );
});

test('request pages keep separate jobs for the same vessel', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));

    $company = ShipCompany::create([
        'code' => 'DUP',
        'name' => 'PT Dua Kunjungan',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM Kunjungan Ganda',
        'imo_number' => 'IMO7000123',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $port = Port::create([
        'code' => 'IDDUA',
        'name' => 'Pelabuhan Dua Job',
        'city' => 'Gresik',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);
    $firstVisit = PortCall::create([
        'job_number' => 'JOB-SAME-SHIP-001',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'anchored',
        'eta_at' => '2026-10-07 08:00:00',
    ]);
    $secondVisit = PortCall::create([
        'job_number' => 'JOB-SAME-SHIP-002',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'scheduled',
        'eta_at' => '2026-10-08 08:00:00',
    ]);

    ShipRequest::create([
        'request_number' => 'REQ-SAME-SHIP-001',
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'port_call_id' => $firstVisit->id,
        'service_type' => 'Kebutuhan Kapal',
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => '2026-10-07',
    ]);

    $this->actingAs($user)
        ->get(route('requests.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Requests/Index')
            ->has('portCalls', 2)
            ->has('requests', 1)
            ->where('counts.semua', 2)
        );

    $this->actingAs($user)
        ->get(route('requests.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Requests/Create')
            ->has('portCalls', 2)
            ->where('portCalls.0.id', $secondVisit->id)
            ->where('portCalls.1.id', $firstVisit->id)
        );

    $this->actingAs($user)
        ->post(route('requests.store-multi'), [
            'ships' => [[
                'ship_id' => $ship->id,
                'port_call_id' => $secondVisit->id,
                'request_type' => 'Kebutuhan Kapal',
                'department' => 'Deck',
                'required_date' => '2026-10-08',
                'required_time' => '10:00',
                'items' => [[
                    'item_name' => 'Air Tawar',
                    'quantity' => 10,
                    'unit' => 'Ton',
                ]],
            ]],
        ])
        ->assertRedirect(route('requests.index'));

    $this->assertDatabaseHas('requests', [
        'ship_id' => $ship->id,
        'port_call_id' => $secondVisit->id,
        'service_type' => 'Kebutuhan Kapal',
    ]);
});

test('request wizard disables duplicate clearance in and omits completed visits', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $company = ShipCompany::create([
        'code' => 'CLR-WIZ',
        'name' => 'PT Clearance Wizard',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM Clearance Wizard',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $port = Port::create([
        'code' => 'CLRW',
        'name' => 'Pelabuhan Clearance Wizard',
        'city' => 'Gresik',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);
    $availableVisit = PortCall::create([
        'job_number' => 'JOB-CLEARANCE-AVAILABLE',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'scheduled',
        'eta_at' => today()->addDay(),
    ]);
    $pendingVisit = PortCall::create([
        'job_number' => 'JOB-CLEARANCE-PENDING',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'scheduled',
        'eta_at' => today()->addDays(2),
    ]);
    PortCall::create([
        'job_number' => 'JOB-CLEARANCE-COMPLETED',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'completed',
        'eta_at' => today()->addDays(3),
        'departed_at' => today(),
    ]);
    ShipRequest::create([
        'request_number' => 'REQ-CIN-WIZARD-PENDING',
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'port_call_id' => $pendingVisit->id,
        'service_type' => 'clearance_in',
        'requested_port_call_status' => 'anchored',
        'operational_occurred_at' => today(),
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => today(),
    ]);

    $this->actingAs($user)
        ->get(route('requests.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Requests/Create')
            ->has('portCalls', 2)
            ->where('portCalls.0.id', $pendingVisit->id)
            ->where('portCalls.0.clearance_in_block_reason', 'Pengajuan Clearance In untuk kunjungan ini sudah ada dan masih diproses.')
            ->where('portCalls.1.id', $availableVisit->id)
            ->where('portCalls.1.clearance_in_block_reason', null)
        );

    $this->actingAs($user)
        ->from(route('requests.create'))
        ->post(route('requests.store-multi'), [
            'ships' => [[
                'ship_id' => $ship->id,
                'port_call_id' => $pendingVisit->id,
                'request_type' => 'Kedatangan (Clearance In)',
                'requested_port_call_status' => 'anchored',
                'operational_occurred_at' => today()->toDateString(),
                'required_date' => today()->toDateString(),
                'items' => [],
            ]],
        ])
        ->assertRedirect(route('requests.create'))
        ->assertSessionHasErrors('ships.0.request_type');

    expect(ShipRequest::query()
        ->where('port_call_id', $pendingVisit->id)
        ->where('service_type', 'clearance_in')
        ->count())->toBe(1);
});
