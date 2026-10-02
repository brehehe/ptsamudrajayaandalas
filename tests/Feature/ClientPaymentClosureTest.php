<?php

use App\Models\ClientReceipt;
use App\Models\CompletionNote;
use App\Models\CostReconciliation;
use App\Models\Invoice;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function closureWorkflowUser(string $role): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

/** @return array{WorkOrder, PortCall, ShipCompany} */
function closureWorkflowVisit(User $admin): array
{
    $company = ShipCompany::create(['name' => 'PT Klien Closure', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Closure', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'CLS1', 'name' => 'Pelabuhan Closure', 'city' => 'Gresik', 'is_active' => true]);
    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-CLOSURE-001', 'company_id' => $company->id, 'status' => 'billing',
        'created_by' => $admin->id, 'assigned_to' => $admin->id,
        'planned_ship_id' => $ship->id, 'planned_port_id' => $port->id,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-CLOSURE-001', 'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id, 'port_id' => $port->id, 'status' => 'departed',
        'departed_at' => now()->subDays(2), 'financial_status' => 'billing',
    ]);

    return [$workOrder, $portCall, $company];
}

test('client receipt requires real proof and cannot exceed invoice outstanding amount', function () {
    Storage::fake('local');
    $admin = closureWorkflowUser('Admin');
    [, $portCall, $company] = closureWorkflowVisit($admin);
    $invoice = Invoice::create([
        'invoice_number' => 'INV-CLIENT-001', 'port_call_id' => $portCall->id,
        'company_id' => $company->id, 'invoice_type' => 'agency', 'invoice_date' => now(),
        'due_date' => now()->addDays(14), 'subtotal' => 1000000, 'grand_total' => 1000000,
        'paid_amount' => 0, 'outstanding_amount' => 1000000, 'currency' => 'IDR',
        'status' => 'sent', 'delivery_status' => 'delivered', 'version' => 1,
    ]);

    $payload = [
        'company_id' => $company->id, 'invoice_id' => $invoice->id,
        'received_date' => now()->toDateString(), 'amount' => 1000001,
        'destination_account' => 'Rekening perusahaan', 'bank_reference' => 'BANK-OVER-001',
        'proof' => UploadedFile::fake()->image('bukti.jpg'),
    ];
    $this->actingAs($admin)->post(route('receivables.receipts.store'), $payload)
        ->assertSessionHasErrors('amount');
    $this->assertDatabaseCount('client_receipts', 0);

    $payload['amount'] = 1000000;
    $payload['bank_reference'] = 'BANK-PAID-001';
    $this->actingAs($admin)->post(route('receivables.receipts.store'), $payload)
        ->assertRedirect()->assertSessionHasNoErrors();

    $receipt = ClientReceipt::query()->with('allocations')->firstOrFail();
    Storage::disk('local')->assertExists($receipt->proof_path);
    expect($receipt->allocations)->toHaveCount(1)
        ->and((float) $receipt->allocations->first()->amount)->toBe(1000000.0)
        ->and($invoice->fresh()->status)->toBe('paid')
        ->and((float) $invoice->fresh()->outstanding_amount)->toBe(0.0);
});

test('work order cannot close before reconciliation and client payment but closes after all gates pass', function () {
    $admin = closureWorkflowUser('Admin');
    [$workOrder, $portCall, $company] = closureWorkflowVisit($admin);

    $this->actingAs($admin)->patch(route('work-orders.status', $workOrder), ['status' => 'closed'])
        ->assertSessionHasErrors('status');

    $note = CompletionNote::create([
        'port_call_id' => $portCall->id, 'document_number' => 'NR-CLOSE-001',
        'departed_at' => $portCall->departed_at, 'issued_at' => now()->subDay(),
        'uploaded_at' => now(), 'document_path' => 'private/nota.pdf', 'actual_amount' => 500000,
        'status' => 'reconciled', 'uploaded_by' => $admin->id, 'verified_by' => $admin->id, 'verified_at' => now(),
    ]);
    CostReconciliation::create([
        'port_call_id' => $portCall->id, 'completion_note_id' => $note->id,
        'initial_total' => 500000, 'actual_total' => 500000, 'variance' => 0,
        'adjustment' => 0, 'status' => 'completed', 'reconciled_by' => $admin->id, 'reconciled_at' => now(),
    ]);
    $portCall->update(['reconciled_at' => now()]);
    Invoice::create([
        'invoice_number' => 'INV-CLOSE-001', 'port_call_id' => $portCall->id,
        'company_id' => $company->id, 'invoice_type' => 'agency', 'invoice_date' => now(),
        'due_date' => now(), 'subtotal' => 750000, 'grand_total' => 750000,
        'paid_amount' => 750000, 'outstanding_amount' => 0, 'currency' => 'IDR',
        'status' => 'paid', 'delivery_status' => 'delivered', 'paid_at' => now(), 'version' => 1,
    ]);

    $this->actingAs($admin)->patch(route('work-orders.status', $workOrder), ['status' => 'closed'])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($workOrder->fresh()->status)->toBe('closed')
        ->and($workOrder->fresh()->closed_at)->not->toBeNull();
});
