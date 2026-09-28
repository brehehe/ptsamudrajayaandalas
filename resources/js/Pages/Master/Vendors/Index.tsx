import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import StatusBadge from '../../../Components/ui/StatusBadge';
import Modal from '../../../Components/overlays/Modal';

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

export default function MasterVendorsIndex({ vendors, search: initialSearch }: MasterVendorsIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

    const { data, setData, post, put, processing, reset } = useForm({
        code: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        is_active: true,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/master/vendors', { search }, { preserveState: true });
    };

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

    return (
        <AppLayout title="Master Data Vendor & Rekanan">
            <Head title="Data Vendor - PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#DCEAF8]">
                    <div className="flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border border-[#DCEAF8] self-start">
                        <div className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 bg-[#0060F4] text-white shadow-sm">
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
                            reset();
                            setIsCreateModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex-shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                        <span className="text-base leading-none font-bold">+</span>
                        <span>Tambah Vendor Baru</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Master Data Vendor & Penyedia Jasa
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] mt-0.5">
                            Daftar vendor penyedia air tawar, BBM, perahu motor tambat, dan logistik kapal
                        </p>
                    </div>
                </div>

                {/* ── Search Bar ── */}
                <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C9BB9]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari kode vendor, nama perusahaan, email, atau kontak..."
                        className="w-full pl-10 pr-24 h-11 bg-white border border-[#DCEAF8] rounded-xl text-sm text-[#0B1F63] placeholder-[#8C9BB9] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                    />
                    <button
                        type="submit"
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#0060F4] hover:bg-[#0052D4] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                        Cari
                    </button>
                </form>

                {/* Vendors Table */}
                <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#F0F8FF] border-b border-[#DCEAF8] text-[#082870] font-semibold uppercase tracking-wider">
                                    <th className="py-3 px-4">Kode Vendor</th>
                                    <th className="py-3 px-4">Nama Perusahaan Vendor</th>
                                    <th className="py-3 px-4">Email & Telepon</th>
                                    <th className="py-3 px-4">Alamat Kantor / Dermaga</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCEAF8]/60 text-[#0B1F63]">
                                {vendors.map((v) => (
                                    <tr key={v.id} className="hover:bg-[#F0F8FF]/50 transition-colors">
                                        <td className="py-3.5 px-4 font-mono font-bold text-[#0060F4]">
                                            {v.code}
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-[#082870]">
                                            {v.name}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="text-neutral-800">{v.phone || '-'}</div>
                                            <div className="text-[11px] text-[#52658E]">{v.email || '-'}</div>
                                        </td>
                                        <td className="py-3.5 px-4 max-w-xs text-[#52658E]">
                                            {v.address || '-'}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <StatusBadge
                                                status={v.is_active ? 'Selesai' : 'Dibatalkan'}
                                                label={v.is_active ? 'Aktif' : 'Nonaktif'}
                                            />
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingVendor(v);
                                                        setData({
                                                            code: v.code,
                                                            name: v.name,
                                                            email: v.email || '',
                                                            phone: v.phone || '',
                                                            address: v.address || '',
                                                            is_active: v.is_active,
                                                        });
                                                    }}
                                                    className="text-[#0060F4] hover:underline font-semibold text-[11px]"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(v)}
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

            {/* Modal Tambah Vendor */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Tambah Rekanan Vendor Baru"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Kode Vendor</label>
                            <input
                                type="text"
                                maxLength={20}
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                placeholder="Contoh: VND-006"
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Nomor Telepon</label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                placeholder="+62 812..."
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Nama Perusahaan Vendor</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Contoh: PT Gresik Maritim Sejahtera"
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Email Kontak</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="vendor@email.com"
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Alamat Kantor / Dermaga</label>
                        <textarea
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            rows={2}
                            placeholder="Jl. Pelabuhan..."
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit" variant="primary" disabled={processing} className="bg-[#0060F4] text-white">
                            {processing ? 'Menyimpan...' : 'Simpan Vendor'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit Vendor */}
            {editingVendor && (
                <Modal
                    isOpen={!!editingVendor}
                    onClose={() => setEditingVendor(null)}
                    title={`Edit Vendor ${editingVendor.name}`}
                >
                    <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-[#082870] block mb-1">Kode Vendor</label>
                                <input
                                    type="text"
                                    maxLength={20}
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                    className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-[#082870] block mb-1">Telepon</label>
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Nama Vendor</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Email</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Alamat</label>
                            <textarea
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                rows={2}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Status</label>
                            <select
                                value={data.is_active ? '1' : '0'}
                                onChange={(e) => setData('is_active', e.target.value === '1')}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            >
                                <option value="1">Aktif</option>
                                <option value="0">Nonaktif</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                            <Button variant="secondary" onClick={() => setEditingVendor(null)}>
                                Batal
                            </Button>
                            <Button type="submit" variant="primary" disabled={processing} className="bg-[#0060F4] text-white">
                                {processing ? 'Memperbarui...' : 'Perbarui Vendor'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </AppLayout>
    );
}
