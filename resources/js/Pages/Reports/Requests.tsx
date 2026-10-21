import { Head, router } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    PackageCheck,
    RotateCcw,
    Search,
    Ship,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import DateRangePicker, { type DateRange } from '../../Components/forms/DateRangePicker';
import Modal from '../../Components/overlays/Modal';
import ReportExportModal, { useReportExport } from '../../Components/reports/ReportExportModal';
import ReportNavigationBar from '../../Components/reports/ReportNavigationBar';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Pagination, { type PaginationLinkItem } from '../../Components/pagination/Pagination';
import Select from '../../Components/selects/Select';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import ActionMenu from '../../Components/ui/ActionMenu';
import ReportActionMenu from '../../Components/reports/ReportActionMenu';
import Button, { getButtonClassName } from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import AppLayout from '../../Layouts/AppLayout';
import { formatDate } from '../../lib/formatDate';

interface RequestReportRow {
    id: string;
    request_number: string;
    batch_number?: string | null;
    request_date?: string | null;
    service_type: string;
    status: string;
    ship_name: string;
    company_name: string;
    port_name: string;
    job_number: string;
    creator_name: string;
    item_count: number;
    approved_item_count: number;
    total_hpp: number;
    detail_url: string;
    document_url: string;
}

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

interface OptionItem {
    id: string;
    name?: string;
    job_number?: string;
    ship_company_id?: string;
    ship_id?: string;
    company?: { id?: string; name: string };
}

interface RequestReportsProps {
    summary: {
        total_requests: number;
        total_items: number;
        total_hpp: number;
        waiting_requests: number;
        completed_requests: number;
        rejected_requests: number;
    };
    requests: PaginatedData<RequestReportRow>;
    companies?: OptionItem[];
    ships?: OptionItem[];
    jobs?: OptionItem[];
    filters: {
        from: string;
        to: string;
        search: string;
        status: string;
        company_id?: string;
        ship_id?: string;
        job?: string;
        sort: string;
        direction: 'asc' | 'desc';
    };
    can_export: boolean;
}

const statusOptions = [
    { value: 'all', label: 'Semua status pengajuan' },
    { value: 'Menunggu Approval', label: 'Menunggu review Admin' },
    { value: 'Menunggu Approval Direktur', label: 'Menunggu approval Direktur' },
    { value: 'Disetujui', label: 'Disetujui' },
    { value: 'Disetujui Sebagian', label: 'Disetujui sebagian' },
    { value: 'Dalam Proses', label: 'Dalam proses' },
    { value: 'Diproses', label: 'Diproses' },
    { value: 'Selesai', label: 'Selesai' },
    { value: 'Ditolak', label: 'Ditolak' },
    { value: 'Dibatalkan', label: 'Dibatalkan' },
];

const formatRupiah = (value: number): string => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(Number(value ?? 0));

