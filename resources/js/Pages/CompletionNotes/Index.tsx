import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    Download,
    Eye,
    FileCheck2,
    FilePlus2,
    FileText,
    RotateCcw,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Modal from '../../Components/overlays/Modal';
import Pagination from '../../Components/pagination/Pagination';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import ActionMenu from '../../Components/ui/ActionMenu';
import ImportExportActions from '../../Components/ui/ImportExportActions';
import StatusBadge from '../../Components/ui/StatusBadge';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import { formatDate } from '../../lib/formatDate';

interface CompletionNote {
    id: string;
    document_number: string;
    issued_at: string;
    uploaded_at: string;
    document_path: string;
    status: string;
    actual_amount: number | string;
    reconciliation?: {
        initial_total: number | string;
        actual_total: number | string;
        variance: number | string;
        status: string;
    } | null;
    uploader?: { name: string } | null;
    port_call?: {
        job_number: string;
        ship?: { name: string } | null;
        port?: { name: string } | null;
        work_order?: { company?: { name: string } | null } | null;
    } | null;
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
    notes: Paginated<CompletionNote>;
    companies?: Array<{ id: string; name: string }>;
    ships?: Array<{ id: string; name: string; ship_company_id?: string }>;
    jobs?: Array<{ id: string; job_number?: string; ship_id?: string }>;
    stats?: {
        total_count: number;
        total_amount: number;
        uploaded_count: number;
        verified_count: number;
        reconciled_count: number;
    };
    filters: {
        search: string;
        status: string;
        company_id?: string;
        ship_id?: string;
        job?: string;
        start_date?: string;
        end_date?: string;
    };
    abilities: { create: boolean };
}

const statusLabel: Record<string, string> = {
    uploaded: 'Sudah Diunggah',
    verified: 'Terverifikasi',
    reconciled: 'Selesai',
};

const money = (value: number | string) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const statusOptions: SelectSearchOption[] = [
    { value: 'all', label: 'Semua Status' },
    { value: 'uploaded', label: 'Sudah Diunggah', badge: 'Aktif' },
    { value: 'verified', label: 'Terverifikasi', badge: 'Valid' },
    { value: 'reconciled', label: 'Rekonsiliasi Selesai', badge: 'Selesai' },
];

