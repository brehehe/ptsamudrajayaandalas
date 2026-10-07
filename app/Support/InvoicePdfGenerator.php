<?php

namespace App\Support;

use App\Models\Invoice;
use Illuminate\Support\Str;

class InvoicePdfGenerator
{
    public function generate(Invoice $invoice): string
    {
        $invoice->loadMissing(['company', 'portCall.ship', 'portCall.port', 'request']);

        $company = $invoice->company?->name ?? 'Klien belum ditentukan';
        $ship = $invoice->portCall?->ship?->name ?? 'Kapal belum ditentukan';
        $jobNumber = $invoice->portCall?->job_number ?? '-';
        $port = $invoice->portCall?->port?->name ?? '-';
        $invoiceType = $invoice->invoice_type === 'reimburse' ? 'Reimburse' : 'Jasa Keagenan';

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
            $this->textCommand($invoiceType, 50, 512, 10, true),
            $this->textCommand('Subtotal', 330, 512, 9),
            $this->textCommand($this->money($invoice->subtotal), 445, 512, 9, true),
            $this->textCommand('Biaya tambahan', 330, 490, 9),
            $this->textCommand($this->money($invoice->addon_total), 445, 490, 9, true),
            $this->textCommand('Pajak', 330, 468, 9),
            $this->textCommand($this->money($invoice->tax), 445, 468, 9, true),
            '0.000 0.376 0.957 RG 1.5 w 330 450 m 545 450 l S',
            $this->textCommand('TOTAL', 330, 427, 11, true),
            $this->textCommand($this->money($invoice->grand_total), 430, 427, 11, true),
            $this->textCommand('Catatan', 50, 385, 9, true),
        ];

        $notes = $invoice->notes ?: 'Dokumen ini dihasilkan oleh Sistem Keagenan Kapal PT Samudra Jaya Andalas.';
        $y = 367;
        foreach (explode("\n", wordwrap($this->plainText($notes), 82, "\n", true)) as $line) {
            $commands[] = $this->textCommand($line, 50, $y, 8);
            $y -= 14;
        }

        $commands[] = '0.863 0.918 0.973 RG 1 w 50 92 m 545 92 l S';
        $commands[] = $this->textCommand('Dokumen sistem - versi '.$invoice->version, 50, 72, 8);
        $commands[] = $this->textCommand('Dicetak '.now()->format('d-m-Y H:i').' WIB', 382, 72, 8);

        return $this->buildPdf(implode("\n", $commands));
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

    private function buildPdf(string $content): string
    {
        $objects = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            2 => '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            3 => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
            4 => '<< /Length '.strlen($content)." >>\nstream\n{$content}\nendstream",
            5 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            6 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
        ];

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
