import React, { useState } from 'react';
import Card from '../ui/Card';

export interface ChartDataPoint {
    label: string;
    value: number;
    secondaryValue?: number;
    color?: string;
}

export interface ChartProps {
    type?: 'bar' | 'line' | 'donut';
    data: ChartDataPoint[];
    title?: string;
    subtitle?: string;
    height?: number;
    showLegend?: boolean;
    secondaryLabel?: string;
    valuePrefix?: string;
    valueSuffix?: string;
    className?: string;
}

const SJA_CHART_COLORS = [
    '#0060F4', // SJA Primary
    '#082870', // Primary Dark
    '#19B5F7', // Cyan Accent
    '#087443', // Success Green
    '#A65300', // Warning Amber
    '#6840BB', // Processing Purple
];

export default function Chart({
    type = 'bar',
    data = [],
    title,
    subtitle,
    height = 220,
    showLegend = true,
    secondaryLabel,
    valuePrefix = '',
    valueSuffix = '',
    className = '',
}: ChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const values = data.map((d) => d.value);
    const maxValue = Math.max(...values, 1);
    const totalValue = values.reduce((sum, v) => sum + v, 0);

    // ==========================================
    // 1. BAR CHART RENDERER
    // ==========================================
    const renderBarChart = () => {
        const barWidth = 28;
        const chartHeight = height - 50;

        return (
            <div className="w-full relative pt-6 pb-2">
                <div
                    className="flex items-end justify-between gap-2 sm:gap-4 px-2"
                    style={{ height: chartHeight }}
                >
                    {data.map((item, idx) => {
                        const barHeightPercent = Math.max((item.value / maxValue) * 100, 4);
                        const isHovered = hoveredIndex === idx;
                        const barColor = item.color || SJA_CHART_COLORS[idx % SJA_CHART_COLORS.length];

                        return (
                            <div
                                key={`bar-${idx}`}
                                onMouseEnter={() => setHoveredIndex(idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                            >
                                {/* Tooltip */}
                                {isHovered && (
                                    <div className="absolute -top-10 z-20 px-2.5 py-1 rounded-lg bg-[#0B1F63] text-white text-[11px] font-bold shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-90 duration-150">
                                        <span>{item.label}: </span>
                                        <span className="text-[#19B5F7]">
                                            {valuePrefix}
                                            {item.value.toLocaleString('id-ID')}
                                            {valueSuffix}
                                        </span>
                                    </div>
                                )}

                                {/* The Bar */}
                                <div
                                    style={{
                                        height: `${barHeightPercent}%`,
                                        backgroundColor: barColor,
                                        width: '100%',
                                        maxWidth: `${barWidth}px`,
                                    }}
                                    className={`rounded-t-lg transition-all duration-300 ${
                                        isHovered ? 'brightness-110 shadow-md scale-y-[1.02]' : 'opacity-90'
                                    }`}
                                />

                                {/* X-Axis Label */}
                                <span className="text-[10px] sm:text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8] mt-2 block truncate max-w-full text-center">
                                    {item.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ==========================================
    // 2. LINE / AREA CHART RENDERER
    // ==========================================
    const renderLineChart = () => {
        const svgWidth = 500;
        const svgHeight = height - 40;
        const padding = 20;

        const effectiveWidth = svgWidth - padding * 2;
        const effectiveHeight = svgHeight - padding * 2;

        const points = data.map((item, idx) => {
            const x = padding + (idx / (data.length - 1 || 1)) * effectiveWidth;
            const y = svgHeight - padding - (item.value / maxValue) * effectiveHeight;
            return { x, y, ...item };
        });

        const pathD = points.reduce((acc, pt, idx, arr) => {
            if (idx === 0) return `M ${pt.x} ${pt.y}`;
            const prev = arr[idx - 1];
            const cpX1 = prev.x + (pt.x - prev.x) / 2;
            const cpY1 = prev.y;
            const cpX2 = prev.x + (pt.x - prev.x) / 2;
            const cpY2 = pt.y;
            return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${pt.y}`;
        }, '');

        const areaD = `${pathD} L ${points[points.length - 1]?.x || 0} ${svgHeight} L ${
            points[0]?.x || 0
        } ${svgHeight} Z`;

        return (
            <div className="w-full relative overflow-x-auto">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                    <defs>
                        <linearGradient id="sjaAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0060F4" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#0060F4" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Area Fill */}
                    <path d={areaD} fill="url(#sjaAreaGradient)" />

                    {/* Line Stroke */}
                    <path
                        d={pathD}
                        fill="none"
                        stroke="#0060F4"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />

                    {/* Dots */}
                    {points.map((pt, idx) => (
                        <g
                            key={`point-${idx}`}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={hoveredIndex === idx ? 6 : 4}
                                fill="#FFFFFF"
                                stroke="#0060F4"
                                strokeWidth="3"
                                className="transition-all"
                            />
                        </g>
                    ))}
                </svg>

                {/* X Labels */}
                <div className="flex justify-between px-2 pt-1 text-[10px] sm:text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                    {data.map((item, idx) => (
                        <span key={`xlabel-${idx}`}>{item.label}</span>
                    ))}
                </div>
            </div>
        );
    };

    // ==========================================
    // 3. DONUT CHART RENDERER
    // ==========================================
    const renderDonutChart = () => {
        const size = 180;
        const center = size / 2;
        const radius = 65;
        const strokeWidth = 26;

        let accumulatedPercent = 0;

        const segments = data.map((item, idx) => {
            const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
            const strokeDasharray = `${(percent / 100) * 2 * Math.PI * radius} ${
                2 * Math.PI * radius
            }`;
            const strokeDashoffset = -((accumulatedPercent / 100) * 2 * Math.PI * radius);
            accumulatedPercent += percent;

            const color = item.color || SJA_CHART_COLORS[idx % SJA_CHART_COLORS.length];

            return {
                ...item,
                percent,
                strokeDasharray,
                strokeDashoffset,
                color,
            };
        });

        return (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* SVG Ring */}
                <div className="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
                        {segments.map((seg, idx) => (
                            <circle
                                key={`donut-seg-${idx}`}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={seg.strokeDasharray}
                                strokeDashoffset={seg.strokeDashoffset}
                                className={`transition-all duration-300 cursor-pointer ${
                                    hoveredIndex === idx ? 'opacity-100 stroke-[30px]' : 'opacity-90'
                                }`}
                                onMouseEnter={() => setHoveredIndex(idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        ))}
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-bold uppercase">Total</span>
                        <span className="text-xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                            {valuePrefix}
                            {totalValue.toLocaleString('id-ID')}
                            {valueSuffix}
                        </span>
                    </div>
                </div>

                {/* Legend list */}
                <div className="flex-1 space-y-2 w-full max-w-xs">
                    {segments.map((seg, idx) => (
                        <div
                            key={`legend-${idx}`}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                                hoveredIndex === idx
                                    ? 'bg-[#E0F0FF] dark:bg-[#152E52] border-[#0060F4] dark:border-[#38BDF8]'
                                    : 'border-transparent hover:bg-[#F0F8FF] dark:hover:bg-[#132847]'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: seg.color }}
                                />
                                <span className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9] truncate">
                                    {seg.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {valuePrefix}
                                    {seg.value.toLocaleString('id-ID')}
                                    {valueSuffix}
                                </span>
                                <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] font-medium">
                                    ({seg.percent.toFixed(0)}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Card className={`p-4 sm:p-5 border border-[#DCEAF8] dark:border-[#1E3A5F] ${className}`}>
            {(title || subtitle) && (
                <div className="mb-3">
                    {title && (
                        <h3 className="text-sm sm:text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] leading-snug">
                            {title}
                        </h3>
                    )}
                    {subtitle && <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">{subtitle}</p>}
                </div>
            )}

            {type === 'bar' && renderBarChart()}
            {type === 'line' && renderLineChart()}
            {type === 'donut' && renderDonutChart()}

            {showLegend && type !== 'donut' && (
                <div className="mt-3 pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center justify-center gap-4 flex-wrap text-xs">
                    {data.slice(0, 4).map((item, idx) => (
                        <div key={`legend-bar-${idx}`} className="flex items-center gap-1.5">
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                    backgroundColor:
                                        item.color || SJA_CHART_COLORS[idx % SJA_CHART_COLORS.length],
                                }}
                            />
                            <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px] font-medium">{item.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
