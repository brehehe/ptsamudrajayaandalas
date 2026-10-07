import React, { useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import MoneyInput from '../../Components/forms/MoneyInput';
import Input from '../../Components/forms/Input';
import Textarea from '../../Components/forms/Textarea';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Tabs from '../../Components/ui/Tabs';
import Select from '../../Components/selects/Select';
import DocumentActions from '../../Components/ui/DocumentActions';
import Checkbox from '../../Components/forms/Checkbox';
import Table, { ResponsiveTable, type Column } from '../../Components/tables/Table';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_type: 'agency' | 'reimburse';
    invoice_date?: string | null;
    due_date?: string | null;
    subtotal: number;
    addon_total: number;
    tax: number;
    grand_total: number;
    paid_amount: number;
    outstanding_amount: number;
    status: string;
    delivery_status: string;
    signed_document_path?: string | null;
    document_source?: 'upload' | 'generated' | null;
    delivery_proof_path?: string | null;
    supporting_document_path?: string | null;
    items_count?: number;
    notes?: string;
    company?: {
        id: string;
        name: string;
    };
    port_call?: {
        job_number: string;
        ship?: {
            name: string;
            imo_number: string;
        };
    };
}

interface InvoiceRequestItem {
    id: string;
    item_name: string;
    vendor_name?: string | null;
    quantity: string;
    unit: string;
    selling_price: string;
    director_status: string;
    billing_type: 'agency' | 'reimburse';
    is_invoiced: boolean;
    used_invoice_number?: string | null;
    unavailable_reason?: string | null;
}

interface InvoiceRequest {
    id: string;
    request_number: string;
    port_call_id: string;
    company_id?: string | null;
    status: string;
    ship?: { name: string } | null;
    items: InvoiceRequestItem[];
}

interface InvoicePortCall {
    id: string;
    job_number: string;
    company_id?: string | null;
    company?: { id: string; name: string } | null;
    ship?: { name: string } | null;
    port?: { name: string } | null;
}

interface InvoicesIndexProps {
    invoices: Invoice[];
    companies: Array<{ id: string; name: string }>;
    portCalls: InvoicePortCall[];
    shipRequests: InvoiceRequest[];
    stats: {
        total_invoiced: number;
        total_paid: number;
        total_outstanding: number;
        count: number;
        agency_count: number;
        reimburse_count: number;
    };
    filters: {
        type: string;
        status: string;
        search: string;
    };
    abilities: { manage: boolean };
}

