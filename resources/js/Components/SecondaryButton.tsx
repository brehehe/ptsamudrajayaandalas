import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl border border-[#DCEAF8] bg-white px-3.5 py-2 text-sm font-semibold text-[#0B1F63] shadow-sm transition-colors duration-150 hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 focus-visible:ring-offset-2 dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9] dark:hover:bg-[#132847] dark:focus-visible:ring-offset-[#071322] disabled:opacity-25 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
