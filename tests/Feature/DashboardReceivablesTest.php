<?php

use App\Models\Invoice;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('dashboard groups outstanding client invoices by company in descending balance order', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $alpha = ShipCompany::create(['name' => 'PT Alpha Maritim', 'is_active' => true]);
    $beta = ShipCompany::create(['name' => 'PT Beta Pelayaran', 'is_active' => true]);

    Invoice::create([
        'invoice_number' => 'INV-ALPHA-001',
        'company_id' => $alpha->id,
        'invoice_date' => today()->subMonth(),
        'due_date' => today()->subDays(10),
        'grand_total' => 150_000_000,
        'outstanding_amount' => 150_000_000,
        'status' => 'sent',
    ]);
    Invoice::create([
        'invoice_number' => 'INV-ALPHA-002',
        'company_id' => $alpha->id,
        'invoice_date' => today(),
        'due_date' => today()->addDays(10),
        'grand_total' => 50_000_000,
        'outstanding_amount' => 50_000_000,
        'status' => 'sent',
    ]);
    Invoice::create([
        'invoice_number' => 'INV-BETA-001',
        'company_id' => $beta->id,
        'invoice_date' => today()->subMonths(2),
        'due_date' => today()->subDays(45),
        'grand_total' => 75_000_000,
        'outstanding_amount' => 75_000_000,
        'status' => 'sent',
    ]);

    $response = $this->actingAs($admin)->get('/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Dashboard')
        ->where('financial_overview.aging.total', 275_000_000)
        ->where('financial_overview.aging.current', 50_000_000)
        ->where('financial_overview.aging.overdue_30', 150_000_000)
        ->where('financial_overview.aging.overdue_60', 75_000_000)
        ->has('financial_overview.receivables_by_company', 2)
        ->where('financial_overview.receivables_by_company.0.company_name', 'PT Alpha Maritim')
        ->where('financial_overview.receivables_by_company.0.invoice_count', 2)
        ->where('financial_overview.receivables_by_company.0.overdue_count', 1)
        ->where('financial_overview.receivables_by_company.0.outstanding_amount', 200_000_000)
        ->where('financial_overview.receivables_by_company.1.company_name', 'PT Beta Pelayaran')
        ->where('financial_overview.receivables_by_company.1.outstanding_amount', 75_000_000)
    );
});

test('dashboard shows active visit dates without time and excludes completed visits', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $company = ShipCompany::create([
        'name' => 'PT Dashboard Kapal',
        'code' => 'DSH',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'name' => 'KM Dashboard Aktif',
        'ship_company_id' => $company->id,
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $completedShip = Ship::create([
        'name' => 'KM Dashboard Selesai',
        'ship_company_id' => $company->id,
        'status' => 'Selesai',
        'is_active' => true,
    ]);
    $port = Port::create([
        'name' => 'Pelabuhan Dashboard',
        'code' => 'DSB',
        'city' => 'Gresik',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);
    $activeVisit = PortCall::create([
        'job_number' => 'JOB-DASHBOARD-ACTIVE',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'scheduled',
        'eta_at' => today()->setTime(10, 13),
    ]);
    PortCall::create([
        'job_number' => 'JOB-DASHBOARD-COMPLETED',
        'ship_id' => $completedShip->id,
        'port_id' => $port->id,
        'status' => 'completed',
        'eta_at' => today()->setTime(9, 0),
        'departed_at' => today()->setTime(17, 30),
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('today_ships', 1)
            ->where('today_ships.0.id', $activeVisit->id)
            ->where('today_ships.0.eta', today()->format('d M Y'))
            ->where('kpi.ships_by_status.selesai', 1)
        );
});
