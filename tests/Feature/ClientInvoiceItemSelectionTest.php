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

/** @return array{section_title: string, description: string, quantity: string, unit: string, unit_price: string, source_item_ids: array<int, string>} */
function clientInvoiceLine(RequestItem $item, int $unitPrice, ?string $description = null, string $sectionTitle = 'Biaya Keagenan'): array
{
    return [
        'section_title' => $sectionTitle,
        'description' => $description ?? $item->item_name,
        'quantity' => (string) $item->quantity,
        'unit' => $item->unit,
        'unit_price' => (string) $unitPrice,
        'source_item_ids' => [$item->id],
    ];
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
        'subject' => 'Keagenan KM Invoice Item Voy. 001',
        'origin_port_name' => 'Pasang Kayu',
        'destination_port_name' => 'Lembar',
        'lines' => [clientInvoiceLine($workflow['agencyItem'], 500000)],
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
        ->and($invoice->items->first()->section_title)->toBe('Biaya Keagenan')
        ->and($invoice->subject)->toBe('Keagenan KM Invoice Item Voy. 001')
        ->and($invoice->origin_port_name)->toBe('Pasang Kayu')
        ->and($invoice->destination_port_name)->toBe('Lembar')
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
        'section_title' => 'Biaya Keagenan',
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
        'lines' => [clientInvoiceLine($workflow['agencyItem'], 450000)],
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
    ]);

    $response->assertSessionHasErrors('lines');
    $this->assertDatabaseCount('invoices', 0);
    $this->assertDatabaseCount('invoice_items', 0);
});

test('backend rejects selected items whose billing type does not match the invoice type', function () {
    $admin = clientInvoiceAdmin();
    $workflow = clientInvoiceWorkflow($admin);

    $response = $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'lines' => [clientInvoiceLine($workflow['reimburseItem'], 150000)],
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
    ]);

    $response->assertSessionHasErrors('lines');
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
            ->where('abilities.update', true)
            ->where('portCalls.0.id', $workflow['portCall']->id)
            ->where('portCalls.0.client_spk_number', 'SPK/KLIEN/INVOICE/001')
            ->where('documentSettings.company_name', 'PT. SAMUDRA JAYA ANDALAS')
            ->where('shipRequests.0.items.0.id', $workflow['agencyItem']->id)
            ->where('shipRequests.0.items.0.hpp_unit_price', '300000.00')
            ->where('shipRequests.0.items.0.hpp_total', '600000'));

    $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'lines' => [clientInvoiceLine($workflow['agencyItem'], 450000)],
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
    ])->assertSessionHasNoErrors();

    $invoice = Invoice::query()->sole();

    $this->actingAs($admin)
        ->get(route('invoices.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Invoices/Index')
            ->where('invoices.data.0.total_hpp', 600000)
            ->where('invoices.data.0.margin', 300000)
            ->where('stats.total_hpp', 600000)
            ->where('stats.total_margin', 300000));

    $this->actingAs($admin)
        ->get(route('invoices.edit', $invoice))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Invoices/Form')
            ->where('invoice.id', $invoice->id)
            ->where('abilities.update', true)
            ->where('invoice.lines.0.section_title', 'Biaya Keagenan')
            ->where('invoice.lines.0.description', 'Jasa Keagenan Kapal')
            ->where('invoice.lines.0.unit_price', '450000.00')
            ->where('invoice.lines.0.source_item_ids.0', $workflow['agencyItem']->id));

    $this->actingAs($admin)->patch(route('invoices.update', $invoice), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'lines' => [clientInvoiceLine($workflow['agencyItem'], 525000, 'Jasa Keagenan dan Clearance')],
        'invoice_type' => 'agency',
        'addon_total' => 0,
        'tax' => 0,
        'due_date' => now()->addDays(21)->toDateString(),
    ])->assertRedirect(route('invoices.index'))->assertSessionHasNoErrors();

    $invoice->refresh()->load('items');
    expect((float) $invoice->items->sole()->unit_price)->toBe(525000.0)
        ->and((float) $invoice->grand_total)->toBe(1050000.0)
        ->and($invoice->version)->toBe(2);

    $invoice->update(['status' => 'released']);

    $this->actingAs($admin)
        ->get(route('invoices.edit', $invoice))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Invoices/Form')
            ->where('invoice.id', $invoice->id)
            ->where('invoice.status', 'released')
            ->where('abilities.update', false));

    $this->actingAs($admin)
        ->patch(route('invoices.update', $invoice), [
            'port_call_id' => $workflow['portCall']->id,
            'company_id' => $workflow['company']->id,
            'lines' => [clientInvoiceLine($workflow['agencyItem'], 600000)],
            'invoice_type' => 'agency',
            'due_date' => now()->addDays(30)->toDateString(),
        ])
        ->assertForbidden();
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
        'lines' => [
            clientInvoiceLine($workflow['agencyItem'], 450000),
            clientInvoiceLine($secondItem, 350000),
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

test('admin can customize allocated hpp when splitting lines as long as total hpp equals selected items hpp', function () {
    $admin = clientInvoiceAdmin();
    $workflow = clientInvoiceWorkflow($admin);
    // agencyItem has quantity: 2, hpp_price: 300,000 -> total HPP = 600,000

    // Split line into 2 lines with custom HPP allocations (400,000 and 200,000 = 600,000)
    $response = $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
        'lines' => [
            [
                'section_title' => 'Biaya Keagenan',
                'description' => 'Jasa Keagenan Kapal (Bagian 1)',
                'quantity' => '1',
                'unit' => 'Paket',
                'unit_price' => '600000',
                'allocated_hpp' => '400000',
                'source_item_ids' => [$workflow['agencyItem']->id],
            ],
            [
                'section_title' => 'Biaya Keagenan',
                'description' => 'Jasa Keagenan Kapal (Bagian 2)',
                'quantity' => '1',
                'unit' => 'Paket',
                'unit_price' => '300000',
                'allocated_hpp' => '200000',
                'source_item_ids' => [$workflow['agencyItem']->id],
            ],
        ],
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();

    $invoice = Invoice::query()->with('items.sources')->sole();
    expect($invoice->items)->toHaveCount(2)
        ->and((float) $invoice->items[0]->sources->first()->source_cost)->toBe(400000.0)
        ->and((float) $invoice->items[1]->sources->first()->source_cost)->toBe(200000.0)
        ->and((float) $invoice->items->sum(fn ($i) => $i->sources->sum('source_cost')))->toBe(600000.0);

    // Edit invoice: change allocations to 350,000 and 250,000 (= 600,000)
    $editResponse = $this->actingAs($admin)->patch(route('invoices.update', $invoice), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
        'lines' => [
            [
                'section_title' => 'Biaya Keagenan',
                'description' => 'Jasa Keagenan Kapal (Bagian 1)',
                'quantity' => '1',
                'unit' => 'Paket',
                'unit_price' => '600000',
                'allocated_hpp' => '350000',
                'source_item_ids' => [$workflow['agencyItem']->id],
            ],
            [
                'section_title' => 'Biaya Keagenan',
                'description' => 'Jasa Keagenan Kapal (Bagian 2)',
                'quantity' => '1',
                'unit' => 'Paket',
                'unit_price' => '300000',
                'allocated_hpp' => '250000',
                'source_item_ids' => [$workflow['agencyItem']->id],
            ],
        ],
    ]);

    $editResponse->assertRedirect()->assertSessionHasNoErrors();
    $invoice->refresh()->load('items.sources');
    expect((float) $invoice->items[0]->sources->first()->source_cost)->toBe(350000.0)
        ->and((float) $invoice->items[1]->sources->first()->source_cost)->toBe(250000.0);
});

