import React, { useMemo } from 'react';
import { FileText, FileSpreadsheet, Printer, Download } from 'lucide-react';
import ActionMenu, { type ActionMenuGroup } from '../ui/ActionMenu';

export interface ReportActionMenuProps {
    onExportPdf?: () => void;
    onExportXlsx?: () => void;
    onPrint?: () => void;
    label?: string;
    buttonLabel?: string;
    buttonVariant?: 'primary' | 'outline' | 'secondary';
    className?: string;
    additionalGroups?: ActionMenuGroup[];
}

export default function ReportActionMenu({
    onExportPdf,
    onExportXlsx,
    onPrint,
    label = 'Aksi Laporan',
    buttonLabel = 'Aksi Laporan',
    buttonVariant = 'outline',
    className = '',
    additionalGroups = [],
}: ReportActionMenuProps) {
    const groups = useMemo<ActionMenuGroup[]>(() => {
        const itemGroups: ActionMenuGroup[] = [];

        const exportItems = [];
        if (onExportPdf) {
            exportItems.push({
                id: 'export-pdf',
                label: 'Unduh Dokumen PDF (.pdf)',
                icon: <FileText aria-hidden="true" className="size-4 text-[#0060F4] dark:text-[#60A5FA]" />,
                tone: 'primary' as const,
                onSelect: onExportPdf,
            });
        }
        if (onExportXlsx) {
            exportItems.push({
                id: 'export-xlsx',
                label: 'Unduh Berkas Excel (.xlsx)',
                icon: <FileSpreadsheet aria-hidden="true" className="size-4 text-[#087443] dark:text-emerald-400" />,
                tone: 'success' as const,
                onSelect: onExportXlsx,
            });
        }

        if (exportItems.length > 0) {
            itemGroups.push({
                id: 'export-group',
                label: 'Unduh Berkas Laporan',
                items: exportItems,
            });
        }

        if (onPrint) {
            itemGroups.push({
                id: 'print-group',
                label: 'Cetak Dokumen',
                items: [
                    {
                        id: 'print-page',
                        label: 'Cetak Halaman (Print / PDF)',
                        icon: <Printer aria-hidden="true" className="size-4 text-[#52658E] dark:text-[#94A3B8]" />,
                        tone: 'default' as const,
                        onSelect: onPrint,
                    },
                ],
            });
        }

        if (additionalGroups.length > 0) {
            itemGroups.push(...additionalGroups);
        }

        return itemGroups;
    }, [onExportPdf, onExportXlsx, onPrint, additionalGroups]);

    return (
        <ActionMenu
            label={label}
            buttonLabel={buttonLabel}
            buttonIcon={<Download aria-hidden="true" className="size-4 text-[#0060F4] dark:text-[#60A5FA]" />}
            buttonVariant={buttonVariant}
            groups={groups}
            className={className}
        />
    );
}
