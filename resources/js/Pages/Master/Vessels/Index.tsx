import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import Input from '../../../Components/forms/Input';
import PhotoUploadPicker from '../../../Components/forms/PhotoUploadPicker';
import ConfirmDialog from '../../../Components/overlays/ConfirmDialog';
import Modal from '../../../Components/overlays/Modal';
import ShipImage from '../../../Components/vessels/ShipImage';
import MobilePageHero from '../../../Components/navigation/MobilePageHero';
import { ResponsiveTable, type Column } from '../../../Components/tables/Table';
import FormErrorSummary from '../../../Components/forms/FormErrorSummary';

interface VesselCompany {
    id: string;
    name: string;
    code?: string | null;
}

interface MasterVessel {
    id: string;
    name: string;
    imo_number?: string | null;
    call_sign?: string | null;
    flag?: string | null;
    ship_type?: string | null;
    gross_tonnage?: number | string | null;
    length?: number | string | null;
    captain_name?: string | null;
    captain_phone?: string | null;
    image?: string | null;
    company?: VesselCompany | null;
    port_calls_count: number;
}

interface MasterVesselsIndexProps {
    vessels: MasterVessel[];
    companies: VesselCompany[];
    search: string;
    canManage: boolean;
}

interface VesselFormData {
    _method: '' | 'patch';
    name: string;
    ship_company_id: string;
    imo_number: string;
    call_sign: string;
    flag: string;
    ship_type: string;
    gross_tonnage: string;
    length: string;
    captain_name: string;
    captain_phone: string;
    image: File | null;
    remove_image: boolean;
}

const emptyVesselForm = (): VesselFormData => ({
    _method: '',
    name: '',
    ship_company_id: '',
    imo_number: '',
    call_sign: '',
    flag: 'Indonesia',
    ship_type: '',
    gross_tonnage: '',
    length: '',
    captain_name: '',
    captain_phone: '',
    image: null,
    remove_image: false,
});

