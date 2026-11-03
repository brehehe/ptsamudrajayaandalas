<?php

use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('authenticated staff can submit company expense request without ship requirement', function () {
    Storage::fake('local');

    $role = Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']);
    $staff = User::factory()->create();
    $staff->assignRole($role);

    $payload = [
        'category' => 'Operasional Kantor',
        'request_date' => now()->toDateString(),
        'vendor_name' => 'PT Sumber ATK Jaya',
        'invoice_number' => 'INV-ATK-2026-001',
        'invoice_document' => UploadedFile::fake()->create('invoice_atk.pdf', 500, 'application/pdf'),
        'notes' => 'Pembelian ATK dan kebutuhan operasional kantor pusat.',
        'items' => [
            [
                'item_name' => 'Kertas A4 80gr PaperOne',
                'quantity' => 10,
                'unit' => 'Rim',
                'hpp_price' => 55000,
                'notes' => 'Keperluan cetak dokumen agen',
            ],
            [
                'item_name' => 'Tinta Printer Epson L3110',
                'quantity' => 4,
                'unit' => 'Botol',
                'hpp_price' => 85000,
                'notes' => '1 set warna hitam dan CMY',
            ],
        ],
    ];

    $response = $this->actingAs($staff)
        ->post(route('requests.company-expense.store'), $payload);

    $response->assertRedirect(route('requests.index'));
    $response->assertSessionHas('success');

    $shipRequest = ShipRequest::whereNull('ship_id')->latest()->first();
    expect($shipRequest)->not->toBeNull();
    expect($shipRequest->service_type)->toBe('Operasional Kantor');
    expect($shipRequest->status)->toBe('Menunggu Approval Direktur');
    expect($shipRequest->notes)->toBe('Pembelian ATK dan kebutuhan operasional kantor pusat.');

    $items = RequestItem::where('request_id', $shipRequest->id)->get();
    expect($items)->toHaveCount(2);

    $firstItem = $items->firstWhere('item_name', 'Kertas A4 80gr PaperOne');
    expect($firstItem)->not->toBeNull();
    expect((float) $firstItem->quantity)->toBe(10.0);
    expect((float) $firstItem->hpp_price)->toBe(55000.0);
    expect($firstItem->director_status)->toBe('pending');
    expect($firstItem->supplier_invoice_number)->toBe('INV-ATK-2026-001');

    $vendor = Vendor::where('name', 'PT Sumber ATK Jaya')->first();
    expect($vendor)->not->toBeNull();
    expect($firstItem->vendor_id)->toBe($vendor->id);
});

