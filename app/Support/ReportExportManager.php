<?php

namespace App\Support;

use App\Models\Invoice;
use App\Models\OperationalActivity;
use App\Models\OutgoingPayment;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

final class ReportExportManager
{
    public function __construct(
        private ReportExportXlsxBuilder $xlsxBuilder,
        private ReportExportPdfBuilder $pdfBuilder,
        private InvoiceDocumentSettings $documentSettings,
    ) {}

    /**
     * @param  array<string, mixed>  $parameters
     * @return array{filename: string, file_path: string}
     */
    public function generate(string $reportType, string $format, array $parameters = [], ?string $jobNumber = null): array
    {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $from = CarbonImmutable::parse($parameters['from'] ?? now()->startOfMonth()->toDateString())->startOfDay();
        $to = CarbonImmutable::parse($parameters['to'] ?? now()->endOfMonth()->toDateString())->endOfDay();
        $companyId = $parameters['company_id'] ?? null;
        $shipId = $parameters['ship_id'] ?? null;
        $job = $jobNumber ?: ($parameters['job'] ?? null);
        $status = $parameters['status'] ?? 'all';
        $search = $parameters['search'] ?? null;

        return match ($reportType) {
            'vessel_daily_expenses' => $this->generateVesselDailyExpenses($format, $from, $to, $shipId, $companyId, $job, $search),
            'vessel_summary' => $this->generateVesselSummary($format, $from, $to, $companyId, $shipId, $status, $search),
            'margin' => $this->generateMarginReport($format, $from, $to, $companyId, $shipId, $job, $status, $search),
            'invoices' => $this->generateInvoiceReport($format, $from, $to, $companyId, $shipId, $job, $status, $search),
            'receivables' => $this->generateReceivableReport($format, $from, $to, $companyId, $shipId, $job, $search),
            'expenses' => $this->generateExpenseReport($format, $from, $to, $companyId, $shipId, $job, $status, $search),
            'activities' => $this->generateActivityReport($format, $from, $to, $companyId, $shipId, $job, $search),
            'requests' => $this->generateRequestReport($format, $from, $to, $companyId, $shipId, $job, $status, $search),
            default => throw new RuntimeException("Tipe laporan {$reportType} tidak didukung."),
        };
    }

