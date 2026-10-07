import React, { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import Card from '../ui/Card';
import Skeleton from '../feedback/Skeleton';

export interface MobileField<T> {
    label: string;
    render: (row: T, index: number) => ReactNode;
    icon?: ReactNode;
    fullWidth?: boolean;
}

export interface TableMobileProps<T> {
    data: T[];
    keyExtractor: (row: T, index: number) => string | number;
    titleRender: (row: T, index: number) => ReactNode;
    subtitleRender?: (row: T, index: number) => ReactNode;
    statusRender?: (row: T, index: number) => ReactNode;
    imageRender?: (row: T, index: number) => ReactNode;
    fields?: MobileField<T>[];
    actionsRender?: (row: T, index: number) => ReactNode;
    onCardClick?: (row: T, index: number) => void;
    cardAriaLabel?: (row: T, index: number) => string;
    isLoading?: boolean;
    emptyMessage?: string | ReactNode;
    emptyIcon?: ReactNode;
    className?: string;
}

export default function TableMobile<T>({
    data,
    keyExtractor,
    titleRender,
    subtitleRender,
    statusRender,
    imageRender,
    fields = [],
    actionsRender,
    onCardClick,
    cardAriaLabel,
    isLoading = false,
    emptyMessage = 'Data Tidak Ditemukan',
    emptyIcon = <Inbox aria-hidden="true" className="mx-auto size-7" />,
    className = '',
}: TableMobileProps<T>) {
    if (isLoading) {
        return (
            <div role="status" aria-busy="true" className={`space-y-3 ${className}`}>
                <span className="sr-only">Memuat data…</span>
                {Array.from({ length: 3 }).map((_, idx) => (
                    <Card
                        key={`loading-card-${idx}`}
                        className="space-y-3 p-4"
                    >
                        <div className="flex items-center gap-3">
                            <Skeleton className="size-12 shrink-0 rounded-xl opacity-70" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/2 rounded" />
                                <Skeleton className="h-3 w-1/3 rounded opacity-60" />
                            </div>
                        </div>
                        <div
                            className={
                                'grid grid-cols-2 gap-2 pt-2 border-t border-[#DCEAF8]/50 ' +
                                'dark:border-[#1E3A5F]/50'
                            }
                        >
                            <Skeleton className="h-3 w-3/4 rounded opacity-60" />
                            <Skeleton className="h-3 w-3/4 rounded opacity-60" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <Card
                className={`p-8 text-center border border-[#DCEAF8] dark:border-[#1E3A5F] ${className}`}
            >
                <div className="mb-2 text-[#8C9BB9] dark:text-[#64748B]">{emptyIcon}</div>
                <div className="font-semibold text-sm text-[#0B1F63] dark:text-[#F1F5F9]">
                    {emptyMessage}
                </div>
            </Card>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {data.map((row, index) => {
                const rowKey = keyExtractor(row, index);
                const actionsContent = actionsRender?.(row, index);

                return (
                    <Card
                        key={rowKey}
                        role={onCardClick ? 'button' : undefined}
                        tabIndex={onCardClick ? 0 : undefined}
                        aria-label={onCardClick ? cardAriaLabel?.(row, index) : undefined}
                        className={`border border-[#DCEAF8] p-3.5 transition-[border-color,box-shadow,background-color] duration-200 motion-reduce:transition-none dark:border-[#1E3A5F] ${
                            onCardClick
                                ? 'cursor-pointer hover:border-[#0060F4]/40 ' +
                                  'dark:hover:border-[#38BDF8]/40 hover:shadow-xs ' +
                                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]'
                                : ''
                        }`}
                        onClick={() => onCardClick?.(row, index)}
                        onKeyDown={(event) => {
                            if (!onCardClick || (event.key !== 'Enter' && event.key !== ' ')) {
                                return;
                            }

                            event.preventDefault();
                            onCardClick(row, index);
                        }}
                    >
                        {/* Card Header: Thumbnail + Title + Status */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                {imageRender && (
                                    <div className="flex-shrink-0 mt-0.5">
                                        {imageRender(row, index)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="break-words text-sm font-bold leading-snug text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {titleRender(row, index)}
                                    </div>
                                    {subtitleRender && (
                                        <div className="mt-0.5 break-words text-xs text-[#52658E] dark:text-[#94A3B8]">
                                            {subtitleRender(row, index)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {statusRender && (
                                <div className="flex-shrink-0">{statusRender(row, index)}</div>
                            )}
                        </div>

                        {/* Card Metadata Fields */}
                        {fields.length > 0 && (
                            <div
                                className={
                                    'mt-3 pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                    'grid grid-cols-2 gap-2 text-xs'
                                }
                            >
                                {fields.map((field, fIdx) => (
                                    <div
                                        key={`field-${fIdx}`}
                                        className={field.fullWidth ? 'col-span-2' : 'col-span-1'}
                                    >
                                        <span
                                            className={
                                                'text-[#52658E] dark:text-[#94A3B8] text-[10px] ' +
                                                'font-medium flex items-center gap-1'
                                            }
                                        >
                                            {field.icon && (
                                                <span className="text-[11px]">{field.icon}</span>
                                            )}
                                            <span>{field.label}</span>
                                        </span>
                                        <div
                                            className={
                                                'font-semibold text-[#0B1F63] dark:text-[#F1F5F9] ' +
                                                'mt-0.5 break-words'
                                            }
                                        >
                                            {field.render(row, index)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions row */}
                        {actionsContent && (
                            <div
                                className={
                                    'mt-3 pt-2.5 border-t border-[#DCEAF8] ' +
                                    'dark:border-[#1E3A5F] flex items-center justify-end gap-2'
                                }
                                onClick={(e) => e.stopPropagation()}
                            >
                                {actionsContent}
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
