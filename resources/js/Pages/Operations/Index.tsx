import React, { useEffect, useMemo, useState } from 'react';
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
import Table from '../../Components/tables/Table';
import Tabs from '../../Components/ui/Tabs';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';

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

const getCurrentLocalDateTime = (): { date: string; time: string } => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return {
        date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
};

/* ─── Category helpers ──────────────────────────────────────────── */

const CATEGORIES = ['Semua', 'Kegiatan Kapal', 'Kendala', 'Lainnya'] as const;
const SHOW_EXTENDED_ACTIVITY_FIELDS = false;

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

    const isOperational = useMemo(() => {
        if (!user) return false;
        const role = (user.primary_role || user.roles?.[0] || '').toLowerCase();
        if (role.includes('lapangan') || role.includes('operasional') || role === 'staff') {
            return true;
        }
        if (Array.isArray(user.roles) && user.roles.some((r: string) => {
            const lr = r.toLowerCase();
            return lr.includes('lapangan') || lr.includes('operasional');
        })) {
            return true;
        }
        if (Array.isArray(user.permissions) && user.permissions.includes('daily-reports.create')) {
            return true;
        }
        return false;
    }, [user]);

    /* ── Desktop state ── */
    const [tab, setTab] = useState(initialTab || 'aktivitas');
    const [search, setSearch] = useState(initialSearch);
    const [actSearchQuery, setActSearchQuery] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [departurePortCall, setDeparturePortCall] = useState<PortCall | null>(null);
    const [completionNoteDueAt, setCompletionNoteDueAt] = useState('');
    const [departureErrors, setDepartureErrors] = useState<Record<string, string>>({});

    /* ── Mobile state: Staf operasional bisa 'form' & 'riwayat', role lain otomatis hanya 'riwayat' ── */
    const [mobileTab, setMobileTab] = useState<'form' | 'riwayat'>('form');
    const effectiveMobileTab: 'form' | 'riwayat' = isOperational ? mobileTab : 'riwayat';
    const [riwayatCategoryFilter, setRiwayatCategoryFilter] = useState('Semua');
    const [showHistoryFilters, setShowHistoryFilters] = useState(true);

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
    const [actDate, setActDate] = useState(() => getCurrentLocalDateTime().date);
    const [actTime, setActTime] = useState(() => getCurrentLocalDateTime().time);
    const [actLocationName, setActLocationName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [activityErrors, setActivityErrors] = useState<Record<string, string>>({});
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
    const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
        port_call_id: portCalls[0]?.id || '',
        report_date: getCurrentLocalDateTime().date,
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
            setDepartureErrors({});
            return;
        }
        router.patch(`/operations/port-calls/${portCall.id}/status`, { status: newStatus, expected_status: portCall.status }, { preserveScroll: true });
    };

    const submitDeparture = (event: React.FormEvent) => {
        event.preventDefault();
        if (!departurePortCall) return;
        setDepartureErrors({});
        router.patch(`/operations/port-calls/${departurePortCall.id}/status`, {
            status: 'departed', expected_status: departurePortCall.status,
            occurred_at: new Date().toISOString(), completion_note_due_at: completionNoteDueAt,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setDepartureErrors({});
                setDeparturePortCall(null);
            },
            onError: (errors) => setDepartureErrors(errors as Record<string, string>),
        });
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
        setActivityErrors({});

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
                const currentDateTime = getCurrentLocalDateTime();
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
                setActDate(currentDateTime.date);
                setActTime(currentDateTime.time);
                setShowSuccessAlert(true);
                setActivityErrors({});
                setMobileTab('riwayat');
                setSubmitting(false);
            },
            onError: (errors) => {
                const first = Object.values(errors)[0];
                setActivityErrors(errors as Record<string, string>);
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

        // 3. Search query filter
        if (actSearchQuery.trim()) {
            const q = actSearchQuery.toLowerCase();
            const matchTitle = (a.title || '').toLowerCase().includes(q);
            const matchDesc = (a.detail || '').toLowerCase().includes(q);
            const matchShip = (a.ship?.name || '').toLowerCase().includes(q);
            const matchLoc = (a.location_name || '').toLowerCase().includes(q);
            if (!matchTitle && !matchDesc && !matchShip && !matchLoc) return false;
        }

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
        <AppLayout title="Aktifitas Lapangan & Kunjungan Kapal" transparentMobileHeader mobileBackground="surface">
            <Head title="Aktivitas Lapangan — PT Samudra Jaya Andalas" />

            {/* ═══════════════════════════════════════════════════════
                MOBILE VIEW (< md): Aktivitas Lapangan
                ═══════════════════════════════════════════════════════ */}
            <div className="flex min-h-[calc(100dvh-56px)] flex-col bg-[#F0F8FF] dark:bg-[#071322] md:hidden">

                {/* ── Hero Banner Header ── */}
                <div className="mobile-photo-copy relative flex min-h-[200px] shrink-0 flex-col justify-end overflow-hidden bg-[#8FCDF4] px-4 pb-10 pt-14 text-white">
                    <img
                        src="/images/prima-banner.jpg"
                        alt="Kapal dan crane di area pelabuhan"
                        width={1280}
                        height={720}
                        fetchPriority="high"
                        className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
                    />
                    {/* Title */}
                    <div className="relative z-10">
                        <h1 className="text-balance text-2xl font-extrabold leading-tight text-white">
                            Aktivitas Lapangan
                        </h1>
                        <p className="mt-1.5 max-w-sm text-pretty text-xs font-medium leading-relaxed text-white">
                            {isOperational
                                ? (effectiveMobileTab === 'form'
                                    ? 'Catat setiap kegiatan dan kondisi di lapangan untuk memberikan update kepada atasan.'
                                    : 'Lihat riwayat seluruh aktivitas yang telah Anda catat.')
                                : 'Lihat riwayat seluruh aktivitas lapangan yang telah dicatat oleh tim operasional.'}
                        </p>
                    </div>
                </div>

                {/* ── Activity sheet with integrated tabs ── */}
                <section className="relative z-10 -mt-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px] border-t border-[#DCEAF8] bg-white shadow-sm dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                    {/* ── Tab Switcher: Hanya ditampilkan untuk staf operasional (role lain langsung riwayat tanpa tab) ── */}
                    {isOperational && (
                        <Tabs
                            items={[
                                { id: 'form', label: 'Form Aktivitas', tabId: 'mobile-form-tab', controls: 'mobile-form-panel' },
                                { id: 'riwayat', label: 'Riwayat Aktivitas', tabId: 'mobile-history-tab', controls: 'mobile-history-panel' },
                            ]}
                            activeId={effectiveMobileTab}
                            onChange={(nextTab) => setMobileTab(nextTab as 'form' | 'riwayat')}
                            ariaLabel="Aktivitas lapangan"
                            equalWidth
                            className="min-h-14"
                        />
                    )}

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
                    TAB 1: FORM AKTIVITAS (Khusus Staf Operasional)
                    ════════════════════════════════════════════════════ */}
                    {isOperational && effectiveMobileTab === 'form' && (
                        <form
                            noValidate
                            id="mobile-form-panel"
                            role="tabpanel"
                            aria-labelledby="mobile-form-tab"
                            onSubmit={handleActivitySubmit}
                            className="flex flex-1 flex-col pb-8"
                        >
                            <FormErrorSummary errors={activityErrors} className="mx-4 mt-3" />
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
                                        dateError={activityErrors.activity_date}
                                        timeError={activityErrors.activity_time}
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
                                        error={activityErrors.location_name}
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
                                        error={activityErrors.is_vessel_related}
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
                                        error={activityErrors.ship_id}
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
                                            error={activityErrors.port_call_id}
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
                                            helperText="Diambil otomatis dari kunjungan / job yang dipilih."
                                            error={activityErrors.vessel_position}
                                            disabled
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
                                            error={activityErrors.request_id}
                                            disabled={!actPortCallId}
                                        />
                                    </div>
                                </div>
                                )}

                                {SHOW_EXTENDED_ACTIVITY_FIELDS && actIsVesselRelated && (
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
                                        error={activityErrors.category}
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
                                            error={activityErrors.category_other}
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
                                        error={activityErrors.title}
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
                                        error={activityErrors.detail}
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
                                        error={activityErrors.photos || activityErrors['photos.0']}
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
                {effectiveMobileTab === 'riwayat' && (
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

                {/* ── Title Header ── */}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] dark:text-[#E7F0FA] tracking-tight">
                        {tab === 'aktivitas'
                            ? 'Aktifitas Lapangan & Dermaga'
                            : tab === 'kunjungan'
                            ? 'Operasional Port Calls Kapal'
                            : 'Laporan Harian Lapangan'}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                        {tab === 'aktivitas'
                            ? 'Pencatatan kegiatan armada kapal, logistik, dan kendala operasional dermaga langsung secara terpadu'
                            : tab === 'kunjungan'
                            ? 'Pemantauan pergerakan kapal (ETA/ETD, labuh, sandar) serta status operasi per armada di pelabuhan'
                            : 'Rekapitulasi catatan & laporan harian tim perwira operasional dermaga'}
                    </p>
                </div>

                {/* ── Stat Badges ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Aktivitas Lapangan', value: counts.aktivitas, color: 'text-[#0060F4]', val: 'text-[#0060F4]' },
                        { label: 'Total Kunjungan (Job)', value: counts.kunjungan, color: 'text-[#52658E]', val: 'text-[#082870]' },
                        { label: 'Kapal Sandar (Berthed)', value: counts.berthed, color: 'text-emerald-600', val: 'text-emerald-700' },
                        { label: 'Kapal Labuh (Anchored)', value: counts.anchored, color: 'text-amber-600', val: 'text-amber-700' },
                    ].map((s) => (
                        <div key={s.label} className="bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                            <div className={`text-[11px] font-medium ${s.color}`}>{s.label}</div>
                            <div className={`text-2xl font-bold mt-0.5 ${s.val}`}>{s.value}</div>
                        </div>
                    ))}
                </div>

                {/* ── Search Bar (Kunjungan & Laporan) ── */}
                {tab !== 'aktivitas' && (
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
                )}

                {/* ── Tab: Port Calls ── */}
                {tab === 'kunjungan' && (
                    <Table<PortCall>
                        data={portCalls}
                        keyExtractor={(portCall) => portCall.id}
                        compact
                        minWidth="1100px"
                        emptyMessage="Data Tidak Ditemukan"
                        columns={[
                            {
                                key: 'job',
                                header: 'Job / SPK',
                                width: '200px',
                                render: (portCall) => <div><p className="font-bold text-[#0060F4]">{portCall.job_number}</p><p className="mt-0.5 text-[10px] text-[#52658E]">SPK {portCall.work_order?.system_number || '-'}</p></div>,
                            },
                            {
                                key: 'ship',
                                header: 'Kapal',
                                width: '230px',
                                render: (portCall) => <div><p className="font-bold">{portCall.ship?.name || '-'}</p><p className="mt-0.5 text-[11px] text-[#52658E]">{portCall.ship?.company?.name || 'Klien langsung'} · IMO {portCall.ship?.imo_number || '-'}</p></div>,
                            },
                            {
                                key: 'port',
                                header: 'Pelabuhan',
                                width: '180px',
                                render: (portCall) => <div><p className="font-semibold">{portCall.port?.name || '-'}</p><p className="mt-0.5 text-[10px] text-[#52658E]">{portCall.port?.code || '-'}</p></div>,
                            },
                            {
                                key: 'schedule',
                                header: 'ETA / ETD',
                                width: '220px',
                                render: (portCall) => <div><p>ETA {formatDateTime(portCall.eta_at)}</p><p className="mt-0.5 text-[11px] text-[#52658E]">ETD {formatDateTime(portCall.etd_at)}</p></div>,
                            },
                            {
                                key: 'status',
                                header: 'Status operasi',
                                width: '170px',
                                render: (portCall) => <StatusBadge status={portCall.status === 'berthed' ? 'Sandar' : portCall.status === 'anchored' ? 'Labuh' : portCall.status === 'scheduled' ? 'Akan Datang' : 'Selesai'} label={portCall.status === 'berthed' ? 'Sandar di Dermaga' : portCall.status === 'anchored' ? 'Labuh Jangkar' : portCall.status === 'scheduled' ? 'Jadwal Datang' : 'Berangkat / Selesai'} />,
                            },
                            {
                                key: 'update',
                                header: 'Update status',
                                width: '180px',
                                align: 'right',
                                render: (portCall) => (
                                    <Select
                                        value={portCall.status}
                                        onChange={(event) => handleStatusChange(portCall, event.target.value)}
                                        aria-label={`Update status ${portCall.job_number}`}
                                        options={[
                                            { value: 'scheduled', label: 'Jadwal' },
                                            { value: 'anchored', label: 'Labuh' },
                                            { value: 'berthed', label: 'Sandar' },
                                            { value: 'departed', label: 'Berangkat' },
                                            { value: 'completed', label: 'Selesai' },
                                        ]}
                                        className="h-9 min-w-36 text-xs"
                                    />
                                ),
                            },
                        ]}
                    />
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

                {/* ── Tab: Aktivitas Lapangan (Desktop Workstation) ── */}
                {tab === 'aktivitas' && (
                    <div className="space-y-4">
                        {/* ── Filter Toolbar ── */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-2xl shadow-xs">
                            <div className="flex flex-wrap items-center gap-2">
                                <DateRangePicker
                                    value={dateRange}
                                    onChange={setDateRange}
                                    placeholder="Semua Tanggal"
                                    className="w-56"
                                />

                                <div className="flex items-center gap-1.5 overflow-x-auto">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setRiwayatCategoryFilter(cat)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                riwayatCategoryFilter === cat
                                                    ? 'bg-[#0060F4] text-white shadow-xs'
                                                    : 'bg-[#F0F8FF] dark:bg-[#10243E] text-[#52658E] dark:text-[#9FB0C6] hover:bg-[#E0F0FF]'
                                            }`}
                                        >
                                            <span>{cat}</span>
                                            <span
                                                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                                    riwayatCategoryFilter === cat
                                                        ? 'bg-white/25 text-white'
                                                        : 'bg-white dark:bg-[#0C1D36] text-[#0060F4]'
                                                }`}
                                            >
                                                {catCounts[cat]}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative min-w-[200px]">
                                    <input
                                        type="text"
                                        value={actSearchQuery}
                                        onChange={(e) => setActSearchQuery(e.target.value)}
                                        placeholder="Cari aktivitas..."
                                        className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FBFF] dark:bg-[#071322] text-xs text-[#0B1F63] dark:text-white placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30"
                                    />
                                    <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C9BB9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    {actSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setActSearchQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8C9BB9] hover:text-[#C62840]"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 text-xs">
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {actLocationName || 'Pelabuhan Teluk Bayur'}
                                </span>
                            </div>
                        </div>

                        {/* ── Main Content Area: Split-view for Operasional vs Full-Grid for Role Lain ── */}
                        <div className={`flex flex-col ${isOperational ? 'lg:flex-row gap-5 items-start' : 'gap-4'}`}>
                            {/* ════════════════════════════════════════════
                                KOLOM KIRI: Form Catat Aktivitas (HANYA STAF OPERASIONAL)
                                ════════════════════════════════════════════ */}
                            {isOperational && (
                                <div className="w-full lg:w-[440px] shrink-0">
                                    <div className="bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-2xl shadow-xs overflow-hidden sticky top-4">
                                        {/* Card Header */}
                                        <div className="px-5 py-4 border-b border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FBFF] dark:bg-[#071322] flex items-center gap-3">
                                            <span className="flex size-8 items-center justify-center rounded-xl bg-[#0060F4]/10 text-[#0060F4]">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </span>
                                            <div>
                                                <h3 className="font-extrabold text-sm text-[#0B1F63] dark:text-white">Catat Aktivitas Lapangan</h3>
                                                <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Input kegiatan armada &amp; logistik</p>
                                            </div>
                                        </div>

                                        {/* Success Alert */}
                                        {showSuccessAlert && (
                                            <div role="status" aria-live="polite" className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                <svg aria-hidden="true" className="size-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Aktivitas lapangan berhasil dicatat!
                                            </div>
                                        )}

                                        {/* Form */}
                                        <form noValidate onSubmit={handleActivitySubmit} className="flex flex-col">
                                            <FormErrorSummary errors={activityErrors} className="mx-4 mt-3" />
                                            <div className="divide-y divide-[#DCEAF8]/70 dark:divide-[#1E3A5F]">
                                                {/* Tanggal & Waktu */}
                                                <div className="px-4 py-3">
                                                    <DateTimePicker
                                                        id="desk-activity-date-time"
                                                        label="Tanggal & waktu"
                                                        dateName="activity_date"
                                                        timeName="activity_time"
                                                        dateValue={actDate}
                                                        timeValue={actTime}
                                                        onDateChange={setActDate}
                                                        onTimeChange={setActTime}
                                                        layout="combined"
                                                        className="[&_legend]:!text-[#0B1F63] dark:[&_legend]:!text-[#F1F5F9] [&_input]:!bg-[#F8FBFF] dark:[&_input]:!bg-[#071322]"
                                                        dateError={activityErrors.activity_date}
                                                        timeError={activityErrors.activity_time}
                                                        required
                                                    />
                                                </div>

                                                {/* Lokasi */}
                                                <div className="px-4 py-3">
                                                    <Input
                                                        id="desk-activity-location"
                                                        label="Lokasi / area"
                                                        name="location_name"
                                                        type="text"
                                                        autoComplete="off"
                                                        value={actLocationName}
                                                        onChange={(e) => setActLocationName(e.target.value)}
                                                        onFocus={() => { if (!actLocationName && !geo.loading) geo.refresh(); }}
                                                        placeholder="Contoh: Dermaga A, Area Bongkar Muat, atau Gate…"
                                                        leftIcon={<MapPin aria-hidden="true" className="size-5 text-[#0060F4]" strokeWidth={2} />}
                                                        className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                        error={activityErrors.location_name}
                                                        required
                                                    />
                                                </div>

                                                {/* Terkait Kapal */}
                                                <div className="px-4 py-3">
                                                    <RadioGroup
                                                        name="desk_is_vessel_related"
                                                        label="Terkait kapal?"
                                                        required
                                                        value={actIsVesselRelated ? '1' : '0'}
                                                        onChange={(value) => setActIsVesselRelated(value === '1')}
                                                        layout="grid-2"
                                                        variant="card"
                                                        itemClassName="min-h-24 !rounded-xl !p-3"
                                                        error={activityErrors.is_vessel_related}
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
                                                            id="desk-activity-ship"
                                                            label="Pilih kapal"
                                                            name="ship_id"
                                                            autoComplete="off"
                                                            value={actShipId}
                                                            onChange={(e) => selectActivityShip(e.target.value)}
                                                            placeholder="Pilih kapal"
                                                            options={ships.map((ship) => ({ value: ship.id, label: ship.name }))}
                                                            className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                            error={activityErrors.ship_id}
                                                            required
                                                        />
                                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                            <Select
                                                                id="desk-activity-port-call"
                                                                label="Kunjungan / job"
                                                                name="port_call_id"
                                                                value={actPortCallId}
                                                                onChange={(e) => {
                                                                    const visitId = e.target.value;
                                                                    const visit = portCalls.find((pc) => pc.id === visitId);
                                                                    setActPortCallId(visitId);
                                                                    setActVesselPosition(visit?.status ?? '');
                                                                    setActRequestId('');
                                                                }}
                                                                placeholder={actShipId ? 'Pilih kunjungan / job' : 'Pilih kapal dahulu'}
                                                                options={portCalls
                                                                    .filter((pc) => pc.ship?.id === actShipId)
                                                                    .map((pc) => ({
                                                                        value: pc.id,
                                                                        label: `${pc.job_number} · ${pc.port?.name ?? 'Pelabuhan belum diisi'}`,
                                                                    }))}
                                                                className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                                error={activityErrors.port_call_id}
                                                                disabled={!actShipId}
                                                                required
                                                            />
                                                            <Select
                                                                id="desk-activity-vessel-position"
                                                                label="Posisi kapal"
                                                                name="vessel_position"
                                                                value={actVesselPosition}
                                                                onChange={(e) => setActVesselPosition(e.target.value)}
                                                                placeholder="Pilih posisi"
                                                                options={[
                                                                    { value: 'scheduled', label: 'Belum Tiba' },
                                                                    { value: 'anchored', label: 'Labuh' },
                                                                    { value: 'berthed', label: 'Sandar' },
                                                                    { value: 'departed', label: 'Berangkat' },
                                                                ]}
                                                                className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                                helperText="Diambil otomatis dari kunjungan / job yang dipilih."
                                                                error={activityErrors.vessel_position}
                                                                disabled
                                                                required
                                                            />
                                                        </div>
                                                        <div className="mt-3">
                                                            <Select
                                                                id="desk-activity-request"
                                                                label="Pengajuan terkait (opsional)"
                                                                name="request_id"
                                                                value={actRequestId}
                                                                onChange={(e) => setActRequestId(e.target.value)}
                                                                placeholder="Tanpa pengajuan terkait"
                                                                options={requests
                                                                    .filter((r) => r.ship?.id === actShipId && (!r.port_call_id || r.port_call_id === actPortCallId))
                                                                    .map((r) => ({ value: r.id, label: r.request_number }))}
                                                                className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                                error={activityErrors.request_id}
                                                                disabled={!actPortCallId}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Muatan + Progress (vessel related) */}
                                                {SHOW_EXTENDED_ACTIVITY_FIELDS && actIsVesselRelated && (
                                                    <div className="space-y-3 px-4 py-3">
                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            <Select
                                                                id="desk-activity-cargo"
                                                                label="Aktivitas muatan"
                                                                name="cargo_activity"
                                                                value={actCargoActivity}
                                                                onChange={(e) => setActCargoActivity(e.target.value)}
                                                                options={[
                                                                    { value: 'tidak_ada', label: 'Tidak ada' },
                                                                    { value: 'bongkar', label: 'Bongkar' },
                                                                    { value: 'muat', label: 'Muat' },
                                                                ]}
                                                                className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                            />
                                                            <Input
                                                                id="desk-activity-progress"
                                                                label="Progres (%)"
                                                                name="progress_percent"
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                value={actProgressPercent}
                                                                onChange={(e) => setActProgressPercent(e.target.value)}
                                                                placeholder="0–100"
                                                                className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                            />
                                                        </div>
                                                        {actCargoActivity !== 'tidak_ada' && (
                                                            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                                                                <Input
                                                                    id="desk-activity-cargo-quantity"
                                                                    label="Jumlah muatan"
                                                                    name="cargo_quantity"
                                                                    type="number"
                                                                    min={0}
                                                                    step="0.01"
                                                                    value={actCargoQuantity}
                                                                    onChange={(e) => setActCargoQuantity(e.target.value)}
                                                                    className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                                />
                                                                <Input
                                                                    id="desk-activity-cargo-unit"
                                                                    label="Satuan"
                                                                    name="cargo_unit"
                                                                    value={actCargoUnit}
                                                                    onChange={(e) => setActCargoUnit(e.target.value)}
                                                                    placeholder="Ton"
                                                                    className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                                />
                                                            </div>
                                                        )}
                                                        <Textarea
                                                            id="desk-activity-constraints"
                                                            label="Kendala"
                                                            name="constraints"
                                                            value={actConstraints}
                                                            onChange={(e) => setActConstraints(e.target.value)}
                                                            placeholder="Kosongkan bila tidak ada kendala."
                                                            className="min-h-20 !bg-[#F8FBFF] dark:!bg-[#071322]"
                                                        />
                                                        <Textarea
                                                            id="desk-activity-next-plan"
                                                            label="Rencana berikutnya"
                                                            name="next_plan"
                                                            value={actNextPlan}
                                                            onChange={(e) => setActNextPlan(e.target.value)}
                                                            placeholder="Tindakan atau target pekerjaan berikutnya."
                                                            className="min-h-20 !bg-[#F8FBFF] dark:!bg-[#071322]"
                                                        />
                                                    </div>
                                                )}

                                                {/* Kategori */}
                                                <div className="space-y-3 px-4 py-3">
                                                    <Select
                                                        id="desk-activity-category"
                                                        label="Kategori"
                                                        name="category"
                                                        autoComplete="off"
                                                        value={actCategory}
                                                        onChange={(e) => {
                                                            const cat = e.target.value;
                                                            setActCategory(cat);
                                                            if (cat !== 'Aktivitas Lainnya') setActCategoryOther('');
                                                        }}
                                                        options={[
                                                            { value: 'Kegiatan Kapal', label: 'Kegiatan Kapal' },
                                                            { value: 'Bongkar Muat', label: 'Bongkar Muat' },
                                                            { value: 'Kendala Operasional', label: 'Kendala Operasional' },
                                                            { value: 'Aktivitas Lainnya', label: 'Aktivitas Lainnya' },
                                                        ]}
                                                        className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                        error={activityErrors.category}
                                                    />
                                                    {actCategory === 'Aktivitas Lainnya' && (
                                                        <Input
                                                            id="desk-activity-category-other"
                                                            label="Jenis aktivitas lainnya"
                                                            name="category_other"
                                                            type="text"
                                                            autoComplete="off"
                                                            autoFocus
                                                            value={actCategoryOther}
                                                            onChange={(e) => setActCategoryOther(e.target.value)}
                                                            placeholder="Contoh: Koordinasi pandu atau pengisian air tawar"
                                                            maxLength={100}
                                                            className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                            error={activityErrors.category_other}
                                                            required
                                                        />
                                                    )}
                                                </div>

                                                {/* Judul */}
                                                <div className="px-4 py-3">
                                                    <Input
                                                        id="desk-activity-title"
                                                        label="Judul / jenis aktivitas"
                                                        name="title"
                                                        type="text"
                                                        autoComplete="off"
                                                        value={actTitle}
                                                        onChange={(e) => setActTitle(e.target.value)}
                                                        placeholder="Contoh: Bongkar muat sedang berlangsung…"
                                                        leftIcon={<ListChecks aria-hidden="true" className="size-5 text-[#0060F4]" strokeWidth={2} />}
                                                        className="!bg-[#F8FBFF] dark:!bg-[#071322]"
                                                        error={activityErrors.title}
                                                        required
                                                    />
                                                </div>

                                                {/* Detail */}
                                                <div className="px-4 py-3">
                                                    <Textarea
                                                        id="desk-activity-detail"
                                                        label="Detail aktivitas"
                                                        name="detail"
                                                        autoComplete="off"
                                                        value={actDetail}
                                                        onChange={(e) => setActDetail(e.target.value.slice(0, 500))}
                                                        placeholder="Jelaskan kondisi atau kegiatan yang terjadi di lapangan…"
                                                        rows={4}
                                                        maxLength={500}
                                                        showCharCount
                                                        className="min-h-28 resize-none !bg-[#F8FBFF] dark:!bg-[#071322]"
                                                        error={activityErrors.detail}
                                                        required
                                                    />
                                                </div>

                                                {/* Foto */}
                                                <div className="px-4 py-3">
                                                    <MultiplePhotoUploadPicker
                                                        files={actPhotos}
                                                        onFilesChange={setActPhotos}
                                                        label="Foto / dokumentasi"
                                                        required={false}
                                                        helperText="Format: JPG, PNG (Maks. 5 MB)"
                                                        maxFiles={10}
                                                        maxSizeMb={5}
                                                        error={activityErrors.photos || activityErrors['photos.0']}
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

                                            {/* Submit */}
                                            <div className="px-4 py-4 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
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
                                    </div>
                                </div>
                            )}

                            {/* ════════════════════════════════════════════
                                KOLOM KANAN / FULL-WIDTH: Feed Riwayat Aktivitas
                                ════════════════════════════════════════════ */}
                            <div className="flex-1 min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin] [scrollbar-color:#DCEAF8_transparent] dark:[scrollbar-color:#1E3A5F_transparent]">
                                {groupKeys.length === 0 ? (
                                    <Card className="p-12 text-center border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                        <div className="w-12 h-12 mx-auto rounded-full bg-[#F0F8FF] text-[#0060F4] flex items-center justify-center text-xl mb-3">
                                            📋
                                        </div>
                                        <h4 className="font-bold text-sm text-[#0B1F63] dark:text-white">
                                            Belum Ada Aktivitas Lapangan
                                        </h4>
                                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1 max-w-sm mx-auto">
                                            {isOperational
                                                ? 'Mulai catat aktivitas harian dermaga dan armada menggunakan formulir di sebelah kiri.'
                                                : 'Tidak ditemukan rekaman aktivitas lapangan pada rentang tanggal atau filter ini.'}
                                        </p>
                                    </Card>
                                ) : (
                                    groupKeys.map((groupKey) => {
                                        const groupActs = grouped[groupKey];
                                        const headerInfo = getGroupDisplayHeader(groupKey);

                                        return (
                                            <div key={groupKey} className="space-y-2.5">
                                                {/* Tanggal Header */}
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-[#0060F4]" />
                                                        <h4 className="font-extrabold text-sm text-[#082870] dark:text-white">
                                                            {headerInfo.title}
                                                        </h4>
                                                    </div>
                                                    <span className="text-[11px] font-medium text-[#52658E] dark:text-[#94A3B8]">
                                                        {headerInfo.subtitle} • {groupActs.length} aktivitas
                                                    </span>
                                                </div>

                                                {/* Grid Kartu Aktivitas */}
                                                <div className={`grid gap-3 ${isOperational ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                                                    {groupActs.map((act) => {
                                                        const firstPhoto = act.photos?.[0];
                                                        const photoCount = act.photos?.length || 0;

                                                        return (
                                                            <button
                                                                type="button"
                                                                key={act.id}
                                                                onClick={() => setSelectedActivity(act)}
                                                                className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] text-left hover:border-[#0060F4] hover:shadow-sm transition-all group cursor-pointer"
                                                            >
                                                                {/* Foto Thumbnail */}
                                                                <div className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-[#F0F8FF] border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                                                    {firstPhoto ? (
                                                                        <img
                                                                            src={firstPhoto}
                                                                            alt={act.title}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center text-[#8C9BB9] text-[10px]">
                                                                            <span className="text-xl">📷</span>
                                                                            <span>Tanpa Foto</span>
                                                                        </div>
                                                                    )}
                                                                    {photoCount > 1 && (
                                                                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold">
                                                                            +{photoCount - 1}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Info Aktivitas */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${categoryBadgeClass(act.category)}`}>
                                                                            {categoryLabel(act.category)}
                                                                        </span>
                                                                        <span className="text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                                                            {act.activity_time} WIB
                                                                        </span>
                                                                    </div>

                                                                    <h5 className="font-extrabold text-xs sm:text-sm text-[#0B1F63] dark:text-white line-clamp-1 group-hover:text-[#0060F4] transition-colors">
                                                                        {act.title}
                                                                    </h5>

                                                                    <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed">
                                                                        {act.detail}
                                                                    </p>

                                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-[#6E82A5] dark:text-[#8C9BB9]">
                                                                        {act.ship && (
                                                                            <span className="font-semibold text-[#0B1F63] dark:text-[#E7F0FA]">
                                                                                🚢 {act.ship.name}
                                                                            </span>
                                                                        )}
                                                                        <span>📍 {act.location_name || 'Area Pelabuhan'}</span>
                                                                        {act.creator?.name && (
                                                                            <span>👤 {act.creator.name}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Desktop Report Modal ── */}
            <Modal isOpen={isReportModalOpen} onClose={() => { clearErrors(); setIsReportModalOpen(false); }} title="Kirim Laporan Harian Lapangan">
                <form noValidate onSubmit={handleReportSubmit} className="space-y-4 text-xs">
                    <FormErrorSummary errors={errors} />
                    <Select required name="port_call_id" label="Pilih Kunjungan Kapal (Port Call)" value={data.port_call_id} onChange={(event) => setData('port_call_id', event.target.value)} error={errors.port_call_id} options={portCalls.map((portCall) => ({ value: portCall.id, label: `${portCall.job_number} — ${portCall.ship?.name || '-'} (${portCall.port?.name || '-'})` }))} />
                    <Input required name="report_date" label="Tanggal Kegiatan" type="date" value={data.report_date} onChange={(event) => setData('report_date', event.target.value)} error={errors.report_date} />
                    <Textarea required name="summary" label="Ringkasan Aktivitas Lapangan" value={data.summary} onChange={(event) => setData('summary', event.target.value)} rows={4} maxLength={2000} showCharCount placeholder="Catat kondisi cuaca, koordinasi sandar dermaga, realisasi pengisian air/BBM, serta izin clearance…" error={errors.summary} />

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button type="button" variant="secondary" onClick={() => { clearErrors(); setIsReportModalOpen(false); }}>Batal</Button>
                        <Button type="submit" variant="primary" disabled={processing} className="bg-[#0060F4] text-white">
                            {processing ? 'Mengirim...' : 'Kirim Laporan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(departurePortCall)} onClose={() => { setDepartureErrors({}); setDeparturePortCall(null); }} title="Ajukan Clearance Out" subtitle="Kapal baru berstatus Berangkat setelah approval dan penyelesaian Admin.">
                <form noValidate onSubmit={submitDeparture} className="space-y-4 p-5">
                    <FormErrorSummary errors={departureErrors} />
                    <div className="rounded-xl bg-[#F0F8FF] p-3 text-sm text-[#0B1F63] dark:bg-[#071322] dark:text-[#F1F5F9]"><strong>{departurePortCall?.ship?.name}</strong><span className="mt-1 block text-xs text-[#52658E]">{departurePortCall?.job_number}</span></div>
                    <Input name="completion_note_due_at" label="Target Nota Rampung tersedia (opsional)" type="datetime-local" value={completionNoteDueAt} onChange={(event) => setCompletionNoteDueAt(event.target.value)} helperText="Isi jika Pelindo sudah memberikan estimasi; sistem tidak mengasumsikan ukuran kapal." error={departureErrors.completion_note_due_at} />
                    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => { setDepartureErrors({}); setDeparturePortCall(null); }}>Batal</Button><Button type="submit">Buat Pengajuan</Button></div>
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
                            <div className={`grid gap-3 ${SHOW_EXTENDED_ACTIVITY_FIELDS ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1'}`}>
                                <div className="rounded-xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52658E]">Posisi</span>
                                    <span className="mt-1 block text-xs font-bold text-[#0B1F63] dark:text-white">{vesselPositionLabel(selectedActivity.vessel_position)}</span>
                                </div>
                                {SHOW_EXTENDED_ACTIVITY_FIELDS && (
                                    <>
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
                                    </>
                                )}
                            </div>
                        )}

                        {SHOW_EXTENDED_ACTIVITY_FIELDS && (selectedActivity.constraints || selectedActivity.next_plan) && (
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
