import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
    value: number | string;
    onChange: (value: number) => void;
    label?: string;
    helperText?: string;
    error?: string;
    currencySymbol?: string;
    sizeVariant?: 'sm' | 'md' | 'lg';
}

const formatRupiah = (val: number | string): string => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) return '';
    return new Intl.NumberFormat('id-ID').format(Number(val));
};

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
    (
        {
            value,
            onChange,
            label,
            helperText,
            error,
            currencySymbol = 'Rp',
            sizeVariant = 'md',
            className = '',
            id,
            required,
            disabled,
            ...props
        },
        ref
    ) => {
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        const sizeStyles = {
            sm: 'h-9 text-xs pl-10 pr-3 rounded-lg',
            md: 'h-11 sm:h-12 text-xs sm:text-sm pl-12 pr-3.5 rounded-xl',
            lg: 'h-13 text-sm sm:text-base pl-14 pr-4 rounded-xl',
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const rawDigits = e.target.value.replace(/\D/g, '');
            const num = rawDigits ? parseInt(rawDigits, 10) : 0;
            onChange(num);
        };

        return (
            <div className="w-full space-y-1.5 text-left">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] select-none"
                    >
                        {label}
                        {required && <span className="text-[#C62840] dark:text-[#F87171] ml-0.5">*</span>}
                    </label>
                )}

                <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-[#52658E] dark:text-[#94A3B8] select-none pointer-events-none">
                        {currencySymbol}
                    </span>

                    <input
                        ref={ref}
                        id={inputId}
                        type="text"
                        inputMode="numeric"
                        disabled={disabled}
                        required={required}
                        value={formatRupiah(value)}
                        onChange={handleChange}
                        className={`w-full bg-white dark:bg-[#0C1D36] text-[#0B1F63] dark:text-[#F1F5F9] font-semibold tracking-wide border placeholder-[#8C9BB9] dark:placeholder-[#64748B] transition-all outline-none ${
                            sizeStyles[sizeVariant]
                        } ${
                            error
                                ? 'border-[#C62840] dark:border-[#EF4444] focus:border-[#C62840] dark:focus:border-[#EF4444] focus:ring-2 focus:ring-[#C62840]/20 dark:focus:ring-[#EF4444]/20'
                                : 'border-[#DCEAF8] dark:border-[#1E3A5F] focus:border-[#0060F4] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#0060F4]/20 dark:focus:ring-[#38BDF8]/20'
                        } ${
                            disabled
                                ? 'bg-[#F0F8FF]/60 dark:bg-[#071322]/60 text-[#8C9BB9] dark:text-[#64748B] border-[#DCEAF8] dark:border-[#1E3A5F] cursor-not-allowed select-none'
                                : 'hover:border-[#0060F4]/50 dark:hover:border-[#38BDF8]/50'
                        } ${className}`}
                        {...props}
                    />
                </div>

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
);

MoneyInput.displayName = 'MoneyInput';

export default MoneyInput;
