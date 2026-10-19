<?php

namespace App\Support;

use App\Models\RequestItem;
use App\Models\ShipRequest;
use Illuminate\Support\Str;

final class RequestReportPdfGenerator
{
    public function __construct(private InvoiceDocumentSettings $documentSettings) {}

    public function generate(ShipRequest $shipRequest): string
    {
        $shipRequest->loadMissing([
            'ship.company',
            'company',
            'port',
            'portCall.workOrder',
            'creator',
            'items.vendor',
        ]);

        $items = $shipRequest->items->sortBy('created_at')->values();
        $rows = $items->map(function (RequestItem $item, int $index): array {
            $descriptionLines = $this->wrappedLines($item->item_name, 42);
            $status = $this->directorStatusLabel($item->director_status);

            return [
                'number' => $index + 1,
                'item' => $item,
                'description_lines' => $descriptionLines,
                'status' => $status,
                'height' => max(34, (count($descriptionLines) * 10) + 20),
            ];
        })->all();

        $requestNotes = $this->limitedWrappedLines($shipRequest->notes, 86, 4);
        $forwardNotes = $this->limitedWrappedLines($shipRequest->admin_forward_notes, 86, 4);
        $summaryReserve = 145 + ((count($requestNotes) + count($forwardNotes)) * 10);
        $pages = [['rows' => [], 'remaining' => 365]];

        foreach ($rows as $row) {
            $pageIndex = count($pages) - 1;
            if ($pages[$pageIndex]['rows'] !== [] && $pages[$pageIndex]['remaining'] < $row['height']) {
                $pages[] = ['rows' => [], 'remaining' => 365];
                $pageIndex++;
            }

            $pages[$pageIndex]['rows'][] = $row;
            $pages[$pageIndex]['remaining'] -= $row['height'];
        }

        $lastPageIndex = count($pages) - 1;
        if ($pages[$lastPageIndex]['remaining'] < $summaryReserve) {
            $pages[] = ['rows' => [], 'remaining' => 365];
        }

        $pageCount = count($pages);
        $pageContents = [];

        foreach ($pages as $pageIndex => $page) {
            $commands = $this->headerCommands($shipRequest);
            $commands[] = '0.875 0.922 0.973 rg 42 594 511 24 re f';
            $commands[] = '0.098 0.157 0.439 rg';
            $commands[] = $this->textCommand('No.', 48, 603, 8, true);
            $commands[] = $this->textCommand('Uraian Kebutuhan', 76, 603, 8, true);
            $commands[] = $this->rightAlignedTextCommand('Qty', 358, 603, 8, true);
            $commands[] = $this->textCommand('Satuan', 369, 603, 8, true);
            $commands[] = $this->rightAlignedTextCommand('HPP', 477, 603, 8, true);
            $commands[] = $this->rightAlignedTextCommand('Jumlah', 548, 603, 8, true);
            $commands[] = '0.741 0.839 0.992 RG 0.6 w 42 594 m 553 594 l S';
            $y = 578;

            if ($page['rows'] === [] && $items->isEmpty()) {
                $commands[] = $this->textCommand('Belum ada rincian item pada pengajuan ini.', 76, $y, 9);
                $y -= 34;
            }

            foreach ($page['rows'] as $row) {
                /** @var RequestItem $item */
                $item = $row['item'];
                $rowBottom = $y - $row['height'] + 11;
                $commands[] = $this->textCommand((string) $row['number'], 50, $y, 8);

                foreach ($row['description_lines'] as $lineIndex => $line) {
                    $commands[] = $this->textCommand($line, 76, $y - ($lineIndex * 10), 8, $lineIndex === 0);
                }

                $statusY = $y - (count($row['description_lines']) * 10) - 1;
                $commands[] = $this->statusColorCommand($item->director_status);
                $commands[] = $this->textCommand('Approval: '.$row['status'], 76, $statusY, 7, true);
                $commands[] = '0 0 0 rg';
                $commands[] = $this->rightAlignedTextCommand($this->quantity($item->quantity), 358, $y, 8);
                $commands[] = $this->textCommand($item->unit ?: '-', 369, $y, 8);
                $commands[] = $this->rightAlignedTextCommand($this->number($item->hpp_price), 477, $y, 8);
                $commands[] = $this->rightAlignedTextCommand(
                    $this->number((float) $item->quantity * (float) $item->hpp_price),
                    548,
                    $y,
                    8,
                    true,
                );
                $commands[] = "0.863 0.918 0.973 RG 0.5 w 42 {$rowBottom} m 553 {$rowBottom} l S";
                $y -= $row['height'];
            }

            if ($pageIndex === $pageCount - 1) {
                $totalHpp = (float) $items->sum(
                    fn (RequestItem $item): float => (float) $item->quantity * (float) $item->hpp_price,
                );
                $summaryY = $y - 8;
                $commands[] = '0.031 0.157 0.439 RG 1 w 385 '.($summaryY + 7).' m 548 '.($summaryY + 7).' l S';
                $commands[] = '0.031 0.157 0.439 rg';
                $commands[] = $this->textCommand('TOTAL PENGAJUAN', 350, $summaryY - 8, 9, true);
                $commands[] = $this->textCommand('Rp', 468, $summaryY - 8, 9, true);
                $commands[] = $this->rightAlignedTextCommand($this->number($totalHpp), 548, $summaryY - 8, 9, true);
                $commands[] = '0 0 0 rg';
                $notesY = $summaryY - 39;

                if ($requestNotes !== []) {
                    $commands[] = $this->textCommand('Catatan pengajuan:', 42, $notesY, 8, true);
                    $notesY -= 11;
                    foreach ($requestNotes as $line) {
                        $commands[] = $this->textCommand($line, 42, $notesY, 8);
                        $notesY -= 10;
                    }
                    $notesY -= 5;
                }

                if ($forwardNotes !== []) {
                    $commands[] = $this->textCommand('Catatan saat diteruskan ke Direktur:', 42, $notesY, 8, true);
                    $notesY -= 11;
                    foreach ($forwardNotes as $line) {
                        $commands[] = $this->textCommand($line, 42, $notesY, 8);
                        $notesY -= 10;
                    }
                }

                $commands[] = $this->textCommand('Diajukan oleh,', 92, 135, 8);
                $commands[] = $this->textCommand('Mengetahui,', 432, 135, 8);
                $commands[] = '0 0 0 RG 0.6 w 42 78 m 190 78 l S';
                $commands[] = '0 0 0 RG 0.6 w 365 78 m 553 78 l S';
                $commands[] = $this->centeredTextCommandWithin(
                    $shipRequest->creator?->name ?? '-',
                    42,
                    190,
                    65,
                    8,
                    true,
                );
                $commands[] = $this->centeredTextCommandWithin(
                    $this->setting('signatory_title'),
                    365,
                    553,
                    65,
                    8,
                    true,
                );
            }

            $commands[] = '0.55 0.62 0.69 RG 0.5 w 42 43 m 553 43 l S';
            $commands[] = $this->textCommand('Dokumen sistem - Laporan Pengajuan', 42, 28, 7);
            $commands[] = $this->centeredTextCommand('Halaman '.($pageIndex + 1)."/{$pageCount}", 28, 7);
            $commands[] = $this->rightAlignedTextCommand('Dicetak '.now()->format('d-m-Y H:i').' WIB', 553, 28, 7);
            $pageContents[] = implode("\n", $commands);
        }

        return $this->buildPdf($pageContents);
    }

