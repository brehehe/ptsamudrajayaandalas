import React from 'react';

export type StatusType =
    | 'info'
    | 'waiting'
    | 'success'
    | 'processing'
    | 'danger'
    | 'inactive'
    | 'akan_datang'
    | 'labuh'
    | 'sandar'
    | 'selesai'
    | 'menunggu_approval'
    | 'dalam_proses'
    | 'perlu_tindakan'
    | 'ditolak'
    | 'nonaktif';

export interface StatusBadgeProps {
    status?: string | StatusType;
    label?: string;
    showDot?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status = 'info',
    label,
    showDot = false,
    size = 'md',
    className = '',
}) => {
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
    }[size];
    const normalizeStatus = (value?: string) => (value || '').toLowerCase().replace(/[\s-]+/g, '_');
    const normalized = normalizeStatus(status);
    const semanticStatus = `${normalized} ${normalizeStatus(label)}`;
    const isRejected = ['tolak', 'reject', 'declin', 'deni', 'tidak_disetujui']
        .some((marker) => semanticStatus.includes(marker));

    let bg = 'bg-[#E0F0FF] dark:bg-[#0060F4]/20 border border-transparent dark:border-[#0060F4]/30';
    let text = 'text-[#0057D9] dark:text-[#60A5FA]';
    let dot = 'bg-[#0057D9] dark:bg-[#60A5FA]';
    let displayLabel = label;

    if (
        isRejected ||
        normalized.includes('perlu') ||
        normalized.includes('bahaya') ||
        normalized.includes('terlambat') ||
        normalized === 'danger'
    ) {
        bg = 'bg-[#FFE7EC] dark:bg-[#EF4444]/20 border border-transparent dark:border-[#EF4444]/30';
        text = 'text-[#C62840] dark:text-[#F87171]';
        dot = 'bg-[#C62840] dark:bg-[#F87171]';
        displayLabel = displayLabel || (isRejected ? 'Ditolak' : 'Perlu Tindakan');
    } else if (
        normalized.includes('batal') ||
        normalized.includes('nonaktif') ||
        normalized === 'inactive'
    ) {
        bg = 'bg-[#EDF2F7] dark:bg-[#64748B]/20 border border-transparent dark:border-[#64748B]/30';
        text = 'text-[#526580] dark:text-[#94A3B8]';
        dot = 'bg-[#526580] dark:bg-[#94A3B8]';
        displayLabel = displayLabel || 'Nonaktif';
    } else if (normalized.includes('akan_datang') || normalized === 'info') {
        bg = 'bg-[#E0F0FF] dark:bg-[#0060F4]/20 border border-transparent dark:border-[#0060F4]/30';
        text = 'text-[#0057D9] dark:text-[#60A5FA]';
        dot = 'bg-[#0057D9] dark:bg-[#60A5FA]';
        displayLabel = displayLabel || 'Akan Datang';
    } else if (
        normalized.includes('labuh') ||
        normalized.includes('menunggu') ||
        normalized === 'waiting'
    ) {
        bg = 'bg-[#FFF0CC] dark:bg-[#F59E0B]/20 border border-transparent dark:border-[#F59E0B]/30';
        text = 'text-[#A65300] dark:text-[#FBBF24]';
        dot = 'bg-[#A65300] dark:bg-[#FBBF24]';
        displayLabel = displayLabel || 'Labuh';
    } else if (
        normalized.includes('sandar') ||
        normalized.includes('selesai') ||
        normalized.includes('disetujui') ||
        normalized.includes('aktif') ||
        normalized === 'success'
    ) {
        bg = 'bg-[#DCF7E8] dark:bg-[#10B981]/20 border border-transparent dark:border-[#10B981]/30';
        text = 'text-[#087443] dark:text-[#34D399]';
        dot = 'bg-[#087443] dark:bg-[#34D399]';
        displayLabel = displayLabel || 'Sandar';
    } else if (
        normalized.includes('proses') ||
        normalized.includes('vendor') ||
        normalized.includes('berangkat') ||
        normalized === 'processing'
    ) {
        bg = 'bg-[#EFE7FF] dark:bg-[#8B5CF6]/20 border border-transparent dark:border-[#8B5CF6]/30';
        text = 'text-[#6840BB] dark:text-[#C084FC]';
        dot = 'bg-[#6840BB] dark:bg-[#C084FC]';
        displayLabel =
            displayLabel || (normalized.includes('berangkat') ? 'Berangkat' : 'Dalam Proses');
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap ${sizeClasses} rounded-full font-semibold tracking-wide ${bg} ${text} ${className}`}
        >
            {showDot && <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />}
            {displayLabel || status}
        </span>
    );
};

export default StatusBadge;