    /** @return array{filename: string, file_path: string} */
    private function generateVesselDailyExpenses(
        string $format,
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $shipId,
        ?string $companyId,
        ?string $job,
        ?string $search
    ): array {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $portCalls = PortCall::query()
            ->with([
                'ship:id,name,ship_company_id',
                'ship.company:id,name',
                'workOrder:id,company_id,client_number',
                'workOrder.company:id,name',
                'port:id,name',
                'requests' => fn ($q) => $q->with([
                    'items' => fn ($iq) => $iq->orderBy('required_date')->orderBy('created_at'),
                ]),
            ])
            ->when($shipId, fn ($q) => $q->where('ship_id', $shipId))
            ->when($companyId, fn ($q) => $q->where(function ($cq) use ($companyId): void {
                $cq->whereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId))
                    ->orWhereHas('workOrder', fn ($wq) => $wq->where('company_id', $companyId));
            }))
            ->when($job, fn ($q) => $q->where(function ($jq) use ($like, $job): void {
                $jq->where('job_number', $like, "%{$job}%");
                if (Str::isUuid($job)) {
                    $jq->orWhere('id', $job);
                }
            }))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($like, $search): void {
                $sq->where('job_number', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($shq) => $shq->where('name', $like, "%{$search}%"));
            }))
            ->orderByDesc('created_at')
            ->get();

        $sections = [];
        $rows = [];
        $seq = 1;
        $grandTotal = 0;
        $totalItems = 0;
        $vesselsCount = 0;

        foreach ($portCalls as $call) {
            $shipName = $call->ship?->name ?? 'Kapal Tidak Diketahui';
            $companyName = $call->ship?->company?->name ?? $call->workOrder?->company?->name ?? '-';
            $portName = $call->port?->name ?? '-';

            $stayInfo = '-';
            if ($call->eta_at) {
                $end = $call->departed_at ?? $call->etd_at ?? now();
                $stayDays = max(1, round($call->eta_at->diffInHours($end) / 24, 1)).' hari';
                $sandar = $call->eta_at->format('d/m/Y');
                $keluar = $call->departed_at ? 'Keluar: '.$call->departed_at->format('d/m/Y') : ($call->etd_at ? 'Rencana: '.$call->etd_at->format('d/m/Y') : '-');
                $stayInfo = "Sandar: {$sandar} · {$keluar} ({$stayDays})";
            }

            $callTotal = 0;
            $sectionRows = [];
            $itemSeq = 1;

            foreach ($call->requests as $req) {
                foreach ($req->items as $item) {
                    $itemCost = (float) $item->hpp_price * (float) $item->quantity;
                    $itemDate = $item->required_date
                        ? CarbonImmutable::parse($item->required_date)->toDateString()
                        : ($req->request_date ? CarbonImmutable::parse($req->request_date)->toDateString() : $req->created_at?->toDateString());

                    if ($itemDate && ($itemDate < $from->toDateString() || $itemDate > $to->toDateString())) {
                        continue;
                    }

                    $callTotal += $itemCost;
                    $grandTotal += $itemCost;
                    $totalItems++;

                    $statusLabel = match ($item->director_status) {
                        'approved' => 'Disetujui',
                        'rejected' => 'Ditolak',
                        default => 'Menunggu',
                    };

                    $itemDateFormatted = $itemDate ? CarbonImmutable::parse($itemDate)->format('d/m/Y') : '-';

                    // Grouped section row (10 columns, no redundant ship/job/company)
                    $sectionRows[] = [
                        $itemSeq++,
                        $itemDateFormatted,
                        $req->request_number,
                        $item->item_name.($item->notes ? " ({$item->notes})" : ''),
                        (float) $item->quantity,
                        $item->unit ?: 'Unit',
                        (float) $item->hpp_price,
                        $itemCost,
                        $callTotal,
                        $statusLabel,
                    ];

                    // Flat row (for fallback or general flat table view)
                    $rows[] = [
                        $seq++,
                        $itemDateFormatted,
                        $call->job_number,
                        $shipName,
                        $companyName,
                        $req->request_number,
                        $item->item_name.($item->notes ? " ({$item->notes})" : ''),
                        (float) $item->quantity,
                        $item->unit ?: 'Unit',
                        (float) $item->hpp_price,
                        $itemCost,
                        $callTotal,
                        $statusLabel,
                    ];
                }
            }

            if (! empty($sectionRows) || $job !== null) {
                $vesselsCount++;
                $statusText = match ($call->status) {
                    'berthed' => 'Sandar',
                    'anchored' => 'Labuh',
                    'departed' => 'Berangkat',
                    'completed' => 'Selesai',
                    default => ucfirst($call->status ?? 'Draft'),
                };

                $sections[] = [
                    'job_number' => $call->job_number,
                    'ship_name' => $shipName,
                    'company_name' => $companyName,
                    'port_name' => $portName,
                    'client_spk' => $call->workOrder?->client_number ?? '-',
                    'status_label' => $statusText,
                    'stay_info' => $stayInfo,
                    'total_expense' => $callTotal,
                    'item_count' => count($sectionRows),
                    'rows' => $sectionRows,
                ];
            }
        }

        $isSingleJob = $job !== null && $job !== '';
        $title = $isSingleJob
            ? "PENGELUARAN HARIAN KAPAL — {$job}"
            : 'LAPORAN PENGELUARAN HARIAN KAPAL';

        $metaLines = [
            sprintf('Periode: %s s.d. %s', $from->format('d/m/Y'), $to->format('d/m/Y')),
            $isSingleJob
                ? "Job: {$job} | Total Item: {$totalItems}"
                : "Total Kapal: {$vesselsCount} | Total Item: {$totalItems}",
        ];

        // Flat table columns
        $columns = [
            ['header' => 'No.', 'width' => 5, 'align' => 'center', 'type' => 'number'],
            ['header' => 'Tanggal', 'width' => 14, 'align' => 'center', 'type' => 'text'],
            ['header' => 'No. Job', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Nama Kapal', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Perusahaan Klien', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'No. Pengajuan', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Item Kebutuhan & Catatan', 'width' => 26, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Qty', 'width' => 6, 'align' => 'right', 'type' => 'number'],
            ['header' => 'Satuan', 'width' => 10, 'align' => 'center', 'type' => 'text'],
            ['header' => 'HPP Satuan', 'width' => 14, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Biaya Item', 'width' => 15, 'align' => 'right', 'type' => 'currency'],
            ['header' => "Akumulatif\ns/d Hari Ini", 'width' => 18, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Status', 'width' => 12, 'align' => 'center', 'type' => 'text'],
        ];

        // Section table columns (10 columns per vessel card)
        $sectionColumns = [
            ['header' => 'No.', 'width' => 4, 'align' => 'center', 'type' => 'number'],
            ['header' => 'Tanggal', 'width' => 11, 'align' => 'center', 'type' => 'text'],
            ['header' => 'No. Pengajuan', 'width' => 15, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Item Kebutuhan & Catatan', 'width' => 30, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Qty', 'width' => 6, 'align' => 'right', 'type' => 'number'],
            ['header' => 'Satuan', 'width' => 8, 'align' => 'center', 'type' => 'text'],
            ['header' => 'HPP Satuan', 'width' => 14, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Biaya Item', 'width' => 15, 'align' => 'right', 'type' => 'currency'],
            ['header' => "Akumulatif\ns/d Hari Ini", 'width' => 17, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Status', 'width' => 11, 'align' => 'center', 'type' => 'text'],
        ];

        $filename = $isSingleJob
            ? 'laporan-pengeluaran-kapal-'.Str::slug($job).".{$format}"
            : "laporan-pengeluaran-kapal-{$from->toDateString()}-sd-{$to->toDateString()}.{$format}";

        // Summary boxes: Total Kapal Terdata (kiri), Total Item Kebutuhan (tengah), Total Pengeluaran HPP (kanan)
        $summaryBoxes = [
            ['label' => 'Total Kapal Terdata', 'value' => (string) $vesselsCount],
            ['label' => 'Total Item Kebutuhan', 'value' => (string) $totalItems],
            ['label' => 'Total Pengeluaran (HPP)', 'value' => 'Rp '.number_format($grandTotal, 0, ',', '.')],
        ];

        $summaryRow = [
            'label' => 'TOTAL PENGELUARAN KAPAL',
            'label_span' => 10,
            'totals' => [10 => $grandTotal],
        ];

        if ($format === 'xlsx') {
            $tmpPath = $this->xlsxBuilder->build([
                'title' => $title,
                'sheet_name' => 'Pengeluaran Kapal',
                'meta_lines' => $metaLines,
                'columns' => $columns,
                'section_columns' => $sectionColumns,
                'sections' => $sections,
                'rows' => $rows,
                'summary_boxes' => $summaryBoxes,
                'summary_row' => $summaryRow,
            ]);
            $savedPath = $this->saveToExportsStorage($tmpPath, $filename);

            return ['filename' => $filename, 'file_path' => $savedPath];
        }

        // PDF Landscape
        $pdfData = $this->pdfBuilder->build([
            'title' => $title,
            'orientation' => 'landscape',
            'meta_lines' => $metaLines,
            'columns' => $columns,
            'section_columns' => $sectionColumns,
            'sections' => $sections,
            'rows' => $rows,
            'summary_boxes' => $summaryBoxes,
            'signatories' => [
                'left_label' => 'Dibuat Oleh (Admin/Finance),',
                'left_name' => 'Staff Operasional & Finance',
                'right_label' => 'Mengetahui (Direktur Operasional),',
                'right_name' => $this->documentSettings->get('signatory_title'),
            ],
        ]);
        $savedPath = $this->savePdfToExportsStorage($pdfData, $filename);

        return ['filename' => $filename, 'file_path' => $savedPath];
    }

    /** @return array{filename: string, file_path: string} */
    private function generateMarginReport(
        string $format,
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $companyId,
        ?string $shipId,
        ?string $job,
        string $status,
        ?string $search
    ): array {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $portCalls = PortCall::query()
            ->with([
                'ship:id,name,ship_company_id',
                'ship.company:id,name',
                'workOrder:id,company_id,client_number',
                'workOrder.company:id,name',
                'port:id,name',
                'invoices' => fn ($q) => $q->whereIn('status', ['released', 'sent', 'paid']),
                'requests.items',
            ])
            ->whereBetween('created_at', [$from, $to])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($companyId, fn ($q) => $q->where(function ($cq) use ($companyId): void {
                $cq->whereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId))
                    ->orWhereHas('workOrder', fn ($wq) => $wq->where('company_id', $companyId));
            }))
            ->when($shipId, fn ($q) => $q->where('ship_id', $shipId))
            ->when($job, fn ($q) => $q->where(function ($jq) use ($like, $job): void {
                $jq->where('job_number', $like, "%{$job}%");
                if (Str::isUuid($job)) {
                    $jq->orWhere('id', $job);
                }
            }))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($like, $search): void {
                $sq->where('job_number', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($shq) => $shq->where('name', $like, "%{$search}%"));
            }))
            ->orderByDesc('created_at')
            ->get();

        $rows = [];
        $seq = 1;
        $totalInvoiced = 0.0;
        $totalHpp = 0.0;

        foreach ($portCalls as $call) {
            $invoiced = (float) $call->invoices->sum('grand_total');
            $hpp = (float) $call->requests->flatMap->items->sum(
                fn (RequestItem $it): float => (float) $it->quantity * (float) $it->hpp_price,
            );
            $margin = $invoiced - $hpp;
            $marginPercent = $invoiced > 0 ? round(($margin / $invoiced) * 100, 1) : 0;

            $totalInvoiced += $invoiced;
            $totalHpp += $hpp;

            $statusText = match ($call->status) {
                'berthed' => 'Sandar',
                'anchored' => 'Labuh',
                'scheduled' => 'Akan Datang',
                'completed' => 'Selesai',
                default => $call->status,
            };

            $rows[] = [
                $seq++,
                $call->job_number,
                $call->workOrder?->client_number ?: '-',
                $call->ship?->name ?: '-',
                $call->ship?->company?->name ?? $call->workOrder?->company?->name ?? '-',
                $call->port?->name ?: '-',
                $statusText,
                $invoiced,
                $hpp,
                $margin,
                $marginPercent.'%',
            ];
        }

        $totalMargin = $totalInvoiced - $totalHpp;
        $overallMarginPercent = $totalInvoiced > 0 ? round(($totalMargin / $totalInvoiced) * 100, 1) : 0;

        $title = 'LAPORAN MARGIN PER JOB';
        $metaLines = [
            sprintf('Periode: %s s.d. %s', $from->format('d/m/Y'), $to->format('d/m/Y')),
            "Total Kegiatan: {$portCalls->count()} Job | Margin Rata-rata: {$overallMarginPercent}%",
        ];

        $columns = [
            ['header' => 'No.', 'width' => 6, 'align' => 'center', 'type' => 'number'],
            ['header' => 'No. Job', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'SPK Klien', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Nama Kapal', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Perusahaan Klien', 'width' => 20, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Pelabuhan', 'width' => 14, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Status', 'width' => 12, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Total Tagihan', 'width' => 16, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'HPP Langsung', 'width' => 16, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Gross Margin', 'width' => 16, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Margin %', 'width' => 10, 'align' => 'right', 'type' => 'text'],
        ];

        $filename = "laporan-margin-per-job-{$from->toDateString()}-sd-{$to->toDateString()}.{$format}";

        $summaryBoxes = [
            ['label' => 'Total Tagihan Invoice', 'value' => 'Rp '.number_format($totalInvoiced, 0, ',', '.')],
            ['label' => 'Total HPP Langsung', 'value' => 'Rp '.number_format($totalHpp, 0, ',', '.')],
            ['label' => 'Total Gross Margin', 'value' => 'Rp '.number_format($totalMargin, 0, ',', '.')." ({$overallMarginPercent}%)"],
        ];

        $summaryRow = [
            'label' => 'TOTAL KESELURUHAN',
            'label_span' => 7,
            'totals' => [
                7 => $totalInvoiced,
                8 => $totalHpp,
                9 => $totalMargin,
            ],
        ];

        if ($format === 'xlsx') {
            $tmpPath = $this->xlsxBuilder->build([
                'title' => $title,
                'sheet_name' => 'Margin per Job',
                'meta_lines' => $metaLines,
                'columns' => $columns,
                'rows' => $rows,
                'summary_row' => $summaryRow,
            ]);
            $savedPath = $this->saveToExportsStorage($tmpPath, $filename);

            return ['filename' => $filename, 'file_path' => $savedPath];
        }

        $pdfData = $this->pdfBuilder->build([
            'title' => $title,
            'orientation' => 'landscape',
            'meta_lines' => $metaLines,
            'columns' => $columns,
            'rows' => $rows,
            'summary_boxes' => $summaryBoxes,
            'signatories' => [
                'left_label' => 'Dibuat Oleh (Finance),',
                'left_name' => 'Staff Finance & Rekonsiliasi',
                'right_label' => 'Mengetahui (Direktur),',
                'right_name' => $this->documentSettings->get('signatory_title'),
            ],
        ]);
        $savedPath = $this->savePdfToExportsStorage($pdfData, $filename);

        return ['filename' => $filename, 'file_path' => $savedPath];
    }

    /** @return array{filename: string, file_path: string} */
    private function generateInvoiceReport(
        string $format,
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $companyId,
        ?string $shipId,
        ?string $job,
        string $status,
        ?string $search
    ): array {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $invoices = Invoice::query()
            ->with(['company:id,name', 'portCall.ship:id,name'])
            ->whereBetween('invoice_date', [$from->toDateString(), $to->toDateString()])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($shipId, fn ($q) => $q->whereHas('portCall', fn ($pq) => $pq->where('ship_id', $shipId)))
            ->when($job, fn ($q) => $q->whereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$job}%")))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($like, $search): void {
                $sq->where('invoice_number', $like, "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"));
            }))
            ->orderByDesc('invoice_date')
            ->get();

        $rows = [];
        $seq = 1;
        $totalGrand = 0.0;
        $totalPaid = 0.0;
        $totalOutstanding = 0.0;

        foreach ($invoices as $inv) {
            $grand = (float) $inv->grand_total;
            $paid = (float) $inv->paid_amount;
            $out = (float) $inv->outstanding_amount;

            $totalGrand += $grand;
            $totalPaid += $paid;
            $totalOutstanding += $out;

            $rows[] = [
                $seq++,
                $inv->invoice_number,
                strtoupper($inv->invoice_type),
                $inv->invoice_date?->format('d/m/Y') ?: '-',
                $inv->due_date?->format('d/m/Y') ?: '-',
                $inv->company?->name ?: '-',
                $inv->portCall?->ship?->name ?: '-',
                $inv->portCall?->job_number ?: '-',
                $grand,
                $paid,
                $out,
                ucfirst($inv->status),
            ];
        }

        $title = 'LAPORAN INVOICE KLIEN';
        $metaLines = [
            sprintf('Periode: %s s.d. %s', $from->format('d/m/Y'), $to->format('d/m/Y')),
            "Total Dokumen: {$invoices->count()} Invoice | Status: ".($status === 'all' ? 'Semua' : $status),
        ];

        $columns = [
            ['header' => 'No.', 'width' => 6, 'align' => 'center', 'type' => 'number'],
            ['header' => 'No. Invoice', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Tipe', 'width' => 11, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Tgl Invoice', 'width' => 12, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Jatuh Tempo', 'width' => 12, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Perusahaan Klien', 'width' => 20, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Nama Kapal', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'No. Job', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Nilai Tagihan', 'width' => 16, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Terbayar', 'width' => 16, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Sisa Piutang', 'width' => 16, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Status', 'width' => 11, 'align' => 'center', 'type' => 'text'],
        ];

        $filename = "laporan-invoice-{$from->toDateString()}-sd-{$to->toDateString()}.{$format}";

        $summaryBoxes = [
            ['label' => 'Total Nilai Invoice', 'value' => 'Rp '.number_format($totalGrand, 0, ',', '.')],
            ['label' => 'Total Telah Dibayar', 'value' => 'Rp '.number_format($totalPaid, 0, ',', '.')],
            ['label' => 'Total Sisa Piutang', 'value' => 'Rp '.number_format($totalOutstanding, 0, ',', '.')],
        ];

        $summaryRow = [
            'label' => 'TOTAL INVOICE',
            'label_span' => 8,
            'totals' => [
                8 => $totalGrand,
                9 => $totalPaid,
                10 => $totalOutstanding,
            ],
        ];

        if ($format === 'xlsx') {
            $tmpPath = $this->xlsxBuilder->build([
                'title' => $title,
                'sheet_name' => 'Laporan Invoice',
                'meta_lines' => $metaLines,
                'columns' => $columns,
                'rows' => $rows,
                'summary_row' => $summaryRow,
            ]);
            $savedPath = $this->saveToExportsStorage($tmpPath, $filename);

            return ['filename' => $filename, 'file_path' => $savedPath];
        }

        $pdfData = $this->pdfBuilder->build([
            'title' => $title,
            'orientation' => 'landscape',
            'meta_lines' => $metaLines,
            'columns' => $columns,
            'rows' => $rows,
            'summary_boxes' => $summaryBoxes,
            'signatories' => [
                'left_label' => 'Dibuat Oleh (Finance),',
                'left_name' => 'Staff Penagihan & Piutang',
                'right_label' => 'Mengetahui (Direktur),',
                'right_name' => $this->documentSettings->get('signatory_title'),
            ],
        ]);
        $savedPath = $this->savePdfToExportsStorage($pdfData, $filename);

        return ['filename' => $filename, 'file_path' => $savedPath];
    }

    /** @return array{filename: string, file_path: string} */
    private function generateReceivableReport(
        string $format,
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $companyId,
        ?string $shipId,
        ?string $job,
        ?string $search
    ): array {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $receivables = Invoice::query()
            ->with(['company:id,name', 'portCall.ship:id,name'])
            ->whereIn('status', ['released', 'sent'])
            ->where('outstanding_amount', '>', 0)
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($shipId, fn ($q) => $q->whereHas('portCall', fn ($pq) => $pq->where('ship_id', $shipId)))
            ->when($job, fn ($q) => $q->whereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$job}%")))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($like, $search): void {
                $sq->where('invoice_number', $like, "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"));
            }))
            ->orderBy('due_date')
            ->get();

        $rows = [];
        $seq = 1;
        $totalOutstanding = 0.0;
        $totalOverdue = 0.0;

        foreach ($receivables as $inv) {
            $out = (float) $inv->outstanding_amount;
            $totalOutstanding += $out;

            $agingDays = $inv->due_date ? (int) $inv->due_date->diffInDays(today(), false) : 0;
            $agingCategory = 'Current (Belum Jatuh Tempo)';
            if ($agingDays > 90) {
                $agingCategory = '> 90 Hari (Macet)';
                $totalOverdue += $out;
            } elseif ($agingDays > 60) {
                $agingCategory = '61 - 90 Hari (Diragukan)';
                $totalOverdue += $out;
            } elseif ($agingDays > 30) {
                $agingCategory = '31 - 60 Hari (Kurang Lancar)';
                $totalOverdue += $out;
            } elseif ($agingDays > 0) {
                $agingCategory = '1 - 30 Hari (Perhatian Khusus)';
                $totalOverdue += $out;
            }

            $rows[] = [
                $seq++,
                $inv->invoice_number,
                $inv->company?->name ?: '-',
                $inv->portCall?->ship?->name ?: '-',
                $inv->portCall?->job_number ?: '-',
                $inv->invoice_date?->format('d/m/Y') ?: '-',
                $inv->due_date?->format('d/m/Y') ?: '-',
                $out,
                $agingDays > 0 ? "{$agingDays} hari" : 'Lancar',
                $agingCategory,
            ];
        }

        $title = 'LAPORAN PIUTANG & AGING KLIEN';
        $metaLines = [
            'Posisi Piutang s.d. Hari Ini: '.now()->timezone('Asia/Jakarta')->format('d/m/Y'),
            "Total Invoice Belum Lunas: {$receivables->count()} Dokumen",
        ];

        $columns = [
            ['header' => 'No.', 'width' => 6, 'align' => 'center', 'type' => 'number'],
            ['header' => 'No. Invoice', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Perusahaan Klien', 'width' => 22, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Nama Kapal', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'No. Job', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Tgl Invoice', 'width' => 12, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Jatuh Tempo', 'width' => 12, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Sisa Piutang', 'width' => 18, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Umur Piutang', 'width' => 13, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Klasifikasi Kolektibilitas', 'width' => 24, 'align' => 'left', 'type' => 'text'],
        ];

        $filename = 'laporan-piutang-aging-'.now()->toDateString().".{$format}";

        $summaryBoxes = [
            ['label' => 'Total Piutang Berjalan', 'value' => 'Rp '.number_format($totalOutstanding, 0, ',', '.')],
            ['label' => 'Lewat Jatuh Tempo (Overdue)', 'value' => 'Rp '.number_format($totalOverdue, 0, ',', '.')],
            ['label' => 'Belum Jatuh Tempo (Current)', 'value' => 'Rp '.number_format($totalOutstanding - $totalOverdue, 0, ',', '.')],
        ];

        $summaryRow = [
            'label' => 'TOTAL PIUTANG',
            'label_span' => 7,
            'totals' => [7 => $totalOutstanding],
        ];

        if ($format === 'xlsx') {
            $tmpPath = $this->xlsxBuilder->build([
                'title' => $title,
                'sheet_name' => 'Piutang & Aging',
                'meta_lines' => $metaLines,
                'columns' => $columns,
                'rows' => $rows,
                'summary_row' => $summaryRow,
            ]);
            $savedPath = $this->saveToExportsStorage($tmpPath, $filename);

            return ['filename' => $filename, 'file_path' => $savedPath];
        }

        $pdfData = $this->pdfBuilder->build([
            'title' => $title,
            'orientation' => 'landscape',
            'meta_lines' => $metaLines,
            'columns' => $columns,
            'rows' => $rows,
            'summary_boxes' => $summaryBoxes,
            'signatories' => [
                'left_label' => 'Dibuat Oleh (Finance),',
                'left_name' => 'Staff Piutang & Koleksi',
                'right_label' => 'Mengetahui (Direktur),',
                'right_name' => $this->documentSettings->get('signatory_title'),
            ],
        ]);
        $savedPath = $this->savePdfToExportsStorage($pdfData, $filename);

        return ['filename' => $filename, 'file_path' => $savedPath];
    }

    /** @return array{filename: string, file_path: string} */
    private function generateExpenseReport(
        string $format,
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $companyId,
        ?string $shipId,
        ?string $job,
        string $status,
        ?string $search
    ): array {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $payments = OutgoingPayment::query()
            ->with(['portCall.ship:id,name', 'verifier:id,name', 'recorder:id,name'])
            ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
            ->when($status !== 'all', fn ($q) => $q->where('verification_status', $status))
            ->when($shipId, fn ($q) => $q->whereHas('portCall', fn ($pq) => $pq->where('ship_id', $shipId)))
            ->when($job, fn ($q) => $q->whereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$job}%")))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($like, $search): void {
                $sq->where('reference_number', $like, "%{$search}%")
                    ->orWhere('payment_for', $like, "%{$search}%")
                    ->orWhere('recipient_name', $like, "%{$search}%");
            }))
            ->orderByDesc('payment_date')
            ->get();

        $rows = [];
        $seq = 1;
        $totalAmount = 0.0;

        foreach ($payments as $pay) {
            $amt = (float) $pay->amount;
            $totalAmount += $amt;

            $statusText = match ($pay->verification_status) {
                'verified' => 'Terverifikasi',
                'waiting_admin_verification' => 'Menunggu Admin',
                'waiting_usage_proof' => 'Menunggu Bukti',
                'rejected' => 'Ditolak',
                default => 'Menunggu Verifikasi',
            };

            $rows[] = [
                $seq++,
                $pay->reference_number ?: '-',
                $pay->payment_date?->format('d/m/Y') ?: '-',
                $pay->portCall?->ship?->name ?: '-',
                $pay->portCall?->job_number ?: '-',
                $pay->recipient_name ?: '-',
                $pay->payment_for ?: '-',
                $amt,
                $statusText,
                $pay->recorder?->name ?: '-',
            ];
        }

        $title = 'LAPORAN REALISASI PENGELUARAN';
        $metaLines = [
            sprintf('Periode: %s s.d. %s', $from->format('d/m/Y'), $to->format('d/m/Y')),
            "Total Transaksi: {$payments->count()} Pembayaran",
        ];

        $columns = [
            ['header' => 'No.', 'width' => 6, 'align' => 'center', 'type' => 'number'],
            ['header' => 'No. Referensi', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Tanggal', 'width' => 12, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Nama Kapal', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'No. Job', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Penerima / Vendor', 'width' => 20, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Keperluan / Rincian', 'width' => 26, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Jumlah (Rp)', 'width' => 16, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Status Verifikasi', 'width' => 18, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Dicatat Oleh', 'width' => 16, 'align' => 'left', 'type' => 'text'],
        ];

        $filename = "laporan-pengeluaran-{$from->toDateString()}-sd-{$to->toDateString()}.{$format}";

        $summaryBoxes = [
            ['label' => 'Total Pengeluaran Kas', 'value' => 'Rp '.number_format($totalAmount, 0, ',', '.')],
            ['label' => 'Total Bukti Pembayaran', 'value' => (string) $payments->count()],
        ];

        $summaryRow = [
            'label' => 'TOTAL PENGELUARAN',
            'label_span' => 7,
            'totals' => [7 => $totalAmount],
        ];

        if ($format === 'xlsx') {
            $tmpPath = $this->xlsxBuilder->build([
                'title' => $title,
                'sheet_name' => 'Pengeluaran',
                'meta_lines' => $metaLines,
                'columns' => $columns,
                'rows' => $rows,
                'summary_row' => $summaryRow,
            ]);
            $savedPath = $this->saveToExportsStorage($tmpPath, $filename);

            return ['filename' => $filename, 'file_path' => $savedPath];
        }

        $pdfData = $this->pdfBuilder->build([
            'title' => $title,
            'orientation' => 'landscape',
            'meta_lines' => $metaLines,
            'columns' => $columns,
            'rows' => $rows,
            'summary_boxes' => $summaryBoxes,
            'signatories' => [
                'left_label' => 'Dibuat Oleh (Kasir/Staff),',
                'left_name' => 'Staff Keuangan',
                'right_label' => 'Disetujui Oleh (Direktur),',
                'right_name' => $this->documentSettings->get('signatory_title'),
            ],
        ]);
        $savedPath = $this->savePdfToExportsStorage($pdfData, $filename);

        return ['filename' => $filename, 'file_path' => $savedPath];
    }

    /** @return array{filename: string, file_path: string} */
    private function generateActivityReport(
        string $format,
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $companyId,
        ?string $shipId,
        ?string $job,
        ?string $search
    ): array {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $activities = OperationalActivity::query()
            ->with(['ship:id,name', 'portCall:id,job_number', 'creator:id,name'])
            ->whereBetween('activity_date', [$from->toDateString(), $to->toDateString()])
            ->when($shipId, fn ($q) => $q->where('ship_id', $shipId))
            ->when($job, fn ($q) => $q->whereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$job}%")))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($like, $search): void {
                $sq->where('title', $like, "%{$search}%")
                    ->orWhere('detail', $like, "%{$search}%")
                    ->orWhere('category', $like, "%{$search}%");
            }))
            ->orderByDesc('activity_date')
            ->get();

        $rows = [];
        $seq = 1;
        $constraintCount = 0;

        foreach ($activities as $act) {
            $hasConstraint = filled($act->constraints);
            if ($hasConstraint) {
                $constraintCount++;
            }

            $rows[] = [
                $seq++,
                $act->activity_date?->format('d/m/Y') ?: '-',
                $act->activity_time ?: '-',
                $act->ship?->name ?: '-',
                $act->portCall?->job_number ?: '-',
                $act->category ?: '-',
                $act->title.($act->detail ? " — {$act->detail}" : ''),
                $act->location_name ?: '-',
                $act->creator?->name ?: '-',
                $act->progress_percent !== null ? "{$act->progress_percent}%" : '-',
                $hasConstraint ? 'Ada Kendala: '.$act->constraints : 'Lancar',
            ];
        }

        $title = 'LAPORAN AKTIVITAS OPERASIONAL & KENDALA';
        $metaLines = [
            sprintf('Periode: %s s.d. %s', $from->format('d/m/Y'), $to->format('d/m/Y')),
            "Total Aktivitas Lapangan: {$activities->count()} Kegiatan",
        ];

        $columns = [
            ['header' => 'No.', 'width' => 6, 'align' => 'center', 'type' => 'number'],
            ['header' => 'Tanggal', 'width' => 12, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Waktu', 'width' => 9, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Nama Kapal', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'No. Job', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Kategori', 'width' => 14, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Kegiatan & Uraian', 'width' => 28, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Lokasi', 'width' => 14, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Petugas', 'width' => 14, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Progress', 'width' => 10, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Status / Kendala', 'width' => 22, 'align' => 'left', 'type' => 'text'],
        ];

        $filename = "laporan-aktivitas-{$from->toDateString()}-sd-{$to->toDateString()}.{$format}";

        $summaryBoxes = [
            ['label' => 'Total Aktivitas Tercatat', 'value' => (string) $activities->count()],
            ['label' => 'Aktivitas Ada Kendala', 'value' => (string) $constraintCount],
            ['label' => 'Aktivitas Berjalan Lancar', 'value' => (string) ($activities->count() - $constraintCount)],
        ];

        if ($format === 'xlsx') {
            $tmpPath = $this->xlsxBuilder->build([
                'title' => $title,
                'sheet_name' => 'Aktivitas Operasional',
                'meta_lines' => $metaLines,
                'columns' => $columns,
                'rows' => $rows,
            ]);
            $savedPath = $this->saveToExportsStorage($tmpPath, $filename);

            return ['filename' => $filename, 'file_path' => $savedPath];
        }

        $pdfData = $this->pdfBuilder->build([
            'title' => $title,
            'orientation' => 'landscape',
            'meta_lines' => $metaLines,
            'columns' => $columns,
            'rows' => $rows,
            'summary_boxes' => $summaryBoxes,
            'signatories' => [
                'left_label' => 'Dibuat Oleh (Lapangan),',
                'left_name' => 'Staff Operasional Lapangan',
                'right_label' => 'Mengetahui (Direktur/Koordinator),',
                'right_name' => $this->documentSettings->get('signatory_title'),
            ],
        ]);
        $savedPath = $this->savePdfToExportsStorage($pdfData, $filename);

        return ['filename' => $filename, 'file_path' => $savedPath];
    }

    /** @return array{filename: string, file_path: string} */
    private function generateRequestReport(
        string $format,
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $companyId,
        ?string $shipId,
        ?string $job,
        string $status,
        ?string $search
    ): array {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $requests = ShipRequest::query()
            ->with(['ship.company', 'company', 'port', 'portCall.workOrder', 'creator', 'items'])
            ->whereBetween('request_date', [$from->toDateString(), $to->toDateString()])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($shipId, fn ($q) => $q->where('ship_id', $shipId))
            ->when($job, fn ($q) => $q->whereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$job}%")))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($like, $search): void {
                $sq->where('request_number', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($shq) => $shq->where('name', $like, "%{$search}%"));
            }))
            ->orderByDesc('request_date')
            ->get();

        $rows = [];
        $seq = 1;
        $totalHpp = 0.0;

        foreach ($requests as $req) {
            $reqHpp = (float) $req->items->sum(fn ($it) => (float) $it->quantity * (float) $it->hpp_price);
            $totalHpp += $reqHpp;

            $rows[] = [
                $seq++,
                $req->request_date?->format('d/m/Y') ?: '-',
                $req->request_number,
                $req->portCall?->job_number ?: '-',
                $req->ship?->name ?: '-',
                $req->company?->name ?: '-',
                $req->service_type ?: 'Kebutuhan Kapal',
                $req->items->pluck('item_name')->join(', ') ?: '-',
                $req->items->count(),
                $reqHpp,
                $req->status,
                $req->creator?->name ?: '-',
            ];
        }

        $title = 'LAPORAN PENGAJUAN KEBUTUHAN KAPAL';
        $metaLines = [
            sprintf('Periode: %s s.d. %s', $from->format('d/m/Y'), $to->format('d/m/Y')),
            "Total Pengajuan: {$requests->count()} Dokumen",
        ];

        $columns = [
            ['header' => 'No.', 'width' => 6, 'align' => 'center', 'type' => 'number'],
            ['header' => 'Tanggal', 'width' => 12, 'align' => 'center', 'type' => 'text'],
            ['header' => 'No. Pengajuan', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'No. Job', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Nama Kapal', 'width' => 18, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Perusahaan Klien', 'width' => 20, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Jenis Pengajuan', 'width' => 16, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Rincian Item', 'width' => 26, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Item', 'width' => 8, 'align' => 'right', 'type' => 'number'],
            ['header' => 'Total HPP', 'width' => 16, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Status', 'width' => 16, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Diajukan Oleh', 'width' => 14, 'align' => 'left', 'type' => 'text'],
        ];

        $filename = "laporan-pengajuan-{$from->toDateString()}-sd-{$to->toDateString()}.{$format}";

        $summaryBoxes = [
            ['label' => 'Total Nilai HPP', 'value' => 'Rp '.number_format($totalHpp, 0, ',', '.')],
            ['label' => 'Total Pengajuan', 'value' => (string) $requests->count()],
        ];

        $summaryRow = [
            'label' => 'TOTAL HPP PENGAJUAN',
            'label_span' => 9,
            'totals' => [9 => $totalHpp],
        ];

        if ($format === 'xlsx') {
            $tmpPath = $this->xlsxBuilder->build([
                'title' => $title,
                'sheet_name' => 'Laporan Pengajuan',
                'meta_lines' => $metaLines,
                'columns' => $columns,
                'rows' => $rows,
                'summary_row' => $summaryRow,
            ]);
            $savedPath = $this->saveToExportsStorage($tmpPath, $filename);

            return ['filename' => $filename, 'file_path' => $savedPath];
        }

        $pdfData = $this->pdfBuilder->build([
            'title' => $title,
            'orientation' => 'landscape',
            'meta_lines' => $metaLines,
            'columns' => $columns,
            'rows' => $rows,
            'summary_boxes' => $summaryBoxes,
            'signatories' => [
                'left_label' => 'Dibuat Oleh (Admin),',
                'left_name' => 'Admin Operasional',
                'right_label' => 'Mengetahui (Direktur),',
                'right_name' => $this->documentSettings->get('signatory_title'),
            ],
        ]);
        $savedPath = $this->savePdfToExportsStorage($pdfData, $filename);

        return ['filename' => $filename, 'file_path' => $savedPath];
    }

    /** @return array{filename: string, file_path: string} */
    private function generateVesselSummary(
        string $format,
        CarbonImmutable $from,
        CarbonImmutable $to,
        ?string $companyId,
        ?string $shipId,
        string $status,
        ?string $search
    ): array {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $ships = Ship::query()
            ->with([
                'company:id,name',
                'port:id,name',
                'portCalls' => fn ($pq) => $pq
                    ->where(function ($sub) use ($from, $to) {
                        $sub->whereBetween('created_at', [$from, $to])
                            ->orWhereBetween('eta_at', [$from->toDateString(), $to->toDateString()]);
                    })
                    ->with([
                        'port:id,name',
                        'invoices' => fn ($iq) => $iq->whereIn('status', ['released', 'sent', 'paid']),
                        'requests.items' => fn ($itq) => $itq->where('director_status', 'approved'),
                    ])
                    ->orderByDesc('created_at'),
            ])
            ->where('is_active', true)
            ->when($shipId, fn ($q) => $q->where('id', $shipId))
            ->when($companyId, fn ($q) => $q->where('ship_company_id', $companyId))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($like, $search): void {
                $sq->where('name', $like, "%{$search}%")
                    ->orWhere('call_sign', $like, "%{$search}%")
                    ->orWhere('imo_number', $like, "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"));
            }))
            ->orderBy('name')
            ->get();

        $rows = [];
        $seq = 1;
        $totalFleetRevenue = 0.0;
        $totalFleetExpense = 0.0;
        $totalFleetMargin = 0.0;
        $totalFleetOutstanding = 0.0;
        $totalPortCalls = 0;

        foreach ($ships as $ship) {
            $portCalls = $ship->portCalls;
            $callsCount = $portCalls->count();

            if ($status !== 'all' && $status !== '') {
                $latestStatus = $portCalls->first()?->status;
                if ($status === 'active' && $callsCount === 0) {
                    continue;
                }
                if ($status !== 'active' && $latestStatus !== $status) {
                    continue;
                }
            }

            $revenue = (float) $portCalls->flatMap->invoices->sum('grand_total');
            $outstanding = (float) $portCalls->flatMap->invoices->sum('outstanding_amount');
            $expense = (float) $portCalls->flatMap->requests->flatMap->items->sum(
                fn ($i): float => (float) $i->hpp_price * (float) $i->quantity
            );
            $margin = $revenue - $expense;
            $marginPercent = $revenue > 0 ? round(($margin / $revenue) * 100, 1) : 0.0;

            $latestCall = $portCalls->first();
            $statusText = match ($latestCall?->status) {
                'berthed' => 'Sandar',
                'anchored' => 'Labuh',
                'departed' => 'Berangkat',
                'completed' => 'Selesai',
                'scheduled' => 'Akan Datang',
                default => $callsCount > 0 ? ucfirst($latestCall?->status ?? '-') : 'Tidak Ada Kegiatan',
            };

            $totalFleetRevenue += $revenue;
            $totalFleetExpense += $expense;
            $totalFleetMargin += $margin;
            $totalFleetOutstanding += $outstanding;
            $totalPortCalls += $callsCount;

            $rows[] = [
                $seq++,
                $ship->name,
                $ship->company?->name ?? 'Milik Sendiri / -',
                trim(($ship->ship_type ?? 'Kapal').($ship->gross_tonnage ? ' ('.$ship->gross_tonnage.' GT)' : '')),
                $callsCount,
                $statusText,
                $revenue,
                $expense,
                $margin,
                $marginPercent.'%'.($margin < 0 ? ' (Defisit)' : ''),
                $outstanding,
            ];
        }

        $title = 'RINGKASAN PERFORMA ARMADA KAPAL (VESSEL SUMMARY)';
        $metaLines = [
            sprintf('Periode Analisis: %s s.d. %s', $from->format('d/m/Y'), $to->format('d/m/Y')),
            sprintf('Total Kapal Terdata: %d | Total Kegiatan/Job: %d', count($rows), $totalPortCalls),
        ];

        $columns = [
            ['header' => 'No.', 'width' => 4, 'align' => 'center', 'type' => 'number'],
            ['header' => 'Nama Kapal', 'width' => 20, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Perusahaan Pemilik', 'width' => 24, 'align' => 'left', 'type' => 'text'],
            ['header' => 'Tipe / GT', 'width' => 15, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Job/Trip', 'width' => 8, 'align' => 'center', 'type' => 'number'],
            ['header' => 'Status Terkini', 'width' => 13, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Pendapatan (Rp)', 'width' => 18, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Pengeluaran (Rp)', 'width' => 18, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Margin (Rp)', 'width' => 18, 'align' => 'right', 'type' => 'currency'],
            ['header' => 'Margin (%)', 'width' => 12, 'align' => 'center', 'type' => 'text'],
            ['header' => 'Sisa Piutang (Rp)', 'width' => 18, 'align' => 'right', 'type' => 'currency'],
        ];

        $filename = sprintf(
            'summary-kapal-%s-sd-%s.%s',
            $from->format('Y-m-d'),
            $to->format('Y-m-d'),
            $format
        );

        $marginAvgPercent = $totalFleetRevenue > 0 ? round(($totalFleetMargin / $totalFleetRevenue) * 100, 1) : 0.0;

        $summaryBoxes = [
            ['label' => 'Total Pendapatan Armada', 'value' => 'Rp '.number_format($totalFleetRevenue, 0, ',', '.')],
            ['label' => 'Total Pengeluaran (HPP)', 'value' => 'Rp '.number_format($totalFleetExpense, 0, ',', '.')],
            ['label' => 'Laba / Margin Bersih', 'value' => 'Rp '.number_format($totalFleetMargin, 0, ',', '.')],
            ['label' => 'Rata-rata Margin', 'value' => $marginAvgPercent.'%'],
        ];

        $summaryRow = [
            'label' => 'TOTAL KESELURUHAN ARMADA',
            'label_span' => 6,
            'totals' => [
                6 => $totalFleetRevenue,
                7 => $totalFleetExpense,
                8 => $totalFleetMargin,
                10 => $totalFleetOutstanding,
            ],
        ];

        if ($format === 'xlsx') {
            $tmpPath = $this->xlsxBuilder->build([
                'title' => $title,
                'sheet_name' => 'Summary Kapal',
                'meta_lines' => $metaLines,
                'columns' => $columns,
                'rows' => $rows,
                'summary_boxes' => $summaryBoxes,
                'summary_row' => $summaryRow,
            ]);
            $savedPath = $this->saveToExportsStorage($tmpPath, $filename);

            return ['filename' => $filename, 'file_path' => $savedPath];
        }

        $pdfData = $this->pdfBuilder->build([
            'title' => $title,
            'orientation' => 'landscape',
            'meta_lines' => $metaLines,
            'columns' => $columns,
            'rows' => $rows,
            'summary_boxes' => $summaryBoxes,
            'signatories' => [
                'left_label' => 'Dibuat Oleh (Finance & Operasional),',
                'left_name' => 'Admin Operasional & Keuangan',
                'right_label' => 'Mengetahui (Direktur Operasional),',
                'right_name' => $this->documentSettings->get('signatory_title'),
            ],
        ]);
        $savedPath = $this->savePdfToExportsStorage($pdfData, $filename);

        return ['filename' => $filename, 'file_path' => $savedPath];
    }

    private function saveToExportsStorage(string $tmpPath, string $filename): string
    {
        $uniqueFilename = Str::uuid().'-'.$filename;
        $destinationPath = 'exports/'.$uniqueFilename;

        Storage::disk('local')->put($destinationPath, file_get_contents($tmpPath));
        @unlink($tmpPath);

        return $destinationPath;
    }

    private function savePdfToExportsStorage(string $pdfBinary, string $filename): string
    {
        $uniqueFilename = Str::uuid().'-'.$filename;
        $destinationPath = 'exports/'.$uniqueFilename;

        Storage::disk('local')->put($destinationPath, $pdfBinary);

        return $destinationPath;
    }
}
