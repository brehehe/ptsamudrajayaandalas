import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';

interface PortCall {
    id: string;
    job_number: string;
    status: string;
    eta_at: string;
    etd_at: string;
    arrived_at?: string;
    berthed_at?: string;
    departed_at?: string;
    financial_status: string;
    ship?: {
        id: string;
        name: string;
        imo_number: string;
        company?: {
            name: string;
        };
    };
    port?: {
        name: string;
        code: string;
    };
    work_order?: {
        system_number: string;
        client_pic_name?: string;
    };
    daily_reports?: Array<{
        id: string;
        report_date: string;
        summary: string;
        officer?: {
            name: string;
        };
    }>;
}

interface DailyReport {
    id: string;
    report_date: string;
    summary: string;
    no_activity: boolean;
    submitted_at: string;
    port_call?: {
        job_number: string;
        ship?: {
            name: string;
        };
        port?: {
            name: string;
        };
    };
    officer?: {
        name: string;
    };
}

interface OperationsIndexProps {
    portCalls: PortCall[];
    dailyReports: DailyReport[];
    ships: Array<{ id: string; name: string }>;
    ports: Array<{ id: string; name: string }>;
    counts: {
        kunjungan: number;
        laporan: number;
        berthed: number;
        anchored: number;
    };
    activeTab: string;
    search: string;
}

