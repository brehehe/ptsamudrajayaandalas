import React, { useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { CircleCheckBig, FileCheck2, Plus, Search } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import Input from '../../Components/forms/Input';
import MoneyInput from '../../Components/forms/MoneyInput';
import Select from '../../Components/selects/Select';
import Pagination from '../../Components/pagination/Pagination';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
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
    filters: { search: string; status: string };
    abilities: { create: boolean; verify: boolean };
}

const money = (value: number | string) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value || 0));

const labels: Record<string, string> = {
    received: 'Menunggu Verifikasi', verified: 'Terverifikasi', rejected: 'Ditolak',
    unpaid: 'Belum Dibayar', partially_paid: 'Dibayar Sebagian', paid: 'Dibayar',
};

export default function VendorInvoiceIndex({ invoices, filters, abilities }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null);
    const [paymentToVerify, setPaymentToVerify] = useState<{ invoice: Invoice; payment: VendorPayment } | null>(null);
    const reviewForm = useForm({ decision: 'verify', verified_total: '', notes: '' });
    const paymentVerificationForm = useForm({ action: 'verify_usage' });
    const reviewErrorRef = useRef<HTMLDivElement>(null);
    const paymentErrorRef = useRef<HTMLDivElement>(null);

    const applyFilters = (status = filters.status) => router.get('/vendor-invoices', { search, status }, {
        preserveState: true, preserveScroll: true,
    });

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

    const pendingPayments = (invoice: Invoice) => (invoice.payment_allocations || [])
        .map((allocation) => allocation.payment)
        .filter((payment): payment is VendorPayment => payment?.verification_status === 'pending');
    const invoiceActions = (invoice: Invoice) => (
        <div className="flex flex-wrap justify-end gap-1.5">
            {invoice.document_path && (
                <DocumentActions
                    viewHref={`/vendor-invoices/${invoice.id}/document?view=1`}
                    downloadHref={`/vendor-invoices/${invoice.id}/document`}
                />
            )}
            {abilities.verify && pendingPayments(invoice).length > 0 && (
                <Button
                    size="sm"
                    onClick={() => openPaymentVerification(invoice, pendingPayments(invoice)[0])}
                    leftIcon={<CircleCheckBig aria-hidden="true" className="size-4" />}
                >
                    Verifikasi Bayar{pendingPayments(invoice).length > 1 ? ` (${pendingPayments(invoice).length})` : ''}
                </Button>
            )}
            {abilities.verify && invoice.status === 'received' && <Button size="sm" onClick={() => openReview(invoice)} leftIcon={<FileCheck2 aria-hidden="true" className="size-4" />}>Periksa</Button>}
        </div>
    );
    const columns: Column<Invoice>[] = [
        { key: 'document_number', header: 'Invoice', wrap: 'normal', render: (invoice) => <div><p className="font-mono font-bold text-[#0060F4]" translate="no">{invoice.document_number}</p><p className="text-[10px] text-[#52658E]">{formatDate(invoice.received_date)}</p></div> },
        { key: 'vendor', header: 'Vendor', wrap: 'normal', render: (invoice) => invoice.vendor?.name || 'Vendor' },
        { key: 'port_call', header: 'Job / Kapal', wrap: 'normal', render: (invoice) => <div><p className="break-all" translate="no">{invoice.port_call?.job_number || '—'}</p><p className="text-[10px] text-[#52658E]">{invoice.port_call?.ship?.name || '—'}</p></div> },
        { key: 'verified_total', header: 'Terverifikasi', align: 'right', render: (invoice) => money(invoice.verified_total) },
        { key: 'paid_amount', header: 'Dibayar', align: 'right', render: (invoice) => money(invoice.paid_amount) },
        { key: 'status', header: 'Status', wrap: 'normal', render: (invoice) => <div className="flex flex-col items-start gap-1"><StatusBadge status={invoice.status} label={labels[invoice.status] || invoice.status} showDot /><StatusBadge status={invoice.payment_status === 'paid' ? 'success' : 'waiting'} label={labels[invoice.payment_status] || invoice.payment_status} />{pendingPayments(invoice).length > 0 && <StatusBadge status="processing" label="Menunggu Verifikasi Pembayaran" />}</div> },
        { key: 'actions', header: 'Aksi', align: 'right', render: invoiceActions },
    ];

    return (
        <AppLayout title="Invoice Vendor" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Invoice Vendor — PT Samudra Jaya Andalas" />
            <MobilePageHero title="Invoice Vendor" description="Buat invoice dari item pengajuan, verifikasi, dan pantau pembayarannya." />
            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-12 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <div className="hidden flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:flex">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0060F4]">Keuangan Operasional</p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">Invoice Vendor</h1>
                        <p className="mt-1 max-w-2xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">Buat invoice langsung dari item pengajuan yang disetujui, verifikasi dokumen, lalu proses pembayarannya melalui menu Pengeluaran.</p>
                    </div>
                    {abilities.create && <Link href="/vendor-invoices/create" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35"><Plus aria-hidden="true" className="size-4" />Buat Invoice dari Pengajuan</Link>}
                </div>

                <Card padding="md">
                    <form onSubmit={(event) => { event.preventDefault(); applyFilters(); }} className="flex flex-col gap-3 sm:flex-row">
                        <Input aria-label="Cari invoice vendor" name="search" autoComplete="off" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor invoice, vendor, atau kapal…" leftIcon={<Search aria-hidden="true" className="size-4" />} />
                        <Select aria-label="Filter status invoice" name="status" autoComplete="off" value={filters.status} onChange={(e) => applyFilters(e.target.value)} className="sm:w-56" options={[
                            { value: 'all', label: 'Semua status' }, { value: 'received', label: 'Menunggu verifikasi' },
                            { value: 'verified', label: 'Terverifikasi' },
                            { value: 'unpaid', label: 'Belum dibayar' }, { value: 'partially_paid', label: 'Dibayar sebagian' },
                            { value: 'paid', label: 'Dibayar' }, { value: 'rejected', label: 'Ditolak' },
                        ]} />
                        <Button type="submit" variant="outline">Cari</Button>
                    </form>
                </Card>

                {abilities.create && <Link href="/vendor-invoices/create" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 md:hidden"><Plus aria-hidden="true" className="size-4" />Buat Invoice dari Pengajuan</Link>}

                <ResponsiveTable<Invoice>
                    data={invoices.data}
                    keyExtractor={(invoice) => invoice.id}
                    desktop={{ columns, compact: true, minWidth: '1040px' }}
                    mobile={{
                        titleRender: (invoice) => invoice.document_number,
                        subtitleRender: (invoice) => `${invoice.vendor?.name || 'Vendor'} · ${invoice.port_call?.ship?.name || 'Kapal'}`,
                        statusRender: (invoice) => <div className="flex flex-col items-end gap-1"><StatusBadge status={invoice.status} label={labels[invoice.status] || invoice.status} showDot /><StatusBadge status={invoice.payment_status === 'paid' ? 'success' : 'waiting'} label={labels[invoice.payment_status] || invoice.payment_status} />{pendingPayments(invoice).length > 0 && <StatusBadge status="processing" label="Menunggu Verifikasi Bayar" />}</div>,
                        fields: [
                            { label: 'Job', render: (invoice) => invoice.port_call?.job_number || '—' },
                            { label: 'Tanggal diterima', render: (invoice) => formatDate(invoice.received_date) },
                            { label: 'Terverifikasi', render: (invoice) => money(invoice.verified_total) },
                            { label: 'Dibayar', render: (invoice) => money(invoice.paid_amount) },
                        ],
                        actionsRender: invoiceActions,
                    }}
                />
                <Pagination links={invoices.links} currentPage={invoices.current_page} lastPage={invoices.last_page} total={invoices.total} from={invoices.from ?? undefined} to={invoices.to ?? undefined} />
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
                subtitle={reviewInvoice ? `${reviewInvoice.document_number} · ${reviewInvoice.vendor?.name || 'Vendor'}` : undefined}
                footer={(
                    <>
                        <Button type="button" variant="secondary" disabled={reviewForm.processing} onClick={() => { reviewForm.clearErrors(); setReviewInvoice(null); }}>Batal</Button>
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
                    <Select name="decision" autoComplete="off" label="Keputusan" value={reviewForm.data.decision} onChange={(e) => reviewForm.setData('decision', e.target.value)} error={reviewForm.errors.decision} options={[{ value: 'verify', label: 'Valid — siap dibayar' }, { value: 'reject', label: 'Tolak invoice' }]} />
                    {reviewForm.data.decision === 'verify' && <MoneyInput required name="verified_total" autoComplete="off" label="Nilai terverifikasi" value={reviewForm.data.verified_total} onChange={(value) => reviewForm.setData('verified_total', value)} error={reviewForm.errors.verified_total} />}
                    <Textarea name="notes" autoComplete="off" label="Catatan / alasan" required={reviewForm.data.decision === 'reject'} value={reviewForm.data.notes} onChange={(e) => reviewForm.setData('notes', e.target.value)} error={reviewForm.errors.notes} maxLength={2000} showCharCount />
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(paymentToVerify)}
                onClose={() => {
                    if (!paymentVerificationForm.processing) {
                        paymentVerificationForm.clearErrors();
                        setPaymentToVerify(null);
                    }
                }}
                title="Verifikasi Pembayaran Vendor"
                subtitle={paymentToVerify ? `${paymentToVerify.invoice.document_number} · ${paymentToVerify.invoice.vendor?.name || 'Vendor'}` : undefined}
                size="md"
                footer={(
                    <>
                        <Button type="button" variant="secondary" disabled={paymentVerificationForm.processing} onClick={() => { paymentVerificationForm.clearErrors(); setPaymentToVerify(null); }}>Batal</Button>
                        <Button type="submit" form="vendor-payment-verification-form" isLoading={paymentVerificationForm.processing}>Verifikasi & Perbarui Status</Button>
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
                                    <p className="mt-1 text-lg font-extrabold tabular-nums text-[#087443] dark:text-emerald-300">{money(paymentToVerify.payment.amount)}</p>
                                    <dl className="mt-3 space-y-2 text-xs">
                                        <div className="flex items-start justify-between gap-3"><dt className="text-[#52658E]">Penerima</dt><dd className="text-right font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{paymentToVerify.payment.recipient}</dd></div>
                                        <div className="flex items-start justify-between gap-3"><dt className="text-[#52658E]">Referensi</dt><dd className="break-all text-right font-semibold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{paymentToVerify.payment.reference_number}</dd></div>
                                        <div className="flex items-start justify-between gap-3"><dt className="text-[#52658E]">Tanggal</dt><dd className="text-right font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(paymentToVerify.payment.payment_date)}</dd></div>
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
        </AppLayout>
    );
}
