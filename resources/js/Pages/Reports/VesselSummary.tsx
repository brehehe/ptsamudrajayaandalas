import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Ship as ShipIcon,
    Building2,
    TrendingUp,
    TrendingDown,
    Banknote,
    FileSpreadsheet,
    FileText,
    Printer,
    Search,
    SlidersHorizontal,
    CalendarDays,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    Eye,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    LayoutGrid,
    List,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Modal from '../../Components/overlays/Modal';
import ReportNavigationBar from '../../Components/reports/ReportNavigationBar';
import ReportExportModal, { useReportExport } from '../../Components/reports/ReportExportModal';
import ReportActionMenu from '../../Components/reports/ReportActionMenu';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import DateRangePicker, { type DateRange } from '../../Components/forms/DateRangePicker';

interface VesselPortCall {
    id: string;
    job_number: string;
    port_name: string;
    status: string;
    eta: string | null;
    etd: string | null;
    stay_duration: string;
    revenue: number;
    paid: number;
    outstanding: number;
    expense: number;
    margin: number;
    margin_percentage: number;
    items_count: number;
}

interface VesselSummaryItem {
    id: string;
    name: string;
    call_sign: string;
    imo_number: string;
    flag: string;
    ship_type: string;
    gross_tonnage: number;
    company: { id: string; name: string } | null;
    home_port: string;
    port_calls_count: number;
    active_status: string;
    latest_job_number: string;
    latest_eta: string;
    avg_stay_days: number;
    revenue: {
        total: number;
        agency: number;
        reimburse: number;
        paid: number;
        outstanding: number;
        collection_rate: number;
    };
    expense: {
        total: number;
        item_count: number;
        top_categories: Record<string, number>;
    };
    margin: {
        amount: number;
        percentage: number;
        status: 'profit' | 'deficit' | 'neutral';
    };
    avg_revenue_per_call: number;
    avg_margin_per_call: number;
    port_calls: VesselPortCall[];
}

interface FleetSummary {
    total_vessels: number;
    matched_vessels: number;
    active_vessels: number;
    total_jobs: number;
    fleet_revenue: number;
    fleet_agency_revenue: number;
    fleet_reimburse_revenue: number;
    fleet_paid: number;
    fleet_outstanding: number;
    fleet_expense: number;
    fleet_margin: number;
    fleet_margin_percentage: number;
    avg_revenue_per_vessel: number;
    avg_margin_per_vessel: number;
}

interface VesselSummaryProps {
    vessels: VesselSummaryItem[];
    summary: FleetSummary;
    filters: {
        from: string;
        to: string;
        all_time?: boolean;
        search: string;
        company_id: string;
        ship_id: string;
        status: string;
        sort: string;
    };
    companies: Array<{ id: string; name: string }>;
    ships: Array<{ id: string; name: string; ship_company_id?: string }>;
}

const formatRupiah = (value: number | string | null): string => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(num);
};

