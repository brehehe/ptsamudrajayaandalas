import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
    Check,
    Copy,
    Download,
    ExternalLink,
    File,
    FileCode,
    FileSpreadsheet,
    FileText,
    Image as ImageIcon,
    RefreshCw,
    RotateCw,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';

export type SupportedFileType = 'image' | 'pdf' | 'word' | 'excel' | 'text' | 'document';

export interface FileViewerProps {
    isOpen: boolean;
    onClose: () => void;
    url?: string | null;
    title?: string | null;
    fileName?: string | null;
    fileType?: SupportedFileType | 'auto';
    downloadUrl?: string | null;
}

export function detectFileType(
    url?: string | null,
    fileName?: string | null,
    explicitType?: string | null
): SupportedFileType {
    if (explicitType && explicitType !== 'auto') {
        return explicitType as SupportedFileType;
    }

    const target = (fileName || url || '').toLowerCase().split('?')[0];

    if (/\.(jpg|jpeg|png|webp|gif|svg|bmp|ico)$/i.test(target)) return 'image';
    if (/\.pdf$/i.test(target) || target.includes('/generated-document')) return 'pdf';
    if (/\.(doc|docx|dot|dotx|odt|rtf)$/i.test(target)) return 'word';
    if (/\.(xls|xlsx|ods)$/i.test(target)) return 'excel';
    if (/\.(csv|txt|log|json|xml|html|md)$/i.test(target)) return 'text';

    // If path is an item attachment or supplier invoice without extension, check keywords
    if (target.includes('image') || target.includes('photo')) return 'image';

    return 'pdf'; // Default document preview is PDF/iframe
}

