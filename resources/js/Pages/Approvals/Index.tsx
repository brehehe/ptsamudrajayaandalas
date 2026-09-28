import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';

interface RequestItem {
    id: string;
    item_name: string;
    unit?: string;
    quantity: number | string;
    hpp_price?: number | string;
    selling_price?: number | string;
    status: string;
    director_status?: string;
    director_notes?: string;
    is_urgent: boolean;
    vendor?: {
        name: string;
    };
    product?: {
        name: string;
        item_type: 'jasa' | 'non_jasa';
    };
}

interface ShipRequest {
    id: string;
    request_number: string;
    ship_id: string;
    status: string;
    request_date: string;
    notes?: string;
    created_at: string;
    ship?: {
        name: string;
        imo_number: string;
        company?: {
            name: string;
        };
    };
    creator?: {
        name: string;
    };
    port_call?: {
        job_number: string;
        port?: {
            name: string;
        };
    };
    items?: RequestItem[];
}

interface OutgoingPayment {
    id: string;
    reference_number: string;
    payment_type: string;
    recipient: string;
    amount: number;
    currency: string;
    payment_date: string;
    verification_status: string;
    port_call?: {
        job_number: string;
        ship?: {
            name: string;
        };
        port?: {
            name: string;
        };
    };
    recorder?: {
        name: string;
    };
    verifier?: {
        name: string;
    };
}

interface ApprovalsIndexProps {
    requests: ShipRequest[];
    payments: OutgoingPayment[];
    counts: {
        menunggu: number;
        disetujui: number;
        ditolak: number;
    };
    activeTab: string;
    search: string;
}

