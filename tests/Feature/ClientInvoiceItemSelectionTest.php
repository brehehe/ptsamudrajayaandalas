<?php

use App\Models\CompletionNote;
use App\Models\CostReconciliation;
use App\Models\Invoice;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function clientInvoiceAdmin(): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    return $user;
}

/**
 * @return array{company: ShipCompany, portCall: PortCall, request: ShipRequest, agencyItem: RequestItem, reimburseItem: RequestItem}
 */
function clientInvoiceWorkflow(User $admin): array
{
    $company = ShipCompany::create(['name' => 'PT Klien Invoice Item', 'is_active' => true]);
    $ship = Ship::create([
        'name' => 'KM Invoice Item',
        'ship_company_id' => $company->id,
        'is_active' => true,
    ]);
    $port = Port::create([
        'code' => 'INVI',
        'name' => 'Pelabuhan Invoice Item',
        'city' => 'Gresik',
        'is_active' => true,
    ]);
    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-INVOICE-ITEM-001',
        'company_id' => $company->id,
        'status' => 'billing',
        'created_by' => $admin->id,
        'assigned_to' => $admin->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
    ]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-INVOICE-ITEM-001',
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'departed',
        'departed_at' => now()->subDays(2),
        'financial_status' => 'billing',
        'reconciled_at' => now(),
    ]);
    $completionNote = CompletionNote::create([
        'port_call_id' => $portCall->id,
        'document_number' => 'NR-INVOICE-ITEM-001',
        'departed_at' => $portCall->departed_at,
        'issued_at' => now()->subDay(),
        'uploaded_at' => now(),
        'document_path' => 'sja/completion-notes/invoice-item.pdf',
        'actual_amount' => 150000,
        'status' => 'reconciled',
        'uploaded_by' => $admin->id,
        'verified_by' => $admin->id,
        'verified_at' => now(),
    ]);
    CostReconciliation::create([
        'port_call_id' => $portCall->id,
        'completion_note_id' => $completionNote->id,
        'initial_total' => 150000,
        'actual_total' => 150000,
        'variance' => 0,
        'adjustment' => 0,
        'status' => 'completed',
        'reconciled_by' => $admin->id,
        'reconciled_at' => now(),
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'PGJ-INVOICE-ITEM-001',
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_call_id' => $portCall->id,
        'created_by' => $admin->id,
        'status' => 'Disetujui',
        'request_date' => now()->toDateString(),
    ]);
    $agencyItem = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Jasa Keagenan Kapal',
        'unit' => 'Paket',
        'quantity' => 2,
        'hpp_price' => 300000,
        'selling_price' => 450000,
        'status' => 'disetujui',
        'director_status' => 'approved',
        'is_invoiced' => false,
    ]);
    $reimburseItem = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_type' => 'non_jasa',
        'item_name' => 'Biaya Pelindo',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 125000,
        'selling_price' => 150000,
        'status' => 'disetujui',
        'director_status' => 'approved',
        'is_invoiced' => false,
    ]);

    return [
        'company' => $company,
        'portCall' => $portCall,
        'request' => $shipRequest,
        'agencyItem' => $agencyItem,
        'reimburseItem' => $reimburseItem,
    ];
}

test('admin creates a client invoice from selected approved items and optional supporting document', function () {
    Storage::fake('local');
    $admin = clientInvoiceAdmin();
    $workflow = clientInvoiceWorkflow($admin);

    $response = $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'request_id' => $workflow['request']->id,
        'request_item_ids' => [$workflow['agencyItem']->id],
        'invoice_type' => 'agency',
        'addon_total' => 10000,
        'tax' => 20000,
        'due_date' => now()->addDays(14)->toDateString(),
        'notes' => 'Tagihan jasa terpilih.',
        'supporting_document' => UploadedFile::fake()->create('dokumen-pendukung.pdf', 24, 'application/pdf'),
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();

    $invoice = Invoice::query()->with('items')->sole();
    expect($invoice->items)->toHaveCount(1)
        ->and($invoice->items->first()->request_item_id)->toBe($workflow['agencyItem']->id)
        ->and((float) $invoice->subtotal)->toBe(900000.0)
        ->and((float) $invoice->grand_total)->toBe(930000.0)
        ->and((float) $invoice->outstanding_amount)->toBe(930000.0)
        ->and($workflow['agencyItem']->fresh()->is_invoiced)->toBeTrue()
        ->and($workflow['reimburseItem']->fresh()->is_invoiced)->toBeFalse()
        ->and($invoice->supporting_document_path)->not->toBeNull();

    Storage::disk('local')->assertExists($invoice->supporting_document_path);
    $this->assertDatabaseHas('invoice_items', [
        'invoice_id' => $invoice->id,
        'request_item_id' => $workflow['agencyItem']->id,
        'description' => 'Jasa Keagenan Kapal',
        'subtotal' => 900000,
    ]);
});

test('an item already used by an invoice cannot be billed twice', function () {
    $admin = clientInvoiceAdmin();
    $workflow = clientInvoiceWorkflow($admin);
    $workflow['agencyItem']->update(['is_invoiced' => true]);

    $response = $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'request_id' => $workflow['request']->id,
        'request_item_ids' => [$workflow['agencyItem']->id],
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
    ]);

    $response->assertSessionHasErrors('request_item_ids');
    $this->assertDatabaseCount('invoices', 0);
    $this->assertDatabaseCount('invoice_items', 0);
});

test('backend rejects selected items whose billing type does not match the invoice type', function () {
    $admin = clientInvoiceAdmin();
    $workflow = clientInvoiceWorkflow($admin);

    $response = $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'request_id' => $workflow['request']->id,
        'request_item_ids' => [$workflow['reimburseItem']->id],
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
    ]);

    $response->assertSessionHasErrors('request_item_ids');
    $this->assertDatabaseCount('invoices', 0);
    expect($workflow['reimburseItem']->fresh()->is_invoiced)->toBeFalse();
});
