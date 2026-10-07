import React, { useRef, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Banknote, CheckCircle2, Clock3, Plus, ReceiptText, Search } from 'lucide-react';
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
    };
    abilities: { manage: boolean };
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

export default function ExpensesIndex({
    expenses,
    payableVendorInvoices,
    stats,
    filters,
    abilities,
}: ExpensesIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const paymentForm = useForm(initialPaymentData());
    const paymentErrorRef = useRef<HTMLDivElement>(null);
    const selectedInvoice = payableVendorInvoices.find((invoice) => invoice.id === paymentForm.data.cost_document_id);

    const applyFilters = (status = filters.status) => router.get('/expenses', {
        search,
        type: filters.type,
        status,
    }, {
        preserveState: true,
        preserveScroll: true,
    });

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

    return (
        <AppLayout title="Pengeluaran & Pembayaran" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Pengeluaran & Pembayaran — PT Samudra Jaya Andalas" />

            <MobilePageHero title="Pengeluaran" description="Catat pembayaran invoice vendor dan pantau riwayat transaksi." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <div className="hidden items-end justify-between gap-4 border-b border-[#DCEAF8] pb-4 md:flex dark:border-[#1E3A5F]">
                    <div>
                        <p className="text-xs font-bold uppercase text-[#0060F4]">Keuangan Operasional</p>
                        <h1 className="mt-1 text-balance text-3xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Pengeluaran & Pembayaran Invoice</h1>
                        <p className="mt-1 max-w-3xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">Pilih invoice vendor yang sudah terverifikasi dan unggah bukti transfer. Status invoice langsung diperbarui setelah pembayaran disimpan.</p>
                    </div>
                    {abilities.manage && (
                        <Button onClick={openPaymentModal} disabled={payableVendorInvoices.length === 0} leftIcon={<Plus aria-hidden="true" className="size-4" />}>
                            Bayar Invoice Vendor
                        </Button>
                    )}
                </div>

                {abilities.manage && (
                    <Button className="w-full md:hidden" onClick={openPaymentModal} disabled={payableVendorInvoices.length === 0} leftIcon={<Plus aria-hidden="true" className="size-4" />}>
                        Bayar Invoice Vendor
                    </Button>
                )}

                {abilities.manage && payableVendorInvoices.length === 0 && (
                    <p className="text-pretty rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] px-3 py-2 text-xs text-[#52658E] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#94A3B8]">
                        Belum ada invoice siap dibayar. Invoice akan muncul di sini setelah dibuat dari pengajuan dan diverifikasi.
                    </p>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                    <Card padding="md">
                        <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#52658E]">Total pembayaran</p><p className="mt-1 text-xl font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(stats.total)}</p><p className="mt-1 text-[11px] text-[#52658E]">{stats.count} transaksi</p></div><span className="flex size-10 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4]"><Banknote aria-hidden="true" className="size-5" /></span></div>
                    </Card>
                    <Card padding="md">
                        <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#52658E]">Terbayar</p><p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{money(stats.verified)}</p><p className="mt-1 text-[11px] text-[#52658E]">Sudah dicatat ke invoice</p></div><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 aria-hidden="true" className="size-5" /></span></div>
                    </Card>
                    <Card padding="md">
                        <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#52658E]">Perlu tindak lanjut</p><p className="mt-1 text-xl font-extrabold tabular-nums text-amber-700 dark:text-amber-400">{money(stats.pending)}</p><p className="mt-1 text-[11px] text-[#52658E]">Transaksi lama belum diselesaikan</p></div><span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"><Clock3 aria-hidden="true" className="size-5" /></span></div>
                    </Card>
                </div>

                <Card padding="md">
                    <form onSubmit={(event) => { event.preventDefault(); applyFilters(); }} className="flex flex-col gap-3 sm:flex-row">
                        <Input aria-label="Cari pembayaran" name="search" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari invoice, referensi, vendor, atau kapal…" leftIcon={<Search aria-hidden="true" className="size-4" />} />
                        <Select aria-label="Filter status pembayaran" name="status" autoComplete="off" value={filters.status} onChange={(event) => applyFilters(event.target.value)} className="sm:w-56" options={[{ value: 'all', label: 'Semua status' }, { value: 'pending', label: 'Perlu tindak lanjut' }, { value: 'verified', label: 'Terbayar' }]} />
                        <Button type="submit" variant="secondary">Cari</Button>
                    </form>
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
        </AppLayout>
    );
}
