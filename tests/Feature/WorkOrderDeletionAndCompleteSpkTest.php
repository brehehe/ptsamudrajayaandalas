<?php

use App\Models\CompletionNote;
use App\Models\CostDocument;
use App\Models\CostDocumentItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoiceItemSource;
use App\Models\OperationalActivity;
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
use App\Models\WorkOrderItem;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);

    $this->admin = User::factory()->create();
    $this->admin->syncRoles(['Admin']);

    $this->staff = User::factory()->create();
    $this->staff->syncRoles(['Lapangan']);
});

test('admin can delete work order and cascade deletes all linked processes and documents', function () {
    $company = ShipCompany::create([
        'code' => 'CMP-'.strtoupper(Str::random(4)),
        'name' => 'PT Pelayaran Samudra Mandiri',
        'is_active' => true,
    ]);

    $ship = Ship::create([
        'name' => 'TB Samudra Raya 01',
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

    $vendor = Vendor::create([
        'code' => 'VND-'.strtoupper(Str::random(4)),
        'name' => 'PT Vendor Pelabuhan',
        'is_active' => true,
    ]);

    // 1. Work Order
    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-TEST-DEL-001',
        'client_number' => 'CLIENT-SPK-001',
        'company_id' => $company->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
        'document_date' => now(),
        'status' => 'active',
        'created_by' => $this->admin->id,
    ]);

    $woItem = WorkOrderItem::create([
        'work_order_id' => $workOrder->id,
        'name' => 'Bongkar Muat Gandum',
        'description' => 'Operasional bongkar muat 5000 ton',
    ]);

    // 2. Port Call
    $portCall = PortCall::create([
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'job_number' => 'JOB-DEL-001',
        'status' => 'berthed',
        'eta_at' => now(),
    ]);

    // 3. Ship Request & Item
    $request = ShipRequest::create([
        'request_number' => 'PGJ-DEL-001',
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
        'item_name' => 'Air Bersih Kapal 50 Ton',
        'quantity' => 50,
        'unit' => 'Ton',
        'hpp_price' => 50000,
        'selling_price' => 70000,
        'status' => 'disetujui',
    ]);

    // 4. Vendor Invoice (Cost Document) & Item
    $costDoc = CostDocument::create([
        'port_call_id' => $portCall->id,
        'vendor_id' => $vendor->id,
        'document_type' => 'vendor_invoice',
        'document_number' => 'V-INV-DEL-001',
        'issuer_name' => 'PT Vendor Pelabuhan',
        'document_date' => now(),
        'received_date' => now(),
        'currency' => 'IDR',
        'estimated_total' => 2500000,
        'verified_total' => 2500000,
        'recorded_by' => $this->admin->id,
        'status' => 'recorded',
    ]);

    $costDocItem = CostDocumentItem::create([
        'cost_document_id' => $costDoc->id,
        'request_item_id' => $reqItem->id,
        'description' => 'Suplai Air Tawar',
        'quantity' => 50,
        'unit' => 'Ton',
        'unit_price' => 50000,
        'amount' => 2500000,
    ]);

    // 5. Outgoing Payment
    $outgoingPayment = OutgoingPayment::create([
        'port_call_id' => $portCall->id,
        'payment_type' => 'Vendor',
        'payment_date' => now(),
        'amount' => 2500000,
        'currency' => 'IDR',
        'recipient' => 'PT Vendor Pelabuhan',
        'verification_status' => 'verified',
    ]);

    // 6. Client Invoice & Item & Source
    $invoice = Invoice::create([
        'port_call_id' => $portCall->id,
        'company_id' => $company->id,
        'invoice_number' => 'INV-DEL-001',
        'invoice_type' => 'reimbursement',
        'subject' => 'Tagihan Air Bersih',
        'status' => 'draft',
        'subtotal' => 3500000,
        'grand_total' => 3500000,
    ]);

    $invItem = InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'description' => 'Air Bersih Kapal 50 Ton',
        'quantity' => 50,
        'unit' => 'Ton',
        'unit_price' => 70000,
        'subtotal' => 3500000,
    ]);

    $invSource = InvoiceItemSource::create([
        'invoice_item_id' => $invItem->id,
        'request_item_id' => $reqItem->id,
        'allocated_quantity' => 50,
        'allocated_amount' => 3500000,
    ]);

    // 7. Operational Activity
    $activity = OperationalActivity::create([
        'port_call_id' => $portCall->id,
        'ship_id' => $ship->id,
        'title' => 'Pengisian Air Bersih',
        'detail' => 'Detail pengisian air tawar',
        'activity_date' => now(),
        'location_name' => 'Dermaga 01',
        'category' => 'Bongkar Muat',
        'status' => 'completed',
        'created_by' => $this->admin->id,
    ]);

    // 8. Completion Note (Nota Rampung)
    $completionNote = CompletionNote::create([
        'port_call_id' => $portCall->id,
        'document_number' => 'NR-DEL-001',
        'status' => 'uploaded',
        'actual_amount' => 3500000,
        'departed_at' => now(),
        'issued_at' => now(),
        'uploaded_at' => now(),
        'document_path' => 'completion_notes/nr-del.pdf',
        'uploaded_by' => $this->admin->id,
    ]);

    // Execute deletion via route
    $response = $this->actingAs($this->admin)
        ->delete(route('work-orders.destroy', $workOrder->id));

    $response->assertRedirect(route('work-orders.index'));
    $response->assertSessionHas('success');

    // Assert all related models are completely removed
    expect(WorkOrder::where('id', $workOrder->id)->exists())->toBeFalse()
        ->and(WorkOrderItem::where('id', $woItem->id)->exists())->toBeFalse()
        ->and(PortCall::where('id', $portCall->id)->exists())->toBeFalse()
        ->and(ShipRequest::where('id', $request->id)->exists())->toBeFalse()
        ->and(RequestItem::where('id', $reqItem->id)->exists())->toBeFalse()
        ->and(CostDocument::where('id', $costDoc->id)->exists())->toBeFalse()
        ->and(CostDocumentItem::where('id', $costDocItem->id)->exists())->toBeFalse()
        ->and(OutgoingPayment::where('id', $outgoingPayment->id)->exists())->toBeFalse()
        ->and(Invoice::where('id', $invoice->id)->exists())->toBeFalse()
        ->and(InvoiceItem::where('id', $invItem->id)->exists())->toBeFalse()
        ->and(InvoiceItemSource::where('id', $invSource->id)->exists())->toBeFalse()
        ->and(OperationalActivity::where('id', $activity->id)->exists())->toBeFalse()
        ->and(CompletionNote::where('id', $completionNote->id)->exists())->toBeFalse();
});

