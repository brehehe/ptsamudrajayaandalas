import React, { useEffect, useId, useRef, useState } from 'react';
import {
    AlertCircle,
    Camera,
    Check,
    FolderOpen,
    ImagePlus,
    Loader2,
    RefreshCw,
    RotateCcw,
    SwitchCamera,
    Upload,
    X,
} from 'lucide-react';
import Modal from '../Modal';

export interface PhotoUploadPickerProps {
    value?: File | null;
    previewUrl?: string | null;
    onChange: (file: File | null, previewUrl?: string | null) => void;
    error?: string;
    helperText?: string;
    mode?: 'both' | 'camera' | 'gallery';
    allowCamera?: boolean;
    allowGallery?: boolean;
}

/**
 * PhotoUploadPicker
 *
 * Komponen Frame Tunggal untuk upload foto / form kapal.
 * - Mendukung state terkontrol melalui `value` (File) dan `previewUrl` (string).
 * - Foto tetap tersimpan saat pengguna berpindah step (Review lalu Kembali).
 * - Klik "Ambil Foto (Kamera)": membuka Live Camera Viewfinder (WebRTC getUserMedia).
 * - Klik "Pilih dari Galeri / File": membuka file explorer (Finder / Photo Library).
 * - Modal pilihan muncul dari bawah (bottom-sheet) di mobile.
 */
