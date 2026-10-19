<?php

namespace App\Support;

use RuntimeException;
use XMLWriter;
use ZipArchive;

final class ReportExportXlsxBuilder
{
    private const CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    public function __construct(private InvoiceDocumentSettings $documentSettings) {}

    /**
     * @param array{
     *     title: string,
     *     sheet_name?: string,
     *     meta_lines?: list<string>,
     *     columns: list<array{header: string, width?: float, align?: string, type?: string}>,
     *     rows: list<list<mixed>>,
     *     summary_row?: array{label: string, label_span: int, totals: array<int, float|int>}|null
     * } $data
     */
    public function build(array $data): string
    {
        $workbookPath = $this->temporaryPath('sja-export-wb-');
        $worksheetPath = $this->temporaryPath('sja-export-ws-');

        try {
            $this->writeWorksheet($worksheetPath, $data);

            $archive = new ZipArchive;
            $openResult = $archive->open($workbookPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

            if ($openResult !== true) {
                throw new RuntimeException('Berkas Excel laporan tidak dapat dibuat.');
            }

            $sheetName = $data['sheet_name'] ?? 'Laporan';

            $archive->addFromString('[Content_Types].xml', $this->contentTypesXml());
            $archive->addFromString('_rels/.rels', $this->rootRelationshipsXml());
            $archive->addFromString('docProps/app.xml', $this->applicationPropertiesXml($sheetName));
            $archive->addFromString('docProps/core.xml', $this->corePropertiesXml($data['title']));
            $archive->addFromString('xl/workbook.xml', $this->workbookXml($sheetName));
            $archive->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelationshipsXml());
            $archive->addFromString('xl/styles.xml', $this->stylesXml());

            if (! $archive->addFile($worksheetPath, 'xl/worksheets/sheet1.xml')) {
                $archive->close();
                throw new RuntimeException('Lembar kerja laporan tidak dapat ditambahkan ke berkas Excel.');
            }

            if (! $archive->close()) {
                throw new RuntimeException('Berkas Excel laporan tidak dapat diselesaikan.');
            }

            return $workbookPath;
        } catch (\Throwable $throwable) {
            @unlink($workbookPath);
            throw $throwable;
        } finally {
            @unlink($worksheetPath);
        }
    }

    public static function contentType(): string
    {
        return self::CONTENT_TYPE;
    }

