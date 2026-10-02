import DashboardAnalytics, { type DashboardChartData } from '@/Components/dashboard/DashboardAnalytics';
import { Link } from '@inertiajs/react';
import {
    Activity,
    Anchor,
    ArrowRight,
    Banknote,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    FileCheck2,
    FileClock,
    FileText,
    Gauge,
    HandCoins,
    Landmark,
    PackageCheck,
    ReceiptText,
    Ship,
    TrendingUp,
    Users,
    WalletCards,
    type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

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

interface PipelineItem {
    label: string;
    value: number;
    href: string;
}

export interface RoleDashboardData {
    role: DashboardRole;
    eyebrow: string;
    title: string;
    subtitle: string;
    primary_action: { label: string; href: string };
    metrics: Metric[];
    priorities: Priority[];
    quick_actions: QuickAction[];
    pipeline: PipelineItem[];
    charts: DashboardChartData[];
}

interface RoleDashboardViewProps {
    dashboard: RoleDashboardData;
    userName: string;
    liveDate: string;
    liveTime: string;
    latestRequests: any[];
    needsToday: any[];
    activeShips: any[];
    recentActivities: any[];
    pendingApprovals: any[];
    financialOverview?: any;
}

const roleMeta: Record<DashboardRole, { label: string; icon: LucideIcon }> = {
    operasional: { label: 'Pusat Kendali Operasional Lapangan', icon: Anchor },
    admin: { label: 'Pusat Kendali Administrasi & Operasional', icon: ClipboardCheck },
    direktur: { label: 'Pusat Persetujuan & Pengawasan', icon: Landmark },
    owner: { label: 'Ringkasan Strategis Perusahaan', icon: Building2 },
};

const metricIcons: Record<string, LucideIcon> = {
    active_ships: Ship,
    activities: Activity,
    needs: PackageCheck,
    requests: ClipboardList,
    work_orders: FileText,
    vendor_invoices: ReceiptText,
    approvals: ClipboardCheck,
    kopra: Landmark,
    invoiced: ReceiptText,
    collected: TrendingUp,
    receivables: HandCoins,
};

const actionIcons: Record<string, LucideIcon> = {
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
    completion: FileCheck2,
};

const priorityStyles: Record<PriorityTone, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    red: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
};

const formatValue = (value: number, format: MetricFormat): string => {
    if (format === 'currency') {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(Number(value ?? 0));
    }

    if (format === 'percentage') {
        return `${new Intl.NumberFormat('id-ID').format(Number(value ?? 0))}%`;
    }

    return new Intl.NumberFormat('id-ID').format(Number(value ?? 0));
};

const statusStyle = (status: string): string => {
    const normalized = status.toLowerCase();

    if (normalized.includes('selesai') || normalized.includes('lunas') || normalized.includes('sandar')) {
        return 'bg-[#DCF7E8] text-[#087443] dark:bg-emerald-950/45 dark:text-emerald-300';
    }

    if (normalized.includes('menunggu') || normalized.includes('datang') || normalized.includes('labuh')) {
        return 'bg-[#FFF0CC] text-[#A65300] dark:bg-amber-950/45 dark:text-amber-300';
    }

    if (normalized.includes('tolak') || normalized.includes('terlambat')) {
        return 'bg-[#FFE7EC] text-[#C62840] dark:bg-rose-950/45 dark:text-rose-300';
    }

    return 'bg-[#E0F0FF] text-[#0057D9] dark:bg-blue-950/45 dark:text-blue-300';
};

function StatusBadge({ status }: { status: string }) {
    return <span className={`inline-flex max-w-full whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${statusStyle(status)}`}>{status}</span>;
}

function EmptyState({ title, href, action }: { title: string; href: string; action: string }) {
    return (
        <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#C7DCF0] bg-[#F8FBFF] px-5 text-center dark:border-[#26486D] dark:bg-[#091A2E]">
            <CheckCircle2 aria-hidden="true" className="size-7 text-emerald-600 dark:text-emerald-400" />
            <p className="mt-2 text-pretty text-xs font-bold text-[#0B1F63] dark:text-white">{title}</p>
            <Link href={href} className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-[11px] font-bold text-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#60A5FA] dark:hover:bg-[#132847]">
                {action}<ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
        </div>
    );
}

