import React from 'react';
import { Link } from '@inertiajs/react';

export interface PaginationLinkItem {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationProps {
    links?: PaginationLinkItem[];
    currentPage?: number;
    lastPage?: number;
    total?: number;
    from?: number;
    to?: number;
    perPage?: number;
    perPageOptions?: number[];
    onPageChange?: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
    className?: string;
}

const cleanLabel = (label: string): string => {
    if (label.includes('Previous') || label.includes('&laquo;')) return '← Sebelumnya';
    if (label.includes('Next') || label.includes('&raquo;')) return 'Berikutnya →';
    return label;
};

export default function Pagination({
    links,
    currentPage = 1,
    lastPage = 1,
    total,
    from,
    to,
    perPage = 10,
    perPageOptions = [10, 25, 50, 100],
    onPageChange,
    onPerPageChange,
    className = '',
}: PaginationProps) {
    // If we only have 1 page and no links, don't show pagination
    if ((!links || links.length <= 3) && lastPage <= 1) {
        return null;
    }

    return (
        <div
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-1 text-xs text-[#52658E] dark:text-[#94A3B8] ${className}`}
        >
            {/* Range and Total Counter */}
            <div className="flex items-center gap-3 justify-between sm:justify-start">
                <div>
                    {from !== undefined && to !== undefined && total !== undefined ? (
                        <span>
                            Menampilkan{' '}
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {from}
                            </span>
                            –
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {to}
                            </span>{' '}
                            dari{' '}
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {total}
                            </span>{' '}
                            data
                        </span>
                    ) : (
                        <span>
                            Halaman{' '}
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {currentPage}
                            </span>{' '}
                            dari{' '}
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {lastPage}
                            </span>
                        </span>
                    )}
                </div>

                {/* Per Page Selector */}
                {onPerPageChange && (
                    <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[11px] text-[#8C9BB9] dark:text-[#64748B]">
                            Baris:
                        </span>
                        <select
                            value={perPage}
                            onChange={(e) => onPerPageChange(Number(e.target.value))}
                            className={
                                'text-xs py-1 px-2 rounded-lg border border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] ' +
                                'text-[#0B1F63] dark:text-[#F1F5F9] focus:border-[#0060F4] ' +
                                'dark:focus:border-[#38BDF8] focus:ring-1 focus:ring-[#0060F4] ' +
                                'dark:focus:ring-[#38BDF8]'
                            }
                            aria-label="Jumlah baris per halaman"
                        >
                            {perPageOptions.map((opt) => (
                                <option
                                    key={opt}
                                    value={opt}
                                    className="dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                                >
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            <nav
                className="flex items-center gap-1 self-center sm:self-auto"
                aria-label="Navigasi Halaman"
            >
                {links && links.length > 0 ? (
                    // Inertia links mode
                    links.map((link, idx) => {
                        const cleaned = cleanLabel(link.label);
                        const isPrevOrNext = cleaned.includes('←') || cleaned.includes('→');

                        if (!link.url) {
                            return (
                                <span
                                    key={`link-disabled-${idx}`}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#8C9BB9] dark:text-[#64748B] border border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60 bg-[#F0F8FF]/40 dark:bg-[#071322]/40 cursor-not-allowed select-none ${
                                        isPrevOrNext ? 'text-[11px]' : ''
                                    }`}
                                >
                                    {cleaned}
                                </span>
                            );
                        }

                        return (
                            <Link
                                key={`link-${idx}`}
                                href={link.url}
                                preserveScroll
                                preserveState
                                aria-current={link.active ? 'page' : undefined}
                                className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2.5 py-1.5 rounded-xl text-xs font-bold transition-[color,background-color,border-color,box-shadow,transform] motion-reduce:transition-none ${
                                    link.active
                                        ? 'bg-[#0060F4] text-white shadow-xs border border-[#0060F4]'
                                        : 'bg-white dark:bg-[#0C1D36] text-[#0B1F63] ' +
                                          'dark:text-[#F1F5F9] border border-[#DCEAF8] ' +
                                          'dark:border-[#1E3A5F] hover:bg-[#F0F8FF] ' +
                                          'dark:hover:bg-[#132847] hover:border-[#0060F4]/40 ' +
                                          'dark:hover:border-[#38BDF8]/40 active:scale-95'
                                } ${isPrevOrNext ? 'text-[11px]' : ''}`}
                            >
                                {cleaned}
                            </Link>
                        );
                    })
                ) : (
                    // Manual page numbers mode
                    <>
                        <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => onPageChange?.(currentPage - 1)}
                            className={
                                'px-3 py-1.5 rounded-xl text-[11px] font-bold border ' +
                                'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                'dark:bg-[#0C1D36] text-[#0B1F63] dark:text-[#F1F5F9] ' +
                                'hover:bg-[#F0F8FF] dark:hover:bg-[#132847] ' +
                                'disabled:opacity-40 disabled:cursor-not-allowed transition'
                            }
                        >
                            ← Sebelumnya
                        </button>

                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0060F4] text-white">
                            {currentPage}
                        </span>

                        <button
                            type="button"
                            disabled={currentPage >= lastPage}
                            onClick={() => onPageChange?.(currentPage + 1)}
                            className={
                                'px-3 py-1.5 rounded-xl text-[11px] font-bold border ' +
                                'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                'dark:bg-[#0C1D36] text-[#0B1F63] dark:text-[#F1F5F9] ' +
                                'hover:bg-[#F0F8FF] dark:hover:bg-[#132847] ' +
                                'disabled:opacity-40 disabled:cursor-not-allowed transition'
                            }
                        >
                            Berikutnya →
                        </button>
                    </>
                )}
            </nav>
        </div>
    );
}
