import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-gray-300 dark:border-[#1E3A5F] dark:bg-[#0C1D36] text-indigo-600 shadow-sm focus:ring-indigo-500 dark:focus:ring-offset-[#071322] ' +
                className
            }
        />
    );
}