    /**
     * @param array{
     *     title: string,
     *     meta_lines?: list<string>,
     *     columns: list<array{header: string, width?: float, align?: string, type?: string}>,
     *     rows: list<list<mixed>>,
     *     summary_row?: array{label: string, label_span: int, totals: array<int, float|int>}|null
     * } $data
     */
    private function writeWorksheet(string $path, array $data): void
    {
        $writer = new XMLWriter;
        if (! $writer->openUri($path)) {
            throw new RuntimeException('Lembar kerja laporan tidak dapat ditulis.');
        }

        $columns = $data['columns'];
        $columnCount = count($columns);
        $lastColumnLetter = $this->columnLetter($columnCount);

        $writer->startDocument('1.0', 'UTF-8', 'yes');
        $writer->startElement('worksheet');
        $writer->writeAttribute('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $writer->writeAttribute('xmlns:r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships');

        // Freeze pane below header
        $headerRowIndex = 5;
        $writer->startElement('sheetViews');
        $writer->startElement('sheetView');
        $writer->writeAttribute('workbookViewId', '0');
        $writer->startElement('pane');
        $writer->writeAttribute('ySplit', (string) $headerRowIndex);
        $writer->writeAttribute('topLeftCell', 'A'.($headerRowIndex + 1));
        $writer->writeAttribute('activePane', 'bottomLeft');
        $writer->writeAttribute('state', 'frozen');
        $writer->endElement();
        $writer->endElement();
        $writer->endElement();

        $writer->startElement('sheetFormatPr');
        $writer->writeAttribute('defaultRowHeight', '18');
        $writer->endElement();

        // Columns definition
        $writer->startElement('cols');
        foreach ($columns as $index => $col) {
            $colNum = $index + 1;
            $width = $col['width'] ?? 16;
            $writer->startElement('col');
            $writer->writeAttribute('min', (string) $colNum);
            $writer->writeAttribute('max', (string) $colNum);
            $writer->writeAttribute('width', (string) $width);
            $writer->writeAttribute('customWidth', '1');
            $writer->endElement();
        }
        $writer->endElement();

        $writer->startElement('sheetData');

        // Row 1: Title
        $company = $this->documentSettings->get('company_name');
        $this->writeTextRow($writer, 1, [
            'A' => strtoupper($company).' — '.strtoupper($data['title']),
        ], 1, 28);

        // Row 2-3: Meta lines
        $metaLines = $data['meta_lines'] ?? [];
        $metaRowIndex = 2;
        foreach (array_slice($metaLines, 0, 2) as $meta) {
            $this->writeTextRow($writer, $metaRowIndex, ['A' => $meta], 2, 20);
            $metaRowIndex++;
        }
        if (count($metaLines) < 2) {
            $this->writeTextRow($writer, 3, [
                'A' => 'Diekspor pada: '.now()->timezone('Asia/Jakarta')->format('d-m-Y H:i').' WIB',
            ], 2, 20);
        }

        // Row 5: Table Header Row
        $writer->startElement('row');
        $writer->writeAttribute('r', (string) $headerRowIndex);
        $writer->writeAttribute('ht', '26');
        $writer->writeAttribute('customHeight', '1');
        foreach ($columns as $cIdx => $col) {
            $cellRef = $this->columnLetter($cIdx + 1).$headerRowIndex;
            $this->writeTextCell($writer, $cellRef, $col['header'], 3);
        }
        $writer->endElement();

        // Data Rows
        $currentRow = 6;
        $mergeReferences = [
            'A1:'.$lastColumnLetter.'1',
            'A2:'.$lastColumnLetter.'2',
            'A3:'.$lastColumnLetter.'3',
        ];

        if (empty($data['rows'])) {
            $this->writeTextRow($writer, $currentRow, [
                'A' => 'Tidak ada data laporan yang sesuai dengan kriteria filter saat ini.',
            ], 4, 28);
            $mergeReferences[] = 'A'.$currentRow.':'.$lastColumnLetter.$currentRow;
            $currentRow++;
        } else {
            foreach ($data['rows'] as $rowValues) {
                $writer->startElement('row');
                $writer->writeAttribute('r', (string) $currentRow);
                $writer->writeAttribute('ht', '22');
                $writer->writeAttribute('customHeight', '1');

                foreach ($columns as $cIdx => $col) {
                    $cellRef = $this->columnLetter($cIdx + 1).$currentRow;
                    $val = $rowValues[$cIdx] ?? null;
                    $type = $col['type'] ?? 'text';
                    $align = $col['align'] ?? ($type === 'currency' || $type === 'number' ? 'right' : 'left');

                    if ($val === null || $val === '') {
                        $this->writeTextCell($writer, $cellRef, '-', 4);
                    } elseif ($type === 'currency') {
                        $this->writeNumberCell($writer, $cellRef, (float) $val, 6);
                    } elseif ($type === 'number') {
                        $this->writeNumberCell($writer, $cellRef, is_numeric($val) ? $val + 0 : 0, 5);
                    } else {
                        $this->writeTextCell($writer, $cellRef, (string) $val, $align === 'center' ? 1 : 4);
                    }
                }

                $writer->endElement();
                $currentRow++;
            }
        }

        // Summary Row if provided
        if (! empty($data['summary_row'])) {
            $summary = $data['summary_row'];
            $summaryRowIndex = $currentRow + 1;
            $writer->startElement('row');
            $writer->writeAttribute('r', (string) $summaryRowIndex);
            $writer->writeAttribute('ht', '24');
            $writer->writeAttribute('customHeight', '1');

            $labelSpan = max(1, min($columnCount - 1, $summary['label_span'] ?? 1));
            $this->writeTextCell($writer, 'A'.$summaryRowIndex, $summary['label'], 7);

            for ($colIdx = 0; $colIdx < $columnCount; $colIdx++) {
                if ($colIdx < $labelSpan) {
                    continue;
                }
                $cellRef = $this->columnLetter($colIdx + 1).$summaryRowIndex;
                $tot = $summary['totals'][$colIdx] ?? null;

                if ($tot !== null) {
                    $this->writeNumberCell($writer, $cellRef, (float) $tot, 8);
                } else {
                    $this->writeTextCell($writer, $cellRef, '', 7);
                }
            }

            $writer->endElement();

            if ($labelSpan > 1) {
                $mergeReferences[] = 'A'.$summaryRowIndex.':'.$this->columnLetter($labelSpan).$summaryRowIndex;
            }
            $currentRow = $summaryRowIndex;
        }

        $writer->endElement(); // sheetData

        // AutoFilter
        $writer->startElement('autoFilter');
        $writer->writeAttribute('ref', 'A'.$headerRowIndex.':'.$lastColumnLetter.max($headerRowIndex, $currentRow));
        $writer->endElement();

        // Merged Cells
        if (! empty($mergeReferences)) {
            $writer->startElement('mergeCells');
            $writer->writeAttribute('count', (string) count($mergeReferences));
            foreach ($mergeReferences as $reference) {
                $writer->startElement('mergeCell');
                $writer->writeAttribute('ref', $reference);
                $writer->endElement();
            }
            $writer->endElement();
        }

        $writer->endElement(); // worksheet
        $writer->endDocument();
    }

    private function writeTextRow(
        XMLWriter $writer,
        int $rowNumber,
        array $values,
        int $style,
        int $height
    ): void {
        $writer->startElement('row');
        $writer->writeAttribute('r', (string) $rowNumber);
        $writer->writeAttribute('ht', (string) $height);
        $writer->writeAttribute('customHeight', '1');
        foreach ($values as $column => $value) {
            $this->writeTextCell($writer, $column.$rowNumber, (string) $value, $style);
        }
        $writer->endElement();
    }

    private function writeTextCell(XMLWriter $writer, string $reference, string $value, int $style): void
    {
        $writer->startElement('c');
        $writer->writeAttribute('r', $reference);
        $writer->writeAttribute('s', (string) $style);
        $writer->writeAttribute('t', 'inlineStr');
        $writer->startElement('is');
        $writer->startElement('t');
        $writer->writeAttribute('xml:space', 'preserve');
        $writer->text($value);
        $writer->endElement();
        $writer->endElement();
        $writer->endElement();
    }

    private function writeNumberCell(XMLWriter $writer, string $reference, int|float $value, int $style): void
    {
        $writer->startElement('c');
        $writer->writeAttribute('r', $reference);
        $writer->writeAttribute('s', (string) $style);
        $writer->writeElement('v', (string) $value);
        $writer->endElement();
    }

    private function columnLetter(int $column): string
    {
        $letter = '';
        while ($column > 0) {
            $column--;
            $letter = chr(65 + ($column % 26)).$letter;
            $column = intdiv($column, 26);
        }

        return $letter;
    }

    private function temporaryPath(string $prefix): string
    {
        $path = tempnam(sys_get_temp_dir(), $prefix);
        if ($path === false) {
            throw new RuntimeException('Lokasi sementara untuk berkas Excel tidak tersedia.');
        }

        return $path;
    }

    private function contentTypesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>
XML;
    }

