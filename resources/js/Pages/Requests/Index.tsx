import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, CalendarDays, FilePlus2, FileText, MapPin, Search, Ship, X } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import StatusBadge from '../../Components/ui/StatusBadge';
import Tabs from '../../Components/ui/Tabs';
import Table, { Column } from '../../Components/tables/Table';
import ShipImage from '../../Components/vessels/ShipImage';

interface RequestItem {
    id: string;
    quantity: number | string;
    hpp_price?: number | string;
    selling_price?: number | string;
    status: string;
    director_status?: string;
}

interface ShipRequest {
    id: string;
    request_number: string;
    status: string;
    request_date: string;
    created_at: string;
    ship?: {
        id: string;
        name: string;
        image?: string | null;
        company?: { name: string };
    };
    company?: { name: string };
    port?: { name: string };
    port_call?: {
        id: string;
        job_number?: string;
        status?: string;
        eta_at?: string;
        port?: { name: string };
        work_order?: { system_number: string };
    };
    items?: RequestItem[];
}

interface PortCall {
    id: string;
    job_number: string;
    status?: string;
    eta_at?: string;
    created_at?: string;
    updated_at?: string;
    ship?: {
        id: string;
        name: string;
        image?: string | null;
        company?: { name: string };
    };
    port?: { name: string };
    work_order?: { system_number: string };
}

interface RequestsIndexProps {
    requests: ShipRequest[];
    portCalls?: PortCall[];
    counts: {
        semua?: number;
        menunggu?: number;
        diproses?: number;
        selesai?: number;
    };
    activeTab: string;
    search: string;
    capabilities?: {
        can_review_prices: boolean;
        can_decide_items: boolean;
        can_view_hpp: boolean;
        can_create_requests: boolean;
        can_process_requests: boolean;
    };
}

interface JobRow {
    key: string;
    jobNumber: string;
    shipName: string;
    shipImage?: string | null;
    companyName: string;
    portName: string;
    requests: ShipRequest[];
    totalItems: number;
    totalHpp: number;
    totalSelling: number;
    status: string;
    updatedAt: string;
    isNew: boolean;
}

const DEFAULT_CAPABILITIES = {
    can_review_prices: false,
    can_decide_items: false,
    can_view_hpp: false,
    can_create_requests: false,
    can_process_requests: false,
};

const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);

const formatDate = (value?: string): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const normalizeStatus = (status?: string): string => (status || '').trim().toLowerCase();

const statusPriority = (status: string): number => {
    const normalized = normalizeStatus(status);
    if (normalized.includes('tolak')) return 5;
    if (normalized.includes('menunggu')) return 4;
    if (normalized.includes('setuju')) return 3;
    if (normalized.includes('proses')) return 2;
    return 1;
};

