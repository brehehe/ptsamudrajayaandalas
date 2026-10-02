<?php

use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

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

test('missing request detail returns not found', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/requests/00000000-0000-0000-0000-000000000000/detail')
        ->assertNotFound();
});
