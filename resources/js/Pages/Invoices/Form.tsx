import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Building2, CopyPlus, Eye, FileText, ListTree, Merge, Plus, Ship as ShipIcon, Trash2 } from 'lucide-react';
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
import ClientInvoiceDocument, { type ClientInvoiceDocumentSettings } from '../../Components/finance/ClientInvoiceDocument';
import { toDateInputValue } from '../../lib/formatDate';

interface Company { id: string; name: string; address?: string | null }
interface PortCall {
    id: string;
    job_number: string;
    client_spk_number?: string | null;
    company_id?: string | null;
    company?: Company | null;
    ship?: { id: string; name: string } | null;
    port?: { id: string; name: string } | null;
    eta_at?: string | null;
    etd_at?: string | null;
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
    section_title: string;
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
    allocated_hpp?: string;
    source_item_ids: string[];
    is_custom: boolean;
}
interface EditingInvoice {
    id: string;
    invoice_number: string;
    invoice_date?: string | null;
    port_call_id: string;
    company_id: string;
    invoice_type: 'agency' | 'reimburse';
    status: string;
    subject?: string | null;
    origin_port_name?: string | null;
    destination_port_name?: string | null;
    due_date: string;
    addon_total: string;
    tax: string;
    notes?: string | null;
    supporting_document_path?: string | null;
    signed_document_path?: string | null;
    lines: Array<Omit<InvoiceLine, 'key' | 'is_custom'>>;
}
interface Props {
    companies: Company[];
    portCalls: PortCall[];
    shipRequests: ShipRequest[];
    invoice?: EditingInvoice | null;
    initialPortCallId?: string | null;
    documentSettings: ClientInvoiceDocumentSettings;
    previewDate: string;
    abilities: { update: boolean };
}

const money = (value: number | string) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value || 0));
const lineKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const defaultSectionTitle = (type: 'agency' | 'reimburse'): string => type === 'agency' ? 'Biaya Keagenan' : 'Rincian Reimbursement';
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

