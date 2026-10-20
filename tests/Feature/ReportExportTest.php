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
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->withoutVite();
});

function createExportTestData(User $creator): array
{
    $company = ShipCompany::create([
        'code' => 'EXP-'.Str::upper(Str::random(5)),
        'name' => 'PT Pelayaran Ekspor Samudra',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM Ekspor Nusantara',
        'status' => 'Sandar',
        'is_active' => true,
    ]);
    $port = Port::create([
        'code' => Str::upper(Str::random(8)),
        'name' => 'Pelabuhan Tanjung Perak',
        'city' => 'Surabaya',
        'country' => 'ID',
        'is_active' => true,
    ]);
    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-EXP-'.Str::upper(Str::random(6)),
        'client_number' => 'CLIENT-SPK-999',
        'company_id' => $company->id,
        'status' => 'accepted',
        'created_by' => $creator->id,
    ]);
    $jobNumber = 'JOB-EXP-'.Str::upper(Str::random(6));
    $portCall = PortCall::create([
        'job_number' => $jobNumber,
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'eta_at' => today()->subDays(2),
        'etd_at' => today()->addDays(2),
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'PGJ-EXP-'.Str::upper(Str::random(6)),
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'port_call_id' => $portCall->id,
        'created_by' => $creator->id,
        'status' => 'Disetujui',
        'request_date' => today(),
        'service_type' => 'Kebutuhan Kapal',
        'notes' => 'Permintaan logistik sandar',
    ]);
    $item = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_name' => 'Bongkar Muat & Fresh Water 50 Ton',
        'item_type' => 'barang',
        'unit' => 'Ton',
        'quantity' => 50,
        'hpp_price' => 75000,
        'selling_price' => 95000,
        'status' => 'disetujui',
        'director_status' => 'approved',
        'required_date' => today(),
    ]);

    $invoice = Invoice::create([
        'invoice_number' => 'INV-EXP-'.Str::upper(Str::random(6)),
        'invoice_type' => 'agency',
        'company_id' => $company->id,
        'port_call_id' => $portCall->id,
        'invoice_date' => today(),
        'due_date' => today()->addDays(14),
        'subtotal' => 4750000,
        'grand_total' => 4750000,
        'paid_amount' => 0,
        'outstanding_amount' => 4750000,
        'status' => 'released',
        'created_by' => $creator->id,
    ]);

    return compact('company', 'ship', 'port', 'workOrder', 'portCall', 'shipRequest', 'item', 'invoice', 'jobNumber');
}

test('authorized users can queue and auto-download vessel daily expenses in both excel and pdf (overall and per job)', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $data = createExportTestData($admin);

    // 1. Overall Vessel Daily Expenses in Excel
    $response = $this->actingAs($admin)->postJson(route('reports.exports.store'), [
        'report_type' => 'vessel_daily_expenses',
        'format' => 'xlsx',
        'parameters' => [
            'from' => today()->subMonth()->toDateString(),
            'to' => today()->toDateString(),
        ],
    ]);

    $response->assertStatus(202)
        ->assertJsonStructure(['id', 'status', 'message']);

    $exportId = $response->json('id');
    expect($exportId)->toBeString();

    // Check status
    $statusResponse = $this->getJson(route('reports.exports.status', $exportId));
    $statusResponse->assertOk()
        ->assertJson([
            'id' => $exportId,
            'status' => 'completed',
        ])
        ->assertJsonStructure(['download_url', 'filename']);

    // Download the Excel file
    $download = $this->get($statusResponse->json('download_url'));
    $download->assertOk()
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    $tempFile = $download->baseResponse->getFile()->getPathname();
    $archive = new ZipArchive;
    expect($archive->open($tempFile))->toBeTrue();
    $sheetXml = $archive->getFromName('xl/worksheets/sheet1.xml');
    $archive->close();
    expect($sheetXml)->toContain('LAPORAN PENGELUARAN HARIAN KAPAL');
    expect($sheetXml)->toContain($data['jobNumber']);
    expect($sheetXml)->toContain('Total Kapal Terdata:');
    expect($sheetXml)->toContain('Total Item Kebutuhan:');
    expect($sheetXml)->toContain('Total Pengeluaran (HPP):');

    // 2. Per-Job Vessel Daily Expenses in PDF
    $pdfJobResponse = $this->actingAs($admin)->postJson(route('reports.exports.store'), [
        'report_type' => 'vessel_daily_expenses',
        'format' => 'pdf',
        'job_number' => $data['jobNumber'],
        'parameters' => [
            'from' => today()->subMonth()->toDateString(),
            'to' => today()->toDateString(),
        ],
    ]);

    $pdfJobResponse->assertStatus(202);
    $pdfExportId = $pdfJobResponse->json('id');

    $pdfStatus = $this->getJson(route('reports.exports.status', $pdfExportId));
    $pdfStatus->assertOk()->assertJson(['status' => 'completed']);

    $pdfDownload = $this->get($pdfStatus->json('download_url'));
    $pdfDownload->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    $pdfContent = file_get_contents($pdfDownload->baseResponse->getFile()->getPathname());
    expect($pdfContent)
        ->toStartWith('%PDF-1.4')
        ->toContain('PENGELUARAN HARIAN KAPAL')
        ->toContain($data['jobNumber'])
        ->toContain('Total Kapal Terdata')
        ->toContain('Total Item Kebutuhan')
        ->toContain('Total Pengeluaran');
});

