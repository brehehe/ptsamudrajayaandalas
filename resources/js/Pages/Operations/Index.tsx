import React, { useEffect, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import Logo from '../../Components/ui/Logo';
import { Link } from '@inertiajs/react';
import MultiplePhotoUploadPicker from '../../Components/forms/MultiplePhotoUploadPicker';
import Input from '../../Components/forms/Input';
import Textarea from '../../Components/forms/Textarea';
import RadioGroup from '../../Components/forms/Radio';
import DateTimePicker from '../../Components/forms/DateTimePicker';
import DateRangePicker, { DateRange } from '../../Components/forms/DateRangePicker';
import Select from '../../Components/selects/Select';
import { useGeolocation } from '../../hooks/useGeolocation';
import { OperationalActivityData } from '../../Components/vessels/types';
import { PageProps } from '@/types';
import { ListChecks, MapPin, Send } from 'lucide-react';

/* ─── Domain Interfaces ─────────────────────────────────────────── */

interface PortCall {
    id: string;
    job_number: string;
    status: string;
    eta_at: string;
    etd_at: string;
    arrived_at?: string;
    berthed_at?: string;
    departed_at?: string;
    financial_status: string;
    ship?: {
        id: string;
        name: string;
        imo_number: string;
        company?: { name: string };
    };
    port?: { name: string; code: string };
    work_order?: { system_number: string; client_pic_name?: string };
    daily_reports?: Array<{
        id: string;
        report_date: string;
        summary: string;
        officer?: { name: string };
    }>;
}

interface DailyReport {
    id: string;
    report_date: string;
    summary: string;
    no_activity: boolean;
    submitted_at: string;
    port_call?: {
        job_number: string;
        ship?: { name: string };
        port?: { name: string };
    };
    officer?: { name: string };
}

interface OperationsIndexProps {
    portCalls: PortCall[];
    dailyReports: DailyReport[];
    ships: Array<{ id: string; name: string }>;
    ports: Array<{ id: string; name: string }>;
    requests: Array<{ id: string; request_number: string; ship_id?: string; port_call_id?: string; ship?: { id: string; name: string } }>;
    operationalActivities: OperationalActivityData[];
    counts: {
        kunjungan: number;
        laporan: number;
        aktivitas: number;
        berthed: number;
        anchored: number;
    };
    activeTab: string;
    search: string;
}

/* ─── Category helpers ──────────────────────────────────────────── */

const CATEGORIES = ['Semua', 'Kegiatan Kapal', 'Kendala', 'Lainnya'] as const;

function categoryBadgeClass(cat: string) {
    switch (cat) {
        case 'Kegiatan Kapal':
        case 'Bongkar Muat':
            return 'bg-blue-100 text-blue-700';
        case 'Kendala Operasional':
        case 'Kendala':
            return 'bg-rose-100 text-rose-700';
        default:
            return 'bg-emerald-100 text-emerald-700';
    }
}

function categoryLabel(cat: string) {
    if (cat === 'Kegiatan Kapal' || cat === 'Bongkar Muat') return 'Kegiatan Kapal';
    if (cat === 'Kendala Operasional' || cat === 'Kendala') return 'Kendala';
    return cat || 'Aktivitas Lainnya';
}

function vesselPositionLabel(position?: OperationalActivityData['vessel_position']): string {
    const labels: Record<string, string> = {
        scheduled: 'Belum Tiba',
        anchored: 'Labuh',
        berthed: 'Sandar',
        departed: 'Berangkat',
    };

    return labels[position ?? ''] ?? 'Tidak tersedia';
}

function parseDateKey(rawDate?: string | null): string {
    if (!rawDate) return '';
    if (rawDate.includes('T')) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return rawDate.split('T')[0];
    }
    return rawDate;
}

