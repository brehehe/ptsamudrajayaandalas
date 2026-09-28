import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';

interface Ship {
    id: string;
    name: string;
    imo_number: string;
    ship_type?: string;
    company?: {
        id: string;
        name: string;
    };
}

interface PortCall {
    id: string;
    job_number: string;
    ship: Ship;
    port: {
        name: string;
    };
}

interface NeedItem {
    id: string;
    request_number: string;
    ship_id: string;
    status: string;
    request_date: string;
    notes?: string;
    created_at: string;
    ship?: Ship;
    creator?: {
        name: string;
    };
    port_call?: {
        job_number: string;
        port?: {
            name: string;
        };
    };
}

interface NeedsIndexProps {
    needs: NeedItem[];
    ships: Ship[];
    portCalls: PortCall[];
    counts: {
        semua: number;
        menunggu: number;
        proses: number;
        selesai: number;
    };
    activeStatus: string;
    search: string;
}

const NEED_TYPES = [
    { label: 'Air Tawar (Fresh Water)', value: 'Air Tawar' },
    { label: 'Perahu Motor Tambat', value: 'Perahu Motor Tambat' },
    { label: 'BBM / Bunker MGO', value: 'BBM / Bunker MGO' },
    { label: 'Crew Transport / Boat', value: 'Crew Transport' },
    { label: 'Jasa Pandu & Tunda Pelindo', value: 'Jasa Pandu & Tunda' },
    { label: 'Perbekalan Makanan (Provisions)', value: 'Perbekalan Makanan' },
    { label: 'Suku Cadang & Workshop', value: 'Suku Cadang & Workshop' },
    { label: 'Lain-lain', value: 'Lain-lain' },
];

