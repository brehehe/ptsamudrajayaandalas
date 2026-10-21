<?php

use App\Models\CompletionNote;
use App\Models\CostDocument;
use App\Models\Invoice;
use App\Models\OperationalActivity;
use App\Models\OutgoingPayment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $this->admin = User::factory()->create();
    $this->admin->syncRoles(['Admin']);
});

test('user can download template with sample rows for all 12 resources', function (string $resource) {
    $response = $this->actingAs($this->admin)->get(route('import-export.template', ['resource' => $resource]));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
})->with([
    'work_orders',
    'requests',
    'vessels',
    'products',
    'companies',
    'ports',
    'vendors',
    'expenses',
    'invoices',
    'completion-notes',
    'vendor-invoices',
    'operations',
]);

test('user can export data for all 12 resources', function (string $resource) {
    $response = $this->actingAs($this->admin)->get(route('import-export.export', ['resource' => $resource]));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
})->with([
    'work_orders',
    'requests',
    'vessels',
    'products',
    'companies',
    'ports',
    'vendors',
    'expenses',
    'invoices',
    'completion-notes',
    'vendor-invoices',
    'operations',
]);

test('user can import csv data into master ports', function () {
    $csvContent = "code,name,city,is_active\n"
        ."IDTST,Pelabuhan Test Import,Kota Uji,1\n";

    $file = UploadedFile::fake()->createWithContent('ports_sample.csv', $csvContent);

    $response = $this->actingAs($this->admin)->postJson(route('import-export.import', ['resource' => 'ports']), [
        'file' => $file,
    ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
    ]);

    $this->assertDatabaseHas('ports', [
        'code' => 'IDTST',
        'name' => 'Pelabuhan Test Import',
    ]);
});

