import { Link } from '@inertiajs/react';
import ReceivablesOverview, { type ReceivablesOverviewData } from '@/Components/dashboard/ReceivablesOverview';
import {
    Activity,
    Anchor,
    ArrowRight,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    ClipboardList,
    Clock,
    FileClock,
    FileText,
    HandCoins,
    Landmark,
    MapPin,
    PackageCheck,
    ReceiptText,
    Ship,
    TrendingUp,
    Users,
    WalletCards,
    type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import ShipImage from '@/Components/vessels/ShipImage';

type DashboardRole = 'admin' | 'operasional' | 'direktur' | 'owner';
type MetricFormat = 'number' | 'currency' | 'percentage';
type PriorityTone = 'blue' | 'amber' | 'green' | 'red';

interface Metric {
    key: string;
    label: string;
    value: number;
    format: MetricFormat;
    hint: string;
}

interface Priority {
    title: string;
    description: string;
    count: number;
    href: string;
    tone: PriorityTone;
}

interface QuickAction {
    label: string;
    description: string;
    href: string;
    icon: string;
}

interface MobileDashboardData {
    role: DashboardRole;
    is_read_only: boolean;
    eyebrow: string;
    title: string;
    subtitle: string;
    primary_action: { label: string; href: string };
    metrics: Metric[];
    priorities: Priority[];
    quick_actions: QuickAction[];
}

interface RoleDashboardMobileViewProps {
    dashboard: MobileDashboardData;
    userName: string;
    liveDate: string;
    liveTime: string;
    activeShips: any[];
    recentActivities: any[];
    latestRequests: any[];
    needsToday: any[];
    pendingApprovals: any[];
    recentInvoices: any[];
    receivablesOverview: ReceivablesOverviewData | null;
}

interface MetricPresentation {
    href: string;
    icon: LucideIcon;
}

interface SummaryTone {
    surfaceClass: string;
    iconClass: string;
    valueClass: string;
    labelClass: string;
}

const rolePresentation: Record<DashboardRole, { label: string; icon: LucideIcon; summary: string }> = {
    operasional: { label: 'Staf operasional lapangan', icon: Anchor, summary: 'Ringkasan hari ini' },
    admin: { label: 'Administrasi & operasional', icon: ClipboardCheck, summary: 'Ringkasan pekerjaan' },
    direktur: { label: 'Persetujuan & pengawasan', icon: Landmark, summary: 'Ringkasan keputusan' },
    owner: { label: 'Pemantauan strategis', icon: Building2, summary: 'Ringkasan perusahaan' },
};

const metricPresentation: Record<string, MetricPresentation> = {
    active_ships: {
        href: '/vessels',
        icon: Ship,
    },
    activities: {
        href: '/operations',
        icon: Activity,
    },
    needs: {
        href: '/needs',
        icon: PackageCheck,
    },
    requests: {
        href: '/requests',
        icon: ClipboardList,
    },
    work_orders: {
        href: '/work-orders',
        icon: FileText,
    },
    vendor_invoices: {
        href: '/vendor-invoices',
        icon: ReceiptText,
    },
    approvals: {
        href: '/approvals',
        icon: ClipboardCheck,
    },
    kopra: {
        href: '/funding',
        icon: Landmark,
    },
    invoiced: {
        href: '/receivables',
        icon: ReceiptText,
    },
    collected: {
        href: '/reports',
        icon: TrendingUp,
    },
    receivables: {
        href: '/receivables',
        icon: HandCoins,
    },
};

const summaryTones: SummaryTone[] = [
    {
        surfaceClass: 'border-[#64C7F7] bg-[#087CC1] dark:border-[#338BC4] dark:bg-[#075C9B]',
        iconClass: 'bg-white/15 text-white',
        valueClass: 'text-white',
        labelClass: 'text-white',
    },
    {
        surfaceClass: 'border-[#9CE1BF] bg-[#D7F7E5] dark:border-[#176044] dark:bg-[#0B3A2C]',
        iconClass: 'bg-[#BCEFD3] text-[#087443] dark:bg-emerald-950/60 dark:text-emerald-300',
        valueClass: 'text-[#087443] dark:text-emerald-200',
        labelClass: 'text-[#176147] dark:text-emerald-100',
    },
    {
        surfaceClass: 'border-[#F1D28A] bg-[#FFF0CB] dark:border-[#6B4D16] dark:bg-[#3A2B12]',
        iconClass: 'bg-[#FFE1A3] text-[#B54A00] dark:bg-amber-950/60 dark:text-amber-300',
        valueClass: 'text-[#B54A00] dark:text-amber-200',
        labelClass: 'text-[#8C4B0A] dark:text-amber-100',
    },
    {
        surfaceClass: 'border-[#CFBDF5] bg-[#EEE6FF] dark:border-[#563B8F] dark:bg-[#2D2147]',
        iconClass: 'bg-[#DFD0FF] text-[#7138E0] dark:bg-violet-950/60 dark:text-violet-300',
        valueClass: 'text-[#2A1769] dark:text-violet-100',
        labelClass: 'text-[#51388C] dark:text-violet-100',
    },
];

const quickActionIcons: Record<string, LucideIcon> = {
    activity: Activity,
    package: PackageCheck,
    wallet: WalletCards,
    ship: Ship,
    approval: ClipboardCheck,
    bank: Landmark,
    receivable: HandCoins,
    report: TrendingUp,
    users: Users,
    audit: ClipboardCheck,
    work_order: FileText,
    invoice: ReceiptText,
    completion: CheckCircle2,
};

const priorityClasses: Record<PriorityTone, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    red: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
};