export default function PhotoUploadPicker({
    value,
    previewUrl,
    onChange,
    error,
    helperText,
    mode = 'both',
    allowCamera,
    allowGallery,
}: PhotoUploadPickerProps) {
    // Konfigurasi opsi yang aktif
    let canCamera = true;
    let canGallery = true;

    if (mode === 'camera') {
        canCamera = true;
        canGallery = false;
    } else if (mode === 'gallery') {
        canCamera = false;
        canGallery = true;
    } else if (mode === 'both') {
        canCamera = true;
        canGallery = true;
    }

    if (allowCamera !== undefined) canCamera = allowCamera;
    if (allowGallery !== undefined) canGallery = allowGallery;

    const isBoth = canCamera && canGallery;
    const isOnlyCamera = canCamera && !canGallery;
    const isOnlyGallery = !canCamera && canGallery;

    const inputId = useId();
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);

    function formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    const [preview, setPreview] = useState<string | null>(previewUrl || null);
    const [fileName, setFileName] = useState<string>(value?.name || '');
    const [fileSize, setFileSize] = useState<string>(value ? formatBytes(value.size) : '');
    const [isDragging, setIsDragging] = useState(false);

    // Sinkronisasi state internal saat props value / previewUrl berubah dari parent
    useEffect(() => {
        if (value) {
            setFileName(value.name);
            setFileSize(formatBytes(value.size));
            if (previewUrl) {
                setPreview(previewUrl);
            } else {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setPreview(ev.target?.result as string);
                };
                reader.readAsDataURL(value);
            }
        } else if (previewUrl) {
            setPreview(previewUrl);
            if (!fileName) setFileName('Foto form kapal');
        } else {
            setPreview(null);
            setFileName('');
            setFileSize('');
        }
    }, [value, previewUrl]);

    function processSelectedFile(file?: File) {
        if (!file) return;

        // Validasi tipe file
        if (!file.type.startsWith('image/')) {
            onChange(null, null);
            return;
        }

        // Validasi ukuran max 5 MB
        if (file.size > 5 * 1024 * 1024) {
            onChange(null, null);
            return;
        }

        setFileName(file.name);
        setFileSize(formatBytes(file.size));

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setPreview(dataUrl);
            onChange(file, dataUrl);
        };
        reader.readAsDataURL(file);
    }

    function handleGalleryFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            processSelectedFile(file);
            setShowSourceModal(false);
        }
        e.target.value = '';
    }

    function handleCameraCaptured(file: File) {
        processSelectedFile(file);
        setShowCameraModal(false);
        setShowSourceModal(false);
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processSelectedFile(file);
            setShowSourceModal(false);
        }
    }

    function handleClear(e: React.MouseEvent) {
        e.stopPropagation();
        setPreview(null);
        setFileName('');
        setFileSize('');
        onChange(null, null);
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    }

    function handleFrameClick() {
        if (isBoth) {
            setShowSourceModal(true);
        } else if (isOnlyCamera) {
            setShowCameraModal(true);
        }
    }

    const borderStyle = error
        ? 'border-[#C62840]'
        : isDragging
        ? 'border-[#0060F4] ring-2 ring-[#0060F4]/30'
        : 'border-[#0060F4]/40 hover:border-[#0060F4] dark:border-[#0060F4]/50 dark:hover:border-[#38BDF8]';

    const bgStyle = error
        ? 'bg-[#FFF5F6] dark:bg-[#3A1520]'
        : isDragging
        ? 'bg-[#E8F2FF] dark:bg-[#0D264E]'
        : 'bg-[#F0F8FF]/70 hover:bg-[#F0F8FF] dark:bg-[#0C1D36]/60 dark:hover:bg-[#0C1D36]';

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE 1: PRATINJAU FOTO JIKA SUDAH DIPILIH
    // ─────────────────────────────────────────────────────────────────────────────
    if (preview) {
        return (
            <div className="space-y-2">
                <div
                    className={`relative flex min-h-56 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-solid ${borderStyle} bg-slate-900 shadow-sm`}
                >
                    <img
                        src={preview}
                        alt="Pratinjau foto form kapal"
                        className="absolute inset-0 h-full w-full object-contain bg-black/40"
                    />

                    {/* Gradient Overlay bawah untuk info file & tombol aksi */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 pt-8 flex items-end justify-between gap-2 z-10">
                        <div className="min-w-0 flex-1 text-white">
                            <p className="truncate text-xs font-semibold">{fileName || 'Foto terpilih'}</p>
                            <p className="text-[10px] text-white/75">{fileSize}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Tombol Ganti Foto */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (isBoth) setShowSourceModal(true);
                                    else if (isOnlyCamera) setShowCameraModal(true);
                                    else galleryInputRef.current?.click();
                                }}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0060F4] px-3 py-1.5 text-xs font-bold text-white shadow-md transition-transform hover:scale-105 hover:bg-[#0051D5]"
                            >
                                <RefreshCw className="size-3.5" strokeWidth={2.5} />
                                <span>Ganti</span>
                            </button>

                            {/* Tombol Hapus Foto */}
                            <button
                                type="button"
                                onClick={handleClear}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#C62840] px-3 py-1.5 text-xs font-bold text-white shadow-md transition-transform hover:scale-105 hover:bg-[#A81E33]"
                            >
                                <X className="size-3.5" strokeWidth={2.5} />
                                <span>Hapus</span>
                            </button>
                        </div>
                    </div>
                </div>

                {(error || helperText) && (
                    <p
                        className={`text-[11px] ${
                            error
                                ? 'font-semibold text-[#C62840] dark:text-[#F87171]'
                                : 'text-[#52658E] dark:text-[#94A3B8]'
                        }`}
                    >
                        {error ? `⚠ ${error}` : helperText}
                    </p>
                )}

                {/* Modal Pilihan Sumber jika user ingin Ganti Foto */}
                {isBoth && (
                    <PhotoSourceModal
                        show={showSourceModal}
                        onClose={() => setShowSourceModal(false)}
                        onSelectCamera={() => {
                            setShowSourceModal(false);
                            setShowCameraModal(true);
                        }}
                        onSelectGallery={handleGalleryFileSelected}
                    />
                )}

                {/* Live Camera Viewfinder Modal */}
                <LiveCameraModal
                    show={showCameraModal}
                    onClose={() => setShowCameraModal(false)}
                    onCapture={handleCameraCaptured}
                />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE 2: FRAME TUNGGAL (SINGLE FRAME)
    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-2">
            <div
                onClick={handleFrameClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFrameClick();
                    }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                className={`group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed py-8 px-4 text-center transition-all duration-200 cursor-pointer select-none ${borderStyle} ${bgStyle}`}
            >
                {/* Jika HANYA Galeri aktif: input langsung menutupi frame */}
                {isOnlyGallery && (
                    <input
                        ref={galleryInputRef}
                        id={inputId}
                        type="file"
                        accept="image/*"
                        onChange={handleGalleryFileSelected}
                        title="Upload gambar dari galeri atau file"
                        aria-label="Upload gambar dari galeri atau file"
                        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer z-20"
                    />
                )}

                {/* Konten Visual Frame */}
                <div className="pointer-events-none flex flex-col items-center gap-3 z-10">
                    {/* Badge Icon Kombinasi */}
                    <div className="relative">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0060F4] to-[#082870] text-white shadow-md shadow-[#0060F4]/20 group-hover:scale-105 transition-transform duration-200">
                            {isOnlyGallery ? (
                                <FolderOpen className="size-7" strokeWidth={1.8} />
                            ) : (
                                <Camera className="size-7" strokeWidth={1.8} />
                            )}
                        </div>
                        {isBoth && (
                            <div className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-white dark:bg-[#0C1D36] text-[#0060F4] shadow-md border-2 border-[#DCEAF8] dark:border-[#1E3A5F]">
                                <Upload className="size-3.5" strokeWidth={2.5} />
                            </div>
                        )}
                    </div>

                    {/* Judul & Deskripsi Frame */}
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-[#082870] dark:text-white group-hover:text-[#0060F4] transition-colors">
                            {isOnlyCamera
                                ? 'Ambil Foto Kamera'
                                : isOnlyGallery
                                ? 'Pilih dari Galeri / File'
                                : 'Ambil Foto atau Pilih Gambar'}
                        </p>
                        <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] max-w-xs">
                            {isOnlyCamera
                                ? 'Klik di sini untuk langsung membuka kamera'
                                : isOnlyGallery
                                ? 'Klik di sini untuk memilih foto dokumen dari perangkat Anda'
                                : 'Klik di sini untuk membuka kamera atau memilih dari galeri'}
                        </p>
                    </div>

                    {/* Badge Pill Info */}
                    <div className="flex items-center gap-1.5 pt-1">
                        {canCamera && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#0060F4]/10 dark:bg-[#0060F4]/20 px-2.5 py-1 text-[10px] font-semibold text-[#0060F4] dark:text-[#38BDF8]">
                                <Camera className="size-3" strokeWidth={2} />
                                Kamera
                            </span>
                        )}
                        {isBoth && <span className="text-[#94A3B8] text-[10px]">&bull;</span>}
                        {canGallery && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#082870]/10 dark:bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-[#082870] dark:text-slate-200">
                                <FolderOpen className="size-3" strokeWidth={2} />
                                Galeri / File
                            </span>
                        )}
                        <span className="text-[#94A3B8] text-[10px]">&bull;</span>
                        <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                            Maks. 5 MB
                        </span>
                    </div>
                </div>
            </div>

            {(error || helperText) && (
                <p
                    className={`text-[11px] ${
                        error
                            ? 'font-semibold text-[#C62840] dark:text-[#F87171]'
                            : 'text-[#52658E] dark:text-[#94A3B8]'
                    }`}
                >
                    {error ? `⚠ ${error}` : helperText}
                </p>
            )}

            {/* Modal Pilihan Sumber Foto saat keduanya aktif */}
            {isBoth && (
                <PhotoSourceModal
                    show={showSourceModal}
                    onClose={() => setShowSourceModal(false)}
                    onSelectCamera={() => {
                        setShowSourceModal(false);
                        setShowCameraModal(true);
                    }}
                    onSelectGallery={handleGalleryFileSelected}
                />
            )}

            {/* Live Camera Viewfinder Modal */}
            <LiveCameraModal
                show={showCameraModal}
                onClose={() => setShowCameraModal(false)}
                onCapture={handleCameraCaptured}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL PILIHAN SUMBER FOTO (SLIDE-UP DARI BAWAH PADA MOBILE)
