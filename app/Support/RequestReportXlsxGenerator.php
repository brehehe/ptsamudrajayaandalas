<?php

namespace App\Support;

use App\Models\RequestItem;
use App\Models\ShipRequest;
use RuntimeException;
use XMLWriter;
use ZipArchive;

final class RequestReportXlsxGenerator
{
    private const CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    public function __construct(private InvoiceDocumentSettings $documentSettings) {}

    /**
     * @param  iterable<int, ShipRequest>  $requests
     * @param  array{from: string, to: string, search: string, status: string}  $filters
     */
    public function generate(iterable $requests, array $filters): string
    {
        $workbookPath = $this->temporaryPath('sja-request-report-');
        $worksheetPath = $this->temporaryPath('sja-request-sheet-');

        try {
            $this->writeWorksheet($worksheetPath, $requests, $filters);

            $archive = new ZipArchive;
            $openResult = $archive->open($workbookPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

            if ($openResult !== true) {
                throw new RuntimeException('Berkas Excel laporan pengajuan tidak dapat dibuat.');
            }

            $this->addEntry($archive, '[Content_Types].xml', $this->contentTypesXml());
            $this->addEntry($archive, '_rels/.rels', $this->rootRelationshipsXml());
            $this->addEntry($archive, 'docProps/app.xml', $this->applicationPropertiesXml());
            $this->addEntry($archive, 'docProps/core.xml', $this->corePropertiesXml());
            $this->addEntry($archive, 'xl/workbook.xml', $this->workbookXml());
            $this->addEntry($archive, 'xl/_rels/workbook.xml.rels', $this->workbookRelationshipsXml());
            $this->addEntry($archive, 'xl/styles.xml', $this->stylesXml());

            if (! $archive->addFile($worksheetPath, 'xl/worksheets/sheet1.xml')) {
                $archive->close();

                throw new RuntimeException('Lembar kerja laporan pengajuan tidak dapat ditambahkan.');
            }

            if (! $archive->close()) {
                throw new RuntimeException('Berkas Excel laporan pengajuan tidak dapat diselesaikan.');
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
     * @param  iterable<int, ShipRequest>  $requests
     * @param  array{from: string, to: string, search: string, status: string}  $filters
     */
    private function writeWorksheet(string $path, iterable $requests, array $filters): void
    {
        $writer = new XMLWriter;

        if (! $writer->openUri($path)) {
            throw new RuntimeException('Lembar kerja laporan pengajuan tidak dapat ditulis.');
        }

        $writer->startDocument('1.0', 'UTF-8', 'yes');
        $writer->startElement('worksheet');
        $writer->writeAttribute('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $writer->writeAttribute('xmlns:r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships');

        $writer->startElement('sheetViews');
        $writer->startElement('sheetView');
        $writer->writeAttribute('workbookViewId', '0');
        $writer->startElement('pane');
        $writer->writeAttribute('ySplit', '5');
        $writer->writeAttribute('topLeftCell', 'A6');
        $writer->writeAttribute('activePane', 'bottomLeft');
        $writer->writeAttribute('state', 'frozen');
        $writer->endElement();
        $writer->endElement();
        $writer->endElement();

        $writer->startElement('sheetFormatPr');
        $writer->writeAttribute('defaultRowHeight', '18');
        $writer->endElement();

        $this->writeColumns($writer);

        $writer->startElement('sheetData');
        $this->writeTextRow($writer, 1, [
            'A' => $this->documentSettings->get('company_name').' — LAPORAN PENGAJUAN',
        ], 1, 28);
        $this->writeTextRow($writer, 2, [
            'A' => sprintf(
                'Periode %s s.d. %s | Status: %s',
                $filters['from'],
                $filters['to'],
                $filters['status'] === 'all' ? 'Semua status' : $filters['status'],
            ),
        ], 2, 20);
        $this->writeTextRow($writer, 3, [
            'A' => $filters['search'] !== ''
                ? 'Pencarian: '.$filters['search'].' | Diekspor '.now()->format('d-m-Y H:i').' WIB'
                : 'Diekspor '.now()->format('d-m-Y H:i').' WIB',
        ], 2, 20);

        $headers = [
            'No.',
            'Tanggal',
            'No. Pengajuan',
            'No. Batch',
            'No. Job',
            'Kapal',
            'Klien',
            'Pelabuhan',
            'Jenis Pengajuan',
            'Rincian Item',
            'Status',
            'Diajukan Oleh',
            'Jumlah Item',
            'Item Disetujui',
            'Total HPP',
            'Catatan Pengajuan',
            'Catatan Penerusan',
        ];
        $this->writeHeaderRow($writer, 5, $headers);

        $rowNumber = 6;
        $sequence = 1;
        $totalHpp = 0.0;

        foreach ($requests as $shipRequest) {
            $requestTotal = (float) $shipRequest->items->sum(
                fn (RequestItem $item): float => (float) $item->quantity * (float) $item->hpp_price,
            );
            $totalHpp += $requestTotal;

            $writer->startElement('row');
            $writer->writeAttribute('r', (string) $rowNumber);
            $writer->writeAttribute('ht', '36');
            $writer->writeAttribute('customHeight', '1');
            $this->writeNumberCell($writer, 'A'.$rowNumber, $sequence, 5);
            $this->writeTextCell($writer, 'B'.$rowNumber, $shipRequest->request_date?->toDateString() ?? '-', 4);
            $this->writeTextCell($writer, 'C'.$rowNumber, $shipRequest->request_number, 4);
            $this->writeTextCell($writer, 'D'.$rowNumber, $shipRequest->batch_number ?: '-', 4);
            $this->writeTextCell($writer, 'E'.$rowNumber, $shipRequest->portCall?->job_number ?? '-', 4);
            $this->writeTextCell($writer, 'F'.$rowNumber, $shipRequest->ship?->name ?? '-', 4);
            $this->writeTextCell($writer, 'G'.$rowNumber, $shipRequest->company?->name ?? '-', 4);
            $this->writeTextCell($writer, 'H'.$rowNumber, $shipRequest->port?->name ?? '-', 4);
            $this->writeTextCell($writer, 'I'.$rowNumber, $this->serviceTypeLabel($shipRequest->service_type), 4);
            $this->writeTextCell(
                $writer,
                'J'.$rowNumber,
                $shipRequest->items->pluck('item_name')->filter()->join("\n") ?: '-',
                4,
            );
            $this->writeTextCell($writer, 'K'.$rowNumber, $shipRequest->status, 4);
            $this->writeTextCell($writer, 'L'.$rowNumber, $shipRequest->creator?->name ?? '-', 4);
            $this->writeNumberCell($writer, 'M'.$rowNumber, $shipRequest->items->count(), 5);
            $this->writeNumberCell(
                $writer,
                'N'.$rowNumber,
                $shipRequest->items->where('director_status', 'approved')->count(),
                5,
            );
            $this->writeNumberCell($writer, 'O'.$rowNumber, $requestTotal, 6);
            $this->writeTextCell($writer, 'P'.$rowNumber, $shipRequest->notes ?: '-', 4);
            $this->writeTextCell($writer, 'Q'.$rowNumber, $shipRequest->admin_forward_notes ?: '-', 4);
            $writer->endElement();

            $rowNumber++;
            $sequence++;
        }

        $mergeReferences = ['A1:Q1', 'A2:Q2', 'A3:Q3'];

        if ($sequence === 1) {
            $this->writeTextRow($writer, 6, [
                'A' => 'Tidak ada pengajuan yang sesuai dengan periode dan filter.',
            ], 4, 28);
            $mergeReferences[] = 'A6:Q6';
            $rowNumber = 7;
        }

        $summaryRow = $rowNumber + 1;
        $writer->startElement('row');
        $writer->writeAttribute('r', (string) $summaryRow);
        $writer->writeAttribute('ht', '24');
        $writer->writeAttribute('customHeight', '1');
        $this->writeTextCell($writer, 'A'.$summaryRow, 'TOTAL HPP', 7);
        $this->writeNumberCell($writer, 'O'.$summaryRow, $totalHpp, 8);
        $writer->endElement();
        $writer->endElement();

        $writer->startElement('autoFilter');
        $writer->writeAttribute('ref', 'A5:Q'.max(5, $rowNumber - 1));
        $writer->endElement();

        $mergeReferences[] = 'A'.$summaryRow.':N'.$summaryRow;
        $mergeReferences[] = 'O'.$summaryRow.':Q'.$summaryRow;
        $writer->startElement('mergeCells');
        $writer->writeAttribute('count', (string) count($mergeReferences));
        foreach ($mergeReferences as $reference) {
            $writer->startElement('mergeCell');
            $writer->writeAttribute('ref', $reference);
            $writer->endElement();
        }
        $writer->endElement();

        $writer->startElement('pageMargins');
        $writer->writeAttribute('left', '0.25');
        $writer->writeAttribute('right', '0.25');
        $writer->writeAttribute('top', '0.5');
        $writer->writeAttribute('bottom', '0.5');
        $writer->writeAttribute('header', '0.2');
        $writer->writeAttribute('footer', '0.2');
        $writer->endElement();
        $writer->startElement('pageSetup');
        $writer->writeAttribute('orientation', 'landscape');
        $writer->writeAttribute('paperSize', '9');
        $writer->writeAttribute('fitToWidth', '1');
        $writer->writeAttribute('fitToHeight', '0');
        $writer->endElement();
        $writer->endElement();
        $writer->endDocument();
        $writer->flush();
    }

    private function writeColumns(XMLWriter $writer): void
    {
        $widths = [7, 13, 24, 24, 24, 24, 28, 24, 21, 38, 25, 22, 13, 15, 18, 38, 38];

        $writer->startElement('cols');
        foreach ($widths as $index => $width) {
            $column = $index + 1;
            $writer->startElement('col');
            $writer->writeAttribute('min', (string) $column);
            $writer->writeAttribute('max', (string) $column);
            $writer->writeAttribute('width', (string) $width);
            $writer->writeAttribute('customWidth', '1');
            $writer->endElement();
        }
        $writer->endElement();
    }

    /** @param list<string> $headers */
    private function writeHeaderRow(XMLWriter $writer, int $rowNumber, array $headers): void
    {
        $writer->startElement('row');
        $writer->writeAttribute('r', (string) $rowNumber);
        $writer->writeAttribute('ht', '32');
        $writer->writeAttribute('customHeight', '1');

        foreach ($headers as $index => $header) {
            $this->writeTextCell($writer, $this->columnLetter($index + 1).$rowNumber, $header, 3);
        }

        $writer->endElement();
    }

    /** @param array<string, string> $values */
    private function writeTextRow(
        XMLWriter $writer,
        int $rowNumber,
        array $values,
        int $style,
        int $height,
    ): void {
        $writer->startElement('row');
        $writer->writeAttribute('r', (string) $rowNumber);
        $writer->writeAttribute('ht', (string) $height);
        $writer->writeAttribute('customHeight', '1');
        foreach ($values as $column => $value) {
            $this->writeTextCell($writer, $column.$rowNumber, $value, $style);
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

    private function serviceTypeLabel(?string $serviceType): string
    {
        return match ($serviceType) {
            'clearance_in' => 'Clearance In',
            'clearance_out' => 'Clearance Out',
            default => $serviceType ?: 'Kebutuhan Kapal',
        };
    }

    private function temporaryPath(string $prefix): string
    {
        $path = tempnam(sys_get_temp_dir(), $prefix);

        if ($path === false) {
            throw new RuntimeException('Lokasi sementara untuk laporan pengajuan tidak tersedia.');
        }

        return $path;
    }

    private function addEntry(ZipArchive $archive, string $path, string $contents): void
    {
        if (! $archive->addFromString($path, $contents)) {
            $archive->close();

            throw new RuntimeException('Komponen berkas Excel laporan pengajuan tidak dapat ditambahkan.');
        }
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

    private function applicationPropertiesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>PT Samudra Jaya Andalas</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Laporan Pengajuan</vt:lpstr></vt:vector></TitlesOfParts><Company>PT Samudra Jaya Andalas</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>
XML;
    }

    private function corePropertiesXml(): string
    {
        $companyName = $this->xml($this->documentSettings->get('company_name'));
        $timestamp = now()->utc()->format('Y-m-d\TH:i:s\Z');

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>{$companyName}</dc:creator><cp:lastModifiedBy>{$companyName}</cp:lastModifiedBy><dc:title>Laporan Pengajuan</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">{$timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{$timestamp}</dcterms:modified></cp:coreProperties>
XML;
    }

    private function workbookXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets><sheet name="Laporan Pengajuan" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>
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