const formatMetricValue = (metric: Metric): string => {
    if (metric.format === 'currency') {
        const compactValue = new Intl.NumberFormat('id-ID', {
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(Number(metric.value ?? 0));

        return `Rp${compactValue}`;
    }

    if (metric.format === 'percentage') {
        return `${new Intl.NumberFormat('id-ID').format(Number(metric.value ?? 0))}%`;
    }

    return new Intl.NumberFormat('id-ID').format(Number(metric.value ?? 0));
};

const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const statusClasses = (status: string): string => {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus.includes('sandar') || normalizedStatus.includes('selesai') || normalizedStatus.includes('lunas')) {
        return 'bg-[#DCF7E8] text-[#087443] dark:bg-emerald-950/55 dark:text-emerald-300';
    }

    if (normalizedStatus.includes('labuh') || normalizedStatus.includes('menunggu')) {
        return 'bg-[#FFF0CC] text-[#A65300] dark:bg-amber-950/55 dark:text-amber-300';
    }

    if (normalizedStatus.includes('tolak') || normalizedStatus.includes('terlambat')) {
        return 'bg-[#FFE7EC] text-[#C62840] dark:bg-rose-950/55 dark:text-rose-300';
    }

    if (normalizedStatus.includes('berangkat')) {
        return 'bg-[#EFE7FF] text-[#6840BB] dark:bg-violet-950/55 dark:text-violet-300';
    }

    return 'bg-[#E0F0FF] text-[#0057D9] dark:bg-blue-950/55 dark:text-blue-300';
};

function MobileSection({
    icon: Icon,
    title,
    subtitle,
    href,
    linkLabel,
    children,
}: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    href: string;
    linkLabel: string;
    children: ReactNode;
}) {
    return (
        <section>
            <header className="flex items-start justify-between gap-3 border-b border-[#E5EEF7] px-0.5 pb-3 dark:border-[#1E3A5F]">
                <div className="flex min-w-0 items-start gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                        <Icon aria-hidden="true" className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-balance text-[13px] font-extrabold leading-5 text-[#0B1F63] dark:text-white">
                            {title}
                        </h2>
                        <p className="text-pretty text-[10px] leading-4 text-[#52658E] dark:text-[#9FB0C6]">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <Link
                    href={href}
                    prefetch
                    className="inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#60A5FA] dark:hover:bg-[#132847]"
                >
                    {linkLabel}
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
            </header>
            <div className="pt-2.5">{children}</div>
        </section>
    );
}

function EmptyState({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-28 items-center justify-center px-5 text-center">
            <div>
                <CheckCircle2 aria-hidden="true" className="mx-auto size-7 text-[#087443] dark:text-emerald-300" />
                <p className="mt-2 text-pretty text-xs font-bold text-[#0B1F63] dark:text-white">{children}</p>
            </div>
        </div>
    );
}

