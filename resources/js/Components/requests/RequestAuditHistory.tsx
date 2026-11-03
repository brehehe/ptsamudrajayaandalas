import React, { useState } from 'react';
import {
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    RotateCcw,
    Send,
    User,
    XCircle,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
} from 'lucide-react';

export interface RequestHistoryItemSnapshot {
    item_id: string;
    item_name: string;
    quantity: number;
    unit: string;
    hpp_price: number;
    status: string;
    director_status?: string | null;
    director_notes?: string | null;
}

export interface RequestHistoryItem {
    id: string;
    request_id: string;
    user_id?: number | null;
    actor_name?: string | null;
    actor_role?: string | null;
    action: string;
    title: string;
    notes?: string | null;
    submission_date?: string | null;
    action_date: string;
    items_snapshot?: RequestHistoryItemSnapshot[] | null;
    created_at?: string;
}

interface RequestAuditHistoryProps {
    histories?: RequestHistoryItem[];
    requestNumber?: string;
    className?: string;
}

const formatRupiah = (value?: number | string): string => {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDateIndo = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const formatDateOnly = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

export const RequestAuditHistory: React.FC<RequestAuditHistoryProps> = ({
    histories = [],
    requestNumber,
    className = '',
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!histories || histories.length === 0) {
        return (
            <div className={`rounded-2xl border border-[#DCEAF8] bg-white p-4 shadow-sm dark:border-[#1E3A5F] dark:bg-[#0B1E36] ${className}`}>
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F0F7FF] text-[#0060F4] dark:bg-[#102B4A] dark:text-[#38BDF8]">
                        <Clock className="size-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-[#0B1F63] dark:text-white">
                            Riwayat Pengajuan & Keputusan
                        </h4>
                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                            Belum ada riwayat aktivitas pengajuan baru yang tercatat untuk {requestNumber || 'pengajuan ini'}.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <section
            className={`overflow-hidden rounded-2xl border border-[#DCEAF8] bg-white shadow-sm transition-all dark:border-[#1E3A5F] dark:bg-[#0B1E36] ${className}`}
        >
            {/* Header Accordion */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex cursor-pointer select-none items-center justify-between border-b border-[#DCEAF8] bg-[#F8FBFF] px-4 py-3.5 hover:bg-[#F0F7FF] dark:border-[#1E3A5F] dark:bg-[#0E223F] dark:hover:bg-[#122A4E]"
            >
                <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0060F4] text-white shadow-sm">
                        <Clock className="size-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#0B1F63] dark:text-white">
                                Riwayat Pengajuan & Keputusan Direktur
                            </h3>
                            <span className="rounded-full bg-[#E0F0FF] px-2 py-0.5 text-[11px] font-bold text-[#0060F4] dark:bg-[#102B4A] dark:text-[#38BDF8]">
                                {histories.length} Aktivitas
                            </span>
                        </div>
                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                            Histori kronologis proses pengajuan Bu Titik (Admin) dan keputusan Pak Ryan (Direktur)
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-lg border border-[#DCEAF8] bg-white text-[#52658E] hover:text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#94A3B8] dark:hover:text-white"
                    aria-label="Toggle Riwayat"
                >
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
            </div>

            {/* Timeline Content */}
            {isExpanded && (
                <div className="p-4 sm:p-5">
                    <div className="relative pl-6 before:absolute before:bottom-3 before:left-2.5 before:top-3 before:w-0.5 before:bg-[#DCEAF8] dark:before:bg-[#1E3A5F]">
                        {histories.map((history, idx) => {
                            const isDirector =
                                history.actor_role?.toLowerCase().includes('direktur') ||
                                history.actor_name?.toLowerCase().includes('ryan');
                            const isApproved = history.action === 'director_approved';
                            const isPartial = history.action === 'director_partial_approval';
                            const isRejected = history.action === 'director_rejected';
                            const isResubmission = history.action === 'resubmitted_to_director';

                            let icon = <Send className="size-3.5 text-[#0060F4]" />;
                            let iconBg = 'bg-[#E0F0FF] border-[#0060F4]/30 dark:bg-[#102B4A] dark:border-[#38BDF8]/40';

                            if (isApproved) {
                                icon = <CheckCircle2 className="size-3.5 text-[#087443] dark:text-[#34D399]" />;
                                iconBg = 'bg-[#DCF7E8] border-[#087443]/30 dark:bg-emerald-950/60 dark:border-emerald-700/50';
                            } else if (isPartial) {
                                icon = <AlertTriangle className="size-3.5 text-[#A65300] dark:text-[#FBBF24]" />;
                                iconBg = 'bg-[#FFF0CC] border-[#A65300]/30 dark:bg-amber-950/60 dark:border-amber-700/50';
                            } else if (isRejected) {
                                icon = <XCircle className="size-3.5 text-[#C62840] dark:text-[#F87171]" />;
                                iconBg = 'bg-[#FFE7EC] border-[#C62840]/30 dark:bg-rose-950/60 dark:border-rose-700/50';
                            } else if (isResubmission) {
                                icon = <RotateCcw className="size-3.5 text-[#0060F4] dark:text-[#38BDF8]" />;
                                iconBg = 'bg-[#E0F0FF] border-[#0060F4]/30 dark:bg-[#102B4A] dark:border-[#38BDF8]/40';
                            }

                            return (
                                <div key={history.id || idx} className="relative mb-6 last:mb-0">
                                    {/* Timeline Marker Dot */}
                                    <div
                                        className={`absolute -left-[31px] top-1 flex size-6 items-center justify-center rounded-full border ${iconBg} shadow-sm`}
                                    >
                                        {icon}
                                    </div>

                                    {/* Event Card */}
                                    <div className="rounded-xl border border-[#DCEAF8] bg-[#FDFEFE] p-3.5 shadow-sm transition-all hover:border-[#B7D7FF] dark:border-[#1E3A5F] dark:bg-[#071322] dark:hover:border-[#2D5A94]">
                                        {/* Card Header */}
                                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-sm font-bold text-[#0B1F63] dark:text-white">
                                                    {history.title}
                                                </h4>
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                        isDirector
                                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                                    }`}
                                                >
                                                    <User className="size-3" />
                                                    {history.actor_name || (isDirector ? 'Pak Ryan' : 'Bu Titik')} (
                                                    {history.actor_role || (isDirector ? 'Direktur' : 'Admin')})
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                <Calendar className="size-3.5 text-[#0060F4] dark:text-[#38BDF8]" />
                                                <span className="font-medium">
                                                    {formatDateIndo(history.action_date || history.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Specific Submission Date callout if different/specified */}
                                        {history.submission_date && (
                                            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#0060F4] dark:text-[#38BDF8]">
                                                <span>📅 Tanggal Pengajuan ke Direktur:</span>
                                                <span className="font-bold underline decoration-blue-300">
                                                    {formatDateOnly(history.submission_date)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {history.notes && (
                                            <div className="mt-2.5 rounded-lg border border-[#DCEAF8] bg-[#F8FBFF] px-3 py-2 text-xs text-[#334155] dark:border-[#1E3A5F] dark:bg-[#0E223F] dark:text-[#CBD5E1]">
                                                <div className="flex items-start gap-1.5">
                                                    <span className="font-bold text-[#0B1F63] dark:text-white shrink-0">
                                                        💬 Catatan:
                                                    </span>
                                                    <span className="italic">{history.notes}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Items Snapshot Breakdown */}
                                        {history.items_snapshot && history.items_snapshot.length > 0 && (
                                            <div className="mt-3 overflow-hidden rounded-lg border border-[#E2E8F0] dark:border-[#1E3A5F]">
                                                <div className="bg-[#F1F5F9] px-2.5 py-1.5 text-[11px] font-bold text-[#475569] dark:bg-[#0F2942] dark:text-[#94A3B8]">
                                                    Daftar Item pada Tahap Ini ({history.items_snapshot.length} Item)
                                                </div>
                                                <div className="divide-y divide-[#E2E8F0] bg-white text-xs dark:divide-[#1E3A5F] dark:bg-[#071322]">
                                                    {history.items_snapshot.map((snap, sIdx) => {
                                                        const snapApproved = snap.director_status === 'approved' || snap.status === 'disetujui';
                                                        const snapRejected = snap.director_status === 'rejected' || snap.status === 'ditolak';
                                                        const snapReturned = snap.director_status === 'pending' && snap.status === 'pending';

                                                        return (
                                                            <div
                                                                key={snap.item_id || sIdx}
                                                                className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <FileText className="size-3.5 shrink-0 text-[#52658E]" />
                                                                        <span className="font-bold text-[#0B1F63] dark:text-white">
                                                                            {snap.item_name}
                                                                        </span>
                                                                        <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                                            ({snap.quantity} {snap.unit || 'Item'})
                                                                        </span>
                                                                    </div>
                                                                    {snap.director_notes && (
                                                                        <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                                                                            Catatan Direktur: {snap.director_notes}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center justify-between gap-3 sm:justify-end">
                                                                    <span className="font-mono font-bold text-[#0B1F63] dark:text-white">
                                                                        {formatRupiah(Number(snap.hpp_price) * Number(snap.quantity))}
                                                                    </span>

                                                                    {snapApproved && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#DCF7E8] px-2 py-0.5 text-[10.5px] font-bold text-[#087443] dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                            <CheckCircle2 className="size-3" />
                                                                            Disetujui Pak Ryan
                                                                        </span>
                                                                    )}
                                                                    {snapReturned && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0CC] px-2 py-0.5 text-[10.5px] font-bold text-[#A65300] dark:bg-amber-950/60 dark:text-amber-300">
                                                                            <AlertTriangle className="size-3" />
                                                                            Dikembalikan ke Bu Titik
                                                                        </span>
                                                                    )}
                                                                    {snapRejected && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFE7EC] px-2 py-0.5 text-[10.5px] font-bold text-[#C62840] dark:bg-rose-950/60 dark:text-rose-300">
                                                                            <XCircle className="size-3" />
                                                                            Ditolak Pak Ryan
                                                                        </span>
                                                                    )}
                                                                    {!snapApproved && !snapReturned && !snapRejected && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E0F0FF] px-2 py-0.5 text-[10.5px] font-bold text-[#0060F4] dark:bg-[#102B4A] dark:text-[#38BDF8]">
                                                                            <Send className="size-3" />
                                                                            Diajukan
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
};

