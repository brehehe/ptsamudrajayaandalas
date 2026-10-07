import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
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

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_type: string;
    due_date: string;
    grand_total: number;
    paid_amount: number;
    outstanding_amount: number;
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

interface ReceivablesIndexProps {
    unpaidInvoices: Invoice[];
    receipts: ClientReceipt[];
    aging: {
        current: number;
        overdue_30: number;
        overdue_60: number;
        total: number;
    };
    companies: Array<{ id: string; name: string }>;
    search: string;
    abilities: { manage: boolean };
}

export default function ReceivablesIndex({
    unpaidInvoices,
    receipts,
    aging,
    companies,
    search: initialSearch,
    abilities,
}: ReceivablesIndexProps) {
    const [search, setSearch] = useState(initialSearch);
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/receivables', { search }, { preserveState: true });
    };

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
        { key: 'invoice_type', header: 'Kategori', render: (invoice) => <StatusBadge status={invoice.invoice_type === 'agency' ? 'Aktif' : 'Selesai'} label={invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimburse'} /> },
        { key: 'company', header: 'Perusahaan Klien', wrap: 'normal', render: (invoice) => invoice.company?.name || 'Klien' },
        { key: 'ship', header: 'Kapal', wrap: 'normal', render: (invoice) => invoice.port_call?.ship?.name || '—' },
        { key: 'due_date', header: 'Jatuh Tempo', render: (invoice) => formatDate(invoice.due_date) },
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

                {/* Aging Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-[#DCEAF8] shadow-xs">
                        <div className="text-[11px] text-[#52658E] font-medium">
                            Total Piutang Berjalan
                        </div>
                        <div className="text-xl font-bold text-[#082870] mt-1">
                            {formatRupiah(aging.total)}
                        </div>
                        <div className="text-[10px] text-[#52658E] mt-0.5">
                            Semua faktur belum lunas
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#DCEAF8] shadow-xs">
                        <div className="text-[11px] text-emerald-600 font-medium">
                            Lancar (&lt; 30 Hari)
                        </div>
                        <div className="text-xl font-bold text-emerald-700 mt-1">
                            {formatRupiah(aging.current)}
                        </div>
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                            Dalam batas tempo wajar
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#DCEAF8] shadow-xs">
                        <div className="text-[11px] text-amber-600 font-medium">
                            Jatuh Tempo 31 - 60 Hari
                        </div>
                        <div className="text-xl font-bold text-amber-700 mt-1">
                            {formatRupiah(aging.overdue_30)}
                        </div>
                        <div className="text-[10px] text-amber-600 mt-0.5">
                            Perlu follow-up penagihan
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#DCEAF8] shadow-xs">
                        <div className="text-[11px] text-rose-600 font-medium">
                            Menunggak (&gt; 60 Hari)
                        </div>
                        <div className="text-xl font-bold text-rose-700 mt-1">
                            {formatRupiah(aging.overdue_60)}
                        </div>
                        <div className="text-[10px] text-rose-600 mt-0.5">
                            Peringatan penundaan jasa
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
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
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nomor faktur invoice, nama klien, atau referensi bank..."
                        className={
                            'w-full pl-10 pr-24 h-11 bg-white border border-[#DCEAF8] ' +
                            'rounded-xl text-sm text-[#0B1F63] placeholder-[#8C9BB9] shadow-xs ' +
                            'focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 ' +
                            'focus:border-[#0060F4]'
                        }
                    />
                    <button
                        type="submit"
                        className={
                            'absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#0060F4] ' +
                            'hover:bg-[#0052D4] text-white text-xs font-bold rounded-lg ' +
                            'transition-colors cursor-pointer'
                        }
                    >
                        Cari
                    </button>
                </form>

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
                                { label: 'Kategori', render: (invoice) => invoice.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimburse' },
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
                            {processing ? 'Menyimpan...' : 'Simpan Penerimaan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
