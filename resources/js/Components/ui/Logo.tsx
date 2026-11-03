import React from 'react';

interface LogoProps {
    className?: string;
    variant?: 'full' | 'icon' | 'dark';
}

export const MaritimeCrestIcon: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
    <img
        src="/images/sja-logo.png"
        alt="Logo PT Samudra Jaya Andalas"
        className={`object-contain drop-shadow-sm ${className}`}
        loading="eager"
    />
);

export const Logo: React.FC<LogoProps> = ({ className = '', variant = 'full' }) => {
    const isDark = variant === 'dark';

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Maritime Crest Emblem */}
            <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
                <MaritimeCrestIcon />
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
