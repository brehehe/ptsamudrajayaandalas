import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

export interface ThemeToggleProps {
    variant?: 'icon' | 'pill' | 'compact';
    className?: string;
    showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
    variant = 'icon',
    className = '',
    showLabel = false,
}) => {
    const { isDark, toggleTheme } = useTheme();
    const shouldReduceMotion = useReducedMotion();

    if (variant === 'pill') {
        return (
            <button
                type="button"
                onClick={toggleTheme}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                    isDark
                        ? 'bg-[#0F223D] border-[#1E3A5F] text-[#F1F5F9] hover:bg-[#152E52]'
                        : 'bg-white border-[#DCEAF8] text-[#0B1F63] hover:bg-[#F0F8FF]'
                } ${className}`}
                aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
                aria-pressed={isDark}
                title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
                <motion.div
                    key={isDark ? 'dark' : 'light'}
                    initial={shouldReduceMotion ? false : { rotate: -90, scale: 0.8, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                    className="flex items-center justify-center text-[#F5A623] dark:text-[#38BDF8]"
                    aria-hidden="true"
                >
                    {!isDark ? (
                        // Moon Icon
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path
                                d={
                                    'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75' +
                                    '-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.63' +
                                    '5 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z'
                                }
                            />
                        </svg>
                    ) : (
                        // Sun Icon
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <circle cx="12" cy="12" r="4" fill="#F5A623" stroke="none" />
                            <path
                                strokeLinecap="round"
                                d={
                                    'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 1' +
                                    '2h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41'
                                }
                            />
                        </svg>
                    )}
                </motion.div>
                <span>{isDark ? 'Mode terang' : 'Mode gelap'}</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${
                isDark
                    ? 'text-[#F1F5F9] hover:bg-[#152E52] hover:text-[#38BDF8] active:bg-[#1E3A5F]'
                    : 'text-[#52658E] hover:text-[#0060F4] hover:bg-[#F0F8FF] active:bg-[#E0F0FF]'
            } ${className}`}
            aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            aria-pressed={isDark}
            title={
                isDark ? 'Beralih ke Mode Terang (Light Mode)' : 'Beralih ke Mode Gelap (Dark Mode)'
            }
        >
            <motion.div
                key={isDark ? 'dark-icon' : 'light-icon'}
                initial={shouldReduceMotion ? false : { rotate: -60, scale: 0.7, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                className="flex items-center justify-center"
                aria-hidden="true"
            >
                {!isDark ? (
                    // Maritime Moon / Night Sky
                    <svg
                        className="w-5 h-5 text-[#38BDF8]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                    </svg>
                ) : (
                    // Harbor Sun / Daylight
                    <svg
                        className="w-5 h-5 text-[#E68A00]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                    >
                        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={2} />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={
                                'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m' +
                                '16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41'
                            }
                        />
                    </svg>
                )}
            </motion.div>

            {showLabel && (
                <span className="text-xs font-semibold ml-2">
                    {isDark ? 'Mode terang' : 'Mode gelap'}
                </span>
            )}
        </button>
    );
};

export default ThemeToggle;
