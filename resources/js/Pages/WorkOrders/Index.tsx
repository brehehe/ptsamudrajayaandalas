import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarClock,
    ClipboardList,
    Download,
    FileClock,
    Plus,
    ReceiptText,
    Search,
    Ship,
    UserRound,
} from 'lucide-react';
import React, { useState } from 'react';
import Input from '../../Components/forms/Input';
import FilterBar from '../../Components/filters/FilterBar';
import ConfirmDialog from '../../Components/overlays/ConfirmDialog';
import Pagination from '../../Components/pagination/Pagination';
import Select from '../../Components/selects/Select';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Table from '../../Components/tables/Table';
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
    ship?: { id: string; name: string; imo_number?: string | null; ship_type?: string | null };
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
    filters: { search: string; status: string };
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

export default function WorkOrdersIndex({ workOrders, stats, filters, canCreate }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [search, setSearch] = useState(filters.search);
    const [selectedTransition, setSelectedTransition] = useState<WorkOrder | null>(null);
    const [transitionError, setTransitionError] = useState<string | null>(null);
    const [transitioning, setTransitioning] = useState(false);
    const role = auth.user?.primary_role || 'Pengguna';

    const submitSearch = (event: React.FormEvent) => {
        event.preventDefault();
        router.get('/work-orders', { search, status: filters.status }, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setSearch('');
        router.get('/work-orders', {}, { preserveState: true, replace: true });
    };

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

                <div className="md:hidden">
                    <FilterBar
                        searchValue={search}
                        onSearchChange={setSearch}
                        onSearchSubmit={() => router.get('/work-orders', { search, status: filters.status }, { preserveState: true, replace: true })}
                        searchPlaceholder="Cari nomor SPK, kapal, atau perusahaan…"
                        searchAriaLabel="Cari SPK"
                        chips={statusFilters.map((item) => ({ id: item.value, label: item.label }))}
                        activeChipId={filters.status}
                        onChipChange={(status) => router.get('/work-orders', { search, status }, { preserveState: true, replace: true })}
                        filterCountBadge={filters.status === 'all' ? 0 : 1}
                        filterTitle="Pilih status SPK"
                        filterControls={(
                            <Select
                                aria-label="Filter status SPK"
                                value={filters.status}
                                onChange={(event) => router.get('/work-orders', { search, status: event.target.value }, { preserveState: true, replace: true })}
                                options={statusFilters.map((item) => ({
                                    value: item.value,
                                    label: item.value === 'all' ? 'Semua status' : item.label,
                                }))}
                            />
                        )}
                        className="!border-0 !bg-transparent !p-0 !shadow-none dark:!bg-transparent"
                    />
                </div>

                <Card className="hidden p-3 sm:p-4 md:block">
                    <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
                        <Input
                            aria-label="Cari SPK"
                            autoComplete="off"
                            name="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nomor SPK, kapal, atau perusahaan…"
                            leftIcon={<Search aria-hidden="true" className="size-4" />}
                        />
                        <Select
                            aria-label="Filter status SPK"
                            name="status"
                            value={filters.status}
                            onChange={(event) => router.get('/work-orders', { search, status: event.target.value }, { preserveState: true, replace: true })}
                            options={statusFilters.map((item) => ({
                                value: item.value,
                                label: item.value === 'all' ? 'Semua status' : item.label,
                            }))}
                        />
                        <div className="flex gap-2">
                            <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">Cari</Button>
                            {(filters.search || filters.status !== 'all') && (
                                <Button type="button" variant="ghost" onClick={resetFilters} className="flex-1 sm:flex-none">Reset</Button>
                            )}
                        </div>
                    </form>
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
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{item.system_number}</p>
                                                <p className="mt-0.5 truncate text-xs text-[#52658E] dark:text-[#94A3B8]" translate="no">{item.client_number}</p>
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
                                        render: (item) => <div><p className="font-semibold">{item.ship?.name || '-'}</p><p className="mt-0.5 text-xs text-[#52658E]">{item.company?.name || '-'}</p></div>,
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
        </AppLayout>
    );
}
