<?php

use App\Models\OperationalActivity;
use App\Models\OutgoingPayment;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Product;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function createClearancePortCall(User $officer, array $attributes = []): PortCall
{
    $officer->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $ship = Ship::create(['name' => 'Kapal Uji Clearance', 'status' => 'Akan Datang', 'is_active' => true]);
    $port = Port::create(['name' => 'Pelabuhan Uji', 'code' => Str::uuid()->toString(), 'city' => 'Gresik', 'country' => 'Indonesia', 'is_active' => true]);
    $workOrder = WorkOrder::create(['system_number' => Str::uuid()->toString(), 'status' => 'accepted', 'assigned_to' => $officer->id]);

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

function createClearancePayment(PortCall $portCall, User $verifier, array $attributes = []): OutgoingPayment
{
    return OutgoingPayment::create([
        'port_call_id' => $portCall->id,
        'payment_type' => 'Pelindo Kedatangan',
        'amount' => '100000.00',
        'recipient' => 'Pelindo',
        'reference_number' => Str::uuid()->toString(),
        'verification_status' => 'verified',
        'verified_by' => $verifier->id,
        'verified_at' => now(),
        ...$attributes,
    ]);
}

test('operational staff creates a clearance in request without changing vessel status', function (string $status) {
    $this->freezeTime();
    $user = User::factory()->create();
    $portCall = createClearancePortCall($user);

    $this->actingAs($user)->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => $status,
        'expected_status' => 'scheduled',
        'occurred_at' => now()->toIso8601String(),
    ])->assertRedirect()->assertSessionHasNoErrors()->assertSessionHas('success');

    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'scheduled',
        'arrived_at' => null,
        'financial_status' => 'pending_reconciliation',
    ]);
    $this->assertDatabaseHas('ships', ['id' => $portCall->ship_id, 'status' => 'Akan Datang']);
    $this->assertDatabaseHas('requests', [
        'port_call_id' => $portCall->id,
        'service_type' => 'clearance_in',
        'status' => 'Menunggu Approval',
        'requested_port_call_status' => $status,
        'operational_occurred_at' => now()->format('Y-m-d H:i:s'),
    ]);
    $clearanceRequest = ShipRequest::where('port_call_id', $portCall->id)
        ->where('service_type', 'clearance_in')
        ->firstOrFail();
    expect((float) $clearanceRequest->items()->firstOrFail()->hpp_price)->toBe(0.0)
        ->and((float) $clearanceRequest->items()->firstOrFail()->selling_price)->toBe(0.0);
    $this->assertDatabaseHas('activity_log', ['subject_id' => $portCall->id, 'causer_id' => $user->id, 'log_name' => 'clearance']);
})->with(['labuh' => 'anchored', 'sandar' => 'berthed']);

test('clearance in remains available before arrival regardless of work order status', function () {
    $this->freezeTime();
    $user = User::factory()->create();
    $portCall = createClearancePortCall($user);
    $portCall->workOrder->update(['status' => 'draft']);

    $this->actingAs($user)->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => 'anchored',
        'expected_status' => 'scheduled',
        'occurred_at' => now()->toIso8601String(),
    ])->assertRedirect()->assertSessionHasNoErrors()->assertSessionHas('success');

    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'scheduled',
        'arrived_at' => null,
    ]);
    $this->assertDatabaseHas('requests', [
        'port_call_id' => $portCall->id,
        'service_type' => 'clearance_in',
        'requested_port_call_status' => 'anchored',
    ]);
});

test('clearance out creates one pending request without changing vessel status', function (string $status, string $shipStatus) {
    $this->freezeTime();
    $user = User::factory()->create();
    $portCall = createClearancePortCall($user, ['status' => $status, 'arrived_at' => now()->subDay()]);
    $portCall->ship()->update(['status' => $shipStatus]);
    $payload = ['status' => 'departed', 'expected_status' => $status, 'occurred_at' => now()->toIso8601String()];

    $this->actingAs($user)->patch(route('operations.port-calls.status', $portCall->id), $payload)
        ->assertRedirect()->assertSessionHasNoErrors()->assertSessionHas('success');

    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => $status,
        'departed_at' => null,
        'financial_status' => 'pending_reconciliation',
    ]);
    $this->assertDatabaseHas('ships', ['id' => $portCall->ship_id, 'status' => $shipStatus]);
    $this->assertDatabaseHas('requests', [
        'port_call_id' => $portCall->id,
        'service_type' => 'clearance_out',
        'status' => 'Menunggu Approval',
        'requested_port_call_status' => 'departed',
    ]);

    $this->patch(route('operations.port-calls.status', $portCall->id), $payload)
        ->assertSessionHas('error');

    expect(ShipRequest::where('port_call_id', $portCall->id)->where('service_type', 'clearance_out')->count())->toBe(1);
    $this->assertDatabaseCount('activity_log', 1);
})->with([
    'labuh' => ['anchored', 'Labuh'],
    'sandar' => ['berthed', 'Sandar'],
]);