test('user can import historical completed expenses and they are marked as verified', function () {
    $csvContent = "No Referensi / Bukti Bayar,Tanggal Bayar (YYYY-MM-DD),Penerima / Vendor / Karyawan,Nominal Bayar (Rp),Tipe (cash/transfer/giro),Nama Kapal (Opsional),No Job Kunjungan (Opsional),Status (Terverifikasi/Selesai/Menunggu),Keterangan Pengeluaran\n"
        ."TRF-TEST-99,2024-05-15,CV Sumber Bahari,3500000,transfer,TB Mitra Bahari 01,JOB-2024-01,Selesai,Arsip pengeluaran lampau\n";

    $file = UploadedFile::fake()->createWithContent('expenses_sample.csv', $csvContent);

    $response = $this->actingAs($this->admin)->postJson(route('import-export.import', ['resource' => 'expenses']), [
        'file' => $file,
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $expense = OutgoingPayment::where('reference_number', 'TRF-TEST-99')->first();
    expect($expense)->not->toBeNull()
        ->and($expense->verification_status)->toBe('verified')
        ->and((float) $expense->actual_amount)->toBe(3500000.0)
        ->and((float) $expense->remaining_amount)->toBe(0.0)
        ->and($expense->verified_at)->not->toBeNull();
});

test('user can import historical completed invoices with zero outstanding and paid status', function () {
    $csvContent = "No Invoice,Perusahaan Klien,Nama Kapal,No Job Kunjungan (Opsional),Tipe (agency/reimburse),Tanggal Invoice (YYYY-MM-DD),Jatuh Tempo (YYYY-MM-DD),Subtotal DPP (Rp),PPN / PPh (Rp),Total Tagihan (Rp),Status (Lunas/Terkirim/Dirilis/Draft),Catatan / Perihal\n"
        ."INV-TEST-99,PT Pelayaran Bahari Sejahtera,TB Mitra Bahari 01,,agency,2024-05-20,2024-06-05,10000000,1100000,11100000,Lunas,Tagihan lama sudah lunas\n";

    $file = UploadedFile::fake()->createWithContent('invoices_sample.csv', $csvContent);

    $response = $this->actingAs($this->admin)->postJson(route('import-export.import', ['resource' => 'invoices']), [
        'file' => $file,
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $invoice = Invoice::where('invoice_number', 'INV-TEST-99')->first();
    expect($invoice)->not->toBeNull()
        ->and($invoice->status)->toBe('paid')
        ->and((float) $invoice->paid_amount)->toBe(11100000.0)
        ->and((float) $invoice->outstanding_amount)->toBe(0.0)
        ->and($invoice->delivery_status)->toBe('delivered');
});

test('user can import historical completed completion notes', function () {
    $csvContent = "No Nota Rampung,Nama Kapal,No Job Kunjungan (Opsional),Tanggal Terbit (YYYY-MM-DD),Waktu Berangkat (YYYY-MM-DD HH:mm),Total Realisasi Resmi (Rp),Status (Selesai/Terverifikasi/Diunggah/Menunggu),Keterangan Rekonsiliasi\n"
        ."NR-TEST-99,TB Mitra Bahari 01,,2024-05-22,2024-05-22 14:00,12500000,Selesai,Nota rampung historis\n";

    $file = UploadedFile::fake()->createWithContent('completion_notes_sample.csv', $csvContent);

    $response = $this->actingAs($this->admin)->postJson(route('import-export.import', ['resource' => 'completion-notes']), [
        'file' => $file,
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $note = CompletionNote::where('document_number', 'NR-TEST-99')->first();
    expect($note)->not->toBeNull()
        ->and($note->status)->toBe('reconciled')
        ->and((float) $note->actual_amount)->toBe(12500000.0);
});

test('user can import historical completed vendor invoices and they are marked as verified and paid', function () {
    $csvContent = "No Invoice Vendor,Nama Vendor / Supplier,Nama Kapal,No Job Kunjungan (Opsional),Tanggal Dokumen (YYYY-MM-DD),Tanggal Diterima (YYYY-MM-DD),Total Tagihan Vendor (Rp),Status Verifikasi (Terverifikasi/Diterima),Status Bayar (Lunas/Belum Lunas),Keterangan\n"
        ."INV-VND-TEST-99,CV Tirta Test,TB Mitra Bahari 01,,2024-05-12,2024-05-13,2500000,Terverifikasi,Lunas,Invoice vendor lampau lunas\n";

    $file = UploadedFile::fake()->createWithContent('vendor_invoices_sample.csv', $csvContent);

    $response = $this->actingAs($this->admin)->postJson(route('import-export.import', ['resource' => 'vendor-invoices']), [
        'file' => $file,
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $doc = CostDocument::where('document_number', 'INV-VND-TEST-99')
        ->where('document_type', 'vendor_invoice')
        ->first();
    expect($doc)->not->toBeNull()
        ->and($doc->status)->toBe('verified')
        ->and($doc->payment_status)->toBe('paid')
        ->and((float) $doc->verified_total)->toBe(2500000.0)
        ->and((float) $doc->paid_amount)->toBe(2500000.0);
});

test('user can import historical completed operations activities', function () {
    $csvContent = "Tanggal Kegiatan (YYYY-MM-DD),Waktu Kegiatan (HH:mm),Nama Kapal,Kategori (Kegiatan Kapal/Bongkar Muat/Kendala/Umum),Judul Aktivitas,Uraian Detail Kegiatan,Lokasi / Dermaga,Progres (%),No Job Kunjungan (Opsional),Status (Selesai/Berjalan)\n"
        ."2024-05-16,08:30,TB Mitra Bahari 01,Kegiatan Kapal,Pemanduan Sandar Selesai,Kapal dipandu dan sandar aman,Dermaga Timur,100,,Selesai\n";

    $file = UploadedFile::fake()->createWithContent('operations_sample.csv', $csvContent);

    $response = $this->actingAs($this->admin)->postJson(route('import-export.import', ['resource' => 'operations']), [
        'file' => $file,
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $op = OperationalActivity::where('title', 'Pemanduan Sandar Selesai')->first();
    expect($op)->not->toBeNull()
        ->and($op->progress_percent)->toBe(100);
});
