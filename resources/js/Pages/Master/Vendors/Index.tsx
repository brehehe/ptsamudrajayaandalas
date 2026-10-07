import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import AppLayout from '../../../Layouts/AppLayout';
import Button from '../../../Components/ui/Button';
import StatusBadge from '../../../Components/ui/StatusBadge';
import Modal from '../../../Components/overlays/Modal';
import { ResponsiveTable, type Column } from '../../../Components/tables/Table';
import MobilePageHero from '../../../Components/navigation/MobilePageHero';
import FilterBar from '../../../Components/filters/FilterBar';
import FormErrorSummary from '../../../Components/forms/FormErrorSummary';
import Input from '../../../Components/forms/Input';
import Textarea from '../../../Components/forms/Textarea';
import Select from '../../../Components/selects/Select';

interface Vendor {
    id: string;
    code: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    is_active: boolean;
}

interface MasterVendorsIndexProps {
    vendors: Vendor[];
    search: string;
}

export default function MasterVendorsIndex({
    vendors,
    search: initialSearch,
}: MasterVendorsIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

    const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
        code: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        is_active: true,
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/master/vendors', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVendor) return;
        put(`/master/vendors/${editingVendor.id}`, {
            onSuccess: () => {
                setEditingVendor(null);
                reset();
            },
        });
    };

    const handleDelete = (vendor: Vendor) => {
        if (confirm(`Apakah Anda yakin ingin menonaktifkan vendor ${vendor.name}?`)) {
            router.delete(`/master/vendors/${vendor.id}`);
        }
    };

    const openEdit = (vendor: Vendor) => {
        clearErrors();
        setEditingVendor(vendor);
        setData({
            code: vendor.code,
            name: vendor.name,
            email: vendor.email || '',
            phone: vendor.phone || '',
            address: vendor.address || '',
            is_active: vendor.is_active,
        });
    };

    const actions = (vendor: Vendor) => (
        <div className="flex items-center justify-end gap-1.5">
            <Button type="button" size="sm" variant="ghost" className="size-9 !px-0" onClick={() => openEdit(vendor)} aria-label={`Edit ${vendor.name}`}>
                <Pencil aria-hidden="true" className="size-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="size-9 !px-0 !text-[#C62840]" onClick={() => handleDelete(vendor)} aria-label={`Nonaktifkan ${vendor.name}`}>
                <Trash2 aria-hidden="true" className="size-4" />
            </Button>
        </div>
    );

    const columns: Column<Vendor>[] = [
        { key: 'code', header: 'Kode', width: '110px', render: (vendor) => <span className="font-bold text-[#0060F4]">{vendor.code}</span> },
        { key: 'name', header: 'Vendor', width: '230px', render: (vendor) => <span className="font-bold">{vendor.name}</span> },
        { key: 'contact', header: 'Kontak', width: '210px', render: (vendor) => <div><p>{vendor.phone || '-'}</p><p className="text-[11px] text-[#52658E]">{vendor.email || '-'}</p></div> },
        { key: 'address', header: 'Alamat', width: '280px', render: (vendor) => <span className="text-[#52658E]">{vendor.address || '-'}</span> },
        { key: 'status', header: 'Status', width: '110px', render: (vendor) => <StatusBadge status={vendor.is_active ? 'success' : 'inactive'} label={vendor.is_active ? 'Aktif' : 'Nonaktif'} /> },
        { key: 'actions', header: 'Aksi', width: '90px', align: 'right', render: actions },
    ];

    return (
        <AppLayout title="Master Data Vendor & Rekanan" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Data Vendor - PT Samudra Jaya Andalas" />

            <MobilePageHero title="Vendor" description="Kelola vendor dan penyedia jasa operasional kapal." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div
                    className={
                        'hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 ' +
                        'border-b border-[#DCEAF8]'
                    }
                >
                    <div
                        className={
                            'flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border ' +
                            'border-[#DCEAF8] self-start'
                        }
                    >
                        <div
                            className={
                                'px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex ' +
                                'items-center gap-2 bg-[#0060F4] text-white shadow-sm'
                            }
                        >
                            <span>🏢</span>
                            <span>Master Vendor</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white">
                                {vendors.length}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            clearErrors();
                            reset();
                            setIsCreateModalOpen(true);
                        }}
                        className={
                            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ' +
                            'bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white ' +
                            'text-xs sm:text-sm font-bold shadow-sm transition-all ' +
                            'flex-shrink-0 cursor-pointer self-start sm:self-auto'
                        }
                    >
                        <span className="text-base leading-none font-bold">+</span>
                        <span>Tambah Vendor Baru</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="hidden flex-col gap-2 md:flex md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Master Data Vendor & Penyedia Jasa
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] mt-0.5">
                            Daftar vendor penyedia air tawar, BBM, perahu motor tambat, dan logistik
                            kapal
                        </p>
                    </div>
                </div>

                <Button type="button" className="w-full md:hidden" onClick={() => { clearErrors(); reset(); setIsCreateModalOpen(true); }} leftIcon={<Plus aria-hidden="true" className="size-4" />}>
                    Tambah Vendor
                </Button>

                <FilterBar
                    searchValue={search}
                    onSearchChange={setSearch}
                    onSearchSubmit={() => router.get('/master/vendors', { search }, { preserveState: true })}
                    searchPlaceholder="Cari kode, nama, email, atau telepon…"
                    searchAriaLabel="Cari vendor"
                />

                <ResponsiveTable<Vendor>
                    data={vendors}
                    keyExtractor={(vendor) => vendor.id}
                    desktop={{ columns, compact: true, minWidth: '980px', emptyMessage: 'Data Tidak Ditemukan' }}
                    mobile={{
                        titleRender: (vendor) => vendor.name,
                        subtitleRender: (vendor) => vendor.code,
                        statusRender: (vendor) => <StatusBadge status={vendor.is_active ? 'success' : 'inactive'} label={vendor.is_active ? 'Aktif' : 'Nonaktif'} />,
                        imageRender: () => <span className="flex size-11 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847]"><Building2 aria-hidden="true" className="size-5" /></span>,
                        fields: [
                            { label: 'Telepon', render: (vendor) => vendor.phone || '-' },
                            { label: 'Email', render: (vendor) => vendor.email || '-' },
                            { label: 'Alamat', fullWidth: true, render: (vendor) => vendor.address || '-' },
                        ],
                        actionsRender: actions,
                        emptyMessage: 'Data Tidak Ditemukan',
                    }}
                />
            </div>

            {/* Modal Tambah Vendor */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    clearErrors();
                    setIsCreateModalOpen(false);
                }}
                title="Tambah Rekanan Vendor Baru"
            >
                <form noValidate onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    <FormErrorSummary errors={errors} />
                    <div className="grid grid-cols-2 gap-3">
                        <Input required name="code" autoComplete="off" label="Kode Vendor" maxLength={20} value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} placeholder="Contoh: VND-006" className="font-mono" error={errors.code} />
                        <Input name="phone" autoComplete="tel" label="Nomor Telepon" type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="Contoh: +62 812…" error={errors.phone} />
                    </div>

                    <Input required name="name" autoComplete="organization" label="Nama Perusahaan Vendor" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Contoh: PT Gresik Maritim Sejahtera" error={errors.name} />
                    <Input name="email" autoComplete="email" label="Email Kontak" type="email" spellCheck={false} value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="Contoh: vendor@email.com" error={errors.email} />
                    <Textarea name="address" autoComplete="street-address" label="Alamat Kantor / Dermaga" value={data.address} onChange={(e) => setData('address', e.target.value)} rows={2} placeholder="Contoh: Jl. Pelabuhan…" error={errors.address} />

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button type="button" variant="secondary" onClick={() => {
                            clearErrors();
                            setIsCreateModalOpen(false);
                        }}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={processing}
                            className="bg-[#0060F4] text-white"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan Vendor'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit Vendor */}
            {editingVendor && (
                <Modal
                    isOpen={!!editingVendor}
                    onClose={() => {
                        clearErrors();
                        setEditingVendor(null);
                    }}
                    title={`Edit Vendor ${editingVendor.name}`}
                >
                    <form noValidate onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                        <FormErrorSummary errors={errors} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input required name="code" autoComplete="off" label="Kode Vendor" maxLength={20} value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} className="font-mono" error={errors.code} />
                            <Input name="phone" autoComplete="tel" label="Telepon" type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} />
                        </div>

                        <Input required name="name" autoComplete="organization" label="Nama Vendor" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} />
                        <Input name="email" autoComplete="email" label="Email" type="email" spellCheck={false} value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} />
                        <Textarea name="address" autoComplete="street-address" label="Alamat" value={data.address} onChange={(e) => setData('address', e.target.value)} rows={2} error={errors.address} />
                        <Select required name="is_active" autoComplete="off" label="Status" value={data.is_active ? '1' : '0'} onChange={(e) => setData('is_active', e.target.value === '1')} error={errors.is_active} options={[{ value: '1', label: 'Aktif' }, { value: '0', label: 'Nonaktif' }]} />

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                            <Button type="button" variant="secondary" onClick={() => {
                                clearErrors();
                                setEditingVendor(null);
                            }}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={processing}
                                className="bg-[#0060F4] text-white"
                            >
                                {processing ? 'Memperbarui...' : 'Perbarui Vendor'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </AppLayout>
    );
}
