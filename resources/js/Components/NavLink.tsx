import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active: boolean }) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 ' +
                'transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-indigo-400 dark:border-indigo-500 text-gray-900 ' +
                      'dark:text-[#F1F5F9] focus:border-indigo-700 '
                    : 'border-transparent text-gray-500 dark:text-[#94A3B8] ' +
                      'hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 ' +
                      'dark:hover:text-[#F1F5F9] focus:border-gray-300 focus:text-gray-700 ') +
                className
            }
        >
            {children}
        </Link>
    );
}
