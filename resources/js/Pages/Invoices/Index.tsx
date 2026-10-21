import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { CircleCheck, Download, Eye, FileText, HandCoins, Pencil, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Input from '../../Components/forms/Input';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Pagination, { type PaginationLinkItem } from '../../Components/pagination/Pagination';
import Modal from '../../Components/overlays/Modal';
import Select from '../../Components/selects/Select';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import Button from '../../Components/ui/Button';
import ActionMenu, { type ActionMenuGroup } from '../../Components/ui/ActionMenu';
import DocumentActions from '../../Components/ui/DocumentActions';
import ImportExportActions from '../../Components/ui/ImportExportActions';
import StatusBadge from '../../Components/ui/StatusBadge';
import Tabs from '../../Components/ui/Tabs';

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_type: 'agency' | 'reimburse';
    invoice_date?: string | null;
    due_date?: string | null;
    grand_total: number;
    paid_amount: number;
    outstanding_amount: number;
    status: string;
    delivery_status: string;
    signed_document_path?: string | null;
    delivery_proof_path?: string | null;
    supporting_document_path?: string | null;
    items_count?: number;
    total_hpp: number;
    margin: number;
    margin_percentage: number;
    company?: { id: string; name: string } | null;
    port_call?: {
        job_number: string;
        ship?: { name: string; imo_number: string } | null;
    } | null;
}

interface Props {
    invoices: {
        data: Invoice[];
        links: PaginationLinkItem[];
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
        per_page: number;
    };
    stats: {
        total_invoiced: number;
        total_hpp: number;
        total_margin: number;
        total_paid: number;
        total_outstanding: number;
        count: number;
        agency_count: number;
        reimburse_count: number;
    };
    filters: { type: string; status: string; search: string };
    abilities: { manage: boolean };
}

const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(value);

const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const invoiceStatus = (invoice: Invoice) => {
    if (invoice.status === 'paid') return { status: 'Selesai', label: 'Lunas' };
    if (invoice.status === 'sent') return { status: 'Dalam Proses', label: 'Terkirim' };
    if (invoice.status === 'released') return { status: 'Aktif', label: 'Dirilis' };

    return { status: 'Draft', label: 'Draft' };
};

