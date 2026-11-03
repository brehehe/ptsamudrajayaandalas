<?php

use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->withoutVite();
});

test('expense report only displays approved request items and excludes pending or rejected items', function () {
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);

    $admin = User::factory()->create();
    $admin->assignRole('Admin');

    $company = ShipCompany::create([
        'code' => 'TEST-'.Str::upper(Str::random(4)),
        'name' => 'PT Pengeluaran Disetujui',
        'is_active' => true,
    ]);

    $ship = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM Uji Laporan',
        'status' => 'Sandar',
        'is_active' => true,
    ]);

    $port = Port::create([
        'code' => Str::upper(Str::random(6)),
        'name' => 'Pelabuhan Gresik',
        'city' => 'Gresik',
        'country' => 'ID',
        'is_active' => true,
    ]);

    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-'.Str::upper(Str::random(6)),
        'client_number' => 'CLIENT-99',
        'company_id' => $company->id,
        'status' => 'accepted',
        'created_by' => $admin->id,
    ]);

    $portCall = PortCall::create([
        'job_number' => 'JOB-LAP-'.Str::upper(Str::random(5)),
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'eta_at' => today()->subDays(2),
        'etd_at' => today()->addDays(2),
    ]);

    $reqVessel = ShipRequest::create([
        'request_number' => 'PGJ-VESSEL-'.Str::upper(Str::random(5)),
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'port_call_id' => $portCall->id,
        'request_type' => 'deck',
        'status' => 'diproses',
        'request_date' => today()->toDateString(),
        'created_by' => $admin->id,
    ]);

    // 1 approved item (Rp 1.000.000)
    RequestItem::create([
        'request_id' => $reqVessel->id,
        'item_name' => 'Item Disetujui Kapal',
        'item_type' => 'deck',
        'quantity' => 2,
        'unit' => 'Pcs',
        'hpp_price' => 500000,
        'director_status' => 'approved',
        'status' => 'disetujui',
        'required_date' => today()->toDateString(),
    ]);

    // 1 pending item (Rp 2.000.000) - MUST NOT APPEAR
    RequestItem::create([
        'request_id' => $reqVessel->id,
        'item_name' => 'Item Pending Belum Diapprove',
        'item_type' => 'deck',
        'quantity' => 1,
        'unit' => 'Unit',
        'hpp_price' => 2000000,
        'director_status' => 'pending',
        'status' => 'menunggu_persetujuan_direktur',
        'required_date' => today()->toDateString(),
    ]);

    // Non-vessel request
    $reqNonVessel = ShipRequest::create([
        'request_number' => 'PGJ-NONV-'.Str::upper(Str::random(5)),
        'ship_id' => null,
        'port_call_id' => null,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'service_type' => 'Biaya Operasional Kantor',
        'request_type' => 'deck',
        'status' => 'disetujui',
        'request_date' => today()->toDateString(),
        'created_by' => $admin->id,
    ]);

    // 1 approved non-vessel item (Rp 750.000)
    RequestItem::create([
        'request_id' => $reqNonVessel->id,
        'item_name' => 'ATK Kantor Disetujui',
        'item_type' => 'service',
        'quantity' => 3,
        'unit' => 'Rim',
        'hpp_price' => 250000,
        'director_status' => 'approved',
        'status' => 'disetujui',
        'required_date' => today()->toDateString(),
    ]);

    // 1 rejected non-vessel item (Rp 1.500.000) - MUST NOT APPEAR
    RequestItem::create([
        'request_id' => $reqNonVessel->id,
        'item_name' => 'Item Ditolak',
        'item_type' => 'service',
        'quantity' => 1,
        'unit' => 'Set',
        'hpp_price' => 1500000,
        'director_status' => 'rejected',
        'status' => 'ditolak',
        'required_date' => today()->toDateString(),
    ]);

    // Check Inertia response for reports/expenses
    $this->actingAs($admin)
        ->get(route('reports.expenses', [
            'from' => today()->subDays(5)->toDateString(),
            'to' => today()->addDays(5)->toDateString(),
            'job' => $portCall->job_number,
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Index')
            ->where('filters.tab', 'pengeluaran')
            ->has('vesselDailyExpenseSummary.vessels', 1)
            ->where('vesselDailyExpenseSummary.vessels.0.item_count', 1)
            ->where('vesselDailyExpenseSummary.vessels.0.total_expense', 1000000)
            ->where('vesselDailyExpenseSummary.vessels.0.items.0.item_name', 'Item Disetujui Kapal')
        );

    // Check Export endpoint
    $response = $this->actingAs($admin)->postJson(route('reports.exports.store'), [
        'report_type' => 'vessel_daily_expenses',
        'format' => 'xlsx',
        'parameters' => [
            'from' => today()->subDays(5)->toDateString(),
            'to' => today()->addDays(5)->toDateString(),
            'ship_id' => $ship->id,
        ],
    ]);

    $response->assertStatus(202)
        ->assertJsonStructure(['id', 'status', 'message']);
});
