import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
    Building2,
    CalendarClock,
    ClipboardCheck,
    Download,
    ExternalLink,
    FileCheck2,
    FileText,
    History,
    MapPin,
    ReceiptText,
    Ship,
    UserRound,
    WalletCards,
} from 'lucide-react';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Table from '../../Components/tables/Table';
import StatusBadge from '../../Components/ui/StatusBadge';
import AppLayout from '../../Layouts/AppLayout';

interface NamedRecord {
    id?: string | number;
    name: string;
}

interface WorkOrderItem {
    id: string;
    name: string;
    description?: string | null;
}

interface PortCallSummary {
    id: string;
    job_number: string;
    status: string;
    financial_status?: string | null;
    eta_at?: string | null;
    etd_at?: string | null;
    arrived_at?: string | null;
    berthed_at?: string | null;
    departed_at?: string | null;
    reconciled_at?: string | null;
}

interface WorkOrderDetail {
    id: string;
    system_number: string;
    client_number?: string | null;
    document_date?: string | null;
    received_at?: string | null;
    source?: string | null;
    status: string;
    revision_reason?: string | null;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    planned_eta_at?: string | null;
    planned_etd_at?: string | null;
    operational_completed_at?: string | null;
    closed_at?: string | null;
    document_url?: string | null;
    company?: NamedRecord & {
        address?: string | null;
        phone?: string | null;
        email?: string | null;
    };
    ship?: NamedRecord & {
        imo_number?: string | null;
        call_sign?: string | null;
        flag?: string | null;
        ship_type?: string | null;
        gross_tonnage?: number | null;
        image?: string | null;
    };
    port?: NamedRecord & {
        code?: string | null;
        city?: string | null;
        country?: string | null;
    };
    creator?: NamedRecord;
    assignee?: NamedRecord;
    items: WorkOrderItem[];
    port_call?: PortCallSummary | null;
}

interface RequestItemSummary {
    id: string;
    item_name: string;
    quantity: number | string;
    unit?: string | null;
    status: string;
    director_status?: string | null;
    is_urgent: boolean;
    vendor?: NamedRecord | null;
}

interface RequestSummary {
    id: string;
    request_number: string;
    service_type?: string | null;
    status: string;
    request_date?: string | null;
    requested_port_call_status?: string | null;
    completed_at?: string | null;
    creator?: NamedRecord;
    items: RequestItemSummary[];
}

interface OperationalActivity {
    id: string;
    activity_date?: string | null;
    activity_time?: string | null;
    category?: string | null;
    title: string;
    detail?: string | null;
    location_name?: string | null;
    vessel_position?: string | null;
    creator?: NamedRecord;
}

interface DailyReport {
    id: string;
    report_date?: string | null;
    status: string;
    no_activity: boolean;
    summary?: string | null;
    submitted_at?: string | null;
    officer?: NamedRecord;
}

interface ExpenseRequestSummary {
    id: string;
    request_number: string;
    status: string;
    total: number | string;
    funding_status?: string | null;
}

interface VendorInvoiceSummary {
    id: string;
    document_number?: string | null;
    vendor_name?: string | null;
    status: string;
    payment_status?: string | null;
    verified_total?: number | string | null;
}

interface ClientInvoiceSummary {
    id: string;
    invoice_number: string;
    invoice_type: string;
    status: string;
    grand_total: number | string;
    outstanding_amount?: number | string | null;
}

interface FinancialSummary {
    expense_requests: ExpenseRequestSummary[];
    vendor_invoices: VendorInvoiceSummary[];
    outgoing_payments: Array<{
        id: string;
        payment_type: string;
        recipient?: string | null;
        amount: number | string;
        verification_status?: string | null;
        payment_date?: string | null;
    }>;
    client_invoices: ClientInvoiceSummary[];
    completion_note?: {
        id: string;
        document_number?: string | null;
        status: string;
        uploaded_at?: string | null;
        verified_at?: string | null;
    } | null;
    reconciliation?: {
        id: string;
        status: string;
        actual_total?: number | string | null;
        variance?: number | string | null;
        reconciled_at?: string | null;
    } | null;
}

interface HistoryItem {
    id: string;
    type: string;
    title: string;
    description?: string | null;
    status?: string | null;
    actor?: string | null;
    occurred_at: string;
}

