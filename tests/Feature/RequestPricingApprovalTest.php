<?php

use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
use Spatie\Permission\Models\Role;

function createPricingUser(string $role): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

/**
 * @return array{0: ShipRequest, 1: RequestItem, 2: RequestItem}
 */
function createPricingRequest(User $creator): array
{
    $ship = Ship::create([
        'name' => 'KM Pricing Workflow',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);

    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-PRICE-0001',
        'ship_id' => $ship->id,
        'created_by' => $creator->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

    $selectedItem = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Clearance In',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 2500000,
        'selling_price' => 4200000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);

    $pendingItem = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'non_jasa',
        'item_name' => 'Air Tawar',
        'unit' => 'Ton',
        'quantity' => 10,
        'hpp_price' => 500000,
        'selling_price' => 750000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);

    return [$shipRequest, $selectedItem, $pendingItem];
}

test('admin selects which items and prices are forwarded to director', function () {
    $admin = createPricingUser('Admin');
    [$shipRequest, $selectedItem, $pendingItem] = createPricingRequest($admin);

    $response = $this->actingAs($admin)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$selectedItem->id],
        'item_prices' => [[
            'id' => $selectedItem->id,
            'hpp_price' => 2750000,
            'selling_price' => 4500000,
        ]],
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('request_items', [
        'id' => $selectedItem->id,
        'hpp_price' => 2750000,
        'selling_price' => 4500000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);
    $this->assertDatabaseHas('request_items', [
        'id' => $pendingItem->id,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);
    expect($shipRequest->fresh()->status)->toBe('Menunggu Approval Direktur');
});

test('director approval is per item and leaves unsubmitted items pending', function () {
    $admin = createPricingUser('Admin');
    $director = createPricingUser('Direktur');
    [$shipRequest, $selectedItem, $pendingItem] = createPricingRequest($admin);

    $this->actingAs($admin)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$selectedItem->id],
    ]);

    $response = $this->actingAs($director)->post(route('approvals.requests.item-decision', $shipRequest->id), [
        'decisions' => [[
            'item_id' => $selectedItem->id,
            'status' => 'approved',
            'director_notes' => 'Harga disetujui.',
        ]],
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('request_items', [
        'id' => $selectedItem->id,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    $this->assertDatabaseHas('request_items', [
        'id' => $pendingItem->id,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);
    expect($shipRequest->fresh()->status)->toBe('Disetujui Sebagian');
});

test('approved hpp and selling price require revision before they can change', function () {
    $admin = createPricingUser('Admin');
    $director = createPricingUser('Direktur');
    [$shipRequest, $selectedItem] = createPricingRequest($admin);

    $this->actingAs($admin)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$selectedItem->id],
    ]);
    $this->actingAs($director)->post(route('approvals.items.decision', $selectedItem->id), [
        'decision' => 'approved',
    ]);

    $lockedResponse = $this->actingAs($admin)
        ->from(route('requests.detail', $shipRequest))
        ->post(route('requests.forward-director', $shipRequest->id), [
            'selected_items' => [$selectedItem->id],
            'item_prices' => [[
                'id' => $selectedItem->id,
                'hpp_price' => 3000000,
                'selling_price' => 5000000,
            ]],
        ]);

    $lockedResponse->assertRedirect(route('requests.detail', $shipRequest))
        ->assertSessionHasErrors('selected_items');
    $this->assertDatabaseHas('request_items', [
        'id' => $selectedItem->id,
        'hpp_price' => 2500000,
        'selling_price' => 4200000,
        'director_status' => 'approved',
    ]);

    $revisionResponse = $this->actingAs($admin)->post(
        route('requests.items.revision', [$shipRequest->id, $selectedItem->id]),
        ['reason' => 'Penawaran vendor berubah.']
    );

    $revisionResponse->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('request_items', [
        'id' => $selectedItem->id,
        'hpp_price' => 2500000,
        'selling_price' => 4200000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);

    $resubmissionResponse = $this->actingAs($admin)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$selectedItem->id],
        'item_prices' => [[
            'id' => $selectedItem->id,
            'hpp_price' => 3000000,
            'selling_price' => 5000000,
        ]],
    ]);

    $resubmissionResponse->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('request_items', [
        'id' => $selectedItem->id,
        'hpp_price' => 3000000,
        'selling_price' => 5000000,
        'status' => 'diajukan_ke_direktur',
    ]);
});

test('users without the required roles cannot review prices or decide items', function () {
    $operational = createPricingUser('Lapangan');
    [$shipRequest, $selectedItem] = createPricingRequest($operational);

    $this->actingAs($operational)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$selectedItem->id],
    ])->assertForbidden();

    $selectedItem->update(['status' => 'diajukan_ke_direktur']);

    $this->actingAs($operational)->post(route('approvals.items.decision', $selectedItem->id), [
        'decision' => 'approved',
    ])->assertForbidden();
});
