import { Link } from '@inertiajs/react';
import { ArrowRight, CalendarDays, ClipboardList, Plus } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import type { ShipRequest } from './types';

export type NeedsFilterTab = 'draft' | 'diajukan' | 'diproses' | 'selesai';

const filterOptions: Array<{ key: NeedsFilterTab; label: string }> = [
    { key: 'draft', label: 'Draft' },
    { key: 'diajukan', label: 'Diajukan' },
    { key: 'diproses', label: 'Diproses' },
    { key: 'selesai', label: 'Selesai' },
];

const statusGroup = (status: string): NeedsFilterTab => {
    if (status === 'Draft') {
        return 'draft';
    }

    if (['Disetujui', 'Disetujui Sebagian', 'Dalam Proses', 'Diproses'].includes(status)) {
        return 'diproses';
    }

    if (['Selesai', 'Dibatalkan', 'Ditolak'].includes(status)) {
        return 'selesai';
    }

    return 'diajukan';
};

const formatDate = (value?: string): string => {
    if (!value) {
        return '-';
    }

    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const date = new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
};

const formatQuantity = (value: number | string): string => {
    const quantity = Number(value);

    if (Number.isNaN(quantity)) {
        return String(value);
    }

    return new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 2,
    }).format(quantity);
};

interface NeedsTabProps {
    needs: ShipRequest[];
    onStartNeed: () => void;
    filterTab: NeedsFilterTab;
    onFilterChange: (tab: NeedsFilterTab) => void;
    canCreate?: boolean;
}

export default function NeedsTab({
    needs,
    onStartNeed,
    filterTab,
    onFilterChange,
    canCreate = true,
}: NeedsTabProps) {
    const counts = needs.reduce<Record<NeedsFilterTab, number>>(
        (currentCounts, need) => {
            currentCounts[statusGroup(need.status)] += 1;

            return currentCounts;
        },
        { draft: 0, diajukan: 0, diproses: 0, selesai: 0 },
    );
    const filteredNeeds = needs.filter((need) => statusGroup(need.status) === filterTab);
    const activeFilterLabel = filterOptions.find((option) => option.key === filterTab)?.label;

    return (
        <div className="space-y-3.5 px-4 pb-3 pt-3">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-[#082870] dark:text-white">
                    Daftar Kebutuhan
                </h3>
                {canCreate && (
                    <button
                        type="button"
                        onClick={onStartNeed}
                        className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-xl bg-[#0060F4] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                    >
                        <Plus aria-hidden="true" className="size-4" />
                        <span>Tambah Kebutuhan</span>
                    </button>
                )}
            </div>

            <div
                className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs scrollbar-none"
                aria-label="Filter status kebutuhan"
            >
                {filterOptions.map((option) => (
                    <button
                        key={option.key}
                        type="button"
                        onClick={() => onFilterChange(option.key)}
                        aria-pressed={filterTab === option.key}
                        className={`min-h-11 shrink-0 touch-manipulation whitespace-nowrap rounded-xl px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${
                            filterTab === option.key
                                ? 'bg-[#0060F4] text-white shadow-xs'
                                : 'border border-[#DCEAF8] bg-[#F0F8FF] text-[#0060F4] hover:border-[#0060F4]/40 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#38BDF8]'
                        }`}
                    >
                        {option.label} ({counts[option.key]})
                    </button>
                ))}
            </div>

            {filteredNeeds.length > 0 ? (
                <div className="space-y-2.5">
                    {filteredNeeds.map((need) => {
                        const items = need.items ?? [];
                        const actionLabel = need.status === 'Draft' && canCreate
                            ? 'Review & Ajukan'
                            : 'Lihat Detail';

                        return (
                            <article
                                key={need.id}
                                className="space-y-3 rounded-2xl border border-[#DCEAF8] bg-[#F8FAFD] p-3.5 shadow-2xs dark:border-[#1E3A5F] dark:bg-[#071322]/60"
                            >
                                <header className="flex items-start justify-between gap-3 border-b border-[#DCEAF8] pb-2 dark:border-[#1E3A5F]">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#082870] dark:text-white">
                                            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-[#0060F4]" />
                                            <span className="truncate">
                                                {formatDate(need.request_date || need.created_at)} · {items.length} item
                                            </span>
                                        </div>
                                        <p
                                            className="mt-1 truncate font-mono text-[10px] font-semibold text-[#52658E] dark:text-[#94A3B8]"
                                            translate="no"
                                        >
                                            {need.request_number}
                                        </p>
                                    </div>
                                    <StatusBadge status={need.status} label={need.status} size="sm" />
                                </header>

                                {items.length > 0 ? (
                                    <ol className="space-y-2 text-xs">
                                        {items.map((item, index) => (
                                            <li key={item.id ?? `${need.id}-${index}`} className="space-y-0.5">
                                                <div className="flex items-start justify-between gap-3 font-bold text-[#082870] dark:text-white">
                                                    <span className="min-w-0 break-words">
                                                        {index + 1}. {item.item_name}
                                                    </span>
                                                    <span className="shrink-0 font-semibold text-[#0060F4]">
                                                        {formatQuantity(item.quantity)} {item.unit}
                                                    </span>
                                                </div>
                                                {item.notes && (
                                                    <p className="break-words text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <p className="break-words text-xs text-[#52658E] dark:text-[#94A3B8]">
                                        {need.notes || 'Belum ada rincian item pada kebutuhan ini.'}
                                    </p>
                                )}

                                <Link
                                    href={route('requests.detail', need.id)}
                                    prefetch
                                    className="flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-[#0060F4] px-3 text-xs font-bold text-white hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                                >
                                    {actionLabel}
                                    <ArrowRight aria-hidden="true" className="size-4" />
                                </Link>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="border-y border-[#DCEAF8] py-10 text-center dark:border-[#1E3A5F]">
                    <ClipboardList aria-hidden="true" className="mx-auto size-8 text-[#8C9BB9]" />
                    <p className="mt-3 text-sm font-bold text-[#082870] dark:text-white">
                        Belum ada kebutuhan {activeFilterLabel?.toLowerCase()}
                    </p>
                    <p className="mx-auto mt-1 max-w-64 text-xs leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                        {needs.length === 0
                            ? 'Belum ada kebutuhan kapal yang tercatat untuk kunjungan ini.'
                            : 'Pilih status lain untuk melihat kebutuhan yang tersedia.'}
                    </p>
                </div>
            )}
        </div>
    );
}
