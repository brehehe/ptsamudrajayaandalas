import React, { useMemo, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, ChevronRight, ClipboardList, Clock, FileText, Filter, Plus, RotateCcw, Search, Send, Ship, UserRound, X } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import Select from '../../Components/selects/Select';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import DateRangePicker, { type DateRange } from '../../Components/forms/DateRangePicker';
import Table from '../../Components/tables/Table';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Input from '../../Components/forms/Input';
import Textarea from '../../Components/forms/Textarea';
import ShipImage from '../../Components/vessels/ShipImage';

interface Ship {
    id: string;
    name: string;
    imo_number: string;
    ship_type?: string;
    image?: string | null;
    ship_company_id?: string;
    company?: {
        id: string;
        name: string;
    };
}

interface PortCall {
    id: string;
    job_number: string;
    ship: Ship;
    port: {
        name: string;
    };
}

interface NeedItem {
    id: string;
    request_number: string;
    ship_id: string;
    status: string;
    request_date: string;
    notes?: string;
    created_at: string;
    ship?: Ship;
    creator?: {
        name: string;
    };
    port_call?: {
        job_number: string;
        port?: {
            name: string;
        };
    };
}

interface NeedsIndexProps {
    needs: NeedItem[];
    ships: Ship[];
    companies?: Array<{ id: string; name: string }>;
    jobs?: Array<{ id: string; job_number?: string; ship_id?: string }>;
    portCalls: PortCall[];
    counts: {
        semua: number;
        menunggu: number;
        proses: number;
        selesai: number;
    };
    activeStatus: string;
    search: string;
    filters?: {
        search?: string;
        status?: string;
        company_id?: string;
        ship_id?: string;
        job?: string;
        start_date?: string;
        end_date?: string;
    };
    capabilities: {
        can_create: boolean;
        can_process: boolean;
    };
}

const NEED_TYPES = [
    { label: 'Air Tawar (Fresh Water)', value: 'Air Tawar' },
    { label: 'Perahu Motor Tambat', value: 'Perahu Motor Tambat' },
    { label: 'BBM / Bunker MGO', value: 'BBM / Bunker MGO' },
    { label: 'Crew Transport / Boat', value: 'Crew Transport' },
    { label: 'Jasa Pandu & Tunda Pelindo', value: 'Jasa Pandu & Tunda' },
    { label: 'Perbekalan Makanan (Provisions)', value: 'Perbekalan Makanan' },
    { label: 'Suku Cadang & Workshop', value: 'Suku Cadang & Workshop' },
    { label: 'Lain-lain', value: 'Lain-lain' },
];

