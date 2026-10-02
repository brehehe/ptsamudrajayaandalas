import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FileCheck2, FileText, Plus, Search } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import Input from '../../Components/forms/Input';
import MoneyInput from '../../Components/forms/MoneyInput';
import Select from '../../Components/selects/Select';
import Pagination from '../../Components/pagination/Pagination';

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
    items: Array<{ expense_request_item?: { expense_request?: { request_number: string; status: string } } }>;
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
    portCalls: Array<{ id: string; job_number?: string; ship?: { name: string }; port?: { name: string } }>;
    vendors: Array<{ id: string; name: string }>;
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

export default function VendorInvoiceIndex({ invoices, portCalls, vendors, filters, abilities }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [createOpen, setCreateOpen] = useState(false);
    const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null);
    const createForm = useForm({
        port_call_id: '', vendor_id: '', document_number: '',
        document_date: new Date().toISOString().slice(0, 10),
        received_date: new Date().toISOString().slice(0, 10), due_date: '',
        description: '', amount: '', tax_amount: '0', notes: '', document: null as File | null,
    });
    const reviewForm = useForm({ decision: 'verify', verified_total: '', notes: '' });

    const applyFilters = (status = filters.status) => router.get('/vendor-invoices', { search, status }, {
        preserveState: true, preserveScroll: true,
    });

    const submitCreate = (event: React.FormEvent) => {
        event.preventDefault();
        createForm.post('/vendor-invoices', {
            forceFormData: true,
            onSuccess: () => { setCreateOpen(false); createForm.reset(); },
        });
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
        });
    };

    return (
        <AppLayout title="Invoice Vendor">
            <Head title="Invoice Vendor — PT Samudra Jaya Andalas" />
            <div className="mx-auto max-w-7xl space-y-5 pb-12">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0060F4]">Keuangan Operasional</p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">Invoice Vendor</h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#52658E] dark:text-[#94A3B8]">Catat tagihan yang benar-benar diterima, verifikasi, lalu masukkan ke batch pendanaan tanpa mencampur Kunjungan/Job.</p>
                    </div>
                    {abilities.create && <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="size-4" />}>Catat Invoice</Button>}
                </div>

                <Card padding="md">
                    <form onSubmit={(event) => { event.preventDefault(); applyFilters(); }} className="flex flex-col gap-3 sm:flex-row">
                        <Input aria-label="Cari invoice vendor" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor invoice, vendor, atau kapal" leftIcon={<Search className="size-4" />} />
                        <Select aria-label="Filter status invoice" value={filters.status} onChange={(e) => applyFilters(e.target.value)} className="sm:w-56" options={[
                            { value: 'all', label: 'Semua status' }, { value: 'received', label: 'Menunggu verifikasi' },
                            { value: 'verified', label: 'Terverifikasi' }, { value: 'batched', label: 'Sudah masuk batch' },
                            { value: 'unpaid', label: 'Belum dibayar' }, { value: 'partially_paid', label: 'Dibayar sebagian' },
                            { value: 'paid', label: 'Dibayar' }, { value: 'rejected', label: 'Ditolak' },
                        ]} />
                        <Button type="submit" variant="outline">Cari</Button>
                    </form>
                </Card>

                {invoices.data.length === 0 ? (
                    <Card padding="lg" className="text-center">
                        <FileText className="mx-auto size-9 text-[#8C9BB9]" />
                        <h2 className="mt-3 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Belum ada invoice vendor</h2>
                        <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">Invoice yang diterima dari vendor akan tampil di sini.</p>
                    </Card>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {invoices.data.map((invoice) => {
                            const batch = invoice.items.find((item) => item.expense_request_item)?.expense_request_item?.expense_request;
                            return <Card key={invoice.id} padding="md" className="min-w-0">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-mono text-sm font-bold text-[#0060F4]">{invoice.document_number}</p>
                                        <h2 className="mt-1 text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">{invoice.vendor?.name || 'Vendor'}</h2>
                                        <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">{invoice.port_call?.job_number || 'Tanpa nomor job'} · {invoice.port_call?.ship?.name || 'Kapal'}</p>
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-1.5">
                                        <StatusBadge status={invoice.status} label={labels[invoice.status] || invoice.status} showDot />
                                        <StatusBadge status={invoice.payment_status === 'paid' ? 'success' : 'waiting'} label={labels[invoice.payment_status] || invoice.payment_status} />
                                    </div>
                                </div>
                                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F0F8FF]/70 p-3 dark:bg-[#071322]/60">
                                    <div><dt className="text-[11px] text-[#52658E]">Nilai terverifikasi</dt><dd className="mt-0.5 font-mono text-sm font-bold">{money(invoice.verified_total)}</dd></div>
                                    <div><dt className="text-[11px] text-[#52658E]">Sudah dibayar</dt><dd className="mt-0.5 font-mono text-sm font-bold">{money(invoice.paid_amount)}</dd></div>
                                    <div><dt className="text-[11px] text-[#52658E]">Tanggal diterima</dt><dd className="mt-0.5 text-sm font-semibold">{new Date(invoice.received_date).toLocaleDateString('id-ID')}</dd></div>
                                    <div><dt className="text-[11px] text-[#52658E]">Batch</dt><dd className="mt-0.5 truncate text-sm font-semibold">{batch?.request_number || 'Belum masuk batch'}</dd></div>
                                </dl>
                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                    {invoice.document_path && <Link href={`/vendor-invoices/${invoice.id}/document`} className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-[#DCEAF8] px-3 text-xs font-semibold text-[#0B1F63] hover:border-[#0060F4] dark:border-[#1E3A5F] dark:text-[#F1F5F9]"><FileText className="size-4" /> Dokumen</Link>}
                                    {abilities.verify && invoice.status === 'received' && <Button size="sm" onClick={() => openReview(invoice)} leftIcon={<FileCheck2 className="size-4" />}>Periksa</Button>}
                                </div>
                            </Card>;
                        })}
                    </div>
                )}
                <Pagination links={invoices.links} currentPage={invoices.current_page} lastPage={invoices.last_page} total={invoices.total} from={invoices.from ?? undefined} to={invoices.to ?? undefined} />
            </div>

            <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Catat Invoice Vendor" subtitle="Vendor wajib dipilih setelah invoice benar-benar diterima." size="xl">
                <form onSubmit={submitCreate} className="space-y-4 p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select required label="Kunjungan / Job" value={createForm.data.port_call_id} onChange={(e) => createForm.setData('port_call_id', e.target.value)} placeholder="Pilih job" options={portCalls.map((call) => ({ value: call.id, label: `${call.job_number || '-'} · ${call.ship?.name || '-'}` }))} error={createForm.errors.port_call_id} />
                        <Select required label="Vendor" value={createForm.data.vendor_id} onChange={(e) => createForm.setData('vendor_id', e.target.value)} placeholder="Pilih vendor" options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))} error={createForm.errors.vendor_id} />
                        <Input required label="Nomor invoice" value={createForm.data.document_number} onChange={(e) => createForm.setData('document_number', e.target.value)} error={createForm.errors.document_number} />
                        <Input required label="Tanggal invoice" type="date" value={createForm.data.document_date} onChange={(e) => createForm.setData('document_date', e.target.value)} error={createForm.errors.document_date} />
                        <Input required label="Tanggal diterima" type="date" value={createForm.data.received_date} onChange={(e) => createForm.setData('received_date', e.target.value)} error={createForm.errors.received_date} />
                        <Input label="Jatuh tempo" type="date" value={createForm.data.due_date} onChange={(e) => createForm.setData('due_date', e.target.value)} error={createForm.errors.due_date} />
                        <MoneyInput required label="Nilai barang/jasa" value={createForm.data.amount} onChange={(value) => createForm.setData('amount', value)} error={createForm.errors.amount} />
                        <MoneyInput label="Pajak" value={createForm.data.tax_amount} onChange={(value) => createForm.setData('tax_amount', value)} error={createForm.errors.tax_amount} />
                        <Input required label="Uraian" value={createForm.data.description} onChange={(e) => createForm.setData('description', e.target.value)} error={createForm.errors.description} />
                        <Input required label="Dokumen invoice" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => createForm.setData('document', e.target.files?.[0] || null)} error={createForm.errors.document} />
                    </div>
                    <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Catatan<textarea value={createForm.data.notes} onChange={(e) => createForm.setData('notes', e.target.value)} className="mt-1.5 min-h-24 w-full rounded-xl border border-[#DCEAF8] bg-white p-3 text-sm font-normal dark:border-[#1E3A5F] dark:bg-[#0C1D36]" /></label>
                    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Batal</Button><Button type="submit" isLoading={createForm.processing}>Simpan Invoice</Button></div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(reviewInvoice)} onClose={() => setReviewInvoice(null)} title="Verifikasi Invoice Vendor" subtitle={reviewInvoice ? `${reviewInvoice.document_number} · ${reviewInvoice.vendor?.name || 'Vendor'}` : undefined}>
                <form onSubmit={submitReview} className="space-y-4 p-5">
                    <Select label="Keputusan" value={reviewForm.data.decision} onChange={(e) => reviewForm.setData('decision', e.target.value)} options={[{ value: 'verify', label: 'Valid — siap masuk batch' }, { value: 'reject', label: 'Tolak invoice' }]} />
                    {reviewForm.data.decision === 'verify' && <MoneyInput required label="Nilai terverifikasi" value={reviewForm.data.verified_total} onChange={(value) => reviewForm.setData('verified_total', value)} error={reviewForm.errors.verified_total} />}
                    <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Catatan / alasan<textarea required={reviewForm.data.decision === 'reject'} value={reviewForm.data.notes} onChange={(e) => reviewForm.setData('notes', e.target.value)} className="mt-1.5 min-h-24 w-full rounded-xl border border-[#DCEAF8] bg-white p-3 text-sm font-normal dark:border-[#1E3A5F] dark:bg-[#0C1D36]" /></label>
                    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setReviewInvoice(null)}>Batal</Button><Button type="submit" variant={reviewForm.data.decision === 'reject' ? 'danger' : 'primary'} isLoading={reviewForm.processing}>Simpan Keputusan</Button></div>
                </form>
            </Modal>
        </AppLayout>
    );
}
