import React, { useState, useEffect, useRef } from 'react';

export interface DateRange {
    startDate: string; // YYYY-MM-DD or ''
    endDate: string;   // YYYY-MM-DD or ''
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    className?: string;
    placeholder?: string;
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
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStart, setTempStart] = useState(value.startDate || '');
    const [tempEnd, setTempEnd] = useState(value.endDate || '');
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTempStart(value.startDate || '');
        setTempEnd(value.endDate || '');
    }, [value.startDate, value.endDate]);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

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

    const setPreset = (preset: 'today' | '7days' | '30days' | 'thisMonth' | 'all') => {
        const today = new Date();
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (preset === 'all') {
            setTempStart('');
            setTempEnd('');
            onChange({ startDate: '', endDate: '' });
            setIsOpen(false);
            return;
        }

        if (preset === 'today') {
            const str = formatDate(today);
            setTempStart(str);
            setTempEnd(str);
            onChange({ startDate: str, endDate: str });
            setIsOpen(false);
            return;
        }

        if (preset === '7days') {
            const past = new Date(today);
            past.setDate(today.getDate() - 7);
            const startStr = formatDate(past);
            const endStr = formatDate(today);
            setTempStart(startStr);
            setTempEnd(endStr);
            onChange({ startDate: startStr, endDate: endStr });
            setIsOpen(false);
            return;
        }

        if (preset === '30days') {
            const past = new Date(today);
            past.setDate(today.getDate() - 30);
            const startStr = formatDate(past);
            const endStr = formatDate(today);
            setTempStart(startStr);
            setTempEnd(endStr);
            onChange({ startDate: startStr, endDate: endStr });
            setIsOpen(false);
            return;
        }

        if (preset === 'thisMonth') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const startStr = formatDate(firstDay);
            const endStr = formatDate(lastDay);
            setTempStart(startStr);
            setTempEnd(endStr);
            onChange({ startDate: startStr, endDate: endStr });
            setIsOpen(false);
            return;
        }
    };

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

    return (
        <div className={`relative ${className}`} ref={popoverRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${
                    hasActiveFilter
                        ? 'border-[#0060F4] bg-[#F0F8FF] text-[#0060F4] dark:border-[#38BDF8] dark:bg-[#0C1D36] dark:text-[#38BDF8]'
                        : 'border-[#DCEAF8] bg-[#F8FBFF] text-[#0B1F63] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9]'
                }`}
            >
                <svg
                    aria-hidden="true"
                    className="w-4 h-4 text-[#0060F4] shrink-0 dark:text-[#38BDF8]"
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
                <span className="flex-1 text-xs font-semibold tabular-nums truncate">
                    {displayLabel}
                </span>
                {hasActiveFilter && (
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReset();
                        }}
                        className="p-1 text-xs text-[#52658E] hover:text-red-500 transition-colors"
                        title="Reset Filter Tanggal"
                    >
                        ✕
                    </span>
                )}
            </button>

            {/* Popover / Dropdown Modal */}
            {isOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-32px)] rounded-2xl border border-[#DCEAF8] bg-white p-4 shadow-xl dark:border-[#1E3A5F] dark:bg-[#0C1D36] sm:w-96">
                    <div className="flex items-center justify-between border-b border-[#DCEAF8] pb-2.5 dark:border-[#1E3A5F]">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#082870] dark:text-white">
                            Filter Rentang Tanggal
                        </h4>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg p-1 text-[#52658E] hover:bg-[#F0F8FF] hover:text-[#0B1F63] dark:text-[#94A3B8]"
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
                            <button
                                type="button"
                                onClick={() => setPreset('all')}
                                className="rounded-lg border border-[#DCEAF8] bg-[#F8FBFF] px-2.5 py-1 text-[11px] font-bold text-[#082870] hover:bg-[#0060F4] hover:text-white dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white transition-colors"
                            >
                                Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreset('today')}
                                className="rounded-lg border border-[#DCEAF8] bg-[#F8FBFF] px-2.5 py-1 text-[11px] font-bold text-[#082870] hover:bg-[#0060F4] hover:text-white dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white transition-colors"
                            >
                                Hari Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreset('7days')}
                                className="rounded-lg border border-[#DCEAF8] bg-[#F8FBFF] px-2.5 py-1 text-[11px] font-bold text-[#082870] hover:bg-[#0060F4] hover:text-white dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white transition-colors"
                            >
                                7 Hari Terakhir
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreset('30days')}
                                className="rounded-lg border border-[#DCEAF8] bg-[#F8FBFF] px-2.5 py-1 text-[11px] font-bold text-[#082870] hover:bg-[#0060F4] hover:text-white dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white transition-colors"
                            >
                                30 Hari Terakhir
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreset('thisMonth')}
                                className="rounded-lg border border-[#DCEAF8] bg-[#F8FBFF] px-2.5 py-1 text-[11px] font-bold text-[#082870] hover:bg-[#0060F4] hover:text-white dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white transition-colors"
                            >
                                Bulan Ini
                            </button>
                        </div>
                    </div>

                    {/* Date Inputs */}
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                Dari Tanggal:
                            </label>
                            <input
                                type="date"
                                value={tempStart}
                                onChange={(e) => setTempStart(e.target.value)}
                                className="mt-1 block w-full rounded-xl border border-[#DCEAF8] bg-white px-3 py-2 text-xs font-semibold text-[#0B1F63] focus:border-[#0060F4] focus:outline-none dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                Sampai Tanggal:
                            </label>
                            <input
                                type="date"
                                value={tempEnd}
                                onChange={(e) => setTempEnd(e.target.value)}
                                className="mt-1 block w-full rounded-xl border border-[#DCEAF8] bg-white px-3 py-2 text-xs font-semibold text-[#0B1F63] focus:border-[#0060F4] focus:outline-none dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 flex items-center justify-between border-t border-[#DCEAF8] pt-3 dark:border-[#1E3A5F]">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-xs font-bold text-[#52658E] hover:text-red-500 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            className="rounded-xl bg-[#0060F4] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#082870] transition-colors"
                        >
                            Terapkan
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
