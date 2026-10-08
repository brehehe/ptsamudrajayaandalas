<?php

namespace App\Support;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Support\Str;

class InvoicePdfGenerator
{
    public function generate(Invoice $invoice): string
    {
        $invoice->loadMissing(['company', 'portCall.ship', 'portCall.port', 'request', 'items']);

        $company = $invoice->company?->name ?? 'Klien belum ditentukan';
        $ship = $invoice->portCall?->ship?->name ?? 'Kapal belum ditentukan';
        $jobNumber = $invoice->portCall?->job_number ?? '-';
        $port = $invoice->portCall?->port?->name ?? '-';
        $items = $invoice->items->sortBy('created_at')->values();
        $pages = [['items' => [], 'remaining_y' => 512]];

        foreach ($items as $item) {
            $descriptionLines = $this->wrappedLines($item->description, 55);
            $rowHeight = max(42, (count($descriptionLines) * 12) + 24);
            $pageIndex = count($pages) - 1;

            if ($pages[$pageIndex]['remaining_y'] - $rowHeight < 118) {
                $pages[] = ['items' => [], 'remaining_y' => 512];
                $pageIndex++;
            }

            $pages[$pageIndex]['items'][] = [
                'item' => $item,
                'description_lines' => $descriptionLines,
                'height' => $rowHeight,
            ];
            $pages[$pageIndex]['remaining_y'] -= $rowHeight;
        }

        $notes = $invoice->notes ?: 'Dokumen ini dihasilkan oleh Sistem Keagenan Kapal PT Samudra Jaya Andalas.';
        $noteLines = $this->wrappedLines($notes, 82);
        $summaryHeight = 124 + (count($noteLines) * 14);
        $lastPageIndex = count($pages) - 1;

        if ($pages[$lastPageIndex]['remaining_y'] - $summaryHeight < 100) {
            $pages[] = ['items' => [], 'remaining_y' => 512];
        }

        $pageCount = count($pages);
        $pageContents = [];

        foreach ($pages as $pageIndex => $page) {
            $commands = [
                '0.043 0.122 0.388 rg',
                $this->textCommand('PT SAMUDRA JAYA ANDALAS', 50, 792, 17, true),
                $this->textCommand('Ship Agency Management System', 50, 774, 9),
                '0.000 0.376 0.957 RG 1.5 w 50 755 m 545 755 l S',
                $this->textCommand('INVOICE', 50, 722, 22, true),
                $this->textCommand($invoice->invoice_number, 50, 702, 10, true),
                $this->textCommand('Tanggal invoice', 360, 722, 8),
                $this->textCommand($invoice->invoice_date?->format('d-m-Y') ?? '-', 450, 722, 9, true),
                $this->textCommand('Jatuh tempo', 360, 704, 8),
                $this->textCommand($invoice->due_date?->format('d-m-Y') ?? '-', 450, 704, 9, true),
                $this->textCommand('DITAGIHKAN KEPADA', 50, 662, 9, true),
                $this->textCommand($company, 50, 644, 11, true),
                $this->textCommand("Kapal: {$ship}", 50, 625, 9),
                $this->textCommand("Job: {$jobNumber}", 50, 609, 9),
                $this->textCommand("Pelabuhan: {$port}", 50, 593, 9),
                '0.863 0.918 0.973 RG 1 w 50 566 m 545 566 l S',
                $this->textCommand('URAIAN', 50, 547, 9, true),
                $this->textCommand('NILAI', 445, 547, 9, true),
                '0.863 0.918 0.973 RG 1 w 50 535 m 545 535 l S',
            ];
            $y = 512;

            foreach ($page['items'] as $row) {
                /** @var InvoiceItem $item */
                $item = $row['item'];
                foreach ($row['description_lines'] as $lineIndex => $line) {
                    $commands[] = $this->textCommand($line, 50, $y - ($lineIndex * 12), 9, $lineIndex === 0);
                }

                $detailY = $y - (count($row['description_lines']) * 12) - 2;
                $commands[] = $this->textCommand(
                    $this->quantity($item->quantity).' '.($item->unit ?: 'Paket').' x '.$this->money($item->unit_price),
                    50,
                    $detailY,
                    8,
                );
                $commands[] = $this->textCommand($this->money($item->subtotal), 445, $y, 9, true);
                $rowBottom = $y - $row['height'] + 8;
                $commands[] = "0.863 0.918 0.973 RG 0.5 w 50 {$rowBottom} m 545 {$rowBottom} l S";
                $y -= $row['height'];
            }

            if ($pageIndex === $pageCount - 1) {
                $summaryY = $y - 10;
                $commands[] = $this->textCommand('Subtotal', 330, $summaryY, 9);
                $commands[] = $this->textCommand($this->money($invoice->subtotal), 445, $summaryY, 9, true);
                $commands[] = $this->textCommand('Biaya tambahan', 330, $summaryY - 22, 9);
                $commands[] = $this->textCommand($this->money($invoice->addon_total), 445, $summaryY - 22, 9, true);
                $commands[] = $this->textCommand('Pajak', 330, $summaryY - 44, 9);
                $commands[] = $this->textCommand($this->money($invoice->tax), 445, $summaryY - 44, 9, true);
                $commands[] = '0.000 0.376 0.957 RG 1.5 w 330 '.($summaryY - 62).' m 545 '.($summaryY - 62).' l S';
                $commands[] = $this->textCommand('TOTAL', 330, $summaryY - 84, 11, true);
                $commands[] = $this->textCommand($this->money($invoice->grand_total), 430, $summaryY - 84, 11, true);
                $commands[] = $this->textCommand('Catatan', 50, $summaryY - 112, 9, true);

                $noteY = $summaryY - 130;
                foreach ($noteLines as $line) {
                    $commands[] = $this->textCommand($line, 50, $noteY, 8);
                    $noteY -= 14;
                }
            }

            $commands[] = '0.863 0.918 0.973 RG 1 w 50 92 m 545 92 l S';
            $commands[] = $this->textCommand('Dokumen sistem - versi '.$invoice->version, 50, 72, 8);
            $commands[] = $this->textCommand('Halaman '.($pageIndex + 1)."/{$pageCount}", 270, 72, 8);
            $commands[] = $this->textCommand('Dicetak '.now()->format('d-m-Y H:i').' WIB', 382, 72, 8);
            $pageContents[] = implode("\n", $commands);
        }

        return $this->buildPdf($pageContents);
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

    private function money(mixed $value): string
    {
        return 'Rp '.number_format((float) $value, 0, ',', '.');
    }

    private function quantity(mixed $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, ',', '.'), '0'), ',');
    }

    /** @return list<string> */
    private function wrappedLines(string $text, int $width): array
    {
        return explode("\n", wordwrap($this->plainText($text), $width, "\n", true));
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
            $objects[$contentObject] = '<< /Length '.strlen($content)." >>\nstream\n{$content}\nendstream";
        }

        $objects[2] = '<< /Type /Pages /Kids ['.implode(' ', $pageObjectNumbers)."] /Count {$pageCount} >>";
        $objects[$regularFontObject] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
        $objects[$boldFontObject] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
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
