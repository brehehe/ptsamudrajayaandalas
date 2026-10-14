import React, { useMemo, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Building2, Calendar, Check, Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import MoneyInput from '../../Components/forms/MoneyInput';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Tabs from '../../Components/ui/Tabs';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Input from '../../Components/forms/Input';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import Select from '../../Components/selects/Select';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import DateRangePicker, { type DateRange } from '../../Components/forms/DateRangePicker';

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_type: string;
    due_date: string;
    grand_total: number;
    paid_amount: number;
    outstanding_amount: number;
    days_until_due?: number | null;
    due_state?: 'unknown' | 'overdue' | 'due_soon' | 'current';
    company?: {
        id: string;
        name: string;
    };
    port_call?: {
        ship?: {
            name: string;
        };
    };
}

interface ClientReceipt {
    id: string;
    received_date: string;
    amount: number;
    destination_account: string;
    bank_reference: string;
    status: string;
    company?: {
        name: string;
    };
    recorder?: {
        name: string;
    };
    allocations?: Array<{ invoice?: { invoice_number: string } }>;
}

export interface CompanyReceivable {
    company_id: string | null;
    company_name: string;
    company_code: string;
    invoice_count: number;
    overdue_count: number;
    total_outstanding: number;
    overdue_amount: number;
    oldest_due_date?: string | null;
}

interface ReceivablesIndexProps {
    unpaidInvoices: Invoice[];
    receipts: ClientReceipt[];
    aging: {
        current: number;
        overdue_30: number;
        overdue_60: number;
        total: number;
    };
    companyReceivables?: CompanyReceivable[];
    companies: Array<{ id: string; name: string }>;
    search: string;
    filters?: {
        search: string;
        company_id: string;
        status: string;
        start_date: string;
        end_date: string;
    };
    abilities: { manage: boolean };
}

