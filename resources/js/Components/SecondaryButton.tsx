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
                `inline-flex items-center rounded-md border border-gray-300 dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 dark:text-[#F1F5F9] shadow-sm transition duration-150 ease-in-out hover:bg-gray-50 dark:hover:bg-[#132847] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-[#071322] disabled:opacity-25 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
