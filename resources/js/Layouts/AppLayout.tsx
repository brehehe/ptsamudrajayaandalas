import React, { useEffect, useState } from 'react';
import Sidebar from '../Components/navigation/Sidebar';
import Topbar from '../Components/navigation/Topbar';
import MobileBottomNavigation from '../Components/navigation/MobileBottomNavigation';
import Logo from '../Components/ui/Logo';
import ThemeToggle from '../Components/ui/ThemeToggle';
import { usePage, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageProps } from '@/types';

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
    pendingRequestsCount?: number;
    pendingApprovalsCount?: number;
    transparentMobileHeader?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    title,
    pendingRequestsCount = 14,
    pendingApprovalsCount = 5,
    transparentMobileHeader = false,
}) => {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const url = page.url;
    const user = auth?.user;
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            const offset = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
            setScrolled(offset > 12);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleLogout = () => {
        router.post('/logout');
    };

    // User initials for avatar
    const initials = user?.name
        ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    return (
        <div className="min-h-screen bg-white md:bg-[#F0F8FF] dark:bg-[#071322] flex flex-col md:flex-row text-[#0B1F63] dark:text-[#F1F5F9] transition-colors duration-200">
            {/* Desktop Sidebar Column — stretches full document height for long screenshots */}
            <div className="hidden md:flex flex-col flex-shrink-0 w-56 xl:w-60 bg-[#0D2945] dark:bg-[#050E1A] self-stretch relative z-30 border-r border-[#173B5C]/60 dark:border-[#1A3358] shadow-xl">
                <div className="sticky top-0 h-screen max-h-screen flex flex-col overflow-hidden">
                    <Sidebar
                        pendingRequestsCount={pendingRequestsCount}
                        pendingApprovalsCount={pendingApprovalsCount}
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 pb-14 md:pb-0 bg-white md:bg-transparent dark:bg-[#071322] md:dark:bg-transparent">
                {/* Desktop Topbar */}
                <div className="hidden md:block">
                    <Topbar unreadNotificationsCount={3} />
                </div>

                {/* Mobile Header — transparent at top, solid white/dark on scroll */}
                {(() => {
                    const isTransparent = transparentMobileHeader && !scrolled;
                    return (
                        <header
                            className={`md:hidden px-4 py-3 flex items-center justify-between ${
                                transparentMobileHeader ? 'fixed top-0 left-0 right-0 z-30' : 'sticky top-0 z-30'
                            } transition-all duration-300 ${
                                scrolled
                                    ? 'bg-white/95 dark:bg-[#0C1D36]/95 shadow-[0_2px_16px_rgba(8,40,112,0.10)] border-b border-[#DCEAF8]/80 dark:border-[#1E3A5F]/80 backdrop-blur-md'
                                    : transparentMobileHeader
                                    ? 'bg-transparent border-none border-b-0 shadow-none'
                                    : 'bg-white/75 dark:bg-[#0C1D36]/75 border-b border-[#DCEAF8]/50 dark:border-[#1E3A5F]/50 backdrop-blur-md'
                            }`}
                        >
                            {/* Logo — compact on mobile */}
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <Logo variant="icon" />
                                <div className="flex flex-col leading-none">
                                    <span className={`font-bold text-[13px] tracking-tight transition-colors ${
                                        isTransparent ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]' : 'text-[#0B1F63] dark:text-[#F1F5F9]'
                                    }`}>
                                        PT. SAMUDRA JAYA ANDALAS
                                    </span>
                                    <span className={`text-[10px] font-medium mt-px transition-colors ${
                                        isTransparent ? 'text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-[#52658E] dark:text-[#94A3B8]'
                                    }`}>
                                        Ship Agency Management System
                                    </span>
                                </div>
                            </Link>

                            <div className="flex items-center gap-1.5">
                                {/* Mobile Theme Toggle */}
                                <ThemeToggle className={isTransparent ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] hover:bg-white/15 active:bg-white/20' : ''} />

                                {/* Notification Bell with Badge */}
                                <Link
                                    href="/requests"
                                    className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                                        isTransparent
                                            ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] hover:bg-white/15 active:bg-white/20'
                                            : 'text-[#0B1F63] dark:text-[#F1F5F9] hover:text-[#0060F4] dark:hover:text-[#38BDF8] hover:bg-[#0060F4]/8 dark:hover:bg-[#152E52] active:bg-[#0060F4]/12'
                                    }`}
                                    aria-label="Notifikasi"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#E53E3E] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#0C1D36] shadow-xs">
                                        3
                                    </span>
                                </Link>
                            </div>
                        </header>
                    );
                })()}

                {/* Content Container with Framer Motion Page Transition */}
                <main className="flex-1 bg-white md:bg-transparent dark:bg-[#071322] md:dark:bg-transparent">
                    <div className={`${transparentMobileHeader ? 'p-0 md:p-6 lg:p-7' : 'p-4 pb-0 md:p-6 lg:p-7'}`}>
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={url.split('?')[0]}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <MobileBottomNavigation />
            </div>
        </div>
    );
};

export default AppLayout;
