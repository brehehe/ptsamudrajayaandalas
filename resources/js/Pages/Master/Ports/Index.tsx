import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import StatusBadge from '../../../Components/ui/StatusBadge';
import Modal from '../../../Components/overlays/Modal';

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

    const { data, setData, post, put, processing, reset } = useForm({
        code: '',
        name: '',
        city: '',
        country: 'ID',
        timezone: 'Asia/Jakarta',
        is_active: true,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/master/ports', { search }, { preserveState: true });
    };

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

    return (
        <AppLayout title="Master Data Pelabuhan">
            <Head title="Data Pelabuhan - PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div
                    className={
                        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 ' +
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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

                {/* ── Search Bar ── */}
                <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
                    <div
                        className={
                            'absolute inset-y-0 left-0 pl-3.5 flex items-center ' +
                            'pointer-events-none text-[#8C9BB9]'
                        }
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari kode pelabuhan, nama terminal, atau kota..."
                        className={
                            'w-full pl-10 pr-24 h-11 bg-white border border-[#DCEAF8] ' +
                            'rounded-xl text-sm text-[#0B1F63] placeholder-[#8C9BB9] shadow-xs ' +
                            'focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 ' +
                            'focus:border-[#0060F4]'
                        }
                    />
                    <button
                        type="submit"
                        className={
                            'absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#0060F4] ' +
                            'hover:bg-[#0052D4] text-white text-xs font-bold rounded-lg ' +
                            'transition-colors cursor-pointer'
                        }
                    >
                        Cari
                    </button>
                </form>

                {/* Ports Table */}
                <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr
                                    className={
                                        'bg-[#F0F8FF] border-b border-[#DCEAF8] text-[#082870] ' +
                                        'font-semibold uppercase tracking-wider'
                                    }
                                >
                                    <th className="py-3 px-4">Kode Port</th>
                                    <th className="py-3 px-4">Nama Pelabuhan / Terminal</th>
                                    <th className="py-3 px-4">Kota & Wilayah</th>
                                    <th className="py-3 px-4">Zona Waktu</th>
                                    <th className="py-3 px-4">Riwayat Kunjungan</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCEAF8]/60 text-[#0B1F63]">
                                {ports.map((port) => (
                                    <tr
                                        key={port.id}
                                        className="hover:bg-[#F0F8FF]/50 transition-colors"
                                    >
                                        <td className="py-3.5 px-4 font-mono font-bold text-[#0060F4]">
                                            {port.code}
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-[#082870]">
                                            {port.name}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {port.city}, {port.country}
                                        </td>
                                        <td className="py-3.5 px-4 text-[#52658E]">
                                            {port.timezone}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span
                                                className={
                                                    'bg-[#E0F0FF] text-[#0060F4] px-2 py-0.5 ' +
                                                    'rounded-full text-[11px] font-semibold'
                                                }
                                            >
                                                {port.port_calls_count} Kunjungan
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <StatusBadge
                                                status={port.is_active ? 'Selesai' : 'Dibatalkan'}
                                                label={port.is_active ? 'Aktif' : 'Nonaktif'}
                                            />
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingPort(port);
                                                        setData({
                                                            code: port.code,
                                                            name: port.name,
                                                            city: port.city,
                                                            country: port.country,
                                                            timezone: port.timezone,
                                                            is_active: port.is_active,
                                                        });
                                                    }}
                                                    className="text-[#0060F4] hover:underline font-semibold text-[11px]"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(port)}
                                                    className="text-rose-600 hover:underline text-[11px]"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal Tambah Port */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Tambah Pelabuhan Baru"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Kode Port (UN/LOCODE)
                            </label>
                            <input
                                type="text"
                                maxLength={10}
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                placeholder="Contoh: IDGRS"
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Negara (2 Huruf ISO)
                            </label>
                            <input
                                type="text"
                                maxLength={2}
                                value={data.country}
                                onChange={(e) => setData('country', e.target.value.toUpperCase())}
                                placeholder="ID"
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white font-mono"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Nama Pelabuhan / Terminal
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Contoh: Pelabuhan Gresik"
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Kota / Kabupaten
                            </label>
                            <input
                                type="text"
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                                placeholder="Contoh: Gresik"
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Zona Waktu
                            </label>
                            <select
                                value={data.timezone}
                                onChange={(e) => setData('timezone', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            >
                                <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                                <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                                <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
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
                    onClose={() => setEditingPort(null)}
                    title={`Edit Pelabuhan ${editingPort.name}`}
                >
                    <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-[#082870] block mb-1">
                                    Kode Port
                                </label>
                                <input
                                    type="text"
                                    maxLength={10}
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                    className={
                                        'w-full text-xs rounded-xl border border-[#DCEAF8] ' +
                                        'p-2.5 bg-white font-mono'
                                    }
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-[#082870] block mb-1">
                                    Negara
                                </label>
                                <input
                                    type="text"
                                    maxLength={2}
                                    value={data.country}
                                    onChange={(e) =>
                                        setData('country', e.target.value.toUpperCase())
                                    }
                                    className={
                                        'w-full text-xs rounded-xl border border-[#DCEAF8] ' +
                                        'p-2.5 bg-white font-mono'
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Nama Pelabuhan
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-[#082870] block mb-1">
                                    Kota
                                </label>
                                <input
                                    type="text"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-[#082870] block mb-1">
                                    Status
                                </label>
                                <select
                                    value={data.is_active ? '1' : '0'}
                                    onChange={(e) => setData('is_active', e.target.value === '1')}
                                    className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                >
                                    <option value="1">Aktif</option>
                                    <option value="0">Nonaktif</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                            <Button variant="secondary" onClick={() => setEditingPort(null)}>
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
