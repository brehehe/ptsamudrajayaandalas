import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react';

export interface ItemSubmissionRound {
    round: number;
    round_label: string;
    submission_date: string;
    submission_timestamp?: string;
    submitted_by: string;
    actor_role?: string;
    admin_notes?: string | null;
    hpp_price: number;
    decision_status: 'approved' | 'rejected' | 'unselected' | 'pending' | 'draft' | null;
    decision_label: string | null;
    decision_date: string | null;
    decision_by: string | null;
    director_notes?: string | null;
}

export interface ItemWithHistory {
    id: string;
    item_name?: string;
    submission_count?: number;
    submission_round_label?: string;
    was_previously_unselected?: boolean;
    submission_history?: ItemSubmissionRound[];
    latest_submission_date?: string;
    history_summary?: string;
}

interface Props {
    item: ItemWithHistory;
    compact?: boolean;
    showDetailsInline?: boolean;
}

export default function ItemSubmissionHistoryBadge({ item, compact = false, showDetailsInline = false }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);

    const count = item.submission_count ?? 1;
    const isResubmission = (item.submission_count ?? 1) > 1 || Boolean(item.was_previously_unselected);
    const historyList = item.submission_history || [];
    const hasHistoryDetails = historyList.length > 0;

    const roundLabel = item.submission_round_label || (count === 1 ? 'Pengajuan Pertama' : `Pengajuan ke-${count}`);

    return (
        <div className="inline-flex flex-col gap-1 text-left">
            <div className="flex flex-wrap items-center gap-1.5">
                {isResubmission ? (
                    <span
                        className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-sans text-[11px] font-extrabold text-amber-900 shadow-2xs dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
                        title={item.history_summary || 'Item diajukan kembali ke Direktur setelah sebelumnya belum terpilih'}
                    >
                        <History className="size-3 shrink-0 text-amber-700 dark:text-amber-400" />
                        <span>{roundLabel}</span>
                    </span>
                ) : (
                    <span
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/90 px-2 py-0.5 font-sans text-[11px] font-extrabold text-blue-800 shadow-2xs dark:border-blue-800/80 dark:bg-blue-950/40 dark:text-blue-200"
                        title={item.history_summary || 'Pengajuan pertama ke Direktur'}
                    >
                        <Clock className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>{roundLabel}</span>
                    </span>
                )}

                {hasHistoryDetails && historyList.length > 1 && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#0060F4] hover:bg-blue-50 hover:underline dark:text-[#60A5FA] dark:hover:bg-[#102B4A]"
                        aria-expanded={isExpanded}
                    >
                        <span>{isExpanded ? 'Tutup riwayat' : `Riwayat (${historyList.length})`}</span>
                        {isExpanded ? <ChevronUp className="size-2.5" /> : <ChevronDown className="size-2.5" />}
                    </button>
                )}
            </div>

            {/* Note jika item ini sebelumnya belum terpilih */}
            {isResubmission && !compact && (
                <div className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-800 dark:text-amber-300">
                    <AlertCircle className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Sebelumnya belum dipilih/disetujui pada pengajuan awal</span>
                </div>
            )}

            {/* Expanded Timeline View */}
            {(isExpanded || showDetailsInline) && hasHistoryDetails && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 w-full max-w-md rounded-xl border border-[#DCEAF8] bg-white p-2.5 shadow-sm dark:border-[#1E3A5F] dark:bg-[#071322]"
                >
                    <div className="mb-2 flex items-center justify-between border-b border-[#DCEAF8] pb-1.5 text-xs font-bold text-[#0B1F63] dark:border-[#1E3A5F] dark:text-white">
                        <span className="flex items-center gap-1.5">
                            <History className="size-3.5 text-[#0060F4]" />
                            Riwayat Putaran Pengajuan Item
                        </span>
                        <span className="text-[10px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                            Total {historyList.length} putaran
                        </span>
                    </div>

                    <div className="space-y-2">
                        {historyList.map((round) => {
                            const isApproved = round.decision_status === 'approved';
                            const isRejected = round.decision_status === 'rejected';
                            const isUnselected = round.decision_status === 'unselected';
                            const isPending = round.decision_status === 'pending';

                            return (
                                <div
                                    key={round.round}
                                    className={`rounded-lg border p-2 text-xs transition-colors ${
                                        round.round === count
                                            ? 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'
                                            : 'border-[#E2E8F0] bg-slate-50/60 dark:border-[#1E3A5F] dark:bg-[#0C1D36]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="flex size-4 items-center justify-center rounded-full bg-[#0060F4] text-[9px] font-black text-white">
                                                {round.round}
                                            </span>
                                            <span className="font-extrabold text-[#0B1F63] dark:text-white">
                                                {round.round_label}
                                            </span>
                                        </div>
                                        <span className="text-[10.5px] font-medium text-[#52658E] dark:text-[#94A3B8]">
                                            {round.submission_date}
                                        </span>
                                    </div>

                                    <div className="mt-1 flex flex-col gap-0.5 pl-5.5 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        <div>
                                            Diajukan oleh: <strong className="text-[#0B1F63] dark:text-white">{round.submitted_by}</strong>
                                        </div>
                                        {round.admin_notes && (
                                            <div className="italic text-slate-600 dark:text-slate-300">
                                                &ldquo;{round.admin_notes}&rdquo;
                                            </div>
                                        )}

                                        {/* Status Keputusan */}
                                        <div className="mt-1 flex items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                            <span className="text-[10px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                                Keputusan Direktur:
                                            </span>
                                            {isApproved && (
                                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle2 className="size-3" />
                                                    Disetujui Pak Ryan
                                                </span>
                                            )}
                                            {isRejected && (
                                                <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400">
                                                    <XCircle className="size-3" />
                                                    Ditolak Pak Ryan
                                                </span>
                                            )}
                                            {isUnselected && (
                                                <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                                                    <AlertCircle className="size-3" />
                                                    Tidak Dipilih / Belum Disetujui
                                                </span>
                                            )}
                                            {isPending && (
                                                <span className="inline-flex items-center gap-1 font-bold text-blue-700 dark:text-blue-400">
                                                    <Clock className="size-3" />
                                                    Menunggu Persetujuan Direktur
                                                </span>
                                            )}
                                        </div>

                                        {round.director_notes && (
                                            <div className="mt-0.5 rounded bg-amber-50/80 px-1.5 py-0.5 text-[10.5px] italic text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                                Catatan: {round.director_notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

