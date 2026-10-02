import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';

interface AdminDashboardViewProps {
    kpi: any;
    latestRequests: any[];
    needsToday: any[];
    recentActivities: any[];
    financialOverview?: any;
    upcomingShips: any[];
    onOpenShipArrivalModal: () => void;
    liveTime: string;
    liveDate: string;
    weatherData: {
        temp: string;
        weather: string;
        icon: string;
    };
    locationName: string;
    userName?: string;
}

export default function AdminDashboardView({
    kpi,
    latestRequests,
    needsToday,
    recentActivities,
    financialOverview,
    upcomingShips = [],
    onOpenShipArrivalModal,
    liveTime,
    liveDate,
    weatherData,
    locationName,
    userName = 'Pengguna',
}: AdminDashboardViewProps) {
    const [requestTab, setRequestTab] = useState<'semua' | 'menunggu' | 'proses' | 'selesai'>(
        'semua'
    );
    const [needsTab, setNeedsTab] = useState<string>('Semua');

    // Filter requests
    const filteredRequests = latestRequests.filter((r) => {
        if (requestTab === 'menunggu') return r.status.toLowerCase().includes('menunggu');
        if (requestTab === 'proses')
            return (
                r.status.toLowerCase().includes('proses') ||
                r.status.toLowerCase().includes('vendor')
            );
        if (requestTab === 'selesai') return r.status.toLowerCase().includes('selesai');
        return true;
    });

    const displayRequests = filteredRequests;

    const needShipNames = Array.from(new Set(needsToday.map((item) => item.kapal)));
    const needTabs = ['Semua', ...needShipNames];
    const displayNeeds = needsToday.filter((item) => needsTab === 'Semua' || item.kapal === needsTab);
    const formatRupiah = (value: number | string | undefined) =>
        `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`;
    const aging = financialOverview?.aging ?? { current: 0, overdue_30: 0, overdue_60: 0, total: 0 };
    const financialTrend = financialOverview?.chart?.data ?? [];
    const maxFinancialTrend = Math.max(
        ...financialTrend.flatMap((item: any) => [Number(item.invoiced), Number(item.collected)]),
        1
    );
    const agingTotal = Number(aging.total) || 0;
    const donutCircumference = 238.8;
    const currentArc = agingTotal > 0 ? (Number(aging.current) / agingTotal) * donutCircumference : 0;
    const overdue30Arc = agingTotal > 0 ? (Number(aging.overdue_30) / agingTotal) * donutCircumference : 0;
    const overdue60Arc = agingTotal > 0 ? (Number(aging.overdue_60) / agingTotal) * donutCircumference : 0;

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('menunggu')) {
            return (
                <span
                    className={
                        'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF0CC] ' +
                        'text-[#A65300] border border-[#FFE082]'
                    }
                >
                    Menunggu Approval
                </span>
            );
        }
        if (s.includes('selesai')) {
            return (
                <span
                    className={
                        'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCF7E8] ' +
                        'text-[#087443] border border-[#A3E9C0]'
                    }
                >
                    Selesai
                </span>
            );
        }
        if (s.includes('vendor')) {
            return (
                <span
                    className={
                        'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0F0FF] ' +
                        'text-[#0060F4] border border-[#B8DCFF]'
                    }
                >
                    Diproses Vendor
                </span>
            );
        }
        return (
            <span
                className={
                    'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0F0FF] ' +
                    'text-[#0060F4] border border-[#B8DCFF]'
                }
            >
                Dalam Proses
            </span>
        );
    };

    return (
        <div className="space-y-5">
            {/* 1. HERO BANNER BU TITIK (Exact Match Gambar 2) */}
            <div
                className={
                    'relative rounded-2xl overflow-hidden shadow-lg border border-[#1E4A74]/40 ' +
                    'min-h-[148px] flex items-center p-6 lg:p-7 bg-[#071E4A]'
                }
            >
                <img
                    src="/images/harbor-banner.jpg"
                    alt="Pelabuhan & Kapal"
                    className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
                />
                <div
                    className={
                        'absolute inset-0 bg-gradient-to-r from-[#071E4A]/95 via-[#0A2E6E]/90 ' +
                        'via-55% to-[#082046]/75'
                    }
                />

                <div
                    className={
                        'relative z-10 w-full flex flex-col md:flex-row md:items-center ' +
                        'md:justify-between gap-5 text-white'
                    }
                >
                    <div className="space-y-1 max-w-xl">
                        <span className="text-xs font-semibold tracking-wider text-white/80 uppercase">
                            Selamat Datang,
                        </span>
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                                {userName}
                            </h1>
                            <span className="text-xs font-medium text-[#B5C8DC]">
                                Operational Control Center
                            </span>
                        </div>
                        <p className="text-xs lg:text-sm text-[#DCEAF8]/90 italic pt-1">
                            &ldquo;Koordinasi yang baik hari ini, kelancaran perjalanan esok.&rdquo;
                        </p>
                    </div>

                    <div className="flex flex-col items-start md:items-end text-left md:text-right space-y-1">
                        <p className="text-xs font-medium text-[#DCEAF8]">
                            {liveDate || '-'}
                        </p>
                        <p
                            className={
                                'text-3xl lg:text-4xl font-extrabold tracking-tight font-sans ' +
                                'text-white leading-none'
                            }
                        >
                            {liveTime || '10:24'}
                        </p>
                        <div className="flex items-center gap-2 pt-1 text-xs text-[#E7F0FA]">
                            <span className="flex items-center gap-1">
                                <svg
                                    className="w-3.5 h-3.5 text-[#19B5F7]"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        d={
                                            'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3' +
                                            '.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 ' +
                                            '2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'
                                        }
                                    />
                                </svg>
                                {locationName || 'Lokasi belum tersedia'}
                            </span>
                            <span className="text-white/40">•</span>
                            <span className="flex items-center gap-1">
                                <span>{weatherData.icon || '⛅'}</span>
                                <span className="font-semibold">{weatherData.temp || '28°C'}</span>
                                <span className="text-[#B5C8DC]">
                                    {weatherData.weather || 'Tidak tersedia'}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. TOP 3 STAT CARDS (Exact Gambar 2) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-5">
                {/* Card 1: Kapal Aktif */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl p-5 border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                    }
                >
                    <div className="flex items-center gap-3.5">
                        <div
                            className={
                                'w-12 h-12 rounded-xl bg-[#E0F0FF] dark:bg-[#082870] ' +
                                'text-[#0060F4] dark:text-[#19B5F7] flex items-center ' +
                                'justify-center flex-shrink-0'
                            }
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={
                                        'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-' +
                                        '1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.29' +
                                        '3l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1' +
                                        ' 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0' +
                                        ' 104 0m-4 0a2 2 0 114 0'
                                    }
                                />
                            </svg>
                        </div>
                        <div>
                            <div className="text-3xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                {kpi?.kapal_aktif ?? 0}
                            </div>
                            <div className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8] mt-1">
                                Kapal Aktif
                            </div>
                        </div>
                    </div>
                    <div
                        className={
                            'text-[11px] text-[#52658E] dark:text-[#94A3B8] space-y-1 border-l ' +
                            'border-[#DCEAF8] dark:border-[#1E3A5F] pl-4'
                        }
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#0057D9]" />
                            <span>{kpi?.ships_by_status?.akan_datang ?? 0} Akan Datang</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#087443]" />
                            <span>{kpi?.ships_by_status?.sandar ?? 0} Sandar</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#A65300]" />
                            <span>{kpi?.ships_by_status?.labuh ?? 0} Labuh</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#C62840]" />
                            <span>{kpi?.ships_by_status?.berangkat ?? 0} Berangkat</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Total Pengajuan */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl p-5 border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                    }
                >
                    <div className="flex items-center gap-3.5">
                        <div
                            className={
                                'w-12 h-12 rounded-xl bg-[#E0F0FF] dark:bg-[#082870] ' +
                                'text-[#0060F4] dark:text-[#19B5F7] flex items-center ' +
                                'justify-center flex-shrink-0'
                            }
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={
                                        'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 ' +
                                        '1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-' +
                                        '2 2z'
                                    }
                                />
                            </svg>
                        </div>
                        <div>
                            <div className="text-3xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                {kpi?.total_pengajuan ?? 0}
                            </div>
                            <div className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8] mt-1">
                                Total Pengajuan
                            </div>
                        </div>
                    </div>
                    <div
                        className={
                            'text-[11px] text-[#52658E] dark:text-[#94A3B8] space-y-1 border-l ' +
                            'border-[#DCEAF8] dark:border-[#1E3A5F] pl-4'
                        }
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#A65300]" />
                            <span>{kpi?.requests_by_status?.menunggu ?? 0} Menunggu</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#0060F4]" />
                            <span>{kpi?.requests_by_status?.proses ?? 0} Diproses</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#087443]" />
                            <span>{kpi?.requests_by_status?.selesai ?? 0} Selesai</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Total Piutang */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl p-5 border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                    }
                >
                    <div className="flex items-center gap-3.5">
                        <div
                            className={
                                'w-12 h-12 rounded-xl bg-[#0D2945] text-white flex items-center ' +
                                'justify-center flex-shrink-0'
                            }
                        >
                            <span className="text-lg font-black">S</span>
                        </div>
                        <div>
                            <div
                                className={
                                    'text-2xl xl:text-3xl font-black text-[#0B1F63] ' +
                                    'dark:text-[#F1F5F9] leading-none'
                                }
                            >
                                {formatRupiah(kpi?.total_piutang)}
                            </div>
                            <div className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8] mt-1">
                                Total Piutang
                            </div>
                            <div className="mt-1 text-[11px] font-medium text-[#52658E]">Berdasarkan invoice klien berjalan</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. DUA TABEL UTAMA (Pengajuan Terbaru & Kebutuhan Hari Ini - Exact Gambar 2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* TABEL KIRI: Pengajuan Terbaru */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] overflow-hidden shadow-xs'
                    }
                >
                    <div
                        className={
                            'p-4 border-b border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center ' +
                            'justify-between'
                        }
                    >
                        <h3 className="font-bold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                            Pengajuan Terbaru
                        </h3>
                        <Link
                            href="/requests"
                            className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1"
                        >
                            Lihat Semua &rarr;
                        </Link>
                    </div>

                    {/* Filter Tabs */}
                    <div
                        className={
                            'px-4 py-2 border-b border-[#DCEAF8] dark:border-[#1E3A5F] flex ' +
                            'items-center gap-1.5 overflow-x-auto'
                        }
                    >
                        <button
                            type="button"
                            onClick={() => setRequestTab('semua')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                requestTab === 'semua'
                                    ? 'bg-[#0060F4] text-white'
                                    : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF]'
                            }`}
                        >
                            Semua ({kpi?.total_pengajuan ?? 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setRequestTab('menunggu')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                requestTab === 'menunggu'
                                    ? 'bg-[#0060F4] text-white'
                                    : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF]'
                            }`}
                        >
                            Menunggu Approval ({kpi?.requests_by_status?.menunggu ?? 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setRequestTab('proses')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                requestTab === 'proses'
                                    ? 'bg-[#0060F4] text-white'
                                    : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF]'
                            }`}
                        >
                            Dalam Proses ({kpi?.requests_by_status?.proses ?? 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setRequestTab('selesai')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                requestTab === 'selesai'
                                    ? 'bg-[#0060F4] text-white'
                                    : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF]'
                            }`}
                        >
                            Selesai ({kpi?.requests_by_status?.selesai ?? 0})
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead
                                className={
                                    'bg-[#F8FAFC] dark:bg-[#071322] text-[#52658E] ' +
                                    'dark:text-[#94A3B8] font-bold border-b border-[#DCEAF8] ' +
                                    'dark:border-[#1E3A5F]'
                                }
                            >
                                <tr>
                                    <th className="py-2.5 px-3">No. Pengajuan</th>
                                    <th className="py-2.5 px-3">Tanggal</th>
                                    <th className="py-2.5 px-3">Kapal</th>
                                    <th className="py-2.5 px-3 text-center">Jumlah Item</th>
                                    <th className="py-2.5 px-3">Nilai Estimasi</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-2 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCEAF8]/70 dark:divide-[#1E3A5F]/70">
                                {displayRequests.slice(0, 5).map((row, idx) => (
                                    <tr
                                        key={idx}
                                        className="hover:bg-[#F0F8FF]/50 dark:hover:bg-[#071322]/50 transition-colors"
                                    >
                                        <td className="py-3 px-3 font-bold text-[#0060F4] whitespace-nowrap">
                                            <Link href="/requests" className="hover:underline">
                                                {row.request_number}
                                            </Link>
                                        </td>
                                        <td className="py-3 px-3 text-[#52658E] dark:text-[#94A3B8] whitespace-nowrap">
                                            <div>{row.date}</div>
                                            <div className="text-[10px] text-[#8C9BB9]">
                                                {row.time || '-'}
                                            </div>
                                        </td>
                                        <td
                                            className={
                                                'py-3 px-3 font-semibold text-[#0B1F63] ' +
                                                'dark:text-[#F1F5F9] whitespace-nowrap'
                                            }
                                        >
                                            {row.ship_name}
                                        </td>
                                        <td className="py-3 px-3 text-center text-[#52658E] dark:text-[#94A3B8]">
                                            {row.items_count ?? 0}
                                        </td>
                                        <td
                                            className={
                                                'py-3 px-3 font-bold text-[#0B1F63] ' +
                                                'dark:text-[#F1F5F9] whitespace-nowrap'
                                            }
                                        >
                                            {typeof row.estimated_cost === 'number'
                                                ? `Rp ${row.estimated_cost.toLocaleString('id-ID')}`
                                                : row.estimated_cost}
                                        </td>
                                        <td className="py-3 px-3 whitespace-nowrap">
                                            {getStatusBadge(row.status)}
                                        </td>
                                        <td className="py-3 px-2 text-center text-[#52658E]">
                                            <button
                                                type="button"
                                                className={
                                                    'p-1 hover:bg-slate-200 ' +
                                                    'dark:hover:bg-slate-700 rounded text-xs ' +
                                                    'font-bold'
                                                }
                                            >
                                                •••
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* TABEL KANAN: Kebutuhan Hari Ini */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] overflow-hidden shadow-xs'
                    }
                >
                    <div
                        className={
                            'p-4 border-b border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center ' +
                            'justify-between'
                        }
                    >
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Kebutuhan Hari Ini
                            </h3>
                            <span
                                className={
                                    'text-xs px-2.5 py-0.5 rounded-full bg-[#F0F8FF] ' +
                                    'dark:bg-[#071322] border border-[#DCEAF8] text-[#52658E]'
                                }
                            >
                                {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
                            </span>
                        </div>
                        <Link
                            href="/needs"
                            className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1"
                        >
                            Lihat Semua &rarr;
                        </Link>
                    </div>

                    {/* Filter Tabs by Ship */}
                    <div
                        className={
                            'px-4 py-2 border-b border-[#DCEAF8] dark:border-[#1E3A5F] flex ' +
                            'items-center gap-1.5 overflow-x-auto'
                        }
                    >
                        {needTabs.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setNeedsTab(tab)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                    needsTab === tab
                                        ? 'bg-[#0060F4] text-white'
                                        : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF]'
                                }`}
                            >
                                {tab} ({tab === 'Semua' ? needsToday.length : needsToday.filter((item) => item.kapal === tab).length})
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead
                                className={
                                    'bg-[#F8FAFC] dark:bg-[#071322] text-[#52658E] ' +
                                    'dark:text-[#94A3B8] font-bold border-b border-[#DCEAF8] ' +
                                    'dark:border-[#1E3A5F]'
                                }
                            >
                                <tr>
                                    <th className="py-2.5 px-3">Kapal</th>
                                    <th className="py-2.5 px-3">Kebutuhan</th>
                                    <th className="py-2.5 px-3">Jumlah</th>
                                    <th className="py-2.5 px-3">Jadwal</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3">Pengajuan</th>
                                    <th className="py-2.5 px-2 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCEAF8]/70 dark:divide-[#1E3A5F]/70">
                                {displayNeeds.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        className="hover:bg-[#F0F8FF]/50 dark:hover:bg-[#071322]/50 transition-colors"
                                    >
                                        <td
                                            className={
                                                'py-3 px-3 font-semibold text-[#0B1F63] ' +
                                                'dark:text-[#F1F5F9] whitespace-nowrap'
                                            }
                                        >
                                            {row.kapal}
                                        </td>
                                        <td className="py-3 px-3 font-medium text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {row.kebutuhan}
                                        </td>
                                        <td className="py-3 px-3 text-[#52658E] dark:text-[#94A3B8] whitespace-nowrap">
                                            {row.jumlah}
                                        </td>
                                        <td className="py-3 px-3 text-[#52658E] dark:text-[#94A3B8] whitespace-nowrap">
                                            {row.jadwal}
                                        </td>
                                        <td className="py-3 px-3 whitespace-nowrap">
                                            {getStatusBadge(row.status)}
                                        </td>
                                        <td className="py-3 px-3 font-semibold text-[#0060F4] whitespace-nowrap">
                                            <Link href="/requests" className="hover:underline">
                                                {row.pengajuan}
                                            </Link>
                                        </td>
                                        <td className="py-3 px-2 text-center text-[#52658E]">
                                            <button
                                                type="button"
                                                className={
                                                    'p-1 hover:bg-slate-200 ' +
                                                    'dark:hover:bg-slate-700 rounded text-xs ' +
                                                    'font-bold'
                                                }
                                            >
                                                •••
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 4. TIGA KOLOM TENGAH (Piutang, Tren Pengeluaran, Akses Cepat - Exact Gambar 2) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Kolom 1: Piutang Donut Chart (4 cols) */}
                <div
                    className={
                        'lg:col-span-4 bg-white dark:bg-[#0C1D36] rounded-2xl border ' +
                        'border-[#DCEAF8] dark:border-[#1E3A5F] p-5 flex flex-col justify-between ' +
                        'shadow-xs'
                    }
                >
                    <div
                        className={
                            'flex items-center justify-between pb-3 border-b border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F]'
                        }
                    >
                        <h3 className="font-bold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                            Piutang
                        </h3>
                        <Link
                            href="/receivables"
                            className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1"
                        >
                            Lihat Detail &rarr;
                        </Link>
                    </div>

                    {/* Donut Chart Simulation with Center Text */}
                    <div className="py-4 flex items-center justify-center">
                        <div className="relative w-44 h-44 flex items-center justify-center">
                            <svg
                                className="w-full h-full transform -rotate-90"
                                viewBox="0 0 100 100"
                            >
                                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#DCEAF8" strokeWidth="13" />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    fill="transparent"
                                    stroke="#087443"
                                    strokeWidth="13"
                                    strokeDasharray={`${currentArc} ${donutCircumference - currentArc}`}
                                    strokeDashoffset="0"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    fill="transparent"
                                    stroke="#A65300"
                                    strokeWidth="13"
                                    strokeDasharray={`${overdue30Arc} ${donutCircumference - overdue30Arc}`}
                                    strokeDashoffset={-currentArc}
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    fill="transparent"
                                    stroke="#C62840"
                                    strokeWidth="13"
                                    strokeDasharray={`${overdue60Arc} ${donutCircumference - overdue60Arc}`}
                                    strokeDashoffset={-(currentArc + overdue30Arc)}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                                <span className="text-xs font-black text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {formatRupiah(aging.total)}
                                </span>
                                <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] font-medium">
                                    Total Piutang
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Legend list */}
                    <div className="space-y-2 text-xs pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[#52658E] dark:text-[#94A3B8]">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#C62840]" /> &gt; 30
                                Hari
                            </span>
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {formatRupiah(aging.overdue_60)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[#52658E] dark:text-[#94A3B8]">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#A65300]" /> 8 - 30
                                Hari
                            </span>
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {formatRupiah(aging.overdue_30)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[#52658E] dark:text-[#94A3B8]">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#087443]" /> Belum
                                Jatuh Tempo
                            </span>
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {formatRupiah(aging.current)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Kolom 2: Tren Pengeluaran Bar Chart (5 cols) */}
                <div
                    className={
                        'lg:col-span-5 bg-white dark:bg-[#0C1D36] rounded-2xl border ' +
                        'border-[#DCEAF8] dark:border-[#1E3A5F] p-5 flex flex-col justify-between ' +
                        'shadow-xs'
                    }
                >
                    <div>
                        <div
                            className={
                                'flex items-center justify-between pb-3 border-b border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F]'
                            }
                        >
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                    Tren Invoice dan Pelunasan
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-[#52658E]">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#0060F4]" />{' '}
                                        Invoice
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />{' '}
                                        Pelunasan
                                    </span>
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-[#52658E]">6 bulan terakhir</span>
                        </div>

                        {/* Bar Chart Months Jan - Jun */}
                        <div className="pt-4 pb-2">
                            <div className="flex items-end gap-2 h-36">
                                <div
                                    className={
                                        'flex flex-col justify-between h-full text-[9px] ' +
                                        'text-[#8C9BB9] pr-1 font-mono'
                                    }
                                >
                                    <span>{maxFinancialTrend.toFixed(0)}</span>
                                    <span>{(maxFinancialTrend * 0.8).toFixed(0)}</span>
                                    <span>{(maxFinancialTrend * 0.6).toFixed(0)}</span>
                                    <span>{(maxFinancialTrend * 0.4).toFixed(0)}</span>
                                    <span>{(maxFinancialTrend * 0.2).toFixed(0)}</span>
                                    <span>0</span>
                                </div>
                                <div
                                    className={
                                        'flex-1 flex items-end justify-between gap-2 h-full ' +
                                        'border-b border-[#DCEAF8] dark:border-[#1E3A5F] pb-1'
                                    }
                                >
                                    {financialTrend.map((col: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex-1 flex flex-col items-center justify-end h-full gap-1"
                                        >
                                            <div
                                                className={
                                                    'w-full flex items-end justify-center gap-1 ' +
                                                    'h-full max-w-[42px]'
                                                }
                                            >
                                                <div
                                                    className="w-3 bg-[#0060F4] rounded-t-sm"
                                                    style={{ height: `${(Number(col.invoiced) / maxFinancialTrend) * 100}%` }}
                                                    title={`Invoice: ${col.invoiced} Jt`}
                                                />
                                                <div
                                                    className="w-3 bg-[#F5A623] rounded-t-sm"
                                                    style={{ height: `${(Number(col.collected) / maxFinancialTrend) * 100}%` }}
                                                    title={`Pelunasan: ${col.collected} Jt`}
                                                />
                                            </div>
                                            <span className="text-[10px] text-[#8C9BB9] font-medium">
                                                {col.month}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Footer */}
                    <div
                        className={
                            'grid grid-cols-3 gap-2 pt-3 border-t border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] text-left'
                        }
                    >
                        <div className="bg-[#F0F8FF]/80 dark:bg-[#071322] p-2 rounded-xl">
                            <span className="text-[10px] text-[#52658E] block">
                                Total Pengeluaran
                            </span>
                            <span className="text-xs font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] block mt-0.5">
                                {formatRupiah(financialOverview?.total_invoiced)}
                            </span>
                        </div>
                        <div className="bg-[#F0F8FF]/80 dark:bg-[#071322] p-2 rounded-xl">
                            <span className="text-[10px] text-[#52658E] block">
                                Total Pembayaran
                            </span>
                            <span className="text-xs font-extrabold text-[#087443] block mt-0.5">
                                {formatRupiah(financialOverview?.total_collected)}
                            </span>
                        </div>
                        <div className="bg-[#F0F8FF]/80 dark:bg-[#071322] p-2 rounded-xl">
                            <span className="text-[10px] text-[#52658E] block">
                                Sisa Pengeluaran
                            </span>
                            <span className="text-xs font-extrabold text-[#C62840] block mt-0.5">
                                {formatRupiah(financialOverview?.total_outstanding)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Kolom 3: Akses Cepat (3 cols - Exact Gambar 2) */}
                <div
                    className={
                        'lg:col-span-3 bg-white dark:bg-[#0C1D36] rounded-2xl border ' +
                        'border-[#DCEAF8] dark:border-[#1E3A5F] p-5 flex flex-col justify-between ' +
                        'shadow-xs'
                    }
                >
                    <div
                        className={
                            'flex items-center justify-between pb-3 border-b border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F]'
                        }
                    >
                        <h3 className="font-bold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                            Akses Cepat
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 my-auto py-2">
                        <Link
                            href="/requests"
                            className={
                                'p-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                'bg-[#F0F8FF]/60 dark:bg-[#071322] hover:bg-[#E0F0FF] ' +
                                'dark:hover:bg-[#1E3A5F] flex flex-col items-center ' +
                                'text-center transition-all group'
                            }
                        >
                            <div
                                className={
                                    'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                    'items-center justify-center mb-1.5 group-hover:scale-110 ' +
                                    'transition-transform'
                                }
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.58' +
                                            '6a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2' +
                                            ' 2 0 01-2 2z'
                                        }
                                    />
                                </svg>
                            </div>
                            <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Buat Pengajuan
                            </span>
                        </Link>

                        <Link
                            href="/vessels"
                            className={
                                'p-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                'bg-[#F0F8FF]/60 dark:bg-[#071322] hover:bg-[#E0F0FF] ' +
                                'dark:hover:bg-[#1E3A5F] flex flex-col items-center ' +
                                'text-center transition-all group'
                            }
                        >
                            <div
                                className={
                                    'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                    'items-center justify-center mb-1.5 group-hover:scale-110 ' +
                                    'transition-transform'
                                }
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h' +
                                            '1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 0' +
                                            '1.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1' +
                                            ' 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0' +
                                            ' 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0'
                                        }
                                    />
                                </svg>
                            </div>
                            <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Daftar Kapal
                            </span>
                        </Link>

                        <Link
                            href="/needs"
                            className={
                                'p-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                'bg-[#F0F8FF]/60 dark:bg-[#071322] hover:bg-[#E0F0FF] ' +
                                'dark:hover:bg-[#1E3A5F] flex flex-col items-center ' +
                                'text-center transition-all group'
                            }
                        >
                            <div
                                className={
                                    'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                    'items-center justify-center mb-1.5 group-hover:scale-110 ' +
                                    'transition-transform'
                                }
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                    />
                                </svg>
                            </div>
                            <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Kebutuhan
                            </span>
                        </Link>

                        <Link
                            href="/invoices"
                            className={
                                'p-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                'bg-[#F0F8FF]/60 dark:bg-[#071322] hover:bg-[#E0F0FF] ' +
                                'dark:hover:bg-[#1E3A5F] flex flex-col items-center ' +
                                'text-center transition-all group'
                            }
                        >
                            <div
                                className={
                                    'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                    'items-center justify-center mb-1.5 group-hover:scale-110 ' +
                                    'transition-transform'
                                }
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2' +
                                            'H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z'
                                        }
                                    />
                                </svg>
                            </div>
                            <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Invoice &amp; Tagihan
                            </span>
                        </Link>

                        <Link
                            href="/reports"
                            className={
                                'p-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                'bg-[#F0F8FF]/60 dark:bg-[#071322] hover:bg-[#E0F0FF] ' +
                                'dark:hover:bg-[#1E3A5F] flex flex-col items-center ' +
                                'text-center transition-all group'
                            }
                        >
                            <div
                                className={
                                    'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                    'items-center justify-center mb-1.5 group-hover:scale-110 ' +
                                    'transition-transform'
                                }
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2' +
                                            'a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 ' +
                                            '0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 ' +
                                            '0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                                        }
                                    />
                                </svg>
                            </div>
                            <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Laporan
                            </span>
                        </Link>

                        <Link
                            href="/master/vendors"
                            className={
                                'p-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                'bg-[#F0F8FF]/60 dark:bg-[#071322] hover:bg-[#E0F0FF] ' +
                                'dark:hover:bg-[#1E3A5F] flex flex-col items-center ' +
                                'text-center transition-all group'
                            }
                        >
                            <div
                                className={
                                    'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                    'items-center justify-center mb-1.5 group-hover:scale-110 ' +
                                    'transition-transform'
                                }
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.' +
                                            '656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.' +
                                            '857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.0' +
                                            '02 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 ' +
                                            '2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 ' +
                                            '0z'
                                        }
                                    />
                                </svg>
                            </div>
                            <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Data Vendor
                            </span>
                        </Link>
                    </div>

                    <button
                        type="button"
                        onClick={onOpenShipArrivalModal}
                        className={
                            'w-full py-2.5 px-3 rounded-xl bg-[#0060F4] hover:bg-[#082870] ' +
                            'text-white text-xs font-bold shadow-sm transition-all flex ' +
                            'items-center justify-center gap-1.5'
                        }
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        <span>+ Input Kapal Yang Akan Datang</span>
                    </button>
                </div>
            </div>

            {/* 5. Update dan dokumentasi lapangan dari data operasional */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* Kolom 1: Update Lapangan */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] p-5 shadow-xs flex flex-col justify-between'
                    }
                >
                    <div
                        className={
                            'flex items-center justify-between pb-3 border-b border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F]'
                        }
                    >
                        <div className="flex items-center gap-2.5">
                            <h3 className="font-bold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Update Lapangan
                            </h3>
                            <span
                                className={
                                    'px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCF7E8] ' +
                                    'text-[#087443] flex items-center gap-1'
                                }
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#087443] animate-pulse" />{' '}
                                Live Update
                            </span>
                        </div>
                        <Link
                            href="/operations"
                            className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1"
                        >
                            Lihat Semua &rarr;
                        </Link>
                    </div>

                    <div className="divide-y divide-[#DCEAF8]/60 dark:divide-[#1E3A5F]/60 flex-1 py-1">
                        {recentActivities.slice(0, 4).map((activity) => (
                            <div key={activity.id} className="py-2.5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-[#8C9BB9] w-10">
                                        {activity.time || '-'}
                                    </span>
                                    <div
                                        className={
                                            'w-7 h-7 rounded-lg flex items-center justify-center ' +
                                            'flex-shrink-0 bg-[#E0F0FF] text-[#0060F4]'
                                        }
                                    >
                                        ⚓
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {activity.ship_name || activity.title}
                                        </h4>
                                        <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                            {activity.subtitle}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activity.photos?.[0] && (
                                        <img
                                            src={activity.photos[0]}
                                            alt={`Dokumentasi ${activity.title}`}
                                            className="w-10 h-7 rounded object-cover shadow-2xs border border-[#DCEAF8]"
                                        />
                                    )}
                                    <span className="text-xs text-[#8C9BB9]">&gt;</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Kolom 2: Dokumentasi Lapangan Terbaru (4 Photo Cards) */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] p-5 shadow-xs flex flex-col justify-between'
                    }
                >
                    <div
                        className={
                            'flex items-center justify-between pb-3 border-b border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F]'
                        }
                    >
                        <h3 className="font-bold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                            Dokumentasi Lapangan Terbaru
                        </h3>
                        <Link
                            href="/operations"
                            className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1"
                        >
                            Lihat Semua &rarr;
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
                        {recentActivities
                            .filter((activity) => activity.photos?.length > 0)
                            .slice(0, 4)
                            .map((doc) => (
                            <div
                                key={doc.id}
                                className={
                                    'rounded-xl overflow-hidden border border-[#DCEAF8] ' +
                                    'dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#071322] flex ' +
                                    'flex-col group'
                                }
                            >
                                <div className="h-20 overflow-hidden relative">
                                    <img
                                        src={doc.photos[0]}
                                        alt={doc.title}
                                        className={
                                            'w-full h-full object-cover group-hover:scale-105 ' +
                                            'transition-transform duration-300'
                                        }
                                    />
                                </div>
                                <div className="p-2 flex-1 flex flex-col justify-between">
                                    <h5
                                        className={
                                            'text-[11px] font-bold text-[#0B1F63] ' +
                                            'dark:text-[#F1F5F9] leading-tight line-clamp-2'
                                        }
                                    >
                                        {doc.title}
                                    </h5>
                                    <div className="mt-1 text-[9px] text-[#8C9BB9]">
                                        <div>{doc.activity_date} {doc.time}</div>
                                        <div>{doc.location_name || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
