import React, { ReactNode } from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    children?: ReactNode;
    title?: ReactNode;
    subtitle?: ReactNode;
    header?: ReactNode;
    actions?: ReactNode;
    footer?: ReactNode;
    variant?: 'default' | 'flat' | 'maritime-dark' | 'interactive';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hoverable?: boolean;
    overflow?: 'hidden' | 'visible' | 'auto';
    className?: string;
}

export const Card: React.FC<CardProps> = ({
    children,
    title,
    subtitle,
    header,
    actions,
    footer,
    variant = 'default',
    padding = 'none', // Default none to preserve backwards compatibility with p-4 classes in parents
    hoverable = false,
    overflow = 'visible',
    className = '',
    ...props
}) => {
    const variantStyles = {
        default:
            'bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-[0_2px_12px_rgba(8,40,112,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] text-[#0B1F63] dark:text-[#F1F5F9]',
        flat: 'bg-[#F0F8FF]/60 dark:bg-[#071322]/70 border border-[#DCEAF8] dark:border-[#1E3A5F] text-[#0B1F63] dark:text-[#F1F5F9]',
        'maritime-dark':
            'bg-[#0D2945] dark:bg-[#06101D] border border-[#173B5C] dark:border-[#1E3A5F] text-[#E7F0FA] shadow-md',
        interactive:
            'bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs hover:border-[#0060F4]/40 dark:hover:border-[#38BDF8]/50 hover:shadow-md cursor-pointer text-[#0B1F63] dark:text-[#F1F5F9] active:scale-[0.995]',
    };

    const paddingStyles = {
        none: '',
        sm: 'p-3 sm:p-3.5',
        md: 'p-4 sm:p-5',
        lg: 'p-6 sm:p-7',
    };

    const overflowStyles = {
        visible: 'overflow-visible',
        hidden: 'overflow-hidden',
        auto: 'overflow-auto',
    };

    const hasHeader = header || title || subtitle || actions;

    return (
        <div
            className={`rounded-[16px] transition-all duration-200 ${
                overflowStyles[overflow]
            } ${variantStyles[variant]} ${paddingStyles[padding]} ${
                hoverable && variant !== 'interactive'
                    ? 'hover:shadow-[0_4px_20px_rgba(8,40,112,0.08)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)] hover:border-[#0060F4]/40 dark:hover:border-[#38BDF8]/50'
                    : ''
            } ${className}`}
            {...props}
        >
            {hasHeader && (
                <div className="px-5 py-4 border-b border-[#DCEAF8]/80 dark:border-[#1E3A5F]/80 flex items-center justify-between gap-3 bg-white/50 dark:bg-[#071322]/40 rounded-t-[16px]">
                    {header ? (
                        header
                    ) : (
                        <div>
                            {title && (
                                <h3 className="text-sm sm:text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] leading-snug">
                                    {title}
                                </h3>
                            )}
                            {subtitle && (
                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    )}

                    {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
                </div>
            )}

            {children}

            {footer && (
                <div className="px-5 py-3 border-t border-[#DCEAF8]/80 dark:border-[#1E3A5F]/80 bg-[#F0F8FF]/40 dark:bg-[#071322]/30 flex items-center justify-between gap-3 rounded-b-[16px]">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default Card;
