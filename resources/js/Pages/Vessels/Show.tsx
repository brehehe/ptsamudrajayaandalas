import { useEffect, useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, CircleAlert, ExternalLink, FileCheck2, FileUp, MapPin, Plus, RefreshCw, Ship as ShipIcon, Trash2, Upload } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button, { getButtonClassName } from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import Input from '../../Components/forms/Input';
import Textarea from '../../Components/forms/Textarea';
import DateTimePicker from '../../Components/forms/DateTimePicker';
import MultiplePhotoUploadPicker from '../../Components/forms/MultiplePhotoUploadPicker';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import { useGeolocation } from '../../hooks/useGeolocation';
import OverviewTab from '../../Components/vessels/OverviewTab';
import ActivityTab from '../../Components/vessels/ActivityTab';
import NeedsTab, { type NeedsFilterTab } from '../../Components/vessels/NeedsTab';
import RequestsTab from '../../Components/vessels/RequestsTab';
import VesselNeedFlow, { type NeedFlowStep } from '../../Components/vessels/VesselNeedFlow';
import VesselClearanceDialog from '../../Components/vessels/VesselClearanceDialog';
import AlertToast, { type AlertToastMessage } from '../../Components/feedback/AlertToast';
import type { VesselShowProps } from '../../Components/vessels/types';
import { formatEtaDateTime } from '../../Components/vessels/format';
import ShipImage from '../../Components/vessels/ShipImage';
export { formatEtaDateTime } from '../../Components/vessels/format';

const mobileTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'aktivitas', label: 'Aktivitas' },
    { key: 'kebutuhan', label: 'Kebutuhan' },
    { key: 'pengajuan', label: 'Pengajuan' },
] as const;

const formatRupiah = (value: number): string => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(value);

