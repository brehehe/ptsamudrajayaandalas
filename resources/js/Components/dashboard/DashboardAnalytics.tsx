import { Link } from '@inertiajs/react';
import { ArrowRight, BarChart3, CircleGauge, Workflow } from 'lucide-react';
import Table, { type Column } from '../tables/Table';

export type ChartFormat = 'number' | 'currency' | 'percentage';

interface ChartBase {
    key: string;
    title: string;
    subtitle: string;
    format: ChartFormat;
}

export interface DonutChartData extends ChartBase {
    type: 'donut';
    center_label: string;
    segments: Array<{ label: string; value: number; color: string }>;
}

export interface BarChartData extends ChartBase {
    type: 'bars';
    series: Array<{ key: string; label: string; color: string }>;
    points: Array<{ label: string; values: Record<string, number> }>;
}

export interface FlowChartData extends ChartBase {
    type: 'flow';
    items: Array<{ label: string; value: number; href: string }>;
}

export type DashboardChartData = DonutChartData | BarChartData | FlowChartData;

const formatValue = (value: number, format: ChartFormat): string => {
    if (format === 'currency') {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(Number(value ?? 0));
    }

    if (format === 'percentage') {
        return `${new Intl.NumberFormat('id-ID').format(Number(value ?? 0))}%`;
    }

    return new Intl.NumberFormat('id-ID').format(Number(value ?? 0));
};

function ChartHeader({ chart }: { chart: DashboardChartData }) {
    const Icon = chart.type === 'donut' ? CircleGauge : chart.type === 'flow' ? Workflow : BarChart3;

    return (
        <header className="flex items-start gap-3 border-b border-[#E5EEF7] pb-3 dark:border-[#1E3A5F]">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                <Icon aria-hidden="true" className="size-[18px]" />
            </span>
            <div className="min-w-0">
                <h3 className="text-balance text-[13px] font-extrabold leading-5 text-[#0B1F63] dark:text-white">{chart.title}</h3>
                <p className="mt-0.5 text-pretty text-[10px] leading-4 text-[#52658E] dark:text-[#9FB0C6]">{chart.subtitle}</p>
            </div>
        </header>
    );
}

