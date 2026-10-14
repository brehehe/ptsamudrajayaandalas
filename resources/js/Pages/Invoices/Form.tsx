import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Building2, CopyPlus, FileText, ListTree, Merge, Plus, Ship as ShipIcon, Trash2 } from 'lucide-react';
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
interface SourceItem {
    id: string;
    request_id: string;
    request_number: string;
    item_name: string;
    vendor_name?: string | null;
    quantity: string;
    unit: string;
    hpp_unit_price: string;
    hpp_total: string;
    default_price: string;
    billing_type: 'agency' | 'reimburse';
    unavailable_reason?: string | null;
}
interface ShipRequest {
    id: string;
    request_number: string;
    port_call_id: string;
    items: SourceItem[];
}
interface InvoiceLine {
    key: string;
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
    source_item_ids: string[];
    is_custom: boolean;
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
    lines: Array<Omit<InvoiceLine, 'key' | 'is_custom'>>;
}
interface Props {
    companies: Company[];
    portCalls: PortCall[];
    shipRequests: ShipRequest[];
    invoice?: EditingInvoice | null;
    initialPortCallId?: string | null;
}

const money = (value: number | string) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value || 0));
const lineKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const invoiceLineTotal = (line: Pick<InvoiceLine, 'quantity' | 'unit_price'>): number =>
    Math.max(0, Math.round(Number(line.quantity || 0) * Number(line.unit_price || 0)));
const allocateWholeRupiah = (total: number, weights: number[]): number[] => {
    const roundedTotal = Math.max(0, Math.round(total));
    const normalizedWeights = weights.map((weight) => Number.isFinite(weight) && weight > 0 ? weight : 0);
    const weightTotal = normalizedWeights.reduce((sum, weight) => sum + weight, 0);
    const effectiveWeights = weightTotal > 0 ? normalizedWeights : weights.map(() => 1);
    const effectiveTotal = effectiveWeights.reduce((sum, weight) => sum + weight, 0);
    let allocated = 0;

    return effectiveWeights.map((weight, index) => {
        if (index === effectiveWeights.length - 1) {
            return roundedTotal - allocated;
        }

        const share = Math.floor((roundedTotal * weight) / effectiveTotal);
        allocated += share;

        return share;
    });
};

