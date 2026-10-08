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
import { toDateInputValue } from '../../lib/formatDate';

interface Company {
    id: string;
    name: string;
}

interface PortCall {
    id: string;
    job_number: string;
    client_spk_number?: string | null;
    company_id?: string | null;
    company?: Company | null;
    ship?: { id: string; name: string } | null;
    port?: { id: string; name: string } | null;
}

interface RequestItem {
    id: string;
    item_name: string;
    quantity: number | string;
    unit?: string | null;
    hpp_price: number | string;
    vendor_id?: string | null;
    vendor?: { id: string; name: string } | null;
    request?: { request_number: string; port_call_id: string } | null;
}

interface Props {
    companies: Company[];
    portCalls: PortCall[];
    availableRequestItems: RequestItem[];
    vendors: Array<{ id: string; name: string }>;
}

const money = (value: number | string) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(Number(value || 0));

export default function VendorInvoiceCreate({ companies, portCalls, availableRequestItems, vendors }: Props) {
    const [companyId, setCompanyId] = useState('');
    const [shipId, setShipId] = useState('');
    const form = useForm({
        port_call_id: '',
        vendor_id: '',
        document_number: '',
        document_date: toDateInputValue(),
        received_date: toDateInputValue(),
        due_date: '',
        request_item_ids: [] as string[],
        tax_amount: '0',
        notes: '',
        document: null as File | null,
    });

    const ships = useMemo(() => {
        const unique = new Map<string, { id: string; name: string }>();
        portCalls
            .filter((portCall) => !companyId || portCall.company_id === companyId)
            .forEach((portCall) => {
                if (portCall.ship) unique.set(portCall.ship.id, portCall.ship);
            });

        return Array.from(unique.values());
    }, [companyId, portCalls]);
    const jobs = useMemo(
        () => portCalls.filter((portCall) => (!companyId || portCall.company_id === companyId)
            && (!shipId || portCall.ship?.id === shipId)),
        [companyId, portCalls, shipId],
    );
    const selectedJob = useMemo(
        () => portCalls.find((portCall) => portCall.id === form.data.port_call_id),
        [form.data.port_call_id, portCalls],
    );
    const items = useMemo(
        () => availableRequestItems.filter((item) => item.request?.port_call_id === form.data.port_call_id
            && (!form.data.vendor_id || !item.vendor_id || item.vendor_id === form.data.vendor_id)),
        [availableRequestItems, form.data.port_call_id, form.data.vendor_id],
    );
    const selectedItems = items.filter((item) => form.data.request_item_ids.includes(item.id));
    const subtotal = selectedItems.reduce(
        (total, item) => total + Number(item.hpp_price) * Number(item.quantity),
        0,
    );

    const toggleItem = (itemId: string, selected: boolean) => {
        form.setData('request_item_ids', selected
            ? [...form.data.request_item_ids, itemId]
            : form.data.request_item_ids.filter((id) => id !== itemId));
    };

    const columns: Column<RequestItem>[] = [
        {
            key: 'item',
            header: 'Item Pengajuan',
            wrap: 'normal',
            render: (item) => (
                <div>
                    <p className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{item.item_name}</p>
                    <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">{item.request?.request_number || 'Pengajuan'}</p>
                </div>
            ),
        },
        { key: 'quantity', header: 'Qty', render: (item) => <span className="tabular-nums">{Number(item.quantity).toLocaleString('id-ID')} {item.unit || 'Paket'}</span> },
        { key: 'vendor', header: 'Vendor Item', wrap: 'normal', render: (item) => item.vendor?.name || 'Mengikuti vendor invoice' },
        { key: 'hpp', header: 'HPP', align: 'right', render: (item) => <span className="tabular-nums font-semibold">{money(item.hpp_price)}</span> },
        { key: 'subtotal', header: 'Subtotal', align: 'right', render: (item) => <span className="tabular-nums font-bold">{money(Number(item.hpp_price) * Number(item.quantity))}</span> },
    ];

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post('/vendor-invoices', { forceFormData: true });
    };

    return (
        <AppLayout title="Catat Invoice Vendor">
            <Head title="Catat Invoice Vendor — PT Samudra Jaya Andalas" />
            <div className="mx-auto max-w-6xl space-y-4 pb-12">
                <div className="flex flex-col gap-3 border-b border-[#DCEAF8] pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3A5F]">
                    <div className="min-w-0">
                        <h1 className="text-balance text-2xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">Catat Invoice Vendor</h1>
                        <p className="mt-1 max-w-2xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">Pilih Job dan item pengajuan yang benar-benar tercantum pada dokumen vendor.</p>
                    </div>
                    <Link href="/vendor-invoices" className={getButtonClassName({ variant: 'outline', className: 'w-full sm:w-auto' })}>Kembali</Link>
                </div>

                <form noValidate onSubmit={submit} className="space-y-4">
                    <FormErrorSummary errors={form.errors} />

                    <Card title="Pilih Job" titleLevel={2} subtitle="Urutan perusahaan, kapal, lalu Job membantu mempersempit data." padding="none">
                        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-3">
                            <SelectSearch
                                required
                                name="company_id"
                                label="Perusahaan"
                                value={companyId}
                                onChange={(value) => {
                                    setCompanyId(String(value));
                                    setShipId('');
                                    form.setData((data) => ({ ...data, port_call_id: '', request_item_ids: [] }));
                                }}
                                options={companies.map((company) => ({ value: company.id, label: company.name, icon: <Building2 aria-hidden="true" className="size-4" /> }))}
                                placeholder="Cari perusahaan"
                            />
                            <SelectSearch
                                required
                                name="ship_id"
                                label="Kapal"
                                value={shipId}
                                onChange={(value) => {
                                    setShipId(String(value));
                                    form.setData((data) => ({ ...data, port_call_id: '', request_item_ids: [] }));
                                }}
                                disabled={!companyId}
                                options={ships.map((ship) => ({ value: ship.id, label: ship.name, icon: <ShipIcon aria-hidden="true" className="size-4" /> }))}
                                placeholder={companyId ? 'Cari kapal' : 'Pilih perusahaan dahulu'}
                            />
                            <SelectSearch
                                required
                                name="port_call_id"
                                label="Job"
                                value={form.data.port_call_id}
                                onChange={(value) => form.setData((data) => ({ ...data, port_call_id: String(value), request_item_ids: [] }))}
                                disabled={!shipId}
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
                                <dl aria-live="polite" className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
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

                    <Card title="Dokumen Invoice" titleLevel={2} subtitle="Data berikut mengikuti dokumen yang diterima dari vendor." padding="none">
                        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
                            <SelectSearch
                                required
                                name="vendor_id"
                                label="Vendor"
                                value={form.data.vendor_id}
                                onChange={(value) => form.setData((data) => ({ ...data, vendor_id: String(value), request_item_ids: [] }))}
                                options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))}
                                placeholder="Cari vendor"
                                error={form.errors.vendor_id}
                            />
                            <Input required name="document_number" autoComplete="off" label="Nomor Invoice" value={form.data.document_number} onChange={(event) => form.setData('document_number', event.target.value)} error={form.errors.document_number} />
                            <Input required name="document_date" autoComplete="off" label="Tanggal Invoice" type="date" value={form.data.document_date} onChange={(event) => form.setData('document_date', event.target.value)} error={form.errors.document_date} />
                            <Input required name="received_date" autoComplete="off" label="Tanggal Diterima" type="date" value={form.data.received_date} onChange={(event) => form.setData('received_date', event.target.value)} error={form.errors.received_date} />
                            <Input name="due_date" autoComplete="off" label="Jatuh Tempo" type="date" value={form.data.due_date} onChange={(event) => form.setData('due_date', event.target.value)} error={form.errors.due_date} />
                            <MoneyInput name="tax_amount" autoComplete="off" label="Pajak" value={form.data.tax_amount} onChange={(value) => form.setData('tax_amount', value)} error={form.errors.tax_amount} />
                        </div>
                    </Card>

                    <Card
                        title="Item Invoice"
                        titleLevel={2}
                        subtitle="Item yang sudah dipakai dokumen biaya lain otomatis tidak tersedia."
                        actions={form.data.port_call_id ? (
                            <span aria-live="polite" className="rounded-full bg-[#E0F0FF] px-2.5 py-1 text-[11px] font-bold text-[#0057D9] dark:bg-[#0060F4]/20 dark:text-[#60A5FA]">
                                {selectedItems.length} dipilih
                            </span>
                        ) : null}
                        padding="none"
                    >
                        <div className="hidden p-3 sm:p-4 md:block">
                            <Table
                                data={items}
                                columns={columns}
                                keyExtractor={(item) => item.id}
                                selectable
                                selectedKeys={form.data.request_item_ids}
                                onSelectRow={(key, selected) => toggleItem(String(key), selected)}
                                onSelectAll={(selected) => form.setData('request_item_ids', selected ? items.map((item) => item.id) : [])}
                                compact
                                minWidth="760px"
                                emptyMessage={form.data.port_call_id ? 'Data Tidak Ditemukan' : 'Pilih Job untuk melihat item'}
                            />
                        </div>
                        <div className="space-y-2 p-3 md:hidden">
                            {items.length > 0 ? items.map((item) => (
                                <div key={item.id} className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]">
                                    <Checkbox
                                        id={`vendor-item-${item.id}`}
                                        checked={form.data.request_item_ids.includes(item.id)}
                                        onChange={(event) => toggleItem(item.id, event.target.checked)}
                                        label={item.item_name}
                                        description={`${Number(item.quantity).toLocaleString('id-ID')} ${item.unit || 'Paket'} · ${money(Number(item.hpp_price) * Number(item.quantity))}`}
                                    />
                                </div>
                            )) : <p className="rounded-xl border border-dashed border-[#DCEAF8] px-4 py-8 text-center text-sm font-semibold text-[#52658E] dark:border-[#1E3A5F]">{form.data.port_call_id ? 'Data Tidak Ditemukan' : 'Pilih Job untuk melihat item'}</p>}
                        </div>
                        {form.errors.request_item_ids && <p role="alert" className="px-4 pb-3 text-xs font-semibold text-[#C62840]">{form.errors.request_item_ids}</p>}
                        <div className="flex flex-col gap-1 border-t border-[#DCEAF8] bg-[#F0F8FF]/60 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3A5F] dark:bg-[#071322]/60">
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">{selectedItems.length} item dipilih</p>
                            <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Total invoice: <span className="tabular-nums text-[#0060F4] dark:text-[#60A5FA]">{money(subtotal + Number(form.data.tax_amount || 0))}</span></p>
                        </div>
                    </Card>

                    <Card title="Lampiran dan Catatan" titleLevel={2} subtitle="Unggah dokumen invoice asli dari vendor." padding="none">
                        <div className="grid items-start gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
                            <PhotoUploadPicker
                                required
                                label="Dokumen Invoice"
                                value={form.data.document}
                                onChange={(file) => form.setData('document', file)}
                                mode="gallery"
                                accept=".pdf,.jpg,.jpeg,.png"
                                maxSizeMb={10}
                                variant="compact"
                                error={form.errors.document}
                                helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB."
                            />
                            <Textarea name="notes" autoComplete="off" label="Catatan" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} rows={3} maxLength={2000} error={form.errors.notes} />
                        </div>
                    </Card>

                    <div className="flex flex-col-reverse gap-2 rounded-2xl border border-[#DCEAF8] bg-white p-3 shadow-[0_2px_12px_rgba(8,40,112,0.04)] sm:flex-row sm:justify-end dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                        <Link href="/vendor-invoices" className={getButtonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}>Batal</Link>
                        <Button className="w-full sm:w-auto" type="submit" isLoading={form.processing}>Simpan Invoice Vendor</Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
