import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import Input from '../../Components/forms/Input';
import Select from '../../Components/selects/Select';

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
    agency_invoiced: number;
    reimbursement_invoiced: number;
    total_hpp: number;
    margin: number;
    margin_percentage: number;
    invoice_count: number;
    request_count: number;
}

interface ReportsIndexProps {
    summary: {
        total_port_calls: number;
        active_vessels: number;
        total_invoiced: number;
        agency_revenue: number;
        reimburse_revenue: number;
        total_hpp: number;
        non_vessel_expenses: number;
        ship_margin: number;
        company_net_result: number;
        completed_requests: number;
        pending_requests: number;
    };
    portCalls: PortCallReportItem[];
    filters: { from: string; to: string; search: string; status: string };
}

export default function ReportsIndex({ summary, portCalls, filters }: ReportsIndexProps) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
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
        { key: 'ship', header: 'Kapal & Klien', wrap: 'normal', render: (call) => <div><p className="font-semibold text-[#082870] dark:text-[#F1F5F9]">{call.ship_name}</p><p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">{call.company_name}</p><p className="mt-0.5 text-[10px] text-[#52658E] dark:text-[#94A3B8]">{call.request_count} pengajuan · {call.invoice_count} invoice</p></div> },
        { key: 'port_name', header: 'Pelabuhan', wrap: 'normal' },
        { key: 'status', header: 'Status', render: (call) => <StatusBadge status={statusLabel(call.status)} label={statusLabel(call.status)} /> },
        { key: 'total_invoiced', header: 'Ditagihkan', align: 'right', render: (call) => formatRupiah(call.total_invoiced) },
        { key: 'total_hpp', header: 'Total HPP', align: 'right', render: (call) => formatRupiah(call.total_hpp) },
        { key: 'margin', header: 'Margin SJA', align: 'right', render: (call) => <div><p className={`font-bold ${call.margin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#C62840]'}`}>{formatRupiah(call.margin)}</p><p className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">{call.margin_percentage.toLocaleString('id-ID')}%</p></div> },
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
                            'sm:text-sm font-bold shadow-xs transition-colors flex-shrink-0 ' +
                            'cursor-pointer self-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] sm:self-auto'
                        }
                    >
                        <svg
                            aria-hidden="true"
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

                <Card padding="md">
                    <form onSubmit={(event) => { event.preventDefault(); router.get('/reports', { from, to, search, status }, { preserveState: true, preserveScroll: true }); }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.35fr_1fr_auto] lg:items-end">
                        <Input required name="from" label="Dari tanggal" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                        <Input required name="to" label="Sampai tanggal" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                        <Input name="search" label="Cari kapal / Job / klien" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Contoh: KM Demo" clearable onClear={() => setSearch('')} />
                        <Select name="status" label="Status kunjungan" value={status} onChange={(event) => setStatus(event.target.value)} options={[
                            { value: 'all', label: 'Semua status' },
                            { value: 'scheduled', label: 'Akan Datang' },
                            { value: 'anchored', label: 'Labuh' },
                            { value: 'berthed', label: 'Sandar' },
                            { value: 'departed', label: 'Berangkat' },
                            { value: 'completed', label: 'Selesai' },
                        ]} />
                        <Button type="submit">Terapkan Filter</Button>
                    </form>
                </Card>

                {/* Financial & Operational Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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
                            Total HPP Kapal
                        </div>
                        <div className="text-2xl font-bold text-neutral-800 dark:text-[#F1F5F9] mt-1">
                            {formatRupiah(summary.total_hpp)}
                        </div>
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-1">
                            Biaya item yang disetujui Direktur
                        </div>
                    </div>

                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-4.5 rounded-2xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            Margin Seluruh Kapal
                        </div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                            {formatRupiah(summary.ship_margin)}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-1">
                            Harga jual dikurangi HPP kapal
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#DCEAF8] bg-white p-4.5 shadow-xs dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                        <div className="text-xs font-medium text-[#C62840]">Biaya Nonkapal Terealisasi</div>
                        <div className="mt-1 text-2xl font-bold text-[#C62840]">{formatRupiah(summary.non_vessel_expenses)}</div>
                        <div className="mt-1 text-[11px] text-[#52658E]">Biaya perusahaan yang sudah dibayar</div>
                    </div>

                    <div className="rounded-2xl border border-[#BCE9D2] bg-emerald-50/60 p-4.5 shadow-xs dark:border-emerald-900 dark:bg-emerald-950/30">
                        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Hasil Bersih Perusahaan</div>
                        <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatRupiah(summary.company_net_result)}</div>
                        <div className="mt-1 text-[11px] text-emerald-700/80">Margin kapal dikurangi biaya nonkapal terealisasi</div>
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
                                { label: 'Jasa / Reimbursement', render: (call) => `${formatRupiah(call.agency_invoiced)} / ${formatRupiah(call.reimbursement_invoiced)}` },
                                { label: 'Total HPP', render: (call) => formatRupiah(call.total_hpp) },
                                { label: 'Margin SJA', fullWidth: true, render: (call) => <span className={call.margin >= 0 ? 'text-emerald-700' : 'text-[#C62840]'}>{formatRupiah(call.margin)} ({call.margin_percentage.toLocaleString('id-ID')}%)</span> },
                            ],
                        }}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
