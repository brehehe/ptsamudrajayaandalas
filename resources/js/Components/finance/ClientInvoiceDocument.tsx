import React from 'react';
import { MaritimeCrestIcon } from '../ui/Logo';

export interface ClientInvoiceDocumentSettings {
    company_name: string;
    business_label: string;
    office_address: string;
    phone: string;
    email: string;
    city: string;
    bank_account_name: string;
    bank_account_number: string;
    bank_name: string;
    signatory_title: string;
}

export interface ClientInvoiceDocumentLine {
    key?: string;
    section_title?: string | null;
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
}

export interface ClientInvoiceDocumentJob {
    jobNumber?: string | null;
    clientSpkNumber?: string | null;
    shipName?: string | null;
    portName?: string | null;
    etaAt?: string | null;
    etdAt?: string | null;
}

interface ClientInvoiceDocumentProps {
    type: 'agency' | 'reimburse';
    documentNumber: string;
    subject?: string | null;
    originPortName?: string | null;
    destinationPortName?: string | null;
    documentDate?: string | null;
    dueDate?: string | null;
    company?: { name: string; address?: string | null } | null;
    job?: ClientInvoiceDocumentJob | null;
    lines: ClientInvoiceDocumentLine[];
    addonTotal: number;
    tax: number;
    grandTotal: number;
    notes?: string | null;
    settings: ClientInvoiceDocumentSettings;
    className?: string;
}

const formatNumber = (value: number | string): string => new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
}).format(Number(value || 0));

const formatQuantity = (value: string): string => new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
}).format(Number(value || 0));

const formatDocumentDate = (value?: string | null): string => {
    if (!value) return 'Belum ditentukan';
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Belum ditentukan';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
};

const formatEtaEtd = (etaAt?: string | null, etdAt?: string | null): string => {
    if (!etaAt && !etdAt) return 'Belum ditentukan';

    return `${formatDocumentDate(etaAt)} - ${formatDocumentDate(etdAt)}`;
};