    /** @return list<string> */
    private function headerCommands(ShipRequest $shipRequest): array
    {
        $jobNumber = $shipRequest->portCall?->job_number ?? '-';
        $companyName = $shipRequest->company?->name ?? $shipRequest->ship?->company?->name ?? '-';

        return [
            ...$this->logoCommands(),
            '0.141 0.365 0.541 rg',
            $this->centeredTextCommand($this->setting('company_name'), 800, 21, true),
            '0 0 0 rg',
            $this->centeredTextCommand($this->setting('business_label'), 779, 12, true),
            $this->centeredTextCommand('KANTOR PUSAT: '.$this->setting('office_address'), 764, 8, true),
            $this->centeredTextCommand('Telp. '.$this->setting('phone').'  Email: '.$this->setting('email'), 752, 8),
            '0 0 0 RG 1.4 w 42 738 m 553 738 l S',
            '0 0 0 RG 0.6 w 42 734 m 553 734 l S',
            $this->centeredTextCommand('LAPORAN PENGAJUAN', 710, 15, true),
            '0 0 0 RG 0.8 w 219 706 m 376 706 l S',
            $this->textCommand('Nomor Pengajuan', 42, 681, 8),
            $this->textCommand(':', 122, 681, 8),
            $this->textCommand($shipRequest->request_number, 132, 681, 8, true),
            $this->textCommand('Tanggal', 42, 665, 8),
            $this->textCommand(':', 122, 665, 8),
            $this->textCommand($shipRequest->request_date?->translatedFormat('d F Y') ?? '-', 132, 665, 8),
            $this->textCommand('Jenis', 42, 649, 8),
            $this->textCommand(':', 122, 649, 8),
            $this->textCommand($this->serviceTypeLabel($shipRequest->service_type), 132, 649, 8),
            $this->textCommand('Status', 42, 633, 8),
            $this->textCommand(':', 122, 633, 8),
            $this->statusColorCommand($shipRequest->status),
            $this->textCommand($shipRequest->status, 132, 633, 8, true),
            '0 0 0 rg',
            $this->textCommand('No. Job', 317, 681, 8),
            $this->textCommand(':', 374, 681, 8),
            $this->textCommand($jobNumber, 384, 681, 8, true),
            $this->textCommand('Kapal', 317, 665, 8),
            $this->textCommand(':', 374, 665, 8),
            $this->textCommand($shipRequest->ship?->name ?? '-', 384, 665, 8, true),
            $this->textCommand('Klien', 317, 649, 8),
            $this->textCommand(':', 374, 649, 8),
            $this->textCommand($companyName, 384, 649, 8),
            $this->textCommand('Pelabuhan', 317, 633, 8),
            $this->textCommand(':', 374, 633, 8),
            $this->textCommand($shipRequest->port?->name ?? '-', 384, 633, 8),
        ];
    }

