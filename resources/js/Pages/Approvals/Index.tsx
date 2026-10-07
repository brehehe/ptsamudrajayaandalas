import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Banknote, Check, FileCheck2, Search, X } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import StatusBadge from '../../Components/ui/StatusBadge';
import Table, { Column } from '../../Components/tables/Table';
import TableMobile from '../../Components/tables/TableMobile';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Tabs from '../../Components/ui/Tabs';

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
    company?: { name: string };
    port?: { name: string };
    ship?: { name: string; company?: { name: string } };
    port_call?: {
        id?: string;
        job_number?: string;
        port?: { name: string };
        ship?: { name: string; company?: { name: string } };
    };
    items?: RequestItem[];
}

interface OutgoingPayment {
    id: string;
    reference_number: string;
    payment_type: string;
    recipient: string;
    amount: number;
    currency: string;
    payment_date: string;
    verification_status: string;
    port_call?: { job_number: string; ship?: { name: string } };
    verifier?: { name: string };
}

interface ApprovalRow {
    key: string;
    jobNumber: string;
    shipName: string;
    companyName: string;
    portName: string;
    requests: ShipRequest[];
    itemCount: number;
    pendingCount: number;
    totalHpp: number;
    totalSelling: number;
    status: string;
    updatedAt: string;
    isNew: boolean;
}

interface ApprovalsIndexProps {
    requests: ShipRequest[];
    payments: OutgoingPayment[];
    counts: { semua?: number; menunggu: number; disetujui: number; ditolak: number };
    activeTab: string;
    search: string;
    capabilities?: {
        can_decide_items: boolean;
        can_view_hpp: boolean;
        is_director: boolean;
        can_process_requests: boolean;
    };
}

const DEFAULT_CAPABILITIES = {
    can_decide_items: false,
    can_view_hpp: false,
    is_director: false,
    can_process_requests: false,
};

const formatCurrency = (value: number, currency = 'IDR'): string =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency,
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
    }).format(date);
};

const normalized = (value?: string): string => (value || '').trim().toLowerCase();

