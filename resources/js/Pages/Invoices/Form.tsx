import React, { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Building2, FileText, Ship as ShipIcon } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button, { getButtonClassName } from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import Checkbox from '../../Components/forms/Checkbox';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Input from '../../Components/forms/Input';
import MoneyInput from '../../Components/forms/MoneyInput';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import Textarea from '../../Components/forms/Textarea';
import SelectSearch from '../../Components/selects/SelectSearch';
import Table, { type Column } from '../../Components/tables/Table';
import StatusBadge from '../../Components/ui/StatusBadge';
import DocumentActions from '../../Components/ui/DocumentActions';
import { toDateInputValue } from '../../lib/formatDate';

interface Company { id: string; name: string }
interface PortCall {
    id: string;
    job_number: string;
    client_spk_number?: string | null;
    company_id?: string | null;
    company?: Company | null;
    ship?: { id: string; name: string } | null;
    port?: { id: string; name: string } | null;
}
interface InvoiceItem {
    id: string;
    request_id: string;
    request_number: string;
    item_name: string;
    vendor_name?: string | null;
    quantity: string;
    unit: string;
    selling_price: string;
    billing_type: 'agency' | 'reimburse';
    unavailable_reason?: string | null;
}
interface ShipRequest {
    id: string;
    request_number: string;
    port_call_id: string;
    items: InvoiceItem[];
}
interface EditingInvoice {
    id: string;
    invoice_number: string;
    port_call_id: string;
    company_id: string;
    invoice_type: 'agency' | 'reimburse';
    due_date: string;
    addon_total: string;
    tax: string;
    notes?: string | null;
    supporting_document_path?: string | null;
    request_item_ids: string[];
    item_prices: Record<string, string>;
}
interface Props {
    companies: Company[];
    portCalls: PortCall[];
    shipRequests: ShipRequest[];
    invoice?: EditingInvoice | null;
}

const money = (value: number | string) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(Number(value || 0));