test('stale clearance in cannot change the confirmed arrival', function () {
    $this->freezeTime();
    $user = User::factory()->create();
    $portCall = createClearancePortCall($user, ['status' => 'anchored', 'arrived_at' => now()->subHour()]);

    $this->actingAs($user)->patch(route('operations.port-calls.status', $portCall->id), ['status' => 'berthed', 'expected_status' => 'scheduled'])
        ->assertSessionHasErrors('status');

    $this->assertDatabaseHas('port_calls', ['id' => $portCall->id, 'status' => 'anchored', 'arrived_at' => now()->subHour()->format('Y-m-d H:i:s'), 'berthed_at' => null]);
});

test('clearance rejects invalid sequence and future or earlier event times', function (array $payload, string $errorField) {
    $this->freezeTime();
    $user = User::factory()->create();
    $portCall = createClearancePortCall($user, ['status' => 'anchored', 'arrived_at' => now()]);

    $this->actingAs($user)->patch(route('operations.port-calls.status', $portCall->id), $payload)
        ->assertSessionHasErrors($errorField);

    $this->assertDatabaseHas('port_calls', ['id' => $portCall->id, 'status' => 'anchored', 'departed_at' => null]);
})->with([
    'back to scheduled' => [['status' => 'scheduled'], 'status'],
    'future' => [['status' => 'departed', 'occurred_at' => '2999-01-01 00:00'], 'occurred_at'],
    'before arrival' => [['status' => 'departed', 'occurred_at' => '2000-01-01 00:00'], 'occurred_at'],
]);

test('operational staff can confirm clearance in for another officers job', function () {
    $this->freezeTime();
    $officer = User::factory()->create();
    $portCall = createClearancePortCall($officer);
    $otherOfficer = User::factory()->create();
    $otherOfficer->assignRole('Lapangan');

    $this->actingAs($otherOfficer)->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => 'anchored',
        'expected_status' => 'scheduled',
        'occurred_at' => now()->toIso8601String(),
    ])->assertRedirect()->assertSessionHasNoErrors()->assertSessionHas('success');

    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'scheduled',
        'arrived_at' => null,
    ]);
    $this->assertDatabaseHas('requests', [
        'port_call_id' => $portCall->id,
        'created_by' => $otherOfficer->id,
        'requested_port_call_status' => 'anchored',
    ]);
});

test('guests must sign in before changing clearance', function () {
    $officer = User::factory()->create();
    $portCall = createClearancePortCall($officer);

    $this->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => 'anchored',
    ])->assertRedirect(route('login'));

    $this->assertDatabaseHas('port_calls', ['id' => $portCall->id, 'status' => 'scheduled']);
});

test('a familiar account name without an authorized role cannot change clearance', function () {
    $user = User::factory()->create(['name' => 'Pak Prima', 'email' => 'prima-test@example.test']);
    $officer = User::factory()->create();
    $portCall = createClearancePortCall($officer, ['status' => 'berthed']);

    $this->actingAs($user)->patch(route('operations.port-calls.status', $portCall->id), ['status' => 'departed'])->assertForbidden();

    $this->assertDatabaseHas('port_calls', ['id' => $portCall->id, 'status' => 'berthed']);
});

test('vessel detail exposes active clearance jobs to operational staff without payment details', function () {
    $user = User::factory()->create();
    $portCall = createClearancePortCall($user);
    createClearancePayment($portCall, $user);
    $otherOfficer = User::factory()->create();
    $otherPortCall = createClearancePortCall($otherOfficer, [
        'ship_id' => $portCall->ship_id,
        'eta_at' => now()->addDay(),
    ]);

    $this->actingAs($user)->get(route('vessels.show', $portCall->ship_id))->assertInertia(fn (Assert $page) => $page
        ->component('Vessels/Show')->where('canManageClearance', true)
        ->where('canCreateRequests', true)
        ->has('clearancePortCalls', 2)->where('clearancePortCalls.0.id', $otherPortCall->id)
        ->where('clearancePortCalls.0.clearance_in_block_reason', null)
        ->missing('clearancePortCalls.0.verified_arrival_payments'));
});