test('staff without permission cannot delete work order', function () {
    $company = ShipCompany::create([
        'code' => 'CMP-'.strtoupper(Str::random(4)),
        'name' => 'PT Armada Tidak Hapus',
        'is_active' => true,
    ]);

    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-NO-DEL-001',
        'company_id' => $company->id,
        'status' => 'active',
        'created_by' => $this->admin->id,
    ]);

    $this->actingAs($this->staff)
        ->delete(route('work-orders.destroy', $workOrder->id))
        ->assertForbidden();

    expect(WorkOrder::where('id', $workOrder->id)->exists())->toBeTrue();
});

test('user can complete SPK from requests detail page', function () {
    $company = ShipCompany::create([
        'code' => 'CMP-'.strtoupper(Str::random(4)),
        'name' => 'PT Armada Selesaikan SPK',
        'is_active' => true,
    ]);

    $ship = Ship::create([
        'name' => 'TB Selesaikan 01',
        'ship_company_id' => $company->id,
        'is_active' => true,
    ]);

    $port = Port::create([
        'code' => 'PRT-'.strtoupper(Str::random(4)),
        'name' => 'Pelabuhan Gresik',
        'city' => 'Gresik',
        'is_active' => true,
    ]);

    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-FINISH-001',
        'company_id' => $company->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
        'status' => 'active',
        'created_by' => $this->admin->id,
    ]);

    $portCall = PortCall::create([
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'job_number' => 'JOB-FINISH-001',
        'status' => 'berthed',
        'eta_at' => now(),
    ]);

    // Check request show page exposes can_complete_spk
    $this->actingAs($this->admin)
        ->get(route('requests.detail', $portCall->job_number))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Requests/Show')
            ->where('capabilities.can_complete_spk', true)
            ->where('capabilities.is_spk_completed', false)
        );

    // Call complete-spk endpoint
    $response = $this->actingAs($this->admin)
        ->post(route('requests.complete-spk', $portCall->job_number));

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Both WorkOrder and PortCall status are now completed
    expect($workOrder->fresh()->status)->toBe('completed')
        ->and($portCall->fresh()->status)->toBe('completed')
        ->and($portCall->fresh()->acceptsNewRequests())->toBeFalse();

    // Now request show page reflects completed status
    $this->actingAs($this->admin)
        ->get(route('requests.detail', $portCall->job_number))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Requests/Show')
            ->where('capabilities.can_complete_spk', false)
            ->where('capabilities.can_reopen_spk', true)
            ->where('capabilities.is_spk_completed', true)
        );

    // Call reopen-spk endpoint to reopen the SPK
    $reopenResp = $this->actingAs($this->admin)
        ->post(route('requests.reopen-spk', $portCall->job_number));

    $reopenResp->assertRedirect();
    $reopenResp->assertSessionHas('success');

    expect($workOrder->fresh()->status)->toBe('in_progress')
        ->and($workOrder->fresh()->closed_at)->toBeNull()
        ->and($portCall->fresh()->status)->toBe('active')
        ->and($portCall->fresh()->acceptsNewRequests())->toBeTrue();

    // Now request show page reflects reopened active status
    $this->actingAs($this->admin)
        ->get(route('requests.detail', $portCall->job_number))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Requests/Show')
            ->where('capabilities.can_complete_spk', true)
            ->where('capabilities.can_reopen_spk', false)
            ->where('capabilities.is_spk_completed', false)
        );
});

