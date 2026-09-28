import React, { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectSearchOption {
    value: string | number;
    label: string;
    description?: string;
    badge?: string;
    icon?: ReactNode;
    disabled?: boolean;
}

export interface SelectSearchProps {
    options: SelectSearchOption[];
    value?: string | number;
    onChange: (value: string | number) => void;
    label?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    helperText?: string;
    error?: string;
    disabled?: boolean;
    clearable?: boolean;
    required?: boolean;
    emptyMessage?: string;
    className?: string;
}

export default function SelectSearch({
    options,
    value,
    onChange,
    label,
    placeholder = 'Pilih opsi...',
    searchPlaceholder = 'Ketik untuk mencari...',
    helperText,
    error,
    disabled = false,
    clearable = true,
    required = false,
    emptyMessage = 'Tidak ada hasil yang cocok',
    className = '',
}: SelectSearchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = options.filter((opt) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            opt.label.toLowerCase().includes(q) ||
            (opt.description && opt.description.toLowerCase().includes(q)) ||
            (opt.badge && opt.badge.toLowerCase().includes(q))
        );
    });

    // Detect placement (flip upward if space below is cramped)
    const updatePlacement = useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 280;

        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
            setPlacement('top');
        } else {
            setPlacement('bottom');
        }
    }, []);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', updatePlacement);
            window.addEventListener('scroll', updatePlacement, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePlacement);
            window.removeEventListener('scroll', updatePlacement, true);
        };
    }, [isOpen, updatePlacement]);

    // Focus search input and calculate placement when opened
    useEffect(() => {
        if (isOpen) {
            updatePlacement();
            setSearchQuery('');
            setHighlightedIndex(0);
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen, updatePlacement]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && itemRefs.current[highlightedIndex]) {
            itemRefs.current[highlightedIndex]?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [highlightedIndex, isOpen]);

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
                    handleSelect(filteredOptions[highlightedIndex].value);
                }
                break;
            case 'Escape':
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    return (
        <div
            ref={containerRef}
            className={`w-full space-y-1.5 text-left relative transition-all duration-150 ${
                isOpen ? 'z-50' : 'z-10'
            } ${className}`}
        >
            {label && (
                <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] select-none">
                    {label}
                    {required && <span className="text-[#C62840] dark:text-[#F87171] ml-0.5">*</span>}
                </label>
            )}

            {/* Trigger Button */}
            <div
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={handleKeyDown}
                onClick={() => {
                    if (!disabled) {
                        updatePlacement();
                        setIsOpen(!isOpen);
                    }
                }}
                className={`w-full h-11 sm:h-12 px-3.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                    error
                        ? 'border-[#C62840] dark:border-[#EF4444] focus:border-[#C62840] ring-2 ring-[#C62840]/20'
                        : isOpen
                        ? 'border-[#0060F4] dark:border-[#38BDF8] ring-2 ring-[#0060F4]/20 shadow-xs'
                        : 'border-[#DCEAF8] dark:border-[#1E3A5F] hover:border-[#0060F4]/50 dark:hover:border-[#38BDF8]/50'
                } ${
                    disabled
                        ? 'bg-[#F0F8FF]/60 dark:bg-[#071322]/60 text-[#8C9BB9] dark:text-[#64748B] cursor-not-allowed border-[#DCEAF8] dark:border-[#1E3A5F]'
                        : 'bg-white dark:bg-[#0C1D36] text-[#0B1F63] dark:text-[#F1F5F9]'
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {selectedOption?.icon && (
                        <span className="flex-shrink-0 text-base">{selectedOption.icon}</span>
                    )}

                    <div className="truncate">
                        {selectedOption ? (
                            <div className="flex items-center gap-2 truncate">
                                <span className="text-xs sm:text-sm font-semibold truncate text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {selectedOption.label}
                                </span>
                                {selectedOption.badge && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#38BDF8] border border-[#DCEAF8] dark:border-[#1E3A5F] flex-shrink-0">
                                        {selectedOption.badge}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs sm:text-sm text-[#8C9BB9] dark:text-[#64748B]">{placeholder}</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 text-[#52658E] dark:text-[#94A3B8]">
                    {clearable && selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded-full text-[#8C9BB9] dark:text-[#64748B] hover:text-[#0B1F63] dark:hover:text-[#F1F5F9] hover:bg-[#F0F8FF] dark:hover:bg-[#1E3A5F] transition"
                            aria-label="Kosongkan pilihan"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}

                    <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-[#0060F4] dark:text-[#38BDF8]' : 'text-[#52658E] dark:text-[#94A3B8]'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Dropdown Floating Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: placement === 'bottom' ? -8 : 8,
                            scale: 0.98,
                        }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{
                            opacity: 0,
                            y: placement === 'bottom' ? -8 : 8,
                            scale: 0.98,
                        }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className={`absolute left-0 right-0 z-50 bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-2xl shadow-[0_16px_40px_rgba(8,40,112,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden ${
                            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                        }`}
                    >
                        {/* Search Input Container */}
                        <div className="p-2.5 border-b border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F0F8FF]/60 dark:bg-[#071322]/60">
                            <div className="relative flex items-center">
                                <svg
                                    className="w-4 h-4 text-[#52658E] dark:text-[#94A3B8] absolute left-3 pointer-events-none"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <circle cx="11" cy="11" r="7" strokeWidth="2" />
                                    <path strokeWidth="2" strokeLinecap="round" d="M16 16l4 4" />
                                </svg>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setHighlightedIndex(0);
                                    }}
                                    placeholder={searchPlaceholder}
                                    className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#071322] text-[#0B1F63] dark:text-[#F1F5F9] placeholder-[#8C9BB9] dark:placeholder-[#64748B] focus:outline-none focus:border-[#0060F4] dark:focus:border-[#38BDF8] focus:ring-1 focus:ring-[#0060F4] dark:focus:ring-[#38BDF8] transition"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setHighlightedIndex(0);
                                            searchInputRef.current?.focus();
                                        }}
                                        className="absolute right-2.5 p-1 rounded-full text-[#8C9BB9] dark:text-[#64748B] hover:text-[#0B1F63] dark:hover:text-[#F1F5F9] hover:bg-[#F0F8FF] dark:hover:bg-[#1E3A5F] transition"
                                        aria-label="Hapus pencarian"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Options List */}
                        <ul
                            ref={listRef}
                            role="listbox"
                            className="max-h-60 overflow-y-auto py-1 divide-y divide-[#DCEAF8]/30 dark:divide-[#1E3A5F]/40 overscroll-contain"
                        >
                            {filteredOptions.length === 0 ? (
                                <li className="py-7 px-4 text-center space-y-1">
                                    <div className="w-8 h-8 mx-auto rounded-full bg-[#F0F8FF] dark:bg-[#071322] text-[#52658E] dark:text-[#94A3B8] flex items-center justify-center text-sm border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                        🔍
                                    </div>
                                    <span className="text-xs text-[#52658E] dark:text-[#94A3B8] font-medium block">
                                        {emptyMessage}
                                    </span>
                                </li>
                            ) : (
                                filteredOptions.map((opt, idx) => {
                                    const isSelected = opt.value === value;
                                    const isHighlighted = idx === highlightedIndex;

                                    return (
                                        <li
                                            key={String(opt.value)}
                                            ref={(el) => {
                                                itemRefs.current[idx] = el;
                                            }}
                                            role="option"
                                            aria-selected={isSelected}
                                            onClick={() => !opt.disabled && handleSelect(opt.value)}
                                            onMouseEnter={() => setHighlightedIndex(idx)}
                                            className={`px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors select-none ${
                                                opt.disabled
                                                    ? 'opacity-40 cursor-not-allowed'
                                                    : 'cursor-pointer'
                                            } ${
                                                isSelected
                                                    ? 'bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#38BDF8] font-bold border-l-[3px] border-[#0060F4] dark:border-[#38BDF8]'
                                                    : isHighlighted
                                                    ? 'bg-[#F0F8FF] dark:bg-[#132847] text-[#0B1F63] dark:text-[#F1F5F9]'
                                                    : 'text-[#0B1F63] dark:text-[#F1F5F9] hover:bg-[#F0F8FF]/60 dark:hover:bg-[#132847]/60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                {opt.icon && (
                                                    <span className="text-base flex-shrink-0">{opt.icon}</span>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold truncate text-[#0B1F63] dark:text-[#F1F5F9]">
                                                        {opt.label}
                                                    </div>
                                                    {opt.description && (
                                                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] truncate">
                                                            {opt.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {opt.badge && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#38BDF8] border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                                        {opt.badge}
                                                    </span>
                                                )}
                                                {isSelected && (
                                                    <svg
                                                        className="w-4 h-4 text-[#0060F4] dark:text-[#38BDF8]"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2.5}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>

            {error ? (
                <p className="text-[11px] text-[#C62840] dark:text-[#F87171] font-semibold flex items-center gap-1">
                    <span>⚠</span>
                    <span>{error}</span>
                </p>
            ) : helperText ? (
                <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">{helperText}</p>
            ) : null}
        </div>
    );
}
