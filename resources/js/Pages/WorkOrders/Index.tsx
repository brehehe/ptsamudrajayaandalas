import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarClock,
    ClipboardList,
    Download,
    FileClock,
    Filter,
    Plus,
    ReceiptText,
    RotateCcw,
    Search,
    Ship,
    SlidersHorizontal,
    UserRound,
    X,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import Input from '../../Components/forms/Input';
import FilterBar from '../../Components/filters/FilterBar';
import DateRangePicker, { DateRange } from '../../Components/forms/DateRangePicker';
import ConfirmDialog from '../../Components/overlays/ConfirmDialog';
import Modal from '../../Components/overlays/Modal';
import Pagination from '../../Components/pagination/Pagination';
import Select from '../../Components/selects/Select';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Table from '../../Components/tables/Table';
import ShipImage from '../../Components/vessels/ShipImage';
import AppLayout from '../../Layouts/AppLayout';
import type { PageProps } from '../../types';

interface WorkOrder {
    id: string;
    system_number: string;
    client_number: string;
    document_date: string;
    received_at: string;
    status: string;
    document_path?: string | null;
    planned_eta_at: string;
    planned_etd_at?: string | null;
    next_status?: string | null;
    can_transition: boolean;
    company?: { name: string };
    ship?: { id: string; name: string; imo_number?: string | null; ship_type?: string | null; image?: string | null };
    port?: { name: string };
    assignee?: { name: string };
    items?: Array<{ name: string; description?: string | null }>;
    port_call?: { id: string; job_number?: string | null; status: string };
}

interface Paginated<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    workOrders: Paginated<WorkOrder>;
    stats: {
        total: number;
        draft: number;
        active: number;
        awaiting_completion_note: number;
        billing: number;
        closed: number;
    };
    companies?: Array<{ id: string; name: string }>;
    ships?: Array<{ id: string; name: string; ship_company_id?: string }>;
    jobs?: Array<{ id: string; job_number?: string; ship_id?: string }>;
    filters: {
        search?: string;
        status?: string;
        company_id?: string;
        ship_id?: string;
        job?: string;
        start_date?: string;
        end_date?: string;
    };
    canCreate: boolean;
}

const statusLabels: Record<string, string> = {
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

const transitionLabels: Record<string, string> = {
    active: 'Aktifkan SPK',
    in_progress: 'Mulai Proses',
    operational_completed: 'Tandai Operasional Selesai',
    awaiting_completion_note: 'Tunggu Nota Rampung',
    billing: 'Mulai Penagihan',
    closed: 'Tutup SPK',
};

const transitionDescriptions: Record<string, string> = {
    active: 'SPK akan masuk daftar aktif dan siap diproses oleh penanggung jawab.',
    in_progress: 'Kunjungan akan ditandai sedang dikerjakan oleh tim operasional.',
    operational_completed: 'Pekerjaan operasional selesai, tetapi proses keuangan tetap terbuka.',
    awaiting_completion_note: 'Pastikan kapal sudah tercatat berangkat sebelum menunggu Nota Rampung.',
    billing: 'Penagihan hanya dapat dimulai setelah Nota Rampung dan rekonsiliasi selesai.',
    closed: 'SPK hanya dapat ditutup setelah seluruh kewajiban operasional dan keuangan selesai.',
};

const statusFilters = [
    { value: 'all', label: 'Semua' },
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Aktif' },
    { value: 'in_progress', label: 'Diproses' },
    { value: 'operational_completed', label: 'Operasional Selesai' },
    { value: 'awaiting_completion_note', label: 'Menunggu Nota' },
    { value: 'billing', label: 'Penagihan' },
    { value: 'closed', label: 'Closed' },
];

const roleDescriptions: Record<string, string> = {
    Lapangan: 'Daftar ini hanya menampilkan SPK yang Anda buat atau ditugaskan kepada Anda.',
    Admin: 'Kelola penerimaan SPK, penanggung jawab, dan tahap administratif setiap kunjungan.',
    Direktur: 'Pantau seluruh SPK dan buka detail kunjungan untuk melihat progres operasional.',
    Owner: 'Pantau seluruh siklus SPK, dari penerimaan dokumen hingga penyelesaian keuangan.',
};

const formatDate = (value?: string | null) => {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value));
};

