import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';

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

interface ExpensesIndexProps {
    expenses: OutgoingPayment[];
    portCalls: Array<{
        id: string;
        job_number: string;
        ship?: { name: string };
        port?: { name: string };
    }>;
    vendors: Array<{ id: string; name: string }>;
    stats: {
        total: number;
        verified: number;
        pending: number;
        count: number;
    };
    filters: {
        type: string;
        status: string;
        search: string;
    };
}

const PAYMENT_TYPES = [
    'Pelindo Kedatangan',
    'Pelindo Keberangkatan',
    'Vendor Air Tawar',
    'Vendor Bunker BBM',
    'Perahu Motor Tambat',
    'Crew Transport',
    'Biaya Karantina & Bea Cukai',
    'Lain-lain',
];

export default function ExpensesIndex({
    expenses,
    portCalls,
    vendors,
    stats,
    filters,
}: ExpensesIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        port_call_id: portCalls[0]?.id || '',
        payment_type: 'Pelindo Kedatangan',
        recipient: 'PT Pelabuhan Indonesia (Persero)',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: `TRF-OUT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        notes: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/expenses', { search, type: filters.type, status: filters.status }, { preserveState: true });
    };

    const handleFilterStatus = (st: string) => {
        router.get('/expenses', { status: st, type: filters.type, search }, { preserveState: true });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/expenses', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <AppLayout title="Pengeluaran & Disbursement Operasional">
            <Head title="Pengeluaran Operasional — PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#DCEAF8]">
                    <div className="flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border border-[#DCEAF8] self-start">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer bg-[#0060F4] text-white shadow-sm"
                        >
                            <span>💰</span>
                            <span>Disbursement Kas</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white">
                                {stats.count}
                            </span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex-shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                        <span className="text-base leading-none font-bold">+</span>
                        <span>Catat Disbursement Baru</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Disbursement & Pengeluaran Kas
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            Pencatatan pembayaran Pelindo kedatangan/keberangkatan, vendor logistik, air tawar, dan perahu tambat
                        </p>
                    </div>
                </div>

                {/* ── Stats Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-medium">Total Disbursement Tercatat</div>
                        <div className="text-xl font-bold text-[#082870] dark:text-[#F1F5F9] mt-0.5">{formatRupiah(stats.total)}</div>
                        <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">{stats.count} transaksi pengeluaran</div>
                    </div>

                    <div className="bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Disbursement Terverifikasi ACC</div>
                        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{formatRupiah(stats.verified)}</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">Lunas & disetujui kasir/direksi</div>
                    </div>

                    <div className="bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Menunggu Verifikasi Bukti</div>
                        <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{formatRupiah(stats.pending)}</div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5">Perlu review bukti transfer bank</div>
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
                        placeholder="Cari nomor referensi, penerima, atau jenis pengeluaran..."
                        className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl text-xs sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9] placeholder-[#8C9BB9] dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] shadow-xs"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                router.get('/expenses', { status: filters.status });
                            }}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8C9BB9] hover:text-[#C62840] dark:hover:text-[#F87171]"
                        >
                            ✕
                        </button>
                    )}
                </form>

                {/* ── Status Filter Pills (matching Gambar 2) ── */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {[
                        { id: 'all', label: 'Semua Transaksi' },
                        { id: 'verified', label: 'Terverifikasi' },
                        { id: 'pending', label: 'Menunggu Review' },
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => handleFilterStatus(btn.id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                                filters.status === btn.id
                                    ? 'bg-[#0060F4] text-white shadow-xs'
                                    : 'bg-white dark:bg-[#0C1D36] text-[#52658E] dark:text-[#94A3B8] border border-[#DCEAF8] dark:border-[#1E3A5F] hover:bg-[#E0F0FF] dark:hover:bg-[#1E3A5F] hover:text-[#082870] dark:hover:text-[#F1F5F9]'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <Card className="overflow-hidden border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#F0F8FF] dark:bg-[#071322] border-b border-[#DCEAF8] dark:border-[#1E3A5F] text-[#082870] dark:text-[#94A3B8] font-semibold uppercase tracking-wider">
                                    <th className="py-3 px-4">No. Referensi Kopra</th>
                                    <th className="py-3 px-4">Jenis Pengeluaran</th>
                                    <th className="py-3 px-4">Kunjungan / Kapal</th>
                                    <th className="py-3 px-4">Penerima Dana</th>
                                    <th className="py-3 px-4">Nominal</th>
                                    <th className="py-3 px-4">Tanggal Bayar</th>
                                    <th className="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCEAF8]/60 dark:divide-[#1E3A5F] text-[#0B1F63] dark:text-[#F1F5F9]">
                                {expenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-[#F0F8FF]/50 dark:hover:bg-[#1E3A5F]/30 transition-colors">
                                        <td className="py-3.5 px-4 font-mono font-medium text-[#0060F4] dark:text-[#38BDF8]">
                                            {exp.reference_number}
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-[#082870] dark:text-[#F1F5F9]">
                                            {exp.payment_type}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-medium text-[#0B1F63] dark:text-[#F1F5F9]">{exp.port_call?.ship?.name || '-'}</div>
                                            <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8] font-mono">{exp.port_call?.job_number || '-'}</div>
                                        </td>
                                        <td className="py-3.5 px-4 text-neutral-800 dark:text-[#F1F5F9]">
                                            {exp.recipient}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 dark:text-[#F1F5F9]">
                                            {formatRupiah(exp.amount)}
                                        </td>
                                        <td className="py-3.5 px-4 text-[#52658E] dark:text-[#94A3B8]">
                                            {new Date(exp.payment_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <StatusBadge
                                                status={exp.verification_status === 'verified' ? 'Disetujui' : 'Menunggu Approval'}
                                                label={exp.verification_status === 'verified' ? 'Terverifikasi ACC' : 'Menunggu Review'}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal Catat Disbursement */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Catat Pengeluaran / Disbursement Operasional"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Kunjungan Kapal (Port Call / Job)</label>
                        <select
                            value={data.port_call_id}
                            onChange={(e) => setData('port_call_id', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        >
                            {portCalls.map((pc) => (
                                <option key={pc.id} value={pc.id}>
                                    {pc.job_number} — {pc.ship?.name} ({pc.port?.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Jenis Pembayaran</label>
                            <select
                                value={data.payment_type}
                                onChange={(e) => setData('payment_type', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            >
                                {PAYMENT_TYPES.map((pt) => (
                                    <option key={pt} value={pt}>{pt}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Nominal (IDR)</label>
                            <input
                                type="number"
                                min="1000"
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                placeholder="Contoh: 12500000"
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Penerima Dana / Vendor</label>
                        <input
                            type="text"
                            value={data.recipient}
                            onChange={(e) => setData('recipient', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">No. Referensi Transfer / Kopra</label>
                            <input
                                type="text"
                                value={data.reference_number}
                                onChange={(e) => setData('reference_number', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Tanggal Transfer</label>
                            <input
                                type="date"
                                value={data.payment_date}
                                onChange={(e) => setData('payment_date', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit" variant="primary" disabled={processing} className="bg-[#0060F4] text-white">
                            {processing ? 'Menyimpan...' : 'Simpan Pembayaran'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