    private function rootRelationshipsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>
XML;
    }

    private function applicationPropertiesXml(string $sheetName): string
    {
        $sheetEscaped = $this->xml($sheetName);

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>PT Samudra Jaya Andalas</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>{$sheetEscaped}</vt:lpstr></vt:vector></TitlesOfParts><Company>PT Samudra Jaya Andalas</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>
XML;
    }

    private function corePropertiesXml(string $title): string
    {
        $companyName = $this->xml($this->documentSettings->get('company_name'));
        $titleEscaped = $this->xml($title);
        $timestamp = now()->utc()->format('Y-m-d\TH:i:s\Z');

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>{$companyName}</dc:creator><cp:lastModifiedBy>{$companyName}</cp:lastModifiedBy><dc:title>{$titleEscaped}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">{$timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{$timestamp}</dcterms:modified></cp:coreProperties>
XML;
    }

    private function workbookXml(string $sheetName): string
    {
        $sheetEscaped = $this->xml($sheetName);

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets><sheet name="{$sheetEscaped}" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>
XML;
    }

    private function workbookRelationshipsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>
XML;
    }

    private function stylesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;Rp&quot; #,##0"/></numFmts><fonts count="3"><font><sz val="11"/><color rgb="FF0B1F63"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF0B1F63"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF082870"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0F0FF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFDCEAF8"/></left><right style="thin"><color rgb="FFDCEAF8"/></right><top style="thin"><color rgb="FFDCEAF8"/></top><bottom style="thin"><color rgb="FFDCEAF8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>
XML;
    }

    private function xml(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
