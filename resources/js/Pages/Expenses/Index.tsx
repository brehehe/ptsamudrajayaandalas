import React, { useMemo, useRef, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Banknote,
    CheckCircle2,
    Clock3,
    FilePlus2,
    Plus,
    ReceiptText,
    RotateCcw,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import DocumentActions from '../../Components/ui/DocumentActions';
import StatusBadge from '../../Components/ui/StatusBadge';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Input from '../../Components/forms/Input';
import MoneyInput from '../../Components/forms/MoneyInput';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import Textarea from '../../Components/forms/Textarea';
import Modal from '../../Components/overlays/Modal';
import Pagination from '../../Components/pagination/Pagination';
import Select from '../../Components/selects/Select';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import { formatDate } from '../../lib/formatDate';

interface OutgoingPayment {
    id: string;
    reference_number: string;
    payment_type: string;
    recipient: string;
    amount: number;
    payment_date: string;
    verification_status: string;
    proof_path?: string | null;
    port_call?: {
        job_number?: string | null;
        ship?: { name: string };
        port?: { name: string };
    };
    allocations?: Array<{
        cost_document?: { document_number: string };
    }>;
}

interface PayableVendorInvoice {
    id: string;
    document_number: string;
    vendor_name: string;
    verified_total: number;
    paid_amount: number;
    outstanding_amount: number;
    payable_amount: number;
    due_date?: string | null;
    port_call: {
        job_number?: string | null;
        ship_name?: string | null;
        port_name?: string | null;
    };
}

interface CompanyExpenseRequest {
    id: string;
    request_number: string;
    category: string;
    status: 'waiting_director' | 'approved' | 'rejected' | 'realized';
    total: number | string;
    notes?: string | null;
    supporting_document_path?: string | null;
    payment_proof_path?: string | null;
    realized_amount?: number | string | null;
    realized_date?: string | null;
    payment_reference?: string | null;
    created_at: string;
    creator?: { name: string } | null;
    items: Array<{ description: string; amount: number | string }>;
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

interface ExpensesIndexProps {
    expenses: Paginated<OutgoingPayment>;
    payableVendorInvoices: PayableVendorInvoice[];
    companyExpenseRequests: Paginated<CompanyExpenseRequest>;
    companies?: Array<{ id: string; name: string }>;
    ships?: Array<{ id: string; name: string; ship_company_id?: string }>;
    jobs?: Array<{ id: string; job_number?: string; ship_id?: string }>;
    stats: {
        total: number;
        verified: number;
        pending: number;
        count: number;
    };
    filters: {
        type: string;
        status: string;
        search: string;
        company_id?: string;
        ship_id?: string;
        job?: string;
        start_date?: string;
        end_date?: string;
    };
    activeTab?: 'vendor_invoices' | 'company_expenses';
    abilities: {
        manage: boolean;
        create_company_expense: boolean;
        decide_company_expense: boolean;
        realize_company_expense: boolean;
    };
}

const money = (value: number | string | null | undefined) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(Number(value || 0));

const today = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${value.year}-${value.month}-${value.day}`;
};

const initialPaymentData = () => ({
    cost_document_id: '',
    amount: '',
    payment_date: today(),
    reference_number: '',
    notes: '',
    proof: null as File | null,
});

const paymentStatus = (status: string) => {
    if (status === 'verified') {
        return { status: 'success', label: 'Terbayar' };
    }

    if (status === 'waiting_admin_verification') {
        return { status: 'processing', label: 'Menunggu Verifikasi Admin' };
    }

    return { status: 'waiting', label: 'Menunggu Verifikasi Admin' };
};

const expenseStatusOptions: SelectSearchOption[] = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: 'Perlu Tindak Lanjut', badge: 'Pending' },
    { value: 'verified', label: 'Terbayar', badge: 'Lunas' },
];

export default function ExpensesIndex({
    expenses,
    payableVendorInvoices,
    companyExpenseRequests,
    companies = [],
    ships = [],
    jobs = [],
    stats,
    filters,
    abilities,
    activeTab: initialActiveTab = 'vendor_invoices',
}: ExpensesIndexProps) {
    const [currentTab, setCurrentTab] = useState<'vendor_invoices' | 'company_expenses'>(
        initialActiveTab === 'company_expenses' ? 'company_expenses' : 'vendor_invoices'
    );
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

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCompanyExpenseModalOpen, setIsCompanyExpenseModalOpen] = useState(false);
    const [decisionExpense, setDecisionExpense] = useState<CompanyExpenseRequest | null>(null);
    const [realizationExpense, setRealizationExpense] = useState<CompanyExpenseRequest | null>(null);
    const paymentForm = useForm(initialPaymentData());
    const companyExpenseForm = useForm({ category: '', description: '', amount: '', notes: '', supporting_document: null as File | null });
    const decisionForm = useForm({ decision: 'approve', notes: '' });
    const realizationForm = useForm({ realized_amount: '', realized_date: today(), payment_reference: '', payment_proof: null as File | null });
    const paymentErrorRef = useRef<HTMLDivElement>(null);
    const selectedInvoice = payableVendorInvoices.find((invoice) => invoice.id === paymentForm.data.cost_document_id);

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

    const activeFilterCount = [
        companyId,
        shipId,
        job,
        status && status !== 'all' ? status : '',
    ].filter(Boolean).length;

    const jobOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Job' },
        ...jobs.map((j) => ({
            value: j.job_number || j.id,
            label: j.job_number || j.id,
        })),
    ], [jobs]);

    const companyStats = useMemo(() => {
        const list = companyExpenseRequests.data || [];
        const totalAmount = list.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const waitingCount = list.filter((item) => item.status === 'waiting_director').length;
        const approvedCount = list.filter((item) => item.status === 'approved' || item.status === 'realized').length;
        return { totalAmount, waitingCount, approvedCount };
    }, [companyExpenseRequests.data]);

    const hasActiveFilters = Boolean(
        search ||
        (status && status !== 'all') ||
        companyId ||
        shipId ||
        job
    );

    const applyFilters = (overrides?: Record<string, string | undefined>) => {
        const params = {
            tab: currentTab,
            search: search || undefined,
            status: status !== 'all' ? status : undefined,
            type: filters.type || undefined,
            company_id: companyId || undefined,
            ship_id: shipId || undefined,
            job: job || undefined,
            ...overrides,
        };
        router.get('/expenses', params, {
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
        router.get('/expenses', { tab: currentTab }, { preserveState: true, preserveScroll: true });
    };

    const openPaymentModal = () => {
        paymentForm.clearErrors();
        paymentForm.reset();
        setIsCreateModalOpen(true);
    };

    const closePaymentModal = () => {
        if (paymentForm.processing) {
            return;
        }

        paymentForm.clearErrors();
        setIsCreateModalOpen(false);
    };

    const selectInvoice = (invoiceId: string) => {
        const invoice = payableVendorInvoices.find((candidate) => candidate.id === invoiceId);

        paymentForm.setData((current) => ({
            ...current,
            cost_document_id: invoiceId,
            amount: invoice ? String(invoice.payable_amount) : '',
        }));
    };

    const submitPayment = (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedInvoice) {
            paymentForm.setError('cost_document_id', 'Pilih nomor invoice yang akan dibayar.');
            window.requestAnimationFrame(() => paymentErrorRef.current?.focus());
            return;
        }

        paymentForm.post('/expenses', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateModalOpen(false);
                paymentForm.reset();
            },
            onError: () => {
                window.requestAnimationFrame(() => paymentErrorRef.current?.focus());
            },
        });
    };

    const submitCompanyExpense = (event: React.FormEvent) => {
        event.preventDefault();
        companyExpenseForm.post('/expenses/company-requests', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { setIsCompanyExpenseModalOpen(false); companyExpenseForm.reset(); },
        });
    };
    const submitDecision = (event: React.FormEvent) => {
        event.preventDefault();
        if (!decisionExpense) return;
        decisionForm.post(`/expenses/company-requests/${decisionExpense.id}/decision`, {
            preserveScroll: true,
            onSuccess: () => { setDecisionExpense(null); decisionForm.reset(); },
        });
    };
    const submitRealization = (event: React.FormEvent) => {
        event.preventDefault();
        if (!realizationExpense) return;
        realizationForm.post(`/expenses/company-requests/${realizationExpense.id}/realize`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { setRealizationExpense(null); realizationForm.reset(); },
        });
    };

    const invoiceNumber = (expense: OutgoingPayment) => expense.allocations?.[0]?.cost_document?.document_number || '—';
    const proofActions = (expense: OutgoingPayment) => expense.proof_path ? (
        <DocumentActions
            viewHref={`/funding/documents/payment/${expense.id}?view=1`}
            downloadHref={`/funding/documents/payment/${expense.id}`}
            viewLabel="Lihat bukti"
        />
    ) : '—';
    const columns: Column<OutgoingPayment>[] = [
        {
            key: 'invoice',
            header: 'Nomor Invoice',
            wrap: 'normal',
            render: (expense) => <span className="break-all font-mono font-bold text-[#0060F4]" translate="no">{invoiceNumber(expense)}</span>,
        },
        {
            key: 'reference_number',
            header: 'Referensi Transfer',
            wrap: 'normal',
            render: (expense) => <span className="break-all font-mono text-xs" translate="no">{expense.reference_number}</span>,
        },
        { key: 'recipient', header: 'Vendor / Penerima', wrap: 'normal' },
        {
            key: 'port_call',
            header: 'Job / Kapal',
            wrap: 'normal',
            render: (expense) => (
                <div>
                    <p className="font-semibold">{expense.port_call?.ship?.name || '—'}</p>
                    <p className="break-all font-mono text-[10px] text-[#52658E]" translate="no">{expense.port_call?.job_number || '—'}</p>
                </div>
            ),
        },
        { key: 'amount', header: 'Nominal', align: 'right', render: (expense) => <span className="font-bold tabular-nums">{money(expense.amount)}</span> },
        { key: 'payment_date', header: 'Tanggal', render: (expense) => formatDate(expense.payment_date) },
        {
            key: 'status',
            header: 'Status',
            wrap: 'normal',
            render: (expense) => {
                const badge = paymentStatus(expense.verification_status);

                return <StatusBadge status={badge.status} label={badge.label} showDot />;
            },
        },
        { key: 'proof', header: 'Bukti', align: 'right', render: proofActions },
    ];
    const companyExpenseStatus = (status: CompanyExpenseRequest['status']) => ({
        waiting_director: { status: 'waiting', label: 'Menunggu Direktur' },
        approved: { status: 'success', label: 'Disetujui' },
        rejected: { status: 'rejected', label: 'Ditolak' },
        realized: { status: 'success', label: 'Terbayar' },
    }[status]);
    const companyColumns: Column<CompanyExpenseRequest>[] = [
        { key: 'request', header: 'Nomor Pengajuan', wrap: 'normal', render: (expense) => <div><p className="font-mono font-bold text-[#0060F4]" translate="no">{expense.request_number}</p><p className="text-[11px] text-[#52658E]">{formatDate(expense.created_at)}</p></div> },
        { key: 'description', header: 'Kategori / Uraian', wrap: 'normal', render: (expense) => <div><p className="font-semibold">{expense.category}</p><p className="text-xs text-[#52658E]">{expense.items[0]?.description || '—'}</p></div> },
        { key: 'amount', header: 'Diajukan', align: 'right', render: (expense) => <span className="font-bold tabular-nums">{money(expense.total)}</span> },
        { key: 'status', header: 'Status', render: (expense) => { const badge = companyExpenseStatus(expense.status); return <StatusBadge status={badge.status} label={badge.label} showDot />; } },
        { key: 'document', header: 'Dokumen', render: (expense) => expense.supporting_document_path ? <DocumentActions viewHref={`/expenses/company-requests/${expense.id}/documents/supporting?view=1`} downloadHref={`/expenses/company-requests/${expense.id}/documents/supporting`} /> : '—' },
        { key: 'action', header: 'Aksi', align: 'right', render: (expense) => <div className="flex justify-end gap-2">{abilities.decide_company_expense && expense.status === 'waiting_director' && <Button type="button" size="sm" onClick={() => { setDecisionExpense(expense); decisionForm.reset(); }}>Putuskan</Button>}{abilities.realize_company_expense && expense.status === 'approved' && <Button type="button" size="sm" onClick={() => { setRealizationExpense(expense); realizationForm.setData('realized_amount', String(expense.total)); }}>Catat Bayar</Button>}{expense.status === 'realized' && expense.payment_proof_path && <DocumentActions viewHref={`/expenses/company-requests/${expense.id}/documents/payment?view=1`} downloadHref={`/expenses/company-requests/${expense.id}/documents/payment`} viewLabel="Bukti bayar" />}</div> },
    ];

    return (
        <AppLayout title="Pengeluaran & Pembayaran" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Pengeluaran & Pembayaran — PT Samudra Jaya Andalas" />

            <MobilePageHero title="Pengeluaran" description="Catat pembayaran invoice vendor dan pantau riwayat transaksi." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none md:dark:bg-transparent">
                <div className="border-b border-[#DCEAF8] pb-3 sm:pb-4 dark:border-[#1E3A5F]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="hidden sm:block">
                            <p className="text-xs font-bold uppercase text-[#0060F4]">Keuangan Operasional</p>
                            <h1 className="mt-1 text-balance text-2xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] md:text-3xl">Pengeluaran &amp; Pembayaran</h1>
                            <p className="mt-1 max-w-3xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">
                                Kelola pembayaran invoice vendor dan pengajuan biaya operasional perusahaan dalam satu modul terintegrasi.
                            </p>
                        </div>
                        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                            {currentTab === 'vendor_invoices' && abilities.manage && (
                                <Button className="w-full sm:w-auto" onClick={openPaymentModal} disabled={payableVendorInvoices.length === 0} leftIcon={<Plus aria-hidden="true" className="size-4" />}>
                                    Bayar Invoice Vendor
                                </Button>
                            )}
                            {currentTab === 'company_expenses' && abilities.create_company_expense && (
                                <Button className="w-full sm:w-auto" type="button" onClick={() => setIsCompanyExpenseModalOpen(true)} leftIcon={<FilePlus2 aria-hidden="true" className="size-4" />}>
                                    Buat Pengajuan
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 2 Main Tabs */}
                    <div className="mt-2.5 flex overflow-x-auto border-b border-[#DCEAF8] dark:border-[#1E3A5F] sm:mt-4">
                        <button
                            type="button"
                            onClick={() => setCurrentTab('vendor_invoices')}
                            className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
                                currentTab === 'vendor_invoices'
                                    ? 'border-[#0060F4] text-[#0060F4] dark:border-[#38BDF8] dark:text-[#38BDF8]'
                                    : 'border-transparent text-[#52658E] hover:border-[#DCEAF8] hover:text-[#0B1F63] dark:text-[#94A3B8] dark:hover:text-white'
                            }`}
                        >
                            <Banknote aria-hidden="true" className="size-4" />
                            <span>Pembayaran Invoice Vendor</span>
                            {payableVendorInvoices.length > 0 && (
                                <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[11px] font-bold text-white">
                                    {payableVendorInvoices.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentTab('company_expenses')}
                            className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
                                currentTab === 'company_expenses'
                                    ? 'border-[#0060F4] text-[#0060F4] dark:border-[#38BDF8] dark:text-[#38BDF8]'
                                    : 'border-transparent text-[#52658E] hover:border-[#DCEAF8] hover:text-[#0B1F63] dark:text-[#94A3B8] dark:hover:text-white'
                            }`}
                        >
                            <FilePlus2 aria-hidden="true" className="size-4" />
                            <span>Pengajuan Biaya Perusahaan</span>
                            {companyExpenseRequests.total > 0 && (
                                <span className="rounded-full bg-[#DCEAF8] px-2 py-0.5 text-[11px] font-bold text-[#0B1F63] dark:bg-[#1E3A5F] dark:text-[#94A3B8]">
                                    {companyExpenseRequests.total}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* TAB 1: Pembayaran Invoice Vendor */}
                {currentTab === 'vendor_invoices' && (
                    <div className="space-y-4">
                        {abilities.manage && payableVendorInvoices.length === 0 && (
                            <p className="text-pretty rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] px-3 py-2 text-xs text-[#52658E] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#94A3B8]">
                                Belum ada invoice siap dibayar. Invoice akan muncul di sini setelah dibuat dari pengajuan dan diverifikasi.
                            </p>
                        )}

                        <div className="grid gap-3 sm:grid-cols-3">
                            <Card padding="md">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-[#52658E]">Total pembayaran</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(stats.total)}</p>
                                        <p className="mt-1 text-[11px] text-[#52658E]">{stats.count} transaksi</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4]"><Banknote aria-hidden="true" className="size-5" /></span>
                                </div>
                            </Card>
                            <Card padding="md">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-[#52658E]">Terbayar</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{money(stats.verified)}</p>
                                        <p className="mt-1 text-[11px] text-[#52658E]">Sudah dicatat ke invoice</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 aria-hidden="true" className="size-5" /></span>
                                </div>
                            </Card>
                            <Card padding="md">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-[#52658E]">Perlu tindak lanjut</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-700 dark:text-amber-400">{money(stats.pending)}</p>
                                        <p className="mt-1 text-[11px] text-[#52658E]">Transaksi belum diselesaikan</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"><Clock3 aria-hidden="true" className="size-5" /></span>
                                </div>
                            </Card>
                        </div>

                        <Card padding="md">
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                    {/* Roomy Search Input */}
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
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
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Cari invoice, referensi, vendor…"
                                            aria-label="Cari pembayaran"
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

                                    {/* Tombol Filter Modal */}
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
                                                Status: {expenseStatusOptions.find((s) => s.value === status)?.label || status}
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

                        <ResponsiveTable<OutgoingPayment>
                            data={expenses.data}
                            keyExtractor={(expense) => expense.id}
                            desktop={{ columns, compact: true, minWidth: '1120px', emptyMessage: 'Data Tidak Ditemukan' }}
                            mobile={{
                                titleRender: (expense) => invoiceNumber(expense) === '—' ? expense.payment_type : invoiceNumber(expense),
                                subtitleRender: (expense) => <span className="break-all font-mono" translate="no">{expense.reference_number}</span>,
                                statusRender: (expense) => {
                                    const badge = paymentStatus(expense.verification_status);
                                    return <StatusBadge status={badge.status} label={badge.label} showDot />;
                                },
                                fields: [
                                    { label: 'Vendor', render: (expense) => expense.recipient },
                                    { label: 'Job', render: (expense) => <span className="break-all" translate="no">{expense.port_call?.job_number || '—'}</span> },
                                    { label: 'Kapal', render: (expense) => expense.port_call?.ship?.name || '—' },
                                    { label: 'Tanggal', render: (expense) => formatDate(expense.payment_date) },
                                    { label: 'Nominal', fullWidth: true, render: (expense) => <span className="font-bold tabular-nums">{money(expense.amount)}</span> },
                                ],
                                actionsRender: (expense) => expense.proof_path ? proofActions(expense) : undefined,
                                emptyMessage: 'Data Tidak Ditemukan',
                            }}
                        />
                        <Pagination links={expenses.links} currentPage={expenses.current_page} lastPage={expenses.last_page} total={expenses.total} from={expenses.from ?? undefined} to={expenses.to ?? undefined} />
                    </div>
                )}

                {/* TAB 2: Pengajuan Biaya Perusahaan */}
                {currentTab === 'company_expenses' && (
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Card padding="md">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-[#52658E]">Total Pengajuan</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(companyStats.totalAmount)}</p>
                                        <p className="mt-1 text-[11px] text-[#52658E]">{companyExpenseRequests.total} pengajuan</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4]"><Banknote aria-hidden="true" className="size-5" /></span>
                                </div>
                            </Card>
                            <Card padding="md">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-[#52658E]">Menunggu Direktur</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-700 dark:text-amber-400">{companyStats.waitingCount} pengajuan</p>
                                        <p className="mt-1 text-[11px] text-[#52658E]">Menunggu keputusan di menu Approval</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"><Clock3 aria-hidden="true" className="size-5" /></span>
                                </div>
                            </Card>
                            <Card padding="md">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-[#52658E]">Disetujui / Realisasi</p>
                                        <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{companyStats.approvedCount} pengajuan</p>
                                        <p className="mt-1 text-[11px] text-[#52658E]">Siap / telah dicatat bayar</p>
                                    </div>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 aria-hidden="true" className="size-5" /></span>
                                </div>
                            </Card>
                        </div>

                        <Card
                            title="Daftar Pengajuan Biaya Perusahaan"
                            titleLevel={2}
                            subtitle="Pengajuan biaya operasional kantor yang telah disetujui Direktur dapat dicatat realisasinya di sini."
                            padding="none"
                            actions={abilities.create_company_expense ? (
                                <Button type="button" size="sm" onClick={() => setIsCompanyExpenseModalOpen(true)} leftIcon={<FilePlus2 aria-hidden="true" className="size-4" />}>
                                    Buat Pengajuan
                                </Button>
                            ) : null}
                        >
                            <ResponsiveTable<CompanyExpenseRequest>
                                data={companyExpenseRequests.data}
                                keyExtractor={(expense) => expense.id}
                                desktop={{ columns: companyColumns, compact: true, minWidth: '940px', emptyMessage: 'Belum ada pengajuan biaya perusahaan.' }}
                                mobile={{
                                    titleRender: (expense) => expense.category,
                                    subtitleRender: (expense) => expense.request_number,
                                    statusRender: (expense) => {
                                        const badge = companyExpenseStatus(expense.status);
                                        return <StatusBadge status={badge.status} label={badge.label} />;
                                    },
                                    fields: [
                                        { label: 'Uraian', fullWidth: true, render: (expense) => expense.items[0]?.description || '—' },
                                        { label: 'Diajukan', render: (expense) => money(expense.total) },
                                        { label: 'Tanggal', render: (expense) => formatDate(expense.created_at) },
                                    ],
                                    actionsRender: (expense) => (
                                        <div className="flex w-full flex-wrap gap-2">
                                            {abilities.decide_company_expense && expense.status === 'waiting_director' && (
                                                <Button className="flex-1" type="button" size="sm" onClick={() => setDecisionExpense(expense)}>Putuskan</Button>
                                            )}
                                            {abilities.realize_company_expense && expense.status === 'approved' && (
                                                <Button className="flex-1" type="button" size="sm" onClick={() => { setRealizationExpense(expense); realizationForm.setData('realized_amount', String(expense.total)); }}>Catat Bayar</Button>
                                            )}
                                        </div>
                                    ),
                                    emptyMessage: 'Belum ada pengajuan biaya perusahaan.',
                                }}
                            />
                            {companyExpenseRequests.last_page > 1 && (
                                <div className="border-t border-[#DCEAF8] p-3 dark:border-[#1E3A5F]">
                                    <Pagination links={companyExpenseRequests.links} currentPage={companyExpenseRequests.current_page} lastPage={companyExpenseRequests.last_page} total={companyExpenseRequests.total} from={companyExpenseRequests.from ?? undefined} to={companyExpenseRequests.to ?? undefined} />
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </div>

            <Modal
                isOpen={abilities.manage && isCreateModalOpen}
                onClose={closePaymentModal}
                title="Catat Pembayaran Invoice Vendor"
                subtitle="Pilih nomor invoice. Vendor, kunjungan, dan nominal diambil langsung dari invoice yang terhubung ke pengajuan."
                size="lg"
                footer={(
                    <>
                        <Button type="button" variant="secondary" disabled={paymentForm.processing} onClick={closePaymentModal}>Batal</Button>
                        <Button type="submit" form="vendor-invoice-payment-form" isLoading={paymentForm.processing} disabled={!paymentForm.data.cost_document_id}>Simpan Pembayaran</Button>
                    </>
                )}
            >
                <form id="vendor-invoice-payment-form" noValidate onSubmit={submitPayment} className="space-y-4">
                    <FormErrorSummary ref={paymentErrorRef} errors={paymentForm.errors} />

                    <Select
                        required
                        name="cost_document_id"
                        autoComplete="off"
                        label="Nomor invoice vendor"
                        placeholder="Pilih invoice yang akan dibayar"
                        value={paymentForm.data.cost_document_id}
                        onChange={(event) => selectInvoice(event.target.value)}
                        error={paymentForm.errors.cost_document_id}
                        options={payableVendorInvoices.map((invoice) => ({ value: invoice.id, label: `${invoice.document_number} · ${invoice.vendor_name}` }))}
                    />

                    {selectedInvoice && (
                        <div className="rounded-2xl border border-[#DCEAF8] bg-[#F8FBFF] p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <div className="flex items-start gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#173B5C] dark:text-[#38BDF8]"><ReceiptText aria-hidden="true" className="size-5" /></span>
                                <div className="min-w-0 flex-1"><p className="break-words font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedInvoice.vendor_name}</p><p className="mt-0.5 break-all font-mono text-xs text-[#52658E]" translate="no">{selectedInvoice.port_call.job_number || 'Job belum tersedia'} · {selectedInvoice.port_call.ship_name || 'Kapal belum tersedia'}</p></div>
                            </div>
                            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div><dt className="text-[11px] text-[#52658E]">Nilai invoice</dt><dd className="mt-0.5 font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(selectedInvoice.verified_total)}</dd></div>
                                <div><dt className="text-[11px] text-[#52658E]">Sisa invoice</dt><dd className="mt-0.5 font-bold tabular-nums text-[#0060F4]">{money(selectedInvoice.outstanding_amount)}</dd></div>
                                <div><dt className="text-[11px] text-[#52658E]">Jatuh tempo</dt><dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(selectedInvoice.due_date)}</dd></div>
                            </dl>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <MoneyInput required name="amount" autoComplete="off" label="Nominal pembayaran" value={paymentForm.data.amount} onChange={(value) => paymentForm.setData('amount', value)} error={paymentForm.errors.amount} helperText="Nominal dapat lebih kecil untuk pembayaran sebagian." />
                        <Input required name="payment_date" autoComplete="off" label="Tanggal transfer" type="date" value={paymentForm.data.payment_date} onChange={(event) => paymentForm.setData('payment_date', event.target.value)} error={paymentForm.errors.payment_date} />
                    </div>

                    <Input required name="reference_number" autoComplete="off" spellCheck={false} label="Nomor referensi transfer" value={paymentForm.data.reference_number} onChange={(event) => paymentForm.setData('reference_number', event.target.value)} error={paymentForm.errors.reference_number} />

                    <PhotoUploadPicker label="Bukti pembayaran" required value={paymentForm.data.proof} onChange={(file) => paymentForm.setData('proof', file)} mode="gallery" accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={paymentForm.errors.proof} helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB." />

                    <Textarea name="notes" autoComplete="off" label="Catatan" value={paymentForm.data.notes} onChange={(event) => paymentForm.setData('notes', event.target.value)} error={paymentForm.errors.notes} maxLength={2000} showCharCount />
                </form>
            </Modal>

            <Modal isOpen={abilities.create_company_expense && isCompanyExpenseModalOpen} onClose={() => !companyExpenseForm.processing && setIsCompanyExpenseModalOpen(false)} title="Pengajuan Biaya Perusahaan" subtitle="Pengajuan nonkapal langsung dikirim ke Direktur." size="lg" footer={<><Button type="button" variant="secondary" onClick={() => setIsCompanyExpenseModalOpen(false)} disabled={companyExpenseForm.processing}>Batal</Button><Button type="submit" form="company-expense-form" isLoading={companyExpenseForm.processing}>Kirim Pengajuan</Button></>}>
                <form id="company-expense-form" noValidate onSubmit={submitCompanyExpense} className="space-y-4">
                    <FormErrorSummary errors={companyExpenseForm.errors} />
                    <Select required name="category" label="Kategori" value={companyExpenseForm.data.category} onChange={(event) => companyExpenseForm.setData('category', event.target.value)} error={companyExpenseForm.errors.category} placeholder="Pilih kategori" options={['Listrik', 'Air', 'Internet', 'Gaji', 'ATK', 'Materai', 'Kertas', 'Lainnya'].map((value) => ({ value, label: value }))} />
                    <Input required name="description" autoComplete="off" label="Uraian Pengeluaran" value={companyExpenseForm.data.description} onChange={(event) => companyExpenseForm.setData('description', event.target.value)} error={companyExpenseForm.errors.description} />
                    <MoneyInput required name="amount" autoComplete="off" label="Nominal Pengajuan" value={companyExpenseForm.data.amount} onChange={(value) => companyExpenseForm.setData('amount', value)} error={companyExpenseForm.errors.amount} />
                    <PhotoUploadPicker label="Dokumen Pendukung (opsional)" value={companyExpenseForm.data.supporting_document} onChange={(file) => companyExpenseForm.setData('supporting_document', file)} mode="gallery" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={companyExpenseForm.errors.supporting_document} />
                    <Textarea name="notes" autoComplete="off" label="Catatan (opsional)" value={companyExpenseForm.data.notes} onChange={(event) => companyExpenseForm.setData('notes', event.target.value)} error={companyExpenseForm.errors.notes} maxLength={1000} showCharCount />
                </form>
            </Modal>

            <Modal isOpen={Boolean(decisionExpense)} onClose={() => !decisionForm.processing && setDecisionExpense(null)} title="Keputusan Biaya Perusahaan" subtitle={decisionExpense?.request_number} footer={<><Button type="button" variant="secondary" onClick={() => setDecisionExpense(null)} disabled={decisionForm.processing}>Batal</Button><Button type="submit" form="company-expense-decision-form" isLoading={decisionForm.processing}>Simpan Keputusan</Button></>}>
                <form id="company-expense-decision-form" noValidate onSubmit={submitDecision} className="space-y-4">
                    <FormErrorSummary errors={decisionForm.errors} />
                    <Select required name="decision" label="Keputusan" value={decisionForm.data.decision} onChange={(event) => decisionForm.setData('decision', event.target.value)} options={[{ value: 'approve', label: 'Setujui' }, { value: 'reject', label: 'Tolak' }]} />
                    <Textarea required={decisionForm.data.decision === 'reject'} name="notes" autoComplete="off" label="Catatan keputusan" value={decisionForm.data.notes} onChange={(event) => decisionForm.setData('notes', event.target.value)} error={decisionForm.errors.notes} maxLength={1000} />
                </form>
            </Modal>

            <Modal isOpen={Boolean(realizationExpense)} onClose={() => !realizationForm.processing && setRealizationExpense(null)} title="Catat Pembayaran Biaya Perusahaan" subtitle={realizationExpense?.request_number} size="lg" footer={<><Button type="button" variant="secondary" onClick={() => setRealizationExpense(null)} disabled={realizationForm.processing}>Batal</Button><Button type="submit" form="company-expense-realization-form" isLoading={realizationForm.processing}>Simpan Pembayaran</Button></>}>
                <form id="company-expense-realization-form" noValidate onSubmit={submitRealization} className="space-y-4">
                    <FormErrorSummary errors={realizationForm.errors} />
                    <div className="grid gap-4 sm:grid-cols-2"><MoneyInput required name="realized_amount" autoComplete="off" label="Nominal Dibayar" value={realizationForm.data.realized_amount} onChange={(value) => realizationForm.setData('realized_amount', value)} error={realizationForm.errors.realized_amount} /><Input required name="realized_date" autoComplete="off" label="Tanggal Bayar" type="date" value={realizationForm.data.realized_date} onChange={(event) => realizationForm.setData('realized_date', event.target.value)} error={realizationForm.errors.realized_date} /></div>
                    <Input required name="payment_reference" autoComplete="off" label="Referensi Pembayaran" value={realizationForm.data.payment_reference} onChange={(event) => realizationForm.setData('payment_reference', event.target.value)} error={realizationForm.errors.payment_reference} />
                    <PhotoUploadPicker required label="Bukti Pembayaran" value={realizationForm.data.payment_proof} onChange={(file) => realizationForm.setData('payment_proof', file)} mode="gallery" accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={realizationForm.errors.payment_proof} />
                </form>
            </Modal>

            {/* Modal Filter Pengeluaran */}
            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter Pembayaran & Biaya"
                subtitle="Saring data pengeluaran berdasarkan perusahaan, kapal, job, atau status pembayaran"
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
                            label="Status Pembayaran"
                            value={modalStatus}
                            onChange={(val) => setModalStatus(String(val || 'all'))}
                            options={expenseStatusOptions}
                            placeholder="Pilih Status"
                        />
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
