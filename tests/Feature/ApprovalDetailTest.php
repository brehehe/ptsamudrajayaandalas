<?php

use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\Vendor;
use App\Notifications\WorkflowActionNotification;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('guests must sign in before viewing an approval detail', function () {
    $user = User::factory()->create();
    $ship = Ship::create([
        'name' => 'KM Approval Guest',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-APP-GUEST',
        'ship_id' => $ship->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);

    $this->get(route('approvals.detail', $shipRequest))
        ->assertRedirect(route('login'));
});

test('authenticated users can view approval detail with hpp budgeting focus', function () {
    $role = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $director = User::factory()->create();
    $director->assignRole($role);

    $ship = Ship::create([
        'name' => 'MV Samudra Jaya',
        'imo_number' => 'IMO9988776',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-SPK-SJA-261005-N29SQJ',
        'ship_id' => $ship->id,
        'status' => 'Akan Datang',
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-SJA-2026-001',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $director->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
        'notes' => 'Pengajuan kebutuhan bunker dan air tawar.',
    ]);

    RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'non_jasa',
        'item_name' => 'Air Tawar 50 Ton',
        'unit' => 'Ton',
        'quantity' => 50,
        'hpp_price' => 75000,
        'selling_price' => 120000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Sertifikat Bebas Karantina',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 1500000,
        'selling_price' => 2500000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);

    $response = $this->actingAs($director)->get('/approvals/JOB-SPK-SJA-261005-N29SQJ/detail');
    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->has('requests', 1)
        ->where('requests.0.request_number', 'REQ-SJA-2026-001')
        ->where('summary.total_hpp_pending', 3750000)
        ->where('summary.total_hpp_approved', 1500000)
        ->where('summary.pending_items_count', 1)
        ->where('summary.approved_items_count', 1)
        ->where('capabilities.can_decide_items', true)
        ->where('capabilities.can_view_hpp', true)
        ->where('capabilities.is_director', true));
});

test('approval detail lists the newest request first', function () {
    $role = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $director = User::factory()->create();
    $director->assignRole($role);

    $ship = Ship::create([
        'name' => 'KM Urutan Approval',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-ORDER-APPROVALS',
        'ship_id' => $ship->id,
        'status' => 'Akan Datang',
    ]);

    $this->travelTo('2026-10-08 08:00:00');
    $olderRequest = ShipRequest::create([
        'request_number' => 'REQ-APPROVAL-OLDER',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $director->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => '2026-10-08',
    ]);

    $this->travelTo('2026-10-08 09:00:00');
    $newestRequest = ShipRequest::create([
        'request_number' => 'REQ-APPROVAL-NEWEST',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $director->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => '2026-10-08',
    ]);
    $this->travelBack();

    $response = $this->actingAs($director)->get('/approvals/JOB-ORDER-APPROVALS/detail');

    $response->assertInertia(fn (Assert $page) => $page
        ->has('requests', 2)
        ->where('requests.0.id', $newestRequest->id)
        ->where('requests.1.id', $olderRequest->id)
        ->where('request.id', $newestRequest->id));
});

