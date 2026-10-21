<?php

use App\Models\Invoice;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->withoutVite();
});

function createSummaryTestData(User $creator): array
{
    $company = ShipCompany::create([
        'code' => 'SJA-'.Str::upper(Str::random(5)),
        'name' => 'PT Pelayaran Samudra Nusantara',
        'is_active' => true,
    ]);

    $ship = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM Samudra Perkasa',
        'ship_type' => 'Tugboat',
        'gross_tonnage' => 1500,
        'status' => 'Sandar',
        'is_active' => true,
    ]);

    $port = Port::create([
        'code' => Str::upper(Str::random(8)),
        'name' => 'Pelabuhan Tanjung Priok',
        'city' => 'Jakarta',
        'country' => 'ID',
        'is_active' => true,
    ]);

    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-VS-'.Str::upper(Str::random(6)),
        'client_number' => 'CLIENT-VS-001',
        'company_id' => $company->id,
        'status' => 'accepted',
        'created_by' => $creator->id,
    ]);

    $jobNumber = 'JOB-VS-'.Str::upper(Str::random(6));

    $portCall = PortCall::create([
        'job_number' => $jobNumber,
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'eta_at' => today()->startOfMonth()->addDays(2),
        'etd_at' => today()->startOfMonth()->addDays(5),
    ]);

    $invoice = Invoice::create([
        'port_call_id' => $portCall->id,
        'company_id' => $company->id,
        'invoice_number' => 'INV-VS-'.Str::upper(Str::random(6)),
        'invoice_type' => 'agency',
        'invoice_date' => today()->startOfMonth()->addDays(3),
        'subtotal' => 10000000,
        'tax_amount' => 1100000,
        'grand_total' => 11100000,
        'paid_amount' => 6000000,
        'outstanding_amount' => 5100000,
        'status' => 'sent',
        'created_by' => $creator->id,
    ]);

    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-VS-'.Str::upper(Str::random(6)),
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'port_call_id' => $portCall->id,
        'request_date' => today()->startOfMonth()->addDays(2),
        'service_type' => 'operational',
        'status' => 'Disetujui',
        'created_by' => $creator->id,
    ]);

    RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_name' => 'Bongkar Pasang Mesin',
        'item_type' => 'Sparepart & Mesin',
        'quantity' => 2,
        'unit' => 'Pcs',
        'hpp_price' => 2000000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);

    return compact('company', 'ship', 'port', 'workOrder', 'portCall', 'invoice', 'shipRequest');
}

test('user can access /summary-vessel and see fleet summary metrics', function () {
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Direktur');

    $data = createSummaryTestData($user);

    $response = $this->actingAs($user)->get('/summary-vessel');

    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Reports/VesselSummary')
        ->has('vessels')
        ->has('summary')
        ->where('summary.total_jobs', fn ($val) => $val >= 1)
        ->where('summary.fleet_revenue', fn ($val) => (float) $val >= 11100000)
        ->where('summary.fleet_expense', fn ($val) => (float) $val >= 4000000)
        ->where('summary.fleet_margin', fn ($val) => (float) $val >= 7100000)
    );
});

test('user can access /reports/summary-vessel alias', function () {
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Direktur');

    $response = $this->actingAs($user)->get('/reports/summary-vessel');
    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Reports/VesselSummary')
    );
});

test('vessel summary filters work for search and company', function () {
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Direktur');

    $data = createSummaryTestData($user);

    // Search by ship name
    $response = $this->actingAs($user)->get('/summary-vessel?search=Samudra+Perkasa');
    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Reports/VesselSummary')
        ->where('vessels.0.name', 'KM Samudra Perkasa')
    );

    // Filter by company_id
    $responseCompany = $this->actingAs($user)->get('/summary-vessel?company_id='.$data['company']->id);
    $responseCompany->assertOk();
    $responseCompany->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Reports/VesselSummary')
        ->where('vessels.0.company.id', $data['company']->id)
    );
});

test('user can export vessel summary to xlsx', function () {
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Direktur');

    createSummaryTestData($user);

    $response = $this->actingAs($user)->get('/summary-vessel/export?format=xlsx');

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('user can export vessel summary to pdf', function () {
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Direktur');

    createSummaryTestData($user);

    $response = $this->actingAs($user)->get('/summary-vessel/export?format=pdf');

    $response->assertOk();
    $response->assertHeader('content-type', 'application/pdf');
});

test('consolidated /reports/expenses and /reports/vessel-daily-expenses both function properly', function () {
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Direktur');

    createSummaryTestData($user);

    // Main unified expenses report
    $respExpenses = $this->actingAs($user)->get('/reports/expenses');
    $respExpenses->assertOk();
    $respExpenses->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Reports/Index')
        ->has('expenseReport')
        ->has('vesselDailyExpenseSummary')
    );

    // Vessel daily expenses route
    $respVesselExpenses = $this->actingAs($user)->get('/reports/vessel-daily-expenses');
    $respVesselExpenses->assertOk();
    $respVesselExpenses->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Reports/Index')
        ->has('vesselDailyExpenseSummary')
    );
});
