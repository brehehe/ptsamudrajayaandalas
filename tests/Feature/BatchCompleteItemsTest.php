<?php

use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
use Spatie\Permission\Models\Role;

function createBatchCompleteUser(string $role): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

test('operational admin can batch complete all approved items in a request', function () {
    $admin = createBatchCompleteUser('Admin');
    $ship = Ship::create(['name' => 'TB Bahari Selesai', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create(['ship_id' => $ship->id, 'job_number' => 'JOB-BATCH-001', 'status' => 'berthed']);

    $request = ShipRequest::create([
        'request_number' => 'PGJ-2026-0081',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'service_type' => 'clearance_in',
        'status' => 'Disetujui',
        'created_by' => $admin->id,
        'request_date' => now()->toDateString(),
    ]);

    $item1 = RequestItem::create([
        'request_id' => $request->id,
        'item_type' => 'jasa',
        'item_name' => 'Tali Tambat Polypropylene',
        'quantity' => 2,
        'unit' => 'Roll',
        'hpp_price' => 3000000,
        'director_status' => 'approved',
        'status' => 'disetujui',
    ]);

    $item2 = RequestItem::create([
        'request_id' => $request->id,
        'item_type' => 'jasa',
        'item_name' => 'Jasa Labuh Jangkar',
        'quantity' => 1,
        'unit' => 'Hari',
        'hpp_price' => 1500000,
        'director_status' => 'approved',
        'status' => 'dalam_proses',
    ]);

    $response = $this->actingAs($admin)->post(route('requests.items.batch-complete'), [
        'request_id' => $request->id,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $item1->refresh();
    $item2->refresh();
    $request->refresh();

    expect($item1->status)->toBe('selesai');
    expect($item2->status)->toBe('selesai');
    expect($request->status)->toBe('Selesai');
    expect($request->completed_at)->not->toBeNull();

    $this->assertDatabaseHas('request_histories', [
        'request_id' => $request->id,
        'action' => 'completed',
    ]);
});

test('operational admin can batch complete all approved items across a job', function () {
    $admin = createBatchCompleteUser('Admin');
    $ship = Ship::create(['name' => 'TB Bahari Job', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create(['ship_id' => $ship->id, 'job_number' => 'JOB-BATCH-002', 'status' => 'berthed']);

    $request1 = ShipRequest::create([
        'request_number' => 'PGJ-2026-0082',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'service_type' => 'clearance_in',
        'status' => 'Disetujui',
        'created_by' => $admin->id,
        'request_date' => now()->toDateString(),
    ]);

    $request2 = ShipRequest::create([
        'request_number' => 'PGJ-2026-0083',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'service_type' => 'clearance_in',
        'status' => 'Disetujui',
        'created_by' => $admin->id,
        'request_date' => now()->toDateString(),
    ]);

    $item1 = RequestItem::create([
        'request_id' => $request1->id,
        'item_type' => 'jasa',
        'item_name' => 'Air Tawar Kapal',
        'quantity' => 10,
        'unit' => 'Ton',
        'hpp_price' => 45000,
        'director_status' => 'approved',
        'status' => 'disetujui',
    ]);

    $item2 = RequestItem::create([
        'request_id' => $request2->id,
        'item_type' => 'jasa',
        'item_name' => 'Kurang Bayar Nota Rampung',
        'quantity' => 1,
        'unit' => 'Dokumen',
        'hpp_price' => 500000,
        'director_status' => 'approved',
        'status' => 'disetujui',
    ]);

    $response = $this->actingAs($admin)->post(route('requests.items.batch-complete'), [
        'job_number' => $portCall->job_number,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $item1->refresh();
    $item2->refresh();
    $request1->refresh();
    $request2->refresh();

    expect($item1->status)->toBe('selesai');
    expect($item2->status)->toBe('selesai');
    expect($request1->status)->toBe('Selesai');
    expect($request2->status)->toBe('Selesai');
});

test('operational admin can transition an approved item directly to selesai via need controller', function () {
    $admin = createBatchCompleteUser('Admin');
    $ship = Ship::create(['name' => 'TB Direct Selesai', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create(['ship_id' => $ship->id, 'job_number' => 'JOB-DIRECT-001', 'status' => 'berthed']);

    $request = ShipRequest::create([
        'request_number' => 'PGJ-2026-0084',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'service_type' => 'clearance_in',
        'status' => 'Disetujui',
        'created_by' => $admin->id,
        'request_date' => now()->toDateString(),
    ]);

    $item = RequestItem::create([
        'request_id' => $request->id,
        'item_type' => 'jasa',
        'item_name' => 'Motor Boat Penyeberangan',
        'quantity' => 1,
        'unit' => 'Trip',
        'hpp_price' => 600000,
        'director_status' => 'approved',
        'status' => 'disetujui',
    ]);

    $response = $this->actingAs($admin)->patch(route('needs.items.update-status', $request->id), [
        'status' => 'selesai',
        'item_ids' => [$item->id],
    ]);

    $response->assertRedirect();
    $item->refresh();
    expect($item->status)->toBe('selesai');
    expect($request->fresh()->status)->toBe('Selesai');
});
