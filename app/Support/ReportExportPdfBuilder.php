<?php

namespace App\Support;

use Illuminate\Support\Str;

final class ReportExportPdfBuilder
{
    private const TIMES_ROMAN_WIDTHS = [
        ' ' => 250, '!' => 333, '"' => 408, '#' => 500, '$' => 500, '%' => 833, '&' => 778, '\'' => 333,
        '(' => 333, ')' => 333, '*' => 500, '+' => 564, ',' => 250, '-' => 333, '.' => 250, '/' => 278,
        '0' => 500, '1' => 500, '2' => 500, '3' => 500, '4' => 500, '5' => 500, '6' => 500, '7' => 500,
        '8' => 500, '9' => 500, ':' => 278, ';' => 278, '<' => 564, '=' => 564, '>' => 564, '?' => 444,
        '@' => 921, 'A' => 722, 'B' => 667, 'C' => 667, 'D' => 722, 'E' => 611, 'F' => 556, 'G' => 722,
        'H' => 722, 'I' => 333, 'J' => 389, 'K' => 722, 'L' => 611, 'M' => 889, 'N' => 722, 'O' => 722,
        'P' => 667, 'Q' => 722, 'R' => 667, 'S' => 556, 'T' => 611, 'U' => 722, 'V' => 667, 'W' => 889,
        'X' => 667, 'Y' => 667, 'Z' => 611, '[' => 333, '\\' => 278, ']' => 333, '^' => 469, '_' => 500,
        '`' => 333, 'a' => 444, 'b' => 500, 'c' => 444, 'd' => 500, 'e' => 444, 'f' => 278, 'g' => 500,
        'h' => 500, 'i' => 278, 'j' => 278, 'k' => 444, 'l' => 278, 'm' => 778, 'n' => 500, 'o' => 500,
        'p' => 500, 'q' => 500, 'r' => 333, 's' => 389, 't' => 278, 'u' => 500, 'v' => 444, 'w' => 667,
        'x' => 444, 'y' => 444, 'z' => 389, '{' => 400, '|' => 275, '}' => 400, '~' => 541,
    ];

    private const TIMES_BOLD_WIDTHS = [
        ' ' => 250, '!' => 333, '"' => 555, '#' => 500, '$' => 500, '%' => 1000, '&' => 833, '\'' => 333,
        '(' => 333, ')' => 333, '*' => 500, '+' => 570, ',' => 278, '-' => 333, '.' => 278, '/' => 278,
        '0' => 500, '1' => 500, '2' => 500, '3' => 500, '4' => 500, '5' => 500, '6' => 500, '7' => 500,
        '8' => 500, '9' => 500, ':' => 333, ';' => 333, '<' => 570, '=' => 570, '>' => 570, '?' => 500,
        '@' => 930, 'A' => 722, 'B' => 667, 'C' => 722, 'D' => 722, 'E' => 667, 'F' => 611, 'G' => 778,
        'H' => 778, 'I' => 389, 'J' => 500, 'K' => 778, 'L' => 667, 'M' => 944, 'N' => 722, 'O' => 778,
        'P' => 667, 'Q' => 778, 'R' => 722, 'S' => 556, 'T' => 667, 'U' => 722, 'V' => 667, 'W' => 889,
        'X' => 667, 'Y' => 667, 'Z' => 611, '[' => 333, '\\' => 278, ']' => 333, '^' => 469, '_' => 500,
        '`' => 333, 'a' => 500, 'b' => 556, 'c' => 444, 'd' => 556, 'e' => 444, 'f' => 333, 'g' => 500,
        'h' => 556, 'i' => 278, 'j' => 333, 'k' => 556, 'l' => 278, 'm' => 833, 'n' => 556, 'o' => 500,
        'p' => 556, 'q' => 556, 'r' => 444, 's' => 389, 't' => 333, 'u' => 556, 'v' => 500, 'w' => 722,
        'x' => 500, 'y' => 500, 'z' => 444, '{' => 400, '|' => 275, '}' => 400, '~' => 541,
    ];

    public function __construct(private InvoiceDocumentSettings $documentSettings) {}

