import React, { useState, useRef, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { playSjaChime } from '../feedback/AudioNotification';
import { registerFirebasePush, SjaNotificationPayload } from '../../services/firebase';
import ThemeToggle from '../ui/ThemeToggle';

interface TopbarProps {
    unreadNotificationsCount?: number;
}

export const Topbar: React.FC<TopbarProps> = ({ unreadNotificationsCount = 3 }) => {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [fcmEnabled, setFcmEnabled] = useState(false);
    const [notifications, setNotifications] = useState<SjaNotificationPayload[]>([
        {
            id: 'notif-1',
            title: 'Pengajuan Baru: REQ-00251',
            message:
                'Operasional mengajukan 4 item kebutuhan untuk KM Andalas Jaya (Sandar di Boom Baru).',
            type: 'request_submitted',
            timestamp: '10 menit lalu',
            read: false,
            url: '/requests',
        },
        {
            id: 'notif-2',
            title: 'Approval Direktur: REQ-00248',
            message:
                'Direktur telah menyetujui seluruh item pengajuan kapal MV Sriwijaya Star.',
            type: 'director_approval',
            timestamp: '1 jam lalu',
            read: false,
            url: '/approvals',
        },
        {
            id: 'notif-3',
            title: 'Invoice Keagenan & Reimburse',
            message:
                'Faktur INV-AGY-26-0001 dan INV-RMB-26-0001 siap dicetak untuk PT Pelayaran Nusantara.',
            type: 'invoice_ready',
            timestamp: '2 jam lalu',
            read: true,
            url: '/invoices',
        },
    ]);

    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        router.post('/logout');
    };

    const handleTestChime = (type: 'chime' | 'success') => {
        playSjaChime(type);
    };

    const handleEnableFirebase = async () => {
        const token = await registerFirebasePush((newNotif) => {
            setNotifications((prev) => [newNotif, ...prev]);
        });
        if (token) {
            setFcmEnabled(true);
            playSjaChime('success');
        }
    };

    const markAllRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <header
            className={
                'h-14 xl:h-16 bg-white dark:bg-[#071322] border-b border-[#DCEAF8] ' +
                'dark:border-[#1E3A5F] px-5 lg:px-7 flex items-center justify-between sticky top-0 ' +
                'z-40 shadow-[0_1px_3px_rgba(8,40,112,0.04)] ' +
                'dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-colors duration-200'
            }
        >
            {/* Search Input with Ctrl+K */}
            <div className="relative w-full max-w-lg lg:max-w-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg
                        className="h-4 w-4 text-[#52658E] dark:text-[#94A3B8]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Cari kapal, pengajuan, kebutuhan, invoice, atau master produk..."
                    className={
                        'w-full pl-9 pr-14 py-2 bg-[#F0F8FF]/60 dark:bg-[#0C1D36] border ' +
                        'border-[#DCEAF8] dark:border-[#1E3A5F] rounded-[10px] text-xs ' +
                        'lg:text-sm text-[#0B1F63] dark:text-[#F1F5F9] placeholder-[#8C9BB9] ' +
                        'dark:placeholder-[#64748B] focus:outline-none focus:ring-2 ' +
                        'focus:ring-[#0060F4]/30 focus:border-[#0060F4] transition-all'
                    }
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <kbd
                        className={
                            'inline-flex items-center px-1.5 py-0.5 border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] rounded text-[10px] font-mono text-[#52658E] ' +
                            'dark:text-[#94A3B8] bg-white dark:bg-[#071322]'
                        }
                    >
                        Ctrl + K
                    </kbd>
                </div>
            </div>

            {/* Right actions: Theme Toggle, Notifications & User Profile */}
            <div className="flex items-center gap-3 lg:gap-4">
                {/* Theme Toggle Button (Light/Dark Mode) */}
                <ThemeToggle />

                {/* Notification Bell Dropdown */}
                <div className="relative" ref={notifRef}>
                    <button
                        type="button"
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className={`relative p-2 rounded-full transition-colors focus:outline-none ${
                            isNotifOpen
                                ? 'bg-[#E0F0FF] dark:bg-[#152E52] text-[#0060F4] dark:text-[#38BDF8]'
                                : 'text-[#52658E] dark:text-[#94A3B8] hover:text-[#0060F4] ' +
                                  'dark:hover:text-[#38BDF8] hover:bg-[#F0F8FF] ' +
                                  'dark:hover:bg-[#0C1D36]'
                        }`}
                        aria-label="Notifikasi Operasional SJA"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={
                                    'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.0' +
                                    '02 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v' +
                                    '3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0' +
                                    'v-1m6 0H9'
                                }
                            />
                        </svg>
                        {unreadCount > 0 && (
                            <span
                                className={
                                    'absolute top-1 right-1 flex items-center justify-center w-4 ' +
                                    'h-4 text-[10px] font-bold text-white bg-[#C62840] ' +
                                    'rounded-full shadow-xs animate-pulse'
                                }
                            >
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Popover Menu */}
                    {isNotifOpen && (
                        <div
                            className={
                                'absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#0C1D36] ' +
                                'rounded-2xl shadow-2xl border border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F] z-50 overflow-hidden text-left animate-in ' +
                                'fade-in slide-in-from-top-2 duration-150'
                            }
                        >
                            {/* Header */}
                            <div
                                className={
                                    'px-4 py-3 bg-[#0D2945] dark:bg-[#06101D] text-white flex ' +
                                    'items-center justify-between'
                                }
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm tracking-tight">
                                        Notifikasi Operasional SJA
                                    </span>
                                    {unreadCount > 0 && (
                                        <span className="px-1.5 py-0.5 bg-[#0060F4] text-[10px] font-bold rounded-full">
                                            {unreadCount} baru
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={markAllRead}
                                    className="text-[11px] text-[#19B5F7] hover:underline"
                                >
                                    Tandai dibaca
                                </button>
                            </div>

                            {/* Sound & Firebase Action Bar */}
                            <div
                                className={
                                    'px-4 py-2 bg-[#F0F8FF] dark:bg-[#071322] border-b ' +
                                    'border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center ' +
                                    'justify-between text-xs text-[#0B1F63] dark:text-[#F1F5F9]'
                                }
                            >
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleTestChime('chime')}
                                        className={
                                            'inline-flex items-center gap-1 px-2 py-1 bg-white ' +
                                            'dark:bg-[#0C1D36] border border-[#DCEAF8] ' +
                                            'dark:border-[#1E3A5F] rounded-md text-[11px] ' +
                                            'font-semibold text-[#0060F4] dark:text-[#38BDF8] ' +
                                            'hover:bg-[#E0F0FF] dark:hover:bg-[#152E52] ' +
                                            'transition-colors'
                                        }
                                        title="Uji coba suara lonceng maritim saat pengajuan masuk"
                                    >
                                        <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d={
                                                    'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 ' +
                                                    '0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 ' +
                                                    '0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.' +
                                                    '109 12 5v14c0 .891-1.077 1.337-1.707.707L5.5' +
                                                    '86 15z'
                                                }
                                            />
                                        </svg>
                                        Tes Suara Chime
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleEnableFirebase}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                        fcmEnabled
                                            ? 'bg-[#107E3E]/10 text-[#107E3E] border border-[#107E3E]/30'
                                            : 'bg-[#0060F4] text-white hover:bg-[#082870]'
                                    }`}
                                >
                                    {fcmEnabled ? '✓ Firebase Aktif' : 'Aktifkan Push Web'}
                                </button>
                            </div>

                            {/* Notifications List */}
                            <div
                                className={
                                    'max-h-72 overflow-y-auto divide-y divide-[#DCEAF8]/60 ' +
                                    'dark:divide-[#1E3A5F]/60'
                                }
                            >
                                {notifications.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.url || '/requests'}
                                        onClick={() => setIsNotifOpen(false)}
                                        className={`block p-3.5 hover:bg-[#F0F8FF]/80 dark:hover:bg-[#132847] transition-colors ${
                                            !item.read
                                                ? 'bg-[#F0F8FF]/40 dark:bg-[#071322]/50'
                                                : 'bg-white dark:bg-[#0C1D36]'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div
                                                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                                    !item.read
                                                        ? 'bg-[#0060F4] dark:bg-[#38BDF8]'
                                                        : 'bg-transparent'
                                                }`}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className={
                                                        'text-xs font-bold text-[#0B1F63] ' +
                                                        'dark:text-[#F1F5F9] leading-tight truncate'
                                                    }
                                                >
                                                    {item.title}
                                                </p>
                                                <p
                                                    className={
                                                        'text-[11px] text-[#52658E] ' +
                                                        'dark:text-[#94A3B8] leading-relaxed mt-1 ' +
                                                        'line-clamp-2'
                                                    }
                                                >
                                                    {item.message}
                                                </p>
                                                <span
                                                    className={
                                                        'text-[10px] text-[#8C9BB9] ' +
                                                        'dark:text-[#64748B] font-medium mt-1 ' +
                                                        'inline-block'
                                                    }
                                                >
                                                    {item.timestamp}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Footer link to Requests */}
                            <div
                                className={
                                    'p-2.5 bg-gray-50 dark:bg-[#071322] border-t border-[#DCEAF8] ' +
                                    'dark:border-[#1E3A5F] text-center'
                                }
                            >
                                <Link
                                    href="/requests"
                                    onClick={() => setIsNotifOpen(false)}
                                    className="text-xs font-semibold text-[#0060F4] dark:text-[#38BDF8] hover:underline"
                                >
                                    Lihat Semua Aktivitas Pengajuan →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Pill */}
                <div className="flex items-center gap-2.5 pl-3 border-l border-[#DCEAF8] dark:border-[#1E3A5F]">
                    <div
                        className={
                            'w-9 h-9 rounded-full overflow-hidden ring-1 ring-[#DCEAF8] ' +
                            'dark:ring-[#1E3A5F] flex-shrink-0 bg-[#E0F0FF] dark:bg-[#152E52]'
                        }
                    >
                        <img
                            src="/images/avatar-titik.png"
                            alt={user?.name || 'Pengguna'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-xs lg:text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9] leading-tight">
                            {user?.name || 'Pengguna'}
                        </span>
                        <span
                            className={
                                'text-[11px] text-[#52658E] dark:text-[#94A3B8] font-medium ' +
                                'leading-tight mt-0.5'
                            }
                        >
                            {user?.primary_role || 'Tanpa Role'}
                        </span>
                    </div>

                    <button
                        onClick={handleLogout}
                        title="Keluar"
                        className={
                            'p-1.5 ml-1 text-[#8C9BB9] dark:text-[#64748B] ' +
                            'hover:text-[#C62840] dark:hover:text-[#F87171] rounded-md ' +
                            'transition-colors'
                        }
                    >
                        <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
