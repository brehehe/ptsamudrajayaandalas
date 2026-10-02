import React from 'react';
import { Link, usePage } from '@inertiajs/react';

export const MobileBottomNavigation: React.FC = () => {
    const { url } = usePage();

    const isBeranda = url === '/dashboard' || url === '/';
    const isKapal =
        url.startsWith('/vessels') ||
        url.startsWith('/work-orders') ||
        url.startsWith('/master/vessels') ||
        url.startsWith('/master/ships');
    const isAktifitas = url.startsWith('/operations');
    const isPengajuan =
        url.startsWith('/requests') ||
        url.startsWith('/needs') ||
        url.startsWith('/funding') ||
        url.startsWith('/completion-notes');
    const isProfil = url.startsWith('/profile');

    return (
        <nav
            aria-label="Navigasi Utama Mobile"
            className={
                'md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0C1D36]/95 ' +
                'backdrop-blur-md border-t border-[#DCEAF8] dark:border-[#1E3A5F] px-2 pt-1 ' +
                'flex justify-around items-end transition-colors duration-200 motion-reduce:transition-none ' +
                'shadow-[0_-4px_20px_rgba(8,40,112,0.08)] ' +
                'dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]'
            }
            style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
        >
            {/* 1. Beranda */}
            <Link
                href="/dashboard"
                prefetch
                className={`relative flex min-h-11 flex-1 flex-col items-center justify-center rounded-lg py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-inset ${isBeranda
                        ? 'text-[#0060F4] dark:text-[#38BDF8]'
                        : 'text-[#52658E] dark:text-[#94A3B8] hover:text-[#0060F4]'
                    }`}
            >
                <svg
                    aria-hidden="true"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill={isBeranda ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={isBeranda ? 1.5 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span
                    className={`mt-0.5 text-[10.5px] font-medium ${isBeranda ? 'font-bold text-[#0060F4] dark:text-[#38BDF8]' : ''}`}
                >
                    Beranda
                </span>
                {isBeranda && (
                    <span className="w-3.5 h-0.5 bg-[#0060F4] dark:bg-[#38BDF8] rounded-full absolute -bottom-0.5" />
                )}
            </Link>

            {/* 2. Kapal */}
            <Link
                href="/vessels"
                prefetch
                className={`relative flex min-h-11 flex-1 flex-col items-center justify-center rounded-lg py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-inset ${isKapal
                        ? 'text-[#0060F4] dark:text-[#38BDF8]'
                        : 'text-[#52658E] dark:text-[#94A3B8] hover:text-[#0060F4]'
                    }`}
            >
                <svg
                    aria-hidden="true"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill={isKapal ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                    <path d="M6 12V6h4v6" />
                    <path d="M14 12V8h4v4" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                </svg>
                <span
                    className={`mt-0.5 text-[10.5px] font-medium ${isKapal ? 'font-bold text-[#0060F4] dark:text-[#38BDF8]' : ''}`}
                >
                    Kapal
                </span>
                {isKapal && (
                    <span className="w-3.5 h-0.5 bg-[#0060F4] dark:bg-[#38BDF8] rounded-full absolute -bottom-0.5" />
                )}
            </Link>

            {/* 3. AKTIFITAS (Center Prominent Floating Button) */}
            <Link
                href="/operations"
                prefetch
                className="group relative -mt-4 flex min-h-11 flex-1 flex-col items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-inset"
                aria-label="Catat Aktivitas Lapangan"
            >
                <div
                    className={`flex size-11 items-center justify-center rounded-full border-[3px] border-white bg-[#0060F4] text-white shadow-md transition-[transform,background-color,box-shadow,border-color] hover:bg-[#082870] active:scale-95 motion-reduce:transition-none dark:border-[#0C1D36] ${isAktifitas ? 'ring-2 ring-[#19B5F7]' : ''
                        }`}
                >
                    <svg
                        aria-hidden="true"
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </div>
                <span
                    className={`mt-0.5 text-[10.5px] font-bold ${isAktifitas
                            ? 'text-[#0060F4] dark:text-[#38BDF8]'
                            : 'text-[#52658E] dark:text-[#94A3B8]'
                        }`}
                >
                    Aktivitas
                </span>
            </Link>

            {/* 4. Pengajuan */}
            <Link
                href="/requests"
                prefetch
                className={`relative flex min-h-11 flex-1 flex-col items-center justify-center rounded-lg py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-inset ${isPengajuan
                        ? 'text-[#0060F4] dark:text-[#38BDF8]'
                        : 'text-[#52658E] dark:text-[#94A3B8] hover:text-[#0060F4]'
                    }`}
            >
                <svg
                    aria-hidden="true"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill={isPengajuan ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
                <span
                    className={`mt-0.5 text-[10.5px] font-medium ${isPengajuan ? 'font-bold text-[#0060F4] dark:text-[#38BDF8]' : ''}`}
                >
                    Pengajuan
                </span>
                {isPengajuan && (
                    <span className="w-3.5 h-0.5 bg-[#0060F4] dark:bg-[#38BDF8] rounded-full absolute -bottom-0.5" />
                )}
            </Link>

            {/* 5. Profil */}
            <Link
                href="/profile"
                prefetch
                className={`relative flex min-h-11 flex-1 flex-col items-center justify-center rounded-lg py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-inset ${isProfil
                        ? 'text-[#0060F4] dark:text-[#38BDF8]'
                        : 'text-[#52658E] dark:text-[#94A3B8] hover:text-[#0060F4]'
                    }`}
            >
                <svg
                    aria-hidden="true"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill={isProfil ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
                <span
                    className={`mt-0.5 text-[10.5px] font-medium ${isProfil ? 'font-bold text-[#0060F4] dark:text-[#38BDF8]' : ''}`}
                >
                    Profil
                </span>
                {isProfil && (
                    <span className="w-3.5 h-0.5 bg-[#0060F4] dark:bg-[#38BDF8] rounded-full absolute -bottom-0.5" />
                )}
            </Link>
        </nav>
    );
};

export default MobileBottomNavigation;
