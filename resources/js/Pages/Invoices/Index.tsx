import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Search } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Input from '../../Components/forms/Input';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Modal from '../../Components/overlays/Modal';
import Select from '../../Components/selects/Select';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import Button from '../../Components/ui/Button';
import DocumentActions from '../../Components/ui/DocumentActions';
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
    company?: { id: string; name: string } | null;
    port_call?: {
        job_number: string;
        ship?: { name: string; imo_number: string } | null;
    } | null;
}

interface Props {
    invoices: Invoice[];
    stats: {
        total_invoiced: number;
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
            {abilities.manage && invoice.status === 'draft' && (
                <>
                    <Link
                        href={`/invoices/${invoice.id}/edit`}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#DCEAF8] bg-white px-3 text-xs font-medium text-[#0B1F63] transition-colors hover:border-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                    >
                        <Pencil aria-hidden="true" className="size-3.5" /> Edit
                    </Link>
                    <Button size="sm" onClick={() => openWorkflow(invoice, 'release')}>Rilis</Button>
                </>
            )}
            {/* {abilities.manage && invoice.status === 'released' && (
                <Button size="sm" variant="secondary" onClick={() => openWorkflow(invoice, 'mark_sent')}>Kirim Klien</Button>
            )} */}
        </div>
    );

    const columns: Column<Invoice>[] = [
        {
            key: 'invoice_number',
            header: 'No. Invoice',
            wrap: 'normal',
            render: (invoice) => <div><p className="font-mono font-semibold text-[#0060F4]" translate="no">{invoice.invoice_number}</p><p className="text-[10px] text-[#52658E]">{formatDate(invoice.invoice_date)}</p></div>,
        },
        {
            key: 'invoice_type',
            header: 'Kategori',
            render: (invoice) => <div className="space-y-1"><StatusBadge status={invoice.invoice_type === 'agency' ? 'Aktif' : 'Selesai'} label={invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimburse'} /><p className="text-[10px] text-[#52658E]">{invoice.items_count || 0} item</p></div>,
        },
        {
            key: 'company',
            header: 'Klien & Kapal',
            wrap: 'normal',
            render: (invoice) => <div><p className="font-semibold">{invoice.company?.name || 'Klien'}</p><p className="text-[11px] text-[#52658E]">{invoice.port_call?.ship?.name || '—'} · {invoice.port_call?.job_number || '—'}</p></div>,
        },
        { key: 'due_date', header: 'Jatuh Tempo', render: (invoice) => formatDate(invoice.due_date) },
        {
            key: 'grand_total',
            header: 'Total',
            align: 'right',
            render: (invoice) => <div className="font-mono font-bold tabular-nums">{formatRupiah(invoice.grand_total)}{invoice.outstanding_amount > 0 && invoice.paid_amount > 0 && <p className="text-[10px] font-normal text-[#C62840]">Sisa: {formatRupiah(invoice.outstanding_amount)}</p>}</div>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (invoice) => <div className="space-y-1"><StatusBadge {...invoiceStatus(invoice)} /><p className="text-[10px] text-[#52658E]">{invoice.delivery_status === 'delivered' ? 'Tanda terima ada' : 'Menunggu kirim'}</p></div>,
        },
        { key: 'actions', header: 'Aksi', align: 'right', render: invoiceActions },
    ];

    return (
        <AppLayout title="Invoice & Tagihan Klien" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Invoice & Tagihan — PT Samudra Jaya Andalas" />
            <MobilePageHero title="Invoice & Tagihan" description="Pantau penerbitan, pengiriman, dan pelunasan invoice klien." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <div className="hidden items-end justify-between gap-4 border-b border-[#DCEAF8] pb-4 md:flex dark:border-[#1E3A5F]">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9]">Invoice & Tagihan Klien</h1>
                        <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">Invoice Jasa Keagenan dan Reimburse berdasarkan item pengajuan yang disetujui.</p>
                    </div>
                    {abilities.manage && (
                        <Link href="/invoices/create" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35">
                            <Plus aria-hidden="true" className="size-4" /> Buat Invoice
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        ['Total Nilai Tagihan', formatRupiah(stats.total_invoiced), `${stats.agency_count} Agency · ${stats.reimburse_count} Reimburse`, 'text-[#082870] dark:text-[#F1F5F9]'],
                        ['Sudah Dibayar Klien', formatRupiah(stats.total_paid), 'Penerimaan kas terkonfirmasi', 'text-[#087443]'],
                        ['Sisa Piutang Berjalan', formatRupiah(stats.total_outstanding), 'Menunggu pelunasan klien', 'text-[#C62840]'],
                    ].map(([label, value, description, color]) => (
                        <div key={label} className="rounded-2xl border border-[#DCEAF8] bg-white p-4 shadow-xs dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                            <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">{label}</p>
                            <p className={`mt-1 text-xl font-extrabold tabular-nums ${color}`}>{value}</p>
                            <p className="mt-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">{description}</p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <Tabs
                        className="min-w-0 flex-1"
                        ariaLabel="Filter tipe invoice"
                        activeId={filters.type}
                        onChange={(type) => updateFilters({ type })}
                        items={[
                            { id: 'all', label: 'Semua Invoice', count: stats.count },
                            { id: 'agency', label: 'Jasa Keagenan', count: stats.agency_count },
                            { id: 'reimburse', label: 'Reimburse', count: stats.reimburse_count },
                        ]}
                    />
                    <form onSubmit={(event) => { event.preventDefault(); updateFilters({}); }} className="flex min-w-0 gap-2 lg:w-[390px]">
                        <Input name="search" autoComplete="off" aria-label="Cari invoice" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari invoice, klien, atau kapal…" leftIcon={<Search aria-hidden="true" className="size-4" />} clearable onClear={() => { setSearch(''); router.get('/invoices', { ...filters, search: '' }, { preserveState: true, replace: true }); }} />
                        <Button type="submit" variant="secondary">Cari</Button>
                    </form>
                    {abilities.manage && (
                        <Link href="/invoices/create" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 md:hidden">
                            <Plus aria-hidden="true" className="size-4" /> Buat Invoice
                        </Link>
                    )}
                </div>

                <ResponsiveTable<Invoice>
                    data={invoices}
                    keyExtractor={(invoice) => invoice.id}
                    desktop={{ columns, compact: true, minWidth: '1080px', emptyMessage: 'Data Tidak Ditemukan' }}
                    mobile={{
                        titleRender: (invoice) => invoice.invoice_number,
                        subtitleRender: (invoice) => `${invoice.company?.name || 'Klien'} · ${invoice.port_call?.ship?.name || '—'}`,
                        statusRender: (invoice) => <StatusBadge {...invoiceStatus(invoice)} />,
                        fields: [
                            { label: 'Job', render: (invoice) => invoice.port_call?.job_number || '—' },
                            { label: 'Kategori', render: (invoice) => invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimburse' },
                            { label: 'Jatuh Tempo', render: (invoice) => formatDate(invoice.due_date) },
                            { label: 'Total', render: (invoice) => formatRupiah(invoice.grand_total) },
                            { label: 'Sisa Piutang', fullWidth: true, render: (invoice) => formatRupiah(invoice.outstanding_amount) },
                        ],
                        actionsRender: invoiceActions,
                        emptyMessage: 'Data Tidak Ditemukan',
                    }}
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
        </AppLayout>
    );
}