    private function directorStatusLabel(?string $status): string
    {
        return match ($status) {
            'approved' => 'Disetujui',
            'rejected' => 'Ditolak',
            default => 'Menunggu',
        };
    }

    private function serviceTypeLabel(?string $serviceType): string
    {
        return match ($serviceType) {
            'clearance_in' => 'Clearance In',
            'clearance_out' => 'Clearance Out',
            default => $serviceType ?: 'Kebutuhan Kapal',
        };
    }

    private function statusColorCommand(?string $status): string
    {
        return str_contains(strtolower((string) $status), 'tolak') || $status === 'rejected'
            ? '0.776 0.157 0.251 rg'
            : '0.031 0.157 0.439 rg';
    }

    /** @return list<string> */
    private function limitedWrappedLines(?string $text, int $width, int $limit): array
    {
        if (blank($text)) {
            return [];
        }

        $lines = $this->wrappedLines((string) $text, $width);
        if (count($lines) <= $limit) {
            return $lines;
        }

        $lines = array_slice($lines, 0, $limit);
        $lines[$limit - 1] = rtrim($lines[$limit - 1], '.').'...';

        return $lines;
    }

    /** @return list<string> */
    private function wrappedLines(string $text, int $width): array
    {
        return explode("\n", wordwrap($this->plainText($text), $width, "\n", true));
    }