export default function RequestsIndex({
    requests,
    portCalls = [],
    counts,
    activeTab,
    search: initialSearch,
    capabilities = DEFAULT_CAPABILITIES,
}: RequestsIndexProps) {
    const [search, setSearch] = useState(initialSearch);

    const requestNeedsAction = (request: ShipRequest): boolean => {
        const status = normalizeStatus(request.status);
        const items = request.items || [];

        if (capabilities.can_decide_items) {
            return (
                status === 'menunggu approval direktur' ||
                items.some(
                    (item) =>
                        normalizeStatus(item.status).includes('direktur') &&
                        (!item.director_status || item.director_status === 'pending')
                )
            );
        }

        if (capabilities.can_review_prices || capabilities.can_process_requests) {
            return (
                ['menunggu approval', 'disetujui', 'disetujui sebagian'].includes(status) ||
                items.some((item) => item.director_status === 'rejected')
            );
        }

        if (capabilities.can_create_requests) {
            return status === 'ditolak' || items.some((item) => item.director_status === 'rejected');
        }

        return false;
    };

    const rows = useMemo<JobRow[]>(() => {
        const groups = new Map<string, JobRow>();

        portCalls.forEach((portCall) => {
            groups.set(portCall.id, {
                key: portCall.id,
                jobNumber: portCall.job_number || portCall.work_order?.system_number || '-',
                shipName: portCall.ship?.name || 'Kapal belum ditentukan',
                shipImage: portCall.ship?.image,
                companyName: portCall.ship?.company?.name || '-',
                portName: portCall.port?.name || '-',
                requests: [],
                totalItems: 0,
                totalHpp: 0,
                totalSelling: 0,
                status: 'Belum Ada Pengajuan',
                updatedAt: portCall.updated_at || portCall.eta_at || portCall.created_at || '',
                isNew: capabilities.can_create_requests,
            });
        });

        requests.forEach((request) => {
            const key = request.port_call?.id || request.port_call?.job_number || request.id;
            const existing = groups.get(key);
            const items = request.items || [];
            const updatedAt = request.created_at || request.request_date;
            const requestHpp = items.reduce(
                (total, item) => total + Number(item.hpp_price || 0) * Number(item.quantity || 0),
                0
            );
            const requestSelling = items.reduce(
                (total, item) =>
                    total + Number(item.selling_price || 0) * Number(item.quantity || 0),
                0
            );

            if (!existing) {
                groups.set(key, {
                    key,
                    jobNumber:
                        request.port_call?.job_number ||
                        request.port_call?.work_order?.system_number ||
                        request.request_number,
                    shipName: request.ship?.name || 'Kapal belum ditentukan',
                    shipImage: request.ship?.image,
                    companyName: request.company?.name || request.ship?.company?.name || '-',
                    portName: request.port_call?.port?.name || request.port?.name || '-',
                    requests: [request],
                    totalItems: items.length,
                    totalHpp: requestHpp,
                    totalSelling: requestSelling,
                    status: request.status,
                    updatedAt,
                    isNew: requestNeedsAction(request),
                });
                return;
            }

            const hadRequests = existing.requests.length > 0;
            existing.requests.push(request);
            existing.totalItems += items.length;
            existing.totalHpp += requestHpp;
            existing.totalSelling += requestSelling;
            existing.isNew = hadRequests
                ? existing.isNew || requestNeedsAction(request)
                : requestNeedsAction(request);

            if (!hadRequests || statusPriority(request.status) > statusPriority(existing.status)) {
                existing.status = request.status;
            }
            if (new Date(updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
                existing.updatedAt = updatedAt;
            }
        });

        return Array.from(groups.values()).sort((a, b) => {
            if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [requests, portCalls, capabilities]);

    const columns = useMemo<Column<JobRow>[]>(
        () => [
            {
                key: 'job',
                header: 'Job / Kapal',
                width: '260px',
                render: (row) => (
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#0060F4]">
                                {row.jobNumber}
                            </span>
                            {row.isNew && (
                                <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                    Baru
                                </span>
                            )}
                        </div>
                        <p className="mt-1 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                            {row.shipName}
                        </p>
                    </div>
                ),
            },
            {
                key: 'location',
                header: 'Klien / Pelabuhan',
                width: '240px',
                render: (row) => (
                    <div className="space-y-1">
                        <p className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                            {row.companyName}
                        </p>
                        <p className="text-[#52658E] dark:text-[#94A3B8]">{row.portName}</p>
                    </div>
                ),
            },
            {
                key: 'requests',
                header: 'Pengajuan',
                width: '130px',
                render: (row) => (
                    <div className="whitespace-nowrap">
                        <strong>{row.requests.length}</strong> surat · <strong>{row.totalItems}</strong>{' '}
                        item
                    </div>
                ),
            },
            {
                key: 'status',
                header: 'Status',
                width: '180px',
                render: (row) => (
                    <StatusBadge status={row.status} label={row.status} size="sm" showDot />
                ),
            },
            {
                key: 'value',
                header: capabilities.can_view_hpp ? 'HPP / Jual' : 'Nilai Jual',
                align: 'right',
                width: '190px',
                render: (row) => (
                    <div className="whitespace-nowrap font-mono tabular-nums">
                        {capabilities.can_view_hpp && (
                            <p className="text-[#52658E]">{formatCurrency(row.totalHpp)}</p>
                        )}
                        <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                            {formatCurrency(row.totalSelling)}
                        </p>
                    </div>
                ),
            },
            {
                key: 'updated',
                header: 'Diperbarui',
                width: '150px',
                render: (row) => (
                    <span className="whitespace-nowrap text-[#52658E] dark:text-[#94A3B8]">
                        {formatDate(row.updatedAt)}
                    </span>
                ),
            },
            {
                key: 'action',
                header: 'Aksi',
                align: 'right',
                width: '110px',
                render: (row) => (
                    <Link
                        href={route('requests.detail', row.jobNumber)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-[#DCEAF8] bg-white px-3 font-bold text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322]"
                        aria-label={`Buka ${row.jobNumber}`}
                    >
                        Buka <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                ),
            },
        ],
        [capabilities.can_view_hpp]
    );

    const visit = (tab = activeTab, query = search): void => {
        router.get('/requests', { tab, search: query || undefined }, { preserveState: true });
    };

    return (
        <AppLayout
            title="Pengajuan"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Pengajuan - PT Samudra Jaya Andalas" />

            <div className="md:hidden">
                <div className="mobile-photo-copy relative flex min-h-[200px] w-full flex-col justify-end overflow-hidden bg-[#8FCDF4] px-4 pb-8 pt-20 text-white">
                    <img
                        src="/images/prima-banner.jpg"
                        alt="Pelabuhan dan kapal PT Samudra Jaya Andalas"
                        width={1280}
                        height={720}
                        fetchPriority="high"
                        className="absolute inset-0 size-full object-cover object-[center_35%]"
                    />
                    <div className="relative z-10">
                        <h1 className="text-balance text-[28px] font-extrabold leading-tight text-white">
                            Pengajuan
                        </h1>
                        <p className="mt-1 text-pretty text-xs font-medium text-white">
                            Kebutuhan operasional per kunjungan kapal.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 -mt-5 rounded-t-[28px] bg-sja-surface px-3.5 pb-10 pt-4 dark:bg-[#071322]">
                    <div className="flex items-center gap-2">
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                visit();
                            }}
                            className="relative min-w-0 flex-1"
                        >
                            <Search
                                aria-hidden="true"
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8C9BB9]"
                            />
                            <input
                                type="search"
                                name="search"
                                autoComplete="off"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari job, kapal, atau pengajuan…"
                                aria-label="Cari pengajuan"
                                className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-white pl-9 pr-10 text-xs text-[#0B1F63] shadow-2xs placeholder:text-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        visit(activeTab, '');
                                    }}
                                    className="absolute inset-y-0 right-0 flex w-11 touch-manipulation items-center justify-center rounded-r-xl text-[#52658E] hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#0060F4]"
                                    aria-label="Hapus pencarian"
                                >
                                    <X aria-hidden="true" className="size-4" />
                                </button>
                            )}
                        </form>

                        {capabilities.can_create_requests && (
                            <Link
                                href={route('requests.create')}
                                prefetch
                                aria-label="Buat pengajuan"
                                className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-[#0060F4] text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                            >
                                <FilePlus2 aria-hidden="true" className="size-5" />
                            </Link>
                        )}
                    </div>

                    <Tabs
                        className="py-1"
                        ariaLabel="Filter status pengajuan"
                        activeId={activeTab}
                        onChange={visit}
                        items={[
                            { id: 'semua', label: 'Semua', count: counts.semua || 0 },
                            { id: 'menunggu', label: 'Menunggu', count: counts.menunggu || 0 },
                            { id: 'diproses', label: 'Diproses', count: counts.diproses || 0 },
                            { id: 'selesai', label: 'Selesai', count: counts.selesai || 0 },
                        ]}
                    />

                    {rows.length > 0 ? (
                        <div className="space-y-2.5">
                            {rows.map((row) => (
                                <Link
                                    key={row.key}
                                    href={route('requests.detail', row.jobNumber)}
                                    prefetch
                                    aria-label={`Buka pengajuan ${row.jobNumber} untuk ${row.shipName}`}
                                    className={`group grid min-h-28 touch-manipulation grid-cols-[6rem_minmax(0,1fr)] items-stretch gap-x-3 gap-y-2 rounded-2xl border bg-white p-2.5 shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:bg-[#0C1D36] ${
                                        row.isNew
                                            ? 'border-[#0060F4] ring-1 ring-[#0060F4]/15 dark:border-[#38BDF8]'
                                            : 'border-[#E2EEF9] hover:border-[#0060F4]/40 dark:border-[#1E3A5F]'
                                    }`}
                                >
                                    <ShipImage
                                        src={row.shipImage}
                                        alt={`Foto ${row.shipName}`}
                                        width={112}
                                        height={112}
                                        loading="lazy"
                                        className="size-full min-h-28 rounded-xl border border-[#DCEAF8]/60 object-cover dark:border-[#1E3A5F]"
                                    />

                                    <div className="min-w-0 space-y-1.5 py-0.5">
                                        <div className="flex min-w-0 items-start justify-between gap-2">
                                            <h2 className="min-w-0 break-words text-pretty text-[13.5px] font-bold leading-5 text-[#082870] group-hover:text-[#0060F4] dark:text-[#F1F5F9]">
                                                {row.shipName}
                                            </h2>
                                            {row.isNew && (
                                                <span className="shrink-0 whitespace-nowrap rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold text-white">
                                                    Baru
                                                </span>
                                            )}
                                        </div>

                                        <StatusBadge
                                            status={row.status}
                                            label={row.status}
                                            size="sm"
                                            className="max-w-full shrink-0 whitespace-nowrap"
                                        />

                                        <div className="flex min-w-0 items-start gap-1 text-[11px] leading-4 text-[#52658E] dark:text-[#94A3B8]">
                                            <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-[#0060F4]" />
                                            <span className="min-w-0 break-words">{row.portName}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                            <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                                            <span className="tabular-nums">{formatDate(row.updatedAt)}</span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                            <span><strong className="text-[#082870] dark:text-white">{row.requests.length}</strong> surat</span>
                                            <span><strong className="text-[#0060F4]">{row.totalItems}</strong> item</span>
                                            {capabilities.can_view_hpp && (
                                                <span className="font-semibold tabular-nums text-[#082870] dark:text-white">
                                                    {formatCurrency(row.totalSelling)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-span-2 flex min-w-0 items-start gap-2 border-t border-[#E2EEF9] px-1 pt-2 dark:border-[#1E3A5F]">
                                        <span className="shrink-0 text-[10px] font-semibold text-[#8C9BB9] dark:text-[#64748B]">
                                            Job
                                        </span>
                                        <span className="min-w-0 flex-1 break-words font-mono text-[10px] font-bold leading-4 text-[#52658E] dark:text-[#94A3B8]" translate="no">
                                            {row.jobNumber}
                                        </span>
                                        <ArrowRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#0060F4]" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="border-y border-[#DCEAF8] py-10 text-center dark:border-[#1E3A5F]">
                            <FileText aria-hidden="true" className="mx-auto size-8 text-[#8C9BB9]" />
                            <p className="mt-3 text-sm font-bold text-[#082870] dark:text-white">Data Tidak Ditemukan</p>
                            <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">Ubah pencarian atau filter status.</p>
                        </div>
                    )}

                    <p className="mt-4 flex items-center justify-between gap-3 border-t border-[#DCEAF8] pt-3 text-xs text-[#52658E] dark:border-[#1E3A5F] dark:text-[#94A3B8]">
                        <span>{rows.length} kegiatan ditampilkan</span>
                        <span>Terbaru lebih dulu</span>
                    </p>
                </div>
            </div>

            <div className="mx-auto hidden max-w-7xl space-y-4 pb-10 md:block">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9]">
                            Pengajuan
                        </h1>
                        <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">
                            Antrean kebutuhan per kegiatan kapal.
                        </p>
                    </div>
                    {capabilities.can_create_requests && (
                        <Link
                            href={route('requests.create')}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                        >
                            <FilePlus2 aria-hidden="true" className="size-4" />
                            Buat Pengajuan
                        </Link>
                    )}
                </header>

                <section className="space-y-3" aria-label="Filter pengajuan">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            visit();
                        }}
                        className="relative"
                    >
                        <Search
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#0060F4]"
                        />
                        <input
                            type="search"
                            name="search"
                            autoComplete="off"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari job, kapal, klien, atau nomor pengajuan…"
                            aria-label="Cari pengajuan"
                            className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-white pl-10 pr-11 text-sm text-[#0B1F63] shadow-xs placeholder:text-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9]"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    visit(activeTab, '');
                                }}
                                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#52658E] hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#0060F4]"
                                aria-label="Hapus pencarian"
                            >
                                <X aria-hidden="true" className="size-4" />
                            </button>
                        )}
                    </form>

                    <Tabs
                        ariaLabel="Filter status pengajuan"
                        activeId={activeTab}
                        onChange={visit}
                        items={[
                            { id: 'semua', label: 'Semua', count: counts.semua || 0 },
                            { id: 'menunggu', label: 'Menunggu', count: counts.menunggu || 0 },
                            { id: 'diproses', label: 'Diproses', count: counts.diproses || 0 },
                            { id: 'selesai', label: 'Selesai', count: counts.selesai || 0 },
                        ]}
                    />
                </section>

                <Table
                    columns={columns}
                    data={rows}
                    keyExtractor={(row) => row.key}
                    compact
                    minWidth="1180px"
                    emptyIcon={<FileText aria-hidden="true" className="mx-auto size-7" />}
                    emptyMessage="Data Tidak Ditemukan"
                    rowClassName={(row) =>
                        row.isNew
                            ? '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A] border-l-4 border-l-[#0060F4]'
                            : ''
                    }
                />

                <p className="flex items-center gap-1.5 text-xs text-[#52658E] dark:text-[#94A3B8]">
                    <Ship aria-hidden="true" className="size-3.5" />
                    {rows.length} kegiatan ditampilkan. “Baru” menandai tugas yang perlu ditindaklanjuti
                    oleh role Anda.
                </p>
            </div>
        </AppLayout>
    );
}