    /**
     * @param array{
     *     title: string,
     *     orientation?: 'portrait'|'landscape',
     *     meta_lines?: list<string>,
     *     columns: list<array{header: string, width: int, align?: 'left'|'center'|'right', type?: string}>,
     *     rows: list<list<mixed>>,
     *     summary_boxes?: list<array{label: string, value: string}>,
     *     notes?: list<string>,
     *     signatories?: array{left_label?: string, left_name?: string, right_label?: string, right_name?: string}
     * } $data
     */
    public function build(array $data): string
    {
        $orientation = $data['orientation'] ?? 'landscape';
        $isLandscape = $orientation === 'landscape';

        $pageWidth = $isLandscape ? 842 : 595;
        $pageHeight = $isLandscape ? 595 : 842;
        $leftMargin = 36;
        $rightMargin = $pageWidth - 36;
        $usableWidth = $rightMargin - $leftMargin;

        $topMargin = $pageHeight - 36;
        $bottomMargin = 50;
        $tableTopY = $topMargin - 66; // After company header & meta block

        $columns = $data['columns'];
        // Scale column widths to match usableWidth precisely
        $totalSpecifiedWidth = array_sum(array_column($columns, 'width'));
        if ($totalSpecifiedWidth > 0) {
            $scale = $usableWidth / $totalSpecifiedWidth;
            foreach ($columns as &$col) {
                $col['scaled_width'] = (int) round($col['width'] * $scale);
            }
            unset($col);
        } else {
            $defaultWidth = (int) ($usableWidth / max(1, count($columns)));
            foreach ($columns as &$col) {
                $col['scaled_width'] = $defaultWidth;
            }
            unset($col);
        }

        // Calculate positions with last column absorbing rounding differences
        $currentX = $leftMargin;
        $lastColIdx = count($columns) - 1;
        foreach ($columns as $idx => &$col) {
            $col['x'] = $currentX;
            if ($idx === $lastColIdx) {
                $col['scaled_width'] = max(20, $rightMargin - $currentX);
            }
            $currentX += $col['scaled_width'];
        }
        unset($col);

        // Multi-line table header wrapping
        $colHeaderLines = [];
        $maxHeaderLines = 1;
        foreach ($columns as $cIdx => $col) {
            $availHeaderWidth = max(16.0, (float) ($col['scaled_width'] - 6));
            $hLines = $this->wrapHeaderText($col['header'], $availHeaderWidth, 7.5);
            $colHeaderLines[$cIdx] = $hLines;
            $maxHeaderLines = max($maxHeaderLines, count($hLines));
        }
        $thHeight = max(20, ($maxHeaderLines * 10) + 8);
        $thBoxTop = $tableTopY;
        $thBoxBottom = $thBoxTop - $thHeight;

        // Prepare row data with accurate word wrapping
        $preparedRows = [];
        foreach ($data['rows'] as $rIdx => $rowValues) {
            $maxLines = 1;
            $cellLines = [];

            foreach ($columns as $cIdx => $col) {
                $rawVal = $rowValues[$cIdx] ?? '';
                $type = $col['type'] ?? 'text';

                if ($type === 'currency' && is_numeric($rawVal)) {
                    $strVal = number_format((float) $rawVal, 0, ',', '.');
                } elseif ($type === 'number' && is_numeric($rawVal)) {
                    $num = (float) $rawVal;
                    $strVal = (string) (floor($num) == $num ? (int) $num : round($num, 2));
                } else {
                    $strVal = trim((string) $rawVal);
                }

                $availWidth = max(16.0, (float) ($col['scaled_width'] - 6));
                $lines = $this->wrapCellText($strVal, $availWidth, 7.5);
                $cellLines[$cIdx] = $lines;
                $maxLines = max($maxLines, count($lines));
            }

            $rowHeight = max(16, ($maxLines * 10) + 6);
            $preparedRows[] = [
                'index' => $rIdx,
                'cells' => $cellLines,
                'height' => $rowHeight,
            ];
        }

        // Paginate rows
        $summaryReserve = 85;
        if (! empty($data['signatories'])) {
            $summaryReserve += 80;
        }

        $pages = [['rows' => [], 'remaining' => $thBoxBottom - $bottomMargin - 20]];

        foreach ($preparedRows as $pRow) {
            $pIdx = count($pages) - 1;
            if ($pages[$pIdx]['rows'] !== [] && $pages[$pIdx]['remaining'] < $pRow['height']) {
                $pages[] = ['rows' => [], 'remaining' => $thBoxBottom - $bottomMargin - 20];
                $pIdx++;
            }
            $pages[$pIdx]['rows'][] = $pRow;
            $pages[$pIdx]['remaining'] -= $pRow['height'];
        }

        $lastPIdx = count($pages) - 1;
        if ($pages[$lastPIdx]['remaining'] < $summaryReserve && (count($preparedRows) > 0)) {
            $pages[] = ['rows' => [], 'remaining' => $thBoxBottom - $bottomMargin - 20];
        }

        $pageCount = count($pages);
        $pageContents = [];

        foreach ($pages as $pageIndex => $page) {
            $commands = [];

            // 1. Company Letterhead Header
            $companyName = $this->documentSettings->get('company_name') ?: 'PT. SAMUDRA JAYA ANDALAS';
            $commands[] = '0.043 0.122 0.388 rg'; // Navy
            $commands[] = $this->textCommand(strtoupper($companyName), $leftMargin, $topMargin - 4, 11, true);

            $commands[] = '0.322 0.396 0.557 rg'; // Slate
            $commands[] = $this->textCommand($this->documentSettings->get('business_label') ?: 'Shipping Agency & Logistics Services', $leftMargin, $topMargin - 16, 7);

            // Document Title on Right with auto-scaling to avoid overflow
            $titleText = strtoupper($data['title']);
            $titleSize = 11.0;
            $maxTitleWidth = max(220.0, $usableWidth - 220.0);
            while ($titleSize > 8.0 && $this->textWidth($titleText, $titleSize, true) > $maxTitleWidth) {
                $titleSize -= 0.5;
            }
            $commands[] = '0.043 0.122 0.388 rg';
            $commands[] = $this->rightAlignedTextCommand($titleText, $rightMargin, $topMargin - 4, $titleSize, true);

            // Meta lines
            $metaY = $topMargin - 30;
            $metaLines = $data['meta_lines'] ?? [];
            if (! empty($metaLines)) {
                $metaText = implode('   |   ', $metaLines);
                $commands[] = '0.2 0.25 0.35 rg';
                $commands[] = $this->textCommand($metaText, $leftMargin, $metaY, 7.5, true);
            }
            $commands[] = '0.4 0.45 0.55 rg';
            $commands[] = $this->rightAlignedTextCommand('Waktu Cetak: '.now()->timezone('Asia/Jakarta')->format('d/m/Y H:i').' WIB', $rightMargin, $metaY, 7);

            // Top divider line
            $commands[] = "0.741 0.839 0.992 RG 0.8 w {$leftMargin} ".($topMargin - 38)." m {$rightMargin} ".($topMargin - 38).' l S';

            // 2. Table Header
            $commands[] = "0.875 0.922 0.973 rg {$leftMargin} {$thBoxBottom} {$usableWidth} {$thHeight} re f";
            $commands[] = "0.741 0.839 0.992 RG 0.6 w {$leftMargin} {$thBoxBottom} m {$rightMargin} {$thBoxBottom} l S";

            $commands[] = '0.043 0.122 0.388 rg'; // Header text navy
            $yMid = $thBoxBottom + ($thHeight / 2.0);

            foreach ($columns as $cIdx => $col) {
                $align = $col['align'] ?? 'left';
                $hLines = $colHeaderLines[$cIdx];
                $k = count($hLines);
                $startLineY = (int) round($yMid + (($k - 1) * 5.0) - 2.5);

                foreach ($hLines as $lIdx => $line) {
                    $lineY = $startLineY - ($lIdx * 10);
                    if ($align === 'right') {
                        $commands[] = $this->rightAlignedTextCommand($line, $col['x'] + $col['scaled_width'] - 3, $lineY, 7.5, true);
                    } elseif ($align === 'center') {
                        $commands[] = $this->centeredTextCommandWithin($line, $col['x'], $col['x'] + $col['scaled_width'], $lineY, 7.5, true);
                    } else {
                        $commands[] = $this->textCommand($line, $col['x'] + 3, $lineY, 7.5, true);
                    }
                }
            }

            // 3. Table Rows
            $rowY = $thBoxBottom - 11;

            if (empty($page['rows']) && empty($preparedRows)) {
                $commands[] = '0.4 0.4 0.4 rg';
                $commands[] = $this->textCommand('Tidak ada data laporan untuk kriteria filter ini.', $leftMargin + 10, $rowY - 4, 8);
                $rowY -= 30;
            } else {
                foreach ($page['rows'] as $rItem) {
                    $rHeight = $rItem['height'];
                    $rIdx = $rItem['index'];

                    // Zebra background
                    if ($rIdx % 2 === 1) {
                        $commands[] = "0.976 0.988 1 rg {$leftMargin} ".($rowY - $rHeight + 9)." {$usableWidth} {$rHeight} re f";
                    }

                    // Bottom border
                    $commands[] = "0.89 0.93 0.98 RG 0.4 w {$leftMargin} ".($rowY - $rHeight + 9)." m {$rightMargin} ".($rowY - $rHeight + 9).' l S';

                    $commands[] = '0.05 0.1 0.25 rg'; // row text
                    foreach ($columns as $cIdx => $col) {
                        $lines = $rItem['cells'][$cIdx] ?? ['-'];
                        $align = $col['align'] ?? 'left';

                        foreach ($lines as $lIdx => $line) {
                            $lineY = $rowY - ($lIdx * 10);
                            if ($align === 'right') {
                                $commands[] = $this->rightAlignedTextCommand($line, $col['x'] + $col['scaled_width'] - 3, $lineY, 7.5);
                            } elseif ($align === 'center') {
                                $commands[] = $this->centeredTextCommandWithin($line, $col['x'], $col['x'] + $col['scaled_width'], $lineY, 7.5);
                            } else {
                                $commands[] = $this->textCommand($line, $col['x'] + 3, $lineY, 7.5);
                            }
                        }
                    }

                    $rowY -= $rHeight;
                }
            }

            // 4. Summary & Signatures (on last page)
            if ($pageIndex === $pageCount - 1) {
                $summaryY = max($bottomMargin + 75, $rowY - 12);

                if (! empty($data['summary_boxes'])) {
                    $boxCount = count($data['summary_boxes']);
                    $boxWidth = min(170, (int) (($usableWidth - (($boxCount - 1) * 10)) / max(1, $boxCount)));
                    $startX = $rightMargin - ($boxCount * $boxWidth) - (($boxCount - 1) * 10);

                    foreach ($data['summary_boxes'] as $bIdx => $box) {
                        $bx = $startX + ($bIdx * ($boxWidth + 10));
                        $commands[] = "0.94 0.97 1 rg {$bx} ".($summaryY - 32)." {$boxWidth} 34 re f";
                        $commands[] = "0.741 0.839 0.992 RG 0.6 w {$bx} ".($summaryY - 32)." {$boxWidth} 34 re S";

                        $commands[] = '0.3 0.4 0.55 rg';
                        $commands[] = $this->textCommand($box['label'], $bx + 8, $summaryY - 12, 7, true);

                        $commands[] = '0.043 0.122 0.388 rg';
                        $commands[] = $this->textCommand($box['value'], $bx + 8, $summaryY - 26, 9, true);
                    }
                    $summaryY -= 42;
                }

                // Signatures if provided
                if (! empty($data['signatories'])) {
                    $sig = $data['signatories'];
                    $sigLeftLabel = $sig['left_label'] ?? 'Dibuat Oleh,';
                    $sigLeftName = $sig['left_name'] ?? 'Staff Operasional / Admin';
                    $sigRightLabel = $sig['right_label'] ?? 'Mengetahui / Disetujui,';
                    $sigRightName = $sig['right_name'] ?? $this->documentSettings->get('signatory_title');

                    $sigY = $bottomMargin + 45;
                    $commands[] = '0.2 0.25 0.35 rg';
                    $commands[] = $this->textCommand($sigLeftLabel, $leftMargin + 20, $sigY, 7.5);
                    $commands[] = $this->rightAlignedTextCommand($sigRightLabel, $rightMargin - 20, $sigY, 7.5);

                    $commands[] = '0 0 0 RG 0.5 w '.($leftMargin + 10).' '.($sigY - 35).' m '.($leftMargin + 150).' '.($sigY - 35).' l S';
                    $commands[] = '0 0 0 RG 0.5 w '.($rightMargin - 150).' '.($sigY - 35).' m '.($rightMargin - 10).' '.($sigY - 35).' l S';

                    $commands[] = '0.05 0.1 0.25 rg';
                    $commands[] = $this->textCommand($sigLeftName, $leftMargin + 10, $sigY - 46, 7.5, true);
                    $commands[] = $this->rightAlignedTextCommand($sigRightName, $rightMargin - 10, $sigY - 46, 7.5, true);
                }
            }

            // 5. Page Footer
            $commands[] = "0.85 0.88 0.92 RG 0.5 w {$leftMargin} {$bottomMargin} m {$rightMargin} {$bottomMargin} l S";
            $commands[] = '0.5 0.55 0.65 rg';
            $commands[] = $this->textCommand(
                'Dokumen resmi dihasilkan secara elektronik oleh Sistem PT Samudra Jaya Andalas',
                $leftMargin,
                $bottomMargin - 10,
                6.5
            );
            $commands[] = $this->rightAlignedTextCommand(
                'Halaman '.($pageIndex + 1).' dari '.$pageCount,
                $rightMargin,
                $bottomMargin - 10,
                6.5
            );

            $pageContents[] = implode("\n", $commands);
        }

        return $this->assemblePdf($pageContents, $pageWidth, $pageHeight);
    }