test('completed vessel visit disables new request actions', function () {
    $user = User::factory()->create();
    $portCall = createClearancePortCall($user, [
        'status' => 'departed',
        'departed_at' => now(),
    ]);
    $portCall->ship()->update(['status' => 'Selesai']);

    $this->actingAs($user)
        ->get(route('vessels.show', ['id' => $portCall->ship_id, 'visit' => $portCall->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Vessels/Show')
            ->where('selectedVisit.status', 'departed')
            ->where('canManageClearance', true)
            ->where('canCreateRequests', false)
            ->has('clearancePortCalls', 0));
});

test('vessel detail returns database needs for the selected visit and excludes clearance requests', function () {
    $user = User::factory()->create();
    $selectedVisit = createClearancePortCall($user);
    $otherVisit = createClearancePortCall($user, [
        'ship_id' => $selectedVisit->ship_id,
        'eta_at' => now()->addDay(),
    ]);

    ShipRequest::create([
        'request_number' => 'REQ-CIN-TEST-001',
        'ship_id' => $selectedVisit->ship_id,
        'port_call_id' => $selectedVisit->id,
        'created_by' => $user->id,
        'status' => 'Selesai',
        'request_date' => now()->toDateString(),
        'service_type' => 'clearance_in',
    ]);
    $selectedNeed = ShipRequest::create([
        'request_number' => 'REQ-NEED-TEST-001',
        'ship_id' => $selectedVisit->ship_id,
        'port_call_id' => $selectedVisit->id,
        'created_by' => $user->id,
        'status' => 'Draft',
        'request_date' => now()->toDateString(),
        'notes' => 'Kebutuhan untuk kunjungan terpilih.',
    ]);
    $selectedItem = RequestItem::create([
        'request_id' => $selectedNeed->id,
        'item_type' => 'product',
        'item_name' => 'Air Tawar',
        'quantity' => 10,
        'unit' => 'Ton',
        'hpp_price' => 150000,
        'selling_price' => 200000,
    ]);
    ShipRequest::create([
        'request_number' => 'REQ-NEED-TEST-002',
        'ship_id' => $selectedVisit->ship_id,
        'port_call_id' => $otherVisit->id,
        'created_by' => $user->id,
        'status' => 'Draft',
        'request_date' => now()->addDay()->toDateString(),
    ]);

    $this->actingAs($user)
        ->get(route('vessels.show', [
            'id' => $selectedVisit->ship_id,
            'visit' => $selectedVisit->id,
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('needs', 1, fn (Assert $need) => $need
                ->where('id', $selectedNeed->id)
                ->where('request_number', 'REQ-NEED-TEST-001')
                ->has('items', 1, fn (Assert $item) => $item
                    ->where('id', $selectedItem->id)
                    ->where('item_name', 'Air Tawar')
                    ->where('quantity', '10.00')
                    ->where('unit', 'Ton')
                    ->missing('hpp_price')
                    ->missing('selling_price')
                    ->etc())
                ->etc()));
});

test('vessel detail selects the requested visit and otherwise prefers an upcoming visit', function () {
    $user = User::factory()->create();
    $previousVisit = createClearancePortCall($user, [
        'status' => 'anchored',
        'eta_at' => now()->subDay(),
        'arrived_at' => now()->subDay(),
    ]);
    $otherOfficer = User::factory()->create();
    $upcomingVisit = createClearancePortCall($otherOfficer, [
        'ship_id' => $previousVisit->ship_id,
        'eta_at' => now()->addDay(),
    ]);
    $previousActivity = OperationalActivity::create([
        'activity_date' => now()->subDay()->toDateString(),
        'location_name' => 'Dermaga Lama',
        'is_vessel_related' => true,
        'ship_id' => $previousVisit->ship_id,
        'port_call_id' => $previousVisit->id,
        'category' => 'Kegiatan Kapal',
        'title' => 'Aktivitas kunjungan sebelumnya',
        'detail' => 'Aktivitas hanya untuk kunjungan sebelumnya.',
        'created_by' => $user->id,
    ]);
    $upcomingActivity = OperationalActivity::create([
        'activity_date' => now()->addDay()->toDateString(),
        'location_name' => 'Dermaga Baru',
        'is_vessel_related' => true,
        'ship_id' => $upcomingVisit->ship_id,
        'port_call_id' => $upcomingVisit->id,
        'category' => 'Kegiatan Kapal',
        'title' => 'Aktivitas kunjungan berikutnya',
        'detail' => 'Aktivitas hanya untuk kunjungan berikutnya.',
        'created_by' => $otherOfficer->id,
    ]);

    $this->actingAs($user)
        ->get(route('vessels.show', ['id' => $previousVisit->ship_id, 'visit' => $previousVisit->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('selectedPortCallId', $previousVisit->id)
            ->where('selectedVisit.id', $previousVisit->id)
            ->has('vessel.operational_activities', 1)
            ->where('vessel.operational_activities.0.id', $previousActivity->id));

    $this->get(route('vessels.show', $previousVisit->ship_id))
        ->assertInertia(fn (Assert $page) => $page
            ->where('selectedPortCallId', $upcomingVisit->id)
            ->where('selectedVisit.id', $upcomingVisit->id)
            ->has('vessel.operational_activities', 1)
            ->where('vessel.operational_activities.0.id', $upcomingActivity->id));
});

test('vessel detail returns 404 when the requested visit belongs to another ship', function () {
    $user = User::factory()->create();
    $portCall = createClearancePortCall($user);
    $otherOfficer = User::factory()->create();
    $otherPortCall = createClearancePortCall($otherOfficer);

    $this->actingAs($user)
        ->get(route('vessels.show', ['id' => $portCall->ship_id, 'visit' => $otherPortCall->id]))
        ->assertNotFound();
});

test('operational administrators can submit clearance for an assigned officers job', function (string $role) {
    $officer = User::factory()->create();
    $portCall = createClearancePortCall($officer, ['status' => 'berthed']);
    $administrator = User::factory()->create();
    $administrator->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    $this->actingAs($administrator)->patch(route('operations.port-calls.status', $portCall->id), ['status' => 'departed'])
        ->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseHas('port_calls', ['id' => $portCall->id, 'status' => 'berthed']);
    $this->assertDatabaseHas('requests', [
        'port_call_id' => $portCall->id,
        'created_by' => $administrator->id,
        'requested_port_call_status' => 'departed',
    ]);
})->with(['Admin', 'Admin Sistem']);

test('owner can monitor vessel workflow but cannot submit or process clearance', function () {
    $officer = User::factory()->create();
    $portCall = createClearancePortCall($officer);
    $owner = User::factory()->create();
    $owner->assignRole(Role::firstOrCreate(['name' => 'Owner', 'guard_name' => 'web']));

    $this->actingAs($owner)
        ->get(route('vessels.show', $portCall->ship_id))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManageClearance', false)
            ->where('canProcessRequests', false));

    $this->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => 'anchored',
        'expected_status' => 'scheduled',
    ])->assertForbidden();

    $clearanceRequest = ShipRequest::create([
        'request_number' => 'REQ-OWNER-READ-ONLY',
        'ship_id' => $portCall->ship_id,
        'port_call_id' => $portCall->id,
        'created_by' => $officer->id,
        'status' => 'Disetujui',
        'service_type' => 'clearance_in',
        'requested_port_call_status' => 'anchored',
        'request_date' => now()->toDateString(),
    ]);

    $this->patch(route('needs.update-status', $clearanceRequest->id), [
        'status' => 'Dalam Proses',
    ])->assertForbidden();

    $this->patch(route('needs.items.update-status', $clearanceRequest->id), [
        'item_ids' => [Str::uuid()->toString()],
        'status' => 'dalam_proses',
    ])->assertForbidden();

    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Disetujui',
    ]);
    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'scheduled',
    ]);
});

