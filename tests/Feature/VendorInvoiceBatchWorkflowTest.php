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
        'status' => 'Disetujui',
        'request_date' => '2026-10-01',
    ]);

    return $shipRequest->items()->create([
        'item_name' => "Kebutuhan {$suffix}",
        'quantity' => 1,
        'unit' => 'Paket',
        'hpp_price' => $amount,
        'selling_price' => $amount * 1.2,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
}

test('vendor invoice is created from an approved request item and becomes payable after verification without a funding batch', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $portCall = vendorWorkflowPortCall('01', $admin);
    $vendor = Vendor::create(['code' => 'VDA-01', 'name' => 'PT Vendor Air', 'is_active' => true]);
    $requestItem = vendorWorkflowRequestItem($portCall, $admin, 'INV-AIR-01', 1200000);

    $this->actingAs($admin)
        ->get(route('vendor-invoices.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('VendorInvoices/Create')
            ->where('portCalls.0.id', $portCall->id)
            ->where('portCalls.0.client_spk_number', 'SPK/KLIEN/VENDOR/01')
            ->where('availableRequestItems.0.id', $requestItem->id)
            ->where('vendors.0.id', $vendor->id));

    $this->actingAs($admin)->post(route('vendor-invoices.store'), [
        'port_call_id' => $portCall->id,
        'vendor_id' => $vendor->id,
        'document_number' => 'INV-AIR-01',
        'document_date' => '2026-09-28',
        'received_date' => '2026-10-01',
        'request_item_ids' => [$requestItem->id],
        'tax_amount' => 0,
        'document' => UploadedFile::fake()->create('INV-AIR-01.pdf', 100, 'application/pdf'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $invoice = CostDocument::where('document_number', 'INV-AIR-01')->firstOrFail();
    expect($invoice->items()->value('request_item_id'))->toBe($requestItem->id);

    $this->actingAs($admin)->get(route('expenses.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Expenses/Index')
            ->has('payableVendorInvoices', 0));

    $this->actingAs($admin)->post(route('expenses.store'), [
        'cost_document_id' => $invoice->id,
        'payment_date' => '2026-10-01',
        'reference_number' => 'TRF-UNVERIFIED-001',
        'amount' => 1200000,
        'proof' => UploadedFile::fake()->image('unverified.jpg'),
    ])->assertInvalid([
        'cost_document_id' => 'Invoice vendor belum terverifikasi atau tidak tersedia untuk pembayaran.',
    ]);

    $this->assertDatabaseCount('outgoing_payments', 0);

    $this->actingAs($admin)->post(route('vendor-invoices.verify', $invoice), [
        'decision' => 'verify',
        'verified_total' => 1200000,
    ])->assertRedirect()->assertSessionHasNoErrors();

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

test('an approved request item cannot be used by more than one vendor invoice', function () {
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
            ->where('abilities.verify', true));
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
