import { Link } from '@inertiajs/react';
import { ArrowRight, Building2, CheckCircle2, CircleDollarSign } from 'lucide-react';

export interface ReceivableCompanyItem {
    company_id: string | null;
    company_name: string;
    invoice_count: number;
    overdue_count: number;
    outstanding_amount: number;
    overdue_amount: number;
    oldest_due_date: string | null;
}

export interface ReceivablesOverviewData {
    aging: {
        current: number;
        overdue_30: number;
        overdue_60: number;
        total: number;
    };
    receivables_by_company: ReceivableCompanyItem[];
}

const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const formatCompactCurrency = (value: number): string => {
    const compactValue = new Intl.NumberFormat('id-ID', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Number(value ?? 0));

    return `Rp${compactValue}`;
};

const formatDate = (value: string): string =>
    new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));

export default function ReceivablesOverview({ data, headingId }: { data: ReceivablesOverviewData; headingId: string }) {
    const segments = [
        { label: 'Belum jatuh tempo', value: Number(data.aging.current ?? 0), color: '#0060F4' },
        { label: 'Terlambat 1–30 hari', value: Number(data.aging.overdue_30 ?? 0), color: '#F59E0B' },
        { label: 'Terlambat >30 hari', value: Number(data.aging.overdue_60 ?? 0), color: '#E5484D' },
    ];
    const companies = data.receivables_by_company ?? [];
    const visibleCompanies = companies.slice(0, 6);
    const total = Number(data.aging.total ?? 0);
    const maximumCompanyBalance = Math.max(...companies.map((company) => Number(company.outstanding_amount)), 1);
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    let consumed = 0;

    return (
        <section aria-labelledby={headingId} className="min-w-0 rounded-2xl border border-[#DCEAF8] bg-white shadow-sm dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
            <header className="flex items-start justify-between gap-3 border-b border-[#E5EEF7] px-4 py-3 dark:border-[#1E3A5F]">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                        <CircleDollarSign aria-hidden="true" className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <h2 id={headingId} className="text-balance text-sm font-extrabold text-[#0B1F63] sm:text-base dark:text-white">
                            Piutang per perusahaan
                        </h2>
                        <p className="mt-0.5 text-pretty text-[10px] leading-4 text-[#52658E] dark:text-[#9FB0C6]">
                            Komposisi umur piutang dan perusahaan dengan saldo belum lunas.
                        </p>
                    </div>
                </div>
                <Link href="/receivables" prefetch className="inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#60A5FA] dark:hover:bg-[#132847]">
                    Lihat semua
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
            </header>

            <div className="grid min-w-0 gap-5 p-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.45fr)] lg:gap-6">
                <div className="min-w-0 lg:border-r lg:border-[#E5EEF7] lg:pr-6 dark:lg:border-[#1E3A5F]">
                    <h3 className="text-balance text-xs font-extrabold text-[#0B1F63] dark:text-white">Umur piutang</h3>
                    <p className="mt-0.5 text-pretty text-[10px] text-[#52658E] dark:text-[#9FB0C6]">Distribusi saldo berdasarkan keterlambatan.</p>

                    <figure className="relative mx-auto mt-4 size-44" aria-label={`Total piutang ${formatCurrency(total)}`}>
                        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                            <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="14" className="text-[#E8F0F7] dark:text-[#172E4B]" />
                            {segments.map((segment) => {
                                const length = total > 0 ? (segment.value / total) * circumference : 0;
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
                        <figcaption className="absolute inset-6 flex flex-col items-center justify-center text-center">
                            <span className="max-w-full truncate text-sm font-black tabular-nums text-[#0B1F63] dark:text-white">{formatCompactCurrency(total)}</span>
                            <span className="mt-1 text-[10px] font-semibold text-[#52658E] dark:text-[#9FB0C6]">total piutang</span>
                        </figcaption>
                    </figure>

                    <dl className="mt-3 grid gap-2">
                        {segments.map((segment) => {
                            const percentage = total > 0 ? Math.round((segment.value / total) * 100) : 0;

                            return (
                                <div key={segment.label} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 text-[10px]">
                                    <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
                                    <dt className="min-w-0 truncate font-semibold text-[#52658E] dark:text-[#9FB0C6]">{segment.label}</dt>
                                    <dd className="font-extrabold tabular-nums text-[#0B1F63] dark:text-white">{percentage}%</dd>
                                </div>
                            );
                        })}
                    </dl>
                </div>

                <div className="min-w-0">
                    <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-balance text-xs font-extrabold text-[#0B1F63] dark:text-white">Perusahaan dengan piutang</h3>
                            <p className="mt-0.5 text-pretty text-[10px] text-[#52658E] dark:text-[#9FB0C6]">Diurutkan dari saldo belum lunas terbesar.</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold tabular-nums text-[#52658E] dark:text-[#9FB0C6]">{companies.length} perusahaan</span>
                    </div>

                    {visibleCompanies.length > 0 ? (
                        <div className="mt-3 divide-y divide-[#EAF1F8] dark:divide-[#1E3A5F]">
                            {visibleCompanies.map((company, index) => {
                                const width = Math.max(4, (Number(company.outstanding_amount) / maximumCompanyBalance) * 100);

                                return (
                                    <Link
                                        key={company.company_id ?? company.company_name}
                                        href={`/receivables?search=${encodeURIComponent(company.company_name)}`}
                                        prefetch
                                        className="group grid min-h-[66px] touch-manipulation grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-1 py-2.5 hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:hover:bg-[#10243E]"
                                    >
                                        <span className="flex size-8 items-center justify-center rounded-lg bg-[#E0F0FF] text-[10px] font-black tabular-nums text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                <Building2 aria-hidden="true" className="size-3.5 shrink-0 text-[#7C91AC]" />
                                                <span className="truncate text-[11px] font-extrabold text-[#0B1F63] group-hover:text-[#0060F4] dark:text-white">{company.company_name}</span>
                                            </span>
                                            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#EAF1F8] dark:bg-[#182E4B]">
                                                <span className="block h-full rounded-full bg-[#0060F4]" style={{ width: `${width}%` }} />
                                            </span>
                                            <span className="mt-1 block truncate text-[9px] text-[#52658E] dark:text-[#9FB0C6]">
                                                {company.invoice_count} invoice · {company.overdue_count} terlambat
                                                {company.oldest_due_date ? ` · jatuh tempo terlama ${formatDate(company.oldest_due_date)}` : ''}
                                            </span>
                                        </span>
                                        <span className="text-right">
                                            <span className="block whitespace-nowrap text-[11px] font-black tabular-nums text-[#0B1F63] dark:text-white">{formatCompactCurrency(company.outstanding_amount)}</span>
                                            <span className="mt-1 block whitespace-nowrap text-[9px] font-semibold text-[#52658E] dark:text-[#9FB0C6]">belum lunas</span>
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex min-h-52 flex-col items-center justify-center text-center">
                            <CheckCircle2 aria-hidden="true" className="size-8 text-[#087443] dark:text-emerald-300" />
                            <p className="mt-2 text-balance text-xs font-extrabold text-[#0B1F63] dark:text-white">Tidak ada piutang perusahaan</p>
                            <p className="mt-1 text-pretty text-[10px] text-[#52658E] dark:text-[#9FB0C6]">Seluruh invoice klien sudah tercatat lunas.</p>
                        </div>
                    )}

                    {companies.length > visibleCompanies.length && (
                        <p className="mt-2 text-right text-[9px] font-semibold text-[#52658E] dark:text-[#9FB0C6]">
                            +{companies.length - visibleCompanies.length} perusahaan lainnya tersedia di menu Piutang.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
