import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 ' +
                      'dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ' +
                      'focus:border-indigo-700 focus:bg-indigo-100 focus:text-indigo-800'
                    : 'border-transparent text-gray-600 dark:text-[#94A3B8] ' +
                      'hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 ' +
                      'dark:hover:bg-[#132847] hover:text-gray-800 dark:hover:text-[#F1F5F9] ' +
                      'focus:border-gray-300 focus:bg-gray-50 focus:text-gray-800'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
