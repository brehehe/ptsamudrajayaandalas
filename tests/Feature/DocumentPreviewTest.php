<?php

use App\Models\CostDocument;
use App\Models\Invoice;
use App\Models\OutgoingPayment;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function documentPreviewAdmin(): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    return $user;
}

function documentPreviewPortCall(): PortCall
{
    $ship = Ship::create(['name' => 'KM Preview Dokumen', 'is_active' => true]);
    $port = Port::create([
        'code' => 'PRVW',
        'name' => 'Pelabuhan Preview',
        'city' => 'Gresik',
        'is_active' => true,
    ]);

    return PortCall::create([
        'job_number' => 'JOB-PREVIEW-001',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'financial_status' => 'pending_reconciliation',
    ]);
}

test('authorized admin can preview a private vendor invoice inline', function () {
    Storage::fake('local');
    Storage::disk('local')->put('sja/vendor-invoices/invoice.pdf', 'vendor invoice');

    $admin = documentPreviewAdmin();
    $portCall = documentPreviewPortCall();
    $invoice = CostDocument::create([
        'port_call_id' => $portCall->id,
        'document_type' => 'vendor_invoice',
        'document_number' => 'INV-PREVIEW-001',
        'issuer_name' => 'PT Vendor Preview',
        'document_date' => '2026-10-07',
        'received_date' => '2026-10-07',
        'verified_total' => 100000,
        'document_path' => 'sja/vendor-invoices/invoice.pdf',
        'recorded_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)->get(route('vendor-invoices.document', $invoice).'?view=1');

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toStartWith('inline;');
});

test('authorized admin can preview a private funding payment proof inline', function () {
    Storage::fake('local');
    Storage::disk('local')->put('sja/funding/payment-proof.jpg', 'payment proof');

    $admin = documentPreviewAdmin();
    $payment = OutgoingPayment::create([
        'payment_type' => 'vendor_invoice',
        'amount' => 100000,
        'recipient' => 'PT Vendor Preview',
        'reference_number' => 'PAY-PREVIEW-001',
        'proof_path' => 'sja/funding/payment-proof.jpg',
        'recorded_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)->get(route('funding.documents.download', [
        'type' => 'payment',
        'id' => $payment->id,
    ]).'?view=1');

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toStartWith('inline;');
});

test('authorized admin can preview a private client invoice document inline', function () {
    Storage::fake('local');
    Storage::disk('local')->put('sja/client-invoices/signed.pdf', 'signed invoice');

    $admin = documentPreviewAdmin();
    $invoice = Invoice::create([
        'invoice_number' => 'INV-CLIENT-PREVIEW-001',
        'signed_document_path' => 'sja/client-invoices/signed.pdf',
    ]);

    $response = $this->actingAs($admin)->get(route('invoices.documents.download', [
        'invoice' => $invoice,
        'type' => 'signed',
    ]).'?view=1');

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toStartWith('inline;');
});

test('authorized admin can preview and download a generated client invoice pdf', function () {
    $admin = documentPreviewAdmin();
    $invoice = Invoice::create([
        'invoice_number' => 'INV-GENERATED-PREVIEW-001',
        'invoice_date' => '2026-10-07',
        'due_date' => '2026-10-21',
        'subtotal' => 1500000,
        'grand_total' => 1500000,
        'outstanding_amount' => 1500000,
        'notes' => 'Jasa keagenan kapal',
    ]);

    $preview = $this->actingAs($admin)->get(route('invoices.documents.generated', $invoice).'?view=1');
    $download = $this->actingAs($admin)->get(route('invoices.documents.generated', $invoice));

    $preview->assertOk()->assertHeader('content-type', 'application/pdf');
    $download->assertOk()->assertHeader('content-type', 'application/pdf');
    expect($preview->headers->get('content-disposition'))->toStartWith('inline;')
        ->and($download->headers->get('content-disposition'))->toStartWith('attachment;')
        ->and($preview->getContent())->toStartWith('%PDF-1.4')
        ->and($preview->getContent())->toContain('(PT. SAMUDRA JAYA ANDALAS) Tj')
        ->and($preview->getContent())->toContain('(INVOICE) Tj')
        ->and($preview->getContent())->toContain('(Pembayaran ditransfer ke:) Tj');
});

test('generated reimbursement document uses the reimbursement heading', function () {
    $admin = documentPreviewAdmin();
    $invoice = Invoice::create([
        'invoice_number' => 'RMB-GENERATED-PREVIEW-001',
        'invoice_type' => 'reimburse',
        'subject' => 'Reimbursement KM Preview Dokumen Voy. 024',
        'origin_port_name' => 'Pasang Kayu',
        'destination_port_name' => 'Lembar',
        'invoice_date' => '2026-10-07',
        'due_date' => '2026-10-21',
        'subtotal' => 750000,
        'grand_total' => 750000,
        'outstanding_amount' => 750000,
    ]);
    $invoice->items()->createMany([
        [
            'section_title' => 'Pengurusan Keagenan',
            'sort_order' => 0,
            'is_custom' => true,
            'description' => 'Biaya Kepelabuhanan',
            'quantity' => 1,
            'unit' => 'Paket',
            'unit_price' => 500000,
            'subtotal' => 500000,
        ],
        [
            'section_title' => 'Permintaan Kapal',
            'sort_order' => 1,
            'is_custom' => true,
            'description' => 'Air Tawar',
            'quantity' => 1,
            'unit' => 'Paket',
            'unit_price' => 250000,
            'subtotal' => 250000,
        ],
    ]);

    $response = $this->actingAs($admin)->get(route('invoices.documents.generated', $invoice).'?view=1');

    $response->assertOk()->assertHeader('content-type', 'application/pdf');
    expect($response->getContent())
        ->toContain('(REIMBURSEMENT) Tj')
        ->toContain('(I. Pengurusan Keagenan) Tj')
        ->toContain('(II. Permintaan Kapal) Tj')
        ->toContain('(Jumlah) Tj')
        ->toContain('(Pel. Asal) Tj')
        ->toContain('(Pasang Kayu) Tj')
        ->toContain('(Pel. Tujuan) Tj')
        ->toContain('(Lembar) Tj');
});

test('admin can release an invoice using a generated private pdf', function () {
    Storage::fake('local');
    $admin = documentPreviewAdmin();
    $invoice = Invoice::create([
        'invoice_number' => 'INV-GENERATED-RELEASE-001',
        'status' => 'draft',
        'invoice_date' => '2026-10-07',
        'due_date' => '2026-10-21',
        'subtotal' => 2500000,
        'grand_total' => 2500000,
        'outstanding_amount' => 2500000,
    ]);

    $response = $this->actingAs($admin)->post(route('invoices.release', $invoice), [
        'action' => 'release',
        'document_source' => 'generated',
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $invoice->refresh();

    expect($invoice->status)->toBe('released')
        ->and($invoice->document_source)->toBe('generated')
        ->and($invoice->signed_at)->toBeNull()
        ->and($invoice->signed_document_path)->not->toBeNull();
    Storage::disk('local')->assertExists($invoice->signed_document_path);
    expect(Storage::disk('local')->get($invoice->signed_document_path))->toStartWith('%PDF-1.4');
});

test('invoice release still requires a file when upload source is selected', function () {
    $admin = documentPreviewAdmin();
    $invoice = Invoice::create([
        'invoice_number' => 'INV-UPLOAD-REQUIRED-001',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($admin)->post(route('invoices.release', $invoice), [
        'action' => 'release',
        'document_source' => 'upload',
    ]);

    $response->assertSessionHasErrors('document');
    expect($invoice->fresh()->status)->toBe('draft');
});
