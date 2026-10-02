import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { motion, Variants } from 'framer-motion';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import Input from '../../Components/forms/Input';
import Select from '../../Components/selects/Select';
import Textarea from '../../Components/forms/Textarea';
import Checkbox from '../../Components/forms/Checkbox';
import { playSjaChime } from '../../Components/feedback/AudioNotification';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import FilterBar from '../../Components/filters/FilterBar';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.02,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.28, ease: 'easeOut' },
    },
};

interface Ship {
    id: string;
    name: string;
    imo_number: string;
    ship_type?: string;
    status: string;
    agent_name?: string;
    image?: string;
    company?: {
        id: string;
        name: string;
    };
}

interface RequestItem {
    id: string;
    item_name: string;
    unit?: string;
    quantity: number | string;
    required_date?: string;
    required_time?: string;
    hpp_price?: number | string;
    selling_price?: number | string;
    status: string;
    director_status?: string;
    director_notes?: string;
    is_urgent: boolean;
    is_invoiced?: boolean;
    notes?: string;
    vendor?: {
        id: string;
        name: string;
    };
    product?: {
        id: string;
        name: string;
        item_type: 'jasa' | 'non_jasa';
        category: string;
    };
}

interface ShipRequest {
    id: string;
    request_number: string;
    ship_id: string;
    status: string;
    request_date: string;
    notes?: string;
    created_at: string;
    service_type?: string;
    ship?: Ship;
    company?: {
        id: string;
        name: string;
    };
    port?: {
        id: string;
        name: string;
        code: string;
    };
    items?: RequestItem[];
    invoices?: Array<{
        id: string;
        invoice_number: string;
        invoice_type: string;
        grand_total: number;
        status: string;
    }>;
    creator?: {
        id: number;
        name: string;
        role?: string;
    };
}

interface RequestsIndexProps {
    requests: ShipRequest[];
    ships: Ship[];
    products?: Array<{
        id: string;
        code: string;
        name: string;
        unit: string;
        item_type: 'jasa' | 'non_jasa';
        selling_price_default: number | string;
        hpp_default: number | string;
    }>;
    counts: {
        semua?: number;
        menunggu?: number;
        diproses?: number;
        selesai?: number;
        aktif?: number;
        riwayat?: number;
    };
    activeTab: string;
    search: string;
}

const NEED_TYPES = [
    {
        id: 'Air (Fresh Water)',
        label: 'Air (Fresh Water)',
        icon: '💧',
        desc: 'Suplai air tawar untuk awak dan kapal',
    },
    {
        id: 'Perahu',
        label: 'Perahu',
        icon: '⛵',
        desc: 'Kapal motor / boat penyeberangan antar dermaga',
    },
    {
        id: 'Crew Transport',
        label: 'Crew Transport',
        icon: '👥',
        desc: 'Antar jemput kru kapal dari darat ke laut',
    },
    {
        id: 'Clearance',
        label: 'Clearance',
        icon: '📋',
        desc: 'Dokumen izin sandar, bea cukai, karantina',
    },
    {
        id: 'Bahan Bakar (Fuel Surcharge)',
        label: 'Bahan Bakar (Fuel Surcharge)',
        icon: '⛽',
        desc: 'Bunkering BBM MGO/HFO kapal',
    },
    {
        id: 'Lainnya',
        label: 'Lainnya',
        icon: '•••',
        desc: 'Perbekalan, suku cadang, logistik darurat',
    },
];

const UNITS = ['Ton', 'Unit', 'Orang', 'Paket', 'Liter', 'Set'];

const formatRupiah = (val?: string | number): string => {
    if (val === undefined || val === null || val === '') return 'Rp 0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
};

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

const formatDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return '12 Januari 2026, 10:24';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
};

