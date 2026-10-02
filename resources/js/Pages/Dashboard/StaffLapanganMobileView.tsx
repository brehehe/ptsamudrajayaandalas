import React from 'react';
import { Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffLapanganMobileViewProps {
    summaryToday?: any;
    todayShips?: any[];
    upcomingShips?: any[];
    recentActivities?: any[];
    liveGreeting: string;
    liveDateFormatted: string;
    liveTimeFormatted: string;
    liveFullDateFormatted: string;
    dateDisplayMode: 'date' | 'time' | 'full';
    setDateDisplayMode: React.Dispatch<React.SetStateAction<'date' | 'time' | 'full'>>;
    locationName: string;
    isGpsActive: boolean;
    weatherData: {
        temp: string;
        weather: string;
        icon: string;
        isLive: boolean;
    };
    primaHeader?: any;
    submissionInfo?: any;
}

export default function StaffLapanganMobileView({
    summaryToday,
    todayShips = [],
    upcomingShips = [],
    recentActivities = [],
    liveGreeting,
    liveDateFormatted,
    liveTimeFormatted,
    liveFullDateFormatted,
    dateDisplayMode,
    setDateDisplayMode,
    locationName,
    isGpsActive,
    weatherData,
    primaHeader,
    submissionInfo,
}: StaffLapanganMobileViewProps) {
    // Merge upcoming ships with today ships so any new ship from Admin appears immediately
    const displayShipItems = [...todayShips];
    upcomingShips.forEach((u) => {
        if (!displayShipItems.some((s) => s.id === u.id || s.name === u.name)) {
            displayShipItems.unshift({
                id: u.id,
                name: u.name,
                status: u.status || 'Akan Datang',
                status_variant: 'waiting',
                eta: u.eta,
                port: u.port_name || '-',
                image_url: u.image_url || null,
            });
        }
    });

    const displayActivities = recentActivities;

    return (
        <div className="bg-[#F0F8FF] dark:bg-[#071322]">
            {/* 1. HERO BANNER */}
            <div
                className={
                    'relative w-full overflow-hidden flex flex-col justify-between min-h-[310px] ' +
                    'sm:min-h-[330px]'
                }
            >
                <img
                    src={primaHeader?.banner_image || '/images/prima-banner.jpg'}
                    alt="Pelabuhan & Kapal SJA"
                    className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
                />
                <div
                    className={
                        'absolute inset-0 bg-gradient-to-b from-[#001433]/85 via-black/45 via-45% ' +
                        'to-black/85 pointer-events-none'
                    }
                />

                <div
                    className={
                        'relative z-10 flex flex-col justify-between flex-1 pt-[64px] sm:pt-[70px] ' +
                        'pb-11 sm:pb-12 px-4 sm:px-5'
                    }
                >
                    {/* Top: Greeting & Metadata Row */}
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                {liveGreeting || primaHeader?.greeting || 'Selamat Pagi,'}
                            </p>
                            <h1
                                className={
                                    'text-2xl sm:text-3xl font-black text-white tracking-tight ' +
                                    'flex items-center gap-1.5 mt-0.5 leading-tight ' +
                                    'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                                }
                            >
                                <span>{primaHeader?.user_name || 'Pengguna'}</span>
                                <span className="text-xl">👋</span>
                            </h1>
                            <div
                                className={
                                    'inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 ' +
                                    'rounded-full bg-white/20 backdrop-blur-md border ' +
                                    'border-white/25 text-white text-[11px] font-semibold shadow-xs'
                                }
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                                <span>{primaHeader?.role_name || 'Staff Lapangan'}</span>
                            </div>
                        </div>

                        {/* Date, Location, Weather */}
                        <div className="flex flex-col items-end text-right space-y-1.5">
                            <button
                                type="button"
                                onClick={() =>
                                    setDateDisplayMode((prev) =>
                                        prev === 'date' ? 'time' : prev === 'time' ? 'full' : 'date'
                                    )
                                }
                                className={
                                    'group inline-flex items-center gap-1.5 px-2.5 py-1 ' +
                                    'rounded-full bg-black/45 hover:bg-black/60 ' +
                                    'active:bg-black/75 backdrop-blur-md border ' +
                                    'border-white/20 text-[11px] font-semibold text-white ' +
                                    'shadow-xs cursor-pointer select-none transition-colors'
                                }
                            >
                                <span className="text-[#38BDF8]">🗓️</span>
                                <span>
                                    {dateDisplayMode === 'date'
                                        ? liveDateFormatted
                                        : dateDisplayMode === 'time'
                                          ? liveTimeFormatted
                                          : liveFullDateFormatted}
                                </span>
                            </button>

                            <div
                                className={
                                    'flex items-center gap-1 text-[11px] font-medium text-white/90 ' +
                                    'drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pr-1'
                                }
                            >
                                <span className="text-[#38BDF8]">📍</span>
                                <span>{locationName}</span>
                            </div>

                            <div className="flex items-center gap-1.5 pr-1">
                                <span className="text-base">{weatherData.icon}</span>
                                <span className="text-sm font-black text-white">
                                    {weatherData.temp}
                                </span>
                                <span className="text-[10.5px] font-medium text-white/85">
                                    {weatherData.weather}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Maritime Quote */}
                    <div className="mt-auto pt-2 pb-1.5">
                        <p
                            className={
                                'text-xs sm:text-[13px] text-white/95 italic font-medium ' +
                                'leading-relaxed drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] ' +
                                'max-w-sm sm:max-w-md'
                            }
                        >
                            &ldquo;
                            {primaHeader?.quote ||
                                'Laut yang tenang bukan berarti tidak ada badai, tapi ada kapten yang selalu siap.'}
                            &rdquo;
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. LOWER CONTENT FEED */}
            <div
                className={
                    'relative z-10 -mt-8 sm:-mt-9 rounded-t-[28px] bg-[#F0F8FF] dark:bg-[#071322] ' +
                    'px-3.5 pt-3.5 pb-8 sm:pb-10 space-y-3.5 shadow-xl'
                }
            >
                {/* RINGKASAN HARI INI (4 Mini Cards) */}
                <div
                    className={
                        'rounded-[18px] bg-gradient-to-br from-[#0060F4] via-[#0055DC] ' +
                        'to-[#082870] p-3.5 text-white shadow-md'
                    }
                >
                    <div className="flex items-center gap-2 mb-3 px-0.5">
                        <span className="text-base">⚓</span>
                        <h2 className="font-extrabold text-sm tracking-tight text-white">
                            Ringkasan Hari Ini
                        </h2>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <Link
                            href="/vessels"
                            className={
                                'bg-[#E0F0FF] dark:bg-[#0060F4]/20 border border-[#C6E2FF] ' +
                                'rounded-[14px] p-2 flex flex-col justify-between text-left'
                            }
                        >
                            <span className="block text-xl font-black text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                {summaryToday?.kapal_hari_ini ?? displayShipItems.length}
                            </span>
                            <span
                                className={
                                    'text-[10px] font-bold text-[#0060F4] dark:text-[#60A5FA] ' +
                                    'leading-tight block mt-1'
                                }
                            >
                                Kapal Hari Ini
                            </span>
                        </Link>

                        <Link
                            href="/operations"
                            className={
                                'bg-[#DCF7E8] dark:bg-[#10B981]/20 border border-[#BCEFD4] ' +
                                'rounded-[14px] p-2 flex flex-col justify-between text-left'
                            }
                        >
                            <span className="block text-xl font-black text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                {summaryToday?.aktivitas_hari_ini ?? 0}
                            </span>
                            <span
                                className={
                                    'text-[10px] font-bold text-[#087443] dark:text-[#34D399] ' +
                                    'leading-tight block mt-1'
                                }
                            >
                                Aktivitas
                            </span>
                        </Link>

                        <Link
                            href="/needs"
                            className={
                                'bg-[#FFF0CC] dark:bg-[#F59E0B]/20 border border-[#FFE099] ' +
                                'rounded-[14px] p-2 flex flex-col justify-between text-left'
                            }
                        >
                            <span className="block text-xl font-black text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                {summaryToday?.kebutuhan_menunggu ?? 0}
                            </span>
                            <span
                                className={
                                    'text-[10px] font-bold text-[#A65300] dark:text-[#FBBF24] ' +
                                    'leading-tight block mt-1'
                                }
                            >
                                Kebutuhan
                            </span>
                        </Link>

                        <Link
                            href="/requests"
                            className={
                                'bg-[#EFE7FF] dark:bg-[#8B5CF6]/20 border border-[#D8C2FF] ' +
                                'rounded-[14px] p-2 flex flex-col justify-between text-left'
                            }
                        >
                            <span className="block text-xl font-black text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                {summaryToday?.pengajuan_diproses ?? 0}
                            </span>
                            <span
                                className={
                                    'text-[10px] font-bold text-[#6840BB] dark:text-[#C084FC] ' +
                                    'leading-tight block mt-1'
                                }
                            >
                                Diproses
                            </span>
                        </Link>
                    </div>
                </div>

                {/* KAPAL HARI INI */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-1.5">
                            <span className="text-base">🚢</span>
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Kapal Hari Ini
                            </h3>
                        </div>
                        <Link
                            href="/vessels"
                            className="text-xs font-bold text-[#0060F4] hover:underline"
                        >
                            Lihat Semua &rarr;
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {displayShipItems.map((ship, idx) => (
                            <Link
                                key={idx}
                                href={`/vessels/${ship.id}`}
                                className={
                                    'block p-3 rounded-xl bg-white dark:bg-[#0C1D36] border ' +
                                    'border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs ' +
                                    'hover:shadow-md transition-shadow'
                                }
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="font-extrabold text-sm text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {ship.name}
                                    </h4>
                                    <span
                                        className={
                                            'px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                                            'bg-[#E0F0FF] text-[#0060F4]'
                                        }
                                    >
                                        {ship.status}
                                    </span>
                                </div>
                                <div
                                    className={
                                        'flex items-center justify-between text-xs text-[#52658E] ' +
                                        'dark:text-[#94A3B8]'
                                    }
                                >
                                    <span>{ship.port || '-'}</span>
                                    <span>ETA: {ship.eta}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* AKTIVITAS TERBARU */}
                <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-1.5">
                            <span className="text-base">📋</span>
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Aktivitas Terbaru
                            </h3>
                        </div>
                        <Link
                            href="/operations"
                            className="text-xs font-bold text-[#0060F4] hover:underline"
                        >
                            Lihat Semua &rarr;
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {displayActivities.map((act) => (
                            <div
                                key={act.id}
                                className={
                                    'p-3 rounded-xl bg-white dark:bg-[#0C1D36] border ' +
                                    'border-[#DCEAF8] dark:border-[#1E3A5F] flex items-start ' +
                                    'gap-3'
                                }
                            >
                                <div
                                    className={
                                        'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                        'items-center justify-center text-sm font-bold ' +
                                        'flex-shrink-0 mt-0.5'
                                    }
                                >
                                    ⚓
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] truncate">
                                            {act.title}
                                        </h5>
                                        <span className="text-[10px] text-[#8C9BB9] ml-2">
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
            </div>
        </div>
    );
}