    /**
     * Measure text width in PDF points based on Adobe Type 1 Times metrics.
     */
    public function textWidth(string $text, float $size, bool $bold = false): float
    {
        $plain = $this->plainText($text);
        $widths = $bold ? self::TIMES_BOLD_WIDTHS : self::TIMES_ROMAN_WIDTHS;
        $units = 0;
        $len = strlen($plain);
        for ($i = 0; $i < $len; $i++) {
            $c = $plain[$i];
            $units += $widths[$c] ?? 500;
        }

        return ($units / 1000.0) * $size;
    }

    /**
     * Wrap table header text cleanly into lines respecting maximum column width.
     *
     * @return list<string>
     */
    private function wrapHeaderText(string $header, float $maxWidth, float $fontSize = 7.5): array
    {
        $raw = trim($header);
        if ($raw === '' || $raw === '-') {
            return ['-'];
        }

        // Support explicit newlines before plainText strips them
        if (str_contains($raw, "\n")) {
            $explicitLines = explode("\n", $raw);
            $result = [];
            foreach ($explicitLines as $eLine) {
                foreach ($this->wrapHeaderText($eLine, $maxWidth, $fontSize) as $s) {
                    $result[] = $s;
                }
            }

            return $result ?: ['-'];
        }

        $normalized = trim($this->plainText($raw));
        if ($normalized === '' || $normalized === '-') {
            return ['-'];
        }

        if ($this->textWidth($normalized, $fontSize, true) <= $maxWidth) {
            return [$normalized];
        }

        $words = preg_split('/\s+/', $normalized) ?: [];

        // Check for an optimal balanced 2-line split if multiple words
        if (count($words) >= 2) {
            $bestSplit = null;
            $bestDiff = INF;
            $wordCount = count($words);
            for ($i = 1; $i < $wordCount; $i++) {
                $line1 = implode(' ', array_slice($words, 0, $i));
                $line2 = implode(' ', array_slice($words, $i));
                $w1 = $this->textWidth($line1, $fontSize, true);
                $w2 = $this->textWidth($line2, $fontSize, true);
                if ($w1 <= $maxWidth && $w2 <= $maxWidth) {
                    $diff = abs($w1 - $w2);
                    if ($diff < $bestDiff) {
                        $bestDiff = $diff;
                        $bestSplit = [$line1, $line2];
                    }
                }
            }
            if ($bestSplit !== null) {
                return $bestSplit;
            }
        }

        $lines = [];
        $currentLine = '';

        foreach ($words as $word) {
            $testLine = $currentLine === '' ? $word : $currentLine.' '.$word;
            if ($this->textWidth($testLine, $fontSize, true) <= $maxWidth) {
                $currentLine = $testLine;
            } else {
                if ($currentLine !== '') {
                    $lines[] = $currentLine;
                    $currentLine = '';
                }

                if ($this->textWidth($word, $fontSize, true) <= $maxWidth) {
                    $currentLine = $word;
                } else {
                    // Try breaking at slash or hyphen
                    $subTokens = preg_split('/(?<=[-\/])/', $word) ?: [$word];
                    if (count($subTokens) > 1) {
                        foreach ($subTokens as $st) {
                            $testSub = $currentLine === '' ? $st : $currentLine.$st;
                            if ($this->textWidth($testSub, $fontSize, true) <= $maxWidth) {
                                $currentLine = $testSub;
                            } else {
                                if ($currentLine !== '') {
                                    $lines[] = $currentLine;
                                    $currentLine = '';
                                }
                                $currentLine = $st;
                            }
                        }
                    } else {
                        $currentLine = $word;
                    }
                }
            }
        }

        if ($currentLine !== '') {
            $lines[] = $currentLine;
        }

        return $lines ?: [$normalized];
    }

