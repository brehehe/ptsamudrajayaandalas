import React from 'react';

interface LogoProps {
    className?: string;
    variant?: 'full' | 'icon' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ className = '', variant = 'full' }) => {
    const isDark = variant === 'dark';

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Maritime Crest Emblem */}
            <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 44 44" fill="none" className="w-full h-full drop-shadow-sm">
                    {/* Golden Sun / Horizon ring */}
                    <circle cx="22" cy="18" r="10" stroke="#F5A623" strokeWidth="2" strokeDasharray="3 2" fill="#FFF9E6" />
                    <circle cx="22" cy="18" r="5" fill="#F5A623" />
                    
                    {/* Ocean waves / Chevron maritime hull */}
                    <path
                        d="M6 26L22 17L38 26L22 34L6 26Z"
                        fill="#0060F4"
                    />
                    <path
                        d="M10 30L22 23L34 30L22 37L10 30Z"
                        fill="#19B5F7"
                    />
                    <path
                        d="M14 34L22 29L30 34L22 40L14 34Z"
                        fill="#082870"
                    />
                </svg>
            </div>

            {variant !== 'icon' && (
                <div className="flex flex-col leading-tight">
                    <span
                        className={`font-bold tracking-tight text-[15px] sm:text-[16px] uppercase ${
                            isDark ? 'text-white' : 'text-[#0B1F63] dark:text-white'
                        }`}
                    >
                        PT. Samudra Jaya Andalas
                    </span>
                    <span
                        className={`text-[11px] sm:text-[12px] font-medium tracking-wide ${
                            isDark ? 'text-[#B5C8DC]' : 'text-[#52658E] dark:text-[#94A3B8]'
                        }`}
                    >
                        Ship Agency Management System
                    </span>
                </div>
            )}
        </div>
    );
};

export default Logo;
