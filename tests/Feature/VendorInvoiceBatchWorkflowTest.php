<?php

use App\Models\CostDocument;
use App\Models\ExpenseRequest;
use App\Models\OutgoingPayment;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\Vendor;
use App\Models\WorkOrder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function vendorWorkflowUser(string $role): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

function vendorWorkflowPortCall(string $suffix, User $creator): PortCall
{
    $company = ShipCompany::create(['name' => "PT Klien Vendor {$suffix}", 'is_active' => true]);
    $ship = Ship::create(['name' => "KM Vendor {$suffix}", 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => "V{$suffix}", 'name' => "Pelabuhan {$suffix}", 'city' => 'Gresik', 'is_active' => true]);
    $workOrder = WorkOrder::create([
        'system_number' => "SPK-VENDOR-{$suffix}",
        'client_number' => "SPK/KLIEN/VENDOR/{$suffix}",
        'company_id' => $company->id,
        'status' => 'in_progress',
        'created_by' => $creator->id,
        'assigned_to' => $creator->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
    ]);

    return PortCall::create([
        'job_number' => "JOB-VENDOR-{$suffix}",
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'financial_status' => 'pending_reconciliation',
    ]);
}

function vendorWorkflowRequestItem(PortCall $portCall, User $creator, string $suffix, float $amount): RequestItem
{
    $shipRequest = ShipRequest::create([
        'request_number' => "REQ-VENDOR-{$suffix}",
        'ship_id' => $portCall->ship_id,
        'port_id' => $portCall->port_id,
        'port_call_id' => $portCall->id,
        'created_by' => $creator->id,
        'status' => 'Menunggu Approval',
        'request_date' => '2026-10-01',
    ]);

    return $shipRequest->items()->create([
        'item_name' => "Kebutuhan {$suffix}",
        'quantity' => 1,
        'unit' => 'Paket',
        'hpp_price' => $amount,
        'selling_price' => $amount * 1.2,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);
}

test('supplier invoice is required per item and director approval creates a verified payable vendor invoice', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $director = vendorWorkflowUser('Direktur');
    $portCall = vendorWorkflowPortCall('01', $admin);
    $vendor = Vendor::create(['code' => 'VDA-01', 'name' => 'PT Vendor Air', 'is_active' => true]);
    $requestItem = vendorWorkflowRequestItem($portCall, $admin, 'INV-AIR-01', 1200000);
    $requestItem->update([
        'attachment_path' => UploadedFile::fake()->image('foto-kebutuhan.jpg')->store('sja/request-items', 'local'),
    ]);

    $this->actingAs($admin)->post(route('requests.forward-director', $requestItem->request_id), [
        'selected_items' => [$requestItem->id],
    ])->assertInvalid(['selected_items']);

    $this->assertDatabaseCount('cost_documents', 0);

    $this->actingAs($admin)->post(route('request-items.supplier-invoice.store', $requestItem), [
        'vendor_id' => $vendor->id,
        'hpp_price' => 1200000,
        'supplier_invoice_number' => 'INV-AIR-01',
        'supplier_invoice_date' => '2026-09-28',
        'supplier_invoice_received_date' => '2026-10-01',
        'supplier_invoice_due_date' => '2026-10-15',
        'supplier_invoice_document' => UploadedFile::fake()->image('INV-AIR-01.jpg'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $requestItem->refresh();
    expect($requestItem->hasCompleteSupplierInvoice())->toBeTrue();
    Storage::disk('local')->assertExists($requestItem->supplier_invoice_path);

    $this->actingAs($admin)
        ->get(route('requests.detail', $portCall->job_number))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->where('requests.0.items.0.id', $requestItem->id)
            ->where('requests.0.items.0.attachment_is_image', true)
            ->where('requests.0.items.0.supplier_invoice_complete', true)
            ->where('requests.0.items.0.supplier_invoice_is_image', true)
            ->where('requests.0.items.0.supplier_invoice_number', 'INV-AIR-01'));

    $this->actingAs($admin)
        ->get(route('requests.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Index')
            ->where('requests.0.items.0.id', $requestItem->id)
            ->where('requests.0.items.0.attachment_is_image', true)
            ->where('requests.0.items.0.supplier_invoice_complete', true));

    $this->actingAs($admin)->post(route('requests.forward-director', $requestItem->request_id), [
        'selected_items' => [$requestItem->id],
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($requestItem->fresh()->status)->toBe('diajukan_ke_direktur');

    $this->actingAs($director)
        ->get(route('approvals.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Approvals/Index')
            ->where('requests.0.items.0.id', $requestItem->id)
            ->where('requests.0.items.0.attachment_is_image', true)
            ->where('requests.0.items.0.supplier_invoice_complete', true));

    $this->actingAs($director)
        ->get(route('approvals.detail', $portCall->job_number))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Approvals/Show')
            ->where('requests.0.items.0.id', $requestItem->id)
            ->where('requests.0.items.0.attachment_is_image', true)
            ->where('requests.0.items.0.supplier_invoice_complete', true));

    $this->actingAs($director)->post(route('approvals.requests.item-decision', $requestItem->request_id), [
        'decisions' => [[
            'item_id' => $requestItem->id,
            'status' => 'approved',
            'director_notes' => 'Biaya dan nota supplier valid.',
        ]],
    ])->assertRedirect()->assertSessionHasNoErrors();

    $invoice = CostDocument::where('document_number', 'INV-AIR-01')->firstOrFail();
    expect($invoice->status)->toBe('verified')
        ->and($invoice->payment_status)->toBe('unpaid')
        ->and($invoice->verified_by)->toBe($director->id)
        ->and((float) $invoice->verified_total)->toBe(1200000.0)
        ->and($invoice->items()->value('request_item_id'))->toBe($requestItem->id);

    $this->actingAs($admin)->get(route('vendor-invoices.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('VendorInvoices/Index')
            ->where('invoices.data.0.id', $invoice->id)
            ->where('invoices.data.0.status', 'verified'));

    $this->actingAs($admin)->get(route('expenses.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Expenses/Index')
            ->has('payableVendorInvoices', 1)
            ->where('payableVendorInvoices.0.id', $invoice->id)
            ->where('payableVendorInvoices.0.document_number', 'INV-AIR-01')
            ->where('payableVendorInvoices.0.vendor_name', 'PT Vendor Air')
            ->where('payableVendorInvoices.0.payable_amount', 1200000));

    $this->actingAs($admin)->post(route('funding.batches.store'), [
        'invoice_ids' => [$invoice->id],
    ])->assertInvalid([
        'invoice_ids' => 'Invoice vendor tidak lagi menggunakan batch pendanaan. Lanjutkan pembayaran melalui menu Pengeluaran.',
    ]);

    $this->assertDatabaseCount('expense_requests', 0);
});

test('items can use supplier invoices without a vendor and keep one optional admin note for the director', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $director = vendorWorkflowUser('Direktur');
    $portCall = vendorWorkflowPortCall('TAKTIS', $admin);
    $firstItem = vendorWorkflowRequestItem($portCall, $admin, 'TAKTIS-01', 250000);
    $secondItem = vendorWorkflowRequestItem($portCall, $admin, 'TAKTIS-02', 300000);

    foreach ([[$firstItem, 'INV-TAKTIS-01'], [$secondItem, 'INV-TAKTIS-02']] as [$item, $documentNumber]) {
        $this->actingAs($admin)->post(route('request-items.supplier-invoice.store', $item), [
            'vendor_id' => null,
            'hpp_price' => $item->hpp_price,
            'supplier_invoice_number' => $documentNumber,
            'supplier_invoice_date' => '2026-10-01',
            'supplier_invoice_received_date' => '2026-10-01',
            'supplier_invoice_document' => UploadedFile::fake()->create("{$documentNumber}.pdf", 10, 'application/pdf'),
        ])->assertRedirect()->assertSessionHasNoErrors();
    }

    $this->actingAs($admin)
        ->get(route('request-items.supplier-invoice.show', $firstItem))
        ->assertOk();

    $response = $this->actingAs($admin)->post(route('requests.batch-forward-director'), [
        'selected_items' => [$firstItem->id, $secondItem->id],
        'admin_notes' => 'Taktis tidak menggunakan vendor. Nominal sudah ditinjau untuk dua REQ.',
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();

    foreach ([$firstItem, $secondItem] as $item) {
        $item->refresh();

        expect($item->vendor_id)->toBeNull()
            ->and($item->hasCompleteSupplierInvoice())->toBeTrue()
            ->and($item->status)->toBe('diajukan_ke_direktur')
            ->and($item->request->fresh()->admin_forward_notes)
            ->toBe('Taktis tidak menggunakan vendor. Nominal sudah ditinjau untuk dua REQ.');
    }

    $this->actingAs($director)
        ->get(route('approvals.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Approvals/Index')
            ->where('requests.0.admin_forward_notes', 'Taktis tidak menggunakan vendor. Nominal sudah ditinjau untuk dua REQ.')
            ->where('requests.0.items.0.supplier_invoice_complete', true)
            ->where('requests.0.items.0.vendor', null));

    $this->actingAs($director)
        ->get(route('approvals.detail', $portCall->job_number))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Approvals/Show')
            ->where('requests.0.admin_forward_notes', 'Taktis tidak menggunakan vendor. Nominal sudah ditinjau untuk dua REQ.')
            ->where('requests.0.items.0.supplier_invoice_complete', true)
            ->where('requests.0.items.0.vendor', null));

    $this->actingAs($director)->post(route('approvals.requests.batch-item-decision'), [
        'decisions' => [
            ['item_id' => $firstItem->id, 'status' => 'approved'],
            ['item_id' => $secondItem->id, 'status' => 'approved'],
        ],
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(CostDocument::query()->whereNull('vendor_id')->count())->toBe(2)
        ->and(CostDocument::query()->whereNull('vendor_id')->pluck('issuer_name')->unique()->all())
        ->toBe(['Tanpa vendor/supplier']);
});

test('selected item remains approved when automatic vendor invoice needs admin review', function () {
    $admin = vendorWorkflowUser('Admin');
    $director = vendorWorkflowUser('Direktur');
    $sourcePortCall = vendorWorkflowPortCall('SOURCE', $admin);
    $approvalPortCall = vendorWorkflowPortCall('APPROVAL', $admin);
    $vendor = Vendor::create([
        'code' => 'VD-SHARED-INVOICE',
        'name' => 'PT Vendor Shared Invoice',
        'is_active' => true,
    ]);
    CostDocument::create([
        'port_call_id' => $sourcePortCall->id,
        'vendor_id' => $vendor->id,
        'document_type' => 'vendor_invoice',
        'document_number' => 'INV-SHARED-001',
        'issuer_name' => $vendor->name,
        'document_date' => '2026-10-01',
        'received_date' => '2026-10-01',
        'currency' => 'IDR',
        'estimated_total' => 500000,
        'verified_total' => 500000,
        'status' => 'verified',
        'payment_status' => 'unpaid',
        'recorded_by' => $admin->id,
    ]);
    $selectedItem = vendorWorkflowRequestItem($approvalPortCall, $admin, 'SELECTED', 25000);
    $selectedItem->update([
        'vendor_id' => $vendor->id,
        'supplier_invoice_number' => 'INV-SHARED-001',
        'supplier_invoice_date' => '2026-10-15',
        'supplier_invoice_received_date' => '2026-10-15',
        'supplier_invoice_path' => 'tests/INV-SHARED-001.pdf',
        'supplier_invoice_uploaded_by' => $admin->id,
        'status' => 'diajukan_ke_direktur',
    ]);
    $unselectedItem = $selectedItem->request->items()->create([
        'item_name' => 'Item dikembalikan ke Admin',
        'quantity' => 1,
        'unit' => 'Paket',
        'hpp_price' => 100000,
        'selling_price' => 125000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);
    $selectedItem->request->update(['status' => 'Menunggu Approval Direktur']);

    $response = $this->actingAs($director)->post(route('approvals.requests.batch-item-decision'), [
        'decisions' => [[
            'item_id' => $selectedItem->id,
            'status' => 'approved',
        ]],
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('request_items', [
        'id' => $selectedItem->id,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    $this->assertDatabaseHas('request_items', [
        'id' => $unselectedItem->id,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);
    $this->assertDatabaseCount('cost_documents', 1);
    expect($selectedItem->fresh()->costDocumentItem)->toBeNull();
});

test('only admin can upload a supplier invoice and its private document requires authentication', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $operational = vendorWorkflowUser('Lapangan');
    $portCall = vendorWorkflowPortCall('SECURE', $admin);
    $vendor = Vendor::create(['code' => 'VD-SECURE', 'name' => 'PT Vendor Aman', 'is_active' => true]);
    $requestItem = vendorWorkflowRequestItem($portCall, $admin, 'SECURE', 350000);

    $payload = [
        'vendor_id' => $vendor->id,
        'hpp_price' => 350000,
        'supplier_invoice_number' => 'INV-SECURE-001',
        'supplier_invoice_date' => '2026-10-01',
        'supplier_invoice_received_date' => '2026-10-01',
        'supplier_invoice_document' => UploadedFile::fake()->create('INV-SECURE-001.pdf', 64, 'application/pdf'),
    ];

    $this->actingAs($operational)
        ->post(route('request-items.supplier-invoice.store', $requestItem), $payload)
        ->assertForbidden();

    $this->assertNull($requestItem->fresh()->supplier_invoice_path);

    $this->actingAs($admin)
        ->post(route('request-items.supplier-invoice.store', $requestItem), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    auth()->logout();
    $this->get(route('request-items.supplier-invoice.show', $requestItem))
        ->assertRedirect(route('login'));

    $this->actingAs($admin)
        ->get(route('request-items.supplier-invoice.show', $requestItem))
        ->assertOk();
});

test('legacy vendor invoice batches are not shown in operational funding', function () {
    $admin = vendorWorkflowUser('Admin');
    $portCall = vendorWorkflowPortCall('LEGACY', $admin);
    $vendor = Vendor::create(['code' => 'VD-LEGACY', 'name' => 'PT Vendor Legacy', 'is_active' => true]);
    $invoice = CostDocument::create([
        'port_call_id' => $portCall->id, 'vendor_id' => $vendor->id,
        'document_type' => 'vendor_invoice', 'document_number' => 'INV-LEGACY-001',
        'issuer_name' => $vendor->name, 'document_date' => '2026-10-01', 'received_date' => '2026-10-01',
        'currency' => 'IDR', 'verified_total' => 500000, 'status' => 'verified',
        'payment_status' => 'unpaid', 'recorded_by' => $admin->id,
    ]);
    $costItem = $invoice->items()->create([
        'description' => 'Biaya vendor', 'quantity' => 1, 'unit' => 'Paket',
        'amount' => 500000, 'billable' => true, 'billing_classification' => 'reimburse',
    ]);
    $expense = ExpenseRequest::create([
        'request_number' => 'BATCH-LEGACY-001', 'port_call_id' => $portCall->id,
        'status' => 'waiting_director', 'currency' => 'IDR', 'total' => 500000,
        'created_by' => $admin->id, 'submitted_at' => now(),
    ]);
    $expense->items()->create([
        'cost_document_item_id' => $costItem->id, 'description' => 'Invoice vendor', 'amount' => 500000,
    ]);

    $this->actingAs($admin)->get(route('funding.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Funding/Index')
            ->has('expenseRequests.data', 0));
});

test('operational users cannot record vendor invoices', function () {
    Storage::fake('local');
    $operational = vendorWorkflowUser('Lapangan');
    $portCall = vendorWorkflowPortCall('ROLE', $operational);
    $vendor = Vendor::create(['code' => 'VD-ROLE', 'name' => 'PT Vendor Role', 'is_active' => true]);

    $this->actingAs($operational)->post(route('vendor-invoices.store'), [
        'port_call_id' => $portCall->id,
        'vendor_id' => $vendor->id,
        'document_number' => 'INV-ROLE-01',
        'document_date' => '2026-10-01',
        'received_date' => '2026-10-01',
        'description' => 'Tidak berwenang',
        'amount' => 100000,
        'document' => UploadedFile::fake()->create('invoice.pdf', 10, 'application/pdf'),
    ])->assertForbidden();
});

test('admin can record a vendor invoice without selecting a vendor', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $portCall = vendorWorkflowPortCall('NO-VENDOR', $admin);
    $requestItem = vendorWorkflowRequestItem($portCall, $admin, 'NO-VENDOR', 450000);

    $this->actingAs($admin)->post(route('vendor-invoices.store'), [
        'port_call_id' => $portCall->id,
        'vendor_id' => null,
        'document_number' => 'INV-NO-VENDOR-01',
        'document_date' => '2026-10-01',
        'received_date' => '2026-10-01',
        'request_item_ids' => [$requestItem->id],
        'tax_amount' => 0,
        'document' => UploadedFile::fake()->create('invoice-no-vendor.pdf', 10, 'application/pdf'),
    ])->assertRedirect(route('vendor-invoices.index'))->assertSessionHasNoErrors();

    $invoice = CostDocument::query()->where('document_number', 'INV-NO-VENDOR-01')->firstOrFail();

    expect($invoice->vendor_id)->toBeNull()
        ->and($invoice->issuer_name)->toBe('Tanpa vendor/supplier')
        ->and($requestItem->fresh()->vendor_id)->toBeNull()
        ->and($invoice->items()->value('request_item_id'))->toBe($requestItem->id);
});

test('a request item cannot be used by more than one vendor invoice', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $portCall = vendorWorkflowPortCall('UNIQUE', $admin);
    $vendor = Vendor::create(['code' => 'VD-UNIQUE', 'name' => 'PT Vendor Unik', 'is_active' => true]);
    $requestItem = vendorWorkflowRequestItem($portCall, $admin, 'UNIQUE', 750000);

    $payload = [
        'port_call_id' => $portCall->id,
        'vendor_id' => $vendor->id,
        'document_number' => 'INV-UNIQUE-01',
        'document_date' => '2026-10-01',
        'received_date' => '2026-10-01',
        'request_item_ids' => [$requestItem->id],
        'tax_amount' => 0,
        'document' => UploadedFile::fake()->create('invoice-1.pdf', 10, 'application/pdf'),
    ];

    $this->actingAs($admin)->post(route('vendor-invoices.store'), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $payload['document_number'] = 'INV-UNIQUE-02';
    $payload['document'] = UploadedFile::fake()->create('invoice-2.pdf', 10, 'application/pdf');

    $this->actingAs($admin)->post(route('vendor-invoices.store'), $payload)
        ->assertSessionHasErrors('request_item_ids');

    $this->assertDatabaseCount('cost_documents', 1);
});

test('vendor payment is allocated per invoice and cannot exceed its outstanding amount', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $portCall = vendorWorkflowPortCall('PAY', $admin);
    $vendor = Vendor::create(['code' => 'VD-PAY', 'name' => 'PT Vendor Bayar', 'is_active' => true]);
    $invoice = CostDocument::create([
        'port_call_id' => $portCall->id, 'vendor_id' => $vendor->id,
        'document_type' => 'vendor_invoice', 'document_number' => 'INV-PAY-001',
        'issuer_name' => $vendor->name, 'document_date' => '2026-10-01', 'received_date' => '2026-10-01',
        'currency' => 'IDR', 'verified_total' => 500000, 'status' => 'verified',
        'payment_status' => 'unpaid', 'recorded_by' => $admin->id,
        'verified_by' => $admin->id, 'verified_at' => now(),
    ]);
    $invoice->items()->create([
        'description' => 'Air tawar', 'quantity' => 1, 'unit' => 'Paket', 'amount' => 500000,
        'billable' => true, 'billing_classification' => 'reimburse',
    ]);

    $this->actingAs($admin)->get(route('expenses.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Expenses/Index')
            ->has('payableVendorInvoices', 1)
            ->where('payableVendorInvoices.0.id', $invoice->id)
            ->where('payableVendorInvoices.0.document_number', 'INV-PAY-001')
            ->where('payableVendorInvoices.0.vendor_name', 'PT Vendor Bayar')
            ->where('payableVendorInvoices.0.payable_amount', 500000));

    $paymentPayload = [
        'cost_document_id' => $invoice->id,
        'payment_date' => '2026-10-01', 'reference_number' => 'TRF-PAY-001',
        'amount' => 500001, 'proof' => UploadedFile::fake()->image('transfer.jpg'),
    ];
    $this->actingAs($admin)->post(route('expenses.store'), $paymentPayload)
        ->assertSessionHasErrors('amount');

    $paymentPayload['amount'] = 500000;
    $this->actingAs($admin)->post(route('expenses.store'), $paymentPayload)
        ->assertRedirect()->assertSessionHasNoErrors();

    $payment = OutgoingPayment::query()->firstOrFail();
    expect($payment->funding_request_id)->toBeNull()
        ->and($payment->payment_destination)->toBe('vendor')
        ->and($payment->recipient)->toBe('PT Vendor Bayar')
        ->and($payment->verification_status)->toBe('verified')
        ->and($payment->verified_by)->toBe($admin->id)
        ->and($payment->verified_at)->not->toBeNull()
        ->and($payment->allocations()->count())->toBe(1);

    expect($invoice->fresh()->payment_status)->toBe('paid')
        ->and((float) $invoice->fresh()->paid_amount)->toBe(500000.0)
        ->and($invoice->fresh()->paid_at)->not->toBeNull();

    $this->actingAs($admin)->get(route('expenses.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Expenses/Index')
            ->has('payableVendorInvoices', 0)
            ->where('expenses.data.0.allocations.0.cost_document.document_number', 'INV-PAY-001'));

    $this->actingAs($admin)->get(route('vendor-invoices.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('VendorInvoices/Index')
            ->where('invoices.data.0.id', $invoice->id)
            ->where('invoices.data.0.payment_status', 'paid')
            ->where('invoices.data.0.payment_allocations.0.payment.id', $payment->id)
            ->where('invoices.data.0.payment_allocations.0.payment.verification_status', 'verified')
            ->where('abilities.verify', true)
            ->where('abilities.pay', true));
});

test('partial vendor payment updates the invoice and prevents overpayment', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $portCall = vendorWorkflowPortCall('PENDING', $admin);
    $vendor = Vendor::create(['code' => 'VD-PENDING', 'name' => 'PT Vendor Pending', 'is_active' => true]);
    $invoice = CostDocument::create([
        'port_call_id' => $portCall->id, 'vendor_id' => $vendor->id,
        'document_type' => 'vendor_invoice', 'document_number' => 'INV-PENDING-001',
        'issuer_name' => $vendor->name, 'document_date' => '2026-10-01', 'received_date' => '2026-10-01',
        'currency' => 'IDR', 'verified_total' => 500000, 'status' => 'verified',
        'payment_status' => 'unpaid', 'recorded_by' => $admin->id,
        'verified_by' => $admin->id, 'verified_at' => now(),
    ]);
    $invoice->items()->create([
        'description' => 'Jasa vendor', 'quantity' => 1, 'unit' => 'Paket', 'amount' => 500000,
        'billable' => true, 'billing_classification' => 'reimburse',
    ]);

    $this->actingAs($admin)->post(route('expenses.store'), [
        'cost_document_id' => $invoice->id,
        'payment_date' => '2026-10-01', 'reference_number' => 'TRF-PENDING-001',
        'amount' => 400000, 'proof' => UploadedFile::fake()->image('transfer-1.jpg'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($invoice->fresh()->payment_status)->toBe('partially_paid')
        ->and((float) $invoice->fresh()->paid_amount)->toBe(400000.0)
        ->and($invoice->fresh()->paid_at)->toBeNull();

    $this->actingAs($admin)->post(route('expenses.store'), [
        'cost_document_id' => $invoice->id,
        'payment_date' => '2026-10-01', 'reference_number' => 'TRF-PENDING-002',
        'amount' => 200000, 'proof' => UploadedFile::fake()->image('transfer-2.jpg'),
    ])->assertInvalid(['amount' => 'Nominal pembayaran melebihi sisa invoice vendor yang belum dialokasikan.']);

    $this->assertDatabaseCount('outgoing_payments', 1);
    $this->assertDatabaseCount('outgoing_payment_allocations', 1);
});