function OperationalSection({
    headingId,
    icon: Icon,
    title,
    href,
    children,
}: {
    headingId: string;
    icon: LucideIcon;
    title: string;
    href: string;
    children: ReactNode;
}) {
    return (
        <section
            aria-labelledby={headingId}
            className="overflow-hidden rounded-2xl border border-[#DCEAF8] bg-white shadow-sm dark:border-[#1E3A5F] dark:bg-[#10243E]"
        >
            <header className="flex min-h-12 items-center justify-between gap-3 border-b border-[#E5EEF7] px-3 dark:border-[#1E3A5F]">
                <div className="flex min-w-0 items-center gap-2">
                    <Icon aria-hidden="true" className="size-[18px] shrink-0 text-[#0B1F63] dark:text-[#60A5FA]" />
                    <h2 id={headingId} className="truncate text-balance text-[13px] font-extrabold text-[#0B1F63] dark:text-white">
                        {title}
                    </h2>
                </div>
                <Link
                    href={href}
                    prefetch
                    className="inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-1 rounded-lg px-1.5 text-[10px] font-bold text-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#60A5FA] dark:hover:bg-[#132847]"
                >
                    Lihat Semua
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
            </header>
            <div className="p-1.5">{children}</div>
        </section>
    );
}

function OperationalShipList({ ships, limit = 5 }: { ships: any[]; limit?: number }) {
    if (!ships.length) {
        return <EmptyState>Tidak ada kapal yang perlu dipantau</EmptyState>;
    }

    return (
        <div className="grid gap-1.5">
            {ships.slice(0, limit).map((shipItem) => (
                <Link
                    key={shipItem.id}
                    href={`/vessels/${shipItem.ship_id}?visit=${shipItem.id}`}
                    aria-label={`Buka detail ${shipItem.name}, status ${shipItem.status}`}
                    className="group grid min-h-[76px] touch-manipulation grid-cols-[60px_minmax(0,1fr)_28px] items-center gap-2 rounded-xl border border-[#DCEAF8] bg-white p-2 hover:border-[#8EC5F5] hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:hover:border-[#2E5A87] dark:hover:bg-[#132847]"
                >
                    <ShipImage
                        src={shipItem.image_url}
                        width="60"
                        height="60"
                        loading="lazy"
                        alt={`Foto ${shipItem.name}`}
                        className="size-[60px] rounded-xl border border-[#DCEAF8] object-cover dark:border-[#1E3A5F]"
                    />

                    <span className="min-w-0 self-stretch py-0.5">
                        <span className="flex min-w-0 items-start gap-1.5">
                            <span className="line-clamp-2 min-w-0 flex-1 break-words text-[11px] font-extrabold leading-4 text-[#0B1F63] group-hover:text-[#0060F4] dark:text-white">
                                {shipItem.name}
                            </span>
                            <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${statusClasses(shipItem.status)}`}>
                                {shipItem.status}
                            </span>
                        </span>
                        <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-[#52658E] dark:text-[#9FB0C6]">
                            <span className="flex min-w-0 items-center gap-1 tabular-nums">
                                <CalendarDays aria-hidden="true" className="size-3 shrink-0 text-[#0060F4]" />
                                <span className="whitespace-nowrap">ETA {shipItem.eta}</span>
                            </span>
                            <span className="flex min-w-0 items-center gap-1">
                                <MapPin aria-hidden="true" className="size-3 shrink-0 text-[#0060F4]" />
                                <span className="line-clamp-1 break-words">{shipItem.port}</span>
                            </span>
                        </span>
                    </span>

                    <ChevronRight aria-hidden="true" className="size-5 justify-self-center text-[#0B1F63] group-hover:text-[#0060F4] dark:text-[#8BA4C1]" />
                </Link>
            ))}
        </div>
    );
}

function ShipList({ ships, limit = 5 }: { ships: any[]; limit?: number }) {
    if (!ships.length) {
        return <EmptyState>Tidak ada kapal yang perlu dipantau</EmptyState>;
    }

    return (
        <div className="grid gap-2">
            {ships.slice(0, limit).map((shipItem) => (
                <Link
                    key={shipItem.id}
                    href={`/vessels/${shipItem.ship_id}?visit=${shipItem.id}`}
                    aria-label={`Buka detail ${shipItem.name}, status ${shipItem.status}`}
                    className="group grid min-h-[88px] touch-manipulation grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-[#DCEAF8] bg-white p-2.5 shadow-sm hover:border-[#8EC5F5] hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#10243E] dark:hover:border-[#2E5A87] dark:hover:bg-[#132847]"
                >
                    <ShipImage
                        src={shipItem.image_url}
                        width="64"
                        height="64"
                        loading="lazy"
                        alt={`Foto ${shipItem.name}`}
                        className="size-16 rounded-xl border border-[#DCEAF8] object-cover dark:border-[#1E3A5F]"
                    />

                    <span className="min-w-0">
                        <span className="block truncate text-[11px] font-extrabold text-[#0B1F63] group-hover:text-[#0060F4] dark:text-white">
                            {shipItem.name}
                        </span>
                        <span className="mt-1 flex min-w-0 items-center gap-1 text-[9px] text-[#52658E] dark:text-[#9FB0C6]">
                            <MapPin aria-hidden="true" className="size-3 shrink-0 text-[#0060F4]" />
                            <span className="truncate">{shipItem.port}</span>
                        </span>
                        <span className="mt-1 flex min-w-0 items-center gap-1 text-[9px] tabular-nums text-[#7C91AC] dark:text-[#9FB0C6]">
                            <CalendarDays aria-hidden="true" className="size-3 shrink-0" />
                            <span className="truncate">{shipItem.eta}</span>
                        </span>
                    </span>

                    <span className="flex flex-col items-end justify-center gap-2 self-stretch">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${statusClasses(shipItem.status)}`}>
                            {shipItem.status}
                        </span>
                        <ArrowRight aria-hidden="true" className="size-3.5 text-[#8BA4C1] group-hover:text-[#0060F4]" />
                    </span>
                </Link>
            ))}
        </div>
    );
}

