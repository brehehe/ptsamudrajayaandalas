import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl border border-transparent bg-[#0060F4] px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#071322] active:bg-[#082870] ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