    /** @return list<string> */
    private function logoCommands(): array
    {
        return [
            '1.000 0.651 0.145 rg 58 793 8 8 re f',
            '0.000 0.376 0.957 rg 46 784 m 62 796 l 78 784 l 62 777 l h f',
            '0.098 0.710 0.969 rg 49 779 m 62 788 l 75 779 l 62 772 l h f',
            '0.031 0.157 0.439 rg 53 773 m 62 780 l 71 773 l 62 767 l h f',
        ];
    }

    private function textCommand(string $text, int $x, int $y, int $size, bool $bold = false): string
    {
        return sprintf(
            'BT /%s %d Tf 1 0 0 1 %d %d Tm (%s) Tj ET',
            $bold ? 'F2' : 'F1',
            $size,
            $x,
            $y,
            $this->escapePdfText($text),
        );
    }

    private function centeredTextCommand(string $text, int $y, int $size, bool $bold = false): string
    {
        $estimatedWidth = Str::length($this->plainText($text)) * $size * 0.46;

        return $this->textCommand($text, (int) max(42, (595 - $estimatedWidth) / 2), $y, $size, $bold);
    }

    private function centeredTextCommandWithin(
        string $text,
        int $left,
        int $right,
        int $y,
        int $size,
        bool $bold = false,
    ): string {
        $estimatedWidth = Str::length($this->plainText($text)) * $size * 0.46;
        $x = (int) max($left, $left + (($right - $left - $estimatedWidth) / 2));

        return $this->textCommand($text, $x, $y, $size, $bold);
    }

    private function rightAlignedTextCommand(
        string $text,
        int $right,
        int $y,
        int $size,
        bool $bold = false,
    ): string {
        $estimatedWidth = Str::length($this->plainText($text)) * $size * 0.48;

        return $this->textCommand($text, (int) max(42, $right - $estimatedWidth), $y, $size, $bold);
    }

    private function number(mixed $value): string
    {
        return number_format((float) $value, 0, ',', '.');
    }

    private function quantity(mixed $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, ',', '.'), '0'), ',');
    }

    private function setting(string $key): string
    {
        return $this->documentSettings->get($key);
    }

    private function plainText(string $text): string
    {
        return preg_replace('/\s+/', ' ', Str::ascii($text)) ?: '-';
    }

    private function escapePdfText(string $text): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $this->plainText($text));
    }

    /** @param list<string> $pageContents */
    private function buildPdf(array $pageContents): string
    {
        $pageCount = count($pageContents);
        $regularFontObject = 3 + ($pageCount * 2);
        $boldFontObject = $regularFontObject + 1;
        $pageObjectNumbers = [];
        $objects = [1 => '<< /Type /Catalog /Pages 2 0 R >>'];

        foreach ($pageContents as $pageIndex => $content) {
            $pageObject = 3 + ($pageIndex * 2);
            $contentObject = $pageObject + 1;
            $pageObjectNumbers[] = "{$pageObject} 0 R";
            $objects[$pageObject] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {$regularFontObject} 0 R /F2 {$boldFontObject} 0 R >> >> /Contents {$contentObject} 0 R >>";
            $objects[$contentObject] = '<< /Length '.strlen($content).">>\nstream\n{$content}\nendstream";
        }

        $objects[2] = '<< /Type /Pages /Kids ['.implode(' ', $pageObjectNumbers)."] /Count {$pageCount} >>";
        $objects[$regularFontObject] = '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>';
        $objects[$boldFontObject] = '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>';
        ksort($objects);

        $pdf = "%PDF-1.4\n";
        $offsets = [0];

        foreach ($objects as $number => $object) {
            $offsets[$number] = strlen($pdf);
            $pdf .= "{$number} 0 obj\n{$object}\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";

        foreach ($objects as $number => $_object) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$number]);
        }

        return $pdf.'trailer << /Size '.(count($objects) + 1).' /Root 1 0 R >>'."\nstartxref\n{$xrefOffset}\n%%EOF";
    }
}
