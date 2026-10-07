<?php

use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
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