export default function InvoiceForm({ companies, portCalls, shipRequests, invoice = null, initialPortCallId = null, documentSettings, previewDate, abilities }: Props) {
    const initialJob = portCalls.find((portCall) => portCall.id === (invoice?.port_call_id || initialPortCallId));
    const [companyId, setCompanyId] = useState(invoice?.company_id || initialJob?.company_id || '');
    const [shipId, setShipId] = useState(initialJob?.ship?.id || '');
    const initialLines: InvoiceLine[] = (invoice?.lines || []).map((line) => ({
        ...line,
        section_title: line.section_title || defaultSectionTitle(invoice?.invoice_type || 'agency'),
        key: lineKey(),
        is_custom: line.source_item_ids.length === 0,
        allocated_hpp: line.allocated_hpp !== undefined && line.allocated_hpp !== null ? String(line.allocated_hpp) : undefined,
    }));
    const form = useForm({
        port_call_id: invoice?.port_call_id || initialPortCallId || '',
        company_id: invoice?.company_id || initialJob?.company_id || '',
        invoice_type: invoice?.invoice_type || 'agency',
        subject: invoice?.subject || '',
        origin_port_name: invoice?.origin_port_name || '',
        destination_port_name: invoice?.destination_port_name || '',
        lines: initialLines,
        addon_total: invoice?.addon_total || '0',
        tax: invoice?.tax || '0',
        due_date: invoice?.due_date || toDateInputValue(14),
        notes: invoice?.notes || '',
        supporting_document: null as File | null,
    });
    const errors = form.errors as Record<string, string>;
    const [taxMode, setTaxMode] = useState<'nominal' | 'percent'>('nominal');
    const [taxPercent, setTaxPercent] = useState<string>('0');

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

    const defaultLineHpp = (line: InvoiceLine) => line.source_item_ids.reduce((total, sourceId) => {
        const source = jobItems.find((item) => item.id === sourceId);
        return total + (Number(source?.hpp_total || 0) / (sourceUsageCounts[sourceId] || 1));
    }, 0);

    const lineHpp = (line: InvoiceLine): number => {
        if (line.allocated_hpp !== undefined && line.allocated_hpp !== '') {
            return Number(line.allocated_hpp || 0);
        }
        return defaultLineHpp(line);
    };

    const totalSelectedHpp = useMemo(() => Array.from(selectedSourceIds).reduce((total, sourceId) => {
        const source = jobItems.find((item) => item.id === sourceId);
        return total + Number(source?.hpp_total || 0);
    }, 0), [selectedSourceIds, jobItems]);

    const totalAllocatedHpp = useMemo(() => form.data.lines.reduce((total, line) => {
        return total + lineHpp(line);
    }, 0), [form.data.lines, sourceUsageCounts, jobItems]);

    const hppDifference = totalAllocatedHpp - totalSelectedHpp;
    const isHppBalanced = totalSelectedHpp === 0 || Math.abs(hppDifference) < 1;
    const estimatedMargin = grandTotal - totalAllocatedHpp;
    const selectedCompany = companies.find((company) => company.id === form.data.company_id) || selectedJob?.company || null;
    const documentPreview = (
        <ClientInvoiceDocument
            type={form.data.invoice_type as 'agency' | 'reimburse'}
            documentNumber={invoice?.invoice_number || 'Nomor dibuat otomatis saat disimpan'}
            subject={form.data.subject}
            originPortName={form.data.origin_port_name}
            destinationPortName={form.data.destination_port_name}
            documentDate={invoice?.invoice_date || previewDate}
            dueDate={form.data.due_date}
            company={selectedCompany}
            job={selectedJob ? {
                jobNumber: selectedJob.job_number,
                clientSpkNumber: selectedJob.client_spk_number,
                shipName: selectedJob.ship?.name,
                portName: selectedJob.port?.name,
                etaAt: selectedJob.eta_at,
                etdAt: selectedJob.etd_at,
            } : null}
            lines={form.data.lines}
            addonTotal={Number(form.data.addon_total || 0)}
            tax={Number(form.data.tax || 0)}
            grandTotal={grandTotal}
            notes={form.data.notes}
            settings={documentSettings}
        />
    );

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

    if (invoice && !abilities.update) {
        const isFinalDocument = invoice.status !== 'draft';

        return (
            <AppLayout title={`Detail ${invoice.invoice_number}`}>
                <Head title={`Detail ${invoice.invoice_number} — PT Samudra Jaya Andalas`} />
                <div className="mx-auto max-w-5xl space-y-4 pb-24 md:pb-10">
                    <div className="flex flex-col gap-3 border-b border-[#DCEAF8] pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3A5F]">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="whitespace-normal text-2xl font-extrabold text-[#0B1F63] [overflow-wrap:anywhere] dark:text-[#F1F5F9] sm:text-3xl">{invoice.invoice_number}</h1>
                                <StatusBadge status={isFinalDocument ? 'Aktif' : 'Draft'} label={isFinalDocument ? 'Dokumen terkunci' : 'Baca saja'} />
                            </div>
                            <p className="mt-1 max-w-3xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">
                                {isFinalDocument
                                    ? 'Invoice sudah masuk alur penerbitan sehingga data sumber dan nominal tidak dapat diubah.'
                                    : 'Akun ini memiliki akses untuk melihat dokumen, tetapi tidak untuk mengubah invoice.'}
                            </p>
                        </div>
                        <Link href="/invoices" className={getButtonClassName({ variant: 'outline', className: 'w-full sm:w-auto' })}>Kembali</Link>
                    </div>

                    <div role="status" className="rounded-2xl border border-[#B9D9FF] bg-[#F0F8FF] p-4 text-sm text-[#0B1F63] dark:border-[#285585] dark:bg-[#071322] dark:text-[#E7F0FA]">
                        <p className="font-bold">Dokumen ditampilkan dalam mode baca-saja.</p>
                        <p className="mt-1 text-[#52658E] dark:text-[#B5C8DC]">Gunakan pratinjau untuk memeriksa susunan data atau unduh dokumen resmi yang tersimpan.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <DocumentActions
                                viewHref={`/invoices/${invoice.id}/generated-document?view=1`}
                                downloadHref={`/invoices/${invoice.id}/generated-document`}
                                viewLabel="Pratinjau data"
                                downloadLabel="Unduh pratinjau"
                            />
                            {invoice.signed_document_path && (
                                <DocumentActions
                                    viewHref={`/invoices/${invoice.id}/documents/signed?view=1`}
                                    downloadHref={`/invoices/${invoice.id}/documents/signed`}
                                    viewLabel="Lihat dokumen resmi"
                                    downloadLabel="Unduh dokumen resmi"
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
                        </div>
                    </div>

                    <div className="rounded-2xl bg-[#DCEAF8] p-3 dark:bg-[#071322] sm:p-5">
                        {documentPreview}
                    </div>
                </div>
            </AppLayout>
        );
    }

    const autoBalanceHpp = () => {
        if (form.data.lines.length === 0 || totalSelectedHpp <= 0) return;
        const sourceLines = form.data.lines.filter((l) => l.source_item_ids.length > 0);
        if (sourceLines.length === 0) return;
        const currentAllocations = sourceLines.map((l) => lineHpp(l));
        const balanced = allocateWholeRupiah(totalSelectedHpp, currentAllocations);
        let sourceIdx = 0;
        form.setData('lines', form.data.lines.map((line) => {
            if (line.source_item_ids.length > 0) {
                const newAlloc = String(balanced[sourceIdx++]);
                return { ...line, allocated_hpp: newAlloc };
            }
            return line;
        }));
    };

    const resetHppToDefault = () => {
        if (form.data.lines.length === 0 || totalSelectedHpp <= 0) return;
        const sourceLines = form.data.lines.filter((l) => l.source_item_ids.length > 0);
        const weights = sourceLines.map((line) => {
            return line.source_item_ids.reduce((sum, id) => {
                const src = jobItems.find((item) => item.id === id);
                return sum + Number(src?.hpp_total || 0);
            }, 0) || 1;
        });
        const balanced = allocateWholeRupiah(totalSelectedHpp, weights);
        let sourceIdx = 0;
        form.setData('lines', form.data.lines.map((line) => {
            if (line.source_item_ids.length > 0) {
                const newAlloc = String(balanced[sourceIdx++]);
                return { ...line, allocated_hpp: newAlloc };
            }
            return line;
        }));
    };

    const toggleSource = (item: SourceItem, selected: boolean) => {
        if (selected) {
            if (selectedSourceIds.has(item.id)) return;
            form.setData('lines', [...form.data.lines, {
                key: lineKey(),
                section_title: defaultSectionTitle(form.data.invoice_type),
                description: item.item_name,
                quantity: item.quantity,
                unit: item.unit || 'Paket',
                unit_price: item.default_price || '',
                allocated_hpp: String(item.hpp_total || '0'),
                source_item_ids: [item.id],
                is_custom: false,
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
            key: lineKey(),
            section_title: defaultSectionTitle(form.data.invoice_type),
            description: item.item_name,
            quantity: item.quantity,
            unit: item.unit || 'Paket',
            unit_price: item.default_price || '',
            allocated_hpp: String(item.hpp_total || '0'),
            source_item_ids: [item.id],
            is_custom: false,
        }));
        form.setData('lines', [...form.data.lines, ...additions]);
    };

    const updateLine = (index: number, field: keyof Pick<InvoiceLine, 'section_title' | 'description' | 'quantity' | 'unit' | 'unit_price' | 'allocated_hpp'>, value: string) => {
        form.setData('lines', form.data.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
    };
    const removeLine = (index: number) => form.setData('lines', form.data.lines.filter((_, lineIndex) => lineIndex !== index));
    const addCustomLine = () => form.setData('lines', [...form.data.lines, {
        key: lineKey(), section_title: defaultSectionTitle(form.data.invoice_type), description: '', quantity: '1', unit: 'Paket', unit_price: '', source_item_ids: [], is_custom: true,
    }]);
    const splitLine = (index: number) => {
        const line = form.data.lines[index];
        const currentHpp = lineHpp(line);
        const [firstHpp, secondHpp] = allocateWholeRupiah(currentHpp, [1, 1]);
        const [firstTotal, secondTotal] = allocateWholeRupiah(invoiceLineTotal(line), [1, 1]);
        const splitLines: InvoiceLine[] = [
            {
                ...line,
                key: lineKey(),
                description: `${line.description} (Bagian 1)`,
                quantity: '1',
                unit: 'Paket',
                unit_price: String(firstTotal),
                allocated_hpp: String(firstHpp),
            },
            {
                ...line,
                key: lineKey(),
                description: `${line.description} (Bagian 2)`,
                quantity: '1',
                unit: 'Paket',
                unit_price: String(secondTotal),
                allocated_hpp: String(secondHpp),
            },
        ];

        form.setData('lines', form.data.lines.flatMap((current, lineIndex) => lineIndex === index ? splitLines : [current]));
    };
    const mergeWithPrevious = (index: number) => {
        if (index < 1) return;
        const previous = form.data.lines[index - 1];
        const current = form.data.lines[index];
        const prevHpp = lineHpp(previous);
        const currHpp = lineHpp(current);
        const merged: InvoiceLine = {
            ...previous,
            description: `${previous.description} & ${current.description}`,
            quantity: '1',
            unit: 'Paket',
            unit_price: String(invoiceLineTotal(previous) + invoiceLineTotal(current)),
            allocated_hpp: String(prevHpp + currHpp),
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
        const combinedHpp = sourceLines.reduce((total, line) => total + lineHpp(line), 0);
        const merged: InvoiceLine = {
            key: lineKey(),
            section_title: sourceLines[0]?.section_title || defaultSectionTitle(form.data.invoice_type),
            description: `${title}\n${sourceItems.map((item) => `- ${item.item_name}`).join('\n')}`,
            quantity: '1',
            unit: 'Paket',
            unit_price: String(combinedTotal || ''),
            allocated_hpp: String(combinedHpp),
            source_item_ids: sourceIds,
            is_custom: false,
        };
        form.setData('lines', [merged, ...form.data.lines.filter((line) => line.source_item_ids.length === 0)]);
    };
    const expandSourceLine = (index: number) => {
        const line = form.data.lines[index];
        const sources = line.source_item_ids.map((sourceId) => jobItems.find((item) => item.id === sourceId)).filter((item): item is SourceItem => Boolean(item));
        if (sources.length < 2) return;
        const currentLineHpp = lineHpp(line);
        const allocations = allocateWholeRupiah(
            invoiceLineTotal(line),
            sources.map((source) => Number(source.hpp_total || 0)),
        );
        const hppAllocations = allocateWholeRupiah(
            currentLineHpp,
            sources.map((source) => Number(source.hpp_total || 0)),
        );
        const expanded = sources.map((source, sourceIndex): InvoiceLine => ({
            key: lineKey(),
            section_title: line.section_title,
            description: source.item_name,
            quantity: '1',
            unit: 'Paket',
            unit_price: String(allocations[sourceIndex]),
            allocated_hpp: String(hppAllocations[sourceIndex]),
            source_item_ids: [source.id],
            is_custom: false,
        }));
        form.setData('lines', form.data.lines.flatMap((current, lineIndex) => lineIndex === index ? expanded : [current]));
    };
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (totalSelectedHpp > 0 && !isHppBalanced) {
            const statusDiff = hppDifference > 0 ? 'melebihi' : 'kurang dari';
            form.setError('lines', `Total alokasi HPP baris (${money(totalAllocatedHpp)}) ${statusDiff} total HPP item terpilih (${money(totalSelectedHpp)}) sebesar ${money(Math.abs(hppDifference))}. Total alokasi HPP harus sama persis dengan HPP item terpilih (tidak boleh lebih ataupun kurang).`);
            return;
        }
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
            <div className="mx-auto max-w-[1600px] space-y-4 pb-28 md:pb-12">
                <div className="flex flex-col gap-3 border-b border-[#DCEAF8] pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3A5F]">
                    <div className="min-w-0">
                        <h1 className="whitespace-normal text-balance text-2xl font-extrabold text-[#0B1F63] [overflow-wrap:anywhere] dark:text-[#F1F5F9] sm:text-3xl">{invoice ? `Edit ${invoice.invoice_number}` : 'Susun Invoice Klien'}</h1>
                        <p className="mt-1 max-w-3xl whitespace-normal text-pretty text-sm text-[#52658E] [overflow-wrap:anywhere] dark:text-[#94A3B8]">Siapkan Invoice Jasa Keagenan atau Reimbursement dengan susunan dokumen resmi PT Samudra Jaya Andalas.</p>
                    </div>
                    <Link href="/invoices" className={getButtonClassName({ variant: 'outline', className: 'w-full sm:w-auto' })}>Kembali</Link>
                </div>

                <form noValidate onSubmit={submit} className="space-y-4">
                    <FormErrorSummary errors={form.errors} />
                    <Card title="Jenis dan Job Invoice" titleLevel={2} subtitle="Pilihan Job mengikuti perusahaan dan kapal pada SPK." padding="none">
                        <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 sm:p-5 2xl:grid-cols-4">
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
                            <div className="min-w-0"><dt className="text-[#52658E]">Nomor SPK klien</dt><dd className="mt-0.5 whitespace-normal font-bold text-[#0B1F63] [overflow-wrap:anywhere] dark:text-white" translate="no">{selectedJob.client_spk_number || 'Belum diisi'}</dd></div>
                            <div className="min-w-0"><dt className="text-[#52658E]">Kapal</dt><dd className="mt-0.5 whitespace-normal font-bold text-[#0B1F63] [overflow-wrap:anywhere] dark:text-white">{selectedJob.ship?.name || '-'}</dd></div>
                            <div className="min-w-0"><dt className="text-[#52658E]">Pelabuhan</dt><dd className="mt-0.5 whitespace-normal font-bold text-[#0B1F63] [overflow-wrap:anywhere] dark:text-white">{selectedJob.port?.name || '-'}</dd></div>
                        </dl>}
                    </Card>

                    <Card title="Identitas Dokumen" titleLevel={2} subtitle="Isikan keterangan dan rute yang akan tercetak pada Invoice atau Reimbursement." padding="none">
                        <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 sm:p-5 2xl:grid-cols-4">
                            <div className="sm:col-span-2">
                                <Input
                                    name="subject"
                                    autoComplete="off"
                                    label="Hal / keterangan"
                                    value={form.data.subject}
                                    onChange={(event) => form.setData('subject', event.target.value)}
                                    helperText={selectedJob?.ship?.name ? `Jika kosong, dokumen memakai “Keagenan ${selectedJob.ship.name}”.` : 'Jika kosong, keterangan dibuat dari tipe invoice dan kapal.'}
                                    maxLength={255}
                                    error={form.errors.subject}
                                />
                            </div>
                            <Input name="origin_port_name" autoComplete="off" label="Pelabuhan asal" value={form.data.origin_port_name} onChange={(event) => form.setData('origin_port_name', event.target.value)} maxLength={255} error={form.errors.origin_port_name} />
                            <Input name="destination_port_name" autoComplete="off" label="Pelabuhan tujuan" value={form.data.destination_port_name} onChange={(event) => form.setData('destination_port_name', event.target.value)} maxLength={255} error={form.errors.destination_port_name} />
                        </div>
                        <div className="mx-4 mb-4 min-w-0 whitespace-normal rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] px-3 py-2.5 text-xs text-[#52658E] [overflow-wrap:anywhere] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#B5C8DC] sm:mx-5 sm:mb-5">
                            Pelabuhan sandar (muat) mengikuti Job: <span className="font-bold text-[#0B1F63] dark:text-white">{selectedJob?.port?.name || 'pilih Job terlebih dahulu'}</span>. ETA/ETD dan referensi SPK juga diambil dari Job yang sama.
                        </div>
                    </Card>

                    <details className="group overflow-hidden rounded-2xl border border-[#DCEAF8] bg-white dark:border-[#1E3A5F] dark:bg-[#0C1D36] xl:hidden">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[#0B1F63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0060F4] dark:text-[#F1F5F9]">
                            <span className="inline-flex min-w-0 items-center gap-2 whitespace-normal [overflow-wrap:anywhere]"><Eye aria-hidden="true" className="size-4 shrink-0 text-[#0060F4]" /> Lihat pratinjau dokumen</span>
                            <span className="text-xs font-medium text-[#52658E] group-open:hidden">Buka</span>
                            <span className="hidden text-xs font-medium text-[#52658E] group-open:inline">Tutup</span>
                        </summary>
                        <div className="border-t border-[#DCEAF8] bg-[#E8F3FC] p-3 dark:border-[#1E3A5F] dark:bg-[#071322] sm:p-5">
                            {documentPreview}
                        </div>
                    </details>

                    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(26rem,0.88fr)]">
                        <div className="min-w-0 space-y-4">
                    <Card title="Sumber Biaya" titleLevel={2} subtitle="Pilih item pengajuan yang menjadi dasar tagihan. Item yang sudah dipakai invoice lain tidak dapat dipilih." padding="none" actions={availableItems.length > 0 ? <Checkbox id="select-all-invoice-sources" checked={availableItems.every((item) => selectedSourceIds.has(item.id))} onChange={(event) => selectAllSources(event.target.checked)} label="Pilih semua" /> : null}>
                        <div className="grid min-w-0 gap-2 p-4 sm:grid-cols-2 sm:p-5">
                            {jobItems.map((item) => {
                                const unavailableReason = itemUnavailableReason(item);
                                return <div key={item.id} className={`min-w-0 rounded-xl border p-3 ${unavailableReason ? 'border-[#DCEAF8] bg-[#F8FBFF] opacity-70 dark:border-[#1E3A5F] dark:bg-[#071322]' : 'border-[#B9D9FF] bg-white dark:border-[#285585] dark:bg-[#0C1D36]'}`}>
                                    <Checkbox id={`invoice-source-${item.id}`} checked={selectedSourceIds.has(item.id)} disabled={Boolean(unavailableReason)} onChange={(event) => toggleSource(item, event.target.checked)} label={item.item_name} description={`${item.request_number} · ${Number(item.quantity).toLocaleString('id-ID')} ${item.unit}`} />
                                    <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px]"><span className="min-w-0 whitespace-normal text-[#52658E] [overflow-wrap:anywhere]">{item.vendor_name || 'Tanpa vendor'}</span><span className="shrink-0 whitespace-nowrap font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">HPP {money(item.hpp_total)}</span>{!unavailableReason && <StatusBadge status="Aktif" label="Siap" size="sm" />}</div>
                                    {unavailableReason && <p className="mt-2 text-[11px] font-semibold text-[#A65300]">{unavailableReason}</p>}
                                </div>;
                            })}
                            {jobItems.length === 0 && <p className="rounded-xl border border-dashed border-[#DCEAF8] px-4 py-8 text-center text-sm font-semibold text-[#52658E] dark:border-[#1E3A5F] sm:col-span-2">{form.data.port_call_id ? 'Data Tidak Ditemukan' : 'Pilih Job untuk melihat item'}</p>}
                        </div>
                    </Card>

                    <Card padding="none" header={<div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h2 className="text-base font-extrabold leading-snug text-[#0B1F63] dark:text-[#F1F5F9]">Rincian Invoice</h2><p className="mt-0.5 whitespace-normal text-xs text-[#52658E] [overflow-wrap:anywhere] dark:text-[#94A3B8]">Nama, kuantitas, satuan, dan harga jual dapat disesuaikan. Gabungkan atau pecah baris tanpa kehilangan sumber biaya.</p></div><div className="flex min-w-0 flex-wrap justify-end gap-2 sm:shrink-0"><Button className="min-h-11 min-w-[10rem] flex-1 sm:min-w-0 sm:flex-none" type="button" variant="outline" size="sm" onClick={mergeSelectedSources} disabled={form.data.lines.filter((line) => line.source_item_ids.length > 0).length < 2}><Merge aria-hidden="true" className="size-4" /> Gabungkan Terpilih</Button><Button className="min-h-11 min-w-[10rem] flex-1 sm:min-w-0 sm:flex-none" type="button" variant="outline" size="sm" onClick={addCustomLine}><Plus aria-hidden="true" className="size-4" /> Tambah Baris</Button></div></div>}>
                        <div className="space-y-3 p-4 sm:p-5">
                            {totalSelectedHpp > 0 && (
                                <div className="mb-2">
                                    {isHppBalanced ? (
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs">✓</span>
                                                <div>
                                                    <p className="font-extrabold text-sm text-emerald-900 dark:text-emerald-100">Alokasi HPP Sumber Seimbang (100% Pas)</p>
                                                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                                                        Total HPP baris ({money(totalAllocatedHpp)}) sama persis dengan total HPP item pengajuan terpilih ({money(totalSelectedHpp)}).
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-lg bg-emerald-200/70 px-2.5 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                                                    Selisih: Rp 0
                                                </span>
                                                <Button type="button" variant="ghost" size="sm" onClick={resetHppToDefault} className="text-xs text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200">
                                                    Reset Proporsional
                                                </Button>
                                            </div>
                                        </div>
                                    ) : hppDifference > 0 ? (
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-rose-400 bg-rose-50 px-4 py-3 text-xs text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-black text-xs">!</span>
                                                <div>
                                                    <p className="font-black text-sm text-rose-900 dark:text-rose-100">
                                                        Kelebihan Alokasi HPP ({money(hppDifference)}) — Tidak Boleh Lebih!
                                                    </p>
                                                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                                                        Total baris: <strong>{money(totalAllocatedHpp)}</strong> &gt; Item terpilih: <strong>{money(totalSelectedHpp)}</strong>. Sesuaikan HPP pada baris agar pas.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={autoBalanceHpp} className="bg-white text-xs font-bold text-rose-800 border-rose-300 hover:bg-rose-100 dark:bg-slate-900">
                                                    Seimbangkan Otomatis
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={resetHppToDefault} className="text-xs text-rose-800 hover:bg-rose-100 dark:text-rose-200">
                                                    Reset Proporsional
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white font-black text-xs">!</span>
                                                <div>
                                                    <p className="font-black text-sm text-amber-900 dark:text-amber-100">
                                                        Kekurangan Alokasi HPP ({money(Math.abs(hppDifference))}) — Tidak Boleh Kurang!
                                                    </p>
                                                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                                                        Total baris: <strong>{money(totalAllocatedHpp)}</strong> &lt; Item terpilih: <strong>{money(totalSelectedHpp)}</strong>. Tambahkan ke salah satu baris agar pas.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={autoBalanceHpp} className="bg-white text-xs font-bold text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-slate-900">
                                                    Seimbangkan Otomatis
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={resetHppToDefault} className="text-xs text-amber-900 hover:bg-amber-100 dark:text-amber-200">
                                                    Reset Proporsional
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {form.data.lines.map((line, index) => {
                                const sourceNames = line.source_item_ids.map((sourceId) => jobItems.find((item) => item.id === sourceId)?.item_name).filter(Boolean);
                                const lineTotal = Number(line.quantity || 0) * Number(line.unit_price || 0);
                                const hpp = lineHpp(line);
                                const margin = lineTotal - hpp;
                                return <section key={line.key} className="rounded-2xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#0C1D36] sm:p-4">
                                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0"><p className="text-xs font-extrabold text-[#0B1F63] dark:text-white">Baris {index + 1}</p><p className="mt-0.5 whitespace-normal text-[11px] text-[#52658E] [overflow-wrap:anywhere]">{sourceNames.length > 0 ? `Sumber: ${sourceNames.join(', ')}` : 'Baris tambahan tanpa sumber biaya baru'}</p></div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {index > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => mergeWithPrevious(index)} aria-label={`Gabungkan baris ${index + 1} dengan baris sebelumnya`}><Merge aria-hidden="true" className="size-4" /> Gabung</Button>}
                                            {line.source_item_ids.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => expandSourceLine(index)} aria-label={`Jadikan baris ${index + 1} rincian per item`}><ListTree aria-hidden="true" className="size-4" /> Jadikan Rinci</Button>}
                                            <Button type="button" variant="ghost" size="sm" onClick={() => splitLine(index)} aria-label={`Pecah baris ${index + 1} menjadi dua tanpa mengubah total harga jual`}><CopyPlus aria-hidden="true" className="size-4" /> Pecah</Button>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)} aria-label={`Hapus baris ${index + 1}`}><Trash2 aria-hidden="true" className="size-4" /> Hapus</Button>
                                        </div>
                                    </div>
                                    <div className="mb-3 max-w-xl">
                                        <Input
                                            name={`lines[${index}][section_title]`}
                                            autoComplete="off"
                                            label="Bagian dokumen"
                                            value={line.section_title}
                                            onChange={(event) => updateLine(index, 'section_title', event.target.value)}
                                            list="invoice-section-suggestions"
                                            placeholder={`Contoh: ${defaultSectionTitle(form.data.invoice_type)}…`}
                                            maxLength={100}
                                            error={errors[`lines.${index}.section_title`]}
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-[minmax(0,2fr)_8rem_9rem_minmax(14rem,1.2fr)]">
                                        <Textarea required name={`lines[${index}][description]`} autoComplete="off" label="Nama / deskripsi item invoice" value={line.description} onChange={(event) => updateLine(index, 'description', event.target.value)} rows={3} maxLength={255} error={errors[`lines.${index}.description`]} />
                                        <Input required name={`lines[${index}][quantity]`} autoComplete="off" label="Qty" type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} error={errors[`lines.${index}.quantity`]} />
                                        <Input required name={`lines[${index}][unit]`} autoComplete="off" label="Satuan" value={line.unit} onChange={(event) => updateLine(index, 'unit', event.target.value)} error={errors[`lines.${index}.unit`]} />
                                        <div>
                                            <MoneyInput required name={`lines[${index}][unit_price]`} autoComplete="off" label="Harga Satuan (Rp)" value={line.unit_price} onChange={(value) => updateLine(index, 'unit_price', value)} error={errors[`lines.${index}.unit_price`]} />
                                            <p className="mt-1.5 rounded-lg bg-[#EBF3FB] px-2.5 py-1 text-[11px] font-semibold text-[#0B1F63] dark:bg-[#102B4A] dark:text-[#E0F0FF]">
                                                Subtotal: {line.quantity || 0} {line.unit} × {money(line.unit_price)} = <span className="font-extrabold text-[#0060F4] dark:text-[#60A5FA]">{money(lineTotal)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                        <div className="sm:col-span-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-[#0B1F63] dark:text-white">
                                                    Alokasi HPP Sumber (Rp)
                                                </label>
                                                <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                                    Bisa diubah saat pecah/gabung baris
                                                </span>
                                            </div>
                                            <MoneyInput
                                                name={`lines[${index}][allocated_hpp]`}
                                                autoComplete="off"
                                                value={line.allocated_hpp !== undefined && line.allocated_hpp !== '' ? line.allocated_hpp : String(lineHpp(line))}
                                                onChange={(value) => updateLine(index, 'allocated_hpp', value)}
                                                error={errors[`lines.${index}.allocated_hpp`]}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-[#52658E]">Total Jual Baris</p>
                                            <p className="text-sm font-extrabold tabular-nums text-[#0060F4] mt-1">{money(lineTotal)}</p>
                                            <p className="text-[10px] text-[#52658E]">{line.quantity || 0} {line.unit} × {money(line.unit_price)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-[#52658E]">Estimasi Margin Baris</p>
                                            <p className={`text-sm font-extrabold tabular-nums mt-1 ${margin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#C62840]'}`}>
                                                {money(margin)}
                                            </p>
                                            <p className="text-[10px] text-[#52658E]">
                                                {lineTotal > 0 ? `${((margin / lineTotal) * 100).toFixed(1)}% margin` : '0%'}
                                            </p>
                                        </div>
                                    </div>
                                </section>;
                            })}
                            {form.data.lines.length === 0 && <p className="rounded-xl border border-dashed border-[#DCEAF8] px-4 py-8 text-center text-sm font-semibold text-[#52658E] dark:border-[#1E3A5F]">Pilih sumber biaya atau tambahkan baris invoice.</p>}
                            {form.errors.lines && <p role="alert" className="text-xs font-semibold text-[#C62840]">{form.errors.lines}</p>}
                            <datalist id="invoice-section-suggestions">
                                <option value="Biaya Keagenan" />
                                <option value="Pengurusan Keagenan" />
                                <option value="Permintaan Kapal" />
                                <option value="Rincian Reimbursement" />
                            </datalist>
                        </div>
                    </Card>

                    <div className="grid min-w-0 items-start gap-4 2xl:grid-cols-2">
                        <Card title="Ringkasan Tagihan" titleLevel={2} subtitle="Tambahan, jatuh tempo, dan total akhir." padding="none"><div className="p-4 sm:p-5">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <MoneyInput name="addon_total" autoComplete="off" label="Materai / Addon" value={form.data.addon_total} onChange={(value) => form.setData('addon_total', value)} error={form.errors.addon_total} />
                                
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-[#0B1F63] dark:text-white">Pajak</label>
                                        <div className="inline-flex rounded-lg border border-[#DCEAF8] p-0.5 text-[11px] font-bold dark:border-[#1E3A5F]">
                                            <button
                                                type="button"
                                                onClick={() => setTaxMode('nominal')}
                                                className={`rounded-md px-2 py-0.5 transition-colors ${taxMode === 'nominal' ? 'bg-[#0060F4] text-white shadow-xs' : 'text-[#52658E] hover:text-[#0B1F63] dark:text-[#94A3B8]'}`}
                                            >
                                                Rupiah (Rp)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTaxMode('percent');
                                                    if (subtotal > 0 && Number(form.data.tax) > 0) {
                                                        const p = ((Number(form.data.tax) / subtotal) * 100).toFixed(1);
                                                        setTaxPercent(p);
                                                    }
                                                }}
                                                className={`rounded-md px-2 py-0.5 transition-colors ${taxMode === 'percent' ? 'bg-[#0060F4] text-white shadow-xs' : 'text-[#52658E] hover:text-[#0B1F63] dark:text-[#94A3B8]'}`}
                                            >
                                                Persen (%)
                                            </button>
                                        </div>
                                    </div>

                                    {taxMode === 'nominal' ? (
                                        <div>
                                            <MoneyInput
                                                name="tax"
                                                autoComplete="off"
                                                value={form.data.tax}
                                                onChange={(value) => form.setData('tax', value)}
                                                error={form.errors.tax}
                                            />
                                            {subtotal > 0 && Number(form.data.tax) > 0 && (
                                                <p className="mt-1 text-[11px] text-[#52658E]">
                                                    Setara {((Number(form.data.tax) / subtotal) * 100).toFixed(2)}% dari subtotal ({money(subtotal)})
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={taxPercent}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setTaxPercent(val);
                                                        const num = parseFloat(val) || 0;
                                                        const nominal = Math.max(0, Math.round((subtotal * num) / 100));
                                                        form.setData('tax', String(nominal));
                                                    }}
                                                    placeholder="Contoh: 11"
                                                    className="h-10 w-full rounded-xl border border-[#DCEAF8] bg-white px-3 pr-8 text-sm font-semibold text-[#0B1F63] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/30 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                                                />
                                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#52658E]">
                                                    %
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {[0, 1.1, 11, 12].map((preset) => (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => {
                                                            setTaxPercent(String(preset));
                                                            const nominal = Math.max(0, Math.round((subtotal * preset) / 100));
                                                            form.setData('tax', String(nominal));
                                                        }}
                                                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold border transition-colors ${
                                                            parseFloat(taxPercent) === preset
                                                                ? 'border-[#0060F4] bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]'
                                                                : 'border-[#DCEAF8] bg-white text-[#52658E] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#94A3B8]'
                                                        }`}
                                                    >
                                                        {preset}%
                                                    </button>
                                                ))}
                                                <span className="ml-auto text-[11px] font-bold text-[#0060F4]">
                                                    = {money(form.data.tax)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <Input required name="due_date" autoComplete="off" label="Tanggal Jatuh Tempo" type="date" value={form.data.due_date} onChange={(event) => form.setData('due_date', event.target.value)} error={form.errors.due_date} />
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#DCEAF8] bg-[#DCEAF8] sm:grid-cols-3 dark:border-[#1E3A5F] dark:bg-[#1E3A5F]"><div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E]">Baris</p><p className="mt-1 font-bold tabular-nums">{form.data.lines.length}</p></div><div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E]">Subtotal</p><p className="mt-1 font-bold tabular-nums">{money(subtotal)}</p></div><div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E]">Tambahan</p><p className="mt-1 font-bold tabular-nums">{money(Number(form.data.addon_total || 0) + Number(form.data.tax || 0))}</p></div><div className="bg-[#F0F8FF] p-3 dark:bg-[#071322]"><p className="text-[11px] text-[#52658E]">Total Alokasi HPP</p><p className="mt-1 font-bold tabular-nums">{money(totalAllocatedHpp)}</p>{totalSelectedHpp > 0 && <p className="text-[10px] text-[#52658E]">Sumber: {money(totalSelectedHpp)}</p>}</div><div aria-live="polite" className="bg-[#E0F0FF] p-3 dark:bg-[#0060F4]/15"><p className="text-[11px] text-[#52658E]">Total Invoice</p><p className="mt-1 font-extrabold tabular-nums text-[#0060F4]">{money(grandTotal)}</p></div><div aria-live="polite" className={`${estimatedMargin >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'} p-3`}><p className="text-[11px] text-[#52658E]">Estimasi Margin</p><p className={`mt-1 font-extrabold tabular-nums ${estimatedMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#C62840]'}`}>{money(estimatedMargin)}</p></div></div>
                        </div></Card>
                        <Card title="Catatan dan Dokumen Pendukung" titleLevel={2} subtitle="Dokumen tambahan bersifat opsional." padding="none"><div className="space-y-4 p-4 sm:p-5">
                            <Textarea name="notes" autoComplete="off" label="Keterangan" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} rows={3} maxLength={1000} showCharCount error={form.errors.notes} />
                            {invoice?.supporting_document_path && <div className="rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]"><p className="mb-2 text-xs font-semibold text-[#0B1F63] dark:text-white">Dokumen pendukung saat ini</p><DocumentActions viewHref={`/invoices/${invoice.id}/documents/supporting?view=1`} downloadHref={`/invoices/${invoice.id}/documents/supporting`} /></div>}
                            <PhotoUploadPicker label={invoice?.supporting_document_path ? 'Ganti dokumen pendukung (opsional)' : 'Dokumen pendukung (opsional)'} value={form.data.supporting_document} onChange={(file) => form.setData('supporting_document', file)} mode="gallery" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={form.errors.supporting_document} helperText="PDF, Word, JPG, JPEG, atau PNG. Maksimal 10 MB." />
                        </div></Card>
                    </div>
                        </div>

                        <aside className="sticky top-20 hidden min-w-0 xl:block" aria-label="Pratinjau dokumen invoice">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Pratinjau dokumen</h2>
                                    <p className="whitespace-normal text-pretty text-xs text-[#52658E] [overflow-wrap:anywhere] dark:text-[#94A3B8]">Data berubah langsung mengikuti editor. PDF final memakai susunan yang sama.</p>
                                </div>
                                <StatusBadge status="info" label={form.data.invoice_type === 'agency' ? 'INVOICE' : 'REIMBURSEMENT'} size="sm" />
                            </div>
                            <div className="rounded-2xl bg-[#DCEAF8] p-3 dark:bg-[#071322]">
                                {documentPreview}
                            </div>
                        </aside>
                    </div>

                    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-3 rounded-2xl border border-[#DCEAF8] bg-white p-3 shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-4 md:bottom-4 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                        <div className="min-w-0" aria-live="polite">
                            <p className="whitespace-normal text-xs font-semibold text-[#52658E] [overflow-wrap:anywhere] dark:text-[#94A3B8]">
                                {form.data.lines.length} baris · {form.data.invoice_type === 'agency' ? 'Jasa Keagenan' : 'Reimbursement'}
                                {totalSelectedHpp > 0 && (
                                    <span className={`ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${isHppBalanced ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                                        {isHppBalanced ? 'HPP Seimbang' : `HPP ${hppDifference > 0 ? 'Lebih' : 'Kurang'} ${money(Math.abs(hppDifference))}`}
                                    </span>
                                )}
                            </p>
                            <p className="mt-0.5 whitespace-nowrap text-base font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">Total {money(grandTotal)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                            <Link href="/invoices" className={getButtonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}>Batal</Link>
                            <Button className="w-full sm:w-auto" type="submit" isLoading={form.processing}>{invoice ? 'Perbarui Invoice' : 'Simpan Invoice Draft'}</Button>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