test('authorized users can queue and download margin and invoice reports in pdf and excel', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    $data = createExportTestData($admin);

    // Margin Report in PDF
    $marginResponse = $this->actingAs($admin)->postJson(route('reports.exports.store'), [
        'report_type' => 'margin',
        'format' => 'pdf',
        'parameters' => [
            'from' => today()->subMonth()->toDateString(),
            'to' => today()->toDateString(),
        ],
    ]);
    $marginResponse->assertStatus(202);
    $marginId = $marginResponse->json('id');

    $marginStatus = $this->getJson(route('reports.exports.status', $marginId));
    $marginStatus->assertOk()->assertJson(['status' => 'completed']);

    $marginPdf = $this->get($marginStatus->json('download_url'));
    $marginPdf->assertOk()->assertHeader('content-type', 'application/pdf');
    $marginContent = file_get_contents($marginPdf->baseResponse->getFile()->getPathname());
    expect($marginContent)->toStartWith('%PDF-1.4')->toContain('LAPORAN MARGIN PER JOB');

    // Invoice Report in Excel
    $invoiceResponse = $this->actingAs($admin)->postJson(route('reports.exports.store'), [
        'report_type' => 'invoices',
        'format' => 'xlsx',
        'parameters' => [
            'from' => today()->subMonth()->toDateString(),
            'to' => today()->toDateString(),
        ],
    ]);
    $invoiceResponse->assertStatus(202);
    $invoiceId = $invoiceResponse->json('id');

    $invoiceStatus = $this->getJson(route('reports.exports.status', $invoiceId));
    $invoiceStatus->assertOk()->assertJson(['status' => 'completed']);

    $invoiceXlsx = $this->get($invoiceStatus->json('download_url'));
    $invoiceXlsx->assertOk()->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Receivables Report in PDF
    $recResponse = $this->actingAs($admin)->postJson(route('reports.exports.store'), [
        'report_type' => 'receivables',
        'format' => 'pdf',
    ]);
    $recResponse->assertStatus(202);
    $recStatus = $this->getJson(route('reports.exports.status', $recResponse->json('id')));
    $recStatus->assertOk()->assertJson(['status' => 'completed']);
    $recPdf = $this->get($recStatus->json('download_url'));
    $recPdf->assertOk()->assertHeader('content-type', 'application/pdf');

    // Expenses Report in Excel
    $expResponse = $this->actingAs($admin)->postJson(route('reports.exports.store'), [
        'report_type' => 'expenses',
        'format' => 'xlsx',
    ]);
    $expResponse->assertStatus(202);
    $expStatus = $this->getJson(route('reports.exports.status', $expResponse->json('id')));
    $expStatus->assertOk()->assertJson(['status' => 'completed']);
    $expXlsx = $this->get($expStatus->json('download_url'));
    $expXlsx->assertOk()->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Activities Report in PDF
    $actResponse = $this->actingAs($admin)->postJson(route('reports.exports.store'), [
        'report_type' => 'activities',
        'format' => 'pdf',
    ]);
    $actResponse->assertStatus(202);
    $actStatus = $this->getJson(route('reports.exports.status', $actResponse->json('id')));
    $actStatus->assertOk()->assertJson(['status' => 'completed']);
    $actPdf = $this->get($actStatus->json('download_url'));
    $actPdf->assertOk()->assertHeader('content-type', 'application/pdf');

    // Requests Report in Excel
    $reqResponse = $this->actingAs($admin)->postJson(route('reports.exports.store'), [
        'report_type' => 'requests',
        'format' => 'xlsx',
    ]);
    $reqResponse->assertStatus(202);
    $reqStatus = $this->getJson(route('reports.exports.status', $reqResponse->json('id')));
    $reqStatus->assertOk()->assertJson(['status' => 'completed']);
    $reqXlsx = $this->get($reqStatus->json('download_url'));
    $reqXlsx->assertOk()->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('unauthorized users cannot access export endpoints', function () {
    $fieldStaff = User::factory()->create();
    $fieldStaff->assignRole(Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']));

    $this->actingAs($fieldStaff)
        ->postJson(route('reports.exports.store'), [
            'report_type' => 'margin',
            'format' => 'pdf',
        ])
        ->assertForbidden();
});
