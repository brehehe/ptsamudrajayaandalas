import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Anchor, Pencil, Plus, Trash2 } from 'lucide-react';
import AppLayout from '../../../Layouts/AppLayout';
import Button from '../../../Components/ui/Button';
import StatusBadge from '../../../Components/ui/StatusBadge';
import Modal from '../../../Components/overlays/Modal';
import { ResponsiveTable, type Column } from '../../../Components/tables/Table';
import MobilePageHero from '../../../Components/navigation/MobilePageHero';
import FilterBar from '../../../Components/filters/FilterBar';
import FormErrorSummary from '../../../Components/forms/FormErrorSummary';
import Input from '../../../Components/forms/Input';
import Select from '../../../Components/selects/Select';

interface Port {
    id: string;
    code: string;
    name: string;
    city: string;
    country: string;
    timezone: string;
    is_active: boolean;
    port_calls_count: number;
}

interface MasterPortsIndexProps {
    ports: Port[];
    search: string;
}

export default function MasterPortsIndex({ ports, search: initialSearch }: MasterPortsIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingPort, setEditingPort] = useState<Port | null>(null);

    const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
        code: '',
        name: '',
        city: '',
        country: 'ID',
        timezone: 'Asia/Jakarta',
        is_active: true,
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/master/ports', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPort) return;
        put(`/master/ports/${editingPort.id}`, {
            onSuccess: () => {
                setEditingPort(null);
                reset();
            },
        });
    };

    const handleDelete = (port: Port) => {
        if (confirm(`Apakah Anda yakin ingin menonaktifkan pelabuhan ${port.name}?`)) {
            router.delete(`/master/ports/${port.id}`);
        }
    };

    const openEdit = (port: Port) => {
        clearErrors();
        setEditingPort(port);
        setData({
            code: port.code,
            name: port.name,
            city: port.city,
            country: port.country,
            timezone: port.timezone,
            is_active: port.is_active,
        });
    };

    const actions = (port: Port) => (
        <div className="flex items-center justify-end gap-1.5">
            <Button type="button" size="sm" variant="ghost" className="size-9 !px-0" onClick={() => openEdit(port)} aria-label={`Edit ${port.name}`}>
                <Pencil aria-hidden="true" className="size-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="size-9 !px-0 !text-[#C62840]" onClick={() => handleDelete(port)} aria-label={`Nonaktifkan ${port.name}`}>
                <Trash2 aria-hidden="true" className="size-4" />
            </Button>
        </div>
    );

    const columns: Column<Port>[] = [
        { key: 'code', header: 'Kode', width: '110px', render: (port) => <span className="font-bold text-[#0060F4]">{port.code}</span> },
        { key: 'name', header: 'Pelabuhan / terminal', width: '240px', render: (port) => <span className="font-bold">{port.name}</span> },
        { key: 'location', header: 'Kota & wilayah', width: '180px', render: (port) => `${port.city}, ${port.country}` },
        { key: 'timezone', header: 'Zona waktu', width: '150px', render: (port) => <span className="text-[#52658E]">{port.timezone}</span> },
        { key: 'visits', header: 'Kunjungan', width: '120px', render: (port) => <span className="font-semibold tabular-nums text-[#0060F4]">{port.port_calls_count} kunjungan</span> },
        { key: 'status', header: 'Status', width: '110px', render: (port) => <StatusBadge status={port.is_active ? 'success' : 'inactive'} label={port.is_active ? 'Aktif' : 'Nonaktif'} /> },
        { key: 'actions', header: 'Aksi', width: '90px', align: 'right', render: actions },
    ];

    return (
        <AppLayout title="Master Data Pelabuhan" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Data Pelabuhan - PT Samudra Jaya Andalas" />

            <MobilePageHero title="Pelabuhan" description="Kelola pelabuhan dan terminal operasional." />

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
                            <span>⚓</span>
                            <span>Master Pelabuhan</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white">
                                {ports.length}
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
                        <span>Tambah Pelabuhan Baru</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="hidden flex-col gap-2 md:flex md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Master Data Pelabuhan & Terminal
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] mt-0.5">
                            Daftar pelabuhan operasional dan dermaga keagenan PT Samudra Jaya
                            Andalas
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    className="w-full md:hidden"
                    onClick={() => {
                        clearErrors();
                        reset();
                        setIsCreateModalOpen(true);
                    }}
                    leftIcon={<Plus aria-hidden="true" className="size-4" />}
                >
                    Tambah Pelabuhan
                </Button>

                {/* ── Search Bar ── */}
                <FilterBar
                    searchValue={search}
                    onSearchChange={setSearch}
                    onSearchSubmit={() => router.get('/master/ports', { search }, { preserveState: true })}
                    searchPlaceholder="Cari kode, pelabuhan, atau kota…"
                    searchAriaLabel="Cari pelabuhan"
                />

                <ResponsiveTable<Port>
                    data={ports}
                    keyExtractor={(port) => port.id}
                    desktop={{ columns, compact: true, minWidth: '1000px', emptyMessage: 'Data Tidak Ditemukan' }}
                    mobile={{
                        titleRender: (port) => port.name,
                        subtitleRender: (port) => port.code,
                        statusRender: (port) => <StatusBadge status={port.is_active ? 'success' : 'inactive'} label={port.is_active ? 'Aktif' : 'Nonaktif'} />,
                        imageRender: () => <span className="flex size-11 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847]"><Anchor aria-hidden="true" className="size-5" /></span>,
                        fields: [
                            { label: 'Kota & wilayah', fullWidth: true, render: (port) => `${port.city}, ${port.country}` },
                            { label: 'Zona waktu', render: (port) => port.timezone },
                            { label: 'Riwayat', render: (port) => `${port.port_calls_count} kunjungan` },
                        ],
                        actionsRender: actions,
                        emptyMessage: 'Data Tidak Ditemukan',
                    }}
                />
            </div>

            {/* Modal Tambah Port */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    clearErrors();
                    setIsCreateModalOpen(false);
                }}
                title="Tambah Pelabuhan Baru"
            >
                <form noValidate onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    <FormErrorSummary errors={errors} />
                    <div className="grid grid-cols-2 gap-3">
                        <Input required name="code" autoComplete="off" label="Kode Port (UN/LOCODE)" maxLength={10} value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} placeholder="Contoh: IDGRS" className="font-mono" error={errors.code} />
                        <Input required name="country" autoComplete="off" label="Negara (2 Huruf ISO)" maxLength={2} value={data.country} onChange={(e) => setData('country', e.target.value.toUpperCase())} placeholder="Contoh: ID" className="font-mono" error={errors.country} />
                    </div>

                    <Input required name="name" autoComplete="off" label="Nama Pelabuhan / Terminal" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Contoh: Pelabuhan Gresik" error={errors.name} />

                    <div className="grid grid-cols-2 gap-3">
                        <Input required name="city" autoComplete="off" label="Kota / Kabupaten" value={data.city} onChange={(e) => setData('city', e.target.value)} placeholder="Contoh: Gresik" error={errors.city} />
                        <Select required name="timezone" autoComplete="off" label="Zona Waktu" value={data.timezone} onChange={(e) => setData('timezone', e.target.value)} error={errors.timezone} options={[{ value: 'Asia/Jakarta', label: 'WIB (Asia/Jakarta)' }, { value: 'Asia/Makassar', label: 'WITA (Asia/Makassar)' }, { value: 'Asia/Jayapura', label: 'WIT (Asia/Jayapura)' }]} />
                    </div>

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
                            {processing ? 'Menyimpan...' : 'Simpan Pelabuhan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit Port */}
            {editingPort && (
                <Modal
                    isOpen={!!editingPort}
                    onClose={() => {
                        clearErrors();
                        setEditingPort(null);
                    }}
                    title={`Edit Pelabuhan ${editingPort.name}`}
                >
                    <form noValidate onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                        <FormErrorSummary errors={errors} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input required name="code" autoComplete="off" label="Kode Port" maxLength={10} value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} className="font-mono" error={errors.code} />
                            <Input required name="country" autoComplete="off" label="Negara" maxLength={2} value={data.country} onChange={(e) => setData('country', e.target.value.toUpperCase())} className="font-mono" error={errors.country} />
                        </div>

                        <Input required name="name" autoComplete="off" label="Nama Pelabuhan" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} />

                        <div className="grid grid-cols-2 gap-3">
                            <Input required name="city" autoComplete="off" label="Kota" value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} />
                            <Select required name="is_active" autoComplete="off" label="Status" value={data.is_active ? '1' : '0'} onChange={(e) => setData('is_active', e.target.value === '1')} error={errors.is_active} options={[{ value: '1', label: 'Aktif' }, { value: '0', label: 'Nonaktif' }]} />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                            <Button type="button" variant="secondary" onClick={() => {
                                clearErrors();
                                setEditingPort(null);
                            }}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={processing}
                                className="bg-[#0060F4] text-white"
                            >
                                {processing ? 'Memperbarui...' : 'Perbarui Pelabuhan'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </AppLayout>
    );
}