test('clearance in changes vessel status only after director approval and admin completion', function () {
    $this->freezeTime();
    Product::create([
        'code' => 'CLR-IN-TEST',
        'name' => 'Clearance In',
        'category' => 'Clearance',
        'item_type' => 'jasa',
        'unit' => 'Dokumen',
        'hpp_default' => 2500000,
        'selling_price_default' => 4200000,
        'is_active' => true,
    ]);
    $staff = User::factory()->create();
    $portCall = createClearancePortCall($staff);

    $this->actingAs($staff)->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => 'anchored',
        'expected_status' => 'scheduled',
        'occurred_at' => now()->toIso8601String(),
    ])->assertSessionHas('success');

    $clearanceRequest = ShipRequest::where('port_call_id', $portCall->id)
        ->where('service_type', 'clearance_in')
        ->firstOrFail();
    $clearanceItem = $clearanceRequest->items()->firstOrFail();
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $this->actingAs($admin)
        ->post(route('requests.forward-director', $clearanceRequest->id), [
            'selected_items' => [$clearanceItem->id],
        ])
        ->assertSessionHas('success');

    $director = User::factory()->create();
    $director->assignRole(Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']));

    $this->actingAs($director)
        ->post(route('approvals.requests.approve', $clearanceRequest->id))
        ->assertSessionHas('success');

    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Disetujui',
    ]);
    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'scheduled',
        'arrived_at' => null,
    ]);

    $this->actingAs($admin)
        ->patch(route('needs.update-status', $clearanceRequest->id), ['status' => 'Dalam Proses'])
        ->assertSessionHas('success');

    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Dalam Proses',
    ]);
    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'scheduled',
        'arrived_at' => null,
    ]);

    $this->patch(route('needs.update-status', $clearanceRequest->id), ['status' => 'Selesai'])
        ->assertSessionHas('success');

    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Selesai',
        'completed_at' => now()->format('Y-m-d H:i:s'),
    ]);
    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'anchored',
        'arrived_at' => now()->format('Y-m-d H:i:s'),
    ]);
    $this->assertDatabaseHas('ships', [
        'id' => $portCall->ship_id,
        'status' => 'Labuh',
    ]);
});