export default function ReceivablesIndex({
    unpaidInvoices,
    receipts,
    aging,
    companyReceivables = [],
    companies,
    search: initialSearch,
    filters,
    abilities,
}: ReceivablesIndexProps) {
    const [search, setSearch] = useState(filters?.search ?? initialSearch ?? '');
    const [selectedCompanyId, setSelectedCompanyId] = useState(filters?.company_id ?? '');
    const [selectedStatus, setSelectedStatus] = useState(filters?.status ?? 'all');
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: filters?.start_date ?? '',
        endDate: filters?.end_date ?? '',
    });

    // Modal state for filters
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modalCompanyId, setModalCompanyId] = useState(filters?.company_id ?? '');
    const [modalStatus, setModalStatus] = useState(filters?.status ?? 'all');
    const [modalDateRange, setModalDateRange] = useState<DateRange>({
        startDate: filters?.start_date ?? '',
        endDate: filters?.end_date ?? '',
    });

    const companyOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Perusahaan Klien' },
        ...companies.map((c) => ({ value: c.id, label: c.name })),
    ], [companies]);

    const statusOptions: SelectSearchOption[] = [
        { value: 'all', label: 'Semua Status Piutang' },
        { value: 'current', label: 'Lancar (< 30 Hari)' },
        { value: 'overdue_30', label: 'Jatuh Tempo 31 - 60 Hari' },
        { value: 'overdue_60', label: 'Menunggak (> 60 Hari)' },
    ];

    const activeFilterCount = [
        selectedCompanyId,
        selectedStatus && selectedStatus !== 'all' ? selectedStatus : '',
        dateRange.startDate || dateRange.endDate ? 'date' : '',
    ].filter(Boolean).length;

    const [activeTab, setActiveTab] = useState<'invoices' | 'receipts'>('invoices');
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
        company_id: companies[0]?.id || '',
        invoice_id: unpaidInvoices[0]?.id || '',
        received_date: new Date().toISOString().split('T')[0],
        amount: unpaidInvoices[0]?.outstanding_amount
            ? String(unpaidInvoices[0].outstanding_amount)
            : '',
        destination_account: '',
        bank_reference: '',
        proof: null as File | null,
    });

    const applyFilter = (overrides?: {
        search?: string;
        company_id?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
    }) => {
        const queryParams: Record<string, string> = {};
        const qSearch = overrides?.search !== undefined ? overrides.search : search;
        const qCompany = overrides?.company_id !== undefined ? overrides.company_id : selectedCompanyId;
        const qStatus = overrides?.status !== undefined ? overrides.status : selectedStatus;
        const qStart = overrides?.start_date !== undefined ? overrides.start_date : dateRange.startDate;
        const qEnd = overrides?.end_date !== undefined ? overrides.end_date : dateRange.endDate;

        if (qSearch) queryParams.search = qSearch;
        if (qCompany) queryParams.company_id = qCompany;
        if (qStatus && qStatus !== 'all') queryParams.status = qStatus;
        if (qStart) queryParams.start_date = qStart;
        if (qEnd) queryParams.end_date = qEnd;

        router.get('/receivables', queryParams, { preserveState: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter();
    };

    const handleSelectCompany = (companyId: string | null) => {
        const newCompanyId = selectedCompanyId === companyId ? '' : (companyId || '');
        setSelectedCompanyId(newCompanyId);
        applyFilter({ company_id: newCompanyId });
    };

    const handleSelectStatus = (statusKey: string) => {
        const newStatus = selectedStatus === statusKey ? 'all' : statusKey;
        setSelectedStatus(newStatus);
        applyFilter({ status: newStatus });
    };

    const handleDateRangeChange = (range: DateRange) => {
        setDateRange(range);
        applyFilter({ start_date: range.startDate, end_date: range.endDate });
    };

    const handleResetAllFilters = () => {
        setSearch('');
        setSelectedCompanyId('');
        setSelectedStatus('all');
        setDateRange({ startDate: '', endDate: '' });
        router.get('/receivables', {}, { preserveState: true, replace: true });
    };

    const hasActiveFilters = Boolean(
        search ||
        selectedCompanyId ||
        (selectedStatus && selectedStatus !== 'all') ||
        dateRange.startDate ||
        dateRange.endDate
    );

    const handleReceiptSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/receivables/receipts', {
            forceFormData: true,
            onSuccess: () => {
                setIsReceiptModalOpen(false);
                reset();
            },
        });
    };

    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val);
    };

    const formatDate = (value: string) => new Date(value).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
    });

    const openReceiptForInvoice = (invoice: Invoice) => {
        clearErrors();
        setData({
            ...data,
            company_id: invoice.company?.id || data.company_id,
            invoice_id: invoice.id,
            amount: String(invoice.outstanding_amount),
        });
        setIsReceiptModalOpen(true);
    };

    const invoiceColumns: Column<Invoice>[] = [
        { key: 'invoice_number', header: 'No. Invoice', wrap: 'normal', render: (invoice) => <span className="font-mono font-semibold text-[#0060F4]">{invoice.invoice_number}</span> },
        { key: 'invoice_type', header: 'Kategori', render: (invoice) => <StatusBadge status={invoice.invoice_type === 'agency' ? 'Aktif' : 'Selesai'} label={invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimbursement'} /> },
        { key: 'company', header: 'Perusahaan Klien', wrap: 'normal', render: (invoice) => invoice.company?.name || 'Klien' },
        { key: 'ship', header: 'Kapal', wrap: 'normal', render: (invoice) => invoice.port_call?.ship?.name || '—' },
        { key: 'due_date', header: 'Jatuh Tempo', wrap: 'normal', render: (invoice) => <div><p>{formatDate(invoice.due_date)}</p>{invoice.due_state === 'due_soon' && <p className="mt-1 text-[11px] font-bold text-amber-700">{invoice.days_until_due === 0 ? 'Hari ini' : `H-${invoice.days_until_due}`}</p>}{invoice.due_state === 'overdue' && <p className="mt-1 text-[11px] font-bold text-rose-600">Lewat {Math.abs(invoice.days_until_due || 0)} hari</p>}</div> },
        { key: 'grand_total', header: 'Total Tagihan', align: 'right', render: (invoice) => formatRupiah(invoice.grand_total) },
        { key: 'outstanding_amount', header: 'Sisa Piutang', align: 'right', render: (invoice) => <span className="font-bold text-rose-600">{formatRupiah(invoice.outstanding_amount)}</span> },
        { key: 'actions', header: 'Aksi', align: 'right', render: (invoice) => abilities.manage ? <Button size="sm" onClick={() => openReceiptForInvoice(invoice)}>Catat Bayar</Button> : '—' },
    ];

    const receiptColumns: Column<ClientReceipt>[] = [
        { key: 'bank_reference', header: 'Referensi Bank', wrap: 'normal', render: (receipt) => <div><p className="font-mono font-semibold text-[#0060F4]">{receipt.bank_reference}</p>{receipt.allocations?.[0]?.invoice && <p className="text-[10px] text-[#52658E]">{receipt.allocations[0].invoice.invoice_number}</p>}</div> },
        { key: 'company', header: 'Perusahaan Klien', wrap: 'normal', render: (receipt) => receipt.company?.name || 'Klien' },
        { key: 'destination_account', header: 'Rekening Tujuan', wrap: 'normal' },
        { key: 'amount', header: 'Nominal Diterima', align: 'right', render: (receipt) => <span className="font-bold text-emerald-700">{formatRupiah(receipt.amount)}</span> },
        { key: 'received_date', header: 'Tanggal Masuk', render: (receipt) => formatDate(receipt.received_date) },
        { key: 'status', header: 'Status', render: () => <StatusBadge status="Selesai" label="Terkonfirmasi" /> },
    ];

    return (
        <AppLayout title="Piutang & Pelunasan Pembayaran Klien" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Piutang Klien - PT Samudra Jaya Andalas" />

            <MobilePageHero title="Monitoring Piutang" description="Pantau invoice belum lunas dan pembayaran yang sudah diterima." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <div className="flex flex-col gap-3 border-b border-[#DCEAF8] pb-3 sm:flex-row sm:items-end sm:justify-between dark:border-[#1E3A5F]">
                    <Tabs
                        className="min-w-0 flex-1"
                        ariaLabel="Jenis data piutang"
                        activeId={activeTab}
                        onChange={(id) => setActiveTab(id as 'invoices' | 'receipts')}
                        items={[
                            { id: 'invoices', label: 'Belum Lunas', count: unpaidInvoices.length },
                            { id: 'receipts', label: 'Riwayat Pembayaran', count: receipts.length },
                        ]}
                    />
                    {abilities.manage && <Button onClick={() => { clearErrors(); setIsReceiptModalOpen(true); }}>+ Catat Pembayaran</Button>}
                </div>

                {/* ── Title Header ── */}
                <div className="hidden flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:flex">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Piutang Klien & Penerimaan Kas
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] mt-0.5">
                            Pengawasan umur piutang armada (aging), monitoring jatuh tempo, dan
                            pencatatan kas/bank
                        </p>
                    </div>
                </div>

                {/* Aging Breakdown Cards (Clickable for quick filter) */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <button
                        type="button"
                        onClick={() => handleSelectStatus('all')}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                            selectedStatus === 'all'
                                ? 'bg-[#EAF4FF] border-[#0060F4] ring-2 ring-[#0060F4]/30'
                                : 'bg-white border-[#DCEAF8] hover:border-[#BCE0FD]'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[#52658E] font-medium">Total Piutang Berjalan</span>
                            {selectedStatus === 'all' && <Check className="size-3.5 text-[#0060F4]" />}
                        </div>
                        <div className="text-xl font-bold text-[#082870] mt-1">
                            {formatRupiah(aging.total)}
                        </div>
                        <div className="text-[10px] text-[#52658E] mt-0.5">
                            Semua faktur belum lunas
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSelectStatus('current')}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                            selectedStatus === 'current'
                                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30'
                                : 'bg-white border-[#DCEAF8] hover:border-emerald-300'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-emerald-600 font-medium">Lancar (&lt; 30 Hari)</span>
                            {selectedStatus === 'current' && <Check className="size-3.5 text-emerald-600" />}
                        </div>
                        <div className="text-xl font-bold text-emerald-700 mt-1">
                            {formatRupiah(aging.current)}
                        </div>
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                            Dalam batas tempo wajar
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSelectStatus('overdue_30')}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                            selectedStatus === 'overdue_30'
                                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30'
                                : 'bg-white border-[#DCEAF8] hover:border-amber-300'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-amber-600 font-medium">Jatuh Tempo 31 - 60 Hari</span>
                            {selectedStatus === 'overdue_30' && <Check className="size-3.5 text-amber-600" />}
                        </div>
                        <div className="text-xl font-bold text-amber-700 mt-1">
                            {formatRupiah(aging.overdue_30)}
                        </div>
                        <div className="text-[10px] text-amber-600 mt-0.5">
                            Perlu follow-up penagihan
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSelectStatus('overdue_60')}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                            selectedStatus === 'overdue_60'
                                ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/30'
                                : 'bg-white border-[#DCEAF8] hover:border-rose-300'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-rose-600 font-medium">Menunggak (&gt; 60 Hari)</span>
                            {selectedStatus === 'overdue_60' && <Check className="size-3.5 text-rose-600" />}
                        </div>
                        <div className="text-xl font-bold text-rose-700 mt-1">
                            {formatRupiah(aging.overdue_60)}
                        </div>
                        <div className="text-[10px] text-rose-600 mt-0.5">
                            Peringatan penundaan jasa
                        </div>
                    </button>
                </div>

                {/* ── Total Piutang per Perusahaan (Desktop & Mobile) ── */}
                {companyReceivables.length > 0 && (
                    <div className="rounded-2xl border border-[#DCEAF8] bg-[#F8FBFF] p-3.5 sm:p-4.5 dark:border-[#1E3A5F] dark:bg-[#071322]/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                    <Building2 className="size-4" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                        Total Piutang per Perusahaan
                                    </h3>
                                    <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        Akumulasi piutang armada per klien. Klik kartu perusahaan untuk memfilter tagihan.
                                    </p>
                                </div>
                            </div>
                            {selectedCompanyId && (
                                <button
                                    type="button"
                                    onClick={() => handleSelectCompany(null)}
                                    className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-[#DCEAF8] bg-white px-2.5 py-1 text-xs font-bold text-[#0060F4] hover:bg-[#E0F0FF] dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                >
                                    <RotateCcw className="size-3" />
                                    Tampilkan Semua Perusahaan
                                </button>
                            )}
                        </div>

                        {/* Grid / Horizontal Carousel on Mobile */}
                        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
                            {companyReceivables.map((comp) => {
                                const isSelected = selectedCompanyId === comp.company_id;
                                return (
                                    <button
                                        key={comp.company_id || comp.company_name}
                                        type="button"
                                        onClick={() => handleSelectCompany(comp.company_id)}
                                        className={`min-w-[240px] sm:min-w-0 flex-1 text-left rounded-xl border p-3 transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-[#EAF4FF] border-[#0060F4] ring-2 ring-[#0060F4]/30 shadow-xs dark:bg-[#102B4A] dark:border-[#38BDF8]'
                                                : 'bg-white border-[#DCEAF8] hover:border-[#BCE0FD] hover:bg-[#F0F8FF]/50 dark:bg-[#0C1D36] dark:border-[#1E3A5F] dark:hover:bg-[#132847]'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-1.5">
                                            <div className="min-w-0">
                                                <h4 className="truncate text-xs font-extrabold text-[#0B1F63] dark:text-white" title={comp.company_name}>
                                                    {comp.company_name}
                                                </h4>
                                                {comp.company_code && comp.company_code !== '-' && (
                                                    <span className="font-mono text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                                        {comp.company_code}
                                                    </span>
                                                )}
                                            </div>
                                            {isSelected ? (
                                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0060F4] text-white">
                                                    <Check className="size-3" />
                                                </span>
                                            ) : (
                                                <span className="shrink-0 rounded-md bg-[#F0F8FF] px-1.5 py-0.5 text-[10px] font-bold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                                    {comp.invoice_count} inv
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2">
                                            <div className="text-base font-black tabular-nums text-[#082870] dark:text-white">
                                                {formatRupiah(comp.total_outstanding)}
                                            </div>
                                        </div>

                                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
                                            {comp.overdue_count > 0 ? (
                                                <span className="inline-flex rounded-full bg-rose-100/90 px-1.5 py-0.5 font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                                    Lewat tempo: {comp.overdue_count}
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-emerald-100/80 px-1.5 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                    Status lancar
                                                </span>
                                            )}
                                            {comp.oldest_due_date && (
                                                <span className="text-[#7C91AC]">
                                                    · Tempo: {comp.oldest_due_date}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Search & Filter Controls with Modal ── */}
                <div className="rounded-2xl border border-[#DCEAF8] bg-white p-3 shadow-xs dark:border-[#1E3A5F] dark:bg-[#0C1D36] space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        {/* Search Input (Roomy) */}
                        <form onSubmit={handleSearch} className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8C9BB9]">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari invoice, klien, kapal…"
                                className="w-full pl-9 pr-16 h-11 bg-[#F8FBFF] border border-[#DCEAF8] rounded-xl text-xs sm:text-sm font-semibold text-[#0B1F63] placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] dark:bg-[#071322] dark:border-[#1E3A5F] dark:text-white"
                            />
                            {search ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        applyFilter({ search: '' });
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9BB9] hover:text-[#C62840]"
                                    aria-label="Hapus pencarian"
                                >
                                    <X aria-hidden="true" className="size-3.5" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#0060F4] hover:bg-[#0052D4] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                    Cari
                                </button>
                            )}
                        </form>

                        {/* Action Buttons: Filter Modal Trigger & Reset */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant={activeFilterCount > 0 ? 'primary' : 'outline'}
                                onClick={() => {
                                    setModalCompanyId(selectedCompanyId);
                                    setModalStatus(selectedStatus);
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
                                    onClick={handleResetAllFilters}
                                    className="h-11 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                >
                                    <RotateCcw aria-hidden="true" className="size-3.5 mr-1" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Active Filter Badges */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#EAF1F8] dark:border-[#1E3A5F] text-xs">
                            <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">Filter aktif:</span>
                            {search && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                    Cari: "{search}"
                                    <button type="button" onClick={() => { setSearch(''); applyFilter({ search: '' }); }}><X className="size-3" /></button>
                                </span>
                            )}
                            {selectedCompanyId && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                    Klien: {companies.find((c) => c.id === selectedCompanyId)?.name || selectedCompanyId}
                                    <button type="button" onClick={() => handleSelectCompany(null)}><X className="size-3" /></button>
                                </span>
                            )}
                            {selectedStatus && selectedStatus !== 'all' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                    Status: {selectedStatus === 'current' ? 'Lancar (<30h)' : selectedStatus === 'overdue_30' ? 'Tempo 31-60h' : 'Menunggak (>60h)'}
                                    <button type="button" onClick={() => handleSelectStatus('all')}><X className="size-3" /></button>
                                </span>
                            )}
                            {(dateRange.startDate || dateRange.endDate) && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                    Jatuh Tempo: {dateRange.startDate || '—'} s/d {dateRange.endDate || '—'}
                                    <button type="button" onClick={() => handleDateRangeChange({ startDate: '', endDate: '' })}><X className="size-3" /></button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {activeTab === 'invoices' ? (
                    <ResponsiveTable<Invoice>
                        data={unpaidInvoices}
                        keyExtractor={(invoice) => invoice.id}
                        desktop={{ columns: invoiceColumns, compact: true, minWidth: '1040px' }}
                        mobile={{
                            titleRender: (invoice) => invoice.invoice_number,
                            subtitleRender: (invoice) => `${invoice.company?.name || 'Klien'} · ${invoice.port_call?.ship?.name || '—'}`,
                            statusRender: (invoice) => <StatusBadge status="Jatuh Tempo" label="Belum Lunas" />,
                            fields: [
                                { label: 'Kategori', render: (invoice) => invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimbursement' },
                                { label: 'Jatuh Tempo', render: (invoice) => formatDate(invoice.due_date) },
                                { label: 'Total', render: (invoice) => formatRupiah(invoice.grand_total) },
                                { label: 'Sisa Piutang', render: (invoice) => <span className="text-rose-600">{formatRupiah(invoice.outstanding_amount)}</span> },
                            ],
                            actionsRender: (invoice) => abilities.manage ? <Button size="sm" onClick={() => openReceiptForInvoice(invoice)}>Catat Bayar</Button> : undefined,
                        }}
                    />
                ) : (
                    <ResponsiveTable<ClientReceipt>
                        data={receipts}
                        keyExtractor={(receipt) => receipt.id}
                        desktop={{ columns: receiptColumns, compact: true, minWidth: '820px' }}
                        mobile={{
                            titleRender: (receipt) => receipt.bank_reference,
                            subtitleRender: (receipt) => receipt.company?.name || 'Klien',
                            statusRender: () => <StatusBadge status="Selesai" label="Terkonfirmasi" />,
                            fields: [
                                { label: 'Invoice', render: (receipt) => receipt.allocations?.[0]?.invoice?.invoice_number || '—' },
                                { label: 'Tanggal Masuk', render: (receipt) => formatDate(receipt.received_date) },
                                { label: 'Rekening Tujuan', render: (receipt) => receipt.destination_account },
                                { label: 'Nominal', render: (receipt) => <span className="text-emerald-700">{formatRupiah(receipt.amount)}</span> },
                            ],
                        }}
                    />
                )}
            </div>

            {/* Modal Catat Pembayaran Masuk */}
            <Modal
                isOpen={abilities.manage && isReceiptModalOpen}
                onClose={() => { clearErrors(); setIsReceiptModalOpen(false); }}
                title="Catat Penerimaan Pembayaran dari Klien"
            >
                <form noValidate onSubmit={handleReceiptSubmit} className="space-y-4 text-xs">
                    <FormErrorSummary errors={errors} />
                    <Select required name="company_id" label="Perusahaan Klien" value={data.company_id} onChange={(event) => setData('company_id', event.target.value)} error={errors.company_id} options={companies.map((company) => ({ value: company.id, label: company.name }))} />
                    <Select required name="invoice_id" label="Alokasikan ke Invoice" value={data.invoice_id} onChange={(event) => {
                        const selected = unpaidInvoices.find((invoice) => invoice.id === event.target.value);
                        setData({ ...data, invoice_id: event.target.value, company_id: selected?.company?.id || data.company_id, amount: selected ? String(selected.outstanding_amount) : data.amount });
                    }} placeholder="Pilih invoice" error={errors.invoice_id} options={unpaidInvoices.map((invoice) => ({ value: invoice.id, label: `${invoice.invoice_number} — Sisa ${formatRupiah(invoice.outstanding_amount)} (${invoice.company?.name || '-'})` }))} />

                    <div className="grid grid-cols-2 gap-3">
                        <MoneyInput required name="amount" label="Nominal Diterima" value={data.amount} onChange={(value) => setData('amount', value)} error={errors.amount} />
                        <Input required name="received_date" label="Tanggal Masuk Rekening" type="date" value={data.received_date} onChange={(event) => setData('received_date', event.target.value)} error={errors.received_date} />
                    </div>

                    <Input required name="bank_reference" autoComplete="off" spellCheck={false} label="No. Referensi Bank / Kliring" value={data.bank_reference} onChange={(event) => setData('bank_reference', event.target.value)} error={errors.bank_reference} />
                    <PhotoUploadPicker required label="Bukti Pembayaran" value={data.proof} onChange={(file) => setData('proof', file)} mode="gallery" accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={errors.proof} helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB." />
                    <Input required name="destination_account" autoComplete="off" label="Rekening Tujuan Penerima" value={data.destination_account} onChange={(event) => setData('destination_account', event.target.value)} error={errors.destination_account} />

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button type="button" variant="secondary" onClick={() => { clearErrors(); setIsReceiptModalOpen(false); }}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={processing}
                            className="bg-[#0060F4] text-white"
                        >
                            {processing ? 'Menyimpan…' : 'Simpan Penerimaan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Filter Modal */}
            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter Piutang Klien"
                size="lg"
                asBottomSheetOnMobile
                footer={(
                    <div className="flex w-full items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setModalCompanyId('');
                                setModalStatus('all');
                                setModalDateRange({ startDate: '', endDate: '' });
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
                                    setSelectedCompanyId(modalCompanyId);
                                    setSelectedStatus(modalStatus);
                                    setDateRange(modalDateRange);
                                    setIsFilterModalOpen(false);
                                    applyFilter({
                                        company_id: modalCompanyId || undefined,
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
                            label="Perusahaan Klien"
                            value={modalCompanyId}
                            onChange={(val) => setModalCompanyId(String(val || ''))}
                            options={companyOptions}
                            placeholder="Pilih Perusahaan Klien"
                        />
                        <SelectSearch
                            label="Status Piutang"
                            value={modalStatus}
                            onChange={(val) => setModalStatus(String(val || 'all'))}
                            options={statusOptions}
                            placeholder="Pilih Status Piutang"
                        />
                    </div>

                    <div className="pt-2 border-t border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60">
                        <p className="mb-2 text-xs font-bold text-[#0B1F63] dark:text-[#94A3B8]">
                            Rentang Jatuh Tempo:
                        </p>
                        <DateRangePicker
                            inline
                            value={modalDateRange}
                            onChange={setModalDateRange}
                            placeholder="Rentang Jatuh Tempo"
                        />
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
