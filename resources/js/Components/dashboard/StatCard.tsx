import React, { ReactNode } from 'react';
import Card from '../ui/Card';
import Skeleton from '../feedback/Skeleton';

export interface StatTrend {
    value: string | number;
    isPositive?: boolean;
    label?: string;
}

export interface StatCardProps {
    title: string;
    value: string | number;
    trend?: StatTrend;
    icon?: ReactNode;
    iconColor?: string;
    iconBg?: string;
    subtext?: string;
    sparklineData?: number[];
    isLoading?: boolean;
    onClick?: () => void;
    className?: string;
}

export default function StatCard({
    title,
    value,
    trend,
    icon,
    iconColor = 'text-[#0060F4]',
    iconBg = 'bg-[#E0F0FF]',
    subtext,
    sparklineData,
    isLoading = false,
    onClick,
    className = '',
}: StatCardProps) {
    if (isLoading) {
        return (
            <Card
                className={`p-4 sm:p-5 ${className}`}
                aria-busy="true"
            >
                <div role="status">
                    <span className="sr-only">Memuat statistik…</span>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-1/3 rounded" />
                            <Skeleton className="h-7 w-1/2 rounded opacity-80" />
                        </div>
                        <Skeleton className="size-11 rounded-2xl opacity-70" />
                    </div>
                    <Skeleton className="mt-5 h-3 w-2/3 rounded opacity-60" />
                </div>
            </Card>
        );
    }

    // Sparkline SVG path generation
    const renderSparkline = () => {
        if (!sparklineData || sparklineData.length < 2) return null;
        const min = Math.min(...sparklineData);
        const max = Math.max(...sparklineData);
        const range = max - min || 1;
        const width = 80;
        const height = 24;

        const points = sparklineData
            .map((val, idx) => {
                const x = (idx / (sparklineData.length - 1)) * width;
                const y = height - ((val - min) / range) * (height - 4) - 2;
                return `${x},${y}`;
            })
            .join(' ');

        const isPositive =
            trend?.isPositive ?? sparklineData[sparklineData.length - 1] >= sparklineData[0];
        const strokeColor = isPositive ? '#087443' : '#C62840';

        return (
            <svg width={width} height={height} className="overflow-visible">
                <polyline
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                />
            </svg>
        );
    };

    return (
        <Card
            className={`p-4 sm:p-5 border border-[#DCEAF8] dark:border-[#1E3A5F] transition-all duration-200 ${
                onClick
                    ? 'cursor-pointer hover:border-[#0060F4]/40 dark:hover:border-[#38BDF8]/40 ' +
                      'hover:shadow-md active:scale-[0.99]'
                    : ''
            } ${className}`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                    <span
                        className={
                            'text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] uppercase ' +
                            'tracking-wider block truncate'
                        }
                    >
                        {title}
                    </span>
                    <div
                        className={
                            'text-2xl sm:text-3xl font-extrabold text-[#0B1F63] ' +
                            'dark:text-[#F1F5F9] tracking-tight'
                        }
                    >
                        {value}
                    </div>
                </div>

                {icon && (
                    <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg shadow-xs ${iconBg} ${iconColor}`}
                    >
                        {icon}
                    </div>
                )}
            </div>

            {/* Bottom Row: Trend or Subtext or Sparkline */}
            {(trend || subtext || sparklineData) && (
                <div
                    className={
                        'mt-3.5 pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex ' +
                        'items-center justify-between gap-2 text-xs'
                    }
                >
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {trend && (
                            <span
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    trend.isPositive
                                        ? 'bg-[#DCF7E8] text-[#087443] dark:bg-[#10B981]/20 dark:text-[#34D399]'
                                        : 'bg-[#FFE7EC] text-[#C62840] dark:bg-[#EF4444]/20 dark:text-[#F87171]'
                                }`}
                            >
                                <span>{trend.isPositive ? '↑' : '↓'}</span>
                                <span>{trend.value}</span>
                            </span>
                        )}

                        {trend?.label && (
                            <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px]">
                                {trend.label}
                            </span>
                        )}

                        {subtext && !trend && (
                            <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px]">
                                {subtext}
                            </span>
                        )}
                    </div>

                    {renderSparkline()}
                </div>
            )}
        </Card>
    );
}
