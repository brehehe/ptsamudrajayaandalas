import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import RequestWorkflowPanel from '../RequestWorkflowPanel';
import { formatDate } from '../../lib/formatDate';
import type { ShipRequest } from './types';

interface RequestsTabProps {
    requests: ShipRequest[];
    canProcess: boolean;
}

export default function RequestsTab({ requests, canProcess }: RequestsTabProps) {
    return (
        <div className="px-4 pt-3 pb-3 space-y-3.5">
            <h3 className="font-extrabold text-sm text-[#082870] dark:text-white">
                Pengajuan &amp; Status Operasional
            </h3>
            {requests.length > 0 ? (
                <div className="space-y-2.5">
                    {requests.map((r) => (
                        <div
                            key={r.id}
                            className={
                                'overflow-hidden rounded-2xl border border-[#DCEAF8] bg-[#F8FAFD] ' +
                                'text-xs shadow-2xs dark:border-[#1E3A5F] dark:bg-[#071322]/60'
                            }
                        >
                            <div className="space-y-2 p-3.5">
                                <div className="flex items-center justify-between gap-3 font-bold">
                                    <span className="min-w-0 break-words font-mono text-[#0060F4] dark:text-[#38BDF8]">
                                        {r.request_number}
                                    </span>
                                    <span
                                        className={
                                            'shrink-0 rounded-full bg-[#E0F0FF] px-2 py-0.5 ' +
                                            'text-[10.5px] text-[#0060F4] dark:bg-[#0060F4]/20 ' +
                                            'dark:text-[#38BDF8]'
                                        }
                                    >
                                        {r.status}
                                    </span>
                                </div>
                                <p className="text-[#52658E] dark:text-[#94A3B8]">
                                    {r.notes || 'Pengajuan kebutuhan keagenan kapal'}
                                </p>
                                <div
                                    className={
                                        'flex items-center justify-between gap-3 border-t ' +
                                        'border-[#DCEAF8]/60 pt-2 text-[11px] text-[#8C9BB9] ' +
                                        'dark:border-[#1E3A5F]'
                                    }
                                >
                                    <span className="tabular-nums">Tanggal: {formatDate(r.request_date)}</span>
                                    <Link
                                        href={route('requests.detail', r.id)}
                                        className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-bold text-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#60A5FA] dark:hover:bg-[#132847]"
                                    >
                                        Detail
                                        <ArrowRight className="size-3" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                            <RequestWorkflowPanel
                                request={r}
                                canProcess={canProcess}
                                compact
                                className="border-t border-[#DCEAF8] dark:border-[#1E3A5F]"
                            />
                        </div>
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
        </div>
    );
}