export default function ApprovalsIndex({
    requests,
    payments,
    counts,
    activeTab,
    search: initialSearch,
}: ApprovalsIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [activeSection, setActiveSection] = useState<'requests' | 'payments'>('requests');
    const [rejectModalItem, setRejectModalItem] = useState<ShipRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [reviewModalItem, setReviewModalItem] = useState<ShipRequest | null>(null);
    const [itemDecisions, setItemDecisions] = useState<Record<string, { status: 'approved' | 'rejected' | 'pending'; notes: string }>>({});

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/approvals', { tab: activeTab, search }, { preserveState: true });
    };

    const handleTabChange = (tab: string) => {
        router.get('/approvals', { tab, search }, { preserveState: true });
    };

    const handleApproveRequest = (id: string) => {
        router.post(`/approvals/requests/${id}/approve`, {}, { preserveScroll: true });
    };

    const openReviewModal = (req: ShipRequest) => {
        setReviewModalItem(req);
        const initial: Record<string, { status: 'approved' | 'rejected' | 'pending'; notes: string }> = {};
        req.items?.forEach((it) => {
            initial[it.id] = {
                status: (it.director_status as 'approved' | 'rejected' | 'pending') || 'approved',
                notes: it.director_notes || '',
            };
        });
        setItemDecisions(initial);
    };

    const handleSaveItemDecisions = () => {
        if (!reviewModalItem) return;
        const decisionsArray = Object.entries(itemDecisions).map(([itemId, dec]) => ({
            item_id: itemId,
            status: dec.status,
            director_notes: dec.notes,
        }));

        router.post(`/approvals/requests/${reviewModalItem.id}/item-decision`, {
            decisions: decisionsArray,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setReviewModalItem(null);
            },
        });
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectModalItem) return;
        router.post(`/approvals/requests/${rejectModalItem.id}/reject`, { reason: rejectReason }, {
            preserveScroll: true,
            onSuccess: () => {
                setRejectModalItem(null);
                setRejectReason('');
            },
        });
    };

    const handleVerifyPayment = (id: string) => {
        router.post(`/approvals/payments/${id}/verify`, {}, { preserveScroll: true });
    };

    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <AppLayout title="Approval Direktur & Otorisasi Dana Kopra">
            <Head title="Approval & Otorisasi - PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & Section (matching Gambar 2) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#DCEAF8]">
                    <div className="flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border border-[#DCEAF8] self-start">
                        <button
                            type="button"
                            onClick={() => setActiveSection('requests')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                activeSection === 'requests'
                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#52658E] hover:text-[#0B1F63] hover:bg-white/50'
                            }`}
                        >
                            <span>📝</span>
                            <span>Pengajuan Kebutuhan</span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                    activeSection === 'requests'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white text-[#0B1F63] border border-[#DCEAF8]'
                                }`}
                            >
                                {requests.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveSection('payments')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                activeSection === 'payments'
                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#52658E] hover:text-[#0B1F63] hover:bg-white/50'
                            }`}
                        >
                            <span>💸</span>
                            <span>Disbursement & Kopra</span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                    activeSection === 'payments'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white text-[#0B1F63] border border-[#DCEAF8]'
                                }`}
                            >
                                {payments.length}
                            </span>
                        </button>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold self-start sm:self-auto">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>{counts.menunggu} Menunggu Otorisasi</span>
                    </div>
                </div>

                {/* ── Title Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Persetujuan & Otorisasi Direksi
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] mt-0.5">
                            Tinjau pengajuan kebutuhan armada dan verifikasi otorisasi pengeluaran dana disbursement operasional
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
                        placeholder="Cari nomor referensi, kapal, atau penerima..."
                        className="w-full pl-10 pr-24 h-11 bg-white border border-[#DCEAF8] rounded-xl text-sm text-[#0B1F63] placeholder-[#8C9BB9] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                    />
                    <button
                        type="submit"
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#0060F4] hover:bg-[#0052D4] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                        Cari
                    </button>
                </form>

                {/* ── Status Tabs (Capsules) ── */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {[
                        { id: 'menunggu', label: 'Menunggu Persetujuan', count: counts.menunggu },
                        { id: 'disetujui', label: 'Disetujui', count: counts.disetujui },
                        { id: 'ditolak', label: 'Ditolak', count: counts.ditolak },
                    ].map((t) => {
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => handleTabChange(t.id)}
                                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    isActive
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : 'bg-white text-[#52658E] hover:bg-[#F0F8FF] hover:text-[#0B1F63] border border-[#DCEAF8]'
                                }`}
                            >
                                <span>{t.label}</span>
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-black ${
                                        isActive
                                            ? 'bg-white/25 text-white'
                                            : 'bg-[#E0F0FF] text-[#0060F4]'
                                    }`}
                                >
                                    {t.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                {activeSection === 'requests' ? (
                    <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                        {requests.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#082870]">Tidak Ada Pengajuan Kebutuhan Tertunda</h3>
                                <p className="text-xs text-[#52658E] mt-1">Semua pengajuan telah ditindaklanjuti atau sesuai kriteria filter.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-[#F0F8FF] border-b border-[#DCEAF8] text-[#082870] font-semibold uppercase tracking-wider">
                                            <th className="py-3 px-4">No. Pengajuan</th>
                                            <th className="py-3 px-4">Kapal & Perusahaan</th>
                                            <th className="py-3 px-4">Rincian Kebutuhan</th>
                                            <th className="py-3 px-4">Pelapor</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4 text-right">Otorisasi Direktur</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#DCEAF8]/60 text-[#0B1F63]">
                                        {requests.map((req) => (
                                            <tr key={req.id} className="hover:bg-[#F0F8FF]/50 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-medium text-[#0060F4]">
                                                    {req.request_number}
                                                    <div className="text-[10px] text-[#52658E] font-sans font-normal">
                                                        {new Date(req.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-[#082870]">{req.ship?.name}</div>
                                                    <div className="text-[11px] text-[#52658E]">
                                                        {req.ship?.company?.name || 'Klien Keagenan'} • IMO {req.ship?.imo_number}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 max-w-sm">
                                                    <p className="text-xs text-neutral-800 line-clamp-2">{req.notes || '-'}</p>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium">{req.creator?.name || 'Pak Prima'}</div>
                                                    <div className="text-[10px] text-[#52658E]">Tim Lapangan</div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <StatusBadge status={req.status} label={req.status} />
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    {req.status === 'Menunggu Approval' || req.status === 'Menunggu Approval Direktur' ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {req.items && req.items.length > 0 && (
                                                                <button
                                                                    onClick={() => openReviewModal(req)}
                                                                    className="px-2.5 py-1.5 bg-[#0060F4] hover:bg-[#082870] text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                                >
                                                                    Tinjau Item ({req.items.length})
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleApproveRequest(req.id)}
                                                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                            >
                                                                ACC Semua
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectModalItem(req)}
                                                                className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition"
                                                            >
                                                                Tolak
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-[#52658E]">Telah Diproses</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                ) : (
                    <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                        {payments.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#082870]">Tidak Ada Otorisasi Pembayaran Tertunda</h3>
                                <p className="text-xs text-[#52658E] mt-1">Semua disbursement dan pengeluaran Kopra telah terverifikasi.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-[#F0F8FF] border-b border-[#DCEAF8] text-[#082870] font-semibold uppercase tracking-wider">
                                            <th className="py-3 px-4">No. Referensi Kopra</th>
                                            <th className="py-3 px-4">Jenis Disbursement</th>
                                            <th className="py-3 px-4">Penerima & Kapal</th>
                                            <th className="py-3 px-4">Nominal</th>
                                            <th className="py-3 px-4">Dicatat Oleh</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4 text-right">Verifikasi Dana</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#DCEAF8]/60 text-[#0B1F63]">
                                        {payments.map((p) => (
                                            <tr key={p.id} className="hover:bg-[#F0F8FF]/50 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-medium text-[#0060F4]">
                                                    {p.reference_number}
                                                    <div className="text-[10px] text-[#52658E] font-sans">
                                                        {new Date(p.payment_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 font-semibold text-[#082870]">
                                                    {p.payment_type}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-[#0B1F63]">{p.recipient}</div>
                                                    <div className="text-[11px] text-[#52658E]">
                                                        Kapal: {p.port_call?.ship?.name || '-'} ({p.port_call?.job_number || '-'})
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                                                    {formatRupiah(p.amount)}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium">{p.recorder?.name || 'Bu Titik'}</div>
                                                    <div className="text-[10px] text-[#52658E]">Keuangan</div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <StatusBadge
                                                        status={p.verification_status === 'verified' ? 'Disetujui' : 'Menunggu Approval'}
                                                        label={p.verification_status === 'verified' ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                                                    />
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    {p.verification_status === 'pending' ? (
                                                        <button
                                                            onClick={() => handleVerifyPayment(p.id)}
                                                            className="px-3 py-1.5 bg-[#0060F4] hover:bg-[#082870] text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                        >
                                                            Verifikasi ACC
                                                        </button>
                                                    ) : (
                                                        <div className="text-[11px] text-emerald-700 font-medium">
                                                            ACC oleh {p.verifier?.name || 'Direktur'}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}
            </div>

            {/* Reject Modal */}
            {rejectModalItem && (
                <Modal
                    isOpen={!!rejectModalItem}
                    onClose={() => setRejectModalItem(null)}
                    title={`Tolak Pengajuan ${rejectModalItem.request_number}`}
                >
                    <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
                        <p className="text-[#52658E]">
                            Masukkan alasan penolakan untuk pengajuan armada <strong>{rejectModalItem.ship?.name}</strong>:
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="Alasan penolakan (misal: spesifikasi tidak sesuai, anggaran melebihi batas, dll)..."
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white focus:ring-2 focus:ring-[#C62840]"
                            required
                        />
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                            <Button variant="secondary" onClick={() => setRejectModalItem(null)}>
                                Batal
                            </Button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition"
                            >
                                Konfirmasi Tolak
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Itemized Review Modal for Direktur (Pak Ryan) */}
            {reviewModalItem && (
                <Modal
                    isOpen={!!reviewModalItem}
                    onClose={() => setReviewModalItem(null)}
                    title={`Filter & Keputusan Direktur: ${reviewModalItem.request_number}`}
                    size="lg"
                >
                    <div className="space-y-4 text-xs">
                        <div className="p-3 bg-[#F0F8FF] rounded-xl border border-[#DCEAF8] flex items-center justify-between">
                            <div>
                                <p className="font-bold text-[#0B1F63] text-sm">{reviewModalItem.ship?.name}</p>
                                <p className="text-[11px] text-[#52658E]">Klien: {reviewModalItem.ship?.company?.name || 'Klien Keagenan'}</p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E0F0FF] text-[#0060F4]">
                                {reviewModalItem.items?.length || 0} Item Kebutuhan
                            </span>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {reviewModalItem.items?.map((it, idx) => {
                                const dec = itemDecisions[it.id] || { status: 'approved', notes: '' };
                                const hpp = Number(it.hpp_price) || 0;
                                const sell = Number(it.selling_price) || 0;
                                const margin = sell - hpp;

                                return (
                                    <div
                                        key={it.id}
                                        className={`p-3.5 rounded-xl border transition-all ${
                                            dec.status === 'approved'
                                                ? 'bg-[#DCF7E8]/30 border-[#087443]/40'
                                                : dec.status === 'rejected'
                                                ? 'bg-[#FFE7EC]/40 border-[#C62840]/40'
                                                : 'bg-white border-[#DCEAF8]'
                                        }`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#DCEAF8]/60">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[#0B1F63] text-xs md:text-sm">
                                                        #{idx + 1} {it.item_name}
                                                    </span>
                                                    {it.is_urgent && (
                                                        <span className="text-[10px] font-bold text-[#C62840] bg-[#FFE7EC] px-1.5 py-0.5 rounded">
                                                            Urgent
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-[#52658E] mt-0.5">
                                                    Qty: <strong>{it.quantity} {it.unit}</strong> • Vendor: <strong>{it.vendor?.name || 'Umum'}</strong>
                                                </p>
                                            </div>

                                            {/* Decision Toggle */}
                                            <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => setItemDecisions(prev => ({
                                                        ...prev,
                                                        [it.id]: { ...prev[it.id], status: 'approved' },
                                                    }))}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                        dec.status === 'approved'
                                                            ? 'bg-[#087443] text-white shadow-xs'
                                                            : 'bg-[#F0F8FF] text-[#52658E] hover:bg-emerald-50 hover:text-[#087443]'
                                                    }`}
                                                >
                                                    ✓ Setujui
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setItemDecisions(prev => ({
                                                        ...prev,
                                                        [it.id]: { ...prev[it.id], status: 'rejected' },
                                                    }))}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                        dec.status === 'rejected'
                                                            ? 'bg-[#C62840] text-white shadow-xs'
                                                            : 'bg-[#F0F8FF] text-[#52658E] hover:bg-rose-50 hover:text-[#C62840]'
                                                    }`}
                                                >
                                                    ✗ Tolak
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px]">
                                            <div>
                                                <span className="text-[#52658E]">HPP Vendor:</span>
                                                <p className="font-mono font-bold text-[#0B1F63]">
                                                    Rp {hpp.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[#52658E]">Harga Jual Klien:</span>
                                                <p className="font-mono font-bold text-[#0060F4]">
                                                    Rp {sell.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[#52658E]">Margin SJA:</span>
                                                <p className={`font-mono font-bold ${margin >= 0 ? 'text-[#087443]' : 'text-[#C62840]'}`}>
                                                    Rp {margin.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                        </div>

                                        {dec.status === 'rejected' && (
                                            <div className="mt-2 pt-2 border-t border-rose-200">
                                                <input
                                                    type="text"
                                                    value={dec.notes}
                                                    onChange={(e) => setItemDecisions(prev => ({
                                                        ...prev,
                                                        [it.id]: { ...prev[it.id], notes: e.target.value },
                                                    }))}
                                                    placeholder="Catatan penolakan untuk Admin Bu Titik / Pak Prima..."
                                                    className="w-full px-2.5 py-1 text-xs border border-rose-300 rounded-lg bg-white text-rose-900 focus:ring-1 focus:ring-[#C62840]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-[#DCEAF8]">
                            <Button variant="secondary" onClick={() => setReviewModalItem(null)}>
                                Batal
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveItemDecisions}
                                className="bg-[#0060F4] hover:bg-[#082870] text-white px-5 py-2 text-xs font-bold"
                            >
                                Simpan Keputusan Direktur
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
