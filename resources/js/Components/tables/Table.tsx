import React, { ReactNode } from 'react';
import Skeleton from '../feedback/Skeleton';

export interface Column<T> {
    key: string;
    header: ReactNode;
    render?: (row: T, index: number) => ReactNode;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    width?: string;
    className?: string;
}

export interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (row: T, index: number) => string | number;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (columnKey: string) => void;
    onRowClick?: (row: T) => void;
    selectable?: boolean;
    selectedKeys?: (string | number)[];
    onSelectRow?: (key: string | number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    isLoading?: boolean;
    emptyMessage?: string | ReactNode;
    emptyIcon?: ReactNode;
    compact?: boolean;
    striped?: boolean;
    stickyHeader?: boolean;
    tableLayout?: 'auto' | 'fixed';
    minWidth?: string;
    className?: string;
}

export default function Table<T>({
    columns,
    data,
    keyExtractor,
    sortColumn,
    sortDirection = 'asc',
    onSort,
    onRowClick,
    selectable = false,
    selectedKeys = [],
    onSelectRow,
    onSelectAll,
    isLoading = false,
    emptyMessage = 'Tidak ada data ditemukan',
    emptyIcon = '📋',
    compact = false,
    striped = false,
    stickyHeader = false,
    tableLayout = 'auto',
    minWidth,
    className = '',
}: TableProps<T>) {
    const isAllSelected =
        data.length > 0 && data.every((row, idx) => selectedKeys.includes(keyExtractor(row, idx)));
    const isSomeSelected = selectedKeys.length > 0 && !isAllSelected;

    const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSelectAll?.(e.target.checked);
    };

    const handleRowSelectChange = (
        key: string | number,
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        e.stopPropagation();
        onSelectRow?.(key, e.target.checked);
    };

    const handleSort = (columnKey: string, sortable?: boolean) => {
        if (!sortable || !onSort) return;
        onSort(columnKey);
    };

    const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
        switch (align) {
            case 'right':
                return 'text-right';
            case 'center':
                return 'text-center';
            case 'left':
            default:
                return 'text-left';
        }
    };

    return (
        <div
            aria-busy={isLoading || undefined}
            className={`w-full overflow-x-auto rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] shadow-xs ${className}`}
        >
            {isLoading && <span className="sr-only">Memuat data…</span>}
            <table
                className={`w-full text-left border-collapse ${tableLayout === 'fixed' ? 'table-fixed' : ''}`}
                style={minWidth ? { minWidth } : undefined}
            >
                <colgroup>
                    {selectable && <col style={{ width: '40px' }} />}
                    {columns.map((col) => (
                        <col key={col.key} style={col.width ? { width: col.width } : undefined} />
                    ))}
                </colgroup>
                <thead
                    className={`bg-[#F0F8FF] dark:bg-[#071322] border-b border-[#DCEAF8] dark:border-[#1E3A5F] text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] uppercase tracking-wider ${
                        stickyHeader ? 'sticky top-0 z-10 shadow-xs' : ''
                    }`}
                >
                    <tr>
                        {selectable && (
                            <th scope="col" className="w-10 px-4 py-3.5 text-center">
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = isSomeSelected;
                                        }}
                                        onChange={handleSelectAllChange}
                                        className={
                                            'w-4 h-4 rounded-md text-[#0060F4] ' +
                                            'border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                            'dark:bg-[#071322] focus:ring-[#0060F4] ' +
                                            'focus:ring-offset-0 transition'
                                        }
                                        aria-label="Pilih semua baris"
                                    />
                                </label>
                            </th>
                        )}

                        {columns.map((col) => {
                            const isSorted = sortColumn === col.key;
                            return (
                                <th
                                    key={col.key}
                                    scope="col"
                                    style={{ width: col.width }}
                                    onClick={() => handleSort(col.key, col.sortable)}
                                    className={`${compact ? 'py-2.5 px-3' : 'py-3.5 px-4'} ${getAlignmentClass(
                                        col.align
                                    )} ${
                                        col.sortable
                                            ? 'cursor-pointer select-none hover:bg-[#E0F0FF]/70 dark:hover:bg-[#132847] transition-colors'
                                            : ''
                                    } ${col.className || ''}`}
                                >
                                    <div
                                        className={`inline-flex items-center gap-1.5 ${
                                            col.align === 'right'
                                                ? 'justify-end w-full'
                                                : col.align === 'center'
                                                  ? 'justify-center w-full'
                                                  : ''
                                        }`}
                                    >
                                        <span>{col.header}</span>
                                        {col.sortable && (
                                            <span className="flex flex-col text-[9px] leading-[8px] text-[#8C9BB9]">
                                                <span
                                                    className={
                                                        isSorted && sortDirection === 'asc'
                                                            ? 'text-[#0060F4] dark:text-[#38BDF8] font-bold'
                                                            : ''
                                                    }
                                                >
                                                    ▲
                                                </span>
                                                <span
                                                    className={
                                                        isSorted && sortDirection === 'desc'
                                                            ? 'text-[#0060F4] dark:text-[#38BDF8] font-bold'
                                                            : ''
                                                    }
                                                >
                                                    ▼
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>

                <tbody
                    className={
                        'divide-y divide-[#DCEAF8] dark:divide-[#1E3A5F] text-xs text-[#0B1F63] ' +
                        'dark:text-[#E2E8F0]'
                    }
                >
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, rIdx) => (
                            <tr key={`loading-${rIdx}`}>
                                {selectable && (
                                    <td className="px-4 py-3.5 text-center">
                                        <Skeleton className="mx-auto size-4 rounded-md opacity-70" />
                                    </td>
                                )}
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={compact ? 'py-2.5 px-3' : 'py-3.5 px-4'}
                                    >
                                        <Skeleton className="h-4 w-3/4 rounded-md opacity-60" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length + (selectable ? 1 : 0)}
                                className="py-12 px-4 text-center text-[#52658E] dark:text-[#94A3B8]"
                            >
                                <div className="text-3xl mb-2">{emptyIcon}</div>
                                <div className="font-semibold text-sm text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {emptyMessage}
                                </div>
                            </td>
                        </tr>
                    ) : (
                        data.map((row, index) => {
                            const rowKey = keyExtractor(row, index);
                            const isSelected = selectedKeys.includes(rowKey);

                            return (
                                <tr
                                    key={rowKey}
                                    onClick={() => onRowClick?.(row)}
                                    className={`transition-colors ${
                                        striped && index % 2 === 1
                                            ? 'bg-[#F0F8FF]/30 dark:bg-[#071322]/30'
                                            : 'bg-white dark:bg-[#0C1D36]'
                                    } ${
                                        isSelected
                                            ? 'bg-[#E0F0FF]/50 dark:bg-[#162E52]/60'
                                            : 'hover:bg-[#F0F8FF]/70 dark:hover:bg-[#132847]'
                                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                                >
                                    {selectable && (
                                        <td
                                            className="w-10 px-4 py-3 text-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => handleRowSelectChange(rowKey, e)}
                                                className={
                                                    'w-4 h-4 rounded-md text-[#0060F4] ' +
                                                    'border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                                    'dark:bg-[#071322] focus:ring-[#0060F4] ' +
                                                    'focus:ring-offset-0 transition ' +
                                                    'cursor-pointer'
                                                }
                                                aria-label={`Pilih baris ${index + 1}`}
                                            />
                                        </td>
                                    )}

                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`${compact ? 'py-2.5 px-3' : 'py-3.5 px-4'} ${getAlignmentClass(
                                                col.align
                                            )} ${col.className || ''}`}
                                        >
                                            {col.render
                                                ? col.render(row, index)
                                                : ((row as Record<string, any>)[col.key] ?? '-')}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
