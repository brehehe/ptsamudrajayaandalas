import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, FileText, Save } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Input from '../../Components/forms/Input';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import Textarea from '../../Components/forms/Textarea';
import SelectSearch from '../../Components/selects/SelectSearch';
import Button, { getButtonClassName } from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import AppLayout from '../../Layouts/AppLayout';
import { FileViewerTrigger } from '../../Components/ui/FileViewer';

interface OptionItem {
    id: string | number;
    name: string;
    ship_company_id?: string;
    city?: string | null;
}

interface WorkOrderData {
    id: string;
    system_number: string;
    client_number: string;
    company_id: string;
    ship_id: string;
    port_id: string;
    document_date: string;
    received_at: string;
    eta_at: string;
    etd_at: string;
    activity_name: string;
    activity_description?: string | null;
    assigned_to: number;
    client_pic_name?: string | null;
    client_pic_contact?: string | null;
    document_url?: string | null;
}

interface Props {
    workOrder: WorkOrderData;
    companies: OptionItem[];
    ships: OptionItem[];
    ports: OptionItem[];
    assignees: OptionItem[];
}

export default function WorkOrderEdit({ workOrder, companies, ships, ports, assignees }: Props) {
    const form = useForm({
        client_number: workOrder.client_number || '',
        company_id: workOrder.company_id || '',
        ship_id: workOrder.ship_id || '',
        port_id: workOrder.port_id || '',
        document_date: workOrder.document_date || '',
        received_at: workOrder.received_at || '',
        eta_at: workOrder.eta_at || '',
        etd_at: workOrder.etd_at || '',
        activity_name: workOrder.activity_name || '',
        activity_description: workOrder.activity_description || '',
        assigned_to: String(workOrder.assigned_to || ''),
        client_pic_name: workOrder.client_pic_name || '',
        client_pic_contact: workOrder.client_pic_contact || '',
        document: null as File | null,
    });
    const errors = form.errors as Record<string, string>;
    const availableShips = useMemo(
        () => ships.filter((ship) => !form.data.company_id || ship.ship_company_id === form.data.company_id),
        [form.data.company_id, ships],
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
        form.transform((data) => ({ ...data, _method: 'patch' }));
        form.post(`/work-orders/${workOrder.id}`, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout title={`Edit ${workOrder.system_number}`}>
            <Head title={`Edit ${workOrder.system_number}`} />
            <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:py-8">
                <header className="flex flex-col gap-4 border-b border-[#DCEAF8] pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <Link href={`/work-orders/${workOrder.id}/detail`} className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#0060F4] hover:underline">
                            <ArrowLeft aria-hidden="true" className="size-4" /> Kembali ke detail SPK
                        </Link>
                        <h1 className="text-balance text-2xl font-bold text-[#0B1F63] sm:text-3xl">Perbarui SPK</h1>
                        <p className="mt-1 text-sm text-[#52658E]">Koreksi data atau ganti dokumen {workOrder.system_number}. ETA dicatat sebagai tanggal tanpa jam.</p>
                    </div>
                    {workOrder.document_url && (
                        <FileViewerTrigger
                            url={workOrder.document_url}
                            title={`Dokumen SPK: ${workOrder.system_number}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DCEAF8] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1F63] hover:border-[#0060F4]"
                        >
                            <ExternalLink aria-hidden="true" className="size-4" /> Dokumen saat ini
                        </FileViewerTrigger>
                    )}
                </header>

                <form onSubmit={submit} className="space-y-5" noValidate>
                    <FormErrorSummary errors={errors} />
                    <Card className="p-5 sm:p-6">
                        <h2 className="text-lg font-bold text-[#0B1F63]">Data SPK dan klien</h2>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <Input label="Nomor SPK Klien" required name="client_number" value={form.data.client_number} onChange={(event) => form.setData('client_number', event.target.value)} error={errors.client_number} />
                            <SelectSearch label="Perusahaan" required value={form.data.company_id} onChange={(value) => { const companyId = String(value); form.setData('company_id', companyId); if (!ships.some((ship) => String(ship.id) === form.data.ship_id && ship.ship_company_id === companyId)) form.setData('ship_id', ''); }} options={companies.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="Cari perusahaan" error={errors.company_id} />
                            <Input label="Tanggal SPK" required name="document_date" type="date" value={form.data.document_date} onChange={(event) => form.setData('document_date', event.target.value)} error={errors.document_date} />
                            <Input label="Diterima pada" required name="received_at" type="datetime-local" value={form.data.received_at} onChange={(event) => form.setData('received_at', event.target.value)} error={errors.received_at} />
                            <Input label="Nama PIC" name="client_pic_name" value={form.data.client_pic_name} onChange={(event) => form.setData('client_pic_name', event.target.value)} error={errors.client_pic_name} />
                            <Input label="Kontak PIC" name="client_pic_contact" value={form.data.client_pic_contact} onChange={(event) => form.setData('client_pic_contact', event.target.value)} error={errors.client_pic_contact} />
                        </div>
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <h2 className="text-lg font-bold text-[#0B1F63]">Kunjungan dan penugasan</h2>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <SelectSearch label="Kapal" required value={form.data.ship_id} onChange={(value) => form.setData('ship_id', String(value))} options={availableShips.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="Cari kapal" error={errors.ship_id} />
                            <SelectSearch label="Pelabuhan" required value={form.data.port_id} onChange={(value) => form.setData('port_id', String(value))} options={ports.map((item) => ({ value: String(item.id), label: item.city ? `${item.name} — ${item.city}` : item.name }))} placeholder="Cari pelabuhan" error={errors.port_id} />
                            <Input label="ETA" helperText="Tanggal kedatangan; tanpa jam." required name="eta_at" type="date" value={form.data.eta_at} onChange={(event) => form.setData('eta_at', event.target.value)} error={errors.eta_at} />
                            <Input label="ETD" helperText="Boleh dikosongkan sampai jadwal berangkat diketahui." name="etd_at" type="date" value={form.data.etd_at} onChange={(event) => form.setData('etd_at', event.target.value)} error={errors.etd_at} />
                            <Input label="Kegiatan" required name="activity_name" value={form.data.activity_name} onChange={(event) => form.setData('activity_name', event.target.value)} error={errors.activity_name} />
                            <SelectSearch label="Penanggung Jawab" required value={form.data.assigned_to} onChange={(value) => form.setData('assigned_to', String(value))} options={assignees.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="Pilih petugas" error={errors.assigned_to} />
                            <div className="md:col-span-2">
                                <Textarea label="Keterangan kegiatan" name="activity_description" value={form.data.activity_description} onChange={(event) => form.setData('activity_description', event.target.value)} error={errors.activity_description} rows={3} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <div className="flex items-center gap-2">
                            <FileText aria-hidden="true" className="size-5 text-[#0060F4]" />
                            <h2 className="text-lg font-bold text-[#0B1F63]">Ganti dokumen (opsional)</h2>
                        </div>
                        <p className="mt-1 text-sm text-[#52658E]">Biarkan kosong jika dokumen yang tersimpan sudah benar.</p>
                        <div className="mt-4">
                            <PhotoUploadPicker label="Dokumen SPK pengganti" accept=".pdf,.jpg,.jpeg,.png" value={form.data.document} onChange={(file) => form.setData('document', file)} error={errors.document} />
                        </div>
                    </Card>

                    <footer className="flex flex-col-reverse gap-3 border-t border-[#DCEAF8] pt-5 sm:flex-row sm:justify-end">
                        <Link href={`/work-orders/${workOrder.id}/detail`} className={getButtonClassName({ variant: 'secondary' })}>Batal</Link>
                        <Button type="submit" isLoading={form.processing} leftIcon={<Save aria-hidden="true" className="size-4" />}>Simpan Perubahan</Button>
                    </footer>
                </form>
            </main>
        </AppLayout>
    );
}
