import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useEchoNotification } from '@laravel/echo-react';
import { Bell, BellOff, BellPlus, BellRing, CheckCheck, CloudCheck, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import type { PageProps, WorkflowNotification } from '@/types';
import { syncFirebasePush, type FirebasePushStatus } from '@/services/firebaseMessaging';
import Modal from '../overlays/Modal';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import ShipImage from '../vessels/ShipImage';
import { maritimeAudio, playSjaChime } from '../feedback/AudioNotification';

const OPEN_EVENT = 'sja:open-notifications';

export const openNotificationCenter = (): void => {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
};

const formatNotificationDate = (value?: string | null): string => {
    if (!value) {
        return 'Baru saja';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Baru saja';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(date);
};

const notificationToneClass = (notification: WorkflowNotification): string => {
    if (notification.action_required && !notification.read_at) {
        return 'border-[#0060F4] bg-[#EAF4FF] dark:border-[#38BDF8] dark:bg-[#102B4A]';
    }

    if (notification.tone === 'red') {
        return 'border-[#F4B8C3] bg-[#FFF5F7] dark:border-[#6B2232] dark:bg-[#351522]';
    }

    if (notification.tone === 'green') {
        return 'border-[#BCE9D2] bg-[#F3FCF7] dark:border-[#1D6848] dark:bg-[#123526]';
    }

    return 'border-[#DCEAF8] bg-white dark:border-[#1E3A5F] dark:bg-[#0C1D36]';
};

export default function NotificationCenter() {
    const { auth, notifications: sharedNotifications } = usePage<PageProps>().props;
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<WorkflowNotification[]>(sharedNotifications?.items ?? []);
    const [unreadCount, setUnreadCount] = useState(sharedNotifications?.unread_count ?? 0);
    const [pushStatus, setPushStatus] = useState<FirebasePushStatus>('checking');
    const [soundEnabled, setSoundEnabled] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }

        return window.localStorage.getItem('sja-notification-sound') !== 'off';
    });

    useEffect(() => {
        setItems(sharedNotifications?.items ?? []);
        setUnreadCount(sharedNotifications?.unread_count ?? 0);
    }, [sharedNotifications]);

    useEffect(() => {
        const open = () => setIsOpen(true);
        window.addEventListener(OPEN_EVENT, open);

        return () => window.removeEventListener(OPEN_EVENT, open);
    }, []);

    useEffect(() => {
        maritimeAudio.setSoundEnabled(soundEnabled);
        window.localStorage.setItem('sja-notification-sound', soundEnabled ? 'on' : 'off');
    }, [soundEnabled]);

    useEffect(() => {
        let isMounted = true;

        void syncFirebasePush().then((status) => {
            if (isMounted) {
                setPushStatus(status);
            }
        }).catch(() => {
            if (isMounted) {
                setPushStatus('error');
            }
        });

        return () => {
            isMounted = false;
        };
    }, [auth.user.id]);

    const handleRealtimeNotification = useCallback((payload: WorkflowNotification) => {
        const incoming: WorkflowNotification = {
            ...payload,
            read_at: null,
            created_at: payload.created_at ?? new Date().toISOString(),
        };

        setItems((current) => [incoming, ...current.filter((item) => item.id !== incoming.id)].slice(0, 15));
        setUnreadCount((current) => current + 1);
        setIsOpen(true);

        if (soundEnabled) {
            playSjaChime(incoming.tone === 'green' ? 'success' : 'alert');
        }

        if ('Notification' in window && window.Notification.permission === 'granted') {
            const browserNotification = new window.Notification(incoming.title, {
                body: incoming.message,
                icon: '/favicon.ico',
                tag: `${incoming.entity_type ?? 'workflow'}-${incoming.entity_id ?? incoming.id}`,
            });
            browserNotification.onclick = () => {
                window.focus();
                router.visit(incoming.url);
                browserNotification.close();
            };
        }
    }, [soundEnabled]);

    useEchoNotification<WorkflowNotification>(
        `App.Models.User.${auth.user.id}`,
        handleRealtimeNotification,
        undefined,
        [handleRealtimeNotification],
    );

    const hasInformationalUnread = useMemo(
        () => items.some((item) => !item.read_at && !item.action_required),
        [items],
    );

    const openItem = (notification: WorkflowNotification): void => {
        setIsOpen(false);

        if (notification.read_at || notification.action_required) {
            router.visit(notification.url);
            return;
        }

        router.post(
            route('notifications.read', notification.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => router.visit(notification.url),
            },
        );
    };

    const toggleNotificationSound = (): void => {
        const nextSoundEnabled = !soundEnabled;
        setSoundEnabled(nextSoundEnabled);

        if (!nextSoundEnabled) {
            return;
        }

        playSjaChime('info');
    };

    const enableFirebasePush = async (): Promise<void> => {
        setPushStatus('enabling');
        const status = await syncFirebasePush(true).catch(() => 'error' as const);
        setPushStatus(status);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-12 touch-manipulation items-center justify-center rounded-full bg-[#0060F4] text-white shadow-[0_10px_30px_rgba(0,96,244,0.35)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] motion-reduce:transition-none md:bottom-6 md:right-6"
                aria-label={unreadCount > 0 ? `Buka ${unreadCount} notifikasi belum dibaca` : 'Buka pusat notifikasi'}
            >
                {unreadCount > 0 ? (
                    <BellRing aria-hidden="true" className="size-5" />
                ) : (
                    <Bell aria-hidden="true" className="size-5" />
                )}
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#C62840] px-1 text-[10px] font-black tabular-nums ring-2 ring-white dark:ring-[#071322]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Notifikasi pekerjaan"
                subtitle="Tugas wajib tetap tersimpan sampai prosesnya diselesaikan."
                size="lg"
                asBottomSheetOnMobile
                footer={(
                    <div className="flex w-full flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={toggleNotificationSound}
                                leftIcon={soundEnabled ? <Volume2 aria-hidden="true" className="size-4" /> : <VolumeX aria-hidden="true" className="size-4" />}
                            >
                                {soundEnabled ? 'Matikan suara' : 'Aktifkan suara'}
                            </Button>
                            {['available', 'error'].includes(pushStatus) && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => void enableFirebasePush()}
                                    leftIcon={<BellPlus aria-hidden="true" className="size-4" />}
                                >
                                    {pushStatus === 'error' ? 'Coba aktifkan push' : 'Aktifkan push'}
                                </Button>
                            )}
                            {pushStatus === 'enabling' && (
                                <Button type="button" variant="secondary" size="sm" disabled isLoading>
                                    Mengaktifkan push…
                                </Button>
                            )}
                            {pushStatus === 'enabled' && (
                                <span role="status" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#DCF7E8] px-3 text-xs font-bold text-[#087443] dark:bg-emerald-950/45 dark:text-emerald-300">
                                    <CloudCheck aria-hidden="true" className="size-4" /> Push aktif
                                </span>
                            )}
                            {pushStatus === 'blocked' && (
                                <span role="status" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#FFF0F2] px-3 text-xs font-bold text-[#C62840] dark:bg-rose-950/40 dark:text-rose-300">
                                    <BellOff aria-hidden="true" className="size-4" /> Push diblokir browser
                                </span>
                            )}
                            {pushStatus === 'unconfigured' && (
                                <span role="status" className="text-xs font-semibold text-[#52658E] dark:text-[#AFC0D4]">
                                    Push menunggu konfigurasi VAPID
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {hasInformationalUnread && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true })}
                                    leftIcon={<CheckCheck aria-hidden="true" className="size-4" />}
                                >
                                    Tandai info dibaca
                                </Button>
                            )}
                            <Button type="button" size="sm" onClick={() => setIsOpen(false)}>Tutup</Button>
                        </div>
                    </div>
                )}
            >
                <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                    {unreadCount} notifikasi belum dibaca
                </div>

                {items.length === 0 ? (
                    <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847]">
                            <Bell aria-hidden="true" className="size-6" />
                        </span>
                        <p className="mt-3 text-sm font-bold text-[#0B1F63] dark:text-white">Belum ada notifikasi</p>
                        <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">Perubahan alur yang sesuai dengan peran Anda akan tampil di sini.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((notification) => (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() => openItem(notification)}
                                className={`grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border p-3 text-left transition-colors hover:border-[#0060F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${notificationToneClass(notification)}`}
                            >
                                <ShipImage
                                    src={notification.ship_image}
                                    alt={notification.ship_name ? `Foto ${notification.ship_name}` : ''}
                                    width={44}
                                    height={44}
                                    className="size-11 rounded-xl object-cover"
                                    placeholderIconClassName="size-5"
                                />
                                <span className="min-w-0">
                                    <span className="flex flex-wrap items-center gap-1.5">
                                        <span className="break-words text-xs font-extrabold text-[#0B1F63] dark:text-white">{notification.title}</span>
                                        {!notification.read_at && (
                                            <span className="rounded-full bg-[#0060F4] px-1.5 py-0.5 text-[9px] font-bold text-white">Baru</span>
                                        )}
                                    </span>
                                    <span className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#52658E] dark:text-[#AFC0D4]">{notification.message}</span>
                                    <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#7C91AC] dark:text-[#94A3B8]">
                                        <span className="tabular-nums">{formatNotificationDate(notification.created_at)}</span>
                                        {notification.status && <StatusBadge status={notification.status} label={notification.status} size="sm" />}
                                        {notification.action_required && !notification.read_at && (
                                            <span className="font-bold text-[#0060F4] dark:text-[#60A5FA]">Wajib ditindaklanjuti</span>
                                        )}
                                    </span>
                                </span>
                                <span className="flex min-h-11 items-center gap-1 self-center whitespace-nowrap text-[10px] font-bold text-[#0060F4] dark:text-[#60A5FA]">
                                    {notification.action_label}
                                    <ExternalLink aria-hidden="true" className="size-3.5" />
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </Modal>
        </>
    );
}
