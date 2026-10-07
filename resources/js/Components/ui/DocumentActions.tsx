import React from 'react';
import { Download, Eye } from 'lucide-react';

interface DocumentActionsProps {
    viewHref: string;
    downloadHref: string;
    viewLabel?: string;
    downloadLabel?: string;
    className?: string;
}

const actionClassName =
    'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] ' +
    'border border-[#DCEAF8] bg-white px-3 text-xs font-semibold text-[#0B1F63] ' +
    'transition-colors hover:border-[#0060F4] hover:bg-[#F0F8FF] hover:text-[#0060F4] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 ' +
    'focus-visible:ring-offset-2 dark:border-[#1E3A5F] dark:bg-[#0C1D36] ' +
    'dark:text-[#F1F5F9] dark:hover:border-[#38BDF8] dark:hover:bg-[#132847]';

export default function DocumentActions({
    viewHref,
    downloadHref,
    viewLabel = 'Lihat',
    downloadLabel = 'Unduh',
    className = '',
}: DocumentActionsProps) {
    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            <a
                href={viewHref}
                target="_blank"
                rel="noreferrer"
                className={actionClassName}
            >
                <Eye aria-hidden="true" className="size-3.5" />
                {viewLabel}
            </a>
            <a
                href={downloadHref}
                className={actionClassName}
            >
                <Download aria-hidden="true" className="size-3.5" />
                {downloadLabel}
            </a>
        </div>
    );
}
