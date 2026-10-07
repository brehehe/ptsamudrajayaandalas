import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import Table, { type Column } from '../../Components/tables/Table';
import Button from '../../Components/ui/Button';

interface ExecutiveDashboardViewProps {
    isReadOnly?: boolean; // true for Owner, false for Direktur
    kpi: any;
    financialOverview?: any;
    pendingApprovals?: any[];
    todayShips?: any[];
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

export default function ExecutiveDashboardView({
    isReadOnly = false,
    kpi,
    financialOverview,
    pendingApprovals = [],
    todayShips = [],
    liveTime,
    liveDate,
    weatherData,
    locationName,
    userName,
}: ExecutiveDashboardViewProps) {
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const displayName = userName || 'Pengguna';
    const roleTitle = isReadOnly ? 'Owner & Dewan Komisaris' : 'Direktur Operasional & Keuangan';
    const subtitle = isReadOnly
        ? 'Dashboard Eksekutif Monitoring — Analisis portofolio armada dan performa keuangan keagenan kapal.'
        : 'Pengawasan anggaran, otorisasi dana logistik armada, dan kelancaran arus kas keagenan.';

    const handleApprove = (id: string) => {
        if (isReadOnly) return;
        setActionLoadingId(id);
        router.post(
            `/approvals/requests/${id}/approve`,
            { notes: 'Disetujui oleh Direktur via Dashboard' },
            {
                preserveScroll: true,
                onFinish: () => setActionLoadingId(null),
            }
        );
    };

    const handleReject = (id: string) => {
        if (isReadOnly) return;
        setActionLoadingId(id);
        router.post(
            `/approvals/requests/${id}/reject`,
            { reason: 'Perlu peninjauan ulang anggaran' },
            {
                preserveScroll: true,
                onFinish: () => setActionLoadingId(null),
            }
        );
    };

    // Financial calculations
    const formatRupiah = (val: number | undefined) => {
        if (!val) return 'Rp 0';
        return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
    };

    const totalPiutang = financialOverview?.total_outstanding ?? 0;
    const totalPendapatan = financialOverview?.total_collected ?? 0;
    const totalTagihan = financialOverview?.total_invoiced ?? 0;
    const collectionRate = financialOverview?.collection_rate ?? 0;
    const financialTrend = financialOverview?.chart?.data ?? [];
    const maxFinancialTrend = Math.max(
        ...financialTrend.flatMap((item: any) => [Number(item.invoiced), Number(item.collected)]),
        1
    );

    const displayApprovals = pendingApprovals;
    const approvalColumns: Column<any>[] = [
        { key: 'request_number', header: 'No. Pengajuan', wrap: 'normal', render: (request) => <Link href="/approvals" className="font-bold text-[#0060F4] hover:underline">{request.request_number}</Link> },
        { key: 'ship_name', header: 'Kapal', wrap: 'normal', render: (request) => <span className="font-semibold">{request.ship_name}</span> },
        { key: 'notes', header: 'Uraian Kebutuhan', wrap: 'normal', render: (request) => <div><p>{request.notes}</p><p className="text-[10px] text-[#8C9BB9]">{request.date}</p></div> },
        { key: 'creator_name', header: 'Pemohon', wrap: 'normal' },
        { key: 'estimated_cost', header: 'Nilai Estimasi', align: 'right', render: (request) => <span className="font-bold">{formatRupiah(request.estimated_cost)}</span> },
        { key: 'status', header: 'Status', align: 'center', render: () => <span className="rounded-full border border-[#FFE082] bg-[#FFF0CC] px-2.5 py-1 text-[10px] font-semibold text-[#A65300]">Menunggu Approval</span> },
        { key: 'actions', header: isReadOnly ? 'Hak Akses' : 'Aksi', align: 'right', render: (request) => isReadOnly ? <span className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#64748B]">View Only</span> : <div className="flex justify-end gap-1.5"><Button size="sm" disabled={actionLoadingId === request.id} onClick={() => handleApprove(request.id)}>Setujui</Button><Button size="sm" variant="danger" disabled={actionLoadingId === request.id} onClick={() => handleReject(request.id)}>Tolak</Button></div> },
    ];

    return (
        <div className="space-y-5">
            {/* 1. HERO BANNER DIREKTUR / OWNER */}
            <div
                className={
                    'relative rounded-2xl overflow-hidden shadow-lg border border-[#1E4A74]/40 ' +
                    'min-h-[148px] flex items-center p-6 lg:p-7 bg-[#071E4A]'
                }
            >
                <img
                    src="/images/harbor-banner.jpg"
                    alt="Direktur Dashboard"
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
                    <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold tracking-wider text-white/80 uppercase">
                                Selamat Datang,
                            </span>
                            {isReadOnly && (
                                <span
                                    className={
                                        'px-2.5 py-0.5 rounded-full text-[10px] font-black ' +
                                        'tracking-wide bg-[#F5A623] text-black shadow-xs flex ' +
                                        'items-center gap-1'
                                    }
                                >
                                    <span>🔒</span> MODE MONITORING (HANYA VIEW)
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-3">
                            <h1
                                className={
                                    'text-2xl lg:text-3xl font-black tracking-tight text-white ' +
                                    'drop-shadow-sm flex items-center gap-2'
                                }
                            >
                                <span>{displayName}</span>
                                {isReadOnly ? (
                                    <span className="text-xl">👑</span>
                                ) : (
                                    <span className="text-xl">📊</span>
                                )}
                            </h1>
                            <span className="text-xs font-medium text-[#B5C8DC]">{roleTitle}</span>
                        </div>
                        <p className="text-xs lg:text-sm text-[#DCEAF8]/90 italic pt-0.5">
                            &ldquo;{subtitle}&rdquo;
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
                            {liveTime || '-'}
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
                                <span>{weatherData.icon || '—'}</span>
                                <span className="font-semibold">{weatherData.temp || 'Tidak tersedia'}</span>
                                <span className="text-[#B5C8DC]">
                                    {weatherData.weather || 'Tidak tersedia'}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. 4 EXECUTIVE KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Menunggu Keputusan */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl p-4 border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                    }
                >
                    <div>
                        <span className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8]">
                            Menunggu Approval
                        </span>
                        <div className="text-2xl font-black text-[#A65300] dark:text-[#FBBF24] mt-0.5">
                            {displayApprovals.length} Berkas
                        </div>
                        <span className="text-[10px] text-[#A65300] font-semibold">
                            {isReadOnly ? 'Hanya View (Owner)' : 'Perlu Keputusan Anda'}
                        </span>
                    </div>
                    <div
                        className={
                            'w-11 h-11 rounded-xl bg-[#FFF0CC] text-[#A65300] flex items-center ' +
                            'justify-center text-xl'
                        }
                    >
                        ⚖️
                    </div>
                </div>

                {/* KPI 2: Total Piutang */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl p-4 border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                    }
                >
                    <div>
                        <span className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8]">
                            Total Piutang Klien
                        </span>
                        <div className="text-xl font-black text-[#0B1F63] dark:text-[#F1F5F9] mt-0.5">
                            {formatRupiah(totalPiutang)}
                        </div>
                        <span className="text-[10px] text-[#087443] font-bold">
                            Berdasarkan invoice klien tercatat
                        </span>
                    </div>
                    <div
                        className={
                            'w-11 h-11 rounded-xl bg-[#FFE7EC] text-[#C62840] flex items-center ' +
                            'justify-center text-xl'
                        }
                    >
                        💰
                    </div>
                </div>

                {/* KPI 3: Kas Diterima */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl p-4 border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                    }
                >
                    <div>
                        <span className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8]">
                            Pendapatan Kas
                        </span>
                        <div className="text-xl font-black text-[#087443] mt-0.5">
                            {formatRupiah(totalPendapatan)}
                        </div>
                        <span className="text-[10px] text-[#52658E]">
                            Kolektibilitas:{' '}
                            <strong className="text-[#0060F4]">{collectionRate}%</strong>
                        </span>
                    </div>
                    <div
                        className={
                            'w-11 h-11 rounded-xl bg-[#DCF7E8] text-[#087443] flex items-center ' +
                            'justify-center text-xl'
                        }
                    >
                        📈
                    </div>
                </div>

                {/* KPI 4: Kapal Aktif */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl p-4 border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                    }
                >
                    <div>
                        <span className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8]">
                            Armada Aktif
                        </span>
                        <div className="text-2xl font-black text-[#0060F4] mt-0.5">
                            {kpi?.kapal_aktif ?? 0} Kapal
                        </div>
                        <span className="text-[10px] text-[#52658E]">
                            {kpi?.ships_by_status?.akan_datang ?? 0} Datang •{' '}
                            {kpi?.ships_by_status?.sandar ?? 0} Sandar
                        </span>
                    </div>
                    <div
                        className={
                            'w-11 h-11 rounded-xl bg-[#E0F0FF] text-[#0060F4] flex items-center ' +
                            'justify-center text-xl'
                        }
                    >
                        🚢
                    </div>
                </div>
            </div>

