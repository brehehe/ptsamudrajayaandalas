import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    helperText?: string;
    error?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    clearable?: boolean;
    onClear?: () => void;
    sizeVariant?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            helperText,
            error,
            leftIcon,
            rightIcon,
            clearable,
            onClear,
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
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
        const helperId = inputId ? `${inputId}-helper` : undefined;
        const errorId = inputId ? `${inputId}-error` : undefined;

        const sizeStyles = {
            sm: 'h-9 text-xs px-3 rounded-lg',
            md: 'h-11 sm:h-12 text-xs sm:text-sm px-3.5 rounded-xl',
            lg: 'h-13 text-sm sm:text-base px-4 rounded-xl',
        };

        const hasValue = value !== undefined && value !== null && String(value).length > 0;

        return (
            <div className="w-full space-y-1.5 text-left">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] select-none"
                    >
                        {label}
                        {required && (
                            <span className="text-[#C62840] dark:text-[#F87171] ml-0.5">*</span>
                        )}
                    </label>
                )}

                <div className="relative flex items-center">
                    {leftIcon && (
                        <div
                            className={
                                'absolute left-3.5 flex items-center pointer-events-none ' +
                                'text-[#52658E] dark:text-[#94A3B8]'
                            }
                        >
                            {leftIcon}
                        </div>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        disabled={disabled}
                        required={required}
                        value={value}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : helperText ? helperId : undefined}
                        className={`w-full bg-white dark:bg-[#0C1D36] text-[#0B1F63] dark:text-[#F1F5F9] border font-normal placeholder-[#8C9BB9] dark:placeholder-[#64748B] transition-colors outline-none ${
                            sizeStyles[sizeVariant]
                        } ${leftIcon ? 'pl-10' : ''} ${
                            rightIcon || (clearable && hasValue) ? 'pr-10' : ''
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
                    />

                    {clearable && hasValue && !disabled && (
                        <button
                            type="button"
                            onClick={onClear}
                            className={
                                'absolute right-3 p-1 rounded-full text-[#8C9BB9] ' +
                                'dark:text-[#64748B] hover:text-[#0B1F63] ' +
                                'dark:hover:text-[#F1F5F9] hover:bg-[#F0F8FF] ' +
                                'dark:hover:bg-[#1E3A5F] transition'
                            }
                            aria-label="Hapus teks"
                        >
                            <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    )}

                    {rightIcon && (!clearable || !hasValue) && (
                        <div
                            className={
                                'absolute right-3.5 flex items-center pointer-events-none ' +
                                'text-[#52658E] dark:text-[#94A3B8]'
                            }
                        >
                            {rightIcon}
                        </div>
                    )}
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

Input.displayName = 'Input';

export default Input;