const getAdaptiveMoneyFontSize = (text: string): string => {
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

function SummaryValue({ label, value, detail, icon }: {
    label: string;
    value: string;
    detail: string;
    icon: ReactNode;
}) {
    return (
        <div className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#52658E] dark:text-[#B5C8DC]">{label}</p>
                <p className={`mt-0.5 whitespace-nowrap tabular-nums text-[#0B1F63] dark:text-white ${getAdaptiveMoneyFontSize(value)}`}>
                    {value}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#52658E] dark:text-[#94A3B8]">{detail}</p>
            </div>
        </div>
    );
}

export default function RequestReports({
    summary,
    requests,
    companies = [],
    ships = [],
    jobs = [],
    filters,
    can_export: canExport,
}: RequestReportsProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Modal internal states
    const [modalCompanyId, setModalCompanyId] = useState(filters.company_id || '');
    const [modalShipId, setModalShipId] = useState(filters.ship_id || '');
    const [modalJobNumber, setModalJobNumber] = useState(filters.job || '');
    const [modalStatus, setModalStatus] = useState(filters.status || 'all');
    const [modalDateRange, setModalDateRange] = useState<DateRange>({
        startDate: filters.from || '',
        endDate: filters.to || '',
    });

    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

    const exportState = useReportExport();

    const handleExport = (format: 'pdf' | 'xlsx') => {
        exportState.startExport({
            report_type: 'requests',
            format,
            parameters: {
                from: filters.from,
                to: filters.to,
                search: filters.search,
                status: filters.status,
                company_id: filters.company_id,
                ship_id: filters.ship_id,
                job: filters.job,
            },
            label: `Laporan Pengajuan Kebutuhan Kapal (${format.toUpperCase()})`,
        });
    };

    const companyOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: '', label: 'Semua Perusahaan' },
            ...(companies || []).map((c) => ({
                value: c.id,
                label: c.name || c.id,
            })),
        ],
        [companies],
    );

    const modalShipOptions = useMemo<SelectSearchOption[]>(() => {
        const filtered = modalCompanyId
            ? (ships || []).filter(
                  (s) =>
                      String(s.ship_company_id || '') === modalCompanyId ||
                      String(s.company?.id || '') === modalCompanyId,
              )
            : ships || [];

        return [
            { value: '', label: 'Semua Kapal' },
            ...filtered.map((s) => ({
                value: s.id,
                label: s.name || s.id,
            })),
        ];
    }, [ships, modalCompanyId]);

    const jobOptions = useMemo<SelectSearchOption[]>(() => {
        const filtered = modalShipId
            ? (jobs || []).filter((j) => String(j.ship_id || '') === modalShipId)
            : jobs || [];

        return [
            { value: '', label: 'Semua Job' },
            ...filtered.map((j) => ({
                value: j.job_number || j.id,
                label: j.job_number || j.id,
            })),
        ];
    }, [jobs, modalShipId]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.company_id) count++;
        if (filters.ship_id) count++;
        if (filters.job) count++;
        if (filters.status && filters.status !== 'all') count++;
        if (filters.from || filters.to) count++;
        return count;
    }, [filters]);

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.company_id ||
        filters.ship_id ||
        filters.job ||
        (filters.status && filters.status !== 'all') ||
        filters.from ||
        filters.to
    );

    const openFilterModal = () => {
        setModalCompanyId(filters.company_id || '');
        setModalShipId(filters.ship_id || '');
        setModalJobNumber(filters.job || '');
        setModalStatus(filters.status || 'all');
        setModalDateRange({
            startDate: filters.from || '',
            endDate: filters.to || '',
        });
        setIsFilterModalOpen(true);
    };

    const applyModalFilters = () => {
        setIsFilterModalOpen(false);
        visit({
            company_id: modalCompanyId,
            ship_id: modalShipId,
            job: modalJobNumber,
            status: modalStatus,
            range: modalDateRange,
        });
    };

    const visit = (overrides: Partial<{
        search: string;
        status: string;
        company_id: string;
        ship_id: string;
        job: string;
        range: DateRange;
        sort: string;
        direction: 'asc' | 'desc';
    }> = {}) => {
        const nextSearch = overrides.search !== undefined ? overrides.search : search;
        const nextStatus = overrides.status !== undefined ? overrides.status : (filters.status || 'all');
        const nextCompanyId = overrides.company_id !== undefined ? overrides.company_id : (filters.company_id || '');
        const nextShipId = overrides.ship_id !== undefined ? overrides.ship_id : (filters.ship_id || '');
        const nextJob = overrides.job !== undefined ? overrides.job : (filters.job || '');
        const nextRange = overrides.range !== undefined ? overrides.range : { startDate: filters.from || '', endDate: filters.to || '' };

        router.get(route('reports.requests'), {
            from: nextRange.startDate || undefined,
            to: nextRange.endDate || undefined,
            search: nextSearch || undefined,
            status: nextStatus !== 'all' ? nextStatus : undefined,
            company_id: nextCompanyId || undefined,
            ship_id: nextShipId || undefined,
            job: nextJob || undefined,
            sort: overrides.sort ?? filters.sort,
            direction: overrides.direction ?? filters.direction,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        visit();
    };

    const sortBy = (column: string) => {
        visit({
            sort: column,
            direction: filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc',
        });
    };

    const handleResetAllFilters = () => {
        setSearch('');
        setModalCompanyId('');
        setModalShipId('');
        setModalJobNumber('');
        setModalStatus('all');
        setModalDateRange({ startDate: '', endDate: '' });
        router.get(route('reports.requests'), {}, { preserveState: true, preserveScroll: true });
    };

    const actionMenu = (row: RequestReportRow) => (
        <ActionMenu
            label={`Aksi laporan ${row.request_number}`}
            groups={[{
                id: 'request-report-actions',
                items: [
                    {
                        id: 'detail',
                        label: 'Buka detail pengajuan',
                        href: row.detail_url,
                        inertia: true,
                        icon: <Eye aria-hidden="true" className="size-4" />,
                    },
                    {
                        id: 'preview',
                        label: 'Lihat laporan PDF',
                        href: row.document_url,
                        target: '_blank',
                        tone: 'primary',
                        icon: <FileText aria-hidden="true" className="size-4" />,
                    },
                    {
                        id: 'download',
                        label: 'Unduh laporan PDF',
                        href: `${row.document_url}?download=1`,
                        download: true,
                        icon: <Download aria-hidden="true" className="size-4" />,
                    },
                ],
            }]}
        />
    );

    const columns = useMemo<Column<RequestReportRow>[]>(() => [
        {
            key: 'number',
            header: 'No. Pengajuan',
            sortable: true,
            width: '190px',
            wrap: 'normal',
            render: (row) => (
                <div className="min-w-0">
                    <p className="whitespace-normal wrap-anywhere font-mono font-bold text-[#0060F4]">{row.request_number}</p>
                    {row.batch_number && row.batch_number !== row.request_number && (
                        <p className="mt-1 whitespace-normal wrap-anywhere text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                            Batch {row.batch_number}
                        </p>
                    )}
                    <p className="mt-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">{formatDate(row.request_date)}</p>
                </div>
            ),
        },
        {
            key: 'name',
            header: 'Job & Kapal',
            sortable: true,
            width: '240px',
            wrap: 'normal',
            render: (row) => (
                <div className="min-w-0">
                    <p className="whitespace-normal wrap-anywhere font-bold text-[#0B1F63] dark:text-white">{row.ship_name}</p>
                    <p className="mt-0.5 whitespace-normal wrap-anywhere text-xs text-[#52658E] dark:text-[#94A3B8]">{row.job_number}</p>
                    <p className="mt-0.5 whitespace-normal wrap-anywhere text-[11px] text-[#52658E] dark:text-[#94A3B8]">{row.company_name}</p>
                </div>
            ),
        },
        {
            key: 'service',
            header: 'Pengajuan',
            width: '220px',
            wrap: 'normal',
            render: (row) => (
                <div className="min-w-0">
                    <p className="whitespace-normal wrap-anywhere font-semibold text-[#0B1F63] dark:text-white">{row.service_type}</p>
                    <p className="mt-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                        {row.item_count} item · {row.approved_item_count} disetujui
                    </p>
                    <p className="mt-0.5 whitespace-normal wrap-anywhere text-[10px] text-[#8C9BB9]">Diajukan {row.creator_name}</p>
                </div>
            ),
        },
        {
            key: 'date',
            header: 'Tanggal',
            sortable: true,
            width: '130px',
            render: (row) => <span className="whitespace-nowrap">{formatDate(row.request_date)}</span>,
        },
        {
            key: 'total',
            header: 'Total HPP',
            align: 'right',
            width: '150px',
            render: (row) => <span className="whitespace-nowrap font-bold tabular-nums">{formatRupiah(row.total_hpp)}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            width: '190px',
            wrap: 'normal',
            render: (row) => <StatusBadge status={row.status} label={row.status} showDot />,
        },
        {
            key: 'actions',
            header: 'Aksi',
            align: 'right',
            width: '72px',
            render: actionMenu,
        },
    ], [filters.direction, filters.sort]);

    const exportUrl = route('reports.requests.export', {
        from: filters.from,
        to: filters.to,
        search: filters.search || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        company_id: filters.company_id || undefined,
        ship_id: filters.ship_id || undefined,
        job: filters.job || undefined,
        sort: filters.sort,
        direction: filters.direction,
    });

    return (
        <AppLayout
            title="Laporan Pengajuan — PT Samudra Jaya Andalas"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Laporan Pengajuan — PT Samudra Jaya Andalas" />
            <MobilePageHero
                title="Laporan Pengajuan"
                description="Tinjau dan cetak dokumen pengajuan kebutuhan kapal dari data sistem."
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-5 rounded-t-[28px] bg-white px-4 pb-12 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none md:dark:bg-transparent">
                {/* ── Report Section Navigation (Mobile & Desktop) ── */}
                <ReportNavigationBar activeKey="pengajuan" className="mb-1" />
                <header className="hidden items-start justify-between gap-4 md:flex">
                    <div className="min-w-0">
                        <h1 className="text-balance text-2xl font-black tracking-[-0.02em] text-[#0B1F63] lg:text-3xl dark:text-white">
                            Laporan Pengajuan
                        </h1>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#52658E] dark:text-[#B5C8DC]">
                            Setiap laporan memakai data pengajuan, item, nilai HPP, dan status approval yang tersimpan di sistem.
                        </p>
                    </div>
                    {canExport ? (
                        <ReportActionMenu
                            onExportPdf={() => handleExport('pdf')}
                            onExportXlsx={() => handleExport('xlsx')}
                            onPrint={() => window.print()}
                            label="Aksi Laporan Pengajuan"
                            buttonLabel="Aksi Laporan"
                            buttonVariant="outline"
                        />
                    ) : (
                        <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DCEAF8] bg-white px-3.5 text-xs font-semibold text-[#52658E] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#B5C8DC]">
                            <FileText aria-hidden="true" className="size-4 text-[#0060F4]" />
                            PDF siap cetak A4
                        </span>
                    )}
                </header>

                <Card overflow="hidden">
                    <div className="grid divide-y divide-[#DCEAF8] dark:divide-[#1E3A5F] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
                        <SummaryValue
                            label="Pengajuan"
                            value={summary.total_requests.toLocaleString('id-ID')}
                            detail={`${summary.waiting_requests} masih menunggu approval`}
                            icon={<ClipboardCheck aria-hidden="true" className="size-5" />}
                        />
                        <SummaryValue
                            label="Rincian item"
                            value={summary.total_items.toLocaleString('id-ID')}
                            detail="Item sesuai periode dan filter"
                            icon={<PackageCheck aria-hidden="true" className="size-5" />}
                        />
                        <SummaryValue
                            label="Total HPP"
                            value={formatRupiah(summary.total_hpp)}
                            detail="Akumulasi nilai pengajuan"
                            icon={<FileText aria-hidden="true" className="size-5" />}
                        />
                        <SummaryValue
                            label="Selesai"
                            value={summary.completed_requests.toLocaleString('id-ID')}
                            detail={`${summary.rejected_requests} ditolak atau dibatalkan`}
                            icon={<CheckCircle2 aria-hidden="true" className="size-5" />}
                        />
                    </div>
                </Card>

                <Card padding="md">
                    <div className="space-y-3">
                        <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
                            <form onSubmit={submitSearch} className="relative min-w-0 flex-1">
                                <Search
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8C9BB9]"
                                />
                                <input
                                    id="request-report-search"
                                    type="search"
                                    name="search"
                                    autoComplete="off"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Cari nomor pengajuan, job, kapal, klien, atau item…"
                                    aria-label="Cari laporan pengajuan"
                                    className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] pl-10 pr-11 text-xs font-semibold text-[#0B1F63] placeholder:text-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/30 sm:text-sm dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            visit({ search: '' });
                                        }}
                                        className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-xl text-[#8C9BB9] hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#0060F4] dark:hover:text-[#F87171]"
                                        aria-label="Hapus pencarian"
                                    >
                                        <X aria-hidden="true" className="size-4" />
                                    </button>
                                )}
                            </form>

                            <div className="flex shrink-0 items-center gap-2">
                                <Button
                                    type="button"
                                    variant={activeFilterCount > 0 ? 'primary' : 'outline'}
                                    onClick={openFilterModal}
                                    leftIcon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
                                    className="h-11 flex-1 px-4 text-xs font-bold sm:flex-none"
                                    aria-haspopup="dialog"
                                    aria-expanded={isFilterModalOpen}
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
                                        onClick={handleResetAllFilters}
                                        className="h-11 border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                    >
                                        <RotateCcw aria-hidden="true" className="mr-1 size-3.5" />
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 border-t border-[#DCEAF8]/60 pt-2.5 text-xs dark:border-[#1E3A5F]/60">
                                <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                                    Filter aktif:
                                </span>
                                {filters.company_id && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Perusahaan: {companies.find((c) => c.id === filters.company_id)?.name || filters.company_id}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                visit({ company_id: '', ship_id: '' });
                                            }}
                                            className="flex size-6 items-center justify-center rounded-full hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4]"
                                            aria-label="Hapus filter perusahaan"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                                {filters.ship_id && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Kapal: {ships.find((s) => s.id === filters.ship_id)?.name || filters.ship_id}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                visit({ ship_id: '' });
                                            }}
                                            className="flex size-6 items-center justify-center rounded-full hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4]"
                                            aria-label="Hapus filter kapal"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                                {filters.job && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Job: {filters.job}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                visit({ job: '' });
                                            }}
                                            className="flex size-6 items-center justify-center rounded-full hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4]"
                                            aria-label="Hapus filter job"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                                {filters.status && filters.status !== 'all' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Status: {statusOptions.find((opt) => opt.value === filters.status)?.label || filters.status}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                visit({ status: 'all' });
                                            }}
                                            className="flex size-6 items-center justify-center rounded-full hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4]"
                                            aria-label="Hapus filter status"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                                {(filters.from || filters.to) && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Periode: {filters.from || 'Awal'} — {filters.to || 'Akhir'}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                visit({ range: { startDate: '', endDate: '' } });
                                            }}
                                            className="flex size-6 items-center justify-center rounded-full hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4]"
                                            aria-label="Hapus filter periode"
                                        >
                                            <X aria-hidden="true" className="size-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                <section aria-labelledby="request-report-table-title" className="space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h2 id="request-report-table-title" className="text-lg font-extrabold text-[#0B1F63] dark:text-white">
                                Daftar Pengajuan
                            </h2>
                            <p className="mt-0.5 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                Pilih menu aksi untuk membuka detail, melihat PDF, atau mengunduh laporan.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <p className="text-xs font-semibold tabular-nums text-[#52658E] dark:text-[#B5C8DC]">
                                {requests.total.toLocaleString('id-ID')} dokumen
                            </p>
                            {canExport && (
                                <ReportActionMenu
                                    onExportPdf={() => handleExport('pdf')}
                                    onExportXlsx={() => handleExport('xlsx')}
                                    onPrint={() => window.print()}
                                    label="Aksi Laporan Pengajuan"
                                    buttonLabel="Aksi Laporan"
                                    buttonVariant="outline"
                                />
                            )}
                        </div>
                    </div>

                    <ResponsiveTable<RequestReportRow>
                        data={requests.data}
                        keyExtractor={(row) => row.id}
                        desktop={{
                            columns,
                            sortColumn: filters.sort,
                            sortDirection: filters.direction,
                            onSort: sortBy,
                            tableLayout: 'fixed',
                            minWidth: '1120px',
                            emptyMessage: 'Belum ada pengajuan pada periode dan filter ini.',
                        }}
                        mobile={{
                            titleRender: (row) => row.request_number,
                            subtitleRender: (row) => `${formatDate(row.request_date)} · ${row.service_type}`,
                            statusRender: (row) => <StatusBadge status={row.status} label={row.status} size="sm" />,
                            fields: [
                                {
                                    label: 'Job / Kapal',
                                    icon: <Ship aria-hidden="true" className="size-3" />,
                                    render: (row) => (
                                        <span className="whitespace-normal wrap-anywhere">{row.job_number} · {row.ship_name}</span>
                                    ),
                                    fullWidth: true,
                                },
                                {
                                    label: 'Item',
                                    render: (row) => `${row.item_count} item`,
                                },
                                {
                                    label: 'Total HPP',
                                    render: (row) => <span className="tabular-nums">{formatRupiah(row.total_hpp)}</span>,
                                },
                                {
                                    label: 'Tanggal',
                                    icon: <CalendarDays aria-hidden="true" className="size-3" />,
                                    render: (row) => formatDate(row.request_date),
                                },
                                {
                                    label: 'Diajukan oleh',
                                    render: (row) => row.creator_name,
                                },
                            ],
                            actionsRender: actionMenu,
                            emptyMessage: 'Belum ada pengajuan pada periode dan filter ini.',
                        }}
                    />

                    <Pagination
                        links={requests.links}
                        currentPage={requests.current_page}
                        lastPage={requests.last_page}
                        total={requests.total}
                        from={requests.from ?? undefined}
                        to={requests.to ?? undefined}
                        perPage={requests.per_page}
                    />
                </section>
            </div>

            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter Laporan Pengajuan"
                subtitle="Saring laporan pengajuan berdasarkan perusahaan, kapal, job, status, atau periode"
                size="lg"
                asBottomSheetOnMobile
                footer={(
                    <div className="flex w-full items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setModalCompanyId('');
                                setModalShipId('');
                                setModalJobNumber('');
                                setModalStatus('all');
                                setModalDateRange({ startDate: '', endDate: '' });
                            }}
                            className="border-rose-200 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                        >
                            <RotateCcw aria-hidden="true" className="mr-1.5 size-3.5" />
                            Reset Pilihan
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsFilterModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="button" variant="primary" onClick={applyModalFilters}>
                                Terapkan Filter
                            </Button>
                        </div>
                    </div>
                )}
            >
                <div className="space-y-4 py-1">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SelectSearch
                            label="Perusahaan Pelayaran"
                            value={modalCompanyId}
                            onChange={(value) => {
                                const nextCompanyId = String(value || '');
                                setModalCompanyId(nextCompanyId);
                                setModalShipId('');
                            }}
                            options={companyOptions}
                            placeholder="Pilih Perusahaan"
                            searchPlaceholder="Cari perusahaan…"
                        />
                        <SelectSearch
                            label="Armada Kapal"
                            value={modalShipId}
                            onChange={(value) => setModalShipId(String(value || ''))}
                            options={modalShipOptions}
                            placeholder="Pilih Kapal"
                            searchPlaceholder="Cari kapal…"
                        />
                        <SelectSearch
                            label="Nomor Job / Port Call"
                            value={modalJobNumber}
                            onChange={(value) => setModalJobNumber(String(value || ''))}
                            options={jobOptions}
                            placeholder="Pilih Job"
                            searchPlaceholder="Cari nomor job…"
                        />
                        <Select
                            label="Status Pengajuan"
                            value={modalStatus}
                            options={statusOptions}
                            onChange={(event) => setModalStatus(event.target.value)}
                        />
                        <div className="space-y-1.5 text-left sm:col-span-2">
                            <p className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Periode Pengajuan
                            </p>
                            <DateRangePicker
                                value={modalDateRange}
                                onChange={setModalDateRange}
                                placeholder="Pilih Rentang Tanggal"
                            />
                        </div>
                    </div>
                </div>
            </Modal>
            <ReportExportModal exportState={exportState} />
        </AppLayout>
    );
}