export default function NeedsIndex({
    needs,
    ships = [],
    companies = [],
    jobs = [],
    portCalls,
    counts,
    activeStatus,
    search: initialSearch,
    filters,
    capabilities,
}: NeedsIndexProps) {
    const canCreateNeeds = capabilities.can_create;
    const canProcessRequests = capabilities.can_process;
    const [search, setSearch] = useState(filters?.search || initialSearch || '');
    const [status, setStatus] = useState(filters?.status || activeStatus || 'semua');
    const [companyId, setCompanyId] = useState(filters?.company_id || '');
    const [shipId, setShipId] = useState(filters?.ship_id || '');
    const [jobNumber, setJobNumber] = useState(filters?.job || '');
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: filters?.start_date || '',
        endDate: filters?.end_date || '',
    });
    const [isFilterExpandedMobile, setIsFilterExpandedMobile] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedNeed, setSelectedNeed] = useState<NeedItem | null>(null);

    const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
        ship_id: portCalls[0]?.ship.id || ships[0]?.id || '',
        port_call_id: portCalls[0]?.id || '',
        need_type: 'Air Tawar',
        quantity: '',
        unit: '',
        required_at: '',
        notes: '',
    });

    const visit = (
        st = status,
        q = search,
        comp = companyId,
        shp = shipId,
        jb = jobNumber,
        dRange = dateRange
    ) => {
        router.get(
            '/needs',
            {
                status: st === 'semua' ? undefined : st,
                search: q || undefined,
                company_id: comp || undefined,
                ship_id: shp || undefined,
                job: jb || undefined,
                start_date: dRange.startDate || undefined,
                end_date: dRange.endDate || undefined,
            },
            { preserveState: true }
        );
    };

    const handleResetAllFilters = () => {
        setSearch('');
        setStatus('semua');
        setCompanyId('');
        setShipId('');
        setJobNumber('');
        const emptyRange = { startDate: '', endDate: '' };
        setDateRange(emptyRange);
        visit('semua', '', '', '', '', emptyRange);
    };

    const hasActiveFilters = Boolean(
        search || (status && status !== 'semua') || companyId || shipId || jobNumber || dateRange.startDate || dateRange.endDate
    );

    const availableShips = useMemo(() => {
        if (!companyId) return ships;
        return ships.filter((s) => (s.ship_company_id || s.company?.id) === companyId);
    }, [ships, companyId]);

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

    const jobOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: '', label: 'Semua Job' },
            ...jobs.map((j) => ({ value: j.job_number || j.id, label: j.job_number || j.id })),
        ],
        [jobs]
    );

    const statusOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: 'semua', label: 'Semua Status' },
            { value: 'menunggu', label: `Menunggu Review (${counts.menunggu || 0})` },
            { value: 'proses', label: `Dalam Proses (${counts.proses || 0})` },
            { value: 'selesai', label: `Selesai (${counts.selesai || 0})` },
        ],
        [counts]
    );

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/needs', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleUpdateStatus = (id: string, newStatus: string) => {
        router.patch(
            `/needs/${id}/status`,
            { status: newStatus },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedNeed(null),
            }
        );
    };

    const statusTabs = [
        { id: 'semua', label: 'Semua', count: counts.semua },
        { id: 'menunggu', label: 'Menunggu Review', count: counts.menunggu },
        { id: 'proses', label: 'Dalam Proses', count: counts.proses },
        { id: 'selesai', label: 'Selesai', count: counts.selesai },
    ];

    return (
        <AppLayout
            title="Kebutuhan Armada Kapal"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Kebutuhan Logistik Armada — PT Samudra Jaya Andalas" />

            <MobilePageHero
                title="Kebutuhan Kapal"
                description="Catat kebutuhan per kunjungan dan pantau proses pemenuhannya."
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none md:dark:bg-transparent">
                <div className="hidden items-end justify-between gap-4 md:flex">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0060F4]">Logistik Kapal</p>
                        <h1 className="text-balance text-2xl font-extrabold text-[#0B1F63] sm:text-3xl dark:text-[#F1F5F9]">
                            Kebutuhan Armada Kapal
                        </h1>
                        <p className="mt-0.5 text-pretty text-xs text-[#52658E] sm:text-sm dark:text-[#94A3B8]">
                            Data monitoring operasional keagenan dan kebutuhan logistik kapal di
                            pelabuhan
                        </p>
                    </div>
                    {canCreateNeeds && (
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex min-h-11 flex-shrink-0 items-center gap-2 rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0052D4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                        >
                            <Plus aria-hidden="true" className="size-4" />
                            <span>Catat Kebutuhan Baru</span>
                        </button>
                    )}
                </div>

                {canCreateNeeds && (
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0052D4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] md:hidden"
                    >
                        <Plus aria-hidden="true" className="size-4" />
                        Catat Kebutuhan Baru
                    </button>
                )}

                {/* ── KPI Summary Cards ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card padding="md">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Total Kebutuhan</p>
                                <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                    {counts.semua || 0}
                                </p>
                                <p className="mt-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">Semua pengajuan</p>
                            </div>
                            <span className="flex size-10 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                <FileText aria-hidden="true" className="size-5" />
                            </span>
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs text-amber-700 dark:text-amber-400">Menunggu Review</p>
                                <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-800 dark:text-amber-300">
                                    {counts.menunggu || 0}
                                </p>
                                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Perlu ditinjau</p>
                            </div>
                            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                <Clock aria-hidden="true" className="size-5" />
                            </span>
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs text-blue-700 dark:text-blue-400">Dalam Proses</p>
                                <p className="mt-1 text-xl font-extrabold tabular-nums text-blue-800 dark:text-blue-300">
                                    {counts.proses || 0}
                                </p>
                                <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400">Sedang dipenuhi</p>
                            </div>
                            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                <Send aria-hidden="true" className="size-5" />
                            </span>
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400">Selesai Dipenuhi</p>
                                <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-800 dark:text-emerald-300">
                                    {counts.selesai || 0}
                                </p>
                                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Tuntas disuplai</p>
                            </div>
                            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <CheckCircle2 aria-hidden="true" className="size-5" />
                            </span>
                        </div>
                    </Card>
                </div>

                {/* ── Modern Filter Bar using SelectSearch ── */}
                <Card padding="md">
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 items-center">
                            {/* Search Input */}
                            <div className="lg:col-span-3">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        visit();
                                    }}
                                    className="relative"
                                >
                                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8C9BB9]" />
                                    <input
                                        type="search"
                                        name="search"
                                        autoComplete="off"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Cari kapal, nomor, rincian…"
                                        aria-label="Cari kebutuhan kapal"
                                        className="w-full h-11 pl-9 pr-8 bg-[#F8FBFF] border border-[#DCEAF8] rounded-xl text-xs sm:text-sm font-semibold text-[#0B1F63] placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] dark:bg-[#071322] dark:border-[#1E3A5F] dark:text-white"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                visit(status, '', companyId, shipId, jobNumber, dateRange);
                                            }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9BB9] hover:text-[#C62840]"
                                            aria-label="Hapus pencarian"
                                        >
                                            <X aria-hidden="true" className="size-3.5" />
                                        </button>
                                    )}
                                </form>
                            </div>

                            {/* Filter Perusahaan */}
                            <div className="lg:col-span-2">
                                <SelectSearch
                                    placeholder="Semua Perusahaan"
                                    value={companyId}
                                    onChange={(val) => {
                                        const newVal = String(val || '');
                                        setCompanyId(newVal);
                                        setShipId('');
                                        visit(status, search, newVal, '', jobNumber, dateRange);
                                    }}
                                    options={companyOptions}
                                />
                            </div>

                            {/* Filter Kapal */}
                            <div className="lg:col-span-2">
                                <SelectSearch
                                    placeholder="Semua Kapal"
                                    value={shipId}
                                    onChange={(val) => {
                                        const newVal = String(val || '');
                                        setShipId(newVal);
                                        visit(status, search, companyId, newVal, jobNumber, dateRange);
                                    }}
                                    options={shipOptions}
                                />
                            </div>

                            {/* Filter Job */}
                            <div className="lg:col-span-2">
                                <SelectSearch
                                    placeholder="Semua Job"
                                    value={jobNumber}
                                    onChange={(val) => {
                                        const newVal = String(val || '');
                                        setJobNumber(newVal);
                                        visit(status, search, companyId, shipId, newVal, dateRange);
                                    }}
                                    options={jobOptions}
                                />
                            </div>

                            {/* Filter Status */}
                            <div className="lg:col-span-2">
                                <SelectSearch
                                    placeholder="Semua Status"
                                    value={status}
                                    onChange={(val) => {
                                        const newVal = String(val || 'semua');
                                        setStatus(newVal);
                                        visit(newVal, search, companyId, shipId, jobNumber, dateRange);
                                    }}
                                    options={statusOptions}
                                />
                            </div>

                            {/* Reset Button */}
                            <div className="lg:col-span-1 flex justify-end">
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleResetAllFilters}
                                        title="Reset semua filter"
                                        className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer"
                                    >
                                        <RotateCcw className="size-4" />
                                        <span className="lg:hidden text-xs font-bold">Reset</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Date Range Picker row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#EAF2FA] dark:border-[#1E3A5F]/60">
                            <div className="w-full sm:w-72">
                                <DateRangePicker
                                    value={dateRange}
                                    onChange={(range) => {
                                        setDateRange(range);
                                        visit(status, search, companyId, shipId, jobNumber, range);
                                    }}
                                    placeholder="Rentang Tanggal Pengajuan"
                                />
                            </div>

                            {/* Active Filter Badges */}
                            {hasActiveFilters && (
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">Filter aktif:</span>
                                    {companyId && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                            Perusahaan: {companies.find((c) => c.id === companyId)?.name || companyId}
                                            <button type="button" onClick={() => { setCompanyId(''); visit(status, search, '', shipId, jobNumber, dateRange); }}>
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                    {shipId && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                            Kapal: {availableShips.find((s) => s.id === shipId)?.name || shipId}
                                            <button type="button" onClick={() => { setShipId(''); visit(status, search, companyId, '', jobNumber, dateRange); }}>
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                    {jobNumber && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                            Job: {jobNumber}
                                            <button type="button" onClick={() => { setJobNumber(''); visit(status, search, companyId, shipId, '', dateRange); }}>
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                    {status && status !== 'semua' && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                            Status: {status}
                                            <button type="button" onClick={() => { setStatus('semua'); visit('semua', search, companyId, shipId, jobNumber, dateRange); }}>
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                    {(dateRange.startDate || dateRange.endDate) && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                            Tanggal: {dateRange.startDate} - {dateRange.endDate}
                                            <button type="button" onClick={() => { const empty = { startDate: '', endDate: '' }; setDateRange(empty); visit(status, search, companyId, shipId, jobNumber, empty); }}>
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* ── Main Data Card / Table ── */}
                <div>
                    {needs.length === 0 ? (
                        <Card className="px-4 py-12 text-center md:py-16">
                            <div
                                className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52]"
                            >
                                <ClipboardList aria-hidden="true" className="size-8" />
                            </div>
                            <h2 className="text-balance text-base font-bold text-[#082870] dark:text-[#F1F5F9]">
                                Data Tidak Ditemukan
                            </h2>
                            <p className="mx-auto mt-1 max-w-sm text-pretty text-xs text-[#52658E] dark:text-[#94A3B8]">
                                Tidak ada catatan kebutuhan logistik kapal dengan kriteria filter
                                saat ini.
                            </p>
                            {canCreateNeeds && (
                                <Button className="mt-4" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                                    Catat Kebutuhan
                                </Button>
                            )}
                        </Card>
                    ) : (
                        <>
                            <div className="grid gap-2 md:hidden">
                                {needs.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedNeed(item)}
                                        className="group w-full rounded-2xl border border-[#DCEAF8] bg-white p-4 text-left shadow-xs transition-[border-color,box-shadow] hover:border-[#0060F4]/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <ShipImage src={item.ship?.image} alt={`Foto ${item.ship?.name || 'kapal'}`} width={52} height={52} loading="lazy" className="size-[52px] shrink-0 rounded-xl border border-[#DCEAF8] object-cover dark:border-[#1E3A5F]" placeholderIconClassName="size-5" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">
                                                        {item.request_number}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                                        {item.ship?.name || 'Kapal tidak tersedia'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight aria-hidden="true" className="mt-3 size-4 shrink-0 text-[#8C9BB9] transition-transform group-hover:translate-x-0.5" />
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <StatusBadge status={item.status} label={item.status} />
                                            <span className="text-xs tabular-nums text-[#52658E] dark:text-[#94A3B8]">
                                                {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.request_date))}
                                            </span>
                                        </div>

                                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#52658E] dark:text-[#94A3B8]">
                                            {item.notes || 'Permintaan logistik operasional kapal'}
                                        </p>

                                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#DCEAF8] pt-3 text-xs dark:border-[#1E3A5F]">
                                            <p className="flex min-w-0 items-center gap-1.5 text-[#52658E] dark:text-[#94A3B8]">
                                                <Ship aria-hidden="true" className="size-3.5 shrink-0 text-[#0060F4]" />
                                                <span className="truncate">{item.port_call?.job_number || 'Kunjungan langsung'}</span>
                                            </p>
                                            <p className="flex min-w-0 items-center justify-end gap-1.5 text-[#52658E] dark:text-[#94A3B8]">
                                                <UserRound aria-hidden="true" className="size-3.5 shrink-0 text-[#0060F4]" />
                                                <span className="truncate">{item.creator?.name || 'Tidak tersedia'}</span>
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="hidden md:block">
                                <Table<NeedItem>
                                    data={needs}
                                    keyExtractor={(item) => item.id}
                                    compact
                                    minWidth="1120px"
                                    emptyMessage="Data Tidak Ditemukan"
                                    columns={[
                                        {
                                            key: 'request',
                                            header: 'Pengajuan',
                                            width: '180px',
                                            render: (item) => (
                                                <div>
                                                    <p className="font-bold text-[#0060F4]">{item.request_number}</p>
                                                    <p className="mt-0.5 text-[10px] text-[#52658E]">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.request_date))}</p>
                                                </div>
                                            ),
                                        },
                                        {
                                            key: 'ship',
                                            header: 'Kapal & pemilik',
                                            width: '220px',
                                            render: (item) => (
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <ShipImage src={item.ship?.image} alt={`Foto ${item.ship?.name || 'kapal'}`} width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" placeholderIconClassName="size-4" />
                                                    <div className="min-w-0">
                                                        <p className="break-words font-bold">{item.ship?.name || 'Kapal tidak ditemukan'}</p>
                                                        <p className="mt-0.5 break-words text-[11px] text-[#52658E]">IMO {item.ship?.imo_number || '-'} · {item.ship?.company?.name || 'Agen pribadi'}</p>
                                                    </div>
                                                </div>
                                            ),
                                        },
                                        {
                                            key: 'visit',
                                            header: 'Pelabuhan / job',
                                            width: '200px',
                                            render: (item) => (
                                                <div>
                                                    <p className="font-semibold">{item.port_call?.port?.name || 'Pelabuhan belum diisi'}</p>
                                                    <p className="mt-0.5 text-[10px] text-[#52658E]">{item.port_call?.job_number || 'Kunjungan langsung'}</p>
                                                </div>
                                            ),
                                        },
                                        { key: 'notes', header: 'Kebutuhan', render: (item) => <span className="line-clamp-2 text-[#52658E]">{item.notes || 'Permintaan logistik operasional kapal'}</span> },
                                        { key: 'creator', header: 'Pelapor', width: '150px', render: (item) => item.creator?.name || 'Tidak tersedia' },
                                        { key: 'status', header: 'Status', width: '140px', render: (item) => <StatusBadge status={item.status} label={item.status} /> },
                                        {
                                            key: 'actions',
                                            header: 'Aksi',
                                            width: '190px',
                                            align: 'right',
                                            render: (item) => (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {canProcessRequests && item.status === 'Disetujui' && <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(item.id, 'Dalam Proses')}>Proses</Button>}
                                                    {canProcessRequests && ['Dalam Proses', 'Diproses'].includes(item.status) && <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(item.id, 'Selesai')}>Selesai</Button>}
                                                    <Button size="sm" variant="ghost" onClick={() => setSelectedNeed(item)}>Detail</Button>
                                                </div>
                                            ),
                                        },
                                    ]}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal Detail Kebutuhan */}
            {selectedNeed && (
                <Modal
                    isOpen={!!selectedNeed}
                    onClose={() => setSelectedNeed(null)}
                    title={`Detail Kebutuhan ${selectedNeed.request_number}`}
                    subtitle="Informasi kebutuhan dan tindak lanjut pada kunjungan terkait."
                    size="lg"
                    asBottomSheetOnMobile
                >
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-[#DCEAF8] bg-[#F0F8FF] p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-extrabold text-[#0060F4]" translate="no">{selectedNeed.request_number}</p>
                                    <h2 className="mt-1 text-balance text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {selectedNeed.ship?.name || 'Kapal tidak tersedia'}
                                    </h2>
                                    <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                        {selectedNeed.port_call?.job_number || 'Kunjungan langsung'} · {selectedNeed.port_call?.port?.name || 'Pelabuhan tidak tersedia'}
                                    </p>
                                </div>
                                <StatusBadge status={selectedNeed.status} label={selectedNeed.status} showDot />
                            </div>
                        </div>

                        <dl className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]">
                                <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Tanggal pengajuan</dt>
                                <dd className="mt-1 text-sm font-semibold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(selectedNeed.request_date))}
                                </dd>
                            </div>
                            <div className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]">
                                <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Diajukan oleh</dt>
                                <dd className="mt-1 truncate text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {selectedNeed.creator?.name || 'Tidak tersedia'}
                                </dd>
                            </div>
                        </dl>

                        <section aria-labelledby="need-description">
                            <h3 id="need-description" className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Rincian kebutuhan</h3>
                            <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-[#DCEAF8] bg-white p-3 text-sm leading-6 text-[#52658E] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#CBD5E1]">
                                {selectedNeed.notes || 'Tidak ada catatan tambahan.'}
                            </p>
                        </section>

                        <div className="flex flex-col-reverse gap-2 border-t border-[#DCEAF8] pt-4 sm:flex-row sm:justify-end dark:border-[#1E3A5F]">
                            <Button variant="secondary" onClick={() => setSelectedNeed(null)}>Tutup</Button>
                            {canProcessRequests && selectedNeed.status === 'Disetujui' && (
                                <Button onClick={() => handleUpdateStatus(selectedNeed.id, 'Dalam Proses')}>Mulai Proses</Button>
                            )}
                            {canProcessRequests && ['Dalam Proses', 'Diproses'].includes(selectedNeed.status) && (
                                <Button onClick={() => handleUpdateStatus(selectedNeed.id, 'Selesai')}>Tandai Selesai</Button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal Input Kebutuhan Baru */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => { clearErrors(); setIsCreateModalOpen(false); }}
                title="Catat Kebutuhan Logistik Kapal"
                subtitle="Pilih kunjungan yang tepat agar kebutuhan tidak tercampur dengan job lain."
                size="lg"
                asBottomSheetOnMobile
            >
                <form noValidate onSubmit={handleCreateSubmit} className="space-y-4">
                    <FormErrorSummary errors={errors} />
                    <Select required id="need-ship" name="ship_id" label="Pilih Kapal" value={data.ship_id} onChange={(e) => {
                        const shipId = e.target.value;
                        const matchingVisit = portCalls.find((portCall) => portCall.ship.id === shipId);
                        setData((current) => ({ ...current, ship_id: shipId, port_call_id: matchingVisit?.id ?? '' }));
                    }} error={errors.ship_id} options={ships.map((ship) => ({ value: ship.id, label: `${ship.name} (IMO: ${ship.imo_number})` }))} />

                    <Select required id="need-port-call" name="port_call_id" label="Kunjungan / Job" value={data.port_call_id} onChange={(event) => setData('port_call_id', event.target.value)} placeholder="Pilih kunjungan / job aktif" helperText="Kebutuhan akan dicatat pada transaksi kunjungan ini." error={errors.port_call_id} options={portCalls.filter((portCall) => portCall.ship.id === data.ship_id).map((portCall) => ({ value: portCall.id, label: `${portCall.job_number} · ${portCall.port.name}` }))} />

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Select required id="need-type" name="need_type" label="Jenis Kebutuhan" value={data.need_type} onChange={(e) => setData('need_type', e.target.value)} error={errors.need_type} options={NEED_TYPES} />

                        <div>
                            <p className="mb-1.5 block text-xs font-bold text-[#082870] dark:text-[#F1F5F9]">Jumlah & Satuan <span className="text-[#C62840]">*</span></p>
                            <div className="flex gap-2">
                                <Input
                                    required
                                    id="need-quantity"
                                    name="quantity"
                                    type="number"
                                    inputMode="decimal"
                                    min="1"
                                    value={data.quantity}
                                    onChange={(e) => setData('quantity', e.target.value)}
                                    placeholder="Jumlah…"
                                    className="w-2/3"
                                    error={errors.quantity}
                                />
                                <Input
                                    required
                                    type="text"
                                    name="unit"
                                    autoComplete="off"
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    placeholder="Satuan…"
                                    aria-label="Satuan kebutuhan"
                                    className="w-1/3"
                                    error={errors.unit}
                                />
                            </div>
                        </div>
                    </div>

                    <Input
                            required
                            id="need-required-at"
                            name="required_at"
                            type="text"
                            autoComplete="off"
                            value={data.required_at}
                            onChange={(e) => setData('required_at', e.target.value)}
                            placeholder="Contoh: Saat kapal tiba di dermaga 2…"
                            label="Target Waktu Kebutuhan"
                            error={errors.required_at}
                        />

                    <Textarea
                            id="need-notes"
                            name="notes"
                            autoComplete="off"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                            placeholder="Keterangan spesifikasi atau instruksi khusus…"
                            label="Catatan Tambahan"
                            error={errors.notes}
                        />

                    <div className="flex flex-col-reverse gap-2 border-t border-[#DCEAF8] pt-3 sm:flex-row sm:justify-end dark:border-[#1E3A5F]">
                        <Button type="button" variant="secondary" onClick={() => { clearErrors(); setIsCreateModalOpen(false); }}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={processing}
                        >
                            {processing ? 'Menyimpan…' : 'Simpan Kebutuhan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