export default function NeedsIndex({
    needs,
    ships,
    portCalls,
    counts,
    activeStatus,
    search: initialSearch,
}: NeedsIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedNeed, setSelectedNeed] = useState<NeedItem | null>(null);

    const { data, setData, post, processing, reset } = useForm({
        ship_id: ships[0]?.id || '',
        port_call_id: portCalls[0]?.id || '',
        need_type: 'Air Tawar',
        quantity: '20',
        unit: 'Ton',
        required_at: 'Segera saat sandar',
        notes: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/needs', { status: activeStatus, search }, { preserveState: true });
    };

    const handleStatusTab = (st: string) => {
        router.get('/needs', { status: st, search }, { preserveState: true });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/needs', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleUpdateStatus = (id: string, newStatus: string) => {
        router.patch(`/needs/${id}/status`, { status: newStatus }, {
            preserveScroll: true,
        });
    };

    const statusTabs = [
        { id: 'semua', label: 'Semua', count: counts.semua },
        { id: 'menunggu', label: 'Menunggu Review', count: counts.menunggu },
        { id: 'proses', label: 'Dalam Proses', count: counts.proses },
        { id: 'selesai', label: 'Selesai', count: counts.selesai },
    ];

    return (
        <AppLayout title="Kebutuhan Armada Kapal">
            <Head title="Kebutuhan Logistik Armada — PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#DCEAF8]">
                    <div className="flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border border-[#DCEAF8] self-start">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer bg-[#0060F4] text-white shadow-sm"
                        >
                            <span>📦</span>
                            <span>Kebutuhan Armada</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white">
                                {counts.semua}
                            </span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex-shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                        <span className="text-base leading-none font-bold">+</span>
                        <span>Catat Kebutuhan Baru</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Kebutuhan Armada Kapal
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] mt-0.5">
                            Data monitoring operasional keagenan dan kebutuhan logistik kapal di pelabuhan
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
                        placeholder="Cari nama kapal, nomor pengajuan, atau rincian kebutuhan..."
                        className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#DCEAF8] rounded-xl text-xs sm:text-sm text-[#0B1F63] placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] shadow-xs"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                router.get('/needs', { status: activeStatus });
                            }}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8C9BB9] hover:text-[#C62840]"
                        >
                            ✕
                        </button>
                    )}
                </form>

                {/* ── Status Filter Pills (matching Gambar 2) ── */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {statusTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleStatusTab(tab.id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                                activeStatus === tab.id
                                    ? 'bg-[#0060F4] text-white shadow-xs'
                                    : 'bg-white text-[#52658E] border border-[#DCEAF8] hover:bg-[#E0F0FF] hover:text-[#082870]'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-2 py-0.2 rounded-full text-[10.5px] font-black ${
                                activeStatus === tab.id
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#F0F8FF] text-[#0060F4]'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── Main Data Card / Table ── */}
                <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                    {needs.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E0F0FF] flex items-center justify-center text-[#0060F4]">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-[#082870]">Belum Ada Data Kebutuhan</h3>
                            <p className="text-xs text-[#52658E] mt-1 max-w-sm mx-auto">
                                Tidak ada catatan kebutuhan logistik kapal dengan kriteria filter saat ini.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#F0F8FF] border-b border-[#DCEAF8] text-[#082870] font-semibold uppercase tracking-wider">
                                        <th className="py-3 px-4">No. Pengajuan</th>
                                        <th className="py-3 px-4">Kapal & Pemilik</th>
                                        <th className="py-3 px-4">Pelabuhan / Job</th>
                                        <th className="py-3 px-4">Rincian Kebutuhan</th>
                                        <th className="py-3 px-4">Pelapor</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#DCEAF8]/60 text-[#0B1F63]">
                                    {needs.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#F0F8FF]/50 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-medium text-[#0060F4]">
                                                {item.request_number}
                                                <div className="text-[10px] text-[#52658E] font-sans font-normal">
                                                    {new Date(item.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-[#082870]">{item.ship?.name || 'Kapal Tidak Ditemukan'}</div>
                                                <div className="text-[11px] text-[#52658E]">
                                                    IMO: {item.ship?.imo_number || '-'} • {item.ship?.company?.name || 'Agen Pribadi'}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-[#0B1F63]">{item.port_call?.port?.name || 'Pelabuhan Gresik'}</div>
                                                <div className="text-[10px] text-[#52658E] font-mono">
                                                    {item.port_call?.job_number || 'Kunjungan Langsung'}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <div className="text-xs font-normal line-clamp-2 text-neutral-800">
                                                    {item.notes || 'Permintaan logistik operasional kapal'}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium">{item.creator?.name || 'Pak Prima'}</div>
                                                <div className="text-[10px] text-[#52658E]">Staf Lapangan</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <StatusBadge
                                                    status={item.status}
                                                    label={item.status}
                                                />
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {item.status === 'Menunggu Approval' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(item.id, 'Dalam Proses')}
                                                            className="px-2 py-1 bg-[#19B5F7]/10 text-[#0060F4] hover:bg-[#0060F4] hover:text-white rounded-md text-[11px] font-semibold transition"
                                                        >
                                                            Proses
                                                        </button>
                                                    )}
                                                    {item.status === 'Dalam Proses' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(item.id, 'Selesai')}
                                                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-md text-[11px] font-semibold transition"
                                                        >
                                                            Selesai
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setSelectedNeed(item)}
                                                        className="px-2 py-1 text-[#52658E] hover:text-[#0060F4] rounded-md text-[11px] transition"
                                                    >
                                                        Detail
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            {/* Modal Detail Kebutuhan */}
            {selectedNeed && (
                <Modal
                    isOpen={!!selectedNeed}
                    onClose={() => setSelectedNeed(null)}
                    title={`Detail Kebutuhan ${selectedNeed.request_number}`}
                >
                    <div className="space-y-4 text-xs">
                        <div className="p-3 bg-[#F0F8FF] rounded-xl border border-[#DCEAF8] space-y-2">
                            <div className="flex justify-between">
                                <span className="text-[#52658E]">Nomor Pengajuan:</span>
                                <span className="font-mono font-bold text-[#0060F4]">{selectedNeed.request_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#52658E]">Armada Kapal:</span>
                                <span className="font-semibold text-[#082870]">{selectedNeed.ship?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#52658E]">Status:</span>
                                <StatusBadge status={selectedNeed.status} label={selectedNeed.status} />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#52658E]">Diajukan Oleh:</span>
                                <span>{selectedNeed.creator?.name || 'Pak Prima'}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-[#082870] block mb-1">Rincian Deskripsi Kebutuhan:</label>
                            <div className="p-3 bg-white border border-[#DCEAF8] rounded-xl text-neutral-800 leading-relaxed">
                                {selectedNeed.notes || 'Tidak ada catatan tambahan.'}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                            <Button variant="secondary" onClick={() => setSelectedNeed(null)}>
                                Tutup
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal Input Kebutuhan Baru */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Catat Kebutuhan Logistik Kapal"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-[#082870] block mb-1">Pilih Kapal</label>
                        <select
                            value={data.ship_id}
                            onChange={(e) => setData('ship_id', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white focus:ring-2 focus:ring-[#0060F4]"
                            required
                        >
                            {ships.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} (IMO: {s.imo_number})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-[#082870] block mb-1">Jenis Kebutuhan</label>
                            <select
                                value={data.need_type}
                                onChange={(e) => setData('need_type', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white focus:ring-2 focus:ring-[#0060F4]"
                            >
                                {NEED_TYPES.map((nt) => (
                                    <option key={nt.value} value={nt.value}>{nt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-[#082870] block mb-1">Jumlah & Satuan</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={data.quantity}
                                    onChange={(e) => setData('quantity', e.target.value)}
                                    className="w-2/3 text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                    required
                                />
                                <input
                                    type="text"
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    className="w-1/3 text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[#082870] block mb-1">Target Waktu Kebutuhan</label>
                        <input
                            type="text"
                            value={data.required_at}
                            onChange={(e) => setData('required_at', e.target.value)}
                            placeholder="Contoh: Saat kapal tiba di dermaga 2"
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[#082870] block mb-1">Catatan Tambahan</label>
                        <textarea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                            placeholder="Keterangan spesifikasi, vendor rekomendasi, atau instruksi khusus..."
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white focus:ring-2 focus:ring-[#0060F4]"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit" variant="primary" disabled={processing} className="bg-[#0060F4] text-white">
                            {processing ? 'Menyimpan...' : 'Simpan Kebutuhan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
