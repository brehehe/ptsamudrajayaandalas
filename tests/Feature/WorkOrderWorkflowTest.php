<?php

use App\Models\DailyReport;
use App\Models\OperationalActivity;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
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
    $this->assertDatabaseHas('activity_log', [
        'subject_type' => WorkOrder::class,
        'subject_id' => $workOrder->id,
        'causer_id' => $admin->id,
        'log_name' => 'work-order',
    ]);
    Storage::disk('local')->assertExists($workOrder->document_path);
    expect(Schema::getColumnType('activity_log', 'subject_id'))->toBe('varchar');
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
        'document' => 'Dokumen SPK wajib diunggah sebelum SPK disimpan.',
    ]);
    $this->assertDatabaseCount('work_orders', 0);
});

test('a draft spk also requires a private document', function () {
    Storage::fake('local');
    $admin = workOrderUser('Admin');
    $company = ShipCompany::create(['name' => 'PT Validasi Draft SPK', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Validasi Draft SPK', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'IDVDR', 'name' => 'Pelabuhan Validasi Draft', 'city' => 'Gresik', 'is_active' => true]);

    $response = $this->actingAs($admin)->post(route('work-orders.store'), [
        'client_number' => 'SPK/DRAFT/001',
        'company_id' => $company->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'eta_at' => '2026-10-03 09:00:00',
        'activity_name' => 'Keagenan',
        'assigned_to' => $admin->id,
        'status' => 'draft',
    ]);

    $response->assertSessionHasErrors([
        'document' => 'Dokumen SPK wajib diunggah sebelum SPK disimpan.',
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

test('the spk creation screen loads companies and ships and allows storing new company and vessel before spk creation', function () {
    Storage::fake('local');
    $admin = workOrderUser('Admin');
    $company = ShipCompany::create(['name' => 'PT Perusahaan Lama', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Kapal Lama', 'ship_company_id' => $company->id, 'is_active' => true]);

    $this->actingAs($admin)
        ->get(route('work-orders.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('WorkOrders/Create')
            ->has('companies')
            ->has('ships')
        );

    // Storing new company via API/json
    $companyResponse = $this->actingAs($admin)->postJson(route('master.companies.store'), [
        'name' => 'PT Pelayaran Baru Mandiri',
        'code' => 'PBM',
    ])->assertStatus(201);

    $newCompanyId = $companyResponse->json('company.id');

    // Storing new vessel linked to the new company
    $shipResponse = $this->actingAs($admin)->postJson(route('master.vessels.store'), [
        'name' => 'TB Samudra Jaya 01',
        'ship_company_id' => $newCompanyId,
        'ship_type' => 'Tugboat',
    ])->assertStatus(201);

    $newShipId = $shipResponse->json('vessel.id');

    $port = Port::create(['code' => 'IDJKT', 'name' => 'Tanjung Priok', 'city' => 'Jakarta', 'is_active' => true]);

    // Creating SPK with the newly created company and ship
    $spkResponse = $this->actingAs($admin)->post(route('work-orders.store'), [
        'client_number' => 'SPK/PBM/2026/001',
        'company_id' => $newCompanyId,
        'ship_id' => $newShipId,
        'port_id' => $port->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'eta_at' => '2026-10-03 09:00:00',
        'activity_name' => 'Keagenan Tugboat',
        'assigned_to' => $admin->id,
        'status' => 'draft',
        'document' => UploadedFile::fake()->create('spk-draft.pdf', 100, 'application/pdf'),
    ]);

    $spkResponse->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('work_orders', [
        'company_id' => $newCompanyId,
        'planned_ship_id' => $newShipId,
        'client_number' => 'SPK/PBM/2026/001',
    ]);
});

test('authorized users can view an spk detail with its connected operational history', function () {
    $admin = workOrderUser('Admin');
    $company = ShipCompany::create(['name' => 'PT Detail SPK', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Detail SPK', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'IDDET', 'name' => 'Pelabuhan Detail', 'city' => 'Gresik', 'is_active' => true]);
    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-SJA-DETAIL-001',
        'client_number' => 'SPK/DETAIL/001',
        'company_id' => $company->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'status' => 'in_progress',
        'created_by' => $admin->id,
        'assigned_to' => $admin->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
        'planned_eta_at' => '2026-10-03 09:00:00',
    ]);
    $workOrder->items()->create(['name' => 'Keagenan kapal']);
    $portCall = PortCall::create([
        'job_number' => 'JOB-SPK-SJA-DETAIL-001',
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'anchored',
        'eta_at' => '2026-10-03 09:00:00',
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-DETAIL-SPK-001',
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'port_call_id' => $portCall->id,
        'created_by' => $admin->id,
        'status' => 'Disetujui',
        'request_date' => '2026-10-03',
    ]);
    RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Clearance In',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'selling_price' => 4200000,
        'status' => 'approved',
        'director_status' => 'approved',
    ]);
    OperationalActivity::create([
        'activity_date' => '2026-10-03',
        'activity_time' => '10:30',
        'location_name' => 'Pelabuhan Detail',
        'is_vessel_related' => true,
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'category' => 'Kegiatan Kapal',
        'title' => 'Kapal tiba',
        'detail' => 'Kapal tiba di area labuh.',
        'created_by' => $admin->id,
        'vessel_position' => 'anchored',
    ]);
    DailyReport::create([
        'port_call_id' => $portCall->id,
        'officer_id' => $admin->id,
        'report_date' => '2026-10-03',
        'status' => 'submitted',
        'no_activity' => false,
        'summary' => 'Clearance In dan kedatangan selesai dicatat.',
        'submitted_at' => '2026-10-03 17:00:00',
    ]);

    $this->actingAs($admin)
        ->get(route('work-orders.detail', $workOrder))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('WorkOrders/Show')
            ->where('workOrder.system_number', 'SPK-SJA-DETAIL-001')
            ->where('workOrder.port_call.job_number', 'JOB-SPK-SJA-DETAIL-001')
            ->has('requests', 1)
            ->where('requests.0.request_number', 'REQ-DETAIL-SPK-001')
            ->has('requests.0.items', 1)
            ->has('operationalActivities', 1)
            ->has('dailyReports', 1)
            ->where('capabilities.can_view_financial', true)
            ->has('financial')
            ->has('history', 5)
        );
});

test('field staff only see assigned spk details and do not receive financial data', function () {
    $assignedOfficer = workOrderUser('Lapangan');
    $otherOfficer = workOrderUser('Lapangan');
    $company = ShipCompany::create(['name' => 'PT Scope Detail', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Scope Detail', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'IDSCD', 'name' => 'Pelabuhan Scope Detail', 'city' => 'Gresik', 'is_active' => true]);
    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-SJA-SCOPE-DETAIL',
        'company_id' => $company->id,
        'document_date' => '2026-10-01',
        'received_at' => '2026-10-01 08:00:00',
        'status' => 'active',
        'created_by' => $assignedOfficer->id,
        'assigned_to' => $assignedOfficer->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
        'planned_eta_at' => '2026-10-03 09:00:00',
    ]);

    $this->actingAs($assignedOfficer)
        ->get(route('work-orders.detail', $workOrder))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('WorkOrders/Show')
            ->where('capabilities.can_view_financial', false)
            ->where('financial', null)
        );

    $this->actingAs($otherOfficer)
        ->get(route('work-orders.detail', $workOrder))
        ->assertForbidden();
});
