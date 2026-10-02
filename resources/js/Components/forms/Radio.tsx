import React, { ReactNode, useId } from 'react';
import { CircleAlert } from 'lucide-react';

export interface RadioOption {
    value: string;
    label: string;
    description?: string;
    badge?: string;
    icon?: ReactNode;
    disabled?: boolean;
}

export interface RadioGroupProps {
    name: string;
    options: RadioOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    helperText?: string;
    error?: string;
    layout?: 'vertical' | 'horizontal' | 'grid' | 'grid-2';
    variant?: 'classic' | 'card';
    required?: boolean;
    disabled?: boolean;
    className?: string;
    itemClassName?: string;
}

export default function RadioGroup({
    name,
    options,
    value,
    onChange,
    label,
    helperText,
    error,
    layout = 'vertical',
    variant = 'card',
    required = false,
    disabled = false,
    className = '',
    itemClassName = '',
}: RadioGroupProps) {
    const labelId = useId();
    const errorId = `${labelId}-error`;
    const layoutClasses = {
        vertical: 'flex flex-col space-y-2',
        horizontal: 'flex flex-row flex-wrap gap-2.5',
        grid: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
        'grid-2': 'grid grid-cols-2 gap-2.5 w-full',
    };

    return (
        <div className={`w-full space-y-2 text-left ${className}`}>
            {label && (
                <span
                    id={labelId}
                    className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] select-none"
                >
                    {label}
                    {required && (
                        <span aria-hidden="true" className="ml-0.5 text-[#C62840] dark:text-[#F87171]">
                            *
                        </span>
                    )}
                </span>
            )}

            <div
                className={layoutClasses[layout]}
                role="radiogroup"
                aria-labelledby={label ? labelId : undefined}
                aria-required={required || undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
            >
                {options.map((option) => {
                    const isChecked = value === option.value;
                    const isDisabled = disabled || option.disabled;
                    const optionId = `${name}-${option.value}`;

                    if (variant === 'classic') {
                        return (
                            <label
                                key={option.value}
                                htmlFor={optionId}
                                className={`inline-flex items-start gap-2.5 text-xs select-none ${
                                    isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                            >
                                <input
                                    type="radio"
                                    id={optionId}
                                    name={name}
                                    value={option.value}
                                    checked={isChecked}
                                    required={required}
                                    disabled={isDisabled}
                                    onChange={() => onChange(option.value)}
                                    className={
                                        'w-4 h-4 mt-0.5 text-[#0060F4] border-[#DCEAF8] ' +
                                        'dark:border-[#1E3A5F] focus:ring-[#0060F4] ' +
                                        'focus:ring-offset-0 transition'
                                    }
                                />
                                <div>
                                    <span className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9] block">
                                        {option.label}
                                    </span>
                                    {option.description && (
                                        <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block">
                                            {option.description}
                                        </span>
                                    )}
                                </div>
                            </label>
                        );
                    }

                    // Card Variant
                    const hasDescription = Boolean(option.description);
                    return (
                        <label
                            key={option.value}
                            htmlFor={optionId}
                            className={`p-3 sm:p-3.5 rounded-2xl border transition-colors duration-150 flex ${
                                hasDescription ? 'items-start' : 'items-center'
                            } gap-3 select-none ${
                                isDisabled
                                    ? 'opacity-40 cursor-not-allowed bg-[#F0F8FF]/30 ' +
                                      'dark:bg-[#071322]/30 border-[#DCEAF8] ' +
                                      'dark:border-[#1E3A5F]'
                                    : 'cursor-pointer'
                            } ${
                                isChecked
                                    ? 'bg-[#E0F0FF]/60 dark:bg-[#0060F4]/15 border-[#0060F4] ' +
                                      'dark:border-[#38BDF8] ring-1 ring-[#0060F4] ' +
                                      'dark:ring-[#38BDF8] shadow-xs'
                                    : 'bg-white dark:bg-[#0C1D36] border-[#DCEAF8] ' +
                                      'dark:border-[#1E3A5F] hover:border-[#0060F4]/40 ' +
                                      'dark:hover:border-[#38BDF8]/40 hover:bg-[#F0F8FF]/50 ' +
                                      'dark:hover:bg-[#132847]/50'
                            } ${itemClassName}`}
                        >
                            <input
                                type="radio"
                                id={optionId}
                                name={name}
                                value={option.value}
                                checked={isChecked}
                                required={required}
                                disabled={isDisabled}
                                onChange={() => onChange(option.value)}
                                className={`w-4 h-4 ${
                                    hasDescription ? 'mt-0.5' : ''
                                } text-[#0060F4] border-[#DCEAF8] dark:border-[#1E3A5F] focus:ring-[#0060F4] focus:ring-offset-0 transition flex-shrink-0`}
                            />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <div
                                        className={
                                            'flex items-center gap-1.5 font-bold text-xs ' +
                                            'sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9]'
                                        }
                                    >
                                        {option.icon && (
                                            <span className="text-sm">{option.icon}</span>
                                        )}
                                        <span>{option.label}</span>
                                    </div>
                                    {option.badge && (
                                        <span
                                            className={
                                                'text-[10px] font-bold px-2 py-0.5 rounded-full ' +
                                                'bg-white dark:bg-[#071322] text-[#0060F4] ' +
                                                'dark:text-[#38BDF8] border border-[#DCEAF8] ' +
                                                'dark:border-[#1E3A5F]'
                                            }
                                        >
                                            {option.badge}
                                        </span>
                                    )}
                                </div>
                                {option.description && (
                                    <p
                                        className={
                                            'text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-0.5 ' +
                                            'leading-relaxed'
                                        }
                                    >
                                        {option.description}
                                    </p>
                                )}
                            </div>
                        </label>
                    );
                })}
            </div>

            {error ? (
                <p id={errorId} role="alert" className="text-[11px] text-[#C62840] dark:text-[#F87171] font-semibold flex items-center gap-1">
                    <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                    <span>{error}</span>
                </p>
            ) : helperText ? (
                <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">{helperText}</p>
            ) : null}
        </div>
    );
}
