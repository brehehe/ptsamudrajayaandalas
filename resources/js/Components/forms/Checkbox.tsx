import React, { forwardRef, InputHTMLAttributes, ReactNode, useEffect, useRef } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    indeterminate?: boolean;
    label?: ReactNode;
    description?: ReactNode;
    error?: string;
    helperText?: string;
    sizeVariant?: 'sm' | 'md';
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    (
        {
            checked,
            onChange,
            indeterminate = false,
            label,
            description,
            error,
            helperText,
            sizeVariant = 'md',
            disabled = false,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const innerRef = useRef<HTMLInputElement>(null);
        const resolvedRef = (ref || innerRef) as React.RefObject<HTMLInputElement>;

        useEffect(() => {
            if (resolvedRef.current) {
                resolvedRef.current.indeterminate = indeterminate;
            }
        }, [indeterminate, resolvedRef]);

        const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        const sizeStyles = {
            sm: 'w-4 h-4 rounded-md',
            md: 'w-5 h-5 rounded-lg',
        };

        return (
            <div className={`space-y-1 text-left ${className}`}>
                <label
                    htmlFor={checkboxId}
                    className={`inline-flex items-start gap-2.5 select-none ${
                        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                >
                    <div className="relative flex items-center mt-0.5">
                        <input
                            ref={resolvedRef}
                            id={checkboxId}
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={onChange}
                            className={`text-[#0060F4] border border-[#DCEAF8] dark:border-[#1E3A5F] focus:ring-2 focus:ring-[#0060F4]/25 focus:ring-offset-0 transition cursor-pointer ${
                                sizeStyles[sizeVariant]
                            } ${
                                error ? 'border-[#C62840] dark:border-[#EF4444]' : ''
                            } ${disabled ? 'bg-[#F0F8FF] dark:bg-[#071322]' : 'bg-white dark:bg-[#0C1D36]'}`}
                            {...props}
                        />
                    </div>

                    {(label || description) && (
                        <div className="space-y-0.5">
                            {label && (
                                <span className="text-xs sm:text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9] block leading-snug">
                                    {label}
                                </span>
                            )}
                            {description && (
                                <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block leading-normal">
                                    {description}
                                </p>
                            )}
                        </div>
                    )}
                </label>

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

Checkbox.displayName = 'Checkbox';

export default Checkbox;