export default function MasterVesselsIndex({
    vessels = [],
    companies = [],
    search = '',
    canManage = false,
}: MasterVesselsIndexProps) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingVessel, setEditingVessel] = useState<MasterVessel | null>(null);
    const [deletingVessel, setDeletingVessel] = useState<MasterVessel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const vesselForm = useForm<VesselFormData>(emptyVesselForm());

    const openCreateForm = () => {
        setEditingVessel(null);
        setImagePreview(null);
        vesselForm.setData(emptyVesselForm());
        vesselForm.clearErrors();
        setIsFormOpen(true);
    };

    const openEditForm = (vessel: MasterVessel) => {
        setEditingVessel(vessel);
        setImagePreview(vessel.image || null);
        vesselForm.setData({
            _method: 'patch',
            name: vessel.name,
            ship_company_id: vessel.company?.id || '',
            imo_number: vessel.imo_number || '',
            call_sign: vessel.call_sign || '',
            flag: vessel.flag || 'Indonesia',
            ship_type: vessel.ship_type || '',
            gross_tonnage: vessel.gross_tonnage ? String(vessel.gross_tonnage) : '',
            length: vessel.length ? String(vessel.length) : '',
            captain_name: vessel.captain_name || '',
            captain_phone: vessel.captain_phone || '',
            image: null,
            remove_image: false,
        });
        vesselForm.clearErrors();
        setIsFormOpen(true);
    };

    const submitVessel = (event: React.FormEvent) => {
        event.preventDefault();

        const target = editingVessel
            ? `/master/vessels/${editingVessel.id}`
            : '/master/vessels';

        vesselForm.post(target, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsFormOpen(false);
                setEditingVessel(null);
                setImagePreview(null);
                vesselForm.reset();
            },
        });
    };

    const deleteVessel = () => {
        if (!deletingVessel) {
            return;
        }

        setIsDeleting(true);
        router.delete(`/master/vessels/${deletingVessel.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingVessel(null),
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleSearch = (event: React.FormEvent) => {
        event.preventDefault();
        router.get('/master/vessels', { search: searchTerm }, { preserveState: true });
    };

    const vesselActions = (vessel: MasterVessel) => (
        <div className="flex flex-wrap justify-end gap-1.5">
            <Link href={`/vessels/${vessel.id}`} className="inline-flex min-h-9 items-center rounded-[10px] border border-[#DCEAF8] px-3 text-xs font-semibold text-[#0060F4] hover:border-[#0060F4]">Detail</Link>
            {canManage && <Button size="sm" variant="ghost" onClick={() => openEditForm(vessel)} leftIcon={<Pencil aria-hidden="true" className="size-3.5" />}>Edit</Button>}
            {canManage && <Button size="sm" variant="ghost" className="text-[#C62840] hover:bg-[#FFE7EC] hover:text-[#C62840]" onClick={() => setDeletingVessel(vessel)} leftIcon={<Trash2 aria-hidden="true" className="size-3.5" />}>Hapus</Button>}
        </div>
    );

    const columns: Column<MasterVessel>[] = [
        { key: 'name', header: 'Kapal', wrap: 'normal', render: (vessel) => <div className="flex min-w-[190px] items-center gap-2.5"><ShipImage src={vessel.image} alt="" width={40} height={40} loading="lazy" className="size-10 rounded-lg object-cover" /><span><span className="block font-bold">{vessel.name}</span><span className="block text-[10px] text-[#52658E]">{vessel.company?.name || 'Perusahaan belum ditentukan'}</span></span></div> },
        { key: 'imo_number', header: 'IMO', render: (vessel) => vessel.imo_number || '—' },
        { key: 'call_sign', header: 'Call Sign', render: (vessel) => vessel.call_sign || '—' },
        { key: 'ship_type', header: 'Tipe', wrap: 'normal', render: (vessel) => vessel.ship_type || '—' },
        { key: 'specification', header: 'GT / Panjang', render: (vessel) => `${vessel.gross_tonnage || '—'} GT · ${vessel.length || '—'} m` },
        { key: 'port_calls_count', header: 'Kunjungan', align: 'center', render: (vessel) => vessel.port_calls_count },
        { key: 'actions', header: 'Aksi', align: 'right', render: vesselActions },
    ];

    return (
        <AppLayout title="Master Kapal" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Master Kapal — PT Samudra Jaya Andalas" />

            <MobilePageHero title="Master Kapal" description="Kelola identitas kapal yang digunakan pada setiap kunjungan dan job." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <section
                    className={
                        'hidden flex-col gap-5 rounded-2xl border border-[#DCEAF8] bg-white p-5 md:flex ' +
                        'shadow-[0_2px_12px_rgba(8,40,112,0.04)] dark:border-[#1E3A5F] ' +
                        'dark:bg-[#0C1D36] md:flex-row md:items-center md:justify-between md:p-6'
                    }
                >
                    <div className="max-w-3xl">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                                className={
                                    'inline-flex items-center rounded-full bg-[#0060F4]/10 px-2.5 ' +
                                    'py-1 text-xs font-bold text-[#0060F4] dark:text-[#38BDF8]'
                                }
                            >
                                Master Data
                            </span>
                            <span className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                Identitas armada
                            </span>
                        </div>
                        <h1 className="text-wrap-balance text-2xl font-black tracking-tight text-[#0B1F63] dark:text-[#F1F5F9] md:text-3xl">
                            Master Kapal
                        </h1>
                        <p className="mt-1 text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">
                            Satu kapal dicatat satu kali di sini. Setiap jadwal kedatangan kapal
                            tersebut disimpan sebagai kunjungan dan nomor job yang berbeda.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canManage && (
                            <Button
                                type="button"
                                onClick={openCreateForm}
                                leftIcon={<Plus aria-hidden="true" className="size-4" />}
                            >
                                Tambah Kapal
                            </Button>
                        )}
                        {/* <Link
                            href="/reports"
                            className={
                                'inline-flex min-h-10 items-center gap-2 rounded-xl border ' +
                                'border-[#DCEAF8] bg-white px-4 py-2 text-sm font-bold ' +
                                'text-[#082870] transition-colors hover:bg-[#F0F8FF] ' +
                                'dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9] ' +
                                'dark:hover:bg-[#132847] focus-visible:outline-none focus-visible:ring-2 ' +
                                'focus-visible:ring-[#0060F4]'
                            }
                        >
                            <svg
                                aria-hidden="true"
                                className="h-4 w-4 text-[#0060F4] dark:text-[#38BDF8]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 19V9m5 10V5m5 14v-7m5 7V3"
                                />
                            </svg>
                            Lihat Laporan
                        </Link> */}
                    </div>
                </section>

                <section
                    className={
                        'flex items-start gap-3 rounded-2xl border border-[#BCE0FD] bg-[#EAF4FE] ' +
                        'p-4 text-sm text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#0A1A2F] ' +
                        'dark:text-[#DCEAF8]'
                    }
                >
                    <svg
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0060F4] dark:text-[#38BDF8]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                        <path strokeLinecap="round" strokeWidth={2} d="M12 11v5m0-8h.01" />
                    </svg>
                    <p>
                        Kapal yang sama dapat muncul beberapa kali di menu{' '}
                        <Link href="/vessels" className="font-bold text-[#0060F4] hover:underline">
                            Kapal
                        </Link>{' '}
                        karena setiap baris mewakili kunjungan yang berbeda. Kunjungan selesai tetap
                        tersimpan di menu Laporan.
                    </p>
                </section>

                <Card className="rounded-2xl border border-[#DCEAF8] bg-white p-4 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-[#52658E] dark:text-[#94A3B8]">
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {vessels.length}
                            </span>{' '}
                            kapal terdaftar
                        </p>

                        <form onSubmit={handleSearch} className="flex w-full items-center gap-2 md:w-auto">
                            <label className="sr-only" htmlFor="master-vessel-search">
                                Cari master kapal
                            </label>
                            <div className="relative min-w-0 flex-1 md:w-80">
                                <svg
                                    aria-hidden="true"
                                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C9BB9]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <circle cx="11" cy="11" r="8" strokeWidth={2} />
                                    <path strokeLinecap="round" strokeWidth={2} d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    id="master-vessel-search"
                                    name="search"
                                    type="search"
                                    autoComplete="off"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Nama kapal, IMO, call sign, perusahaan…"
                                    className={
                                        'w-full rounded-xl border border-[#DCEAF8] bg-white py-2.5 ' +
                                        'pl-9 pr-3 text-sm text-[#0B1F63] placeholder:text-[#8C9BB9] ' +
                                        'focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 ' +
                                        'focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] ' +
                                        'dark:bg-[#071322] dark:text-[#F1F5F9]'
                                    }
                                />
                            </div>
                            <Button type="submit" variant="secondary" className="min-h-10 rounded-xl px-4">
                                Cari
                            </Button>
                        </form>
                    </div>
                </Card>

                {canManage && <Button className="w-full md:hidden" onClick={openCreateForm} leftIcon={<Plus aria-hidden="true" className="size-4" />}>Tambah Kapal</Button>}

                <ResponsiveTable<MasterVessel>
                    data={vessels}
                    keyExtractor={(vessel) => vessel.id}
                    desktop={{ columns, compact: true, minWidth: '1040px' }}
                    mobile={{
                        titleRender: (vessel) => vessel.name,
                        subtitleRender: (vessel) => vessel.company?.name || 'Perusahaan belum ditentukan',
                        imageRender: (vessel) => <ShipImage src={vessel.image} alt={`Foto ${vessel.name}`} width={48} height={48} loading="lazy" className="size-12 rounded-xl object-cover" />,
                        fields: [
                            { label: 'IMO', render: (vessel) => vessel.imo_number || '—' },
                            { label: 'Call Sign', render: (vessel) => vessel.call_sign || '—' },
                            { label: 'Tipe', render: (vessel) => vessel.ship_type || '—' },
                            { label: 'Kunjungan', render: (vessel) => `${vessel.port_calls_count} kunjungan` },
                            { label: 'GT / Panjang', fullWidth: true, render: (vessel) => `${vessel.gross_tonnage || '—'} GT · ${vessel.length || '—'} m` },
                        ],
                        actionsRender: vesselActions,
                    }}
                />
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => {
                    if (!vesselForm.processing) {
                        vesselForm.clearErrors();
                        setIsFormOpen(false);
                    }
                }}
                title={editingVessel ? 'Edit Kapal' : 'Tambah Kapal'}
                subtitle="Data ini menjadi identitas kapal untuk seluruh kunjungan dan job."
                size="2xl"
                footer={
                    <div className="flex w-full items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={vesselForm.processing}
                            onClick={() => setIsFormOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="master-vessel-form"
                            isLoading={vesselForm.processing}
                        >
                            {editingVessel ? 'Simpan Perubahan' : 'Simpan Kapal'}
                        </Button>
                    </div>
                }
            >
                <form id="master-vessel-form" noValidate onSubmit={submitVessel} className="space-y-4">
                    <FormErrorSummary errors={vesselForm.errors} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            required
                            label="Nama Kapal"
                            name="name"
                            autoComplete="off"
                            value={vesselForm.data.name}
                            onChange={(event) => vesselForm.setData('name', event.target.value)}
                            error={vesselForm.errors.name}
                        />
                        <div className="space-y-1.5">
                            <label
                                htmlFor="master-vessel-company"
                                className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]"
                            >
                                Perusahaan Pemilik <span className="text-[#C62840]">*</span>
                            </label>
                            <select
                                id="master-vessel-company"
                                required
                                value={vesselForm.data.ship_company_id}
                                onChange={(event) =>
                                    vesselForm.setData('ship_company_id', event.target.value)
                                }
                                aria-invalid={vesselForm.errors.ship_company_id ? true : undefined}
                                aria-describedby={
                                    vesselForm.errors.ship_company_id
                                        ? 'master-vessel-company-error'
                                        : undefined
                                }
                                className="h-12 w-full rounded-xl border border-[#DCEAF8] bg-white px-3.5 text-sm text-[#0B1F63] outline-none focus-visible:border-[#0060F4] focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                            >
                                <option value="">Pilih perusahaan</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                        {company.code ? ` (${company.code})` : ''}
                                    </option>
                                ))}
                            </select>
                            {vesselForm.errors.ship_company_id && (
                                <p
                                    id="master-vessel-company-error"
                                    className="text-xs font-semibold text-[#C62840]"
                                >
                                    {vesselForm.errors.ship_company_id}
                                </p>
                            )}
                        </div>
                        <Input
                            label="Nomor IMO"
                            name="imo_number"
                            autoComplete="off"
                            value={vesselForm.data.imo_number}
                            onChange={(event) => vesselForm.setData('imo_number', event.target.value)}
                            error={vesselForm.errors.imo_number}
                        />
                        <Input
                            label="Call Sign"
                            name="call_sign"
                            autoComplete="off"
                            value={vesselForm.data.call_sign}
                            onChange={(event) => vesselForm.setData('call_sign', event.target.value)}
                            error={vesselForm.errors.call_sign}
                        />
                        <Input
                            label="Jenis Kapal"
                            name="ship_type"
                            autoComplete="off"
                            value={vesselForm.data.ship_type}
                            onChange={(event) => vesselForm.setData('ship_type', event.target.value)}
                            error={vesselForm.errors.ship_type}
                        />
                        <Input
                            label="Bendera"
                            name="flag"
                            autoComplete="off"
                            value={vesselForm.data.flag}
                            onChange={(event) => vesselForm.setData('flag', event.target.value)}
                            error={vesselForm.errors.flag}
                        />
                        <Input
                            label="Gross Tonnage (GT)"
                            name="gross_tonnage"
                            autoComplete="off"
                            type="number"
                            min="0"
                            step="any"
                            value={vesselForm.data.gross_tonnage}
                            onChange={(event) =>
                                vesselForm.setData('gross_tonnage', event.target.value)
                            }
                            error={vesselForm.errors.gross_tonnage}
                        />
                        <Input
                            label="Panjang Kapal (m)"
                            name="length"
                            autoComplete="off"
                            type="number"
                            min="0"
                            step="any"
                            value={vesselForm.data.length}
                            onChange={(event) => vesselForm.setData('length', event.target.value)}
                            error={vesselForm.errors.length}
                        />
                        <Input
                            label="Nama Nahkoda"
                            name="captain_name"
                            autoComplete="off"
                            value={vesselForm.data.captain_name}
                            onChange={(event) =>
                                vesselForm.setData('captain_name', event.target.value)
                            }
                            error={vesselForm.errors.captain_name}
                        />
                        <Input
                            label="Kontak Nahkoda"
                            name="captain_phone"
                            type="tel"
                            autoComplete="off"
                            value={vesselForm.data.captain_phone}
                            onChange={(event) =>
                                vesselForm.setData('captain_phone', event.target.value)
                            }
                            error={vesselForm.errors.captain_phone}
                        />
                    </div>

                    <PhotoUploadPicker
                        label="Foto Kapal (Opsional)"
                        value={vesselForm.data.image}
                        previewUrl={imagePreview}
                        onChange={(file, previewUrl) => {
                            vesselForm.setData((current) => ({
                                ...current,
                                image: file,
                                remove_image: !file && Boolean(editingVessel?.image),
                            }));
                            setImagePreview(previewUrl || null);
                        }}
                        mode="both"
                        accept="image/jpeg,image/png,image/webp"
                        maxSizeMb={5}
                        variant="compact"
                        error={vesselForm.errors.image}
                        helperText="JPG, PNG, atau WebP. Maksimal 5 MB."
                    />
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={Boolean(deletingVessel)}
                title="Hapus kapal dari master?"
                description={
                    deletingVessel
                        ? `${deletingVessel.name} tidak akan muncul untuk kunjungan baru. Riwayat data tetap tersimpan.`
                        : ''
                }
                confirmLabel="Hapus Kapal"
                confirmVariant="danger"
                processing={isDeleting}
                onConfirm={deleteVessel}
                onClose={() => {
                    if (!isDeleting) {
                        setDeletingVessel(null);
                    }
                }}
            />
        </AppLayout>
    );
}