export default function InvoiceForm({ companies, portCalls, shipRequests, invoice = null, initialPortCallId = null }: Props) {
    const initialJob = portCalls.find((portCall) => portCall.id === (invoice?.port_call_id || initialPortCallId));
    const [companyId, setCompanyId] = useState(invoice?.company_id || initialJob?.company_id || '');
    const [shipId, setShipId] = useState(initialJob?.ship?.id || '');
    const initialLines: InvoiceLine[] = (invoice?.lines || []).map((line) => ({
        ...line, key: lineKey(), is_custom: line.source_item_ids.length === 0,
    }));
    const form = useForm({
        port_call_id: invoice?.port_call_id || initialPortCallId || '',
        company_id: invoice?.company_id || initialJob?.company_id || '',
        invoice_type: invoice?.invoice_type || 'agency',
        lines: initialLines,
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
    const selectedJob = useMemo(() => portCalls.find((portCall) => portCall.id === form.data.port_call_id), [form.data.port_call_id, portCalls]);
    const jobItems = useMemo(
        () => shipRequests.filter((request) => request.port_call_id === form.data.port_call_id).flatMap((request) => request.items),
        [form.data.port_call_id, shipRequests],
    );
    const itemUnavailableReason = (item: SourceItem): string | null => {
        if (item.unavailable_reason) return item.unavailable_reason;
        if (item.billing_type !== form.data.invoice_type) return item.billing_type === 'agency' ? 'Khusus invoice Jasa Keagenan' : 'Khusus invoice Reimbursement';
        return null;
    };
    const availableItems = jobItems.filter((item) => !itemUnavailableReason(item));
    const selectedSourceIds = useMemo(() => new Set(form.data.lines.flatMap((line) => line.source_item_ids)), [form.data.lines]);
    const subtotal = form.data.lines.reduce((total, line) => total + Number(line.unit_price || 0) * Number(line.quantity || 0), 0);
    const grandTotal = subtotal + Number(form.data.addon_total || 0) + Number(form.data.tax || 0);
    const sourceUsageCounts = useMemo(() => form.data.lines
        .flatMap((line) => Array.from(new Set(line.source_item_ids)))
        .reduce<Record<string, number>>((counts, sourceId) => ({ ...counts, [sourceId]: (counts[sourceId] || 0) + 1 }), {}), [form.data.lines]);
    const lineHpp = (line: InvoiceLine) => line.source_item_ids.reduce((total, sourceId) => {
        const source = jobItems.find((item) => item.id === sourceId);
        return total + (Number(source?.hpp_total || 0) / (sourceUsageCounts[sourceId] || 1));
    }, 0);
    const totalHpp = Array.from(selectedSourceIds).reduce((total, sourceId) => {
        const source = jobItems.find((item) => item.id === sourceId);
        return total + Number(source?.hpp_total || 0);
    }, 0);
    const estimatedMargin = grandTotal - totalHpp;

    useEffect(() => {
        const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
            if (!form.isDirty || form.processing) {
                return;
            }

            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', warnAboutUnsavedChanges);

        return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
    }, [form.isDirty, form.processing]);

    const toggleSource = (item: SourceItem, selected: boolean) => {
        if (selected) {
            if (selectedSourceIds.has(item.id)) return;
            form.setData('lines', [...form.data.lines, {
                key: lineKey(), description: item.item_name, quantity: item.quantity, unit: item.unit || 'Paket',
                unit_price: item.default_price || '', source_item_ids: [item.id], is_custom: false,
            }]);
            return;
        }
        form.setData('lines', form.data.lines
            .map((line) => ({ ...line, source_item_ids: line.source_item_ids.filter((id) => id !== item.id) }))
            .filter((line) => line.is_custom || line.source_item_ids.length > 0));
    };

    const selectAllSources = (selected: boolean) => {
        if (!selected) {
            form.setData('lines', form.data.lines.filter((line) => line.is_custom));
            return;
        }
        const additions = availableItems.filter((item) => !selectedSourceIds.has(item.id)).map((item): InvoiceLine => ({
            key: lineKey(), description: item.item_name, quantity: item.quantity, unit: item.unit || 'Paket',
            unit_price: item.default_price || '', source_item_ids: [item.id], is_custom: false,
        }));
        form.setData('lines', [...form.data.lines, ...additions]);
    };

    const updateLine = (index: number, field: keyof Pick<InvoiceLine, 'description' | 'quantity' | 'unit' | 'unit_price'>, value: string) => {
        form.setData('lines', form.data.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
    };
    const removeLine = (index: number) => form.setData('lines', form.data.lines.filter((_, lineIndex) => lineIndex !== index));
    const addCustomLine = () => form.setData('lines', [...form.data.lines, {
        key: lineKey(), description: '', quantity: '1', unit: 'Paket', unit_price: '', source_item_ids: [], is_custom: true,
    }]);
    const splitLine = (index: number) => {
        const line = form.data.lines[index];
        const [firstTotal, secondTotal] = allocateWholeRupiah(invoiceLineTotal(line), [1, 1]);
        const splitLines: InvoiceLine[] = [firstTotal, secondTotal].map((lineTotal, splitIndex) => ({
            ...line,
            key: lineKey(),
            description: `${line.description} (Bagian ${splitIndex + 1})`,
            quantity: '1',
            unit: 'Paket',
            unit_price: String(lineTotal),
        }));

        form.setData('lines', form.data.lines.flatMap((current, lineIndex) => lineIndex === index ? splitLines : [current]));
    };
    const mergeWithPrevious = (index: number) => {
        if (index < 1) return;
        const previous = form.data.lines[index - 1];
        const current = form.data.lines[index];
        const merged: InvoiceLine = {
            ...previous,
            description: `${previous.description} & ${current.description}`,
            quantity: '1', unit: 'Paket',
            unit_price: String(invoiceLineTotal(previous) + invoiceLineTotal(current)),
            source_item_ids: Array.from(new Set([...previous.source_item_ids, ...current.source_item_ids])),
            is_custom: previous.is_custom && current.is_custom,
        };
        form.setData('lines', form.data.lines.flatMap((line, lineIndex) => lineIndex === index - 1 ? [merged] : lineIndex === index ? [] : [line]));
    };
    const mergeSelectedSources = () => {
        const sourceLines = form.data.lines.filter((line) => line.source_item_ids.length > 0);
        if (sourceLines.length < 2) return;
        const sourceIds = Array.from(new Set(sourceLines.flatMap((line) => line.source_item_ids)));
        const sourceItems = sourceIds.map((sourceId) => jobItems.find((item) => item.id === sourceId)).filter((item): item is SourceItem => Boolean(item));
        const isClearanceIn = sourceItems.some((item) => /taktis penyandaran|epb/i.test(item.item_name));
        const hasClearanceIn = sourceItems.some((item) => /clearance in/i.test(item.item_name));
        const hasClearanceOut = sourceItems.some((item) => /clearance out/i.test(item.item_name));
        const title = hasClearanceIn && hasClearanceOut
            ? 'Clearance In & Clearance Out'
            : isClearanceIn ? 'Clearance In' : 'Paket Tagihan';
        const combinedTotal = sourceLines.reduce((total, line) => total + invoiceLineTotal(line), 0);
        const merged: InvoiceLine = {
            key: lineKey(),
            description: `${title}\n${sourceItems.map((item) => `- ${item.item_name}`).join('\n')}`,
            quantity: '1',
            unit: 'Paket',
            unit_price: String(combinedTotal || ''),
            source_item_ids: sourceIds,
            is_custom: false,
        };
        form.setData('lines', [merged, ...form.data.lines.filter((line) => line.source_item_ids.length === 0)]);
    };
    const expandSourceLine = (index: number) => {
        const line = form.data.lines[index];
        const sources = line.source_item_ids.map((sourceId) => jobItems.find((item) => item.id === sourceId)).filter((item): item is SourceItem => Boolean(item));
        if (sources.length < 2) return;
        const allocations = allocateWholeRupiah(
            invoiceLineTotal(line),
            sources.map((source) => Number(source.hpp_total || 0)),
        );
        const expanded = sources.map((source, sourceIndex): InvoiceLine => ({
            key: lineKey(),
            description: source.item_name,
            quantity: '1',
            unit: 'Paket',
            unit_price: String(allocations[sourceIndex]),
            source_item_ids: [source.id],
            is_custom: false,
        }));
        form.setData('lines', form.data.lines.flatMap((current, lineIndex) => lineIndex === index ? expanded : [current]));
    };
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (invoice) {
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(`/invoices/${invoice.id}`, { forceFormData: true, onFinish: () => form.transform((data) => data) });
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
                        <p className="mt-1 max-w-3xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">Susun nama dan nilai baris tagihan secara fleksibel. HPP sumber tetap tersimpan sebagai informasi internal.</p>
                    </div>
                    <Link href="/invoices" className={getButtonClassName({ variant: 'outline', className: 'w-full sm:w-auto' })}>Kembali</Link>
                </div>

                <form noValidate onSubmit={submit} className="space-y-4">
                    <FormErrorSummary errors={form.errors} />
                    <Card title="Jenis dan Job Invoice" titleLevel={2} subtitle="Pilihan Job mengikuti perusahaan dan kapal pada SPK." padding="none">
                        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
                            <SelectSearch required name="invoice_type" label="Tipe Invoice" value={form.data.invoice_type} onChange={(value) => form.setData((data) => ({ ...data, invoice_type: String(value) as 'agency' | 'reimburse', lines: [] }))} options={[{ value: 'agency', label: 'Jasa Keagenan' }, { value: 'reimburse', label: 'Reimbursement' }]} clearable={false} error={form.errors.invoice_type} />
                            <SelectSearch required name="company_id" label="Perusahaan" value={companyId} onChange={(value) => {
                                const nextCompanyId = String(value); setCompanyId(nextCompanyId); setShipId('');
                                form.setData((data) => ({ ...data, company_id: nextCompanyId, port_call_id: '', lines: [] }));
                            }} options={companies.map((company) => ({ value: company.id, label: company.name, icon: <Building2 aria-hidden="true" className="size-4" /> }))} placeholder="Cari perusahaan" error={form.errors.company_id} />
                            <SelectSearch required name="ship_id" label="Kapal" value={shipId} disabled={!companyId} onChange={(value) => {
                                setShipId(String(value)); form.setData((data) => ({ ...data, port_call_id: '', lines: [] }));
                            }} options={ships.map((ship) => ({ value: ship.id, label: ship.name, icon: <ShipIcon aria-hidden="true" className="size-4" /> }))} placeholder={companyId ? 'Cari kapal' : 'Pilih perusahaan dahulu'} />
                            <SelectSearch required name="port_call_id" label="Job" value={form.data.port_call_id} disabled={!shipId} onChange={(value) => {
                                const jobId = String(value); const job = portCalls.find((portCall) => portCall.id === jobId);
                                form.setData((data) => ({ ...data, port_call_id: jobId, company_id: job?.company_id || data.company_id, lines: [] }));
                            }} options={jobs.map((job) => ({ value: job.id, label: job.job_number, description: job.client_spk_number ? `SPK Klien: ${job.client_spk_number}` : 'SPK Klien belum diisi', icon: <FileText aria-hidden="true" className="size-4" /> }))} placeholder={shipId ? 'Cari nomor Job / SPK klien' : 'Pilih kapal dahulu'} error={form.errors.port_call_id} />
                        </div>
                        {selectedJob && <dl aria-live="polite" className="mx-4 mb-4 grid gap-3 rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-3 text-xs dark:border-[#1E3A5F] dark:bg-[#071322] sm:mx-5 sm:mb-5 sm:grid-cols-3">
                            <div><dt className="text-[#52658E]">Nomor SPK klien</dt><dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-white" translate="no">{selectedJob.client_spk_number || 'Belum diisi'}</dd></div>
                            <div><dt className="text-[#52658E]">Kapal</dt><dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-white">{selectedJob.ship?.name || '-'}</dd></div>
                            <div><dt className="text-[#52658E]">Pelabuhan</dt><dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-white">{selectedJob.port?.name || '-'}</dd></div>
                        </dl>}
                    </Card>

                    <Card title="Sumber Biaya" titleLevel={2} subtitle="Pilih item pengajuan yang menjadi dasar tagihan. Item yang sudah dipakai invoice lain tidak dapat dipilih." padding="none" actions={availableItems.length > 0 ? <Checkbox id="select-all-invoice-sources" checked={availableItems.every((item) => selectedSourceIds.has(item.id))} onChange={(event) => selectAllSources(event.target.checked)} label="Pilih semua" /> : null}>
                        <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                            {jobItems.map((item) => {
                                const unavailableReason = itemUnavailableReason(item);
                                return <div key={item.id} className={`rounded-xl border p-3 ${unavailableReason ? 'border-[#DCEAF8] bg-[#F8FBFF] opacity-70 dark:border-[#1E3A5F] dark:bg-[#071322]' : 'border-[#B9D9FF] bg-white dark:border-[#285585] dark:bg-[#0C1D36]'}`}>
                                    <Checkbox id={`invoice-source-${item.id}`} checked={selectedSourceIds.has(item.id)} disabled={Boolean(unavailableReason)} onChange={(event) => toggleSource(item, event.target.checked)} label={item.item_name} description={`${item.request_number} · ${Number(item.quantity).toLocaleString('id-ID')} ${item.unit}`} />
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]"><span className="text-[#52658E]">{item.vendor_name || 'Tanpa vendor'}</span><span className="font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">HPP {money(item.hpp_total)}</span>{!unavailableReason && <StatusBadge status="Aktif" label="Siap" size="sm" />}</div>
                                    {unavailableReason && <p className="mt-2 text-[11px] font-semibold text-[#A65300]">{unavailableReason}</p>}
                                </div>;
                            })}
                            {jobItems.length === 0 && <p className="rounded-xl border border-dashed border-[#DCEAF8] px-4 py-8 text-center text-sm font-semibold text-[#52658E] dark:border-[#1E3A5F] sm:col-span-2 xl:col-span-3">{form.data.port_call_id ? 'Data Tidak Ditemukan' : 'Pilih Job untuk melihat item'}</p>}
                        </div>
                    </Card>

                    <Card title="Rincian Invoice" titleLevel={2} subtitle="Nama, kuantitas, satuan, dan harga jual dapat disesuaikan. Gabungkan atau pecah baris tanpa kehilangan sumber biaya." padding="none" actions={<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={mergeSelectedSources} disabled={form.data.lines.filter((line) => line.source_item_ids.length > 0).length < 2}><Merge aria-hidden="true" className="size-4" /> Gabungkan Terpilih</Button><Button type="button" variant="outline" size="sm" onClick={addCustomLine}><Plus aria-hidden="true" className="size-4" /> Tambah Baris</Button></div>}>
                        <div className="space-y-3 p-4 sm:p-5">
                            {form.data.lines.map((line, index) => {
                                const sourceNames = line.source_item_ids.map((sourceId) => jobItems.find((item) => item.id === sourceId)?.item_name).filter(Boolean);
                                const lineTotal = Number(line.quantity || 0) * Number(line.unit_price || 0);
                                const hpp = lineHpp(line);
                                const margin = lineTotal - hpp;
                                return <section key={line.key} className="rounded-2xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#0C1D36] sm:p-4">
                                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0"><p className="text-xs font-extrabold text-[#0B1F63] dark:text-white">Baris {index + 1}</p><p className="mt-0.5 break-words text-[11px] text-[#52658E]">{sourceNames.length > 0 ? `Sumber: ${sourceNames.join(', ')}` : 'Baris tambahan tanpa sumber biaya baru'}</p></div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {index > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => mergeWithPrevious(index)} aria-label={`Gabungkan baris ${index + 1} dengan baris sebelumnya`}><Merge aria-hidden="true" className="size-4" /> Gabung</Button>}
                                            {line.source_item_ids.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => expandSourceLine(index)} aria-label={`Jadikan baris ${index + 1} rincian per item`}><ListTree aria-hidden="true" className="size-4" /> Jadikan Rinci</Button>}
                                            <Button type="button" variant="ghost" size="sm" onClick={() => splitLine(index)} aria-label={`Pecah baris ${index + 1} menjadi dua tanpa mengubah total harga jual`}><CopyPlus aria-hidden="true" className="size-4" /> Pecah</Button>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)} aria-label={`Hapus baris ${index + 1}`}><Trash2 aria-hidden="true" className="size-4" /> Hapus</Button>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_8rem_9rem_minmax(12rem,1fr)]">
                                        <Textarea required name={`lines[${index}][description]`} autoComplete="off" label="Nama / deskripsi item invoice" value={line.description} onChange={(event) => updateLine(index, 'description', event.target.value)} rows={3} maxLength={255} error={errors[`lines.${index}.description`]} />
                                        <Input required name={`lines[${index}][quantity]`} autoComplete="off" label="Qty" type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} error={errors[`lines.${index}.quantity`]} />
                                        <Input required name={`lines[${index}][unit]`} autoComplete="off" label="Satuan" value={line.unit} onChange={(event) => updateLine(index, 'unit', event.target.value)} error={errors[`lines.${index}.unit`]} />
                                        <MoneyInput required name={`lines[${index}][unit_price]`} autoComplete="off" label="Harga jual akhir" value={line.unit_price} onChange={(value) => updateLine(index, 'unit_price', value)} error={errors[`lines.${index}.unit_price`]} />
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#F0F8FF] p-2.5 text-right dark:bg-[#071322]">
                                        <div><p className="text-[10px] font-semibold text-[#52658E]">HPP sumber</p><p className="text-xs font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(hpp)}</p></div>
                                        <div><p className="text-[10px] font-semibold text-[#52658E]">Harga jual</p><p className="text-xs font-bold tabular-nums text-[#0060F4]">{money(lineTotal)}</p></div>
                                        <div><p className="text-[10px] font-semibold text-[#52658E]">Margin</p><p className={`text-xs font-extrabold tabular-nums ${margin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#C62840]'}`}>{money(margin)}</p></div>
                                    </div>
                                </section>;
                            })}
                            {form.data.lines.length === 0 && <p className="rounded-xl border border-dashed border-[#DCEAF8] px-4 py-8 text-center text-sm font-semibold text-[#52658E] dark:border-[#1E3A5F]">Pilih sumber biaya atau tambahkan baris invoice.</p>}
                            {form.errors.lines && <p role="alert" className="text-xs font-semibold text-[#C62840]">{form.errors.lines}</p>}
                        </div>
                    </Card>

                    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <Card title="Ringkasan Tagihan" titleLevel={2} subtitle="Tambahan, jatuh tempo, dan total akhir." padding="none"><div className="p-4 sm:p-5">
                            <div className="grid gap-3 sm:grid-cols-2"><MoneyInput name="addon_total" autoComplete="off" label="Materai / Addon" value={form.data.addon_total} onChange={(value) => form.setData('addon_total', value)} error={form.errors.addon_total} /><MoneyInput name="tax" autoComplete="off" label="Pajak" value={form.data.tax} onChange={(value) => form.setData('tax', value)} error={form.errors.tax} /><div className="sm:col-span-2"><Input required name="due_date" autoComplete="off" label="Tanggal Jatuh Tempo" type="date" value={form.data.due_date} onChange={(event) => form.setData('due_date', event.target.value)} error={form.errors.due_date} /></div></div>
                            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#DCEAF8] bg-[#DCEAF8] sm:grid-cols-3 dark:border-[#1E3A5F] dark:bg-[#1E3A5F]"><div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E]">Baris</p><p className="mt-1 font-bold tabular-nums">{form.data.lines.length}</p></div><div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E]">Subtotal</p><p className="mt-1 font-bold tabular-nums">{money(subtotal)}</p></div><div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E]">Tambahan</p><p className="mt-1 font-bold tabular-nums">{money(Number(form.data.addon_total || 0) + Number(form.data.tax || 0))}</p></div><div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E]">Total HPP</p><p className="mt-1 font-bold tabular-nums">{money(totalHpp)}</p></div><div aria-live="polite" className="bg-[#E0F0FF] p-3 dark:bg-[#0060F4]/15"><p className="text-[11px] text-[#52658E]">Total Invoice</p><p className="mt-1 font-extrabold tabular-nums text-[#0060F4]">{money(grandTotal)}</p></div><div aria-live="polite" className={`${estimatedMargin >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'} p-3`}><p className="text-[11px] text-[#52658E]">Estimasi Margin</p><p className={`mt-1 font-extrabold tabular-nums ${estimatedMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#C62840]'}`}>{money(estimatedMargin)}</p></div></div>
                        </div></Card>
                        <Card title="Catatan dan Dokumen Pendukung" titleLevel={2} subtitle="Dokumen tambahan bersifat opsional." padding="none"><div className="space-y-4 p-4 sm:p-5">
                            <Textarea name="notes" autoComplete="off" label="Keterangan" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} rows={3} maxLength={1000} showCharCount error={form.errors.notes} />
                            {invoice?.supporting_document_path && <div className="rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]"><p className="mb-2 text-xs font-semibold text-[#0B1F63] dark:text-white">Dokumen pendukung saat ini</p><DocumentActions viewHref={`/invoices/${invoice.id}/documents/supporting?view=1`} downloadHref={`/invoices/${invoice.id}/documents/supporting`} /></div>}
                            <PhotoUploadPicker label={invoice?.supporting_document_path ? 'Ganti dokumen pendukung (opsional)' : 'Dokumen pendukung (opsional)'} value={form.data.supporting_document} onChange={(file) => form.setData('supporting_document', file)} mode="gallery" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={form.errors.supporting_document} helperText="PDF, Word, JPG, JPEG, atau PNG. Maksimal 10 MB." />
                        </div></Card>
                    </div>
                    <div className="flex flex-col-reverse gap-2 rounded-2xl border border-[#DCEAF8] bg-white p-3 shadow-[0_2px_12px_rgba(8,40,112,0.04)] sm:flex-row sm:justify-end dark:border-[#1E3A5F] dark:bg-[#0C1D36]"><Link href="/invoices" className={getButtonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}>Batal</Link><Button className="w-full sm:w-auto" type="submit" isLoading={form.processing}>{invoice ? 'Perbarui Invoice' : 'Simpan Invoice Draft'}</Button></div>
                </form>
            </div>
        </AppLayout>
    );
}
