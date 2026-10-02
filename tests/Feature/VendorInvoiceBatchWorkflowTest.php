<?php

use App\Models\CostDocument;
use App\Models\ExpenseRequest;
use App\Models\FundingRequest;
use App\Models\OutgoingPayment;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function vendorWorkflowUser(string $role): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

function vendorWorkflowPortCall(string $suffix): PortCall
{
    $ship = Ship::create(['name' => "KM Vendor {$suffix}", 'is_active' => true]);
    $port = Port::create(['code' => "V{$suffix}", 'name' => "Pelabuhan {$suffix}", 'city' => 'Gresik', 'is_active' => true]);

    return PortCall::create([
        'job_number' => "JOB-VENDOR-{$suffix}",
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'financial_status' => 'pending_reconciliation',
    ]);
}

test('verified vendor invoices from one job can be grouped into one funding batch', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $portCall = vendorWorkflowPortCall('01');
    $vendorA = Vendor::create(['code' => 'VDA-01', 'name' => 'PT Vendor Air', 'is_active' => true]);
    $vendorB = Vendor::create(['code' => 'VDB-01', 'name' => 'PT Vendor Dokumen', 'is_active' => true]);

    foreach ([[$vendorA, 'INV-AIR-01', 1200000], [$vendorB, 'INV-DOC-01', 800000]] as [$vendor, $number, $amount]) {
        $this->actingAs($admin)->post(route('vendor-invoices.store'), [
            'port_call_id' => $portCall->id,
            'vendor_id' => $vendor->id,
            'document_number' => $number,
            'document_date' => '2026-09-28',
            'received_date' => '2026-10-01',
            'description' => 'Kebutuhan kapal',
            'amount' => $amount,
            'tax_amount' => 0,
            'document' => UploadedFile::fake()->create("{$number}.pdf", 100, 'application/pdf'),
        ])->assertRedirect()->assertSessionHasNoErrors();

        $invoice = CostDocument::where('document_number', $number)->firstOrFail();
        $this->actingAs($admin)->post(route('vendor-invoices.verify', $invoice), [
            'decision' => 'verify',
            'verified_total' => $amount,
        ])->assertRedirect()->assertSessionHasNoErrors();
    }

    $invoiceIds = CostDocument::query()->pluck('id')->all();
    $this->actingAs($admin)->post(route('funding.batches.store'), [
        'invoice_ids' => $invoiceIds,
        'notes' => 'Batch invoice yang sudah diterima.',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $batch = ExpenseRequest::query()->with('items')->firstOrFail();
    expect($batch->status)->toBe('waiting_director')
        ->and((float) $batch->total)->toBe(2000000.0)
        ->and($batch->items)->toHaveCount(2);

    $this->actingAs($admin)->post(route('funding.batches.store'), [
        'invoice_ids' => [$invoiceIds[0]],
    ])->assertSessionHasErrors('invoice_ids');
});

test('a funding batch cannot mix invoices from different jobs', function () {
    $admin = vendorWorkflowUser('Admin');
    $vendor = Vendor::create(['code' => 'VD-MIX', 'name' => 'PT Vendor Campur', 'is_active' => true]);
    $invoiceIds = collect(['A', 'B'])->map(function (string $suffix) use ($admin, $vendor): string {
        $portCall = vendorWorkflowPortCall("MIX{$suffix}");
        $invoice = CostDocument::create([
            'port_call_id' => $portCall->id,
            'vendor_id' => $vendor->id,
            'document_type' => 'vendor_invoice',
            'document_number' => "INV-MIX-{$suffix}",
            'issuer_name' => $vendor->name,
            'document_date' => '2026-10-01',
            'received_date' => '2026-10-01',
            'currency' => 'IDR',
            'verified_total' => 500000,
            'status' => 'verified',
            'payment_status' => 'unpaid',
            'recorded_by' => $admin->id,
            'verified_by' => $admin->id,
            'verified_at' => now(),
        ]);
        $invoice->items()->create([
            'description' => 'Biaya vendor', 'quantity' => 1, 'unit' => 'Paket',
            'amount' => 500000, 'billable' => true, 'billing_classification' => 'reimburse',
        ]);

        return $invoice->id;
    })->all();

    $this->actingAs($admin)->post(route('funding.batches.store'), [
        'invoice_ids' => $invoiceIds,
    ])->assertSessionHasErrors('invoice_ids');

    $this->assertDatabaseCount('expense_requests', 0);
});

test('operational users cannot record vendor invoices', function () {
    Storage::fake('local');
    $operational = vendorWorkflowUser('Lapangan');
    $portCall = vendorWorkflowPortCall('ROLE');
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

test('vendor payment is allocated per invoice and cannot exceed its outstanding amount', function () {
    Storage::fake('local');
    $admin = vendorWorkflowUser('Admin');
    $portCall = vendorWorkflowPortCall('PAY');
    $vendor = Vendor::create(['code' => 'VD-PAY', 'name' => 'PT Vendor Bayar', 'is_active' => true]);
    $invoice = CostDocument::create([
        'port_call_id' => $portCall->id, 'vendor_id' => $vendor->id,
        'document_type' => 'vendor_invoice', 'document_number' => 'INV-PAY-001',
        'issuer_name' => $vendor->name, 'document_date' => '2026-10-01', 'received_date' => '2026-10-01',
        'currency' => 'IDR', 'verified_total' => 500000, 'status' => 'verified',
        'payment_status' => 'unpaid', 'recorded_by' => $admin->id,
        'verified_by' => $admin->id, 'verified_at' => now(),
    ]);
    $costItem = $invoice->items()->create([
        'description' => 'Air tawar', 'quantity' => 1, 'unit' => 'Paket', 'amount' => 500000,
        'billable' => true, 'billing_classification' => 'reimburse',
    ]);
    $expense = ExpenseRequest::create([
        'request_number' => 'BATCH-PAY-001', 'port_call_id' => $portCall->id,
        'status' => 'approved_director', 'currency' => 'IDR', 'total' => 500000,
        'created_by' => $admin->id, 'submitted_at' => now(),
    ]);
    $expense->items()->create([
        'cost_document_item_id' => $costItem->id, 'description' => 'Invoice vendor', 'amount' => 500000,
    ]);
    $funding = FundingRequest::create([
        'expense_request_id' => $expense->id, 'requested_amount' => 500000, 'approved_amount' => 500000,
        'status' => 'funds_received', 'created_by' => $admin->id,
    ]);
    $funding->receipts()->create([
        'received_date' => '2026-10-01', 'amount' => 500000,
        'destination_account' => 'Rekening Admin', 'reference_number' => 'CAIR-PAY-001',
        'proof_path' => 'sja/test/cair.pdf', 'recorded_by' => $admin->id,
    ]);

    $paymentPayload = [
        'action' => 'record_payment', 'payment_destination' => 'vendor',
        'cost_document_id' => $invoice->id, 'recipient' => $vendor->name,
        'payment_date' => '2026-10-01', 'reference_number' => 'TRF-PAY-001',
        'amount' => 500001, 'proof' => UploadedFile::fake()->image('transfer.jpg'),
    ];
    $this->actingAs($admin)->post(route('funding.transition', $funding), $paymentPayload)
        ->assertSessionHasErrors('amount');

    $paymentPayload['amount'] = 500000;
    $this->actingAs($admin)->post(route('funding.transition', $funding), $paymentPayload)
        ->assertRedirect()->assertSessionHasNoErrors();

    $payment = OutgoingPayment::query()->firstOrFail();
    expect($payment->allocations()->count())->toBe(1);

    $this->actingAs($admin)->post(route('funding.payments.transition', $payment), [
        'action' => 'verify_usage',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($invoice->fresh()->payment_status)->toBe('paid')
        ->and((float) $invoice->fresh()->paid_amount)->toBe(500000.0)
        ->and($funding->fresh()->status)->toBe('completed');
});
