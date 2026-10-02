import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '../Components/navigation/Sidebar';
import Topbar from '../Components/navigation/Topbar';
import MobileBottomNavigation from '../Components/navigation/MobileBottomNavigation';
import PageLoadingSkeleton from '../Components/feedback/PageLoadingSkeleton';
import Logo from '../Components/ui/Logo';
import { usePage, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bell, Menu, X } from 'lucide-react';
import { PageProps } from '@/types';

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
    pendingRequestsCount?: number;
    pendingApprovalsCount?: number;
    transparentMobileHeader?: boolean;
    hideMobileHeader?: boolean;
    noPaddingMobile?: boolean;
    mobileBackground?: 'background' | 'surface';
}

export const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    title,
    pendingRequestsCount = 0,
    pendingApprovalsCount = 0,
    transparentMobileHeader = false,
    hideMobileHeader = false,
    noPaddingMobile = false,
}) => {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const url = page.url;
    const user = auth?.user;
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prefersReducedMotion = useReducedMotion();
    const showMobileMenu = Boolean(user);
    const mobileBackgroundClass = 'bg-white dark:bg-[#0C1D36] md:bg-transparent';
    const currentPath = url.split('?')[0].replace(/\/$/, '') || '/';
    const loadingSkeletonVariant = currentPath === '/dashboard'
        ? 'dashboard'
        : currentPath.endsWith('/create') || currentPath.endsWith('/edit') || currentPath === '/profile'
          ? 'form'
          : /^\/(requests|vessels)\/[^/]+$/.test(currentPath)
            ? 'detail'
            : 'list';

    useEffect(() => {
        const onScroll = () => {
            const offset =
                window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
            setScrolled(offset > 12);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [url]);

    useEffect(() => {
        const stopStartListener = router.on('start', (event) => {
            if (event.detail.visit.method !== 'get') {
                return;
            }

            if (loadingTimerRef.current) {
                clearTimeout(loadingTimerRef.current);
            }

            loadingTimerRef.current = setTimeout(() => setIsNavigating(true), 220);
        });
        const stopFinishListener = router.on('finish', () => {
            if (loadingTimerRef.current) {
                clearTimeout(loadingTimerRef.current);
                loadingTimerRef.current = null;
            }

            setIsNavigating(false);
        });

        return () => {
            stopStartListener();
            stopFinishListener();
            if (loadingTimerRef.current) {
                clearTimeout(loadingTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!mobileMenuOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
                return;
            }

            if (event.key !== 'Tab' || !drawerRef.current) {
                return;
            }

            const focusableElements = Array.from(
                drawerRef.current.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements.at(-1);

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement?.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            menuButtonRef.current?.focus();
        };
    }, [mobileMenuOpen]);

    // User initials for avatar
    const initials = user?.name
        ? user.name
              .split(' ')
              .map((w: string) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
        : '?';

    return (
        <div
            className={
                'min-h-dvh bg-white md:bg-[#F0F8FF] dark:bg-[#0C1D36] md:dark:bg-[#071322] flex flex-col md:flex-row text-[#0B1F63] ' +
                'dark:text-[#F1F5F9] transition-colors duration-200 motion-reduce:transition-none'
            }
        >
            <a
                href="#main-content"
                className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#0B1F63] shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
            >
                Lewati ke konten utama
            </a>
            {/* Desktop Sidebar Column — stretches full document height for long screenshots */}
            <div
                className={
                    'hidden md:flex flex-col flex-shrink-0 w-56 xl:w-60 bg-[#0D2945] ' +
                    'dark:bg-[#050E1A] self-stretch relative z-30 border-r border-[#173B5C]/60 ' +
                    'dark:border-[#1A3358] shadow-xl'
                }
            >
                <div className="sticky top-0 flex h-dvh max-h-dvh flex-col overflow-hidden">
                    <Sidebar
                        pendingRequestsCount={pendingRequestsCount}
                        pendingApprovalsCount={pendingApprovalsCount}
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex min-w-0 flex-1 flex-col pb-[calc(3.25rem+env(safe-area-inset-bottom))] md:pb-0 ${mobileBackgroundClass}`}>
                {/* Desktop Topbar */}
                <div className="hidden md:block">
                    <Topbar unreadNotificationsCount={0} />
                </div>

                {/* Mobile Header — transparent at top, solid white/dark on scroll */}
                {!hideMobileHeader &&
                    (() => {
                        const isTransparent = transparentMobileHeader && !scrolled;
                        return (
                            <header
                                className={`md:hidden h-16 px-4 flex items-center justify-between ${
                                    transparentMobileHeader
                                        ? 'fixed top-0 left-0 right-0 z-30'
                                        : 'sticky top-0 z-30'
                                } transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none ${
                                    scrolled
                                        ? 'bg-white dark:bg-[#0C1D36] shadow-sm border-b ' +
                                          'border-[#DCEAF8] dark:border-[#1E3A5F]'
                                        : transparentMobileHeader
                                          ? 'bg-transparent border-none border-b-0 shadow-none'
                                          : 'bg-white dark:bg-[#0C1D36] border-b ' +
                                            'border-[#DCEAF8] dark:border-[#1E3A5F]'
                                }`}
                            >
                                <div className="flex min-w-0 items-center gap-1">
                                    {showMobileMenu && (
                                        <button
                                            ref={menuButtonRef}
                                            type="button"
                                            onClick={() => setMobileMenuOpen(true)}
                                            className={`flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 ${isTransparent ? 'text-white focus-visible:outline-white' : 'text-[#0B1F63] dark:text-[#F1F5F9] focus-visible:outline-[#0060F4]'}`}
                                            aria-label="Buka menu utama"
                                            aria-expanded={mobileMenuOpen}
                                        >
                                            <Menu aria-hidden="true" className="size-5" />
                                        </button>
                                    )}
                                    <Link
                                    href="/dashboard"
                                    className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                        isTransparent
                                            ? 'focus-visible:outline-white'
                                            : 'focus-visible:outline-[#0060F4]'
                                    }`}
                                    aria-label="Buka beranda SJA"
                                >
                                    <Logo variant="icon" className="shrink-0" />
                                    <span className="flex min-w-0 flex-col leading-tight">
                                        <span
                                            translate="no"
                                            className={`truncate text-[12px] font-extrabold transition-colors ${
                                                isTransparent
                                                    ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]'
                                                    : 'text-[#0B1F63] dark:text-[#F1F5F9]'
                                            }`}
                                        >
                                            PT. SAMUDRA JAYA ANDALAS
                                        </span>
                                        <span
                                            className={`truncate text-[10px] font-medium transition-colors ${
                                                isTransparent
                                                    ? 'text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                                                    : 'text-[#52658E] dark:text-[#94A3B8]'
                                            }`}
                                        >
                                            Ship Agency Management System
                                        </span>
                                    </span>
                                    </Link>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <Link
                                        href="/requests"
                                        className={`relative flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                            isTransparent
                                                ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] hover:bg-white/10 focus-visible:outline-white'
                                                : 'text-[#0B1F63] dark:text-[#F1F5F9] ' +
                                                  'hover:text-[#0060F4] ' +
                                                  'dark:hover:text-[#38BDF8] ' +
                                                  'hover:bg-[#E0F0FF] ' +
                                                  'dark:hover:bg-[#152E52] ' +
                                                  'focus-visible:outline-[#0060F4]'
                                        }`}
                                        aria-label="Buka pengajuan dan notifikasi"
                                    >
                                        <Bell aria-hidden="true" className="size-5" strokeWidth={2} />
                                    </Link>

                                    <Link
                                        href="/profile"
                                        className={`flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                            isTransparent
                                                ? 'focus-visible:outline-white'
                                                : 'hover:bg-[#E0F0FF] focus-visible:outline-[#0060F4] dark:hover:bg-[#152E52]'
                                        }`}
                                        aria-label={`Buka profil ${user?.name || 'pengguna'}`}
                                        aria-current={url.startsWith('/profile') ? 'page' : undefined}
                                    >
                                        <span
                                            className={`flex size-8 items-center justify-center rounded-full text-[10px] font-extrabold shadow-sm ${
                                                isTransparent
                                                    ? 'bg-white text-[#0B1F63] ring-2 ring-white/40'
                                                    : 'bg-[#E0F0FF] text-[#0B1F63] ring-1 ring-[#DCEAF8] dark:bg-[#152E52] dark:text-[#F1F5F9] dark:ring-[#1E3A5F]'
                                            }`}
                                        >
                                            {initials}
                                        </span>
                                    </Link>
                                </div>
                            </header>
                        );
                    })()}

                <AnimatePresence>
                    {mobileMenuOpen && showMobileMenu && (
                        <div className="fixed inset-0 z-50 md:hidden">
                            <motion.button
                                type="button"
                                aria-label="Tutup menu utama"
                                className="absolute inset-0 bg-[#082870]/60"
                                initial={prefersReducedMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
                                onClick={() => setMobileMenuOpen(false)}
                            />
                            <motion.div
                                ref={drawerRef}
                                role="dialog"
                                aria-modal="true"
                                aria-label="Menu utama"
                                className="absolute inset-y-0 left-0 w-[min(86vw,20rem)] overscroll-contain bg-[#0D2945] shadow-2xl"
                                initial={prefersReducedMotion ? false : { x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                            >
                                <button
                                    ref={closeButtonRef}
                                    type="button"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
                                    aria-label="Tutup menu"
                                >
                                    <X aria-hidden="true" className="size-5" />
                                </button>
                                <Sidebar pendingRequestsCount={pendingRequestsCount} pendingApprovalsCount={pendingApprovalsCount} />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Content Container with Framer Motion Page Transition */}
                <main id="main-content" tabIndex={-1} aria-busy={isNavigating} className={`flex-1 ${mobileBackgroundClass}`}>
                    <div
                        className={`${
                            noPaddingMobile || transparentMobileHeader || hideMobileHeader
                                ? 'p-0 md:p-6 lg:p-7'
                                : 'p-4 pb-0 md:p-6 lg:p-7'
                        }`}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={isNavigating ? 'page-loading' : url.split('?')[0]}
                                initial={prefersReducedMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
                            >
                                {isNavigating ? <PageLoadingSkeleton variant={loadingSkeletonVariant} /> : children}
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
