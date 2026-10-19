import React, { useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Banknote,
    CheckCircle2,
    CircleCheckBig,
    Clock3,
    Download,
    Eye,
    FileCheck2,
    FileText,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import MoneyInput from '../../Components/forms/MoneyInput';
import Select from '../../Components/selects/Select';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import Pagination from '../../Components/pagination/Pagination';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import VendorInvoicePaymentModal, { type PayableVendorInvoice } from '../../Components/finance/VendorInvoicePaymentModal';
import ActionMenu, { type ActionMenuGroup } from '../../Components/ui/ActionMenu';
import DocumentActions from '../../Components/ui/DocumentActions';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Textarea from '../../Components/forms/Textarea';
import { formatDate } from '../../lib/formatDate';

interface VendorPayment {
    id: string;
    payment_date: string;
    amount: number;
    recipient: string;
    reference_number: string;
    proof_path?: string | null;
    verification_status: string;
}

interface PaymentAllocation {
    id: string;
    amount: number;
    payment?: VendorPayment | null;
}

interface Invoice {
    id: string;
    document_number: string;
    document_date: string;
    received_date: string;
    due_date?: string | null;
    verified_total: number;
    paid_amount: number;
    status: string;
    payment_status: string;
    document_path?: string | null;
    issuer_name?: string | null;
    vendor?: { name: string };
    port_call?: { job_number?: string; ship?: { name: string }; port?: { name: string } };
    payment_allocations?: PaymentAllocation[];
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
    invoices: Paginated<Invoice>;
    companies?: Array<{ id: string; name: string }>;
    ships?: Array<{ id: string; name: string; ship_company_id?: string }>;
    jobs?: Array<{ id: string; job_number?: string; ship_id?: string }>;
    stats?: {
        total_count: number;
        total_amount: number;
        received_count: number;
        verified_count: number;
        unpaid_count: number;
        unpaid_amount: number;
        paid_count: number;
        paid_amount: number;
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
    abilities: { create: boolean; verify: boolean; pay?: boolean };
}

const money = (value: number | string) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const labels: Record<string, string> = {
    received: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    rejected: 'Ditolak',
    unpaid: 'Belum Dibayar',
    partially_paid: 'Dibayar Sebagian',
    paid: 'Dibayar',
};

const statusOptions: SelectSearchOption[] = [
    { value: 'all', label: 'Semua Status' },
    { value: 'received', label: 'Menunggu Verifikasi', badge: 'Review' },
    { value: 'verified', label: 'Terverifikasi', badge: 'Valid' },
    { value: 'unpaid', label: 'Belum Dibayar', badge: 'Hutang' },
    { value: 'partially_paid', label: 'Dibayar Sebagian' },
    { value: 'paid', label: 'Dibayar Lunas', badge: 'Lunas' },
    { value: 'rejected', label: 'Ditolak' },
];

export default function VendorInvoiceIndex({
    invoices,
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

    // Modal filter state
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modalCompanyId, setModalCompanyId] = useState(filters.company_id || '');
    const [modalShipId, setModalShipId] = useState(filters.ship_id || '');
    const [modalJob, setModalJob] = useState(filters.job || '');
    const [modalStatus, setModalStatus] = useState(filters.status || 'all');

    const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null);
    const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
    const [paymentToVerify, setPaymentToVerify] = useState<{ invoice: Invoice; payment: VendorPayment } | null>(null);
    const reviewForm = useForm({ decision: 'verify', verified_total: '', notes: '' });
    const paymentVerificationForm = useForm({ action: 'verify_usage' });
    const reviewErrorRef = useRef<HTMLDivElement>(null);
    const paymentErrorRef = useRef<HTMLDivElement>(null);

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
        router.get('/vendor-invoices', params, {
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
        router.get('/vendor-invoices', {}, { preserveState: true, preserveScroll: true });
    };

    const openReview = (invoice: Invoice) => {
        reviewForm.setData({ decision: 'verify', verified_total: String(invoice.verified_total), notes: '' });
        setReviewInvoice(invoice);
    };

    const submitReview = (event: React.FormEvent) => {
        event.preventDefault();
        if (!reviewInvoice) return;
        reviewForm.post(`/vendor-invoices/${reviewInvoice.id}/verify`, {
            preserveScroll: true,
            onSuccess: () => setReviewInvoice(null),
            onError: () => {
                window.requestAnimationFrame(() => reviewErrorRef.current?.focus());
            },
        });
    };

    const submitPaymentVerification = (event: React.FormEvent) => {
        event.preventDefault();
        if (!paymentToVerify) return;

        paymentVerificationForm.post(`/funding/payments/${paymentToVerify.payment.id}/transition`, {
            preserveScroll: true,
            onSuccess: () => setPaymentToVerify(null),
            onError: () => {
                window.requestAnimationFrame(() => paymentErrorRef.current?.focus());
            },
        });
    };

    const openPaymentVerification = (invoice: Invoice, payment: VendorPayment) => {
        paymentVerificationForm.clearErrors();
        setPaymentToVerify({ invoice, payment });
    };

    const pendingPayments = (invoice: Invoice) =>
        (invoice.payment_allocations || [])
            .map((allocation) => allocation.payment)
            .filter((payment): payment is VendorPayment => payment?.verification_status === 'pending');

    const activeAllocatedAmount = (invoice: Invoice) =>
        (invoice.payment_allocations || []).reduce((total, allocation) => {
            if (!allocation.payment || !['pending', 'waiting_admin_verification', 'verified'].includes(allocation.payment.verification_status)) {
                return total;
            }

            return total + Number(allocation.amount || 0);
        }, 0);

    const outstandingAmount = (invoice: Invoice) => Math.max(
        0,
        Number(invoice.verified_total || 0) - activeAllocatedAmount(invoice),
    );

    const hasPendingPayment = (invoice: Invoice) =>
        (invoice.payment_allocations || []).some((allocation) =>
            allocation.payment && ['pending', 'waiting_admin_verification'].includes(allocation.payment.verification_status),
        );

    const canPayInvoice = (invoice: Invoice) => (abilities.pay ?? abilities.verify)
        && invoice.status === 'verified'
        && ['unpaid', 'partially_paid'].includes(invoice.payment_status)
        && outstandingAmount(invoice) > 0
        && !hasPendingPayment(invoice);

    const toPayableInvoice = (invoice: Invoice): PayableVendorInvoice => ({
        id: invoice.id,
        document_number: invoice.document_number,
        vendor_name: invoice.vendor?.name || invoice.issuer_name || 'Tanpa vendor/supplier',
        verified_total: Number(invoice.verified_total || 0),
        paid_amount: Number(invoice.paid_amount || 0),
        outstanding_amount: outstandingAmount(invoice),
        payable_amount: outstandingAmount(invoice),
        due_date: invoice.due_date,
        port_call: {
            job_number: invoice.port_call?.job_number,
            ship_name: invoice.port_call?.ship?.name,
            port_name: invoice.port_call?.port?.name,
        },
    });

    const invoiceActions = (invoice: Invoice) => {
        const workflowItems: ActionMenuGroup['items'] = [];
        const documentItems: ActionMenuGroup['items'] = [];
        const invoicePendingPayments = pendingPayments(invoice);

        if (abilities.verify && invoicePendingPayments.length > 0) {
            workflowItems.push({
                id: 'verify-payment',
                label: `Verifikasi Bayar${invoicePendingPayments.length > 1 ? ` (${invoicePendingPayments.length})` : ''}`,
                icon: <CircleCheckBig aria-hidden="true" className="size-4" />,
                onSelect: () => openPaymentVerification(invoice, invoicePendingPayments[0]),
                tone: 'success',
            });
        }

        if (canPayInvoice(invoice)) {
            workflowItems.push({
                id: 'pay-invoice',
                label: 'Bayar Invoice',
                icon: <Banknote aria-hidden="true" className="size-4" />,
                onSelect: () => setInvoiceToPay(invoice),
                tone: 'primary',
            });
        }

        if (abilities.verify && invoice.status === 'received') {
            workflowItems.push({
                id: 'review-invoice',
                label: 'Periksa Invoice',
                icon: <FileCheck2 aria-hidden="true" className="size-4" />,
                onSelect: () => openReview(invoice),
                tone: 'warning',
            });
        }

        if (invoice.document_path) {
            documentItems.push(
                {
                    id: 'view-document',
                    label: 'Lihat Invoice',
                    icon: <Eye aria-hidden="true" className="size-4" />,
                    href: `/vendor-invoices/${invoice.id}/document?view=1`,
                    target: '_blank',
                    tone: 'primary',
                },
                {
                    id: 'download-document',
                    label: 'Unduh Invoice',
                    icon: <Download aria-hidden="true" className="size-4" />,
                    href: `/vendor-invoices/${invoice.id}/document`,
                },
            );
        }

        return (
            <ActionMenu
                label={`Buka aksi invoice vendor ${invoice.document_number}`}
                groups={[
                    { id: 'workflow', items: workflowItems },
                    { id: 'documents', items: documentItems },
                ]}
            />
        );
    };

    const columns: Column<Invoice>[] = [
        {
            key: 'document_number',
            header: 'Invoice',
            wrap: 'normal',
            render: (invoice) => (
                <div>
                    <p className="font-mono font-bold text-[#0060F4]" translate="no">
                        {invoice.document_number}
                    </p>
                    <p className="text-[10px] text-[#52658E]">{formatDate(invoice.received_date)}</p>
                </div>
            ),
        },
        { key: 'vendor', header: 'Vendor', wrap: 'normal', render: (invoice) => invoice.vendor?.name || invoice.issuer_name || 'Tanpa vendor/supplier' },
        {
            key: 'port_call',
            header: 'Job / Kapal',
            wrap: 'normal',
            render: (invoice) => (
                <div>
                    <p className="break-all" translate="no">
                        {invoice.port_call?.job_number || '—'}
                    </p>
                    <p className="text-[10px] text-[#52658E]">{invoice.port_call?.ship?.name || '—'}</p>
                </div>
            ),
        },
        { key: 'verified_total', header: 'Terverifikasi', align: 'right', render: (invoice) => money(invoice.verified_total) },
        { key: 'paid_amount', header: 'Dibayar', align: 'right', render: (invoice) => money(invoice.paid_amount) },
        {
            key: 'status',
            header: 'Status',
            wrap: 'normal',
            render: (invoice) => (
                <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={invoice.status} label={labels[invoice.status] || invoice.status} showDot />
                    <StatusBadge
                        status={invoice.payment_status === 'paid' ? 'success' : 'waiting'}
                        label={labels[invoice.payment_status] || invoice.payment_status}
                    />
                    {pendingPayments(invoice).length > 0 && (
                        <StatusBadge status="processing" label="Menunggu Verifikasi Pembayaran" />
                    )}
                </div>
            ),
        },
        { key: 'actions', header: 'Aksi', align: 'right', render: invoiceActions },
    ];

    return (
        <AppLayout title="Invoice Vendor" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Invoice Vendor — PT Samudra Jaya Andalas" />
            <MobilePageHero title="Invoice Vendor" description="Buat invoice dari item pengajuan, verifikasi, dan pantau pembayarannya." />
            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-12 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none md:dark:bg-transparent">
                <div className="hidden flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:flex">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0060F4]">Keuangan Operasional</p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">
                            Invoice Vendor
                        </h1>
                        <p className="mt-1 max-w-2xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">
                            Buat invoice dari item yang disetujui, verifikasi dokumen, lalu catat pembayaran langsung dari halaman ini. Transaksi otomatis masuk ke Pengeluaran.
                        </p>
                    </div>
                    {abilities.create && (
                        <Link
                            href="/vendor-invoices/create"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35"
                        >
                            <Plus aria-hidden="true" className="size-4" />
                            Buat Invoice dari Pengajuan
                        </Link>
                    )}
                </div>

                {/* ── KPI Stat Cards ── */}
                {stats && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Card padding="md">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Total Invoice</p>
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
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Menunggu Verifikasi</p>
                                    <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                                        {stats.received_count}
                                    </p>
                                    <p className="mt-1 text-[11px] text-[#52658E]">Perlu pemeriksaan</p>
                                </div>
                                <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                    <Clock3 aria-hidden="true" className="size-5" />
                                </span>
                            </div>
                        </Card>
                        <Card padding="md">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Belum Lunas</p>
                                    <p className="mt-1 text-xl font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
                                        {stats.unpaid_count}
                                    </p>
                                    <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">{money(stats.unpaid_amount)}</p>
                                </div>
                                <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                                    <Banknote aria-hidden="true" className="size-5" />
                                </span>
                            </div>
                        </Card>
                        <Card padding="md">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Lunas Dibayar</p>
                                    <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        {stats.paid_count}
                                    </p>
                                    <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{money(stats.paid_amount)}</p>
                                </div>
                                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <CheckCircle2 aria-hidden="true" className="size-5" />
                                </span>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ── Filter Toolbar with Modal Trigger & Active Chips ── */}
                <Card padding="md">
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            {/* Roomy Search Input */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters();
                                }}
                                className="relative flex-1"
                            >
                                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8C9BB9]" />
                                <input
                                    type="search"
                                    name="search"
                                    autoComplete="off"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari nomor invoice, vendor, kapal, nomor job…"
                                    aria-label="Cari invoice vendor"
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

                            {/* Tombol Buka Modal Filter */}
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
                        href="/vendor-invoices/create"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 md:hidden"
                    >
                        <Plus aria-hidden="true" className="size-4" />
                        Buat Invoice dari Pengajuan
                    </Link>
                )}

                <ResponsiveTable<Invoice>
                    data={invoices.data}
                    keyExtractor={(invoice) => invoice.id}
                    desktop={{ columns, compact: true, minWidth: '1040px' }}
                    mobile={{
                        titleRender: (invoice) => invoice.document_number,
                        subtitleRender: (invoice) => `${invoice.vendor?.name || invoice.issuer_name || 'Tanpa vendor/supplier'} · ${invoice.port_call?.ship?.name || 'Kapal'}`,
                        statusRender: (invoice) => (
                            <div className="flex flex-col items-end gap-1">
                                <StatusBadge status={invoice.status} label={labels[invoice.status] || invoice.status} showDot />
                                <StatusBadge
                                    status={invoice.payment_status === 'paid' ? 'success' : 'waiting'}
                                    label={labels[invoice.payment_status] || invoice.payment_status}
                                />
                                {pendingPayments(invoice).length > 0 && (
                                    <StatusBadge status="processing" label="Menunggu Verifikasi Bayar" />
                                )}
                            </div>
                        ),
                        fields: [
                            { label: 'Job', render: (invoice) => invoice.port_call?.job_number || '—' },
                            { label: 'Tanggal diterima', render: (invoice) => formatDate(invoice.received_date) },
                            { label: 'Terverifikasi', render: (invoice) => money(invoice.verified_total) },
                            { label: 'Dibayar', render: (invoice) => money(invoice.paid_amount) },
                        ],
                        actionsRender: invoiceActions,
                    }}
                />
                <Pagination
                    links={invoices.links}
                    currentPage={invoices.current_page}
                    lastPage={invoices.last_page}
                    total={invoices.total}
                    from={invoices.from ?? undefined}
                    to={invoices.to ?? undefined}
                />
            </div>

            <Modal
                isOpen={Boolean(reviewInvoice)}
                onClose={() => {
                    if (!reviewForm.processing) {
                        reviewForm.clearErrors();
                        setReviewInvoice(null);
                    }
                }}
                title="Verifikasi Invoice Vendor"
                subtitle={reviewInvoice ? `${reviewInvoice.document_number} · ${reviewInvoice.vendor?.name || reviewInvoice.issuer_name || 'Tanpa vendor/supplier'}` : undefined}
                footer={(
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={reviewForm.processing}
                            onClick={() => {
                                reviewForm.clearErrors();
                                setReviewInvoice(null);
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="vendor-invoice-review-form"
                            variant={reviewForm.data.decision === 'reject' ? 'danger' : 'primary'}
                            isLoading={reviewForm.processing}
                        >
                            Simpan Keputusan
                        </Button>
                    </>
                )}
            >
                <form id="vendor-invoice-review-form" noValidate onSubmit={submitReview} className="space-y-4">
                    <FormErrorSummary ref={reviewErrorRef} errors={reviewForm.errors} />
                    <Select
                        name="decision"
                        autoComplete="off"
                        label="Keputusan"
                        value={reviewForm.data.decision}
                        onChange={(e) => reviewForm.setData('decision', e.target.value)}
                        error={reviewForm.errors.decision}
                        options={[
                            { value: 'verify', label: 'Valid — siap dibayar' },
                            { value: 'reject', label: 'Tolak invoice' },
                        ]}
                    />
                    {reviewForm.data.decision === 'verify' && (
                        <MoneyInput
                            required
                            name="verified_total"
                            autoComplete="off"
                            label="Nilai terverifikasi"
                            value={reviewForm.data.verified_total}
                            onChange={(value) => reviewForm.setData('verified_total', value)}
                            error={reviewForm.errors.verified_total}
                        />
                    )}
                    <Textarea
                        name="notes"
                        autoComplete="off"
                        label="Catatan / alasan"
                        required={reviewForm.data.decision === 'reject'}
                        value={reviewForm.data.notes}
                        onChange={(e) => reviewForm.setData('notes', e.target.value)}
                        error={reviewForm.errors.notes}
                        maxLength={2000}
                        showCharCount
                    />
                </form>
            </Modal>

            <VendorInvoicePaymentModal
                invoices={invoiceToPay ? [toPayableInvoice(invoiceToPay)] : []}
                isOpen={Boolean(invoiceToPay)}
                onClose={() => setInvoiceToPay(null)}
                initialInvoiceId={invoiceToPay?.id}
                allowInvoiceSelection={false}
            />

            <Modal
                isOpen={Boolean(paymentToVerify)}
                onClose={() => {
                    if (!paymentVerificationForm.processing) {
                        paymentVerificationForm.clearErrors();
                        setPaymentToVerify(null);
                    }
                }}
                title="Verifikasi Pembayaran Vendor"
                subtitle={paymentToVerify ? `${paymentToVerify.invoice.document_number} · ${paymentToVerify.invoice.vendor?.name || paymentToVerify.invoice.issuer_name || 'Tanpa vendor/supplier'}` : undefined}
                size="md"
                footer={(
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={paymentVerificationForm.processing}
                            onClick={() => {
                                paymentVerificationForm.clearErrors();
                                setPaymentToVerify(null);
                            }}
                        >
                            Batal
                        </Button>
                        <Button type="submit" form="vendor-payment-verification-form" isLoading={paymentVerificationForm.processing}>
                            Verifikasi & Perbarui Status
                        </Button>
                    </>
                )}
            >
                <form id="vendor-payment-verification-form" noValidate onSubmit={submitPaymentVerification} className="space-y-4">
                    <FormErrorSummary ref={paymentErrorRef} errors={paymentVerificationForm.errors} />
                    {paymentToVerify && (
                        <div className="rounded-2xl border border-[#B9E8D0] bg-[#F0FCF6] p-4 dark:border-emerald-900 dark:bg-emerald-950/25">
                            <div className="flex items-start gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#DCF7E8] text-[#087443] dark:bg-emerald-900/60 dark:text-emerald-300">
                                    <CircleCheckBig aria-hidden="true" className="size-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-[#52658E]">Nominal pembayaran</p>
                                    <p className="mt-1 text-lg font-extrabold tabular-nums text-[#087443] dark:text-emerald-300">
                                        {money(paymentToVerify.payment.amount)}
                                    </p>
                                    <dl className="mt-3 space-y-2 text-xs">
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="text-[#52658E]">Penerima</dt>
                                            <dd className="text-right font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {paymentToVerify.payment.recipient}
                                            </dd>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="text-[#52658E]">Referensi</dt>
                                            <dd className="break-all text-right font-semibold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">
                                                {paymentToVerify.payment.reference_number}
                                            </dd>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="text-[#52658E]">Tanggal</dt>
                                            <dd className="text-right font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {formatDate(paymentToVerify.payment.payment_date)}
                                            </dd>
                                        </div>
                                    </dl>
                                    {paymentToVerify.payment.proof_path && (
                                        <DocumentActions
                                            className="mt-3"
                                            viewHref={`/funding/documents/payment/${paymentToVerify.payment.id}?view=1`}
                                            downloadHref={`/funding/documents/payment/${paymentToVerify.payment.id}`}
                                            viewLabel="Lihat bukti pembayaran"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <p className="text-xs leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                        Setelah diverifikasi, nominal ini otomatis dihitung ke invoice. Status menjadi Dibayar bila lunas, atau Dibayar Sebagian bila masih ada sisa.
                    </p>
                </form>
            </Modal>

            {/* Modal Filter Invoice Vendor */}
            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter Invoice Vendor"
                subtitle="Saring data invoice berdasarkan kriteria perusahaan, kapal, job, atau status"
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
                            label="Status Invoice"
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