// ─────────────────────────────────────────────────────────────────────────────
interface PhotoSourceModalProps {
    show: boolean;
    onClose: () => void;
    onSelectCamera: () => void;
    onSelectGallery: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function PhotoSourceModal({
    show,
    onClose,
    onSelectCamera,
    onSelectGallery,
}: PhotoSourceModalProps) {
    return (
        <Modal
            show={show}
            onClose={onClose}
            maxWidth="sm"
            asBottomSheetOnMobile={true}
            panelClassName="rounded-t-[28px] sm:rounded-2xl p-0 overflow-hidden"
        >
            <div className="p-5 pt-2 sm:pt-5 pb-8 sm:pb-5 space-y-4">
                {/* Header Modal */}
                <div className="flex items-center justify-between pb-2 border-b border-[#E2EEF9] dark:border-[#1E3A5F]">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-[#0060F4]/10 text-[#0060F4] dark:bg-[#0060F4]/20 dark:text-[#38BDF8]">
                            <ImagePlus className="size-5" strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#082870] dark:text-white">
                                Pilih Sumber Foto
                            </h3>
                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                Tentukan cara pengambilan foto form
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#52658E] hover:bg-slate-100 hover:text-slate-700 dark:text-[#94A3B8] dark:hover:bg-[#1E3A5F]/50 transition-colors cursor-pointer"
                        aria-label="Tutup modal"
                    >
                        <X className="size-4" strokeWidth={2.5} />
                    </button>
                </div>

                {/* 2 Opsi Pilihan: Kamera Langsung & Galeri */}
                <div className="grid grid-cols-1 gap-2.5 pt-1">
                    {/* Opsi 1: Kamera Langsung (Membuka Kamera Perangkat) */}
                    <button
                        type="button"
                        onClick={onSelectCamera}
                        className="group flex w-full items-center gap-3.5 rounded-2xl border-2 border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081B38] p-4 text-left transition-all duration-150 hover:border-[#0060F4] hover:bg-[#F0F8FF] dark:hover:bg-[#0E284D] active:scale-[0.99] cursor-pointer shadow-xs"
                    >
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0060F4] to-[#082870] text-white shadow-sm group-hover:scale-105 transition-transform">
                            <Camera className="size-6" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#082870] dark:text-white group-hover:text-[#0060F4] transition-colors">
                                Ambil Foto (Kamera)
                            </p>
                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                Langsung buka kamera perangkat untuk mengambil foto
                            </p>
                        </div>
                        <div className="text-[#0060F4] dark:text-[#38BDF8] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all font-bold text-sm">
                            &rarr;
                        </div>
                    </button>

                    {/* Opsi 2: Galeri / File */}
                    <div className="group relative flex items-center gap-3.5 rounded-2xl border-2 border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081B38] p-4 transition-all duration-150 hover:border-[#0060F4] hover:bg-[#F0F8FF] dark:hover:bg-[#0E284D] active:scale-[0.99] cursor-pointer shadow-xs">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onSelectGallery}
                            title="Pilih dari galeri atau file"
                            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white shadow-sm group-hover:scale-105 transition-transform">
                            <FolderOpen className="size-6" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#082870] dark:text-white group-hover:text-[#0060F4] transition-colors">
                                Pilih dari Galeri / File
                            </p>
                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                Pilih foto dokumen yang sudah ada di penyimpanan perangkat
                            </p>
                        </div>
                        <div className="text-[#0060F4] dark:text-[#38BDF8] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all font-bold text-sm">
                            &rarr;
                        </div>
                    </div>
                </div>

                {/* Footer Modal: Tombol Batal */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] text-xs font-semibold text-[#52658E] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E3A5F]/40 transition-colors cursor-pointer"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL KAMERA LANGSUNG (LIVE CAMERA VIEWFINDER VIA WEBRTC getUserMedia)
// ─────────────────────────────────────────────────────────────────────────────
export interface LiveCameraModalProps {
    show: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export function LiveCameraModal({ show, onClose, onCapture }: LiveCameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fallbackInputRef = useRef<HTMLInputElement>(null);

    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    async function stopStream() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }

    async function initCamera(mode: 'environment' | 'user') {
        setIsLoading(true);
        setCameraError(null);
        await stopStream();

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Fitur kamera tidak didukung di browser ini.');
            }

            // Cek apakah ada kamera depan & belakang
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter((d) => d.kind === 'videoinput');
                setHasMultipleCameras(videoInputs.length > 1);
            } catch {
                // Ignore device enumeration error
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: { ideal: mode },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsLoading(false);
        } catch (err: any) {
            console.error('Error membuka kamera:', err);
            let msg = 'Tidak dapat mengakses kamera perangkat.';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = 'Tidak ada perangkat kamera yang terdeteksi.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                msg = 'Kamera sedang digunakan oleh aplikasi lain.';
            }
            setCameraError(msg);
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (show) {
            setCapturedImage(null);
            setCapturedBlob(null);
            initCamera(facingMode);
        } else {
            stopStream();
        }
        return () => {
            stopStream();
        };
    }, [show, facingMode]);

    function handleSwitchCamera() {
        setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    }

    function handleTakePhoto() {
        if (!videoRef.current) return;
        const video = videoRef.current;

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Jika kamera depan, balik secara horizontal agar sesuai pratinjau cermin
        if (facingMode === 'user') {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedImage(dataUrl);

        canvas.toBlob(
            (blob) => {
                if (blob) setCapturedBlob(blob);
            },
            'image/jpeg',
            0.92
        );
    }

    function handleRetake() {
        setCapturedImage(null);
        setCapturedBlob(null);
        // Pastikan video tetap berjalan
        if (videoRef.current && streamRef.current) {
            videoRef.current.play().catch(() => {});
        }
    }

    function handleConfirmPhoto() {
        if (capturedBlob) {
            const file = new File([capturedBlob], `foto-form-${Date.now()}.jpg`, {
                type: 'image/jpeg',
            });
            stopStream();
            onCapture(file);
        }
    }

    function handleClose() {
        stopStream();
        setCapturedImage(null);
        setCapturedBlob(null);
        setCameraError(null);
        onClose();
    }

    function handleFallbackFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            stopStream();
            onCapture(file);
        }
    }

