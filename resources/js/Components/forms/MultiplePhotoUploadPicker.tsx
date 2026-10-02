import React, { useId, useRef, useState } from 'react';
import { Camera, CircleAlert, FolderOpen, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import Modal from '../overlays/Modal';
import { LiveCameraModal } from './PhotoUploadPicker';

export interface MultiplePhotoUploadPickerProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    label?: string;
    required?: boolean;
    error?: string;
    helperText?: string;
    maxFiles?: number;
    maxSizeMb?: number;
}

export default function MultiplePhotoUploadPicker({
    files,
    onFilesChange,
    label = 'Foto / Dokumentasi',
    required = true,
    error,
    helperText = 'Format: JPG, PNG (Maks. 5 MB)',
    maxFiles = 10,
    maxSizeMb = 5,
}: MultiplePhotoUploadPickerProps) {
    const inputId = useId();
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    // Cache of object URLs for previewing File objects
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    React.useEffect(() => {
        const urls = files.map((file) => URL.createObjectURL(file));
        setPreviewUrls(urls);

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [files]);

    const handleFilesAdded = (newFiles: FileList | File[]) => {
        setLocalError(null);
        const validNewFiles: File[] = [];

        Array.from(newFiles).forEach((file) => {
            if (!file.type.startsWith('image/')) {
                setLocalError('File harus berupa gambar (JPG, PNG).');
                return;
            }
            if (file.size > maxSizeMb * 1024 * 1024) {
                setLocalError(`Ukuran foto "${file.name}" melebihi ${maxSizeMb} MB.`);
                return;
            }
            validNewFiles.push(file);
        });

        if (validNewFiles.length === 0) return;

        if (files.length + validNewFiles.length > maxFiles) {
            setLocalError(`Maksimal ${maxFiles} foto diperbolehkan.`);
            const allowed = validNewFiles.slice(0, maxFiles - files.length);
            onFilesChange([...files, ...allowed]);
        } else {
            onFilesChange([...files, ...validNewFiles]);
        }
    };

    const handleCameraCapture = (file: File) => {
        setShowCameraModal(false);
        handleFilesAdded([file]);
    };

    const removeFile = (index: number) => {
        const updated = files.filter((_, i) => i !== index);
        onFilesChange(updated);
        if (viewerIndex === index) {
            setViewerIndex(null);
        }
    };

    return (
        <div className="space-y-2 w-full text-left">
            {/* Hidden Input for Gallery */}
            <input
                ref={galleryInputRef}
                id={inputId}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        handleFilesAdded(e.target.files);
                    }
                    e.target.value = '';
                }}
            />

            {/* Header / Label */}
            <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                    {label} {required ? <span className="text-[#C62840]">*</span> : <span className="text-slate-400 font-normal">(Opsional)</span>}
                </label>
                {files.length > 0 && (
                    <span className="text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                        {files.length} / {maxFiles} foto
                    </span>
                )}
            </div>

            {/* Container: Horizontal Grid / Scroll matching Gambar 2 */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                {/* 1. Tombol Tambah Utama jika belum ada foto atau tombol mini di awal */}
                {files.length === 0 ? (
                    <button
                        type="button"
                        onClick={() => setShowSourceModal(true)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-[#BCE0FD] dark:border-[#1E3A5F] bg-[#F8FBFF] dark:bg-[#071322] hover:bg-[#F0F8FF] hover:border-[#0060F4] transition-colors cursor-pointer group text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                    >
                        <div className="w-12 h-12 rounded-xl bg-[#E0F0FF] dark:bg-[#0C1D36] flex items-center justify-center text-[#0060F4] dark:text-[#38BDF8] shrink-0 group-hover:scale-105 transition-transform">
                            <ImagePlus aria-hidden="true" className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs text-[#082870] dark:text-white block group-hover:text-[#0060F4]">
                                Tambah Foto
                            </span>
                            <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block mt-0.5">
                                {helperText}
                            </span>
                        </div>
                    </button>
                ) : (
                    <>
                        {/* Tombol Card Ringkas Tambah Foto di depan */}
                        {files.length < maxFiles && (
                            <button
                                type="button"
                                onClick={() => setShowSourceModal(true)}
                                className="w-28 h-20 shrink-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-dashed border-[#BCE0FD] dark:border-[#1E3A5F] bg-[#F8FBFF] dark:bg-[#071322] hover:bg-[#F0F8FF] hover:border-[#0060F4] transition-colors cursor-pointer group text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                            >
                                <ImagePlus aria-hidden="true" className="w-5 h-5 text-[#0060F4] dark:text-[#38BDF8]" />
                                <span className="text-[10px] font-bold text-[#082870] dark:text-white leading-tight">
                                    Tambah Foto
                                </span>
                                <span className="text-[9px] text-[#52658E] dark:text-[#94A3B8] leading-tight">
                                    Maks. 5 MB
                                </span>
                            </button>
                        )}

                        {/* Daftar Thumbnail Foto yang sudah dipilih */}
                        {files.map((file, idx) => (
                            <div
                                key={idx}
                                className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-[#DCEAF8] dark:border-[#1E3A5F] bg-slate-900 group shadow-2xs"
                            >
                                <button
                                    type="button"
                                    onClick={() => setViewerIndex(idx)}
                                    aria-label={`Lihat foto ${file.name}`}
                                    className="size-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
                                >
                                    <img
                                        src={previewUrls[idx]}
                                        alt=""
                                        width={80}
                                        height={80}
                                        className="size-full object-cover transition-opacity hover:opacity-90"
                                    />
                                </button>

                                {/* Tombol Hapus (X) */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(idx);
                                    }}
                                    aria-label={`Hapus foto ${file.name}`}
                                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white shadow-xs transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                                >
                                    <X aria-hidden="true" className="size-3 stroke-[2.5]" />
                                </button>
                            </div>
                        ))}

                        {/* Tombol Plus di ujung jika masih bisa tambah */}
                        {files.length < maxFiles && (
                            <button
                                type="button"
                                onClick={() => setShowSourceModal(true)}
                                className="w-10 h-20 shrink-0 rounded-xl border-2 border-dashed border-[#BCE0FD] dark:border-[#1E3A5F] flex items-center justify-center text-[#0060F4] dark:text-[#38BDF8] hover:bg-[#F0F8FF] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                                aria-label="Tambah foto lagi"
                            >
                                <Plus aria-hidden="true" className="w-5 h-5" />
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Error Message */}
            {(error || localError) && (
                <p role="alert" className="text-[11px] font-semibold text-[#C62840] dark:text-[#F87171] flex items-center gap-1">
                    <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                    <span>{error || localError}</span>
                </p>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                MODAL PILIHAN SUMBER (KAMERA VS GALERI)
               ───────────────────────────────────────────────────────────────── */}
            <Modal
                isOpen={showSourceModal}
                onClose={() => setShowSourceModal(false)}
                title="Pilih Sumber Foto"
                size="sm"
                asBottomSheetOnMobile={true}
            >
                <div className="p-2 space-y-3">
                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8] leading-relaxed">
                        Pilih cara mengunggah foto dokumentasi aktivitas lapangan:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Opsi Kamera */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowSourceModal(false);
                                setShowCameraModal(true);
                            }}
                            className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FBFF] dark:bg-[#071322] hover:border-[#0060F4] hover:bg-[#F0F8FF] transition-colors cursor-pointer text-left group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                        >
                            <div className="w-11 h-11 rounded-xl bg-[#E0F0FF] dark:bg-[#0C1D36] flex items-center justify-center text-[#0060F4] dark:text-[#38BDF8] shrink-0 group-hover:scale-105 transition-transform">
                                <Camera aria-hidden="true" className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <span className="font-bold text-xs text-[#082870] dark:text-white block">
                                    Ambil Foto (Kamera)
                                </span>
                                <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block">
                                    Buka kamera perangkat langsung
                                </span>
                            </div>
                        </button>

                        {/* Opsi Galeri / File */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowSourceModal(false);
                                galleryInputRef.current?.click();
                            }}
                            className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FBFF] dark:bg-[#071322] hover:border-[#0060F4] hover:bg-[#F0F8FF] transition-colors cursor-pointer text-left group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                        >
                            <div className="w-11 h-11 rounded-xl bg-[#DCF7E8] dark:bg-[#072719] flex items-center justify-center text-[#087443] dark:text-[#4ADE80] shrink-0 group-hover:scale-105 transition-transform">
                                <FolderOpen aria-hidden="true" className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <span className="font-bold text-xs text-[#082870] dark:text-white block">
                                    Pilih dari Galeri / File
                                </span>
                                <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block">
                                    Pilih foto yang sudah tersimpan
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ─────────────────────────────────────────────────────────────────
                MODAL VIEWFINDER KAMERA LANGSUNG
               ───────────────────────────────────────────────────────────────── */}
            <LiveCameraModal
                show={showCameraModal}
                onClose={() => setShowCameraModal(false)}
                onCapture={handleCameraCapture}
            />

            {/* ─────────────────────────────────────────────────────────────────
                LIGHTBOX PREVIEW FOTO
               ───────────────────────────────────────────────────────────────── */}
            <Modal
                isOpen={viewerIndex !== null}
                onClose={() => setViewerIndex(null)}
                title={viewerIndex !== null && files[viewerIndex] ? files[viewerIndex].name : 'Detail Foto'}
                size="lg"
                asBottomSheetOnMobile={false}
                footer={
                    viewerIndex !== null ? (
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={() => {
                                    removeFile(viewerIndex);
                                    setViewerIndex(null);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                                <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                                <span>Hapus Foto Ini</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewerIndex(null)}
                                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
                            >
                                Tutup
                            </button>
                        </div>
                    ) : null
                }
            >
                {viewerIndex !== null && previewUrls[viewerIndex] && (
                    <div className="flex justify-center items-center py-2 bg-slate-950 rounded-xl overflow-hidden">
                        <img
                            src={previewUrls[viewerIndex]}
                            alt={files[viewerIndex]?.name || 'Preview'}
                            width={1280}
                            height={720}
                            className="max-h-[65dvh] max-w-full object-contain"
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}
