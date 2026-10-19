import React, { useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { ReceiptText } from 'lucide-react';
import FormErrorSummary from '../forms/FormErrorSummary';
import Input from '../forms/Input';
import MoneyInput from '../forms/MoneyInput';
import PhotoUploadPicker from '../forms/PhotoUploadPicker';
import Textarea from '../forms/Textarea';
import Modal from '../overlays/Modal';
import Select from '../selects/Select';
import Button from '../ui/Button';
import { formatDate, toDateInputValue } from '../../lib/formatDate';

export interface PayableVendorInvoice {
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

interface VendorInvoicePaymentModalProps {
    invoices: PayableVendorInvoice[];
    isOpen: boolean;
    onClose: () => void;
    initialInvoiceId?: string;
    allowInvoiceSelection?: boolean;
}

const initialPaymentData = () => ({
    cost_document_id: '',
    amount: '',
    payment_date: toDateInputValue(),
    reference_number: '',
    notes: '',
    proof: null as File | null,
});

const money = (value: number | string | null | undefined) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(Number(value || 0));

export default function VendorInvoicePaymentModal({
    invoices,
    isOpen,
    onClose,
    initialInvoiceId,
    allowInvoiceSelection = true,
}: VendorInvoicePaymentModalProps) {
    const paymentForm = useForm(initialPaymentData());
    const paymentErrorRef = useRef<HTMLDivElement>(null);
    const selectedInvoice = invoices.find((invoice) => invoice.id === paymentForm.data.cost_document_id);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const initialInvoice = invoices.find((invoice) => invoice.id === initialInvoiceId);
        paymentForm.clearErrors();
        paymentForm.setData({
            ...initialPaymentData(),
            cost_document_id: initialInvoice?.id ?? '',
            amount: initialInvoice ? String(initialInvoice.payable_amount) : '',
        });
    }, [isOpen, initialInvoiceId]);

    const closeModal = () => {
        if (paymentForm.processing) {
            return;
        }

        paymentForm.clearErrors();
        onClose();
    };

    const selectInvoice = (invoiceId: string) => {
        const invoice = invoices.find((candidate) => candidate.id === invoiceId);

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
                onClose();
                paymentForm.reset();
            },
            onError: () => {
                window.requestAnimationFrame(() => paymentErrorRef.current?.focus());
            },
        });
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={closeModal}
                title="Catat Pembayaran Invoice Vendor"
                subtitle={allowInvoiceSelection
                    ? 'Pilih invoice. Vendor, kunjungan, dan nominal diambil langsung dari data yang sudah terverifikasi.'
                    : selectedInvoice
                        ? `${selectedInvoice.document_number} · ${selectedInvoice.vendor_name}`
                        : undefined}
                size="lg"
                footer={(
                    <>
                        <Button type="button" variant="secondary" disabled={paymentForm.processing} onClick={closeModal}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="vendor-invoice-payment-form"
                            isLoading={paymentForm.processing}
                            disabled={!paymentForm.data.cost_document_id}
                        >
                            Simpan Pembayaran
                        </Button>
                    </>
                )}
            >
                <form id="vendor-invoice-payment-form" noValidate onSubmit={submitPayment} className="space-y-4">
                    <FormErrorSummary ref={paymentErrorRef} errors={paymentForm.errors} />

                    {allowInvoiceSelection && (
                        <Select
                            required
                            name="cost_document_id"
                            autoComplete="off"
                            label="Nomor invoice vendor"
                            placeholder="Pilih invoice yang akan dibayar"
                            value={paymentForm.data.cost_document_id}
                            onChange={(event) => selectInvoice(event.target.value)}
                            error={paymentForm.errors.cost_document_id}
                            options={invoices.map((invoice) => ({
                                value: invoice.id,
                                label: `${invoice.document_number} · ${invoice.vendor_name}`,
                            }))}
                        />
                    )}

                    {selectedInvoice && (
                        <div className="rounded-2xl border border-[#DCEAF8] bg-[#F8FBFF] p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <div className="flex items-start gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#173B5C] dark:text-[#38BDF8]">
                                    <ReceiptText aria-hidden="true" className="size-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="break-words font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedInvoice.vendor_name}</p>
                                    <p className="mt-0.5 break-all font-mono text-xs text-[#52658E] dark:text-[#94A3B8]" translate="no">
                                        {selectedInvoice.document_number} · {selectedInvoice.port_call.job_number || 'Job belum tersedia'}
                                    </p>
                                    <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                        {selectedInvoice.port_call.ship_name || 'Kapal belum tersedia'}
                                        {selectedInvoice.port_call.port_name ? ` · ${selectedInvoice.port_call.port_name}` : ''}
                                    </p>
                                </div>
                            </div>
                            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div>
                                    <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Nilai invoice</dt>
                                    <dd className="mt-0.5 font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(selectedInvoice.verified_total)}</dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Sisa invoice</dt>
                                    <dd className="mt-0.5 font-bold tabular-nums text-[#0060F4] dark:text-[#38BDF8]">{money(selectedInvoice.outstanding_amount)}</dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Jatuh tempo</dt>
                                    <dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(selectedInvoice.due_date)}</dd>
                                </div>
                            </dl>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <MoneyInput
                            required
                            name="amount"
                            autoComplete="off"
                            label="Nominal pembayaran"
                            value={paymentForm.data.amount}
                            onChange={(value) => paymentForm.setData('amount', value)}
                            error={paymentForm.errors.amount}
                            helperText="Nominal dapat lebih kecil untuk pembayaran sebagian."
                        />
                        <Input
                            required
                            name="payment_date"
                            autoComplete="off"
                            label="Tanggal transfer"
                            type="date"
                            value={paymentForm.data.payment_date}
                            onChange={(event) => paymentForm.setData('payment_date', event.target.value)}
                            error={paymentForm.errors.payment_date}
                        />
                    </div>

                    <Input
                        required
                        name="reference_number"
                        autoComplete="off"
                        spellCheck={false}
                        label="Nomor referensi transfer"
                        value={paymentForm.data.reference_number}
                        onChange={(event) => paymentForm.setData('reference_number', event.target.value)}
                        error={paymentForm.errors.reference_number}
                    />

                    <PhotoUploadPicker
                        label="Bukti pembayaran"
                        required
                        value={paymentForm.data.proof}
                        onChange={(file) => paymentForm.setData('proof', file)}
                        mode="gallery"
                        accept=".pdf,.jpg,.jpeg,.png"
                        maxSizeMb={10}
                        variant="compact"
                        error={paymentForm.errors.proof}
                        helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB."
                    />

                    <Textarea
                        name="notes"
                        autoComplete="off"
                        label="Catatan"
                        value={paymentForm.data.notes}
                        onChange={(event) => paymentForm.setData('notes', event.target.value)}
                        error={paymentForm.errors.notes}
                        maxLength={2000}
                        showCharCount
                    />
                </form>
            </Modal>
        </>
    );
}