export default function InvoicesIndex({ invoices, stats, filters, abilities }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [workflowInvoice, setWorkflowInvoice] = useState<Invoice | null>(null);
    const [workflowAction, setWorkflowAction] = useState<'release' | 'mark_sent'>('release');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modalStatus, setModalStatus] = useState(filters.status || 'all');
    const [modalType, setModalType] = useState(filters.type || 'all');

    const statusOptions: SelectSearchOption[] = [
        { value: 'all', label: 'Semua Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'released', label: 'Dirilis' },
        { value: 'sent', label: 'Terkirim ke Klien' },
        { value: 'paid', label: 'Lunas' },
    ];

    const typeOptions: SelectSearchOption[] = [
        { value: 'all', label: 'Semua Tipe Invoice' },
        { value: 'agency', label: 'Jasa Keagenan' },
        { value: 'reimburse', label: 'Reimbursement' },
    ];

    const activeFilterCount = [
        filters.status && filters.status !== 'all' ? filters.status : '',
        filters.type && filters.type !== 'all' ? filters.type : '',
    ].filter(Boolean).length;

    const hasActiveFilters = Boolean(
        search || (filters.status && filters.status !== 'all') || (filters.type && filters.type !== 'all')
    );

    const workflowForm = useForm({
        action: 'release',
        document_source: 'generated',
        document: null as File | null,
        delivery_proof: null as File | null,
    });

    const updateFilters = (overrides: Partial<Props['filters']>) => {
        router.get('/invoices', { ...filters, search, ...overrides }, { preserveState: true, replace: true });
    };

    const openWorkflow = (invoice: Invoice, action: 'release' | 'mark_sent') => {
        workflowForm.clearErrors();
        workflowForm.setData({
            action,
            document_source: 'generated',
            document: null,
            delivery_proof: null,
        });
        setWorkflowAction(action);
        setWorkflowInvoice(invoice);
    };

    const submitWorkflow = (event: React.FormEvent) => {
        event.preventDefault();
        if (!workflowInvoice) return;

        const endpoint = workflowAction === 'release' ? 'release' : 'mark-sent';
        workflowForm.post(`/invoices/${workflowInvoice.id}/${endpoint}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setWorkflowInvoice(null),
        });
    };

    const invoiceActions = (invoice: Invoice) => {
        const invoiceDocumentItems: ActionMenuGroup['items'] = [];
        const supportingDocumentItems: ActionMenuGroup['items'] = [];
        const managementItems: ActionMenuGroup['items'] = [];

        if (invoice.status === 'draft') {
            invoiceDocumentItems.push(
                {
                    id: 'preview-draft',
                    label: 'Pratinjau draft',
                    icon: <Eye aria-hidden="true" className="size-4" />,
                    href: `/invoices/${invoice.id}/generated-document?view=1`,
                    target: '_blank',
                    tone: 'primary',
                },
                {
                    id: 'download-draft',
                    label: 'Unduh draft',
                    icon: <Download aria-hidden="true" className="size-4" />,
                    href: `/invoices/${invoice.id}/generated-document`,
                    tone: 'default',
                },
            );
        }

        if (invoice.signed_document_path) {
            invoiceDocumentItems.push(
                {
                    id: 'view-signed',
                    label: 'Lihat invoice',
                    icon: <Eye aria-hidden="true" className="size-4" />,
                    href: `/invoices/${invoice.id}/documents/signed?view=1`,
                    target: '_blank',
                    tone: 'primary',
                },
                {
                    id: 'download-signed',
                    label: 'Unduh invoice',
                    icon: <Download aria-hidden="true" className="size-4" />,
                    href: `/invoices/${invoice.id}/documents/signed`,
                    tone: 'default',
                },
            );
        }

        if (invoice.delivery_proof_path) {
            supportingDocumentItems.push(
                {
                    id: 'view-delivery-proof',
                    label: 'Lihat bukti pengiriman',
                    icon: <Eye aria-hidden="true" className="size-4" />,
                    href: `/invoices/${invoice.id}/documents/delivery?view=1`,
                    target: '_blank',
                    tone: 'primary',
                },
                {
                    id: 'download-delivery-proof',
                    label: 'Unduh bukti pengiriman',
                    icon: <Download aria-hidden="true" className="size-4" />,
                    href: `/invoices/${invoice.id}/documents/delivery`,
                    tone: 'default',
                },
            );
        }

        if (invoice.supporting_document_path) {
            supportingDocumentItems.push(
                {
                    id: 'view-supporting',
                    label: 'Lihat dokumen pendukung',
                    icon: <FileText aria-hidden="true" className="size-4" />,
                    href: `/invoices/${invoice.id}/documents/supporting?view=1`,
                    target: '_blank',
                    tone: 'primary',
                },
                {
                    id: 'download-supporting',
                    label: 'Unduh dokumen pendukung',
                    icon: <Download aria-hidden="true" className="size-4" />,
                    href: `/invoices/${invoice.id}/documents/supporting`,
                    tone: 'default',
                },
            );
        }

        if (abilities.manage && invoice.status === 'draft') {
            managementItems.push(
                {
                    id: 'edit',
                    label: 'Edit invoice',
                    icon: <Pencil aria-hidden="true" className="size-4" />,
                    href: `/invoices/${invoice.id}/edit`,
                    inertia: true,
                    tone: 'warning',
                },
                {
                    id: 'release',
                    label: 'Rilis invoice',
                    icon: <CircleCheck aria-hidden="true" className="size-4" />,
                    onSelect: () => openWorkflow(invoice, 'release'),
                    tone: 'success',
                },
            );
        }

        if (invoice.status !== 'draft') {
            managementItems.push({
                id: 'detail',
                label: 'Lihat detail',
                icon: <Eye aria-hidden="true" className="size-4" />,
                href: `/invoices/${invoice.id}/edit`,
                inertia: true,
                tone: 'primary',
            });
        }

        if (invoice.status === 'released' || invoice.status === 'sent' || (invoice.outstanding_amount > 0 && invoice.status !== 'draft')) {
            managementItems.push({
                id: 'record-payment',
                label: 'Catat bayar',
                icon: <HandCoins aria-hidden="true" className="size-4" />,
                href: `/receivables?invoice_id=${invoice.id}&record_payment=1`,
                inertia: true,
                tone: 'success',
            });
        }

        return (
            <ActionMenu
                label={`Buka aksi invoice ${invoice.invoice_number}`}
                groups={[
                    { id: 'invoice-document', items: invoiceDocumentItems },
                    { id: 'supporting-document', items: supportingDocumentItems },
                    { id: 'management', items: managementItems },
                ]}
            />
        );
    };

    const columns: Column<Invoice>[] = [
        {
            key: 'invoice_number',
            header: 'No. Invoice',
            width: '150px',
            wrap: 'nowrap',
            render: (invoice) => <div className="min-w-0"><p className="whitespace-nowrap font-mono font-semibold text-[#0060F4]" translate="no">{invoice.invoice_number}</p><p className="mt-0.5 whitespace-nowrap text-[10px] text-[#52658E]">{formatDate(invoice.invoice_date)}</p></div>,
        },
        {
            key: 'invoice_type',
            header: 'Kategori',
            width: '140px',
            wrap: 'nowrap',
            render: (invoice) => <div className="space-y-1"><StatusBadge status={invoice.invoice_type === 'agency' ? 'Aktif' : 'Selesai'} label={invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimbursement'} /><p className="whitespace-nowrap text-[10px] text-[#52658E]">{invoice.items_count || 0} item</p></div>,
        },
        {
            key: 'company',
            header: 'Klien & Kapal',
            width: '240px',
            wrap: 'normal',
            render: (invoice) => <div className="min-w-0"><p className="whitespace-normal font-semibold [overflow-wrap:anywhere]">{invoice.company?.name || 'Klien'}</p><p className="mt-0.5 whitespace-normal text-[11px] text-[#52658E] [overflow-wrap:anywhere]">{invoice.port_call?.ship?.name || '—'}</p><p className="mt-0.5 whitespace-normal font-mono text-[10px] text-[#52658E] [overflow-wrap:anywhere]" translate="no">{invoice.port_call?.job_number || '—'}</p></div>,
        },
        { key: 'due_date', header: 'Jatuh Tempo', width: '110px', wrap: 'nowrap', render: (invoice) => formatDate(invoice.due_date) },
        {
            key: 'grand_total',
            header: 'Total',
            align: 'right',
            width: '190px',
            render: (invoice) => <div className="font-mono font-bold tabular-nums">{formatRupiah(invoice.grand_total)}<p className="text-[10px] font-normal text-[#52658E]">HPP: {formatRupiah(invoice.total_hpp)}</p><p className={`text-[10px] font-bold ${invoice.margin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#C62840]'}`}>Margin: {formatRupiah(invoice.margin)} ({invoice.margin_percentage.toLocaleString('id-ID')}%)</p>{invoice.outstanding_amount > 0 && invoice.paid_amount > 0 && <p className="text-[10px] font-normal text-[#C62840]">Sisa: {formatRupiah(invoice.outstanding_amount)}</p>}</div>,
        },
        {
            key: 'status',
            header: 'Status',
            width: '140px',
            wrap: 'nowrap',
            render: (invoice) => <div className="space-y-1"><StatusBadge {...invoiceStatus(invoice)} /><p className="whitespace-nowrap text-[10px] text-[#52658E]">{invoice.delivery_status === 'delivered' ? 'Tanda terima ada' : 'Menunggu kirim'}</p></div>,
        },
        { key: 'actions', header: 'Aksi', align: 'right', width: '72px', render: invoiceActions },
    ];

    return (
        <AppLayout title="Invoice & Tagihan Klien" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Invoice & Tagihan — PT Samudra Jaya Andalas" />
            <MobilePageHero title="Invoice & Tagihan" description="Pantau penerbitan, pengiriman, dan pelunasan invoice klien." />

            <div className="relative z-10 mx-auto -mt-6 max-w-[1600px] space-y-5 rounded-t-[28px] bg-white px-4 pb-10 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none md:dark:bg-transparent">
                <div className="hidden items-end justify-between gap-4 border-b border-[#DCEAF8] pb-4 md:flex dark:border-[#1E3A5F]">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9]">Invoice & Tagihan Klien</h1>
                        <p className="mt-1 max-w-3xl whitespace-normal text-sm text-[#52658E] [overflow-wrap:anywhere] dark:text-[#94A3B8]">Invoice Jasa Keagenan dan Reimbursement berdasarkan item pengajuan yang disetujui.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ImportExportActions
                            resource="invoices"
                            resourceTitle="Invoice & Tagihan Klien"
                            canManage={abilities.manage}
                        />
                        {abilities.manage && (
                            <Link href="/invoices/create" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35">
                                <Plus aria-hidden="true" className="size-4" /> Buat Invoice
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        ['Total Nilai Tagihan', formatRupiah(stats.total_invoiced), `${stats.agency_count} Agency · ${stats.reimburse_count} Reimbursement`, 'text-[#082870] dark:text-[#F1F5F9]'],
                        ['Total HPP', formatRupiah(stats.total_hpp), 'Biaya sumber seluruh invoice', 'text-[#082870] dark:text-[#F1F5F9]'],
                        ['Total Margin', formatRupiah(stats.total_margin), 'Nilai tagihan dikurangi HPP', stats.total_margin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#C62840]'],
                        ['Sudah Dibayar Klien', formatRupiah(stats.total_paid), 'Penerimaan kas terkonfirmasi', 'text-[#087443]'],
                        ['Sisa Piutang Berjalan', formatRupiah(stats.total_outstanding), 'Menunggu pelunasan klien', 'text-[#C62840]'],
                    ].map(([label, value, description, color]) => (
                        <div key={label} className="rounded-2xl border border-[#DCEAF8] bg-white p-4 shadow-xs dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                            <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">{label}</p>
                            <p className={`mt-1 whitespace-nowrap text-lg font-extrabold tabular-nums xl:text-xl ${color}`}>{value}</p>
                            <p className="mt-1 whitespace-normal text-[11px] text-[#52658E] [overflow-wrap:anywhere] dark:text-[#94A3B8]">{description}</p>
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
                        <Tabs
                            className="min-w-0 flex-1"
                            ariaLabel="Filter tipe invoice"
                            activeId={filters.type}
                            onChange={(type) => updateFilters({ type })}
                            items={[
                                { id: 'all', label: 'Semua Invoice', count: stats.count },
                                { id: 'agency', label: 'Jasa Keagenan', count: stats.agency_count },
                                { id: 'reimburse', label: 'Reimbursement', count: stats.reimburse_count },
                            ]}
                        />
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
                            <form onSubmit={(event) => { event.preventDefault(); updateFilters({}); }} className="flex min-w-0 gap-2 sm:min-w-[280px] sm:flex-1 lg:w-[320px] lg:flex-none">
                                <Input name="search" autoComplete="off" aria-label="Cari invoice" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari invoice, klien, atau kapal…" leftIcon={<Search aria-hidden="true" className="size-4" />} clearable onClear={() => { setSearch(''); router.get('/invoices', { ...filters, search: '' }, { preserveState: true, replace: true }); }} />
                                <Button type="submit" variant="secondary">Cari</Button>
                            </form>
                            <Button
                                type="button"
                                variant={activeFilterCount > 0 ? 'primary' : 'outline'}
                                onClick={() => {
                                    setModalStatus(filters.status || 'all');
                                    setModalType(filters.type || 'all');
                                    setIsFilterModalOpen(true);
                                }}
                                leftIcon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
                                className="h-11 shrink-0 px-3 text-xs font-bold"
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
                                    onClick={() => {
                                        setSearch('');
                                        router.get('/invoices', {}, { preserveState: true, replace: true });
                                    }}
                                    className="h-11 shrink-0 border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                >
                                    <RotateCcw aria-hidden="true" className="size-3.5 mr-1" />
                                    Reset
                                </Button>
                            )}
                            {abilities.manage && (
                                <Link href="/invoices/create" className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-[#0060F4] px-3.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 md:hidden">
                                    <Plus aria-hidden="true" className="size-4" /> Buat
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Active Filter Chips */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                            <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">Filter aktif:</span>
                            {search && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                    Cari: “{search}”
                                    <button
                                        type="button"
                                        aria-label="Hapus filter pencarian"
                                        onClick={() => { setSearch(''); router.get('/invoices', { ...filters, search: '' }, { preserveState: true, replace: true }); }}
                                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]"
                                    >
                                        <X aria-hidden="true" className="size-3" />
                                    </button>
                                </span>
                            )}
                            {filters.status && filters.status !== 'all' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                    Status: {statusOptions.find((s) => s.value === filters.status)?.label || filters.status}
                                    <button
                                        type="button"
                                        aria-label="Hapus filter status"
                                        onClick={() => updateFilters({ status: 'all' })}
                                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]"
                                    >
                                        <X aria-hidden="true" className="size-3" />
                                    </button>
                                </span>
                            )}
                            {filters.type && filters.type !== 'all' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                    Kategori: {typeOptions.find((t) => t.value === filters.type)?.label || filters.type}
                                    <button
                                        type="button"
                                        aria-label="Hapus filter kategori"
                                        onClick={() => updateFilters({ type: 'all' })}
                                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]"
                                    >
                                        <X aria-hidden="true" className="size-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <ResponsiveTable<Invoice>
                    data={invoices.data}
                    keyExtractor={(invoice) => invoice.id}
                    desktop={{ columns, compact: true, minWidth: '1042px', emptyMessage: 'Data Tidak Ditemukan' }}
                    mobile={{
                        titleRender: (invoice) => <span className="[overflow-wrap:anywhere]" translate="no">{invoice.invoice_number}</span>,
                        subtitleRender: (invoice) => <span className="[overflow-wrap:anywhere]">{invoice.company?.name || 'Klien'} · {invoice.port_call?.ship?.name || '—'}</span>,
                        statusRender: (invoice) => <StatusBadge {...invoiceStatus(invoice)} />,
                        fields: [
                            { label: 'Job', render: (invoice) => <span className="font-mono [overflow-wrap:anywhere]" translate="no">{invoice.port_call?.job_number || '—'}</span> },
                            { label: 'Kategori', render: (invoice) => invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimbursement' },
                            { label: 'Jatuh Tempo', render: (invoice) => formatDate(invoice.due_date) },
                            { label: 'Total', render: (invoice) => formatRupiah(invoice.grand_total) },
                            { label: 'HPP', render: (invoice) => formatRupiah(invoice.total_hpp) },
                            { label: 'Margin', render: (invoice) => <span className={invoice.margin >= 0 ? 'text-emerald-700' : 'text-[#C62840]'}>{formatRupiah(invoice.margin)} ({invoice.margin_percentage.toLocaleString('id-ID')}%)</span> },
                            { label: 'Sisa Piutang', fullWidth: true, render: (invoice) => formatRupiah(invoice.outstanding_amount) },
                        ],
                        actionsRender: invoiceActions,
                        emptyMessage: 'Data Tidak Ditemukan',
                    }}
                />
                <Pagination
                    links={invoices.links}
                    currentPage={invoices.current_page}
                    lastPage={invoices.last_page}
                    total={invoices.total}
                    from={invoices.from ?? undefined}
                    to={invoices.to ?? undefined}
                    perPage={invoices.per_page}
                />
            </div>

            <Modal
                isOpen={abilities.manage && Boolean(workflowInvoice)}
                onClose={() => { workflowForm.clearErrors(); setWorkflowInvoice(null); }}
                title={workflowAction === 'release' ? 'Rilis Invoice Klien' : 'Catat Pengiriman Invoice'}
                subtitle={workflowInvoice?.invoice_number}
                asBottomSheetOnMobile
                footer={(
                    <>
                        <Button type="button" variant="secondary" onClick={() => { workflowForm.clearErrors(); setWorkflowInvoice(null); }}>Batal</Button>
                        <Button type="submit" form="invoice-workflow-form" isLoading={workflowForm.processing}>{workflowAction === 'release' ? 'Rilis Invoice' : 'Catat Pengiriman'}</Button>
                    </>
                )}
            >
                <form id="invoice-workflow-form" noValidate onSubmit={submitWorkflow} className="space-y-4">
                    <FormErrorSummary errors={workflowForm.errors} />
                    {workflowAction === 'release' ? (
                        <>
                            <Select
                                required
                                label="Sumber dokumen invoice"
                                value={workflowForm.data.document_source}
                                onChange={(event) => {
                                    workflowForm.setData('document_source', event.target.value);
                                    if (event.target.value === 'generated') workflowForm.setData('document', null);
                                }}
                                options={[
                                    { value: 'generated', label: 'Gunakan PDF dari sistem' },
                                    { value: 'upload', label: 'Unggah dokumen final' },
                                ]}
                                error={workflowForm.errors.document_source}
                            />
                            {workflowForm.data.document_source === 'upload' ? (
                                <PhotoUploadPicker required label="Dokumen final" value={workflowForm.data.document} onChange={(file) => workflowForm.setData('document', file)} mode="gallery" accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={workflowForm.errors.document} helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB." />
                            ) : workflowInvoice ? (
                                <div className="rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <p className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">PDF invoice siap dibuat dari data sistem.</p>
                                    <DocumentActions className="mt-3" viewHref={`/invoices/${workflowInvoice.id}/generated-document?view=1`} downloadHref={`/invoices/${workflowInvoice.id}/generated-document`} viewLabel="Pratinjau PDF" downloadLabel="Unduh PDF" />
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <PhotoUploadPicker required label="Bukti pengiriman kepada klien" value={workflowForm.data.delivery_proof} onChange={(file) => workflowForm.setData('delivery_proof', file)} mode="gallery" accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={workflowForm.errors.delivery_proof} helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB." />
                    )}
                    <p className="rounded-xl bg-[#F0F8FF] p-3 text-xs text-[#52658E] dark:bg-[#071322] dark:text-[#94A3B8]">Status hanya mencatat kejadian yang sudah berlangsung. Sistem tidak mengirim invoice atau memindahkan dana secara otomatis.</p>
                </form>
            </Modal>

            {/* Filter Modal */}
            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter Invoice & Tagihan"
                size="md"
                asBottomSheetOnMobile
                footer={(
                    <div className="flex w-full items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setModalStatus('all');
                                setModalType('all');
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
                                    setIsFilterModalOpen(false);
                                    updateFilters({
                                        status: modalStatus,
                                        type: modalType,
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
                    <SelectSearch
                        label="Status Invoice"
                        value={modalStatus}
                        onChange={(val) => setModalStatus(String(val || 'all'))}
                        options={statusOptions}
                        placeholder="Pilih Status Invoice"
                    />
                    <SelectSearch
                        label="Kategori / Tipe Invoice"
                        value={modalType}
                        onChange={(val) => setModalType(String(val || 'all'))}
                        options={typeOptions}
                        placeholder="Pilih Kategori"
                    />
                </div>
            </Modal>
        </AppLayout>
    );
}
