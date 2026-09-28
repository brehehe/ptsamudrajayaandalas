import React, { ReactNode } from 'react';
import Card from '../ui/Card';

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
    isLoading = false,
    emptyMessage = 'Tidak ada data ditemukan',
    emptyIcon = '📋',
    className = '',
}: TableMobileProps<T>) {
    if (isLoading) {
        return (
            <div className={`space-y-3 ${className}`}>
                {Array.from({ length: 3 }).map((_, idx) => (
                    <Card key={`loading-card-${idx}`} className="p-4 border border-[#DCEAF8] dark:border-[#1E3A5F] animate-pulse space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#DCEAF8]/60 dark:bg-[#1E3A5F]/60 rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-[#DCEAF8]/60 dark:bg-[#1E3A5F]/60 rounded w-1/2" />
                                <div className="h-3 bg-[#DCEAF8]/40 dark:bg-[#1E3A5F]/40 rounded w-1/3" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DCEAF8]/50 dark:border-[#1E3A5F]/50">
                            <div className="h-3 bg-[#DCEAF8]/40 dark:bg-[#1E3A5F]/40 rounded w-3/4" />
                            <div className="h-3 bg-[#DCEAF8]/40 dark:bg-[#1E3A5F]/40 rounded w-3/4" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <Card className={`p-8 text-center border border-[#DCEAF8] dark:border-[#1E3A5F] ${className}`}>
                <div className="text-3xl mb-2">{emptyIcon}</div>
                <div className="font-semibold text-sm text-[#0B1F63] dark:text-[#F1F5F9]">{emptyMessage}</div>
            </Card>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {data.map((row, index) => {
                const rowKey = keyExtractor(row, index);

                return (
                    <Card
                        key={rowKey}
                        className={`p-4 border border-[#DCEAF8] dark:border-[#1E3A5F] transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:border-[#0060F4]/40 dark:hover:border-[#38BDF8]/40 hover:shadow-xs active:scale-[0.995]' : ''
                            }`}
                        onClick={() => onCardClick?.(row, index)}
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
                                    <div className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9] leading-snug">
                                        {titleRender(row, index)}
                                    </div>
                                    {subtitleRender && (
                                        <div className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                            {subtitleRender(row, index)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {statusRender && (
                                <div className="flex-shrink-0">
                                    {statusRender(row, index)}
                                </div>
                            )}
                        </div>

                        {/* Card Metadata Fields */}
                        {fields.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F] grid grid-cols-2 gap-2 text-xs">
                                {fields.map((field, fIdx) => (
                                    <div
                                        key={`field-${fIdx}`}
                                        className={field.fullWidth ? 'col-span-2' : 'col-span-1'}
                                    >
                                        <span className="text-[#52658E] dark:text-[#94A3B8] text-[10px] font-medium flex items-center gap-1">
                                            {field.icon && <span className="text-[11px]">{field.icon}</span>}
                                            <span>{field.label}</span>
                                        </span>
                                        <div className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9] mt-0.5 break-words">
                                            {field.render(row, index)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions row */}
                        {actionsRender && (
                            <div
                                className="mt-3 pt-2.5 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center justify-end gap-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {actionsRender(row, index)}
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
