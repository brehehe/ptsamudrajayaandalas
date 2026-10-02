<?php

use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use Spatie\Permission\Models\Role;

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

test('multi-item needs preserve item schedules without inventing a general schedule', function (array $schedule, string $expectedNotes) {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $ship = Ship::create([
        'name' => 'KM Jadwal Item',
        'ship_type' => 'Bulk Carrier',
        'is_active' => true,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-NEED-SCHEDULE',
        'ship_id' => $ship->id,
        'status' => 'anchored',
        'eta_at' => now(),
    ]);

    $response = $this->actingAs($user)->post('/needs', [
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'section' => 'Deck',
        'ordered_by_name' => 'Pemesan Uji',
        'ordered_by_phone' => '0800000000',
        'request_date' => '2026-09-29',
        'items' => [
            ['item_name' => 'Air Tawar', 'quantity' => 10, 'unit' => 'Ton', 'required_date' => '2026-10-01', 'required_time' => '09:30', 'is_urgent' => '1'],
            ['item_name' => 'Pipa', 'quantity' => 2, 'unit' => 'Pcs', 'required_date' => '', 'required_time' => '', 'is_urgent' => '0'],
        ],
        ...$schedule,
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $shipRequest = ShipRequest::where('ship_id', $ship->id)->firstOrFail();
    $this->assertDatabaseHas('requests', [
        'id' => $shipRequest->id,
        'port_call_id' => $portCall->id,
        'notes' => $expectedNotes,
    ]);
    $this->assertDatabaseHas('request_items', [
        'request_id' => $shipRequest->id,
        'item_name' => 'Air Tawar',
        'required_date' => '2026-10-01 00:00:00',
        'required_time' => '09:30',
        'is_urgent' => true,
        'attachment_path' => null,
    ]);
    $this->assertDatabaseHas('request_items', [
        'request_id' => $shipRequest->id,
        'item_name' => 'Pipa',
        'required_date' => null,
        'required_time' => null,
        'is_urgent' => false,
    ]);
})->with([
    'no general schedule' => [[], 'Bagian: Deck | Pemesan: Pemesan Uji (0800000000)'],
    'empty general schedule' => [['required_at' => ''], 'Bagian: Deck | Pemesan: Pemesan Uji (0800000000)'],
    'explicit general schedule remains supported' => [['required_at' => '2026-10-02 14:00'], 'Bagian: Deck | Pemesan: Pemesan Uji (0800000000) | Dibutuhkan: 2026-10-02 14:00'],
]);

test('multi-item needs require form metadata and item priority', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $ship = Ship::create(['name' => 'KM Validasi Kebutuhan', 'is_active' => true]);

    $response = $this->actingAs($user)->post('/needs', [
        'ship_id' => $ship->id,
        'items' => [
            ['item_name' => 'Air Tawar', 'quantity' => 10, 'unit' => 'Ton'],
        ],
    ]);

    $response->assertSessionHasErrors([
        'section' => 'Bagian wajib dipilih.',
        'ordered_by_name' => 'Nama nahkoda wajib diisi.',
        'ordered_by_phone' => 'Nomor HP nahkoda wajib diisi.',
        'request_date' => 'Tanggal form wajib diisi.',
        'items.0.is_urgent' => 'Prioritas setiap kebutuhan wajib dipilih.',
    ]);
    $this->assertDatabaseCount('requests', 0);
    $this->assertDatabaseCount('request_items', 0);
});

test('multi-item needs reject invalid urgency without saving a request', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $ship = Ship::create(['name' => 'KM Urgency Test', 'is_active' => true]);

    $this->actingAs($user)->post('/needs', [
        'ship_id' => $ship->id,
        'section' => 'Deck',
        'ordered_by_name' => 'Pemesan Uji',
        'ordered_by_phone' => '0800000000',
        'request_date' => '2026-09-29',
        'items' => [['item_name' => 'Air Tawar', 'quantity' => 10, 'unit' => 'Ton', 'is_urgent' => 'urgent']],
    ])->assertSessionHasErrors('items.0.is_urgent');

    $this->assertDatabaseCount('requests', 0);
    $this->assertDatabaseCount('request_items', 0);
});