test('requests remain open and repeatable even when nota rampung is already uploaded until SPK is completed', function () {
    $company = ShipCompany::create([
        'code' => 'CMP-'.strtoupper(Str::random(4)),
        'name' => 'PT Nota Rampung Tetap Buka',
        'is_active' => true,
    ]);

    $ship = Ship::create([
        'name' => 'MV Buka Terus 01',
        'ship_company_id' => $company->id,
        'is_active' => true,
    ]);

    $port = Port::create([
        'code' => 'PRT-'.strtoupper(Str::random(4)),
        'name' => 'Pelabuhan Manyar',
        'city' => 'Manyar',
        'is_active' => true,
    ]);

    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-OPEN-001',
        'company_id' => $company->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
        'status' => 'active',
        'created_by' => $this->admin->id,
    ]);

    $portCall = PortCall::create([
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'job_number' => 'JOB-OPEN-001',
        'status' => 'berthed',
        'eta_at' => now(),
    ]);

    // 1. Upload Nota Rampung
    CompletionNote::create([
        'port_call_id' => $portCall->id,
        'document_number' => 'NR-OPEN-001',
        'status' => 'uploaded',
        'actual_amount' => 5000000,
        'departed_at' => now(),
        'issued_at' => now(),
        'uploaded_at' => now(),
        'document_path' => 'completion_notes/nr-open.pdf',
        'uploaded_by' => $this->admin->id,
    ]);

    // Despite nota rampung existing, acceptsNewRequests is true
    expect($portCall->fresh()->acceptsNewRequests())->toBeTrue();

    // 2. Submit initial Clearance In
    $this->actingAs($this->staff)
        ->post(route('requests.store-multi'), [
            'ships' => [[
                'ship_id' => $ship->id,
                'port_call_id' => $portCall->id,
                'request_type' => 'Kedatangan (Clearance In)',
                'requested_port_call_status' => 'berthed',
                'operational_occurred_at' => today()->toDateString(),
                'required_date' => today()->toDateString(),
                'items' => [],
            ]],
        ])
        ->assertRedirect(route('requests.index'));

    // 3. Submit repeat Clearance In (now allowed without blocking!)
    $this->actingAs($this->staff)
        ->post(route('requests.store-multi'), [
            'ships' => [[
                'ship_id' => $ship->id,
                'port_call_id' => $portCall->id,
                'request_type' => 'Kedatangan (Clearance In)',
                'requested_port_call_status' => 'berthed',
                'operational_occurred_at' => today()->toDateString(),
                'required_date' => today()->toDateString(),
                'items' => [],
            ]],
        ])
        ->assertRedirect(route('requests.index'));

    // 4. Submit repeat Kebutuhan Kapal after nota rampung
    $this->actingAs($this->staff)
        ->post(route('requests.store-multi'), [
            'ships' => [[
                'ship_id' => $ship->id,
                'port_call_id' => $portCall->id,
                'request_type' => 'Kebutuhan Kapal',
                'required_date' => today()->toDateString(),
                'items' => [[
                    'item_name' => 'Sparepart Tambahan Pasca Nota',
                    'quantity' => 2,
                    'unit' => 'Pcs',
                    'hpp_price' => 150000,
                ]],
            ]],
        ])
        ->assertRedirect(route('requests.index'));

    // 5. Submit Clearance Out
    $this->actingAs($this->staff)
        ->post(route('requests.store-multi'), [
            'ships' => [[
                'ship_id' => $ship->id,
                'port_call_id' => $portCall->id,
                'request_type' => 'Keberangkatan (Clearance Out)',
                'operational_occurred_at' => today()->toDateString(),
                'required_date' => today()->toDateString(),
                'items' => [],
            ]],
        ])
        ->assertRedirect(route('requests.index'));

    // Verify 4 requests created for this port call
    expect(ShipRequest::where('port_call_id', $portCall->id)->count())->toBe(4);
});