export default function WorkOrdersIndex({ workOrders, stats, companies = [], ships = [], jobs = [], filters, canCreate }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [companyId, setCompanyId] = useState(filters.company_id || '');
    const [shipId, setShipId] = useState(filters.ship_id || '');
    const [job, setJob] = useState(filters.job || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: filters.start_date || '',
        endDate: filters.end_date || '',
    });

    // Modal filter state
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modalCompanyId, setModalCompanyId] = useState(filters.company_id || '');
    const [modalShipId, setModalShipId] = useState(filters.ship_id || '');
    const [modalJob, setModalJob] = useState(filters.job || '');
    const [modalStatus, setModalStatus] = useState(filters.status || 'all');
    const [modalDateRange, setModalDateRange] = useState<DateRange>({
        startDate: filters.start_date || '',
        endDate: filters.end_date || '',
    });

    const [selectedTransition, setSelectedTransition] = useState<WorkOrder | null>(null);
    const [transitionError, setTransitionError] = useState<string | null>(null);
    const [transitioning, setTransitioning] = useState(false);
    const role = auth.user?.primary_role || 'Pengguna';

    const availableShips = useMemo(() => {
        if (!companyId) return ships;
        return ships.filter((s) => s.ship_company_id === companyId);
    }, [ships, companyId]);

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

    const shipOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: '', label: 'Semua Kapal' },
            ...availableShips.map((s) => ({ value: s.id, label: s.name })),
        ],
        [availableShips]
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

    const statusOptions = useMemo<SelectSearchOption[]>(
        () => statusFilters.map((s) => ({
            value: s.value,
            label: s.value === 'all' ? 'Semua Status' : s.label,
        })),
        []
    );

    const activeFilterCount = [
        companyId,
        shipId,
        job,
        status && status !== 'all' ? status : '',
        dateRange.startDate || dateRange.endDate ? 'date' : '',
    ].filter(Boolean).length;

    const applyFilters = (overrides?: Record<string, string | undefined>) => {
        const nextFilters = {
            search: search || undefined,
            status: status !== 'all' ? status : undefined,
            company_id: companyId || undefined,
            ship_id: shipId || undefined,
            job: job || undefined,
            start_date: dateRange.startDate || undefined,
            end_date: dateRange.endDate || undefined,
            ...overrides,
        };
        router.get('/work-orders', nextFilters, { preserveState: true, replace: true });
    };

    const submitSearch = (event: React.FormEvent) => {
        event.preventDefault();
        applyFilters();
    };

    const resetFilters = () => {
        setSearch('');
        setCompanyId('');
        setShipId('');
        setJob('');
        setStatus('all');
        const emptyRange: DateRange = { startDate: '', endDate: '' };
        setDateRange(emptyRange);
        router.get('/work-orders', {}, { preserveState: true, replace: true });
    };

    const hasActiveFilters = Boolean(
        search || (status && status !== 'all') || companyId || shipId || job || dateRange.startDate || dateRange.endDate
    );

    const confirmTransition = () => {
        if (!selectedTransition?.next_status) {
            return;
        }

        setTransitionError(null);
        router.patch(
            `/work-orders/${selectedTransition.id}/status`,
            { status: selectedTransition.next_status },
            {
                preserveScroll: true,
                onStart: () => setTransitioning(true),
                onSuccess: () => setSelectedTransition(null),
                onError: (errors) => setTransitionError(errors.status || 'Status SPK belum dapat diperbarui.'),
                onFinish: () => setTransitioning(false),
            },
        );
    };

    const detailHref = (item: WorkOrder) => {
        return route('work-orders.detail', item.id);
    };

    return (
        <AppLayout
            title="SPK & Kegiatan Kapal"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="SPK — PT Samudra Jaya Andalas" />

            <MobilePageHero
                title="SPK & Kegiatan Kapal"
                description={roleDescriptions[role] || 'Pantau SPK dan kunjungan kapal sesuai akses Anda.'}
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:space-y-5 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <header className="hidden flex-col gap-4 border-b border-[#DCEAF8] pb-5 sm:flex-row sm:items-end sm:justify-between md:flex dark:border-[#1E3A5F]">
                    <div className="max-w-3xl">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-bold text-[#0057D9] dark:bg-[#152E52] dark:text-[#7DD3FC]">
                            <ClipboardList aria-hidden="true" className="size-3.5" />
                            Ruang kerja {role}
                        </div>
                        <h1 className="text-balance text-2xl font-extrabold text-[#0B1F63] sm:text-3xl dark:text-[#F1F5F9]">
                            SPK & Kegiatan Kapal
                        </h1>
                        <p className="mt-1 max-w-2xl text-pretty text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">
                            {roleDescriptions[role] || 'Pantau SPK dan kunjungan kapal sesuai akses Anda.'}
                        </p>
                    </div>

                    {canCreate && (
                        <Link
                            href="/work-orders/create"
                            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-offset-2 sm:self-auto"
                        >
                            <Plus aria-hidden="true" className="size-4" />
                            Tambah SPK
                        </Link>
                    )}
                </header>

                {canCreate && (
                    <Link
                        href="/work-orders/create"
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] md:hidden"
                    >
                        <Plus aria-hidden="true" className="size-4" />
                        Buat SPK Baru
                    </Link>
                )}

                <section aria-label="Ringkasan SPK" className="hidden grid-cols-2 gap-3 md:grid lg:grid-cols-4">
                    <Card className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Seluruh SPK</p>
                                <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{stats.total}</p>
                            </div>
                            <div className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52]">
                                <ClipboardList aria-hidden="true" className="size-5" />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-[#52658E] dark:text-[#94A3B8]">{stats.draft} masih draft</p>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Aktif & Diproses</p>
                                <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{stats.active}</p>
                            </div>
                            <div className="flex size-10 items-center justify-center rounded-xl bg-[#EFE7FF] text-[#6840BB] dark:bg-[#6840BB]/20 dark:text-[#C4B5FD]">
                                <Ship aria-hidden="true" className="size-5" />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-[#52658E] dark:text-[#94A3B8]">Pekerjaan operasional berjalan</p>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Menunggu Nota</p>
                                <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{stats.awaiting_completion_note}</p>
                            </div>
                            <div className="flex size-10 items-center justify-center rounded-xl bg-[#FFF0CC] text-[#A65300] dark:bg-[#A65300]/20 dark:text-[#FBBF24]">
                                <FileClock aria-hidden="true" className="size-5" />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-[#52658E] dark:text-[#94A3B8]">Setelah kapal berangkat</p>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Penagihan</p>
                                <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{stats.billing}</p>
                            </div>
                            <div className="flex size-10 items-center justify-center rounded-xl bg-[#DCF7E8] text-[#087443] dark:bg-[#087443]/20 dark:text-[#6EE7B7]">
                                <ReceiptText aria-hidden="true" className="size-5" />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-[#52658E] dark:text-[#94A3B8]">{stats.closed} SPK sudah closed</p>
                    </Card>
                </section>

                {/* Filter Toolbar with Roomy Search, Filter Modal Trigger, & Active Badges */}
                <Card padding="md" className="shadow-xs">
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            {/* Search Input */}
                            <form onSubmit={submitSearch} className="relative flex-1">
                                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8C9BB9]" />
                                <input
                                    type="search"
                                    name="search"
                                    autoComplete="off"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari nomor SPK, kapal, klien, job…"
                                    aria-label="Cari SPK"
                                    className="w-full h-11 pl-10 pr-9 bg-[#F8FBFF] border border-[#DCEAF8] rounded-xl text-xs sm:text-sm font-semibold text-[#0B1F63] placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] dark:bg-[#071322] dark:border-[#1E3A5F] dark:text-white"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            applyFilters({ search: undefined });
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9BB9] hover:text-[#C62840]"
                                        aria-label="Hapus pencarian"
                                    >
                                        <X aria-hidden="true" className="size-4" />
                                    </button>
                                )}
                            </form>

                            {/* Filter Trigger Button */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    type="button"
                                    variant={activeFilterCount > 0 ? 'primary' : 'outline'}
                                    onClick={() => {
                                        setModalCompanyId(companyId);
                                        setModalShipId(shipId);
                                        setModalJob(job);
                                        setModalStatus(status);
                                        setModalDateRange(dateRange);
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
                                        onClick={resetFilters}
                                        className="h-11 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                    >
                                        <RotateCcw aria-hidden="true" className="size-3.5 mr-1" />
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Active Filter Chips */}
                        {activeFilterCount > 0 && (
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
                                                applyFilters({ company_id: undefined, ship_id: undefined });
                                            }}
                                            className="hover:text-[#C62840]"
                                            aria-label="Hapus filter perusahaan"
                                        >
                                            <X className="size-3" />
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
                                                applyFilters({ ship_id: undefined });
                                            }}
                                            className="hover:text-[#C62840]"
                                            aria-label="Hapus filter kapal"
                                        >
                                            <X className="size-3" />
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
                                                applyFilters({ job: undefined });
                                            }}
                                            className="hover:text-[#C62840]"
                                            aria-label="Hapus filter job"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                )}
                                {status && status !== 'all' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Status: {statusLabels[status] || status}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStatus('all');
                                                applyFilters({ status: undefined });
                                            }}
                                            className="hover:text-[#C62840]"
                                            aria-label="Hapus filter status"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                )}
                                {(dateRange.startDate || dateRange.endDate) && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                        Tanggal: {dateRange.startDate || '...'} s/d {dateRange.endDate || '...'}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const empty = { startDate: '', endDate: '' };
                                                setDateRange(empty);
                                                applyFilters({ start_date: undefined, end_date: undefined });
                                            }}
                                            className="hover:text-[#C62840]"
                                            aria-label="Hapus filter rentang tanggal"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {workOrders.data.length === 0 ? (
                    <Card className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52]">
                            <ClipboardList aria-hidden="true" className="size-7" />
                        </div>
                        <div className="max-w-md">
                            <h2 className="text-balance font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Data Tidak Ditemukan</h2>
                            <p className="mt-1 text-pretty text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">
                                Ubah filter pencarian atau catat SPK baru ketika dokumen klien diterima.
                            </p>
                        </div>
                        {canCreate && (
                            <Link href="/work-orders/create" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-offset-2">
                                <Plus aria-hidden="true" className="size-4" />
                                Tambah SPK
                            </Link>
                        )}
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-3 md:hidden">
                            {workOrders.data.map((item) => {
                                const href = detailHref(item);

                                return (
                                    <Card key={item.id} className="space-y-4 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <ShipImage src={item.ship?.image} alt={`Foto ${item.ship?.name || 'kapal'}`} width={56} height={56} loading="lazy" className="size-14 shrink-0 rounded-xl border border-[#DCEAF8] object-cover dark:border-[#1E3A5F]" placeholderIconClassName="size-5" />
                                                <div className="min-w-0">
                                                    <p className="break-words text-sm font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{item.system_number}</p>
                                                    <p className="mt-0.5 truncate text-xs text-[#52658E] dark:text-[#94A3B8]" translate="no">{item.client_number}</p>
                                                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#0B1F63] dark:text-white">{item.ship?.name || 'Kapal belum tersedia'}</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={statusLabels[item.status] || item.status} />
                                        </div>

                                        <div className="grid gap-2 text-sm text-[#52658E] dark:text-[#94A3B8]">
                                            <p className="flex min-w-0 items-center gap-2">
                                                <Ship aria-hidden="true" className="size-4 shrink-0" />
                                                <span className="min-w-0 truncate"><strong className="text-[#0B1F63] dark:text-[#F1F5F9]">{item.ship?.name || 'Kapal belum tersedia'}</strong> · {item.port?.name || '-'}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <UserRound aria-hidden="true" className="size-4 shrink-0" />
                                                <span className="truncate">{item.assignee?.name || 'Belum ditugaskan'}</span>
                                            </p>
                                            <p className="flex items-center gap-2 tabular-nums">
                                                <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
                                                ETA {formatDate(item.planned_eta_at)}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2 border-t border-[#DCEAF8] pt-3 dark:border-[#1E3A5F]">
                                            {href && (
                                                <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DCEAF8] px-3 text-xs font-bold text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#132847]">
                                                    Lihat riwayat
                                                    <ArrowRight aria-hidden="true" className="size-4" />
                                                </Link>
                                            )}
                                            {item.document_path && (
                                                <a className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DCEAF8] px-3 text-xs font-bold text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#132847]" href={`/work-orders/${item.id}/document`}>
                                                    <Download aria-hidden="true" className="size-4" />
                                                    Dokumen
                                                </a>
                                            )}
                                            {item.can_transition && item.next_status && (
                                                <Button size="sm" onClick={() => { setTransitionError(null); setSelectedTransition(item); }}>
                                                    {transitionLabels[item.next_status]}
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        <div className="hidden md:block">
                            <Table<WorkOrder>
                                data={workOrders.data}
                                keyExtractor={(item) => item.id}
                                compact
                                minWidth="1160px"
                                emptyMessage="Data Tidak Ditemukan"
                                columns={[
                                    {
                                        key: 'spk',
                                        header: 'SPK / kegiatan',
                                        width: '240px',
                                        render: (item) => (
                                            <div>
                                                <Link href={detailHref(item)} prefetch className="font-bold text-[#0B1F63] hover:text-[#0060F4] dark:text-white" translate="no">{item.system_number}</Link>
                                                <p className="mt-0.5 text-xs text-[#52658E]" translate="no">{item.client_number}</p>
                                                <p className="mt-1 line-clamp-1 text-xs text-[#52658E]">{item.items?.[0]?.name || '-'}</p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'ship',
                                        header: 'Kapal & perusahaan',
                                        width: '210px',
                                        render: (item) => <div className="flex min-w-0 items-center gap-2.5"><ShipImage src={item.ship?.image} alt={`Foto ${item.ship?.name || 'kapal'}`} width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" placeholderIconClassName="size-4" /><div className="min-w-0"><p className="break-words font-semibold">{item.ship?.name || '-'}</p><p className="mt-0.5 break-words text-xs text-[#52658E]">{item.company?.name || '-'}</p></div></div>,
                                    },
                                    {
                                        key: 'visit',
                                        header: 'Kunjungan',
                                        width: '220px',
                                        render: (item) => <div><p>{item.port_call?.job_number || item.port?.name || '-'}</p><p className="mt-0.5 text-xs tabular-nums text-[#52658E]">ETA {formatDate(item.planned_eta_at)}</p></div>,
                                    },
                                    { key: 'assignee', header: 'Penanggung jawab', width: '160px', render: (item) => item.assignee?.name || '-' },
                                    { key: 'status', header: 'Status', width: '140px', render: (item) => <StatusBadge status={statusLabels[item.status] || item.status} /> },
                                    {
                                        key: 'actions',
                                        header: 'Aksi',
                                        width: '220px',
                                        align: 'right',
                                        render: (item) => {
                                            const href = detailHref(item);
                                            return (
                                                <div className="flex justify-end gap-2">
                                                    {href && <Link aria-label={`Lihat riwayat ${item.system_number}`} href={href} prefetch className="flex size-9 items-center justify-center rounded-[10px] border border-[#DCEAF8] text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] dark:border-[#1E3A5F]"><ArrowRight aria-hidden="true" className="size-4" /></Link>}
                                                    {item.document_path && <a aria-label={`Unduh dokumen ${item.system_number}`} className="flex size-9 items-center justify-center rounded-[10px] border border-[#DCEAF8] text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] dark:border-[#1E3A5F]" href={`/work-orders/${item.id}/document`}><Download aria-hidden="true" className="size-4" /></a>}
                                                    {item.can_transition && item.next_status && <Button size="sm" onClick={() => { setTransitionError(null); setSelectedTransition(item); }}>{transitionLabels[item.next_status]}</Button>}
                                                </div>
                                            );
                                        },
                                    },
                                ]}
                            />
                        </div>
                    </>
                )}

                <Pagination
                    links={workOrders.links}
                    currentPage={workOrders.current_page}
                    lastPage={workOrders.last_page}
                    total={workOrders.total}
                    from={workOrders.from ?? undefined}
                    to={workOrders.to ?? undefined}
                />
            </div>

            <ConfirmDialog
                isOpen={selectedTransition !== null}
                title={selectedTransition?.next_status ? transitionLabels[selectedTransition.next_status] : 'Perbarui Status SPK'}
                description={selectedTransition?.next_status ? transitionDescriptions[selectedTransition.next_status] : ''}
                confirmLabel={selectedTransition?.next_status ? transitionLabels[selectedTransition.next_status] : 'Perbarui'}
                onConfirm={confirmTransition}
                onClose={() => { if (!transitioning) setSelectedTransition(null); }}
                processing={transitioning}
            >
                {selectedTransition && (
                    <div className="rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                        <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{selectedTransition.system_number}</p>
                        <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">{selectedTransition.ship?.name} · {selectedTransition.port?.name}</p>
                    </div>
                )}
                {transitionError && <p role="alert" className="rounded-xl bg-[#FFE7EC] p-3 text-sm font-semibold text-[#C62840] dark:bg-[#C62840]/20 dark:text-[#FCA5A5]">{transitionError}</p>}
            </ConfirmDialog>

            {/* Modal Filter SPK */}
            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter SPK & Kegiatan Kapal"
                subtitle="Saring data SPK berdasarkan perusahaan, kapal, job, status, atau rentang tanggal"
                size="lg"
                footer={(
                    <div className="flex w-full items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setModalCompanyId('');
                                setModalShipId('');
                                setModalJob('');
                                setModalStatus('all');
                                setModalDateRange({ startDate: '', endDate: '' });
                            }}
                            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                        >
                            <RotateCcw aria-hidden="true" className="size-3.5 mr-1.5" />
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
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => {
                                    setCompanyId(modalCompanyId);
                                    setShipId(modalShipId);
                                    setJob(modalJob);
                                    setStatus(modalStatus);
                                    setDateRange(modalDateRange);
                                    setIsFilterModalOpen(false);
                                    applyFilters({
                                        company_id: modalCompanyId || undefined,
                                        ship_id: modalShipId || undefined,
                                        job: modalJob || undefined,
                                        status: modalStatus !== 'all' ? modalStatus : undefined,
                                        start_date: modalDateRange.startDate || undefined,
                                        end_date: modalDateRange.endDate || undefined,
                                    });
                                }}
                            >
                                Terapkan Filter
                            </Button>
                        </div>
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
                            label="Nomor Job / Port Call"
                            value={modalJob}
                            onChange={(val) => setModalJob(String(val || ''))}
                            options={jobOptions}
                            placeholder="Pilih Job"
                        />
                        <SelectSearch
                            label="Status SPK"
                            value={modalStatus}
                            onChange={(val) => setModalStatus(String(val || 'all'))}
                            options={statusOptions}
                            placeholder="Pilih Status"
                        />
                    </div>

                    <div className="pt-2 border-t border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60">
                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E2E8F0] mb-2">
                            Rentang Tanggal SPK
                        </label>
                        <DateRangePicker
                            inline
                            value={modalDateRange}
                            onChange={(range) => setModalDateRange(range)}
                        />
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