const formatActivityTime = (value?: string | null): string => {
    if (!value) {
        return '—';
    }

    const [hour = '', minute = ''] = String(value).split(':');
    const parsedTime = new Date(2000, 0, 1, Number(hour), Number(minute));

    if (!hour || !minute || Number.isNaN(parsedTime.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(parsedTime);
};

function OperationalActivityTimeline({ activities }: { activities: any[] }) {
    if (!activities.length) {
        return <EmptyState>Belum ada pembaruan lapangan</EmptyState>;
    }

    const visibleActivities = activities.slice(0, 3);

    return (
        <div className="divide-y divide-[#EAF1F8] dark:divide-[#1E3A5F]">
            {visibleActivities.map((activityItem, index) => {
                const isShipActivity = activityItem.type === 'ship';
                const TimelineIcon = isShipActivity ? Ship : FileText;

                return (
                    <Link
                        key={activityItem.id}
                        href={activityItem.link || '/operations'}
                        className="group grid min-h-[66px] touch-manipulation grid-cols-[38px_34px_minmax(0,1fr)_28px] items-stretch gap-1.5 rounded-lg px-1 py-1.5 hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:hover:bg-[#132847]"
                    >
                        <span className="self-start pt-2 text-right text-[9px] font-semibold tabular-nums text-[#52658E] dark:text-[#9FB0C6]">
                            {formatActivityTime(activityItem.time)}
                        </span>
                        <span className="relative flex min-h-[54px] items-start justify-center pt-1">
                            {index < visibleActivities.length - 1 && (
                                <span aria-hidden="true" className="absolute bottom-[-13px] left-1/2 top-9 w-px -translate-x-1/2 bg-[#B8DCFF] dark:bg-[#2E5A87]" />
                            )}
                            <span className={`relative z-10 flex size-8 items-center justify-center rounded-full text-white ${isShipActivity ? 'bg-[#0060F4]' : 'bg-[#16A36A]'}`}>
                                <TimelineIcon aria-hidden="true" className="size-4" />
                            </span>
                        </span>
                        <span className="min-w-0 self-center py-1">
                            <span className="line-clamp-2 break-words text-[10px] font-extrabold leading-4 text-[#0B1F63] group-hover:text-[#0060F4] dark:text-white">
                                {activityItem.title}
                            </span>
                            <span className="line-clamp-2 break-words text-[9px] leading-3.5 text-[#52658E] dark:text-[#9FB0C6]">
                                {activityItem.subtitle}
                            </span>
                        </span>
                        <ChevronRight aria-hidden="true" className="size-5 self-center justify-self-center text-[#0B1F63] group-hover:text-[#0060F4] dark:text-[#8BA4C1]" />
                    </Link>
                );
            })}
        </div>
    );
}

function PriorityList({ priorities }: { priorities: Priority[] }) {
    return (
        <div className="grid gap-2">
            {priorities.map((priority) => (
                <Link
                    key={priority.title}
                    href={priority.href}
                    className={`grid min-h-16 touch-manipulation grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border px-3 py-2.5 hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:hover:brightness-110 ${priorityClasses[priority.tone]}`}
                >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-white/85 text-sm font-black tabular-nums shadow-sm dark:bg-black/15">
                        {new Intl.NumberFormat('id-ID').format(priority.count)}
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-[11px] font-extrabold">{priority.title}</span>
                        <span className="mt-0.5 block truncate text-[9px] opacity-80">{priority.description}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
            ))}
        </div>
    );
}

function RequestList({ requests }: { requests: any[] }) {
    if (!requests.length) {
        return <EmptyState>Belum ada pengajuan terbaru</EmptyState>;
    }

    return (
        <div className="grid gap-2">
            {requests.slice(0, 4).map((requestItem) => (
                <Link
                    key={requestItem.id}
                    href={`/requests/${requestItem.id}`}
                    className="grid min-h-16 touch-manipulation grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#DCEAF8] bg-white px-3 py-2.5 shadow-sm hover:border-[#8EC5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#10243E]"
                >
                    <span className="min-w-0">
                        <span className="block truncate text-[11px] font-extrabold text-[#0B1F63] dark:text-white">
                            {requestItem.request_number} · {requestItem.ship_name}
                        </span>
                        <span className="mt-1 block truncate text-[9px] text-[#52658E] dark:text-[#9FB0C6]">
                            {requestItem.items_count} kebutuhan · {requestItem.date}
                        </span>
                    </span>
                    <span className="flex flex-col items-end gap-1.5">
                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusClasses(requestItem.status)}`}>
                            {requestItem.status}
                        </span>
                        <span className="text-[9px] font-bold tabular-nums text-[#0B1F63] dark:text-white">
                            {formatCurrency(requestItem.estimated_cost)}
                        </span>
                    </span>
                </Link>
            ))}
        </div>
    );
}

function ApprovalList({ approvals }: { approvals: any[] }) {
    if (!approvals.length) {
        return <EmptyState>Semua pengajuan sudah diputuskan</EmptyState>;
    }

    return (
        <div className="grid gap-2">
            {approvals.slice(0, 4).map((approval) => (
                <Link
                    key={approval.id}
                    href="/approvals"
                    className="grid min-h-[72px] touch-manipulation grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-[#F6DFA7] bg-[#FFFBF1] px-3 py-2.5 hover:border-[#E9C96E] hover:bg-[#FFF7E1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#6B4D16] dark:bg-[#2E2412] dark:hover:bg-[#3A2B12]"
                >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-white text-[#A65300] shadow-sm dark:bg-amber-950/55 dark:text-amber-300">
                        <FileClock aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-[11px] font-extrabold text-[#0B1F63] dark:text-white">
                            {approval.request_number} · {approval.ship_name}
                        </span>
                        <span className="mt-1 block truncate text-[9px] text-[#52658E] dark:text-[#9FB0C6]">
                            {approval.creator_name} · {approval.date}
                        </span>
                    </span>
                    <span className="text-right">
                        <span className="block text-[10px] font-black tabular-nums text-[#0B1F63] dark:text-white">
                            {formatCurrency(approval.estimated_cost)}
                        </span>
                        <span className="mt-1 block text-[9px] font-bold text-[#A65300] dark:text-amber-300">Putuskan</span>
                    </span>
                </Link>
            ))}
        </div>
    );
}

function InvoiceList({ invoices }: { invoices: any[] }) {
    if (!invoices.length) {
        return <EmptyState>Belum ada tagihan klien</EmptyState>;
    }

    return (
        <div className="divide-y divide-[#EAF1F8] dark:divide-[#1E3A5F]">
            {invoices.slice(0, 4).map((invoice) => (
                <Link
                    key={invoice.id}
                    href="/receivables"
                    className="grid min-h-[66px] touch-manipulation grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 px-1 py-2.5 hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:hover:bg-[#10243E]"
                >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                        <ReceiptText aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-[11px] font-extrabold text-[#0B1F63] dark:text-white">
                            {invoice.invoice_number}
                        </span>
                        <span className="mt-1 block truncate text-[9px] text-[#52658E] dark:text-[#9FB0C6]">
                            {invoice.company_name} · {invoice.ship_name}
                        </span>
                    </span>
                    <span className="text-right">
                        <span className="block text-[10px] font-black tabular-nums text-[#0B1F63] dark:text-white">
                            {formatCurrency(invoice.outstanding_amount)}
                        </span>
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${invoice.is_overdue ? 'bg-[#FFE7EC] text-[#C62840]' : 'bg-[#FFF0CC] text-[#A65300]'}`}>
                            {invoice.is_overdue ? 'Jatuh tempo' : 'Belum lunas'}
                        </span>
                    </span>
                </Link>
            ))}
        </div>
    );
}