interface Props {
    workOrder: WorkOrderDetail;
    requests: RequestSummary[];
    operationalActivities: OperationalActivity[];
    dailyReports: DailyReport[];
    financial?: FinancialSummary | null;
    counts: {
        requests: number;
        request_items: number;
        activities: number;
        daily_reports: number;
        vendor_invoices?: number | null;
        funding_requests?: number | null;
        client_invoices?: number | null;
    };
    history: HistoryItem[];
    capabilities: {
        can_view_financial: boolean;
    };
}

const workOrderStatusLabels: Record<string, string> = {
    draft: 'Draft',
    accepted: 'Aktif',
    active: 'Aktif',
    in_progress: 'Sedang Diproses',
    operational_completed: 'Operasional Selesai',
    completed: 'Operasional Selesai',
    awaiting_completion_note: 'Menunggu Nota Rampung',
    billing: 'Penagihan',
    closed: 'Closed',
};

const workOrderStatusTones: Record<string, string> = {
    draft: 'inactive',
    accepted: 'success',
    active: 'success',
    in_progress: 'processing',
    operational_completed: 'success',
    completed: 'success',
    awaiting_completion_note: 'waiting',
    billing: 'processing',
    closed: 'success',
};

const formatDateTime = (value?: string | null): string => {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value));
};

const formatDate = (value?: string | null): string => {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value));
};

const formatMoney = (value?: number | string | null): string =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const historyIcon = (type: string) => {
    const iconClass = 'size-4';

    if (type === 'kebutuhan') return <ClipboardCheck aria-hidden="true" className={iconClass} />;
    if (type === 'aktivitas' || type === 'laporan') return <Activity aria-hidden="true" className={iconClass} />;
    if (type === 'keuangan') return <WalletCards aria-hidden="true" className={iconClass} />;
    if (type === 'nota') return <FileCheck2 aria-hidden="true" className={iconClass} />;
    if (type === 'kunjungan') return <Ship aria-hidden="true" className={iconClass} />;

    return <FileText aria-hidden="true" className={iconClass} />;
};

const sectionClass =
    'scroll-mt-24 border-b border-[#DCEAF8] bg-white py-5 dark:border-[#1E3A5F] dark:bg-[#0C1D36] md:rounded-2xl md:border md:p-5 md:shadow-sm';