test('director can reject specific item with reason resulting in partial approval status', function () {
    $role = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $director = User::factory()->create();
    $director->assignRole($role);

    $ship = Ship::create([
        'name' => 'KM Rejection Test',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-REJECT-001',
        'ship_id' => $ship->id,
        'created_by' => $director->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);

    $item1 = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'non_jasa',
        'item_name' => 'BBM Solar 2000 Liter',
        'unit' => 'Liter',
        'quantity' => 2000,
        'hpp_price' => 14000,
        'selling_price' => 17000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    $item2 = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'non_jasa',
        'item_name' => 'Pelumas Mesin 10 Drum',
        'unit' => 'Drum',
        'quantity' => 10,
        'hpp_price' => 2500000,
        'selling_price' => 3200000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    $response = $this->actingAs($director)->post("/approvals/requests/{$shipRequest->id}/item-decision", [
        'decisions' => [
            [
                'item_id' => $item1->id,
                'status' => 'approved',
                'director_notes' => 'Disetujui untuk operasional mendesak.',
            ],
            [
                'item_id' => $item2->id,
                'status' => 'rejected',
                'director_notes' => 'Harga vendor pelumas terlalu tinggi, gunakan stok depo utama.',
            ],
        ],
    ]);

    $response->assertSessionHas('success');

    $item1->refresh();
    $item2->refresh();
    $shipRequest->refresh();

    expect($item1->director_status)->toBe('approved');
    expect($item1->status)->toBe('disetujui');

    expect($item2->director_status)->toBe('rejected');
    expect($item2->status)->toBe('ditolak');
    expect($item2->director_notes)->toBe('Harga vendor pelumas terlalu tinggi, gunakan stok depo utama.');

    expect($shipRequest->status)->toBe('Disetujui Sebagian');
});

test('director can view approvals index with job group presentation', function () {
    $role = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $director = User::factory()->create();
    $director->assignRole($role);

    $response = $this->actingAs($director)->get('/approvals');
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Approvals/Index')
        ->has('requests')
        ->has('payments')
        ->has('counts')
        ->where('capabilities.can_decide_items', true)
        ->where('capabilities.is_director', true));
});

test('director can approve 3 items and reject 1 item one by one, and admin can re-forward rejected item until all approved', function () {
    $directorRole = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);

    $director = User::factory()->create();
    $director->assignRole($directorRole);

    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    $ship = Ship::create([
        'name' => 'TB Samudra Jaya 08',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);

    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-4ITEMS-FLOW-001',
        'ship_id' => $ship->id,
        'created_by' => $admin->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);

    $items = [];
    for ($i = 1; $i <= 4; $i++) {
        $items[$i] = RequestItem::create([
            'request_id' => $shipRequest->id,
            'item_type' => 'non_jasa',
            'item_name' => "Kebutuhan Kapal Item {$i}",
            'unit' => 'Unit',
            'quantity' => 1,
            'hpp_price' => 100000 * $i,
            'selling_price' => 150000 * $i,
            'status' => 'diajukan_ke_direktur',
            'director_status' => 'pending',
        ]);
    }

    // Step 1: Director approves items 1, 2, 3 one-by-one via singleItemDecision
    for ($i = 1; $i <= 3; $i++) {
        $resp = $this->actingAs($director)->post(route('approvals.items.decision', $items[$i]->id), [
            'decision' => 'approved',
            'notes' => "ACC Item {$i}",
        ]);
        $resp->assertSessionHas('success');
    }

    // Step 2: Director rejects item 4 one-by-one via singleItemDecision
    $resp4 = $this->actingAs($director)->post(route('approvals.items.decision', $items[4]->id), [
        'decision' => 'rejected',
        'notes' => 'Harga HPP Rp 400.000 terlalu mahal, cari vendor alternatif.',
    ]);
    $resp4->assertSessionHas('success');

    // Verify database state after Director decision:
    $items[1]->refresh();
    $items[2]->refresh();
    $items[3]->refresh();
    $items[4]->refresh();
    $shipRequest->refresh();

    expect($items[1]->director_status)->toBe('approved')
        ->and($items[2]->director_status)->toBe('approved')
        ->and($items[3]->director_status)->toBe('approved')
        ->and($items[4]->director_status)->toBe('rejected')
        ->and($items[4]->status)->toBe('ditolak')
        ->and($items[4]->director_notes)->toBe('Harga HPP Rp 400.000 terlalu mahal, cari vendor alternatif.')
        ->and($shipRequest->status)->toBe('Disetujui Sebagian');

    // Step 3: Admin reviews the rejected item, adjusts price, and re-forwards item 4 to Director
    $vendor = Vendor::create(['code' => 'VD-RESUBMIT', 'name' => 'PT Vendor Pengajuan Ulang', 'is_active' => true]);
    $items[4]->update([
        'vendor_id' => $vendor->id,
        'supplier_invoice_number' => 'INV-RESUBMIT-004',
        'supplier_invoice_date' => now()->toDateString(),
        'supplier_invoice_received_date' => now()->toDateString(),
        'supplier_invoice_path' => 'tests/inv-resubmit-004.pdf',
        'supplier_invoice_uploaded_by' => $admin->id,
    ]);
    $adminReSubmitResp = $this->actingAs($admin)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$items[4]->id],
        'item_prices' => [
            [
                'id' => $items[4]->id,
                'hpp_price' => 320000,
                'selling_price' => 450000,
            ],
        ],
        'admin_notes' => 'Sudah dinegosiasikan dengan vendor baru, HPP turun menjadi Rp 320.000.',
    ]);
    $adminReSubmitResp->assertSessionHas('success');

    $items[1]->refresh();
    $items[4]->refresh();
    $shipRequest->refresh();

    // Items 1, 2, 3 remain approved; item 4 is back to awaiting director; request is Menunggu Approval Direktur
    expect($items[1]->director_status)->toBe('approved')
        ->and($items[4]->status)->toBe('diajukan_ke_direktur')
        ->and($items[4]->director_status)->toBe('pending')
        ->and((float) $items[4]->hpp_price)->toBe(320000.0)
        ->and($shipRequest->admin_forward_notes)->toBe('Sudah dinegosiasikan dengan vendor baru, HPP turun menjadi Rp 320.000.')
        ->and($shipRequest->status)->toBe('Menunggu Approval Direktur');

    // Step 4: Director reviews again and approves the re-submitted item 4
    $finalResp = $this->actingAs($director)->post(route('approvals.items.decision', $items[4]->id), [
        'decision' => 'approved',
        'notes' => 'ACC, harga vendor baru sesuai anggaran.',
    ]);
    $finalResp->assertSessionHas('success');

    $items[4]->refresh();
    $shipRequest->refresh();

    // In the end, all items are approved and request status is Disetujui!
    expect($items[4]->director_status)->toBe('approved')
        ->and($items[4]->status)->toBe('disetujui')
        ->and($shipRequest->status)->toBe('Disetujui');
});

