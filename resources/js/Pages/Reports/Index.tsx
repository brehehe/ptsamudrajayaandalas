import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';

interface PortCallReportItem {
    id: string;
    job_number: string;
    ship_name: string;
    company_name: string;
    port_name: string;
    status: string;
    eta: string;
    etd: string;
    total_invoiced: number;
    total_expenses: number;
    margin: number;
}

interface ReportsIndexProps {
    summary: {
        total_port_calls: number;
        active_vessels: number;
        total_invoiced: number;
        agency_revenue: number;
        reimburse_revenue: number;
        total_expenses: number;
        net_agency_margin: number;
        completed_requests: number;
        pending_requests: number;
    };
    portCalls: PortCallReportItem[];
}

export default function ReportsIndex({ summary, portCalls }: ReportsIndexProps) {
    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout title="Laporan Operasional & Rekonsiliasi Keuangan">
            <Head title="Laporan Rekonsiliasi - PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#DCEAF8]">
                    <div className="flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border border-[#DCEAF8] self-start">
                        <div className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 bg-[#0060F4] text-white shadow-sm">
                            <span>📊</span>
                            <span>Rekapitulasi Eksekutif</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white">
                                {portCalls.length} Kunjungan
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F0F8FF] border border-[#DCEAF8] text-[#082870] text-xs sm:text-sm font-bold shadow-xs transition-all flex-shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                        <svg className="w-4 h-4 text-[#0060F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Cetak Laporan</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] tracking-tight">
                            Laporan Operasional & Rekonsiliasi
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            Ringkasan performa keagenan kapal, pendapatan jasa, realisasi biaya pihak ketiga, dan margin operasional
                        </p>
                    </div>
                </div>

                {/* Financial & Operational Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#0C1D36] p-4.5 rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-xs text-[#52658E] dark:text-[#94A3B8] font-medium">Total Nilai Tagihan (Billing)</div>
                        <div className="text-2xl font-bold text-[#082870] dark:text-[#F1F5F9] mt-1">{formatRupiah(summary.total_invoiced)}</div>
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-1">
                            Jasa: {formatRupiah(summary.agency_revenue)}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#0C1D36] p-4.5 rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-xs text-[#52658E] dark:text-[#94A3B8] font-medium">Total Disbursement (Keluar)</div>
                        <div className="text-2xl font-bold text-neutral-800 dark:text-[#F1F5F9] mt-1">{formatRupiah(summary.total_expenses)}</div>
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-1">Pelindo, BBM, Air, Perahu</div>
                    </div>

                    <div className="bg-white dark:bg-[#0C1D36] p-4.5 rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Margin Keagenan (Gross)</div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{formatRupiah(summary.net_agency_margin)}</div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-1">Keuntungan operasional bersih</div>
                    </div>

                    <div className="bg-white dark:bg-[#0C1D36] p-4.5 rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                        <div className="text-xs text-[#0060F4] dark:text-[#38BDF8] font-medium">Armada Aktif & Selesai</div>
                        <div className="text-2xl font-bold text-[#0060F4] dark:text-[#38BDF8] mt-1">
                            {summary.active_vessels} <span className="text-sm font-normal text-[#52658E] dark:text-[#94A3B8]">/ {summary.total_port_calls} Jobs</span>
                        </div>
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-1">{summary.completed_requests} pengajuan terlaksana</div>
                    </div>
                </div>

                {/* Port Calls Performance Table */}
                <Card className="overflow-hidden border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                    <div className="p-4 border-b border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] flex justify-between items-center">
                        <h2 className="text-sm font-bold text-[#082870] dark:text-[#F1F5F9]">Rekapitulasi Finansial per Job Kunjungan</h2>
                        <span className="text-xs text-[#52658E] dark:text-[#94A3B8]">{portCalls.length} Kunjungan Kapal Terdaftar</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#F0F8FF] dark:bg-[#071322] border-b border-[#DCEAF8] dark:border-[#1E3A5F] text-[#082870] dark:text-[#94A3B8] font-semibold uppercase tracking-wider">
                                    <th className="py-3 px-4">No. Job</th>
                                    <th className="py-3 px-4">Kapal & Klien</th>
                                    <th className="py-3 px-4">Pelabuhan</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Total Ditagihkan</th>
                                    <th className="py-3 px-4">Total Pengeluaran</th>
                                    <th className="py-3 px-4 text-right">Margin SJA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCEAF8]/60 dark:divide-[#1E3A5F] text-[#0B1F63] dark:text-[#F1F5F9]">
                                {portCalls.map((call) => (
                                    <tr key={call.id} className="hover:bg-[#F0F8FF]/50 dark:hover:bg-[#1E3A5F]/30 transition-colors">
                                        <td className="py-3.5 px-4 font-mono font-medium text-[#0060F4] dark:text-[#38BDF8]">
                                            {call.job_number}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-[#082870] dark:text-[#F1F5F9]">{call.ship_name}</div>
                                            <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">{call.company_name}</div>
                                        </td>
                                        <td className="py-3.5 px-4 font-medium">
                                            {call.port_name}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <StatusBadge
                                                status={
                                                    call.status === 'berthed'
                                                        ? 'Sandar'
                                                        : call.status === 'anchored'
                                                        ? 'Labuh'
                                                        : call.status === 'scheduled'
                                                        ? 'Akan Datang'
                                                        : 'Selesai'
                                                }
                                                label={call.status}
                                            />
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-neutral-800 dark:text-[#F1F5F9]">
                                            {formatRupiah(call.total_invoiced)}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-neutral-800 dark:text-[#94A3B8]">
                                            {formatRupiah(call.total_expenses)}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                            {formatRupiah(call.margin)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
