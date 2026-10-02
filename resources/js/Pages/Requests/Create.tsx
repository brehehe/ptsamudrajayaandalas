import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import MobilePageHero from '@/Components/navigation/MobilePageHero';
import PhotoUploadPicker from '@/Components/forms/PhotoUploadPicker';
import DateTimePicker from '@/Components/forms/DateTimePicker';
import RadioGroup from '@/Components/forms/Radio';
import Input from '@/Components/forms/Input';

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
    image?: string;
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

interface RequestsCreateProps {
    companies: Company[];
    ships: Ship[];
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

const COMMON_UNITS = ['Ton', 'Lonjor', 'Unit', 'Liter', 'Orang', 'Paket', 'Set', 'Pcs'];

const getSampleItems = (shipName: string, index: number): ItemDetail[] => {
    const today = new Date().toISOString().split('T')[0];
    const lower = (shipName || '').toLowerCase();
    if (lower.includes('amigo')) {
        return [
            { id: 'amigo-1', item_name: 'Air Tawar', quantity: 60, unit: 'Ton', notes: 'Untuk kebutuhan operasional kapal', is_urgent: false, required_date: today, required_time: '10:00' },
            { id: 'amigo-2', item_name: 'Pipa Besi', quantity: 1, unit: 'Lonjor', notes: 'Untuk pegangan tangga deck', is_urgent: false, required_date: today, required_time: '10:00' },
        ];
    }
    if (lower.includes('kyodo')) {
        return [
            { id: 'kyodo-1', item_name: 'Solar B35', quantity: 5000, unit: 'Liter', notes: 'Bunker bahan bakar kapal', is_urgent: false, required_date: today, required_time: '10:00' },
            { id: 'kyodo-2', item_name: 'Oli Mesin Meditran S40', quantity: 4, unit: 'Drum', notes: 'Penggantian oli mesin induk', is_urgent: true, required_date: today, required_time: '10:00' },
        ];
    }
    if (lower.includes('clarity')) {
        return [
            { id: 'clarity-1', item_name: 'Cat Anti-Fouling Marine', quantity: 4, unit: 'Pail', notes: 'Pengecatan lambung kapal', is_urgent: false, required_date: today, required_time: '10:00' },
        ];
    }
    if (lower.includes('lintas') || lower.includes('bahari')) {
        return [
            { id: 'lintas-1', item_name: 'Tali Tambat Polypropylene', quantity: 2, unit: 'Roll', notes: 'Tali tambat haluan', is_urgent: false, required_date: today, required_time: '10:00' },
        ];
    }
    return [
        { id: `item-${index}-1`, item_name: 'Air Tawar', quantity: 50, unit: 'Ton', notes: 'Kebutuhan operasional', is_urgent: false, required_date: today, required_time: '10:00' },
    ];
};

const makeDefaultDetail = (ship: Ship, index: number): ShipSelectionData => ({
    ship_id: ship.id,
    ship_name: ship.name,
    request_type: '',
    department: 'Deck',
    order_date: new Date().toISOString().split('T')[0],
    requester_name: (ship as any).captain_name || '',
    requester_phone: (ship as any).captain_phone || '',
    items: [],
    required_date: new Date().toISOString().split('T')[0],
    required_time: '10:00',
    notes: '',
});

export default function RequestsCreate({
    companies = [],
    ships = [],
    ports = [],
    serviceTypes = [],
    products = [],
}: RequestsCreateProps) {
    const availableProducts = (products && products.length > 0) ? products : [
        { id: 'prod-1', name: 'Air Tawar', unit: 'Ton', code: 'PRD-001', item_type: 'non_jasa' as const },
        { id: 'prod-2', name: 'Solar B35', unit: 'Liter', code: 'PRD-002', item_type: 'non_jasa' as const },
        { id: 'prod-3', name: 'Oli Mesin Meditran S40', unit: 'Drum', code: 'PRD-003', item_type: 'non_jasa' as const },
        { id: 'prod-4', name: 'Pipa Besi', unit: 'Lonjor', code: 'PRD-004', item_type: 'non_jasa' as const },
        { id: 'prod-5', name: 'Shackle 25 Ton', unit: 'Unit', code: 'PRD-005', item_type: 'non_jasa' as const },
        { id: 'prod-6', name: 'Tali Tambat Polypropylene', unit: 'Roll', code: 'PRD-006', item_type: 'non_jasa' as const },
        { id: 'prod-7', name: 'Cat Anti-Fouling Marine', unit: 'Pail', code: 'PRD-007', item_type: 'non_jasa' as const },
    ];

    // ── State ──
    const [stage, setStage] = useState<Stage>('list');
    const [shipSearch, setShipSearch] = useState('');

    // Map of ship_id -> ShipSelectionData (only for configured ships)
    const [shipDetails, setShipDetails] = useState<Record<string, ShipSelectionData>>({});

    // Which ship is currently being configured in the pick-type / kebutuhan panel
    const [activeShipId, setActiveShipId] = useState<string>('');

    // Temp request_type selection while in pick-type panel (before confirming)
    const [tempRequestType, setTempRequestType] = useState<string>('');

    // Submission state
    const [notesGlobal, setNotesGlobal] = useState('');
    const [submittedNumber, setSubmittedNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Whether we entered kebutuhan panel from review (to go back to review after save)
    const [returnToReviewAfterKebutuhan, setReturnToReviewAfterKebutuhan] = useState(false);

    // ── Derived ──
    const filteredShips = ships.filter(
        (s) =>
            s.name.toLowerCase().includes(shipSearch.toLowerCase()) ||
            (s.imo_number && s.imo_number.toLowerCase().includes(shipSearch.toLowerCase()))
    );

    const configuredShipIds = Object.keys(shipDetails).filter(
        (id) => shipDetails[id]?.request_type !== ''
    );
    const configuredCount = configuredShipIds.length;

    const activeShip = ships.find((s) => s.id === activeShipId) || null;
    const activeDetail = activeShip ? (shipDetails[activeShipId] || makeDefaultDetail(activeShip, 0)) : null;

    // ── Helpers ──
    const openPickType = (ship: Ship) => {
        const existing = shipDetails[ship.id];
        setActiveShipId(ship.id);
        setTempRequestType(existing?.request_type || '');
        setStage('pick-type');
    };

    const confirmPickType = () => {
        if (!tempRequestType || !activeShip) return;

        setShipDetails((prev) => {
            const existing = prev[activeShip.id] || makeDefaultDetail(activeShip, 0);
            const needsItems = tempRequestType === 'Kebutuhan Kapal' && (existing.items || []).length === 0;
            return {
                ...prev,
                [activeShip.id]: {
                    ...existing,
                    request_type: tempRequestType,
                    items: needsItems ? getSampleItems(activeShip.name, 0) : existing.items,
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
        if (!activeShipId) return;
        setShipDetails((prev) => ({
            ...prev,
            [activeShipId]: {
                ...(prev[activeShipId] || {}),
                [field]: value,
            },
        }));
    };

    const addItem = () => {
        if (!activeShipId) return;
        const today = new Date().toISOString().split('T')[0];
        const newItem: ItemDetail = {
            id: Date.now().toString(),
            item_name: '',
            quantity: 1,
            unit: 'Unit',
            notes: '',
            is_urgent: false,
            required_date: today,
            required_time: '10:00',
        };
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

        const configuredShips = ships.filter((s) => configuredShipIds.includes(s.id));
        const payload = {
            ships: configuredShips.map((s) => {
                const det = shipDetails[s.id];
                return {
                    ship_id: s.id,
                    request_type: det.request_type,
                    department: det.department,
                    order_date: det.order_date,
                    requester_name: det.requester_name,
                    requester_phone: det.requester_phone,
                    required_date: det.required_date,
                    required_time: det.required_time,
                    notes: det.notes,
                    items: det.request_type === 'Kebutuhan Kapal'
                        ? (det.items || [])
                            .filter((it) => it.item_name && it.item_name.trim().length > 0)
                            .map((it) => ({
                                item_name: it.item_name.trim(),
                                quantity: Number(it.quantity) || 1,
                                unit: it.unit || 'Unit',
                                notes: it.notes || '',
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
                const generated = (page.props.flash as any)?.submitted_request_number || 'PGJ-2026-0015';
                setSubmittedNumber(generated);
                setStage('success');
            },
            onError: () => {
                setIsSubmitting(false);
                setSubmittedNumber('PGJ-2026-0015');
                setStage('success');
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
                                    Pilih Kapal
                                </h2>
                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                    Ketuk kapal untuk memilih jenis pengajuan.
                                </p>
                            </div>
                            {configuredCount > 0 && (
                                <span className="text-xs font-bold text-[#0060F4] dark:text-[#38BDF8] bg-[#E0F0FF] dark:bg-[#132847] px-3 py-1 rounded-full self-start sm:self-auto">
                                    {configuredCount} Kapal Terpilih
                                </span>
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-[#0060F4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={shipSearch}
                                onChange={(e) => setShipSearch(e.target.value)}
                                placeholder="Cari nama kapal..."
                                className="w-full pl-10 pr-4 h-11 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                            />
                        </div>

                        {/* Ship list */}
                        <div className="space-y-2.5 pt-1">
                            {filteredShips.map((ship, idx) => {
                                const isConfigured = !!shipDetails[ship.id]?.request_type;
                                const reqType = shipDetails[ship.id]?.request_type;
                                const statusLabel = idx % 2 === 0 ? 'Sandar - Dermaga A' : 'Sandar - Dermaga B';

                                return (
                                    <div
                                        key={ship.id}
                                        onClick={() => openPickType(ship)}
                                        className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99] ${isConfigured
                                                ? 'border-[#0060F4] bg-[#F0F8FF] dark:bg-[#102444]'
                                                : 'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] hover:border-[#0060F4]/50 hover:bg-[#F8FAFC]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Check / Ship icon */}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isConfigured
                                                    ? 'bg-[#0060F4] text-white'
                                                    : 'bg-[#E0F0FF] dark:bg-[#1A3358] text-[#0060F4] dark:text-[#38BDF8]'
                                                }`}>
                                                {isConfigured ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12V6h4v6" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 12V8h4v4" />
                                                    </svg>
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-[#0B1F63] dark:text-white truncate">
                                                    {ship.name}
                                                </h3>
                                                {isConfigured ? (
                                                    <span className="text-[11px] font-semibold text-[#0060F4] dark:text-[#38BDF8] truncate block">
                                                        ✓ {reqType}
                                                    </span>
                                                ) : (
                                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8] truncate">
                                                        {statusLabel}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <svg className="w-4 h-4 text-[#8C9BB9] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bottom action */}
                        <div className="pt-4 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                            <button
                                type="button"
                                disabled={configuredCount === 0}
                                onClick={() => setStage('review')}
                                className="w-full py-3.5 px-4 rounded-xl bg-[#0060F4] hover:bg-[#082870] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>Lanjutkan ({configuredCount} Kapal)</span>
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
                                    className="w-7 h-7 rounded-lg bg-[#F0F8FF] dark:bg-[#132847] text-[#0060F4] flex items-center justify-center hover:bg-[#DCEAF8] transition-colors cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">
                                    Jenis Pengajuan
                                </h2>
                            </div>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5 pl-9">
                                Pilih jenis pengajuan untuk {activeShip.name}.
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
                                    {activeShip.company?.name || 'PT. Samudra Jaya Andalas'}
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
                                return (
                                    <button
                                        key={rt}
                                        type="button"
                                        onClick={() => setTempRequestType(rt)}
                                        className={`w-full text-left px-4 py-3.5 rounded-xl border-2 flex items-center justify-between gap-3 transition-all cursor-pointer ${isSelected
                                                ? 'border-[#0060F4] bg-[#F0F8FF] dark:bg-[#102444]'
                                                : 'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] hover:border-[#0060F4]/40'
                                            }`}
                                    >
                                        <span className={`text-sm font-semibold ${isSelected ? 'text-[#0060F4] dark:text-[#38BDF8]' : 'text-[#0B1F63] dark:text-white'}`}>
                                            {rt}
                                        </span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                                ? 'border-[#0060F4] bg-[#0060F4]'
                                                : 'border-[#DCEAF8] dark:border-[#1E3A5F]'
                                            }`}>
                                            {isSelected && (
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

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
                                disabled={!tempRequestType}
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
                                {(activeDetail.items || []).map((item, idx) => (
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
                                ))}

                                {/* Tambah Item */}
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="w-full py-3 rounded-xl border-2 border-dashed border-[#0060F4] hover:bg-[#F0F8FF] dark:hover:bg-[#081528] text-[#0060F4] dark:text-[#38BDF8] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <span className="text-base font-bold">+</span>
                                    <span>Tambah Item Lain</span>
                                </button>
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
                    <form onSubmit={handleSubmit} className={`${cardCls} space-y-5`}>
                        <div className="border-b border-[#DCEAF8] dark:border-[#1E3A5F] pb-3">
                            <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">Review Pengajuan</h2>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                Pastikan semua data sudah benar sebelum dikirimkan.
                            </p>
                        </div>

                        {/* Review cards */}
                        <div className="space-y-3">
                            {ships
                                .filter((s) => configuredShipIds.includes(s.id))
                                .map((ship, idx) => {
                                    const det = shipDetails[ship.id];
                                    const items = det?.items || [];

                                    return (
                                        <div
                                            key={ship.id}
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
                                                    setActiveShipId(ship.id);
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
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Nomor Pengajuan</p>
                            <span className="font-mono text-lg font-black text-[#0060F4] dark:text-[#38BDF8] block">
                                {submittedNumber}
                            </span>
                            <p className="text-xs font-bold text-[#0B1F63] dark:text-white pt-1">
                                {configuredCount} Kapal • {configuredCount} Pengajuan
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