test('company expense request is visible in director approvals pipeline', function () {
    $directorRole = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $director = User::factory()->create();
    $director->assignRole($directorRole);

    $vendor = Vendor::create(['name' => 'PT Solusi Fiber Internet', 'code' => 'VND-NET', 'is_active' => true]);

    $companyReq = ShipRequest::create([
        'request_number' => 'PGJ-2026-TEST-EXP',
        'ship_id' => null,
        'service_type' => 'Utilitas & Internet',
        'created_by' => $director->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);

    RequestItem::create([
        'request_id' => $companyReq->id,
        'vendor_id' => $vendor->id,
        'item_name' => 'Tagihan Internet Biznet Dedicated 100Mbps',
        'item_type' => 'non_jasa',
        'quantity' => 1,
        'unit' => 'Bulan',
        'hpp_price' => 1500000,
        'selling_price' => 0,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    $response = $this->actingAs($director)->get(route('approvals.index', ['tab' => 'menunggu']));
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Approvals/Index')
        ->has('requests')
        ->where('requests.0.request_number', 'PGJ-2026-TEST-EXP')
    );
});

test('requests still in waiting admin approval do not appear in director approvals waiting tab', function () {
    $directorRole = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $director = User::factory()->create();
    $director->assignRole($directorRole);

    // Request 1: Waiting admin approval / not yet forwarded to director
    $waitingAdminReq = ShipRequest::create([
        'request_number' => 'PGJ-2026-ADMIN-ONLY',
        'ship_id' => null,
        'service_type' => 'Biaya Perusahaan',
        'created_by' => $director->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

    RequestItem::create([
        'request_id' => $waitingAdminReq->id,
        'item_name' => 'Listrik PLN Kantor',
        'quantity' => 1,
        'unit' => 'Bulan',
        'hpp_price' => 500000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);

    // Request 2: Already forwarded to Director (status: diajukan_ke_direktur)
    $forwardedReq = ShipRequest::create([
        'request_number' => 'PGJ-2026-TO-DIRECTOR',
        'ship_id' => null,
        'service_type' => 'Biaya Perusahaan',
        'created_by' => $director->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);

    RequestItem::create([
        'request_id' => $forwardedReq->id,
        'item_name' => 'Tagihan Internet Biznet',
        'quantity' => 1,
        'unit' => 'Bulan',
        'hpp_price' => 1500000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);

    $response = $this->actingAs($director)->get(route('approvals.index', ['tab' => 'menunggu']));
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Approvals/Index')
        ->has('requests', 1)
        ->where('requests.0.request_number', 'PGJ-2026-TO-DIRECTOR')
    );
});

test('user can submit multi-item company expense request without upfront invoice and forward later', function () {
    $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    $payload = [
        'ships' => [
            [
                'ship_id' => null,
                'port_call_id' => '__company_expense__',
                'request_type' => 'Biaya Perusahaan',
                'items' => [
                    [
                        'item_name' => 'Listrik',
                        'quantity' => 1,
                        'unit' => 'Paket',
                        'hpp_price' => 0,
                    ],
                    [
                        'item_name' => 'Air (PDAM)',
                        'quantity' => 1,
                        'unit' => 'Paket',
                        'hpp_price' => 0,
                    ],
                ],
            ],
        ],
        'notes' => 'Tagihan rutin bulanan kantor',
    ];

    $response = $this->actingAs($admin)
        ->post('/requests/multi', $payload);

    $response->assertRedirect();

    $request = ShipRequest::whereNull('ship_id')->latest()->first();
    expect($request)->not->toBeNull();
    expect($request->service_type)->toBe('Biaya Perusahaan');
    expect($request->status)->toBe('Menunggu Approval');

    $items = RequestItem::where('request_id', $request->id)->get();
    expect($items)->toHaveCount(2);

    $listrikItem = $items->firstWhere('item_name', 'Listrik');
    $airItem = $items->firstWhere('item_name', 'Air (PDAM)');

    expect($listrikItem)->not->toBeNull();
    expect($airItem)->not->toBeNull();
    expect($listrikItem->status)->toBe('pending');
    expect($airItem->status)->toBe('pending');
    expect($listrikItem->hasCompleteSupplierInvoice())->toBeFalse();
});

test('director approval on company expense item automatically creates cost document vendor invoice with null port_call_id', function () {
    $directorRole = Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);
    $director = User::factory()->create();
    $director->assignRole($directorRole);

    $vendor = Vendor::create(['name' => 'CV Sumber Listrik', 'code' => 'VND-PLN', 'is_active' => true]);

    $companyReq = ShipRequest::create([
        'request_number' => 'PGJ-2026-EXP-AUTOINV',
        'ship_id' => null,
        'service_type' => 'Utilitas & Listrik',
        'created_by' => $director->id,
        'status' => 'Menunggu Approval Direktur',
        'request_date' => now()->toDateString(),
    ]);

    $item = RequestItem::create([
        'request_id' => $companyReq->id,
        'vendor_id' => $vendor->id,
        'item_name' => 'Tagihan Listrik Kantor Gedung Utama',
        'item_type' => 'non_jasa',
        'quantity' => 1,
        'unit' => 'Bulan',
        'hpp_price' => 2500000,
        'original_hpp_price' => 2500000,
        'selling_price' => 0,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
        'supplier_invoice_number' => 'INV-PLN-2026-999',
        'supplier_invoice_date' => now()->toDateString(),
        'supplier_invoice_received_date' => now()->toDateString(),
        'supplier_invoice_path' => 'sja/invoices/sample.pdf',
        'supplier_invoice_uploaded_by' => $director->id,
    ]);

    expect($item->hasCompleteSupplierInvoice())->toBeTrue();

    // Approve item as director
    $response = $this->actingAs($director)
        ->post(route('approvals.items.decision', $item->id), [
            'decision' => 'approved',
            'notes' => 'Disetujui untuk operasional kantor',
        ]);

    $response->assertRedirect();

    $item->refresh();
    expect($item->director_status)->toBe('approved');
    expect($item->costDocumentItem)->not->toBeNull();

    $costDocument = $item->costDocumentItem->costDocument;
    expect($costDocument)->not->toBeNull();
    expect($costDocument->port_call_id)->toBeNull();
    expect($costDocument->vendor_id)->toBe($vendor->id);
    expect($costDocument->document_number)->toBe('INV-PLN-2026-999');
    expect((float) $costDocument->verified_total)->toBe(2500000.0);
    expect($costDocument->payment_status)->toBe('unpaid');

    // Verify it appears in /expenses
    $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    $expensesResponse = $this->actingAs($admin)->get('/expenses');
    $expensesResponse->assertOk();
    $expensesResponse->assertInertia(fn (Assert $page) => $page
        ->component('Expenses/Index')
        ->has('payableVendorInvoices', fn (Assert $invoices) => $invoices
            ->where('0.document_number', 'INV-PLN-2026-999')
            ->where('0.port_call.job_number', 'PGJ-2026-EXP-AUTOINV')
            ->etc()
        )
    );

    // Verify detail page /requests/PGJ-2026-EXP-AUTOINV/detail renders properly
    $detailResponse = $this->actingAs($admin)->get(route('requests.detail', 'PGJ-2026-EXP-AUTOINV'));
    $detailResponse->assertOk();
    $detailResponse->assertInertia(fn (Assert $page) => $page
        ->component('Requests/Show')
        ->where('job', null)
        ->has('request')
        ->where('request.request_number', 'PGJ-2026-EXP-AUTOINV')
        ->where('request.ship_id', null)
    );
});

test('accessing ship request detail via request_number redirects to job number detail', function () {
    $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    $company = ShipCompany::create(['name' => 'PT Pelayaran Demo', 'code' => 'DEMO']);
    $port = Port::create(['name' => 'Pelabuhan Gresik', 'code' => 'GRK', 'city' => 'Gresik']);
    $ship = Ship::create(['name' => 'TB Kapal Test', 'ship_company_id' => $company->id]);
    $portCall = PortCall::create([
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'job_number' => 'JOB-TEST-1234',
        'status' => 'anchored',
    ]);

    $shipReq = ShipRequest::create([
        'request_number' => 'PGJ-2026-SHIP-TEST',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'service_type' => 'Kebutuhan Kapal',
        'created_by' => $admin->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($admin)->get(route('requests.detail', 'PGJ-2026-SHIP-TEST'));
    $response->assertRedirect(route('requests.detail', [
        'id' => 'JOB-TEST-1234',
        'req' => 'PGJ-2026-SHIP-TEST',
    ]));
});