    /**
     * Wrap cell text with natural word and hyphen boundary breaks to eliminate single-letter orphans.
     *
     * @return list<string>
     */
    private function wrapCellText(string $text, float $maxWidth, float $fontSize = 7.5): array
    {
        $normalized = trim($this->plainText($text));
        if ($normalized === '' || $normalized === '-') {
            return ['-'];
        }

        if ($this->textWidth($normalized, $fontSize) <= $maxWidth) {
            return [$normalized];
        }

        $words = preg_split('/\s+/', $normalized) ?: [];
        $lines = [];
        $currentLine = '';

        foreach ($words as $word) {
            $testLine = $currentLine === '' ? $word : $currentLine.' '.$word;
            if ($this->textWidth($testLine, $fontSize) <= $maxWidth) {
                $currentLine = $testLine;

                continue;
            }

            if ($currentLine !== '') {
                $lines[] = $currentLine;
                $currentLine = '';
            }

            if ($this->textWidth($word, $fontSize) <= $maxWidth) {
                $currentLine = $word;

                continue;
            }

            // Word exceeds maxWidth: break at hyphens or slashes if present
            $subTokens = preg_split('/(?<=[-\/])/', $word) ?: [$word];
            if (count($subTokens) > 1) {
                foreach ($subTokens as $token) {
                    $testSub = $currentLine === '' ? $token : $currentLine.$token;
                    if ($this->textWidth($testSub, $fontSize) <= $maxWidth) {
                        $currentLine = $testSub;
                    } else {
                        if ($currentLine !== '') {
                            $lines[] = $currentLine;
                            $currentLine = '';
                        }
                        if ($this->textWidth($token, $fontSize) <= $maxWidth) {
                            $currentLine = $token;
                        } else {
                            $currentLine = $this->breakLongToken($token, $maxWidth, $fontSize, $lines);
                        }
                    }
                }

                continue;
            }

            // Fallback for very long continuous word without separators
            $currentLine = $this->breakLongToken($word, $maxWidth, $fontSize, $lines);
        }

        if ($currentLine !== '') {
            $lines[] = $currentLine;
        }

        return $lines ?: ['-'];
    }

