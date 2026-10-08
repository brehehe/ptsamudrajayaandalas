<?php

use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('guests must sign in before viewing a request detail', function () {
    $user = User::factory()->create();
    $ship = Ship::create([
        'name' => 'KM Detail Guest',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-DETAIL-GUEST',
        'ship_id' => $ship->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

    $this->get(route('requests.detail', $shipRequest))
        ->assertRedirect(route('login'));
});

test('authenticated users can view a request on its dedicated detail page', function () {
    $user = User::factory()->create();
    $ship = Ship::create([
        'name' => 'MT Halaman Detail',
        'imo_number' => 'IMO1234567',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-DETAIL-0001',
        'ship_id' => $ship->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
        'notes' => 'Pengajuan untuk menguji halaman detail.',
    ]);
    RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Clearance In',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'selling_price' => 4200000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);

    $response = $this->actingAs($user)->get(route('requests.detail', $shipRequest));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Requests/Show')
        ->where('request.id', $shipRequest->id)
        ->where('request.request_number', 'REQ-DETAIL-0001')
        ->where('request.ship.name', 'MT Halaman Detail')
        ->has('request.items', 1)
        ->where('request.items.0.item_name', 'Clearance In')
        ->has('products'));
});

test('authenticated users can view request detail by port call job number or id', function () {
    $user = User::factory()->create();
    $ship = Ship::create([
        'name' => 'KM Job Test',
        'imo_number' => 'IMO7654321',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-TEST-9999',
        'ship_id' => $ship->id,
        'status' => 'Akan Datang',
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-JOB-9999',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($user)->get('/requests/JOB-TEST-9999/detail');

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Requests/Show')
        ->where('job.job_number', 'JOB-TEST-9999')
        ->has('requests', 1)
        ->where('request.request_number', 'REQ-JOB-9999'));
});

test('completed job detail does not offer another request', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $ship = Ship::create([
        'name' => 'KM Detail Selesai',
        'status' => 'Selesai',
        'is_active' => true,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-DETAIL-COMPLETED',
        'ship_id' => $ship->id,
        'status' => 'departed',
        'departed_at' => now(),
    ]);
    ShipRequest::create([
        'request_number' => 'REQ-DETAIL-COMPLETED',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $user->id,
        'status' => 'Selesai',
        'request_date' => now()->toDateString(),
        'completed_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('requests.detail', $portCall->job_number))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->where('job.status', 'departed')
            ->where('capabilities.can_create_requests', false));
});

test('request detail lists the newest request first', function () {
    $user = User::factory()->create();
    $ship = Ship::create([
        'name' => 'KM Urutan Pengajuan',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-ORDER-REQUESTS',
        'ship_id' => $ship->id,
        'status' => 'Akan Datang',
    ]);

    $this->travelTo('2026-10-08 08:00:00');
    $olderRequest = ShipRequest::create([
        'request_number' => 'REQ-ORDER-OLDER',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $user->id,
        'status' => 'Disetujui',
        'request_date' => '2026-10-08',
    ]);

    $this->travelTo('2026-10-08 09:00:00');
    $newestRequest = ShipRequest::create([
        'request_number' => 'REQ-ORDER-NEWEST',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => '2026-10-08',
    ]);
    $this->travelBack();

    $response = $this->actingAs($user)->get('/requests/JOB-ORDER-REQUESTS/detail');

    $response->assertInertia(fn (Assert $page) => $page
        ->has('requests', 2)
        ->where('requests.0.id', $newestRequest->id)
        ->where('requests.1.id', $olderRequest->id)
        ->where('request.id', $newestRequest->id));
});

test('missing request detail returns not found', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/requests/00000000-0000-0000-0000-000000000000/detail')
        ->assertNotFound();
});
