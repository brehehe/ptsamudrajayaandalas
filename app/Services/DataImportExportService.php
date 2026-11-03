<?php

namespace App\Services;

use App\Models\CompletionNote;
use App\Models\CostDocument;
use App\Models\Invoice;
use App\Models\InvoiceItemSource;
use App\Models\OperationalActivity;
use App\Models\OutgoingPayment;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Product;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\Vendor;
use App\Models\WorkOrder;
use App\Support\ReportExportXlsxBuilder;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class DataImportExportService
{
    public function __construct(
        protected ReportExportXlsxBuilder $xlsxBuilder
    ) {}

    /**
     * Supported resource types.
     *
     * @var array<string, string>
     */
    public const RESOURCES = [
        'work-orders' => 'SPK / Work Order',
        'requests' => 'Pengajuan Kebutuhan Kapal',
        'vessels' => 'Master Kapal',
        'products' => 'Master Barang & Jasa',
        'companies' => 'Master Perusahaan Klien',
        'ports' => 'Master Pelabuhan',
        'vendors' => 'Master Vendor',
        'expenses' => 'Pengeluaran Kas & Pembayaran',
        'invoices' => 'Invoice & Tagihan Klien',
        'completion-notes' => 'Nota Rampung',
        'vendor-invoices' => 'Invoice Vendor',
        'operations' => 'Aktivitas Lapangan & Operasional',
    ];

    public function normalizeResource(string $resource): string
    {
        return str_replace('_', '-', strtolower(trim($resource)));
    }

    /**
     * Get column configuration for a resource.
     *
     * @return array<int, array{key: string, header: string, width: float, align: string, type: string, required?: bool}>
     */
    public function getColumns(string $resource): array
    {
        $resource = $this->normalizeResource($resource);

        return match ($resource) {
            'work-orders' => [
                ['key' => 'spk_number', 'header' => 'No SPK Klien', 'width' => 20, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'line_no', 'header' => 'No. Urut (1 / 1.2 / 1.3 / 1.4)', 'width' => 14, 'align' => 'center', 'type' => 'text', 'required' => true],
                ['key' => 'row_type', 'header' => 'Tipe Baris (SPK / Pengajuan / Inv Reimburse / Inv Keagenan)', 'width' => 30, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'job_number', 'header' => 'No Job Kunjungan (Opsional)', 'width' => 22, 'align' => 'left', 'type' => 'text'],
                ['key' => 'company_name', 'header' => 'Perusahaan Klien', 'width' => 28, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'ship_name', 'header' => 'Nama Kapal', 'width' => 24, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'port_name', 'header' => 'Pelabuhan Sandar', 'width' => 24, 'align' => 'left', 'type' => 'text'],
                ['key' => 'document_number', 'header' => 'No Dokumen (SPK / PGJ / INV)', 'width' => 24, 'align' => 'left', 'type' => 'text'],
                ['key' => 'service_category', 'header' => 'Kategori Layanan (deck/engine/logistics/agency/reimburse)', 'width' => 28, 'align' => 'center', 'type' => 'text'],
                ['key' => 'item_description', 'header' => 'Uraian Kebutuhan / Item Tagihan', 'width' => 36, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'item_type', 'header' => 'Tipe (jasa / non_jasa)', 'width' => 18, 'align' => 'center', 'type' => 'text'],
                ['key' => 'quantity', 'header' => 'Jumlah (Qty)', 'width' => 14, 'align' => 'right', 'type' => 'number'],
                ['key' => 'unit', 'header' => 'Satuan', 'width' => 14, 'align' => 'center', 'type' => 'text'],
                ['key' => 'unit_price', 'header' => 'Harga Satuan / HPP (Rp)', 'width' => 22, 'align' => 'right', 'type' => 'currency'],
                ['key' => 'total_price', 'header' => 'Total Nilai / Subtotal (Rp)', 'width' => 22, 'align' => 'right', 'type' => 'currency'],
                ['key' => 'status', 'header' => 'Status (active/disetujui/diajukan/draft/released/paid)', 'width' => 24, 'align' => 'center', 'type' => 'text'],
                ['key' => 'document_date', 'header' => 'Tanggal Dokumen (YYYY-MM-DD)', 'width' => 22, 'align' => 'center', 'type' => 'text'],
                ['key' => 'due_date', 'header' => 'Jatuh Tempo / ETD (YYYY-MM-DD)', 'width' => 22, 'align' => 'center', 'type' => 'text'],
                ['key' => 'pic_name', 'header' => 'Nama PIC Klien', 'width' => 20, 'align' => 'left', 'type' => 'text'],
                ['key' => 'pic_contact', 'header' => 'No HP PIC Klien', 'width' => 18, 'align' => 'left', 'type' => 'text'],
                ['key' => 'linked_item_name', 'header' => 'Kaitan Item Pengajuan (Untuk Invoice)', 'width' => 32, 'align' => 'left', 'type' => 'text'],
                ['key' => 'notes', 'header' => 'Catatan / Keterangan', 'width' => 30, 'align' => 'left', 'type' => 'text'],
            ],
            'requests' => [
                ['key' => 'request_number', 'header' => 'No Pengajuan', 'width' => 18, 'align' => 'left', 'type' => 'text'],
                ['key' => 'ship_name', 'header' => 'Nama Kapal', 'width' => 24, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'company_name', 'header' => 'Perusahaan Klien', 'width' => 28, 'align' => 'left', 'type' => 'text'],
                ['key' => 'port_name', 'header' => 'Pelabuhan', 'width' => 20, 'align' => 'left', 'type' => 'text'],
                ['key' => 'request_date', 'header' => 'Tanggal Pengajuan (YYYY-MM-DD)', 'width' => 24, 'align' => 'center', 'type' => 'text'],
                ['key' => 'item_name', 'header' => 'Nama Barang / Jasa', 'width' => 28, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'quantity', 'header' => 'Jumlah (Qty)', 'width' => 14, 'align' => 'right', 'type' => 'number', 'required' => true],
                ['key' => 'unit', 'header' => 'Satuan', 'width' => 12, 'align' => 'center', 'type' => 'text'],
                ['key' => 'hpp_price', 'header' => 'Estimasi HPP Satuan', 'width' => 20, 'align' => 'right', 'type' => 'currency'],
                ['key' => 'item_type', 'header' => 'Tipe (jasa/non_jasa)', 'width' => 18, 'align' => 'center', 'type' => 'text'],
                ['key' => 'job_number', 'header' => 'No. Job Kunjungan (Opsional)', 'width' => 22, 'align' => 'left', 'type' => 'text'],
                ['key' => 'status', 'header' => 'Status (Selesai/Disetujui/Menunggu)', 'width' => 24, 'align' => 'center', 'type' => 'text'],
                ['key' => 'notes', 'header' => 'Catatan / Keterangan', 'width' => 30, 'align' => 'left', 'type' => 'text'],
            ],
            'vessels' => [
                ['key' => 'name', 'header' => 'Nama Kapal', 'width' => 26, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'company_name', 'header' => 'Perusahaan Pemilik', 'width' => 28, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'imo_number', 'header' => 'Nomor IMO', 'width' => 16, 'align' => 'left', 'type' => 'text'],
                ['key' => 'call_sign', 'header' => 'Call Sign', 'width' => 16, 'align' => 'left', 'type' => 'text'],
                ['key' => 'flag', 'header' => 'Bendera', 'width' => 16, 'align' => 'left', 'type' => 'text'],
                ['key' => 'ship_type', 'header' => 'Jenis Kapal', 'width' => 18, 'align' => 'left', 'type' => 'text'],
                ['key' => 'gross_tonnage', 'header' => 'Gross Tonnage (GT)', 'width' => 18, 'align' => 'right', 'type' => 'number'],
                ['key' => 'length', 'header' => 'Panjang LOA (m)', 'width' => 18, 'align' => 'right', 'type' => 'number'],
                ['key' => 'captain_name', 'header' => 'Nama Kapten', 'width' => 22, 'align' => 'left', 'type' => 'text'],
                ['key' => 'captain_phone', 'header' => 'No HP Kapten', 'width' => 18, 'align' => 'left', 'type' => 'text'],
                ['key' => 'port_name', 'header' => 'Pelabuhan Pangkalan', 'width' => 22, 'align' => 'left', 'type' => 'text'],
            ],
            'products' => [
                ['key' => 'code', 'header' => 'Kode Produk', 'width' => 16, 'align' => 'left', 'type' => 'text'],
                ['key' => 'name', 'header' => 'Nama Produk / Jasa', 'width' => 28, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'category', 'header' => 'Kategori', 'width' => 20, 'align' => 'left', 'type' => 'text'],
                ['key' => 'item_type', 'header' => 'Tipe (jasa/non_jasa)', 'width' => 18, 'align' => 'center', 'type' => 'text', 'required' => true],
                ['key' => 'unit', 'header' => 'Satuan', 'width' => 14, 'align' => 'center', 'type' => 'text'],
                ['key' => 'hpp_default', 'header' => 'HPP Default (Biaya Beli)', 'width' => 22, 'align' => 'right', 'type' => 'currency'],
                ['key' => 'selling_price_default', 'header' => 'Harga Jual Default', 'width' => 20, 'align' => 'right', 'type' => 'currency'],
                ['key' => 'price_sandar', 'header' => 'Harga Sandar', 'width' => 18, 'align' => 'right', 'type' => 'currency'],
                ['key' => 'price_labuh', 'header' => 'Harga Labuh', 'width' => 18, 'align' => 'right', 'type' => 'currency'],
                ['key' => 'vendor_name', 'header' => 'Nama Vendor Pemasok', 'width' => 26, 'align' => 'left', 'type' => 'text'],
                ['key' => 'description', 'header' => 'Keterangan', 'width' => 30, 'align' => 'left', 'type' => 'text'],
            ],
            'companies' => [
                ['key' => 'code', 'header' => 'Kode Perusahaan', 'width' => 16, 'align' => 'left', 'type' => 'text'],
                ['key' => 'name', 'header' => 'Nama Perusahaan', 'width' => 30, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'email', 'header' => 'Email', 'width' => 26, 'align' => 'left', 'type' => 'text'],
                ['key' => 'phone', 'header' => 'No Telepon', 'width' => 18, 'align' => 'left', 'type' => 'text'],
                ['key' => 'address', 'header' => 'Alamat Kantor', 'width' => 36, 'align' => 'left', 'type' => 'text'],
            ],
            'ports' => [
                ['key' => 'code', 'header' => 'Kode Pelabuhan', 'width' => 16, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'name', 'header' => 'Nama Pelabuhan', 'width' => 28, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'city', 'header' => 'Kota / Wilayah', 'width' => 22, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'country', 'header' => 'Negara', 'width' => 18, 'align' => 'left', 'type' => 'text'],
                ['key' => 'timezone', 'header' => 'Zona Waktu', 'width' => 20, 'align' => 'left', 'type' => 'text'],
            ],
            'vendors' => [
                ['key' => 'code', 'header' => 'Kode Vendor', 'width' => 16, 'align' => 'left', 'type' => 'text'],
                ['key' => 'name', 'header' => 'Nama Vendor / Suplier', 'width' => 30, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'email', 'header' => 'Email', 'width' => 26, 'align' => 'left', 'type' => 'text'],
                ['key' => 'phone', 'header' => 'No Telepon', 'width' => 18, 'align' => 'left', 'type' => 'text'],
                ['key' => 'address', 'header' => 'Alamat Kantor / Depo', 'width' => 36, 'align' => 'left', 'type' => 'text'],
            ],
            'expenses' => [
                ['key' => 'reference_number', 'header' => 'No Referensi / Bukti Bayar', 'width' => 24, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'payment_date', 'header' => 'Tanggal Bayar (YYYY-MM-DD)', 'width' => 22, 'align' => 'center', 'type' => 'text', 'required' => true],
                ['key' => 'recipient', 'header' => 'Penerima / Vendor / Karyawan', 'width' => 28, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'amount', 'header' => 'Nominal Bayar (Rp)', 'width' => 22, 'align' => 'right', 'type' => 'currency', 'required' => true],
                ['key' => 'payment_type', 'header' => 'Tipe (cash/transfer/giro)', 'width' => 18, 'align' => 'center', 'type' => 'text'],
                ['key' => 'ship_name', 'header' => 'Nama Kapal (Opsional)', 'width' => 24, 'align' => 'left', 'type' => 'text'],
                ['key' => 'job_number', 'header' => 'No Job Kunjungan (Opsional)', 'width' => 22, 'align' => 'left', 'type' => 'text'],
                ['key' => 'verification_status', 'header' => 'Status (Terverifikasi/Selesai/Menunggu)', 'width' => 26, 'align' => 'center', 'type' => 'text'],
                ['key' => 'notes', 'header' => 'Keterangan Pengeluaran', 'width' => 32, 'align' => 'left', 'type' => 'text'],
            ],
            'invoices' => [
                ['key' => 'invoice_number', 'header' => 'No Invoice', 'width' => 22, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'company_name', 'header' => 'Perusahaan Klien', 'width' => 28, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'ship_name', 'header' => 'Nama Kapal', 'width' => 24, 'align' => 'left', 'type' => 'text'],
                ['key' => 'job_number', 'header' => 'No Job Kunjungan (Opsional)', 'width' => 22, 'align' => 'left', 'type' => 'text'],
                ['key' => 'invoice_type', 'header' => 'Tipe (agency/reimburse)', 'width' => 18, 'align' => 'center', 'type' => 'text', 'required' => true],
                ['key' => 'invoice_date', 'header' => 'Tanggal Invoice (YYYY-MM-DD)', 'width' => 22, 'align' => 'center', 'type' => 'text', 'required' => true],
                ['key' => 'due_date', 'header' => 'Jatuh Tempo (YYYY-MM-DD)', 'width' => 22, 'align' => 'center', 'type' => 'text'],
                ['key' => 'subtotal', 'header' => 'Subtotal DPP (Rp)', 'width' => 20, 'align' => 'right', 'type' => 'currency'],
                ['key' => 'tax', 'header' => 'PPN / PPh (Rp)', 'width' => 18, 'align' => 'right', 'type' => 'currency'],
                ['key' => 'grand_total', 'header' => 'Total Tagihan (Rp)', 'width' => 22, 'align' => 'right', 'type' => 'currency', 'required' => true],
                ['key' => 'status', 'header' => 'Status (Lunas/Terkirim/Dirilis/Draft)', 'width' => 24, 'align' => 'center', 'type' => 'text'],
                ['key' => 'notes', 'header' => 'Catatan / Perihal', 'width' => 30, 'align' => 'left', 'type' => 'text'],
            ],
            'completion-notes' => [
                ['key' => 'document_number', 'header' => 'No Nota Rampung', 'width' => 22, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'ship_name', 'header' => 'Nama Kapal', 'width' => 24, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'job_number', 'header' => 'No Job Kunjungan (Opsional)', 'width' => 22, 'align' => 'left', 'type' => 'text'],
                ['key' => 'issued_at', 'header' => 'Tanggal Terbit (YYYY-MM-DD)', 'width' => 22, 'align' => 'center', 'type' => 'text', 'required' => true],
                ['key' => 'departed_at', 'header' => 'Waktu Berangkat (YYYY-MM-DD HH:mm)', 'width' => 26, 'align' => 'center', 'type' => 'text'],
                ['key' => 'actual_amount', 'header' => 'Total Realisasi Resmi (Rp)', 'width' => 22, 'align' => 'right', 'type' => 'currency', 'required' => true],
                ['key' => 'status', 'header' => 'Status (Selesai/Terverifikasi/Diunggah/Menunggu)', 'width' => 28, 'align' => 'center', 'type' => 'text'],
                ['key' => 'notes', 'header' => 'Keterangan Rekonsiliasi', 'width' => 30, 'align' => 'left', 'type' => 'text'],
            ],
            'vendor-invoices' => [
                ['key' => 'document_number', 'header' => 'No Invoice Vendor', 'width' => 22, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'vendor_name', 'header' => 'Nama Vendor / Supplier', 'width' => 28, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'ship_name', 'header' => 'Nama Kapal', 'width' => 24, 'align' => 'left', 'type' => 'text'],
                ['key' => 'job_number', 'header' => 'No Job Kunjungan (Opsional)', 'width' => 22, 'align' => 'left', 'type' => 'text'],
                ['key' => 'document_date', 'header' => 'Tanggal Dokumen (YYYY-MM-DD)', 'width' => 22, 'align' => 'center', 'type' => 'text', 'required' => true],
                ['key' => 'received_date', 'header' => 'Tanggal Diterima (YYYY-MM-DD)', 'width' => 22, 'align' => 'center', 'type' => 'text'],
                ['key' => 'total_amount', 'header' => 'Total Tagihan Vendor (Rp)', 'width' => 22, 'align' => 'right', 'type' => 'currency', 'required' => true],
                ['key' => 'status', 'header' => 'Status Verifikasi (Terverifikasi/Diterima)', 'width' => 26, 'align' => 'center', 'type' => 'text'],
                ['key' => 'payment_status', 'header' => 'Status Bayar (Lunas/Belum Lunas)', 'width' => 24, 'align' => 'center', 'type' => 'text'],
                ['key' => 'notes', 'header' => 'Keterangan', 'width' => 30, 'align' => 'left', 'type' => 'text'],
            ],
            'operations' => [
                ['key' => 'activity_date', 'header' => 'Tanggal Kegiatan (YYYY-MM-DD)', 'width' => 22, 'align' => 'center', 'type' => 'text', 'required' => true],
                ['key' => 'activity_time', 'header' => 'Waktu Kegiatan (HH:mm)', 'width' => 18, 'align' => 'center', 'type' => 'text'],
                ['key' => 'ship_name', 'header' => 'Nama Kapal', 'width' => 24, 'align' => 'left', 'type' => 'text'],
                ['key' => 'category', 'header' => 'Kategori (Kegiatan Kapal/Bongkar Muat/Kendala/Umum)', 'width' => 26, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'title', 'header' => 'Judul Aktivitas', 'width' => 28, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'detail', 'header' => 'Uraian Detail Kegiatan', 'width' => 36, 'align' => 'left', 'type' => 'text', 'required' => true],
                ['key' => 'location_name', 'header' => 'Lokasi / Dermaga', 'width' => 24, 'align' => 'left', 'type' => 'text'],
                ['key' => 'progress_percent', 'header' => 'Progres (%)', 'width' => 14, 'align' => 'right', 'type' => 'number'],
                ['key' => 'job_number', 'header' => 'No Job Kunjungan (Opsional)', 'width' => 22, 'align' => 'left', 'type' => 'text'],
                ['key' => 'status', 'header' => 'Status (Selesai/Berjalan)', 'width' => 18, 'align' => 'center', 'type' => 'text'],
            ],
            default => throw new RuntimeException("Resource {$resource} tidak dikenali."),
        };
    }

    /**
     * Get 1 or 2 realistic sample rows for each resource.
     *
     * @return array<int, array<int, mixed>>
     */
    public function getSampleRows(string $resource): array
    {
        $resource = $this->normalizeResource($resource);

        return match ($resource) {
            'work-orders' => [
                // === 1. SPK 1 (TB Mitra Bahari 01 - 4 Item Pengajuan, 2 Item Inv Reimburse, 1 Item Inv Keagenan) ===
                // 1. SPK
                [
                    'SPK/2026/XI/001', '1.', 'SPK', 'JOB-2026-0001', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'Pelabuhan Tanjung Perak', 'SPK/2026/XI/001', 'agency', 'Pelayanan Keagenan & Logistik TB Mitra Bahari 01', 'jasa', 1, 'Trip', 0, 0, 'active', '2026-11-01', '2026-11-06', 'Bpk. Rahmat Hidayat', '081234567890', '', 'SPK Pelayanan Keagenan & Kebutuhan Kapal Sandar',
                ],
                // 1.2 Pengajuan Kebutuhan (4 Item)
                [
                    'SPK/2026/XI/001', '1.2', 'Pengajuan', 'JOB-2026-0001', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'Pelabuhan Tanjung Perak', 'PGJ-2026-0001', 'logistics', 'Pasokan Air Tawar Bersih Kapal (Fresh Water)', 'non_jasa', 50, 'Ton', 50000, 2500000, 'disetujui', '2026-11-02', '', 'Bpk. Rahmat Hidayat', '081234567890', '', 'Pengisian air tawar via tangki dermaga',
                ],
                [
                    'SPK/2026/XI/001', '1.2', 'Pengajuan', 'JOB-2026-0001', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'Pelabuhan Tanjung Perak', 'PGJ-2026-0001', 'agency', 'Jasa Port Clearance In & Out Syahbandar', 'jasa', 1, 'Kegiatan', 3500000, 3500000, 'disetujui', '2026-11-02', '', 'Bpk. Rahmat Hidayat', '081234567890', '', 'Formalitas perizinan kedatangan dan keberangkatan',
                ],
                [
                    'SPK/2026/XI/001', '1.2', 'Pengajuan', 'JOB-2026-0001', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'Pelabuhan Tanjung Perak', 'PGJ-2026-0001', 'deck', 'Jasa Pemanduan & Penundaan Kapal (Pilot & Tug)', 'jasa', 2, 'Gerakan', 2000000, 4000000, 'disetujui', '2026-11-02', '', 'Bpk. Rahmat Hidayat', '081234567890', '', 'Pemanduan alur dan olah gerak sandar kapal',
                ],
                [
                    'SPK/2026/XI/001', '1.2', 'Pengajuan', 'JOB-2026-0001', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'Pelabuhan Tanjung Perak', 'PGJ-2026-0001', 'engine', 'Pelumas Mesin Induk Meditran Marine', 'non_jasa', 4, 'Drum', 1800000, 7200000, 'disetujui', '2026-11-02', '', 'Bpk. Rahmat Hidayat', '081234567890', '', 'Penggantian oli berkala mesin utama',
                ],
                // 1.3 Invoice Reimbursement (2 Item)
                [
                    'SPK/2026/XI/001', '1.3', 'Invoice Reimbursement', 'JOB-2026-0001', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'Pelabuhan Tanjung Perak', 'INV/2026/RMB/001', 'reimburse', 'Reimbursement Pasokan Air Tawar 50 Ton', 'non_jasa', 50, 'Ton', 65000, 3250000, 'released', '2026-11-03', '2026-11-20', 'Bpk. Rahmat Hidayat', '081234567890', 'Pasokan Air Tawar Bersih Kapal (Fresh Water)', 'Tagihan reimbursement air tawar sesuai meteran',
                ],
                [
                    'SPK/2026/XI/001', '1.3', 'Invoice Reimbursement', 'JOB-2026-0001', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'Pelabuhan Tanjung Perak', 'INV/2026/RMB/001', 'reimburse', 'Reimbursement PNBP Port Clearance Syahbandar', 'jasa', 1, 'Kegiatan', 3500000, 3500000, 'released', '2026-11-03', '2026-11-20', 'Bpk. Rahmat Hidayat', '081234567890', 'Jasa Port Clearance In & Out Syahbandar', 'Sesuai kuitansi resmi PNBP Syahbandar',
                ],
                // 1.4 Invoice Jasa Keagenan (1 Item)
                [
                    'SPK/2026/XI/001', '1.4', 'Invoice Jasa Keagenan', 'JOB-2026-0001', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'Pelabuhan Tanjung Perak', 'INV/2026/AGY/001', 'agency', 'Jasa Pengurusan Keagenan Kapal Sandar (Agency Fee)', 'jasa', 1, 'Paket', 5000000, 5000000, 'released', '2026-11-03', '2026-11-20', 'Bpk. Rahmat Hidayat', '081234567890', '', 'Agency fee resmi operasional keagenan kapal',
                ],

                // === 2. SPK 2 (MV Samudra Jaya 88 - 6 Item Pengajuan, 3 Item Inv Reimburse, 1 Item Inv Keagenan) ===
                // 2. SPK
                [
                    'SPK/2026/XI/002', '2.', 'SPK', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'SPK/2026/XI/002', 'agency', 'Pelayanan Keagenan & Kebutuhan Bongkar Muat MV Samudra Jaya 88', 'jasa', 1, 'Trip', 0, 0, 'active', '2026-11-03', '2026-11-08', 'Ibu Siti Aminah', '081398765432', '', 'Pelayanan keagenan kapal muatan curah',
                ],
                // 2.1 Pengajuan Kebutuhan (6 Item)
                [
                    'SPK/2026/XI/002', '2.1', 'Pengajuan', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'PGJ-2026-0002', 'deck', 'Jasa Pandu & Tunda Pelindo (EPB Sandar & Tolak)', 'jasa', 2, 'Gerakan', 2500000, 5000000, 'diajukan', '2026-11-04', '', 'Ibu Siti Aminah', '081398765432', '', 'Pemanduan alur masuk dermaga jetty',
                ],
                [
                    'SPK/2026/XI/002', '2.1', 'Pengajuan', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'PGJ-2026-0002', 'engine', 'Penggantian Sparepart Filter Oli Mesin Induk', 'non_jasa', 4, 'Pcs', 750000, 3000000, 'diajukan', '2026-11-04', '', 'Ibu Siti Aminah', '081398765432', '', 'Suku cadang mesin induk Yanmar',
                ],
                [
                    'SPK/2026/XI/002', '2.1', 'Pengajuan', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'PGJ-2026-0002', 'logistics', 'Pasokan Bahan Makanan & Logistik ABK (Bama Fresh)', 'non_jasa', 1, 'Paket', 4500000, 4500000, 'diajukan', '2026-11-04', '', 'Ibu Siti Aminah', '081398765432', '', 'Bama fresh untuk 18 crew kapal selama 14 hari',
                ],
                [
                    'SPK/2026/XI/002', '2.1', 'Pengajuan', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'PGJ-2026-0002', 'deck', 'Tali Tambat Polypropylene 8 Strand (Mooring Rope)', 'non_jasa', 2, 'Coil', 6250000, 12500000, 'diajukan', '2026-11-04', '', 'Ibu Siti Aminah', '081398765432', '', 'Tali tambat pengganti haluan & buritan',
                ],
                [
                    'SPK/2026/XI/002', '2.1', 'Pengajuan', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'PGJ-2026-0002', 'agency', 'Pemberian Izin Sandar & Labuh Kantor KSOP', 'jasa', 1, 'Kegiatan', 1500000, 1500000, 'diajukan', '2026-11-04', '', 'Ibu Siti Aminah', '081398765432', '', 'Administrasi perizinan labuh jangkar KSOP',
                ],
                [
                    'SPK/2026/XI/002', '2.1', 'Pengajuan', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'PGJ-2026-0002', 'logistics', 'Pengisian Air Bersih Fresh Water 80 Ton', 'non_jasa', 80, 'Ton', 55000, 4400000, 'diajukan', '2026-11-04', '', 'Ibu Siti Aminah', '081398765432', '', 'Air bersih dari tongkang suplier lokal',
                ],
                // 2.2 Invoice Reimbursement (3 Item)
                [
                    'SPK/2026/XI/002', '2.2', 'Invoice Reimbursement', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'INV/2026/RMB/002', 'reimburse', 'Reimbursement Pandu Tunda Pelindo 2 Gerakan', 'jasa', 2, 'Gerakan', 2800000, 5600000, 'draft', '2026-11-05', '2026-11-25', 'Ibu Siti Aminah', '081398765432', 'Jasa Pandu & Tunda Pelindo (EPB Sandar & Tolak)', 'Penyesuaian tarif tarif resmi pemanduan',
                ],
                [
                    'SPK/2026/XI/002', '2.2', 'Invoice Reimbursement', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'INV/2026/RMB/002', 'reimburse', 'Reimbursement Filter Oli Mesin Induk 4 Pcs', 'non_jasa', 4, 'Pcs', 850000, 3400000, 'draft', '2026-11-05', '2026-11-25', 'Ibu Siti Aminah', '081398765432', 'Penggantian Sparepart Filter Oli Mesin Induk', 'Suku cadang terverifikasi',
                ],
                [
                    'SPK/2026/XI/002', '2.2', 'Invoice Reimbursement', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'INV/2026/RMB/002', 'reimburse', 'Reimbursement Air Bersih Fresh Water 80 Ton', 'non_jasa', 80, 'Ton', 65000, 5200000, 'draft', '2026-11-05', '2026-11-25', 'Ibu Siti Aminah', '081398765432', 'Pengisian Air Bersih Fresh Water 80 Ton', 'Reimbursement pasokan air tawar pelabuhan',
                ],
                // 2.3 Invoice Jasa Keagenan (1 Item)
                [
                    'SPK/2026/XI/002', '2.3', 'Invoice Jasa Keagenan', 'JOB-2026-0002', 'PT Indo Maritime Lines', 'MV Samudra Jaya 88', 'Pelabuhan Benete', 'INV/2026/AGY/002', 'agency', 'Paket Jasa Supervisi Operasional & Port Clearance Keagenan', 'jasa', 1, 'Paket', 7500000, 7500000, 'draft', '2026-11-05', '2026-11-25', 'Ibu Siti Aminah', '081398765432', '', 'Supervisi keagenan kapal bongkar muat',
                ],
            ],
            'requests' => [
                ['REQ-2024-0801', 'TB Mitra Bahari 01', 'PT Pelayaran Samudra Berlian', 'Pelabuhan Benete', '2024-08-15', 'Air Tawar (Fresh Water)', 50, 'Ton', 50000, 'non_jasa', 'JOB-2024-001', 'Selesai', 'Data arsip pengajuan lama yang sudah selesai'],
                ['REQ-2024-0802', 'TB Mitra Bahari 01', 'PT Pelayaran Samudra Berlian', 'Pelabuhan Benete', '2024-08-16', 'Port Clearance In & Out', 1, 'Kegiatan', 3500000, 'jasa', 'JOB-2024-001', 'Selesai', 'Formalitas izin sandar lampau'],
            ],
            'vessels' => [
                ['TB Mitra Bahari 01', 'PT Pelayaran Samudra Berlian', '9876543', 'YDA1234', 'Indonesia', 'Tugboat', 280, 32.5, 'Capt. Hendra Gunawan', '081198765432', 'Pelabuhan Benete'],
                ['BG Samudra 300', 'PT Pelayaran Samudra Berlian', '9876555', 'YDA5678', 'Indonesia', 'Barge', 3500, 91.4, 'Mualim I Rudi', '081298761234', 'Pelabuhan Benete'],
            ],
            'products' => [
                ['PRD-AT-01', 'Air Tawar Kapal (Fresh Water)', 'Air Tawar', 'non_jasa', 'Ton', 45000, 60000, 60000, 75000, 'CV Tirta Benete Makmur', 'Pengisian air tawar armada kapal'],
                ['PRD-CLR-01', 'Jasa Port Clearance In/Out', 'Jasa Keagenan', 'jasa', 'Kegiatan', 2500000, 3500000, 3500000, 3500000, 'PT Samudra Jaya Andalas', 'Formalitas kedatangan & keberangkatan kapal'],
            ],
            'companies' => [
                ['PSB', 'PT Pelayaran Samudra Berlian', 'ops@samudraberlian.co.id', '021-5551234', 'Jl. Pelabuhan Samudra No. 12, Jakarta Utara'],
                ['IML', 'PT Indo Maritime Lines', 'finance@indomaritime.com', '031-7788990', 'Jl. Tanjung Perak Timur No. 45, Surabaya'],
            ],
            'ports' => [
                ['IDBNT', 'Pelabuhan Benete', 'Sumbawa Barat', 'Indonesia', 'Asia/Makassar'],
                ['IDTKG', 'Pelabuhan Tanjung Perak', 'Surabaya', 'Indonesia', 'Asia/Jakarta'],
            ],
            'vendors' => [
                ['VND-TBM', 'CV Tirta Benete Makmur', 'info@tirtabenete.com', '08123456789', 'Kawasan Pelabuhan Benete Blok B No. 3'],
                ['VND-EBM', 'PT Energi Bahari Mandiri', 'supply@energibahari.co.id', '08118877665', 'Jl. Dermaga Niaga No. 10, Sumbawa Barat'],
            ],
            'expenses' => [
                ['TRF-2024-0511', '2024-05-15', 'CV Tirta Benete Makmur', 2500000, 'transfer', 'TB Mitra Bahari 01', 'JOB-2024-001', 'Selesai', 'Pelunasan pasokan fresh water trip Mei 2024'],
                ['CSH-2024-0602', '2024-06-02', 'Petugas Dermaga Benete', 750000, 'cash', 'TB Mitra Bahari 01', 'JOB-2024-001', 'Selesai', 'Biaya tambat & koordinasi dermaga selesai'],
            ],
            'invoices' => [
                ['INV/2024/05/001', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'JOB-2024-001', 'agency', '2024-05-20', '2024-06-05', 10000000, 1100000, 11100000, 'Lunas', 'Tagihan Jasa Keagenan Sandar Mei 2024'],
                ['INV/2024/05/002', 'PT Pelayaran Samudra Berlian', 'TB Mitra Bahari 01', 'JOB-2024-001', 'reimburse', '2024-05-21', '2024-06-05', 4500000, 0, 4500000, 'Lunas', 'Reimbursement biaya labuh & fresh water trip Mei 2024'],
            ],
            'completion-notes' => [
                ['NR/2024/05/001', 'TB Mitra Bahari 01', 'JOB-2024-001', '2024-05-22', '2024-05-22 14:00', 12500000, 'Selesai', 'Nota rampung resmi dari otoritas pelabuhan sudah direkonsiliasi'],
                ['NR/2024/06/002', 'TB Mitra Bahari 01', 'JOB-2024-001', '2024-06-18', '2024-06-18 10:30', 8900000, 'Selesai', 'Biaya labuh tambat resmi periode Juni 2024'],
            ],
            'vendor-invoices' => [
                ['INV-VND-2024-001', 'CV Tirta Benete Makmur', 'TB Mitra Bahari 01', 'JOB-2024-001', '2024-05-12', '2024-05-13', 2500000, 'Terverifikasi', 'Lunas', 'Pasokan air tawar TB Mitra Bahari 01 sudah lunas'],
                ['INV-VND-2024-002', 'PT Energi Bahari Mandiri', 'TB Mitra Bahari 01', 'JOB-2024-001', '2024-05-14', '2024-05-15', 15000000, 'Terverifikasi', 'Lunas', 'BBM Solar industri 1.500 Liter lunas'],
            ],
            'operations' => [
                ['2024-05-16', '08:30', 'TB Mitra Bahari 01', 'Kegiatan Kapal', 'Pemanduan & Olah Gerak Sandar', 'Kapal selesai dipandu dan sandar dengan selamat di Dermaga Timur.', 'Dermaga Timur Benete', 100, 'JOB-2024-001', 'Selesai'],
                ['2024-05-17', '14:00', 'TB Mitra Bahari 01', 'Bongkar Muat', 'Bongkar Muatan Batuan Andesit', 'Bongkar muat 2.500 MT batuan selesai lancar tanpa kendala.', 'Jetty 2 Benete', 100, 'JOB-2024-001', 'Selesai'],
            ],
            default => [],
        };
    }

    /**
     * Download Excel template containing the headers and 1-2 sample rows.
     */
    public function downloadTemplate(string $resource): BinaryFileResponse
    {
        $resource = $this->normalizeResource($resource);
        $columns = $this->getColumns($resource);
        $samples = $this->getSampleRows($resource);
        $resourceName = self::RESOURCES[$resource] ?? strtoupper($resource);

        $metaLines = $resource === 'work-orders'
            ? [
                'PETUNJUK FORMAT VERTIKAL TERPADU (HIERARKI SPK -> PENGAJUAN KEBUTUHAN -> INVOICE REIMBURSEMENT -> INVOICE JASA KEAGENAN):',
                '1. PEMISAHAN NO. URUT & TIPE BARIS: Kolom "No. Urut" memuat kode angka hierarki tingkat (1. / 1.2 / 1.3 / 1.4 untuk SPK 1, dan 2. / 2.1 / 2.2 / 2.3 untuk SPK 2). Kolom "Tipe Baris" diisi jenis baris entitas (SPK / Pengajuan / Invoice Reimbursement / Invoice Jasa Keagenan).',
                '2. PERBEDAAN TIPE BARIS & KODE: [SPK] = Data induk perintah kerja kapal (klien, kapal, pelabuhan, jadwal ETA/ETD, PIC); [Pengajuan] = Rincian kebutuhan modal/operasional kapal ke Direktur (HPP modal beli); [Inv Reimbursement] = Tagihan penggantian biaya riil operasional ke klien (air tawar, PNBP, EPB pandu tunda, sparepart); [Inv Jasa Keagenan] = Tagihan imbalan jasa keagenan resmi (Agency Fee) PT Samudra Jaya Andalas.',
                '3. FLEKSIBILITAS JUMLAH ITEM: Setiap SPK bebas memiliki jumlah item pengajuan & invoice yang berbeda-beda ke bawah (contoh: SPK 1 memiliki 4 item pengajuan & 2 invoice reimburse; SPK 2 memiliki 6 item pengajuan & 3 invoice reimburse).',
                '4. INTEGRASI HPP & LABA OTOMATIS: Kolom "Kaitan Item Pengajuan (Untuk Invoice)" pada baris invoice otomatis menghubungkan baris tagihan ke item pengajuan terkait sehingga sistem langsung membandingkan HPP modal vs Harga Jual dan menghitung Margin Laba secara otomatis.',
                '5. KUNCI PENGELOMPOKAN: Kolom "No SPK Klien" wajib diisi sama pada seluruh baris dalam satu paket SPK agar semua pengajuan dan invoice terkait terkumpul pada SPK yang benar.',
            ]
            : [
                'Petunjuk: Isi data di bawah baris judul. Disediakan 2 baris contoh data valid yang dapat dihapus/disesuaikan.',
                'Pastikan nama perusahaan, kapal, dan pelabuhan ditulis dengan benar.',
            ];

        $data = [
            'title' => "TEMPLATE IMPORT - {$resourceName}",
            'sheet_name' => 'Template',
            'meta_lines' => $metaLines,
            'columns' => array_map(fn ($c) => [
                'header' => $c['header'],
                'width' => $c['width'],
                'align' => $c['align'],
                'type' => $c['type'],
            ], $columns),
            'rows' => $samples,
        ];

        $filePath = $this->xlsxBuilder->build($data);
        $filename = "template-import-{$resource}.xlsx";

        return response()->download($filePath, $filename, [
            'Content-Type' => ReportExportXlsxBuilder::contentType(),
        ])->deleteFileAfterSend();
    }

    /**
     * Export all current data of a resource to Excel.
     */
    public function export(string $resource): BinaryFileResponse
    {
        $resource = $this->normalizeResource($resource);
        $columns = $this->getColumns($resource);
        $resourceName = self::RESOURCES[$resource] ?? strtoupper($resource);
        $rows = [];

        switch ($resource) {
            case 'work-orders':
                $items = WorkOrder::with([
                    'company',
                    'ship',
                    'port',
                    'portCall.port',
                    'portCall.requests.items',
                    'portCall.invoices.items.requestItem',
                    'portCall.invoices.items.sources.requestItem',
                ])->latest('created_at')->get();

                $spkIndex = 1;
                foreach ($items as $item) {
                    $portCall = $item->portCall;
                    $requests = $portCall?->requests ?? collect();
                    $invoices = $portCall?->invoices ?? collect();
                    $reimbInvoices = $invoices->where('invoice_type', 'reimburse');
                    $agencyInvoices = $invoices->where('invoice_type', 'agency');

                    $spkNumber = $item->client_number ?? $item->system_number;
                    $jobNumber = $portCall?->job_number ?? '-';
                    $companyName = $item->company?->name ?? '-';
                    $shipName = $item->ship?->name ?? '-';
                    $portName = $item->port?->name ?? ($portCall?->port?->name ?? '-');
                    $picName = $item->client_pic_name ?? '-';
                    $picContact = $item->client_pic_contact ?? '-';
                    $spkDate = $item->document_date?->format('Y-m-d') ?? '-';
                    $etdDate = $item->planned_etd_at?->format('Y-m-d') ?? ($portCall?->etd_at?->format('Y-m-d') ?? '-');

                    // 1. Baris Utama SPK
                    $rows[] = [
                        $spkNumber,
                        "{$spkIndex}.",
                        'SPK',
                        $jobNumber,
                        $companyName,
                        $shipName,
                        $portName,
                        $spkNumber,
                        'Keagenan Kapal',
                        "Pelayanan Keagenan & Kebutuhan Kapal {$shipName}",
                        'jasa',
                        1,
                        'Trip',
                        0,
                        0,
                        $item->status ?? 'active',
                        $spkDate,
                        $etdDate,
                        $picName,
                        $picContact,
                        '',
                        'Work Order / SPK Operasional Keagenan',
                    ];

                    // 2. Baris Pengajuan Pengajuannya
                    $prefixReq = "{$spkIndex}.".($spkIndex === 1 ? '2' : '1');
                    foreach ($requests as $req) {
                        foreach ($req->items as $reqItem) {
                            $hppPrice = (float) $reqItem->hpp_price;
                            $qty = (float) $reqItem->quantity;
                            $hppTotal = $hppPrice * $qty;

                            $rows[] = [
                                $spkNumber,
                                $prefixReq,
                                'Pengajuan',
                                $jobNumber,
                                $companyName,
                                $shipName,
                                $portName,
                                $req->request_number,
                                $req->service_type ?? 'logistics',
                                $reqItem->item_name,
                                $reqItem->item_type ?? 'non_jasa',
                                $qty,
                                $reqItem->unit ?? 'Unit',
                                $hppPrice,
                                $hppTotal,
                                $reqItem->status ?? $req->status ?? 'disetujui',
                                $reqItem->required_date?->format('Y-m-d') ?? ($req->request_date?->format('Y-m-d') ?? '-'),
                                '',
                                $picName,
                                $picContact,
                                '',
                                $req->notes ?? 'Rincian Kebutuhan Kapal',
                            ];
                        }
                    }

                    // 3. Baris Invoice Reimbursement
                    $prefixReimb = "{$spkIndex}.".($spkIndex === 1 ? '3' : '2');
                    foreach ($reimbInvoices as $rInv) {
                        foreach ($rInv->items as $rItem) {
                            $linkedName = $rItem->requestItem?->item_name
                                ?? $rItem->sources->first()?->requestItem?->item_name
                                ?? '';

                            $rows[] = [
                                $spkNumber,
                                $prefixReimb,
                                'Invoice Reimbursement',
                                $jobNumber,
                                $companyName,
                                $shipName,
                                $portName,
                                $rInv->invoice_number,
                                'reimburse',
                                $rItem->description,
                                'non_jasa',
                                (float) $rItem->quantity,
                                $rItem->unit ?? 'Unit',
                                (float) $rItem->unit_price,
                                (float) $rItem->subtotal,
                                $rInv->status ?? 'draft',
                                $rInv->invoice_date?->format('Y-m-d') ?? '-',
                                $rInv->due_date?->format('Y-m-d') ?? '-',
                                $picName,
                                $picContact,
                                $linkedName,
                                'Tagihan Reimbursement Biaya Operasional',
                            ];
                        }
                    }

                    // 4. Baris Invoice Jasa Keagenan
                    $prefixAgency = "{$spkIndex}.".($spkIndex === 1 ? '4' : '3');
                    foreach ($agencyInvoices as $aInv) {
                        foreach ($aInv->items as $aItem) {
                            $linkedName = $aItem->requestItem?->item_name
                                ?? $aItem->sources->first()?->requestItem?->item_name
                                ?? '';

                            $rows[] = [
                                $spkNumber,
                                $prefixAgency,
                                'Invoice Jasa Keagenan',
                                $jobNumber,
                                $companyName,
                                $shipName,
                                $portName,
                                $aInv->invoice_number,
                                'agency',
                                $aItem->description,
                                'jasa',
                                (float) $aItem->quantity,
                                $aItem->unit ?? 'Kegiatan',
                                (float) $aItem->unit_price,
                                (float) $aItem->subtotal,
                                $aInv->status ?? 'draft',
                                $aInv->invoice_date?->format('Y-m-d') ?? '-',
                                $aInv->due_date?->format('Y-m-d') ?? '-',
                                $picName,
                                $picContact,
                                $linkedName,
                                'Tagihan Jasa Keagenan Resmi',
                            ];
                        }
                    }

                    $spkIndex++;
                }

                if (empty($rows)) {
                    $rows = $this->getSampleRows('work-orders');
                }
                break;

            case 'requests':
                $items = ShipRequest::with(['ship', 'company', 'port', 'portCall', 'items'])->latest('created_at')->get();
                foreach ($items as $req) {
                    if ($req->items->isEmpty()) {
                        $rows[] = [
                            $req->request_number,
                            $req->ship?->name ?? '-',
                            $req->company?->name ?? '-',
                            $req->port?->name ?? '-',
                            $req->request_date?->format('Y-m-d') ?? '-',
                            'Tanpa Item Rincian',
                            0,
                            '-',
                            0,
                            $req->service_type ?? 'non_jasa',
                            $req->portCall?->job_number ?? '-',
                            $req->status ?? 'Selesai',
                            $req->notes ?? '-',
                        ];
                    } else {
                        foreach ($req->items as $it) {
                            $rows[] = [
                                $req->request_number,
                                $req->ship?->name ?? '-',
                                $req->company?->name ?? '-',
                                $req->port?->name ?? '-',
                                $req->request_date?->format('Y-m-d') ?? '-',
                                $it->item_name,
                                (float) $it->quantity,
                                $it->unit ?? 'Unit',
                                (float) $it->hpp_price,
                                $it->item_type ?? 'non_jasa',
                                $req->portCall?->job_number ?? '-',
                                $req->status ?? 'Selesai',
                                $it->notes ?? $req->notes ?? '-',
                            ];
                        }
                    }
                }
                break;

            case 'vessels':
                $items = Ship::with(['company', 'port'])->where('is_active', true)->orderBy('name')->get();
                foreach ($items as $item) {
                    $rows[] = [
                        $item->name,
                        $item->company?->name ?? '-',
                        $item->imo_number ?? '-',
                        $item->call_sign ?? '-',
                        $item->flag ?? 'Indonesia',
                        $item->ship_type ?? '-',
                        (float) $item->gross_tonnage,
                        (float) $item->length,
                        $item->captain_name ?? '-',
                        $item->captain_phone ?? '-',
                        $item->port?->name ?? '-',
                    ];
                }
                break;

            case 'products':
                $items = Product::with('vendor')->where('is_active', true)->orderBy('name')->get();
                foreach ($items as $item) {
                    $rows[] = [
                        $item->code ?? '-',
                        $item->name,
                        $item->category ?? '-',
                        $item->item_type ?? 'non_jasa',
                        $item->unit ?? 'Unit',
                        (float) $item->hpp_default,
                        (float) $item->selling_price_default,
                        (float) $item->price_sandar,
                        (float) $item->price_labuh,
                        $item->vendor?->name ?? '-',
                        $item->description ?? '-',
                    ];
                }
                break;

            case 'companies':
                $items = ShipCompany::where('is_active', true)->orderBy('name')->get();
                foreach ($items as $item) {
                    $rows[] = [
                        $item->code ?? '-',
                        $item->name,
                        $item->email ?? '-',
                        $item->phone ?? '-',
                        $item->address ?? '-',
                    ];
                }
                break;

            case 'ports':
                $items = Port::where('is_active', true)->orderBy('name')->get();
                foreach ($items as $item) {
                    $rows[] = [
                        $item->code,
                        $item->name,
                        $item->city,
                        $item->country ?? 'Indonesia',
                        $item->timezone ?? 'Asia/Makassar',
                    ];
                }
                break;

            case 'vendors':
                $items = Vendor::where('is_active', true)->orderBy('name')->get();
                foreach ($items as $item) {
                    $rows[] = [
                        $item->code ?? '-',
                        $item->name,
                        $item->email ?? '-',
                        $item->phone ?? '-',
                        $item->address ?? '-',
                    ];
                }
                break;

            case 'expenses':
                $items = OutgoingPayment::with(['portCall.ship', 'recorder', 'verifier'])
                    ->latest('payment_date')
                    ->get();
                foreach ($items as $item) {
                    $rows[] = [
                        $item->reference_number ?? '-',
                        $item->payment_date?->format('Y-m-d') ?? '-',
                        $item->recipient ?? '-',
                        (float) $item->amount,
                        $item->payment_type ?? 'transfer',
                        $item->portCall?->ship?->name ?? '-',
                        $item->portCall?->job_number ?? '-',
                        $item->verification_status === 'verified' ? 'Terverifikasi' : 'Menunggu',
                        $item->notes ?? '-',
                    ];
                }
                break;

            case 'invoices':
                $items = Invoice::with(['company', 'portCall.ship'])
                    ->latest('invoice_date')
                    ->get();
                foreach ($items as $item) {
                    $statusLabel = match ($item->status) {
                        'paid' => 'Lunas',
                        'sent' => 'Terkirim',
                        'released' => 'Dirilis',
                        default => 'Draft',
                    };
                    $rows[] = [
                        $item->invoice_number,
                        $item->company?->name ?? '-',
                        $item->portCall?->ship?->name ?? '-',
                        $item->portCall?->job_number ?? '-',
                        $item->invoice_type ?? 'agency',
                        $item->invoice_date?->format('Y-m-d') ?? '-',
                        $item->due_date?->format('Y-m-d') ?? '-',
                        (float) $item->subtotal,
                        (float) $item->tax,
                        (float) $item->grand_total,
                        $statusLabel,
                        $item->notes ?? $item->subject ?? '-',
                    ];
                }
                break;

            case 'completion-notes':
                $items = CompletionNote::with(['portCall.ship', 'uploader', 'verifier'])
                    ->latest('issued_at')
                    ->get();
                foreach ($items as $item) {
                    $statusLabel = in_array($item->status, ['reconciled', 'verified']) ? 'Selesai' : (
                        $item->status === 'uploaded' ? 'Diunggah' : 'Menunggu'
                    );
                    $rows[] = [
                        $item->document_number,
                        $item->portCall?->ship?->name ?? '-',
                        $item->portCall?->job_number ?? '-',
                        $item->issued_at?->format('Y-m-d') ?? '-',
                        $item->departed_at?->format('Y-m-d H:i') ?? '-',
                        (float) $item->actual_amount,
                        $statusLabel,
                        $item->notes ?? '-',
                    ];
                }
                break;

            case 'vendor-invoices':
                $items = CostDocument::where('document_type', 'vendor_invoice')
                    ->with(['vendor', 'portCall.ship'])
                    ->latest('document_date')
                    ->get();
                foreach ($items as $item) {
                    $total = (float) ($item->verified_total > 0 ? $item->verified_total : $item->estimated_total);
                    $rows[] = [
                        $item->document_number,
                        $item->vendor?->name ?? $item->issuer_name ?? '-',
                        $item->portCall?->ship?->name ?? '-',
                        $item->portCall?->job_number ?? '-',
                        $item->document_date?->format('Y-m-d') ?? '-',
                        $item->received_date?->format('Y-m-d') ?? '-',
                        $total,
                        $item->status === 'verified' ? 'Terverifikasi' : 'Diterima',
                        $item->payment_status === 'paid' ? 'Lunas' : 'Belum Lunas',
                        $item->notes ?? '-',
                    ];
                }
                break;

            case 'operations':
                $items = OperationalActivity::with(['ship', 'portCall'])
                    ->latest('activity_date')
                    ->latest('activity_time')
                    ->get();
                foreach ($items as $item) {
                    $rows[] = [
                        $item->activity_date?->format('Y-m-d') ?? '-',
                        $item->activity_time ?? '08:00',
                        $item->ship?->name ?? '-',
                        $item->category ?? 'Umum',
                        $item->title ?? '-',
                        $item->detail ?? '-',
                        $item->location_name ?? '-',
                        (int) $item->progress_percent,
                        $item->portCall?->job_number ?? '-',
                        $item->progress_percent >= 100 ? 'Selesai' : 'Berjalan',
                    ];
                }
                break;
        }

        $data = [
            'title' => "EKSPOR DATA - {$resourceName}",
            'sheet_name' => 'Data',
            'meta_lines' => [
                'Waktu Ekspor: '.now()->timezone('Asia/Jakarta')->format('d/m/Y H:i').' WIB',
                'Total Baris: '.count($rows).' data',
            ],
            'columns' => array_map(fn ($c) => [
                'header' => $c['header'],
                'width' => $c['width'],
                'align' => $c['align'],
                'type' => $c['type'],
            ], $columns),
            'rows' => $rows,
        ];

        $filePath = $this->xlsxBuilder->build($data);
        $dateStr = now()->format('Ymd');
        $filename = "ekspor-{$resource}-{$dateStr}.xlsx";

        return response()->download($filePath, $filename, [
            'Content-Type' => ReportExportXlsxBuilder::contentType(),
        ])->deleteFileAfterSend();
    }

    /**
     * Parse spreadsheet file (.xlsx or .csv) into an array of associative rows.
     *
     * @return array<int, array<string, mixed>>
     */
    public function parseFile(UploadedFile $file, array $columns): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $rawRows = [];

        if ($extension === 'csv' || $extension === 'txt') {
            $handle = fopen($file->getRealPath(), 'r');
            if ($handle !== false) {
                while (($data = fgetcsv($handle, 10000, ',')) !== false) {
                    if (count(array_filter($data)) > 0) {
                        $rawRows[] = $data;
                    }
                }
                fclose($handle);
            }
        } else {
            // Assume XLSX
            $zip = new ZipArchive;
            if ($zip->open($file->getRealPath()) !== true) {
                throw new RuntimeException('Berkas Excel tidak valid atau rusak.');
            }

            // 1. Shared Strings
            $sharedStrings = [];
            $ssXmlContent = $zip->getFromName('xl/sharedStrings.xml');
            if ($ssXmlContent !== false) {
                $ssXml = @simplexml_load_string($ssXmlContent);
                if ($ssXml && isset($ssXml->si)) {
                    foreach ($ssXml->si as $si) {
                        if (isset($si->t)) {
                            $sharedStrings[] = (string) $si->t;
                        } elseif (isset($si->r)) {
                            $text = '';
                            foreach ($si->r as $r) {
                                $text .= (string) $r->t;
                            }
                            $sharedStrings[] = $text;
                        } else {
                            $sharedStrings[] = '';
                        }
                    }
                }
            }

            // 2. Sheet 1
            $sheetXmlContent = $zip->getFromName('xl/worksheets/sheet1.xml');
            if ($sheetXmlContent === false) {
                $zip->close();
                throw new RuntimeException('Lembar kerja sheet1.xml tidak ditemukan di dalam berkas Excel.');
            }

            $sheetXml = @simplexml_load_string($sheetXmlContent);
            $zip->close();

            if (! $sheetXml || ! isset($sheetXml->sheetData->row)) {
                throw new RuntimeException('Lembar kerja Excel kosong atau tidak dapat dibaca.');
            }

            foreach ($sheetXml->sheetData->row as $r) {
                $cellsByCol = [];
                foreach ($r->c as $c) {
                    $ref = (string) $c['r'];
                    $t = (string) $c['t'];
                    preg_match('/([A-Z]+)/', $ref, $m);
                    $colLetter = $m[1] ?? 'A';
                    $colIndex = $this->letterToColumnNumber($colLetter) - 1;

                    $val = '';
                    if ($t === 's' && isset($c->v)) {
                        $sIndex = (int) $c->v;
                        $val = $sharedStrings[$sIndex] ?? '';
                    } elseif ($t === 'inlineStr' && isset($c->is->t)) {
                        $val = (string) $c->is->t;
                    } elseif (isset($c->v)) {
                        $val = (string) $c->v;
                    }

                    $cellsByCol[$colIndex] = trim($val);
                }

                if (! empty($cellsByCol)) {
                    $maxCol = max(array_keys($cellsByCol));
                    $fullRow = [];
                    for ($i = 0; $i <= $maxCol; $i++) {
                        $fullRow[$i] = $cellsByCol[$i] ?? '';
                    }
                    if (count(array_filter($fullRow)) > 0) {
                        $rawRows[] = $fullRow;
                    }
                }
            }
        }

        if (empty($rawRows)) {
            return [];
        }

        // Find header row by matching headers
        $headerRowIndex = null;
        $columnKeysOrder = array_column($columns, 'key');

        foreach ($rawRows as $idx => $r) {
            $normalizedRow = array_map(fn ($cell) => strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', (string) $cell))), $r);
            $matchCount = 0;
            foreach ($columns as $c) {
                $normExp = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $c['header'])));
                $normKey = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $c['key'])));
                if (in_array($normExp, $normalizedRow, true) || in_array($normKey, $normalizedRow, true)) {
                    $matchCount++;
                }
            }
            // If at least 2 expected headers or keys match, this is our header row
            if ($matchCount >= 2) {
                $headerRowIndex = $idx;
                break;
            }
        }

        // Map column indices to keys from the detected header row
        $columnIndexToKey = [];
        if ($headerRowIndex !== null) {
            $headerRow = $rawRows[$headerRowIndex];
            foreach ($headerRow as $cellColIdx => $headerVal) {
                $normHeader = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', (string) $headerVal)));
                if ($normHeader === '') {
                    continue;
                }
                foreach ($columns as $c) {
                    $normExp = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $c['header'])));
                    $normKey = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $c['key'])));
                    if ($normHeader === $normExp || $normHeader === $normKey) {
                        $columnIndexToKey[$cellColIdx] = $c['key'];
                        break;
                    }
                }
            }
        }

        $useHeaderMap = count($columnIndexToKey) >= min(2, count($columns));

        // If no header found, assume row 0 or row 4 (default template index)
        $dataStartIndex = $headerRowIndex !== null ? $headerRowIndex + 1 : 0;
        $result = [];

        for ($i = $dataStartIndex; $i < count($rawRows); $i++) {
            $rowValues = $rawRows[$i];
            // Skip empty rows or description/meta rows
            if (empty(array_filter($rowValues))) {
                continue;
            }

            // Skip template instruction lines that start with 'Petunjuk'
            if (str_starts_with(trim($rowValues[0] ?? ''), 'Petunjuk') || str_starts_with(trim($rowValues[0] ?? ''), 'Waktu Ekspor')) {
                continue;
            }

            $mapped = [];
            if ($useHeaderMap) {
                foreach ($columnIndexToKey as $colIdx => $key) {
                    $mapped[$key] = trim($rowValues[$colIdx] ?? '');
                }
            } else {
                foreach ($columnKeysOrder as $colIdx => $key) {
                    $mapped[$key] = trim($rowValues[$colIdx] ?? '');
                }
            }

            foreach ($columnKeysOrder as $key) {
                if (! isset($mapped[$key])) {
                    $mapped[$key] = '';
                }
            }

            $result[] = $mapped;
        }

        return $result;
    }

    /**
     * Import parsed rows into database.
     *
     * @return array{success: bool, imported_count: int, updated_count: int, skipped_count: int, errors: array<int, string>, message: string}
     */
    public function import(string $resource, UploadedFile $file, User $user): array
    {
        $resource = $this->normalizeResource($resource);
        $columns = $this->getColumns($resource);
        $rows = $this->parseFile($file, $columns);

        if (empty($rows)) {
            return [
                'success' => false,
                'imported_count' => 0,
                'updated_count' => 0,
                'skipped_count' => 0,
                'errors' => ['Tidak ada data yang dapat dibaca dari berkas yang diunggah. Pastikan format kolom sesuai dengan template.'],
                'message' => 'Tidak ada data valid yang ditemukan.',
            ];
        }

        $importedCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            switch ($resource) {
                case 'work-orders':
                    // Group rows by SPK (spk_number or client_number)
                    $groupedBySpk = [];
                    foreach ($rows as $idx => $row) {
                        $spkNum = trim((string) ($row['spk_number'] ?? $row['client_number'] ?? ''));
                        if (blank($spkNum)) {
                            $errors[] = 'Baris '.($idx + 1).': No SPK Klien wajib diisi.';
                            $skippedCount++;

                            continue;
                        }
                        $groupedBySpk[$spkNum][] = ['idx' => $idx + 1, 'row' => $row];
                    }

                    foreach ($groupedBySpk as $clientNumber => $items) {
                        // Find the SPK header row (containing 'spk' in row_type) or default to the first row
                        $spkRowData = null;
                        $firstLineNum = $items[0]['idx'];
                        foreach ($items as $entry) {
                            $rType = strtolower(trim((string) ($entry['row']['row_type'] ?? '')));
                            if ($rType === '' || str_contains($rType, 'spk')) {
                                $spkRowData = $entry['row'];
                                $firstLineNum = $entry['idx'];
                                break;
                            }
                        }
                        if (! $spkRowData) {
                            $spkRowData = $items[0]['row'];
                        }

                        $companyName = trim((string) ($spkRowData['company_name'] ?? ''));
                        $shipName = trim((string) ($spkRowData['ship_name'] ?? ''));

                        // If not found in spkRowData, search across any row in the group
                        if (blank($companyName) || blank($shipName)) {
                            foreach ($items as $entry) {
                                if (blank($companyName) && filled($entry['row']['company_name'] ?? '')) {
                                    $companyName = trim((string) $entry['row']['company_name']);
                                }
                                if (blank($shipName) && filled($entry['row']['ship_name'] ?? '')) {
                                    $shipName = trim((string) $entry['row']['ship_name']);
                                }
                            }
                        }

                        if (blank($companyName) || blank($shipName)) {
                            $errors[] = "Baris {$firstLineNum}: Perusahaan Klien dan Nama Kapal wajib diisi untuk SPK {$clientNumber}.";
                            $skippedCount += count($items);

                            continue;
                        }

                        $company = ShipCompany::firstOrCreate(
                            ['name' => $companyName],
                            ['code' => 'CMP-'.strtoupper(Str::random(5)), 'is_active' => true]
                        );

                        $ship = Ship::firstOrCreate(
                            ['name' => $shipName],
                            ['ship_company_id' => $company->id, 'flag' => 'Indonesia', 'is_active' => true]
                        );

                        $portId = null;
                        $portNameFound = trim((string) ($spkRowData['port_name'] ?? ''));
                        if (blank($portNameFound)) {
                            foreach ($items as $entry) {
                                if (filled($entry['row']['port_name'] ?? '')) {
                                    $portNameFound = trim((string) $entry['row']['port_name']);
                                    break;
                                }
                            }
                        }

                        if (filled($portNameFound)) {
                            $port = Port::firstOrCreate(
                                ['name' => $portNameFound],
                                ['code' => 'PRT-'.strtoupper(Str::random(5)), 'city' => 'Sumbawa', 'is_active' => true]
                            );
                            $portId = $port->id;
                        }

                        $docDate = $this->parseDate($spkRowData['document_date'] ?? null) ?? now();
                        $eta = $this->parseDate($spkRowData['planned_eta_at'] ?? $spkRowData['document_date'] ?? null) ?? $docDate;
                        $etd = $this->parseDate($spkRowData['due_date'] ?? $spkRowData['planned_etd_at'] ?? null);
                        $spkStatus = trim((string) ($spkRowData['status'] ?? $spkRowData['spk_status'] ?? 'active')) ?: 'active';

                        $picName = $spkRowData['pic_name'] ?? $spkRowData['client_pic_name'] ?? null;
                        $picContact = $spkRowData['pic_contact'] ?? $spkRowData['client_pic_contact'] ?? null;

                        $workOrder = WorkOrder::where('client_number', $clientNumber)->first();
                        if ($workOrder) {
                            $workOrder->update([
                                'company_id' => $company->id,
                                'planned_ship_id' => $ship->id,
                                'planned_port_id' => $portId ?? $workOrder->planned_port_id,
                                'document_date' => $docDate,
                                'planned_eta_at' => $eta,
                                'planned_etd_at' => $etd,
                                'client_pic_name' => $picName ?? $workOrder->client_pic_name,
                                'client_pic_contact' => $picContact ?? $workOrder->client_pic_contact,
                                'status' => $spkStatus,
                            ]);
                            $updatedCount++;
                        } else {
                            $systemNumber = sprintf('SPK-SJA-%s-%s', now()->format('ymd'), Str::upper(Str::random(6)));
                            $workOrder = WorkOrder::create([
                                'system_number' => $systemNumber,
                                'client_number' => $clientNumber,
                                'company_id' => $company->id,
                                'planned_ship_id' => $ship->id,
                                'planned_port_id' => $portId,
                                'document_date' => $docDate,
                                'received_at' => now(),
                                'source' => 'import',
                                'status' => $spkStatus,
                                'client_pic_name' => $picName,
                                'client_pic_contact' => $picContact,
                                'created_by' => $user->id,
                            ]);
                            $importedCount++;
                        }

                        // Automatically link or create PortCall (Job)
                        $jobNumber = trim((string) ($spkRowData['job_number'] ?? ''));
                        if (blank($jobNumber)) {
                            $jobNumber = sprintf('JOB-%s-%s', now()->format('Y'), Str::upper(Str::random(5)));
                        }

                        $portCall = PortCall::where('work_order_id', $workOrder->id)->first();
                        if (! $portCall) {
                            $portCall = PortCall::create([
                                'work_order_id' => $workOrder->id,
                                'ship_id' => $ship->id,
                                'port_id' => $portId ?? Port::first()?->id,
                                'job_number' => $jobNumber,
                                'status' => 'berthed',
                                'eta_at' => $eta,
                                'etd_at' => $etd ?? $docDate->copy()->addDays(3),
                            ]);
                        } elseif (filled($spkRowData['job_number'] ?? '')) {
                            $portCall->update(['job_number' => $jobNumber]);
                        }

                        $touchedInvoices = [];
                        $createdRequestItems = [];

                        // Pass 1: Process Pengajuan items first
                        foreach ($items as $entry) {
                            $row = $entry['row'];
                            $lineNo = trim((string) ($row['line_no'] ?? $row['no_urut'] ?? ''));
                            $rowType = strtolower(trim((string) ($row['row_type'] ?? '')));
                            $docNumber = trim((string) ($row['document_number'] ?? ''));

                            // Skip if this is explicitly the SPK summary row
                            if ((str_contains($rowType, 'spk') || in_array($lineNo, ['1.', '1', '2.', '2'], true)) && ! str_contains($rowType, 'pengajuan')) {
                                continue;
                            }

                            $isPengajuan = str_contains($rowType, 'pengajuan')
                                || str_contains($rowType, 'kebutuhan')
                                || str_contains($rowType, 'pgj')
                                || str_starts_with($lineNo, '1.2')
                                || str_starts_with($lineNo, '2.1')
                                || str_starts_with(strtoupper($docNumber), 'PGJ')
                                || str_starts_with(strtoupper($docNumber), 'REQ')
                                || filled($row['request_number'] ?? '')
                                || (! str_contains($rowType, 'reimburse') && ! str_contains($rowType, 'keagenan') && ! str_contains($rowType, 'agency') && filled($row['item_name'] ?? ''));

                            if (! $isPengajuan) {
                                continue;
                            }

                            $reqNumber = trim((string) ($row['document_number'] ?? $row['request_number'] ?? ''));
                            if (blank($reqNumber) || str_starts_with($reqNumber, 'SPK') || str_starts_with($reqNumber, 'INV')) {
                                $reqNumber = 'PGJ-'.now()->format('Y').'-'.Str::upper(Str::random(4));
                            }

                            $itemName = trim((string) ($row['item_description'] ?? $row['item_name'] ?? ''));
                            if (blank($itemName)) {
                                continue;
                            }

                            $reqStatus = trim((string) ($row['status'] ?? $row['request_status'] ?? 'disetujui'));
                            $isApproved = in_array(strtolower($reqStatus), ['disetujui', 'approved', 'selesai', 'completed'], true);
                            $serviceCategory = trim((string) ($row['service_category'] ?? $row['service_type'] ?? 'logistics')) ?: 'logistics';

                            $shipRequest = ShipRequest::where('request_number', $reqNumber)->first();
                            if (! $shipRequest) {
                                $shipRequest = ShipRequest::create([
                                    'request_number' => $reqNumber,
                                    'port_call_id' => $portCall->id,
                                    'ship_id' => $ship->id,
                                    'company_id' => $company->id,
                                    'port_id' => $portId ?? $portCall->port_id,
                                    'service_type' => $serviceCategory,
                                    'status' => $isApproved ? 'disetujui' : 'diajukan_ke_direktur',
                                    'request_date' => $this->parseDate($row['document_date'] ?? $row['required_date'] ?? null) ?? $docDate,
                                    'created_by' => $user->id,
                                ]);
                            }

                            $qty = (float) str_replace(',', '', (string) ($row['quantity'] ?? 1));
                            if ($qty <= 0) {
                                $qty = 1;
                            }
                            $unit = trim((string) ($row['unit'] ?? 'Unit')) ?: 'Unit';
                            $unitPrice = (float) str_replace(',', '', (string) ($row['unit_price'] ?? $row['hpp_price'] ?? 0));
                            $itemType = in_array(strtolower(trim((string) ($row['item_type'] ?? ''))), ['jasa', 'service'], true) ? 'jasa' : 'non_jasa';

                            $requestItem = RequestItem::where('request_id', $shipRequest->id)
                                ->where('item_name', $itemName)
                                ->first();

                            if (! $requestItem) {
                                $sellingPrice = (float) str_replace(',', '', (string) ($row['unit_price'] ?? $row['hpp_price'] ?? $row['reimburse_selling_price'] ?? $row['agency_selling_price'] ?? 0));
                                $requestItem = RequestItem::create([
                                    'request_id' => $shipRequest->id,
                                    'item_name' => $itemName,
                                    'item_type' => $itemType,
                                    'quantity' => $qty,
                                    'unit' => $unit,
                                    'hpp_price' => $unitPrice,
                                    'selling_price' => $sellingPrice,
                                    'required_date' => $this->parseDate($row['document_date'] ?? $row['required_date'] ?? null) ?? $docDate,
                                    'status' => $isApproved ? 'disetujui' : 'diajukan_ke_direktur',
                                    'director_status' => $isApproved ? 'approved' : 'pending',
                                ]);
                            }

                            $createdRequestItems[$itemName] = $requestItem;
                        }

                        // Pass 2: Process Invoices (Reimbursement and Agency)
                        foreach ($items as $entry) {
                            $row = $entry['row'];
                            $lineNo = trim((string) ($row['line_no'] ?? $row['no_urut'] ?? ''));
                            $rowType = strtolower(trim((string) ($row['row_type'] ?? '')));
                            $docNumber = trim((string) ($row['document_number'] ?? ''));
                            $itemDesc = trim((string) ($row['item_description'] ?? ''));
                            $linkedItemName = trim((string) ($row['linked_item_name'] ?? ''));

                            // Reimbursement invoice detection
                            $isReimburse = str_contains($rowType, 'reimburse')
                                || str_contains($rowType, 'rmb')
                                || str_starts_with($lineNo, '1.3')
                                || str_starts_with($lineNo, '2.2')
                                || strtolower(trim((string) ($row['service_category'] ?? ''))) === 'reimburse'
                                || (str_starts_with(strtoupper($docNumber), 'INV') && str_contains(strtoupper($docNumber), 'RMB'))
                                || filled($row['reimburse_invoice_number'] ?? '');

                            // Agency invoice detection
                            $isAgency = str_contains($rowType, 'agency')
                                || str_contains($rowType, 'keagenan')
                                || str_contains($rowType, 'agy')
                                || str_starts_with($lineNo, '1.4')
                                || str_starts_with($lineNo, '2.3')
                                || strtolower(trim((string) ($row['service_category'] ?? ''))) === 'agency'
                                || (str_starts_with(strtoupper($docNumber), 'INV') && str_contains(strtoupper($docNumber), 'AGY'))
                                || filled($row['agency_invoice_number'] ?? '');

                            // Process Reimbursement Invoice
                            if ($isReimburse) {
                                $reimbInvNumber = filled($docNumber) && ! str_starts_with(strtoupper($docNumber), 'SPK') && ! str_starts_with(strtoupper($docNumber), 'PGJ')
                                    ? $docNumber
                                    : (trim((string) ($row['reimburse_invoice_number'] ?? '')) ?: ('INV-'.now()->format('Y').'-RMB-'.Str::upper(Str::random(4))));

                                $reimbInv = Invoice::where('invoice_number', $reimbInvNumber)->first();
                                if (! $reimbInv) {
                                    $rawReimbStatus = strtolower(trim((string) ($row['status'] ?? $row['reimburse_status'] ?? 'draft')));
                                    $reimbStatus = match ($rawReimbStatus) {
                                        'paid', 'lunas' => 'paid',
                                        'released', 'terkirim', 'dirilis' => 'released',
                                        default => 'draft',
                                    };
                                    $reimbInv = Invoice::create([
                                        'invoice_number' => $reimbInvNumber,
                                        'port_call_id' => $portCall->id,
                                        'company_id' => $company->id,
                                        'request_id' => $portCall->requests()->first()?->id,
                                        'invoice_type' => 'reimburse',
                                        'invoice_date' => $this->parseDate($row['document_date'] ?? null) ?? $docDate,
                                        'due_date' => $this->parseDate($row['due_date'] ?? $row['reimburse_due_date'] ?? null) ?? $docDate->copy()->addDays(14),
                                        'subtotal' => 0,
                                        'addon_total' => 0,
                                        'discount' => 0,
                                        'tax' => 0,
                                        'grand_total' => 0,
                                        'paid_amount' => 0,
                                        'outstanding_amount' => 0,
                                        'currency' => 'IDR',
                                        'status' => $reimbStatus,
                                        'delivery_status' => 'pending',
                                        'version' => 1,
                                    ]);
                                }

                                $desc = $itemDesc ?: (trim((string) ($row['reimburse_description'] ?? '')) ?: 'Reimbursement Biaya Operasional');
                                $qty = (float) str_replace(',', '', (string) ($row['quantity'] ?? $row['reimburse_qty'] ?? 1));
                                if ($qty <= 0) {
                                    $qty = 1;
                                }
                                $unit = trim((string) ($row['unit'] ?? 'Unit')) ?: 'Unit';
                                $price = (float) str_replace(',', '', (string) ($row['unit_price'] ?? $row['reimburse_selling_price'] ?? 0));
                                $subtotal = (float) str_replace(',', '', (string) ($row['total_price'] ?? $row['reimburse_subtotal'] ?? ($qty * $price)));

                                // Find matching RequestItem
                                $matchedReqItem = null;
                                if (filled($linkedItemName) && isset($createdRequestItems[$linkedItemName])) {
                                    $matchedReqItem = $createdRequestItems[$linkedItemName];
                                } elseif (isset($createdRequestItems[$desc])) {
                                    $matchedReqItem = $createdRequestItems[$desc];
                                } else {
                                    foreach ($createdRequestItems as $k => $ritem) {
                                        if (str_contains(strtolower($desc), strtolower($k)) || str_contains(strtolower($k), strtolower($desc))) {
                                            $matchedReqItem = $ritem;
                                            break;
                                        }
                                    }
                                }

                                $existingReimbItem = $reimbInv->items()->where('description', $desc)->first();
                                if (! $existingReimbItem) {
                                    $invItem = $reimbInv->items()->create([
                                        'request_item_id' => $matchedReqItem?->id,
                                        'description' => $desc,
                                        'quantity' => $qty,
                                        'unit' => $unit,
                                        'unit_price' => $price,
                                        'subtotal' => $subtotal,
                                        'sort_order' => $reimbInv->items()->count(),
                                        'is_custom' => $matchedReqItem === null,
                                    ]);

                                    if ($matchedReqItem) {
                                        InvoiceItemSource::firstOrCreate([
                                            'invoice_item_id' => $invItem->id,
                                            'request_item_id' => $matchedReqItem->id,
                                        ], [
                                            'allocated_quantity' => $qty,
                                            'source_cost' => $qty * (float) $matchedReqItem->hpp_price,
                                        ]);
                                        $matchedReqItem->update(['is_invoiced' => true]);
                                    }
                                }
                                $touchedInvoices[$reimbInv->id] = $reimbInv;
                            }

                            // Process Agency Invoice
                            if ($isAgency) {
                                $agencyInvNumber = filled($docNumber) && ! str_starts_with(strtoupper($docNumber), 'SPK') && ! str_starts_with(strtoupper($docNumber), 'PGJ')
                                    ? $docNumber
                                    : (trim((string) ($row['agency_invoice_number'] ?? '')) ?: ('INV-'.now()->format('Y').'-AGY-'.Str::upper(Str::random(4))));

                                $agencyInv = Invoice::where('invoice_number', $agencyInvNumber)->first();
                                if (! $agencyInv) {
                                    $rawAgencyStatus = strtolower(trim((string) ($row['status'] ?? $row['agency_status'] ?? 'draft')));
                                    $agencyStatus = match ($rawAgencyStatus) {
                                        'paid', 'lunas' => 'paid',
                                        'released', 'terkirim', 'dirilis' => 'released',
                                        default => 'draft',
                                    };
                                    $agencyInv = Invoice::create([
                                        'invoice_number' => $agencyInvNumber,
                                        'port_call_id' => $portCall->id,
                                        'company_id' => $company->id,
                                        'request_id' => $portCall->requests()->first()?->id,
                                        'invoice_type' => 'agency',
                                        'invoice_date' => $this->parseDate($row['document_date'] ?? null) ?? $docDate,
                                        'due_date' => $this->parseDate($row['due_date'] ?? $row['agency_due_date'] ?? null) ?? $docDate->copy()->addDays(14),
                                        'subtotal' => 0,
                                        'addon_total' => 0,
                                        'discount' => 0,
                                        'tax' => 0,
                                        'grand_total' => 0,
                                        'paid_amount' => 0,
                                        'outstanding_amount' => 0,
                                        'currency' => 'IDR',
                                        'status' => $agencyStatus,
                                        'delivery_status' => 'pending',
                                        'version' => 1,
                                    ]);
                                }

                                $desc = $itemDesc ?: (trim((string) ($row['agency_description'] ?? '')) ?: 'Jasa Pelayanan Keagenan Kapal');
                                $qty = (float) str_replace(',', '', (string) ($row['quantity'] ?? $row['agency_qty'] ?? 1));
                                if ($qty <= 0) {
                                    $qty = 1;
                                }
                                $unit = trim((string) ($row['unit'] ?? 'Kegiatan')) ?: 'Kegiatan';
                                $price = (float) str_replace(',', '', (string) ($row['unit_price'] ?? $row['agency_selling_price'] ?? 0));
                                $subtotal = (float) str_replace(',', '', (string) ($row['total_price'] ?? $row['agency_subtotal'] ?? ($qty * $price)));

                                // Find matching RequestItem
                                $matchedReqItem = null;
                                if (filled($linkedItemName) && isset($createdRequestItems[$linkedItemName])) {
                                    $matchedReqItem = $createdRequestItems[$linkedItemName];
                                } elseif (isset($createdRequestItems[$desc])) {
                                    $matchedReqItem = $createdRequestItems[$desc];
                                } else {
                                    foreach ($createdRequestItems as $k => $ritem) {
                                        if (str_contains(strtolower($desc), strtolower($k)) || str_contains(strtolower($k), strtolower($desc))) {
                                            $matchedReqItem = $ritem;
                                            break;
                                        }
                                    }
                                }

                                $existingAgencyItem = $agencyInv->items()->where('description', $desc)->first();
                                if (! $existingAgencyItem) {
                                    $invItem = $agencyInv->items()->create([
                                        'request_item_id' => $matchedReqItem?->id,
                                        'description' => $desc,
                                        'quantity' => $qty,
                                        'unit' => $unit,
                                        'unit_price' => $price,
                                        'subtotal' => $subtotal,
                                        'sort_order' => $agencyInv->items()->count(),
                                        'is_custom' => $matchedReqItem === null,
                                    ]);

                                    if ($matchedReqItem) {
                                        InvoiceItemSource::firstOrCreate([
                                            'invoice_item_id' => $invItem->id,
                                            'request_item_id' => $matchedReqItem->id,
                                        ], [
                                            'allocated_quantity' => $qty,
                                            'source_cost' => $qty * (float) $matchedReqItem->hpp_price,
                                        ]);
                                        $matchedReqItem->update(['is_invoiced' => true]);
                                    }
                                }
                                $touchedInvoices[$agencyInv->id] = $agencyInv;
                            }
                        }

                        // Recalculate totals on touched invoices
                        foreach ($touchedInvoices as $inv) {
                            $inv->refresh();
                            $subtotal = (float) $inv->items()->sum('subtotal');
                            $tax = (float) $inv->tax;
                            $grandTotal = $subtotal + $tax;
                            $isPaid = in_array(strtolower($inv->status), ['paid', 'lunas'], true);
                            $inv->update([
                                'subtotal' => $subtotal,
                                'grand_total' => $grandTotal,
                                'paid_amount' => $isPaid ? $grandTotal : 0,
                                'outstanding_amount' => $isPaid ? 0 : $grandTotal,
                            ]);
                        }
                    }
                    break;

                case 'requests':
                    $requestsByNumber = [];
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $shipName = $row['ship_name'] ?? '';
                        $itemName = $row['item_name'] ?? '';

                        if (blank($shipName) || blank($itemName)) {
                            $errors[] = "Baris {$lineNum}: Nama Kapal dan Nama Barang/Jasa wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $ship = Ship::firstOrCreate(
                            ['name' => $shipName],
                            ['flag' => 'Indonesia', 'is_active' => true]
                        );

                        $companyId = $ship->ship_company_id;
                        if (filled($row['company_name'] ?? '')) {
                            $company = ShipCompany::firstOrCreate(
                                ['name' => $row['company_name']],
                                ['code' => strtoupper(Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $row['company_name']), 4, '')), 'is_active' => true]
                            );
                            $companyId = $company->id;
                        }

                        $portId = $ship->port_id;
                        if (filled($row['port_name'] ?? '')) {
                            $port = Port::firstOrCreate(
                                ['name' => $row['port_name']],
                                ['code' => strtoupper(Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $row['port_name']), 5, '')), 'city' => 'Sumbawa', 'is_active' => true]
                            );
                            $portId = $port->id;
                        }

                        $reqNumber = $row['request_number'] ?: ('PGJ-'.now()->format('Y').'-'.rand(1000, 9999));
                        $reqDate = $this->parseDate($row['request_date'] ?? null) ?? now();

                        // Parse status and historical completion attributes
                        $rawStatus = trim((string) ($row['status'] ?? ''));
                        if (blank($rawStatus) || stripos($rawStatus, 'selesai') !== false || stripos($rawStatus, 'done') !== false || stripos($rawStatus, 'finish') !== false) {
                            $reqStatus = 'Selesai';
                            $directorStatus = 'approved';
                            $completedAt = $reqDate;
                            $directorReviewedAt = $reqDate;
                        } elseif (stripos($rawStatus, 'disetujui') !== false || stripos($rawStatus, 'approved') !== false) {
                            $reqStatus = 'Disetujui';
                            $directorStatus = 'approved';
                            $completedAt = null;
                            $directorReviewedAt = $reqDate;
                        } elseif (stripos($rawStatus, 'proses') !== false) {
                            $reqStatus = 'Dalam Proses';
                            $directorStatus = 'approved';
                            $completedAt = null;
                            $directorReviewedAt = $reqDate;
                        } else {
                            $reqStatus = 'Menunggu Approval';
                            $directorStatus = 'pending';
                            $completedAt = null;
                            $directorReviewedAt = null;
                        }

                        // Link or create PortCall for job tracking if job_number provided
                        $portCallId = null;
                        $jobNumberInput = trim((string) ($row['job_number'] ?? ''));
                        if (filled($jobNumberInput)) {
                            $portCall = PortCall::where('job_number', $jobNumberInput)->first();
                            if (! $portCall) {
                                $portCall = PortCall::create([
                                    'ship_id' => $ship->id,
                                    'port_id' => $portId ?? Port::first()?->id,
                                    'job_number' => $jobNumberInput,
                                    'status' => $reqStatus === 'Selesai' ? 'completed' : 'berthed',
                                    'eta_at' => $reqDate,
                                    'etd_at' => $reqDate->addDays(2),
                                    'departed_at' => $reqStatus === 'Selesai' ? $reqDate->addDays(2) : null,
                                ]);
                            }
                            $portCallId = $portCall->id;
                        }

                        if (! isset($requestsByNumber[$reqNumber])) {
                            $shipRequest = ShipRequest::firstOrCreate(
                                ['request_number' => $reqNumber],
                                [
                                    'ship_id' => $ship->id,
                                    'company_id' => $companyId,
                                    'port_id' => $portId,
                                    'port_call_id' => $portCallId,
                                    'request_date' => $reqDate,
                                    'status' => $reqStatus,
                                    'completed_at' => $completedAt,
                                    'director_reviewed_at' => $directorReviewedAt,
                                    'service_type' => $row['item_type'] ?? 'non_jasa',
                                    'notes' => $row['notes'] ?? 'Hasil impor Excel',
                                    'created_by' => $user->id,
                                ]
                            );
                            $requestsByNumber[$reqNumber] = $shipRequest;
                            $importedCount++;
                        }

                        $targetReq = $requestsByNumber[$reqNumber];
                        $qty = (float) ($row['quantity'] ?? 1);
                        $hpp = (float) ($row['hpp_price'] ?? 0);

                        RequestItem::create([
                            'request_id' => $targetReq->id,
                            'item_name' => $itemName,
                            'quantity' => max(1, $qty),
                            'unit' => $row['unit'] ?: 'Unit',
                            'hpp_price' => $hpp,
                            'selling_price' => $hpp > 0 ? $hpp * 1.25 : 0,
                            'item_type' => $row['item_type'] ?: 'non_jasa',
                            'director_status' => $directorStatus,
                            'notes' => $row['notes'] ?? null,
                        ]);
                    }
                    break;

                case 'vessels':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $name = $row['name'] ?? '';
                        $companyName = $row['company_name'] ?? '';

                        if (blank($name)) {
                            $errors[] = "Baris {$lineNum}: Nama Kapal wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $companyId = null;
                        if (filled($companyName)) {
                            $company = ShipCompany::firstOrCreate(
                                ['name' => $companyName],
                                ['code' => strtoupper(Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $companyName), 4, '')), 'is_active' => true]
                            );
                            $companyId = $company->id;
                        }

                        $portId = null;
                        if (filled($row['port_name'] ?? '')) {
                            $port = Port::firstOrCreate(
                                ['name' => $row['port_name']],
                                ['code' => strtoupper(Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $row['port_name']), 5, '')), 'city' => 'Sumbawa', 'is_active' => true]
                            );
                            $portId = $port->id;
                        }

                        $existing = Ship::where('name', $name)->first();
                        $payload = [
                            'ship_company_id' => $companyId ?? $existing?->ship_company_id,
                            'port_id' => $portId ?? $existing?->port_id,
                            'imo_number' => $row['imo_number'] ?? null,
                            'call_sign' => $row['call_sign'] ?? null,
                            'flag' => $row['flag'] ?: 'Indonesia',
                            'ship_type' => $row['ship_type'] ?? null,
                            'gross_tonnage' => is_numeric($row['gross_tonnage'] ?? '') ? (float) $row['gross_tonnage'] : null,
                            'length' => is_numeric($row['length'] ?? '') ? (float) $row['length'] : null,
                            'captain_name' => $row['captain_name'] ?? null,
                            'captain_phone' => $row['captain_phone'] ?? null,
                            'is_active' => true,
                            'created_by' => $user->id,
                        ];

                        if ($existing) {
                            $existing->update($payload);
                            $updatedCount++;
                        } else {
                            Ship::create(array_merge(['name' => $name], $payload));
                            $importedCount++;
                        }
                    }
                    break;

                case 'products':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $name = $row['name'] ?? '';

                        if (blank($name)) {
                            $errors[] = "Baris {$lineNum}: Nama Produk / Jasa wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $vendorId = null;
                        if (filled($row['vendor_name'] ?? '')) {
                            $vendor = Vendor::firstOrCreate(
                                ['name' => $row['vendor_name']],
                                ['code' => strtoupper(Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $row['vendor_name']), 4, '')), 'is_active' => true]
                            );
                            $vendorId = $vendor->id;
                        }

                        $code = $row['code'] ?: ('PRD-'.strtoupper(Str::random(5)));
                        $existing = Product::where('name', $name)->orWhere('code', $code)->first();

                        $payload = [
                            'code' => $code,
                            'name' => $name,
                            'category' => $row['category'] ?? 'Umum',
                            'item_type' => in_array($row['item_type'] ?? '', ['jasa', 'non_jasa']) ? $row['item_type'] : 'non_jasa',
                            'unit' => $row['unit'] ?: 'Unit',
                            'hpp_default' => is_numeric($row['hpp_default'] ?? '') ? (float) $row['hpp_default'] : 0,
                            'selling_price_default' => is_numeric($row['selling_price_default'] ?? '') ? (float) $row['selling_price_default'] : 0,
                            'price_sandar' => is_numeric($row['price_sandar'] ?? '') ? (float) $row['price_sandar'] : 0,
                            'price_labuh' => is_numeric($row['price_labuh'] ?? '') ? (float) $row['price_labuh'] : 0,
                            'vendor_id' => $vendorId,
                            'description' => $row['description'] ?? null,
                            'is_active' => true,
                        ];

                        if ($existing) {
                            $existing->update($payload);
                            $updatedCount++;
                        } else {
                            Product::create($payload);
                            $importedCount++;
                        }
                    }
                    break;

                case 'companies':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $name = $row['name'] ?? '';

                        if (blank($name)) {
                            $errors[] = "Baris {$lineNum}: Nama Perusahaan wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $code = $row['code'] ?: strtoupper(Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $name), 5, ''));
                        $existing = ShipCompany::where('name', $name)->orWhere('code', $code)->first();

                        $payload = [
                            'code' => $code,
                            'name' => $name,
                            'email' => $row['email'] ?? null,
                            'phone' => $row['phone'] ?? null,
                            'address' => $row['address'] ?? null,
                            'is_active' => true,
                        ];

                        if ($existing) {
                            $existing->update($payload);
                            $updatedCount++;
                        } else {
                            ShipCompany::create($payload);
                            $importedCount++;
                        }
                    }
                    break;

                case 'ports':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $name = $row['name'] ?? '';
                        $code = $row['code'] ?? '';

                        if (blank($name) || blank($code)) {
                            $errors[] = "Baris {$lineNum}: Kode dan Nama Pelabuhan wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $existing = Port::where('code', $code)->orWhere('name', $name)->first();
                        $payload = [
                            'code' => strtoupper($code),
                            'name' => $name,
                            'city' => $row['city'] ?: 'Kota',
                            'country' => $row['country'] ?: 'Indonesia',
                            'timezone' => $row['timezone'] ?: 'Asia/Makassar',
                            'is_active' => true,
                        ];

                        if ($existing) {
                            $existing->update($payload);
                            $updatedCount++;
                        } else {
                            Port::create($payload);
                            $importedCount++;
                        }
                    }
                    break;

                case 'vendors':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $name = $row['name'] ?? '';

                        if (blank($name)) {
                            $errors[] = "Baris {$lineNum}: Nama Vendor / Suplier wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $code = $row['code'] ?: ('VND-'.strtoupper(Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $name), 4, '')));
                        $existing = Vendor::where('name', $name)->orWhere('code', $code)->first();

                        $payload = [
                            'code' => $code,
                            'name' => $name,
                            'email' => $row['email'] ?? null,
                            'phone' => $row['phone'] ?? null,
                            'address' => $row['address'] ?? null,
                            'is_active' => true,
                        ];

                        if ($existing) {
                            $existing->update($payload);
                            $updatedCount++;
                        } else {
                            Vendor::create($payload);
                            $importedCount++;
                        }
                    }
                    break;

                case 'expenses':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $refNumber = trim((string) ($row['reference_number'] ?? ''));
                        $recipient = trim((string) ($row['recipient'] ?? ''));
                        $amountRaw = $row['amount'] ?? 0;

                        if (blank($refNumber) || blank($recipient) || ! is_numeric(str_replace([',', '.'], '', (string) $amountRaw))) {
                            $errors[] = "Baris {$lineNum}: No Referensi, Penerima, dan Nominal Bayar wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $amount = (float) str_replace(',', '', (string) $amountRaw);
                        $payDate = $this->parseDate($row['payment_date'] ?? null) ?? now();

                        // Match or find PortCall
                        $portCallId = null;
                        $jobNumber = trim((string) ($row['job_number'] ?? ''));
                        $shipName = trim((string) ($row['ship_name'] ?? ''));

                        if (filled($jobNumber)) {
                            $portCall = PortCall::where('job_number', $jobNumber)->first();
                            $portCallId = $portCall?->id;
                        } elseif (filled($shipName)) {
                            $ship = Ship::whereRaw('LOWER(name) = ?', [strtolower($shipName)])->first();
                            if ($ship) {
                                $portCall = PortCall::where('ship_id', $ship->id)->latest('created_at')->first();
                                $portCallId = $portCall?->id;
                            }
                        }

                        $rawStatus = strtolower(trim((string) ($row['verification_status'] ?? '')));
                        $isCompleted = blank($rawStatus)
                            || str_contains($rawStatus, 'selesai')
                            || str_contains($rawStatus, 'terverifikasi')
                            || str_contains($rawStatus, 'verified')
                            || str_contains($rawStatus, 'lunas')
                            || $payDate->lt(now()->subDays(7));

                        $verifStatus = $isCompleted ? 'verified' : 'pending';
                        $verifiedAt = $isCompleted ? $payDate : null;
                        $verifiedBy = $isCompleted ? $user->id : null;
                        $realizedAt = $isCompleted ? $payDate : null;

                        $existing = OutgoingPayment::where('reference_number', $refNumber)->first();
                        $payload = [
                            'reference_number' => $refNumber,
                            'port_call_id' => $portCallId ?? $existing?->port_call_id,
                            'payment_type' => filled($row['payment_type'] ?? '') ? strtolower(trim($row['payment_type'])) : 'transfer',
                            'payment_date' => $payDate,
                            'amount' => $amount,
                            'currency' => 'IDR',
                            'recipient' => $recipient,
                            'verification_status' => $verifStatus,
                            'actual_amount' => $isCompleted ? $amount : ($existing?->actual_amount ?? null),
                            'remaining_amount' => $isCompleted ? 0 : ($existing?->remaining_amount ?? null),
                            'recorded_by' => $user->id,
                            'verified_by' => $verifiedBy ?? $existing?->verified_by,
                            'verified_at' => $verifiedAt ?? $existing?->verified_at,
                            'realized_at' => $realizedAt ?? $existing?->realized_at,
                            'notes' => $row['notes'] ?? null,
                        ];

                        if ($existing) {
                            $existing->update($payload);
                            $updatedCount++;
                        } else {
                            OutgoingPayment::create($payload);
                            $importedCount++;
                        }
                    }
                    break;

                case 'invoices':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $invNumber = trim((string) ($row['invoice_number'] ?? ''));
                        $companyName = trim((string) ($row['company_name'] ?? ''));
                        $grandTotalRaw = $row['grand_total'] ?? 0;

                        if (blank($invNumber) || blank($companyName) || ! is_numeric(str_replace([',', '.'], '', (string) $grandTotalRaw))) {
                            $errors[] = "Baris {$lineNum}: No Invoice, Perusahaan Klien, dan Total Tagihan wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $grandTotal = (float) str_replace(',', '', (string) $grandTotalRaw);
                        $invDate = $this->parseDate($row['invoice_date'] ?? null) ?? now();
                        $dueDate = $this->parseDate($row['due_date'] ?? null) ?? $invDate->copy()->addDays(14);
                        $subtotal = is_numeric(str_replace([',', '.'], '', (string) ($row['subtotal'] ?? '')))
                            ? (float) str_replace(',', '', (string) $row['subtotal'])
                            : $grandTotal;
                        $tax = is_numeric(str_replace([',', '.'], '', (string) ($row['tax'] ?? '')))
                            ? (float) str_replace(',', '', (string) $row['tax'])
                            : 0;

                        $company = ShipCompany::firstOrCreate(
                            ['name' => $companyName],
                            ['code' => strtoupper(Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $companyName), 4, '')), 'is_active' => true]
                        );

                        // Match PortCall
                        $portCallId = null;
                        $jobNumber = trim((string) ($row['job_number'] ?? ''));
                        $shipName = trim((string) ($row['ship_name'] ?? ''));

                        if (filled($jobNumber)) {
                            $portCall = PortCall::where('job_number', $jobNumber)->first();
                            $portCallId = $portCall?->id;
                        } elseif (filled($shipName)) {
                            $ship = Ship::firstOrCreate(
                                ['name' => $shipName],
                                ['ship_company_id' => $company->id, 'flag' => 'Indonesia', 'is_active' => true]
                            );
                            $portCall = PortCall::where('ship_id', $ship->id)->latest('created_at')->first();
                            $portCallId = $portCall?->id;
                        }

                        $rawStatus = strtolower(trim((string) ($row['status'] ?? '')));
                        $isPaid = str_contains($rawStatus, 'lunas') || str_contains($rawStatus, 'paid') || str_contains($rawStatus, 'selesai');
                        $isSent = str_contains($rawStatus, 'terkirim') || str_contains($rawStatus, 'sent');
                        $isReleased = str_contains($rawStatus, 'dirilis') || str_contains($rawStatus, 'released');

                        if ($isPaid) {
                            $status = 'paid';
                            $deliveryStatus = 'delivered';
                            $paidAmount = $grandTotal;
                            $outstandingAmount = 0;
                            $paidAt = $invDate;
                            $releasedAt = $invDate;
                            $signedAt = $invDate;
                            $sentAt = $invDate;
                        } elseif ($isSent) {
                            $status = 'sent';
                            $deliveryStatus = 'delivered';
                            $paidAmount = 0;
                            $outstandingAmount = $grandTotal;
                            $paidAt = null;
                            $releasedAt = $invDate;
                            $signedAt = $invDate;
                            $sentAt = $invDate;
                        } elseif ($isReleased) {
                            $status = 'released';
                            $deliveryStatus = 'pending';
                            $paidAmount = 0;
                            $outstandingAmount = $grandTotal;
                            $paidAt = null;
                            $releasedAt = $invDate;
                            $signedAt = $invDate;
                            $sentAt = null;
                        } else {
                            $status = 'draft';
                            $deliveryStatus = 'pending';
                            $paidAmount = 0;
                            $outstandingAmount = $grandTotal;
                            $paidAt = null;
                            $releasedAt = null;
                            $signedAt = null;
                            $sentAt = null;
                        }

                        $invType = strtolower(trim((string) ($row['invoice_type'] ?? 'agency')));
                        if (! in_array($invType, ['agency', 'reimburse'], true)) {
                            $invType = 'agency';
                        }

                        $existing = Invoice::where('invoice_number', $invNumber)->first();
                        $payload = [
                            'invoice_number' => $invNumber,
                            'company_id' => $company->id,
                            'port_call_id' => $portCallId ?? $existing?->port_call_id,
                            'invoice_type' => $invType,
                            'subject' => $row['notes'] ?: "Tagihan {$company->name}",
                            'invoice_date' => $invDate,
                            'due_date' => $dueDate,
                            'subtotal' => $subtotal,
                            'addon_total' => 0,
                            'discount' => 0,
                            'tax' => $tax,
                            'grand_total' => $grandTotal,
                            'paid_amount' => $paidAmount,
                            'outstanding_amount' => $outstandingAmount,
                            'currency' => 'IDR',
                            'status' => $status,
                            'delivery_status' => $deliveryStatus,
                            'notes' => $row['notes'] ?? null,
                            'released_at' => $releasedAt ?? $existing?->released_at,
                            'signed_at' => $signedAt ?? $existing?->signed_at,
                            'sent_at' => $sentAt ?? $existing?->sent_at,
                            'paid_at' => $paidAt ?? $existing?->paid_at,
                        ];

                        if ($existing) {
                            $existing->update($payload);
                            $updatedCount++;
                        } else {
                            Invoice::create($payload);
                            $importedCount++;
                        }
                    }
                    break;

                case 'completion-notes':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $docNumber = trim((string) ($row['document_number'] ?? ''));
                        $shipName = trim((string) ($row['ship_name'] ?? ''));
                        $actualAmountRaw = $row['actual_amount'] ?? 0;

                        if (blank($docNumber) || blank($shipName) || ! is_numeric(str_replace([',', '.'], '', (string) $actualAmountRaw))) {
                            $errors[] = "Baris {$lineNum}: No Nota Rampung, Nama Kapal, dan Total Realisasi Resmi wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $actualAmount = (float) str_replace(',', '', (string) $actualAmountRaw);
                        $issueDate = $this->parseDate($row['issued_at'] ?? null) ?? now();
                        $departedAt = filled($row['departed_at'] ?? '') ? $this->parseDate($row['departed_at']) : null;

                        $ship = Ship::firstOrCreate(
                            ['name' => $shipName],
                            ['flag' => 'Indonesia', 'is_active' => true]
                        );

                        // Find or create PortCall
                        $jobNumber = trim((string) ($row['job_number'] ?? ''));
                        $portCall = null;
                        if (filled($jobNumber)) {
                            $portCall = PortCall::where('job_number', $jobNumber)->first();
                        }
                        if (! $portCall) {
                            $portCall = PortCall::where('ship_id', $ship->id)->latest('created_at')->first();
                        }
                        $existing = CompletionNote::where('document_number', $docNumber)->first();
                        if ($existing) {
                            $portCall = $existing->portCall;
                        } else {
                            if (! $portCall || CompletionNote::where('port_call_id', $portCall->id)->exists()) {
                                $portCall = PortCall::create([
                                    'ship_id' => $ship->id,
                                    'port_id' => Port::first()?->id,
                                    'job_number' => $jobNumber ?: ('JOB-'.now()->format('Y').'-'.rand(1000, 9999)),
                                    'status' => 'completed',
                                    'eta_at' => $issueDate->copy()->subDays(2),
                                    'etd_at' => $issueDate,
                                    'departed_at' => $departedAt ?? $issueDate,
                                ]);
                            }
                        }

                        $rawStatus = strtolower(trim((string) ($row['status'] ?? '')));
                        $isCompleted = blank($rawStatus)
                            || str_contains($rawStatus, 'selesai')
                            || str_contains($rawStatus, 'reconciled')
                            || str_contains($rawStatus, 'terverifikasi')
                            || str_contains($rawStatus, 'verified')
                            || $issueDate->lt(now()->subDays(7));

                        $status = $isCompleted ? 'reconciled' : 'uploaded';
                        $verifiedAt = $isCompleted ? $issueDate : null;
                        $verifiedBy = $isCompleted ? $user->id : null;

                        $payload = [
                            'document_number' => $docNumber,
                            'port_call_id' => $portCall->id,
                            'issued_at' => $issueDate,
                            'departed_at' => $departedAt ?? $issueDate,
                            'uploaded_at' => $issueDate,
                            'document_path' => $existing?->document_path ?? 'documents/completion-notes/imported-'.Str::slug($docNumber).'.pdf',
                            'actual_amount' => $actualAmount,
                            'status' => $status,
                            'notes' => $row['notes'] ?? null,
                            'uploaded_by' => $user->id,
                            'verified_by' => $verifiedBy ?? $existing?->verified_by,
                            'verified_at' => $verifiedAt ?? $existing?->verified_at,
                        ];

                        if ($existing) {
                            $existing->update($payload);
                            $updatedCount++;
                        } else {
                            CompletionNote::create($payload);
                            $importedCount++;
                        }
                    }
                    break;

                case 'vendor-invoices':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $docNumber = trim((string) ($row['document_number'] ?? ''));
                        $vendorName = trim((string) ($row['vendor_name'] ?? ''));
                        $totalAmountRaw = $row['total_amount'] ?? 0;

                        if (blank($docNumber) || blank($vendorName) || ! is_numeric(str_replace([',', '.'], '', (string) $totalAmountRaw))) {
                            $errors[] = "Baris {$lineNum}: No Invoice Vendor, Nama Vendor, dan Total Tagihan wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $totalAmount = (float) str_replace(',', '', (string) $totalAmountRaw);
                        $docDate = $this->parseDate($row['document_date'] ?? null) ?? now();
                        $receivedDate = $this->parseDate($row['received_date'] ?? null) ?? $docDate;

                        $vendor = Vendor::firstOrCreate(
                            ['name' => $vendorName],
                            ['code' => 'VND-'.strtoupper(Str::random(4)), 'is_active' => true]
                        );

                        // PortCall matching
                        $portCallId = null;
                        $jobNumber = trim((string) ($row['job_number'] ?? ''));
                        $shipName = trim((string) ($row['ship_name'] ?? ''));

                        if (filled($jobNumber)) {
                            $portCall = PortCall::where('job_number', $jobNumber)->first();
                            $portCallId = $portCall?->id;
                        } elseif (filled($shipName)) {
                            $ship = Ship::whereRaw('LOWER(name) = ?', [strtolower($shipName)])->first();
                            if ($ship) {
                                $portCall = PortCall::where('ship_id', $ship->id)->latest('created_at')->first();
                                $portCallId = $portCall?->id;
                            }
                        }

                        if (! $portCallId) {
                            $ship = filled($shipName)
                                ? Ship::firstOrCreate(['name' => $shipName], ['flag' => 'Indonesia', 'is_active' => true])
                                : Ship::firstOrCreate(['name' => 'Armada Umum Operasional'], ['flag' => 'Indonesia', 'is_active' => true]);

                            $portCall = PortCall::where('ship_id', $ship->id)->latest('created_at')->first();
                            if (! $portCall) {
                                $portCall = PortCall::create([
                                    'ship_id' => $ship->id,
                                    'port_id' => Port::first()?->id,
                                    'job_number' => $jobNumber ?: ('JOB-'.now()->format('Y').'-'.rand(1000, 9999)),
                                    'status' => 'completed',
                                    'eta_at' => $docDate->copy()->subDays(2),
                                    'etd_at' => $docDate,
                                    'departed_at' => $docDate,
                                ]);
                            }
                            $portCallId = $portCall->id;
                        }

                        $rawStatus = strtolower(trim((string) ($row['status'] ?? '')));
                        $rawPayment = strtolower(trim((string) ($row['payment_status'] ?? '')));

                        $isPaid = str_contains($rawPayment, 'lunas') || str_contains($rawPayment, 'paid') || str_contains($rawStatus, 'lunas');
                        $isVerified = $isPaid || str_contains($rawStatus, 'terverifikasi') || str_contains($rawStatus, 'verified') || str_contains($rawStatus, 'selesai') || $docDate->lt(now()->subDays(7));

                        if ($isPaid) {
                            $status = 'verified';
                            $paymentStatus = 'paid';
                            $verifiedTotal = $totalAmount;
                            $paidAmount = $totalAmount;
                            $verifiedAt = $docDate;
                            $paidAt = $docDate;
                        } elseif ($isVerified) {
                            $status = 'verified';
                            $paymentStatus = 'unpaid';
                            $verifiedTotal = $totalAmount;
                            $paidAmount = 0;
                            $verifiedAt = $docDate;
                            $paidAt = null;
                        } else {
                            $status = 'received';
                            $paymentStatus = 'unpaid';
                            $verifiedTotal = 0;
                            $paidAmount = 0;
                            $verifiedAt = null;
                            $paidAt = null;
                        }

                        $existing = CostDocument::where('document_number', $docNumber)
                            ->where('document_type', 'vendor_invoice')
                            ->first();

                        $payload = [
                            'document_number' => $docNumber,
                            'document_type' => 'vendor_invoice',
                            'vendor_id' => $vendor->id,
                            'issuer_name' => $vendor->name,
                            'port_call_id' => $portCallId ?? $existing?->port_call_id,
                            'document_date' => $docDate,
                            'received_date' => $receivedDate,
                            'currency' => 'IDR',
                            'estimated_total' => $totalAmount,
                            'verified_total' => $verifiedTotal,
                            'status' => $status,
                            'payment_status' => $paymentStatus,
                            'paid_amount' => $paidAmount,
                            'paid_at' => $paidAt ?? $existing?->paid_at,
                            'recorded_by' => $user->id,
                            'verified_by' => $isVerified ? $user->id : $existing?->verified_by,
                            'verified_at' => $verifiedAt ?? $existing?->verified_at,
                        ];

                        if ($existing) {
                            $existing->update($payload);
                            $updatedCount++;
                        } else {
                            CostDocument::create($payload);
                            $importedCount++;
                        }
                    }
                    break;

                case 'operations':
                    foreach ($rows as $idx => $row) {
                        $lineNum = $idx + 1;
                        $title = trim((string) ($row['title'] ?? ''));
                        $category = trim((string) ($row['category'] ?? 'Umum'));
                        $detail = trim((string) ($row['detail'] ?? ''));

                        if (blank($title) || blank($detail)) {
                            $errors[] = "Baris {$lineNum}: Judul Aktivitas dan Uraian Detail Kegiatan wajib diisi.";
                            $skippedCount++;

                            continue;
                        }

                        $actDate = $this->parseDate($row['activity_date'] ?? null) ?? now();
                        $actTime = filled($row['activity_time'] ?? '') ? trim($row['activity_time']) : '08:00';

                        // Ship and PortCall matching
                        $shipId = null;
                        $portCallId = null;
                        $shipName = trim((string) ($row['ship_name'] ?? ''));
                        $jobNumber = trim((string) ($row['job_number'] ?? ''));

                        if (filled($shipName)) {
                            $ship = Ship::whereRaw('LOWER(name) = ?', [strtolower($shipName)])->first();
                            $shipId = $ship?->id;
                        }

                        if (filled($jobNumber)) {
                            $portCall = PortCall::where('job_number', $jobNumber)->first();
                            $portCallId = $portCall?->id;
                            if (! $shipId && $portCall?->ship_id) {
                                $shipId = $portCall->ship_id;
                            }
                        }

                        $rawProgress = $row['progress_percent'] ?? '';
                        $rawStatus = strtolower(trim((string) ($row['status'] ?? '')));
                        if (is_numeric($rawProgress)) {
                            $progress = (int) $rawProgress;
                        } elseif (str_contains($rawStatus, 'selesai') || $actDate->lt(now()->subDays(3))) {
                            $progress = 100;
                        } else {
                            $progress = 100;
                        }

                        OperationalActivity::create([
                            'activity_date' => $actDate,
                            'activity_time' => $actTime,
                            'location_name' => $row['location_name'] ?: 'Pelabuhan Benete',
                            'is_vessel_related' => (bool) $shipId,
                            'ship_id' => $shipId,
                            'port_call_id' => $portCallId,
                            'category' => $category,
                            'title' => $title,
                            'detail' => $detail,
                            'progress_percent' => $progress,
                            'created_by' => $user->id,
                        ]);

                        $importedCount++;
                    }
                    break;
            }

            DB::commit();

            $msg = "Import selesai: {$importedCount} data baru ditambahkan";
            if ($updatedCount > 0) {
                $msg .= ", {$updatedCount} data diperbarui";
            }
            if ($skippedCount > 0) {
                $msg .= ", {$skippedCount} baris dilewati (cek error)";
            }
            $msg .= '.';

            return [
                'success' => true,
                'imported_count' => $importedCount,
                'updated_count' => $updatedCount,
                'skipped_count' => $skippedCount,
                'errors' => $errors,
                'message' => $msg,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();

            return [
                'success' => false,
                'imported_count' => 0,
                'updated_count' => 0,
                'skipped_count' => count($rows),
                'errors' => ['Terjadi kesalahan saat memproses data: '.$e->getMessage()],
                'message' => 'Gagal memproses import data.',
            ];
        }
    }

    private function parseDate(?string $value): ?Carbon
    {
        if (blank($value)) {
            return null;
        }

        try {
            // If Excel numeric serial date (e.g. 45220)
            if (is_numeric($value) && (float) $value > 30000) {
                return Carbon::createFromTimestamp(((float) $value - 25569) * 86400);
            }

            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function letterToColumnNumber(string $letter): int
    {
        $letter = strtoupper($letter);
        $len = strlen($letter);
        $num = 0;
        for ($i = 0; $i < $len; $i++) {
            $num = $num * 26 + (ord($letter[$i]) - 64);
        }

        return $num;
    }
}
