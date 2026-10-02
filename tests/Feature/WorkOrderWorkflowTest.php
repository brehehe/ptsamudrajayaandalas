<?php

use App\Models\Port;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function workOrderUser(string $role): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

test('admin creates an spk with one reusable ship visit and a private document', function () {
    Storage::fake('local');
    $admin = workOrderUser('Admin');
    $officer = workOrderUser('Lapangan');
    $company = ShipCompany::create(['name' => 'PT Klien SPK', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Workflow SPK', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'IDWOR', 'name' => 'Pelabuhan Workflow', 'city' => 'Gresik', 'is_active' => true]);

    $response = $this->actingAs($admin)->post(route('work-orders.store'), [
        'client_number' => 'SPK/KLIEN/001',
        'company_id' => $company->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'eta_at' => '2026-10-03 09:00:00',
        'etd_at' => '2026-10-05 17:00:00',
        'activity_name' => 'Bongkar muat',
        'activity_description' => 'Kegiatan sesuai dokumen klien.',
        'assigned_to' => $officer->id,
        'status' => 'active',
        'document' => UploadedFile::fake()->create('spk.pdf', 100, 'application/pdf'),
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $workOrder = WorkOrder::query()->firstOrFail();
    expect($workOrder->status)->toBe('active');
    $this->assertDatabaseHas('work_order_items', ['work_order_id' => $workOrder->id, 'name' => 'Bongkar muat']);
    $this->assertDatabaseHas('port_calls', ['work_order_id' => $workOrder->id, 'ship_id' => $ship->id, 'status' => 'scheduled']);
    Storage::disk('local')->assertExists($workOrder->document_path);
});

test('spk rejects a ship that does not belong to the selected company', function () {
    $admin = workOrderUser('Admin');
    $officer = workOrderUser('Lapangan');
    $company = ShipCompany::create(['name' => 'PT Klien A', 'is_active' => true]);
    $otherCompany = ShipCompany::create(['name' => 'PT Klien B', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Beda Perusahaan', 'ship_company_id' => $otherCompany->id, 'is_active' => true]);
    $port = Port::create(['code' => 'IDMIS', 'name' => 'Pelabuhan Uji', 'city' => 'Gresik', 'is_active' => true]);

    $response = $this->actingAs($admin)->post(route('work-orders.store'), [
        'client_number' => 'SPK/KLIEN/BEDA/001',
        'company_id' => $company->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'eta_at' => '2026-10-03 09:00:00',
        'activity_name' => 'Keagenan',
        'assigned_to' => $officer->id,
        'status' => 'draft',
    ]);

    $response->assertSessionHasErrors('ship_id');
    $this->assertDatabaseCount('work_orders', 0);
    $this->assertDatabaseCount('port_calls', 0);
});

test('director cannot create an spk and an assigned officer cannot skip its status sequence', function () {
    $director = workOrderUser('Direktur');
    $officer = workOrderUser('Lapangan');
    $company = ShipCompany::create(['name' => 'PT Role SPK', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Role SPK', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'IDROL', 'name' => 'Pelabuhan Role', 'city' => 'Gresik', 'is_active' => true]);

    $this->actingAs($director)->post(route('work-orders.store'), [
        'company_id' => $company->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'eta_at' => '2026-10-03 09:00:00',
        'activity_name' => 'Keagenan',
        'assigned_to' => $officer->id,
        'status' => 'draft',
    ])->assertForbidden();

    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-SJA-TEST-001',
        'client_number' => 'SPK/ROLE/001',
        'company_id' => $company->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'status' => 'active',
        'created_by' => $officer->id,
        'assigned_to' => $officer->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
        'planned_eta_at' => '2026-10-03 09:00:00',
    ]);

    $this->actingAs($officer)->patch(route('work-orders.status', $workOrder), ['status' => 'closed'])
        ->assertSessionHasErrors('status');
    expect($workOrder->fresh()->status)->toBe('active');
});

test('an active spk requires a client number and private document', function () {
    Storage::fake('local');
    $admin = workOrderUser('Admin');
    $officer = workOrderUser('Lapangan');
    $company = ShipCompany::create(['name' => 'PT Validasi SPK', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Validasi SPK', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'IDVAL', 'name' => 'Pelabuhan Validasi', 'city' => 'Gresik', 'is_active' => true]);

    $response = $this->actingAs($admin)->post(route('work-orders.store'), [
        'company_id' => $company->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'eta_at' => '2026-10-03 09:00:00',
        'activity_name' => 'Keagenan',
        'assigned_to' => $officer->id,
        'status' => 'active',
    ]);

    $response->assertSessionHasErrors([
        'client_number' => 'Nomor SPK klien wajib diisi.',
        'document' => 'Dokumen SPK wajib diunggah sebelum SPK langsung diaktifkan.',
    ]);
    $this->assertDatabaseCount('work_orders', 0);
});

test('field staff can only assign a new spk to themselves', function () {
    $officer = workOrderUser('Lapangan');
    $otherOfficer = workOrderUser('Lapangan');
    $company = ShipCompany::create(['name' => 'PT Scope SPK', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Scope SPK', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'IDSCP', 'name' => 'Pelabuhan Scope', 'city' => 'Gresik', 'is_active' => true]);

    $response = $this->actingAs($officer)->post(route('work-orders.store'), [
        'client_number' => 'SPK/SCOPE/001',
        'company_id' => $company->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'eta_at' => '2026-10-03 09:00:00',
        'activity_name' => 'Keagenan',
        'assigned_to' => $otherOfficer->id,
        'status' => 'draft',
    ]);

    $response->assertSessionHasErrors([
        'assigned_to' => 'Operasional hanya dapat menugaskan SPK kepada dirinya sendiri.',
    ]);
    $this->assertDatabaseCount('work_orders', 0);
});

test('field staff can complete operations but cannot advance the administrative stages', function () {
    $officer = workOrderUser('Lapangan');
    $company = ShipCompany::create(['name' => 'PT Tahap SPK', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Tahap SPK', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'IDSTG', 'name' => 'Pelabuhan Tahap', 'city' => 'Gresik', 'is_active' => true]);
    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-SJA-TEST-002',
        'client_number' => 'SPK/TAHAP/002',
        'company_id' => $company->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'status' => 'in_progress',
        'created_by' => $officer->id,
        'assigned_to' => $officer->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
        'planned_eta_at' => '2026-10-03 09:00:00',
    ]);

    $this->actingAs($officer)
        ->patch(route('work-orders.status', $workOrder), ['status' => 'operational_completed'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($workOrder->fresh()->status)->toBe('operational_completed');

    $this->actingAs($officer)
        ->patch(route('work-orders.status', $workOrder), ['status' => 'awaiting_completion_note'])
        ->assertForbidden();

    expect($workOrder->fresh()->status)->toBe('operational_completed');
});

test('the spk creation screen follows role access and scopes field assignments', function () {
    $officer = workOrderUser('Lapangan');
    $otherOfficer = workOrderUser('Lapangan');
    $director = workOrderUser('Direktur');

    $this->actingAs($officer)
        ->get(route('work-orders.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('WorkOrders/Create')
            ->where('defaultAssigneeId', $officer->id)
            ->where('canManageMasterVessels', false)
            ->has('assignees', 1)
            ->where('assignees.0.id', $officer->id)
        );

    $this->actingAs($director)
        ->get(route('work-orders.create'))
        ->assertForbidden();

    expect($otherOfficer->id)->not->toBe($officer->id);
});