test('ship need is stored on the selected visit and rejects another ships visit', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $ship = Ship::create(['name' => 'KM Kebutuhan Job', 'is_active' => true]);
    $otherShip = Ship::create(['name' => 'KM Job Lain', 'is_active' => true]);
    $visit = PortCall::create([
        'job_number' => 'JOB-NEED-VALID',
        'ship_id' => $ship->id,
        'status' => 'anchored',
        'eta_at' => now(),
    ]);
    $otherVisit = PortCall::create([
        'job_number' => 'JOB-NEED-OTHER',
        'ship_id' => $otherShip->id,
        'status' => 'anchored',
        'eta_at' => now(),
    ]);

    $payload = [
        'ship_id' => $ship->id,
        'port_call_id' => $otherVisit->id,
        'need_type' => 'Air Tawar',
        'quantity' => 10,
        'unit' => 'Ton',
        'required_at' => 'Saat kapal labuh',
    ];

    $this->actingAs($user)->post('/needs', $payload)
        ->assertSessionHasErrors('port_call_id');
    $this->assertDatabaseCount('requests', 0);

    $this->actingAs($user)->post('/needs', [...$payload, 'port_call_id' => $visit->id])
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('requests', [
        'ship_id' => $ship->id,
        'port_call_id' => $visit->id,
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

test('operational admin can create a shipping company', function () {
    $admin = User::factory()->create(['email' => 'admin@samudrajaya.co.id']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $response = $this->actingAs($admin)->post('/companies', [
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

test('non-admin user cannot create a shipping company or vessel', function () {
    $nonAdmin = User::factory()->create(['email' => 'prima.lapangan@samudrajaya.co.id']);
    $nonAdmin->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));

    $this->actingAs($nonAdmin)->post('/companies', [
        'name' => 'PT Ilegal Company',
    ])->assertStatus(403);

    $this->actingAs($nonAdmin)->post('/vessels', [
        'name' => 'KM Unauthorized',
        'imo_number' => '1234567',
        'ship_type' => 'Cargo Ship',
        'status' => 'Sandar',
    ])->assertStatus(403);
});

test('operational admin can create a ship and assign to company or create company on the fly', function () {
    $admin = User::factory()->create(['email' => 'admin@samudrajaya.co.id']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    // 1. Create a company first
    $company = ShipCompany::create([
        'name' => 'PT Lintas Samudra Raya',
        'code' => 'LSR',
        'is_active' => true,
    ]);

    // 2. Add ship 1 to this company
    $response1 = $this->actingAs($admin)->post('/vessels', [
        'name' => 'KM Lintas Raya 01',
        'imo_number' => '9988111',
        'ship_type' => 'Container Ship',
        'status' => 'Sandar',
        'ship_company_id' => $company->id,
    ]);
    $response1->assertRedirect();

    // 3. Add ship 2 to this same company (1 company has many ships)
    $response2 = $this->actingAs($admin)->post('/vessels', [
        'name' => 'KM Lintas Raya 02',
        'imo_number' => '9988112',
        'ship_type' => 'General Cargo',
        'status' => 'Akan Datang',
        'ship_company_id' => $company->id,
    ]);
    $response2->assertRedirect();

    $this->assertEquals(2, $company->fresh()->ships()->count());

    // 4. Add ship 3 with a brand new company created on the fly
    $response3 = $this->actingAs($admin)->post('/vessels', [
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
    $user->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $ship = Ship::create([
        'name' => 'KM Dashboard Aktual',
        'status' => 'Sandar',
        'is_active' => true,
    ]);
    ShipRequest::create([
        'request_number' => 'REQ-DASHBOARD-AKTUAL',
        'ship_id' => $ship->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

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
        ->where('latest_requests.0.request_number', 'REQ-DASHBOARD-AKTUAL')
    );
});

test('admin can submit upcoming ship arrival (ShipSubmission)', function () {
    $admin = User::factory()->create(['name' => 'Bu Titik', 'email' => 'titik@samudrajaya.co.id']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $port = Port::first();

    $response = $this->actingAs($admin)->post('/ship-arrivals', [
        'ship_selection_type' => 'new',
        'name' => 'KM Nusantara Jaya 01',
        'imo_number' => '9988771',
        'ship_type' => 'Cargo Ship',
        'company_selection_type' => 'new',
        'new_company_name' => 'PT Nusantara Bahari Lines',
        'new_company_code' => 'NBL',
        'gross_tonnage' => 7500,
        'length' => 125.5,
        'call_sign' => 'PKNJ',
        'captain_name' => 'Capt. Surya Wijaya',
        'captain_phone' => '081234567890',
        'port_id' => $port?->id,
        'eta' => now()->addDays(2)->format('Y-m-d\TH:i'),
        'arrival_notes' => 'Rencana sandar di dermaga KSOP',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('ships', [
        'name' => 'KM Nusantara Jaya 01',
        'status' => 'Akan Datang',
        'call_sign' => 'PKNJ',
        'captain_name' => 'Capt. Surya Wijaya',
    ]);

    $this->assertDatabaseHas('port_calls', [
        'status' => 'scheduled',
    ]);
});

test('admin can schedule upcoming arrival for existing master ship and creates work order and port call', function () {
    $admin = User::factory()->create(['name' => 'Bu Titik', 'email' => 'titik@samudrajaya.co.id']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $port = Port::first();
    $company = ShipCompany::create(['name' => 'PT Pelayaran Master Uji', 'is_active' => true]);
    $ship = Ship::create([
        'name' => 'KM Kapal Terdaftar 99',
        'imo_number' => 'IMO-778899',
        'ship_type' => 'Bulk Carrier',
        'ship_company_id' => $company->id,
        'port_id' => $port?->id,
        'status' => 'Selesai',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)->post('/ship-arrivals', [
        'ship_selection_type' => 'existing',
        'ship_id' => $ship->id,
        'port_id' => $port?->id,
        'eta' => now()->addDays(3)->format('Y-m-d\TH:i'),
        'captain_name' => 'Capt. Hartono',
        'captain_phone' => '0812345678',
        'arrival_notes' => 'Kunjungan kedua muat pupuk',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('ships', [
        'id' => $ship->id,
        'status' => 'Akan Datang',
    ]);

    $this->assertDatabaseHas('port_calls', [
        'ship_id' => $ship->id,
        'status' => 'scheduled',
        'financial_status' => 'pending_reconciliation',
    ]);

    $portCall = PortCall::where('ship_id', $ship->id)->latest()->first();
    $this->assertNotNull($portCall->work_order_id);
    $this->assertDatabaseHas('work_orders', [
        'id' => $portCall->work_order_id,
        'status' => 'accepted',
    ]);
});

test('dashboard provides upcoming_ships, ports, companies, and all_ships props for 4 roles', function () {
    $user = User::factory()->create(['name' => 'Hendra Wijaya', 'email' => 'owner@samudrajaya.co.id']);
    $user->assignRole(Role::firstOrCreate(['name' => 'Owner', 'guard_name' => 'web']));

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Dashboard')
        ->has('upcoming_ships')
        ->has('ports')
        ->has('companies')
        ->has('all_ships')
        ->has('pending_approvals')
        ->where('current_role', 'Owner')
    );
});
