import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, X, AlertCircle } from 'lucide-react';
import Modal from '../overlays/Modal';
import Button from '../ui/Button';

export interface ExportParams {
    report_type: string;
    format: 'pdf' | 'xlsx';
    parameters?: Record<string, any>;
    job_number?: string;
    label?: string;
}

export function useReportExport() {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [filename, setFilename] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeExport, setActiveExport] = useState<ExportParams | null>(null);

    const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pollCountRef = useRef(0);

    const cleanup = () => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
        pollCountRef.current = 0;
    };

    useEffect(() => {
        return cleanup;
    }, []);

    const triggerDownload = (url: string, suggestedFilename?: string) => {
        const link = document.createElement('a');
        link.href = url;
        if (suggestedFilename) {
            link.setAttribute('download', suggestedFilename);
        } else {
            link.setAttribute('download', '');
        }
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const pollStatus = async (exportId: string) => {
        pollCountRef.current++;
        try {
            const res = await fetch(`/reports/exports/${exportId}/status`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!res.ok) {
                throw new Error('Gagal memeriksa status pembuatan dokumen.');
            }

            const data = await res.json();

            if (data.status === 'completed' && data.download_url) {
                const targetFilename = data.filename || 'dokumen-laporan';
                setStatus('completed');
                setIsProcessing(false);
                setDownloadUrl(data.download_url);
                setFilename(targetFilename);
                cleanup();

                // Trigger automatic download
                triggerDownload(data.download_url, targetFilename);
            } else if (data.status === 'failed') {
                setStatus('failed');
                setIsProcessing(false);
                setErrorMessage(data.error || 'Terjadi kesalahan saat membuat dokumen.');
                cleanup();
            } else {
                // Still pending or processing, poll again
                setStatus('processing');
                if (pollCountRef.current < 60) { // max 60s
                    pollTimerRef.current = setTimeout(() => pollStatus(exportId), 1000);
                } else {
                    setStatus('failed');
                    setIsProcessing(false);
                    setErrorMessage('Waktu tunggu proses pembuatan dokumen habis. Silakan coba kembali.');
                    cleanup();
                }
            }
        } catch (err: any) {
            setStatus('failed');
            setIsProcessing(false);
            setErrorMessage(err?.message || 'Gagal terhubung dengan server.');
            cleanup();
        }
    };

    const startExport = async (params: ExportParams) => {
        cleanup();
        setActiveExport(params);
        setIsOpen(true);
        setIsProcessing(true);
        setStatus('pending');
        setDownloadUrl(null);
        setErrorMessage(null);

        try {
            // Get CSRF token
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const res = await fetch('/reports/exports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    report_type: params.report_type,
                    format: params.format,
                    parameters: params.parameters || {},
                    job_number: params.job_number || null,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal memulai antrean ekspor dokumen.');
            }

            const data = await res.json();
            if (data.id) {
                // Start polling status
                pollTimerRef.current = setTimeout(() => pollStatus(data.id), 800);
            } else {
                throw new Error('Respons server tidak valid.');
            }
        } catch (err: any) {
            setStatus('failed');
            setIsProcessing(false);
            setErrorMessage(err?.message || 'Terjadi kesalahan sistem.');
        }
    };

    const closeModal = () => {
        cleanup();
        setIsOpen(false);
    };

    return {
        isOpen,
        isProcessing,
        status,
        downloadUrl,
        filename,
        errorMessage,
        activeExport,
        startExport,
        closeModal,
        triggerDownload,
    };
}

interface ReportExportModalProps {
    exportState: ReturnType<typeof useReportExport>;
}

export default function ReportExportModal({ exportState }: ReportExportModalProps) {
    const {
        isOpen,
        isProcessing,
        status,
        downloadUrl,
        filename,
        errorMessage,
        activeExport,
        closeModal,
        triggerDownload,
    } = exportState;

    if (!isOpen) return null;

    const isPdf = activeExport?.format === 'pdf';
    const formatName = isPdf ? 'PDF' : 'Excel';

    return (
        <Modal
            isOpen={isOpen}
            onClose={closeModal}
            title={`Unduh Dokumen ${formatName}`}
            subtitle={activeExport?.label || 'Proses pembuatan dokumen laporan melalui antrean sistem (Queue)'}
            size="md"
            footer={(
                <div className="flex w-full items-center justify-end gap-2">
                    {status === 'completed' && downloadUrl && (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => triggerDownload(downloadUrl, filename)}
                            leftIcon={<Download aria-hidden="true" className="size-4" />}
                        >
                            Unduh Ulang
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant={status === 'completed' ? 'secondary' : 'outline'}
                        onClick={closeModal}
                    >
                        {status === 'completed' ? 'Selesai' : 'Tutup'}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-4 py-3 text-center sm:text-left">
                {isProcessing && (
                    <div className="flex flex-col items-center justify-center space-y-3 py-6 text-center">
                        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                            {isPdf ? (
                                <FileText aria-hidden="true" className="size-7" />
                            ) : (
                                <FileSpreadsheet aria-hidden="true" className="size-7 text-[#087443]" />
                            )}
                            <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-white shadow-xs dark:bg-[#071322]">
                                <Loader2 aria-hidden="true" className="size-3.5 animate-spin text-[#0060F4]" />
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                {status === 'pending'
                                    ? 'Memasukkan ke Antrean (Queue)...'
                                    : `Menyusun Berkas ${formatName}...`}
                            </p>
                            <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                Dokumen akan langsung diunduh secara otomatis setelah selesai dibuat.
                            </p>
                        </div>
                        <div className="w-full max-w-xs space-y-1.5 pt-2">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E0F0FF] dark:bg-[#1E3A5F]">
                                <div className="h-full w-2/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-[#0060F4]" />
                            </div>
                            <span className="text-[10px] text-[#8C9BB9]">Background Worker Processing</span>
                        </div>
                    </div>
                )}

                {status === 'completed' && (
                    <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 aria-hidden="true" className="size-8" />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                                Berkas {formatName} Berhasil Dibuat!
                            </p>
                            <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                File <strong className="font-mono text-[#0B1F63] dark:text-white">{filename}</strong> telah otomatis dikirim ke peramban Anda.
                            </p>
                        </div>
                        <p className="text-[11px] text-[#8C9BB9]">
                            Jika unduhan tidak berjalan otomatis, silakan klik tombol <strong>Unduh Ulang</strong> di bawah.
                        </p>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                            <AlertCircle aria-hidden="true" className="size-8" />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-rose-800 dark:text-rose-300">
                                Gagal Membuat Dokumen
                            </p>
                            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                                {errorMessage || 'Terjadi kesalahan saat memproses laporan.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
