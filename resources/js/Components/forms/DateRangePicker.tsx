import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface DateRange {
    startDate: string; // YYYY-MM-DD or ''
    endDate: string;   // YYYY-MM-DD or ''
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    className?: string;
    placeholder?: string;
    inline?: boolean;
    placement?: 'auto' | 'down' | 'up';
}

function formatDateDisplay(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts.map(Number);
            const date = new Date(y, m - 1, d);
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
}

export default function DateRangePicker({
    value,
    onChange,
    className = '',
    placeholder = 'Pilih Rentang Tanggal',
    inline = false,
    placement = 'auto',
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStart, setTempStart] = useState(value.startDate || '');
    const [tempEnd, setTempEnd] = useState(value.endDate || '');
    const [placementV, setPlacementV] = useState<'down' | 'up'>('down');
    const [placementH, setPlacementH] = useState<'left' | 'right'>('left');
    const [isMobile, setIsMobile] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Track responsive screen size for portal vs in-place placement
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile, { passive: true });
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        setTempStart(value.startDate || '');
        setTempEnd(value.endDate || '');
    }, [value.startDate, value.endDate]);

    // Recalculate auto-flip and auto-align positioning for desktop
    const updatePlacement = useCallback(() => {
        if (!triggerRef.current) return;
        if (placement === 'down') {
            setPlacementV('down');
            return;
        }
        if (placement === 'up') {
            setPlacementV('up');
            return;
        }
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Popover dimensions (with fallback)
        const popoverHeight = popoverRef.current?.offsetHeight || 370;
        const popoverWidth = popoverRef.current?.offsetWidth || 384;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        // If bottom space is not enough (< popoverHeight + 16px) and top space is larger, flip UP!
        if (spaceBelow < popoverHeight + 16 && spaceAbove > spaceBelow) {
            setPlacementV('up');
        } else {
            setPlacementV('down');
        }

        // Horizontal alignment: if right space is tight, align to right edge of button!
        const spaceRight = viewportWidth - rect.left;
        if (spaceRight < popoverWidth + 16 && rect.right >= popoverWidth) {
            setPlacementH('right');
        } else {
            setPlacementH('left');
        }
    }, [placement]);

    useEffect(() => {
        if (isOpen && !isMobile) {
            updatePlacement();
            const rafId = requestAnimationFrame(() => {
                updatePlacement();
            });

            const handleScrollOrResize = () => {
                updatePlacement();
            };

            window.addEventListener('resize', handleScrollOrResize, { passive: true });
            window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });

            return () => {
                cancelAnimationFrame(rafId);
                window.removeEventListener('resize', handleScrollOrResize);
                window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
            };
        }
    }, [isOpen, isMobile, updatePlacement]);

    // Close when clicking outside or pressing Escape
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isMobile) {
                // On mobile, backdrop click handles dismissal
                return;
            }

            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                (!popoverRef.current || !popoverRef.current.contains(event.target as Node))
            ) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isMobile]);

    const handleApply = () => {
        onChange({ startDate: tempStart, endDate: tempEnd });
        setIsOpen(false);
    };

    const handleReset = () => {
        setTempStart('');
        setTempEnd('');
        onChange({ startDate: '', endDate: '' });
        setIsOpen(false);
    };

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getPresetDates = () => {
        const today = new Date();
        const todayStr = formatDate(today);

        const past7 = new Date(today);
        past7.setDate(today.getDate() - 7);
        const past7Str = formatDate(past7);

        const past30 = new Date(today);
        past30.setDate(today.getDate() - 30);
        const past30Str = formatDate(past30);

        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const firstDayStr = formatDate(firstDay);
        const lastDayStr = formatDate(lastDay);

        return {
            todayStr,
            past7Str,
            past30Str,
            firstDayStr,
            lastDayStr,
        };
    };

    const { todayStr, past7Str, past30Str, firstDayStr, lastDayStr } = getPresetDates();

    const activeStart = inline ? value.startDate : tempStart;
    const activeEnd = inline ? value.endDate : tempEnd;

    const getActivePreset = (): 'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom' => {
        if (!activeStart && !activeEnd) return 'all';
        if (activeStart === todayStr && activeEnd === todayStr) return 'today';
        if (activeStart === past7Str && activeEnd === todayStr) return '7days';
        if (activeStart === past30Str && activeEnd === todayStr) return '30days';
        if (activeStart === firstDayStr && activeEnd === lastDayStr) return 'thisMonth';
        return 'custom';
    };

    const activePreset = getActivePreset();

    const setPreset = (preset: 'today' | '7days' | '30days' | 'thisMonth' | 'all') => {
        if (preset === 'all') {
            setTempStart('');
            setTempEnd('');
            onChange({ startDate: '', endDate: '' });
            setIsOpen(false);
            return;
        }

        if (preset === 'today') {
            setTempStart(todayStr);
            setTempEnd(todayStr);
            onChange({ startDate: todayStr, endDate: todayStr });
            setIsOpen(false);
            return;
        }

        if (preset === '7days') {
            setTempStart(past7Str);
            setTempEnd(todayStr);
            onChange({ startDate: past7Str, endDate: todayStr });
            setIsOpen(false);
            return;
        }

        if (preset === '30days') {
            setTempStart(past30Str);
            setTempEnd(todayStr);
            onChange({ startDate: past30Str, endDate: todayStr });
            setIsOpen(false);
            return;
        }

        if (preset === 'thisMonth') {
            setTempStart(firstDayStr);
            setTempEnd(lastDayStr);
            onChange({ startDate: firstDayStr, endDate: lastDayStr });
            setIsOpen(false);
            return;
        }
    };

    const presets: Array<{ id: 'all' | 'today' | '7days' | '30days' | 'thisMonth'; label: string }> = [
        { id: 'all', label: 'Semua' },
        { id: 'today', label: 'Hari Ini' },
        { id: '7days', label: '7 Hari Terakhir' },
        { id: '30days', label: '30 Hari Terakhir' },
        { id: 'thisMonth', label: 'Bulan Ini' },
    ];

    // Label computation
    const startDisplay = formatDateDisplay(value.startDate);
    const endDisplay = formatDateDisplay(value.endDate);

    let displayLabel = placeholder;
    if (startDisplay && endDisplay) {
        displayLabel = startDisplay === endDisplay ? startDisplay : `${startDisplay} — ${endDisplay}`;
    } else if (startDisplay) {
        displayLabel = `Mulai ${startDisplay}`;
    } else if (endDisplay) {
        displayLabel = `Hingga ${endDisplay}`;
    }

    const hasActiveFilter = Boolean(value.startDate || value.endDate);

    const renderInnerContent = (isMobileView: boolean) => (
        <>
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-[#DCEAF8] pb-2.5 dark:border-[#1E3A5F]">
                <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-[#F0F8FF] text-[#0060F4] dark:bg-[#102B4A] dark:text-[#38BDF8]">
                        <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#082870] dark:text-white">
                        Filter Rentang Tanggal
                    </h4>
                </div>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Tutup Filter Tanggal"
                    className="rounded-lg p-1 text-[#52658E] hover:bg-[#F0F8FF] hover:text-[#0B1F63] transition-colors dark:text-[#94A3B8] dark:hover:bg-[#102B4A]"
                >
                    ✕
                </button>
            </div>

            {/* Quick Presets */}
            <div className="mt-3">
                <span className="text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                    Pilihan Cepat:
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {presets.map((p) => {
                        const isActive = activePreset === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setPreset(p.id)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                    isActive
                                        ? 'border border-[#0060F4] bg-[#0060F4] text-white shadow-xs'
                                        : 'border border-[#DCEAF8] bg-[#F8FBFF] text-[#082870] hover:border-[#0060F4]/40 hover:bg-[#F0F8FF] hover:text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#E2E8F0] dark:hover:bg-[#102B4A]'
                                }`}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Date Inputs */}
            <div className="mt-3.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                        <label className="block text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] mb-1">
                            Dari Tanggal
                        </label>
                        <input
                            type="date"
                            value={tempStart}
                            max={tempEnd || undefined}
                            onChange={(e) => setTempStart(e.target.value)}
                            className="block w-full rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] px-2.5 py-2 text-xs font-semibold text-[#0B1F63] transition-colors focus:border-[#0060F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] mb-1">
                            Sampai Tanggal
                        </label>
                        <input
                            type="date"
                            value={tempEnd}
                            min={tempStart || undefined}
                            onChange={(e) => setTempEnd(e.target.value)}
                            className="block w-full rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] px-2.5 py-2 text-xs font-semibold text-[#0B1F63] transition-colors focus:border-[#0060F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                        />
                    </div>
                </div>

                {/* Range Preview Badge */}
                {(tempStart || tempEnd) && (
                    <div className="flex items-center justify-between rounded-lg bg-[#F0F8FF] px-2.5 py-1.5 text-[11px] text-[#0060F4] dark:bg-[#0B254A] dark:text-[#38BDF8]">
                        <span className="font-medium">Rentang dipilih:</span>
                        <span className="font-bold">
                            {formatDateDisplay(tempStart) || '...'} — {formatDateDisplay(tempEnd) || '...'}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="mt-4 flex items-center justify-between border-t border-[#DCEAF8] pt-3 dark:border-[#1E3A5F]">
                <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl px-3 py-2 text-xs font-bold text-[#52658E] hover:bg-rose-50 hover:text-rose-600 transition-colors dark:text-[#94A3B8] dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                >
                    Reset Filter
                </button>
                <div className="flex items-center gap-2">
                    {isMobileView && (
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-xl border border-[#DCEAF8] px-3.5 py-2 text-xs font-bold text-[#52658E] hover:bg-[#F8FBFF] hover:text-[#0B1F63] transition-colors dark:border-[#1E3A5F] dark:text-[#94A3B8]"
                        >
                            Batal
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleApply}
                        className="rounded-xl bg-[#0060F4] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#082870] focus:ring-2 focus:ring-[#0060F4]/30 transition-colors"
                    >
                        Terapkan
                    </button>
                </div>
            </div>
        </>
    );

    if (inline) {
        return (
            <div className={`space-y-3 ${className}`} ref={containerRef}>
                {/* Quick Presets */}
                <div>
                    <span className="text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                        Pilihan Cepat:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {presets.map((p) => {
                            const isActive = activePreset === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPreset(p.id)}
                                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                        isActive
                                            ? 'border border-[#0060F4] bg-[#0060F4] text-white shadow-xs'
                                            : 'border border-[#DCEAF8] bg-[#F8FBFF] text-[#082870] hover:border-[#0060F4]/40 hover:bg-[#F0F8FF] hover:text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#E2E8F0] dark:hover:bg-[#102B4A]'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] mb-1">
                            Dari Tanggal
                        </label>
                        <input
                            type="date"
                            value={value.startDate || ''}
                            max={value.endDate || undefined}
                            onChange={(e) => {
                                const newStart = e.target.value;
                                setTempStart(newStart);
                                onChange({ startDate: newStart, endDate: value.endDate || '' });
                            }}
                            className="block w-full h-10 rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold text-[#0B1F63] transition-colors focus:border-[#0060F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] mb-1">
                            Sampai Tanggal
                        </label>
                        <input
                            type="date"
                            value={value.endDate || ''}
                            min={value.startDate || undefined}
                            onChange={(e) => {
                                const newEnd = e.target.value;
                                setTempEnd(newEnd);
                                onChange({ startDate: value.startDate || '', endDate: newEnd });
                            }}
                            className="block w-full h-10 rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold text-[#0B1F63] transition-colors focus:border-[#0060F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                        />
                    </div>
                </div>

                {/* Selected Range Info */}
                {(value.startDate || value.endDate) && (
                    <div className="flex items-center justify-between rounded-xl bg-[#F0F8FF] px-3 py-2 text-xs text-[#0060F4] dark:bg-[#0B254A] dark:text-[#38BDF8]">
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <span className="font-medium text-[11px] text-[#52658E] dark:text-[#94A3B8]">Rentang dipilih:</span>
                            <span className="font-bold tabular-nums">
                                {formatDateDisplay(value.startDate) || '...'} — {formatDateDisplay(value.endDate) || '...'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setTempStart('');
                                setTempEnd('');
                                onChange({ startDate: '', endDate: '' });
                            }}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 ml-2 shrink-0 cursor-pointer"
                        >
                            Reset Tanggal
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${
                    hasActiveFilter
                        ? 'border-[#0060F4] bg-[#F0F8FF] text-[#0060F4] dark:border-[#38BDF8] dark:bg-[#0C1D36] dark:text-[#38BDF8]'
                        : 'border-[#DCEAF8] bg-[#F8FBFF] text-[#0B1F63] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9]'
                }`}
            >
                <svg
                    aria-hidden="true"
                    className="size-4 shrink-0 text-[#0060F4] dark:text-[#38BDF8]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="flex-1 truncate text-xs font-semibold tabular-nums">
                    {displayLabel}
                </span>
                {hasActiveFilter && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReset();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                handleReset();
                            }
                        }}
                        className="rounded-md p-1 text-xs text-[#52658E] hover:bg-rose-100 hover:text-rose-600 transition-colors dark:hover:bg-rose-950/40"
                        title="Reset Filter Tanggal"
                    >
                        ✕
                    </span>
                )}
            </button>

            {/* Mobile View: Render via createPortal directly on document.body with z-[70] ABOVE bottom navigation bar */}
            {isOpen && isMobile && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:hidden">
                    {/* Backdrop covers entire screen including the bottom navigation bar */}
                    <div
                        className="fixed inset-0 bg-[#082870]/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Mobile Bottom Card Modal (sitting safely above bottom safe area) */}
                    <div
                        ref={popoverRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Filter Rentang Tanggal"
                        className="relative z-10 w-full max-w-lg rounded-2xl border border-[#DCEAF8] bg-white p-4 shadow-2xl dark:border-[#1E3A5F] dark:bg-[#0C1D36] max-h-[85vh] overflow-y-auto mb-[max(0.5rem,env(safe-area-inset-bottom))]"
                    >
                        {renderInnerContent(true)}
                    </div>
                </div>,
                document.body
            )}

            {/* Desktop View: Render in-place with smart auto-flip and auto-align */}
            {isOpen && !isMobile && (
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Filter Rentang Tanggal"
                    className={`
                        absolute z-[75] w-96 rounded-2xl border border-[#DCEAF8] bg-white p-4 shadow-2xl transition-all duration-150 dark:border-[#1E3A5F] dark:bg-[#0C1D36] max-h-[min(520px,calc(100vh-100px))] overflow-y-auto
                        ${placementV === 'up' ? 'bottom-full mb-2.5' : 'top-full mt-2.5'}
                        ${placementH === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'}
                    `}
                >
                    {/* Decorative Pointer Notch for Desktop */}
                    <div
                        className={`absolute h-2.5 w-2.5 rotate-45 border border-[#DCEAF8] bg-white dark:border-[#1E3A5F] dark:bg-[#0C1D36] ${
                            placementV === 'up'
                                ? '-bottom-1.5 border-t-0 border-l-0'
                                : '-top-1.5 border-b-0 border-r-0'
                        } ${placementH === 'right' ? 'right-6' : 'left-6'}`}
                        aria-hidden="true"
                    />

                    {renderInnerContent(false)}
                </div>
            )}
        </div>
    );
}