export default function InvoicesIndex({
    invoices,
    companies,
    portCalls,
    shipRequests,
    stats,
    filters,
    abilities,
}: InvoicesIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [workflowInvoice, setWorkflowInvoice] = useState<Invoice | null>(null);
    const [workflowAction, setWorkflowAction] = useState<'release' | 'mark_sent'>('release');

    const defaultPortCallId = portCalls[0]?.id || '';
    const defaultRequestId = shipRequests.find((shipRequest) => shipRequest.port_call_id === defaultPortCallId)?.id || '';
    const defaultCompanyId = portCalls[0]?.company_id || '';

    const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
        port_call_id: defaultPortCallId,
        company_id: defaultCompanyId,
        request_id: defaultRequestId,
        request_item_ids: [] as string[],
        invoice_type: 'agency',
        addon_total: '0',
        tax: '0',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        supporting_document: null as File | null,
    });
    const workflowForm = useForm({
        action: 'release',
        document_source: 'generated',
        document: null as File | null,
        delivery_proof: null as File | null,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/invoices',
            { search, type: filters.type, status: filters.status },
            { preserveState: true }
        );
    };

    const handleFilterType = (type: string) => {
        router.get('/invoices', { type, status: filters.status, search }, { preserveState: true });
    };

    const handleRelease = (invoice: Invoice) => {
        workflowForm.clearErrors();
        workflowForm.reset();
        workflowForm.setData({
            action: 'release',
            document_source: 'generated',
            document: null,
            delivery_proof: null,
        });
        setWorkflowAction('release');
        setWorkflowInvoice(invoice);
    };

    const handleMarkSent = (invoice: Invoice) => {
        workflowForm.clearErrors();
        workflowForm.reset();
        workflowForm.setData('action', 'mark_sent');
        setWorkflowAction('mark_sent');
        setWorkflowInvoice(invoice);
    };

    const submitWorkflow = (event: React.FormEvent) => {
        event.preventDefault();
        if (!workflowInvoice) return;
        const endpoint = workflowAction === 'release' ? 'release' : 'mark-sent';
        workflowForm.post(`/invoices/${workflowInvoice.id}/${endpoint}`, {
            forceFormData: true, preserveScroll: true, onSuccess: () => setWorkflowInvoice(null),
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/invoices', {
            forceFormData: true,
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const requestsForPortCall = useMemo(
        () => shipRequests.filter((shipRequest) => shipRequest.port_call_id === data.port_call_id),
        [data.port_call_id, shipRequests]
    );
    const selectedPortCall = useMemo(
        () => portCalls.find((portCall) => portCall.id === data.port_call_id),
        [data.port_call_id, portCalls]
    );
    const selectedRequest = useMemo(
        () => shipRequests.find((shipRequest) => shipRequest.id === data.request_id),
        [data.request_id, shipRequests]
    );
    const requestItems = selectedRequest?.items || [];
    const itemUnavailableReason = (item: InvoiceRequestItem): string | null => {
        if (item.unavailable_reason) return item.unavailable_reason;
        if (item.billing_type !== data.invoice_type) {
            return item.billing_type === 'agency'
                ? 'Khusus invoice Jasa Keagenan'
                : 'Khusus invoice Reimburse';
        }

        return null;
    };
    const availableItems = requestItems.filter((item) => !itemUnavailableReason(item));
    const selectedItems = requestItems.filter((item) => data.request_item_ids.includes(item.id));
    const selectedSubtotal = selectedItems.reduce(
        (total, item) => total + Number(item.selling_price) * Number(item.quantity),
        0
    );
    const invoiceGrandTotal = selectedSubtotal + Number(data.addon_total || 0) + Number(data.tax || 0);
    const createInvoiceBlockReason = (() => {
        if (portCalls.length === 0) {
            return 'Belum ada kunjungan yang siap ditagihkan. Selesaikan approval, Nota Rampung, dan rekonsiliasi biaya terlebih dahulu.';
        }

        if (!data.port_call_id) {
            return 'Pilih kunjungan kapal yang sudah direkonsiliasi.';
        }

        if (requestsForPortCall.length === 0) {
            return 'Kunjungan ini belum memiliki pengajuan yang dapat ditagihkan.';
        }

        if (!data.request_id) {
            return 'Pilih referensi pengajuan yang akan ditagihkan.';
        }

        if (requestItems.length === 0) {
            return 'Pengajuan ini belum memiliki item kebutuhan.';
        }

        if (availableItems.length === 0) {
            return data.invoice_type === 'agency'
                ? 'Tidak ada item jasa keagenan yang disetujui dan belum pernah ditagihkan.'
                : 'Tidak ada item reimburse yang disetujui dan belum pernah ditagihkan.';
        }

        if (data.request_item_ids.length === 0) {
            return 'Pilih minimal satu item kebutuhan untuk invoice ini.';
        }

        return null;
    })();

    const handlePortCallChange = (portCallId: string) => {
        const portCall = portCalls.find((item) => item.id === portCallId);
        const firstRequest = shipRequests.find((item) => item.port_call_id === portCallId);

        setData((current) => ({
            ...current,
            port_call_id: portCallId,
            company_id: portCall?.company_id || '',
            request_id: firstRequest?.id || '',
            request_item_ids: [],
        }));
    };

    const handleRequestChange = (requestId: string) => {
        setData((current) => ({ ...current, request_id: requestId, request_item_ids: [] }));
    };

    const toggleRequestItem = (itemId: string, selected: boolean) => {
        setData(
            'request_item_ids',
            selected
                ? [...data.request_item_ids, itemId]
                : data.request_item_ids.filter((id) => id !== itemId)
        );
    };

    const selectAllAvailableItems = (selected: boolean) => {
        setData('request_item_ids', selected ? availableItems.map((item) => item.id) : []);
    };

    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val);
    };

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

    const invoiceActions = (invoice: Invoice) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
            {invoice.status === 'draft' && (
                <DocumentActions
                    viewHref={`/invoices/${invoice.id}/generated-document?view=1`}
                    downloadHref={`/invoices/${invoice.id}/generated-document`}
                    viewLabel="Pratinjau"
                    downloadLabel="Unduh draft"
                />
            )}
            {invoice.signed_document_path && (
                <DocumentActions
                    viewHref={`/invoices/${invoice.id}/documents/signed?view=1`}
                    downloadHref={`/invoices/${invoice.id}/documents/signed`}
                    viewLabel="Lihat invoice"
                    downloadLabel="Unduh invoice"
                />
            )}
            {invoice.delivery_proof_path && (
                <DocumentActions
                    viewHref={`/invoices/${invoice.id}/documents/delivery?view=1`}
                    downloadHref={`/invoices/${invoice.id}/documents/delivery`}
                    viewLabel="Lihat bukti"
                    downloadLabel="Unduh bukti"
                />
            )}
            {invoice.supporting_document_path && (
                <DocumentActions
                    viewHref={`/invoices/${invoice.id}/documents/supporting?view=1`}
                    downloadHref={`/invoices/${invoice.id}/documents/supporting`}
                    viewLabel="Lihat pendukung"
                    downloadLabel="Unduh pendukung"
                />
            )}
            {abilities.manage && invoice.status === 'draft' && <Button size="sm" onClick={() => handleRelease(invoice)}>Rilis</Button>}
            {abilities.manage && invoice.status === 'released' && <Button size="sm" variant="secondary" onClick={() => handleMarkSent(invoice)}>Kirim Klien</Button>}
            {invoice.status === 'sent' && <span className="text-[11px] font-medium text-[#52658E]">Tertagih</span>}
        </div>
    );

    const columns: Column<Invoice>[] = [
        { key: 'invoice_number', header: 'No. Invoice', wrap: 'normal', render: (invoice) => <div><p className="font-mono font-semibold text-[#0060F4]">{invoice.invoice_number}</p><p className="text-[10px] text-[#52658E]">{formatDate(invoice.invoice_date)}</p></div> },
        { key: 'invoice_type', header: 'Kategori', render: (invoice) => <div className="space-y-1"><StatusBadge status={invoice.invoice_type === 'agency' ? 'Aktif' : 'Selesai'} label={invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimburse'} /><p className="text-[10px] text-[#52658E]">{invoice.items_count || 0} item</p></div> },
        { key: 'company', header: 'Klien & Kapal', wrap: 'normal', render: (invoice) => <div><p className="font-semibold">{invoice.company?.name || 'Klien'}</p><p className="text-[11px] text-[#52658E]">{invoice.port_call?.ship?.name || '—'} · {invoice.port_call?.job_number || '—'}</p></div> },
        { key: 'due_date', header: 'Jatuh Tempo', render: (invoice) => formatDate(invoice.due_date) },
        { key: 'grand_total', header: 'Total', align: 'right', render: (invoice) => <div className="font-mono font-bold">{formatRupiah(invoice.grand_total)}{invoice.outstanding_amount > 0 && invoice.paid_amount > 0 && <p className="text-[10px] font-normal text-rose-600">Sisa: {formatRupiah(invoice.outstanding_amount)}</p>}</div> },
        { key: 'status', header: 'Status', render: (invoice) => <div className="space-y-1"><StatusBadge {...invoiceStatus(invoice)} /><p className="text-[10px] text-[#52658E]">{invoice.delivery_status === 'delivered' ? 'Tanda terima ada' : 'Menunggu kirim'}</p></div> },
        { key: 'actions', header: 'Aksi', align: 'right', render: invoiceActions },
    ];
    const requestItemColumns: Column<InvoiceRequestItem>[] = [
        {
            key: 'item',
            header: 'Item / Vendor',
            wrap: 'normal',
            render: (item) => (
                <div>
                    <p className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{item.item_name}</p>
                    <p className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">{item.vendor_name || 'Vendor belum ditentukan'}</p>
                </div>
            ),
        },
        {
            key: 'quantity',
            header: 'Qty',
            render: (item) => <span className="tabular-nums">{Number(item.quantity).toLocaleString('id-ID')} {item.unit}</span>,
        },
        {
            key: 'selling_price',
            header: 'Harga',
            align: 'right',
            render: (item) => <span className="font-mono font-semibold tabular-nums">{formatRupiah(Number(item.selling_price))}</span>,
        },
        {
            key: 'subtotal',
            header: 'Subtotal',
            align: 'right',
            render: (item) => <span className="font-mono font-bold tabular-nums">{formatRupiah(Number(item.selling_price) * Number(item.quantity))}</span>,
        },
        {
            key: 'availability',
            header: 'Status',
            wrap: 'normal',
            render: (item) => {
                const reason = itemUnavailableReason(item);

                return reason
                    ? <span className="text-[10px] font-semibold text-[#A65300]">{reason}</span>
                    : <StatusBadge status="Aktif" label="Siap ditagihkan" />;
            },
        },
    ];

    return (
        <AppLayout title="Invoice & Tagihan Klien (Dual Invoice SJA)" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Invoice & Tagihan — PT Samudra Jaya Andalas" />

            <MobilePageHero title="Invoice & Tagihan" description="Pantau penerbitan, pengiriman, dan pelunasan invoice klien." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <div className="flex flex-col gap-3 border-b border-[#DCEAF8] pb-3 sm:flex-row sm:items-end sm:justify-between dark:border-[#1E3A5F]">
                    <Tabs
                        className="min-w-0 flex-1"
                        ariaLabel="Filter tipe invoice"
                        activeId={filters.type}
                        onChange={handleFilterType}
                        items={[
                            { id: 'all', label: 'Semua Invoice', count: stats.count },
                            { id: 'agency', label: 'Jasa Keagenan', count: stats.agency_count },
                            { id: 'reimburse', label: 'Reimburse', count: stats.reimburse_count },
                        ]}
                    />
                    {abilities.manage && <Button onClick={() => { clearErrors(); setIsCreateModalOpen(true); }}>+ Buat Invoice</Button>}
                </div>

                {/* ── Title Header ── */}
                <div className="hidden flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:flex">
                    <div>
                        <h1
                            className={
                                'text-2xl sm:text-3xl font-extrabold text-[#0B1F63] ' +
                                'dark:text-[#F1F5F9] tracking-tight text-balance'
                            }
                        >
                            Invoice & Tagihan Klien
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            Invoice Jasa Keagenan dan Reimburse memakai nilai serta konfigurasi pajak transaksi yang disetujui.
                        </p>
                    </div>
                </div>

                {/* ── Stats Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-medium">
                            Total Nilai Tagihan (Invoiced)
                        </div>
                        <div className="text-xl font-bold text-[#082870] dark:text-[#F1F5F9] mt-0.5">
                            {formatRupiah(stats.total_invoiced)}
                        </div>
                        <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            {stats.agency_count} Agency • {stats.reimburse_count} Reimburse
                        </div>
                    </div>

                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Sudah Dibayar Klien
                        </div>
                        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                            {formatRupiah(stats.total_paid)}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">
                            Penerimaan kas terkonfirmasi
                        </div>
                    </div>

                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                            Sisa Piutang Berjalan
                        </div>
                        <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                            {formatRupiah(stats.total_outstanding)}
                        </div>
                        <div className="text-[10px] text-rose-600 dark:text-rose-400/80 mt-0.5">
                            Menunggu pelunasan klien
                        </div>
                    </div>
                </div>

                {/* ── Search Bar ── */}
                <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
                    <div
                        className={
                            'absolute inset-y-0 left-0 pl-3.5 flex items-center ' +
                            'pointer-events-none text-[#8C9BB9]'
                        }
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        name="search"
                        aria-label="Cari invoice"
                        autoComplete="off"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nomor invoice, nama klien, atau armada kapal…"
                        className={
                            'w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#0C1D36] border ' +
                            'border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl text-xs ' +
                            'sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9] ' +
                            'placeholder-[#8C9BB9] dark:placeholder-[#64748B] ' +
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/30 ' +
                            'focus:border-[#0060F4] shadow-xs'
                        }
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                router.get('/invoices', { type: filters.type });
                            }}
                            className={
                                'absolute inset-y-0 right-0 pr-3 flex items-center ' +
                                'text-[#8C9BB9] hover:text-[#C62840] dark:hover:text-[#F87171]'
                            }
                        >
                            ✕
                        </button>
                    )}
                </form>

                {/* Invoices */}
                <ResponsiveTable<Invoice>
                    data={invoices}
                    keyExtractor={(invoice) => invoice.id}
                    desktop={{ columns, compact: true, minWidth: '1080px' }}
                    mobile={{
                        titleRender: (invoice) => invoice.invoice_number,
                        subtitleRender: (invoice) => `${invoice.company?.name || 'Klien'} · ${invoice.port_call?.ship?.name || '—'}`,
                        statusRender: (invoice) => <StatusBadge {...invoiceStatus(invoice)} />,
                        fields: [
                            { label: 'Kategori', render: (invoice) => invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimburse' },
                            { label: 'Tanggal Invoice', render: (invoice) => formatDate(invoice.invoice_date) },
                            { label: 'Jatuh Tempo', render: (invoice) => formatDate(invoice.due_date) },
                            { label: 'Total', render: (invoice) => formatRupiah(invoice.grand_total) },
                            { label: 'Sisa Piutang', fullWidth: true, render: (invoice) => formatRupiah(invoice.outstanding_amount) },
                        ],
                        actionsRender: (invoice) => invoiceActions(invoice),
                    }}
                />
            </div>

            {/* Modal Create Invoice */}
            <Modal
                isOpen={abilities.manage && isCreateModalOpen}
                onClose={() => { clearErrors(); setIsCreateModalOpen(false); }}
                title="Penerbitan Invoice Baru (SJA)"
                size="xl"
                asBottomSheetOnMobile
                footer={(
                    <>
                        <Button type="button" variant="secondary" onClick={() => { clearErrors(); setIsCreateModalOpen(false); }}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="invoice-create-form"
                            isLoading={processing}
                            disabled={Boolean(createInvoiceBlockReason)}
                            title={createInvoiceBlockReason || undefined}
                        >
                            Simpan Invoice Draft
                        </Button>
                    </>
                )}
            >
                <form id="invoice-create-form" noValidate onSubmit={handleCreateSubmit} autoComplete="off" className="space-y-4 text-xs">
                    <FormErrorSummary errors={errors} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            required
                            label="Tipe Invoice"
                            value={data.invoice_type}
                            onChange={(event) => {
                                setData((current) => ({
                                    ...current,
                                    invoice_type: event.target.value,
                                    request_item_ids: [],
                                    tax: '0',
                                }));
                            }}
                            options={[
                                { value: 'agency', label: 'Jasa Keagenan' },
                                { value: 'reimburse', label: 'Reimburse (Biaya Pelindo / Vendor)' },
                            ]}
                            error={errors.invoice_type}
                        />
                        <Select
                            required
                            label="Perusahaan Klien"
                            value={data.company_id}
                            onChange={() => undefined}
                            options={selectedPortCall?.company
                                ? [{ value: selectedPortCall.company.id, label: selectedPortCall.company.name }]
                                : companies
                                    .filter((company) => company.id === data.company_id)
                                    .map((company) => ({ value: company.id, label: company.name }))}
                            placeholder="Pilih kunjungan terlebih dahulu"
                            disabled
                            helperText="Perusahaan mengikuti SPK pada kunjungan terpilih."
                            error={errors.company_id}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            required
                            label="Kunjungan Kapal (Port Call)"
                            value={data.port_call_id}
                            onChange={(event) => handlePortCallChange(event.target.value)}
                            options={portCalls.map((portCall) => ({
                                value: portCall.id,
                                label: `${portCall.job_number} — ${portCall.ship?.name || 'Kapal'}${portCall.port?.name ? ` · ${portCall.port.name}` : ''}`,
                            }))}
                            placeholder="Pilih kunjungan yang sudah direkonsiliasi"
                            error={errors.port_call_id}
                        />
                        <Select
                            required
                            label="Referensi Pengajuan"
                            value={data.request_id}
                            onChange={(event) => handleRequestChange(event.target.value)}
                            options={requestsForPortCall.map((shipRequest) => ({
                                value: shipRequest.id,
                                label: `${shipRequest.request_number} — ${shipRequest.ship?.name || 'Kapal'}`,
                            }))}
                            placeholder={data.port_call_id ? 'Pilih pengajuan' : 'Pilih kunjungan terlebih dahulu'}
                            disabled={!data.port_call_id || requestsForPortCall.length === 0}
                            error={errors.request_id}
                        />
                    </div>

                    {createInvoiceBlockReason && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="rounded-xl border border-[#B9D9FF] bg-[#F0F8FF] p-3 text-[#0B1F63] dark:border-[#285585] dark:bg-[#071E38] dark:text-[#E7F0FA]"
                        >
                            <p className="text-xs font-extrabold">
                                {portCalls.length === 0 ? 'Invoice belum dapat dibuat' : 'Lengkapi data invoice'}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[#52658E] dark:text-[#B5C8DC]">
                                {createInvoiceBlockReason}
                            </p>
                            {portCalls.length === 0 && (
                                <Link
                                    href="/completion-notes"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="mt-2 inline-flex min-h-9 items-center rounded-[10px] px-2 text-xs font-bold text-[#0060F4] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 dark:text-[#60A5FA]"
                                >
                                    Buka Nota Rampung &amp; Rekonsiliasi
                                </Link>
                            )}
                        </div>
                    )}

                    <section aria-labelledby="invoice-items-heading" className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h2 id="invoice-items-heading" className="text-balance text-sm font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Item kebutuhan</h2>
                                <p className="text-pretty text-[11px] text-[#52658E] dark:text-[#94A3B8]">Pilih item yang akan ditagihkan pada invoice ini.</p>
                            </div>
                            {availableItems.length > 0 && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => selectAllAvailableItems(data.request_item_ids.length !== availableItems.length)}
                                >
                                    {data.request_item_ids.length === availableItems.length ? 'Kosongkan' : 'Pilih Semua'}
                                </Button>
                            )}
                        </div>

                        <div className="hidden md:block">
                            <Table<InvoiceRequestItem>
                                data={requestItems}
                                columns={requestItemColumns}
                                keyExtractor={(item) => item.id}
                                selectable
                                selectedKeys={data.request_item_ids}
                                isRowSelectable={(item) => !itemUnavailableReason(item)}
                                onSelectRow={(key, selected) => toggleRequestItem(String(key), selected)}
                                onSelectAll={selectAllAvailableItems}
                                compact
                                minWidth="760px"
                                emptyMessage={data.request_id ? 'Data Tidak Ditemukan' : 'Pilih pengajuan untuk melihat item'}
                            />
                        </div>

                        <div className="space-y-2 md:hidden">
                            {requestItems.length > 0 ? requestItems.map((item) => {
                                const unavailableReason = itemUnavailableReason(item);

                                return (
                                    <div
                                        key={item.id}
                                        className={`rounded-xl border p-3 ${unavailableReason ? 'border-[#DCEAF8] bg-[#F8FBFF] opacity-65 dark:border-[#1E3A5F] dark:bg-[#071322]' : 'border-[#B9D9FF] bg-white dark:border-[#285585] dark:bg-[#0C1D36]'}`}
                                    >
                                        <Checkbox
                                            id={`invoice-item-${item.id}`}
                                            checked={data.request_item_ids.includes(item.id)}
                                            disabled={Boolean(unavailableReason)}
                                            onChange={(event) => toggleRequestItem(item.id, event.target.checked)}
                                            label={item.item_name}
                                            description={`${Number(item.quantity).toLocaleString('id-ID')} ${item.unit} · ${formatRupiah(Number(item.selling_price) * Number(item.quantity))}`}
                                        />
                                        <div className="mt-2 flex items-start justify-between gap-2 pl-7 text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                            <span>{item.vendor_name || 'Vendor belum ditentukan'}</span>
                                            <span className={unavailableReason ? 'font-semibold text-[#A65300]' : 'font-semibold text-[#087443]'}>
                                                {unavailableReason || 'Siap ditagihkan'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="rounded-xl border border-dashed border-[#DCEAF8] px-4 py-8 text-center text-xs font-semibold text-[#52658E] dark:border-[#1E3A5F] dark:text-[#94A3B8]">
                                    {data.request_id ? 'Data Tidak Ditemukan' : 'Pilih pengajuan untuk melihat item'}
                                </div>
                            )}
                        </div>

                        {errors.request_item_ids && <p role="alert" className="text-[11px] font-semibold text-[#C62840]">{errors.request_item_ids}</p>}
                    </section>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <MoneyInput label="Materai / Addon" name="addon_total" value={data.addon_total} onChange={(value) => setData('addon_total', value)} error={errors.addon_total} />
                        <MoneyInput label="Pajak" name="tax" value={data.tax} onChange={(value) => setData('tax', value)} error={errors.tax} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-3 dark:border-[#1E3A5F] dark:bg-[#071322] sm:grid-cols-4">
                        <div><p className="text-[10px] text-[#52658E]">Item</p><p className="font-bold tabular-nums text-[#0B1F63] dark:text-white">{selectedItems.length}</p></div>
                        <div><p className="text-[10px] text-[#52658E]">Subtotal</p><p className="font-mono font-bold tabular-nums text-[#0B1F63] dark:text-white">{formatRupiah(selectedSubtotal)}</p></div>
                        <div><p className="text-[10px] text-[#52658E]">Tambahan</p><p className="font-mono font-bold tabular-nums text-[#0B1F63] dark:text-white">{formatRupiah(Number(data.addon_total || 0) + Number(data.tax || 0))}</p></div>
                        <div><p className="text-[10px] text-[#52658E]">Total</p><p className="font-mono font-extrabold tabular-nums text-[#0060F4]">{formatRupiah(invoiceGrandTotal)}</p></div>
                    </div>

                    <Input required label="Tanggal Jatuh Tempo" name="due_date" type="date" value={data.due_date} onChange={(event) => setData('due_date', event.target.value)} error={errors.due_date} />
                    <Textarea label="Keterangan" name="notes" value={data.notes} onChange={(event) => setData('notes', event.target.value)} rows={3} maxLength={1000} showCharCount placeholder="Rincian jasa atau nota pihak ketiga…" error={errors.notes} />
                    <PhotoUploadPicker
                        label="Dokumen pendukung (opsional)"
                        value={data.supporting_document}
                        onChange={(file) => setData('supporting_document', file)}
                        mode="gallery"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        maxSizeMb={10}
                        variant="compact"
                        error={errors.supporting_document}
                        helperText="PDF, Word, JPG, JPEG, atau PNG. Maksimal 10 MB."
                    />
                </form>
            </Modal>

            <Modal
                isOpen={abilities.manage && Boolean(workflowInvoice)}
                onClose={() => { workflowForm.clearErrors(); setWorkflowInvoice(null); }}
                title={workflowAction === 'release' ? 'Rilis Invoice Klien' : 'Catat Pengiriman Invoice'}
                subtitle={workflowInvoice?.invoice_number}
                footer={(
                    <>
                        <Button type="button" variant="secondary" onClick={() => { workflowForm.clearErrors(); setWorkflowInvoice(null); }}>Batal</Button>
                        <Button type="submit" form="invoice-workflow-form" isLoading={workflowForm.processing}>
                            {workflowAction === 'release' ? 'Rilis Invoice' : 'Catat Pengiriman'}
                        </Button>
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
                                <PhotoUploadPicker
                                    label="Dokumen final"
                                    required
                                    value={workflowForm.data.document}
                                    onChange={(file) => workflowForm.setData('document', file)}
                                    mode="gallery"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    maxSizeMb={10}
                                    variant="compact"
                                    error={workflowForm.errors.document}
                                    helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB."
                                />
                            ) : workflowInvoice ? (
                                <div className="rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <p className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">PDF invoice siap dibuat dari data sistem.</p>
                                    <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">Periksa isi dokumen sebelum merilis.</p>
                                    <DocumentActions
                                        className="mt-3"
                                        viewHref={`/invoices/${workflowInvoice.id}/generated-document?view=1`}
                                        downloadHref={`/invoices/${workflowInvoice.id}/generated-document`}
                                        viewLabel="Pratinjau PDF"
                                        downloadLabel="Unduh PDF"
                                    />
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <PhotoUploadPicker
                            label="Bukti pengiriman kepada klien"
                            required
                            value={workflowForm.data.delivery_proof}
                            onChange={(file) => workflowForm.setData('delivery_proof', file)}
                            mode="gallery"
                            accept=".pdf,.jpg,.jpeg,.png"
                            maxSizeMb={10}
                            variant="compact"
                            error={workflowForm.errors.delivery_proof}
                            helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB."
                        />
                    )}
                    <p className="rounded-xl bg-[#F0F8FF] p-3 text-xs text-[#52658E]">Status hanya mencatat kejadian yang sudah berlangsung. Sistem tidak mengirim invoice atau memindahkan dana secara otomatis.</p>
                </form>
            </Modal>
        </AppLayout>
    );
}
