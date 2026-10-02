export type NeedsFilterTab = 'draft' | 'diajukan' | 'diproses' | 'selesai';

const filterOptions = [
    { key: 'draft', label: 'Draft (2)' },
    { key: 'diajukan', label: 'Diajukan (1)' },
    { key: 'diproses', label: 'Diproses (1)' },
    { key: 'selesai', label: 'Selesai (0)' },
] as const;

interface NeedsTabProps {
    onStartNeed: () => void;
    onReview: () => void;
    filterTab: NeedsFilterTab;
    onFilterChange: (tab: NeedsFilterTab) => void;
}

export default function NeedsTab({
    onStartNeed,
    onReview,
    filterTab,
    onFilterChange,
}: NeedsTabProps) {
    return (
        <div className="px-4 pt-3 pb-3 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
                <h3 className="font-extrabold text-sm text-[#082870] dark:text-white">
                    Daftar Kebutuhan
                </h3>
                <button
                    type="button"
                    onClick={() => onStartNeed()}
                    className={
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0060F4] ' +
                        'text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 ' +
                        'transition-all'
                    }
                >
                    <span>+</span>
                    <span>Tambah Kebutuhan</span>
                </button>
            </div>

            {/* Filter Pills: Draft | Diajukan | Diproses | Selesai */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
                {filterOptions.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        onClick={() => onFilterChange(f.key)}
                        className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            filterTab === f.key
                                ? 'bg-[#0060F4] text-white shadow-xs'
                                : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#0060F4] ' +
                                  'dark:text-[#38BDF8] border border-[#DCEAF8] ' +
                                  'dark:border-[#1E3A5F]'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Cards in Daftar Kebutuhan (Screen 6) */}
            <div className="space-y-3 mt-1">
                <div
                    className={
                        'bg-[#F8FAFD] dark:bg-[#071322]/60 rounded-2xl p-4 border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] shadow-2xs space-y-3'
                    }
                >
                    <div
                        className={
                            'flex items-center justify-between border-b border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] pb-2 text-xs'
                        }
                    >
                        <div className="flex items-center gap-1.5 font-bold text-[#082870] dark:text-white">
                            <span>📅</span>
                            <span>12 September 2026 • 3 Item</span>
                        </div>
                        <span
                            className={
                                'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FEF3C7] ' +
                                'text-[#D97706]'
                            }
                        >
                            Draft
                        </span>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between font-bold text-[#082870] dark:text-white">
                                <span>1. Air Tawar</span>
                                <span className="font-semibold text-[#0060F4]">60 Ton</span>
                            </div>
                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                Untuk kebutuhan operasional kapal
                            </p>
                        </div>

                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between font-bold text-[#082870] dark:text-white">
                                <span>2. Pipa Besi 1"</span>
                                <span className="font-semibold text-[#0060F4]">2 Lonjor</span>
                            </div>
                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                Untuk pegangan tangga
                            </p>
                        </div>

                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between font-bold text-[#082870] dark:text-white">
                                <span>3. Solar</span>
                                <span className="font-semibold text-[#0060F4]">200 Liter</span>
                            </div>
                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                Untuk operasional kapal
                            </p>
                        </div>
                    </div>

                    <div
                        className={
                            'pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex ' +
                            'items-center justify-between gap-2'
                        }
                    >
                        <button
                            type="button"
                            onClick={() => onReview()}
                            className={
                                'flex-1 py-2 rounded-xl bg-white dark:bg-[#0C1D36] ' +
                                'text-[#0060F4] dark:text-[#38BDF8] text-xs font-bold border ' +
                                'border-[#DCEAF8] dark:border-[#1E3A5F] active:scale-95 ' +
                                'transition-all cursor-pointer'
                            }
                        >
                            Lihat Detail
                        </button>
                        <button
                            type="button"
                            onClick={() => onReview()}
                            className={
                                'flex-1 py-2 rounded-xl bg-[#0060F4] hover:bg-[#082870] ' +
                                'text-white text-xs font-bold shadow-xs active:scale-95 ' +
                                'transition-all cursor-pointer'
                            }
                        >
                            Review &amp; Ajukan &rarr;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