export default function VesselShow({
    vessel,
    needs = [],
    products = [],
    clearancePortCalls = [],
    selectedPortCallId = null,
    selectedVisit = null,
    canManageClearance = false,
    canCreateRequests = false,
    canProcessRequests = false,
    canCreateCompletionNotes = false,
    canViewFinancials = false,
    canUpdateShip = false,
    users = [],
}: VesselShowProps) {
    const requests = vessel.requests || [];
    const visitRequests = selectedVisit
        ? requests.filter((request) => request.port_call_id === selectedVisit.id)
        : requests;

    // Mobile View Tab: 'overview' | 'aktivitas' | 'kebutuhan' | 'pengajuan'
    const [mobileTab, setMobileTab] = useState<(typeof mobileTabs)[number]['key']>('overview');
    const [kebutuhanFilterTab, setKebutuhanFilterTab] = useState<NeedsFilterTab>('draft');

    // Multi-step Flow for "Tambah Kebutuhan" (Screens 3, 4, 5, 7, 8)
    // step: 'none' | 'header' | 'items' | 'review' | 'success'
    const [needFlowStep, setNeedFlowStep] = useState<NeedFlowStep>('none');
    const [selectedSection, setSelectedSection] = useState<string>('Deck');
    const [clearanceDirection, setClearanceDirection] = useState<'in' | 'out' | null>(null);
    const [clearanceToast, setClearanceToast] = useState<AlertToastMessage | null>(null);

    // Photo Management for Vessel
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        const url = URL.createObjectURL(file);
        setPhotoPreview(url);
        setIsPhotoModalOpen(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUploadPhoto = () => {
        if (!photoFile) return;
        setIsUploadingPhoto(true);
        const formData = new FormData();
        formData.append('image', photoFile);

        router.post(`/vessels/${vessel.id}/photo`, formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsUploadingPhoto(false);
                setIsPhotoModalOpen(false);
                setPhotoFile(null);
                setPhotoPreview(null);
            },
            onError: () => {
                setIsUploadingPhoto(false);
            },
        });
    };

    const handleDeletePhoto = () => {
        if (!confirm(`Hapus foto kapal ${vessel.name}?`)) return;
        setIsUploadingPhoto(true);
        router.delete(`/vessels/${vessel.id}/photo`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsUploadingPhoto(false);
                setIsPhotoModalOpen(false);
                setPhotoFile(null);
                setPhotoPreview(null);
            },
            onError: () => {
                setIsUploadingPhoto(false);
            },
        });
    };

    useEffect(() => {
        return () => {
            if (photoPreview && photoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const financialSummary = selectedVisit && canViewFinancials ? (
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#DCEAF8] bg-[#DCEAF8] dark:border-[#1E3A5F] dark:bg-[#1E3A5F]">
            <div className="min-w-0 bg-white p-3 dark:bg-[#0C1D36]">
                <p className="text-[10px] font-semibold text-[#52658E] dark:text-[#94A3B8]">Total HPP</p>
                <p className="mt-1 truncate text-xs font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9] sm:text-sm">{formatRupiah(selectedVisit.total_hpp)}</p>
            </div>
            <div className="min-w-0 bg-white p-3 dark:bg-[#0C1D36]">
                <p className="text-[10px] font-semibold text-[#52658E] dark:text-[#94A3B8]">Ditagihkan</p>
                <p className="mt-1 truncate text-xs font-extrabold tabular-nums text-[#0060F4] sm:text-sm">{formatRupiah(selectedVisit.total_invoiced)}</p>
            </div>
            <div className="min-w-0 bg-white p-3 dark:bg-[#0C1D36]">
                <p className="text-[10px] font-semibold text-[#52658E] dark:text-[#94A3B8]">Margin Kapal</p>
                <p className={`mt-1 truncate text-xs font-extrabold tabular-nums sm:text-sm ${selectedVisit.margin_available ? (selectedVisit.margin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#C62840]') : 'text-[#52658E] dark:text-[#94A3B8]'}`}>
                    {selectedVisit.margin_available ? formatRupiah(selectedVisit.margin) : 'Menunggu invoice'}
                </p>
            </div>
        </div>
    ) : null;

    // Quick Action Modals: Catat Aktivitas Lapangan
    const [showActivityModal, setShowActivityModal] = useState(false);
    const geo = useGeolocation('');
    const [activityDate, setActivityDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [activityTime, setActivityTime] = useState(() => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    const [activityLocation, setActivityLocation] = useState('');
    const [activityCategory, setActivityCategory] = useState<string>('Kegiatan Kapal');
    const [activityCategoryOther, setActivityCategoryOther] = useState('');
    const [activityTitle, setActivityTitle] = useState('');
    const [activityDetail, setActivityDetail] = useState('');
    const [activityPhotos, setActivityPhotos] = useState<File[]>([]);
    const [activityError, setActivityError] = useState<string | null>(null);
    const [activityErrors, setActivityErrors] = useState<Record<string, string>>({});
    const [isSavingActivity, setIsSavingActivity] = useState(false);

    useEffect(() => {
        if (geo.locationName && !activityLocation) {
            setActivityLocation(geo.locationName);
        }
    }, [geo.locationName]);

    const handleSaveActivity = (e: React.FormEvent) => {
        e.preventDefault();
        setActivityError(null);
        setActivityErrors({});

        if (!selectedVisit) {
            setActivityError('Kunjungan / job kapal tidak ditemukan. Buka kapal dari daftar kunjungan.');
            return;
        }

        setIsSavingActivity(true);
        const formData = new FormData();
        formData.append('activity_date', activityDate);
        formData.append('activity_time', activityTime);
        formData.append('location_name', activityLocation);
        if (geo.latitude !== null) formData.append('latitude', String(geo.latitude));
        if (geo.longitude !== null) formData.append('longitude', String(geo.longitude));
        formData.append('is_vessel_related', '1');
        formData.append('ship_id', vessel.id);
        formData.append('port_call_id', selectedVisit.id);
        formData.append('category', activityCategory);
        if (activityCategory === 'Lainnya') {
            formData.append('category_other', activityCategoryOther.trim());
        }
        formData.append('title', activityTitle);
        formData.append('detail', activityDetail);
        activityPhotos.forEach((file) => {
            formData.append('photos[]', file);
        });

        router.post('/operations/activities', formData, {
            forceFormData: true,
            onSuccess: () => {
                setShowActivityModal(false);
                setActivityTitle('');
                setActivityDetail('');
                setActivityCategory('Kegiatan Kapal');
                setActivityCategoryOther('');
                setActivityPhotos([]);
                setActivityErrors({});
                setClearanceToast({
                    variant: 'success',
                    message: 'Aktivitas lapangan berhasil disimpan ke sistem.',
                });
            },
            onError: (errs) => {
                const validationErrors = errs as Record<string, string>;
                const firstError = Object.values(validationErrors)[0];

                setActivityErrors(validationErrors);
                setActivityError(typeof firstError === 'string' ? firstError : 'Aktivitas gagal disimpan.');
            },
            onFinish: () => setIsSavingActivity(false),
        });
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'Labuh':
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full ' +
                            'text-xs font-bold bg-[#FEF3C7] text-[#D97706] shadow-2xs'
                        }
                    >
                        Labuh
                    </span>
                );
            case 'Akan Datang':
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full ' +
                            'text-xs font-bold bg-[#E0F0FF] text-[#0060F4] shadow-2xs'
                        }
                    >
                        Akan Datang
                    </span>
                );
            case 'Sandar':
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full ' +
                            'text-xs font-bold bg-[#DCF7E8] text-[#087443] shadow-2xs'
                        }
                    >
                        Sandar
                    </span>
                );
            case 'Selesai':
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full ' +
                            'text-xs font-bold bg-[#F1F5F9] text-[#64748B] shadow-2xs'
                        }
                    >
                        Selesai
                    </span>
                );
            default:
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full ' +
                            'text-xs font-bold bg-[#E0F0FF] text-[#0060F4] shadow-2xs'
                        }
                    >
                        {status}
                    </span>
                );
        }
    };

    const renderCompletionNoteAction = (fullWidth = false) => {
        if (!selectedVisit) {
            return null;
        }

        if (selectedVisit.completion_note) {
            return (
                <a
                    href={route('completion-notes.document', {
                        completionNote: selectedVisit.completion_note.id,
                        view: 1,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Lihat Nota Rampung ${selectedVisit.completion_note.document_number}`}
                    className={getButtonClassName({
                        variant: 'outline',
                        className: fullWidth ? 'w-full' : 'shrink-0',
                    })}
                >
                    <FileCheck2 aria-hidden="true" className="size-4" />
                    Lihat Nota Rampung
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
            );
        }

        if (canCreateCompletionNotes && selectedVisit.status === 'departed') {
            return (
                <Link
                    href={route('completion-notes.create', { port_call_id: selectedVisit.id })}
                    prefetch
                    className={getButtonClassName({
                        variant: 'primary',
                        className: fullWidth ? 'w-full' : 'shrink-0',
                    })}
                >
                    <FileUp aria-hidden="true" className="size-4" />
                    Unggah Nota Rampung
                </Link>
            );
        }

        if (canCreateCompletionNotes) {
            return (
                <span
                    role="status"
                    title="Nota Rampung dapat diunggah setelah kapal berangkat."
                    className={`inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#DCEAF8] bg-[#F1F5F9] px-3.5 text-sm font-semibold text-[#64748B] opacity-70 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#94A3B8] ${fullWidth ? 'w-full' : ''}`}
                >
                    <FileCheck2 aria-hidden="true" className="size-4" />
                    Tersedia setelah kapal berangkat
                </span>
            );
        }

        return null;
    };

    return (
        <AppLayout
            title={`Detail Kapal — ${vessel.name}`}
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title={`${vessel.name} — Detail Kapal PT Samudra Jaya Andalas`} />
            {clearanceToast && (
                <AlertToast {...clearanceToast} onClose={() => setClearanceToast(null)} />
            )}
            {clearanceDirection && (
                <VesselClearanceDialog
                    key={clearanceDirection}
                    direction={clearanceDirection}
                    vesselName={vessel.name}
                    portCalls={clearancePortCalls}
                    selectedPortCallId={selectedPortCallId}
                    onClose={() => setClearanceDirection(null)}
                    onFeedback={setClearanceToast}
                />
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MOBILE VIEW (< md): EXACT MATCH TO "2. Detail Kapal (Overview)"
                AND FLOW "3-8. Tambah Kebutuhan"
               ═══════════════════════════════════════════════════════════════ */}
            <div
                className={`${needFlowStep === 'none' ? 'md:hidden' : 'md:mx-auto md:w-full md:max-w-7xl'} min-h-[calc(100dvh-3.5rem)] bg-white pb-0 dark:bg-[#0C1D36] md:min-h-0 md:bg-transparent dark:md:bg-transparent`}
            >
                {/* ─────────────────────────────────────────────────────────────
                    SUB-FLOW A: NORMAL DETAIL KAPAL (OVERVIEW / AKTIVITAS / KEBUTUHAN / PENGAJUAN)
                   ───────────────────────────────────────────────────────────── */}
                {needFlowStep === 'none' && (
                    <div>
                        {/* Ship Hero Photo starts below the shared mobile header. */}
                        <div
                            className={
                                'relative h-52 w-full overflow-hidden ' +
                                (vessel.image
                                    ? 'bg-slate-900'
                                    : 'bg-gradient-to-br from-[#082870] via-[#0D3880] to-[#0060F4] dark:from-[#071322] dark:via-[#0B1E38] dark:to-[#173B5C]')
                            }
                        >
                            {vessel.image ? (
                                <img
                                    src={vessel.image}
                                    alt={vessel.name}
                                    width={1280}
                                    height={720}
                                    fetchPriority="high"
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-25 dark:opacity-30">
                                    <ShipIcon aria-hidden="true" className="size-36 text-white dark:text-[#38BDF8]" strokeWidth={1.25} />
                                </div>
                            )}

                            {canUpdateShip && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/20 text-white text-[11px] font-semibold backdrop-blur-md shadow-xs transition-all cursor-pointer"
                                >
                                    <Camera aria-hidden="true" className="size-3" />
                                    <span>{vessel.image ? 'Ganti Foto' : 'Unggah Foto'}</span>
                                </button>
                            )}

                            <div className="absolute bottom-3 right-3 z-10">
                                {renderStatusBadge(vessel.status)}
                            </div>
                        </div>

                        {/* Top Header Bar */}
                        <div
                            className={
                                'sticky top-16 z-20 bg-white dark:bg-[#0C1D36] ' +
                                'px-4 py-2 grid grid-cols-[44px_1fr_44px] ' +
                                'items-center border-b border-[#DCEAF8] dark:border-[#1E3A5F]'
                            }
                        >
                            <Link
                                href="/vessels"
                                className="-ml-2 flex size-11 items-center justify-center rounded-full text-[#082870] transition-colors hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-white dark:hover:bg-[#152E52]"
                                aria-label="Kembali ke Menu Kapal"
                            >
                                <svg
                                    aria-hidden="true"
                                    className="size-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 19l-7-7 7-7"
                                    />
                                </svg>
                            </Link>

                            <h1 className="text-center text-sm font-bold text-[#082870] dark:text-white truncate px-1">
                                {vessel.name}
                            </h1>

                            <div className="size-11" />
                        </div>

                        {/* Continuous Seamless Content Surface */}
                        <div className="bg-white dark:bg-[#0C1D36] pb-3 min-h-[calc(100vh-20rem)]">
                            {/* Ship Name & Subtitle Card */}
                            <div className="px-4 pt-4 pb-0 border-b border-[#E2EEF9] dark:border-[#1E3A5F]">
                                <h2 className="text-xl font-extrabold text-[#082870] dark:text-white leading-tight">
                                    {vessel.name}
                                </h2>
                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                    {vessel.ship_type || 'Tipe belum diisi'}
                                </p>

                                {/* 4 Tabs: Overview | Aktivitas | Kebutuhan | Pengajuan */}
                                <div className="mt-4 grid grid-cols-4 gap-1 text-xs font-semibold">
                                    {mobileTabs.map((t) => {
                                        const isActive = mobileTab === t.key;
                                        return (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() => setMobileTab(t.key)}
                                                aria-pressed={isActive}
                                                className={`relative flex min-h-11 items-center justify-center rounded-t-lg pb-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${
                                                    isActive
                                                        ? 'text-[#0060F4] font-bold dark:text-[#38BDF8]'
                                                        : 'text-[#52658E] dark:text-[#94A3B8] hover:text-[#0060F4]'
                                                }`}
                                            >
                                                <span>{t.label}</span>
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="vessel-tab-indicator"
                                                        className={
                                                            'absolute bottom-0 left-0 right-0 ' +
                                                            'h-0.5 bg-[#0060F4] rounded-full'
                                                        }
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── TAB 1: OVERVIEW (SEAMLESS DIRECT VIEW) ── */}
                            {mobileTab === 'overview' && (
                                <div>
                                    {(selectedVisit?.completion_note || canCreateCompletionNotes) && (
                                        <div className="px-4 pt-4">
                                            {renderCompletionNoteAction(true)}
                                        </div>
                                    )}
                                    <div className="px-4 pt-4">{financialSummary}</div>
                                    <OverviewTab
                                        vessel={vessel}
                                        selectedSection={selectedSection}
                                        onStartNeed={() => setNeedFlowStep('header')}
                                        onRecordActivity={() => setShowActivityModal(true)}
                                        canManageClearance={canManageClearance}
                                        canCreateRequests={canCreateRequests}
                                        onClearance={(direction) => {
                                            setClearanceToast(null);
                                            setClearanceDirection(direction);
                                        }}
                                    />
                                </div>
                            )}

                            {/* ── TAB 2: AKTIVITAS (SEAMLESS VIEW) ── */}
                            {mobileTab === 'aktivitas' && (
                                <ActivityTab
                                    activities={vessel.operational_activities || []}
                                    onRecordActivity={() => setShowActivityModal(true)}
                                    canRecord={canManageClearance}
                                />
                            )}

                            {/* ── TAB 3: KEBUTUHAN (SEAMLESS VIEW) ── */}
                            {mobileTab === 'kebutuhan' && (
                                <NeedsTab
                                    needs={needs}
                                    onStartNeed={() => setNeedFlowStep('header')}
                                    filterTab={kebutuhanFilterTab}
                                    onFilterChange={setKebutuhanFilterTab}
                                    canCreate={canCreateRequests}
                                />
                            )}

                            {/* ── TAB 4: PENGAJUAN (SEAMLESS VIEW) ── */}
                            {mobileTab === 'pengajuan' && (
                                <RequestsTab
                                    requests={visitRequests}
                                    canProcess={canProcessRequests}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    SUB-FLOW B: STEP 1 - TAMBAH KEBUTUHAN (HEADER FORM - SCREEN 3)
                   ───────────────────────────────────────────────────────────── */}
                <VesselNeedFlow
                    vessel={vessel}
                    products={products}
                    portCallId={selectedVisit?.id}
                    clientPicName={selectedVisit?.client_pic_name}
                    clientPicContact={selectedVisit?.client_pic_contact}
                    step={needFlowStep}
                    section={selectedSection}
                    users={users}
                    onSectionChange={setSelectedSection}
                    onStepChange={setNeedFlowStep}
                    onReturnToOverview={() => setMobileTab('overview')}
                />
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                DESKTOP VIEW (>= md): COMPLETE CORPORATE MARITIME MASTER VIEW
               ═══════════════════════════════════════════════════════════════ */}
            <div className={needFlowStep === 'none' ? 'hidden md:block' : 'hidden'}>
                <div className="mx-auto max-w-7xl space-y-5 pb-12">
                    {/* Header */}
                    <div className="flex items-end justify-between gap-4 border-b border-[#DCEAF8] pb-4 dark:border-[#1E3A5F]">
                        <div className="min-w-0 space-y-1">
                            <Link
                                href="/vessels"
                                className={
                                    'mb-1 inline-flex min-h-9 items-center gap-1.5 rounded-lg pr-2 text-xs ' +
                                    'font-bold text-[#0060F4] hover:text-[#0050D0] focus-visible:outline-2 ' +
                                    'focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#38BDF8]'
                                }
                            >
                                <ArrowLeft aria-hidden="true" className="size-4" />
                                Kembali ke menu Kapal
                            </Link>
                            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                                <h1 className="text-balance text-2xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">
                                    {vessel.name}
                                </h1>
                                <StatusBadge
                                    status={vessel.status}
                                    label={vessel.status}
                                    showDot
                                    size="md"
                                />
                            </div>
                            <p className="text-pretty text-xs text-[#52658E] dark:text-[#94A3B8]">
                                IMO:{' '}
                                <span className="font-mono font-semibold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">
                                    {vessel.imo_number || '-'}
                                </span>{' '}
                                • Tipe: {vessel.ship_type || '-'} • Agen:{' '}
                                {vessel.agent_name || 'PT Samudra Jaya Andalas'}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {renderCompletionNoteAction()}
                            {canCreateRequests && (
                                <Button
                                    type="button"
                                    className="shrink-0"
                                    leftIcon={<Plus aria-hidden="true" className="size-4" />}
                                    onClick={() => setNeedFlowStep('header')}
                                >
                                    Buat kebutuhan
                                </Button>
                            )}
                        </div>
                    </div>

                    {financialSummary}

                    {/* Vessel Hero Image Banner */}
                    <div
                        className={
                            'relative h-52 lg:h-60 overflow-hidden rounded-2xl border border-[#DCEAF8] shadow-sm dark:border-[#1E3A5F] ' +
                            (vessel.image
                                ? 'bg-slate-900'
                                : 'bg-gradient-to-br from-[#082870] via-[#0D3880] to-[#0060F4] dark:from-[#071322] dark:via-[#0B1E38] dark:to-[#173B5C]')
                        }
                    >
                        {/* Hidden File Input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleFileSelected}
                        />

                        {vessel.image ? (
                            <>
                                <img
                                    src={vessel.image}
                                    alt={vessel.name}
                                    width={1600}
                                    height={520}
                                    fetchPriority="high"
                                    className="size-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#082870]/95 via-[#082870]/40 via-45% to-transparent dark:from-[#071322]/95 dark:via-[#071322]/40" />
                            </>
                        ) : (
                            <>
                                {/* Subtle Ambient Maritime Circles */}
                                <div className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full border border-white/10 dark:border-[#38BDF8]/10" />
                                <div className="pointer-events-none absolute -right-32 -top-32 size-112 rounded-full border border-white/5 dark:border-[#38BDF8]/5" />
                                <div className="pointer-events-none absolute right-24 bottom-0 size-48 rounded-full bg-cyan-400/10 blur-2xl dark:bg-sky-400/10" />

                                {/* Prominent Ship Watermark Illustration */}
                                <div className="pointer-events-none absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 opacity-25 dark:opacity-30">
                                    <ShipIcon aria-hidden="true" className="size-44 sm:size-52 text-white dark:text-[#38BDF8]" strokeWidth={1.25} />
                                </div>
                            </>
                        )}

                        {/* Top-Right Quick Action: Ganti / Unggah Foto */}
                        {canUpdateShip && (
                            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/35 hover:bg-black/50 border border-white/20 text-white text-xs font-semibold backdrop-blur-md shadow-sm transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                    title={vessel.image ? 'Ganti foto kapal' : 'Unggah foto kapal'}
                                >
                                    <Camera aria-hidden="true" className="size-3.5" />
                                    <span>{vessel.image ? 'Ganti Foto' : 'Unggah Foto'}</span>
                                </button>
                                {vessel.image && (
                                    <button
                                        type="button"
                                        onClick={handleDeletePhoto}
                                        disabled={isUploadingPhoto}
                                        className="inline-flex size-8 items-center justify-center rounded-xl bg-black/35 hover:bg-[#C62840] border border-white/20 text-white text-xs backdrop-blur-md shadow-sm transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                        title="Hapus foto kapal"
                                    >
                                        <Trash2 aria-hidden="true" className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Bottom Metadata Content */}
                        <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
                            <div className="min-w-0 space-y-1.5 text-white">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={
                                            'inline-flex items-center rounded-full border border-white/25 bg-white/20 px-2.5 py-0.5 ' +
                                            'text-xs font-bold backdrop-blur-xs'
                                        }
                                    >
                                        {vessel.ship_type || 'Tipe belum diisi'}
                                    </span>
                                    <span
                                        className={
                                            'inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 ' +
                                            'text-[11px] font-semibold text-white/90'
                                        }
                                    >
                                        Status: {vessel.status}
                                    </span>
                                </div>
                                <h2 className="truncate text-xl font-black sm:text-2xl lg:text-3xl tracking-tight drop-shadow-xs">
                                    {vessel.name}
                                </h2>
                                <p className="truncate text-xs sm:text-sm text-white/85 font-medium">
                                    Perusahaan: {vessel.company?.name || 'Belum diisi'}{' '}
                                    • Pelabuhan: {vessel.port?.name || 'Belum diisi'}
                                    {vessel.imo_number ? ` • IMO: ${vessel.imo_number}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid items-start gap-5 lg:grid-cols-3">
                        <Card title="Spesifikasi teknis kapal" titleLevel={2} padding="none" className="lg:col-span-2" overflow="hidden">
                            <dl className="grid gap-x-6 px-4 pb-2 text-xs sm:grid-cols-2 sm:px-5">
                                <div className="min-w-0 border-b border-[#DCEAF8] py-3 dark:border-[#1E3A5F]">
                                    <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        Perusahaan Pemilik
                                    </dt>
                                    <dd className="mt-1 break-words font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {vessel.company?.name || 'Belum diisi'}
                                    </dd>
                                </div>
                                <div className="min-w-0 border-b border-[#DCEAF8] py-3 dark:border-[#1E3A5F]">
                                    <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        Alamat Kantor
                                    </dt>
                                    <dd className="mt-1 break-words font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {vessel.company?.address || 'Belum diisi'}
                                    </dd>
                                </div>
                                <div className="min-w-0 border-b border-[#DCEAF8] py-3 dark:border-[#1E3A5F]">
                                    <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        Bendera Negara
                                    </dt>
                                    <dd className="mt-1 break-words font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {vessel.flag || 'Belum diisi'}
                                    </dd>
                                </div>
                                <div className="min-w-0 border-b border-[#DCEAF8] py-3 dark:border-[#1E3A5F]">
                                    <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        GT / Panjang
                                    </dt>
                                    <dd className="mt-1 font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {vessel.gross_tonnage ? `GT ${vessel.gross_tonnage}` : 'GT -'} /{' '}
                                        {vessel.length ? `${vessel.length} M` : '-'}
                                    </dd>
                                </div>
                                <div className="min-w-0 border-b border-[#DCEAF8] py-3 dark:border-[#1E3A5F]">
                                    <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        Call Sign
                                    </dt>
                                    <dd className="mt-1 font-mono font-bold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">
                                        {vessel.call_sign || 'Belum diisi'}
                                    </dd>
                                </div>
                                <div className="min-w-0 border-b border-[#DCEAF8] py-3 dark:border-[#1E3A5F]">
                                    <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        Nakhoda / Captain
                                    </dt>
                                    <dd className="mt-1 break-words font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {vessel.captain_name || 'Belum diisi'}
                                    </dd>
                                </div>
                            </dl>
                        </Card>

                        {/* Jadwal & Quick Action */}
                        <Card title="Jadwal kedatangan (ETA)" titleLevel={2} padding="none" overflow="hidden">
                            <div className="space-y-4 p-4 sm:p-5">
                                {canCreateRequests && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            className="w-full"
                                            onClick={() => {
                                                setClearanceToast(null);
                                                setClearanceDirection('in');
                                            }}
                                        >
                                            Clearance In
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => {
                                                setClearanceToast(null);
                                                setClearanceDirection('out');
                                            }}
                                        >
                                            Clearance Out
                                        </Button>
                                    </div>
                                )}
                                <dl className="divide-y divide-[#DCEAF8] text-xs dark:divide-[#1E3A5F]">
                                    <div className="py-3 first:pt-0">
                                        <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                            Waktu ETA
                                        </dt>
                                        <dd className="mt-1 text-sm font-bold tabular-nums text-[#0060F4] dark:text-[#60A5FA]">
                                            {formatEtaDateTime(vessel.eta)}
                                        </dd>
                                    </div>
                                    <div className="py-3 last:pb-0">
                                        <dt className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                            Pelabuhan Labuh / Sandar
                                        </dt>
                                        <dd className="mt-1 break-words font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {vessel.port?.name || 'Belum diisi'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </Card>
                    </div>

                    <RequestsTab requests={visitRequests} canProcess={canProcessRequests} headingLevel={2} />
                </div>
            </div>

            {/* Modal Catat Aktivitas Lapangan */}
            <Modal
                isOpen={showActivityModal}
                onClose={() => {
                    setActivityError(null);
                    setActivityErrors({});
                    setShowActivityModal(false);
                }}
                title="Catat Aktivitas Lapangan"
                size="md"
                asBottomSheetOnMobile={true}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSavingActivity}
                            onClick={() => {
                                setActivityError(null);
                                setActivityErrors({});
                                setShowActivityModal(false);
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            isLoading={isSavingActivity}
                            onClick={handleSaveActivity}
                        >
                            Simpan Aktivitas
                        </Button>
                    </>
                }
            >
                <form noValidate onSubmit={handleSaveActivity} className="space-y-3.5 text-left text-xs">
                    <FormErrorSummary errors={activityErrors} />
                    {activityError && Object.keys(activityErrors).length === 0 && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-1.5">
                            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
                            <span>{activityError}</span>
                        </div>
                    )}

                    {/* 1. Tanggal & Waktu */}
                    <DateTimePicker
                        id="vessel-activity-date-time"
                        label="Tanggal & waktu"
                        dateName="activity_date"
                        timeName="activity_time"
                        dateValue={activityDate}
                        timeValue={activityTime}
                        onDateChange={setActivityDate}
                        onTimeChange={setActivityTime}
                        layout="combined"
                        className="[&_legend]:!text-[#0B1F63] dark:[&_legend]:!text-[#F1F5F9]"
                        dateError={activityErrors.activity_date}
                        timeError={activityErrors.activity_time}
                        required
                    />

                    {/* 2. Lokasi / Area (Auto-detected via GPS, editable) */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="vessel-activity-location" className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Lokasi / Area <span className="text-[#C62840]">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={geo.refresh}
                                className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[#0060F4] hover:bg-[#F0F8FF] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#38BDF8] dark:hover:bg-[#132847]"
                                title="Deteksi lokasi saat ini"
                            >
                                <RefreshCw aria-hidden="true" className={`size-3 ${geo.loading ? 'animate-spin' : ''}`} />
                                <span>{geo.loading ? 'Mendeteksi…' : 'GPS Auto'}</span>
                            </button>
                        </div>
                        <div className="relative">
                            <MapPin aria-hidden="true" className="absolute left-3 top-2.5 size-4 text-[#52658E] dark:text-[#94A3B8]" />
                            <input
                                id="vessel-activity-location"
                                name="location_name"
                                type="text"
                                autoComplete="off"
                                required
                                value={activityLocation}
                                onChange={(e) => setActivityLocation(e.target.value)}
                                placeholder="Contoh: Dermaga A, Area Bongkar Muat, Gate, dll"
                                aria-invalid={activityErrors.location_name ? true : undefined}
                                aria-describedby={activityErrors.location_name ? 'vessel-activity-location-error' : undefined}
                                className={`w-full rounded-xl border bg-white py-2 pl-9 pr-3 text-xs text-[#082870] outline-none transition-[border-color,box-shadow] focus:ring-2 dark:bg-[#0C1D36] dark:text-white ${
                                    activityErrors.location_name
                                        ? 'border-[#C62840] focus:ring-[#C62840]/20 dark:border-[#EF4444]'
                                        : 'border-[#DCEAF8] focus:border-[#0060F4] focus:ring-[#0060F4]/20 dark:border-[#1E3A5F]'
                                }`}
                            />
                        </div>
                        {activityErrors.location_name && (
                            <p id="vessel-activity-location-error" role="alert" className="mt-1 text-[11px] font-semibold text-[#C62840] dark:text-[#F87171]">
                                {activityErrors.location_name}
                            </p>
                        )}
                    </div>

                    {/* 3. Terkait Kapal (Job) */}
                    <div className="p-3 rounded-2xl bg-[#F0F8FF]/80 dark:bg-[#071322] border border-[#BCE0FD] dark:border-[#1E3A5F] space-y-2">
                        <div className="flex items-center gap-2">
                            <ShipIcon aria-hidden="true" className="size-4 text-[#0060F4] dark:text-[#38BDF8]" />
                            <span className="font-bold text-xs text-[#082870] dark:text-white">
                                {vessel.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-[#FEF3C7] text-[#D97706] ml-auto">
                                {vessel.status}
                            </span>
                        </div>

                        {selectedVisit && (
                            <p className="text-[11px] font-medium text-[#52658E] dark:text-[#94A3B8]">
                                Job kunjungan: <span className="font-bold text-[#082870] dark:text-white">{selectedVisit.job_number || selectedVisit.id}</span>
                            </p>
                        )}
                    </div>

                    {/* 4. Kategori / Jenis Aktivitas */}
                    <fieldset className="space-y-2">
                        <legend className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                            Kategori Aktivitas
                        </legend>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                'Bongkar Muat',
                                'Kegiatan Kapal',
                                'Kendala Operasional',
                                'Inspeksi & Dokumen',
                                'Lainnya',
                            ].map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    aria-pressed={activityCategory === cat}
                                    onClick={() => {
                                        setActivityCategory(cat);
                                        if (cat !== 'Lainnya') {
                                            setActivityCategoryOther('');
                                        }
                                    }}
                                    className={`min-h-9 rounded-xl px-3 py-1 text-[11px] font-bold transition-[background-color,border-color,color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${
                                        activityCategory === cat
                                            ? 'bg-[#0060F4] text-white shadow-xs'
                                            : 'bg-[#F0F8FF] dark:bg-[#071322] text-[#082870] dark:text-[#94A3B8] border border-[#DCEAF8] dark:border-[#1E3A5F]'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        {activityCategory === 'Lainnya' && (
                            <Input
                                id="vessel-activity-category-other"
                                label="Jenis aktivitas lainnya"
                                name="category_other"
                                type="text"
                                autoComplete="off"
                                value={activityCategoryOther}
                                onChange={(event) => setActivityCategoryOther(event.target.value)}
                                placeholder="Contoh: Koordinasi pandu atau pengisian air tawar"
                                maxLength={100}
                                sizeVariant="sm"
                                required
                                error={activityErrors.category_other}
                            />
                        )}
                    </fieldset>

                    {/* 5. Judul / Jenis Aktivitas */}
                    <Input
                        label="Judul / Jenis Aktivitas"
                        name="title"
                        required
                        value={activityTitle}
                        onChange={(e) => setActivityTitle(e.target.value)}
                        placeholder="Contoh: Bongkar muat sedang berlangsung"
                        sizeVariant="sm"
                        error={activityErrors.title}
                    />

                    {/* 6. Detail Aktivitas */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="vessel-activity-detail" className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Detail Aktivitas <span className="text-[#C62840]">*</span>
                            </label>
                            <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                {activityDetail.length}/500
                            </span>
                        </div>
                        <textarea
                            id="vessel-activity-detail"
                            name="detail"
                            autoComplete="off"
                            rows={3}
                            maxLength={500}
                            required
                            value={activityDetail}
                            onChange={(e) => setActivityDetail(e.target.value)}
                            placeholder="Jelaskan kondisi atau kegiatan yang terjadi di lapangan…"
                            aria-invalid={activityErrors.detail ? true : undefined}
                            aria-describedby={activityErrors.detail ? 'vessel-activity-detail-error' : undefined}
                            className={`w-full resize-none rounded-xl border bg-white p-2.5 text-xs text-[#082870] outline-none transition-[border-color,box-shadow] focus:ring-2 dark:bg-[#0C1D36] dark:text-white ${
                                activityErrors.detail
                                    ? 'border-[#C62840] focus:ring-[#C62840]/20 dark:border-[#EF4444]'
                                    : 'border-[#DCEAF8] focus:border-[#0060F4] focus:ring-[#0060F4]/20 dark:border-[#1E3A5F]'
                            }`}
                        />
                        {activityErrors.detail && (
                            <p id="vessel-activity-detail-error" role="alert" className="mt-1 text-[11px] font-semibold text-[#C62840] dark:text-[#F87171]">
                                {activityErrors.detail}
                            </p>
                        )}
                    </div>

                    {/* 7. Foto / Dokumentasi (Multiple, Kamera + Galeri, Opsional) */}
                    <MultiplePhotoUploadPicker
                        files={activityPhotos}
                        onFilesChange={setActivityPhotos}
                        label="Foto / Dokumentasi"
                        required={false}
                        helperText="Format: JPG, PNG (Maks. 5 MB)"
                        error={activityErrors.photos || activityErrors['photos.0']}
                    />
                </form>
            </Modal>

            {/* Modal Upload / Ganti Foto Kapal */}
            <Modal
                isOpen={isPhotoModalOpen}
                onClose={() => {
                    if (!isUploadingPhoto) {
                        setIsPhotoModalOpen(false);
                        setPhotoFile(null);
                        setPhotoPreview(null);
                    }
                }}
                title="Unggah Foto Kapal"
                subtitle={`Pilih foto terbaik untuk ${vessel.name}`}
                size="md"
            >
                <div className="space-y-4">
                    {photoPreview && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-slate-100 dark:bg-slate-800">
                            <img
                                src={photoPreview}
                                alt="Pratinjau Foto Kapal"
                                className="size-full object-cover"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-[#52658E] dark:text-[#94A3B8]">
                        <span className="truncate max-w-[200px]">File: {photoFile?.name}</span>
                        <span>{photoFile ? `${(photoFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-[#DCEAF8] pt-4 dark:border-[#1E3A5F]">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsPhotoModalOpen(false);
                                setPhotoFile(null);
                                setPhotoPreview(null);
                            }}
                            disabled={isUploadingPhoto}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleUploadPhoto}
                            disabled={!photoFile || isUploadingPhoto}
                            leftIcon={<Upload aria-hidden="true" className="size-4" />}
                        >
                            {isUploadingPhoto ? 'Menyimpan…' : 'Simpan Foto'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