export default function FileViewer({
    isOpen,
    onClose,
    url,
    title,
    fileName,
    fileType = 'auto',
    downloadUrl,
}: FileViewerProps) {
    const shouldReduceMotion = useReducedMotion();
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);

    // Image Zoom & Rotation state
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    // Text file content state (for .txt / .csv / .json)
    const [textContent, setTextContent] = useState<string | null>(null);
    const [textLoading, setTextLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Determine effective type
    const resolvedType = useMemo(
        () => detectFileType(url, fileName || title, fileType),
        [url, fileName, title, fileType]
    );

    // Effective download link
    const effectiveDownloadUrl = useMemo(() => {
        if (downloadUrl) return downloadUrl;
        if (!url) return '#';
        if (url.includes('?')) {
            return `${url}&download=1`;
        }
        return `${url}?download=1`;
    }, [downloadUrl, url]);

    // Effective display title / filename
    const displayTitle = useMemo(() => {
        if (title) return title;
        if (fileName) return fileName;
        if (url) {
            const parts = url.split('?')[0].split('/');
            return decodeURIComponent(parts[parts.length - 1] || 'Dokumen');
        }
        return 'Pratinjau Dokumen';
    }, [title, fileName, url]);

    // Reset zoom and rotation when modal opens or url changes
    useEffect(() => {
        if (isOpen) {
            setZoom(1);
            setRotation(0);
            setImageLoading(true);
            setImageError(false);
            setTextContent(null);
        }
    }, [isOpen, url]);

    // Handle text fetching for .txt, .csv, .json, .log
    useEffect(() => {
        if (isOpen && resolvedType === 'text' && url) {
            setTextLoading(true);
            fetch(url)
                .then((res) => (res.ok ? res.text() : Promise.reject(new Error('Gagal memuat teks'))))
                .then((txt) => {
                    setTextContent(txt);
                    setTextLoading(false);
                })
                .catch(() => {
                    setTextLoading(false);
                });
        }
    }, [isOpen, resolvedType, url]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Handle Body Scroll Lock
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    if (typeof document === 'undefined') {
        return null;
    }

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.25));
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
    const handleResetZoom = () => {
        setZoom(1);
        setRotation(0);
    };

    const handleCopyText = () => {
        if (textContent) {
            navigator.clipboard.writeText(textContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isPublicHttpUrl = (testUrl?: string | null): boolean => {
        if (!testUrl) return false;
        return (
            testUrl.startsWith('http') &&
            !testUrl.includes('localhost') &&
            !testUrl.includes('127.0.0.1')
        );
    };

    // Header badge & icon styling
    const typeMeta = {
        image: {
            label: 'Gambar',
            badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
            icon: <ImageIcon className="size-4 text-sky-600 dark:text-sky-400" />,
        },
        pdf: {
            label: 'PDF',
            badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
            icon: <FileText className="size-4 text-rose-600 dark:text-rose-400" />,
        },
        word: {
            label: 'Word',
            badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
            icon: <FileText className="size-4 text-blue-600 dark:text-blue-400" />,
        },
        excel: {
            label: 'Excel',
            badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            icon: <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />,
        },
        text: {
            label: 'Teks / CSV',
            badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            icon: <FileCode className="size-4 text-amber-600 dark:text-amber-400" />,
        },
        document: {
            label: 'Dokumen',
            badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
            icon: <File className="size-4 text-indigo-600 dark:text-indigo-400" />,
        },
    }[resolvedType];

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-70 overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                        className="fixed inset-0 bg-[#071322]/80 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Modal Window */}
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        tabIndex={-1}
                        initial={
                            shouldReduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 0.96, y: 12 }
                        }
                        animate={
                            shouldReduceMotion
                                ? { opacity: 1 }
                                : { opacity: 1, scale: 1, y: 0 }
                        }
                        exit={
                            shouldReduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 0.96, y: 12 }
                        }
                        transition={{
                            type: 'spring',
                            damping: 28,
                            stiffness: 340,
                        }}
                        className="relative z-10 flex flex-col w-full max-w-5xl h-[92vh] sm:h-[88vh] rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-[#0B1E36] dark:ring-white/10 overflow-hidden"
                    >
                        {/* Top Bar / Header */}
                        <div className="flex items-center justify-between gap-3 border-b border-[#DCEAF8] px-4 py-3 dark:border-[#1E3A5F] bg-[#F8FBFF] dark:bg-[#08172B] shrink-0">
                            {/* Left: File Title & Type */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="shrink-0 p-1.5 rounded-lg bg-white shadow-sm ring-1 ring-[#DCEAF8] dark:bg-[#0C1D36] dark:ring-[#1E3A5F]">
                                    {typeMeta.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3
                                            id={titleId}
                                            className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9] truncate"
                                            title={displayTitle}
                                        >
                                            {displayTitle}
                                        </h3>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shrink-0 ${typeMeta.badgeClass}`}
                                        >
                                            {typeMeta.label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] truncate hidden sm:block">
                                        Pratinjau langsung • Klik Tutup atau tekan ESC untuk kembali
                                    </p>
                                </div>
                            </div>

                            {/* Right: Actions & Controls */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                {/* Image-specific controls */}
                                {resolvedType === 'image' && (
                                    <div className="flex items-center gap-1 bg-white dark:bg-[#0C1D36] p-1 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                        <button
                                            type="button"
                                            onClick={handleZoomIn}
                                            aria-label="Perbesar"
                                            title="Perbesar (Zoom In)"
                                            className="p-1.5 rounded-lg text-[#52658E] hover:text-[#0060F4] hover:bg-[#F0F8FF] dark:text-[#94A3B8] dark:hover:text-[#38BDF8] dark:hover:bg-[#132847]"
                                        >
                                            <ZoomIn className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleZoomOut}
                                            aria-label="Perkecil"
                                            title="Perkecil (Zoom Out)"
                                            className="p-1.5 rounded-lg text-[#52658E] hover:text-[#0060F4] hover:bg-[#F0F8FF] dark:text-[#94A3B8] dark:hover:text-[#38BDF8] dark:hover:bg-[#132847]"
                                        >
                                            <ZoomOut className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRotate}
                                            aria-label="Putar 90 Derajat"
                                            title="Putar 90°"
                                            className="p-1.5 rounded-lg text-[#52658E] hover:text-[#0060F4] hover:bg-[#F0F8FF] dark:text-[#94A3B8] dark:hover:text-[#38BDF8] dark:hover:bg-[#132847]"
                                        >
                                            <RotateCw className="size-4" />
                                        </button>
                                        {zoom !== 1 && (
                                            <button
                                                type="button"
                                                onClick={handleResetZoom}
                                                aria-label="Reset Ukuran"
                                                title="Reset Zoom"
                                                className="p-1.5 rounded-lg text-xs font-semibold text-[#52658E] hover:text-[#0060F4] hover:bg-[#F0F8FF] dark:text-[#94A3B8]"
                                            >
                                                <RefreshCw className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Download Action */}
                                <a
                                    href={effectiveDownloadUrl}
                                    download={fileName || true}
                                    aria-label="Unduh file"
                                    title="Unduh File Ini"
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#DCEAF8] bg-white px-2.5 sm:px-3 text-xs font-semibold text-[#0B1F63] shadow-sm hover:border-[#0060F4] hover:bg-[#F0F8FF] hover:text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9] dark:hover:border-[#38BDF8] dark:hover:bg-[#132847]"
                                >
                                    <Download className="size-3.5" />
                                    <span className="hidden sm:inline">Unduh</span>
                                </a>

                                {/* External Tab */}
                                {url && (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label="Buka di tab baru"
                                        title="Buka Dokumen di Tab Baru"
                                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#DCEAF8] bg-white px-2.5 sm:px-3 text-xs font-semibold text-[#52658E] shadow-sm hover:border-[#0060F4] hover:bg-[#F0F8FF] hover:text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#94A3B8] dark:hover:border-[#38BDF8]"
                                    >
                                        <ExternalLink className="size-3.5" />
                                        <span className="hidden md:inline">Tab Baru</span>
                                    </a>
                                )}

                                {/* Close button */}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Tutup pratinjau"
                                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl bg-white text-[#52658E] hover:bg-rose-50 hover:text-rose-600 border border-[#DCEAF8] shadow-sm transition dark:bg-[#0C1D36] dark:border-[#1E3A5F] dark:text-[#94A3B8] dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Viewer Body Canvas */}
                        <div className="relative flex-1 w-full h-full overflow-auto bg-[#F4F8FC] dark:bg-[#06111E] flex flex-col items-center justify-center p-2 sm:p-4">
                            {/* CASE 1: IMAGE VIEWER */}
                            {resolvedType === 'image' && (
                                <div className="relative w-full h-full flex items-center justify-center overflow-auto select-none">
                                    {imageLoading && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F4F8FC]/80 dark:bg-[#06111E]/80">
                                            <div className="size-8 animate-spin rounded-full border-3 border-[#0060F4] border-t-transparent" />
                                            <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                                Memuat gambar...
                                            </p>
                                        </div>
                                    )}

                                    {imageError ? (
                                        <div className="text-center p-6 bg-white dark:bg-[#0C1D36] rounded-2xl border border-rose-200 dark:border-rose-900 shadow-sm max-w-sm">
                                            <ImageIcon className="size-10 text-rose-500 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                                                Gambar tidak dapat ditampilkan
                                            </p>
                                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1 mb-4">
                                                File mungkin telah dipindahkan atau format tidak didukung browser.
                                            </p>
                                            <a
                                                href={effectiveDownloadUrl}
                                                download
                                                className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#0060F4] px-4 text-xs font-bold text-white shadow hover:bg-[#0050D0]"
                                            >
                                                <Download className="size-3.5" />
                                                Unduh File
                                            </a>
                                        </div>
                                    ) : (
                                        url && (
                                            <div
                                                className="transition-transform duration-200 ease-out flex items-center justify-center"
                                                style={{
                                                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                                }}
                                            >
                                                <img
                                                    src={url}
                                                    alt={displayTitle}
                                                    onLoad={() => setImageLoading(false)}
                                                    onError={() => {
                                                        setImageLoading(false);
                                                        setImageError(true);
                                                    }}
                                                    className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-md"
                                                />
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                            {/* CASE 2: PDF VIEWER */}
                            {resolvedType === 'pdf' && url && (
                                <div className="w-full h-full flex flex-col">
                                    <iframe
                                        src={url}
                                        title={displayTitle}
                                        className="w-full h-full flex-1 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white shadow-inner"
                                    />
                                    <div className="mt-2 text-center text-[11px] text-[#52658E] dark:text-[#94A3B8] shrink-0">
                                        Jika pratinjau PDF tidak tampil di browser Anda, silakan{' '}
                                        <a
                                            href={effectiveDownloadUrl}
                                            download
                                            className="font-bold text-[#0060F4] hover:underline dark:text-[#38BDF8]"
                                        >
                                            unduh dokumen
                                        </a>{' '}
                                        atau{' '}
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-bold text-[#0060F4] hover:underline dark:text-[#38BDF8]"
                                        >
                                            buka di tab baru
                                        </a>
                                        .
                                    </div>
                                </div>
                            )}

                            {/* CASE 3: WORD DOCUMENT (.docx / .doc) */}
                            {resolvedType === 'word' && (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                    {isPublicHttpUrl(url) ? (
                                        <iframe
                                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url!)}`}
                                            title={displayTitle}
                                            className="w-full h-full flex-1 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white shadow-inner"
                                        />
                                    ) : (
                                        <div className="w-full max-w-lg rounded-2xl border border-blue-200 bg-white p-6 shadow-xl dark:border-blue-900/60 dark:bg-[#0C1D36] text-center">
                                            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                                                <FileText className="size-8" />
                                            </div>
                                            <h4 className="mt-4 text-base font-extrabold text-[#0B1F63] dark:text-white">
                                                {displayTitle}
                                            </h4>
                                            <span className="mt-1 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                                Microsoft Word Document
                                            </span>
                                            <p className="mt-3 text-xs leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                                                Dokumen Word dapat dibuka secara langsung atau diunduh untuk diedit di komputer Anda.
                                            </p>
                                            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                                                <a
                                                    href={effectiveDownloadUrl}
                                                    download
                                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0060F4] px-4 text-xs font-bold text-white shadow-md hover:bg-[#0050D0]"
                                                >
                                                    <Download className="size-4" />
                                                    Unduh Dokumen Word
                                                </a>
                                                {url && (
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DCEAF8] bg-white px-4 text-xs font-semibold text-[#0B1F63] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#08172B] dark:text-white"
                                                    >
                                                        <ExternalLink className="size-4" />
                                                        Buka File
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CASE 4: EXCEL SPREADSHEET (.xlsx / .xls / .ods) */}
                            {resolvedType === 'excel' && (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                    {isPublicHttpUrl(url) ? (
                                        <iframe
                                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url!)}`}
                                            title={displayTitle}
                                            className="w-full h-full flex-1 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white shadow-inner"
                                        />
                                    ) : (
                                        <div className="w-full max-w-lg rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl dark:border-emerald-900/60 dark:bg-[#0C1D36] text-center">
                                            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                                                <FileSpreadsheet className="size-8" />
                                            </div>
                                            <h4 className="mt-4 text-base font-extrabold text-[#0B1F63] dark:text-white">
                                                {displayTitle}
                                            </h4>
                                            <span className="mt-1 inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                Microsoft Excel Spreadsheet
                                            </span>
                                            <p className="mt-3 text-xs leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                                                Lembar kerja Excel dapat dibuka langsung di aplikasi spreadsheet atau diunduh ke perangkat Anda.
                                            </p>
                                            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                                                <a
                                                    href={effectiveDownloadUrl}
                                                    download
                                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                                                >
                                                    <Download className="size-4" />
                                                    Unduh Lembar Kerja Excel
                                                </a>
                                                {url && (
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DCEAF8] bg-white px-4 text-xs font-semibold text-[#0B1F63] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#08172B] dark:text-white"
                                                    >
                                                        <ExternalLink className="size-4" />
                                                        Buka File
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CASE 5: TEXT / CSV VIEWER */}
                            {resolvedType === 'text' && (
                                <div className="w-full h-full flex flex-col p-2">
                                    <div className="flex items-center justify-between pb-2 px-1">
                                        <span className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                            Pratinjau Isi Dokumen Teks / CSV
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyText}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0060F4] hover:underline dark:text-[#38BDF8]"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="size-3.5 text-emerald-500" /> Tersalin!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="size-3.5" /> Salin Teks
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex-1 w-full overflow-auto rounded-xl border border-[#DCEAF8] bg-white p-4 font-mono text-xs text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#E2E8F0] shadow-inner">
                                        {textLoading ? (
                                            <div className="flex h-full items-center justify-center">
                                                <div className="size-6 animate-spin rounded-full border-2 border-[#0060F4] border-t-transparent" />
                                            </div>
                                        ) : textContent !== null ? (
                                            <pre className="whitespace-pre-wrap break-all leading-relaxed">
                                                {textContent}
                                            </pre>
                                        ) : (
                                            <iframe
                                                src={url!}
                                                title={displayTitle}
                                                className="w-full h-full border-0"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CASE 6: GENERIC DOCUMENT */}
                            {resolvedType === 'document' && (
                                <div className="w-full max-w-lg rounded-2xl border border-[#DCEAF8] bg-white p-6 shadow-xl dark:border-[#1E3A5F] dark:bg-[#0C1D36] text-center">
                                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                        <File className="size-8" />
                                    </div>
                                    <h4 className="mt-4 text-base font-extrabold text-[#0B1F63] dark:text-white">
                                        {displayTitle}
                                    </h4>
                                    <span className="mt-1 inline-block rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                                        Dokumen Lampiran
                                    </span>
                                    <p className="mt-3 text-xs leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                                        File ini dapat diunduh atau dibuka langsung melalui aplikasi perangkat Anda.
                                    </p>
                                    <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                                        <a
                                            href={effectiveDownloadUrl}
                                            download
                                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0060F4] px-4 text-xs font-bold text-white shadow-md hover:bg-[#0050D0]"
                                        >
                                            <Download className="size-4" />
                                            Unduh Dokumen
                                        </a>
                                        {url && (
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DCEAF8] bg-white px-4 text-xs font-semibold text-[#0B1F63] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#08172B] dark:text-white"
                                            >
                                                <ExternalLink className="size-4" />
                                                Buka di Tab Baru
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Status Bar */}
                        <div className="flex items-center justify-between border-t border-[#DCEAF8] px-4 py-2.5 dark:border-[#1E3A5F] bg-[#F8FBFF] dark:bg-[#08172B] text-[11px] text-[#52658E] dark:text-[#94A3B8] shrink-0">
                            <span className="truncate max-w-[60%] font-mono text-[10px]">
                                {url || 'Lampiran Dokumen'}
                            </span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="font-bold text-[#0060F4] hover:underline dark:text-[#38BDF8]"
                            >
                                Tutup Pratinjau (ESC)
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

/**
 * Convenient React hook to manage FileViewer state anywhere
 */
export interface FileViewerState {
    isOpen: boolean;
    url: string | null;
    title?: string | null;
    fileName?: string | null;
    fileType?: SupportedFileType | 'auto';
    downloadUrl?: string | null;
}

export function useFileViewer() {
    const [state, setState] = useState<FileViewerState>({
        isOpen: false,
        url: null,
    });

    const openFile = (file: Omit<FileViewerState, 'isOpen'>) => {
        setState({
            isOpen: true,
            url: file.url,
            title: file.title,
            fileName: file.fileName,
            fileType: file.fileType,
            downloadUrl: file.downloadUrl,
        });
    };

    const closeFile = () => {
        setState((prev) => ({ ...prev, isOpen: false }));
    };

    return {
        fileViewerProps: {
            isOpen: state.isOpen,
            onClose: closeFile,
            url: state.url,
            title: state.title,
            fileName: state.fileName,
            fileType: state.fileType,
            downloadUrl: state.downloadUrl,
        },
        openFile,
        closeFile,
        isOpen: state.isOpen,
    };
}

export interface FileViewerTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
    url?: string | null;
    title?: string | null;
    fileName?: string | null;
    fileType?: SupportedFileType | 'auto';
    downloadUrl?: string | null;
    children: React.ReactNode;
    className?: string;
}

export function FileViewerTrigger({
    url,
    title,
    fileName,
    fileType = 'auto',
    downloadUrl,
    children,
    className,
    onClick,
    ...buttonProps
}: FileViewerTriggerProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!url) return null;

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    onClick?.(e);
                    if (!e.defaultPrevented) {
                        setIsOpen(true);
                    }
                }}
                className={className}
                {...buttonProps}
            >
                {children}
            </button>
            <FileViewer
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                url={url}
                title={title}
                fileName={fileName}
                fileType={fileType}
                downloadUrl={downloadUrl}
            />
        </>
    );
}