function Panel({ title, subtitle, href, linkLabel = 'Lihat semua', children, className = '' }: { title: string; subtitle?: string; href?: string; linkLabel?: string; children: ReactNode; className?: string }) {
    return (
        <section className={`min-w-0 rounded-2xl border border-[#DCEAF8] bg-white shadow-sm dark:border-[#1E3A5F] dark:bg-[#0C1D36] ${className}`}>
            <header className="flex min-h-14 items-start justify-between gap-3 border-b border-[#E5EEF7] px-4 py-3 dark:border-[#1E3A5F]">
                <div className="min-w-0">
                    <h2 className="text-balance text-sm font-extrabold text-[#0B1F63] sm:text-base dark:text-white">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-pretty text-[10px] leading-4 text-[#52658E] dark:text-[#9FB0C6]">{subtitle}</p>}
                </div>
                {href && (
                    <Link href={href} prefetch className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#60A5FA] dark:hover:bg-[#132847]">
                        {linkLabel}<ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                )}
            </header>
            <div className="p-3 sm:p-4">{children}</div>
        </section>
    );
}

function LatestRequests({ requests }: { requests: any[] }) {
    if (!requests.length) {
        return <EmptyState title="Belum ada pengajuan terbaru" href="/requests" action="Buka pengajuan" />;
    }

    const items = requests.slice(0, 5);

    return (
        <>
            <div className="space-y-2 md:hidden">
                {items.map((request) => (
                    <Link key={request.id} href={`/requests/${request.id}`} className="block rounded-xl border border-[#E5EEF7] p-3 hover:border-[#9CC9F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F]">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0"><p className="truncate text-xs font-extrabold text-[#0B1F63] dark:text-white">{request.request_number}</p><p className="mt-0.5 truncate text-[11px] text-[#52658E] dark:text-[#9FB0C6]">{request.ship_name} · {request.items_count} kebutuhan</p></div>
                            <StatusBadge status={request.status} />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-[#52658E] dark:text-[#9FB0C6]"><span>{request.date} · {request.time}</span><span className="font-bold tabular-nums text-[#0B1F63] dark:text-white">{formatValue(request.estimated_cost, 'currency')}</span></div>
                    </Link>
                ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[660px] text-left text-[10px]">
                    <thead className="bg-[#F3F8FD] text-[#52658E] dark:bg-[#10243E] dark:text-[#9FB0C6]"><tr><th className="rounded-l-lg px-3 py-2 font-bold">No. Pengajuan</th><th className="px-3 py-2 font-bold">Tanggal</th><th className="px-3 py-2 font-bold">Kapal</th><th className="px-3 py-2 font-bold">Jumlah</th><th className="px-3 py-2 font-bold">Nilai Estimasi</th><th className="rounded-r-lg px-3 py-2 font-bold">Status</th></tr></thead>
                    <tbody className="divide-y divide-[#EAF1F8] dark:divide-[#1E3A5F]">
                        {items.map((request) => (
                            <tr key={request.id} className="hover:bg-[#F8FBFF] dark:hover:bg-[#10243E]">
                                <td className="px-3 py-2.5"><Link href={`/requests/${request.id}`} className="font-extrabold text-[#0060F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]">{request.request_number}</Link></td>
                                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#52658E] dark:text-[#9FB0C6]">{request.date}<br />{request.time}</td>
                                <td className="max-w-40 px-3 py-2.5 font-semibold text-[#0B1F63] dark:text-white">{request.ship_name}</td>
                                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#52658E] dark:text-[#9FB0C6]">{request.items_count} kebutuhan</td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-bold tabular-nums text-[#0B1F63] dark:text-white">{formatValue(request.estimated_cost, 'currency')}</td>
                                <td className="px-3 py-2.5"><StatusBadge status={request.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function NeedsToday({ needs }: { needs: any[] }) {
    if (!needs.length) {
        return <EmptyState title="Tidak ada kebutuhan kapal untuk hari ini" href="/needs" action="Buka kebutuhan" />;
    }

    return (
        <div className="space-y-2">
            {needs.slice(0, 6).map((need, index) => (
                <Link key={`${need.pengajuan}-${need.kebutuhan}-${index}`} href="/needs" className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#E5EEF7] px-3 py-2 hover:border-[#9CC9F5] hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#10243E]">
                    <span className="min-w-0"><span className="block truncate text-[11px] font-extrabold text-[#0B1F63] dark:text-white">{need.kapal}</span><span className="mt-0.5 block truncate text-[10px] text-[#52658E] dark:text-[#9FB0C6]">{need.kebutuhan} · {need.jumlah} · {need.jadwal}</span></span>
                    <span className="flex flex-col items-end gap-1"><StatusBadge status={need.status} /><span className="text-[9px] font-bold text-[#0060F4] dark:text-[#60A5FA]">{need.pengajuan}</span></span>
                </Link>
            ))}
        </div>
    );
}

function ActiveShips({ ships }: { ships: any[] }) {
    if (!ships.length) {
        return <EmptyState title="Tidak ada kapal yang memerlukan pemantauan" href="/vessels" action="Buka daftar kapal" />;
    }

    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {ships.slice(0, 6).map((shipItem) => (
                <Link key={shipItem.id} href={`/vessels/${shipItem.ship_id}?visit=${shipItem.id}`} className="group grid min-h-[74px] grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#E5EEF7] p-2.5 hover:border-[#9CC9F5] hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#10243E]">
                    {shipItem.image_url ? <img src={shipItem.image_url} width="54" height="54" loading="lazy" alt="" className="size-[54px] rounded-lg object-cover" /> : <span className="flex size-[54px] items-center justify-center rounded-lg bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]"><Ship aria-hidden="true" className="size-6" /></span>}
                    <span className="min-w-0"><span className="block truncate text-[11px] font-extrabold text-[#0B1F63] dark:text-white">{shipItem.name}</span><span className="mt-1 block truncate text-[10px] text-[#52658E] dark:text-[#9FB0C6]">{shipItem.port}</span><span className="mt-1 block truncate text-[9px] tabular-nums text-[#7C91AC]">{shipItem.eta}</span></span>
                    <span className="flex flex-col items-end gap-1"><StatusBadge status={shipItem.status} /><ArrowRight aria-hidden="true" className="size-3.5 text-[#8BA4C1] group-hover:text-[#0060F4]" /></span>
                </Link>
            ))}
        </div>
    );
}

function Approvals({ approvals }: { approvals: any[] }) {
    if (!approvals.length) {
        return <EmptyState title="Semua pengajuan sudah diputuskan" href="/approvals" action="Buka meja approval" />;
    }

    return (
        <div className="space-y-2">
            {approvals.slice(0, 6).map((approval) => (
                <Link key={approval.id} href="/approvals" className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#E5EEF7] px-3 py-2.5 hover:border-[#9CC9F5] hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#10243E]">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-[#FFF0CC] text-[#A65300] dark:bg-amber-950/45 dark:text-amber-300"><FileClock aria-hidden="true" className="size-[18px]" /></span>
                    <span className="min-w-0"><span className="block truncate text-[11px] font-extrabold text-[#0B1F63] dark:text-white">{approval.request_number} · {approval.ship_name}</span><span className="mt-0.5 block truncate text-[10px] text-[#52658E] dark:text-[#9FB0C6]">{approval.creator_name} · {approval.date}</span></span>
                    <span className="text-right"><span className="block whitespace-nowrap text-[11px] font-black tabular-nums text-[#0B1F63] dark:text-white">{formatValue(approval.estimated_cost, 'currency')}</span><span className="mt-1 block text-[9px] font-bold text-[#A65300] dark:text-amber-300">Perlu keputusan</span></span>
                </Link>
            ))}
        </div>
    );
}

function RecentInvoices({ invoices }: { invoices: any[] }) {
    if (!invoices.length) {
        return <EmptyState title="Belum ada tagihan klien" href="/receivables" action="Buka piutang" />;
    }

    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {invoices.slice(0, 6).map((invoice) => (
                <Link key={invoice.id} href="/receivables" className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#E5EEF7] px-3 py-2.5 hover:border-[#9CC9F5] hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#10243E]">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]"><ReceiptText aria-hidden="true" className="size-[18px]" /></span>
                    <span className="min-w-0"><span className="block truncate text-[11px] font-extrabold text-[#0B1F63] dark:text-white">{invoice.invoice_number}</span><span className="mt-0.5 block truncate text-[10px] text-[#52658E] dark:text-[#9FB0C6]">{invoice.company_name} · {invoice.ship_name}</span></span>
                    <span className="text-right"><span className="block whitespace-nowrap text-[11px] font-black tabular-nums text-[#0B1F63] dark:text-white">{formatValue(invoice.outstanding_amount, 'currency')}</span><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${invoice.is_overdue ? 'bg-[#FFE7EC] text-[#C62840]' : 'bg-[#FFF0CC] text-[#A65300]'}`}>{invoice.is_overdue ? 'Jatuh tempo' : 'Belum lunas'}</span></span>
                </Link>
            ))}
        </div>
    );
}

function RecentActivities({ activities }: { activities: any[] }) {
    if (!activities.length) {
        return <EmptyState title="Belum ada pembaruan lapangan" href="/operations" action="Buka operasional" />;
    }

    return (
        <div className="grid gap-x-5 gap-y-1 lg:grid-cols-2">
            {activities.slice(0, 8).map((item) => (
                <Link key={item.id} href={item.link || '/operations'} className="group grid min-h-14 grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#EAF1F8] py-2 last:border-b-0 hover:text-[#0060F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] lg:[&:nth-last-child(-n+2)]:border-b-0 dark:border-[#1E3A5F]">
                    {item.photos?.[0] ? <img src={item.photos[0]} width="42" height="42" loading="lazy" alt="" className="size-[42px] rounded-lg object-cover" /> : <span className="flex size-[42px] items-center justify-center rounded-lg bg-[#DCF7E8] text-[#087443] dark:bg-emerald-950/45 dark:text-emerald-300"><Activity aria-hidden="true" className="size-[18px]" /></span>}
                    <span className="min-w-0"><span className="block truncate text-[11px] font-extrabold text-[#0B1F63] group-hover:text-[#0060F4] dark:text-white">{item.title}</span><span className="mt-0.5 block truncate text-[10px] text-[#52658E] dark:text-[#9FB0C6]">{item.subtitle}</span></span>
                    <span className="text-right text-[9px] tabular-nums text-[#7C91AC]"><span className="block">{item.time}</span><span className="mt-0.5 block">{item.activity_date}</span></span>
                </Link>
            ))}
        </div>
    );
}

function PriorityList({ priorities }: { priorities: Priority[] }) {
    return (
        <div className="space-y-2">
            {priorities.map((priority) => (
                <Link key={priority.title} href={priority.href} className={`grid min-h-14 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${priorityStyles[priority.tone]}`}>
                    <span className="flex size-9 items-center justify-center rounded-lg bg-white/80 text-sm font-black tabular-nums shadow-sm dark:bg-black/15">{new Intl.NumberFormat('id-ID').format(priority.count)}</span>
                    <span className="min-w-0"><span className="block truncate text-[11px] font-extrabold">{priority.title}</span><span className="mt-0.5 block truncate text-[9px] opacity-80">{priority.description}</span></span>
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
            ))}
        </div>
    );
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {actions.map((action) => {
                const Icon = actionIcons[action.icon] ?? FileText;

                return (
                    <Link key={action.label} href={action.href} prefetch className="group min-h-24 rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] p-3 hover:border-[#9CC9F5] hover:bg-[#EAF4FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#091A2E] dark:hover:bg-[#132847]">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-[#0060F4] text-white"><Icon aria-hidden="true" className="size-4" /></span>
                        <span className="mt-2 block text-[11px] font-extrabold text-[#0B1F63] group-hover:text-[#0060F4] dark:text-white">{action.label}</span>
                        <span className="mt-0.5 block line-clamp-2 text-[9px] leading-3.5 text-[#52658E] dark:text-[#9FB0C6]">{action.description}</span>
                    </Link>
                );
            })}
        </div>
    );
}

export default function RoleDashboardView({ dashboard, userName, liveDate, liveTime, latestRequests, needsToday, activeShips, recentActivities, pendingApprovals, financialOverview }: RoleDashboardViewProps) {
    const meta = roleMeta[dashboard.role];
    const RoleIcon = meta.icon;

    return (
        <div className="mx-auto w-full max-w-[1680px] space-y-3 sm:space-y-4">
            <section className="relative isolate min-h-[210px] overflow-hidden rounded-2xl bg-[#082870] text-white shadow-sm md:min-h-[190px]">
                <img src="/images/background-kapal.png" width="1600" height="230" fetchPriority="high" alt="" className="absolute inset-0 -z-20 size-full object-cover" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061B3D]/90 via-[#082870]/50 to-[#061B3D]/70" />
                <div className="grid min-h-[210px] md:min-h-[190px] md:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="flex flex-col justify-center px-5 py-5 sm:px-7 lg:px-8">
                        <p className="text-sm font-medium text-white/85">Selamat datang,</p>
                        <h1 className="mt-1 text-balance text-3xl font-black leading-none text-white sm:text-4xl">{userName}</h1>
                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/90"><RoleIcon aria-hidden="true" className="size-4" />{meta.label}</div>
                        <p className="mt-3 max-w-2xl text-pretty text-xs italic leading-5 text-white/80 sm:text-sm">“{dashboard.subtitle}”</p>
                    </div>
                    <div className="flex items-end justify-between gap-3 border-t border-white/15 bg-[#061B3D]/25 px-5 py-4 md:flex-col md:items-end md:justify-center md:border-l md:border-t-0 md:px-6 md:text-right">
                        <div><p className="text-[11px] font-semibold text-white/80">{liveDate}</p><p className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">{liveTime}</p></div>
                        <Link href={dashboard.primary_action.href} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-[11px] font-extrabold text-[#082870] shadow-sm hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                            {dashboard.primary_action.label}<ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <section aria-label="Ringkasan utama" className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 xl:gap-3">
                {dashboard.metrics.map((metric) => {
                    const Icon = metricIcons[metric.key] ?? Gauge;

                    return (
                        <article key={metric.key} className="grid min-h-[104px] min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-[#DCEAF8] bg-white p-3 shadow-sm sm:grid-cols-[48px_minmax(0,1fr)] sm:p-4 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] sm:size-12 dark:bg-[#132847] dark:text-[#60A5FA]"><Icon aria-hidden="true" className="size-5 sm:size-6" /></span>
                            <div className="min-w-0"><p className="text-pretty text-[10px] font-semibold text-[#52658E] sm:text-[11px] dark:text-[#9FB0C6]">{metric.label}</p><p className="mt-0.5 break-words text-lg font-black leading-tight tabular-nums text-[#0B1F63] sm:text-xl dark:text-white">{formatValue(metric.value, metric.format)}</p><p className="mt-1 line-clamp-2 text-[9px] leading-3.5 text-[#7C91AC] dark:text-[#9FB0C6]">{metric.hint}</p></div>
                        </article>
                    );
                })}
            </section>

            <div className="grid gap-3 xl:grid-cols-12">
                {dashboard.role === 'admin' && <><Panel title="Pengajuan terbaru" subtitle="Status kebutuhan kapal yang baru masuk" href="/requests" className="xl:col-span-7"><LatestRequests requests={latestRequests} /></Panel><Panel title="Kebutuhan hari ini" subtitle="Barang dan layanan berdasarkan jadwal kebutuhan" href="/needs" className="xl:col-span-5"><NeedsToday needs={needsToday} /></Panel></>}
                {dashboard.role === 'operasional' && <><Panel title="Kapal yang dipantau" subtitle="Jadwal, posisi, dan kunjungan aktif" href="/vessels" className="xl:col-span-7"><ActiveShips ships={activeShips} /></Panel><Panel title="Kebutuhan hari ini" subtitle="Kebutuhan kapal yang perlu ditindaklanjuti" href="/needs" className="xl:col-span-5"><NeedsToday needs={needsToday} /></Panel></>}
                {dashboard.role === 'direktur' && <><Panel title="Antrean keputusan Direktur" subtitle="Pengajuan yang telah diperiksa Admin" href="/approvals" linkLabel="Buka approval" className="xl:col-span-7"><Approvals approvals={pendingApprovals} /></Panel><Panel title="Kapal dalam pemantauan" subtitle="Kunjungan aktif perusahaan" href="/vessels" className="xl:col-span-5"><ActiveShips ships={activeShips} /></Panel></>}
                {dashboard.role === 'owner' && <><Panel title="Tagihan klien terbaru" subtitle="Invoice dan saldo yang masih harus ditagih" href="/receivables" className="xl:col-span-7"><RecentInvoices invoices={financialOverview?.recent_invoices ?? []} /></Panel><Panel title="Kapal dalam pemantauan" subtitle="Kunjungan aktif di seluruh kegiatan" href="/vessels" className="xl:col-span-5"><ActiveShips ships={activeShips} /></Panel></>}
            </div>

            <DashboardAnalytics charts={dashboard.charts} />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                <Panel title="Update lapangan terbaru" subtitle="Catatan aktivitas operasional yang paling baru" href="/operations" className="md:col-span-2 xl:col-span-6"><RecentActivities activities={recentActivities} /></Panel>
                <Panel title="Prioritas Anda" subtitle="Pekerjaan yang perlu ditindaklanjuti" className="xl:col-span-3"><PriorityList priorities={dashboard.priorities} /></Panel>
                <Panel title="Akses cepat" subtitle={`Menu utama ${dashboard.eyebrow.toLowerCase()}`} className="xl:col-span-3"><QuickActions actions={dashboard.quick_actions} /></Panel>
            </div>

            {dashboard.role === 'admin' && (
                <div className="flex items-start gap-3 rounded-2xl border border-[#B8DCFF] bg-[#EAF4FF] p-4 dark:border-[#174B7B] dark:bg-[#0A2340]">
                    <Banknote aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#0060F4] dark:text-[#60A5FA]" />
                    <div><h2 className="text-sm font-extrabold text-[#0B1F63] dark:text-white">Kontrol dokumen sampai pembayaran</h2><p className="mt-1 text-pretty text-[11px] leading-4 text-[#52658E] dark:text-[#9FB0C6]">Pastikan invoice vendor, bukti pembayaran, Nota Rampung, dan invoice klien terhubung dengan SPK serta kunjungan yang benar.</p></div>
                </div>
            )}
        </div>
    );
}