test('director batch decision returns unselected items and sends one consolidated admin notification', function () {
    Notification::fake();

    $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $directorRole = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $administrator = User::factory()->create();
    $administrator->assignRole($adminRole);
    $director = User::factory()->create();
    $director->assignRole($directorRole);

    $ship = Ship::create([
        'name' => 'KM Approval Gabungan',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-SPK-SJA-APPROVAL-BATCH',
        'ship_id' => $ship->id,
        'status' => 'Akan Datang',
    ]);
    $approvedRequest = ShipRequest::create([
        'request_number' => 'REQ-APPROVAL-BATCH-001',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $administrator->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);
    $returnedRequest = ShipRequest::create([
        'request_number' => 'REQ-APPROVAL-BATCH-002',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $administrator->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);
    $approvedItem = RequestItem::create([
        'request_id' => $approvedRequest->id,
        'item_type' => 'non_jasa',
        'item_name' => 'Air Tawar',
        'unit' => 'Ton',
        'quantity' => 10,
        'hpp_price' => 75000,
        'selling_price' => 100000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);
    $returnedItem = RequestItem::create([
        'request_id' => $returnedRequest->id,
        'item_type' => 'non_jasa',
        'item_name' => 'Pelumas Mesin',
        'unit' => 'Drum',
        'quantity' => 2,
        'hpp_price' => 1000000,
        'selling_price' => 1250000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    $response = $this->actingAs($director)->post(route('approvals.requests.batch-item-decision'), [
        'decisions' => [
            [
                'item_id' => $approvedItem->id,
                'status' => 'approved',
            ],
            [
                'item_id' => $returnedItem->id,
                'status' => 'pending',
            ],
        ],
    ]);

    $response->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', fn (string $message): bool => str_contains($message, '1 item yang tidak dipilih dikembalikan ke Admin'));
    expect($approvedItem->fresh()->status)->toBe('disetujui')
        ->and($approvedItem->fresh()->director_status)->toBe('approved')
        ->and($returnedItem->fresh()->status)->toBe('pending')
        ->and($returnedItem->fresh()->director_status)->toBe('pending')
        ->and($returnedItem->fresh()->director_notes)->toBe('Belum diputuskan Direktur. Silakan ajukan ulang setelah ditinjau Admin.')
        ->and($approvedRequest->fresh()->status)->toBe('Disetujui')
        ->and($returnedRequest->fresh()->status)->toBe('Menunggu Approval');

    Notification::assertSentToTimes($administrator, WorkflowActionNotification::class, 1);
    Notification::assertSentTo(
        $administrator,
        WorkflowActionNotification::class,
        function (WorkflowActionNotification $notification) use ($approvedRequest, $returnedRequest): bool {
            $entityIds = collect($notification->payload['entity_ids'] ?? [])->sort()->values()->all();
            $expectedEntityIds = collect([$approvedRequest->id, $returnedRequest->id])->sort()->values()->all();

            return $notification->payload['entity_type'] === 'ship_request_batch'
                && $notification->payload['job_number'] === 'JOB-SPK-SJA-APPROVAL-BATCH'
                && $entityIds === $expectedEntityIds
                && str_contains($notification->payload['message'], '1 item disetujui')
                && str_contains($notification->payload['message'], '1 item dikembalikan ke Admin');
        },
    );
});

test('approval detail resolves by item name url and exposes surplus allocation props', function () {
    $director = User::factory()->create();
    $director->assignRole(Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']));

    $ship = Ship::create([
        'name' => 'KM Samudra Sejahtera',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-SJA-SURPLUS-TEST',
        'ship_id' => $ship->id,
        'created_by' => $director->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);

    $sourceItem = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Item Sumber Sisa Biaya',
        'unit' => 'Kegiatan',
        'quantity' => 1,
        'hpp_price' => 1000000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);

    $targetItem = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Pengurusan izin labuh tambat pelabuhan',
        'unit' => 'Kegiatan',
        'quantity' => 1,
        'hpp_price' => 2000000,
        'original_hpp_price' => 2500000,
        'surplus_amount' => 500000,
        'surplus_source_item_id' => $sourceItem->id,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    $response = $this->actingAs($director)->get('/approvals/Pengurusan%20izin%20labuh%20tambat%20pelabuhan/detail');

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Approvals/Show')
            ->has('requests.0.items', 2)
            ->where('requests.0.items.1.surplus_amount', '500000.00')
            ->where('requests.0.items.1.original_hpp_price', '2500000.00')
            ->where('requests.0.items.1.surplus_source_item_name', 'Item Sumber Sisa Biaya')
        );
});

test('approvals index filters correctly with company, ship, job, and tab status', function () {
    $role = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $director = User::factory()->create();
    $director->assignRole($role);

    $company = ShipCompany::create(['name' => 'PT Pelayaran Approval Test', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Approval Express', 'ship_company_id' => $company->id, 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-APP-FILTER-001',
        'ship_id' => $ship->id,
        'status' => 'berthed',
        'eta_at' => now()->toDateString(),
    ]);

    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-APP-FILTER-001',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $director->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($director)->get(route('approvals.index', [
        'tab' => 'menunggu',
        'company_id' => $company->id,
        'ship_id' => $ship->id,
        'job' => 'JOB-APP-FILTER-001',
        'search' => 'Approval',
    ]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Approvals/Index')
            ->has('requests', 1)
            ->where('filters.company_id', $company->id)
            ->where('filters.ship_id', $ship->id)
            ->where('filters.job', 'JOB-APP-FILTER-001')
            ->where('filters.tab', 'menunggu')
            ->where('filters.status', 'menunggu')
            ->where('filters.search', 'Approval')
        );
});

test('approvals index hpp totals respect date filters and approved hpp only counts approved items', function () {
    $role = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $director = User::factory()->create();
    $director->assignRole($role);

    $ship = Ship::create(['name' => 'KM HPP Precision', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-HPP-001',
        'ship_id' => $ship->id,
        'status' => 'berthed',
    ]);

    // Request on 2026-11-02
    $reqToday = ShipRequest::create([
        'request_number' => 'REQ-TODAY-001',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $director->id,
        'status' => 'Disetujui Sebagian',
        'request_date' => '2026-11-02',
    ]);

    // Item 1: approved (100.000)
    RequestItem::create([
        'request_id' => $reqToday->id,
        'item_name' => 'Item 1 Approved',
        'quantity' => 1,
        'hpp_price' => 100000,
        'status' => 'approved',
        'director_status' => 'approved',
    ]);

    // Item 2: pending (200.000)
    RequestItem::create([
        'request_id' => $reqToday->id,
        'item_name' => 'Item 2 Pending',
        'quantity' => 1,
        'hpp_price' => 200000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    // Request on a different date (2026-10-15)
    $reqOld = ShipRequest::create([
        'request_number' => 'REQ-OLD-001',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $director->id,
        'status' => 'Disetujui',
        'request_date' => '2026-10-15',
    ]);

    RequestItem::create([
        'request_id' => $reqOld->id,
        'item_name' => 'Item Old Approved',
        'quantity' => 1,
        'hpp_price' => 50000000,
        'status' => 'approved',
        'director_status' => 'approved',
    ]);

    // Filter specifically by 2026-11-02
    $response = $this->actingAs($director)->get(route('approvals.index', [
        'tab' => 'disetujui',
        'start_date' => '2026-11-02',
        'end_date' => '2026-11-02',
    ]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Approvals/Index')
            ->where('all_requests_total_hpp', 300000) // 100k + 200k for 2026-11-02 only
            ->where('approved_requests_total_hpp', 100000) // Only the 100k approved item! NOT 300k, NOT 50.3M!
            ->where('waiting_requests_total_hpp', 200000) // The 200k pending item
        );
});

test('bu titik and pak ryan partial approval and resubmission workflow records full audit history', function () {
    $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $directorRole = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);

    $buTitik = User::factory()->create(['name' => 'Bu Titik']);
    $buTitik->assignRole($adminRole);

    $pakRyan = User::factory()->create(['name' => 'Pak Ryan']);
    $pakRyan->assignRole($directorRole);

    $ship = Ship::create([
        'name' => 'KM Samudra Test',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);

    $shipRequest = ShipRequest::create([
        'request_number' => 'PGJ-2026-9999',
        'ship_id' => $ship->id,
        'created_by' => $buTitik->id,
        'status' => 'Menunggu Approval',
        'request_date' => '2026-11-03',
    ]);

    $item1 = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Taktis Sandar Kapal',
        'unit' => 'Kegiatan',
        'quantity' => 1,
        'hpp_price' => 1500000,
        'status' => 'pending',
        'director_status' => 'pending',
        'supplier_invoice_number' => 'INV-TEST-001',
        'supplier_invoice_date' => '2026-11-03',
        'supplier_invoice_received_date' => '2026-11-03',
        'supplier_invoice_path' => 'supplier-invoices/test1.pdf',
        'supplier_invoice_uploaded_by' => $buTitik->id,
    ]);

    $item2 = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'non_jasa',
        'item_name' => 'Tali Tambat Polypropylene',
        'unit' => 'Roll',
        'quantity' => 2,
        'hpp_price' => 3000000,
        'status' => 'pending',
        'director_status' => 'pending',
        'supplier_invoice_number' => 'INV-TEST-002',
        'supplier_invoice_date' => '2026-11-03',
        'supplier_invoice_received_date' => '2026-11-03',
        'supplier_invoice_path' => 'supplier-invoices/test2.pdf',
        'supplier_invoice_uploaded_by' => $buTitik->id,
    ]);

    // Step 1: Bu Titik forwards both items to Pak Ryan on 2026-11-03
    $forwardResponse = $this->actingAs($buTitik)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$item1->id, $item2->id],
        'item_prices' => [
            ['id' => $item1->id, 'hpp_price' => 1500000],
            ['id' => $item2->id, 'hpp_price' => 3000000],
        ],
        'admin_notes' => 'Pengajuan awal 2 item kebutuhan kapal',
        'submission_date' => '2026-11-03',
    ]);
    $forwardResponse->assertRedirect();

    $shipRequest->refresh();
    expect($shipRequest->status)->toBe('Menunggu Approval Direktur');
    expect($shipRequest->histories)->toHaveCount(1);
    expect($shipRequest->histories->first()->action)->toBe('submitted_to_director');
    expect($shipRequest->histories->first()->actor_name)->toBe('Bu Titik');
    expect($shipRequest->histories->first()->submission_date->toDateString())->toBe('2026-11-03');

    // Step 2: Pak Ryan approves only Item 1, while Item 2 is unselected (returned to Admin)
    $decisionResponse = $this->actingAs($pakRyan)->post(route('approvals.requests.batch-item-decision'), [
        'decisions' => [
            ['item_id' => $item1->id, 'status' => 'approved', 'director_notes' => 'ACC Taktis Sandar'],
            ['item_id' => $item2->id, 'status' => 'pending', 'director_notes' => 'Tali tambat mohon negosiasi harga dulu dengan supplier'],
        ],
    ]);
    $decisionResponse->assertRedirect();

    $item1->refresh();
    $item2->refresh();
    $shipRequest->refresh();

    expect($item1->director_status)->toBe('approved');
    expect($item1->status)->toBe('disetujui');
    expect($item2->director_status)->toBe('pending');
    expect($item2->status)->toBe('pending');
    expect($shipRequest->status)->toBe('Disetujui Sebagian');

    // History should now have 2 records
    expect($shipRequest->histories)->toHaveCount(2);
    $decisionHistory = $shipRequest->histories->last();
    expect($decisionHistory->action)->toBe('director_partial_approval');
    expect($decisionHistory->actor_name)->toBe('Pak Ryan');

    // Step 3: Bu Titik checks the request detail and sees the histories & returned item
    $showResponse = $this->actingAs($buTitik)->get(route('requests.show', $shipRequest->id));
    $showResponse->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('requests.0.histories', 2)
            ->where('requests.0.status', 'Disetujui Sebagian')
        );

    // Step 4: The next day (2026-11-04), Bu Titik re-submits Item 2 to Pak Ryan with a new date
    $resubmitResponse = $this->actingAs($buTitik)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$item2->id],
        'item_prices' => [
            ['id' => $item2->id, 'hpp_price' => 2800000],
        ],
        'admin_notes' => 'Harga tali tambat sudah dinegosiasi turun menjadi 2.8jt per roll',
        'submission_date' => '2026-11-04',
    ]);
    $resubmitResponse->assertRedirect();

    $shipRequest->refresh();
    $item2->refresh();

    expect($item2->status)->toBe('diajukan_ke_direktur');
    expect($item2->hpp_price)->toBe('2800000.00');
    expect($shipRequest->status)->toBe('Menunggu Approval Direktur');
    expect($shipRequest->histories)->toHaveCount(3);

    $resubmitHistory = $shipRequest->histories->last();
    expect($resubmitHistory->action)->toBe('resubmitted_to_director');
    expect($resubmitHistory->actor_name)->toBe('Bu Titik');
    expect($resubmitHistory->submission_date->toDateString())->toBe('2026-11-04');

    // Step 5: Pak Ryan views approval detail and sees all 3 timeline entries
    $approvalDetailResponse = $this->actingAs($pakRyan)->get('/approvals/'.$shipRequest->request_number.'/detail');
    $approvalDetailResponse->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('requests.0.histories', 3)
        );
});
