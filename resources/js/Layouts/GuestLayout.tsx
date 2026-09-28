import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-gray-100 dark:bg-[#071322] pt-6 sm:justify-center sm:pt-0 text-[#0B1F63] dark:text-[#F1F5F9] transition-colors duration-200">
            <div>
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-gray-500 dark:text-gray-300" />
                </Link>
            </div>

            <div className="mt-6 w-full overflow-hidden bg-white dark:bg-[#0C1D36] border border-transparent dark:border-[#1E3A5F] px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg">
                {children}
            </div>
        </div>
    );
}