const romanNumeral = (value: number): string => {
    const numerals: Array<[number, string]> = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
        [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    let remaining = value;

    return numerals.reduce((result, [number, numeral]) => {
        while (remaining >= number) {
            result += numeral;
            remaining -= number;
        }

        return result;
    }, '');
};

export default function ClientInvoiceDocument({
    type,
    documentNumber,
    subject,
    originPortName,
    destinationPortName,
    documentDate,
    dueDate,
    company,
    job,
    lines,
    addonTotal,
    tax,
    grandTotal,
    notes,
    settings,
    className = '',
}: ClientInvoiceDocumentProps) {
    const documentTitle = type === 'agency' ? 'INVOICE' : 'REIMBURSEMENT';
    const documentSubject = subject || `${type === 'agency' ? 'Keagenan' : 'Reimbursement'} ${job?.shipName || 'kapal'}`;
    const defaultSectionTitle = type === 'agency' ? 'Biaya Keagenan' : 'Rincian Reimbursement';
    const groupedLines = Array.from(lines.reduce((groups, line) => {
        const sectionTitle = line.section_title?.trim() || defaultSectionTitle;
        const sectionLines = groups.get(sectionTitle) || [];
        sectionLines.push(line);
        groups.set(sectionTitle, sectionLines);

        return groups;
    }, new Map<string, ClientInvoiceDocumentLine[]>()).entries());
    const showSectionSubtotals = type === 'reimburse' || groupedLines.length > 1;
    let runningLineNumber = 0;

    return (
        <section
            aria-label={`Pratinjau dokumen ${documentTitle}`}
            className={`mx-auto min-w-0 w-full overflow-hidden rounded-[2px] bg-white text-slate-950 shadow-lg ring-1 ring-slate-900/10 ${className}`}
        >
            <div className="min-h-[46rem] min-w-0 p-5 font-serif sm:min-h-[54rem] sm:p-8">
                <header className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start gap-2 sm:grid-cols-[4.25rem_minmax(0,1fr)_4.25rem] sm:gap-3">
                    <div className="mx-auto size-10 sm:size-14" aria-hidden="true">
                        <MaritimeCrestIcon />
                    </div>
                    <div className="min-w-0 text-center">
                        <p className="whitespace-normal text-balance font-serif text-[clamp(1rem,2.6vw,1.65rem)] font-bold leading-tight text-[#245D8A] [overflow-wrap:anywhere]">
                            {settings.company_name}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold leading-tight sm:text-sm">{settings.business_label}</p>
                        <p className="mt-1 whitespace-normal text-[7px] font-semibold leading-snug [overflow-wrap:anywhere] sm:text-[9px]">KANTOR PUSAT: {settings.office_address}</p>
                        <p className="whitespace-normal text-[7px] leading-snug [overflow-wrap:anywhere] sm:text-[9px]">
                            Telp. {settings.phone} &nbsp; Email: <span className="underline underline-offset-2">{settings.email}</span>
                        </p>
                    </div>
                    <div aria-hidden="true" />
                </header>

                <div className="mt-3 space-y-1" aria-hidden="true">
                    <div className="h-0.5 bg-slate-900" />
                    <div className="h-px bg-slate-900" />
                </div>

                <h2 className="mt-2 text-center text-sm font-bold underline decoration-1 underline-offset-2 sm:text-lg">
                    {documentTitle}
                </h2>

                <div className="mt-3 grid min-w-0 gap-2 text-[9px] leading-relaxed sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4 sm:text-xs">
                    <dl className="min-w-0 space-y-0.5">
                        <div className="grid grid-cols-[3.4rem_0.6rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_0.75rem_minmax(0,1fr)]">
                            <dt>Nomor</dt><dd>:</dd><dd className="min-w-0 whitespace-normal font-semibold [overflow-wrap:anywhere]" translate="no">{documentNumber}</dd>
                        </div>
                        <div className="grid grid-cols-[3.4rem_0.6rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_0.75rem_minmax(0,1fr)]">
                            <dt>Hal</dt><dd>:</dd><dd className="min-w-0 whitespace-normal font-semibold [overflow-wrap:anywhere]">{documentSubject}</dd>
                        </div>
                    </dl>
                    <p className="justify-self-end whitespace-nowrap font-semibold">{settings.city}, {formatDocumentDate(documentDate)}</p>
                </div>

                <div className="mt-4 text-[9px] leading-relaxed sm:text-xs">
                    <p>Kepada Yth.</p>
                    <p className="whitespace-normal font-bold [overflow-wrap:anywhere]">{company?.name || 'Perusahaan belum dipilih'}</p>
                    <p className="max-w-[70%] whitespace-pre-line [overflow-wrap:anywhere]">{company?.address || 'Alamat perusahaan belum diisi'}</p>
                </div>

                <div className="mt-5 grid gap-3 text-[9px] leading-relaxed sm:grid-cols-2 sm:text-xs">
                    <dl className="min-w-0">
                        <div className="grid grid-cols-[3.7rem_0.6rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_0.75rem_minmax(0,1fr)]">
                            <dt className="font-bold">Kapal</dt><dd>:</dd><dd className="min-w-0 whitespace-normal font-semibold [overflow-wrap:anywhere]">{job?.shipName || 'Belum dipilih'}</dd>
                        </div>
                        <div className="grid grid-cols-[3.7rem_0.6rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_0.75rem_minmax(0,1fr)]">
                            <dt className="font-bold">ETA / ETD</dt><dd>:</dd><dd className="min-w-0 whitespace-normal font-semibold [overflow-wrap:anywhere]">{formatEtaEtd(job?.etaAt, job?.etdAt)}</dd>
                        </div>
                        <div className="grid grid-cols-[3.7rem_0.6rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_0.75rem_minmax(0,1fr)]">
                            <dt className="font-bold">No. Job</dt><dd>:</dd><dd className="min-w-0 whitespace-normal [overflow-wrap:anywhere]" translate="no">{job?.jobNumber || 'Belum dipilih'}</dd>
                        </div>
                        <div className="grid grid-cols-[3.7rem_0.6rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_0.75rem_minmax(0,1fr)]">
                            <dt>Referensi SPK</dt><dd>:</dd><dd className="min-w-0 whitespace-normal [overflow-wrap:anywhere]" translate="no">{job?.clientSpkNumber || 'Belum diisi'}</dd>
                        </div>
                    </dl>
                    <dl className="min-w-0">
                        <div className="grid grid-cols-[4.25rem_0.6rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_0.75rem_minmax(0,1fr)]">
                            <dt>Pel. Asal</dt><dd>:</dd><dd className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{originPortName || 'Belum diisi'}</dd>
                        </div>
                        <div className="grid grid-cols-[4.25rem_0.6rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_0.75rem_minmax(0,1fr)]">
                            <dt>Pel. Sandar (muat)</dt><dd>:</dd><dd className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{job?.portName || 'Belum ditentukan'}</dd>
                        </div>
                        <div className="grid grid-cols-[4.25rem_0.6rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_0.75rem_minmax(0,1fr)]">
                            <dt>Pel. Tujuan</dt><dd>:</dd><dd className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{destinationPortName || 'Belum diisi'}</dd>
                        </div>
                    </dl>
                </div>

                <div className="mt-5 text-[9px] leading-relaxed sm:text-xs">
                    <div className="space-y-3">
                        {groupedLines.length > 0 ? groupedLines.map(([sectionTitle, sectionLines], sectionIndex) => {
                            const sectionSubtotal = sectionLines.reduce(
                                (total, line) => total + (Number(line.quantity || 0) * Number(line.unit_price || 0)),
                                0,
                            );

                            return (
                                <section key={sectionTitle}>
                                    <h3 className="whitespace-normal font-bold underline underline-offset-2 [overflow-wrap:anywhere]">{romanNumeral(sectionIndex + 1)}. {sectionTitle}</h3>
                                    <div className="mt-1 space-y-1.5">
                                        {sectionLines.map((line) => {
                                            runningLineNumber += 1;

                                            return (
                                                <div key={line.key || `${line.description}-${runningLineNumber}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-1.5">
                                                    <span className="text-right tabular-nums">{runningLineNumber}</span>
                                                    <div className="min-w-0">
                                                        <p className="whitespace-pre-line font-semibold [overflow-wrap:anywhere]">{line.description || 'Deskripsi belum diisi'}</p>
                                                        <p className="text-[8px] text-slate-600 sm:text-[10px]">
                                                            {formatQuantity(line.quantity)} {line.unit || 'Paket'} x Rp {formatNumber(line.unit_price)}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-[1.25rem_auto] gap-1 whitespace-nowrap tabular-nums">
                                                        <span>Rp</span>
                                                        <span className="min-w-[4.5rem] border-b border-slate-900 text-right font-semibold sm:min-w-[6rem]">
                                                            {formatNumber(Number(line.quantity || 0) * Number(line.unit_price || 0))}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {showSectionSubtotals && (
                                        <div className="mt-1.5 flex justify-end">
                                            <div className="grid grid-cols-[auto_1.25rem_auto] gap-1 border-t border-slate-900 pt-1 font-bold tabular-nums">
                                                <span>Jumlah</span><span>Rp</span><span className="min-w-[4.5rem] text-right sm:min-w-[6rem]">{formatNumber(sectionSubtotal)}</span>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            );
                        }) : (
                            <p className="py-4 text-center italic text-slate-500">Rincian biaya akan tampil setelah item dipilih.</p>
                        )}

                        {addonTotal > 0 && (
                            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-1.5">
                                <span />
                                <p>Materai / biaya tambahan</p>
                                <p className="grid grid-cols-[1.25rem_auto] gap-1 whitespace-nowrap tabular-nums"><span>Rp</span><span className="min-w-[4.5rem] text-right sm:min-w-[6rem]">{formatNumber(addonTotal)}</span></p>
                            </div>
                        )}
                        {tax > 0 && (
                            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-1.5">
                                <span />
                                <p>Pajak</p>
                                <p className="grid grid-cols-[1.25rem_auto] gap-1 whitespace-nowrap tabular-nums"><span>Rp</span><span className="min-w-[4.5rem] text-right sm:min-w-[6rem]">{formatNumber(tax)}</span></p>
                            </div>
                        )}
                    </div>

                    <div className="mt-2 flex justify-end">
                        <div className="grid grid-cols-[auto_1.25rem_auto] gap-1 border-t-2 border-slate-900 pt-1 font-bold tabular-nums">
                            <span>TOTAL</span><span>Rp</span><span className="min-w-[4.5rem] text-right sm:min-w-[6rem]">{formatNumber(grandTotal)}</span>
                        </div>
                    </div>
                </div>

                <p className="mt-5 text-pretty text-[8px] leading-relaxed sm:text-[10px]">
                    Demikian kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.
                </p>
                {notes && <p className="mt-2 whitespace-normal text-pretty text-[8px] leading-relaxed text-slate-700 [overflow-wrap:anywhere] sm:text-[10px]"><span className="font-bold">Catatan:</span> {notes}</p>}

                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_8rem] gap-5 text-[8px] leading-relaxed sm:grid-cols-[minmax(0,1fr)_11rem] sm:text-[10px]">
                    <div>
                        <p className="font-bold">Pembayaran ditransfer ke:</p>
                        <p className="font-bold">{settings.bank_account_name}</p>
                        <p className="font-bold">a/c {settings.bank_account_number}</p>
                        <p className="font-bold">{settings.bank_name}</p>
                        <p className="mt-2">Jatuh tempo: <span className="font-semibold">{formatDocumentDate(dueDate)}</span></p>
                    </div>
                    <div className="text-center">
                        <p>Hormat kami,</p>
                        <div className="h-14 sm:h-20" aria-hidden="true" />
                        <p className="border-t border-slate-900 pt-1 font-bold">{settings.signatory_title}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
