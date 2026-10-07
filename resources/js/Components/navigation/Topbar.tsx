import ThemeToggle from '@/Components/ui/ThemeToggle';
import { PageProps } from '@/types';
import { router, usePage } from '@inertiajs/react';

export const Topbar = () => {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;
    const initials = (user?.name || 'Pengguna')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#DCEAF8] bg-white px-5 shadow-[0_1px_3px_rgba(8,40,112,0.04)] transition-colors duration-200 dark:border-[#1E3A5F] dark:bg-[#071322] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] lg:px-7 xl:h-16">
            <p className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                Sistem Keagenan Kapal
            </p>

            <div className="flex items-center gap-3 lg:gap-4">
                <ThemeToggle />

                <div className="flex items-center gap-2.5 border-l border-[#DCEAF8] pl-3 dark:border-[#1E3A5F]">
                    <div
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E0F0FF] text-xs font-black text-[#0B1F63] ring-1 ring-[#C7DCF0] dark:bg-[#152E52] dark:text-[#E7F0FA] dark:ring-[#1E3A5F]"
                    >
                        {initials || 'PG'}
                    </div>
                    <div className="hidden flex-col text-left sm:flex">
                        <span className="text-xs font-bold leading-tight text-[#0B1F63] dark:text-[#F1F5F9] lg:text-sm">
                            {user?.name || 'Pengguna'}
                        </span>
                        <span className="mt-0.5 text-[11px] font-medium leading-tight text-[#52658E] dark:text-[#94A3B8]">
                            {user?.primary_role || 'Tanpa Role'}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        aria-label="Keluar dari sistem"
                        title="Keluar"
                        className="ml-1 rounded-md p-2 text-[#8C9BB9] transition-colors hover:bg-[#FFF0F2] hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#64748B] dark:hover:bg-[#3A1520] dark:hover:text-[#F87171]"
                    >
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
