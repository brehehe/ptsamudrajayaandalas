import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import Logo from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';

interface SidebarProps {
    pendingRequestsCount?: number;
    pendingApprovalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
    pendingRequestsCount = 14,
    pendingApprovalsCount = 5,
}) => {
    const { url } = usePage();

    const mainNav = [
        {
            label: 'Beranda',
            href: '/dashboard',
            active: url === '/dashboard' || url === '/',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            label: 'Kapal',
            href: '/vessels',
            active: url.startsWith('/vessels'),
            hasChevron: true,
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
            ),
        },
        {
            label: 'Kebutuhan',
            href: '/needs',
            active: url.startsWith('/needs'),
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
        },
        {
            label: 'Pengajuan',
            href: '/requests',
            active: url.startsWith('/requests'),
            badge: pendingRequestsCount,
            badgeColor: 'bg-[#C62840]',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            label: 'Approval',
            href: '/approvals',
            active: url.startsWith('/approvals'),
            badge: pendingApprovalsCount,
            badgeColor: 'bg-[#C62840]',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: 'Operasional',
            href: '/operations',
            active: url.startsWith('/operations'),
            hasChevron: true,
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
            ),
        },
        {
            label: 'Pengeluaran',
            href: '/expenses',
            active: url.startsWith('/expenses'),
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: 'Invoice & Tagihan',
            href: '/invoices',
            active: url.startsWith('/invoices'),
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
            ),
        },
        {
            label: 'Piutang',
            href: '/receivables',
            active: url.startsWith('/receivables'),
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            label: 'Laporan',
            href: '/reports',
            active: url.startsWith('/reports'),
            hasChevron: true,
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
        },
    ];

    const masterNav = [
        {
            label: 'Data Kapal',
            href: '/vessels',
            active: url.startsWith('/vessels'),
            icon: (
                <svg className="w-3.5 h-3.5 text-[#688CAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
            ),
        },
        {
            label: 'Data Produk & Layanan',
            href: '/master/products',
            active: url.startsWith('/master/products'),
            icon: (
                <svg className="w-3.5 h-3.5 text-[#688CAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            ),
        },
        {
            label: 'Data Perusahaan',
            href: '/master/companies',
            active: url.startsWith('/master/companies'),
            icon: (
                <svg className="w-3.5 h-3.5 text-[#688CAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
        },
        {
            label: 'Data Pelabuhan',
            href: '/master/ports',
            active: url.startsWith('/master/ports'),
            icon: (
                <svg className="w-3.5 h-3.5 text-[#688CAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            label: 'Data Vendor',
            href: '/master/vendors',
            active: url.startsWith('/master/vendors'),
            icon: (
                <svg className="w-3.5 h-3.5 text-[#688CAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
            ),
        },
        {
            label: 'Data Role SJA',
            href: '/master/roles',
            active: url.startsWith('/master/roles'),
            icon: (
                <svg className="w-3.5 h-3.5 text-[#688CAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            ),
        },
        {
            label: 'Manajemen User',
            href: '/master/users',
            active: url.startsWith('/master/users'),
            icon: (
                <svg className="w-3.5 h-3.5 text-[#688CAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
        },
    ];

    return (
        <aside className="w-full bg-[#0D2945] text-[#E7F0FA] flex flex-col h-full select-none overflow-hidden">
            {/* Brand Header */}
            <div className="p-3 xl:p-3.5 border-b border-[#173B5C]/60 flex-shrink-0">
                <Logo variant="dark" />
            </div>

            {/* Navigation List — scrollable independently with compact item heights */}
            <div className="flex-1 min-h-0 overflow-y-auto px-2 xl:px-2.5 py-2 space-y-0.5 scrollbar-thin scrollbar-thumb-[#173B5C] scrollbar-track-transparent">
                {mainNav.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={`flex items-center justify-between px-2.5 xl:px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors ${
                            item.active
                                ? 'bg-[#285585] text-white shadow-sm'
                                : 'text-[#B5C8DC] hover:text-white hover:bg-[#173B5C]'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className={item.active ? 'text-white' : 'text-[#8EA8C4]'}>
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {item.badge !== undefined && item.badge > 0 && (
                                <span
                                    className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full text-white ${item.badgeColor}`}
                                >
                                    {item.badge}
                                </span>
                            )}
                            {item.hasChevron && (
                                <svg className="w-3 h-3 text-[#688CAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            )}
                        </div>
                    </Link>
                ))}

                {/* Master Data Section */}
                <div className="pt-2.5 pb-1 px-2.5 xl:px-3">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#688CAE]">
                        Master Data
                    </span>
                </div>

                {masterNav.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-2 px-2.5 xl:px-3 py-1 rounded-[7px] text-[11px] font-medium text-[#A2BDD8] hover:text-white hover:bg-[#173B5C] transition-colors"
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}

                {/* Theme Mode Toggle */}
                <div className="pt-2 px-2 xl:px-2.5">
                    <ThemeToggle
                        variant="pill"
                        className="w-full justify-center !py-1 text-[11px] bg-[#143658]/70 border-[#1E4A74]/80 text-[#E7F0FA] hover:bg-[#1E4A74]"
                    />
                </div>
            </div>

            {/* Bottom Footer Quote with Ship Image Background — anchored, never cut off */}
            <div className="flex-shrink-0 p-2 xl:p-2.5 pb-3">
                <div className="relative rounded-[10px] overflow-hidden border border-[#1E4A74]/60 shadow-inner group">
                    {/* Background ship image */}
                    <img
                        src="/images/sidebar-ship.png"
                        alt="SJA Maritime Voyage"
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-40 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A223B]/95 via-[#0D2945]/80 to-[#143658]/70" />

                    <div className="relative z-10 p-2.5 text-left">
                        <p className="text-[11px] font-semibold italic text-[#E7F0FA] leading-tight drop-shadow-sm">
                            Reliable Services
                        </p>
                        <p className="text-[11px] font-semibold italic text-[#19B5F7] leading-tight drop-shadow-sm">
                            Stronger Voyages
                        </p>
                        <div className="mt-2 pt-1.5 border-t border-white/10 text-[8.5px] text-[#7A98B6] leading-tight">
                            <p>© 2026 PT. Samudra Jaya Andalas</p>
                            <p className="text-[8px] text-[#5A7896]">All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