export default function CompletionNotesIndex({
    notes,
    companies = [],
    ships = [],
    jobs = [],
    stats,
    filters,
    abilities,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [companyId, setCompanyId] = useState(filters.company_id || '');
    const [shipId, setShipId] = useState(filters.ship_id || '');
    const [job, setJob] = useState(filters.job || '');

    // Modal state for filters
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modalCompanyId, setModalCompanyId] = useState(filters.company_id || '');
    const [modalShipId, setModalShipId] = useState(filters.ship_id || '');
    const [modalJob, setModalJob] = useState(filters.job || '');
    const [modalStatus, setModalStatus] = useState(filters.status || 'all');

    const availableShips = useMemo(() => {
        if (!companyId) return ships;
        return ships.filter((s) => s.ship_company_id === companyId);
    }, [ships, companyId]);

    const modalAvailableShips = useMemo(() => {
        if (!modalCompanyId) return ships;
        return ships.filter((s) => s.ship_company_id === modalCompanyId);
    }, [ships, modalCompanyId]);

    const companyOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Perusahaan' },
        ...companies.map((c) => ({ value: c.id, label: c.name })),
    ], [companies]);

    const shipOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Kapal' },
        ...availableShips.map((s) => ({ value: s.id, label: s.name })),
    ], [availableShips]);

    const modalShipOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Kapal' },
        ...modalAvailableShips.map((s) => ({ value: s.id, label: s.name })),
    ], [modalAvailableShips]);

    const jobOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Job' },
        ...jobs.map((j) => ({
            value: j.job_number || j.id,
            label: j.job_number || j.id,
        })),
    ], [jobs]);

    const activeFilterCount = [
        companyId,
        shipId,
        job,
        status && status !== 'all' ? status : '',
    ].filter(Boolean).length;

    const hasActiveFilters = Boolean(
        search ||
        (status && status !== 'all') ||
        companyId ||
        shipId ||
        job
    );

    const applyFilters = (overrides?: Record<string, string | undefined>) => {
        const params = {
            search: search || undefined,
            status: status !== 'all' ? status : undefined,
            company_id: companyId || undefined,
            ship_id: shipId || undefined,
            job: job || undefined,
            ...overrides,
        };
        router.get('/completion-notes', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setCompanyId('');
        setShipId('');
        setJob('');
        router.get('/completion-notes', {}, { preserveState: true, preserveScroll: true });
    };

    const actions = (note: CompletionNote) => (
        <ActionMenu
            label={`Buka aksi nota rampung ${note.document_number}`}
            groups={[{
                id: 'document-actions',
                items: [
                    {
                        id: 'view-document',
                        label: 'Lihat Nota',
                        icon: <Eye aria-hidden="true" className="size-4" />,
                        href: `/completion-notes/${note.id}/document?view=1`,
                        target: '_blank',
                        tone: 'primary',
                    },
                    {
                        id: 'download-document',
                        label: 'Unduh Nota',
                        icon: <Download aria-hidden="true" className="size-4" />,
                        href: `/completion-notes/${note.id}/document`,
                    },
                ],
            }]}
        />
    );

    const columns: Column<CompletionNote>[] = [
        {
            key: 'document',
            header: 'Nota Rampung',
            wrap: 'normal',
            render: (note) => (
                <div>
                    <p className="font-mono font-bold text-[#0060F4]" translate="no">
                        {note.document_number}
                    </p>
                    <p className="text-[11px] text-[#52658E]">{formatDate(note.uploaded_at)}</p>
                </div>
            ),
        },
        {
            key: 'job',
            header: 'Job / Kapal',
            wrap: 'normal',
            render: (note) => (
                <div>
                    <p className="font-semibold" translate="no">
                        {note.port_call?.job_number || '—'}
                    </p>
                    <p className="text-[11px] text-[#52658E]">{note.port_call?.ship?.name || 'Kapal tidak tersedia'}</p>
                </div>
            ),
        },
        { key: 'company', header: 'Perusahaan', wrap: 'normal', render: (note) => note.port_call?.work_order?.company?.name || '—' },
        { key: 'port', header: 'Pelabuhan', wrap: 'normal', render: (note) => note.port_call?.port?.name || '—' },
        // {
        //     key: 'paid',
        //     header: 'Dibayar / Resmi',
        //     align: 'right',
        //     render: (note) => (
        //         <div className="whitespace-nowrap text-right text-xs tabular-nums">
        //             <p className="text-[#52658E]">{money(note.reconciliation?.initial_total || 0)}</p>
        //             <p className="font-bold text-[#0B1F63] dark:text-white">{money(note.actual_amount)}</p>
        //         </div>
        //     ),
        // },
        // {
        //     key: 'variance',
        //     header: 'Selisih',
        //     align: 'right',
        //     render: (note) => (
        //         <span
        //             className={`whitespace-nowrap font-bold tabular-nums ${
        //                 Number(note.reconciliation?.variance || 0) > 0 ? 'text-[#C62840]' : 'text-[#087443]'
        //             }`}
        //         >
        //             {money(note.reconciliation?.variance || 0)}
        //         </span>
        //     ),
        // },
        {
            key: 'status',
            header: 'Status',
            render: (note) => (
                <StatusBadge
                    status={note.status === 'uploaded' ? 'Aktif' : 'Selesai'}
                    label={statusLabel[note.status] || note.status}
                    showDot
                />
            ),
        },
        { key: 'actions', header: 'Aksi', align: 'right', render: actions },
    ];

    return (
        <AppLayout title="Nota Rampung" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Nota Rampung — PT Samudra Jaya Andalas" />
            <MobilePageHero title="Nota Rampung" description="Arsipkan bukti Nota Rampung pada Job kapal yang sesuai." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-12 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none md:dark:bg-transparent">
                <div className="hidden items-end justify-between gap-4 border-b border-[#DCEAF8] pb-4 md:flex dark:border-[#1E3A5F]">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0060F4]">Rekonsiliasi Biaya</p>
                        <h1 className="text-balance text-3xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                            Nota Rampung
                        </h1>
                        <p className="mt-1 text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">
                            Nota resmi, pembayaran awal, dan selisih biaya tetap terhubung ke Job kapal.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ImportExportActions
                            resource="completion-notes"
                            resourceTitle="Nota Rampung"
                            canManage={abilities.create}
                        />
                        {abilities.create && (
                            <Link
                                href="/completion-notes/create"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35"
                            >
                                <FilePlus2 aria-hidden="true" className="size-4" />
                                Unggah Nota Rampung
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── KPI Stat Cards ── */}
                {stats && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Card padding="md">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Total Nota Rampung</p>
                                    <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {stats.total_count}
                                    </p>
                                    <p className="mt-1 text-[11px] font-semibold text-[#0060F4]">{money(stats.total_amount)}</p>
                                </div>
                                <span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#0060F4]/20 dark:text-[#38BDF8]">
                                    <FileText aria-hidden="true" className="size-5" />
                                </span>
                            </div>
                        </Card>
                        <Card padding="md">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Sudah Diunggah</p>
                                    <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0060F4] dark:text-[#38BDF8]">
                                        {stats.uploaded_count}
                                    </p>
                                    <p className="mt-1 text-[11px] text-[#52658E]">Menunggu verifikasi</p>
                                </div>
                                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[#0060F4] dark:bg-blue-950/40 dark:text-[#38BDF8]">
                                    <Clock3 aria-hidden="true" className="size-5" />
                                </span>
                            </div>
                        </Card>
                        <Card padding="md">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Terverifikasi</p>
                                    <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        {stats.verified_count}
                                    </p>
                                    <p className="mt-1 text-[11px] text-[#52658E]">Biaya tervalidasi</p>
                                </div>
                                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <FileCheck2 aria-hidden="true" className="size-5" />
                                </span>
                            </div>
                        </Card>
                        <Card padding="md">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Rekonsiliasi Selesai</p>
                                    <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                                        {stats.reconciled_count}
                                    </p>
                                    <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Selisih terhitung tuntas</p>
                                </div>
                                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100/60 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                    <CheckCircle2 aria-hidden="true" className="size-5" />
                                </span>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ── Modern Filter Bar with Filter Modal ── */}
                <Card padding="md">
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            {/* Search Input (Roomy) */}
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
                                    placeholder="Cari nomor nota, kapal, atau job…"
                                    aria-label="Cari Nota Rampung"
                                    className="w-full h-11 pl-9 pr-8 bg-[#F8FBFF] border border-[#DCEAF8] rounded-xl text-xs sm:text-sm font-semibold text-[#0B1F63] placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] dark:bg-[#071322] dark:border-[#1E3A5F] dark:text-white"
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
                                        <X aria-hidden="true" className="size-3.5" />
                                    </button>
                                )}
                            </form>

                            {/* Action Buttons: Filter Modal Trigger & Reset */}
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
                                        Status: {statusOptions.find((s) => s.value === status)?.label || status}
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
                            </div>
                        )}
                    </div>
                </Card>

                {abilities.create && (
                    <Link
                        href="/completion-notes/create"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 md:hidden"
                    >
                        <FilePlus2 aria-hidden="true" className="size-4" />
                        Unggah Nota Rampung
                    </Link>
                )}

                <ResponsiveTable
                    data={notes.data}
                    keyExtractor={(note) => note.id}
                    desktop={{ columns, compact: true, minWidth: '900px' }}
                    mobile={{
                        titleRender: (note) => note.document_number,
                        subtitleRender: (note) => note.port_call?.ship?.name || 'Kapal tidak tersedia',
                        statusRender: (note) => (
                            <StatusBadge status={note.status === 'uploaded' ? 'Aktif' : 'Selesai'} label={statusLabel[note.status] || note.status} />
                        ),
                        fields: [
                            { label: 'Job', render: (note) => note.port_call?.job_number || '—' },
                            { label: 'Perusahaan', render: (note) => note.port_call?.work_order?.company?.name || '—' },
                            { label: 'Diunggah', render: (note) => formatDate(note.uploaded_at) },
                            { label: 'Tagihan resmi', render: (note) => money(note.actual_amount) },
                            { label: 'Selisih', render: (note) => money(note.reconciliation?.variance || 0) },
                        ],
                        actionsRender: actions,
                    }}
                />
                <Pagination
                    links={notes.links}
                    currentPage={notes.current_page}
                    lastPage={notes.last_page}
                    total={notes.total}
                    from={notes.from ?? undefined}
                    to={notes.to ?? undefined}
                />
            </div>

            {/* Filter Modal */}
            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter Nota Rampung"
                size="lg"
                asBottomSheetOnMobile
                footer={(
                    <div className="flex w-full items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setModalCompanyId('');
                                setModalShipId('');
                                setModalJob('');
                                setModalStatus('all');
                            }}
                            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                        >
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
                            label="Status Nota Rampung"
                            value={modalStatus}
                            onChange={(val) => setModalStatus(String(val || 'all'))}
                            options={statusOptions}
                            placeholder="Pilih Status"
                        />
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