function formatDateIndo(rawDate?: string | null, withDay = true): string {
    const key = parseDateKey(rawDate);
    if (!key) return '—';
    const parts = key.split('-');
    if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('id-ID', {
            weekday: withDay ? 'long' : undefined,
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }
    const d = new Date(key);
    return isNaN(d.getTime()) ? key : d.toLocaleDateString('id-ID', {
        weekday: withDay ? 'long' : undefined,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function groupByDay(acts: OperationalActivityData[]) {
    const groups: Record<string, OperationalActivityData[]> = {};
    for (const a of acts) {
        const key = parseDateKey(a.activity_date);
        if (!key) continue;
        if (!groups[key]) groups[key] = [];
        groups[key].push(a);
    }
    return groups;
}

function getGroupDisplayHeader(key: string): { title: string; subtitle: string } {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const fullFormatted = formatDateIndo(key, true);
    const shortFormatted = formatDateIndo(key, false);

    if (key === todayStr) {
        return { title: 'Hari Ini', subtitle: fullFormatted };
    }
    if (key === yesterdayStr) {
        return { title: 'Kemarin', subtitle: fullFormatted };
    }
    return { title: shortFormatted, subtitle: fullFormatted.split(',')[0] || '' };
}

/* ─── Main Component ─────────────────────────────────────────────── */

export default function OperationsIndex({
    portCalls,
    dailyReports,
    ships,
    requests,
    operationalActivities,
    counts,
    activeTab: initialTab,
    search: initialSearch,
}: OperationsIndexProps) {
    const page = usePage<PageProps>();
    const { auth, flash } = page.props as PageProps & { flash?: { success?: string; error?: string } };
    const user = auth?.user;

    /* ── Desktop state ── */
    const [tab, setTab] = useState(initialTab || 'kunjungan');
    const [search, setSearch] = useState(initialSearch);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [departurePortCall, setDeparturePortCall] = useState<PortCall | null>(null);
    const [completionNoteDueAt, setCompletionNoteDueAt] = useState('');

    /* ── Mobile state ── */
    const [mobileTab, setMobileTab] = useState<'form' | 'riwayat'>('form');
    const [riwayatCategoryFilter, setRiwayatCategoryFilter] = useState('Semua');
    const [showHistoryFilters, setShowHistoryFilters] = useState(true);
    const mobileFormTabRef = useRef<HTMLButtonElement>(null);
    const mobileHistoryTabRef = useRef<HTMLButtonElement>(null);

    /* ── Activity form state ── */
    const [actPhotos, setActPhotos] = useState<File[]>([]);
    const [actTitle, setActTitle] = useState('');
    const [actDetail, setActDetail] = useState('');
    const [actCategory, setActCategory] = useState('Kegiatan Kapal');
    const [actCategoryOther, setActCategoryOther] = useState('');
    const [actIsVesselRelated, setActIsVesselRelated] = useState(true);
    const [actShipId, setActShipId] = useState('');
    const [actPortCallId, setActPortCallId] = useState('');
    const [actRequestId, setActRequestId] = useState('');
    const [actVesselPosition, setActVesselPosition] = useState('');
    const [actCargoActivity, setActCargoActivity] = useState('tidak_ada');
    const [actCargoQuantity, setActCargoQuantity] = useState('');
    const [actCargoUnit, setActCargoUnit] = useState('Ton');
    const [actProgressPercent, setActProgressPercent] = useState('');
    const [actConstraints, setActConstraints] = useState('');
    const [actNextPlan, setActNextPlan] = useState('');
    const [actDate, setActDate] = useState(new Date().toISOString().slice(0, 10));
    const [actTime, setActTime] = useState(
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    );
    const [actLocationName, setActLocationName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);

    /* ── Lightbox & Detail state ── */
    const [selectedActivity, setSelectedActivity] = useState<OperationalActivityData | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });

    /* ── Geolocation ── */
    const geo = useGeolocation('');

    useEffect(() => {
        if (geo.locationName && !actLocationName) {
            setActLocationName(geo.locationName);
        }
    }, [geo.locationName]);

    /* ── Flash success ── */
    useEffect(() => {
        if (flash?.success) {
            setShowSuccessAlert(true);
            const t = setTimeout(() => setShowSuccessAlert(false), 4000);
            return () => clearTimeout(t);
        }
    }, [flash?.success]);

    /* ── Daily report form ── */
    const { data, setData, post, processing, reset } = useForm({
        port_call_id: portCalls[0]?.id || '',
        report_date: new Date().toISOString().split('T')[0],
        summary: '',
        no_activity: false,
    });

    /* ── Handlers ── */
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/operations', { tab, search }, { preserveState: true });
    };

    const handleStatusChange = (portCall: PortCall, newStatus: string) => {
        if (newStatus === 'departed') {
            setDeparturePortCall(portCall);
            setCompletionNoteDueAt('');
            return;
        }
        router.patch(`/operations/port-calls/${portCall.id}/status`, { status: newStatus, expected_status: portCall.status }, { preserveScroll: true });
    };

    const submitDeparture = (event: React.FormEvent) => {
        event.preventDefault();
        if (!departurePortCall) return;
        router.patch(`/operations/port-calls/${departurePortCall.id}/status`, {
            status: 'departed', expected_status: departurePortCall.status,
            occurred_at: new Date().toISOString(), completion_note_due_at: completionNoteDueAt,
        }, { preserveScroll: true, onSuccess: () => setDeparturePortCall(null) });
    };

    const handleReportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/operations/daily-reports', {
            onSuccess: () => {
                setIsReportModalOpen(false);
                reset();
            },
        });
    };

    const handleActivitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        if (!actTitle.trim()) {
            setSubmitError('Judul aktivitas wajib diisi.');
            return;
        }
        if (!actDetail.trim()) {
            setSubmitError('Detail aktivitas wajib diisi.');
            return;
        }
        if (actCategory === 'Aktivitas Lainnya' && !actCategoryOther.trim()) {
            setSubmitError('Jenis aktivitas lainnya wajib diisi.');
            return;
        }
        if (actIsVesselRelated && (!actShipId || !actPortCallId || !actVesselPosition)) {
            setSubmitError('Kapal, kunjungan / job, dan posisi kapal wajib dipilih.');
            return;
        }

        setSubmitting(true);
        const fd = new FormData();
        fd.append('activity_date', actDate);
        fd.append('activity_time', actTime);
        fd.append('location_name', actLocationName || 'Area Pelabuhan');
        fd.append('latitude', geo.latitude !== null ? String(geo.latitude) : '');
        fd.append('longitude', geo.longitude !== null ? String(geo.longitude) : '');
        fd.append('is_vessel_related', actIsVesselRelated ? '1' : '0');
        if (actIsVesselRelated && actShipId) fd.append('ship_id', actShipId);
        if (actIsVesselRelated && actPortCallId) fd.append('port_call_id', actPortCallId);
        if (actRequestId) fd.append('request_id', actRequestId);
        if (actIsVesselRelated && actVesselPosition) fd.append('vessel_position', actVesselPosition);
        if (actCargoActivity) fd.append('cargo_activity', actCargoActivity);
        if (actCargoQuantity) fd.append('cargo_quantity', actCargoQuantity);
        if (actCargoQuantity && actCargoUnit) fd.append('cargo_unit', actCargoUnit);
        if (actProgressPercent) fd.append('progress_percent', actProgressPercent);
        if (actConstraints.trim()) fd.append('constraints', actConstraints.trim());
        if (actNextPlan.trim()) fd.append('next_plan', actNextPlan.trim());
        fd.append('category', actCategory);
        if (actCategory === 'Aktivitas Lainnya') {
            fd.append('category_other', actCategoryOther.trim());
        }
        fd.append('title', actTitle);
        fd.append('detail', actDetail);
        actPhotos.forEach((f) => fd.append('photos[]', f));

        router.post('/operations/activities', fd, {
            forceFormData: true,
            onSuccess: () => {
                setActTitle('');
                setActDetail('');
                setActPhotos([]);
                setActShipId('');
                setActPortCallId('');
                setActRequestId('');
                setActVesselPosition('');
                setActCargoActivity('tidak_ada');
                setActCargoQuantity('');
                setActCargoUnit('Ton');
                setActProgressPercent('');
                setActConstraints('');
                setActNextPlan('');
                setActIsVesselRelated(true);
                setActCategory('Kegiatan Kapal');
                setActCategoryOther('');
                setShowSuccessAlert(true);
                setMobileTab('riwayat');
                setSubmitting(false);
            },
            onError: (errors) => {
                const first = Object.values(errors)[0];
                setSubmitError(typeof first === 'string' ? first : 'Gagal menyimpan aktivitas.');
                setSubmitting(false);
            },
        });
    };

    const selectActivityShip = (shipId: string) => {
        const matchingVisit = portCalls.find((portCall) => portCall.ship?.id === shipId);

        setActShipId(shipId);
        setActPortCallId(matchingVisit?.id ?? '');
        setActVesselPosition(matchingVisit?.status ?? '');
        setActRequestId('');
    };

    const handleMobileTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        let nextTab: 'form' | 'riwayat' | null = null;

        if (event.key === 'ArrowLeft' || event.key === 'Home') {
            nextTab = 'form';
        } else if (event.key === 'ArrowRight' || event.key === 'End') {
            nextTab = 'riwayat';
        }

        if (!nextTab) {
            return;
        }

        event.preventDefault();
        setMobileTab(nextTab);
        (nextTab === 'form' ? mobileFormTabRef : mobileHistoryTabRef).current?.focus();
    };

    const formatDateTime = (dtStr?: string | null) => {
        if (!dtStr) return '-';
        return new Date(dtStr).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    /* ── Riwayat filtering ── */
    const filteredActivities = operationalActivities.filter((a) => {
        // 1. Category filter
        if (riwayatCategoryFilter === 'Kegiatan Kapal' && a.category !== 'Kegiatan Kapal' && a.category !== 'Bongkar Muat') return false;
        if (riwayatCategoryFilter === 'Kendala' && a.category !== 'Kendala Operasional' && a.category !== 'Kendala') return false;
        if (riwayatCategoryFilter === 'Lainnya' && (a.category === 'Kegiatan Kapal' || a.category === 'Bongkar Muat' || a.category === 'Kendala Operasional' || a.category === 'Kendala')) return false;

        // 2. Date range filter
        const rawDate = parseDateKey(a.activity_date);
        if (dateRange.startDate && rawDate < dateRange.startDate) return false;
        if (dateRange.endDate && rawDate > dateRange.endDate) return false;

        return true;
    });

    const catCounts = {
        Semua: operationalActivities.length,
        'Kegiatan Kapal': operationalActivities.filter(
            (a) => a.category === 'Kegiatan Kapal' || a.category === 'Bongkar Muat'
        ).length,
        Kendala: operationalActivities.filter(
            (a) => a.category === 'Kendala Operasional' || a.category === 'Kendala'
        ).length,
        Lainnya: operationalActivities.filter(
            (a) =>
                a.category !== 'Kegiatan Kapal' &&
                a.category !== 'Bongkar Muat' &&
                a.category !== 'Kendala Operasional' &&
                a.category !== 'Kendala'
        ).length,
    };

    const grouped = groupByDay(filteredActivities);
    const groupKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    /* ── User initials ── */
    const userInitials = user?.name
        ? user.name
              .split(' ')
              .map((w: string) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
        : 'PP';
    const userRole = user?.primary_role || user?.roles?.[0] || 'Staf Lapangan';

    /* ─────────────────────────────────────────────────────────────── */
    return (
        <AppLayout title="Operasional Lapangan & Kunjungan Kapal" transparentMobileHeader mobileBackground="surface">
            <Head title="Aktivitas Lapangan — PT Samudra Jaya Andalas" />

            {/* ═══════════════════════════════════════════════════════
                MOBILE VIEW (< md): Aktivitas Lapangan
                ═══════════════════════════════════════════════════════ */}
            <div className="flex min-h-[calc(100dvh-56px)] flex-col bg-[#F0F8FF] dark:bg-[#071322] md:hidden">

                {/* ── Hero Banner Header ── */}
                <div className="relative flex min-h-[200px] shrink-0 flex-col justify-end overflow-hidden px-4 pb-10 pt-14 text-white">
                    <img
                        src="/images/prima-banner.jpg"
                        alt="Kapal dan crane di area pelabuhan"
                        width={1280}
                        height={720}
                        fetchPriority="high"
                        className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#001433]/80 via-[#001433]/60 to-[#001433]/95 pointer-events-none" />

                    {/* Title */}
                    <div className="relative z-10">
                        <h1 className="text-balance text-2xl font-extrabold leading-tight text-white drop-shadow-sm">
                            Aktivitas Lapangan
                        </h1>
                        <p className="mt-1.5 max-w-sm text-pretty text-xs leading-relaxed text-white/85">
                            {mobileTab === 'form'
                                ? 'Catat setiap kegiatan dan kondisi di lapangan untuk memberikan update kepada atasan.'
                                : 'Lihat riwayat seluruh aktivitas yang telah Anda catat.'}
                        </p>
                    </div>
                </div>

                {/* ── Activity sheet with integrated tabs ── */}
                <section className="relative z-10 -mt-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px] border-t border-[#DCEAF8] bg-white shadow-sm dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                    <div
                        className="grid grid-cols-2 border-b border-[#DCEAF8] dark:border-[#1E3A5F]"
                        role="tablist"
                        aria-label="Aktivitas lapangan"
                    >
                        <button
                            ref={mobileFormTabRef}
                            type="button"
                            onClick={() => setMobileTab('form')}
                            onKeyDown={handleMobileTabKeyDown}
                            id="mobile-form-tab"
                            role="tab"
                            aria-controls="mobile-form-panel"
                            aria-selected={mobileTab === 'form'}
                            tabIndex={mobileTab === 'form' ? 0 : -1}
                            className={`flex min-h-14 items-center justify-center gap-2 border-b-2 px-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0060F4] ${
                                mobileTab === 'form'
                                    ? 'border-[#0060F4] bg-[#F0F8FF] text-[#0060F4] dark:bg-[#082870]/20'
                                    : 'border-transparent text-[#52658E] hover:bg-[#F8FBFF] dark:text-[#94A3B8] dark:hover:bg-[#132847]'
                            }`}
                        >
                            <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Form Aktivitas
                        </button>
                        <button
                            ref={mobileHistoryTabRef}
                            type="button"
                            onClick={() => setMobileTab('riwayat')}
                            onKeyDown={handleMobileTabKeyDown}
                            id="mobile-history-tab"
                            role="tab"
                            aria-controls="mobile-history-panel"
                            aria-selected={mobileTab === 'riwayat'}
                            tabIndex={mobileTab === 'riwayat' ? 0 : -1}
                            className={`flex min-h-14 items-center justify-center gap-2 border-b-2 px-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0060F4] ${
                                mobileTab === 'riwayat'
                                    ? 'border-[#0060F4] bg-[#F0F8FF] text-[#0060F4] dark:bg-[#082870]/20'
                                    : 'border-transparent text-[#52658E] hover:bg-[#F8FBFF] dark:text-[#94A3B8] dark:hover:bg-[#132847]'
                            }`}
                        >
                            <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Riwayat Aktivitas
                        </button>
                    </div>

                    {/* ── Success Alert ── */}
                    {showSuccessAlert && (
                        <div role="status" aria-live="polite" className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <svg aria-hidden="true" className="size-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Aktivitas lapangan berhasil dicatat!
                        </div>
                    )}

                {/* ════════════════════════════════════════════════════
                    TAB 1: FORM AKTIVITAS (Full-Bleed Edge-to-Edge)
                    ════════════════════════════════════════════════════ */}
                    {mobileTab === 'form' && (
                        <form
                            id="mobile-form-panel"
                            role="tabpanel"
                            aria-labelledby="mobile-form-tab"
                            onSubmit={handleActivitySubmit}
                            className="flex flex-1 flex-col pb-8"
                        >
                            <div className="w-full divide-y divide-[#DCEAF8]/70 bg-white dark:divide-[#1E3A5F] dark:bg-[#0C1D36]">

                                {/* Tanggal & Waktu */}
                                <div className="px-4 py-3">
                                    <DateTimePicker
                                        id="activity-date-time"
                                        label="Tanggal & waktu"
                                        dateName="activity_date"
                                        timeName="activity_time"
                                        dateValue={actDate}
                                        timeValue={actTime}
                                        onDateChange={setActDate}
                                        onTimeChange={setActTime}
                                        layout="combined"
                                        className="[&_legend]:!text-[#0B1F63] dark:[&_legend]:!text-[#F1F5F9] [&_input]:!bg-[#F8FBFF] dark:[&_input]:!bg-[#071322]"
                                        required
                                    />
                                </div>

                                {/* Lokasi */}
                                <div className="px-4 py-3">
                                    <Input
                                        id="activity-location"
                                        label="Lokasi / area"
                                        name="location_name"
                                        type="text"
                                        autoComplete="off"
                                        value={actLocationName}
                                        onChange={(event) => setActLocationName(event.target.value)}
                                        onFocus={() => {
                                            if (!actLocationName && !geo.loading) geo.refresh();
                                        }}
                                        placeholder="Contoh: Dermaga A, Area Bongkar Muat, atau Gate…"
                                        leftIcon={<MapPin aria-hidden="true" className="size-5 text-[#0060F4]" strokeWidth={2} />}
                                        className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                        required
                                    />
                                </div>

                                {/* Terkait Kapal? */}
                                <div className="px-4 py-3">
                                    <RadioGroup
                                        name="is_vessel_related"
                                        label="Terkait kapal?"
                                        required
                                        value={actIsVesselRelated ? '1' : '0'}
                                        onChange={(value) => setActIsVesselRelated(value === '1')}
                                        layout="grid-2"
                                        variant="card"
                                        itemClassName="min-h-24 !rounded-xl !p-3"
                                        options={[
                                            {
                                                value: '1',
                                                label: 'Ya, terkait kapal',
                                                description: 'Pilih jika aktivitas berhubungan dengan kapal tertentu.',
                                            },
                                            {
                                                value: '0',
                                                label: 'Tidak terkait kapal',
                                                description: 'Pilih untuk aktivitas umum di area pelabuhan.',
                                            },
                                        ]}
                                    />
                                </div>

                                {/* Pilih Kapal (conditional) */}
                                {actIsVesselRelated && (
                                    <div className="px-4 py-3">
                                        <Select
                                            id="activity-ship"
                                            label="Pilih kapal"
                                        name="ship_id"
                                        autoComplete="off"
                                        value={actShipId}
                                        onChange={(event) => selectActivityShip(event.target.value)}
                                        placeholder="Pilih kapal"
                                        options={ships.map((ship) => ({ value: ship.id, label: ship.name }))}
                                        className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                        required
                                    />
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <Select
                                            id="activity-port-call"
                                            label="Kunjungan / job"
                                            name="port_call_id"
                                            value={actPortCallId}
                                            onChange={(event) => {
                                                const visitId = event.target.value;
                                                const visit = portCalls.find((portCall) => portCall.id === visitId);
                                                setActPortCallId(visitId);
                                                setActVesselPosition(visit?.status ?? '');
                                                setActRequestId('');
                                            }}
                                            placeholder={actShipId ? 'Pilih kunjungan / job' : 'Pilih kapal dahulu'}
                                            options={portCalls
                                                .filter((portCall) => portCall.ship?.id === actShipId)
                                                .map((portCall) => ({
                                                    value: portCall.id,
                                                    label: `${portCall.job_number} · ${portCall.port?.name ?? 'Pelabuhan belum diisi'}`,
                                                }))}
                                            className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                            disabled={!actShipId}
                                            required
                                        />
                                        <Select
                                            id="activity-vessel-position"
                                            label="Posisi kapal"
                                            name="vessel_position"
                                            value={actVesselPosition}
                                            onChange={(event) => setActVesselPosition(event.target.value)}
                                            placeholder="Pilih posisi"
                                            options={[
                                                { value: 'scheduled', label: 'Belum Tiba' },
                                                { value: 'anchored', label: 'Labuh' },
                                                { value: 'berthed', label: 'Sandar' },
                                                { value: 'departed', label: 'Berangkat' },
                                            ]}
                                            className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                            required
                                        />
                                    </div>
                                    <div className="mt-3">
                                        <Select
                                            id="activity-request"
                                            label="Pengajuan terkait (opsional)"
                                            name="request_id"
                                            value={actRequestId}
                                            onChange={(event) => setActRequestId(event.target.value)}
                                            placeholder="Tanpa pengajuan terkait"
                                            options={requests
                                                .filter((request) => request.ship?.id === actShipId && (!request.port_call_id || request.port_call_id === actPortCallId))
                                                .map((request) => ({ value: request.id, label: request.request_number }))}
                                            className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                            disabled={!actPortCallId}
                                        />
                                    </div>
                                </div>
                                )}

                                {actIsVesselRelated && (
                                    <div className="space-y-3 px-4 py-3">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Select
                                                id="activity-cargo"
                                                label="Aktivitas muatan"
                                                name="cargo_activity"
                                                value={actCargoActivity}
                                                onChange={(event) => setActCargoActivity(event.target.value)}
                                                options={[
                                                    { value: 'tidak_ada', label: 'Tidak ada' },
                                                    { value: 'bongkar', label: 'Bongkar' },
                                                    { value: 'muat', label: 'Muat' },
                                                ]}
                                                className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                            />
                                            <Input
                                                id="activity-progress"
                                                label="Progres (%)"
                                                name="progress_percent"
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={actProgressPercent}
                                                onChange={(event) => setActProgressPercent(event.target.value)}
                                                placeholder="0–100"
                                                className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                            />
                                        </div>
                                        {actCargoActivity !== 'tidak_ada' && (
                                            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                                                <Input
                                                    id="activity-cargo-quantity"
                                                    label="Jumlah muatan"
                                                    name="cargo_quantity"
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={actCargoQuantity}
                                                    onChange={(event) => setActCargoQuantity(event.target.value)}
                                                    className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                />
                                                <Input
                                                    id="activity-cargo-unit"
                                                    label="Satuan"
                                                    name="cargo_unit"
                                                    value={actCargoUnit}
                                                    onChange={(event) => setActCargoUnit(event.target.value)}
                                                    placeholder="Ton"
                                                    className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                />
                                            </div>
                                        )}
                                        <Textarea
                                            id="activity-constraints"
                                            label="Kendala"
                                            name="constraints"
                                            value={actConstraints}
                                            onChange={(event) => setActConstraints(event.target.value)}
                                            placeholder="Kosongkan bila tidak ada kendala."
                                            className="min-h-20 !bg-[#F8FBFF] dark:!bg-[#071322]"
                                        />
                                        <Textarea
                                            id="activity-next-plan"
                                            label="Rencana berikutnya"
                                            name="next_plan"
                                            value={actNextPlan}
                                            onChange={(event) => setActNextPlan(event.target.value)}
                                            placeholder="Tindakan atau target pekerjaan berikutnya."
                                            className="min-h-20 !bg-[#F8FBFF] dark:!bg-[#071322]"
                                        />
                                    </div>
                                )}

                                {/* Kategori */}
                                <div className="space-y-3 px-4 py-3">
                                    <Select
                                        id="activity-category"
                                        label="Kategori"
                                        name="category"
                                        autoComplete="off"
                                        value={actCategory}
                                        onChange={(event) => {
                                            const category = event.target.value;
                                            setActCategory(category);
                                            if (category !== 'Aktivitas Lainnya') {
                                                setActCategoryOther('');
                                            }
                                        }}
                                        options={[
                                            { value: 'Kegiatan Kapal', label: 'Kegiatan Kapal' },
                                            { value: 'Bongkar Muat', label: 'Bongkar Muat' },
                                            { value: 'Kendala Operasional', label: 'Kendala Operasional' },
                                            { value: 'Aktivitas Lainnya', label: 'Aktivitas Lainnya' },
                                        ]}
                                        className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                    />
                                    {actCategory === 'Aktivitas Lainnya' && (
                                        <Input
                                            id="activity-category-other"
                                            label="Jenis aktivitas lainnya"
                                            name="category_other"
                                            type="text"
                                            autoComplete="off"
                                            autoFocus
                                            value={actCategoryOther}
                                            onChange={(event) => setActCategoryOther(event.target.value)}
                                            placeholder="Contoh: Koordinasi pandu atau pengisian air tawar"
                                            maxLength={100}
                                            className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                            required
                                        />
                                    )}
                                </div>

                                {/* Judul */}
                                <div className="px-4 py-3">
                                    <Input
                                        id="activity-title"
                                        label="Judul / jenis aktivitas"
                                        name="title"
                                        type="text"
                                        autoComplete="off"
                                        value={actTitle}
                                        onChange={(event) => setActTitle(event.target.value)}
                                        placeholder="Contoh: Bongkar muat sedang berlangsung…"
                                        leftIcon={<ListChecks aria-hidden="true" className="size-5 text-[#0060F4]" strokeWidth={2} />}
                                        className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                        required
                                    />
                                </div>

                                {/* Detail */}
                                <div className="px-4 py-3">
                                    <Textarea
                                        id="activity-detail"
                                        label="Detail aktivitas"
                                        name="detail"
                                        autoComplete="off"
                                        value={actDetail}
                                        onChange={(event) => setActDetail(event.target.value.slice(0, 500))}
                                        placeholder="Jelaskan kondisi atau kegiatan yang terjadi di lapangan…"
                                        rows={4}
                                        maxLength={500}
                                        showCharCount
                                        className="min-h-28 resize-none !bg-[#F8FBFF] dark:!bg-[#071322]"
                                        required
                                    />
                                </div>

                                {/* Foto Upload */}
                                <div className="px-4 py-3">
                                    <MultiplePhotoUploadPicker
                                        files={actPhotos}
                                        onFilesChange={setActPhotos}
                                        label="Foto / dokumentasi"
                                        required={false}
                                        helperText="Format: JPG, PNG (Maks. 5 MB)"
                                        maxFiles={10}
                                        maxSizeMb={5}
                                    />
                                </div>
                            </div>

                            {/* Error */}
                            {submitError && (
                                <div role="alert" className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300">
                                    <svg aria-hidden="true" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    {submitError}
                                </div>
                            )}

                            {/* Submit button bar */}
                            <div className="w-full border-t border-[#DCEAF8] bg-white px-4 py-3 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                                <Button
                                    type="submit"
                                    size="lg"
                                    isLoading={submitting}
                                    leftIcon={<Send aria-hidden="true" className="size-5" strokeWidth={2.25} />}
                                    className="w-full font-bold"
                                >
                                    {submitting ? 'Menyimpan…' : 'Simpan Aktivitas'}
                                </Button>
                            </div>
                        </form>
                    )}

                {/* ════════════════════════════════════════════════════
                    TAB 2: RIWAYAT AKTIVITAS (Full-Bleed Edge-to-Edge)
                    ════════════════════════════════════════════════════ */}
                {mobileTab === 'riwayat' && (
                    <div
                        id="mobile-history-panel"
                        role="tabpanel"
                        aria-labelledby="mobile-history-tab"
                        className="flex flex-1 flex-col pb-8"
                    >

                        {/* Date range and category filters (Full-Bleed) */}
                        <div className="w-full border-b border-[#DCEAF8] bg-white p-4 shadow-2xs dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                            <div className="flex items-center gap-2">
                                <DateRangePicker
                                    value={dateRange}
                                    onChange={setDateRange}
                                    className="flex-1"
                                    placeholder="Semua Tanggal"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowHistoryFilters((isVisible) => !isVisible)}
                                    aria-expanded={showHistoryFilters}
                                    aria-controls="history-category-filters"
                                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#DCEAF8] bg-white px-3 text-xs font-semibold text-[#082870] transition-colors hover:bg-[#F0F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9]"
                                >
                                    <svg aria-hidden="true" className="size-4 text-[#0060F4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                    </svg>
                                    Filter
                                </button>
                            </div>

                            {showHistoryFilters && (
                                <div id="history-category-filters" className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setRiwayatCategoryFilter(cat)}
                                            className={`flex min-h-9 flex-shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${
                                                riwayatCategoryFilter === cat
                                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                                    : 'bg-white border border-[#DCEAF8] text-[#52658E] hover:bg-[#F0F8FF]'
                                            }`}
                                        >
                                            {cat}
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                                riwayatCategoryFilter === cat
                                                    ? 'bg-white/25 text-white'
                                                    : 'bg-[#F0F8FF] text-[#0060F4]'
                                            }`}>
                                                {catCounts[cat]}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Activity list */}
                        <div className="flex flex-col gap-5 px-4 pt-4">
                            {groupKeys.length === 0 && (
                                <div className="text-center py-12 text-[#8C9BB9]">
                                    <svg aria-hidden="true" className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-xs font-medium">Belum ada aktivitas pada filter ini</p>
                                </div>
                            )}
                            {groupKeys.map((groupKey) => {
                                const groupActs = grouped[groupKey];
                                const headerInfo = getGroupDisplayHeader(groupKey);
                                return (
                                    <div key={groupKey}>
                                        {/* Day header */}
                                        <div className="mb-2 flex items-end justify-between gap-3">
                                            <h2 className="text-base font-extrabold text-[#082870] dark:text-[#F1F5F9]">{headerInfo.title}</h2>
                                            <span className="text-right text-[11px] font-medium text-[#52658E] dark:text-[#94A3B8]">
                                                {headerInfo.subtitle}
                                            </span>
                                        </div>

                                        {/* Cards */}
                                        <div className="flex flex-col gap-3">
                                            {groupActs.map((act) => {
                                                const firstPhoto = act.photos?.[0];
                                                return (
                                                    <button
                                                        type="button"
                                                        key={act.id}
                                                        onClick={() => setSelectedActivity(act)}
                                                        className="group flex min-h-28 w-full overflow-hidden rounded-2xl border border-[#DCEAF8] bg-white text-left shadow-2xs transition-[border-color,box-shadow,transform] hover:border-[#0060F4] hover:shadow-md active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                                    >
                                                        {/* Photo thumbnail */}
                                                        <div className="flex w-24 shrink-0 flex-col bg-[#E8F0FE] dark:bg-[#071322]">
                                                            <div className="min-h-20 flex-1 overflow-hidden">
                                                                {firstPhoto ? (
                                                                    <img
                                                                        src={firstPhoto}
                                                                        alt={act.title}
                                                                        width={192}
                                                                        height={160}
                                                                        loading="lazy"
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                    />
                                                                ) : (
                                                                    <div className="flex size-full items-center justify-center">
                                                                        <svg aria-hidden="true" className="w-6 h-6 text-[#DCEAF8]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                                                            <polyline points="21 15 16 10 5 21" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex h-7 items-center justify-center bg-[#E0F0FF] px-2 dark:bg-[#102A4A]">
                                                                <span className="text-[11px] font-bold tabular-nums text-[#082870] dark:text-[#BFDBFE]">{act.activity_time}</span>
                                                            </div>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="min-w-0 flex-1 p-3">
                                                            <div className="mb-1 flex items-start justify-between gap-2">
                                                                <span className="line-clamp-1 text-sm font-bold leading-tight text-[#082870] dark:text-[#F1F5F9]">
                                                                    {act.is_vessel_related && act.ship ? act.ship.name : act.title}
                                                                </span>
                                                            </div>

                                                            {/* Badge */}
                                                            <span className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${categoryBadgeClass(act.category)}`}>
                                                                {categoryLabel(act.category)}
                                                            </span>

                                                            <p className="mb-2 line-clamp-2 text-[11px] leading-snug text-[#52658E] dark:text-[#94A3B8]">
                                                                {act.detail}
                                                            </p>

                                                            {/* Footer */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="flex min-w-0 items-center gap-1 text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                                                    <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    </svg>
                                                                    <span className="truncate">{act.location_name}</span>
                                                                </span>
                                                                {act.photos && act.photos.length > 0 && (
                                                                    <span className="flex shrink-0 items-center gap-1 text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                                                        <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                                                            <polyline points="21 15 16 10 5 21" />
                                                                        </svg>
                                                                        {act.photos.length} foto
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                </section>
            </div>

            {/* ═══════════════════════════════════════════════════════
                DESKTOP VIEW (≥ md): existing layout
                ═══════════════════════════════════════════════════════ */}
            <div className="hidden md:block space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#DCEAF8]">
                    <div className="flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border border-[#DCEAF8] self-start">
                        <button
                            type="button"
                            onClick={() => setTab('kunjungan')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                tab === 'kunjungan'
                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#082870] hover:bg-white/60'
                            }`}
                        >
                            <span>⚓</span>
                            <span>Kunjungan Kapal</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tab === 'kunjungan'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white text-[#0060F4] border border-[#DCEAF8]'
                            }`}>
                                {counts.kunjungan}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTab('laporan')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                tab === 'laporan'
                                    ? 'bg-[#082870] text-white shadow-sm'
                                    : 'text-[#082870] hover:bg-white/60'
                            }`}
                        >
                            <span>📝</span>
                            <span>Laporan Harian</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tab === 'laporan'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white text-[#082870] border border-[#DCEAF8]'
                            }`}>
                                {dailyReports.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTab('aktivitas')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                tab === 'aktivitas'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-[#082870] hover:bg-white/60'
                            }`}
                        >
                            <span>📍</span>
                            <span>Aktivitas Lapangan</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tab === 'aktivitas'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white text-emerald-600 border border-[#DCEAF8]'
                            }`}>
                                {counts.aktivitas}
                            </span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex-shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                        <span className="text-base leading-none font-bold">+</span>
                        <span>Kirim Laporan Lapangan</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                        Operasional Port Calls & Lapangan
                    </h1>
                    <p className="text-xs sm:text-sm text-[#52658E] mt-0.5">
                        Pemantauan pergerakan kapal (ETA/ETD, labuh, sandar) serta catatan aktivitas harian tim operasional di dermaga
                    </p>
                </div>

                {/* ── Stat Badges ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Kunjungan (Job)', value: counts.kunjungan, color: 'text-[#52658E]', val: 'text-[#082870]' },
                        { label: 'Kapal Sandar (Berthed)', value: counts.berthed, color: 'text-emerald-600', val: 'text-emerald-700' },
                        { label: 'Kapal Labuh (Anchored)', value: counts.anchored, color: 'text-[#0060F4]', val: 'text-[#0060F4]' },
                        { label: 'Aktivitas Lapangan', value: counts.aktivitas, color: 'text-purple-600', val: 'text-purple-700' },
                    ].map((s) => (
                        <div key={s.label} className="bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] shadow-xs">
                            <div className={`text-[11px] font-medium ${s.color}`}>{s.label}</div>
                            <div className={`text-2xl font-bold mt-0.5 ${s.val}`}>{s.value}</div>
                        </div>
                    ))}
                </div>

                {/* ── Search Bar ── */}
                <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C9BB9]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari job number, nama kapal, atau pelabuhan..."
                        className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl text-xs sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9] placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] shadow-xs"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => { setSearch(''); router.get('/operations', { tab }); }}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8C9BB9] hover:text-[#C62840]"
                        >
                            ✕
                        </button>
                    )}
                </form>

                {/* ── Tab: Port Calls ── */}
                {tab === 'kunjungan' && (
                    <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#F0F8FF] border-b border-[#DCEAF8] text-[#082870] font-semibold uppercase tracking-wider">
                                        <th className="py-3 px-4">No. Job / SPK</th>
                                        <th className="py-3 px-4">Armada Kapal</th>
                                        <th className="py-3 px-4">Pelabuhan</th>
                                        <th className="py-3 px-4">Jadwal ETA / ETD</th>
                                        <th className="py-3 px-4">Status Operasi</th>
                                        <th className="py-3 px-4 text-right">Update Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#DCEAF8]/60 text-[#0B1F63]">
                                    {portCalls.map((pc) => (
                                        <tr key={pc.id} className="hover:bg-[#F0F8FF]/50 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-medium text-[#0060F4]">
                                                {pc.job_number}
                                                <div className="text-[10px] text-[#52658E] font-sans">SPK: {pc.work_order?.system_number || '-'}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-[#082870]">{pc.ship?.name}</div>
                                                <div className="text-[11px] text-[#52658E]">{pc.ship?.company?.name || 'Klien Langsung'} • IMO {pc.ship?.imo_number}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium">{pc.port?.name}</div>
                                                <div className="text-[10px] text-[#52658E] font-mono">{pc.port?.code}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="text-xs font-medium">ETA: {formatDateTime(pc.eta_at)}</div>
                                                <div className="text-[11px] text-[#52658E]">ETD: {formatDateTime(pc.etd_at)}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <StatusBadge
                                                    status={pc.status === 'berthed' ? 'Sandar' : pc.status === 'anchored' ? 'Labuh' : pc.status === 'scheduled' ? 'Akan Datang' : 'Selesai'}
                                                    label={pc.status === 'berthed' ? 'Sandar di Dermaga' : pc.status === 'anchored' ? 'Labuh Jangkar' : pc.status === 'scheduled' ? 'Jadwal Datang' : 'Berangkat / Selesai'}
                                                />
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <select
                                                    value={pc.status}
                                                    onChange={(e) => handleStatusChange(pc, e.target.value)}
                                                    className="text-[11px] font-medium py-1 px-2 rounded-lg border border-[#DCEAF8] bg-white text-[#082870] focus:ring-1 focus:ring-[#0060F4]"
                                                >
                                                    <option value="scheduled">Jadwal (Scheduled)</option>
                                                    <option value="anchored">Labuh (Anchored)</option>
                                                    <option value="berthed">Sandar (Berthed)</option>
                                                    <option value="departed">Berangkat (Departed)</option>
                                                    <option value="completed">Selesai (Completed)</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* ── Tab: Daily Reports ── */}
                {tab === 'laporan' && (
                    <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                        <div className="divide-y divide-[#DCEAF8]/60">
                            {dailyReports.map((dr) => (
                                <div key={dr.id} className="p-4 hover:bg-[#F0F8FF]/40 transition">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-[#0060F4]/10 text-[#0060F4] font-bold flex items-center justify-center text-xs">
                                                {dr.officer?.name ? dr.officer.name[0] : 'P'}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-xs text-[#082870]">{dr.officer?.name || 'Operasional'}</div>
                                                <div className="text-[10px] text-[#52658E]">
                                                    Kapal: {dr.port_call?.ship?.name} • Pelabuhan: {dr.port_call?.port?.name} • Job: {dr.port_call?.job_number}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-[#52658E] font-medium bg-[#F0F8FF] px-2.5 py-1 rounded-md border border-[#DCEAF8]">
                                            Tanggal: {new Date(dr.report_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-800 leading-relaxed pl-10">{dr.summary}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* ── Tab: Aktivitas Lapangan ── */}
                {tab === 'aktivitas' && (
                    <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                        <div className="divide-y divide-[#DCEAF8]/60">
                            {operationalActivities.length === 0 && (
                                <div className="p-8 text-center text-[#8C9BB9] text-sm">Belum ada aktivitas lapangan.</div>
                            )}
                            {operationalActivities.map((act) => (
                                <button
                                    type="button"
                                    key={act.id}
                                    onClick={() => setSelectedActivity(act)}
                                    className="flex w-full gap-3 p-4 text-left transition-colors hover:bg-[#F0F8FF]/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0060F4]"
                                >
                                    {act.photos?.[0] && (
                                        <div className="shrink-0">
                                            <img src={act.photos[0]} alt={act.title} className="w-14 h-14 rounded-lg object-cover border border-[#DCEAF8] hover:opacity-90 transition-opacity" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-semibold text-xs text-[#082870]">{act.title}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${categoryBadgeClass(act.category)}`}>
                                                {categoryLabel(act.category)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-[#52658E] mt-1 leading-snug line-clamp-2">{act.detail}</p>
                                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#8C9BB9]">
                                            <span>📍 {act.location_name}</span>
                                            {act.ship && <span>🚢 {act.ship.name}</span>}
                                            <span>🕐 {act.activity_time} · {new Date(act.activity_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                            {act.photos && act.photos.length > 0 && <span>📷 {act.photos.length} foto</span>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* ── Desktop Report Modal ── */}
            <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Kirim Laporan Harian Lapangan">
                <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Pilih Kunjungan Kapal (Port Call)</label>
                        <select
                            value={data.port_call_id}
                            onChange={(e) => setData('port_call_id', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white focus:ring-2 focus:ring-[#0060F4]"
                            required
                        >
                            {portCalls.map((pc) => (
                                <option key={pc.id} value={pc.id}>
                                    {pc.job_number} — {pc.ship?.name} ({pc.port?.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Tanggal Kegiatan</label>
                        <input
                            type="date"
                            value={data.report_date}
                            onChange={(e) => setData('report_date', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">Ringkasan Aktivitas Lapangan</label>
                        <textarea
                            value={data.summary}
                            onChange={(e) => setData('summary', e.target.value)}
                            rows={4}
                            placeholder="Catat kondisi cuaca, koordinasi sandar dermaga, realisasi pengisian air/BBM, serta izin clearance..."
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white focus:ring-2 focus:ring-[#0060F4]"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>Batal</Button>
                        <Button type="submit" variant="primary" disabled={processing} className="bg-[#0060F4] text-white">
                            {processing ? 'Mengirim...' : 'Kirim Laporan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(departurePortCall)} onClose={() => setDeparturePortCall(null)} title="Ajukan Clearance Out" subtitle="Kapal baru berstatus Berangkat setelah approval dan penyelesaian Admin.">
                <form onSubmit={submitDeparture} className="space-y-4 p-5">
                    <div className="rounded-xl bg-[#F0F8FF] p-3 text-sm text-[#0B1F63] dark:bg-[#071322] dark:text-[#F1F5F9]"><strong>{departurePortCall?.ship?.name}</strong><span className="mt-1 block text-xs text-[#52658E]">{departurePortCall?.job_number}</span></div>
                    <Input required label="Target Nota Rampung tersedia" type="datetime-local" value={completionNoteDueAt} onChange={(event) => setCompletionNoteDueAt(event.target.value)} helperText="Isi berdasarkan estimasi yang diberikan Pelindo; sistem tidak mengasumsikan ukuran kapal." />
                    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeparturePortCall(null)}>Batal</Button><Button type="submit">Buat Pengajuan</Button></div>
                </form>
            </Modal>

            {/* ── Detail Aktivitas Modal (Slides up from bottom on mobile) ── */}
            <Modal
                isOpen={Boolean(selectedActivity)}
                onClose={() => setSelectedActivity(null)}
                asBottomSheetOnMobile={true}
                size="lg"
                title={
                    selectedActivity ? (
                        <div>
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${categoryBadgeClass(selectedActivity.category)}`}>
                                {categoryLabel(selectedActivity.category)}
                            </span>
                            <h3 className="mt-1 text-base sm:text-lg font-extrabold text-[#082870] dark:text-white leading-snug">
                                {selectedActivity.title}
                            </h3>
                        </div>
                    ) : undefined
                }
                footer={
                    selectedActivity ? (
                        <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                Petugas: <strong className="text-[#0B1F63] dark:text-white">{selectedActivity.creator?.name || 'Tidak tersedia'}</strong>
                            </span>
                            <Button
                                variant="secondary"
                                onClick={() => setSelectedActivity(null)}
                                className="rounded-xl px-4 py-2 text-xs font-bold"
                            >
                                Tutup
                            </Button>
                        </div>

                    ) : undefined
                }
            >
                {selectedActivity && (
                    <div className="space-y-4 py-1">
                        {/* Vessel card if linked */}
                        {selectedActivity.is_vessel_related && selectedActivity.ship && (
                            <div className="flex items-center gap-3 rounded-2xl bg-[#F0F8FF] p-3.5 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-[#0060F4] text-white text-lg">
                                    🚢
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                                        Terkait Armada Kapal
                                    </span>
                                    <span className="block truncate text-sm font-extrabold text-[#082870] dark:text-white">
                                        {selectedActivity.ship.name}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Date, Time & Location grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-[#DCEAF8] bg-[#F8FAFC] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E] dark:text-[#94A3B8]">
                                    Waktu Kegiatan
                                </span>
                                <span className="mt-0.5 block text-xs font-extrabold text-[#0B1F63] dark:text-white">
                                    {formatDateIndo(selectedActivity.activity_date, true)}
                                </span>
                                <span className="text-[11px] font-bold text-[#0060F4] dark:text-[#38BDF8]">
                                    Pukul {selectedActivity.activity_time} WIB
                                </span>
                            </div>
                            <div className="rounded-xl border border-[#DCEAF8] bg-[#F8FAFC] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E] dark:text-[#94A3B8]">
                                    Lokasi Lapangan
                                </span>
                                <span className="mt-0.5 block text-xs font-extrabold text-[#0B1F63] dark:text-white truncate">
                                    {selectedActivity.location_name || 'Area Pelabuhan'}
                                </span>
                                {selectedActivity.latitude && selectedActivity.longitude && (
                                    <span className="text-[10px] font-medium text-[#52658E] dark:text-[#94A3B8] block truncate">
                                        GPS: {selectedActivity.latitude.toFixed(4)}, {selectedActivity.longitude.toFixed(4)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {selectedActivity.is_vessel_related && (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E]">Posisi</span>
                                    <span className="mt-1 block text-xs font-bold text-[#0B1F63] dark:text-white">{vesselPositionLabel(selectedActivity.vessel_position)}</span>
                                </div>
                                <div className="rounded-xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E]">Muatan</span>
                                    <span className="mt-1 block text-xs font-bold capitalize text-[#0B1F63] dark:text-white">{selectedActivity.cargo_activity?.replace('_', ' ') || 'Tidak ada'}</span>
                                </div>
                                <div className="rounded-xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E]">Jumlah</span>
                                    <span className="mt-1 block text-xs font-bold text-[#0B1F63] dark:text-white">{selectedActivity.cargo_quantity ? `${selectedActivity.cargo_quantity} ${selectedActivity.cargo_unit ?? ''}` : 'Tidak dicatat'}</span>
                                </div>
                                <div className="rounded-xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E]">Progres</span>
                                    <span className="mt-1 block text-xs font-bold text-[#0B1F63] dark:text-white">{selectedActivity.progress_percent !== null && selectedActivity.progress_percent !== undefined ? `${selectedActivity.progress_percent}%` : 'Tidak dicatat'}</span>
                                </div>
                            </div>
                        )}

                        {(selectedActivity.constraints || selectedActivity.next_plan) && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E]">Kendala</span>
                                    <p className="mt-1 text-xs leading-relaxed text-[#0B1F63] dark:text-white">{selectedActivity.constraints || 'Tidak ada kendala.'}</p>
                                </div>
                                <div className="rounded-xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E]">Rencana berikutnya</span>
                                    <p className="mt-1 text-xs leading-relaxed text-[#0B1F63] dark:text-white">{selectedActivity.next_plan || 'Belum dicatat.'}</p>
                                </div>
                            </div>
                        )}

                        {/* Request Info if linked */}
                        {selectedActivity.request && (
                            <div className="flex items-center justify-between rounded-xl border border-[#DCEAF8] bg-[#F8FAFC] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                <div>
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E] dark:text-[#94A3B8]">
                                        Pengajuan Terkait
                                    </span>
                                    <span className="text-xs font-extrabold text-[#082870] dark:text-white">
                                        {selectedActivity.request.request_number}
                                    </span>
                                </div>
                                <span className="rounded-full bg-[#E0F0FF] px-2.5 py-1 text-[11px] font-bold text-[#0060F4] dark:bg-[#1E3A5F] dark:text-[#38BDF8]">
                                    {selectedActivity.request.status || 'Diproses'}
                                </span>
                            </div>
                        )}

                        {/* Activity Detail description */}
                        <div>
                            <span className="block text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] mb-1">
                                Catatan & Detail Lapangan
                            </span>
                            <div className="rounded-2xl border border-[#DCEAF8] bg-white p-3.5 text-xs leading-relaxed text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9] whitespace-pre-line">
                                {selectedActivity.detail || 'Tidak ada catatan tambahan.'}
                            </div>
                        </div>

                        {/* Photos Grid if any */}
                        {selectedActivity.photos && selectedActivity.photos.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                                        Dokumentasi Foto ({selectedActivity.photos.length})
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {selectedActivity.photos.map((p, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative aspect-4/3 overflow-hidden rounded-xl border border-[#DCEAF8] bg-[#E8F0FE]"
                                        >
                                            <img
                                                src={p}
                                                alt={`Dokumentasi ${idx + 1}`}
                                                className="size-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

        </AppLayout>
    );
}
