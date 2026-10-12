import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Building2, FileText, Ship as ShipIcon } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button, { getButtonClassName } from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import MoneyInput from '../../Components/forms/MoneyInput';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import SelectSearch from '../../Components/selects/SelectSearch';
import Textarea from '../../Components/forms/Textarea';
import { formatDate } from '../../lib/formatDate';

interface Company { id: string; name: string }
interface PortCall {
    id: string;
    job_number: string;
    client_spk_number?: string | null;
    company_id?: string | null;
    ship?: { id: string; name: string } | null;
    port?: { id: string; name: string } | null;
    departed_at?: string | null;
    initial_paid_total?: number;
}

interface Props {
    companies: Company[];
    portCalls: PortCall[];
    preselectedPortCallId?: string | null;
}

export default function CompletionNoteCreate({ companies, portCalls, preselectedPortCallId = null }: Props) {
    const preselectedJob = portCalls.find((portCall) => portCall.id === preselectedPortCallId);
    const [companyId, setCompanyId] = useState(() => preselectedJob?.company_id ?? '');
    const [shipId, setShipId] = useState(() => preselectedJob?.ship?.id ?? '');
    const form = useForm({
        port_call_id: preselectedJob?.id ?? '',
        document: null as File | null,
        actual_amount: '',
        notes: '',
    });
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

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post('/completion-notes', { forceFormData: true });
    };

    return (
        <AppLayout title="Unggah Nota Rampung">
            <Head title="Unggah Nota Rampung — PT Samudra Jaya Andalas" />
            <div className="mx-auto max-w-6xl space-y-4 pb-12">
                <div className="flex flex-col gap-3 border-b border-[#DCEAF8] pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3A5F]">
                    <div className="min-w-0">
                        <h1 className="text-balance text-2xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">Unggah Nota Rampung</h1>
                        <p className="mt-1 text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">Hubungkan satu dokumen Nota Rampung ke Job kapal yang sudah berangkat.</p>
                    </div>
                    <Link href="/completion-notes" className={getButtonClassName({ variant: 'outline', className: 'w-full sm:w-auto' })}>Kembali</Link>
                </div>

                <form noValidate onSubmit={submit} className="space-y-4">
                    <FormErrorSummary errors={form.errors} />
                    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
                        <Card title="Pilih Job" titleLevel={2} subtitle="Hanya Job yang belum memiliki Nota Rampung ditampilkan." padding="none">
                            <div className="p-4 sm:p-5">
                                {preselectedJob && (
                                    <p role="status" className="mb-4 rounded-xl border border-[#BCE0FD] bg-[#E0F0FF] px-3 py-2.5 text-xs font-semibold text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#132847] dark:text-[#F1F5F9]">
                                        Job <span className="font-mono font-black text-[#0060F4] dark:text-[#60A5FA]" translate="no">{preselectedJob.job_number}</span> dipilih otomatis dari halaman sebelumnya.
                                    </p>
                                )}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <SelectSearch
                                        required
                                        name="company_id"
                                        label="Perusahaan"
                                        value={companyId}
                                        onChange={(value) => {
                                            setCompanyId(String(value));
                                            setShipId('');
                                            form.setData('port_call_id', '');
                                        }}
                                        options={companies.map((company) => ({ value: company.id, label: company.name, icon: <Building2 aria-hidden="true" className="size-4" /> }))}
                                        placeholder="Cari perusahaan"
                                    />
                                    <SelectSearch
                                        required
                                        name="ship_id"
                                        label="Kapal"
                                        value={shipId}
                                        disabled={!companyId}
                                        onChange={(value) => {
                                            setShipId(String(value));
                                            form.setData('port_call_id', '');
                                        }}
                                        options={ships.map((ship) => ({ value: ship.id, label: ship.name, icon: <ShipIcon aria-hidden="true" className="size-4" /> }))}
                                        placeholder={companyId ? 'Cari kapal' : 'Pilih perusahaan dahulu'}
                                    />
                                    <div className="sm:col-span-2">
                                        <SelectSearch
                                            required
                                            name="port_call_id"
                                            label="Job"
                                            value={form.data.port_call_id}
                                            disabled={!shipId}
                                            onChange={(value) => form.setData('port_call_id', String(value))}
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
                                </div>

                                {selectedJob && (
                                    <dl aria-live="polite" className="mt-4 grid gap-3 rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-3 text-xs dark:border-[#1E3A5F] dark:bg-[#071322] sm:grid-cols-2">
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
                                        <div className="min-w-0">
                                            <dt className="text-[#52658E] dark:text-[#94A3B8]">Berangkat</dt>
                                            <dd className="mt-0.5 truncate font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(selectedJob.departed_at)}</dd>
                                        </div>
                                        <div className="min-w-0 sm:col-span-2">
                                            <dt className="text-[#52658E] dark:text-[#94A3B8]">Pembayaran awal kapal</dt>
                                            <dd className="mt-0.5 font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedJob.initial_paid_total || 0)}</dd>
                                        </div>
                                    </dl>
                                )}

                                {portCalls.length === 0 && (
                                    <p role="status" className="mt-4 rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-4 text-sm text-[#52658E] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#94A3B8]">
                                        Data Tidak Ditemukan. Semua Job yang sudah berangkat telah memiliki Nota Rampung.
                                    </p>
                                )}
                            </div>
                        </Card>

                        <Card title="Dokumen Nota Rampung" titleLevel={2} subtitle="Nomor arsip dibuat otomatis oleh sistem." padding="none">
                            <div className="space-y-4 p-4 sm:p-5">
                                <MoneyInput
                                    required
                                    name="actual_amount"
                                    autoComplete="off"
                                    label="Nilai Tagihan Resmi"
                                    value={form.data.actual_amount}
                                    onChange={(value) => form.setData('actual_amount', value)}
                                    error={form.errors.actual_amount}
                                    helperText="Nilai ini dibandingkan dengan pembayaran awal untuk menampilkan kekurangan atau kelebihan bayar."
                                />
                                <PhotoUploadPicker
                                    required
                                    label="Bukti Nota Rampung"
                                    value={form.data.document}
                                    onChange={(file) => form.setData('document', file)}
                                    mode="gallery"
                                    accept=".doc,.docx,.pdf,.jpg,.jpeg,.png"
                                    maxSizeMb={10}
                                    variant="compact"
                                    error={form.errors.document}
                                    helperText="Word, PDF, JPG, JPEG, atau PNG. Maksimal 10 MB."
                                />
                                <Textarea
                                    name="notes"
                                    autoComplete="off"
                                    label="Catatan Rekonsiliasi (opsional)"
                                    value={form.data.notes}
                                    onChange={(event) => form.setData('notes', event.target.value)}
                                    rows={3}
                                    maxLength={1000}
                                    error={form.errors.notes}
                                />
                            </div>
                        </Card>
                    </div>

                    <div className="flex flex-col-reverse gap-2 rounded-2xl border border-[#DCEAF8] bg-white p-3 shadow-[0_2px_12px_rgba(8,40,112,0.04)] sm:flex-row sm:justify-end dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                        <Link href="/completion-notes" className={getButtonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}>Batal</Link>
                        <Button className="w-full sm:w-auto" type="submit" isLoading={form.processing} disabled={portCalls.length === 0}>Unggah Nota Rampung</Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
