<?php

use App\Models\CompletionNote;
use App\Models\Invoice;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use App\Support\InvoicePdfGenerator;
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
        'client_number' => 'SPK/KLIEN/INVOICE/001',
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
    ]);
    CompletionNote::create([
        'port_call_id' => $portCall->id,
        'document_number' => 'NR-INVOICE-ITEM-001',
        'departed_at' => $portCall->departed_at,
        'issued_at' => now()->subDay(),
        'uploaded_at' => now(),
        'document_path' => 'sja/completion-notes/invoice-item.pdf',
        'actual_amount' => 0,
        'status' => 'uploaded',
        'uploaded_by' => $admin->id,
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
        'item_prices' => [$workflow['agencyItem']->id => 500000],
        'invoice_type' => 'agency',
        'addon_total' => 10000,
        'tax' => 20000,
        'due_date' => now()->addDays(14)->toDateString(),
        'notes' => 'Tagihan jasa terpilih.',
        'supporting_document' => UploadedFile::fake()->create('dokumen-pendukung.pdf', 24, 'application/pdf'),
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();

    $invoice = Invoice::query()->with('items')->sole();
    $generatedPdf = app(InvoicePdfGenerator::class)->generate($invoice);
    expect($invoice->items)->toHaveCount(1)
        ->and($invoice->items->first()->request_item_id)->toBe($workflow['agencyItem']->id)
        ->and((float) $invoice->items->first()->unit_price)->toBe(500000.0)
        ->and((float) $invoice->subtotal)->toBe(1000000.0)
        ->and((float) $invoice->grand_total)->toBe(1030000.0)
        ->and((float) $invoice->outstanding_amount)->toBe(1030000.0)
        ->and($workflow['agencyItem']->fresh()->is_invoiced)->toBeTrue()
        ->and($workflow['reimburseItem']->fresh()->is_invoiced)->toBeFalse()
        ->and($invoice->supporting_document_path)->not->toBeNull()
        ->and($generatedPdf)->toContain('(Jasa Keagenan Kapal) Tj')
        ->and($generatedPdf)->not->toContain('(Jasa Keagenan) Tj');

    Storage::disk('local')->assertExists($invoice->supporting_document_path);
    $this->assertDatabaseHas('invoice_items', [
        'invoice_id' => $invoice->id,
        'request_item_id' => $workflow['agencyItem']->id,
        'description' => 'Jasa Keagenan Kapal',
        'unit_price' => 500000,
        'subtotal' => 1000000,
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
        'item_prices' => [$workflow['agencyItem']->id => 450000],
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
        'item_prices' => [$workflow['reimburseItem']->id => 150000],
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
    ]);

    $response->assertSessionHasErrors('request_item_ids');
    $this->assertDatabaseCount('invoices', 0);
    expect($workflow['reimburseItem']->fresh()->is_invoiced)->toBeFalse();
});

test('admin can open create and edit pages and update a draft item final price', function () {
    $admin = clientInvoiceAdmin();
    $workflow = clientInvoiceWorkflow($admin);

    $this->actingAs($admin)
        ->get(route('invoices.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Invoices/Form')
            ->where('portCalls.0.id', $workflow['portCall']->id)
            ->where('portCalls.0.client_spk_number', 'SPK/KLIEN/INVOICE/001')
            ->where('shipRequests.0.items.0.id', $workflow['agencyItem']->id));

    $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'request_item_ids' => [$workflow['agencyItem']->id],
        'item_prices' => [$workflow['agencyItem']->id => 450000],
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
    ])->assertSessionHasNoErrors();

    $invoice = Invoice::query()->sole();

    $this->actingAs($admin)
        ->get(route('invoices.edit', $invoice))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Invoices/Form')
            ->where('invoice.id', $invoice->id)
            ->where("invoice.item_prices.{$workflow['agencyItem']->id}", '450000.00'));

    $this->actingAs($admin)->patch(route('invoices.update', $invoice), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'request_item_ids' => [$workflow['agencyItem']->id],
        'item_prices' => [$workflow['agencyItem']->id => 525000],
        'invoice_type' => 'agency',
        'addon_total' => 0,
        'tax' => 0,
        'due_date' => now()->addDays(21)->toDateString(),
    ])->assertRedirect(route('invoices.index'))->assertSessionHasNoErrors();

    $invoice->refresh()->load('items');
    expect((float) $invoice->items->sole()->unit_price)->toBe(525000.0)
        ->and((float) $invoice->grand_total)->toBe(1050000.0)
        ->and($invoice->version)->toBe(2);
});

test('one client invoice can select approved items from multiple requests on the same job', function () {
    $admin = clientInvoiceAdmin();
    $workflow = clientInvoiceWorkflow($admin);
    $secondRequest = ShipRequest::create([
        'request_number' => 'PGJ-INVOICE-ITEM-002',
        'ship_id' => $workflow['portCall']->ship_id,
        'company_id' => $workflow['company']->id,
        'port_call_id' => $workflow['portCall']->id,
        'created_by' => $admin->id,
        'status' => 'Disetujui',
        'request_date' => now()->toDateString(),
    ]);
    $secondItem = RequestItem::create([
        'request_id' => $secondRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Clearance Out',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 200000,
        'selling_price' => 325000,
        'status' => 'disetujui',
        'director_status' => 'approved',
        'is_invoiced' => false,
    ]);

    $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'request_item_ids' => [$workflow['agencyItem']->id, $secondItem->id],
        'item_prices' => [
            $workflow['agencyItem']->id => 450000,
            $secondItem->id => 350000,
        ],
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
    ])->assertRedirect(route('invoices.index'))->assertSessionHasNoErrors();

    $invoice = Invoice::query()->with('items')->sole();
    $generatedPdf = app(InvoicePdfGenerator::class)->generate($invoice);
    expect($invoice->items)->toHaveCount(2)
        ->and($invoice->items->pluck('request_item_id')->all())->toContain($workflow['agencyItem']->id, $secondItem->id)
        ->and((float) $invoice->grand_total)->toBe(1250000.0)
        ->and($generatedPdf)->toContain('(Jasa Keagenan Kapal) Tj')
        ->and($generatedPdf)->toContain('(Clearance Out) Tj');
});
