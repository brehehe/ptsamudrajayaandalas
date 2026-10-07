<?php

use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
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

    $this->post(route('requests.items.update-price', [$shipRequest->id, $selectedItem->id]), [
        'hpp_price' => 3000000,
        'selling_price' => 5000000,
    ])->assertSessionHasErrors('hpp_price');

    $this->post(route('requests.items.batch-update-prices'), [
        'items' => [[
            'id' => $selectedItem->id,
            'hpp_price' => 3000000,
            'selling_price' => 5000000,
        ]],
    ])->assertSessionHasErrors('items');

    $this->assertDatabaseHas('request_items', [
        'id' => $selectedItem->id,
        'hpp_price' => 2500000,
        'selling_price' => 4200000,
        'director_status' => 'approved',
    ]);

    $selectedItem->update(['is_invoiced' => true]);
    $this->post(
        route('requests.items.revision', [$shipRequest->id, $selectedItem->id]),
        ['reason' => 'Penawaran vendor berubah.']
    )->assertSessionHasErrors('reason');
    $selectedItem->update(['is_invoiced' => false]);

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

test('owner can view financial values but cannot edit prices or decide approvals', function () {
    $owner = createPricingUser('Owner');
    [$shipRequest, $selectedItem] = createPricingRequest($owner);

    $this->actingAs($owner)
        ->get(route('requests.detail', $shipRequest))
        ->assertInertia(fn (Assert $page) => $page
            ->where('capabilities.can_review_prices', false)
            ->where('capabilities.can_decide_items', false)
            ->where('capabilities.can_view_hpp', true)
            ->where('capabilities.can_create_requests', false)
            ->where('capabilities.can_process_requests', false));

    $this->get(route('requests.create'))->assertForbidden();
    $this->post(route('requests.store'), [])->assertForbidden();
    $this->post(route('requests.store-wizard'), [])->assertForbidden();
    $this->post(route('requests.store-multi'), [])->assertForbidden();

    $this->post(route('requests.items.update-price', [$shipRequest->id, $selectedItem->id]), [
        'hpp_price' => 3000000,
        'selling_price' => 5000000,
    ])->assertForbidden();

    $selectedItem->update(['status' => 'diajukan_ke_direktur']);

    $this->post(route('approvals.items.decision', $selectedItem->id), [
        'decision' => 'approved',
    ])->assertForbidden();

    $this->assertDatabaseHas('request_items', [
        'id' => $selectedItem->id,
        'hpp_price' => 2500000,
        'selling_price' => 4200000,
        'director_status' => 'pending',
    ]);
});

test('director can approve partial items and unapproved item returns to pending pool', function () {
    $admin = createPricingUser('Admin');
    $director = createPricingUser('Direktur');
    [$shipRequest, $item1, $item2] = createPricingRequest($admin);

    $this->actingAs($admin)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$item1->id, $item2->id],
    ]);

    // Director approves item1 and sets item2 to pending
    $response = $this->actingAs($director)->post(route('approvals.requests.item-decision', $shipRequest->id), [
        'decisions' => [
            ['item_id' => $item1->id, 'status' => 'approved'],
            ['item_id' => $item2->id, 'status' => 'pending'],
        ],
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('request_items', [
        'id' => $item1->id,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    $this->assertDatabaseHas('request_items', [
        'id' => $item2->id,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);
    expect($shipRequest->fresh()->status)->toBe('Disetujui Sebagian');
});

test('admin can batch forward items and director can batch decide items across requests', function () {
    $admin = createPricingUser('Admin');
    $director = createPricingUser('Direktur');
    [$req1, $item1] = createPricingRequest($admin);
    [$req2, $item2] = createPricingRequest($admin);

    // Admin batch forwards items from req1 and req2
    $this->actingAs($admin)->post(route('requests.batch-forward-director'), [
        'selected_items' => [$item1->id, $item2->id],
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($req1->fresh()->status)->toBe('Menunggu Approval Direktur');
    expect($req2->fresh()->status)->toBe('Menunggu Approval Direktur');
    expect($item1->fresh()->status)->toBe('diajukan_ke_direktur');
    expect($item2->fresh()->status)->toBe('diajukan_ke_direktur');

    // Director batch decides
    $this->actingAs($director)->post(route('approvals.requests.batch-item-decision'), [
        'decisions' => [
            ['item_id' => $item1->id, 'status' => 'approved'],
            ['item_id' => $item2->id, 'status' => 'pending'],
        ],
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($item1->fresh()->status)->toBe('disetujui');
    expect($item2->fresh()->status)->toBe('pending');
    expect($req1->fresh()->status)->toBe('Disetujui Sebagian');
    expect($req2->fresh()->status)->toBe('Menunggu Approval');
});

test('admin cannot forward items with zero hpp or zero selling price to director', function () {
    $admin = createPricingUser('Admin');
    [$shipRequest, $item] = createPricingRequest($admin);

    // Try forwarding with HPP = 0
    $responseZeroHpp = $this->actingAs($admin)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$item->id],
        'item_prices' => [[
            'id' => $item->id,
            'hpp_price' => 0,
            'selling_price' => 1500000,
        ]],
    ]);

    $responseZeroHpp->assertSessionHasErrors('selected_items');
    expect($item->fresh()->status)->toBe('pending');

    // Try forwarding with Selling Price = 0
    $responseZeroSelling = $this->actingAs($admin)->post(route('requests.forward-director', $shipRequest->id), [
        'selected_items' => [$item->id],
        'item_prices' => [[
            'id' => $item->id,
            'hpp_price' => 500000,
            'selling_price' => 0,
        ]],
    ]);

    $responseZeroSelling->assertSessionHasErrors('selected_items');
    expect($item->fresh()->status)->toBe('pending');

    // Try batch forward with zero price
    $responseBatchZero = $this->actingAs($admin)->post(route('requests.batch-forward-director'), [
        'selected_items' => [$item->id],
        'item_prices' => [[
            'id' => $item->id,
            'hpp_price' => 0,
            'selling_price' => 0,
        ]],
    ]);

    $responseBatchZero->assertSessionHasErrors('selected_items');
    expect($item->fresh()->status)->toBe('pending');
});
