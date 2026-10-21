import React, { useState, useRef, useMemo } from 'react';
import { router } from '@inertiajs/react';
import {
    Download,
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileDown,
    X,
} from 'lucide-react';
import Modal from '../overlays/Modal';
import Button from './Button';
import ActionMenu, { type ActionMenuGroup } from './ActionMenu';

export interface ImportExportActionsProps {
    resource:
        | 'work-orders'
        | 'requests'
        | 'vessels'
        | 'products'
        | 'companies'
        | 'ports'
        | 'vendors'
        | 'expenses'
        | 'invoices'
        | 'completion-notes'
        | 'vendor-invoices'
        | 'operations'
        | string;
    resourceTitle: string;
    canManage?: boolean;
    buttonLabel?: string;
    displayMode?: 'dropdown' | 'buttons';
    className?: string;
    onSuccess?: () => void;
}

export default function ImportExportActions({
    resource,
    resourceTitle,
    canManage = true,
    buttonLabel = 'Aksi Data',
    displayMode = 'dropdown',
    className = '',
    onSuccess,
}: ImportExportActionsProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error';
        message: string;
        errors?: string[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        setIsExporting(true);
        const exportUrl = `/import-export/${resource}/export`;
        // Trigger browser download via window location
        window.location.href = exportUrl;
        setTimeout(() => {
            setIsExporting(false);
        }, 1500);
    };

    const handleDownloadTemplate = () => {
        const templateUrl = `/import-export/${resource}/template`;
        window.location.href = templateUrl;
    };

    const actionGroups = useMemo<ActionMenuGroup[]>(() => {
        const groups: ActionMenuGroup[] = [
            {
                id: 'export-group',
                label: 'Ekspor Data',
                items: [
                    {
                        id: 'export-excel',
                        label: `Ekspor Excel (.xlsx)`,
                        icon: isExporting ? (
                            <Loader2 className="size-4 animate-spin text-[#0060F4]" />
                        ) : (
                            <FileSpreadsheet className="size-4 text-[#087443] dark:text-emerald-400" />
                        ),
                        tone: 'success' as const,
                        onSelect: handleExport,
                        disabled: isExporting,
                    },
                ],
            },
        ];

        if (canManage) {
            groups.push({
                id: 'import-group',
                label: 'Impor & Kelola Data',
                items: [
                    {
                        id: 'import-excel',
                        label: `Impor Data ${resourceTitle}`,
                        icon: <Upload className="size-4 text-[#0060F4] dark:text-[#60A5FA]" />,
                        tone: 'primary' as const,
                        onSelect: () => setIsModalOpen(true),
                    },
                    {
                        id: 'download-template',
                        label: 'Unduh Template Excel',
                        icon: <FileDown className="size-4 text-[#52658E] dark:text-[#94A3B8]" />,
                        tone: 'default' as const,
                        onSelect: handleDownloadTemplate,
                    },
                ],
            });
        }

        return groups;
    }, [isExporting, canManage, resourceTitle]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setSelectedFile(files[0]);
            setFeedback(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setSelectedFile(e.dataTransfer.files[0]);
            setFeedback(null);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setIsUploading(true);
        setFeedback(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            // Get CSRF token from meta tag
            const csrfToken =
                document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch(`/import-export/${resource}/import`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setFeedback({
                    type: 'success',
                    message: data.message || 'Import data berhasil dilakukan.',
                });
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }

                // Trigger page refresh after short delay so user sees success feedback
                setTimeout(() => {
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                    setIsModalOpen(false);
                    setFeedback(null);
                }, 1200);
            } else {
                setFeedback({
                    type: 'error',
                    message: data.message || 'Gagal mengimpor berkas. Periksa kembali format data.',
                    errors: data.errors || [],
                });
            }
        } catch (err: any) {
            setFeedback({
                type: 'error',
                message: 'Terjadi gangguan jaringan atau server saat mengunggah berkas.',
                errors: [err.message || 'Unknown network error'],
            });
        } finally {
            setIsUploading(false);
        }
    };

    const closeModal = () => {
        if (!isUploading) {
            setIsModalOpen(false);
            setSelectedFile(null);
            setFeedback(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            {displayMode === 'buttons' ? (
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={handleExport}
                        disabled={isExporting}
                        leftIcon={
                            isExporting ? (
                                <Loader2 className="size-4 animate-spin text-[#0060F4]" />
                            ) : (
                                <Download className="size-4 text-[#0060F4] dark:text-[#60A5FA]" />
                            )
                        }
                        title={`Unduh seluruh data ${resourceTitle} ke format Excel (.xlsx)`}
                        className="border-[#CCE0F5] bg-white font-bold text-[#0B1F63] hover:border-[#0060F4] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white dark:hover:bg-[#132847]"
                    >
                        Ekspor Excel
                    </Button>
                    {canManage && (
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            onClick={() => setIsModalOpen(true)}
                            leftIcon={<Upload className="size-4 text-[#16A36A] dark:text-[#34D399]" />}
                            title={`Impor data ${resourceTitle} massal dari Excel atau CSV`}
                            className="border-[#CCE0F5] bg-white font-bold text-[#0B1F63] hover:border-[#16A36A] hover:bg-[#F0FDF4] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white dark:hover:bg-[#064E3B]"
                        >
                            Impor Data
                        </Button>
                    )}
                </div>
            ) : (
                <ActionMenu
                    label={`Aksi Data ${resourceTitle}`}
                    buttonLabel={buttonLabel}
                    buttonIcon={
                        isExporting ? (
                            <Loader2 className="size-4 animate-spin text-[#0060F4]" />
                        ) : (
                            <FileSpreadsheet className="size-4 text-[#0060F4] dark:text-[#60A5FA]" />
                        )
                    }
                    buttonVariant="outline"
                    groups={actionGroups}
                />
            )}

            {/* Import Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                size="lg"
                title={
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                            <FileSpreadsheet className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-[#0B1F63] dark:text-white">
                                Impor Data {resourceTitle}
                            </h3>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                Tambahkan data massal dengan mudah menggunakan berkas Excel atau CSV.
                            </p>
                        </div>
                    </div>
                }
            >
                <div className="space-y-4 text-xs">
                    {/* Step 1: Download Template */}
                    <div className="rounded-xl border border-[#DCEAF8] bg-[#F4F9FF] p-3.5 dark:border-[#1E3A5F] dark:bg-[#0A1A2F]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="space-y-1">
                                <span className="inline-flex items-center rounded-md bg-[#0060F4]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0060F4] dark:bg-[#0060F4]/20 dark:text-[#60A5FA]">
                                    Langkah 1: Format Template
                                </span>
                                <h4 className="font-extrabold text-[#0B1F63] dark:text-white">
                                    Unduh Template Excel Resmi
                                </h4>
                                <p className="text-[11px] leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                                    Dilengkapi dengan <strong>2 baris contoh data valid</strong> yang siap dijadikan panduan pengisian data Anda.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={handleDownloadTemplate}
                                leftIcon={<FileDown className="size-4 shrink-0 text-white" />}
                                className="shrink-0 font-bold shadow-sm transition-all focus:ring-2 focus:ring-emerald-500/40 hover:opacity-95"
                                style={{
                                    backgroundColor: '#087443',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                }}
                            >
                                Unduh Template (.xlsx)
                            </Button>
                        </div>
                    </div>

                    {/* Step 2: Upload File Area */}
                    <div className="space-y-2">
                        <span className="inline-flex items-center rounded-md bg-[#52658E]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0B1F63] dark:bg-[#1E3A5F] dark:text-[#94A3B8]">
                            Langkah 2: Unggah Berkas
                        </span>

                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                            className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                                selectedFile
                                    ? 'border-[#0060F4] bg-[#F0F8FF] dark:border-[#60A5FA] dark:bg-[#0C1D36]'
                                    : 'border-[#CCE0F5] bg-[#F9FBFE] hover:border-[#0060F4] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#071322] dark:hover:border-[#60A5FA]'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.csv,.xls,.txt"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {selectedFile ? (
                                <div className="flex flex-col items-center space-y-2">
                                    <div className="flex size-11 items-center justify-center rounded-xl bg-[#0060F4] text-white shadow-sm">
                                        <FileSpreadsheet className="size-6" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-extrabold text-[#0B1F63] dark:text-white">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                            {(selectedFile.size / 1024).toFixed(1)} KB · Siap diimpor
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400"
                                    >
                                        <X className="size-3" /> Ganti Berkas
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center space-y-2">
                                    <div className="flex size-11 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] group-hover:scale-105 transition-transform dark:bg-[#132847] dark:text-[#60A5FA]">
                                        <Upload className="size-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#0B1F63] dark:text-white">
                                            Klik untuk memilih berkas atau seret ke sini
                                        </p>
                                        <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                            Mendukung format <strong>.xlsx</strong>, <strong>.csv</strong>, atau <strong>.xls</strong> (Maks. 20 MB)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Feedback Messages */}
                    {feedback && (
                        <div
                            className={`rounded-xl border p-3 ${
                                feedback.type === 'success'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                    : 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                            }`}
                        >
                            <div className="flex items-start gap-2.5">
                                {feedback.type === 'success' ? (
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                                ) : (
                                    <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                                )}
                                <div className="space-y-1">
                                    <p className="font-extrabold">{feedback.message}</p>
                                    {feedback.errors && feedback.errors.length > 0 && (
                                        <ul className="list-inside list-disc space-y-0.5 text-[11px] opacity-90">
                                            {feedback.errors.slice(0, 5).map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                            {feedback.errors.length > 5 && (
                                                <li>...dan {feedback.errors.length - 5} kesalahan lainnya.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                        <Button
                            type="button"
                            variant="ghost"
                            size="md"
                            onClick={closeModal}
                            disabled={isUploading}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            onClick={handleImportSubmit}
                            disabled={!selectedFile || isUploading}
                            leftIcon={
                                isUploading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Upload className="size-4" />
                                )
                            }
                        >
                            {isUploading ? 'Memproses Impor...' : 'Mulai Impor'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
