import { ButtonHTMLAttributes } from 'react';

export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl border border-transparent bg-[#C62840] px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#B01F35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C62840]/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#071322] active:bg-[#981B2D] ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
