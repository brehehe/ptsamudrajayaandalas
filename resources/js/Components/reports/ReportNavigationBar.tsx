import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Activity,
    Banknote,
    ClipboardCheck,
    FileSpreadsheet,
    FileText,
    HandCoins,
    Ship,
    type LucideIcon,
} from 'lucide-react';
import { REPORT_SECTIONS, type ReportSectionKey } from '../../lib/reportNavigation';

const iconBySectionKey: Record<string, LucideIcon> = {
    ringkasan_margin: FileSpreadsheet,
    pengajuan: ClipboardCheck,
    invoice: FileText,
    piutang: HandCoins,
    pengeluaran: Banknote,
    summary_vessel: Ship,
    pengeluaran_kapal: Ship,
    aktivitas: Activity,
};

interface ReportNavigationBarProps {
    activeKey: ReportSectionKey | string;
    className?: string;
}

export const ReportNavigationBar: React.FC<ReportNavigationBarProps> = ({
    activeKey,
    className = '',
}) => {
    return (
        <nav
            aria-label="Kategori laporan"
            className={`flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
        >
            {REPORT_SECTIONS.map((section) => {
                const isActive = activeKey === section.key;
                const Icon = iconBySectionKey[section.key] || FileText;

                return (
                    <Link
                        key={section.key}
                        href={route(section.routeName)}
                        prefetch
                        aria-current={isActive ? 'page' : undefined}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] ${
                            isActive
                                ? 'bg-[#0060F4] text-white shadow-sm ring-1 ring-[#0060F4]'
                                : 'border border-[#DCEAF8] bg-white text-[#52658E] hover:border-[#A9D2FF] hover:bg-[#F0F8FF] hover:text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#94A3B8] dark:hover:bg-[#132847] dark:hover:text-[#38BDF8]'
                        }`}
                    >
                        <Icon
                            aria-hidden="true"
                            className={`size-3.5 ${isActive ? 'text-white' : 'text-[#0060F4] dark:text-[#38BDF8]'}`}
                        />
                        <span>{section.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

export default ReportNavigationBar;
