import React, { ReactNode, useId, useState } from 'react';
import { Funnel, Search, X } from 'lucide-react';
import Card from '../ui/Card';

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
    filterControls?: ReactNode;
    filterTitle?: string;
    filterButtonLabel?: string;
    filterCountBadge?: number;
    extraActions?: ReactNode;
    chipsLabel?: string;
    searchAriaLabel?: string;
    className?: string;
}

export default function FilterBar({
    searchValue,
    onSearchChange,
    onSearchSubmit,
    searchPlaceholder = 'Cari data…',
    chips = [],
    activeChipId,
    onChipChange,
    activeFilters = [],
    onRemoveFilter,
    onResetFilters,
    onOpenFilterModal,
    filterControls,
    filterTitle = 'Filter data',
    filterButtonLabel = 'Filter',
    filterCountBadge = 0,
    extraActions,
    chipsLabel = 'Filter status',
    searchAriaLabel = 'Cari data',
    className = '',
}: FilterBarProps) {
    const [localSearch, setLocalSearch] = useState(searchValue ?? '');
    const [filterOpen, setFilterOpen] = useState(false);
    const filterPanelId = useId();
    const currentSearch = searchValue ?? localSearch;

    const handleSearchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onSearchSubmit?.();
    };

    const chipsRow = chips.length > 0 && (
        <div
            aria-label={chipsLabel}
            className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none"
        >
            {chips.map((chip) => {
                const isActive = activeChipId === chip.id;

                return (
                    <button
                        key={chip.id}
                        type="button"
                        onClick={() => onChipChange?.(chip.id)}
                        aria-pressed={isActive}
                        className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${
                            isActive
                                ? 'bg-[#0060F4] text-white shadow-xs'
                                : 'border border-[#DCEAF8] bg-white text-[#52658E] hover:border-[#0060F4]/40 hover:bg-[#E0F0FF] hover:text-[#082870] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#94A3B8] dark:hover:bg-[#132847] dark:hover:text-[#F1F5F9]'
                        }`}
                    >
                        <span>{chip.label}</span>
                        {chip.count !== undefined && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-[#F0F8FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]'
                                }`}
                            >
                                {chip.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );

    return (
        <Card
            className={`p-3.5 sm:p-4 border border-[#DCEAF8] dark:border-[#1E3A5F] space-y-3 ${className}`}
        >
            {/* Search input + filter trigger */}
            <div className="flex items-center gap-2">
                <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#0060F4]"
                    />
                    <input
                        type="text"
                        name="search"
                        autoComplete="off"
                        aria-label={searchAriaLabel}
                        value={currentSearch}
                        onChange={(e) => {
                            setLocalSearch(e.target.value);
                            onSearchChange?.(e.target.value);
                        }}
                        placeholder={searchPlaceholder}
                        className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-white pl-10 pr-11 text-sm text-[#0B1F63] shadow-xs transition-colors placeholder:text-[#8C9BB9] hover:border-[#0060F4]/50 focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B]"
                    />
                    {currentSearch && (
                        <button
                            type="button"
                            onClick={() => {
                                setLocalSearch('');
                                onSearchChange?.('');
                            }}
                            className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-xl text-[#8C9BB9] hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#0060F4] dark:text-[#64748B] dark:hover:text-[#F87171]"
                            aria-label="Hapus pencarian"
                        >
                            <X aria-hidden="true" className="size-4" />
                        </button>
                    )}
                </form>

                {(onOpenFilterModal || filterControls) && (
                    <button
                        type="button"
                        onClick={() => {
                            if (onOpenFilterModal) {
                                onOpenFilterModal();
                                return;
                            }

                            setFilterOpen((isOpen) => !isOpen);
                        }}
                        className="relative flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#DCEAF8] bg-white px-3.5 text-xs font-bold text-[#0B1F63] shadow-xs transition-colors hover:border-[#0060F4]/40 hover:bg-[#F0F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9] dark:hover:bg-[#132847]"
                        aria-label={filterButtonLabel}
                        aria-expanded={filterControls ? filterOpen : undefined}
                        aria-controls={filterControls ? filterPanelId : undefined}
                    >
                        <Funnel aria-hidden="true" className="size-4 text-[#0060F4]" />
                        <span>{filterButtonLabel}</span>
                        {filterCountBadge > 0 && (
                            <span className="flex size-5 items-center justify-center rounded-full bg-[#0060F4] text-[10px] font-bold text-white shadow-xs">
                                {filterCountBadge}
                            </span>
                        )}
                    </button>
                )}

                {extraActions}
            </div>

            {filterControls && filterOpen && (
                <div
                    id={filterPanelId}
                    className="rounded-xl border border-[#DCEAF8] bg-[#F0F8FF]/70 p-3 dark:border-[#1E3A5F] dark:bg-[#071322]"
                >
                    <p className="mb-2 text-xs font-bold text-[#082870] dark:text-[#F1F5F9]">
                        {filterTitle}
                    </p>
                    {filterControls}
                </div>
            )}

            {chipsRow}

            {/* Bottom Row: Active Filter Tags */}
            {activeFilters.length > 0 && (
                <div
                    className={
                        'pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center ' +
                        'gap-1.5 flex-wrap text-xs'
                    }
                >
                    <span className="text-[11px] font-bold text-[#8C9BB9] dark:text-[#64748B] mr-1">
                        Filter Aktif:
                    </span>
                    {activeFilters.map((filter) => (
                        <span
                            key={filter.key}
                            className={
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ' +
                                'bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#082870] ' +
                                'dark:text-[#E0F0FF] font-semibold text-[11px] border ' +
                                'border-[#0060F4]/20 dark:border-[#0060F4]/40'
                            }
                        >
                            <span>
                                {filter.label}:{' '}
                                <strong className="text-[#0060F4] dark:text-[#38BDF8]">
                                    {filter.value}
                                </strong>
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
