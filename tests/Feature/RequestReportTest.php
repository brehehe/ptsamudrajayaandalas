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

function createPrintableRequest(User $creator, array $attributes = []): ShipRequest
{
    $company = ShipCompany::create([
        'code' => 'RPT-'.Str::upper(Str::random(5)),
        'name' => 'PT Klien Laporan Pengajuan',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM Laporan Samudra',
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);
    $port = Port::create([
        'code' => Str::upper(Str::random(8)),
        'name' => 'Pelabuhan Laporan',
        'city' => 'Gresik',
        'country' => 'ID',
        'is_active' => true,
    ]);
    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-RPT-'.Str::upper(Str::random(6)),
        'company_id' => $company->id,
        'status' => 'accepted',
        'created_by' => $creator->id,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-RPT-'.Str::upper(Str::random(6)),
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'scheduled',
        'eta_at' => today(),
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'PGJ-RPT-'.Str::upper(Str::random(6)),
        'batch_number' => 'PGJ-BATCH-'.Str::upper(Str::random(5)),
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'port_call_id' => $portCall->id,
        'created_by' => $creator->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => today(),
        'service_type' => 'Kebutuhan Kapal',
        'notes' => 'Mohon diproses untuk kebutuhan operasional kapal.',
        'admin_forward_notes' => 'Dokumen pendukung telah diperiksa.',
        ...$attributes,
    ]);

    RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_name' => 'Pembayaran EPB (Pandu Tunda)',
        'item_type' => 'jasa',
        'unit' => 'Kegiatan',
        'quantity' => 2,
        'hpp_price' => 125000,
        'selling_price' => 0,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    return $shipRequest;
}

test('authorized finance roles can filter the request report with server side data', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $shipRequest = createPrintableRequest($admin);

    expect(ShipRequest::query()
        ->whereDate('request_date', today())
        ->where('status', 'Menunggu Approval Direktur')
        ->where('request_number', $shipRequest->request_number)
        ->count())->toBe(1);
    $this->actingAs($admin)
        ->get(route('reports.requests', [
            'from' => today()->toDateString(),
            'to' => today()->toDateString(),
            'search' => $shipRequest->request_number,
            'status' => 'Menunggu Approval Direktur',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Requests')
            ->where('filters.from', today()->toDateString())
            ->where('filters.to', today()->toDateString())
            ->where('filters.search', $shipRequest->request_number)
            ->where('filters.status', 'Menunggu Approval Direktur')
            ->where('summary.total_requests', 1)
            ->where('summary.total_items', 1)
            ->where('summary.total_hpp', 250000)
            ->has('requests.data', 1)
            ->where('requests.data.0.request_number', $shipRequest->request_number)
            ->where('requests.data.0.item_count', 1)
            ->where('requests.data.0.total_hpp', 250000)
            ->where('can_export', true)
        );
});

test('authorized users can export the filtered request report as an excel workbook', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $includedRequest = createPrintableRequest($admin);
    $excludedRequest = createPrintableRequest($admin, [
        'status' => 'Selesai',
    ]);

    $filename = 'laporan-pengajuan-'.today()->toDateString().'-sampai-'.today()->toDateString().'.xlsx';
    $response = $this->actingAs($admin)->get(route('reports.requests.export', [
        'from' => today()->toDateString(),
        'to' => today()->toDateString(),
        'status' => 'Menunggu Approval Direktur',
    ]));

    $response->assertDownload($filename)
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        ->assertHeader('cache-control', 'max-age=0, no-store, private');

    $workbookPath = $response->baseResponse->getFile()->getPathname();
    $archive = new ZipArchive;
    expect($archive->open($workbookPath))->toBeTrue();
    $worksheet = $archive->getFromName('xl/worksheets/sheet1.xml');
    $styles = $archive->getFromName('xl/styles.xml');
    $archive->close();

    expect($worksheet)
        ->toBeString()
        ->toContain('LAPORAN PENGAJUAN')
        ->toContain($includedRequest->request_number)
        ->toContain('Pembayaran EPB (Pandu Tunda)')
        ->not->toContain($excludedRequest->request_number);
    expect($styles)
        ->toBeString()
        ->toContain('&quot;Rp&quot; #,##0');

    @unlink($workbookPath);
});

test('authorized users can preview and download a generated request report pdf', function () {
    $director = User::factory()->create();
    $director->assignRole(Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']));
    $shipRequest = createPrintableRequest($director);

    $preview = $this->actingAs($director)->get(route('reports.requests.document', $shipRequest));
    $preview->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertHeader('cache-control', 'max-age=0, no-store, private')
        ->assertHeader('content-disposition', 'inline; filename="laporan-pengajuan-'.str($shipRequest->request_number)->slug('-').'.pdf"');
    expect($preview->getContent())
        ->toStartWith('%PDF-1.4')
        ->toContain('LAPORAN PENGAJUAN')
        ->toContain($shipRequest->request_number)
        ->toContain('Pembayaran EPB');

    $this->get(route('reports.requests.document', [
        'shipRequest' => $shipRequest,
        'download' => 1,
    ]))->assertOk()->assertHeader(
        'content-disposition',
        'attachment; filename="laporan-pengajuan-'.str($shipRequest->request_number)->slug('-').'.pdf"',
    );
});

test('operational staff cannot access financial request reports', function () {
    $staff = User::factory()->create();
    $staff->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));
    $shipRequest = createPrintableRequest($staff);

    $this->actingAs($staff)->get(route('reports.requests'))->assertForbidden();
    $this->get(route('reports.requests.export'))->assertForbidden();
    $this->get(route('reports.requests.document', $shipRequest))->assertForbidden();
});

test('authorized users can filter request reports with company_id, ship_id, and string job number without query errors', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $shipRequest = createPrintableRequest($admin);
    $jobNumber = $shipRequest->portCall->job_number;

    $this->actingAs($admin)
        ->get(route('reports.requests', [
            'company_id' => $shipRequest->company_id,
            'ship_id' => $shipRequest->ship_id,
            'job' => $jobNumber,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Requests')
            ->where('filters.company_id', $shipRequest->company_id)
            ->where('filters.ship_id', $shipRequest->ship_id)
            ->where('filters.job', $jobNumber)
            ->has('requests.data', 1)
            ->has('companies')
            ->has('ships')
            ->has('jobs')
        );

    // Also test with non-matching string job number (non-UUID) that caused SQLSTATE[22P02] previously
    $this->actingAs($admin)
        ->get(route('reports.requests', [
            'job' => 'JOB-SPK-SJA-261014-GYVTNK',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Requests')
            ->has('requests.data', 0)
        );
});

test('reports margin endpoint handles non-uuid job numbers without postgres uuid syntax error', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $this->actingAs($admin)
        ->get(route('reports.margin', [
            'from' => '2026-10-01',
            'to' => '2026-10-31',
            'job' => 'JOB-SPK-SJA-261014-GYVTNK',
            'sort' => 'date',
            'direction' => 'desc',
        ]))
        ->assertOk();
});