export default function InvoiceForm({ companies, portCalls, shipRequests, invoice = null }: Props) {
    const initialJob = portCalls.find((portCall) => portCall.id === invoice?.port_call_id);
    const [companyId, setCompanyId] = useState(invoice?.company_id || initialJob?.company_id || '');
    const [shipId, setShipId] = useState(initialJob?.ship?.id || '');
    const form = useForm({
        port_call_id: invoice?.port_call_id || '',
        company_id: invoice?.company_id || '',
        invoice_type: invoice?.invoice_type || 'agency',
        request_item_ids: invoice?.request_item_ids || ([] as string[]),
        item_prices: invoice?.item_prices || ({} as Record<string, string>),
        addon_total: invoice?.addon_total || '0',
        tax: invoice?.tax || '0',
        due_date: invoice?.due_date || toDateInputValue(14),
        notes: invoice?.notes || '',
        supporting_document: null as File | null,
    });
    const errors = form.errors as Record<string, string>;

    const ships = useMemo(() => {
        const unique = new Map<string, { id: string; name: string }>();
        portCalls.filter((portCall) => !companyId || portCall.company_id === companyId).forEach((portCall) => {
            if (portCall.ship) unique.set(portCall.ship.id, portCall.ship);
        });

        return Array.from(unique.values());
    }, [companyId, portCalls]);
    const jobs = useMemo(
        () => portCalls.filter((portCall) => (!companyId || portCall.company_id === companyId) && (!shipId || portCall.ship?.id === shipId)),
        [companyId, portCalls, shipId],
    );
    const selectedJob = useMemo(
        () => portCalls.find((portCall) => portCall.id === form.data.port_call_id),
        [form.data.port_call_id, portCalls],
    );
    const jobItems = useMemo(
        () => shipRequests.filter((request) => request.port_call_id === form.data.port_call_id).flatMap((request) => request.items),
        [form.data.port_call_id, shipRequests],
    );
    const itemUnavailableReason = (item: InvoiceItem): string | null => {
        if (item.unavailable_reason) return item.unavailable_reason;
        if (item.billing_type !== form.data.invoice_type) {
            return item.billing_type === 'agency' ? 'Khusus invoice Jasa Keagenan' : 'Khusus invoice Reimburse';
        }

        return null;
    };
    const availableItems = jobItems.filter((item) => !itemUnavailableReason(item));
    const selectedItems = jobItems.filter((item) => form.data.request_item_ids.includes(item.id));
    const subtotal = selectedItems.reduce(
        (total, item) => total + Number(form.data.item_prices[item.id] || 0) * Number(item.quantity),
        0,
    );
    const grandTotal = subtotal + Number(form.data.addon_total || 0) + Number(form.data.tax || 0);

    const toggleItem = (item: InvoiceItem, selected: boolean) => {
        const requestItemIds = selected
            ? [...form.data.request_item_ids, item.id]
            : form.data.request_item_ids.filter((id) => id !== item.id);
        const itemPrices = { ...form.data.item_prices };
        if (selected && !itemPrices[item.id]) itemPrices[item.id] = item.selling_price;
        if (!selected) delete itemPrices[item.id];
        form.setData((data) => ({ ...data, request_item_ids: requestItemIds, item_prices: itemPrices }));
    };

    const selectAll = (selected: boolean) => {
        const itemPrices = { ...form.data.item_prices };
        availableItems.forEach((item) => {
            if (selected && !itemPrices[item.id]) itemPrices[item.id] = item.selling_price;
            if (!selected) delete itemPrices[item.id];
        });
        form.setData((data) => ({
            ...data,
            request_item_ids: selected ? availableItems.map((item) => item.id) : [],
            item_prices: itemPrices,
        }));
    };

    const updatePrice = (itemId: string, value: string) => form.setData('item_prices', {
        ...form.data.item_prices,
        [itemId]: value,
    });

    const columns: Column<InvoiceItem>[] = [
        {
            key: 'item',
            header: 'Pengajuan / Item',
            wrap: 'normal',
            render: (item) => <div><p className="font-mono text-[11px] font-bold text-[#0060F4]" translate="no">{item.request_number}</p><p className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{item.item_name}</p></div>,
        },
        { key: 'quantity', header: 'Qty', render: (item) => <span className="tabular-nums">{Number(item.quantity).toLocaleString('id-ID')} {item.unit}</span> },
        {
            key: 'selling_price',
            header: 'Harga Jual Akhir',
            width: '220px',
            render: (item) => form.data.request_item_ids.includes(item.id)
                ? <MoneyInput name={`item_prices[${item.id}]`} autoComplete="off" aria-label={`Harga jual ${item.item_name}`} sizeVariant="sm" value={form.data.item_prices[item.id] || ''} onChange={(value) => updatePrice(item.id, value)} error={errors[`item_prices.${item.id}`]} />
                : <span className="tabular-nums text-[#52658E]">{money(item.selling_price)}</span>,
        },
        { key: 'subtotal', header: 'Subtotal', align: 'right', render: (item) => <span className="tabular-nums font-bold">{money(Number(form.data.item_prices[item.id] || item.selling_price) * Number(item.quantity))}</span> },
        { key: 'status', header: 'Status', wrap: 'normal', render: (item) => itemUnavailableReason(item) ? <span className="text-[11px] font-semibold text-[#A65300]">{itemUnavailableReason(item)}</span> : <StatusBadge status="Aktif" label="Siap ditagihkan" /> },
    ];

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (invoice) {
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(`/invoices/${invoice.id}`, {
                forceFormData: true,
                onFinish: () => form.transform((data) => data),
            });
            return;
        }
        form.post('/invoices', { forceFormData: true });
    };

    return (
        <AppLayout title={invoice ? 'Edit Invoice Klien' : 'Buat Invoice Klien'}>
            <Head title={`${invoice ? 'Edit' : 'Buat'} Invoice Klien — PT Samudra Jaya Andalas`} />
            <div className="mx-auto max-w-6xl space-y-4 pb-12">
                <div className="flex flex-col gap-3 border-b border-[#DCEAF8] pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3A5F]">
                    <div className="min-w-0">
                        <h1 className="text-balance text-2xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">{invoice ? `Edit ${invoice.invoice_number}` : 'Penerbitan Invoice Baru'}</h1>
                        <p className="mt-1 max-w-3xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">Pilih Job dan item yang akan ditagihkan. Harga jual akhir dapat disesuaikan tanpa menampilkan HPP.</p>
                    </div>
                    <Link href="/invoices" className={getButtonClassName({ variant: 'outline', className: 'w-full sm:w-auto' })}>Kembali</Link>
                </div>

                <form noValidate onSubmit={submit} className="space-y-4">
                    <FormErrorSummary errors={form.errors} />

                    <Card title="Jenis dan Job Invoice" titleLevel={2} subtitle="Pilihan Job mengikuti perusahaan dan kapal pada SPK." padding="none">
                        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
                            <SelectSearch
                                required
                                name="invoice_type"
                                label="Tipe Invoice"
                                value={form.data.invoice_type}
                                onChange={(value) => form.setData((data) => ({ ...data, invoice_type: String(value) as 'agency' | 'reimburse', request_item_ids: [], item_prices: {} }))}
                                options={[{ value: 'agency', label: 'Jasa Keagenan' }, { value: 'reimburse', label: 'Reimburse' }]}
                                clearable={false}
                                error={form.errors.invoice_type}
                            />
                            <SelectSearch
                                required
                                name="company_id"
                                label="Perusahaan"
                                value={companyId}
                                onChange={(value) => {
                                    const nextCompanyId = String(value);
                                    setCompanyId(nextCompanyId);
                                    setShipId('');
                                    form.setData((data) => ({ ...data, company_id: nextCompanyId, port_call_id: '', request_item_ids: [], item_prices: {} }));
                                }}
                                options={companies.map((company) => ({ value: company.id, label: company.name, icon: <Building2 aria-hidden="true" className="size-4" /> }))}
                                placeholder="Cari perusahaan"
                                error={form.errors.company_id}
                            />
                            <SelectSearch
                                required
                                name="ship_id"
                                label="Kapal"
                                value={shipId}
                                disabled={!companyId}
                                onChange={(value) => {
                                    setShipId(String(value));
                                    form.setData((data) => ({ ...data, port_call_id: '', request_item_ids: [], item_prices: {} }));
                                }}
                                options={ships.map((ship) => ({ value: ship.id, label: ship.name, icon: <ShipIcon aria-hidden="true" className="size-4" /> }))}
                                placeholder={companyId ? 'Cari kapal' : 'Pilih perusahaan dahulu'}
                            />
                            <SelectSearch
                                required
                                name="port_call_id"
                                label="Job"
                                value={form.data.port_call_id}
                                disabled={!shipId}
                                onChange={(value) => {
                                    const jobId = String(value);
                                    const job = portCalls.find((portCall) => portCall.id === jobId);
                                    form.setData((data) => ({ ...data, port_call_id: jobId, company_id: job?.company_id || data.company_id, request_item_ids: [], item_prices: {} }));
                                }}
                                options={jobs.map((job) => ({
                                    value: job.id,
                                    label: job.job_number,
                                    description: `${job.client_spk_number ? `SPK Klien: ${job.client_spk_number}` : 'SPK Klien belum diisi'} · ${job.port?.name || 'Pelabuhan belum diisi'}`,
                                    icon: <FileText aria-hidden="true" className="size-4" />,
                                }))}
                                placeholder={shipId ? 'Cari nomor Job' : 'Pilih kapal dahulu'}
                                error={form.errors.port_call_id}
                            />
                        </div>
                        {selectedJob && (
                            <div className="border-t border-[#DCEAF8]/80 px-4 py-3 dark:border-[#1E3A5F]/80 sm:px-5">
                                <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="min-w-0">
                                        <dt className="text-[#52658E] dark:text-[#94A3B8]">Job terpilih</dt>
                                        <dd className="mt-0.5 truncate font-bold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{selectedJob.job_number}</dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-[#52658E] dark:text-[#94A3B8]">Nomor SPK klien</dt>
                                        <dd className="mt-0.5 truncate font-bold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{selectedJob.client_spk_number || 'Belum diisi'}</dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-[#52658E] dark:text-[#94A3B8]">Kapal</dt>
                                        <dd className="mt-0.5 truncate font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedJob.ship?.name || 'Belum diisi'}</dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-[#52658E] dark:text-[#94A3B8]">Pelabuhan</dt>
                                        <dd className="mt-0.5 truncate font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedJob.port?.name || 'Belum diisi'}</dd>
                                    </div>
                                </dl>
                            </div>
                        )}
                    </Card>

                    <Card
                        title="Item yang Ditagihkan"
                        titleLevel={2}
                        subtitle="Item dari seluruh pengajuan pada Job ini digabung. Item yang sudah berada di invoice lain tidak dapat dipilih."
                        actions={form.data.port_call_id ? (
                            <span aria-live="polite" className="rounded-full bg-[#E0F0FF] px-2.5 py-1 text-[11px] font-bold text-[#0057D9] dark:bg-[#0060F4]/20 dark:text-[#60A5FA]">
                                {selectedItems.length} dipilih
                            </span>
                        ) : null}
                        padding="none"
                    >
                        <div className="hidden p-3 sm:p-4 md:block">
                            <Table
                                data={jobItems}
                                columns={columns}
                                keyExtractor={(item) => item.id}
                                selectable
                                selectedKeys={form.data.request_item_ids}
                                isRowSelectable={(item) => !itemUnavailableReason(item)}
                                onSelectRow={(key, selected) => {
                                    const item = jobItems.find((candidate) => candidate.id === String(key));
                                    if (item) toggleItem(item, selected);
                                }}
                                onSelectAll={selectAll}
                                compact
                                minWidth="900px"
                                emptyMessage={form.data.port_call_id ? 'Data Tidak Ditemukan' : 'Pilih Job untuk melihat item'}
                            />
                        </div>
                        <div className="space-y-2 p-3 md:hidden">
                            {jobItems.length > 0 ? jobItems.map((item) => {
                                const unavailableReason = itemUnavailableReason(item);
                                const isSelected = form.data.request_item_ids.includes(item.id);
                                return (
                                    <div key={item.id} className={`rounded-xl border p-3 ${unavailableReason ? 'border-[#DCEAF8] bg-[#F8FBFF] opacity-70 dark:border-[#1E3A5F] dark:bg-[#071322]' : 'border-[#B9D9FF] bg-white dark:border-[#285585] dark:bg-[#0C1D36]'}`}>
                                        <Checkbox
                                            id={`invoice-item-${item.id}`}
                                            checked={isSelected}
                                            disabled={Boolean(unavailableReason)}
                                            onChange={(event) => toggleItem(item, event.target.checked)}
                                            label={item.item_name}
                                            description={`${item.request_number} · ${Number(item.quantity).toLocaleString('id-ID')} ${item.unit}`}
                                        />
                                        {isSelected && <div className="mt-3"><MoneyInput name={`item_prices[${item.id}]`} autoComplete="off" label="Harga jual akhir" value={form.data.item_prices[item.id] || ''} onChange={(value) => updatePrice(item.id, value)} error={errors[`item_prices.${item.id}`]} /></div>}
                                        <div className="mt-2 flex items-center justify-between gap-3 text-xs"><span className="text-[#52658E]">Subtotal</span><span className="font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(Number(form.data.item_prices[item.id] || item.selling_price) * Number(item.quantity))}</span></div>
                                        {unavailableReason && <p className="mt-2 text-[11px] font-semibold text-[#A65300]">{unavailableReason}</p>}
                                    </div>
                                );
                            }) : <p className="rounded-xl border border-dashed border-[#DCEAF8] px-4 py-8 text-center text-sm font-semibold text-[#52658E] dark:border-[#1E3A5F]">{form.data.port_call_id ? 'Data Tidak Ditemukan' : 'Pilih Job untuk melihat item'}</p>}
                        </div>
                        {form.errors.request_item_ids && <p role="alert" className="px-4 pb-4 text-xs font-semibold text-[#C62840]">{form.errors.request_item_ids}</p>}
                    </Card>

                    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <Card title="Rincian Tagihan" titleLevel={2} subtitle="Tambahan dan jatuh tempo invoice." padding="none">
                            <div className="p-4 sm:p-5">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <MoneyInput name="addon_total" autoComplete="off" label="Materai / Addon" value={form.data.addon_total} onChange={(value) => form.setData('addon_total', value)} error={form.errors.addon_total} />
                                    <MoneyInput name="tax" autoComplete="off" label="Pajak" value={form.data.tax} onChange={(value) => form.setData('tax', value)} error={form.errors.tax} />
                                    <div className="sm:col-span-2">
                                        <Input required name="due_date" autoComplete="off" label="Tanggal Jatuh Tempo" type="date" value={form.data.due_date} onChange={(event) => form.setData('due_date', event.target.value)} error={form.errors.due_date} />
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#DCEAF8] bg-[#DCEAF8] dark:border-[#1E3A5F] dark:bg-[#1E3A5F]">
                                    <div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Item</p><p className="mt-1 font-bold tabular-nums">{selectedItems.length}</p></div>
                                    <div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Subtotal</p><p className="mt-1 font-bold tabular-nums">{money(subtotal)}</p></div>
                                    <div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Tambahan</p><p className="mt-1 font-bold tabular-nums">{money(Number(form.data.addon_total || 0) + Number(form.data.tax || 0))}</p></div>
                                    <div aria-live="polite" className="bg-[#E0F0FF] p-3 dark:bg-[#0060F4]/15"><p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Total Invoice</p><p className="mt-1 font-extrabold tabular-nums text-[#0060F4] dark:text-[#60A5FA]">{money(grandTotal)}</p></div>
                                </div>
                            </div>
                        </Card>

                        <Card title="Catatan dan Dokumen Pendukung" titleLevel={2} subtitle="Dokumen tambahan bersifat opsional." padding="none">
                            <div className="space-y-4 p-4 sm:p-5">
                                <Textarea name="notes" autoComplete="off" label="Keterangan" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} rows={3} maxLength={1000} showCharCount error={form.errors.notes} />
                                {invoice?.supporting_document_path && <div className="rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]"><p className="mb-2 text-xs font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">Dokumen pendukung saat ini</p><DocumentActions viewHref={`/invoices/${invoice.id}/documents/supporting?view=1`} downloadHref={`/invoices/${invoice.id}/documents/supporting`} /></div>}
                                <PhotoUploadPicker
                                    label={invoice?.supporting_document_path ? 'Ganti dokumen pendukung (opsional)' : 'Dokumen pendukung (opsional)'}
                                    value={form.data.supporting_document}
                                    onChange={(file) => form.setData('supporting_document', file)}
                                    mode="gallery"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    maxSizeMb={10}
                                    variant="compact"
                                    error={form.errors.supporting_document}
                                    helperText="PDF, Word, JPG, JPEG, atau PNG. Maksimal 10 MB."
                                />
                            </div>
                        </Card>
                    </div>

                    <div className="flex flex-col-reverse gap-2 rounded-2xl border border-[#DCEAF8] bg-white p-3 shadow-[0_2px_12px_rgba(8,40,112,0.04)] sm:flex-row sm:justify-end dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                        <Link href="/invoices" className={getButtonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}>Batal</Link>
                        <Button className="w-full sm:w-auto" type="submit" isLoading={form.processing}>{invoice ? 'Perbarui Invoice' : 'Simpan Invoice Draft'}</Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
