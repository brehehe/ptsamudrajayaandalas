import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import MobilePageHero from '@/Components/navigation/MobilePageHero';
import PhotoUploadPicker from '@/Components/forms/PhotoUploadPicker';
import DateTimePicker from '@/Components/forms/DateTimePicker';
import RadioGroup from '@/Components/forms/Radio';
import Input from '@/Components/forms/Input';
import FormErrorSummary from '@/Components/forms/FormErrorSummary';

interface Company {
    id: string;
    code: string;
    name: string;
    address?: string;
}

interface Ship {
    id: string;
    name: string;
    imo_number?: string;
    ship_type?: string;
    status?: string;
    image?: string | null;
    ship_company_id?: string | null;
    company?: Company;
    captain_name?: string;
    captain_phone?: string;
    eta?: string;
}

interface Port {
    id: string;
    code: string;
    name: string;
}

interface ServiceType {
    id: string;
    code: string;
    name: string;
}

interface Product {
    id: string;
    code: string;
    name: string;
    unit: string;
    item_type: 'jasa' | 'non_jasa';
}

interface PortCall {
    id: string;
    job_number: string;
    status?: string;
    eta_at?: string;
    clearance_in_block_reason?: string | null;
    can_clearance_out?: boolean;
    ship: Ship;
    port?: Port;
    work_order?: {
        id: string;
        system_number: string;
        client_pic_name?: string | null;
        client_pic_contact?: string | null;
    };
}

interface RequestsCreateProps {
    companies: Company[];
    ships: Ship[];
    portCalls: PortCall[];
    ports: Port[];
    serviceTypes: ServiceType[];
    products: Product[];
}

interface ItemDetail {
    id: string;
    item_name: string;
    quantity: number;
    unit: string;
    notes: string;
    is_urgent?: boolean;
    required_date?: string;
    required_time?: string;
}

interface ShipSelectionData {
    ship_id: string;
    port_call_id: string;
    ship_name: string;
    request_type: string;
    department: 'Deck' | 'Engine' | 'Lainnya';
    department_other?: string;
    order_date: string;
    requester_name: string;
    requester_phone: string;
    items: ItemDetail[];
    required_date: string;
    required_time: string;
    requested_port_call_status: '' | 'anchored' | 'berthed' | 'departed';
    operational_occurred_at: string;
    notes: string;
    form_photo?: File | null;
    form_photo_preview?: string | null;
}

/**
 * Wizard stages:
 *  'list'         – Step 1: daftar kapal + sudah terkonfigurasi
 *  'pick-type'    – Sub-panel: pilih jenis pengajuan untuk 1 kapal (dari klik di list)
 *  'kebutuhan'    – Sub-panel: isi detail kebutuhan (hanya untuk "Kebutuhan Kapal")
 *  'review'       – Step 3: review semua kapal → submit
 *  'success'      – Berhasil dikirim
 */
type Stage = 'list' | 'pick-type' | 'kebutuhan' | 'review' | 'success';

const DEFAULT_REQUEST_TYPES = [
    'Kedatangan (Clearance In)',
    'Perpanjangan Surat / Endors Surat Laut',
    'Keberangkatan (Clearance Out)',
    'Kebutuhan Kapal',
];

const CLEARANCE_IN = 'Kedatangan (Clearance In)';
const CLEARANCE_OUT = 'Keberangkatan (Clearance Out)';

const getCurrentLocalDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const visitStatusLabel = (status?: string): string => {
    switch (status) {
        case 'scheduled':
            return 'Akan Datang';
        case 'anchored':
            return 'Labuh';
        case 'berthed':
            return 'Sandar';
        case 'departed':
        case 'completed':
            return 'Selesai';
        default:
            return status || 'Belum Ditentukan';
    }
};

const visitStatusClasses = (status?: string): string => {
    if (status === 'berthed') return 'bg-[#DCF7E8] text-[#087443] dark:bg-emerald-950/45 dark:text-emerald-300';
    if (status === 'anchored') return 'bg-[#FFF0CC] text-[#A65300] dark:bg-amber-950/45 dark:text-amber-300';
    if (status === 'completed' || status === 'departed') return 'bg-[#EEF2F7] text-[#52658E] dark:bg-slate-800 dark:text-slate-300';

    return 'bg-[#E0F0FF] text-[#0057D9] dark:bg-blue-950/45 dark:text-blue-300';
};

const formatDisplayDate = (value?: string): string => {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
};

const COMMON_UNITS = ['Ton', 'Lonjor', 'Unit', 'Liter', 'Orang', 'Paket', 'Set', 'Pcs'];

const createInitialItem = (): ItemDetail => {
    const today = getCurrentLocalDate();
    return {
        id: Date.now().toString(),
        item_name: '',
        quantity: 1,
        unit: 'Unit',
        notes: '',
        is_urgent: false, // Bagian prioritas kebutuhan auto-isi default ke 'Normal'
        required_date: today,
        required_time: '10:00',
    };
};

const makeDefaultDetail = (portCall: PortCall): ShipSelectionData => ({
    ship_id: portCall.ship.id,
    port_call_id: portCall.id,
    ship_name: portCall.ship.name,
    request_type: '',
    department: 'Deck',
    order_date: getCurrentLocalDate(),
    requester_name: portCall.work_order?.client_pic_name || portCall.ship.captain_name || '',
    requester_phone: portCall.work_order?.client_pic_contact || portCall.ship.captain_phone || '',
    items: [],
    required_date: getCurrentLocalDate(),
    required_time: '10:00',
    requested_port_call_status: '',
    operational_occurred_at: getCurrentLocalDate(),
    notes: '',
});