function QuickActions({ actions, isReadOnly }: { actions: QuickAction[]; isReadOnly: boolean }) {
    return (
        <section>
            <header className="border-b border-[#E5EEF7] px-0.5 pb-3 dark:border-[#1E3A5F]">
                <h2 className="text-[13px] font-extrabold text-[#0B1F63] dark:text-white">
                    {isReadOnly ? 'Akses pemantauan' : 'Akses cepat'}
                </h2>
                <p className="mt-0.5 text-[10px] text-[#52658E] dark:text-[#9FB0C6]">
                    {isReadOnly ? 'Seluruh menu Owner bersifat lihat saja' : 'Menu utama sesuai tanggung jawab Anda'}
                </p>
            </header>
            <div className="grid grid-cols-2 gap-2 pt-2.5">
                {actions.map((action) => {
                    const Icon = quickActionIcons[action.icon] ?? FileText;

                    return (
                        <Link
                            key={action.label}
                            href={action.href}
                            prefetch
                            className="min-h-24 touch-manipulation rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] p-3 hover:border-[#9CC9F5] hover:bg-[#EAF4FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#10243E] dark:hover:bg-[#132847]"
                        >
                            <span className="flex size-8 items-center justify-center rounded-lg bg-[#0060F4] text-white">
                                <Icon aria-hidden="true" className="size-4" />
                            </span>
                            <span className="mt-2 block text-[11px] font-extrabold text-[#0B1F63] dark:text-white">{action.label}</span>
                            <span className="mt-0.5 block line-clamp-2 text-[9px] leading-3.5 text-[#52658E] dark:text-[#9FB0C6]">
                                {action.description}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

export default function RoleDashboardMobileView({
    dashboard,
    userName,
    liveDate,
    liveTime,
    activeShips,
    recentActivities,
    latestRequests,
    needsToday,
    pendingApprovals,
    recentInvoices,
    receivablesOverview,
}: RoleDashboardMobileViewProps) {
    const role = rolePresentation[dashboard.role];
    const RoleIcon = role.icon;
    const requestMetric = dashboard.metrics.find((metric) => metric.key === 'requests');
    const heroImage = dashboard.role === 'operasional' ? '/images/prima-banner.jpg' : '/images/background-kapal.png';

    return (
        <div className="bg-white dark:bg-[#0C1D36] md:hidden">
            <section className="mobile-photo-copy relative flex min-h-[330px] flex-col justify-between overflow-hidden bg-[#8FCDF4] px-4 pb-14 pt-20 text-white">
                <img
                    src={heroImage}
                    alt=""
                    aria-hidden="true"
                    width="1280"
                    height="720"
                    fetchPriority="high"
                    className="absolute inset-0 size-full object-cover object-center"
                />
                <div className="relative z-10 flex items-start justify-between gap-3">
                    {/* <div className="min-w-0">
                        <p className="text-xs font-semibold text-white">Selamat datang,</p>
                        <h1 className="mt-0.5 truncate text-balance text-[28px] font-black leading-tight text-white">
                            {userName}
                        </h1>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-white">
                            <RoleIcon aria-hidden="true" className="size-3.5 text-[#38BDF8]" />
                            {role.label}
                        </p>
                        {dashboard.is_read_only && (
                            <span className="mt-2 inline-flex rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur-sm">
                                Mode lihat saja · tanpa aksi proses
                            </span>
                        )}
                    </div>
                    <p className="flex max-w-[9.5rem] items-start justify-end gap-1 text-right text-[10px] font-semibold leading-4 text-white">
                        <CalendarDays aria-hidden="true" className="mt-0.5 size-3 shrink-0 text-[#38BDF8]" />
                        <span>{liveDate}</span>
                    </p> */}
                </div>

                <div className="relative z-10 mt-auto">
                    {/* <p className="max-w-sm text-pretty text-xs font-medium italic leading-5 text-white">“{dashboard.subtitle}”</p> */}
                    {/* <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/20 pt-4">
                        <div>
                            <p className="text-[10px] font-semibold text-white/70">Waktu sekarang</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xl font-black tabular-nums text-white">
                                <Clock aria-hidden="true" className="size-4 text-[#38BDF8]" />
                                {liveTime}
                            </p>
                        </div>
                        <Link
                            href={dashboard.primary_action.href}
                            prefetch
                            className="inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-[11px] font-extrabold text-[#082870] shadow-sm hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            {dashboard.primary_action.label}
                            <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                    </div> */}
                </div>
            </section>

            <div className="relative z-10 -mt-8 space-y-4 rounded-t-[28px] bg-white px-3.5 pb-5 pt-4 dark:bg-[#0C1D36]">
                <section aria-labelledby="mobile-summary-heading" className="rounded-2xl bg-[#082870] p-3 shadow-sm dark:bg-[#071A33]">
                    <div className="mb-3 flex items-center gap-2 px-0.5 text-white">
                        <RoleIcon aria-hidden="true" className="size-4 text-[#38BDF8]" />
                        <h2 id="mobile-summary-heading" className="text-balance text-sm font-extrabold">{role.summary}</h2>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                        {dashboard.metrics.slice(0, 4).map((metric, index) => {
                            const presentation = metricPresentation[metric.key] ?? {
                                href: '/dashboard',
                                icon: FileText,
                            };
                            const tone = summaryTones[index] ?? summaryTones[0];
                            const MetricIcon = presentation.icon;

                            return (
                                <Link
                                    key={metric.key}
                                    href={presentation.href}
                                    prefetch
                                    aria-label={`${metric.label}: ${formatMetricValue(metric)}`}
                                    className={`flex min-h-[104px] min-w-0 touch-manipulation flex-col items-center justify-center rounded-xl border px-1.5 py-2 text-center shadow-sm hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${tone.surfaceClass}`}
                                >
                                    <span className={`flex size-9 items-center justify-center rounded-lg ${tone.iconClass}`}>
                                        <MetricIcon aria-hidden="true" className="size-5" />
                                    </span>
                                    <span className={`mt-1.5 max-w-full truncate text-base font-black leading-none tabular-nums ${tone.valueClass}`}>
                                        {formatMetricValue(metric)}
                                    </span>
                                    <span className={`mt-1 line-clamp-2 text-[9px] font-bold leading-3 ${tone.labelClass}`}>
                                        {metric.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {dashboard.role !== 'operasional' && receivablesOverview && (
                    <ReceivablesOverview data={receivablesOverview} headingId="mobile-receivables-overview-title" />
                )}

                {dashboard.role === 'operasional' && (
                    <>
                        <OperationalSection headingId="operational-ships-heading" icon={Ship} title="Kapal Hari Ini" href="/vessels">
                            <OperationalShipList ships={activeShips} />
                        </OperationalSection>
                        <OperationalSection headingId="operational-activities-heading" icon={Clock} title="Aktivitas Terbaru" href="/operations">
                            <OperationalActivityTimeline activities={recentActivities} />
                        </OperationalSection>
                        {Number(requestMetric?.value ?? 0) > 0 && (
                            <section className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#B8DCFF] bg-[#EAF4FF] p-3 dark:border-[#174B7B] dark:bg-[#0A2340]">
                                <span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#0060F4] shadow-sm dark:bg-[#132847] dark:text-[#60A5FA]">
                                    <ClipboardList aria-hidden="true" className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-balance text-[11px] font-extrabold text-[#0B1F63] dark:text-white">
                                        {new Intl.NumberFormat('id-ID').format(Number(requestMetric?.value ?? 0))} pengajuan masih diproses
                                    </h2>
                                    <p className="mt-0.5 text-pretty text-[9px] leading-3.5 text-[#52658E] dark:text-[#9FB0C6]">Pantau status dan tindak lanjut pengajuan Anda.</p>
                                </div>
                                <Link href="/requests" prefetch aria-label="Lihat pengajuan yang masih diproses" className="flex size-11 touch-manipulation items-center justify-center rounded-xl bg-[#0060F4] text-white hover:bg-[#082870] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]">
                                    <ArrowRight aria-hidden="true" className="size-4" />
                                </Link>
                            </section>
                        )}
                    </>
                )}

                {dashboard.role === 'admin' && (
                    <>
                        <MobileSection icon={ClipboardCheck} title="Prioritas administrasi" subtitle="Pekerjaan yang perlu segera ditindaklanjuti" href="/work-orders" linkLabel="Buka alur">
                            <PriorityList priorities={dashboard.priorities} />
                        </MobileSection>
                        <MobileSection icon={ClipboardList} title="Pengajuan terbaru" subtitle="Kebutuhan kapal yang baru masuk" href="/requests" linkLabel="Lihat semua">
                            <RequestList requests={latestRequests} />
                        </MobileSection>
                        {needsToday.length > 0 && (
                            <MobileSection icon={PackageCheck} title="Kebutuhan hari ini" subtitle={`${needsToday.length} kebutuhan terjadwal hari ini`} href="/needs" linkLabel="Buka kebutuhan">
                                <div className="divide-y divide-[#EAF1F8] dark:divide-[#1E3A5F]">
                                    {needsToday.slice(0, 3).map((need, index) => (
                                        <Link key={`${need.pengajuan}-${need.kebutuhan}-${index}`} href="/needs" className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]">
                                            <span className="min-w-0"><span className="block truncate text-[11px] font-extrabold text-[#0B1F63] dark:text-white">{need.kapal}</span><span className="mt-0.5 block truncate text-[9px] text-[#52658E] dark:text-[#9FB0C6]">{need.kebutuhan} · {need.jumlah}</span></span>
                                            <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusClasses(need.status)}`}>{need.status}</span>
                                        </Link>
                                    ))}
                                </div>
                            </MobileSection>
                        )}
                        <QuickActions actions={dashboard.quick_actions} isReadOnly={false} />
                    </>
                )}

                {dashboard.role === 'direktur' && (
                    <>
                        <MobileSection icon={ClipboardCheck} title="Antrean keputusan" subtitle="Pengajuan yang memerlukan keputusan Direktur" href="/approvals" linkLabel="Buka approval">
                            <ApprovalList approvals={pendingApprovals} />
                        </MobileSection>
                        <MobileSection icon={Landmark} title="Prioritas pengawasan" subtitle="Tahapan pendanaan dan Kopra yang perlu diperhatikan" href="/funding" linkLabel="Lihat pendanaan">
                            <PriorityList priorities={dashboard.priorities} />
                        </MobileSection>
                        <QuickActions actions={dashboard.quick_actions} isReadOnly={false} />
                    </>
                )}

                {dashboard.role === 'owner' && (
                    <>
                        <MobileSection icon={Building2} title="Perlu dipantau" subtitle="Ringkasan strategis tanpa aksi pemrosesan" href="/reports" linkLabel="Lihat laporan">
                            <PriorityList priorities={dashboard.priorities} />
                        </MobileSection>
                        <MobileSection icon={ReceiptText} title="Tagihan klien terbaru" subtitle="Saldo invoice yang masih perlu dipantau" href="/receivables" linkLabel="Lihat piutang">
                            <InvoiceList invoices={recentInvoices} />
                        </MobileSection>
                        <MobileSection icon={Ship} title="Kapal aktif" subtitle="Kunjungan yang sedang berjalan" href="/vessels" linkLabel="Lihat kapal">
                            <ShipList ships={activeShips} limit={3} />
                        </MobileSection>
                        <QuickActions actions={dashboard.quick_actions} isReadOnly />
                    </>
                )}
            </div>
        </div>
    );
}