function DonutChart({ chart }: { chart: DonutChartData }) {
    const radius = 43;
    const circumference = 2 * Math.PI * radius;
    const total = chart.segments.reduce((sum, segment) => sum + Number(segment.value), 0);
    const formattedTotal = formatValue(total, chart.format);
    const [currencySymbol, ...currencyAmountParts] = formattedTotal.split(/\s+/);
    const currencyAmount = currencyAmountParts.join(' ');
    let consumed = 0;

    return (
        <div className="flex flex-col gap-5 pt-5">
            <figure className="relative mx-auto size-40" aria-label={`${chart.title}, total ${formatValue(total, chart.format)}`}>
                <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="14" className="text-[#E8F0F7] dark:text-[#172E4B]" />
                    {chart.segments.map((segment) => {
                        const length = total > 0 ? (Number(segment.value) / total) * circumference : 0;
                        const offset = consumed;
                        consumed += length;

                        return (
                            <circle
                                key={segment.label}
                                cx="60"
                                cy="60"
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth="14"
                                strokeDasharray={`${length} ${circumference - length}`}
                                strokeDashoffset={-offset}
                            />
                        );
                    })}
                </svg>
                <figcaption className="absolute inset-5 flex flex-col items-center justify-center text-center">
                    {chart.format === 'currency' ? (
                        <span className="flex flex-col items-center gap-0.5 font-black leading-none tabular-nums text-[#0B1F63] dark:text-white">
                            <span className="text-[9px]">{currencySymbol}</span>
                            <span className="whitespace-nowrap text-xs">{currencyAmount}</span>
                        </span>
                    ) : (
                        <span className="whitespace-nowrap text-xs font-black leading-none tabular-nums text-[#0B1F63] dark:text-white">{formattedTotal}</span>
                    )}
                    <span className="mt-1 text-[10px] font-semibold text-[#52658E] dark:text-[#9FB0C6]">{chart.center_label}</span>
                </figcaption>
            </figure>

            <dl className="grid w-full gap-2">
                {chart.segments.map((segment) => {
                    const percentage = total > 0 ? Math.round((Number(segment.value) / total) * 100) : 0;

                    return (
                        <div key={segment.label} className="grid min-h-10 grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl bg-[#F8FBFF] px-3 py-2 text-[11px] dark:bg-[#091A2E]">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
                            <dt className="min-w-0 font-semibold text-[#425A7D] dark:text-[#C7D5E7]">{segment.label}</dt>
                            <dd className="text-right font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                {formatValue(segment.value, chart.format)} <span className="font-medium text-[#7C91AC]">({percentage}%)</span>
                            </dd>
                        </div>
                    );
                })}
            </dl>
        </div>
    );
}

function BarChart({ chart }: { chart: BarChartData }) {
    const allValues = chart.points.flatMap((point) => chart.series.map((series) => Number(point.values[series.key] ?? 0)));
    const maximum = Math.max(...allValues, 1);
    const detailColumns: Column<BarChartData['points'][number]>[] = [
        { key: 'label', header: 'Periode', render: (point) => <span className="font-bold">{point.label}</span> },
        ...chart.series.map((series): Column<BarChartData['points'][number]> => ({
            key: series.key,
            header: series.label,
            render: (point) => <span className="font-semibold tabular-nums">{formatValue(Number(point.values[series.key] ?? 0), chart.format)}</span>,
        })),
    ];

    return (
        <div className="pt-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-semibold text-[#52658E] dark:text-[#9FB0C6]">
                {chart.series.map((series) => (
                    <span key={series.key} className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm" style={{ backgroundColor: series.color }} aria-hidden="true" />
                        {series.label}
                    </span>
                ))}
            </div>

            <div className="mt-3 overflow-x-auto pb-1">
                <div className="flex h-36 min-w-[420px] items-end gap-3 border-b border-[#DCEAF8] px-1 dark:border-[#1E3A5F]" role="img" aria-label={chart.title}>
                    {chart.points.map((point) => (
                        <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                            <div className="flex h-24 w-full items-end justify-center gap-1">
                                {chart.series.map((series) => {
                                    const value = Number(point.values[series.key] ?? 0);

                                    return (
                                        <span
                                            key={series.key}
                                            className="w-3 rounded-t-sm sm:w-4"
                                            style={{
                                                backgroundColor: series.color,
                                                height: value > 0 ? `${Math.max(5, (value / maximum) * 100)}%` : '2px',
                                                opacity: value > 0 ? 1 : 0.22,
                                            }}
                                            title={`${series.label} ${point.label}: ${formatValue(value, chart.format)}`}
                                        />
                                    );
                                })}
                            </div>
                            <span className="text-[10px] font-bold tabular-nums text-[#52658E] dark:text-[#9FB0C6]">{point.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {chart.series.map((series) => {
                    const total = chart.points.reduce((sum, point) => sum + Number(point.values[series.key] ?? 0), 0);

                    return (
                        <div key={series.key} className="rounded-xl bg-[#F3F8FD] px-2.5 py-2 dark:bg-[#091A2E]">
                            <p className="truncate text-[9px] font-semibold text-[#52658E] dark:text-[#9FB0C6]">Total {series.label}</p>
                            <p className="mt-0.5 truncate text-[11px] font-black tabular-nums text-[#0B1F63] dark:text-white">{formatValue(total, chart.format)}</p>
                        </div>
                    );
                })}
            </div>

            <details className="mt-3 rounded-xl border border-[#E5EEF7] text-[10px] dark:border-[#1E3A5F]">
                <summary className="cursor-pointer rounded-xl px-3 py-2 font-bold text-[#0060F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#60A5FA]">
                    Lihat angka lengkap
                </summary>
                <Table
                    className="mt-1 rounded-none border-x-0 border-b-0 shadow-none"
                    columns={detailColumns}
                    data={chart.points}
                    keyExtractor={(point) => point.label}
                    compact
                    minWidth="430px"
                />
            </details>
        </div>
    );
}

function FlowChart({ chart }: { chart: FlowChartData }) {
    const maximum = Math.max(...chart.items.map((item) => Number(item.value)), 1);

    return (
        <div className="space-y-2 pt-4">
            {chart.items.map((item, index) => (
                <Link
                    key={item.label}
                    href={item.href}
                    prefetch
                    className="group grid min-h-11 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-[#E5EEF7] px-2.5 py-2 hover:border-[#9CC9F5] hover:bg-[#F5FAFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#102844]"
                >
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#E0F0FF] text-[9px] font-black tabular-nums text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                        {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-[10px] font-bold text-[#31496F] group-hover:text-[#0060F4] dark:text-[#C7D5E7]">{item.label}</span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[#EAF1F8] dark:bg-[#182E4B]">
                            <span className="block h-full rounded-full bg-[#0060F4]" style={{ width: `${Math.max(item.value > 0 ? 8 : 0, (Number(item.value) / maximum) * 100)}%` }} />
                        </span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-black tabular-nums text-[#0B1F63] dark:text-white">
                        {formatValue(item.value, chart.format)}
                        <ArrowRight aria-hidden="true" className="size-3.5 text-[#8BA4C1]" />
                    </span>
                </Link>
            ))}
        </div>
    );
}

function ChartCard({ chart }: { chart: DashboardChartData }) {
    return (
        <article className="min-w-0 rounded-2xl border border-[#DCEAF8] bg-white p-4 shadow-sm dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
            <ChartHeader chart={chart} />
            {chart.type === 'donut' && <DonutChart chart={chart} />}
            {chart.type === 'bars' && <BarChart chart={chart} />}
            {chart.type === 'flow' && <FlowChart chart={chart} />}
        </article>
    );
}

export default function DashboardAnalytics({ charts }: { charts: DashboardChartData[] }) {
    return (
        <section aria-labelledby="dashboard-analytics-title">
            <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
                <h2 id="dashboard-analytics-title" className="text-balance text-base font-extrabold text-[#0B1F63] dark:text-white">Analisis & laporan</h2>
                <span className="hidden text-[11px] text-[#52658E] sm:block dark:text-[#9FB0C6]">Mengikuti data dan alur kerja PT SJA</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {charts.map((chart) => <ChartCard key={chart.key} chart={chart} />)}
            </div>
        </section>
    );
}