export default function RequestsIndex({
    requests,
    ships = [],
    products = [],
    counts = { semua: 0, menunggu: 0, diproses: 0, selesai: 0, aktif: 0, riwayat: 0 },
    activeTab = 'semua',
    search = '',
}: RequestsIndexProps) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal Wizard State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [shipSearch, setShipSearch] = useState('');
    const [needSearch, setNeedSearch] = useState('');
    const [confirmedAgree, setConfirmedAgree] = useState(false);

    // Detail & Action States
    const [detailRequest, setDetailRequest] = useState<ShipRequest | null>(null);
    const [successModalData, setSuccessModalData] = useState<{
        reqNumber: string;
        date: string;
    } | null>(null);
    const [actionSheetRequest, setActionSheetRequest] = useState<ShipRequest | null>(null);

    // Add Susulan Item State
    const [showAddItemForm, setShowAddItemForm] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemProductId, setNewItemProductId] = useState('');
    const [newItemQty, setNewItemQty] = useState('1');
    const [newItemUnit, setNewItemUnit] = useState('Unit');
    const [newItemNotes, setNewItemNotes] = useState('');
    const [newItemUrgent, setNewItemUrgent] = useState(false);
    const [submittingItem, setSubmittingItem] = useState(false);

    const handleProductSelect = (pId: string) => {
        setNewItemProductId(pId);
        const prod = products.find((p) => p.id === pId);
        if (prod) {
            setNewItemName(prod.name);
            setNewItemUnit(prod.unit || 'Unit');
        }
    };

    const handleAddNewItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!detailRequest || !newItemName) return;
        setSubmittingItem(true);
        router.post(
            `/requests/${detailRequest.id}/items`,
            {
                item_name: newItemName,
                product_id: newItemProductId || undefined,
                quantity: parseFloat(newItemQty) || 1,
                unit: newItemUnit,
                notes: newItemNotes,
                is_urgent: newItemUrgent,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowAddItemForm(false);
                    setNewItemName('');
                    setNewItemProductId('');
                    setNewItemQty('1');
                    setNewItemNotes('');
                    setNewItemUrgent(false);
                    setSubmittingItem(false);
                    playSjaChime('success');
                },
                onError: () => {
                    setSubmittingItem(false);
                },
            }
        );
    };

    // Wizard Form Data
    const { data, setData, post, processing, reset } = useForm({
        ship_id: '',
        need_type: 'Air (Fresh Water)',
        quantity: 8,
        unit: 'Ton',
        required_at: '2026-01-12 14:00',
        notes: 'Kebutuhan air kapal saat labuh di Pelabuhan Gresik.',
    });

    const selectedShip = ships.find((s) => s.id === data.ship_id);

    const handleSearch = () => {
        router.get('/requests', { tab: activeTab, search: searchTerm }, { preserveState: true });
    };

    const handleTabChange = (tab: string) => {
        router.get('/requests', { tab, search: searchTerm }, { preserveState: true });
    };

    const handleOpenWizard = (preselectedShipId?: string) => {
        if (preselectedShipId) {
            setData('ship_id', preselectedShipId);
            setStep(2);
        } else {
            setData('ship_id', ships[0]?.id || '');
            setStep(1);
        }
        setConfirmedAgree(false);
        setWizardOpen(true);
    };

    const handleNextStep = () => {
        if (step === 1 && !data.ship_id) return;
        if (step === 2 && !data.need_type) return;
        if (step < 4) setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    };

    const handlePrevStep = () => {
        if (step > 1) setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    };

    const handleSubmitWizard = (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmedAgree) return;

        post('/requests', {
            preserveScroll: true,
            onSuccess: () => {
                const nowStr = new Date().toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
                setSuccessModalData({
                    reqNumber: 'REQ-' + Math.floor(10000 + Math.random() * 90000),
                    date: nowStr,
                });
                setWizardOpen(false);
                reset();
                setStep(1);
            },
        });
    };

    const filteredShips = ships.filter(
        (s) =>
            s.name.toLowerCase().includes(shipSearch.toLowerCase()) ||
            s.imo_number?.toLowerCase().includes(shipSearch.toLowerCase())
    );

    const filteredNeedTypes = NEED_TYPES.filter((n) =>
        n.label.toLowerCase().includes(needSearch.toLowerCase())
    );

    return (
        <AppLayout
            title="Pengajuan"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Pengajuan — PT Samudra Jaya Andalas" />

            <MobilePageHero
                title="Pengajuan"
                description="Kelola seluruh pengajuan kapal dan pantau progresnya dalam satu tempat."
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-2.5 rounded-t-[28px] bg-white pb-3 pt-4 dark:bg-[#0C1D36] sm:space-y-3.5 md:mt-0 md:min-h-0 md:rounded-none md:bg-transparent md:pt-0 md:dark:bg-transparent">
                {/* ── Title Header & CTA Button matching Image 2 Screen 1 ── */}
                <div className="hidden flex-col gap-3 px-4 pt-3 md:flex md:flex-row md:items-center md:justify-between md:px-0 md:pt-0">
                    <div>
                        <h1 className="text-2xl font-black text-[#0B1F63] dark:text-white tracking-tight">
                            Pengajuan
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            Kelola seluruh pengajuan Anda di sini
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Link
                            href="/requests/create"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0060F4] hover:bg-[#082870] active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                        >
                            <span className="text-base leading-none font-bold">+</span>
                            <span>Buat Pengajuan Multi Kapal</span>
                        </Link>
                    </div>
                </div>

                <div className="px-4 md:hidden">
                    <Link
                        href="/requests/create"
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#082870] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                    >
                        <span aria-hidden="true" className="text-base font-bold leading-none">
                            +
                        </span>
                        <span>Buat Pengajuan Multi Kapal</span>
                    </Link>
                </div>

                <div className="px-4 md:px-0">
                    <FilterBar
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        onSearchSubmit={handleSearch}
                        searchPlaceholder="Cari nomor pengajuan atau kapal…"
                        searchAriaLabel="Cari pengajuan"
                        chips={[
                            { id: 'semua', label: 'Semua', count: counts.semua ?? requests.length },
                            { id: 'menunggu', label: 'Menunggu', count: counts.menunggu ?? 0 },
                            { id: 'diproses', label: 'Diproses', count: counts.diproses ?? 0 },
                            { id: 'selesai', label: 'Selesai', count: counts.selesai ?? 0 },
                        ]}
                        activeChipId={activeTab === 'aktif' ? 'semua' : activeTab}
                        onChipChange={handleTabChange}
                        onOpenFilterModal={() => setFilterModalOpen(true)}
                        filterCountBadge={selectedStatuses.length + Number(Boolean(startDate || endDate))}
                        filterButtonLabel="Filter"
                        className="!border-0 !bg-transparent !p-0 !shadow-none dark:!bg-transparent"
                    />
                </div>

                {/* ── Request Cards List matching Image 2 Screen 1 ── */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-1.5 px-4 md:px-0"
                >
                    {requests.map((req) => {
                        const statusLower = (req.status || '').toLowerCase();
                        const isWaiting = statusLower.includes('menunggu') || statusLower.includes('pending');
                        const isProcessing = statusLower.includes('proses') || statusLower.includes('setuju') || statusLower.includes('disetujui');
                        const isDone = statusLower.includes('selesai');

                        let badgeBg = 'bg-[#EDF2F7] text-[#526580] border-[#EDF2F7]';
                        let badgeLabel = req.status || 'Draft';

                        if (isWaiting) {
                            badgeBg = 'bg-[#FFF0CC] text-[#A65300] border-[#A65300]/20';
                            badgeLabel = 'Menunggu';
                        } else if (isProcessing) {
                            badgeBg = 'bg-[#EFE7FF] text-[#6840BB] border-[#6840BB]/20';
                            badgeLabel = 'Diproses';
                        } else if (isDone) {
                            badgeBg = 'bg-[#DCF7E8] text-[#087443] border-[#087443]/20';
                            badgeLabel = 'Selesai';
                        }

                        // Determine ships / items summary
                        const shipName = req.ship?.name || 'KM BINTANG INDONESIA';
                        const itemsCount = req.items?.length || 1;
                        const summaryText = req.notes && req.notes.includes('Kapal')
                            ? req.notes.split('—')[0].trim()
                            : `${shipName} • ${itemsCount} Pengajuan Layanan`;

                        return (
                            <motion.div
                                key={req.id}
                                variants={itemVariants}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.995 }}
                                transition={{ duration: 0.16 }}
                            >
                                <Link
                                    href={route('requests.detail', req.id)}
                                    className="block rounded-xl sm:rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]"
                                >
                                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 sm:gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Document icon in soft blue circle */}
                                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#E0F0FF] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center shrink-0 shadow-xs">
                                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>

                                            {/* Text Content */}
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-[13px] sm:text-sm font-extrabold text-[#0B1F63] dark:text-white tracking-tight">
                                                        {req.request_number}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${badgeBg}`}>
                                                        {badgeLabel}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] font-medium truncate">
                                                    {summaryText}
                                                </p>

                                                <p className="text-[10.5px] text-[#8C9BB9] dark:text-[#64748B]">
                                                    Diajukan: {formatDateTime(req.created_at)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Chevron */}
                                        <div className="text-[#52658E] dark:text-[#94A3B8] shrink-0 pl-1">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {requests.length === 0 && (
                    <div className="px-4 sm:px-0">
                        <Card className="p-12 text-center rounded-2xl">
                            <div className="text-4xl mb-3">📋</div>
                            <h4 className="text-base font-bold text-[#0B1F63]">
                                Tidak ada pengajuan ditemukan
                            </h4>
                            <p className="text-xs text-[#52658E] mt-1">
                                {activeTab === 'aktif'
                                    ? 'Belum ada pengajuan kebutuhan kapal yang sedang aktif saat ini.'
                                    : 'Belum ada arsip riwayat pengajuan kebutuhan kapal.'}
                            </p>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenWizard()}
                                className="mt-4"
                            >
                                Buat Pengajuan Baru
                            </Button>
                        </Card>
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/* 3. FILTER MODAL / BOTTOM SHEET                               */}
            {/* ============================================================ */}
            <Modal
                isOpen={filterModalOpen}
                onClose={() => setFilterModalOpen(false)}
                title="Filter Pengajuan"
                subtitle="Saring pengajuan berdasarkan status dan periode tanggal"
                size="md"
                asBottomSheetOnMobile={true}
                footer={
                    <div className="flex items-center gap-3 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            className="flex-1"
                            onClick={() => {
                                setSelectedStatuses([]);
                                setStartDate('');
                                setEndDate('');
                                setFilterModalOpen(false);
                                router.get('/requests');
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            className="flex-1"
                            onClick={() => setFilterModalOpen(false)}
                        >
                            Terapkan
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Status Checkboxes */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#0B1F63] block">
                            Status Pengajuan
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                                'Menunggu Approval',
                                'Disetujui',
                                'Dalam Proses',
                                'Pending',
                                'Selesai',
                            ].map((st) => (
                                <label
                                    key={st}
                                    className={
                                        'flex items-center gap-2.5 text-xs text-[#0B1F63] ' +
                                        'cursor-pointer p-2 rounded-lg hover:bg-[#F0F8FF] ' +
                                        'border border-transparent hover:border-[#DCEAF8]'
                                    }
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedStatuses.includes(st)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedStatuses([...selectedStatuses, st]);
                                            } else {
                                                setSelectedStatuses(
                                                    selectedStatuses.filter((s) => s !== st)
                                                );
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-[#DCEAF8] text-[#0060F4] focus:ring-[#0060F4]"
                                    />
                                    <span>{st}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2 pt-2 border-t border-[#DCEAF8]">
                        <label className="text-xs font-bold text-[#0B1F63] block">
                            Periode Tanggal
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                                label="Dari Tanggal"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                sizeVariant="sm"
                            />
                            <Input
                                label="Sampai Tanggal"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                sizeVariant="sm"
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ============================================================ */}
            {/* 4-7. 4-STEP WIZARD MODAL (BUAT PENGAJUAN)                     */}
            {/* ============================================================ */}
            <Modal
                isOpen={wizardOpen}
                onClose={() => setWizardOpen(false)}
                title={
                    <div className="flex items-center gap-2">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="text-[#52658E] hover:text-[#0060F4] font-bold text-sm mr-1 cursor-pointer"
                            >
                                &larr;
                            </button>
                        )}
                        <span>Buat Pengajuan Kebutuhan Kapal</span>
                    </div>
                }
                subtitle="Langkah mudah pencatatan perbekalan & jasa kapal untuk approval OCC"
                size="lg"
                asBottomSheetOnMobile={true}
                footer={
                    <div className="flex items-center justify-between gap-3 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            onClick={step === 1 ? () => setWizardOpen(false) : handlePrevStep}
                            className="flex-1"
                        >
                            {step === 1 ? 'Batal' : 'Kembali'}
                        </Button>

                        {step < 4 ? (
                            <Button
                                type="button"
                                variant="primary"
                                size="md"
                                onClick={handleNextStep}
                                className="flex-1"
                            >
                                Lanjut
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="primary"
                                size="md"
                                disabled={!confirmedAgree || processing}
                                isLoading={processing}
                                onClick={handleSubmitWizard}
                                className="flex-1"
                            >
                                Ajukan
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Stepper Progress Bar */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#DCEAF8] px-2">
                        {[
                            { s: 1, label: 'Kapal' },
                            { s: 2, label: 'Kebutuhan' },
                            { s: 3, label: 'Detail' },
                            { s: 4, label: 'Review' },
                        ].map((item, idx) => {
                            const isDone = step > item.s;
                            const isCurrent = step === item.s;
                            return (
                                <React.Fragment key={item.s}>
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                                isDone
                                                    ? 'bg-[#087443] text-white'
                                                    : isCurrent
                                                      ? 'bg-[#0060F4] text-white ring-4 ring-[#0060F4]/20'
                                                      : 'bg-[#EDF2F7] text-[#8C9BB9]'
                                            }`}
                                        >
                                            {isDone ? '✓' : item.s}
                                        </div>
                                        <span
                                            className={`text-[10px] mt-1 font-semibold ${
                                                isCurrent ? 'text-[#0060F4]' : 'text-[#8C9BB9]'
                                            }`}
                                        >
                                            {item.label}
                                        </span>
                                    </div>
                                    {idx < 3 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-1.5 transition-all ${
                                                step > item.s ? 'bg-[#087443]' : 'bg-[#DCEAF8]'
                                            }`}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* STEP 1: PILIH KAPAL */}
                    {step === 1 && (
                        <div className="space-y-3 py-1">
                            <div>
                                <h4 className="text-sm font-bold text-[#0B1F63]">Pilih Kapal</h4>
                                <p className="text-xs text-[#52658E]">
                                    Tentukan kapal yang membutuhkan perbekalan atau layanan
                                    keagenan.
                                </p>
                            </div>

                            <Input
                                placeholder="Cari nama kapal atau nomor IMO..."
                                value={shipSearch}
                                onChange={(e) => setShipSearch(e.target.value)}
                                sizeVariant="sm"
                            />

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {filteredShips.map((ship) => {
                                    const isSelected = data.ship_id === ship.id;
                                    return (
                                        <motion.div
                                            key={ship.id}
                                            whileHover={{ y: -1 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => {
                                                setData('ship_id', ship.id);
                                                setStep(2);
                                            }}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-[#0060F4] bg-[#E0F0FF]/30 shadow-xs'
                                                    : 'border-[#DCEAF8] hover:border-[#0060F4]/40 hover:bg-[#F0F8FF]/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={ship.image || '/images/vessel-sarana.jpg'}
                                                    alt={ship.name}
                                                    className={
                                                        'w-12 h-10 rounded-lg object-cover ' +
                                                        'flex-shrink-0 border border-[#DCEAF8]'
                                                    }
                                                />
                                                <div>
                                                    <h5 className="text-xs font-bold text-[#0B1F63]">
                                                        {ship.name}
                                                    </h5>
                                                    <p className="text-[11px] text-[#52658E]">
                                                        IMO {ship.imo_number || '-'}
                                                    </p>
                                                    <div className="mt-0.5">
                                                        <StatusBadge
                                                            status={ship.status}
                                                            label={ship.status}
                                                            showDot
                                                            size="sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[#8C9BB9] text-base font-bold">
                                                &rsaquo;
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PILIH KEBUTUHAN */}
                    {step === 2 && (
                        <div className="space-y-3 py-1">
                            <div>
                                <h4 className="text-sm font-bold text-[#0B1F63]">
                                    Pilih Jenis Kebutuhan
                                </h4>
                                <p className="text-xs text-[#52658E]">
                                    Pilih salah satu kategori kebutuhan yang diminta.
                                </p>
                            </div>

                            <Input
                                placeholder="Cari jenis kebutuhan..."
                                value={needSearch}
                                onChange={(e) => setNeedSearch(e.target.value)}
                                sizeVariant="sm"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                                {filteredNeedTypes.map((item) => {
                                    const isSelected = data.need_type === item.id;
                                    return (
                                        <motion.div
                                            key={item.id}
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setData('need_type', item.id)}
                                            className={`p-3.5 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-[#0060F4] bg-[#E0F0FF]/40 ring-2 ring-[#0060F4]/30'
                                                    : 'border-[#DCEAF8] hover:border-[#0060F4]/30 hover:bg-[#F0F8FF]'
                                            }`}
                                        >
                                            <div
                                                className={
                                                    'w-10 h-10 rounded-full bg-[#E0F0FF] ' +
                                                    'text-[#0060F4] flex items-center ' +
                                                    'justify-center text-xl mb-2'
                                                }
                                            >
                                                {item.icon}
                                            </div>
                                            <h5 className="text-xs font-bold text-[#0B1F63]">
                                                {item.label}
                                            </h5>
                                            <p className="text-[10px] text-[#52658E] mt-1 leading-snug line-clamp-2">
                                                {item.desc}
                                            </p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: INPUT DETAIL */}
                    {step === 3 && (
                        <div className="space-y-3 py-1">
                            <div>
                                <h4 className="text-sm font-bold text-[#0B1F63]">
                                    Detail Kebutuhan
                                </h4>
                                <p className="text-xs text-[#52658E]">
                                    Lengkapi informasi kuantitas, jadwal, dan catatan kebutuhan.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Select
                                    label="Jenis Kebutuhan"
                                    value={data.need_type}
                                    onChange={(e) => setData('need_type', e.target.value)}
                                    sizeVariant="sm"
                                    options={NEED_TYPES.map((nt) => ({
                                        value: nt.id,
                                        label: nt.label,
                                    }))}
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label="Jumlah"
                                        type="number"
                                        min="1"
                                        value={data.quantity}
                                        onChange={(e) =>
                                            setData('quantity', Number(e.target.value))
                                        }
                                        sizeVariant="sm"
                                        required
                                    />
                                    <Select
                                        label="Satuan"
                                        value={data.unit}
                                        onChange={(e) => setData('unit', e.target.value)}
                                        sizeVariant="sm"
                                        options={UNITS.map((u) => ({ value: u, label: u }))}
                                    />
                                </div>

                                <Input
                                    label="Dibutuhkan Pada"
                                    type="datetime-local"
                                    value={data.required_at}
                                    onChange={(e) => setData('required_at', e.target.value)}
                                    sizeVariant="sm"
                                    required
                                />

                                <Textarea
                                    label="Keterangan & Catatan"
                                    rows={3}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Contoh: Kebutuhan air kapal saat labuh di Pelabuhan Gresik..."
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: REVIEW PENGAJUAN */}
                    {step === 4 && (
                        <div className="space-y-3 py-1">
                            <div>
                                <h4 className="text-sm font-bold text-[#0B1F63]">
                                    Ringkasan Pengajuan
                                </h4>
                                <p className="text-xs text-[#52658E]">
                                    Cek kembali data sebelum diajukan.
                                </p>
                            </div>

                            <Card className="p-3.5 border border-[#DCEAF8] space-y-3 bg-[#F0F8FF]/30">
                                <div className="flex items-center gap-3 pb-3 border-b border-[#DCEAF8]">
                                    <img
                                        src={selectedShip?.image || '/images/vessel-sarana.jpg'}
                                        alt={selectedShip?.name || 'Kapal'}
                                        className={
                                            'w-14 h-12 rounded-xl object-cover flex-shrink-0 ' +
                                            'border border-[#DCEAF8]'
                                        }
                                    />
                                    <div>
                                        <h5 className="text-xs font-bold text-[#0B1F63]">
                                            {selectedShip?.name}
                                        </h5>
                                        <p className="text-[11px] text-[#52658E]">
                                            IMO {selectedShip?.imo_number || '-'}
                                        </p>
                                        {selectedShip?.status && (
                                            <div className="mt-0.5">
                                                <StatusBadge
                                                    status={selectedShip.status}
                                                    label={selectedShip.status}
                                                    showDot
                                                    size="sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-[#52658E]">Jenis Kebutuhan:</span>
                                        <span className="font-bold text-[#0B1F63]">
                                            {data.need_type}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#52658E]">Jumlah:</span>
                                        <span className="font-bold text-[#0B1F63]">
                                            {data.quantity} {data.unit}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#52658E]">Dibutuhkan Pada:</span>
                                        <span className="font-bold text-[#0B1F63]">
                                            {data.required_at}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-[#DCEAF8]">
                                        <span className="text-[#52658E] block mb-0.5">
                                            Keterangan:
                                        </span>
                                        <p
                                            className={
                                                'text-xs font-medium text-[#0B1F63] bg-white p-2 ' +
                                                'rounded-lg border border-[#DCEAF8]'
                                            }
                                        >
                                            {data.notes || '-'}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Checkbox
                                label="Saya yakin data kebutuhan kapal yang diisi sudah benar dan sesuai permintaan kapten."
                                checked={confirmedAgree}
                                onChange={(e) => setConfirmedAgree(e.target.checked)}
                            />
                        </div>
                    )}
                </div>
            </Modal>

            {/* ============================================================ */}
            {/* 8. MODAL SUKSES (PENGAJUAN BERHASIL DIAJUKAN)                */}
            {/* ============================================================ */}
            <Modal
                isOpen={!!successModalData}
                onClose={() => setSuccessModalData(null)}
                size="sm"
                showCloseButton={true}
                asBottomSheetOnMobile={true}
            >
                {successModalData && (
                    <div className="text-center space-y-4 py-2">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className={
                                'w-16 h-16 rounded-full bg-[#DCF7E8] text-[#087443] flex ' +
                                'items-center justify-center text-3xl mx-auto shadow-sm'
                            }
                        >
                            ✈️
                        </motion.div>

                        <div>
                            <h3 className="text-base font-extrabold text-[#0B1F63]">
                                Pengajuan Berhasil Diajukan!
                            </h3>
                            <p className="text-xs text-[#52658E] mt-1.5 leading-relaxed">
                                Pengajuan kebutuhan kapal berhasil disimpan dan siap diproses.
                            </p>
                        </div>

                        {/* Ticket Card */}
                        <div
                            className={
                                'bg-[#F0F8FF] border border-[#DCEAF8] rounded-xl p-3.5 text-left ' +
                                'flex items-center gap-3'
                            }
                        >
                            <div
                                className={
                                    'w-10 h-10 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                    'items-center justify-center text-lg'
                                }
                            >
                                📋
                            </div>
                            <div>
                                <span className="text-[10px] text-[#52658E] uppercase font-bold tracking-wider block">
                                    Nomor Pengajuan
                                </span>
                                <span className="font-mono text-xs font-extrabold text-[#0B1F63]">
                                    {successModalData.reqNumber}
                                </span>
                                <span className="text-[10px] text-[#8C9BB9] block">
                                    {successModalData.date}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Button
                                variant="primary"
                                size="md"
                                className="w-full"
                                onClick={() => setSuccessModalData(null)}
                            >
                                Lihat Detail Pengajuan
                            </Button>
                            <Button
                                variant="outline"
                                size="md"
                                className="w-full"
                                onClick={() => {
                                    setSuccessModalData(null);
                                    router.get('/dashboard');
                                }}
                            >
                                Kembali ke Beranda
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ============================================================ */}
            {/* 9. DETAIL PENGAJUAN MODAL / SLIDE-OVER                       */}
            {/* ============================================================ */}
            <Modal
                isOpen={!!detailRequest}
                onClose={() => setDetailRequest(null)}
                title={
                    detailRequest ? (
                        <div className="flex items-center gap-2">
                            <span>Detail Pengajuan</span>
                            <span
                                className={
                                    'font-mono text-xs font-bold text-[#0060F4] bg-[#E0F0FF] px-2 ' +
                                    'py-0.5 rounded-lg'
                                }
                            >
                                {detailRequest.request_number}
                            </span>
                        </div>
                    ) : (
                        'Detail Pengajuan'
                    )
                }
                subtitle="Rincian kebutuhan kapal, logistik, dan riwayat status keagenan"
                size="lg"
                asBottomSheetOnMobile={true}
                footer={
                    <Button variant="primary" size="sm" onClick={() => setDetailRequest(null)}>
                        Tutup
                    </Button>
                }
            >
                {detailRequest && (
                    <div className="space-y-4">
                        {/* Status Badge Row */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#DCEAF8]">
                            <span className="text-xs text-[#52658E]">Status Saat Ini</span>
                            <StatusBadge
                                status={detailRequest.status}
                                label={detailRequest.status}
                                showDot
                                size="sm"
                            />
                        </div>

                        {/* Informasi Kapal */}
                        <div className="p-3.5 rounded-xl border border-[#DCEAF8] bg-[#F0F8FF]/40 space-y-2">
                            <span className="text-[11px] font-bold text-[#52658E] uppercase tracking-wider block">
                                Informasi Kapal
                            </span>
                            <div className="flex items-center gap-3">
                                <img
                                    src={detailRequest.ship?.image || '/images/vessel-sarana.jpg'}
                                    alt={detailRequest.ship?.name || 'Kapal'}
                                    className="w-12 h-10 rounded-lg object-cover flex-shrink-0 border border-[#DCEAF8]"
                                />
                                <div>
                                    <h4 className="text-xs font-bold text-[#0B1F63]">
                                        {detailRequest.ship?.name}
                                    </h4>
                                    <p className="text-[11px] text-[#52658E]">
                                        IMO {detailRequest.ship?.imo_number || '-'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Detail Kebutuhan & Items List */}
                        <div className="p-3.5 rounded-xl border border-[#DCEAF8] space-y-3">
                            <span className="text-[11px] font-bold text-[#52658E] uppercase tracking-wider block">
                                Rincian Logistik & Kebutuhan ({detailRequest.items?.length || 0}{' '}
                                Item)
                            </span>

                            {detailRequest.items && detailRequest.items.length > 0 ? (
                                <div className="border border-[#DCEAF8] rounded-[10px] overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-[#0D2945] text-[#E7F0FA]">
                                                <th className="py-2 px-2.5">ITEM</th>
                                                <th className="py-2 px-2 text-right">QTY</th>
                                                <th className="py-2 px-2 text-right">
                                                    HARGA SATUAN
                                                </th>
                                                <th className="py-2 px-2">VENDOR</th>
                                                <th className="py-2 px-2 text-center">
                                                    STATUS DIREKTUR
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#DCEAF8]/60">
                                            {detailRequest.items.map((it) => (
                                                <tr key={it.id} className="hover:bg-[#F0F8FF]/50">
                                                    <td className="py-2 px-2.5">
                                                        <span className="font-bold text-[#0B1F63]">
                                                            {it.item_name}
                                                        </span>
                                                        {it.is_urgent && (
                                                            <span className="ml-1 text-[10px] text-red-600 font-bold">
                                                                🚨 Urgent
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td
                                                        className={
                                                            'py-2 px-2 text-right font-mono ' +
                                                            'font-bold text-[#0B1F63]'
                                                        }
                                                    >
                                                        {it.quantity} {it.unit}
                                                    </td>
                                                    <td
                                                        className={
                                                            'py-2 px-2 text-right font-mono ' +
                                                            'text-[#0060F4] font-semibold'
                                                        }
                                                    >
                                                        {formatRupiah(it.selling_price || 0)}
                                                    </td>
                                                    <td className="py-2 px-2 text-[11px] text-[#52658E]">
                                                        {it.vendor?.name || '-'}
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        {it.director_status === 'approved' ? (
                                                            <span
                                                                className={
                                                                    'px-2 py-0.5 rounded-full ' +
                                                                    'text-[10px] font-bold ' +
                                                                    'bg-[#DCF7E8] text-[#087443]'
                                                                }
                                                            >
                                                                Disetujui
                                                            </span>
                                                        ) : it.director_status === 'rejected' ? (
                                                            <span
                                                                className={
                                                                    'px-2 py-0.5 rounded-full ' +
                                                                    'text-[10px] font-bold ' +
                                                                    'bg-[#FFE7EC] text-[#C62840]'
                                                                }
                                                            >
                                                                Ditolak
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className={
                                                                    'px-2 py-0.5 rounded-full ' +
                                                                    'text-[10px] font-semibold ' +
                                                                    'bg-[#FFF0CC] text-[#A65300]'
                                                                }
                                                            >
                                                                Menunggu
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-xs space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-[#52658E]">Tanggal Pengajuan:</span>
                                        <span className="font-medium text-[#0B1F63]">
                                            {formatDate(
                                                detailRequest.request_date ||
                                                    detailRequest.created_at
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#52658E]">Diajukan Oleh:</span>
                                        <span className="font-medium text-[#0B1F63]">
                                            {detailRequest.creator?.name ||
                                                'Pak Prima (Staff Lapangan)'}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-[#DCEAF8]">
                                        <span className="text-[#52658E] block mb-1">
                                            Catatan Kebutuhan:
                                        </span>
                                        <p className="font-medium text-[#0B1F63] bg-[#F0F8FF]/50 p-2 rounded-lg">
                                            {detailRequest.notes || '-'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tambah Kebutuhan Susulan Section */}
                        {detailRequest.status !== 'Selesai' &&
                            detailRequest.status !== 'Dibatalkan' && (
                                <div
                                    className={
                                        'p-3.5 rounded-xl border border-dashed border-[#0060F4]/40 ' +
                                        'bg-[#F0F8FF]/60 space-y-3'
                                    }
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm">➕</span>
                                            <span className="text-xs font-bold text-[#0B1F63]">
                                                Tambah Permintaan / Kebutuhan Susulan
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddItemForm(!showAddItemForm)}
                                            className="text-xs font-bold text-[#0060F4] hover:underline"
                                        >
                                            {showAddItemForm ? 'Tutup Form' : '+ Tambah Item'}
                                        </button>
                                    </div>

                                    {showAddItemForm && (
                                        <form
                                            onSubmit={handleAddNewItem}
                                            className="space-y-3 pt-2 border-t border-[#DCEAF8]"
                                        >
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* Pilih dari Master Produk atau Ketik */}
                                                <div>
                                                    <label className="block text-[11px] font-bold text-[#52658E] mb-1">
                                                        Pilih dari Master Produk
                                                    </label>
                                                    <select
                                                        value={newItemProductId}
                                                        onChange={(e) =>
                                                            handleProductSelect(e.target.value)
                                                        }
                                                        className={
                                                            'w-full text-xs py-1.5 px-2.5 ' +
                                                            'bg-white border border-[#DCEAF8] ' +
                                                            'rounded-lg focus:outline-none ' +
                                                            'focus:ring-1 focus:ring-[#0060F4]'
                                                        }
                                                    >
                                                        <option value="">
                                                            -- Ketik manual atau pilih produk --
                                                        </option>
                                                        {products.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} (
                                                                {p.item_type === 'jasa'
                                                                    ? 'Jasa'
                                                                    : 'Non-Jasa'}{' '}
                                                                -{' '}
                                                                {formatRupiah(
                                                                    p.selling_price_default
                                                                )}
                                                                )
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Nama Item Kebutuhan */}
                                                <div>
                                                    <label className="block text-[11px] font-bold text-[#52658E] mb-1">
                                                        Nama Item Kebutuhan *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newItemName}
                                                        onChange={(e) =>
                                                            setNewItemName(e.target.value)
                                                        }
                                                        placeholder="Contoh: Air Tawar, Mooring Boat, Perbekalan..."
                                                        className={
                                                            'w-full text-xs py-1.5 px-2.5 ' +
                                                            'bg-white border border-[#DCEAF8] ' +
                                                            'rounded-lg focus:outline-none ' +
                                                            'focus:ring-1 focus:ring-[#0060F4]'
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-[#52658E] mb-1">
                                                        Jumlah *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0.01"
                                                        required
                                                        value={newItemQty}
                                                        onChange={(e) =>
                                                            setNewItemQty(e.target.value)
                                                        }
                                                        className={
                                                            'w-full text-xs py-1.5 px-2.5 ' +
                                                            'bg-white border border-[#DCEAF8] ' +
                                                            'rounded-lg focus:outline-none ' +
                                                            'focus:ring-1 focus:ring-[#0060F4]'
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-[#52658E] mb-1">
                                                        Satuan
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newItemUnit}
                                                        onChange={(e) =>
                                                            setNewItemUnit(e.target.value)
                                                        }
                                                        className={
                                                            'w-full text-xs py-1.5 px-2.5 ' +
                                                            'bg-white border border-[#DCEAF8] ' +
                                                            'rounded-lg focus:outline-none ' +
                                                            'focus:ring-1 focus:ring-[#0060F4]'
                                                        }
                                                    />
                                                </div>
                                                <div className="sm:col-span-2 flex items-center pt-5">
                                                    <label
                                                        className={
                                                            'flex items-center gap-2 text-xs ' +
                                                            'font-semibold text-[#0B1F63] ' +
                                                            'cursor-pointer'
                                                        }
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={newItemUrgent}
                                                            onChange={(e) =>
                                                                setNewItemUrgent(e.target.checked)
                                                            }
                                                            className="rounded text-[#C62840] focus:ring-[#C62840]"
                                                        />
                                                        <span
                                                            className={
                                                                newItemUrgent
                                                                    ? 'text-[#C62840] font-bold'
                                                                    : ''
                                                            }
                                                        >
                                                            🚨 Tandai Kebutuhan Urgent
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-[#52658E] mb-1">
                                                    Catatan / Spesifikasi
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newItemNotes}
                                                    onChange={(e) =>
                                                        setNewItemNotes(e.target.value)
                                                    }
                                                    placeholder="Contoh: Pengantaran jam 16:00 dermaga utara"
                                                    className={
                                                        'w-full text-xs py-1.5 px-2.5 bg-white ' +
                                                        'border border-[#DCEAF8] rounded-lg ' +
                                                        'focus:outline-none focus:ring-1 ' +
                                                        'focus:ring-[#0060F4]'
                                                    }
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddItemForm(false)}
                                                    className={
                                                        'px-3 py-1.5 rounded-lg text-xs ' +
                                                        'font-semibold text-[#52658E] ' +
                                                        'hover:bg-gray-100'
                                                    }
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={submittingItem}
                                                    className={
                                                        'px-4 py-1.5 bg-[#0060F4] ' +
                                                        'hover:bg-[#082870] text-white ' +
                                                        'rounded-lg text-xs font-bold ' +
                                                        'transition-colors disabled:opacity-50'
                                                    }
                                                >
                                                    {submittingItem
                                                        ? 'Menyimpan...'
                                                        : 'Simpan Kebutuhan Susulan'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                        {/* Invoices Generated (if any) */}
                        {detailRequest.invoices && detailRequest.invoices.length > 0 && (
                            <div className="p-3.5 rounded-xl border border-[#0060F4]/30 bg-[#E0F0FF]/40 space-y-2">
                                <span className="text-[11px] font-bold text-[#0060F4] uppercase tracking-wider block">
                                    Invoice Diterbitkan ({detailRequest.invoices.length} Faktur)
                                </span>
                                <div className="space-y-1.5">
                                    {detailRequest.invoices.map((inv) => (
                                        <div
                                            key={inv.id}
                                            className={
                                                'flex items-center justify-between text-xs p-2 ' +
                                                'bg-white rounded-lg border border-[#DCEAF8]'
                                            }
                                        >
                                            <div>
                                                <span className="font-mono font-bold text-[#0060F4]">
                                                    {inv.invoice_number}
                                                </span>
                                                <span
                                                    className={
                                                        'ml-2 px-2 py-0.5 rounded text-[10px] ' +
                                                        'font-semibold bg-[#F0F8FF] text-[#52658E]'
                                                    }
                                                >
                                                    {inv.invoice_type === 'agency'
                                                        ? 'Keagenan / Jasa'
                                                        : 'Reimburse'}
                                                </span>
                                            </div>
                                            <span className="font-mono font-bold text-[#0B1F63]">
                                                {formatRupiah(inv.grand_total)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Admin action buttons */}
                        <div className="p-3.5 rounded-xl border border-[#DCEAF8] bg-[#F0F8FF]/60 space-y-2">
                            <span className="text-[11px] font-bold text-[#0B1F63] uppercase tracking-wider block">
                                Aksi Operasional & Keuangan
                            </span>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {detailRequest.items &&
                                    detailRequest.items.length > 0 &&
                                    detailRequest.status !== 'Disetujui' &&
                                    detailRequest.status !== 'Selesai' && (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            className="bg-[#0060F4] hover:bg-[#082870] text-white text-xs font-bold"
                                            onClick={() => {
                                                const itemIds =
                                                    detailRequest.items?.map((it) => it.id) || [];
                                                router.post(
                                                    `/requests/${detailRequest.id}/forward-director`,
                                                    {
                                                        selected_items: itemIds,
                                                        admin_notes:
                                                            'Harga Master Produk telah disesuaikan dan pengajuan dilanjutkan.',
                                                    },
                                                    {
                                                        onSuccess: () => setDetailRequest(null),
                                                    }
                                                );
                                            }}
                                        >
                                            Ajukan
                                        </Button>
                                    )}

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className={
                                        'bg-white text-[#0B1F63] border-[#DCEAF8] ' +
                                        'hover:bg-[#F0F8FF] text-xs font-bold'
                                    }
                                    onClick={() => {
                                        router.post(
                                            `/requests/${detailRequest.id}/create-clearance-in-invoice`,
                                            {},
                                            {
                                                onSuccess: () => setDetailRequest(null),
                                            }
                                        );
                                    }}
                                >
                                    ⚡ Shortcut Invoice Clearance In (Awal)
                                </Button>

                                {detailRequest.items?.some(
                                    (it) => it.director_status === 'approved' && !it.is_invoiced
                                ) && (
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        className="bg-[#087443] hover:bg-[#065A34] text-white text-xs font-bold"
                                        onClick={() => {
                                            router.post(
                                                `/requests/${detailRequest.id}/split-invoices`,
                                                {},
                                                {
                                                    onSuccess: () => setDetailRequest(null),
                                                }
                                            );
                                        }}
                                    >
                                        📄 Pecah Invoice (Jasa & Reimburse)
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Riwayat Status Timeline */}
                        <div className="p-3.5 rounded-xl border border-[#DCEAF8] space-y-3">
                            <span className="text-[11px] font-bold text-[#52658E] uppercase tracking-wider block">
                                Riwayat Status
                            </span>
                            <div className="relative pl-6 space-y-4 border-l-2 border-[#DCEAF8] ml-2">
                                <div className="relative">
                                    <span
                                        className={
                                            'absolute -left-[31px] top-0.5 w-3 h-3 rounded-full ' +
                                            'bg-[#0060F4] ring-4 ring-white'
                                        }
                                    />
                                    <p className="text-xs font-bold text-[#0B1F63]">
                                        Pengajuan dibuat
                                    </p>
                                    <p className="text-[10px] text-[#8C9BB9]">
                                        {formatDateTime(
                                            detailRequest.created_at || detailRequest.request_date
                                        )}{' '}
                                        • Oleh {detailRequest.creator?.name || 'Pak Prima'}
                                    </p>
                                </div>

                                <div className="relative">
                                    <span
                                        className={
                                            'absolute -left-[31px] top-0.5 w-3 h-3 rounded-full ' +
                                            'bg-[#A65300] ring-4 ring-white'
                                        }
                                    />
                                    <p className="text-xs font-bold text-[#0B1F63]">
                                        Status Saat Ini: {detailRequest.status}
                                    </p>
                                    <p className="text-[10px] text-[#8C9BB9]">
                                        Terhubung ke sistem keagenan PT Samudra Jaya Andalas
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ============================================================ */}
            {/* 10. AKSI TAMBAHAN (BOTTOM SHEET / MENU)                      */}
            {/* ============================================================ */}
            <Modal
                isOpen={!!actionSheetRequest}
                onClose={() => setActionSheetRequest(null)}
                title="Pilih Aksi Pengajuan"
                size="sm"
                asBottomSheetOnMobile={true}
            >
                {actionSheetRequest && (
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => {
                                alert(`Edit pengajuan ${actionSheetRequest.request_number}`);
                                setActionSheetRequest(null);
                            }}
                            className={
                                'w-full p-2.5 rounded-xl hover:bg-[#F0F8FF] text-left text-xs ' +
                                'font-medium text-[#0B1F63] flex items-center gap-2.5 ' +
                                'cursor-pointer'
                            }
                        >
                            <span>✏️</span>
                            <span>Edit Pengajuan</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                alert(`Membatalkan pengajuan ${actionSheetRequest.request_number}`);
                                setActionSheetRequest(null);
                            }}
                            className={
                                'w-full p-2.5 rounded-xl hover:bg-[#FFE7EC] text-left text-xs ' +
                                'font-medium text-[#C62840] flex items-center gap-2.5 ' +
                                'cursor-pointer'
                            }
                        >
                            <span>❌</span>
                            <span>Batalkan Pengajuan</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                handleOpenWizard(actionSheetRequest.ship_id);
                                setActionSheetRequest(null);
                            }}
                            className={
                                'w-full p-2.5 rounded-xl hover:bg-[#F0F8FF] text-left text-xs ' +
                                'font-medium text-[#0060F4] flex items-center gap-2.5 ' +
                                'cursor-pointer'
                            }
                        >
                            <span>📑</span>
                            <span>Duplikasi Pengajuan</span>
                        </button>

                        <div className="pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setActionSheetRequest(null)}
                            >
                                Tutup
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </AppLayout>
    );
}