    /**
     * Slice unbroken token character-by-character to fit within available width.
     *
     * @param  list<string>  $lines
     */
    private function breakLongToken(string $token, float $maxWidth, float $fontSize, array &$lines): string
    {
        $curr = '';
        $len = mb_strlen($token);
        for ($i = 0; $i < $len; $i++) {
            $char = mb_substr($token, $i, 1);
            if ($this->textWidth($curr.$char, $fontSize) <= $maxWidth) {
                $curr .= $char;
            } else {
                if ($curr !== '') {
                    $lines[] = $curr;
                }
                $curr = $char;
            }
        }

        return $curr;
    }

    private function textCommand(string $text, int $x, int $y, float $size, bool $bold = false): string
    {
        $font = $bold ? '/F2' : '/F1';
        $escaped = $this->escapePdfText($text);

        return "BT {$font} {$size} Tf 1 0 0 1 {$x} {$y} Tm ({$escaped}) Tj ET";
    }

    private function centeredTextCommandWithin(string $text, int $left, int $right, int $y, float $size, bool $bold = false): string
    {
        $width = $this->textWidth($text, $size, $bold);
        $x = (int) max($left, round($left + (($right - $left - $width) / 2.0)));

        return $this->textCommand($text, $x, $y, $size, $bold);
    }

    private function rightAlignedTextCommand(string $text, int $right, int $y, float $size, bool $bold = false): string
    {
        $width = $this->textWidth($text, $size, $bold);
        $x = (int) max(36, round($right - $width));

        return $this->textCommand($text, $x, $y, $size, $bold);
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
    private function assemblePdf(array $pageContents, int $pageWidth, int $pageHeight): string
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
            $objects[$pageObject] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {$pageWidth} {$pageHeight}] /Resources << /Font << /F1 {$regularFontObject} 0 R /F2 {$boldFontObject} 0 R >> >> /Contents {$contentObject} 0 R >>";
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
