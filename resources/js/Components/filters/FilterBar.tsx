import React, { ReactNode, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';

export interface FilterChip {
    id: string;
    label: string;
    count?: number;
}

export interface ActiveFilterTag {
    key: string;
    label: string;
    value: string;
}

export interface FilterBarProps {
    searchValue?: string;
    onSearchChange?: (val: string) => void;
    onSearchSubmit?: () => void;
    searchPlaceholder?: string;
    chips?: FilterChip[];
    activeChipId?: string;
    onChipChange?: (chipId: string) => void;
    activeFilters?: ActiveFilterTag[];
    onRemoveFilter?: (key: string) => void;
    onResetFilters?: () => void;
    onOpenFilterModal?: () => void;
    filterCountBadge?: number;
    extraActions?: ReactNode;
    className?: string;
}

export default function FilterBar({
    searchValue = '',
    onSearchChange,
    onSearchSubmit,
    searchPlaceholder = 'Cari data...',
    chips = [],
    activeChipId,
    onChipChange,
    activeFilters = [],
    onRemoveFilter,
    onResetFilters,
    onOpenFilterModal,
    filterCountBadge = 0,
    extraActions,
    className = '',
}: FilterBarProps) {
    const [localSearch, setLocalSearch] = useState(searchValue);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSearchSubmit?.();
        }
    };

    return (
        <Card className={`p-3.5 sm:p-4 border border-[#DCEAF8] dark:border-[#1E3A5F] space-y-3 ${className}`}>
            {/* Top Row: Chips (if present) */}
            {chips.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {chips.map((chip) => {
                        const isActive = activeChipId === chip.id;
                        return (
                            <button
                                key={chip.id}
                                type="button"
                                onClick={() => onChipChange?.(chip.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                                    isActive
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] hover:bg-[#E0F0FF] dark:hover:bg-[#132847] hover:text-[#0B1F63] dark:hover:text-[#F1F5F9]'
                                }`}
                            >
                                <span>{chip.label}</span>
                                {chip.count !== undefined && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                            isActive
                                                ? 'bg-white/25 text-white'
                                                : 'bg-white dark:bg-[#0C1D36] text-[#52658E] dark:text-[#94A3B8] border border-[#DCEAF8] dark:border-[#1E3A5F]'
                                        }`}
                                    >
                                        {chip.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Middle Row: Search Input + Filter Trigger + Extra Actions */}
            <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#52658E] dark:text-[#94A3B8] pointer-events-none">
                        🔍
                    </span>
                    <input
                        type="text"
                        value={searchValue || localSearch}
                        onChange={(e) => {
                            setLocalSearch(e.target.value);
                            onSearchChange?.(e.target.value);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        placeholder={searchPlaceholder}
                        className="w-full h-11 text-xs sm:text-sm pl-10 pr-10 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] text-[#0B1F63] dark:text-[#F1F5F9] placeholder-[#8C9BB9] dark:placeholder-[#64748B] focus:outline-none focus:border-[#0060F4] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#0060F4]/20 dark:focus:ring-[#38BDF8]/20 transition"
                    />
                    {(searchValue || localSearch) && (
                        <button
                            type="button"
                            onClick={() => {
                                setLocalSearch('');
                                onSearchChange?.('');
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8C9BB9] dark:text-[#64748B] hover:text-[#0B1F63] dark:hover:text-[#F1F5F9] rounded-full"
                            aria-label="Hapus pencarian"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Filter Trigger Button */}
                {onOpenFilterModal && (
                    <button
                        type="button"
                        onClick={onOpenFilterModal}
                        className="relative h-11 px-3.5 sm:px-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F0F8FF]/50 dark:bg-[#071322] hover:bg-[#E0F0FF] dark:hover:bg-[#132847] active:bg-[#DCEAF8] dark:active:bg-[#1E3A5F] text-[#0B1F63] dark:text-[#F1F5F9] text-xs font-bold flex items-center gap-2 transition flex-shrink-0"
                        title="Buka opsi filter"
                        aria-label="Filter & Urutkan"
                    >
                        <svg className="w-4 h-4 text-[#52658E] dark:text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <span className="hidden sm:inline">Filter & Sort</span>
                        {filterCountBadge > 0 && (
                            <span className="w-5 h-5 rounded-full bg-[#0060F4] text-white text-[10px] flex items-center justify-center font-bold shadow-xs">
                                {filterCountBadge}
                            </span>
                        )}
                    </button>
                )}

                {extraActions}
            </div>

            {/* Bottom Row: Active Filter Tags */}
            {activeFilters.length > 0 && (
                <div className="pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-[11px] font-bold text-[#8C9BB9] dark:text-[#64748B] mr-1">Filter Aktif:</span>
                    {activeFilters.map((filter) => (
                        <span
                            key={filter.key}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#082870] dark:text-[#E0F0FF] font-semibold text-[11px] border border-[#0060F4]/20 dark:border-[#0060F4]/40"
                        >
                            <span>
                                {filter.label}: <strong className="text-[#0060F4] dark:text-[#38BDF8]">{filter.value}</strong>
                            </span>
                            {onRemoveFilter && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveFilter(filter.key)}
                                    className="hover:text-[#C62840] dark:hover:text-[#F87171] font-bold text-xs ml-0.5"
                                    aria-label={`Hapus filter ${filter.label}`}
                                >
                                    ✕
                                </button>
                            )}
                        </span>
                    ))}

                    {onResetFilters && (
                        <button
                            type="button"
                            onClick={onResetFilters}
                            className="text-[11px] font-bold text-[#C62840] dark:text-[#F87171] hover:underline ml-2"
                        >
                            Reset Semua
                        </button>
                    )}
                </div>
            )}
        </Card>
    );
}
