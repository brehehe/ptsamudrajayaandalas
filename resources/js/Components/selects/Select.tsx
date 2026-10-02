import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { CircleAlert } from 'lucide-react';

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    options: SelectOption[];
    label?: string;
    helperText?: string;
    error?: string;
    placeholder?: string;
    sizeVariant?: 'sm' | 'md' | 'lg';
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            options,
            label,
            helperText,
            error,
            placeholder,
            sizeVariant = 'md',
            className = '',
            id,
            required,
            disabled,
            value,
            ...props
        },
        ref
    ) => {
        const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
        const helperId = selectId ? `${selectId}-helper` : undefined;
        const errorId = selectId ? `${selectId}-error` : undefined;

        const sizeStyles = {
            sm: 'h-9 text-xs pl-3 pr-8 rounded-lg',
            md: 'h-11 sm:h-12 text-xs sm:text-sm pl-3.5 pr-10 rounded-xl',
            lg: 'h-13 text-sm sm:text-base pl-4 pr-11 rounded-xl',
        };

        return (
            <div className="w-full space-y-1.5 text-left">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] select-none"
                    >
                        {label}
                        {required && (
                            <span className="text-[#C62840] dark:text-[#F87171] ml-0.5">*</span>
                        )}
                    </label>
                )}

                <div className="relative flex items-center">
                    <select
                        ref={ref}
                        id={selectId}
                        disabled={disabled}
                        required={required}
                        value={value}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : helperText ? helperId : undefined}
                        className={`w-full bg-white dark:bg-[#0C1D36] text-[#0B1F63] dark:text-[#F1F5F9] font-normal border appearance-none transition-colors outline-none cursor-pointer ${
                            sizeStyles[sizeVariant]
                        } ${
                            error
                                ? 'border-[#C62840] dark:border-[#EF4444] ' +
                                  'focus:border-[#C62840] dark:focus:border-[#EF4444] ' +
                                  'focus:ring-2 focus:ring-[#C62840]/20 ' +
                                  'dark:focus:ring-[#EF4444]/20'
                                : 'border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                  'focus:border-[#0060F4] dark:focus:border-[#38BDF8] ' +
                                  'focus:ring-2 focus:ring-[#0060F4]/20 ' +
                                  'dark:focus:ring-[#38BDF8]/20'
                        } ${
                            disabled
                                ? 'bg-[#F0F8FF]/60 dark:bg-[#071322]/60 text-[#8C9BB9] ' +
                                  'dark:text-[#64748B] border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                  'cursor-not-allowed select-none'
                                : 'hover:border-[#0060F4]/50 dark:hover:border-[#38BDF8]/50'
                        } ${className}`}
                        {...props}
                    >
                        {placeholder && (
                            <option
                                value=""
                                disabled
                                className="text-[#8C9BB9] dark:text-[#64748B]"
                            >
                                {placeholder}
                            </option>
                        )}
                        {options.map((opt) => (
                            <option
                                key={String(opt.value)}
                                value={opt.value}
                                disabled={opt.disabled}
                                className="text-[#0B1F63] dark:text-[#F1F5F9] dark:bg-[#0C1D36] py-1"
                            >
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    <div className="absolute right-3.5 pointer-events-none text-[#52658E] dark:text-[#94A3B8]">
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>
                </div>

                {error ? (
                    <p id={errorId} role="alert" className="text-[11px] text-[#C62840] dark:text-[#F87171] font-semibold flex items-center gap-1">
                        <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                        <span>{error}</span>
                    </p>
                ) : helperText ? (
                    <p id={helperId} className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