export default function ApprovalsIndex({
    requests,
    payments,
    counts,
    activeTab,
    search: initialSearch,
    capabilities = DEFAULT_CAPABILITIES,
}: ApprovalsIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [section, setSection] = useState<'requests' | 'payments'>('requests');
    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    const requestNeedsAction = (request: ShipRequest): boolean => {
        const status = normalized(request.status);

        if (capabilities.can_decide_items) {
            return (
                status === 'menunggu approval direktur' ||
                (request.items || []).some(
                    (item) =>
                        normalized(item.status).includes('direktur') &&
                        (!item.director_status || item.director_status === 'pending')
                )
            );
        }

        return (
            capabilities.can_process_requests &&
            ['disetujui', 'disetujui sebagian'].includes(status)
        );
    };

    const approvalRows = useMemo<ApprovalRow[]>(() => {
        const groups = new Map<string, ApprovalRow>();

        requests.forEach((request) => {
            const key = request.port_call?.id || request.port_call?.job_number || request.id;
            const items = request.items || [];
            const hpp = items.reduce(
                (total, item) => total + Number(item.hpp_price || 0) * Number(item.quantity || 0),
                0
            );
            const selling = items.reduce(
                (total, item) =>
                    total + Number(item.selling_price || 0) * Number(item.quantity || 0),
                0
            );
            const pending = items.filter(
                (item) => !item.director_status || item.director_status === 'pending'
            ).length;
            const existing = groups.get(key);

            if (!existing) {
                groups.set(key, {
                    key,
                    jobNumber: request.port_call?.job_number || request.request_number,
                    shipName: request.ship?.name || request.port_call?.ship?.name || '-',
                    companyName:
                        request.company?.name ||
                        request.ship?.company?.name ||
                        request.port_call?.ship?.company?.name ||
                        '-',
                    portName: request.port_call?.port?.name || request.port?.name || '-',
                    requests: [request],
                    itemCount: items.length,
                    pendingCount: pending,
                    totalHpp: hpp,
                    totalSelling: selling,
                    status: request.status,
                    updatedAt: request.created_at || request.request_date,
                    isNew: requestNeedsAction(request),
                });
                return;
            }

            existing.requests.push(request);
            existing.itemCount += items.length;
            existing.pendingCount += pending;
            existing.totalHpp += hpp;
            existing.totalSelling += selling;
            existing.isNew = existing.isNew || requestNeedsAction(request);
            if (
                new Date(request.created_at).getTime() > new Date(existing.updatedAt).getTime()
            ) {
                existing.updatedAt = request.created_at;
                existing.status = request.status;
            }
        });

        return Array.from(groups.values()).sort((a, b) => {
            if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [requests, capabilities]);

    const paymentRows = useMemo(
        () =>
            [...payments].sort((a, b) => {
                const aNew = capabilities.can_decide_items && a.verification_status === 'pending';
                const bNew = capabilities.can_decide_items && b.verification_status === 'pending';
                if (aNew !== bNew) return aNew ? -1 : 1;
                return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime();
            }),
        [payments, capabilities.can_decide_items]
    );

    const approvalColumns = useMemo<Column<ApprovalRow>[]>(
        () => [
            {
                key: 'job',
                header: 'Job / Kapal',
                width: '260px',
                render: (row) => (
                    <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-[#0060F4]">{row.jobNumber}</span>
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
                key: 'company',
                header: 'Klien / Pelabuhan',
                width: '230px',
                render: (row) => (
                    <div className="space-y-1">
                        <p className="font-semibold">{row.companyName}</p>
                        <p className="text-[#52658E] dark:text-[#94A3B8]">{row.portName}</p>
                    </div>
                ),
            },
            {
                key: 'items',
                header: 'Rincian',
                width: '150px',
                render: (row) => (
                    <div className="whitespace-nowrap">
                        <strong>{row.requests.length}</strong> surat · <strong>{row.itemCount}</strong>{' '}
                        item
                        {row.pendingCount > 0 && (
                            <p className="mt-1 text-[11px] font-semibold text-[#A65300]">
                                {row.pendingCount} menunggu
                            </p>
                        )}
                    </div>
                ),
            },
            {
                key: 'value',
                header: capabilities.can_view_hpp ? 'HPP / Jual' : 'Nilai',
                align: 'right',
                width: '190px',
                render: (row) => (
                    <div className="whitespace-nowrap font-mono tabular-nums">
                        {capabilities.can_view_hpp && (
                            <p className="text-[#52658E]">{formatCurrency(row.totalHpp)}</p>
                        )}
                        <p className="font-bold">{formatCurrency(row.totalSelling)}</p>
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
                key: 'updated',
                header: 'Diperbarui',
                width: '130px',
                render: (row) => (
                    <span className="whitespace-nowrap text-[#52658E]">
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
                        href={route('approvals.detail', row.jobNumber)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-[#DCEAF8] bg-white px-3 font-bold text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322]"
                    >
                        Buka <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                ),
            },
        ],
        [capabilities.can_view_hpp]
    );

    const paymentColumns = useMemo<Column<OutgoingPayment>[]>(
        () => [
            {
                key: 'reference',
                header: 'Referensi / Tanggal',
                width: '210px',
                render: (payment) => {
                    const isNew =
                        capabilities.can_decide_items &&
                        payment.verification_status === 'pending';
                    return (
                        <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-bold text-[#0060F4]">
                                    {payment.reference_number}
                                </span>
                                {isNew && (
                                    <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                        Baru
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-[#52658E]">{formatDate(payment.payment_date)}</p>
                        </div>
                    );
                },
            },
            {
                key: 'recipient',
                header: 'Penerima / Job',
                width: '260px',
                render: (payment) => (
                    <div>
                        <p className="font-semibold">{payment.recipient}</p>
                        <p className="mt-1 text-[#52658E]">
                            {payment.port_call?.ship?.name || '-'} ·{' '}
                            {payment.port_call?.job_number || '-'}
                        </p>
                    </div>
                ),
            },
            {
                key: 'type',
                header: 'Jenis',
                width: '180px',
                render: (payment) => payment.payment_type,
            },
            {
                key: 'amount',
                header: 'Nominal',
                align: 'right',
                width: '170px',
                render: (payment) => (
                    <span className="whitespace-nowrap font-mono font-bold tabular-nums">
                        {formatCurrency(payment.amount, payment.currency || 'IDR')}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Status',
                width: '170px',
                render: (payment) => (
                    <StatusBadge
                        status={
                            payment.verification_status === 'verified'
                                ? 'Disetujui'
                                : payment.verification_status === 'rejected'
                                  ? 'Ditolak'
                                  : 'Menunggu Approval'
                        }
                        label={
                            payment.verification_status === 'verified'
                                ? 'Terverifikasi'
                                : payment.verification_status === 'rejected'
                                  ? 'Ditolak'
                                  : 'Menunggu'
                        }
                        size="sm"
                        showDot
                    />
                ),
            },
            {
                key: 'action',
                header: 'Aksi',
                align: 'right',
                width: '150px',
                render: (payment) =>
                    capabilities.can_decide_items && payment.verification_status === 'pending' ? (
                        <button
                            type="button"
                            disabled={verifyingId !== null}
                            onClick={() => {
                                setVerifyingId(payment.id);
                                router.post(
                                    `/approvals/payments/${payment.id}/verify`,
                                    {},
                                    {
                                        preserveScroll: true,
                                        onFinish: () => setVerifyingId(null),
                                    }
                                );
                            }}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-[#0060F4] px-3 font-bold text-white hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Check aria-hidden="true" className="size-3.5" />
                            {verifyingId === payment.id ? 'Memproses' : 'Verifikasi'}
                        </button>
                    ) : (
                        <span className="text-[#52658E]">
                            {payment.verifier?.name || '—'}
                        </span>
                    ),
            },
        ],
        [capabilities.can_decide_items, verifyingId]
    );

    const visit = (tab = activeTab, query = search): void => {
        router.get('/approvals', { tab, search: query || undefined }, { preserveState: true });
    };

    return (
        <AppLayout title="Persetujuan" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Persetujuan - PT Samudra Jaya Andalas" />

            <MobilePageHero title="Persetujuan" description="Tinjau pengajuan dan pembayaran yang memerlukan keputusan." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <header className="hidden md:block">
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9]">
                        Persetujuan
                    </h1>
                    <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">
                        Pengajuan dan pembayaran yang perlu ditinjau.
                    </p>
                </header>

                <Tabs
                    items={[
                        { id: 'requests', label: 'Pengajuan', count: approvalRows.length, icon: <FileCheck2 aria-hidden="true" className="size-4" /> },
                        { id: 'payments', label: 'Pembayaran', count: payments.length, icon: <Banknote aria-hidden="true" className="size-4" /> },
                    ]}
                    activeId={section}
                    onChange={(value) => setSection(value as 'requests' | 'payments')}
                    ariaLabel="Jenis persetujuan"
                    equalWidth
                    className="rounded-t-2xl border-x border-t border-[#DCEAF8] dark:border-[#1E3A5F]"
                />

                <section className="space-y-3" aria-label="Filter persetujuan">
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
                            placeholder="Cari job, kapal, pengajuan, atau pembayaran…"
                            aria-label="Cari persetujuan"
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
                        items={[
                            { id: 'menunggu', label: 'Menunggu', count: counts.menunggu },
                            { id: 'disetujui', label: 'Disetujui', count: counts.disetujui },
                            { id: 'ditolak', label: 'Ditolak', count: counts.ditolak },
                        ]}
                        activeId={activeTab}
                        onChange={(value) => visit(value)}
                        ariaLabel="Filter status persetujuan"
                        className="rounded-t-2xl border-x border-t border-[#DCEAF8] dark:border-[#1E3A5F]"
                    />
                </section>

                {section === 'requests' ? (
                    <>
                        <div className="hidden md:block">
                            <Table
                                columns={approvalColumns}
                                data={approvalRows}
                                keyExtractor={(row) => row.key}
                                compact
                                minWidth="1190px"
                                emptyIcon={<FileCheck2 aria-hidden="true" className="mx-auto size-7" />}
                                emptyMessage="Data Tidak Ditemukan"
                                rowClassName={(row) => row.isNew ? '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A] border-l-4 border-l-[#0060F4]' : ''}
                            />
                        </div>
                        <TableMobile
                            className="md:hidden"
                            data={approvalRows}
                            keyExtractor={(row) => row.key}
                            titleRender={(row) => row.shipName}
                            subtitleRender={(row) => row.jobNumber}
                            statusRender={(row) => (
                                <div className="flex flex-col items-end gap-1">
                                    {row.isNew && <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold text-white">Baru</span>}
                                    <StatusBadge status={row.status} label={row.status} size="sm" />
                                </div>
                            )}
                            fields={[
                                { label: 'Klien', render: (row) => row.companyName },
                                { label: 'Pelabuhan', render: (row) => row.portName },
                                { label: 'Rincian', render: (row) => `${row.requests.length} surat · ${row.itemCount} item` },
                                { label: 'Nilai jual', render: (row) => <span className="tabular-nums">{formatCurrency(row.totalSelling)}</span> },
                                { label: 'Diperbarui', fullWidth: true, render: (row) => formatDate(row.updatedAt) },
                            ]}
                            actionsRender={(row) => (
                                <Link href={route('approvals.detail', row.jobNumber)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]">
                                    Buka Persetujuan <ArrowRight aria-hidden="true" className="size-4" />
                                </Link>
                            )}
                            emptyIcon={<FileCheck2 aria-hidden="true" className="mx-auto size-7" />}
                            emptyMessage="Data Tidak Ditemukan"
                        />
                    </>
                ) : (
                    <>
                        <div className="hidden md:block">
                            <Table
                                columns={paymentColumns}
                                data={paymentRows}
                                keyExtractor={(payment) => payment.id}
                                compact
                                minWidth="1080px"
                                emptyIcon={<Banknote aria-hidden="true" className="mx-auto size-7" />}
                                emptyMessage="Data Tidak Ditemukan"
                                rowClassName={(payment) => capabilities.can_decide_items && payment.verification_status === 'pending' ? '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A] border-l-4 border-l-[#0060F4]' : ''}
                            />
                        </div>
                        <TableMobile
                            className="md:hidden"
                            data={paymentRows}
                            keyExtractor={(payment) => payment.id}
                            titleRender={(payment) => payment.recipient}
                            subtitleRender={(payment) => payment.reference_number}
                            statusRender={(payment) => <StatusBadge status={payment.verification_status === 'verified' ? 'success' : payment.verification_status === 'rejected' ? 'danger' : 'waiting'} label={payment.verification_status === 'verified' ? 'Terverifikasi' : payment.verification_status === 'rejected' ? 'Ditolak' : 'Menunggu'} size="sm" />}
                            fields={[
                                { label: 'Job', fullWidth: true, render: (payment) => payment.port_call?.job_number || '-' },
                                { label: 'Jenis', render: (payment) => payment.payment_type },
                                { label: 'Tanggal', render: (payment) => formatDate(payment.payment_date) },
                                { label: 'Nominal', fullWidth: true, render: (payment) => <span className="font-bold tabular-nums">{formatCurrency(payment.amount, payment.currency || 'IDR')}</span> },
                            ]}
                            actionsRender={(payment) => capabilities.can_decide_items && payment.verification_status === 'pending' ? (
                                <button type="button" disabled={verifyingId !== null} onClick={() => { setVerifyingId(payment.id); router.post(`/approvals/payments/${payment.id}/verify`, {}, { preserveScroll: true, onFinish: () => setVerifyingId(null) }); }} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white disabled:opacity-50">
                                    <Check aria-hidden="true" className="size-4" /> {verifyingId === payment.id ? 'Memproses' : 'Verifikasi'}
                                </button>
                            ) : undefined}
                            emptyIcon={<Banknote aria-hidden="true" className="mx-auto size-7" />}
                            emptyMessage="Data Tidak Ditemukan"
                        />
                    </>
                )}

                <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                    “Baru” hanya tampil pada status yang membutuhkan tindakan role Anda.
                </p>
            </div>
        </AppLayout>
    );
}