test('backend rejects invoice when custom allocated hpp is more or less than selected items hpp', function () {
    $admin = clientInvoiceAdmin();
    $workflow = clientInvoiceWorkflow($admin);
    // agencyItem total HPP = 600,000

    // Test 1: LEBIH (450,000 + 250,000 = 700,000 > 600,000)
    $responseLebih = $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
        'lines' => [
            [
                'section_title' => 'Biaya Keagenan',
                'description' => 'Jasa Keagenan Kapal (Bagian 1)',
                'quantity' => '1',
                'unit' => 'Paket',
                'unit_price' => '600000',
                'allocated_hpp' => '450000',
                'source_item_ids' => [$workflow['agencyItem']->id],
            ],
            [
                'section_title' => 'Biaya Keagenan',
                'description' => 'Jasa Keagenan Kapal (Bagian 2)',
                'quantity' => '1',
                'unit' => 'Paket',
                'unit_price' => '300000',
                'allocated_hpp' => '250000',
                'source_item_ids' => [$workflow['agencyItem']->id],
            ],
        ],
    ]);

    $responseLebih->assertSessionHasErrors(['lines']);
    $errorLebih = session('errors')->first('lines');
    expect($errorLebih)->toContain('tidak boleh lebih ataupun kurang');

    // Test 2: KURANG (300,000 + 200,000 = 500,000 < 600,000)
    $responseKurang = $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $workflow['portCall']->id,
        'company_id' => $workflow['company']->id,
        'invoice_type' => 'agency',
        'due_date' => now()->addDays(14)->toDateString(),
        'lines' => [
            [
                'section_title' => 'Biaya Keagenan',
                'description' => 'Jasa Keagenan Kapal (Bagian 1)',
                'quantity' => '1',
                'unit' => 'Paket',
                'unit_price' => '600000',
                'allocated_hpp' => '300000',
                'source_item_ids' => [$workflow['agencyItem']->id],
            ],
            [
                'section_title' => 'Biaya Keagenan',
                'description' => 'Jasa Keagenan Kapal (Bagian 2)',
                'quantity' => '1',
                'unit' => 'Paket',
                'unit_price' => '300000',
                'allocated_hpp' => '200000',
                'source_item_ids' => [$workflow['agencyItem']->id],
            ],
        ],
    ]);

    $responseKurang->assertSessionHasErrors(['lines']);
    $errorKurang = session('errors')->first('lines');
    expect($errorKurang)->toContain('tidak boleh lebih ataupun kurang');
});
