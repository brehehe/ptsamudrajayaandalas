import React, { forwardRef, TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    helperText?: string;
    error?: string;
    maxLength?: number;
    showCharCount?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        {
            label,
            helperText,
            error,
            maxLength,
            showCharCount = false,
            className = '',
            id,
            required,
            disabled,
            value = '',
            rows = 3,
            ...props
        },
        ref
    ) => {
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
        const charCount = String(value).length;

        return (
            <div className="w-full space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                    {label && (
                        <label
                            htmlFor={inputId}
                            className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] select-none"
                        >
                            {label}
                            {required && <span className="text-[#C62840] dark:text-[#F87171] ml-0.5">*</span>}
                        </label>
                    )}

                    {showCharCount && maxLength && (
                        <span className="text-[10px] text-[#8C9BB9] dark:text-[#64748B]">
                            {charCount}/{maxLength}
                        </span>
                    )}
                </div>

                <textarea
                    ref={ref}
                    id={inputId}
                    disabled={disabled}
                    required={required}
                    value={value}
                    rows={rows}
                    maxLength={maxLength}
                    className={`w-full bg-white dark:bg-[#0C1D36] text-[#0B1F63] dark:text-[#F1F5F9] text-xs sm:text-sm p-3.5 rounded-xl border font-normal placeholder-[#8C9BB9] dark:placeholder-[#64748B] transition-all outline-none resize-y ${
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

Textarea.displayName = 'Textarea';

export default Textarea;
