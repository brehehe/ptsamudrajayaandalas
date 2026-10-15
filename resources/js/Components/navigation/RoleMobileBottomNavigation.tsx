import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Banknote,
    Check,
    ClipboardCheck,
    ClipboardList,
    FileSpreadsheet,
    FileText,
    HandCoins,
    Home,
    Plus,
    Ship,
    TrendingUp,
    UserRound,
    WalletCards,
    type LucideIcon,
} from 'lucide-react';
import React from 'react';
import Modal from '../overlays/Modal';
import { REPORT_SECTIONS, type ReportSectionKey } from '../../lib/reportNavigation';

type NavigationRole = 'operasional' | 'admin' | 'direktur' | 'owner';

interface NavigationItem {
    label: string;
    href: string;
    icon: LucideIcon;
    activePaths: string[];
    isPrimary?: boolean;
    opensReportMenu?: boolean;
}

const reportIconByKey: Record<ReportSectionKey, LucideIcon> = {
    ringkasan_margin: FileSpreadsheet,
    invoice: FileText,
    piutang: HandCoins,
    pengeluaran: Banknote,
    aktivitas: ClipboardList,
    laba_rugi: TrendingUp,
    keuangan_kas: WalletCards,
    operasional: Ship,
};

const navigationByRole: Record<NavigationRole, NavigationItem[]> = {
    operasional: [
        { label: 'Beranda', href: '/dashboard', icon: Home, activePaths: ['/dashboard', '/'] },
        // { label: 'Kapal', href: '/vessels', icon: Ship, activePaths: ['/vessels', '/work-orders'] },
        { label: 'Kapal', href: '/vessels', icon: Ship, activePaths: ['/vessels'] },
        { label: 'Aktivitas', href: '/operations', icon: Activity, activePaths: ['/operations'], isPrimary: true },
        { label: 'Pengajuan', href: '/requests', icon: ClipboardList, activePaths: ['/requests', '/needs'] },
        { label: 'Profil', href: '/profile', icon: UserRound, activePaths: ['/profile'] },
    ],
    admin: [
        { label: 'Beranda', href: '/dashboard', icon: Home, activePaths: ['/dashboard', '/'] },
        { label: 'SPK', href: '/work-orders', icon: FileText, activePaths: ['/work-orders'] },
        { label: 'Aktivitas', href: '/operations', icon: Activity, activePaths: ['/operations'], isPrimary: true },
        { label: 'Kebutuhan', href: '/requests', icon: ClipboardList, activePaths: ['/requests', '/needs'] },
        { label: 'Profil', href: '/profile', icon: UserRound, activePaths: ['/profile'] },
    ],
    direktur: [
        { label: 'Beranda', href: '/dashboard', icon: Home, activePaths: ['/dashboard', '/'] },
        { label: 'Approval', href: '/approvals', icon: ClipboardCheck, activePaths: ['/approvals'] },
        // { label: 'Kapal', href: '/vessels', icon: Ship, activePaths: ['/vessels', '/work-orders'] },
        { label: 'Kapal', href: '/vessels', icon: Ship, activePaths: ['/vessels'] },
        { label: 'Piutang', href: '/receivables', icon: HandCoins, activePaths: ['/receivables', '/invoices'] },
        { label: 'Profil', href: '/profile', icon: UserRound, activePaths: ['/profile'] },
    ],
    owner: [
        { label: 'Beranda', href: '/dashboard', icon: Home, activePaths: ['/dashboard', '/'] },
        // { label: 'Kapal', href: '/vessels', icon: Ship, activePaths: ['/vessels', '/work-orders'] },
        { label: 'Kapal', href: '/vessels', icon: Ship, activePaths: ['/vessels'] },
        { label: 'Laporan', href: '/reports/margin', icon: TrendingUp, activePaths: ['/reports'], opensReportMenu: true },
        { label: 'Piutang', href: '/receivables', icon: HandCoins, activePaths: ['/receivables', '/invoices'] },
        { label: 'Profil', href: '/profile', icon: UserRound, activePaths: ['/profile'] },
    ],
};

const resolveRole = (user: any): NavigationRole => {
    const primaryRole = String(user?.primary_role || user?.roles?.[0] || '').toLowerCase();

    if (primaryRole.includes('owner')) {
        return 'owner';
    }

    if (primaryRole.includes('direktur')) {
        return 'direktur';
    }

    if (primaryRole.includes('lapangan') || primaryRole.includes('operasional') || primaryRole === 'staff') {
        return 'operasional';
    }

    return 'admin';
};

