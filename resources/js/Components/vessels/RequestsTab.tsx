import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import RequestWorkflowPanel from '../RequestWorkflowPanel';
import StatusBadge from '../ui/StatusBadge';
import { formatDate } from '../../lib/formatDate';
import type { ShipRequest } from './types';

interface RequestsTabProps {
    requests: ShipRequest[];
    canProcess: boolean;
    headingLevel?: 2 | 3;
}

export default function RequestsTab({ requests, canProcess, headingLevel = 3 }: RequestsTabProps) {
    const HeadingTag = headingLevel === 2 ? 'h2' : 'h3';
    const headingId = headingLevel === 2 ? 'vessel-requests-heading-desktop' : 'vessel-requests-heading-mobile';

    return (
        <section aria-labelledby={headingId} className="space-y-3.5 px-4 pb-3 pt-3 md:px-0 md:pb-0 md:pt-0">
            <div className="flex items-center justify-between gap-3">
                <HeadingTag id={headingId} className="text-balance text-sm font-extrabold text-[#082870] dark:text-white sm:text-base">
                    Pengajuan &amp; Status Operasional
                </HeadingTag>
                <span className="shrink-0 rounded-full border border-[#DCEAF8] bg-white px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#52658E] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#94A3B8]">
                    {requests.length} pengajuan
                </span>
            </div>
            {requests.length > 0 ? (
                <div className="space-y-3">
                    {requests.map((r) => (
                        <article
                            key={r.id}
                            className={
                                'rounded-2xl border border-[#DCEAF8] bg-white p-4 text-xs shadow-xs ' +
                                'dark:border-[#1E3A5F] dark:bg-[#0C1D36] sm:p-5'
                            }
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="break-words font-mono text-sm font-bold text-[#0060F4] dark:text-[#38BDF8]" translate="no">
                                        {r.request_number}
                                    </p>
                                    <p className="mt-1.5 break-words text-pretty text-sm leading-5 text-[#52658E] dark:text-[#94A3B8]">
                                        {r.notes || 'Pengajuan kebutuhan keagenan kapal'}
                                    </p>
                                </div>
                                <StatusBadge status={r.status} label={r.status} showDot size="sm" className="shrink-0 whitespace-nowrap" />
                            </div>

                            <div className="mt-4 flex flex-col gap-3 border-t border-[#DCEAF8] pt-3 dark:border-[#1E3A5F] sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-[11px] tabular-nums text-[#52658E] dark:text-[#94A3B8]">
                                    Tanggal {formatDate(r.request_date)}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                    <RequestWorkflowPanel
                                        request={r}
                                        canProcess={canProcess}
                                        compact
                                    />
                                    <Link
                                        href={route('requests.detail', r.id)}
                                        className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-[#DCEAF8] bg-white px-3 font-bold text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#60A5FA] dark:hover:border-[#38BDF8] dark:hover:bg-[#132847]"
                                    >
                                        Lihat detail
                                        <ArrowRight className="size-3" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div
                    className={
                        'p-6 text-center bg-[#F8FAFD] dark:bg-[#071322]/60 rounded-2xl border ' +
                        'border-[#DCEAF8] dark:border-[#1E3A5F] text-xs text-[#52658E] ' +
                        'dark:text-[#94A3B8]'
                    }
                >
                    Belum ada pengajuan aktif.
                </div>
            )}
        </section>
    );
}
