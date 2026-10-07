import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Anchor, Pencil, Plus, Trash2 } from 'lucide-react';
import AppLayout from '../../../Layouts/AppLayout';
import Button from '../../../Components/ui/Button';
import StatusBadge from '../../../Components/ui/StatusBadge';
import Modal from '../../../Components/overlays/Modal';
import { ResponsiveTable, type Column } from '../../../Components/tables/Table';
import MobilePageHero from '../../../Components/navigation/MobilePageHero';
import Checkbox from '../../../Components/forms/Checkbox';
import FormErrorSummary from '../../../Components/forms/FormErrorSummary';
import Input from '../../../Components/forms/Input';
import Textarea from '../../../Components/forms/Textarea';

interface ServiceType {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    is_default: boolean;
    is_active: boolean;
}

interface MasterServiceTypesProps {
    serviceTypes: ServiceType[];
}

export default function MasterServiceTypesIndex({ serviceTypes = [] }: MasterServiceTypesProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<ServiceType | null>(null);

    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        code: '',
        name: '',
        description: '',
        is_default: false,
    });

    const openAddModal = () => {
        clearErrors();
        setEditingType(null);
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (st: ServiceType) => {
        clearErrors();
        setEditingType(st);
        setData({
            code: st.code,
            name: st.name,
            description: st.description || '',
            is_default: st.is_default,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingType) {
            put(`/master/service-types/${editingType.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/master/service-types', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (st: ServiceType) => {
        if (confirm(`Yakin ingin menonaktifkan tipe kegiatan "${st.name}"?`)) {
            destroy(`/master/service-types/${st.id}`);
        }
    };

    const actions = (serviceType: ServiceType) => (
        <div className="flex items-center justify-end gap-1.5">
            <Button type="button" size="sm" variant="ghost" className="size-9 !px-0" onClick={() => openEditModal(serviceType)} aria-label={`Edit ${serviceType.name}`}>
                <Pencil aria-hidden="true" className="size-4" />
            </Button>
            {!serviceType.is_default && (
                <Button type="button" size="sm" variant="ghost" className="size-9 !px-0 !text-[#C62840]" onClick={() => handleDelete(serviceType)} aria-label={`Nonaktifkan ${serviceType.name}`}>
                    <Trash2 aria-hidden="true" className="size-4" />
                </Button>
            )}
        </div>
    );

    const columns: Column<ServiceType>[] = [
        { key: 'code', header: 'Kode', width: '110px', render: (serviceType) => <span className="font-bold text-[#0060F4]">{serviceType.code}</span> },
        { key: 'name', header: 'Tipe kegiatan', width: '220px', render: (serviceType) => <span className="font-bold">{serviceType.name}</span> },
        { key: 'default', header: 'Jenis', width: '140px', render: (serviceType) => <StatusBadge status={serviceType.is_default ? 'success' : 'info'} label={serviceType.is_default ? 'Default sistem' : 'Opsional'} /> },
        { key: 'description', header: 'Deskripsi', render: (serviceType) => <span className="text-[#52658E]">{serviceType.description || '-'}</span> },
        { key: 'actions', header: 'Aksi', width: '90px', align: 'right', render: actions },
    ];

    return (
        <AppLayout title="Data Tipe Kegiatan Kapal" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Tipe Layanan Kapal — PT Samudra Jaya Andalas" />

            <MobilePageHero title="Tipe Kegiatan" description="Kelola referensi kegiatan sandar dan labuh." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:space-y-6 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                {/* Header Banner */}
                <div
                    className={
                        'hidden md:flex md:flex-row md:items-center justify-between gap-4 bg-white ' +
                        'p-5 md:p-6 rounded-[16px] border border-[#DCEAF8] ' +
                        'shadow-[0_2px_12px_rgba(8,40,112,0.04)]'
                    }
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className={
                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ' +
                                    'font-bold bg-[#0060F4]/10 text-[#0060F4]'
                                }
                            >
                                Referensi Operasional
                            </span>
                            <span className="text-xs text-[#52658E]">Sandar & Labuh</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-[#0B1F63] tracking-tight">
                            Data Tipe Kegiatan Kapal (Activity Types)
                        </h1>
                        <p className="text-xs md:text-sm text-[#52658E] mt-0.5">
                            Klasifikasi kegiatan kapal saat berada di pelabuhan (Default: Sandar &
                            Labuh).
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        onClick={openAddModal}
                        className={
                            'bg-[#0060F4] hover:bg-[#082870] text-white px-4 py-2.5 ' +
                            'rounded-[12px] shadow-sm flex items-center gap-2 text-sm ' +
                            'font-semibold'
                        }
                    >
                        <Plus aria-hidden="true" className="size-4" />
                        Tambah Tipe Baru
                    </Button>
                </div>

                <Button type="button" className="w-full md:hidden" onClick={openAddModal} leftIcon={<Plus aria-hidden="true" className="size-4" />}>
                    Tambah Tipe Kegiatan
                </Button>

                <ResponsiveTable<ServiceType>
                    data={serviceTypes}
                    keyExtractor={(serviceType) => serviceType.id}
                    desktop={{ columns, compact: true, minWidth: '760px', emptyMessage: 'Data Tidak Ditemukan' }}
                    mobile={{
                        titleRender: (serviceType) => serviceType.name,
                        subtitleRender: (serviceType) => serviceType.code,
                        statusRender: (serviceType) => <StatusBadge status={serviceType.is_default ? 'success' : 'info'} label={serviceType.is_default ? 'Default' : 'Opsional'} />,
                        imageRender: () => <span className="flex size-11 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847]"><Anchor aria-hidden="true" className="size-5" /></span>,
                        fields: [
                            { label: 'Deskripsi', fullWidth: true, render: (serviceType) => serviceType.description || '-' },
                        ],
                        actionsRender: actions,
                        emptyMessage: 'Data Tidak Ditemukan',
                    }}
                />
            </div>

            {/* Modal Tambah / Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    clearErrors();
                    setIsModalOpen(false);
                }}
                title={editingType ? `Edit Tipe: ${editingType.name}` : 'Tambah Tipe Kegiatan Baru'}
                size="md"
            >
                <form noValidate onSubmit={handleSubmit} className="space-y-4">
                    <FormErrorSummary errors={errors} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input required name="code" autoComplete="off" label="Kode Tipe" value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} placeholder="Contoh: SDR" className="font-mono" error={errors.code} />
                        <Input required name="name" autoComplete="off" label="Nama Tipe Kegiatan" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Contoh: Sandar" error={errors.name} />
                    </div>

                    <Textarea name="description" autoComplete="off" label="Deskripsi" value={data.description} onChange={(e) => setData('description', e.target.value)} rows={2} placeholder="Jelaskan tipe kegiatan…" error={errors.description} />

                    <Checkbox id="is_default" name="is_default" checked={data.is_default} onChange={(e) => setData('is_default', e.target.checked)} label="Jadikan Tipe Kegiatan Utama (Default)" error={errors.is_default} />

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCEAF8]">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                clearErrors();
                                setIsModalOpen(false);
                            }}
                            className="px-4 py-2 text-xs font-bold rounded-[10px]"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={processing}
                            className={
                                'bg-[#0060F4] hover:bg-[#082870] text-white px-5 py-2 text-xs ' +
                                'font-bold rounded-[10px]'
                            }
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