test('admin processes approved clearance items individually or in bulk before completing the request', function () {
    $this->freezeTime();
    $staff = User::factory()->create();
    $portCall = createClearancePortCall($staff);
    $clearanceRequest = ShipRequest::create([
        'request_number' => 'REQ-ITEM-PROCESSING',
        'ship_id' => $portCall->ship_id,
        'port_call_id' => $portCall->id,
        'created_by' => $staff->id,
        'status' => 'Disetujui',
        'service_type' => 'clearance_in',
        'requested_port_call_status' => 'anchored',
        'operational_occurred_at' => now(),
        'request_date' => now()->toDateString(),
    ]);
    $firstItem = $clearanceRequest->items()->create([
        'item_type' => 'jasa',
        'item_name' => 'Clearance Imigrasi',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 100000,
        'selling_price' => 150000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    $secondItem = $clearanceRequest->items()->create([
        'item_type' => 'jasa',
        'item_name' => 'Clearance Karantina',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 100000,
        'selling_price' => 150000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $this->actingAs($admin)
        ->patch(route('needs.items.update-status', $clearanceRequest->id), [
            'item_ids' => [$firstItem->id],
            'status' => 'dalam_proses',
        ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('request_items', ['id' => $firstItem->id, 'status' => 'dalam_proses']);
    $this->assertDatabaseHas('request_items', ['id' => $secondItem->id, 'status' => 'disetujui']);
    $this->assertDatabaseHas('requests', ['id' => $clearanceRequest->id, 'status' => 'Dalam Proses']);

    $this->patch(route('needs.items.update-status', $clearanceRequest->id), [
        'item_ids' => [$firstItem->id],
        'status' => 'selesai',
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('request_items', ['id' => $firstItem->id, 'status' => 'selesai']);
    $this->assertDatabaseHas('requests', ['id' => $clearanceRequest->id, 'status' => 'Dalam Proses']);
    $this->assertDatabaseHas('port_calls', ['id' => $portCall->id, 'status' => 'scheduled']);

    $this->patch(route('needs.items.update-status', $clearanceRequest->id), [
        'item_ids' => [$secondItem->id],
        'status' => 'dalam_proses',
    ])->assertSessionHasNoErrors();

    $this->patch(route('needs.items.update-status', $clearanceRequest->id), [
        'item_ids' => [$secondItem->id],
        'status' => 'selesai',
    ])->assertSessionHasNoErrors()->assertSessionHas('success');

    $this->assertDatabaseHas('request_items', ['id' => $secondItem->id, 'status' => 'selesai']);
    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Selesai',
        'completed_at' => now()->format('Y-m-d H:i:s'),
    ]);
    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'anchored',
        'arrived_at' => now()->format('Y-m-d H:i:s'),
    ]);
});

test('admin can process a newly approved clearance item after the request was previously completed', function () {
    $this->freezeTime();
    $staff = User::factory()->create();
    $portCall = createClearancePortCall($staff, [
        'status' => 'anchored',
        'arrived_at' => now()->subHour(),
    ]);
    $portCall->ship()->update(['status' => 'Labuh']);
    $clearanceRequest = ShipRequest::create([
        'request_number' => 'REQ-CLEARANCE-REOPENED',
        'ship_id' => $portCall->ship_id,
        'port_call_id' => $portCall->id,
        'created_by' => $staff->id,
        'status' => 'Selesai',
        'service_type' => 'clearance_in',
        'requested_port_call_status' => 'anchored',
        'operational_occurred_at' => now()->subHour(),
        'request_date' => now()->toDateString(),
        'completed_at' => now()->subMinutes(30),
    ]);
    $clearanceRequest->items()->create([
        'item_type' => 'jasa',
        'item_name' => 'Clearance Sebelumnya',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 100000,
        'selling_price' => 150000,
        'status' => 'selesai',
        'director_status' => 'approved',
    ]);
    $newlyApprovedItem = $clearanceRequest->items()->create([
        'item_type' => 'jasa',
        'item_name' => 'Dokumen Tambahan Clearance',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 100000,
        'selling_price' => 150000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $this->actingAs($admin)
        ->patch(route('needs.items.update-status', $clearanceRequest->id), [
            'item_ids' => [$newlyApprovedItem->id],
            'status' => 'dalam_proses',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('request_items', [
        'id' => $newlyApprovedItem->id,
        'status' => 'dalam_proses',
    ]);
    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Dalam Proses',
        'completed_at' => null,
    ]);

    $this->patch(route('needs.items.update-status', $clearanceRequest->id), [
        'item_ids' => [$newlyApprovedItem->id],
        'status' => 'selesai',
    ])->assertRedirect()->assertSessionHasNoErrors()->assertSessionHas('success');

    $this->assertDatabaseHas('request_items', [
        'id' => $newlyApprovedItem->id,
        'status' => 'selesai',
    ]);
    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Selesai',
        'completed_at' => now()->format('Y-m-d H:i:s'),
    ]);
    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'anchored',
    ]);
});

test('admin cannot process an item from another request', function () {
    $staff = User::factory()->create();
    $portCall = createClearancePortCall($staff);
    $firstRequest = ShipRequest::create([
        'request_number' => 'REQ-ITEM-OWNER-A',
        'ship_id' => $portCall->ship_id,
        'port_call_id' => $portCall->id,
        'created_by' => $staff->id,
        'status' => 'Disetujui',
        'request_date' => now()->toDateString(),
    ]);
    $secondRequest = ShipRequest::create([
        'request_number' => 'REQ-ITEM-OWNER-B',
        'ship_id' => $portCall->ship_id,
        'port_call_id' => $portCall->id,
        'created_by' => $staff->id,
        'status' => 'Disetujui',
        'request_date' => now()->toDateString(),
    ]);
    $foreignItem = $secondRequest->items()->create([
        'item_type' => 'jasa',
        'item_name' => 'Item pengajuan lain',
        'unit' => 'Paket',
        'quantity' => 1,
        'hpp_price' => 100000,
        'selling_price' => 150000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $this->actingAs($admin)
        ->patch(route('needs.items.update-status', $firstRequest->id), [
            'item_ids' => [$foreignItem->id],
            'status' => 'dalam_proses',
        ])
        ->assertSessionHasErrors('item_ids.0');

    $this->assertDatabaseHas('request_items', ['id' => $foreignItem->id, 'status' => 'disetujui']);
    $this->assertDatabaseHas('requests', ['id' => $firstRequest->id, 'status' => 'Disetujui']);
});

test('clearance out changes vessel status only after admin completes the approved request', function () {
    $this->freezeTime();
    $staff = User::factory()->create();
    $portCall = createClearancePortCall($staff, [
        'status' => 'berthed',
        'arrived_at' => now()->subDay(),
        'berthed_at' => now()->subHours(12),
    ]);
    $portCall->ship()->update(['status' => 'Sandar']);

    $this->actingAs($staff)->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => 'departed',
        'expected_status' => 'berthed',
        'occurred_at' => now()->toIso8601String(),
    ])->assertSessionHas('success');

    $clearanceRequest = ShipRequest::where('port_call_id', $portCall->id)
        ->where('service_type', 'clearance_out')
        ->firstOrFail();
    $clearanceRequest->update(['status' => 'Dalam Proses']);
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $this->actingAs($admin)
        ->patch(route('needs.update-status', $clearanceRequest->id), ['status' => 'Selesai'])
        ->assertSessionHas('success');

    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Selesai',
        'completed_at' => now()->format('Y-m-d H:i:s'),
    ]);
    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'departed',
        'departed_at' => now()->format('Y-m-d H:i:s'),
    ]);
    $this->assertDatabaseHas('ships', [
        'id' => $portCall->ship_id,
        'status' => 'Selesai',
    ]);
});