    return (
        <Modal
            show={show}
            onClose={handleClose}
            maxWidth="lg"
            asBottomSheetOnMobile={true}
            panelClassName="rounded-t-[28px] sm:rounded-2xl p-0 overflow-hidden bg-black text-white border-slate-800"
        >
            <div className="flex flex-col bg-black text-white max-h-[90vh]">
                {/* Header Kamera */}
                <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10 z-20">
                    <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-[#0060F4] text-white">
                            <Camera className="size-4" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-bold text-white">Kamera Form Kapal</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {hasMultipleCameras && !capturedImage && (
                            <button
                                type="button"
                                onClick={handleSwitchCamera}
                                className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/25 transition-colors cursor-pointer"
                                title="Balik kamera depan / belakang"
                            >
                                <SwitchCamera className="size-3.5" strokeWidth={2} />
                                <span>Balik</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-full bg-white/15 p-1.5 text-white/80 hover:bg-white/25 hover:text-white transition-colors cursor-pointer"
                            aria-label="Tutup kamera"
                        >
                            <X className="size-4" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Viewfinder / Video Feed */}
                <div className="relative flex-1 min-h-[340px] sm:min-h-[420px] bg-black flex items-center justify-center overflow-hidden">
                    {/* Hasil Foto Terjepret */}
                    {capturedImage ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                src={capturedImage}
                                alt="Hasil jepretan foto"
                                className="w-full h-full max-h-[60vh] object-contain"
                            />
                            <div className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                                <Check className="size-3.5" strokeWidth={3} />
                                Foto Berhasil Diambil
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Live Video */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full max-h-[65vh] object-cover sm:object-contain ${
                                    facingMode === 'user' ? '-scale-x-100' : ''
                                }`}
                            />

                            {/* Loading State */}
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 z-10">
                                    <Loader2 className="size-8 animate-spin text-[#0060F4]" />
                                    <p className="text-xs text-slate-300">Menghubungkan kamera...</p>
                                </div>
                            )}

                            {/* Viewfinder Brackets Guide */}
                            {!isLoading && !cameraError && (
                                <div className="pointer-events-none absolute inset-6 sm:inset-10 border-2 border-white/25 rounded-2xl flex flex-col justify-between p-3">
                                    <div className="flex justify-between">
                                        <div className="w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
                                        <div className="w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
                                    </div>
                                    <p className="text-center text-[10px] text-white/70 bg-black/40 backdrop-blur-xs py-1 px-3 rounded-full self-center">
                                        Posisikan form kapal di dalam area kotak
                                    </p>
                                    <div className="flex justify-between">
                                        <div className="w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
                                        <div className="w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />
                                    </div>
                                </div>
                            )}

                            {/* Error State */}
                            {cameraError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/95 z-20">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                                        <AlertCircle className="size-6" strokeWidth={2} />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-200 max-w-xs">{cameraError}</p>

                                    <div className="flex flex-col gap-2 pt-2 w-full max-w-xs">
                                        <button
                                            type="button"
                                            onClick={() => initCamera(facingMode)}
                                            className="w-full py-2.5 rounded-xl bg-white/15 text-xs font-bold text-white hover:bg-white/25 transition-colors cursor-pointer"
                                        >
                                            Coba Lagi
                                        </button>

                                        {/* Fallback ke File Input native jika kamera browser bermasalah */}
                                        <label className="w-full py-2.5 rounded-xl bg-[#0060F4] text-xs font-bold text-white text-center hover:bg-[#0051D5] transition-colors cursor-pointer relative">
                                            <span>Buka Kamera Sistem / Upload File</span>
                                            <input
                                                ref={fallbackInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleFallbackFile}
                                                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Bottom Controls Bar */}
                <div className="px-6 py-5 pb-8 sm:pb-5 bg-black/90 border-t border-white/10 flex items-center justify-center gap-6">
                    {capturedImage ? (
                        <div className="flex items-center gap-3 w-full max-w-sm">
                            <button
                                type="button"
                                onClick={handleRetake}
                                className="flex-1 py-3 rounded-xl border border-white/25 text-xs font-bold text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <RotateCcw className="size-4" strokeWidth={2.5} />
                                <span>Foto Ulang</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmPhoto}
                                className="flex-1 py-3 rounded-xl bg-[#0060F4] text-xs font-bold text-white hover:bg-[#0051D5] shadow-lg shadow-[#0060F4]/30 transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Check className="size-4" strokeWidth={3} />
                                <span>Gunakan Foto</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-8 w-full">
                            {/* Tombol Shutter Utama */}
                            <button
                                type="button"
                                onClick={handleTakePhoto}
                                disabled={isLoading || Boolean(cameraError)}
                                className="group relative flex size-18 items-center justify-center rounded-full border-4 border-white p-1 transition-transform active:scale-90 hover:scale-105 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                                title="Ambil foto"
                                aria-label="Ambil foto sekarang"
                            >
                                <div className="size-full rounded-full bg-white transition-colors group-hover:bg-slate-200 shadow-lg" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
