import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';

interface StaffLapanganDashboardViewProps {
    todayShips: any[];
    upcomingShips: any[];
    summaryToday?: any;
    recentActivities?: any[];
    liveTime: string;
    liveDate: string;
    weatherData: {
        temp: string;
        weather: string;
        icon: string;
    };
    locationName: string;
    userName?: string;
    onOpenShipArrivalModal?: () => void;
}

export default function StaffLapanganDashboardView({
    todayShips = [],
    upcomingShips = [],
    summaryToday,
    recentActivities = [],
    liveTime,
    liveDate,
    weatherData,
    locationName,
    userName = 'Pengguna',
    onOpenShipArrivalModal,
}: StaffLapanganDashboardViewProps) {
    const [shipFilter, setShipFilter] = useState<'semua' | 'akan_datang' | 'sandar' | 'labuh'>(
        'semua'
    );

    // Combine ships to make sure any incoming ships from Admin appear prominently
    const allDisplayShips = [...todayShips];
    upcomingShips.forEach((u) => {
        if (!allDisplayShips.some((s) => s.id === u.id || s.name === u.name)) {
            allDisplayShips.unshift({
                id: u.id,
                name: u.name,
                status: u.status || 'Akan Datang',
                status_variant: 'waiting',
                eta: u.eta,
                port: u.port_name || '-',
                company: u.company_name || '-',
                captain_name: u.captain_name,
                captain_phone: u.captain_phone,
                call_sign: u.call_sign,
                gross_tonnage: u.gross_tonnage,
                length: u.length,
                image_url: u.image_url || null,
            });
        }
    });

    const filteredShips = allDisplayShips.filter((s) => {
        const st = (s.status || '').toLowerCase();
        if (shipFilter === 'akan_datang') return st.includes('datang') || st.includes('menuju');
        if (shipFilter === 'sandar') return st.includes('sandar');
        if (shipFilter === 'labuh') return st.includes('labuh');
        return true;
    });

    const akanDatangCount = allDisplayShips.filter((s) =>
        (s.status || '').toLowerCase().includes('datang')
    ).length;
    const sandarCount = allDisplayShips.filter((s) =>
        (s.status || '').toLowerCase().includes('sandar')
    ).length;
    const labuhCount = allDisplayShips.filter((s) =>
        (s.status || '').toLowerCase().includes('labuh')
    ).length;

    const displayActivities = recentActivities;

    return (
        <div className="space-y-5">
            {/* 1. HERO BANNER PAK PRIMA (DESKTOP) */}
            <div
                className={
                    'relative rounded-2xl overflow-hidden shadow-lg border border-[#1E4A74]/40 ' +
                    'min-h-[148px] flex items-center p-6 lg:p-7 bg-[#071E4A]'
                }
            >
                <img
                    src="/images/prima-banner.jpg"
                    alt="Staf Lapangan SJA"
                    className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
                />
                <div
                    className={
                        'absolute inset-0 bg-gradient-to-r from-[#001433]/95 via-[#072454]/88 ' +
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
                            <h1
                                className={
                                    'text-2xl lg:text-3xl font-black tracking-tight text-white ' +
                                    'drop-shadow-sm flex items-center gap-2'
                                }
                            >
                                <span>{userName}</span>
                                <span className="text-xl">⚓</span>
                            </h1>
                            <span
                                className={
                                    'text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 ' +
                                    'backdrop-blur-md text-[#E7F0FA] border border-white/20'
                                }
                            >
                                Staff Lapangan
                            </span>
                        </div>
                        <p className="text-xs lg:text-sm text-[#DCEAF8]/90 italic pt-1">
                            &ldquo;Laut yang tenang bukan berarti tidak ada badai, tapi ada kapten
                            yang selalu siap.&rdquo;
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

            {/* 2. RINGKASAN HARI INI (Spesifik Staf Lapangan) */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0060F4]" />
                        Ringkasan Hari Ini
                    </h2>
                    <span className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                        Monitoring real-time aktivitas operasional staf lapangan
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Ringkasan 1: Kapal Terpantau */}
                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] rounded-2xl p-4 border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                        }
                    >
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8] block">
                                Kapal Hari Ini
                            </span>
                            <div className="text-2xl font-black text-[#0B1F63] dark:text-[#F1F5F9]">
                                {allDisplayShips.length} Armada
                            </div>
                            <span className="text-[11px] text-[#087443] font-semibold block">
                                {sandarCount} Sandar • {labuhCount} Labuh
                            </span>
                        </div>
                        <div
                            className={
                                'w-11 h-11 rounded-xl bg-[#E0F0FF] dark:bg-[#082870] ' +
                                'text-[#0060F4] dark:text-[#19B5F7] flex items-center ' +
                                'justify-center flex-shrink-0 text-xl'
                            }
                        >
                            🚢
                        </div>
                    </div>

                    {/* Ringkasan 2: Kapal Akan Datang (Data dari Admin) */}
                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] rounded-2xl p-4 border border-[#0060F4]/30 ' +
                            'bg-[#E0F0FF]/20 dark:border-[#1E3A5F] shadow-xs flex items-center ' +
                            'justify-between relative overflow-hidden'
                        }
                    >
                        <div
                            className={
                                'absolute top-0 right-0 bg-[#0060F4] text-white text-[9px] ' +
                                'font-bold px-2 py-0.5 rounded-bl-lg'
                            }
                        >
                            DATA ADMIN
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-[#0060F4] dark:text-[#19B5F7] block">
                                Kapal Akan Datang
                            </span>
                            <div className="text-2xl font-black text-[#0060F4] dark:text-[#19B5F7]">
                                {akanDatangCount} Kapal
                            </div>
                            <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-medium block">
                                Menunggu ETA pelabuhan
                            </span>
                        </div>
                        <div
                            className={
                                'w-11 h-11 rounded-xl bg-[#0060F4] text-white flex items-center ' +
                                'justify-center flex-shrink-0 text-xl shadow-xs'
                            }
                        >
                            ⏳
                        </div>
                    </div>

                    {/* Ringkasan 3: Kebutuhan Menunggu */}
                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] rounded-2xl p-4 border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                        }
                    >
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8] block">
                                Kebutuhan Menunggu
                            </span>
                            <div className="text-2xl font-black text-[#A65300] dark:text-[#FBBF24]">
                                {summaryToday?.kebutuhan_menunggu ?? 0} Item
                            </div>
                            <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-medium block">
                                Perlu approval Direktur
                            </span>
                        </div>
                        <div
                            className={
                                'w-11 h-11 rounded-xl bg-[#FFF0CC] text-[#A65300] flex ' +
                                'items-center justify-center flex-shrink-0 text-xl'
                            }
                        >
                            📦
                        </div>
                    </div>

                    {/* Ringkasan 4: Aktivitas & Laporan */}
                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] rounded-2xl p-4 border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs flex items-center justify-between'
                        }
                    >
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-[#52658E] dark:text-[#94A3B8] block">
                                Aktivitas Hari Ini
                            </span>
                            <div className="text-2xl font-black text-[#087443] dark:text-[#34D399]">
                                {displayActivities.length} Kegiatan
                            </div>
                            <span className="text-[11px] text-[#087443] font-semibold block">
                                Bunkering &amp; KSOP aktif
                            </span>
                        </div>
                        <div
                            className={
                                'w-11 h-11 rounded-xl bg-[#DCF7E8] text-[#087443] flex ' +
                                'items-center justify-center flex-shrink-0 text-xl'
                            }
                        >
                            📝
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. KAPAL HARI INI & DATA DARI ADMIN */}
            <div
                className={
                    'bg-white dark:bg-[#0C1D36] rounded-2xl border border-[#DCEAF8] ' +
                    'dark:border-[#1E3A5F] p-5 shadow-xs'
                }
            >
                <div
                    className={
                        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 ' +
                        'border-b border-[#DCEAF8] dark:border-[#1E3A5F]'
                    }
                >
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Kapal Hari Ini &amp; Kapal Yang Akan Datang
                            </h3>
                            <span
                                className={
                                    'px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F0FF] ' +
                                    'text-[#0060F4] border border-[#B8DCFF]'
                                }
                            >
                                Terhubung dengan Admin
                            </span>
                        </div>
                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            Data kapal yang diinput oleh Admin otomatis muncul di sini untuk
                            persiapan operasional lapangan
                        </p>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setShipFilter('semua')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                                shipFilter === 'semua'
                                    ? 'bg-[#0060F4] text-white shadow-xs'
                                    : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF]'
                            }`}
                        >
                            Semua ({allDisplayShips.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setShipFilter('akan_datang')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                                shipFilter === 'akan_datang'
                                    ? 'bg-[#0060F4] text-white shadow-xs'
                                    : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF]'
                            }`}
                        >
                            Akan Datang ({akanDatangCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setShipFilter('sandar')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                                shipFilter === 'sandar'
                                    ? 'bg-[#0060F4] text-white shadow-xs'
                                    : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF]'
                            }`}
                        >
                            Sandar ({sandarCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setShipFilter('labuh')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                                shipFilter === 'labuh'
                                    ? 'bg-[#0060F4] text-white shadow-xs'
                                    : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF]'
                            }`}
                        >
                            Labuh ({labuhCount})
                        </button>
                    </div>
                </div>

                {/* List Kartu Kapal Lengkap */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-4">
                    {filteredShips.map((ship, idx) => {
                        const isUpcoming = (ship.status || '').toLowerCase().includes('datang');
                        return (
                            <div
                                key={idx}
                                className={`rounded-xl p-4 border transition-all hover:shadow-md flex flex-col justify-between ${
                                    isUpcoming
                                        ? 'bg-[#F0F8FF]/80 dark:bg-[#082870]/20 border-[#0060F4]/40 shadow-xs'
                                        : 'bg-white dark:bg-[#0B1F38] border-[#DCEAF8] dark:border-[#1E3A5F]'
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h4
                                                    className={
                                                        'font-extrabold text-sm text-[#0B1F63] ' +
                                                        'dark:text-[#F1F5F9]'
                                                    }
                                                >
                                                    {ship.name}
                                                </h4>
                                                {isUpcoming && (
                                                    <span
                                                        className={
                                                            'px-1.5 py-0.2 rounded text-[9px] ' +
                                                            'font-extrabold bg-[#0060F4] text-white'
                                                        }
                                                    >
                                                        BARU
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                {ship.company || '-'}
                                            </p>
                                        </div>
                                        <span
                                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                isUpcoming
                                                    ? 'bg-[#E0F0FF] text-[#0060F4] border border-[#B8DCFF]'
                                                    : (ship.status || '')
                                                            .toLowerCase()
                                                            .includes('sandar')
                                                      ? 'bg-[#DCF7E8] text-[#087443] border border-[#A3E9C0]'
                                                      : 'bg-[#FFF0CC] text-[#A65300] border border-[#FFE082]'
                                            }`}
                                        >
                                            {ship.status}
                                        </span>
                                    </div>

                                    {/* Ship Metadata */}
                                    <div
                                        className={
                                            'bg-white/80 dark:bg-[#071322]/80 rounded-lg p-2.5 ' +
                                            'space-y-1.5 text-xs text-[#52658E] ' +
                                            'dark:text-[#94A3B8] border border-[#DCEAF8]/60 ' +
                                            'dark:border-[#1E3A5F]/60 mb-3'
                                        }
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px]">ETA Kedatangan:</span>
                                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {ship.eta || '-'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px]">Pelabuhan:</span>
                                            <span className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {ship.port || '-'}
                                            </span>
                                        </div>
                                        {(ship.captain_name || ship.call_sign) && (
                                            <div
                                                className={
                                                    'flex items-center justify-between border-t ' +
                                                    'border-[#DCEAF8]/60 pt-1'
                                                }
                                            >
                                                <span className="text-[11px]">Nahkoda:</span>
                                                <span className="font-medium text-[#0B1F63] dark:text-[#F1F5F9]">
                                                    {ship.captain_name || 'Capt. -'}{' '}
                                                    {ship.captain_phone
                                                        ? `(${ship.captain_phone})`
                                                        : ''}
                                                </span>
                                            </div>
                                        )}
                                        {(ship.gross_tonnage || ship.length || ship.call_sign) && (
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span>GT / LOA / Call:</span>
                                                <span className="font-mono text-[#0B1F63] dark:text-[#F1F5F9]">
                                                    {ship.gross_tonnage || '-'} GT •{' '}
                                                    {ship.length || '-'}m • {ship.call_sign || '-'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions for Field Staff */}
                                <div
                                    className={
                                        'flex items-center gap-2 pt-2 border-t border-[#DCEAF8]/60 ' +
                                        'dark:border-[#1E3A5F]/60'
                                    }
                                >
                                    <Link
                                        href="/needs"
                                        className={
                                            'flex-1 py-1.5 px-2 rounded-lg bg-[#E0F0FF] ' +
                                            'dark:bg-[#082870] text-[#0060F4] ' +
                                            'dark:text-[#19B5F7] hover:bg-[#0060F4] ' +
                                            'hover:text-white text-[11px] font-bold ' +
                                            'text-center transition-colors flex items-center ' +
                                            'justify-center gap-1'
                                        }
                                    >
                                        <span>+ Input Kebutuhan</span>
                                    </Link>
                                    <Link
                                        href="/operations"
                                        className={
                                            'py-1.5 px-3 rounded-lg border border-[#DCEAF8] ' +
                                            'dark:border-[#1E3A5F] hover:bg-slate-100 ' +
                                            'dark:hover:bg-slate-800 text-[11px] font-semibold ' +
                                            'text-[#52658E] dark:text-[#94A3B8] ' +
                                            'transition-colors'
                                        }
                                    >
                                        Lapor Harian
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. AKTIVITAS TERBARU & AKSI CEPAT STAF LAPANGAN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Kolom Kiri: Aktivitas Terbaru (8 cols) */}
                <div
                    className={
                        'lg:col-span-8 bg-white dark:bg-[#0C1D36] rounded-2xl border ' +
                        'border-[#DCEAF8] dark:border-[#1E3A5F] p-5 shadow-xs'
                    }
                >
                    <div
                        className={
                            'flex items-center justify-between pb-3 border-b border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] mb-3'
                        }
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📋</span>
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Aktivitas Terbaru Lapangan
                            </h3>
                        </div>
                        <Link
                            href="/operations"
                            className="text-xs font-semibold text-[#0060F4] hover:underline"
                        >
                            Semua Aktivitas &rarr;
                        </Link>
                    </div>

                    <div className="divide-y divide-[#DCEAF8]/70 dark:divide-[#1E3A5F]/70">
                        {displayActivities.map((act) => (
                            <div key={act.id} className="py-3 flex items-start gap-3">
                                <div
                                    className={
                                        'w-8 h-8 rounded-xl flex items-center justify-center ' +
                                        'flex-shrink-0 text-sm font-bold mt-0.5'
                                    }
                                    style={{
                                        backgroundColor: act.bg || '#E0F0FF',
                                        color: act.color || '#0060F4',
                                    }}
                                >
                                    ⚓
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {act.title}
                                        </h4>
                                        <span className="text-[10px] font-mono text-[#8C9BB9] whitespace-nowrap">
                                            {act.time}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                        {act.subtitle}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Kolom Kanan: Aksi Cepat Staf Lapangan (4 cols) */}
                <div
                    className={
                        'lg:col-span-4 bg-white dark:bg-[#0C1D36] rounded-2xl border ' +
                        'border-[#DCEAF8] dark:border-[#1E3A5F] p-5 shadow-xs flex flex-col ' +
                        'justify-between'
                    }
                >
                    <div>
                        <div
                            className={
                                'flex items-center justify-between pb-3 border-b border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F] mb-3'
                            }
                        >
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Aksi Cepat Lapangan
                            </h3>
                        </div>
                        <div className="space-y-2.5">
                            <Link
                                href="/operations"
                                className={
                                    'w-full p-3 rounded-xl border border-[#DCEAF8] ' +
                                    'dark:border-[#1E3A5F] bg-[#F0F8FF]/70 dark:bg-[#071322] ' +
                                    'hover:bg-[#E0F0FF] dark:hover:bg-[#1E3A5F] flex ' +
                                    'items-center gap-3 transition-colors'
                                }
                            >
                                <div
                                    className={
                                        'w-9 h-9 rounded-lg bg-[#0060F4] text-white flex ' +
                                        'items-center justify-center text-base'
                                    }
                                >
                                    📝
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] block">
                                        Catat Laporan Harian
                                    </span>
                                    <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                        Input log aktivitas &amp; foto operasional
                                    </span>
                                </div>
                            </Link>

                            <Link
                                href="/needs"
                                className={
                                    'w-full p-3 rounded-xl border border-[#DCEAF8] ' +
                                    'dark:border-[#1E3A5F] bg-[#F0F8FF]/70 dark:bg-[#071322] ' +
                                    'hover:bg-[#E0F0FF] dark:hover:bg-[#1E3A5F] flex ' +
                                    'items-center gap-3 transition-colors'
                                }
                            >
                                <div
                                    className={
                                        'w-9 h-9 rounded-lg bg-[#087443] text-white flex ' +
                                        'items-center justify-center text-base'
                                    }
                                >
                                    📦
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] block">
                                        Input Kebutuhan Kapal
                                    </span>
                                    <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                        Bunker solar, fresh water, perahu
                                    </span>
                                </div>
                            </Link>

                            <Link
                                href="/vessels"
                                className={
                                    'w-full p-3 rounded-xl border border-[#DCEAF8] ' +
                                    'dark:border-[#1E3A5F] bg-[#F0F8FF]/70 dark:bg-[#071322] ' +
                                    'hover:bg-[#E0F0FF] dark:hover:bg-[#1E3A5F] flex ' +
                                    'items-center gap-3 transition-colors'
                                }
                            >
                                <div
                                    className={
                                        'w-9 h-9 rounded-lg bg-[#A65300] text-white flex ' +
                                        'items-center justify-center text-base'
                                    }
                                >
                                    ⚓
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] block">
                                        Cek Jadwal Sandar &amp; Labuh
                                    </span>
                                    <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                        Koordinasi dengan pandu &amp; dermaga
                                    </span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F] text-center">
                        <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                            Piket Operasional: {locationName || 'Lokasi belum tersedia'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