test('admin cannot process clearance before director approval', function () {
    $staff = User::factory()->create();
    $portCall = createClearancePortCall($staff);
    $this->actingAs($staff)->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => 'anchored',
        'expected_status' => 'scheduled',
    ]);
    $clearanceRequest = ShipRequest::where('port_call_id', $portCall->id)->firstOrFail();
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $this->actingAs($admin)
        ->patch(route('needs.update-status', $clearanceRequest->id), ['status' => 'Dalam Proses'])
        ->assertSessionHasErrors('status');

    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Menunggu Approval',
    ]);
    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'scheduled',
    ]);
});

test('admin cannot start an approved request while an item still awaits director approval', function () {
    $staff = User::factory()->create();
    $portCall = createClearancePortCall($staff);
    $clearanceRequest = ShipRequest::create([
        'request_number' => 'REQ-PARTIAL-APPROVAL',
        'ship_id' => $portCall->ship_id,
        'port_call_id' => $portCall->id,
        'created_by' => $staff->id,
        'status' => 'Disetujui',
        'service_type' => 'clearance_in',
        'requested_port_call_status' => 'anchored',
        'request_date' => now()->toDateString(),
    ]);
    $clearanceRequest->items()->create([
        'item_type' => 'jasa',
        'item_name' => 'Clearance In',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 1000000,
        'selling_price' => 1500000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $this->actingAs($admin)
        ->patch(route('needs.update-status', $clearanceRequest->id), ['status' => 'Dalam Proses'])
        ->assertSessionHasErrors('status');

    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Disetujui',
    ]);
});

