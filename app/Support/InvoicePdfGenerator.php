<?php

namespace App\Support;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Support\Str;

class InvoicePdfGenerator
{
    public function __construct(private InvoiceDocumentSettings $documentSettings) {}

    public function generate(Invoice $invoice): string
    {
        $invoice->loadMissing([
            'company',
            'portCall.ship',
            'portCall.port',
            'portCall.workOrder',
            'items',
        ]);

        $documentTitle = $invoice->invoice_type === 'reimburse' ? 'REIMBURSEMENT' : 'INVOICE';
        $company = $invoice->company?->name ?? 'Perusahaan belum ditentukan';
        $companyAddress = $invoice->company?->address ?? 'Alamat perusahaan belum diisi';
        $ship = $invoice->portCall?->ship?->name ?? 'Kapal belum ditentukan';
        $jobNumber = $invoice->portCall?->job_number ?? '-';
        $clientSpkNumber = $invoice->portCall?->workOrder?->client_number ?? '-';
        $berthPort = $invoice->portCall?->port?->name ?? '-';
        $originPort = $invoice->origin_port_name ?: '-';
        $destinationPort = $invoice->destination_port_name ?: '-';
        $eta = $invoice->portCall?->eta_at?->format('d-m-Y') ?? '-';
        $etd = $invoice->portCall?->etd_at?->format('d-m-Y') ?? '-';
        $subject = $invoice->subject ?: ($invoice->invoice_type === 'reimburse' ? 'Reimbursement ' : 'Keagenan ').$ship;
        $items = $invoice->items->sortBy('sort_order')->values();
        $defaultSectionTitle = $invoice->invoice_type === 'reimburse' ? 'Rincian Reimbursement' : 'Biaya Keagenan';
        $groupedItems = $items->groupBy(
            fn (InvoiceItem $item): string => filled($item->section_title) ? trim($item->section_title) : $defaultSectionTitle,
        );
        $showSectionSubtotals = $invoice->invoice_type === 'reimburse' || $groupedItems->count() > 1;
        $noteLines = $invoice->notes ? $this->wrappedLines($invoice->notes, 82) : [];
        $summaryReserve = 292 + (count($noteLines) * 11);
        $pages = [['rows' => [], 'remaining_y' => 516]];
        $itemNumber = 1;
        $sectionNumber = 1;

        foreach ($groupedItems as $sectionIndex => $sectionItems) {
            $sectionTitle = (string) $sectionIndex;
            $sectionHeading = $this->romanNumeral($sectionNumber).'. '.$sectionTitle;
            $sectionHeadingLines = $this->wrappedLines($sectionHeading, 70);
            $sectionHeight = max(24, (count($sectionHeadingLines) * 12) + 12);
            $firstItemLines = $sectionItems->isNotEmpty()
                ? $this->wrappedLines($sectionItems->first()->description, 58)
                : [];
            $firstItemHeight = max(36, (count($firstItemLines) * 11) + 19);
            $pageIndex = count($pages) - 1;

            if ($pages[$pageIndex]['rows'] !== [] && $pages[$pageIndex]['remaining_y'] - $sectionHeight - $firstItemHeight < $summaryReserve) {
                $pages[] = ['rows' => [], 'remaining_y' => 516];
                $pageIndex++;
            }

            $pages[$pageIndex]['rows'][] = [
                'type' => 'section',
                'title_lines' => $sectionHeadingLines,
                'height' => $sectionHeight,
            ];
            $pages[$pageIndex]['remaining_y'] -= $sectionHeight;

            foreach ($sectionItems as $item) {
                $descriptionLines = $this->wrappedLines($item->description, 58);
                $rowHeight = max(36, (count($descriptionLines) * 11) + 19);
                $pageIndex = count($pages) - 1;

                if ($pages[$pageIndex]['rows'] !== [] && $pages[$pageIndex]['remaining_y'] - $rowHeight < $summaryReserve) {
                    $continuationLines = $this->wrappedLines($sectionHeading.' (lanjutan)', 70);
                    $continuationHeight = max(24, (count($continuationLines) * 12) + 12);
                    $pages[] = ['rows' => [[
                        'type' => 'section',
                        'title_lines' => $continuationLines,
                        'height' => $continuationHeight,
                    ]], 'remaining_y' => 516 - $continuationHeight];
                    $pageIndex++;
                }

                $pages[$pageIndex]['rows'][] = [
                    'type' => 'item',
                    'item' => $item,
                    'number' => $itemNumber,
                    'description_lines' => $descriptionLines,
                    'height' => $rowHeight,
                ];
                $pages[$pageIndex]['remaining_y'] -= $rowHeight;
                $itemNumber++;
            }

            if ($showSectionSubtotals) {
                $pageIndex = count($pages) - 1;
                if ($pages[$pageIndex]['remaining_y'] - 25 < $summaryReserve) {
                    $continuationLines = $this->wrappedLines($sectionHeading.' (lanjutan)', 70);
                    $continuationHeight = max(24, (count($continuationLines) * 12) + 12);
                    $pages[] = ['rows' => [[
                        'type' => 'section',
                        'title_lines' => $continuationLines,
                        'height' => $continuationHeight,
                    ]], 'remaining_y' => 516 - $continuationHeight];
                    $pageIndex++;
                }

                $pages[$pageIndex]['rows'][] = [
                    'type' => 'section_subtotal',
                    'title' => $sectionTitle,
                    'value' => $sectionItems->sum(fn (InvoiceItem $item): float => (float) $item->subtotal),
                    'height' => 25,
                ];
                $pages[$pageIndex]['remaining_y'] -= 25;
            }

            $sectionNumber++;
        }

        $pageCount = count($pages);
        $pageContents = [];

        foreach ($pages as $pageIndex => $page) {
            $commands = [
                ...$this->logoCommands(),
                '0.141 0.365 0.541 rg',
                $this->centeredTextCommand($this->setting('company_name'), 800, 21, true),
                '0 0 0 rg',
                $this->centeredTextCommand($this->setting('business_label'), 779, 12, true),
                $this->centeredTextCommand('KANTOR PUSAT: '.$this->setting('office_address'), 764, 8, true),
                $this->centeredTextCommand('Telp. '.$this->setting('phone').'  Email: '.$this->setting('email'), 752, 8),
                '0 0 0 RG 1.4 w 42 738 m 553 738 l S',
                '0 0 0 RG 0.6 w 42 734 m 553 734 l S',
                $this->centeredTextCommand($documentTitle, 712, 15, true),
                '0 0 0 RG 0.8 w 236 708 m 359 708 l S',
                $this->textCommand('Nomor', 42, 687, 9),
                $this->textCommand(':', 91, 687, 9),
                $this->textCommand($invoice->invoice_number, 103, 687, 9, true),
                $this->textCommand('Hal', 42, 671, 9),
                $this->textCommand(':', 91, 671, 9),
                $this->textCommand($subject, 103, 671, 9, true),
                $this->rightAlignedTextCommand(
                    $this->setting('city').', '.($invoice->invoice_date?->translatedFormat('d F Y') ?? '-'),
                    553,
                    687,
                    9,
                    true,
                ),
                $this->textCommand('Kepada Yth.', 42, 641, 9),
                $this->textCommand($company, 42, 625, 10, true),
            ];

            $addressY = 610;
            foreach (array_slice($this->wrappedLines($companyAddress, 56), 0, 2) as $addressLine) {
                $commands[] = $this->textCommand($addressLine, 42, $addressY, 9);
                $addressY -= 13;
            }

            $commands = [
                ...$commands,
                $this->textCommand('ETA / ETD', 42, 579, 9, true),
                $this->textCommand(':', 96, 579, 9),
                $this->textCommand("{$eta} - {$etd}", 108, 579, 9, true),
                $this->textCommand('No. Job', 42, 563, 9),
                $this->textCommand(':', 96, 563, 9),
                $this->textCommand($jobNumber, 108, 563, 9),
                $this->textCommand('Referensi SPK', 42, 547, 9),
                $this->textCommand(':', 96, 547, 9),
                $this->textCommand($clientSpkNumber, 108, 547, 9),
                $this->textCommand('Pel. Asal', 318, 579, 9),
                $this->textCommand(':', 400, 579, 9),
                $this->textCommand($originPort, 412, 579, 9),
                $this->textCommand('Pel. Sandar (muat)', 318, 563, 9),
                $this->textCommand(':', 400, 563, 9),
                $this->textCommand($berthPort, 412, 563, 9),
                $this->textCommand('Pel. Tujuan', 318, 547, 9),
                $this->textCommand(':', 400, 547, 9),
                $this->textCommand($destinationPort, 412, 547, 9),
            ];
            $y = 516;

            if ($page['rows'] === []) {
                $commands[] = $this->textCommand('Rincian biaya belum tersedia.', 64, $y, 9);
                $y -= 30;
            }

            foreach ($page['rows'] as $row) {
                if ($row['type'] === 'section') {
                    foreach ($row['title_lines'] as $titleLineIndex => $titleLine) {
                        $commands[] = $this->textCommand($titleLine, 42, $y - ($titleLineIndex * 12), 10, true);
                    }
                    $commands[] = '0 0 0 RG 0.7 w 42 '.($y - (count($row['title_lines']) * 12) + 7).' m 422 '.($y - (count($row['title_lines']) * 12) + 7).' l S';
                    $y -= $row['height'];

                    continue;
                }

                if ($row['type'] === 'section_subtotal') {
                    $commands[] = $this->rightAlignedTextCommand('Jumlah', 405, $y, 9, true);
                    $commands[] = $this->textCommand('Rp', 428, $y, 9, true);
                    $commands[] = $this->rightAlignedTextCommand($this->number($row['value']), 548, $y, 9, true);
                    $commands[] = '0 0 0 RG 0.9 w 425 '.($y - 4).' m 548 '.($y - 4).' l S';
                    $y -= $row['height'];

                    continue;
                }

                /** @var InvoiceItem $item */
                $item = $row['item'];
                $commands[] = $this->textCommand((string) $row['number'], 48, $y, 9);

                foreach ($row['description_lines'] as $lineIndex => $line) {
                    $commands[] = $this->textCommand($line, 66, $y - ($lineIndex * 11), 9, $lineIndex === 0);
                }

                $commands[] = $this->textCommand('=', 410, $y, 9);
                $commands[] = $this->textCommand('Rp', 428, $y, 9);
                $commands[] = $this->rightAlignedTextCommand($this->number($item->subtotal), 548, $y, 9, true);
                $detailY = $y - (count($row['description_lines']) * 11) - 1;
                $commands[] = $this->textCommand(
                    $this->quantity($item->quantity).' '.($item->unit ?: 'Paket').' x Rp '.$this->number($item->unit_price),
                    66,
                    $detailY,
                    8,
                );
                $commands[] = '0 0 0 RG 0.5 w 425 '.($y - 4).' m 548 '.($y - 4).' l S';
                $y -= $row['height'];
            }

            if ($pageIndex === $pageCount - 1) {
                $summaryY = $y - 5;
                if (! $showSectionSubtotals) {
                    $commands[] = $this->summaryLine('Subtotal', $invoice->subtotal, $summaryY);
                    $summaryY -= 16;
                }

                if ((float) $invoice->addon_total > 0) {
                    $commands[] = $this->summaryLine('Materai / biaya tambahan', $invoice->addon_total, $summaryY);
                    $summaryY -= 16;
                }

                if ((float) $invoice->tax > 0) {
                    $commands[] = $this->summaryLine('Pajak', $invoice->tax, $summaryY);
                    $summaryY -= 16;
                }

                $commands[] = '0 0 0 RG 1.2 w 399 '.($summaryY + 5).' m 548 '.($summaryY + 5).' l S';
                $commands[] = $this->textCommand('TOTAL', 354, $summaryY - 8, 10, true);
                $commands[] = $this->textCommand('Rp', 428, $summaryY - 8, 10, true);
                $commands[] = $this->rightAlignedTextCommand($this->number($invoice->grand_total), 548, $summaryY - 8, 10, true);

                $closingY = $summaryY - 38;
                $commands[] = $this->textCommand(
                    'Demikian kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.',
                    42,
                    $closingY,
                    8,
                );

                $notesY = $closingY - 16;
                if ($noteLines !== []) {
                    $commands[] = $this->textCommand('Catatan:', 42, $notesY, 8, true);
                    $notesY -= 11;
                    foreach ($noteLines as $noteLine) {
                        $commands[] = $this->textCommand($noteLine, 42, $notesY, 8);
                        $notesY -= 11;
                    }
                }

                $bankY = min($notesY - 15, 158);
                $commands[] = $this->textCommand('Pembayaran ditransfer ke:', 42, $bankY, 9, true);
                $commands[] = $this->textCommand($this->setting('bank_account_name'), 42, $bankY - 15, 9, true);
                $commands[] = $this->textCommand('a/c '.$this->setting('bank_account_number'), 42, $bankY - 30, 9, true);
                $commands[] = $this->textCommand($this->setting('bank_name'), 42, $bankY - 45, 9, true);
                $commands[] = $this->textCommand(
                    'Jatuh tempo: '.($invoice->due_date?->translatedFormat('d F Y') ?? '-'),
                    42,
                    $bankY - 63,
                    8,
                );
                $commands[] = $this->textCommand('Hormat kami,', 425, $bankY, 9);
                $commands[] = '0 0 0 RG 0.7 w 401 '.($bankY - 61).' m 526 '.($bankY - 61).' l S';
                $commands[] = $this->centeredTextCommandWithin(
                    $this->setting('signatory_title'),
                    401,
                    526,
                    $bankY - 74,
                    9,
                    true,
                );
            }

            $commands[] = '0.55 0.62 0.69 RG 0.5 w 42 45 m 553 45 l S';
            $commands[] = $this->textCommand('Dokumen sistem - versi '.$invoice->version, 42, 30, 7);
            $commands[] = $this->centeredTextCommand('Halaman '.($pageIndex + 1)."/{$pageCount}", 30, 7);
            $commands[] = $this->rightAlignedTextCommand('Dicetak '.now()->format('d-m-Y H:i').' WIB', 553, 30, 7);
            $pageContents[] = implode("\n", $commands);
        }

        return $this->buildPdf($pageContents);
    }

