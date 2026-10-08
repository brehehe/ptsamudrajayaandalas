import type { Ship } from './types';
import { formatEtaDateTime } from './format';

interface OverviewTabProps {
    vessel: Ship;
    selectedSection?: string;
    onStartNeed: () => void;
    onRecordActivity: () => void;
    canManageClearance: boolean;
    canCreateRequests: boolean;
    onClearance: (direction: 'in' | 'out') => void;
}

export default function OverviewTab({
    vessel,
    selectedSection = 'Deck',
    onStartNeed,
    onRecordActivity,
    canManageClearance,
    canCreateRequests,
    onClearance,
}: OverviewTabProps) {
    const etaDate = formatEtaDateTime(vessel.eta);

    return (
        <div className="px-4 pt-2 space-y-4">
            {/* Spesifikasi & Informasi Kapal — Tanpa garis bawah sesuai instruksi */}
            <div className="flex flex-col gap-0.5 text-xs">
                <div className="flex items-start justify-between py-1.5">
                    <span className="text-[#52658E] dark:text-[#94A3B8]">Perusahaan</span>
                    <span className="font-semibold text-[#082870] dark:text-white text-right max-w-[210px] truncate">
                        {vessel.company?.name || 'Belum diisi'}
                    </span>
                </div>
                <div className="flex items-start justify-between py-1.5">
                    <span className="text-[#52658E] dark:text-[#94A3B8]">Alamat</span>
                    <span className="font-semibold text-[#082870] dark:text-white text-right max-w-[210px] truncate">
                        {vessel.company?.address || 'Belum diisi'}
                    </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                    <span className="text-[#52658E] dark:text-[#94A3B8]">Bendera</span>
                    <span className="font-semibold text-[#082870] dark:text-white">
                        {vessel.flag || 'Belum diisi'}
                    </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                    <span className="text-[#52658E] dark:text-[#94A3B8]">GT / Panjang</span>
                    <span className="font-semibold text-[#082870] dark:text-white">
                        {vessel.gross_tonnage ? `GT ${vessel.gross_tonnage}` : 'GT -'} /{' '}
                        {vessel.length ? `${vessel.length} M` : '-'}
                    </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                    <span className="text-[#52658E] dark:text-[#94A3B8]">Call Sign</span>
                    <span className="font-semibold text-[#082870] dark:text-white font-mono">
                        {vessel.call_sign || 'Belum diisi'}
                    </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                    <span className="text-[#52658E] dark:text-[#94A3B8]">Nakhoda</span>
                    <span className="font-semibold text-[#082870] dark:text-white">
                        {vessel.captain_name || 'Belum diisi'}
                    </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                    <span className="text-[#52658E] dark:text-[#94A3B8]">Bagian</span>
                    <span className="font-semibold text-[#082870] dark:text-white">
                        {selectedSection || 'Deck'}
                    </span>
                </div>
            </div>

            {/* Jadwal & Lokasi — Seamless Section */}
            <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs">
                    <h3 className="font-extrabold text-sm text-[#082870] dark:text-white">
                        Jadwal &amp; Lokasi
                    </h3>
                    {/* <button
                        type="button"
                        className="text-[#0060F4] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                        <svg
                            className="w-3.5 h-3.5 text-[#0060F4]"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d={
                                    'M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9z' +
                                    'M10 11a2 2 0 100-4 2 2 0 000 4z'
                                }
                                clipRule="evenodd"
                            />
                        </svg>
                        <span>Lihat di Peta &gt;</span>
                    </button> */}
                </div>

                {/* 3 Pills: ETA | ETD | Pelabuhan */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div
                        className={
                            'p-2.5 rounded-xl bg-[#F0F8FF] dark:bg-[#071322] border ' +
                            'border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center'
                        }
                    >
                        <span
                            className={
                                'text-[10px] text-[#52658E] dark:text-[#94A3B8] font-bold ' +
                                'uppercase block tracking-wider'
                            }
                        >
                            ETA
                        </span>
                        <span className="font-bold text-[#082870] dark:text-white block mt-1 leading-tight text-[11px]">
                            {etaDate === '-' ? 'Belum ditentukan' : etaDate}
                        </span>
                    </div>

                    <div
                        className={
                            'p-2.5 rounded-xl bg-[#F0F8FF] dark:bg-[#071322] border ' +
                            'border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center'
                        }
                    >
                        <span
                            className={
                                'text-[10px] text-[#52658E] dark:text-[#94A3B8] font-bold ' +
                                'uppercase block tracking-wider'
                            }
                        >
                            ETD
                        </span>
                        <span
                            className={
                                'font-medium text-[#52658E] dark:text-[#94A3B8] block mt-1 ' +
                                'text-[10.5px] leading-tight'
                            }
                        >
                            Belum ditentukan
                        </span>
                    </div>

                    <div
                        className={
                            'p-2.5 rounded-xl bg-[#F0F8FF] dark:bg-[#071322] border ' +
                            'border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center'
                        }
                    >
                        <span
                            className={
                                'text-[10px] text-[#52658E] dark:text-[#94A3B8] font-bold ' +
                                'uppercase block tracking-wider'
                            }
                        >
                            PELABUHAN
                        </span>
                        <span
                            className={
                                'font-bold text-[#082870] dark:text-white block mt-1 text-[10.5px] ' +
                                'leading-tight break-words'
                            }
                        >
                            {vessel.port?.name || 'Belum diisi'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Aksi Cepat (2x2 Grid) */}
            {(canManageClearance || canCreateRequests) && (
                <div className="space-y-2.5 pt-1 pb-2">
                    <h3 className="text-sm font-extrabold text-[#082870] dark:text-white">
                        Aksi Cepat
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        {/* 1. Clearance In (Blue) */}
                        {canCreateRequests && (
                            <button
                                type="button"
                                onClick={() => onClearance('in')}
                                className={
                                    'p-3 rounded-2xl bg-[#0060F4] hover:bg-[#0050D0] text-white ' +
                                    'flex flex-col items-center justify-center gap-1.5 shadow-sm ' +
                                    'transition-colors cursor-pointer focus-visible:outline-2 ' +
                                    'focus-visible:outline-offset-2 ' +
                                    'focus-visible:outline-sja-primary'
                                }
                            >
                            <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <circle cx="12" cy="5" r="3" />
                                <line x1="12" y1="8" x2="12" y2="21" />
                                <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
                            </svg>
                            <span className="text-xs font-bold">Clearance In</span>
                            </button>
                        )}

                        {/* 2. Buat Kebutuhan (Peach / Orange) -> Enters Tambah Kebutuhan Flow */}
                        {canCreateRequests && (
                            <button
                                type="button"
                                onClick={() => onStartNeed()}
                                className={
                                    'p-3 rounded-2xl bg-[#FFF3E8] hover:bg-[#FFE8D6] ' +
                                    'dark:bg-[#78350F]/20 text-[#D97706] border border-[#FDE68A]/70 ' +
                                    'dark:border-[#78350F]/40 flex flex-col items-center ' +
                                    'justify-center gap-1.5 shadow-2xs active:scale-97 transition-all ' +
                                    'cursor-pointer'
                                }
                            >
                            <svg
                                className="w-5 h-5 text-[#D97706]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d={
                                        'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 ' +
                                        '01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                    }
                                />
                            </svg>
                            <span className="text-xs font-bold">Buat Kebutuhan</span>
                            </button>
                        )}

                        {/* 3. Tambah Aktivitas (Green) */}
                        {canManageClearance && (
                            <button
                                type="button"
                                onClick={() => onRecordActivity()}
                                className={
                                    'p-3 rounded-2xl bg-[#E8F8F0] hover:bg-[#D5F2E3] ' +
                                    'dark:bg-[#064E3B]/20 text-[#087443] dark:text-[#34D399] border ' +
                                    'border-[#A7F3D0]/70 dark:border-[#064E3B]/40 flex flex-col ' +
                                    'items-center justify-center gap-1.5 shadow-2xs active:scale-97 ' +
                                    'transition-all cursor-pointer'
                                }
                            >
                            <svg
                                className="w-5 h-5 text-[#087443] dark:text-[#34D399]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d={
                                        'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414' +
                                        '-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                                    }
                                />
                            </svg>
                            <span className="text-xs font-bold">Tambah Aktivitas</span>
                            </button>
                        )}

                        {/* 4. Clearance Out (Purple) */}
                        {canCreateRequests && (
                            <button
                                type="button"
                                onClick={() => onClearance('out')}
                                className={
                                    'p-3 rounded-2xl bg-[#F0EEFF] hover:bg-[#E5E0FF] ' +
                                    'dark:bg-[#4C1D95]/20 text-[#6B46C1] dark:text-[#C084FC] ' +
                                    'border border-[#DDD6FE]/70 dark:border-[#4C1D95]/40 flex ' +
                                    'flex-col items-center justify-center gap-1.5 shadow-2xs ' +
                                    'transition-colors cursor-pointer focus-visible:outline-2 ' +
                                    'focus-visible:outline-offset-2 ' +
                                    'focus-visible:outline-sja-primary'
                                }
                            >
                            <svg
                                className="w-5 h-5 text-[#6B46C1] dark:text-[#C084FC]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 12V6h4v6"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14 12V8h4v4"
                                />
                                <line
                                    x1="12"
                                    y1="2"
                                    x2="12"
                                    y2="6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span className="text-xs font-bold">Clearance Out</span>
                            </button>
                        )}
                    </div>

                    {canManageClearance && !canCreateRequests && (
                        <p role="status" className="rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] px-3 py-2.5 text-xs font-semibold text-[#52658E] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#94A3B8]">
                            Kunjungan telah selesai. Pengajuan baru tidak dapat dibuat.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