test('non director cannot approve a clearance request', function () {
    $staff = User::factory()->create();
    $portCall = createClearancePortCall($staff);
    $this->actingAs($staff)->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => 'anchored',
        'expected_status' => 'scheduled',
    ]);
    $clearanceRequest = ShipRequest::where('port_call_id', $portCall->id)->firstOrFail();
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $this->actingAs($admin)
        ->post(route('approvals.requests.approve', $clearanceRequest->id))
        ->assertForbidden();

    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Menunggu Approval',
    ]);
    $this->assertDatabaseHas('port_calls', [
        'id' => $portCall->id,
        'status' => 'scheduled',
    ]);
});

test('operational staff cannot mark a clearance request as processed', function () {
    $staff = User::factory()->create();
    $portCall = createClearancePortCall($staff);
    $this->actingAs($staff)->patch(route('operations.port-calls.status', $portCall->id), [
        'status' => 'anchored',
        'expected_status' => 'scheduled',
    ]);
    $clearanceRequest = ShipRequest::where('port_call_id', $portCall->id)->firstOrFail();
    $clearanceRequest->update(['status' => 'Disetujui']);

    $this->patch(route('needs.update-status', $clearanceRequest->id), [
        'status' => 'Dalam Proses',
    ])->assertForbidden();

    $this->assertDatabaseHas('requests', [
        'id' => $clearanceRequest->id,
        'status' => 'Disetujui',
    ]);
});

test('clearance out cannot skip clearance in', function () {
    $user = User::factory()->create();
    $portCall = createClearancePortCall($user);

    $this->actingAs($user)->patch(route('operations.port-calls.status', $portCall->id), ['status' => 'departed'])->assertSessionHasErrors('status');

    $this->assertDatabaseHas('port_calls', ['id' => $portCall->id, 'status' => 'scheduled', 'departed_at' => null]);
    $this->assertDatabaseCount('activity_log', 0);
});
