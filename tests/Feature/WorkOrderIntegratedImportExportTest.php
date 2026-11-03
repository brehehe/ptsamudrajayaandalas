<?php

use App\Models\Invoice;
use App\Models\InvoiceItemSource;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\DataImportExportService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $this->admin = User::factory()->create();
    $this->admin->syncRoles(['Admin']);
});

test('user can download work-orders template containing 22 vertical columns with separated line_no and 19 integrated example rows', function () {
    $service = app(DataImportExportService::class);
    $columns = $service->getColumns('work-orders');
    $sampleRows = $service->getSampleRows('work-orders');

    expect($columns)->toHaveCount(22)
        ->and($sampleRows)->toHaveCount(19);

    // Verify SPK 1: 1 SPK + 4 Pengajuan + 2 Reimburse + 1 Agency = 8 rows
    expect($sampleRows[0])->toHaveCount(22)
        ->and($sampleRows[0][0])->toBe('SPK/2026/XI/001')
        ->and($sampleRows[0][1])->toBe('1.')
        ->and($sampleRows[0][2])->toBe('SPK')
        ->and($sampleRows[0][3])->toBe('JOB-2026-0001')
        ->and($sampleRows[0][4])->toBe('PT Pelayaran Samudra Berlian')
        ->and($sampleRows[0][5])->toBe('TB Mitra Bahari 01');

    expect($sampleRows[1][1])->toBe('1.2')
        ->and($sampleRows[1][2])->toBe('Pengajuan')
        ->and($sampleRows[1][7])->toBe('PGJ-2026-0001')
        ->and($sampleRows[1][9])->toBe('Pasokan Air Tawar Bersih Kapal (Fresh Water)');

    expect($sampleRows[4][1])->toBe('1.2')
        ->and($sampleRows[4][2])->toBe('Pengajuan')
        ->and($sampleRows[4][9])->toBe('Pelumas Mesin Induk Meditran Marine');

    expect($sampleRows[5][1])->toBe('1.3')
        ->and($sampleRows[5][2])->toBe('Invoice Reimbursement')
        ->and($sampleRows[5][7])->toBe('INV/2026/RMB/001')
        ->and($sampleRows[5][20])->toBe('Pasokan Air Tawar Bersih Kapal (Fresh Water)');

    expect($sampleRows[7][1])->toBe('1.4')
        ->and($sampleRows[7][2])->toBe('Invoice Jasa Keagenan')
        ->and($sampleRows[7][7])->toBe('INV/2026/AGY/001');

    // Verify SPK 2: 1 SPK + 6 Pengajuan + 3 Reimburse + 1 Agency = 11 rows (starting at index 8)
    expect($sampleRows[8])->toHaveCount(22)
        ->and($sampleRows[8][0])->toBe('SPK/2026/XI/002')
        ->and($sampleRows[8][1])->toBe('2.')
        ->and($sampleRows[8][2])->toBe('SPK')
        ->and($sampleRows[8][3])->toBe('JOB-2026-0002')
        ->and($sampleRows[8][4])->toBe('PT Indo Maritime Lines')
        ->and($sampleRows[8][5])->toBe('MV Samudra Jaya 88');

    expect($sampleRows[9][1])->toBe('2.1')
        ->and($sampleRows[9][2])->toBe('Pengajuan')
        ->and($sampleRows[9][7])->toBe('PGJ-2026-0002')
        ->and($sampleRows[9][9])->toBe('Jasa Pandu & Tunda Pelindo (EPB Sandar & Tolak)');

    expect($sampleRows[14][1])->toBe('2.1')
        ->and($sampleRows[14][2])->toBe('Pengajuan')
        ->and($sampleRows[14][9])->toBe('Pengisian Air Bersih Fresh Water 80 Ton');

    expect($sampleRows[15][1])->toBe('2.2')
        ->and($sampleRows[15][2])->toBe('Invoice Reimbursement')
        ->and($sampleRows[15][7])->toBe('INV/2026/RMB/002');

    expect($sampleRows[18][1])->toBe('2.3')
        ->and($sampleRows[18][2])->toBe('Invoice Jasa Keagenan')
        ->and($sampleRows[18][7])->toBe('INV/2026/AGY/002');

    $response = $this->actingAs($this->admin)->get(route('import-export.template', ['resource' => 'work-orders']));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('user can export work-orders with integrated pengajuan and invoices', function () {
    // Create SPK with PortCall, Request, and Invoices
    $company = ShipCompany::create([
        'code' => 'CMP-'.strtoupper(Str::random(4)),
        'name' => 'PT Pelayaran Bahari Sukses',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'name' => 'TB Bahari One',
        'ship_company_id' => $company->id,
        'flag' => 'Indonesia',
        'is_active' => true,
    ]);
    $port = Port::create([
        'code' => 'PRT-'.strtoupper(Str::random(4)),
        'name' => 'Pelabuhan Tanjung Perak',
        'city' => 'Surabaya',
        'is_active' => true,
    ]);

    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-SJA-261103-TEST01',
        'client_number' => 'SPK-EXP-001',
        'company_id' => $company->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
        'document_date' => now(),
        'status' => 'active',
        'created_by' => $this->admin->id,
    ]);

    $portCall = PortCall::create([
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'job_number' => 'JOB-EXP-001',
        'status' => 'berthed',
        'eta_at' => now(),
        'etd_at' => now()->addDays(3),
    ]);

    $request = ShipRequest::create([
        'request_number' => 'PGJ-EXP-001',
        'port_call_id' => $portCall->id,
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'service_type' => 'logistics',
        'status' => 'disetujui',
        'request_date' => now(),
        'created_by' => $this->admin->id,
    ]);

    $reqItem = RequestItem::create([
        'request_id' => $request->id,
        'item_name' => 'Air Bersih Kapal',
        'quantity' => 20,
        'unit' => 'Ton',
        'hpp_price' => 45000,
        'selling_price' => 60000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);

    $reimbInvoice = Invoice::create([
        'invoice_number' => 'INV-RMB-EXP-001',
        'port_call_id' => $portCall->id,
        'company_id' => $company->id,
        'request_id' => $request->id,
        'invoice_type' => 'reimburse',
        'invoice_date' => now(),
        'due_date' => now()->addDays(14),
        'subtotal' => 1200000,
        'grand_total' => 1200000,
        'status' => 'released',
        'currency' => 'IDR',
        'version' => 1,
    ]);

    $invItem = $reimbInvoice->items()->create([
        'request_item_id' => $reqItem->id,
        'description' => 'Reimbursement Air Bersih 20 Ton',
        'quantity' => 20,
        'unit' => 'Ton',
        'unit_price' => 60000,
        'subtotal' => 1200000,
    ]);

    InvoiceItemSource::create([
        'invoice_item_id' => $invItem->id,
        'request_item_id' => $reqItem->id,
        'allocated_quantity' => 20,
        'source_cost' => 900000,
    ]);

    $response = $this->actingAs($this->admin)->get(route('import-export.export', ['resource' => 'work-orders']));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('user can import integrated work-orders file and connect spk, pengajuan, and both invoices', function () {
    $service = app(DataImportExportService::class);
    $columns = $service->getColumns('work-orders');
    $sampleRows = $service->getSampleRows('work-orders');

    // Build header row and data rows
    $headerLine = implode(',', array_map(fn ($c) => '"'.str_replace('"', '""', $c['header']).'"', $columns));

    $dataLines = [];
    foreach ($sampleRows as $row) {
        $escaped = array_map(fn ($val) => '"'.str_replace('"', '""', (string) $val).'"', $row);
        $dataLines[] = implode(',', $escaped);
    }

    $csvContent = $headerLine."\n".implode("\n", $dataLines)."\n";
    $file = UploadedFile::fake()->createWithContent('integrated_work_orders.csv', $csvContent);

    $response = $this->actingAs($this->admin)->postJson(route('import-export.import', ['resource' => 'work-orders']), [
        'file' => $file,
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    // 1. Assert SPK 1 was created and linked correctly
    $wo1 = WorkOrder::where('client_number', 'SPK/2026/XI/001')->first();
    expect($wo1)->not->toBeNull()
        ->and($wo1->company->name)->toBe('PT Pelayaran Samudra Berlian')
        ->and($wo1->ship->name)->toBe('TB Mitra Bahari 01')
        ->and($wo1->client_pic_name)->toBe('Bpk. Rahmat Hidayat');

    $pc1 = PortCall::where('work_order_id', $wo1->id)->first();
    expect($pc1)->not->toBeNull()
        ->and($pc1->job_number)->toBe('JOB-2026-0001');

    // Assert Pengajuan 1 was created with 4 items
    $req1 = ShipRequest::where('request_number', 'PGJ-2026-0001')->first();
    expect($req1)->not->toBeNull()
        ->and($req1->port_call_id)->toBe($pc1->id)
        ->and($req1->status)->toBe('disetujui')
        ->and($req1->items)->toHaveCount(4);

    $item1a = RequestItem::where('request_id', $req1->id)
        ->where('item_name', 'Pasokan Air Tawar Bersih Kapal (Fresh Water)')
        ->first();
    expect($item1a)->not->toBeNull()
        ->and((float) $item1a->quantity)->toBe(50.0)
        ->and((float) $item1a->hpp_price)->toBe(50000.0)
        ->and($item1a->director_status)->toBe('approved')
        ->and($item1a->is_invoiced)->toBeTrue();

    $item1b = RequestItem::where('request_id', $req1->id)
        ->where('item_name', 'Jasa Port Clearance In & Out Syahbandar')
        ->first();
    expect($item1b)->not->toBeNull()
        ->and((float) $item1b->quantity)->toBe(1.0)
        ->and((float) $item1b->hpp_price)->toBe(3500000.0)
        ->and($item1b->director_status)->toBe('approved')
        ->and($item1b->is_invoiced)->toBeTrue();

    $item1c = RequestItem::where('request_id', $req1->id)
        ->where('item_name', 'Jasa Pemanduan & Penundaan Kapal (Pilot & Tug)')
        ->first();
    expect($item1c)->not->toBeNull()
        ->and((float) $item1c->quantity)->toBe(2.0)
        ->and((float) $item1c->hpp_price)->toBe(2000000.0);

    $item1d = RequestItem::where('request_id', $req1->id)
        ->where('item_name', 'Pelumas Mesin Induk Meditran Marine')
        ->first();
    expect($item1d)->not->toBeNull()
        ->and((float) $item1d->quantity)->toBe(4.0)
        ->and((float) $item1d->hpp_price)->toBe(1800000.0);

    // Assert Invoice Reimbursement for SPK 1
    $reimbInv1 = Invoice::where('invoice_number', 'INV/2026/RMB/001')->first();
    expect($reimbInv1)->not->toBeNull()
        ->and($reimbInv1->port_call_id)->toBe($pc1->id)
        ->and($reimbInv1->invoice_type)->toBe('reimburse')
        ->and($reimbInv1->status)->toBe('released')
        ->and((float) $reimbInv1->subtotal)->toBe(6750000.0) // 3,250,000 + 3,500,000
        ->and((float) $reimbInv1->grand_total)->toBe(6750000.0)
        ->and($reimbInv1->items)->toHaveCount(2);

    // Assert Invoice Agency for SPK 1
    $agencyInv1 = Invoice::where('invoice_number', 'INV/2026/AGY/001')->first();
    expect($agencyInv1)->not->toBeNull()
        ->and($agencyInv1->port_call_id)->toBe($pc1->id)
        ->and($agencyInv1->invoice_type)->toBe('agency')
        ->and($agencyInv1->status)->toBe('released')
        ->and((float) $agencyInv1->subtotal)->toBe(5000000.0)
        ->and((float) $agencyInv1->grand_total)->toBe(5000000.0)
        ->and($agencyInv1->items)->toHaveCount(1);

    // 2. Assert SPK 2 was created and linked correctly
    $wo2 = WorkOrder::where('client_number', 'SPK/2026/XI/002')->first();
    expect($wo2)->not->toBeNull()
        ->and($wo2->company->name)->toBe('PT Indo Maritime Lines')
        ->and($wo2->ship->name)->toBe('MV Samudra Jaya 88')
        ->and($wo2->client_pic_name)->toBe('Ibu Siti Aminah');

    $pc2 = PortCall::where('work_order_id', $wo2->id)->first();
    expect($pc2)->not->toBeNull()
        ->and($pc2->job_number)->toBe('JOB-2026-0002');

    // Assert Pengajuan 2 was created with 6 items
    $req2 = ShipRequest::where('request_number', 'PGJ-2026-0002')->first();
    expect($req2)->not->toBeNull()
        ->and($req2->port_call_id)->toBe($pc2->id)
        ->and($req2->status)->toBe('diajukan_ke_direktur')
        ->and($req2->items)->toHaveCount(6);

    $item2a = RequestItem::where('request_id', $req2->id)
        ->where('item_name', 'Jasa Pandu & Tunda Pelindo (EPB Sandar & Tolak)')
        ->first();
    expect($item2a)->not->toBeNull()
        ->and((float) $item2a->quantity)->toBe(2.0)
        ->and((float) $item2a->hpp_price)->toBe(2500000.0)
        ->and($item2a->director_status)->toBe('pending');

    $item2f = RequestItem::where('request_id', $req2->id)
        ->where('item_name', 'Pengisian Air Bersih Fresh Water 80 Ton')
        ->first();
    expect($item2f)->not->toBeNull()
        ->and((float) $item2f->quantity)->toBe(80.0)
        ->and((float) $item2f->hpp_price)->toBe(55000.0);

    // Assert Invoice Reimbursement for SPK 2 (3 items)
    $reimbInv2 = Invoice::where('invoice_number', 'INV/2026/RMB/002')->first();
    expect($reimbInv2)->not->toBeNull()
        ->and($reimbInv2->port_call_id)->toBe($pc2->id)
        ->and($reimbInv2->invoice_type)->toBe('reimburse')
        ->and($reimbInv2->status)->toBe('draft')
        ->and((float) $reimbInv2->subtotal)->toBe(14200000.0) // 5,600,000 + 3,400,000 + 5,200,000
        ->and($reimbInv2->items)->toHaveCount(3);

    // Assert Invoice Agency for SPK 2 (1 item)
    $agencyInv2 = Invoice::where('invoice_number', 'INV/2026/AGY/002')->first();
    expect($agencyInv2)->not->toBeNull()
        ->and($agencyInv2->port_call_id)->toBe($pc2->id)
        ->and($agencyInv2->invoice_type)->toBe('agency')
        ->and($agencyInv2->status)->toBe('draft')
        ->and((float) $agencyInv2->subtotal)->toBe(7500000.0)
        ->and($agencyInv2->items)->toHaveCount(1);
});
