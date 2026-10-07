import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
} from '@headlessui/react';
import { Check, ChevronsUpDown, CircleAlert, LoaderCircle, Search, X } from 'lucide-react';
import React, { ReactNode, useId, useMemo, useState } from 'react';

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
    id?: string;
    name?: string;
    label?: string;
    action?: ReactNode;
    placeholder?: string;
    searchPlaceholder?: string;
    helperText?: string;
    error?: string;
    disabled?: boolean;
    loading?: boolean;
    clearable?: boolean;
    required?: boolean;
    emptyMessage?: string;
    className?: string;
}

export default function SelectSearch({
    options,
    value,
    onChange,
    id,
    name,
    label,
    action,
    placeholder = 'Pilih opsi…',
    searchPlaceholder = 'Ketik untuk mencari…',
    helperText,
    error,
    disabled = false,
    loading = false,
    clearable = true,
    required = false,
    emptyMessage = 'Tidak ada hasil yang cocok.',
    className = '',
}: SelectSearchProps) {
    const generatedId = useId();
    const inputId = id || `select-search-${generatedId}`;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const [query, setQuery] = useState('');

    const selectedOption = useMemo(
        () => options.find((option) => String(option.value) === String(value)) ?? null,
        [options, value],
    );
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');

        if (!normalizedQuery) {
            return options;
        }

        return options.filter((option) =>
            [option.label, option.description, option.badge]
                .filter(Boolean)
                .some((content) => content?.toLocaleLowerCase('id-ID').includes(normalizedQuery)),
        );
    }, [options, query]);

    return (
        <Combobox
            value={selectedOption}
            onChange={(option: SelectSearchOption | null) => onChange(option?.value ?? '')}
            onClose={() => setQuery('')}
            disabled={disabled || loading}
            invalid={Boolean(error)}
            immediate
        >
            {({ open }) => (
                <div className={`relative w-full space-y-1.5 text-left ${open ? 'z-50' : 'z-10'} ${className}`}>
                    {(label || action) && (
                        <div className="flex items-center justify-between gap-2">
                            {label ? (
                                <label htmlFor={inputId} className="block select-none text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {label}
                                    {required && <span className="ml-0.5 text-[#C62840] dark:text-[#F87171]">*</span>}
                                </label>
                            ) : <span />}
                            {action}
                        </div>
                    )}

                    <div
                        className={`group flex h-11 w-full items-center gap-2 rounded-xl border bg-white px-3 transition-[border-color,box-shadow] focus-within:border-[#0060F4] focus-within:ring-2 focus-within:ring-[#0060F4]/20 motion-reduce:transition-none dark:bg-[#0C1D36] ${
                            error
                                ? 'border-[#C62840] ring-2 ring-[#C62840]/15 dark:border-[#EF4444]'
                                : 'border-[#DCEAF8] hover:border-[#0060F4]/50 dark:border-[#1E3A5F] dark:hover:border-[#38BDF8]/50'
                        } ${disabled || loading ? 'cursor-not-allowed bg-[#F0F8FF]/60 opacity-70 dark:bg-[#071322]/60' : ''}`}
                    >
                        {selectedOption?.icon && (
                            <span aria-hidden="true" className="shrink-0 text-[#52658E] dark:text-[#94A3B8]">
                                {selectedOption.icon}
                            </span>
                        )}

                        <ComboboxInput
                            id={inputId}
                            name={name}
                            autoComplete="off"
                            required={required}
                            aria-required={required || undefined}
                            aria-describedby={error ? errorId : helperText ? helperId : undefined}
                            displayValue={(option: SelectSearchOption | null) => option?.label ?? ''}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={open ? searchPlaceholder : placeholder}
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-[#0B1F63] outline-none placeholder:text-[#8C9BB9] focus:ring-0 disabled:cursor-not-allowed dark:text-[#F1F5F9] dark:placeholder:text-[#64748B]"
                        />

                        <div className="flex shrink-0 items-center gap-1 text-[#52658E] dark:text-[#94A3B8]">
                            {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
                            {clearable && selectedOption && !disabled && !loading && (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onChange('');
                                        setQuery('');
                                    }}
                                    className="flex size-8 items-center justify-center rounded-lg text-[#8C9BB9] transition-colors hover:bg-[#F0F8FF] hover:text-[#0B1F63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] motion-reduce:transition-none dark:text-[#64748B] dark:hover:bg-[#1E3A5F] dark:hover:text-[#F1F5F9]"
                                    aria-label={`Kosongkan ${label || 'pilihan'}`}
                                >
                                    <X aria-hidden="true" className="size-4" />
                                </button>
                            )}
                            <ComboboxButton
                                className="flex size-8 items-center justify-center rounded-lg hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:hover:bg-[#1E3A5F]"
                                aria-label={`Buka pilihan ${label || ''}`.trim()}
                            >
                                {open ? <Search aria-hidden="true" className="size-4" /> : <ChevronsUpDown aria-hidden="true" className="size-4" />}
                            </ComboboxButton>
                        </div>
                    </div>

                    <ComboboxOptions
                        anchor={{ to: 'bottom start', gap: 6, padding: 16 }}
                        transition
                        className="z-50 max-h-72 w-[var(--input-width)] origin-top overflow-y-auto rounded-2xl border border-[#DCEAF8] bg-white p-1 shadow-lg transition duration-150 ease-out [--anchor-max-height:18rem] empty:invisible data-closed:scale-95 data-closed:opacity-0 motion-reduce:transition-none dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                    >
                        {loading ? (
                            <div role="status" className="flex items-center justify-center gap-2 px-4 py-7 text-sm text-[#52658E] dark:text-[#94A3B8]">
                                <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                                Memuat pilihan…
                            </div>
                        ) : filteredOptions.length === 0 ? (
                            <div className="px-4 py-7 text-center text-sm text-[#52658E] dark:text-[#94A3B8]">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <ComboboxOption
                                    key={String(option.value)}
                                    value={option}
                                    disabled={option.disabled}
                                    className="group/option flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#0B1F63] outline-none data-disabled:cursor-not-allowed data-disabled:opacity-45 data-focus:bg-[#F0F8FF] data-selected:bg-[#E0F0FF] data-selected:text-[#0060F4] dark:text-[#F1F5F9] dark:data-focus:bg-[#132847] dark:data-selected:bg-[#0060F4]/20 dark:data-selected:text-[#38BDF8]"
                                >
                                    {option.icon && (
                                        <span aria-hidden="true" className="shrink-0 text-[#52658E] group-data-selected/option:text-[#0060F4] dark:text-[#94A3B8]">
                                            {option.icon}
                                        </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold">{option.label}</span>
                                        {option.description && (
                                            <span className="mt-0.5 block truncate text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                {option.description}
                                            </span>
                                        )}
                                    </span>
                                    {option.badge && (
                                        <span className="shrink-0 rounded-full border border-[#DCEAF8] bg-white px-2 py-0.5 text-[10px] font-bold text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#38BDF8]">
                                            {option.badge}
                                        </span>
                                    )}
                                    <Check aria-hidden="true" className="invisible size-4 shrink-0 text-[#0060F4] group-data-selected/option:visible dark:text-[#38BDF8]" />
                                </ComboboxOption>
                            ))
                        )}
                    </ComboboxOptions>

                    {error ? (
                        <p id={errorId} role="alert" className="flex items-center gap-1 text-[11px] font-semibold text-[#C62840] dark:text-[#F87171]">
                            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                            <span>{error}</span>
                        </p>
                    ) : helperText ? (
                        <p id={helperId} className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                            {helperText}
                        </p>
                    ) : null}
                </div>
            )}
        </Combobox>
    );
}
