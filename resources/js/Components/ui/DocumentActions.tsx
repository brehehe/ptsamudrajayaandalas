import React, { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import FileViewer from './FileViewer';

interface DocumentActionsProps {
    viewHref: string;
    downloadHref: string;
    viewLabel?: string;
    downloadLabel?: string;
    layout?: 'wrap' | 'paired';
    className?: string;
    fileName?: string;
    useModal?: boolean;
}

const actionClassName =
    'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] ' +
    'border border-[#DCEAF8] bg-white px-3 text-xs font-semibold text-[#0B1F63] ' +
    'transition-colors hover:border-[#0060F4] hover:bg-[#F0F8FF] hover:text-[#0060F4] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 ' +
    'focus-visible:ring-offset-2 dark:border-[#1E3A5F] dark:bg-[#0C1D36] ' +
    'dark:text-[#F1F5F9] dark:hover:border-[#38BDF8] dark:hover:bg-[#132847] cursor-pointer';

export default function DocumentActions({
    viewHref,
    downloadHref,
    viewLabel = 'Lihat',
    downloadLabel = 'Unduh',
    layout = 'wrap',
    className = '',
    fileName,
    useModal = true,
}: DocumentActionsProps) {
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    return (
        <>
            <div
                className={`${layout === 'paired' ? 'grid grid-cols-2' : 'flex flex-wrap items-center'} gap-1.5 ${className}`}
            >
                {useModal ? (
                    <button
                        type="button"
                        onClick={() => setIsViewerOpen(true)}
                        className={actionClassName}
                        title={`Pratinjau ${viewLabel}`}
                    >
                        <Eye aria-hidden="true" className="size-3.5" />
                        {viewLabel}
                    </button>
                ) : (
                    <a
                        href={viewHref}
                        target="_blank"
                        rel="noreferrer"
                        className={actionClassName}
                    >
                        <Eye aria-hidden="true" className="size-3.5" />
                        {viewLabel}
                    </a>
                )}
                <a
                    href={downloadHref}
                    download={fileName || true}
                    className={actionClassName}
                >
                    <Download aria-hidden="true" className="size-3.5" />
                    {downloadLabel}
                </a>
            </div>

            {useModal && (
                <FileViewer
                    isOpen={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    url={viewHref}
                    downloadUrl={downloadHref}
                    title={viewLabel}
                    fileName={fileName}
                />
            )}
        </>
    );
}