const isItemActive = (url: string, item: NavigationItem): boolean =>
    item.activePaths.some((path) => {
        if (path === '/') {
            return url === '/';
        }

        return url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`);
    });

export const RoleMobileBottomNavigation: React.FC = () => {
    const page = usePage();
    const user = (page.props as any).auth?.user;
    const role = resolveRole(user);
    const navigationItems = navigationByRole[role];
    const [isReportMenuOpen, setIsReportMenuOpen] = React.useState(false);
    const currentPath = page.url.split('?')[0];
    const legacyReportTab = new URLSearchParams(page.url.split('?')[1] ?? '').get('tab');
    const legacyReportSection = REPORT_SECTIONS.find((section) => section.key === legacyReportTab)
        ?? REPORT_SECTIONS[0];

    return (
        <>
            <nav
                aria-label="Navigasi utama mobile"
                className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-[#DCEAF8] bg-white/95 px-2 pt-1 shadow-[0_-4px_20px_rgba(8,40,112,0.08)] backdrop-blur-md transition-colors duration-200 motion-reduce:transition-none md:hidden dark:border-[#1E3A5F] dark:bg-[#0C1D36]/95 dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
                style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
            >
                {navigationItems.map((item) => {
                    const active = isItemActive(page.url, item);
                    const Icon = item.icon;

                    if (item.isPrimary) {
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                prefetch
                                aria-label="Catat aktivitas lapangan"
                                aria-current={active ? 'page' : undefined}
                                className="group relative -mt-4 flex min-h-11 flex-1 touch-manipulation flex-col items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-inset"
                            >
                                <span className={`flex size-11 items-center justify-center rounded-full border-[3px] border-white bg-[#0060F4] text-white shadow-md transition-[transform,background-color,box-shadow,border-color] hover:bg-[#082870] active:scale-95 motion-reduce:transition-none dark:border-[#0C1D36] ${active ? 'ring-2 ring-[#19B5F7]' : ''}`}>
                                    <Plus aria-hidden="true" className="size-6" strokeWidth={3} />
                                </span>
                                <span className={`mt-0.5 text-[10.5px] font-bold ${active ? 'text-[#0060F4] dark:text-[#38BDF8]' : 'text-[#52658E] dark:text-[#94A3B8]'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    }

                    if (item.opensReportMenu) {
                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => setIsReportMenuOpen(true)}
                                aria-haspopup="dialog"
                                aria-expanded={isReportMenuOpen}
                                aria-current={active ? 'page' : undefined}
                                className={`relative flex min-h-11 flex-1 touch-manipulation flex-col items-center justify-center rounded-lg py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-inset ${active ? 'text-[#0060F4] dark:text-[#38BDF8]' : 'text-[#52658E] hover:text-[#0060F4] dark:text-[#94A3B8]'}`}
                            >
                                <Icon aria-hidden="true" className="size-5" />
                                <span className={`mt-0.5 text-[10.5px] font-medium ${active ? 'font-bold text-[#0060F4] dark:text-[#38BDF8]' : ''}`}>
                                    {item.label}
                                </span>
                                {active && <span className="absolute -bottom-0.5 h-0.5 w-3.5 rounded-full bg-[#0060F4] dark:bg-[#38BDF8]" />}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            prefetch
                            aria-current={active ? 'page' : undefined}
                            className={`relative flex min-h-11 flex-1 touch-manipulation flex-col items-center justify-center rounded-lg py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-inset ${active ? 'text-[#0060F4] dark:text-[#38BDF8]' : 'text-[#52658E] hover:text-[#0060F4] dark:text-[#94A3B8]'}`}
                        >
                            <Icon aria-hidden="true" className="size-5" />
                            <span className={`mt-0.5 text-[10.5px] font-medium ${active ? 'font-bold text-[#0060F4] dark:text-[#38BDF8]' : ''}`}>
                                {item.label}
                            </span>
                            {active && <span className="absolute -bottom-0.5 h-0.5 w-3.5 rounded-full bg-[#0060F4] dark:bg-[#38BDF8]" />}
                        </Link>
                    );
                })}
            </nav>

            <Modal
                isOpen={isReportMenuOpen}
                onClose={() => setIsReportMenuOpen(false)}
                title="Pilih laporan"
                subtitle="Buka laporan sesuai informasi yang ingin ditinjau."
                size="sm"
            >
                <nav aria-label="Menu laporan" className="grid grid-cols-2 gap-2">
                    {REPORT_SECTIONS.map((section) => {
                        const ReportIcon = reportIconByKey[section.key];
                        const sectionIsActive = currentPath === section.href
                            || (currentPath === '/reports' && section.key === legacyReportSection.key);

                        return (
                            <Link
                                key={section.key}
                                href={route(section.routeName)}
                                prefetch
                                onClick={() => setIsReportMenuOpen(false)}
                                aria-current={sectionIsActive ? 'page' : undefined}
                                className={`relative flex min-h-20 touch-manipulation flex-col justify-between rounded-xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0C1D36] ${
                                    sectionIsActive
                                        ? 'border-[#0060F4] bg-[#EAF4FF] text-[#0051CE] dark:border-[#38BDF8] dark:bg-[#132847] dark:text-[#7DD3FC]'
                                        : 'border-[#DCEAF8] bg-white text-[#52658E] hover:border-[#A9D2FF] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#B5C8DC] dark:hover:bg-[#132847]'
                                }`}
                            >
                                <span className="flex items-start justify-between gap-2">
                                    <span className={`flex size-8 items-center justify-center rounded-lg ${sectionIsActive ? 'bg-[#0060F4] text-white dark:bg-[#087CC1]' : 'bg-[#EAF4FF] text-[#0060F4] dark:bg-[#1E3A5F] dark:text-[#7DD3FC]'}`}>
                                        <ReportIcon aria-hidden="true" className="size-4" />
                                    </span>
                                    {sectionIsActive && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
                                </span>
                                <span className="mt-2 text-xs font-extrabold leading-4">{section.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </Modal>
        </>
    );
};