    private function summaryLine(string $label, mixed $value, int $y): string
    {
        return implode("\n", [
            $this->textCommand($label, 354, $y, 9),
            $this->textCommand('Rp', 428, $y, 9),
            $this->rightAlignedTextCommand($this->number($value), 548, $y, 9, true),
        ]);
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
        $font = $bold ? 'F2' : 'F1';

        return sprintf(
            'BT /%s %d Tf 1 0 0 1 %d %d Tm (%s) Tj ET',
            $font,
            $size,
            $x,
            $y,
            $this->escapePdfText($text),
        );
    }

    private function centeredTextCommand(string $text, int $y, int $size, bool $bold = false): string
    {
        $estimatedWidth = Str::length($this->plainText($text)) * $size * 0.46;
        $x = (int) max(42, (595 - $estimatedWidth) / 2);

        return $this->textCommand($text, $x, $y, $size, $bold);
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
        $x = (int) max(42, $right - $estimatedWidth);

        return $this->textCommand($text, $x, $y, $size, $bold);
    }

    private function number(mixed $value): string
    {
        return number_format((float) $value, 0, ',', '.');
    }

    private function quantity(mixed $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, ',', '.'), '0'), ',');
    }

    private function romanNumeral(int $number): string
    {
        $map = [
            1000 => 'M',
            900 => 'CM',
            500 => 'D',
            400 => 'CD',
            100 => 'C',
            90 => 'XC',
            50 => 'L',
            40 => 'XL',
            10 => 'X',
            9 => 'IX',
            5 => 'V',
            4 => 'IV',
            1 => 'I',
        ];
        $result = '';

        foreach ($map as $value => $numeral) {
            while ($number >= $value) {
                $result .= $numeral;
                $number -= $value;
            }
        }

        return $result;
    }

    /** @return list<string> */
    private function wrappedLines(string $text, int $width): array
    {
        return explode("\n", wordwrap($this->plainText($text), $width, "\n", true));
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
        return str_replace(
            ['\\', '(', ')'],
            ['\\\\', '\\(', '\\)'],
            $this->plainText($text),
        );
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
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n";
        $pdf .= "0000000000 65535 f \n";

        foreach ($objects as $number => $_object) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$number]);
        }

        $pdf .= 'trailer << /Size '.(count($objects) + 1).' /Root 1 0 R >>'."\n";
        $pdf .= "startxref\n{$xrefOffset}\n%%EOF";

        return $pdf;
    }
}