export default function RequestsCreate({
    portCalls = [],
    products = [],
}: RequestsCreateProps) {
    const availableProducts = products;

    // ── State ──
    const [stage, setStage] = useState<Stage>('list');
    const [shipSearch, setShipSearch] = useState('');

    // Map of port_call_id -> ShipSelectionData (only for configured visits)
    const [shipDetails, setShipDetails] = useState<Record<string, ShipSelectionData>>({});

    // Which visit is currently being configured in the pick-type / kebutuhan panel
    const [activeShipId, setActiveShipId] = useState<string>('');

    // Temp request_type selection while in pick-type panel (before confirming)
    const [tempRequestType, setTempRequestType] = useState<string>('');

    // Submission state
    const [notesGlobal, setNotesGlobal] = useState('');
    const [submittedNumber, setSubmittedNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionErrors, setSubmissionErrors] = useState<Record<string, string>>({});

    // Whether we entered kebutuhan panel from review (to go back to review after save)
    const [returnToReviewAfterKebutuhan, setReturnToReviewAfterKebutuhan] = useState(false);

    // ── Derived ──
    const filteredVisits = portCalls.filter(
        (visit) =>
            visit.ship.name.toLowerCase().includes(shipSearch.toLowerCase()) ||
            visit.job_number.toLowerCase().includes(shipSearch.toLowerCase()) ||
            (visit.ship.imo_number && visit.ship.imo_number.toLowerCase().includes(shipSearch.toLowerCase())) ||
            (visit.port?.name && visit.port.name.toLowerCase().includes(shipSearch.toLowerCase()))
    );

    const configuredVisitIds = Object.keys(shipDetails).filter(
        (id) => shipDetails[id]?.request_type !== ''
    );
    const configuredCount = configuredVisitIds.length;

    const activeVisit = portCalls.find((visit) => visit.id === activeShipId) || null;
    const activeShip = activeVisit?.ship || null;
    const activeDetail = activeVisit
        ? { ...makeDefaultDetail(activeVisit), ...shipDetails[activeShipId] }
        : null;
    const requestTypeBlockReason = (requestType: string): string | null => {
        if (!activeVisit) return 'Pilih kunjungan / job terlebih dahulu.';

        if (requestType === CLEARANCE_IN) {
            return activeVisit.clearance_in_block_reason || null;
        }

        if (requestType === CLEARANCE_OUT && !activeVisit.can_clearance_out) {
            return 'Clearance Out tersedia setelah kapal berstatus Labuh atau Sandar.';
        }

        return null;
    };
    const selectedRequestTypeBlockReason = requestTypeBlockReason(tempRequestType);

    // ── Helpers ──
    const openPickType = (visit: PortCall) => {
        const existing = shipDetails[visit.id];
        setActiveShipId(visit.id);
        setTempRequestType(existing?.request_type || '');
        setStage('pick-type');
    };

    const confirmPickType = () => {
        if (!tempRequestType || !activeVisit || selectedRequestTypeBlockReason) return;

        const isClearanceIn = tempRequestType === CLEARANCE_IN;
        const isClearanceOut = tempRequestType === CLEARANCE_OUT;
        if ((isClearanceIn || isClearanceOut) && !activeDetail?.operational_occurred_at) return;
        if (isClearanceIn && !['anchored', 'berthed'].includes(activeDetail?.requested_port_call_status || '')) return;

        setShipDetails((prev) => {
            const existing = { ...makeDefaultDetail(activeVisit), ...prev[activeVisit.id] };
            const needsItems = tempRequestType === 'Kebutuhan Kapal' && (existing.items || []).length === 0;
            return {
                ...prev,
                [activeVisit.id]: {
                    ...existing,
                    request_type: tempRequestType,
                    items: needsItems ? [createInitialItem()] : existing.items,
                },
            };
        });

        if (tempRequestType === 'Kebutuhan Kapal') {
            // Go to kebutuhan detail panel
            setReturnToReviewAfterKebutuhan(false);
            setStage('kebutuhan');
        } else {
            // Return to list
            setStage('list');
        }
    };

    const updateActiveDetail = (field: keyof ShipSelectionData, value: any) => {
        if (!activeShipId || !activeVisit) return;
        setShipDetails((prev) => ({
            ...prev,
            [activeShipId]: {
                ...makeDefaultDetail(activeVisit),
                ...prev[activeShipId],
                [field]: value,
            },
        }));
    };

    const addItem = () => {
        if (!activeShipId) return;
        const newItem = createInitialItem();
        setShipDetails((prev) => ({
            ...prev,
            [activeShipId]: {
                ...prev[activeShipId],
                items: [...(prev[activeShipId]?.items || []), newItem],
            },
        }));
    };

    const removeItem = (itemId: string) => {
        if (!activeShipId) return;
        setShipDetails((prev) => ({
            ...prev,
            [activeShipId]: {
                ...prev[activeShipId],
                items: prev[activeShipId]?.items.filter((i) => i.id !== itemId) || [],
            },
        }));
    };

    const updateItem = (itemId: string, field: keyof ItemDetail, value: any) => {
        if (!activeShipId) return;
        setShipDetails((prev) => ({
            ...prev,
            [activeShipId]: {
                ...prev[activeShipId],
                items: prev[activeShipId]?.items.map((i) =>
                    i.id === itemId ? { ...i, [field]: value } : i
                ) || [],
            },
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmissionError(null);
        setSubmissionErrors({});

        const configuredVisits = portCalls.filter((visit) => configuredVisitIds.includes(visit.id));
        const payload = {
            ships: configuredVisits.map((visit) => {
                const det = shipDetails[visit.id];
                return {
                    ship_id: visit.ship.id,
                    port_call_id: visit.id,
                    request_type: det.request_type,
                    department: det.department,
                    order_date: det.order_date,
                    requester_name: det.requester_name,
                    requester_phone: det.requester_phone,
                    required_date: det.required_date,
                    required_time: det.required_time,
                    requested_port_call_status: det.request_type === CLEARANCE_IN
                        ? det.requested_port_call_status
                        : det.request_type === CLEARANCE_OUT
                            ? 'departed'
                            : null,
                    operational_occurred_at: [CLEARANCE_IN, CLEARANCE_OUT].includes(det.request_type)
                        ? det.operational_occurred_at
                        : null,
                    notes: det.notes,
                    items: det.request_type === 'Kebutuhan Kapal'
                        ? (det.items || [])
                            .filter((it) => it.item_name && it.item_name.trim().length > 0)
                            .map((it) => ({
                                item_name: it.item_name.trim(),
                                quantity: Number(it.quantity) || 1,
                                unit: it.unit || 'Unit',
                                notes: it.notes || '',
                                is_urgent: Boolean(it.is_urgent),
                            }))
                        : [],
                };
            }),
            notes: notesGlobal,
        };

        router.post('/requests/multi', payload, {
            preserveScroll: true,
            onSuccess: (page) => {
                setIsSubmitting(false);
                const generated = (page.props.flash as any)?.submitted_request_number;
                setSubmittedNumber(typeof generated === 'string' ? generated : '');
                setStage('success');
            },
            onError: (errors) => {
                setIsSubmitting(false);
                setSubmissionErrors(errors as Record<string, string>);
                setSubmissionError(Object.values(errors)[0] || 'Periksa kembali data pengajuan.');
            },
        });
    };

    // ── Step indicator ──
    const stepNumber: number = stage === 'list' || stage === 'pick-type' || stage === 'kebutuhan' ? 1
        : stage === 'review' ? 3
            : 0;
    const showStepper = stage !== 'success';

    // ── Shared card wrapper ──
    const cardCls =
        'bg-transparent md:bg-white dark:md:bg-[#0C1D36] border-0 md:border md:border-[#DCEAF8] dark:md:border-[#1E3A5F] rounded-none md:rounded-2xl px-4 py-1 md:p-6 shadow-none md:shadow-xs';

    return (
        <AppLayout
            title="Buat Pengajuan"
            hideMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Buat Pengajuan — PT Samudra Jaya Andalas" />

            <MobilePageHero
                title="Buat Pengajuan"
                description="Pilih kapal, lengkapi kebutuhan, lalu kirim pengajuan untuk diproses."
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-4xl rounded-t-[28px] bg-white px-0 pb-6 pt-4 dark:bg-[#0C1D36] sm:px-4 sm:pb-10 md:mt-0 md:min-h-0 md:rounded-none md:bg-transparent md:pt-0 md:dark:bg-transparent">

                {/* ── Stepper ── */}
                {showStepper && (
                    <div className="mb-4 bg-white dark:bg-[#0C1D36] border-b border-[#DCEAF8] dark:border-[#1E3A5F] md:border md:rounded-2xl px-4 py-3 md:p-4 shadow-none md:shadow-xs">
                        <div className="flex items-center justify-between max-w-xl mx-auto relative">
                            {/* Track */}
                            <div className="absolute top-4 left-8 right-8 h-0.5 bg-[#DCEAF8] dark:bg-[#1E3A5F]">
                                <div
                                    className="h-full bg-[#0060F4] transition-all duration-300"
                                    style={{ width: stepNumber === 1 ? '0%' : stepNumber === 2 ? '50%' : '100%' }}
                                />
                            </div>

                            {/* Step 1 */}
                            <div className="flex flex-col items-center relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${stepNumber >= 1 ? 'bg-[#0060F4] text-white shadow-xs' : 'bg-[#E0F0FF] text-[#52658E]'}`}>
                                    {stepNumber > 1 ? '✓' : '1'}
                                </div>
                                <span className={`text-xs mt-1.5 font-bold ${stepNumber >= 1 ? 'text-[#0060F4] dark:text-[#38BDF8]' : 'text-[#52658E] dark:text-[#94A3B8]'}`}>
                                    Pilih Kapal
                                </span>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col items-center relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${stepNumber >= 2 ? 'bg-[#0060F4] text-white shadow-xs' : 'bg-white dark:bg-[#081528] border-2 border-[#DCEAF8] dark:border-[#1E3A5F] text-[#52658E]'}`}>
                                    {stepNumber > 2 ? '✓' : '2'}
                                </div>
                                <span className={`text-xs mt-1.5 font-bold ${stepNumber >= 2 ? 'text-[#0060F4] dark:text-[#38BDF8]' : 'text-[#52658E] dark:text-[#94A3B8]'}`}>
                                    Detail Pengajuan
                                </span>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col items-center relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${stepNumber >= 3 ? 'bg-[#0060F4] text-white shadow-xs' : 'bg-white dark:bg-[#081528] border-2 border-[#DCEAF8] dark:border-[#1E3A5F] text-[#52658E]'}`}>
                                    3
                                </div>
                                <span className={`text-xs mt-1.5 font-bold ${stepNumber >= 3 ? 'text-[#0060F4] dark:text-[#38BDF8]' : 'text-[#52658E] dark:text-[#94A3B8]'}`}>
                                    Review & Kirim
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    STAGE: list  —  Daftar kapal
                ══════════════════════════════════════════ */}
                {stage === 'list' && (
                    <div className={`${cardCls} space-y-4`}>
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#DCEAF8] dark:border-[#1E3A5F] pb-3">
                            <div>
                                <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">
                                    Pilih Kunjungan Kapal
                                </h2>
                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                    Pilih berdasarkan nomor job agar pengajuan masuk ke kunjungan yang tepat.
                                </p>
                            </div>
                            {configuredCount > 0 && (
                                <span className="text-xs font-bold text-[#0060F4] dark:text-[#38BDF8] bg-[#E0F0FF] dark:bg-[#132847] px-3 py-1 rounded-full self-start sm:self-auto">
                                    {configuredCount} Job Terpilih
                                </span>
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <svg aria-hidden="true" className="size-4 text-[#0060F4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={shipSearch}
                                onChange={(e) => setShipSearch(e.target.value)}
                                placeholder="Cari job, kapal, atau pelabuhan…"
                                aria-label="Cari kunjungan kapal"
                                className="w-full pl-10 pr-4 h-11 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                            />
                        </div>

                        {/* Visit list */}
                        <div className="space-y-2.5 pt-1">
                            {filteredVisits.map((visit) => {
                                const isConfigured = !!shipDetails[visit.id]?.request_type;
                                const reqType = shipDetails[visit.id]?.request_type;

                                return (
                                    <button
                                        type="button"
                                        key={visit.id}
                                        onClick={() => openPickType(visit)}
                                        className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99] ${isConfigured
                                                ? 'border-[#0060F4] bg-[#F0F8FF] dark:bg-[#102444]'
                                                : 'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] hover:border-[#0060F4]/50 hover:bg-[#F8FAFC]'
                                            } w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Check / Ship icon */}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isConfigured
                                                    ? 'bg-[#0060F4] text-white'
                                                    : 'bg-[#E0F0FF] dark:bg-[#1A3358] text-[#0060F4] dark:text-[#38BDF8]'
                                                }`}>
                                                {isConfigured ? (
                                                    <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12V6h4v6" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 12V8h4v4" />
                                                    </svg>
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-[#0B1F63] dark:text-white truncate">
                                                    {visit.ship.name}
                                                </h3>
                                                <p className="truncate text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                    <span className="font-mono font-semibold text-[#0060F4]">{visit.job_number}</span>
                                                    {' · '}{visit.port?.name || 'Pelabuhan belum ditentukan'}
                                                </p>
                                                {isConfigured && (
                                                    <span className="text-[11px] font-semibold text-[#0060F4] dark:text-[#38BDF8] truncate block">
                                                        ✓ {reqType}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <span className="flex shrink-0 flex-col items-end gap-2">
                                            <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${visitStatusClasses(visit.status)}`}>
                                                {visitStatusLabel(visit.status)}
                                            </span>
                                            <svg aria-hidden="true" className="size-4 text-[#8C9BB9]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </span>
                                    </button>
                                );
                            })}

                            {filteredVisits.length === 0 && (
                                <div className="rounded-xl border border-dashed border-[#DCEAF8] px-4 py-8 text-center dark:border-[#1E3A5F]">
                                    <p className="text-sm font-bold text-[#0B1F63] dark:text-white">Kunjungan kapal tidak ditemukan</p>
                                    <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">Buat atau aktifkan job kapal terlebih dahulu.</p>
                                </div>
                            )}
                        </div>

                        {/* Bottom action */}
                        <div className="pt-4 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                            <button
                                type="button"
                                disabled={configuredCount === 0}
                                onClick={() => setStage('review')}
                                className="w-full py-3.5 px-4 rounded-xl bg-[#0060F4] hover:bg-[#082870] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>Lanjutkan ({configuredCount} Job)</span>
                                <span>→</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    STAGE: pick-type  —  Pilih jenis pengajuan untuk 1 kapal
                ══════════════════════════════════════════ */}
                {stage === 'pick-type' && activeShip && (
                    <div className={`${cardCls} space-y-5`}>
                        {/* Header */}
                        <div className="border-b border-[#DCEAF8] dark:border-[#1E3A5F] pb-3">
                            <div className="flex items-center gap-2 mb-1">
                                <button
                                    type="button"
                                    onClick={() => setStage('list')}
                                    aria-label="Kembali ke daftar kunjungan"
                                    className="flex size-11 cursor-pointer items-center justify-center rounded-lg bg-[#F0F8FF] text-[#0060F4] transition-colors hover:bg-[#DCEAF8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] md:size-9 dark:bg-[#132847]"
                                >
                                    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">
                                    Jenis Pengajuan
                                </h2>
                            </div>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5 pl-9">
                                Pilih jenis pengajuan untuk {activeVisit?.job_number}.
                            </p>
                        </div>

                        {/* Ship card */}
                        <div className="p-3.5 rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F0F8FF] dark:bg-[#102444] flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-[#0060F4] text-white flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12V6h4v6" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 12V8h4v4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-[#0B1F63] dark:text-white">{activeShip.name}</h3>
                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                    {activeVisit?.job_number} · {activeVisit?.port?.name || 'Pelabuhan belum ditentukan'}
                                </p>
                            </div>
                        </div>

                        {/* Pilih jenis */}
                        <div className="space-y-2.5">
                            <h4 className="text-xs font-bold text-[#082870] dark:text-white">
                                Pilih Jenis Pengajuan
                            </h4>
                            {DEFAULT_REQUEST_TYPES.map((rt) => {
                                const isSelected = tempRequestType === rt;
                                const blockReason = requestTypeBlockReason(rt);
                                const isDisabled = Boolean(blockReason);
                                return (
                                    <button
                                        key={rt}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => setTempRequestType(rt)}
                                        className={`w-full text-left px-4 py-3.5 rounded-xl border-2 flex items-center justify-between gap-3 transition-colors ${isDisabled
                                                ? 'cursor-not-allowed border-[#DCEAF8] bg-[#F3F8FD] opacity-55 dark:border-[#1E3A5F] dark:bg-[#071322]'
                                                : 'cursor-pointer'
                                            } ${isSelected
                                                ? 'border-[#0060F4] bg-[#F0F8FF] dark:bg-[#102444]'
                                                : isDisabled
                                                    ? ''
                                                    : 'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] hover:border-[#0060F4]/40'
                                            }`}
                                    >
                                        <span className="min-w-0">
                                            <span className={`block text-sm font-semibold ${isSelected ? 'text-[#0060F4] dark:text-[#38BDF8]' : 'text-[#0B1F63] dark:text-white'}`}>
                                                {rt}
                                            </span>
                                            {blockReason && (
                                                <span className="mt-1 block text-pretty text-[11px] leading-4 text-[#52658E] dark:text-[#94A3B8]">
                                                    {blockReason}
                                                </span>
                                            )}
                                        </span>
                                        <span className={`size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected
                                                ? 'border-[#0060F4] bg-[#0060F4]'
                                                : 'border-[#DCEAF8] dark:border-[#1E3A5F]'
                                            }`}>
                                            {isSelected && (
                                                <svg aria-hidden="true" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {tempRequestType === CLEARANCE_IN && !selectedRequestTypeBlockReason && activeDetail && (
                            <div className="space-y-4 border-t border-[#DCEAF8] pt-4 dark:border-[#1E3A5F]">
                                <RadioGroup
                                    name="clearance-in-target-status"
                                    label="Target status setelah pengajuan selesai"
                                    value={activeDetail.requested_port_call_status}
                                    onChange={(value) => updateActiveDetail('requested_port_call_status', value)}
                                    options={[
                                        {
                                            value: 'anchored',
                                            label: 'Labuh',
                                            description: 'Kapal lego jangkar atau menunggu antrean.',
                                        },
                                        {
                                            value: 'berthed',
                                            label: 'Sandar',
                                            description: 'Kapal langsung bersandar di dermaga.',
                                        },
                                    ]}
                                    required
                                />
                                <Input
                                    id="clearance-in-actual-date"
                                    name="operational_occurred_at"
                                    type="date"
                                    label="Tanggal kedatangan aktual"
                                    value={activeDetail.operational_occurred_at}
                                    max={getCurrentLocalDate()}
                                    onChange={(event) => updateActiveDetail('operational_occurred_at', event.target.value)}
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        )}

                        {tempRequestType === CLEARANCE_OUT && !selectedRequestTypeBlockReason && activeDetail && (
                            <div className="border-t border-[#DCEAF8] pt-4 dark:border-[#1E3A5F]">
                                <Input
                                    id="clearance-out-actual-date"
                                    name="operational_occurred_at"
                                    type="date"
                                    label="Tanggal keberangkatan aktual"
                                    value={activeDetail.operational_occurred_at}
                                    max={getCurrentLocalDate()}
                                    onChange={(event) => updateActiveDetail('operational_occurred_at', event.target.value)}
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        )}

                        {/* Helper text for Kebutuhan Kapal */}
                        {tempRequestType === 'Kebutuhan Kapal' && (
                            <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2">
                                <span className="text-sm flex-shrink-0">💡</span>
                                <span>Anda akan diminta mengisi detail barang / kebutuhan setelah ini.</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setStage('list')}
                                className="flex-1 py-3 px-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] hover:bg-[#F0F8FF] text-[#52658E] dark:text-[#94A3B8] font-bold text-sm transition-all cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={
                                    !tempRequestType ||
                                    Boolean(selectedRequestTypeBlockReason) ||
                                    ([CLEARANCE_IN, CLEARANCE_OUT].includes(tempRequestType) && !activeDetail?.operational_occurred_at) ||
                                    (tempRequestType === CLEARANCE_IN && !['anchored', 'berthed'].includes(activeDetail?.requested_port_call_status || ''))
                                }
                                onClick={confirmPickType}
                                className="flex-1 py-3 px-4 rounded-xl bg-[#0060F4] hover:bg-[#082870] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>{tempRequestType === 'Kebutuhan Kapal' ? 'Lanjutkan →' : 'Pilih'}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    STAGE: kebutuhan  —  Detail Kebutuhan Kapal
                ══════════════════════════════════════════ */}
                {stage === 'kebutuhan' && activeShip && activeDetail && (
                    <div className={`${cardCls} space-y-5`}>
                        {/* Header */}
                        <div className="border-b border-[#DCEAF8] dark:border-[#1E3A5F] pb-3">
                            <div className="flex items-center gap-2 mb-1">
                                <button
                                    type="button"
                                    onClick={() => setStage('pick-type')}
                                    className="w-7 h-7 rounded-lg bg-[#F0F8FF] dark:bg-[#132847] text-[#0060F4] flex items-center justify-center hover:bg-[#DCEAF8] transition-colors cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">
                                    Detail Kebutuhan
                                </h2>
                            </div>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] pl-9">
                                {activeShip.name}
                            </p>
                        </div>

                        {/* ── Informasi Form Kapal ── */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-[#082870] dark:text-white">
                                Informasi Form Kapal
                            </h4>

                            <div className="space-y-3.5 text-xs">
                                {/* Bagian */}
                                <div>
                                    <label className="font-bold text-[#082870] dark:text-white block mb-1.5">
                                        Bagian <span className="text-[#C62840]">*</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Deck', 'Engine', 'Lainnya'] as const).map((b) => (
                                            <button
                                                key={b}
                                                type="button"
                                                onClick={() => updateActiveDetail('department', b)}
                                                className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeDetail.department === b
                                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                                        : 'bg-[#F0F8FF] dark:bg-[#081528] text-[#082870] dark:text-[#94A3B8] border border-[#DCEAF8] dark:border-[#1E3A5F] hover:border-[#0060F4]/40'
                                                    }`}
                                            >
                                                {b}
                                            </button>
                                        ))}
                                    </div>
                                    {activeDetail.department === 'Lainnya' && (
                                        <Input
                                            type="text"
                                            aria-label="Bagian lainnya"
                                            value={activeDetail.department_other || ''}
                                            onChange={(e) => updateActiveDetail('department_other', e.target.value)}
                                            placeholder="Tulis bagian lainnya"
                                            className="mt-2"
                                            sizeVariant="sm"
                                        />
                                    )}
                                </div>

                                {/* Tanggal / Bulan / Tahun */}
                                <Input
                                    label="Tanggal / Bulan / Tahun"
                                    type="date"
                                    required
                                    value={activeDetail.order_date || ''}
                                    onChange={(e) => updateActiveDetail('order_date', e.target.value)}
                                    sizeVariant="sm"
                                />

                                {/* Nama Pemesan */}
                                <Input
                                    label="Nama Pemesan"
                                    type="text"
                                    required
                                    value={activeDetail.requester_name || ''}
                                    onChange={(e) => updateActiveDetail('requester_name', e.target.value)}
                                    placeholder="Nama nahkoda / pemesan"
                                    sizeVariant="sm"
                                />

                                {/* Nomor HP */}
                                <Input
                                    label="Nomer Handphone"
                                    type="tel"
                                    required
                                    inputMode="tel"
                                    maxLength={20}
                                    value={activeDetail.requester_phone || ''}
                                    onChange={(e) => updateActiveDetail('requester_phone', e.target.value)}
                                    placeholder="Nomor HP pemesan"
                                    leftIcon={<span>📞</span>}
                                    sizeVariant="sm"
                                />
                            </div>
                        </div>

                        {/* ── Detail Item Kebutuhan ── */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-[#082870] dark:text-white">
                                    Item Kebutuhan
                                </h4>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="px-3 py-1.5 rounded-lg bg-[#E0F0FF] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8] text-xs font-bold hover:bg-[#0060F4] hover:text-white transition-all cursor-pointer"
                                >
                                    + Tambah Item
                                </button>
                            </div>

                            <div className="space-y-4">
                                {(activeDetail.items || []).length === 0 ? (
                                    <div className="p-6 text-center rounded-xl border border-dashed border-[#BCE0FD] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] space-y-2">
                                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                            Belum ada item kebutuhan yang ditambahkan.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="px-3.5 py-2 rounded-lg bg-[#0060F4] text-white text-xs font-bold shadow-xs hover:bg-[#082870] transition-all cursor-pointer inline-flex items-center gap-1.5"
                                        >
                                            <span className="text-base font-bold leading-none">+</span>
                                            <span>Tambah Item Kebutuhan</span>
                                        </button>
                                    </div>
                                ) : (
                                    (activeDetail.items || []).map((item, idx) => (
                                    <div
                                        key={item.id}
                                        className="p-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] space-y-3.5"
                                    >
                                        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-[#1E3A5F]">
                                            <span className="text-xs font-extrabold text-[#0060F4] dark:text-[#38BDF8]">
                                                Item {idx + 1}
                                            </span>
                                            {(activeDetail.items?.length || 0) > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-xs font-bold text-[#C62840] hover:underline cursor-pointer flex items-center gap-1"
                                                >
                                                    <span>🗑 Hapus</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Prioritas */}
                                        <RadioGroup
                                            name={`item-${item.id}-urgency`}
                                            label="Prioritas kebutuhan"
                                            value={item.is_urgent ? 'urgent' : 'normal'}
                                            onChange={(val) => updateItem(item.id, 'is_urgent', val === 'urgent')}
                                            layout="grid-2"
                                            variant="card"
                                            options={[
                                                { value: 'normal', label: 'Normal' },
                                                { value: 'urgent', label: 'Urgent' },
                                            ]}
                                        />

                                        {/* Nama Barang */}
                                        <div>
                                            <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                                Nama Barang / Item <span className="text-[#C62840]">*</span>
                                            </label>
                                            <select
                                                value={
                                                    availableProducts.some((p) => p.name.toLowerCase() === (item.item_name || '').toLowerCase())
                                                        ? availableProducts.find((p) => p.name.toLowerCase() === (item.item_name || '').toLowerCase())?.id
                                                        : item.item_name ? '__custom__' : ''
                                                }
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '__custom__') {
                                                        updateItem(item.id, 'item_name', '');
                                                    } else if (val) {
                                                        const matched = availableProducts.find((p) => p.id === val);
                                                        if (matched) {
                                                            updateItem(item.id, 'item_name', matched.name);
                                                            if (matched.unit) updateItem(item.id, 'unit', matched.unit);
                                                        }
                                                    }
                                                }}
                                                className="w-full px-4 py-2.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] text-xs sm:text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4] cursor-pointer"
                                            >
                                                <option value="">-- Pilih dari Master Produk --</option>
                                                {availableProducts.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} ({p.unit})
                                                    </option>
                                                ))}
                                                <option value="__custom__">Lainnya / Tulis Manual</option>
                                            </select>
                                            {(!availableProducts.some((p) => p.name.toLowerCase() === (item.item_name || '').toLowerCase()) || !item.item_name) && (
                                                <input
                                                    type="text"
                                                    value={item.item_name}
                                                    onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                                                    placeholder="Tulis nama barang atau kebutuhan lainnya..."
                                                    className="mt-2 w-full px-4 py-2.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] text-xs sm:text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                                                />
                                            )}
                                        </div>

                                        {/* Jumlah & Satuan */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                                    Jumlah <span className="text-[#C62840]">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0.1"
                                                    step="any"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] text-xs sm:text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                                    Satuan <span className="text-[#C62840]">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.unit}
                                                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                    placeholder="Ton, Liter, Pcs"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] text-xs sm:text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                                                />
                                            </div>
                                        </div>

                                        {/* Keterangan */}
                                        <div>
                                            <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                                Keterangan
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={item.notes}
                                                onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                                                placeholder="Keterangan tambahan"
                                                className="w-full px-4 py-2.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] text-xs sm:text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                                            />
                                        </div>

                                        {/* Jadwal */}
                                        <div className="pt-1">
                                            <DateTimePicker
                                                id={`item-${item.id}-datetime`}
                                                label="Jadwal Dibutuhkan"
                                                layout="combined"
                                                dateValue={item.required_date || ''}
                                                timeValue={item.required_time || '10:00'}
                                                onDateChange={(val) => updateItem(item.id, 'required_date', val)}
                                                onTimeChange={(val) => updateItem(item.id, 'required_time', val)}
                                            />
                                        </div>
                                    </div>
                                )))}

                                {/* Tambah Item */}
                                {(activeDetail.items || []).length > 0 && (
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="w-full py-3 rounded-xl border-2 border-dashed border-[#0060F4] hover:bg-[#F0F8FF] dark:hover:bg-[#081528] text-[#0060F4] dark:text-[#38BDF8] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                        <span className="text-base font-bold">+</span>
                                        <span>Tambah Item Lain</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Upload Foto */}
                        <div className="space-y-2 pt-2">
                            <h4 className="text-xs font-bold text-[#0B1F63] dark:text-white">
                                Upload Foto Form Kapal{' '}
                                <span className="font-medium text-[#52658E] dark:text-[#94A3B8]">(Opsional)</span>
                            </h4>
                            <PhotoUploadPicker
                                value={activeDetail.form_photo || null}
                                previewUrl={activeDetail.form_photo_preview || null}
                                onChange={(file, pUrl) => {
                                    setShipDetails((prev) => ({
                                        ...prev,
                                        [activeShipId]: {
                                            ...prev[activeShipId],
                                            form_photo: file,
                                            form_photo_preview: pUrl || null,
                                        },
                                    }));
                                }}
                                helperText="Tambahkan foto form asli dari kapal jika tersedia. Maksimal 5 MB."
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setStage('pick-type')}
                                className="flex-1 py-3 px-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] hover:bg-[#F0F8FF] text-[#52658E] dark:text-[#94A3B8] font-bold text-sm transition-all cursor-pointer"
                            >
                                Kembali
                            </button>
                            {returnToReviewAfterKebutuhan ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReturnToReviewAfterKebutuhan(false);
                                        setStage('review');
                                    }}
                                    className="flex-1 py-3 px-4 rounded-xl bg-[#087443] hover:bg-[#065b34] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Simpan & Kembali ke Review</span>
                                    <span>✓</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setStage('list')}
                                    className="flex-1 py-3 px-4 rounded-xl bg-[#0060F4] hover:bg-[#082870] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Selesai</span>
                                    <span>→</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    STAGE: review  —  Review semua kapal & Submit
                ══════════════════════════════════════════ */}
                {stage === 'review' && (
                    <form noValidate onSubmit={handleSubmit} className={`${cardCls} space-y-5`}>
                        <FormErrorSummary errors={submissionErrors} />
                        <div className="border-b border-[#DCEAF8] dark:border-[#1E3A5F] pb-3">
                            <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">Review Pengajuan</h2>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                Pastikan semua data sudah benar sebelum dikirimkan.
                            </p>
                        </div>

                        {/* Review cards */}
                        <div className="space-y-3">
                            {portCalls
                                .filter((visit) => configuredVisitIds.includes(visit.id))
                                .map((visit, idx) => {
                                    const ship = visit.ship;
                                    const det = shipDetails[visit.id];
                                    const items = det?.items || [];

                                    return (
                                        <div
                                            key={visit.id}
                                            className="p-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] flex items-start justify-between gap-3"
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <span className="w-6 h-6 rounded-full bg-[#0060F4] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <div className="space-y-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-[#0B1F63] dark:text-white truncate">
                                                        {ship.name}
                                                    </h3>
                                                    <p className="font-mono text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                                        {visit.job_number}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-semibold text-[#0060F4] dark:text-[#38BDF8]">
                                                            {det?.request_type}
                                                        </span>
                                                        {det?.request_type === 'Kebutuhan Kapal' && det?.department && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0F0FF] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8]">
                                                                Bagian {det.department}
                                                            </span>
                                                        )}
                                                        {det?.request_type === 'Kebutuhan Kapal' && det?.requester_name && (
                                                            <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                                                • {det.requester_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {[CLEARANCE_IN, CLEARANCE_OUT].includes(det?.request_type || '') && (
                                                        <p className="text-pretty text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                            {det?.request_type === CLEARANCE_IN
                                                                ? `Target ${det.requested_port_call_status === 'berthed' ? 'Sandar' : 'Labuh'}`
                                                                : 'Target Selesai'}
                                                            {' · '}{formatDisplayDate(det?.operational_occurred_at)}
                                                        </p>
                                                    )}
                                                    {det?.request_type === 'Kebutuhan Kapal' && (
                                                        <div>
                                                            {items.length > 0 ? (
                                                                <ul className="text-xs text-[#52658E] dark:text-[#B5C8DC] space-y-0.5 pt-1">
                                                                    {items.map((it) => (
                                                                        <li key={it.id} className="flex items-center gap-1.5">
                                                                            <span>•</span>
                                                                            <span>{it.item_name} — {it.quantity} {it.unit}</span>
                                                                            {it.notes && (
                                                                                <span className="text-[10px] text-[#8C9BB9]">({it.notes})</span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-xs italic text-[#8C9BB9] pt-1">
                                                                    Belum ada item
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveShipId(visit.id);
                                                    setTempRequestType(det?.request_type || '');
                                                    if (det?.request_type === 'Kebutuhan Kapal') {
                                                        setReturnToReviewAfterKebutuhan(true);
                                                        setStage('kebutuhan');
                                                    } else {
                                                        setStage('pick-type');
                                                    }
                                                }}
                                                className="text-xs font-bold text-[#0060F4] dark:text-[#38BDF8] hover:underline cursor-pointer flex-shrink-0"
                                            >
                                                Ubah &gt;
                                            </button>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Catatan */}
                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                Catatan (Opsional)
                            </label>
                            <textarea
                                rows={3}
                                value={notesGlobal}
                                onChange={(e) => setNotesGlobal(e.target.value)}
                                placeholder="Contoh: Mohon diproses sesuai prioritas kapal yang akan sandar."
                                className="w-full px-4 py-2.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                            />
                        </div>

                        {submissionError && Object.keys(submissionErrors).length === 0 && (
                            <p role="alert" className="rounded-xl border border-[#F8BAC5] bg-[#FFF1F3] px-4 py-3 text-pretty text-xs font-semibold text-[#C62840] dark:border-rose-900 dark:bg-rose-950/35 dark:text-rose-300">
                                {submissionError}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="pt-4 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setStage('list')}
                                className="flex-1 py-3 px-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] hover:bg-[#F0F8FF] text-[#52658E] dark:text-[#94A3B8] font-bold text-sm transition-all cursor-pointer"
                            >
                                Kembali
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 py-3 px-4 rounded-xl bg-[#0060F4] hover:bg-[#082870] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
                                <span>→</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* ══════════════════════════════════════════
                    STAGE: success  —  Berhasil Dikirim
                ══════════════════════════════════════════ */}
                {stage === 'success' && (
                    <div className="bg-transparent md:bg-white dark:md:bg-[#0C1D36] border-0 md:border md:border-[#DCEAF8] dark:md:border-[#1E3A5F] rounded-none md:rounded-2xl px-4 py-4 md:p-10 shadow-none md:shadow-md text-center max-w-lg mx-auto space-y-5">
                        {/* Check icon */}
                        <div className="w-20 h-20 rounded-full bg-[#DCF7E8] text-[#087443] flex items-center justify-center mx-auto shadow-sm">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-[#0B1F63] dark:text-white">
                                Pengajuan Berhasil Dikirim!
                            </h2>
                            {submittedNumber && (
                                <>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Nomor Pengajuan</p>
                                    <span className="font-mono text-lg font-black text-[#0060F4] dark:text-[#38BDF8] block">
                                        {submittedNumber}
                                    </span>
                                </>
                            )}
                            <p className="text-xs font-bold text-[#0B1F63] dark:text-white pt-1">
                                {configuredCount} Job • {configuredCount} Pengajuan
                            </p>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] max-w-sm mx-auto pt-1 leading-relaxed">
                                Pengajuan Anda telah dikirim ke Bu Titik. Status dapat dipantau di menu Pengajuan.
                            </p>
                        </div>

                        <div className="pt-4 space-y-2.5">
                            <Link
                                href="/requests"
                                className="block w-full py-3.5 px-4 rounded-xl bg-[#0060F4] hover:bg-[#082870] text-white font-bold text-sm shadow-md transition-all text-center"
                            >
                                Lihat Semua Pengajuan
                            </Link>
                            <Link
                                href="/requests/create"
                                className="block w-full py-3 px-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] text-[#52658E] dark:text-[#94A3B8] font-bold text-sm transition-all text-center hover:bg-[#F0F8FF]"
                            >
                                Buat Pengajuan Baru
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
