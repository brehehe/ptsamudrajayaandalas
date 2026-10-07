import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';

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
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val);
    };

    const handlePrint = () => {
        window.print();
    };

    const statusLabel = (status: string) => {
        if (status === 'berthed') return 'Sandar';
        if (status === 'anchored') return 'Labuh';
        if (status === 'scheduled') return 'Akan Datang';
        return 'Selesai';
    };

    const columns: Column<PortCallReportItem>[] = [
        { key: 'job_number', header: 'No. Job', wrap: 'normal', render: (call) => <span className="font-mono font-semibold text-[#0060F4]">{call.job_number}</span> },
        { key: 'ship', header: 'Kapal & Klien', wrap: 'normal', render: (call) => <div><p className="font-semibold text-[#082870] dark:text-[#F1F5F9]">{call.ship_name}</p><p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">{call.company_name}</p></div> },
        { key: 'port_name', header: 'Pelabuhan', wrap: 'normal' },
        { key: 'status', header: 'Status', render: (call) => <StatusBadge status={statusLabel(call.status)} label={statusLabel(call.status)} /> },
        { key: 'total_invoiced', header: 'Ditagihkan', align: 'right', render: (call) => formatRupiah(call.total_invoiced) },
        { key: 'total_expenses', header: 'Pengeluaran', align: 'right', render: (call) => formatRupiah(call.total_expenses) },
        { key: 'margin', header: 'Margin SJA', align: 'right', render: (call) => <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(call.margin)}</span> },
    ];

    return (
        <AppLayout title="Laporan Operasional & Rekonsiliasi Keuangan" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Laporan Rekonsiliasi - PT Samudra Jaya Andalas" />

            <MobilePageHero title="Laporan" description="Rekap operasional dan keuangan setiap kunjungan kapal." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div
                    className={
                        'hidden flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 md:flex ' +
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
                        className={
                            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white ' +
                            'hover:bg-[#F0F8FF] border border-[#DCEAF8] text-[#082870] text-xs ' +
                            'sm:text-sm font-bold shadow-xs transition-all flex-shrink-0 ' +
                            'cursor-pointer self-start sm:self-auto'
                        }
                    >
                        <svg
                            className="w-4 h-4 text-[#0060F4]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={
                                    'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 ' +
                                    '002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2' +
                                    ' 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z'
                                }
                            />
                        </svg>
                        <span>Cetak Laporan</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="hidden flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:flex">
                    <div>
                        <h1
                            className={
                                'text-2xl sm:text-3xl font-extrabold text-[#0B1F63] ' +
                                'dark:text-[#F1F5F9] tracking-tight'
                            }
                        >
                            Laporan Operasional & Rekonsiliasi
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            Ringkasan performa keagenan kapal, pendapatan jasa, realisasi biaya
                            pihak ketiga, dan margin operasional
                        </p>
                    </div>
                </div>

                {/* Financial & Operational Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-4.5 rounded-2xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-xs text-[#52658E] dark:text-[#94A3B8] font-medium">
                            Total Nilai Tagihan (Billing)
                        </div>
                        <div className="text-2xl font-bold text-[#082870] dark:text-[#F1F5F9] mt-1">
                            {formatRupiah(summary.total_invoiced)}
                        </div>
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-1">
                            Jasa: {formatRupiah(summary.agency_revenue)}
                        </div>
                    </div>

                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-4.5 rounded-2xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-xs text-[#52658E] dark:text-[#94A3B8] font-medium">
                            Total Disbursement (Keluar)
                        </div>
                        <div className="text-2xl font-bold text-neutral-800 dark:text-[#F1F5F9] mt-1">
                            {formatRupiah(summary.total_expenses)}
                        </div>
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-1">
                            Pelindo, BBM, Air, Perahu
                        </div>
                    </div>

                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-4.5 rounded-2xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            Selisih Tagihan &amp; Pengeluaran
                        </div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                            {formatRupiah(summary.net_agency_margin)}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-1">
                            Total invoice dikurangi pengeluaran tercatat
                        </div>
                    </div>

                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-4.5 rounded-2xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-xs text-[#0060F4] dark:text-[#38BDF8] font-medium">
                            Armada Aktif & Selesai
                        </div>
                        <div className="text-2xl font-bold text-[#0060F4] dark:text-[#38BDF8] mt-1">
                            {summary.active_vessels}{' '}
                            <span className="text-sm font-normal text-[#52658E] dark:text-[#94A3B8]">
                                / {summary.total_port_calls} Jobs
                            </span>
                        </div>
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-1">
                            {summary.completed_requests} pengajuan terlaksana
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-bold text-[#082870] dark:text-[#F1F5F9]">
                            Rekapitulasi Finansial per Job Kunjungan
                        </h2>
                        <span className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                            {portCalls.length} Kunjungan
                        </span>
                    </div>
                    <ResponsiveTable<PortCallReportItem>
                        data={portCalls}
                        keyExtractor={(call) => call.id}
                        desktop={{ columns, compact: true, minWidth: '940px' }}
                        mobile={{
                            titleRender: (call) => call.ship_name,
                            subtitleRender: (call) => <span className="font-mono">{call.job_number}</span>,
                            statusRender: (call) => <StatusBadge status={statusLabel(call.status)} label={statusLabel(call.status)} />,
                            fields: [
                                { label: 'Klien', render: (call) => call.company_name },
                                { label: 'Pelabuhan', render: (call) => call.port_name },
                                { label: 'Ditagihkan', render: (call) => formatRupiah(call.total_invoiced) },
                                { label: 'Pengeluaran', render: (call) => formatRupiah(call.total_expenses) },
                                { label: 'Margin SJA', fullWidth: true, render: (call) => <span className="text-emerald-700">{formatRupiah(call.margin)}</span> },
                            ],
                        }}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
