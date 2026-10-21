import { Head, router } from '@inertiajs/react';
import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    Activity,
    Anchor,
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock,
    ClipboardList,
    DollarSign,
    FileSpreadsheet,
    FileText,
    Percent,
    Printer,
    RotateCcw,
    Search,
    Ship,
    TrendingUp,
    Users,
    Wallet,
    X,
    SlidersHorizontal,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Modal from '../../Components/overlays/Modal';
import ReportNavigationBar from '../../Components/reports/ReportNavigationBar';
import ReportExportModal, { useReportExport } from '../../Components/reports/ReportExportModal';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import DateRangePicker, { type DateRange } from '../../Components/forms/DateRangePicker';
import DashboardAnalytics, { type DashboardChartData } from '../../Components/dashboard/DashboardAnalytics';
import Pagination, { type PaginationLinkItem } from '../../Components/pagination/Pagination';
import { formatDate } from '../../lib/formatDate';
import {
    reportSectionByKey,
    type ReportSectionKey as ReportTab,
} from '../../lib/reportNavigation';

interface PaginatedData<T> {
    data: T[];
    links: PaginationLinkItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface PortCallReportItem {
    id: string;
    job_number: string;
    client_spk?: string | null;
    ship_name: string;
    company_name: string;
    port_name: string;
    status: string;
    eta?: string | null;
    etd?: string | null;
    departed_at?: string | null;
    stay_duration?: string;
    total_invoiced: number;
    agency_invoiced: number;
    reimbursement_invoiced: number;
    paid_invoiced: number;
    total_hpp: number;
    margin: number;
    margin_percentage: number;
    invoice_count: number;
    request_count: number;
    has_completion_note: boolean;
}

interface InvoiceReportItem {
    id: string;
    invoice_number: string;
    invoice_type: string;
    invoice_date?: string | null;
    due_date?: string | null;
    company_name: string;
    ship_name: string;
    job_number: string;
    grand_total: number;
    paid_amount: number;
    outstanding_amount: number;
    status: string;
}

interface ReceivableReportItem extends InvoiceReportItem {
    days_overdue: number;
    aging: string;
}

interface ExpenseReportItem {
    id: string;
    reference_number: string;
    payment_type: string;
    payment_date?: string | null;
    recipient: string;
    job_number: string;
    ship_name: string;
    amount: number;
    verification_status: string;
    recorded_by: string;
    verified_by?: string | null;
}

interface ActivityReportItem {
    id: string;
    activity_date?: string | null;
    activity_time?: string | null;
    title: string;
    category: string;
    location_name?: string | null;
    ship_name: string;
    job_number: string;
    officer_name: string;
    progress_percent?: number | null;
    has_constraints: boolean;
}

interface ReportsIndexProps {
    summary: {
        total_port_calls: number;
        active_vessels: number;
        completed_vessels?: number;
        scheduled_vessels?: number;
        avg_port_stay_days?: number;
        total_invoiced: number;
        agency_revenue: number;
        reimburse_revenue: number;
        total_hpp: number;
        non_vessel_expenses: number;
        ship_margin: number;
        gross_margin_percentage?: number;
        company_net_result: number;
        net_margin_percentage?: number;
        completed_requests: number;
        pending_requests: number;
        in_progress_requests?: number;
        ar_invoiced?: number;
        ar_paid?: number;
        ar_outstanding?: number;
        ar_collection_rate?: number;
        ap_invoiced?: number;
        ap_paid?: number;
        ap_outstanding?: number;
        cash_in?: number;
        cash_out?: number;
        net_cash_flow?: number;
    };
    financialTrend: DashboardChartData;
    portCalls: PaginatedData<PortCallReportItem>;
    invoiceReport: {
        summary: {
            total_documents: number;
            released_documents: number;
            paid_documents: number;
            billed_amount: number;
            paid_amount: number;
            outstanding_amount: number;
        };
        chart: DashboardChartData;
        rows: PaginatedData<InvoiceReportItem>;
    };
    receivableReport: {
        summary: {
            open_documents: number;
            outstanding_amount: number;
            overdue_amount: number;
            current_amount: number;
            collection_rate: number;
        };
        chart: DashboardChartData;
        rows: PaginatedData<ReceivableReportItem>;
    };
    expenseReport: {
        summary: {
            total_documents: number;
            total_recorded: number;
            total_vessel_expense?: number;
            total_combined_expense?: number;
            vessel_count?: number;
            vessel_item_count?: number;
            verified_amount: number;
            pending_amount: number;
            rejected_amount: number;
        };
        chart: DashboardChartData;
        rows: PaginatedData<ExpenseReportItem>;
    };
    activityReport: {
        summary: {
            total_activities: number;
            daily_reports: number;
            ships_covered: number;
            officers: number;
            with_constraints: number;
        };
        chart: DashboardChartData;
        rows: PaginatedData<ActivityReportItem>;
    };
    vesselDailyExpenseSummary?: {
        total_vessels: number;
        total_expenses: number;
        total_items: number;
        vessels: Array<{
            port_call_id: string;
            job_number: string;
            client_spk?: string | null;
            ship_name: string;
            company_name: string;
            port_name: string;
            status: string;
            eta?: string | null;
            etd?: string | null;
            departed_at?: string | null;
            stay_duration: string;
            total_expense: number;
            item_count: number;
            items: Array<{
                id: string;
                date?: string | null;
                request_number: string;
                item_name: string;
                item_type?: string | null;
                quantity: number;
                unit: string;
                hpp_price: number;
                total_cost: number;
                cumulative_cost: number;
                director_status?: string | null;
                status: string;
                notes?: string | null;
            }>;
        }>;
    };
    companies?: Array<{ id: string; name: string }>;
    ships?: Array<{ id: string; name: string; ship_company_id?: string }>;
    jobs?: Array<{ id: string; job_number?: string; ship_id?: string }>;
    filters: {
        from: string;
        to: string;
        search: string;
        status: string;
        company_id?: string;
        ship_id?: string;
        job?: string;
        tab?: ReportTab;
        sort?: string;
        direction?: 'asc' | 'desc';
    };
}

const formatRupiah = (value: number): string => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(Number(value ?? 0));

export const getAdaptiveMoneyFontSize = (text: string): string => {
    const len = text.length;
    if (len > 18) {
        return 'text-[11px] sm:text-xs md:text-sm font-black tracking-tight';
    }
    if (len > 15) {
        return 'text-xs sm:text-sm md:text-base font-black tracking-tight';
    }
    if (len > 12) {
        return 'text-sm sm:text-base md:text-lg font-black tracking-tight';
    }
    return 'text-base sm:text-lg md:text-xl font-black';
};

function MoneyValue({
    value,
    className = '',
    size = 'inline',
    compactUntil,
}: {
    value: number;
    className?: string;
    size?: 'adaptive' | 'inline';
    compactUntil?: 'sm' | 'lg' | 'xl';
}) {
    const fullValue = formatRupiah(value);
    const sizeClass = size === 'adaptive' ? getAdaptiveMoneyFontSize(fullValue) : '';

    return (
        <span
            className={`whitespace-nowrap tabular-nums ${sizeClass} ${className}`}
            aria-label={fullValue}
            title={fullValue}
        >
            {fullValue}
        </span>
    );
}

const invoiceStatusLabel = (status: string): string => ({
    draft: 'Draft',
    released: 'Dirilis',
    sent: 'Terkirim',
    paid: 'Lunas',
    cancelled: 'Dibatalkan',
}[status] || status);

const invoiceStatusTone = (status: string): string => {
    if (status === 'paid') return 'success';
    if (status === 'sent') return 'processing';
    if (status === 'cancelled') return 'inactive';
    if (status === 'draft') return 'waiting';
    return 'info';
};

const paymentStatusLabel = (status: string): string => ({
    pending: 'Menunggu Verifikasi',
    waiting_usage_proof: 'Menunggu Bukti Penggunaan',
    waiting_admin_verification: 'Menunggu Verifikasi Admin',
    verified: 'Terverifikasi',
    rejected: 'Ditolak',
}[status] || status);

const paymentStatusTone = (status: string): string => {
    if (status === 'verified') return 'success';
    if (status === 'rejected') return 'danger';
    return 'waiting';
};

function MetricCard({ label, value, detail, icon, tone = 'blue', format = 'currency' }: {
    label: string;
    value: number;
    detail: ReactNode;
    icon: ReactNode;
    tone?: 'blue' | 'slate' | 'green' | 'amber' | 'red';
    format?: 'currency' | 'number' | 'percentage';
}) {
    const toneClasses = {
        blue: {
            label: 'text-[#52658E] dark:text-[#9FB0C6]',
            value: 'text-[#0B1F63] dark:text-white',
            icon: 'bg-[#EAF4FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]',
        },
        slate: {
            label: 'text-[#52658E] dark:text-[#9FB0C6]',
            value: 'text-slate-800 dark:text-slate-200',
            icon: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        },
        green: {
            label: 'text-emerald-700 dark:text-emerald-400',
            value: 'text-emerald-800 dark:text-emerald-300',
            icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
        },
        amber: {
            label: 'text-amber-700 dark:text-amber-400',
            value: 'text-amber-800 dark:text-amber-300',
            icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        },
        red: {
            label: 'text-rose-700 dark:text-rose-400',
            value: 'text-rose-800 dark:text-rose-300',
            icon: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
        },
    }[tone];

    const formattedNonCurrency = `${Number(value ?? 0).toLocaleString('id-ID')}${format === 'percentage' ? '%' : ''}`;

    return (
        <Card padding="sm" className="min-w-0">
            <div className="grid min-h-[82px] grid-cols-[minmax(0,1fr)_34px] items-center gap-2 sm:min-h-[96px] sm:grid-cols-[minmax(0,1fr)_40px]">
                <div className="min-w-0">
                    <p className={`text-[11px] font-semibold leading-4 sm:text-xs ${toneClasses.label}`}>{label}</p>
                    {format !== 'currency' ? (
                        <p className={`mt-1 whitespace-nowrap leading-tight tabular-nums ${getAdaptiveMoneyFontSize(formattedNonCurrency)} ${toneClasses.value}`}>
                            {formattedNonCurrency}
                        </p>
                    ) : (
                        <MoneyValue value={value} size="adaptive" className={`mt-1 block ${toneClasses.value}`} />
                    )}
                    <div className="mt-1 line-clamp-2 text-[10px] leading-3.5 text-[#52658E] sm:text-[11px] dark:text-[#9FB0C6]">{detail}</div>
                </div>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-10 sm:rounded-xl ${toneClasses.icon}`}>
                    {icon}
                </span>
            </div>
        </Card>
    );
}

export default function ReportsIndex({
    summary,
    financialTrend,
    portCalls,
    invoiceReport,
    receivableReport,
    expenseReport,
    activityReport,
    vesselDailyExpenseSummary,
    companies = [],
    ships = [],
    jobs = [],
    filters,
}: ReportsIndexProps) {
    const activeTab = filters.tab || 'ringkasan_margin';
    const activeReportSection = reportSectionByKey(activeTab);
    const activeReportUrl = route(activeReportSection.routeName);

    const [search, setSearch] = useState(filters.search || '');
    const [companyId, setCompanyId] = useState(filters.company_id || '');
    const [shipId, setShipId] = useState(filters.ship_id || '');
    const [job, setJob] = useState(filters.job || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: filters.from || '',
        endDate: filters.to || '',
    });
    const [expenseSubView, setExpenseSubView] = useState<'all' | 'kapal' | 'kantor'>(
        activeTab === 'pengeluaran_kapal' ? 'kapal' : 'all'
    );

    // Modal state for filters
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modalCompanyId, setModalCompanyId] = useState(filters.company_id || '');
    const [modalShipId, setModalShipId] = useState(filters.ship_id || '');
    const [modalJob, setModalJob] = useState(filters.job || '');
    const [modalStatus, setModalStatus] = useState(filters.status || 'all');
    useEffect(() => {
        setSearch(filters.search || '');
        setCompanyId(filters.company_id || '');
        setShipId(filters.ship_id || '');
        setJob(filters.job || '');
        setStatus(filters.status || 'all');
        setDateRange({
            startDate: filters.from || '',
            endDate: filters.to || '',
        });
    }, [
        filters.company_id,
        filters.from,
        filters.job,
        filters.search,
        filters.ship_id,
        filters.status,
        filters.to,
    ]);

    const exportState = useReportExport();

    const getReportType = (tab: string): string => {
        switch (tab) {
            case 'pengeluaran_kapal':
                return 'vessel_daily_expenses';
            case 'invoice':
                return 'invoices';
            case 'piutang':
                return 'receivables';
            case 'pengeluaran':
                return 'expenses';
            case 'aktivitas':
                return 'activities';
            case 'pengajuan':
                return 'requests';
            case 'ringkasan_margin':
            default:
                return 'margin';
        }
    };

    const handleExport = (format: 'pdf' | 'xlsx', customJob?: string, customType?: string) => {
        let reportType = customType;
        if (!reportType) {
            if (activeTab === 'pengeluaran' && expenseSubView === 'kapal') {
                reportType = 'vessel_daily_expenses';
            } else {
                reportType = getReportType(activeTab);
            }
        }
        exportState.startExport({
            report_type: reportType,
            format,
            parameters: {
                from: filters.from,
                to: filters.to,
                company_id: companyId,
                ship_id: shipId,
                job: customJob || job,
                status: status,
                search: search,
            },
            job_number: customJob,
            label: customJob
                ? `Laporan Pengeluaran Kapal — Job ${customJob}`
                : `Laporan ${activeReportSection.label} (${format.toUpperCase()})`,
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const statusLabel = (st: string) => {
        if (st === 'berthed') return 'Sandar';
        if (st === 'anchored') return 'Labuh';
        if (st === 'scheduled') return 'Akan Datang';
        return 'Selesai';
    };

    // Filter Options
    const modalAvailableShips = useMemo(() => {
        if (!modalCompanyId) return ships;
        return ships.filter((s) => s.ship_company_id === modalCompanyId);
    }, [ships, modalCompanyId]);

    const companyOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: '', label: 'Semua Perusahaan' },
            ...companies.map((c) => ({ value: c.id, label: c.name })),
        ],
        [companies]
    );

    const modalShipOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: '', label: 'Semua Kapal' },
            ...modalAvailableShips.map((s) => ({ value: s.id, label: s.name })),
        ],
        [modalAvailableShips]
    );

    const jobOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: '', label: 'Semua Job' },
            ...jobs.map((j) => ({ value: j.job_number || j.id, label: j.job_number || j.id })),
        ],
        [jobs]
    );

    const statusOptions: SelectSearchOption[] = [
        { value: 'all', label: 'Semua Status Kunjungan' },
        { value: 'scheduled', label: 'Akan Datang' },
        { value: 'anchored', label: 'Labuh' },
        { value: 'berthed', label: 'Sandar' },
        { value: 'departed', label: 'Berangkat' },
        { value: 'completed', label: 'Selesai' },
    ];

    const activeFilterCount = [
        companyId,
        shipId,
        job,
        status && status !== 'all' ? status : '',
    ].filter(Boolean).length;

    const applyFilters = (overrides?: {
        search?: string;
        company_id?: string;
        ship_id?: string;
        job?: string;
        status?: string;
        range?: DateRange;
    }) => {
        const q = overrides?.search !== undefined ? overrides.search : search;
        const comp = overrides?.company_id !== undefined ? overrides.company_id : companyId;
        const shp = overrides?.ship_id !== undefined ? overrides.ship_id : shipId;
        const jb = overrides?.job !== undefined ? overrides.job : job;
        const st = overrides?.status !== undefined ? overrides.status : status;
        const r = overrides?.range !== undefined ? overrides.range : dateRange;

        router.get(
            activeReportUrl,
            {
                from: r.startDate || undefined,
                to: r.endDate || undefined,
                search: q || undefined,
                status: st !== 'all' ? st : undefined,
                company_id: comp || undefined,
                ship_id: shp || undefined,
                job: jb || undefined,
                sort: filters.sort || undefined,
                direction: filters.direction || undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const reportQuery = (overrides: Record<string, string | undefined> = {}) => ({
        from: dateRange.startDate || undefined,
        to: dateRange.endDate || undefined,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        company_id: companyId || undefined,
        ship_id: shipId || undefined,
        job: job || undefined,
        sort: filters.sort || undefined,
        direction: filters.direction || undefined,
        ...overrides,
    });

    const handlePeriodChange = (range: DateRange) => {
        setDateRange(range);
        applyFilters({ range });
    };

    const sortReport = (column: string) => {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';

        router.get(
            activeReportUrl,
            reportQuery({ sort: column, direction }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setCompanyId('');
        setShipId('');
        setJob('');
        setStatus('all');
        const emptyRange = { startDate: '', endDate: '' };
        setDateRange(emptyRange);
        router.get(activeReportUrl, {}, { preserveState: true, preserveScroll: true });
    };

    const hasAdvancedFilters = Boolean(
        search || companyId || shipId || job || (status && status !== 'all')
    );
    const hasActiveFilters = Boolean(
        hasAdvancedFilters || dateRange.startDate || dateRange.endDate
    );

    // Job columns for Table
    const jobColumns: Column<PortCallReportItem>[] = [
        {
            key: 'job_number',
            header: 'No. Job / SPK',
            width: '180px',
            render: (call) => (
                <div>
                    <span className="font-mono font-bold text-[#0060F4]">{call.job_number}</span>
                    {call.client_spk && (
                        <p className="mt-0.5 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                            SPK: {call.client_spk}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'ship',
            header: 'Kapal & Klien',
            width: '240px',
            render: (call) => (
                <div className="min-w-0">
                    <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{call.ship_name}</p>
                    <p className="truncate text-xs text-[#52658E] dark:text-[#94A3B8]">{call.company_name}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                        <span>{call.request_count} kebutuhan</span>
                        <span>·</span>
                        <span>{call.invoice_count} invoice</span>
                        {call.has_completion_note && (
                            <span className="rounded bg-emerald-50 px-1 py-0.2 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                Nota Rampung
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'port_stay',
            header: 'Pelabuhan & Durasi',
            width: '180px',
            render: (call) => (
                <div>
                    <p className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{call.port_name}</p>
                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">{call.stay_duration || '-'}</p>
                    <p className="mt-0.5 text-[10px] text-[#8C9BB9]">ETA: {formatDate(call.eta)}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '130px',
            render: (call) => (
                <StatusBadge status={statusLabel(call.status)} label={statusLabel(call.status)} />
            ),
        },
        {
            key: 'total_invoiced',
            header: 'Total Ditagihkan',
            align: 'right',
            width: '180px',
            render: (call) => (
                <div>
                    <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                        {formatRupiah(call.total_invoiced)}
                    </p>
                    <p className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                        Jasa: {formatRupiah(call.agency_invoiced)}
                    </p>
                    <p className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                        Reimb: {formatRupiah(call.reimbursement_invoiced)}
                    </p>
                </div>
            ),
        },
        {
            key: 'total_hpp',
            header: 'HPP Langsung',
            align: 'right',
            width: '160px',
            render: (call) => (
                <span className="font-semibold text-[#52658E] dark:text-[#94A3B8]">
                    {formatRupiah(call.total_hpp)}
                </span>
            ),
        },
        {
            key: 'margin',
            header: 'Margin & Rasio',
            align: 'right',
            width: '170px',
            render: (call) => {
                const isPositive = call.margin >= 0;
                return (
                    <div>
                        <p className={`font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#C62840]'}`}>
                            {formatRupiah(call.margin)}
                        </p>
                        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#C62840]'}`}>
                            {isPositive ? <ArrowUpRight aria-hidden="true" className="size-3" /> : <ArrowDownRight aria-hidden="true" className="size-3" />}
                            {call.margin_percentage.toLocaleString('id-ID')}%
                        </span>
                    </div>
                );
            },
        },
    ];

    const invoiceColumns: Column<InvoiceReportItem>[] = [
        {
            key: 'number',
            header: 'Invoice',
            sortable: true,
            width: '180px',
            render: (invoice) => (
                <div>
                    <p className="font-mono font-bold text-[#0060F4]">{invoice.invoice_number}</p>
                    <p className="mt-0.5 text-[10px] uppercase text-[#52658E]">{invoice.invoice_type}</p>
                </div>
            ),
        },
        {
            key: 'client',
            header: 'Klien & Kegiatan',
            width: '230px',
            render: (invoice) => (
                <div className="min-w-0">
                    <p className="font-bold text-[#0B1F63] dark:text-white">{invoice.company_name}</p>
                    <p className="truncate text-[11px] text-[#52658E] dark:text-[#9FB0C6]">{invoice.ship_name} · {invoice.job_number}</p>
                </div>
            ),
        },
        {
            key: 'date',
            header: 'Tanggal & Jatuh Tempo',
            sortable: true,
            width: '160px',
            render: (invoice) => (
                <div>
                    <p className="font-semibold">{formatDate(invoice.invoice_date)}</p>
                    <p className="text-[10px] text-[#52658E]">Jatuh tempo {formatDate(invoice.due_date)}</p>
                </div>
            ),
        },
        {
            key: 'amount',
            header: 'Nilai Invoice',
            sortable: true,
            align: 'right',
            width: '155px',
            render: (invoice) => <MoneyValue value={invoice.grand_total} className="font-bold" />,
        },
        {
            key: 'paid',
            header: 'Terbayar',
            align: 'right',
            width: '145px',
            render: (invoice) => <MoneyValue value={invoice.paid_amount} className="font-semibold text-emerald-700 dark:text-emerald-400" />,
        },
        {
            key: 'outstanding',
            header: 'Sisa',
            align: 'right',
            width: '145px',
            render: (invoice) => <MoneyValue value={invoice.outstanding_amount} className="font-bold text-rose-700 dark:text-rose-400" />,
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            width: '135px',
            render: (invoice) => <StatusBadge status={invoiceStatusTone(invoice.status)} label={invoiceStatusLabel(invoice.status)} size="sm" />,
        },
    ];

    const receivableColumns: Column<ReceivableReportItem>[] = [
        ...invoiceColumns.filter((column) => !['paid', 'status'].includes(column.key)) as Column<ReceivableReportItem>[],
        {
            key: 'aging',
            header: 'Umur Piutang',
            width: '155px',
            render: (invoice) => (
                <StatusBadge
                    status={invoice.days_overdue > 0 ? 'danger' : 'info'}
                    label={invoice.aging}
                    size="sm"
                />
            ),
        },
    ];

    const expenseColumns: Column<ExpenseReportItem>[] = [
        {
            key: 'number',
            header: 'Referensi',
            sortable: true,
            width: '190px',
            render: (expense) => (
                <div>
                    <p className="font-mono font-bold text-[#0060F4]">{expense.reference_number || '-'}</p>
                    <p className="mt-0.5 text-[10px] text-[#52658E]">{expense.payment_type}</p>
                </div>
            ),
        },
        {
            key: 'recipient',
            header: 'Penerima',
            width: '200px',
            render: (expense) => (
                <div>
                    <p className="font-bold text-[#0B1F63] dark:text-white">{expense.recipient || '-'}</p>
                    <p className="text-[10px] text-[#52658E]">Dicatat {expense.recorded_by}</p>
                </div>
            ),
        },
        {
            key: 'job',
            header: 'Kegiatan Kapal',
            width: '220px',
            render: (expense) => (
                <div>
                    <p className="font-semibold">{expense.ship_name}</p>
                    <p className="font-mono text-[10px] text-[#52658E]">{expense.job_number}</p>
                </div>
            ),
        },
        { key: 'date', header: 'Tanggal', sortable: true, width: '130px', render: (expense) => formatDate(expense.payment_date) },
        {
            key: 'amount',
            header: 'Nilai',
            sortable: true,
            align: 'right',
            width: '155px',
            render: (expense) => <MoneyValue value={expense.amount} className="font-black" />,
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            width: '185px',
            render: (expense) => <StatusBadge status={paymentStatusTone(expense.verification_status)} label={paymentStatusLabel(expense.verification_status)} size="sm" />,
        },
    ];

    const activityColumns: Column<ActivityReportItem>[] = [
        {
            key: 'date',
            header: 'Waktu',
            sortable: true,
            width: '145px',
            render: (activity) => (
                <div>
                    <p className="font-semibold">{formatDate(activity.activity_date)}</p>
                    <p className="text-[10px] text-[#52658E]">{activity.activity_time || 'Waktu tidak dicatat'}</p>
                </div>
            ),
        },
        {
            key: 'name',
            header: 'Aktivitas',
            sortable: true,
            width: '250px',
            render: (activity) => (
                <div className="min-w-0">
                    <p className="font-bold text-[#0B1F63] dark:text-white">{activity.title}</p>
                    <p className="truncate text-[10px] text-[#52658E]">{activity.category} · {activity.location_name || 'Lokasi tidak dicatat'}</p>
                </div>
            ),
        },
        {
            key: 'job',
            header: 'Kapal & Job',
            width: '210px',
            render: (activity) => (
                <div>
                    <p className="font-semibold">{activity.ship_name}</p>
                    <p className="font-mono text-[10px] text-[#52658E]">{activity.job_number}</p>
                </div>
            ),
        },
        { key: 'officer', header: 'Petugas', width: '160px', render: (activity) => activity.officer_name },
        {
            key: 'progress',
            header: 'Progress',
            sortable: true,
            align: 'right',
            width: '115px',
            render: (activity) => activity.progress_percent === null || activity.progress_percent === undefined ? '-' : `${activity.progress_percent}%`,
        },
        {
            key: 'status',
            header: 'Kondisi',
            width: '145px',
            render: (activity) => (
                <StatusBadge
                    status={activity.has_constraints ? 'danger' : 'success'}
                    label={activity.has_constraints ? 'Ada Kendala' : 'Terkendali'}
                    size="sm"
                />
            ),
        },
    ];

    return (
        <AppLayout
            title={`Laporan ${activeReportSection.label} — PT Samudra Jaya Andalas`}
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title={`Laporan ${activeReportSection.label} — PT Samudra Jaya Andalas`} />

            <MobilePageHero
                title={`Laporan ${activeReportSection.label}`}
                description={activeReportSection.description}
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-5 rounded-t-[28px] bg-white px-4 pb-12 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none md:dark:bg-transparent">
                {/* ── Report Section Navigation (Mobile & Desktop) ── */}
                <ReportNavigationBar activeKey={activeTab} className="mb-1" />

                {/* ── Page Header & Print Button ── */}
                <div className="hidden items-center justify-between gap-4 pb-2 border-b border-[#DCEAF8] dark:border-[#1E3A5F] md:flex">
                    <div>
                        <h1 className="text-2xl font-black text-[#0B1F63] sm:text-3xl dark:text-[#F1F5F9]">
                            Laporan {activeReportSection.label}
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            {activeReportSection.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => handleExport('pdf')}
                            leftIcon={<FileText aria-hidden="true" className="size-4" />}
                            className="bg-[#0060F4]"
                        >
                            Unduh PDF
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleExport('xlsx')}
                            leftIcon={<FileSpreadsheet aria-hidden="true" className="size-4 text-[#087443]" />}
                            className="bg-white dark:bg-[#0C1D36]"
                        >
                            Unduh Excel
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrint}
                            leftIcon={<Printer aria-hidden="true" className="size-4" />}
                            className="bg-white dark:bg-[#0C1D36]"
                        >
                            Cetak
                        </Button>
                    </div>
                </div>

                {/* ── Advanced Filter Toolbar with Modal ── */}
                <Card padding="md">
                    <div className="space-y-4">
                        <div className="grid gap-3 border-b border-[#DCEAF8]/70 pb-4 sm:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] sm:items-end dark:border-[#1E3A5F]/70">
                            <div className="flex min-w-0 items-start gap-2.5">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                    <CalendarDays aria-hidden="true" className="size-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-balance text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                        Periode seluruh laporan
                                    </p>
                                    <p className="mt-0.5 text-pretty text-[11px] leading-4 text-[#52658E] dark:text-[#94A3B8]">
                                        Berlaku untuk semua statistik, tabel, dan grafik pada halaman laporan.
                                    </p>
                                </div>
                            </div>
                            <DateRangePicker
                                value={dateRange}
                                onChange={handlePeriodChange}
                                placeholder="Pilih periode seluruh laporan"
                                placement="down"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            {/* Search (Roomy) */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters();
                                }}
                                className="relative flex-1"
                            >
                                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8C9BB9]" />
                                <input
                                    type="search"
                                    name="search"
                                    autoComplete="off"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari job, kapal, SPK, klien…"
                                    aria-label="Cari kegiatan kapal"
                                    className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] pl-9 pr-11 text-base font-semibold text-[#0B1F63] placeholder-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/30 sm:text-sm dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            applyFilters({ search: '' });
                                        }}
                                        className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#8C9BB9] hover:bg-rose-50 hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:hover:bg-rose-950/30"
                                        aria-label="Hapus pencarian"
                                    >
                                        <X aria-hidden="true" className="size-3.5" />
                                    </button>
                                )}
                            </form>

                            {/* Filter Modal Trigger & Reset */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    type="button"
                                    variant={activeFilterCount > 0 ? 'primary' : 'outline'}
                                    onClick={() => {
                                        setModalCompanyId(companyId);
                                        setModalShipId(shipId);
                                        setModalJob(job);
                                        setModalStatus(status);
                                        setIsFilterModalOpen(true);
                                    }}
                                    leftIcon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
                                    className="h-11 px-4 text-xs font-bold"
                                >
                                    <span>Filter</span>
                                    {activeFilterCount > 0 && (
                                        <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-white/25 text-[11px] font-black text-white dark:bg-black/30">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </Button>

                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleResetFilters}
                                        className="h-11 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                    >
                                        <RotateCcw aria-hidden="true" className="size-3.5 mr-1" />
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Active Filter Chips */}
                        {hasAdvancedFilters && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60 text-xs">
                                <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">Filter aktif:</span>
                                {companyId && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Perusahaan: {companies.find((c) => c.id === companyId)?.name || companyId}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCompanyId('');
                                                setShipId('');
                                                applyFilters({ company_id: '', ship_id: '' });
                                            }}
                                            className="-my-2 -mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-white hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4] dark:hover:bg-[#0D2945]"
                                            aria-label="Hapus filter perusahaan"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                                {shipId && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Kapal: {ships.find((s) => s.id === shipId)?.name || shipId}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShipId('');
                                                applyFilters({ ship_id: '' });
                                            }}
                                            className="-my-2 -mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-white hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4] dark:hover:bg-[#0D2945]"
                                            aria-label="Hapus filter kapal"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                                {job && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Job: {job}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setJob('');
                                                applyFilters({ job: '' });
                                            }}
                                            className="-my-2 -mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-white hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4] dark:hover:bg-[#0D2945]"
                                            aria-label="Hapus filter job"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                                {status && status !== 'all' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Status: {statusOptions.find((s) => s.value === status)?.label || status}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStatus('all');
                                                applyFilters({ status: 'all' });
                                            }}
                                            className="-my-2 -mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-white hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4] dark:hover:bg-[#0D2945]"
                                            aria-label="Hapus filter status"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* ═══════════════════════════════════════════════════════════
                    REPORT: RINGKASAN & MARGIN PER JOB
                ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'ringkasan_margin' && (
                    <div id="report-panel-ringkasan_margin" className="space-y-5">
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                            <MetricCard
                                label="Total Nilai Tagihan"
                                value={summary.total_invoiced}
                                detail={<>Jasa: <MoneyValue value={summary.agency_revenue} size="inline" className="font-semibold text-[10px] sm:text-[11px]" /></>}
                                icon={<DollarSign aria-hidden="true" className="size-4 sm:size-5" />}
                            />
                            <MetricCard
                                label="Total HPP Langsung"
                                value={summary.total_hpp}
                                detail="Biaya item kebutuhan"
                                tone="slate"
                                icon={<FileText aria-hidden="true" className="size-4 sm:size-5" />}
                            />
                            <MetricCard
                                label="Total Margin Kapal"
                                value={summary.ship_margin}
                                detail="Tagihan dikurangi HPP"
                                tone="green"
                                icon={<TrendingUp aria-hidden="true" className="size-4 sm:size-5" />}
                            />
                            <Card padding="sm" className="min-w-0">
                                <div className="grid min-h-[82px] grid-cols-[minmax(0,1fr)_34px] items-center gap-2 sm:min-h-[96px] sm:grid-cols-[minmax(0,1fr)_40px]">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold leading-4 text-[#0060F4] sm:text-xs dark:text-[#38BDF8]">Rata-rata Margin</p>
                                        <p className={`mt-1 whitespace-nowrap leading-tight tabular-nums text-[#0060F4] dark:text-[#38BDF8] ${getAdaptiveMoneyFontSize(`${summary.gross_margin_percentage ?? 0}%`)}`}>
                                            {summary.gross_margin_percentage ?? 0}%
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-[10px] leading-3.5 text-[#52658E] sm:text-[11px] dark:text-[#9FB0C6]">
                                            Bersih: <MoneyValue value={summary.company_net_result} size="inline" className="font-semibold text-[10px] sm:text-[11px]" />
                                        </p>
                                    </div>
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E0F0FF] text-[#0060F4] sm:size-10 sm:rounded-xl dark:bg-[#152E52]">
                                        <Percent aria-hidden="true" className="size-4 sm:size-5" />
                                    </span>
                                </div>
                            </Card>
                        </div>

                        {/* Detailed Table */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    Daftar Performa Finansial per Job Kunjungan
                                </h2>
                                <span className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                    {portCalls.total} Kegiatan Terdata
                                </span>
                            </div>

                            <ResponsiveTable<PortCallReportItem>
                                data={portCalls.data}
                                keyExtractor={(call) => call.id}
                                desktop={{ columns: jobColumns, compact: true, minWidth: '1080px' }}
                                mobile={{
                                    titleRender: (call) => call.ship_name,
                                    subtitleRender: (call) => (
                                        <span className="font-mono font-bold text-[#0060F4]">{call.job_number}</span>
                                    ),
                                    statusRender: (call) => (
                                        <StatusBadge status={statusLabel(call.status)} label={statusLabel(call.status)} />
                                    ),
                                    fields: [
                                        { label: 'Klien', render: (call) => call.company_name },
                                        { label: 'SPK Klien', render: (call) => call.client_spk || '-' },
                                        { label: 'Pelabuhan & Stay', render: (call) => `${call.port_name} (${call.stay_duration || '-'})` },
                                        { label: 'Total Ditagihkan', render: (call) => <MoneyValue value={call.total_invoiced} /> },
                                        { label: 'Jasa / Reimbursement', render: (call) => <><MoneyValue value={call.agency_invoiced} /> / <MoneyValue value={call.reimbursement_invoiced} /></> },
                                        { label: 'HPP Langsung', render: (call) => <MoneyValue value={call.total_hpp} /> },
                                        {
                                            label: 'Margin SJA',
                                            fullWidth: true,
                                            render: (call) => (
                                                <span className={`font-bold ${call.margin >= 0 ? 'text-emerald-600' : 'text-[#C62840]'}`}>
                                                    <MoneyValue value={call.margin} /> ({call.margin_percentage.toLocaleString('id-ID')}%)
                                                </span>
                                            ),
                                        },
                                    ],
                                }}
                            />
                            <Pagination
                                links={portCalls.links}
                                currentPage={portCalls.current_page}
                                lastPage={portCalls.last_page}
                                total={portCalls.total}
                                from={portCalls.from ?? undefined}
                                to={portCalls.to ?? undefined}
                                perPage={portCalls.per_page}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'invoice' && (
                    <div id="report-panel-invoice" className="space-y-5">
                        <section aria-labelledby="invoice-report-title">
                            <div className="mb-3 flex items-end justify-between gap-3">
                                <div>
                                    <h2 id="invoice-report-title" className="text-balance text-base font-extrabold text-[#0B1F63] sm:text-lg dark:text-white">Laporan Invoice Klien</h2>
                                    <p className="mt-0.5 text-pretty text-[11px] text-[#52658E] sm:text-xs dark:text-[#9FB0C6]">Nilai, pembayaran, dan status seluruh invoice dalam periode terpilih.</p>
                                </div>
                                <span className="shrink-0 text-xs font-semibold text-[#52658E]">{invoiceReport.summary.total_documents} dokumen</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                                <MetricCard label="Total Invoice" value={invoiceReport.summary.total_documents} detail={`${invoiceReport.summary.released_documents} dirilis / terkirim`} format="number" icon={<FileText aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Nilai Ditagihkan" value={invoiceReport.summary.billed_amount} detail="Invoice dirilis, terkirim, atau lunas" icon={<DollarSign aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Sudah Terbayar" value={invoiceReport.summary.paid_amount} detail={`${invoiceReport.summary.paid_documents} invoice berstatus lunas`} tone="green" icon={<CheckCircle2 aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Sisa Invoice" value={invoiceReport.summary.outstanding_amount} detail="Nilai yang masih harus diterima" tone="red" icon={<Building2 aria-hidden="true" className="size-4 sm:size-5" />} />
                            </div>
                        </section>

                        <DashboardAnalytics charts={[invoiceReport.chart]} />

                        <section className="space-y-3" aria-labelledby="invoice-table-title">
                            <div className="flex items-center justify-between gap-3">
                                <h2 id="invoice-table-title" className="text-base font-extrabold text-[#0B1F63] dark:text-white">Daftar Invoice</h2>
                                <span className="text-xs font-semibold text-[#52658E]">{invoiceReport.rows.total} data</span>
                            </div>
                            <ResponsiveTable<InvoiceReportItem>
                                data={invoiceReport.rows.data}
                                keyExtractor={(invoice) => invoice.id}
                                desktop={{
                                    columns: invoiceColumns,
                                    compact: true,
                                    minWidth: '1120px',
                                    sortColumn: filters.sort,
                                    sortDirection: filters.direction,
                                    onSort: sortReport,
                                    emptyMessage: 'Belum ada invoice pada periode ini.',
                                }}
                                mobile={{
                                    titleRender: (invoice) => invoice.invoice_number,
                                    subtitleRender: (invoice) => `${invoice.company_name} · ${invoice.invoice_type}`,
                                    statusRender: (invoice) => <StatusBadge status={invoiceStatusTone(invoice.status)} label={invoiceStatusLabel(invoice.status)} size="sm" />,
                                    emptyMessage: 'Belum ada invoice pada periode ini.',
                                    fields: [
                                        { label: 'Kapal / Job', render: (invoice) => `${invoice.ship_name} · ${invoice.job_number}` },
                                        { label: 'Tanggal', render: (invoice) => formatDate(invoice.invoice_date) },
                                        { label: 'Jatuh Tempo', render: (invoice) => formatDate(invoice.due_date) },
                                        { label: 'Nilai', render: (invoice) => <MoneyValue value={invoice.grand_total} /> },
                                        { label: 'Terbayar', render: (invoice) => <MoneyValue value={invoice.paid_amount} /> },
                                        { label: 'Sisa', fullWidth: true, render: (invoice) => <MoneyValue value={invoice.outstanding_amount} className="font-bold text-rose-700" /> },
                                    ],
                                }}
                            />
                            <Pagination links={invoiceReport.rows.links} currentPage={invoiceReport.rows.current_page} lastPage={invoiceReport.rows.last_page} total={invoiceReport.rows.total} from={invoiceReport.rows.from ?? undefined} to={invoiceReport.rows.to ?? undefined} perPage={invoiceReport.rows.per_page} />
                        </section>
                    </div>
                )}

                {activeTab === 'piutang' && (
                    <div id="report-panel-piutang" className="space-y-5">
                        <section aria-labelledby="receivable-report-title">
                            <div className="mb-3">
                                <h2 id="receivable-report-title" className="text-balance text-base font-extrabold text-[#0B1F63] sm:text-lg dark:text-white">Laporan Piutang Klien</h2>
                                <p className="mt-0.5 text-pretty text-[11px] text-[#52658E] sm:text-xs dark:text-[#9FB0C6]">Posisi sisa tagihan dan umur piutang berdasarkan jatuh tempo invoice.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                                <MetricCard label="Total Piutang" value={receivableReport.summary.outstanding_amount} detail={`${receivableReport.summary.open_documents} invoice masih terbuka`} tone="red" icon={<Building2 aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Lewat Jatuh Tempo" value={receivableReport.summary.overdue_amount} detail="Perlu tindak lanjut penagihan" tone="amber" icon={<Clock aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Belum Jatuh Tempo" value={receivableReport.summary.current_amount} detail="Masih dalam tenor pembayaran" icon={<FileSpreadsheet aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Kolektibilitas" value={receivableReport.summary.collection_rate} detail="Persentase nilai invoice terbayar" format="percentage" tone="green" icon={<Percent aria-hidden="true" className="size-4 sm:size-5" />} />
                            </div>
                        </section>

                        <DashboardAnalytics charts={[receivableReport.chart]} />

                        <section className="space-y-3" aria-labelledby="receivable-table-title">
                            <div className="flex items-center justify-between gap-3">
                                <h2 id="receivable-table-title" className="text-base font-extrabold text-[#0B1F63] dark:text-white">Daftar Piutang Aktif</h2>
                                <span className="text-xs font-semibold text-[#52658E]">{receivableReport.rows.total} invoice</span>
                            </div>
                            <ResponsiveTable<ReceivableReportItem>
                                data={receivableReport.rows.data}
                                keyExtractor={(invoice) => invoice.id}
                                desktop={{
                                    columns: receivableColumns,
                                    compact: true,
                                    minWidth: '1080px',
                                    sortColumn: filters.sort,
                                    sortDirection: filters.direction,
                                    onSort: sortReport,
                                    emptyMessage: 'Tidak ada piutang aktif pada periode ini.',
                                }}
                                mobile={{
                                    titleRender: (invoice) => invoice.invoice_number,
                                    subtitleRender: (invoice) => invoice.company_name,
                                    statusRender: (invoice) => <StatusBadge status={invoice.days_overdue > 0 ? 'danger' : 'info'} label={invoice.aging} size="sm" />,
                                    emptyMessage: 'Tidak ada piutang aktif pada periode ini.',
                                    fields: [
                                        { label: 'Kapal / Job', render: (invoice) => `${invoice.ship_name} · ${invoice.job_number}` },
                                        { label: 'Jatuh Tempo', render: (invoice) => formatDate(invoice.due_date) },
                                        { label: 'Nilai Invoice', render: (invoice) => <MoneyValue value={invoice.grand_total} /> },
                                        { label: 'Terbayar', render: (invoice) => <MoneyValue value={invoice.paid_amount} /> },
                                        { label: 'Sisa Piutang', fullWidth: true, render: (invoice) => <MoneyValue value={invoice.outstanding_amount} className="font-bold text-rose-700" /> },
                                    ],
                                }}
                            />
                            <Pagination links={receivableReport.rows.links} currentPage={receivableReport.rows.current_page} lastPage={receivableReport.rows.last_page} total={receivableReport.rows.total} from={receivableReport.rows.from ?? undefined} to={receivableReport.rows.to ?? undefined} perPage={receivableReport.rows.per_page} />
                        </section>
                    </div>
                )}

                {(activeTab === 'pengeluaran' || activeTab === 'pengeluaran_kapal') && (
                    <div id="report-panel-pengeluaran" className="space-y-5">
                        <section aria-labelledby="expense-report-title">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                <div>
                                    <h2 id="expense-report-title" className="text-balance text-base font-extrabold text-[#0B1F63] sm:text-lg dark:text-white">
                                        Laporan Pengeluaran Terpadu (Kapal &amp; Kantor)
                                    </h2>
                                    <p className="mt-0.5 text-pretty text-[11px] text-[#52658E] sm:text-xs dark:text-[#9FB0C6]">
                                        Rekapitulasi lengkap pengeluaran operasional kebutuhan kapal (HPP) dan pengeluaran kas operasional kantor perusahaan.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={() => handleExport('pdf')}
                                        leftIcon={<FileText aria-hidden="true" className="size-4" />}
                                        size="sm"
                                        className="bg-[#0060F4]"
                                    >
                                        Unduh PDF (Semua)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleExport('xlsx')}
                                        leftIcon={<FileSpreadsheet aria-hidden="true" className="size-4 text-[#087443]" />}
                                        size="sm"
                                        className="bg-white dark:bg-[#0C1D36]"
                                    >
                                        Unduh Excel (Semua)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handlePrint}
                                        leftIcon={<Printer aria-hidden="true" className="size-4" />}
                                        size="sm"
                                        className="shrink-0 bg-white dark:bg-[#0C1D36]"
                                    >
                                        Cetak
                                    </Button>
                                </div>
                            </div>

                            {/* 4 KPI Cards */}
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                                <MetricCard
                                    label="Total Pengeluaran Terpadu"
                                    value={expenseReport.summary.total_combined_expense ?? ((expenseReport.summary.total_recorded || 0) + (vesselDailyExpenseSummary?.total_expenses || 0))}
                                    detail="Total gabungan kapal & kantor"
                                    tone="blue"
                                    icon={<Banknote aria-hidden="true" className="size-4 sm:size-5" />}
                                />
                                <MetricCard
                                    label="Pengeluaran Kapal (HPP)"
                                    value={vesselDailyExpenseSummary?.total_expenses || expenseReport.summary.total_vessel_expense || 0}
                                    detail={`${vesselDailyExpenseSummary?.total_vessels || 0} kapal · ${vesselDailyExpenseSummary?.total_items || 0} item kebutuhan`}
                                    tone="slate"
                                    icon={<Ship aria-hidden="true" className="size-4 sm:size-5" />}
                                />
                                <MetricCard
                                    label="Biaya Operasional Kantor"
                                    value={expenseReport.summary.total_recorded}
                                    detail={`${expenseReport.summary.total_documents} transaksi kas keluar`}
                                    tone="amber"
                                    icon={<Building2 aria-hidden="true" className="size-4 sm:size-5" />}
                                />
                                <MetricCard
                                    label="Kas Terverifikasi"
                                    value={expenseReport.summary.verified_amount}
                                    detail={`Menunggu: ${formatRupiah(expenseReport.summary.pending_amount)}`}
                                    tone="green"
                                    icon={<CheckCircle2 aria-hidden="true" className="size-4 sm:size-5" />}
                                />
                            </div>
                        </section>

                        {/* Subview Segmented Filter */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-[#F0F5FD] dark:bg-[#071322] rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F]">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setExpenseSubView('all')}
                                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                                        expenseSubView === 'all'
                                            ? 'bg-[#0060F4] text-white shadow-sm'
                                            : 'text-[#52658E] hover:text-[#0B1F63] hover:bg-white/80 dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#102B4A]'
                                    }`}
                                >
                                    Semua (Ringkasan Terpadu)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setExpenseSubView('kapal')}
                                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 ${
                                        expenseSubView === 'kapal'
                                            ? 'bg-[#0060F4] text-white shadow-sm'
                                            : 'text-[#52658E] hover:text-[#0B1F63] hover:bg-white/80 dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#102B4A]'
                                    }`}
                                >
                                    <Ship className="size-3.5" />
                                    Pengeluaran Kapal ({vesselDailyExpenseSummary?.total_vessels || 0})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setExpenseSubView('kantor')}
                                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 ${
                                        expenseSubView === 'kantor'
                                            ? 'bg-[#0060F4] text-white shadow-sm'
                                            : 'text-[#52658E] hover:text-[#0B1F63] hover:bg-white/80 dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#102B4A]'
                                    }`}
                                >
                                    <Building2 className="size-3.5" />
                                    Biaya Kantor / Kas Keluar ({expenseReport.rows.total})
                                </button>
                            </div>
                            <span className="text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8] px-2 hidden sm:inline">
                                {expenseSubView === 'all' && 'Menampilkan pengeluaran kapal dan operasional kantor'}
                                {expenseSubView === 'kapal' && 'Fokus rincian pengeluaran per kapal dan per item'}
                                {expenseSubView === 'kantor' && 'Fokus daftar kas keluar & biaya kantor'}
                            </span>
                        </div>

                        {/* SECTION A: Vessel Expenses (Shown when expenseSubView === 'all' or 'kapal') */}
                        {(expenseSubView === 'all' || expenseSubView === 'kapal') && (
                            <section className="space-y-3" aria-labelledby="vessel-expense-subheading">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Ship className="size-4 text-[#0060F4]" />
                                        <h3 id="vessel-expense-subheading" className="text-base font-extrabold text-[#0B1F63] dark:text-white">
                                            Pengeluaran Kebutuhan Kapal (HPP &amp; Harian)
                                        </h3>
                                    </div>
                                    <span className="text-xs font-semibold text-[#52658E]">
                                        {vesselDailyExpenseSummary?.total_vessels || 0} kapal · {vesselDailyExpenseSummary?.total_items || 0} item
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {(!vesselDailyExpenseSummary?.vessels || vesselDailyExpenseSummary.vessels.length === 0) ? (
                                        <Card padding="lg" className="text-center py-10">
                                            <Ship className="mx-auto size-9 text-[#8C9BB9] dark:text-[#52658E] mb-2" />
                                            <p className="font-extrabold text-[#0B1F63] dark:text-white text-sm">Tidak Ada Data Pengeluaran Kapal</p>
                                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1">
                                                Tidak ditemukan catatan pengeluaran kebutuhan kapal untuk filter periode atau kapal yang dipilih.
                                            </p>
                                        </Card>
                                    ) : (
                                        vesselDailyExpenseSummary.vessels.map((vessel, vIndex) => (
                                            <Card key={vessel.port_call_id || vIndex} padding="none" className="overflow-hidden border border-[#BCE0FD] dark:border-[#285585]">
                                                <div className="bg-[#F0F8FF] dark:bg-[#102B4A] p-4 border-b border-[#DCEAF8] dark:border-[#1E3A5F]">
                                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-mono text-xs font-black text-[#0060F4] bg-[#E0F0FF] dark:bg-[#071322] px-2.5 py-0.5 rounded-md">
                                                                    {vessel.job_number}
                                                                </span>
                                                                <h4 className="font-black text-base text-[#0B1F63] dark:text-white">
                                                                    {vessel.ship_name}
                                                                </h4>
                                                                <StatusBadge
                                                                    status={vessel.status === 'berthed' ? 'success' : vessel.status === 'departed' || vessel.status === 'completed' ? 'neutral' : 'info'}
                                                                    label={statusLabel(vessel.status)}
                                                                    size="sm"
                                                                />
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                                <span>Perusahaan: <strong className="text-[#0B1F63] dark:text-white">{vessel.company_name}</strong></span>
                                                                <span>Pelabuhan: <strong className="text-[#0B1F63] dark:text-white">{vessel.port_name}</strong></span>
                                                                {vessel.client_spk && <span>SPK Klien: <strong className="font-mono">{vessel.client_spk}</strong></span>}
                                                                <span>
                                                                    Sandar: {formatDate(vessel.eta)}
                                                                    {vessel.departed_at ? ` · Keluar: ${formatDate(vessel.departed_at)}` : vessel.etd ? ` · Rencana Keluar: ${formatDate(vessel.etd)}` : ''}
                                                                    {` (${vessel.stay_duration})`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-center">
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#52658E] dark:text-[#94A3B8]">Total Pengeluaran Kapal</p>
                                                                <p className="font-mono text-lg font-black text-[#0060F4] dark:text-[#60A5FA]">
                                                                    {formatRupiah(vessel.total_expense)}
                                                                </p>
                                                            </div>
                                                            <div className="rounded-xl bg-white dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] px-3 py-1.5 text-center">
                                                                <p className="text-[10px] font-bold text-[#52658E] dark:text-[#94A3B8]">Item</p>
                                                                <p className="font-mono text-sm font-extrabold text-[#0B1F63] dark:text-white">{vessel.item_count}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 border-l border-[#DCEAF8] pl-3 dark:border-[#1E3A5F]">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleExport('pdf', vessel.job_number)}
                                                                    leftIcon={<FileText aria-hidden="true" className="size-3.5 text-[#0060F4]" />}
                                                                    className="bg-white text-xs font-bold dark:bg-[#071322]"
                                                                    title={`Unduh PDF Pengeluaran Job ${vessel.job_number}`}
                                                                >
                                                                    PDF Job
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleExport('xlsx', vessel.job_number)}
                                                                    leftIcon={<FileSpreadsheet aria-hidden="true" className="size-3.5 text-[#087443]" />}
                                                                    className="bg-white text-xs font-bold dark:bg-[#071322]"
                                                                    title={`Unduh Excel Pengeluaran Job ${vessel.job_number}`}
                                                                >
                                                                    Excel Job
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Desktop Table: Visible on md and up */}
                                                <div className="hidden md:block overflow-x-auto">
                                                    <table className="w-full text-left border-collapse text-xs">
                                                        <thead>
                                                            <tr className="border-b border-[#DCEAF8] bg-slate-50 dark:border-[#1E3A5F] dark:bg-[#0C1D36]/80 text-[#52658E] dark:text-[#94A3B8]">
                                                                <th className="py-2.5 px-3 font-bold w-10 text-center">No</th>
                                                                <th className="py-2.5 px-3 font-bold w-28">Tanggal</th>
                                                                <th className="py-2.5 px-3 font-bold w-36">No. Pengajuan</th>
                                                                <th className="py-2.5 px-3 font-bold">Item Kebutuhan &amp; Catatan</th>
                                                                <th className="py-2.5 px-3 font-bold w-24 text-right">Qty</th>
                                                                <th className="py-2.5 px-3 font-bold w-28 text-right">HPP Satuan</th>
                                                                <th className="py-2.5 px-3 font-bold w-32 text-right">Biaya Item</th>
                                                                <th className="py-2.5 px-3 font-bold w-36 text-right bg-[#EAF4FF] dark:bg-[#102B4A]/80 text-[#0060F4] dark:text-[#60A5FA]">
                                                                    Akumulatif s/d Hari Ini
                                                                </th>
                                                                <th className="py-2.5 px-3 font-bold w-28 text-center">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[#DCEAF8] dark:divide-[#1E3A5F]">
                                                            {vessel.items.map((it, itIdx) => (
                                                                <tr key={it.id || itIdx} className="hover:bg-[#F8FBFF] dark:hover:bg-[#102B4A]/40 transition-colors">
                                                                    <td className="py-2.5 px-3 text-center text-[#52658E] font-medium">{itIdx + 1}</td>
                                                                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-[#0B1F63] dark:text-white">
                                                                        {formatDate(it.date)}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] font-semibold text-[#0060F4]">
                                                                        {it.request_number}
                                                                    </td>
                                                                    <td className="py-2.5 px-3">
                                                                        <p className="font-bold text-[#0B1F63] dark:text-white">{it.item_name}</p>
                                                                        {it.notes && (
                                                                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-0.5 whitespace-pre-line">
                                                                                {it.notes}
                                                                            </p>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                                                                        {it.quantity} {it.unit}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-right font-mono text-[#52658E] dark:text-[#94A3B8] whitespace-nowrap">
                                                                        {formatRupiah(it.hpp_price)}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0B1F63] dark:text-white whitespace-nowrap">
                                                                        {formatRupiah(it.total_cost)}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#0060F4] dark:text-[#60A5FA] bg-[#F4F9FF] dark:bg-[#102B4A]/50 whitespace-nowrap">
                                                                        {formatRupiah(it.cumulative_cost)}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                                        <StatusBadge
                                                                            status={it.director_status === 'approved' ? 'success' : it.director_status === 'rejected' ? 'danger' : 'amber'}
                                                                            label={it.director_status === 'approved' ? 'Disetujui' : it.director_status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                                                            size="sm"
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr className="border-t-2 border-[#BCE0FD] dark:border-[#285585] bg-[#EAF4FF] dark:bg-[#102B4A] font-extrabold text-[#0B1F63] dark:text-white">
                                                                <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                                                                    Total Pengeluaran Kapal ({vessel.ship_name}):
                                                                </td>
                                                                <td className="py-3 px-3 text-right font-mono text-sm font-black text-[#0060F4] dark:text-[#60A5FA]">
                                                                    {formatRupiah(vessel.total_expense)}
                                                                </td>
                                                                <td colSpan={2} className="py-3 px-3 text-xs font-bold text-[#52658E] dark:text-[#94A3B8]">
                                                                    {vessel.item_count} Item Kebutuhan
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>

                                                {/* Mobile Cards: Visible below md */}
                                                <div className="md:hidden divide-y divide-[#DCEAF8] dark:divide-[#1E3A5F]">
                                                    {vessel.items.map((it, itIdx) => (
                                                        <div key={it.id || itIdx} className="p-3.5 space-y-2 bg-white dark:bg-[#071322]">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                                        <span className="font-bold text-[#0B1F63] dark:text-white">#{itIdx + 1}</span>
                                                                        <span>·</span>
                                                                        <span>{formatDate(it.date)}</span>
                                                                    </div>
                                                                    <p className="font-extrabold text-sm text-[#0B1F63] dark:text-white mt-0.5">
                                                                        {it.item_name}
                                                                    </p>
                                                                    <p className="font-mono text-[11px] font-semibold text-[#0060F4]">
                                                                        {it.request_number}
                                                                    </p>
                                                                </div>
                                                                <StatusBadge
                                                                    status={it.director_status === 'approved' ? 'success' : it.director_status === 'rejected' ? 'danger' : 'amber'}
                                                                    label={it.director_status === 'approved' ? 'Disetujui' : it.director_status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                                                    size="sm"
                                                                />
                                                            </div>

                                                            {it.notes && (
                                                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] bg-slate-50 dark:bg-[#0C1D36] p-2 rounded-lg">
                                                                    {it.notes}
                                                                </p>
                                                            )}

                                                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                                                <div>
                                                                    <p className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">Volume / Qty</p>
                                                                    <p className="font-bold text-[#0B1F63] dark:text-white">{it.quantity} {it.unit}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">HPP Satuan</p>
                                                                    <p className="font-mono font-medium text-[#0B1F63] dark:text-white">{formatRupiah(it.hpp_price)}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between rounded-lg bg-[#F8FAFC] dark:bg-[#0C1D36] px-3 py-2 border border-[#E2E8F0] dark:border-[#1E3A5F]">
                                                                <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                                                                    Biaya Item Ini
                                                                </span>
                                                                <span className="font-mono text-xs font-black text-[#0B1F63] dark:text-white">
                                                                    {formatRupiah(it.total_cost)}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center justify-between rounded-lg bg-[#F0F8FF] dark:bg-[#102B4A]/60 px-3 py-2 border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                                                <span className="text-[11px] font-bold text-[#0060F4] dark:text-[#60A5FA]">
                                                                    Akumulatif s/d Hari Ini
                                                                </span>
                                                                <span className="font-mono text-xs font-black text-[#0060F4] dark:text-[#60A5FA]">
                                                                    {formatRupiah(it.cumulative_cost)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Mobile Total Footer Card */}
                                                    <div className="p-3.5 bg-[#EAF4FF] dark:bg-[#102B4A] border-t-2 border-[#BCE0FD] dark:border-[#285585]">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#52658E] dark:text-[#94A3B8]">
                                                                    Total Pengeluaran Kapal
                                                                </p>
                                                                <p className="text-xs font-bold text-[#0B1F63] dark:text-white truncate">
                                                                    {vessel.ship_name}
                                                                </p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="font-mono text-base font-black text-[#0060F4] dark:text-[#60A5FA]">
                                                                    {formatRupiah(vessel.total_expense)}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                                                                    {vessel.item_count} Item Kebutuhan
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </section>
                        )}

                        {/* SECTION B: Company Outgoing Payments & Expenses (Shown when expenseSubView === 'all' or 'kantor') */}
                        {(expenseSubView === 'all' || expenseSubView === 'kantor') && (
                            <div className="space-y-4 pt-2">
                                <DashboardAnalytics charts={[expenseReport.chart]} />

                                <section className="space-y-3" aria-labelledby="expense-table-title">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="size-4 text-[#0060F4]" />
                                            <h3 id="expense-table-title" className="text-base font-extrabold text-[#0B1F63] dark:text-white">
                                                Daftar Kas Keluar &amp; Biaya Kantor Perusahaan
                                            </h3>
                                        </div>
                                        <span className="text-xs font-semibold text-[#52658E]">{expenseReport.rows.total} transaksi</span>
                                    </div>
                                    <ResponsiveTable<ExpenseReportItem>
                                        data={expenseReport.rows.data}
                                        keyExtractor={(expense) => expense.id}
                                        desktop={{
                                            columns: expenseColumns,
                                            compact: true,
                                            minWidth: '1060px',
                                            sortColumn: filters.sort,
                                            sortDirection: filters.direction,
                                            onSort: sortReport,
                                            emptyMessage: 'Belum ada pembayaran keluar pada periode ini.',
                                        }}
                                        mobile={{
                                            titleRender: (expense) => expense.recipient || 'Penerima tidak dicatat',
                                            subtitleRender: (expense) => expense.reference_number || expense.payment_type,
                                            statusRender: (expense) => <StatusBadge status={paymentStatusTone(expense.verification_status)} label={paymentStatusLabel(expense.verification_status)} size="sm" />,
                                            emptyMessage: 'Belum ada pembayaran keluar pada periode ini.',
                                            fields: [
                                                { label: 'Jenis', render: (expense) => expense.payment_type },
                                                { label: 'Tanggal', render: (expense) => formatDate(expense.payment_date) },
                                                { label: 'Kapal / Job', render: (expense) => `${expense.ship_name} · ${expense.job_number}` },
                                                { label: 'Dicatat Oleh', render: (expense) => expense.recorded_by },
                                                { label: 'Nilai', fullWidth: true, render: (expense) => <MoneyValue value={expense.amount} className="font-black" /> },
                                            ],
                                        }}
                                    />
                                    <Pagination links={expenseReport.rows.links} currentPage={expenseReport.rows.current_page} lastPage={expenseReport.rows.last_page} total={expenseReport.rows.total} from={expenseReport.rows.from ?? undefined} to={expenseReport.rows.to ?? undefined} perPage={expenseReport.rows.per_page} />
                                </section>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'aktivitas' && (
                    <div id="report-panel-aktivitas" className="space-y-5">
                        <section aria-labelledby="activity-report-title">
                            <div className="mb-3">
                                <h2 id="activity-report-title" className="text-balance text-base font-extrabold text-[#0B1F63] sm:text-lg dark:text-white">Laporan Aktivitas Operasional</h2>
                                <p className="mt-0.5 text-pretty text-[11px] text-[#52658E] sm:text-xs dark:text-[#9FB0C6]">Rekap catatan lapangan, laporan harian, cakupan kapal, dan petugas.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                                <MetricCard label="Aktivitas Lapangan" value={activityReport.summary.total_activities} detail={`${activityReport.summary.with_constraints} catatan memiliki kendala`} format="number" icon={<ClipboardList aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Laporan Harian" value={activityReport.summary.daily_reports} detail="Laporan operasional terkirim" format="number" tone="green" icon={<FileText aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Kapal Tercakup" value={activityReport.summary.ships_covered} detail="Kapal dengan catatan aktivitas" format="number" icon={<Ship aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Petugas Terlibat" value={activityReport.summary.officers} detail="Pencatat aktivitas dan laporan" format="number" tone="slate" icon={<Users aria-hidden="true" className="size-4 sm:size-5" />} />
                            </div>
                        </section>

                        <DashboardAnalytics charts={[activityReport.chart]} />

                        <section className="space-y-3" aria-labelledby="activity-table-title">
                            <div className="flex items-center justify-between gap-3">
                                <h2 id="activity-table-title" className="text-base font-extrabold text-[#0B1F63] dark:text-white">Catatan Aktivitas</h2>
                                <span className="text-xs font-semibold text-[#52658E]">{activityReport.rows.total} aktivitas</span>
                            </div>
                            <ResponsiveTable<ActivityReportItem>
                                data={activityReport.rows.data}
                                keyExtractor={(activity) => activity.id}
                                desktop={{
                                    columns: activityColumns,
                                    compact: true,
                                    minWidth: '1020px',
                                    sortColumn: filters.sort,
                                    sortDirection: filters.direction,
                                    onSort: sortReport,
                                    emptyMessage: 'Belum ada aktivitas pada periode ini.',
                                }}
                                mobile={{
                                    titleRender: (activity) => activity.title,
                                    subtitleRender: (activity) => `${activity.category} · ${formatDate(activity.activity_date)}`,
                                    statusRender: (activity) => <StatusBadge status={activity.has_constraints ? 'danger' : 'success'} label={activity.has_constraints ? 'Ada Kendala' : 'Terkendali'} size="sm" />,
                                    emptyMessage: 'Belum ada aktivitas pada periode ini.',
                                    fields: [
                                        { label: 'Kapal / Job', render: (activity) => `${activity.ship_name} · ${activity.job_number}` },
                                        { label: 'Lokasi', render: (activity) => activity.location_name || '-' },
                                        { label: 'Petugas', render: (activity) => activity.officer_name },
                                        { label: 'Waktu', render: (activity) => activity.activity_time || '-' },
                                        { label: 'Progress', fullWidth: true, render: (activity) => activity.progress_percent === null || activity.progress_percent === undefined ? '-' : `${activity.progress_percent}%` },
                                    ],
                                }}
                            />
                            <Pagination links={activityReport.rows.links} currentPage={activityReport.rows.current_page} lastPage={activityReport.rows.last_page} total={activityReport.rows.total} from={activityReport.rows.from ?? undefined} to={activityReport.rows.to ?? undefined} perPage={activityReport.rows.per_page} />
                        </section>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    REPORT: LAPORAN LABA RUGI (P&L EKSEKUTIF)
                ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'laba_rugi' && (
                    <div id="report-panel-laba_rugi" className="space-y-5">
                        <Card padding="md" className="border-t-4 border-t-[#0060F4]">
                            <div className="border-b border-[#DCEAF8] pb-4 dark:border-[#1E3A5F]">
                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0">
                                        <h2 className="text-balance text-lg font-black text-[#0B1F63] sm:text-xl dark:text-white">
                                            Laporan Laba Rugi Komprehensif (Income Statement)
                                        </h2>
                                    </div>
                                    <div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-[#E0F0FF] px-3 py-1 text-[10px] font-bold text-[#0060F4] sm:text-xs dark:bg-[#132847] dark:text-[#60A5FA]">
                                        <FileText aria-hidden="true" className="size-4" />
                                        <span>Berdasarkan transaksi tercatat</span>
                                    </div>
                                </div>
                            </div>

                            {/* P&L Statement Structure */}
                            <div className="mt-5 space-y-4 text-sm sm:space-y-5">
                                {/* 1. PENDAPATAN */}
                                <div>
                                    <div className="grid gap-1 rounded-xl bg-[#F8FBFF] px-4 py-2.5 font-bold text-[#0B1F63] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center dark:bg-[#071322] dark:text-white">
                                        <span className="min-w-0 text-pretty">I. PENDAPATAN USAHA (REVENUE)</span>
                                        <MoneyValue value={summary.total_invoiced} compactUntil="lg" className="justify-self-start lg:justify-self-end" />
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4">
                                        <div className="grid gap-1 py-2.5 text-[#52658E] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:pl-4 dark:text-[#94A3B8]">
                                            <span className="min-w-0 text-pretty">Pendapatan Jasa Keagenan Kapal (Agency Fees)</span>
                                            <MoneyValue value={summary.agency_revenue} compactUntil="lg" className="justify-self-start font-semibold text-slate-800 lg:justify-self-end dark:text-slate-200" />
                                        </div>
                                        <div className="grid gap-1 py-2.5 text-[#52658E] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:pl-4 dark:text-[#94A3B8]">
                                            <span className="min-w-0 text-pretty">Pendapatan Tagihan Reimbursement Operasional</span>
                                            <MoneyValue value={summary.reimburse_revenue} compactUntil="lg" className="justify-self-start font-semibold text-slate-800 lg:justify-self-end dark:text-slate-200" />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. HPP */}
                                <div>
                                    <div className="grid gap-1 rounded-xl bg-slate-50 px-4 py-2.5 font-bold text-slate-800 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center dark:bg-slate-900 dark:text-white">
                                        <span className="min-w-0 text-pretty">II. BEBAN POKOK PENDAPATAN (HPP LANGSUNG)</span>
                                        <span className="whitespace-nowrap text-[#C62840] lg:justify-self-end">(<MoneyValue value={summary.total_hpp} compactUntil="lg" />)</span>
                                    </div>
                                    <div className="px-4">
                                        <div className="grid gap-1 py-2.5 text-[#52658E] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:pl-4 dark:text-[#94A3B8]">
                                            <span className="min-w-0 text-pretty">Biaya Kebutuhan & Logistik Kapal (Approved Items)</span>
                                            <MoneyValue value={summary.total_hpp} compactUntil="lg" className="justify-self-start font-semibold text-[#C62840] lg:justify-self-end" />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. LABA KOTOR */}
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                    <div className="grid gap-3 text-base font-black text-emerald-800 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center dark:text-emerald-300">
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <span className="basis-full text-pretty lg:basis-auto">III. LABA KOTOR KEAGENAN KAPAL (GROSS PROFIT)</span>
                                            <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                                {summary.gross_margin_percentage ?? 0}% Margin
                                            </span>
                                        </div>
                                        <MoneyValue value={summary.ship_margin} compactUntil="lg" className="justify-self-start text-xl lg:justify-self-end" />
                                    </div>
                                </div>

                                {/* 4. OPEX */}
                                <div>
                                    <div className="grid gap-1 rounded-xl bg-slate-50 px-4 py-2.5 font-bold text-slate-800 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center dark:bg-slate-900 dark:text-white">
                                        <span className="min-w-0 text-pretty">IV. BEBAN OPERASIONAL KANTOR / NONKAPAL (OPEX)</span>
                                        <span className="whitespace-nowrap text-[#C62840] lg:justify-self-end">(<MoneyValue value={summary.non_vessel_expenses} compactUntil="lg" />)</span>
                                    </div>
                                    <div className="px-4">
                                        <div className="grid gap-1 py-2.5 text-[#52658E] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:pl-4 dark:text-[#94A3B8]">
                                            <span className="min-w-0 text-pretty">Biaya Operasional Umum Perusahaan yang Telah Terealisasi</span>
                                            <MoneyValue value={summary.non_vessel_expenses} compactUntil="lg" className="justify-self-start font-semibold text-[#C62840] lg:justify-self-end" />
                                        </div>
                                    </div>
                                </div>

                                {/* 5. LABA BERSIH */}
                                <div className="rounded-2xl border-2 border-[#0060F4] bg-[#F8FBFF] p-4 shadow-xs sm:p-5 dark:bg-[#071322]">
                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold uppercase text-[#0060F4]">
                                                Hasil Akhir Periode
                                            </p>
                                            <p className="text-balance text-lg font-black text-[#0B1F63] dark:text-white">
                                                V. LABA BERSIH PERUSAHAAN (NET PROFIT SJA)
                                            </p>
                                            <p className="text-pretty text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                Laba Kotor Kapal dikurangi Biaya Operasional Nonkapal
                                            </p>
                                        </div>
                                        <div className="border-t border-[#DCEAF8] pt-3 lg:border-0 lg:pt-0 lg:text-right dark:border-[#1E3A5F]">
                                            <MoneyValue value={summary.company_net_result} compactUntil="lg" className="block text-2xl font-black text-emerald-700 lg:text-3xl dark:text-emerald-400" />
                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                Net Margin: {summary.net_margin_percentage ?? 0}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    REPORT: KEUANGAN, ARUS KAS & AR/AP
                ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'keuangan_kas' && (
                    <div id="report-panel-keuangan_kas" className="space-y-5">
                        <section aria-labelledby="financial-summary-title">
                            <div className="mb-3">
                                <h2 id="financial-summary-title" className="text-balance text-base font-extrabold text-[#0B1F63] sm:text-lg dark:text-white">
                                    Ringkasan Keuangan
                                </h2>
                                <p className="mt-0.5 text-pretty text-[11px] text-[#52658E] sm:text-xs dark:text-[#9FB0C6]">
                                    Posisi tagihan, penerimaan, piutang, dan arus kas berdasarkan periode serta filter aktif.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                                <MetricCard label="Nilai Tagihan" value={summary.ar_invoiced ?? summary.total_invoiced} detail="Invoice klien dirilis" icon={<FileSpreadsheet aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Kas Masuk" value={summary.cash_in ?? 0} detail="Penerimaan terkonfirmasi" tone="green" icon={<ArrowUpRight aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Piutang" value={summary.ar_outstanding ?? 0} detail={`${summary.ar_collection_rate ?? 0}% sudah tertagih`} tone="red" icon={<Building2 aria-hidden="true" className="size-4 sm:size-5" />} />
                                <MetricCard label="Arus Kas Bersih" value={summary.net_cash_flow ?? 0} detail="Kas masuk dikurangi kas keluar" tone={(summary.net_cash_flow ?? 0) >= 0 ? 'blue' : 'amber'} icon={<Wallet aria-hidden="true" className="size-4 sm:size-5" />} />
                            </div>
                        </section>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Card padding="md">
                                <div className="flex flex-col gap-2 border-b border-[#DCEAF8] pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3A5F]">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-[#0060F4]">
                                            <Building2 aria-hidden="true" className="size-4" />
                                        </div>
                                        <h3 className="text-sm font-bold text-[#0B1F63] dark:text-white">Piutang Klien</h3>
                                    </div>
                                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                        Kolektibilitas: {summary.ar_collection_rate ?? 0}%
                                    </span>
                                </div>
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                        <span className="text-[#52658E]">Total Ditagihkan ke Klien</span>
                                        <MoneyValue value={summary.ar_invoiced ?? summary.total_invoiced} className="font-bold text-[#0B1F63] dark:text-white" />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                        <span className="text-emerald-700">Sudah Diterima</span>
                                        <MoneyValue value={summary.ar_paid ?? 0} className="font-bold text-emerald-600" />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                                        <span className="font-bold text-rose-600">Sisa Piutang</span>
                                        <MoneyValue value={summary.ar_outstanding ?? 0} className="font-black text-rose-600" />
                                    </div>
                                </div>
                            </Card>

                            <Card padding="md">
                                <div className="flex flex-col gap-2 border-b border-[#DCEAF8] pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3A5F]">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                            <Wallet aria-hidden="true" className="size-4" />
                                        </div>
                                        <h3 className="text-sm font-bold text-[#0B1F63] dark:text-white">Utang Vendor</h3>
                                    </div>
                                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Berdasarkan invoice vendor</span>
                                </div>
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                        <span className="text-[#52658E]">Total Invoice Vendor Masuk</span>
                                        <MoneyValue value={summary.ap_invoiced ?? 0} className="font-bold text-[#0B1F63] dark:text-white" />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                        <span className="text-emerald-700">Utang yang Telah Dibayar</span>
                                        <MoneyValue value={summary.ap_paid ?? 0} className="font-bold text-emerald-600" />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                                        <span className="font-bold text-amber-700">Sisa Utang Vendor</span>
                                        <MoneyValue value={summary.ap_outstanding ?? 0} className="font-black text-amber-800 dark:text-amber-300" />
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <DashboardAnalytics charts={[financialTrend]} />

                        <Card padding="md">
                            <h3 className="font-bold text-[#0B1F63] dark:text-white pb-3 border-b border-[#DCEAF8] dark:border-[#1E3A5F]">
                                Rekapitulasi Arus Kas Tercatat
                            </h3>
                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                        <span>Total Kas Masuk</span>
                                        <ArrowUpRight aria-hidden="true" className="size-4" />
                                    </div>
                                    <p className="mt-2 text-xl font-black text-emerald-700 sm:text-2xl dark:text-emerald-300">
                                        <MoneyValue value={summary.cash_in ?? 0} />
                                    </p>
                                    <p className="mt-1 text-[11px] text-emerald-700/80">Penerimaan klien terkonfirmasi</p>
                                </div>

                                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/20">
                                    <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300">
                                        <span>Total Kas Keluar</span>
                                        <ArrowDownRight aria-hidden="true" className="size-4" />
                                    </div>
                                    <p className="mt-2 text-xl font-black text-rose-700 sm:text-2xl dark:text-rose-300">
                                        <MoneyValue value={summary.cash_out ?? 0} />
                                    </p>
                                    <p className="mt-1 text-[11px] text-rose-700/80">Pembayaran yang terverifikasi</p>
                                </div>

                                <div className="rounded-xl border border-[#0060F4]/40 bg-[#F0F8FF] p-3.5 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <div className="flex items-center justify-between text-xs font-bold text-[#0060F4] dark:text-[#38BDF8]">
                                        <span>Arus Kas Bersih</span>
                                        <Wallet aria-hidden="true" className="size-4" />
                                    </div>
                                    <p className="mt-2 text-xl font-black text-[#0B1F63] sm:text-2xl dark:text-white">
                                        <MoneyValue value={summary.net_cash_flow ?? 0} />
                                    </p>
                                    <p className="mt-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">Surplus / defisit kas</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    REPORT: KINERJA OPERASIONAL ARMADA
                ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'operasional' && (
                    <div id="report-panel-operasional" className="space-y-5">
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                            <Card padding="md">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Total Kunjungan Kapal</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                            {summary.total_port_calls} Kegiatan
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-[#52658E] dark:text-[#94A3B8]">Job terdaftar</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                        <Anchor aria-hidden="true" className="size-5" />
                                    </span>
                                </div>
                            </Card>

                            <Card padding="md">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs text-blue-700 dark:text-blue-400">Sedang di Pelabuhan</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-blue-800 dark:text-blue-300">
                                            {summary.active_vessels} Kapal
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-blue-600 dark:text-blue-400">Sandar / Labuh</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                        <Activity aria-hidden="true" className="size-5" />
                                    </span>
                                </div>
                            </Card>

                            <Card padding="md">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-400">Kunjungan Selesai</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-800 dark:text-emerald-300">
                                            {summary.completed_vessels ?? 0} Kapal
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">Telah berangkat</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                        <CheckCircle2 aria-hidden="true" className="size-5" />
                                    </span>
                                </div>
                            </Card>

                            <Card padding="md">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs text-amber-700 dark:text-amber-400">Rata-rata Durasi Sandar</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-800 dark:text-amber-300">
                                            {summary.avg_port_stay_days ?? 0} Hari
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">Port stay average</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                        <Clock aria-hidden="true" className="size-5" />
                                    </span>
                                </div>
                            </Card>
                        </div>

                        {/* Request Fulfillment Stats */}
                        <Card padding="lg">
                            <h3 className="font-bold text-[#0B1F63] dark:text-white pb-3 border-b border-[#DCEAF8] dark:border-[#1E3A5F]">
                                Tingkat Pemenuhan Kebutuhan Logistik Kapal
                            </h3>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Selesai Dipenuhi</span>
                                    <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-300">
                                        {summary.completed_requests}
                                    </p>
                                    <span className="text-[11px] text-emerald-700/80">Kebutuhan terlaksana</span>
                                </div>

                                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
                                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Sedang Diproses</span>
                                    <p className="mt-1 text-2xl font-black text-blue-800 dark:text-blue-300">
                                        {summary.in_progress_requests ?? 0}
                                    </p>
                                    <span className="text-[11px] text-blue-700/80">Dalam pengerjaan</span>
                                </div>

                                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Menunggu Approval</span>
                                    <p className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-300">
                                        {summary.pending_requests}
                                    </p>
                                    <span className="text-[11px] text-amber-700/80">Perlu tindak lanjut</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Filter Modal */}
            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter Laporan & Rekapitulasi"
                size="lg"
                asBottomSheetOnMobile
                footer={(
                    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-[auto_1fr_auto_auto]">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setModalCompanyId('');
                                setModalShipId('');
                                setModalJob('');
                                setModalStatus('all');
                            }}
                            className="col-span-2 border-rose-200 text-xs text-rose-600 hover:bg-rose-50 sm:col-span-1 dark:border-rose-900/50 dark:text-rose-400"
                        >
                            Reset Pilihan
                        </Button>
                        <span aria-hidden="true" className="hidden sm:block" />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsFilterModalOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setCompanyId(modalCompanyId);
                                setShipId(modalShipId);
                                setJob(modalJob);
                                setStatus(modalStatus);
                                setIsFilterModalOpen(false);
                                applyFilters({
                                    company_id: modalCompanyId || undefined,
                                    ship_id: modalShipId || undefined,
                                    job: modalJob || undefined,
                                    status: modalStatus !== 'all' ? modalStatus : undefined,
                                });
                            }}
                        >
                            Terapkan Filter
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-4 py-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectSearch
                            label="Perusahaan Pelayaran"
                            value={modalCompanyId}
                            onChange={(val) => {
                                const nextVal = String(val || '');
                                setModalCompanyId(nextVal);
                                setModalShipId('');
                            }}
                            options={companyOptions}
                            placeholder="Pilih Perusahaan"
                        />
                        <SelectSearch
                            label="Armada Kapal"
                            value={modalShipId}
                            onChange={(val) => setModalShipId(String(val || ''))}
                            options={modalShipOptions}
                            placeholder="Pilih Kapal"
                        />
                        <SelectSearch
                            label="Nomor Job / SPK"
                            value={modalJob}
                            onChange={(val) => setModalJob(String(val || ''))}
                            options={jobOptions}
                            placeholder="Pilih Job"
                        />
                        <SelectSearch
                            label="Status Kunjungan Kapal"
                            value={modalStatus}
                            onChange={(val) => setModalStatus(String(val || 'all'))}
                            options={statusOptions}
                            placeholder="Pilih Status"
                        />
                    </div>
                </div>
            </Modal>

            <ReportExportModal exportState={exportState} />
        </AppLayout>
    );
}
