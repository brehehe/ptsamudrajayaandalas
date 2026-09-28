import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    name?: string;
    id?: string;
    className?: string;
}

export default function Toggle({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    size = 'md',
    name,
    id,
    className = '',
}: ToggleProps) {
    const toggleId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const sizeConfig = {
        sm: {
            track: 'w-8 h-4.5 p-0.5',
            thumb: 'w-3.5 h-3.5',
            translate: 14,
        },
        md: {
            track: 'w-11 h-6 p-1',
            thumb: 'w-4 h-4',
            translate: 20,
        },
        lg: {
            track: 'w-14 h-7.5 p-1',
            thumb: 'w-5.5 h-5.5',
            translate: 26,
        },
    };

    const currentSize = sizeConfig[size];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!disabled) onChange(!checked);
        }
    };

    return (
        <div className={`flex items-start gap-3 select-none ${className}`}>
            <button
                type="button"
                id={toggleId}
                name={name}
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                onKeyDown={handleKeyDown}
                className={`relative inline-flex items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-offset-2 flex-shrink-0 ${
                    currentSize.track
                } ${
                    checked ? 'bg-[#0060F4] dark:bg-[#38BDF8]' : 'bg-[#DCEAF8] dark:bg-[#1E3A5F]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <motion.span
                    animate={{
                        x: checked ? currentSize.translate : 0,
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                    }}
                    className={`inline-block rounded-full bg-white shadow-sm pointer-events-none ${currentSize.thumb}`}
                />
            </button>

            {(label || description) && (
                <div
                    className={`space-y-0.5 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    onClick={() => !disabled && onChange(!checked)}
                >
                    {label && (
                        <span className="text-xs sm:text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9] block leading-tight">
                            {label}
                        </span>
                    )}
                    {description && (
                        <span className="text-xs text-[#52658E] dark:text-[#94A3B8] block">
                            {description}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