const formatShortRupiah = (val?: number | string | null): string => {
    const num = Number(val) || 0;
    if (Math.abs(num) >= 1_000_000_000) {
        return `Rp ${(num / 1_000_000_000).toFixed(1)} M`;
    }
    if (Math.abs(num) >= 1_000_000) {
        return `Rp ${(num / 1_000_000).toFixed(1)} jt`;
    }
    return formatRupiah(num);
};

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
}: {
    value: number;
    className?: string;
    size?: 'adaptive' | 'inline';
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

function MetricCard({
    label,
    value,
    detail,
    icon,
    tone = 'blue',
    format = 'currency',
}: {
    label: string;
    value: number;
    detail: React.ReactNode;
    icon: React.ReactNode;
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

export default function VesselSummary({
    vessels,
    summary,
    filters,
    companies = [],
    ships = [],
}: VesselSummaryProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [companyId, setCompanyId] = useState(filters.company_id || '');
    const [shipId, setShipId] = useState(filters.ship_id || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [sort, setSort] = useState(filters.sort || 'margin_desc');
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: filters.from || '',
        endDate: filters.to || '',
    });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modalCompanyId, setModalCompanyId] = useState(companyId);
    const [modalShipId, setModalShipId] = useState(shipId);
    const [modalStatus, setModalStatus] = useState(status);
    const [modalSort, setModalSort] = useState(sort);

    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [selectedShipForModal, setSelectedShipForModal] = useState<VesselSummaryItem | null>(null);

    const exportState = useReportExport();

    const handlePeriodChange = (range: DateRange) => {
        setDateRange(range);
        applyFilters({ range });
    };

    const applyFilters = (overrides?: {
        search?: string;
        company_id?: string;
        ship_id?: string;
        status?: string;
        sort?: string;
        range?: DateRange;
    }) => {
        const q = overrides?.search !== undefined ? overrides.search : search;
        const comp = overrides?.company_id !== undefined ? overrides.company_id : companyId;
        const shp = overrides?.ship_id !== undefined ? overrides.ship_id : shipId;
        const st = overrides?.status !== undefined ? overrides.status : status;
        const srt = overrides?.sort !== undefined ? overrides.sort : sort;
        const r = overrides?.range !== undefined ? overrides.range : dateRange;

        router.get(
            '/summary-vessel',
            {
                from: r.startDate || undefined,
                to: r.endDate || undefined,
                search: q || undefined,
                company_id: comp || undefined,
                ship_id: shp || undefined,
                status: st && st !== 'all' ? st : undefined,
                sort: srt !== 'margin_desc' ? srt : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setCompanyId('');
        setShipId('');
        setStatus('all');
        setSort('margin_desc');
        const emptyRange = { startDate: '', endDate: '' };
        setDateRange(emptyRange);
        router.get('/summary-vessel', {}, { preserveState: true, preserveScroll: true });
    };

    const handleExport = (format: 'pdf' | 'xlsx') => {
        exportState.startExport({
            report_type: 'vessel_summary',
            format,
            parameters: {
                from: dateRange.startDate || '',
                to: dateRange.endDate || '',
                search,
                company_id: companyId,
                ship_id: shipId,
                status,
                sort,
            },
            label: `Laporan Summary Kapal (${format.toUpperCase()})`,
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const getStatusLabel = (st: string) => {
        switch (st?.toLowerCase()) {
            case 'berthed':
                return { label: 'Sandar', tone: 'success' as const };
            case 'anchored':
                return { label: 'Labuh', tone: 'info' as const };
            case 'departed':
            case 'completed':
                return { label: 'Selesai / Berlayar', tone: 'neutral' as const };
            case 'scheduled':
                return { label: 'Akan Datang', tone: 'warning' as const };
            case 'idle':
            default:
                return { label: 'Tidak Ada Kunjungan', tone: 'neutral' as const };
        }
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

    const statusOptions: SelectSearchOption[] = [
        { value: 'all', label: 'Semua Status Kunjungan' },
        { value: 'active', label: 'Hanya Kapal Aktif' },
        { value: 'berthed', label: 'Sedang Sandar' },
        { value: 'anchored', label: 'Sedang Labuh' },
        { value: 'departed', label: 'Berangkat / Selesai' },
        { value: 'scheduled', label: 'Akan Datang' },
    ];

    const sortOptions: SelectSearchOption[] = [
        { value: 'margin_desc', label: 'Margin Tertinggi' },
        { value: 'margin_asc', label: 'Margin Terendah' },
        { value: 'revenue_desc', label: 'Pendapatan Terbesar' },
        { value: 'expense_desc', label: 'Pengeluaran Terbesar' },
        { value: 'trips_desc', label: 'Kunjungan Terbanyak' },
        { value: 'name_asc', label: 'Nama Kapal (A-Z)' },
    ];

    const activeFilterCount = [
        companyId,
        shipId,
        status && status !== 'all' ? status : '',
        sort && sort !== 'margin_desc' ? sort : '',
    ].filter(Boolean).length;

    const hasAdvancedFilters = Boolean(
        search || companyId || shipId || (status && status !== 'all') || (sort && sort !== 'margin_desc')
    );
    const hasActiveFilters = Boolean(
        hasAdvancedFilters || dateRange.startDate || dateRange.endDate
    );

    // Columns for ResponsiveTable
    const columns: Column<VesselSummaryItem>[] = [
        {
            key: 'ship',
            header: 'Kapal & Spesifikasi',
            width: '260px',
            render: (vessel) => (
                <div className="flex items-center gap-2.5 min-w-[200px]">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] font-black dark:bg-[#071322] dark:text-[#38BDF8]">
                        <ShipIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Link
                                href={`/vessels/${vessel.id}`}
                                className="font-black text-[#0B1F63] text-sm dark:text-white hover:text-[#0060F4] transition-colors truncate"
                                title="Lihat profil kapal"
                            >
                                {vessel.name}
                            </Link>
                            <span className="inline-block rounded bg-[#F0F5FD] px-1.5 py-0.5 text-[10px] font-bold text-[#52658E] dark:bg-[#1E3A5F] dark:text-[#94A3B8]">
                                {vessel.flag || 'ID'}
                            </span>
                        </div>
                        <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] truncate">
                            {vessel.ship_type} {vessel.gross_tonnage > 0 ? `· ${vessel.gross_tonnage.toLocaleString('id-ID')} GT` : ''}
                            {vessel.call_sign && vessel.call_sign !== '-' ? ` · Call: ${vessel.call_sign}` : ''}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'company',
            header: 'Perusahaan Pemilik',
            width: '200px',
            render: (vessel) => (
                <div className="min-w-0">
                    <p className="font-bold text-[#0B1F63] dark:text-white truncate">
                        {vessel.company?.name ?? 'Milik Sendiri / -'}
                    </p>
                    <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] truncate">
                        Home Port: {vessel.home_port || '-'}
                    </p>
                </div>
            ),
        },
        {
            key: 'port_calls',
            header: 'Kunjungan',
            align: 'center',
            width: '130px',
            render: (vessel) => {
                const statusInfo = getStatusLabel(vessel.active_status);
                return (
                    <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center justify-center rounded-full bg-[#EBF3FE] px-2.5 py-0.5 text-xs font-black text-[#0060F4] dark:bg-[#102B4A] dark:text-[#38BDF8]">
                            {vessel.port_calls_count} Job
                        </span>
                        <StatusBadge
                            status={statusInfo.tone}
                            label={statusInfo.label}
                            size="sm"
                        />
                    </div>
                );
            },
        },
        {
            key: 'revenue',
            header: 'Pendapatan (Tagihan)',
            align: 'right',
            width: '170px',
            render: (vessel) => (
                <div>
                    <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                        {formatRupiah(vessel.revenue.total)}
                    </p>
                    <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                        Jasa: {formatShortRupiah(vessel.revenue.agency)}
                    </div>
                    <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                        Reimb: {formatShortRupiah(vessel.revenue.reimburse)}
                    </div>
                </div>
            ),
        },
        {
            key: 'expense',
            header: 'Pengeluaran (HPP)',
            align: 'right',
            width: '160px',
            render: (vessel) => (
                <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatRupiah(vessel.expense.total)}
                    </span>
                    <p className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                        {vessel.expense.item_count} item biaya
                    </p>
                </div>
            ),
        },
        {
            key: 'margin',
            header: 'Margin & Rasio',
            align: 'right',
            width: '170px',
            render: (vessel) => {
                const isPositive = vessel.margin.amount >= 0;
                return (
                    <div>
                        <p className={`font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#C62840]'}`}>
                            {formatRupiah(vessel.margin.amount)}
                        </p>
                        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#C62840]'}`}>
                            {isPositive ? <ArrowUpRight aria-hidden="true" className="size-3" /> : <ArrowDownRight aria-hidden="true" className="size-3" />}
                            {vessel.margin.percentage.toLocaleString('id-ID')}%
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'outstanding',
            header: 'Sisa Piutang',
            align: 'center',
            width: '140px',
            render: (vessel) => {
                if (vessel.revenue.outstanding > 0) {
                    return (
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums text-xs">
                                {formatShortRupiah(vessel.revenue.outstanding)}
                            </span>
                            <span className="text-[10px] text-[#52658E]">Belum Lunas</span>
                        </div>
                    );
                }
                if (vessel.revenue.total > 0) {
                    return (
                        <span className="inline-flex items-center gap-1 rounded bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-black text-[#087443] dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" /> Lunas
                        </span>
                    );
                }
                return <span className="text-[#8C9BB9]">-</span>;
            },
        },
        {
            key: 'action',
            header: 'Aksi',
            align: 'center',
            width: '120px',
            render: (vessel) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedShipForModal(vessel)}
                        leftIcon={<Eye className="size-3.5 text-[#0060F4]" />}
                        className="bg-white hover:bg-[#F0F8FF] dark:bg-[#071322] text-[11px] py-1 px-2"
                    >
                        Rincian
                    </Button>
                    <Link
                        href={`/vessels/${vessel.id}`}
                        className="p-1 rounded-lg text-[#52658E] hover:text-[#0060F4] hover:bg-[#F0F8FF] dark:hover:bg-[#102B4A]"
                        title="Buka Profil Kapal"
                    >
                        <ChevronRight className="size-4" />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <AppLayout
            title="Laporan Summary Kapal — PT Samudra Jaya Andalas"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Laporan Summary Kapal — PT Samudra Jaya Andalas" />

            <MobilePageHero
                title="Laporan Summary Kapal"
                description="Ringkasan komprehensif performa pendapatan, pengeluaran (HPP), margin keuntungan, dan riwayat operasional armada kapal."
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-5 rounded-t-[28px] bg-white px-4 pb-12 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none md:dark:bg-transparent">
                {/* ── Report Section Navigation (Mobile & Desktop) ── */}
                <ReportNavigationBar activeKey="summary_vessel" className="mb-1" />

                {/* ── Page Header & Print/Export Buttons ── */}
                <div className="hidden items-center justify-between gap-4 pb-2 border-b border-[#DCEAF8] dark:border-[#1E3A5F] md:flex">
                    <div>
                        <h1 className="text-2xl font-black text-[#0B1F63] sm:text-3xl dark:text-[#F1F5F9]">
                            Laporan Summary Kapal
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            Ringkasan komprehensif performa pendapatan, pengeluaran (HPP), margin keuntungan, dan riwayat operasional armada kapal.
                        </p>
                    </div>

                    <ReportActionMenu
                        onExportPdf={() => handleExport('pdf')}
                        onExportXlsx={() => handleExport('xlsx')}
                        onPrint={handlePrint}
                        label="Aksi Laporan Summary Kapal"
                        buttonLabel="Aksi Laporan"
                        buttonVariant="outline"
                    />
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
                                        Berlaku untuk semua statistik performa, tabel kegiatan, dan analisis finansial armada.
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
                            {/* Search */}
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
                                    placeholder="Cari nama kapal, pemilik, IMO, call sign…"
                                    aria-label="Cari kapal"
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
                                        setModalStatus(status);
                                        setModalSort(sort);
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
                                {sort && sort !== 'margin_desc' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Urutan: {sortOptions.find((s) => s.value === sort)?.label || sort}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSort('margin_desc');
                                                applyFilters({ sort: 'margin_desc' });
                                            }}
                                            className="-my-2 -mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-white hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4] dark:hover:bg-[#0D2945]"
                                            aria-label="Hapus filter urutan"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* ── KPI Executive Metric Cards ── */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
                    <MetricCard
                        label="Total Pendapatan"
                        value={summary.fleet_revenue}
                        detail={<>Jasa: <MoneyValue value={summary.fleet_agency_revenue} size="inline" className="font-semibold text-[10px] sm:text-[11px]" /> · Reimb: <MoneyValue value={summary.fleet_reimburse_revenue} size="inline" className="font-semibold text-[10px] sm:text-[11px]" /></>}
                        icon={<Banknote aria-hidden="true" className="size-4 sm:size-5" />}
                        tone="blue"
                    />
                    <MetricCard
                        label="Total Pengeluaran (HPP)"
                        value={summary.fleet_expense}
                        detail="Biaya realisasi kebutuhan armada kapal"
                        tone="slate"
                        icon={<FileText aria-hidden="true" className="size-4 sm:size-5" />}
                    />
                    <MetricCard
                        label="Total Margin Armada"
                        value={summary.fleet_margin}
                        detail={
                            summary.fleet_margin >= 0
                                ? `${summary.fleet_margin_percentage}% rasio dari total pendapatan`
                                : `${summary.fleet_margin_percentage}% defisit operasional`
                        }
                        tone={summary.fleet_margin >= 0 ? 'green' : 'red'}
                        icon={<TrendingUp aria-hidden="true" className="size-4 sm:size-5" />}
                    />
                    <MetricCard
                        label="Sisa Piutang Klien"
                        value={summary.fleet_outstanding}
                        detail={<>Sudah terbayar: <MoneyValue value={summary.fleet_paid} size="inline" className="font-semibold text-[10px] sm:text-[11px]" /></>}
                        tone="amber"
                        icon={<Building2 aria-hidden="true" className="size-4 sm:size-5" />}
                    />
                    <MetricCard
                        label="Armada & Kegiatan"
                        value={summary.active_vessels}
                        format="number"
                        detail={`${summary.total_vessels} Kapal terdaftar · ${summary.total_jobs} total kunjungan`}
                        tone="blue"
                        icon={<ShipIcon aria-hidden="true" className="size-4 sm:size-5" />}
                    />
                </div>

                {/* ── Data Presentation Header & View Switcher ── */}
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Daftar Performa Finansial &amp; Operasional Armada
                            </h2>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                {vessels.length} Kapal Terdata dalam Periode Ini
                            </p>
                        </div>

                        <div className="inline-flex items-center rounded-xl border border-[#DCEAF8] bg-white p-1 shadow-xs dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : 'text-[#52658E] hover:text-[#0060F4] dark:text-[#94A3B8]'
                                }`}
                            >
                                <List className="size-3.5" />
                                <span>Tabel</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                    viewMode === 'cards'
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : 'text-[#52658E] hover:text-[#0060F4] dark:text-[#94A3B8]'
                                }`}
                            >
                                <LayoutGrid className="size-3.5" />
                                <span>Kartu</span>
                            </button>
                        </div>
                    </div>

                    {/* Table View */}
                    {viewMode === 'table' ? (
                        <ResponsiveTable<VesselSummaryItem>
                            data={vessels}
                            keyExtractor={(vessel) => vessel.id}
                            desktop={{
                                columns,
                                compact: true,
                                minWidth: '1120px',
                                emptyMessage: 'Tidak ada data kapal sesuai filter yang dipilih.',
                            }}
                            mobile={{
                                titleRender: (vessel) => vessel.name,
                                subtitleRender: (vessel) => (
                                    <span className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                        {vessel.company?.name || 'Milik Sendiri'} · {vessel.ship_type}
                                    </span>
                                ),
                                statusRender: (vessel) => {
                                    const statusInfo = getStatusLabel(vessel.active_status);
                                    return (
                                        <StatusBadge
                                            status={statusInfo.tone}
                                            label={statusInfo.label}
                                            size="sm"
                                        />
                                    );
                                },
                                emptyMessage: 'Tidak ada data kapal sesuai filter yang dipilih.',
                                fields: [
                                    {
                                        label: 'Kunjungan',
                                        render: (vessel) => (
                                            <span className="font-bold text-[#0060F4]">
                                                {vessel.port_calls_count} Kegiatan Port Call
                                            </span>
                                        ),
                                    },
                                    {
                                        label: 'Pendapatan',
                                        render: (vessel) => (
                                            <div>
                                                <MoneyValue value={vessel.revenue.total} />
                                                <span className="text-[10px] text-[#52658E] block">
                                                    (Jasa: {formatShortRupiah(vessel.revenue.agency)} · Reimb: {formatShortRupiah(vessel.revenue.reimburse)})
                                                </span>
                                            </div>
                                        ),
                                    },
                                    {
                                        label: 'Pengeluaran (HPP)',
                                        render: (vessel) => (
                                            <div>
                                                <MoneyValue value={vessel.expense.total} />
                                                <span className="text-[10px] text-[#52658E] block">
                                                    ({vessel.expense.item_count} item kebutuhan)
                                                </span>
                                            </div>
                                        ),
                                    },
                                    {
                                        label: 'Margin Bersih',
                                        render: (vessel) => {
                                            const isPositive = vessel.margin.amount >= 0;
                                            return (
                                                <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-[#C62840]'}`}>
                                                    <MoneyValue value={vessel.margin.amount} /> ({vessel.margin.percentage}%)
                                                </span>
                                            );
                                        },
                                    },
                                    {
                                        label: 'Sisa Piutang',
                                        render: (vessel) =>
                                            vessel.revenue.outstanding > 0 ? (
                                                <span className="font-bold text-amber-700">
                                                    {formatRupiah(vessel.revenue.outstanding)}
                                                </span>
                                            ) : vessel.revenue.total > 0 ? (
                                                <span className="font-bold text-emerald-600">Lunas</span>
                                            ) : (
                                                '-'
                                            ),
                                    },
                                    {
                                        label: 'Aksi',
                                        fullWidth: true,
                                        render: (vessel) => (
                                            <div className="flex items-center gap-2 pt-1 w-full">
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => setSelectedShipForModal(vessel)}
                                                    leftIcon={<Eye className="size-3.5" />}
                                                    className="flex-1 justify-center"
                                                >
                                                    Lihat Rincian Kegiatan
                                                </Button>
                                                <Link
                                                    href={`/vessels/${vessel.id}`}
                                                    className="inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[#DCEAF8] px-3 text-xs font-semibold text-[#0060F4] hover:border-[#0060F4]"
                                                >
                                                    Profil
                                                </Link>
                                            </div>
                                        ),
                                    },
                                ],
                            }}
                        />
                    ) : (
                        /* Cards Grid View */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vessels.map((vessel) => {
                                const statusInfo = getStatusLabel(vessel.active_status);
                                const isProfitable = vessel.margin.amount >= 0;

                                return (
                                    <Card
                                        key={vessel.id}
                                        padding="none"
                                        className="overflow-hidden border border-[#DCEAF8] dark:border-[#1E3A5F] hover:shadow-md transition-shadow"
                                    >
                                        {/* Card Header */}
                                        <div className="bg-[#F0F8FF] dark:bg-[#102B4A] p-4 border-b border-[#DCEAF8] dark:border-[#1E3A5F] flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0060F4] text-white font-black shadow-sm">
                                                    <ShipIcon className="size-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-base text-[#0B1F63] dark:text-white leading-tight">
                                                        {vessel.name}
                                                    </h4>
                                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                        {vessel.company?.name ?? 'Perusahaan Pribadi'}
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge
                                                status={statusInfo.tone}
                                                label={statusInfo.label}
                                                size="sm"
                                            />
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-4 space-y-3.5">
                                            {/* Specs Tag */}
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                <span className="rounded bg-[#F0F5FD] dark:bg-[#071322] px-2 py-0.5 font-bold">
                                                    {vessel.ship_type}
                                                </span>
                                                {vessel.gross_tonnage > 0 && (
                                                    <span className="rounded bg-[#F0F5FD] dark:bg-[#071322] px-2 py-0.5 font-bold">
                                                        {vessel.gross_tonnage} GT
                                                    </span>
                                                )}
                                                <span className="rounded bg-[#EBF3FE] dark:bg-[#102B4A] text-[#0060F4] dark:text-[#38BDF8] px-2 py-0.5 font-black">
                                                    {vessel.port_calls_count} Kegiatan
                                                </span>
                                            </div>

                                            {/* Financial 3-Col Box */}
                                            <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F8FAFC] dark:bg-[#071322] p-2.5 border border-[#E2E8F0] dark:border-[#1E3A5F] text-center">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase text-[#52658E] dark:text-[#94A3B8]">Pendapatan</span>
                                                    <p className="mt-0.5 text-xs font-black text-[#0B1F63] dark:text-white truncate">
                                                        {formatShortRupiah(vessel.revenue.total)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase text-[#52658E] dark:text-[#94A3B8]">Pengeluaran</span>
                                                    <p className="mt-0.5 text-xs font-black text-[#DC2626] dark:text-red-400 truncate">
                                                        {formatShortRupiah(vessel.expense.total)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase text-[#52658E] dark:text-[#94A3B8]">Margin</span>
                                                    <p className={`mt-0.5 text-xs font-black truncate ${
                                                        isProfitable ? 'text-[#087443] dark:text-emerald-400' : 'text-[#DC2626]'
                                                    }`}>
                                                        {formatShortRupiah(vessel.margin.amount)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Margin Progress & Info */}
                                            <div className="flex items-center justify-between text-xs pt-1">
                                                <span className="text-[#52658E] dark:text-[#94A3B8]">Margin Persentase:</span>
                                                <span className={`font-black rounded px-1.5 py-0.5 text-xs ${
                                                    vessel.margin.percentage >= 20
                                                        ? 'bg-[#E6F4EA] text-[#087443]'
                                                        : vessel.margin.percentage > 0
                                                        ? 'bg-blue-50 text-[#0060F4]'
                                                        : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {vessel.margin.percentage}%
                                                </span>
                                            </div>

                                            {/* Card Actions */}
                                            <div className="pt-2 flex items-center justify-between border-t border-[#F0F5FD] dark:border-[#1E3A5F]">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedShipForModal(vessel)}
                                                    leftIcon={<Eye className="size-3.5 text-[#0060F4]" />}
                                                    className="w-full justify-center bg-white dark:bg-[#071322]"
                                                >
                                                    Lihat Rincian Kegiatan
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Advanced Filter Modal ── */}
                <Modal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    title="Filter Laporan Summary Kapal"
                    size="md"
                >
                    <div className="space-y-4 pt-1">
                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] dark:text-white mb-1">
                                Perusahaan Klien / Pemilik
                            </label>
                            <SelectSearch
                                options={companyOptions}
                                value={modalCompanyId}
                                onChange={(val) => {
                                    setModalCompanyId(String(val));
                                    setModalShipId('');
                                }}
                                placeholder="Pilih Perusahaan..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] dark:text-white mb-1">
                                Kapal Spesifik
                            </label>
                            <SelectSearch
                                options={modalShipOptions}
                                value={modalShipId}
                                onChange={(val) => setModalShipId(String(val))}
                                placeholder="Pilih Kapal..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] dark:text-white mb-1">
                                Status Operasional
                            </label>
                            <SelectSearch
                                options={statusOptions}
                                value={modalStatus}
                                onChange={(val) => setModalStatus(String(val))}
                                placeholder="Pilih Status..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] dark:text-white mb-1">
                                Urutan Data
                            </label>
                            <SelectSearch
                                options={sortOptions}
                                value={modalSort}
                                onChange={(val) => setModalSort(String(val))}
                                placeholder="Urutkan berdasarkan..."
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setModalCompanyId('');
                                    setModalShipId('');
                                    setModalStatus('all');
                                    setModalSort('margin_desc');
                                }}
                            >
                                Reset Pilihan
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => {
                                    setCompanyId(modalCompanyId);
                                    setShipId(modalShipId);
                                    setStatus(modalStatus);
                                    setSort(modalSort);
                                    setIsFilterModalOpen(false);
                                    applyFilters({
                                        company_id: modalCompanyId,
                                        ship_id: modalShipId,
                                        status: modalStatus,
                                        sort: modalSort,
                                    });
                                }}
                            >
                                Terapkan Filter
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* ── Detail Modal: Riwayat Job & Port Calls Kapal ── */}
                {selectedShipForModal && (
                    <Modal
                        isOpen={Boolean(selectedShipForModal)}
                        onClose={() => setSelectedShipForModal(null)}
                        size="full"
                        title={
                            <div className="flex items-center gap-2">
                                <ShipIcon className="size-5 text-[#0060F4]" />
                                <span className="font-black text-[#0B1F63] dark:text-white">
                                    Rincian Kegiatan Kapal: {selectedShipForModal.name}
                                </span>
                            </div>
                        }
                        subtitle={
                            <span>
                                {selectedShipForModal.company?.name ?? 'Perusahaan Pribadi'} · {selectedShipForModal.ship_type} ({selectedShipForModal.gross_tonnage} GT)
                            </span>
                        }
                    >
                        <div className="space-y-4">
                            {/* Summary Chips for this Ship */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#F0F8FF] dark:bg-[#102B4A] p-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                <div>
                                    <span className="text-[10px] font-bold text-[#52658E] uppercase dark:text-[#94A3B8]">Total Tagihan (Invoice)</span>
                                    <p className="text-sm font-black text-[#0B1F63] dark:text-white">
                                        {formatRupiah(selectedShipForModal.revenue.total)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#52658E] uppercase dark:text-[#94A3B8]">Total HPP (Realisasi)</span>
                                    <p className="text-sm font-black text-[#DC2626] dark:text-red-400">
                                        {formatRupiah(selectedShipForModal.expense.total)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#52658E] uppercase dark:text-[#94A3B8]">Laba Margin (Rp &amp; %)</span>
                                    <p className="text-sm font-black text-[#087443] dark:text-emerald-400">
                                        {formatRupiah(selectedShipForModal.margin.amount)} ({selectedShipForModal.margin.percentage}%)
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#52658E] uppercase dark:text-[#94A3B8]">Sisa Piutang Klien</span>
                                    <p className="text-sm font-black text-amber-700 dark:text-amber-400">
                                        {formatRupiah(selectedShipForModal.revenue.outstanding)}
                                    </p>
                                </div>
                            </div>

                            {/* Port Calls List */}
                            <div>
                                <h4 className="font-black text-sm text-[#0B1F63] dark:text-white mb-2">
                                    Daftar Kunjungan / Port Calls ({selectedShipForModal.port_calls.length} Kunjungan)
                                </h4>

                                {selectedShipForModal.port_calls.length === 0 ? (
                                    <p className="text-xs text-[#52658E] py-4 text-center">
                                        Tidak ada catatan kunjungan untuk kapal ini dalam periode yang dipilih.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-[#F8FAFC] dark:bg-[#071322] font-black uppercase text-[#52658E] dark:text-[#94A3B8] border-b border-[#DCEAF8] dark:border-[#1E3A5F]">
                                                <tr>
                                                    <th className="py-2.5 px-3">No. Job</th>
                                                    <th className="py-2.5 px-3">Pelabuhan &amp; ETA</th>
                                                    <th className="py-2.5 px-3 text-center">Status</th>
                                                    <th className="py-2.5 px-3 text-right">Tagihan</th>
                                                    <th className="py-2.5 px-3 text-right">Biaya Kebutuhan</th>
                                                    <th className="py-2.5 px-3 text-right">Margin</th>
                                                    <th className="py-2.5 px-3 text-center">Piutang</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#DCEAF8] dark:divide-[#1E3A5F]">
                                                {selectedShipForModal.port_calls.map((call) => (
                                                    <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-[#102B4A]/50">
                                                        <td className="py-2.5 px-3 font-mono font-bold text-[#0060F4]">
                                                            {call.job_number}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-semibold text-[#0B1F63] dark:text-white">{call.port_name}</div>
                                                            <div className="text-[10px] text-[#52658E]">ETA: {call.eta || '-'} · {call.stay_duration}</div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <StatusBadge
                                                                status={getStatusLabel(call.status).tone}
                                                                label={getStatusLabel(call.status).label}
                                                                size="sm"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-black tabular-nums text-[#0B1F63] dark:text-white">
                                                            {formatRupiah(call.revenue)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-black tabular-nums text-[#DC2626]">
                                                            {formatRupiah(call.expense)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-black tabular-nums text-[#087443]">
                                                            {formatRupiah(call.margin)}
                                                            <span className="text-[10px] font-semibold text-[#52658E] block">
                                                                ({call.margin_percentage}%)
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            {call.outstanding > 0 ? (
                                                                <span className="font-bold text-amber-700 tabular-nums">
                                                                    {formatShortRupiah(call.outstanding)}
                                                                </span>
                                                            ) : call.revenue > 0 ? (
                                                                <span className="text-[#087443] font-bold text-[10px]">Lunas</span>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer Link */}
                            <div className="flex justify-end pt-2">
                                <Link
                                    href={`/vessels/${selectedShipForModal.id}`}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0060F4] px-4 py-2 text-xs font-black text-white hover:bg-[#0050D0]"
                                >
                                    Buka Halaman Lengkap Kapal
                                    <ChevronRight className="size-4" />
                                </Link>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Export Progress Modal */}
                <ReportExportModal exportState={exportState} />
            </div>
        </AppLayout>
    );
}