            {/* 3. MEJA APPROVAL (DIREKTUR CAN ACT, OWNER IS READ-ONLY) */}
            <div
                className={
                    'bg-white dark:bg-[#0C1D36] rounded-2xl border border-[#DCEAF8] ' +
                    'dark:border-[#1E3A5F] p-5 shadow-xs'
                }
            >
                <div className="flex items-center justify-between pb-3 border-b border-[#DCEAF8] dark:border-[#1E3A5F]">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Meja Otorisasi &amp; Approval Pengajuan Logistik
                            </h3>
                            {isReadOnly ? (
                                <span
                                    className={
                                        'px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDF2F7] ' +
                                        'text-[#526580] border border-[#CBD5E1]'
                                    }
                                >
                                    Hanya View (Owner)
                                </span>
                            ) : (
                                <span
                                    className={
                                        'px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF0CC] ' +
                                        'text-[#A65300] border border-[#FFE082]'
                                    }
                                >
                                    Wewenang Direktur
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            {isReadOnly
                                ? 'Owner dapat memantau seluruh proses approval tanpa hak mengubah data / transaksi keuangan.'
                                : 'Tinjau kebutuhan kapal dan otorisasi anggaran sebelum diteruskan ke pencairan Kopra & operasional vendor.'}
                        </p>
                    </div>

                    <Link
                        href="/approvals"
                        className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1"
                    >
                        Lihat Semua Pengajuan &rarr;
                    </Link>
                </div>

                <Table
                    className="mt-2"
                    columns={approvalColumns}
                    data={displayApprovals}
                    keyExtractor={(request) => request.id}
                    compact
                    minWidth="1040px"
                />
            </div>

            {/* 4. FINANCIAL & FLEET OVERVIEW CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* Card 1: Analisis Arus Kas & Tren Pengeluaran */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] p-5 shadow-xs flex flex-col justify-between'
                    }
                >
                    <div>
                        <div
                            className={
                                'flex items-center justify-between pb-3 border-b border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F]'
                            }
                        >
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Tren Invoice vs Pelunasan Klien
                            </h3>
                            <span className="text-xs text-[#52658E]">6 bulan terakhir</span>
                        </div>

                        {/* Visual Bars */}
                        <div className="pt-4 pb-2">
                            <div className="flex items-end gap-2 h-36">
                                <div
                                    className={
                                        'flex flex-col justify-between h-full text-[9px] ' +
                                        'text-[#8C9BB9] pr-1 font-mono'
                                    }
                                >
                                    <span>{maxFinancialTrend.toFixed(0)}M</span>
                                    <span>{(maxFinancialTrend * 0.66).toFixed(0)}M</span>
                                    <span>{(maxFinancialTrend * 0.33).toFixed(0)}M</span>
                                    <span>0</span>
                                </div>
                                <div
                                    className={
                                        'flex-1 flex items-end justify-between gap-2 h-full ' +
                                        'border-b border-[#DCEAF8] pb-1'
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
                                                    title={`Invoice: Rp ${col.invoiced} Jt`}
                                                />
                                                <div
                                                    className="w-3 bg-[#087443] rounded-t-sm"
                                                    style={{ height: `${(Number(col.collected) / maxFinancialTrend) * 100}%` }}
                                                    title={`Pelunasan: Rp ${col.collected} Jt`}
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

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                        <div className="bg-[#F0F8FF]/80 dark:bg-[#071322] p-2.5 rounded-xl">
                            <span className="text-[10px] text-[#52658E] block">
                                Total Invoice Klien
                            </span>
                            <span className="text-sm font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] block mt-0.5">
                                {formatRupiah(totalTagihan)}
                            </span>
                        </div>
                        <div className="bg-[#DCF7E8]/40 dark:bg-[#071322] p-2.5 rounded-xl border border-[#DCF7E8]">
                            <span className="text-[10px] text-[#087443] block">
                                Total Pelunasan Klien
                            </span>
                            <span className="text-sm font-extrabold text-[#087443] block mt-0.5">
                                {formatRupiah(totalPendapatan)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Portofolio Armada & Kepatuhan */}
                <div
                    className={
                        'bg-white dark:bg-[#0C1D36] rounded-2xl border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] p-5 shadow-xs flex flex-col justify-between'
                    }
                >
                    <div>
                        <div
                            className={
                                'flex items-center justify-between pb-3 border-b border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F]'
                            }
                        >
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Monitoring Portofolio Kapal &amp; Kedatangan
                            </h3>
                            <Link
                                href="/vessels"
                                className="text-xs font-semibold text-[#0060F4] hover:underline"
                            >
                                Detail Armada &rarr;
                            </Link>
                        </div>

                        <div className="space-y-3 pt-3">
                            {todayShips.slice(0, 4).map((s, idx) => (
                                <div
                                    key={idx}
                                    className={
                                        'p-3 rounded-xl bg-[#F0F8FF]/50 dark:bg-[#071322] ' +
                                        'border border-[#DCEAF8] dark:border-[#1E3A5F] flex ' +
                                        'items-center justify-between'
                                    }
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={
                                                'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] ' +
                                                'flex items-center justify-center font-bold'
                                            }
                                        >
                                            🚢
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {s.name}
                                            </h4>
                                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                {s.company || '-'} • ETA: {s.eta}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={
                                            'px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                                            'bg-[#E0F0FF] text-[#0060F4]'
                                        }
                                    >
                                        {s.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        className={
                            'pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex ' +
                            'items-center justify-between text-xs text-[#52658E]'
                        }
                    >
                        <span>
                            Tingkat Kepatuhan KSOP &amp; Pelindo: <strong>100%</strong>
                        </span>
                        <span className="font-semibold text-[#087443]">Operasional Terkendali</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