export default function OperationsIndex({
    portCalls,
    dailyReports,
    counts,
    activeTab: initialTab,
    search: initialSearch,
}: OperationsIndexProps) {
    const [tab, setTab] = useState(initialTab || 'kunjungan');
    const [search, setSearch] = useState(initialSearch);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedPortCall, setSelectedPortCall] = useState<PortCall | null>(null);

    const { data, setData, post, processing, reset } = useForm({
        port_call_id: portCalls[0]?.id || '',
        report_date: new Date().toISOString().split('T')[0],
        summary: '',
        no_activity: false,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/operations', { tab, search }, { preserveState: true });
    };

    const handleStatusChange = (portCallId: string, newStatus: string) => {
        router.patch(`/operations/port-calls/${portCallId}/status`, { status: newStatus }, {
            preserveScroll: true,
        });
    };

    const handleReportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/operations/daily-reports', {
            onSuccess: () => {
                setIsReportModalOpen(false);
                reset();
            },
        });
    };

    const formatDateTime = (dtStr?: string | null) => {
        if (!dtStr) return '-';
        return new Date(dtStr).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout title="Operasional Lapangan & Kunjungan Kapal">
            <Head title="Operasional Keagenan — PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#DCEAF8]">
                    <div className="flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border border-[#DCEAF8] self-start">
                        <button
                            type="button"
                            onClick={() => setTab('kunjungan')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                tab === 'kunjungan'
                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#082870] hover:bg-white/60'
                            }`}
                        >
                            <span>⚓</span>
                            <span>Kunjungan Kapal</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tab === 'kunjungan' ? 'bg-white/20 text-white' : 'bg-white text-[#0060F4] border border-[#DCEAF8]'
                            }`}>
                                {counts.kunjungan}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTab('laporan')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                tab === 'laporan'
                                    ? 'bg-[#082870] text-white shadow-sm'
                                    : 'text-[#082870] hover:bg-white/60'
                            }`}
                        >
                            <span>📝</span>
                            <span>Laporan Harian Prima</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tab === 'laporan' ? 'bg-white/20 text-white' : 'bg-white text-[#082870] border border-[#DCEAF8]'
                            }`}>
                                {dailyReports.length}
                            </span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex-shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                        <span className="text-base leading-none font-bold">+</span>
                        <span>Kirim Laporan Lapangan</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Operasional Port Calls & Lapangan
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            Pemantauan pergerakan kapal (ETA/ETD, labuh, sandar) serta catatan aktivitas harian Pak Prima di dermaga
                        </p>
                    </div>
                </div>

                {/* ── Stat Badges ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-medium">Total Kunjungan (Job)</div>
                        <div className="text-2xl font-bold text-[#082870] dark:text-[#F1F5F9] mt-0.5">{counts.kunjungan}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Kapal Sandar (Berthed)</div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{counts.berthed}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-[11px] text-[#0060F4] dark:text-[#38BDF8] font-medium">Kapal Labuh (Anchored)</div>
                        <div className="text-2xl font-bold text-[#0060F4] dark:text-[#38BDF8] mt-0.5">{counts.anchored}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Laporan Lapangan Masuk</div>
                        <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-0.5">{counts.laporan}</div>
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
                        placeholder="Cari job number, nama kapal, atau pelabuhan..."
                        className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl text-xs sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9] placeholder-[#8C9BB9] dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] shadow-xs"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                router.get('/operations', { tab });
                            }}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8C9BB9] hover:text-[#C62840] dark:hover:text-[#F87171]"
                        >
                            ✕
                        </button>
                    )}
                </form>

                {/* Tab 1: Port Calls */}
                {tab === 'kunjungan' && (
                    <Card className="overflow-hidden border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#F0F8FF] dark:bg-[#071322] border-b border-[#DCEAF8] dark:border-[#1E3A5F] text-[#082870] dark:text-[#94A3B8] font-semibold uppercase tracking-wider">
                                        <th className="py-3 px-4">No. Job / SPK</th>
                                        <th className="py-3 px-4">Armada Kapal</th>
                                        <th className="py-3 px-4">Pelabuhan</th>
                                        <th className="py-3 px-4">Jadwal ETA / ETD</th>
                                        <th className="py-3 px-4">Status Operasi</th>
                                        <th className="py-3 px-4 text-right">Update Status Gerak</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#DCEAF8]/60 dark:divide-[#1E3A5F] text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {portCalls.map((pc) => (
                                        <tr key={pc.id} className="hover:bg-[#F0F8FF]/50 dark:hover:bg-[#1E3A5F]/30 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-medium text-[#0060F4] dark:text-[#38BDF8]">
                                                {pc.job_number}
                                                <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8] font-sans">
                                                    SPK: {pc.work_order?.system_number || '-'}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-[#082870] dark:text-[#F1F5F9]">{pc.ship?.name}</div>
                                                <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                    {pc.ship?.company?.name || 'Klien Langsung'} • IMO {pc.ship?.imo_number}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium">{pc.port?.name}</div>
                                                <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8] font-mono">{pc.port?.code}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="text-xs font-medium dark:text-[#F1F5F9]">ETA: {formatDateTime(pc.eta_at)}</div>
                                                <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">ETD: {formatDateTime(pc.etd_at)}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <StatusBadge
                                                    status={
                                                        pc.status === 'berthed'
                                                            ? 'Sandar'
                                                            : pc.status === 'anchored'
                                                            ? 'Labuh'
                                                            : pc.status === 'scheduled'
                                                            ? 'Akan Datang'
                                                            : 'Selesai'
                                                    }
                                                    label={
                                                        pc.status === 'berthed'
                                                            ? 'Sandar di Dermaga'
                                                            : pc.status === 'anchored'
                                                            ? 'Labuh Jangkar'
                                                            : pc.status === 'scheduled'
                                                            ? 'Jadwal Datang'
                                                            : 'Berangkat / Selesai'
                                                    }
                                                />
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <select
                                                    value={pc.status}
                                                    onChange={(e) => handleStatusChange(pc.id, e.target.value)}
                                                    className="text-[11px] font-medium py-1 px-2 rounded-lg border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] text-[#082870] dark:text-[#F1F5F9] focus:ring-1 focus:ring-[#0060F4]"
                                                >
                                                    <option value="scheduled">Jadwal (Scheduled)</option>
                                                    <option value="anchored">Labuh (Anchored)</option>
                                                    <option value="berthed">Sandar (Berthed)</option>
                                                    <option value="departed">Berangkat (Departed)</option>
                                                    <option value="completed">Selesai (Completed)</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab 2: Daily Reports */}
                {tab === 'laporan' && (
                    <Card className="overflow-hidden border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="divide-y divide-[#DCEAF8]/60 dark:divide-[#1E3A5F]">
                            {dailyReports.map((dr) => (
                                <div key={dr.id} className="p-4 hover:bg-[#F0F8FF]/40 dark:hover:bg-[#1E3A5F]/20 transition">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-[#0060F4]/10 dark:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#38BDF8] font-bold flex items-center justify-center text-xs">
                                                {dr.officer?.name ? dr.officer.name[0] : 'P'}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-xs text-[#082870] dark:text-[#F1F5F9]">{dr.officer?.name || 'Pak Prima'}</div>
                                                <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                                    Kapal: {dr.port_call?.ship?.name} • Pelabuhan: {dr.port_call?.port?.name} • Job: {dr.port_call?.job_number}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-medium bg-[#F0F8FF] dark:bg-[#071322] px-2.5 py-1 rounded-md border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                            Tanggal: {new Date(dr.report_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-800 dark:text-[#CBD5E1] leading-relaxed pl-10">
                                        {dr.summary}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Modal Input Laporan Harian */}
            <Modal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                title="Kirim Laporan Harian Lapangan (Pak Prima)"
            >
                <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Pilih Kunjungan Kapal (Port Call)</label>
                        <select
                            value={data.port_call_id}
                            onChange={(e) => setData('port_call_id', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white focus:ring-2 focus:ring-[#0060F4]"
                            required
                        >
                            {portCalls.map((pc) => (
                                <option key={pc.id} value={pc.id}>
                                    {pc.job_number} — {pc.ship?.name} ({pc.port?.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Tanggal Kegiatan</label>
                        <input
                            type="date"
                            value={data.report_date}
                            onChange={(e) => setData('report_date', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Ringkasan Aktivitas Lapangan</label>
                        <textarea
                            value={data.summary}
                            onChange={(e) => setData('summary', e.target.value)}
                            rows={4}
                            placeholder="Catat kondisi cuaca, koordinasi sandar dermaga, realisasi pengisian air/BBM, serta izin clearance..."
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white focus:ring-2 focus:ring-[#0060F4]"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit" variant="primary" disabled={processing} className="bg-[#0060F4] text-white">
                            {processing ? 'Mengirim...' : 'Kirim Laporan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