export default function WorkOrderShow({
    workOrder,
    requests,
    operationalActivities,
    dailyReports,
    financial,
    counts,
    history,
    capabilities,
}: Props) {
    const vesselHref = workOrder.ship?.id
        ? route('vessels.show', {
              id: workOrder.ship.id,
              ...(workOrder.port_call?.id ? { visit: workOrder.port_call.id } : {}),
          })
        : null;
    const requestHref = requests.length > 0 && workOrder.port_call?.job_number
        ? route('requests.detail', workOrder.port_call.job_number)
        : route('requests.index', { search: workOrder.port_call?.job_number });

    return (
        <AppLayout
            title={`Riwayat ${workOrder.system_number}`}
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title={`${workOrder.system_number} — Riwayat SPK`} />

            <MobilePageHero
                title="Riwayat SPK"
                description={`${workOrder.system_number} • ${workOrder.ship?.name || 'Kapal belum ditentukan'}`}
            />

            <div className="relative z-10 mx-auto -mt-6 w-full max-w-7xl rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:space-y-5 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <div className="hidden items-center justify-between gap-4 md:flex">
                    <Link
                        href={route('work-orders.index')}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DCEAF8] bg-white px-4 text-sm font-semibold text-[#52658E] hover:border-[#0060F4] hover:text-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#B5C8DC]"
                    >
                        <ArrowLeft aria-hidden="true" className="size-4" />
                        Kembali ke SPK
                    </Link>

                    <StatusBadge
                        status={workOrderStatusTones[workOrder.status] || workOrder.status}
                        label={workOrderStatusLabels[workOrder.status] || workOrder.status}
                        showDot
                    />
                </div>

                <header className="border-b border-[#DCEAF8] pb-5 dark:border-[#1E3A5F] md:rounded-2xl md:border md:bg-white md:p-6 md:shadow-sm md:dark:bg-[#0C1D36]">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 md:hidden">
                                <StatusBadge
                                    status={workOrderStatusTones[workOrder.status] || workOrder.status}
                                    label={workOrderStatusLabels[workOrder.status] || workOrder.status}
                                    showDot
                                />
                            </div>
                            <h1 className="mt-2 text-balance text-2xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl" translate="no">
                                {workOrder.system_number}
                            </h1>
                            <p className="mt-1 text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">
                                {workOrder.client_number || 'Nomor SPK klien belum tersedia'}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {vesselHref && (
                                <Link
                                    href={vesselHref}
                                    prefetch
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DCEAF8] px-3 text-sm font-semibold text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#132847]"
                                >
                                    <Ship aria-hidden="true" className="size-4" />
                                    Detail kapal
                                </Link>
                            )}
                            {workOrder.document_url && (
                                <a
                                    href={workOrder.document_url}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DCEAF8] px-3 text-sm font-semibold text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#132847]"
                                >
                                    <Download aria-hidden="true" className="size-4" />
                                    Dokumen SPK
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[#DCEAF8] bg-[#DCEAF8] dark:border-[#1E3A5F] dark:bg-[#1E3A5F] sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                icon: Ship,
                                label: 'Kapal',
                                value: workOrder.ship?.name || '-',
                                detail: workOrder.ship?.ship_type || workOrder.ship?.imo_number || '-',
                            },
                            {
                                icon: Building2,
                                label: 'Perusahaan',
                                value: workOrder.company?.name || '-',
                                detail: workOrder.company?.phone || workOrder.company?.email || '-',
                            },
                            {
                                icon: MapPin,
                                label: 'Pelabuhan',
                                value: workOrder.port?.name || '-',
                                detail: workOrder.port?.city || workOrder.port?.code || '-',
                            },
                            {
                                icon: UserRound,
                                label: 'Penanggung jawab',
                                value: workOrder.assignee?.name || '-',
                                detail: workOrder.port_call?.job_number || '-',
                            },
                        ].map(({ icon: Icon, label, value, detail }) => (
                            <div key={label} className="min-w-0 bg-[#F8FBFF] p-3 dark:bg-[#071322]">
                                <p className="flex items-center gap-2 text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                    <Icon aria-hidden="true" className="size-4 shrink-0 text-[#0060F4]" />
                                    {label}
                                </p>
                                <p className="mt-1 truncate text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {value}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-[#52658E] dark:text-[#94A3B8]">
                                    {detail}
                                </p>
                            </div>
                        ))}
                    </div>
                </header>

                <nav aria-label="Bagian detail SPK" className="-mx-4 overflow-x-auto border-b border-[#DCEAF8] px-4 dark:border-[#1E3A5F] md:mx-0 md:rounded-xl md:border md:bg-white md:px-2 md:dark:bg-[#0C1D36]">
                    <div className="flex min-w-max gap-1 py-2">
                        {[
                            ['#spk', 'SPK'],
                            ['#kebutuhan', `Kebutuhan (${counts.request_items})`],
                            ['#aktivitas', `Aktivitas (${counts.activities})`],
                            ...(capabilities.can_view_financial ? [['#keuangan', 'Keuangan']] : []),
                            ['#riwayat', 'Riwayat'],
                        ].map(([href, label]) => (
                            <a
                                key={href}
                                href={href}
                                className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-[#52658E] hover:bg-[#F0F8FF] hover:text-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:text-[#B5C8DC] dark:hover:bg-[#132847]"
                            >
                                {label}
                            </a>
                        ))}
                    </div>
                </nav>

                <section id="spk" className={sectionClass}>
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52]">
                            <FileText aria-hidden="true" className="size-5" />
                        </span>
                        <div>
                            <h2 className="text-balance text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Data SPK</h2>
                            <p className="text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">Dokumen dan jadwal utama pekerjaan.</p>
                        </div>
                    </div>

                    <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            ['Tanggal dokumen', formatDate(workOrder.document_date)],
                            ['Diterima', formatDateTime(workOrder.received_at)],
                            ['ETA', formatDateTime(workOrder.planned_eta_at)],
                            ['ETD', formatDateTime(workOrder.planned_etd_at)],
                            ['Dibuat oleh', workOrder.creator?.name || '-'],
                            ['Penanggung jawab', workOrder.assignee?.name || '-'],
                            ['Status kunjungan', workOrder.port_call?.status || '-'],
                            ['Status keuangan', workOrder.port_call?.financial_status || '-'],
                        ].map(([label, value]) => (
                            <div key={label} className="border-b border-[#EAF2FA] pb-3 dark:border-[#1E3A5F]">
                                <dt className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">{label}</dt>
                                <dd className="mt-1 text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{value}</dd>
                            </div>
                        ))}
                    </dl>

                    <div className="mt-5 border-t border-[#DCEAF8] pt-4 dark:border-[#1E3A5F]">
                        <h3 className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Lingkup pekerjaan</h3>
                        {workOrder.items.length > 0 ? (
                            <div className="mt-2 divide-y divide-[#EAF2FA] dark:divide-[#1E3A5F]">
                                {workOrder.items.map((item) => (
                                    <div key={item.id} className="py-3">
                                        <p className="text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{item.name}</p>
                                        {item.description && <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">{item.description}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-[#52658E] dark:text-[#94A3B8]">Belum ada lingkup pekerjaan.</p>
                        )}
                    </div>
                </section>

                <section id="kebutuhan" className={sectionClass}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52]">
                                <ClipboardCheck aria-hidden="true" className="size-5" />
                            </span>
                            <div>
                                <h2 className="text-balance text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Kebutuhan kapal</h2>
                                <p className="text-sm text-[#52658E] dark:text-[#94A3B8]">{counts.requests} pengajuan, {counts.request_items} item.</p>
                            </div>
                        </div>
                        <Link href={requestHref} prefetch className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:hover:bg-[#132847]">
                            Buka pengajuan
                            <ExternalLink aria-hidden="true" className="size-4" />
                        </Link>
                    </div>

                    {requests.length > 0 ? (
                        <>
                            <div className="mt-4 divide-y divide-[#DCEAF8] md:hidden dark:divide-[#1E3A5F]">
                                {requests.map((shipRequest) => (
                                    <Link key={shipRequest.id} href={route('requests.detail', shipRequest.id)} className="block py-4 hover:bg-[#F8FBFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:hover:bg-[#132847]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{shipRequest.request_number}</p>
                                                <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">{shipRequest.items.length} item • {formatDate(shipRequest.request_date)}</p>
                                            </div>
                                            <StatusBadge status={shipRequest.status} label={shipRequest.status} size="sm" />
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            <Table<RequestSummary>
                                className="mt-4 hidden md:block"
                                data={requests}
                                keyExtractor={(shipRequest) => shipRequest.id}
                                compact
                                columns={[
                                    {
                                        key: 'number',
                                        header: 'Pengajuan',
                                        render: (shipRequest) => (
                                            <Link href={route('requests.detail', shipRequest.id)} className="font-bold text-[#0060F4] hover:underline">
                                                {shipRequest.request_number}
                                            </Link>
                                        ),
                                    },
                                    {
                                        key: 'service',
                                        header: 'Jenis',
                                        render: (shipRequest) => shipRequest.service_type || '-',
                                    },
                                    {
                                        key: 'items',
                                        header: 'Item',
                                        align: 'right',
                                        render: (shipRequest) => <span className="tabular-nums">{shipRequest.items.length}</span>,
                                    },
                                    {
                                        key: 'date',
                                        header: 'Tanggal',
                                        render: (shipRequest) => formatDate(shipRequest.request_date),
                                    },
                                    {
                                        key: 'status',
                                        header: 'Status',
                                        render: (shipRequest) => <StatusBadge status={shipRequest.status} label={shipRequest.status} size="sm" />,
                                    },
                                ]}
                            />
                        </>
                    ) : (
                        <p className="mt-4 border-t border-[#DCEAF8] py-6 text-center text-sm font-semibold text-[#0B1F63] dark:border-[#1E3A5F] dark:text-[#F1F5F9]">Data Tidak Ditemukan</p>
                    )}
                </section>

                <section id="aktivitas" className={sectionClass}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52]">
                                <Activity aria-hidden="true" className="size-5" />
                            </span>
                            <div>
                                <h2 className="text-balance text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Aktivitas dan laporan</h2>
                                <p className="text-sm text-[#52658E] dark:text-[#94A3B8]">{counts.activities} aktivitas, {counts.daily_reports} laporan harian.</p>
                            </div>
                        </div>
                        <Link href={route('operations.index', { search: workOrder.port_call?.job_number })} prefetch className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:hover:bg-[#132847]">
                            Buka aktivitas
                            <ExternalLink aria-hidden="true" className="size-4" />
                        </Link>
                    </div>

                    <div className="mt-4 grid gap-6 lg:grid-cols-2">
                        <div>
                            <h3 className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Aktivitas lapangan</h3>
                            <div className="mt-2 divide-y divide-[#EAF2FA] dark:divide-[#1E3A5F]">
                                {operationalActivities.length > 0 ? operationalActivities.map((item) => (
                                    <article key={item.id} className="py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{item.title}</h4>
                                                <p className="mt-1 line-clamp-2 text-sm text-[#52658E] dark:text-[#94A3B8]">{item.detail || item.category || '-'}</p>
                                            </div>
                                            {item.vessel_position && <StatusBadge status={item.vessel_position} label={item.vessel_position} size="sm" />}
                                        </div>
                                        <p className="mt-2 text-xs tabular-nums text-[#8C9BB9]">{formatDate(item.activity_date)} {item.activity_time || ''} • {item.creator?.name || '-'}</p>
                                    </article>
                                )) : (
                                    <p className="py-6 text-sm text-[#52658E] dark:text-[#94A3B8]">Belum ada aktivitas lapangan.</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Laporan harian</h3>
                            <div className="mt-2 divide-y divide-[#EAF2FA] dark:divide-[#1E3A5F]">
                                {dailyReports.length > 0 ? dailyReports.map((report) => (
                                    <article key={report.id} className="py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(report.report_date)}</h4>
                                                <p className="mt-1 line-clamp-2 text-sm text-[#52658E] dark:text-[#94A3B8]">{report.no_activity ? 'Tidak ada aktivitas kapal.' : report.summary || '-'}</p>
                                            </div>
                                            <StatusBadge status={report.status} label={report.status} size="sm" />
                                        </div>
                                        <p className="mt-2 text-xs text-[#8C9BB9]">{report.officer?.name || '-'}</p>
                                    </article>
                                )) : (
                                    <p className="py-6 text-sm text-[#52658E] dark:text-[#94A3B8]">Belum ada laporan harian.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {capabilities.can_view_financial && financial && (
                    <section id="keuangan" className={sectionClass}>
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52]">
                                <WalletCards aria-hidden="true" className="size-5" />
                            </span>
                            <div>
                                <h2 className="text-balance text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Keuangan dan dokumen akhir</h2>
                                <p className="text-sm text-[#52658E] dark:text-[#94A3B8]">Data pendanaan, invoice, Nota Rampung, dan rekonsiliasi.</p>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[#DCEAF8] bg-[#DCEAF8] dark:border-[#1E3A5F] dark:bg-[#1E3A5F] sm:grid-cols-3">
                            {[
                                ['Pengajuan dana', counts.funding_requests ?? 0, route('funding.index', { search: workOrder.ship?.name })],
                                ['Invoice vendor', counts.vendor_invoices ?? 0, route('vendor-invoices.index', { search: workOrder.ship?.name })],
                                ['Invoice klien', counts.client_invoices ?? 0, route('invoices.index', { search: workOrder.ship?.name })],
                            ].map(([label, value, href]) => (
                                <Link key={String(label)} href={String(href)} prefetch className="flex items-center justify-between gap-3 bg-[#F8FBFF] p-4 hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0060F4] dark:bg-[#071322] dark:hover:bg-[#132847]">
                                    <span className="text-sm font-semibold text-[#52658E] dark:text-[#94A3B8]">{label}</span>
                                    <span className="text-lg font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{value}</span>
                                </Link>
                            ))}
                        </div>

                        <div className="mt-5 grid gap-6 lg:grid-cols-2">
                            <div>
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Invoice vendor</h3>
                                    <ReceiptText aria-hidden="true" className="size-4 text-[#0060F4]" />
                                </div>
                                <div className="mt-2 divide-y divide-[#EAF2FA] dark:divide-[#1E3A5F]">
                                    {financial.vendor_invoices.length > 0 ? financial.vendor_invoices.map((invoice) => (
                                        <div key={invoice.id} className="flex items-start justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{invoice.document_number || '-'}</p>
                                                <p className="mt-1 truncate text-xs text-[#52658E] dark:text-[#94A3B8]">{invoice.vendor_name || '-'} • {formatMoney(invoice.verified_total)}</p>
                                            </div>
                                            <StatusBadge status={invoice.payment_status || invoice.status} label={invoice.payment_status || invoice.status} size="sm" />
                                        </div>
                                    )) : <p className="py-5 text-sm text-[#52658E] dark:text-[#94A3B8]">Belum ada invoice vendor.</p>}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Invoice klien</h3>
                                    <ReceiptText aria-hidden="true" className="size-4 text-[#0060F4]" />
                                </div>
                                <div className="mt-2 divide-y divide-[#EAF2FA] dark:divide-[#1E3A5F]">
                                    {financial.client_invoices.length > 0 ? financial.client_invoices.map((invoice) => (
                                        <div key={invoice.id} className="flex items-start justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{invoice.invoice_number}</p>
                                                <p className="mt-1 text-xs tabular-nums text-[#52658E] dark:text-[#94A3B8]">{formatMoney(invoice.grand_total)} • Sisa {formatMoney(invoice.outstanding_amount)}</p>
                                            </div>
                                            <StatusBadge status={invoice.status} label={invoice.status} size="sm" />
                                        </div>
                                    )) : <p className="py-5 text-sm text-[#52658E] dark:text-[#94A3B8]">Belum ada invoice klien.</p>}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 border-t border-[#DCEAF8] pt-5 dark:border-[#1E3A5F] sm:grid-cols-2">
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F8FBFF] p-4 dark:bg-[#071322]">
                                <div>
                                    <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Nota Rampung</p>
                                    <p className="mt-1 text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{financial.completion_note?.document_number || 'Belum tersedia'}</p>
                                </div>
                                <StatusBadge status={financial.completion_note?.status || 'Menunggu'} label={financial.completion_note?.status || 'Menunggu'} size="sm" />
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F8FBFF] p-4 dark:bg-[#071322]">
                                <div>
                                    <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Rekonsiliasi</p>
                                    <p className="mt-1 text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{financial.reconciliation ? formatMoney(financial.reconciliation.actual_total) : 'Belum tersedia'}</p>
                                </div>
                                <StatusBadge status={financial.reconciliation?.status || 'Menunggu'} label={financial.reconciliation?.status || 'Menunggu'} size="sm" />
                            </div>
                        </div>
                    </section>
                )}

                <section id="riwayat" className={sectionClass}>
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52]">
                            <History aria-hidden="true" className="size-5" />
                        </span>
                        <div>
                            <h2 className="text-balance text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Riwayat Work Order</h2>
                            <p className="text-sm text-[#52658E] dark:text-[#94A3B8]">Urutan terbaru dari seluruh data yang terhubung.</p>
                        </div>
                    </div>

                    {history.length > 0 ? (
                        <ol className="mt-5">
                            {history.map((event, index) => (
                                <li key={event.id} className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                                    {index < history.length - 1 && <span aria-hidden="true" className="absolute left-5 top-10 h-[calc(100%-2rem)] w-px bg-[#DCEAF8] dark:bg-[#1E3A5F]" />}
                                    <span className="relative z-10 flex size-10 items-center justify-center rounded-full border border-[#BCE0FD] bg-[#F0F8FF] text-[#0060F4] dark:border-[#285585] dark:bg-[#132847]">
                                        {historyIcon(event.type)}
                                    </span>
                                    <div className="min-w-0 border-b border-[#EAF2FA] pb-5 last:border-0 dark:border-[#1E3A5F]">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{event.title}</h3>
                                                {event.description && <p className="mt-1 line-clamp-2 text-sm text-[#52658E] dark:text-[#94A3B8]">{event.description}</p>}
                                            </div>
                                            {event.status && <StatusBadge status={event.status} label={event.status} size="sm" />}
                                        </div>
                                        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs tabular-nums text-[#8C9BB9]">
                                            <CalendarClock aria-hidden="true" className="size-3.5" />
                                            {formatDateTime(event.occurred_at)}
                                            {event.actor && <span>• {event.actor}</span>}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="mt-4 border-t border-[#DCEAF8] py-6 text-center text-sm text-[#52658E] dark:border-[#1E3A5F] dark:text-[#94A3B8]">Belum ada riwayat untuk SPK ini.</p>
                    )}
                </section>

                <div className="flex justify-center pt-2 md:hidden">
                    <Link href={route('work-orders.index')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DCEAF8] px-4 text-sm font-semibold text-[#52658E] hover:border-[#0060F4] hover:text-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:border-[#1E3A5F] dark:text-[#B5C8DC]">
                        <ArrowLeft aria-hidden="true" className="size-4" />
                        Kembali ke daftar SPK
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
