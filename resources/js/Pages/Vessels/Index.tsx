import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import Modal from '../../Components/overlays/Modal';
import Input from '../../Components/forms/Input';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import Select from '../../Components/selects/Select';
import ShipImage from '../../Components/vessels/ShipImage';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';

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
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.22, ease: 'easeOut' },
    },
};

export interface ShipCompany {
    id: string;
    code?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    is_active: boolean;
    ships_count?: number;
    ships?: Array<{
        id: string;
        name: string;
        imo_number: string;
        status: string;
        ship_type: string;
        ship_company_id?: string;
    }>;
}

export interface Vessel {
    id: string;
    visit_id: string;
    job_number: string;
    name: string;
    imo_number: string;
    ship_type: string;
    status: string;
    agent_name: string;
    is_active: boolean;
    image?: string | null;
    eta?: string;
    port_name?: string;
    needs_count?: number;
    requests_count?: number;
    created_at?: string;
    ship_company_id?: string;
    company?: ShipCompany;
}

export interface Port {
    id: string;
    name: string;
    code?: string;
}

export interface MasterShip {
    id: string;
    name: string;
    imo_number?: string;
    ship_type?: string;
    gross_tonnage?: number | string;
    length?: number | string;
    call_sign?: string;
    captain_name?: string;
    captain_phone?: string;
    ship_company_id?: string;
    port_id?: string;
    image?: string | null;
    company?: ShipCompany;
}

interface VesselsIndexProps {
    vessels: Vessel[];
    companies?: ShipCompany[];
    counts: {
        semua: number;
        akan_datang: number;
        labuh: number;
        sandar: number;
        selesai: number;
    };
    ports?: Port[];
    allMasterShips?: MasterShip[];
    canCreateShip?: boolean;
    activeStatus: string;
    selectedCompanyId?: string;
    search: string;
}

export const formatEtaDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(d);
    } catch {
        return dateStr;
    }
};

export default function VesselsIndex({
    vessels,
    companies = [],
    counts = { semua: 0, akan_datang: 0, labuh: 0, sandar: 0, selesai: 0 },
    ports = [],
    allMasterShips = [],
    canCreateShip = false,
    activeStatus = 'Semua',
    selectedCompanyId = '',
    search = '',
}: VesselsIndexProps) {
    // Active Master Module: 'kapal' | 'perusahaan' (Desktop)
    const [activeModule, setActiveModule] = useState<'kapal' | 'perusahaan'>('kapal');

    const [searchTerm, setSearchTerm] = useState(search);
    const [companyFilter, setCompanyFilter] = useState(selectedCompanyId);
    const [sortBy, setSortBy] = useState<'terdekat' | 'terbaru' | 'nama'>('terdekat');
    const [showMobileFilterSheet, setShowMobileFilterSheet] = useState(false);

    // Modal state for Kapal & Kunjungan Baru
    const [showAddModal, setShowAddModal] = useState(false);
    const [shipModalTab, setShipModalTab] = useState<'existing' | 'new'>('existing');
    const [selectedMasterShipId, setSelectedMasterShipId] = useState('');

    // Shared Kunjungan / Arrival fields
    const [arrivalPortId, setArrivalPortId] = useState('');
    const [arrivalEta, setArrivalEta] = useState(
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    );
    const [arrivalCaptainName, setArrivalCaptainName] = useState('');
    const [arrivalCaptainPhone, setArrivalCaptainPhone] = useState('');
    const [arrivalNotes, setArrivalNotes] = useState('');

    // New Ship fields (Mode B)
    const [newShipName, setNewShipName] = useState('');
    const [newShipIMO, setNewShipIMO] = useState('');
    const [newShipType, setNewShipType] = useState('Container Ship');
    const [newShipGrossTonnage, setNewShipGrossTonnage] = useState('');
    const [newShipLength, setNewShipLength] = useState('');
    const [newShipCallSign, setNewShipCallSign] = useState('');
    const [newShipImage, setNewShipImage] = useState<File | null>(null);
    const [newShipCompanyId, setNewShipCompanyId] = useState('');
    const [isNewCompany, setIsNewCompany] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyCode, setNewCompanyCode] = useState('');
    const [arrivalErrors, setArrivalErrors] = useState<Record<string, string>>({});

    // Modal state for Master Perusahaan
    const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
    const [companyFormName, setCompanyFormName] = useState('');
    const [companyFormCode, setCompanyFormCode] = useState('');
    const [companyFormPhone, setCompanyFormPhone] = useState('');
    const [companyFormEmail, setCompanyFormEmail] = useState('');
    const [companyFormAddress, setCompanyFormAddress] = useState('');
    const [companySearchTerm, setCompanySearchTerm] = useState('');
    const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/vessels',
            { search: searchTerm, status: activeStatus, company_id: companyFilter },
            { preserveState: true }
        );
    };

    const handleFilterStatus = (status: string) => {
        router.get(
            '/vessels',
            { status, search: searchTerm, company_id: companyFilter },
            { preserveState: true }
        );
    };

    const handleCompanyFilterChange = (compId: string) => {
        setCompanyFilter(compId);
        router.get(
            '/vessels',
            { status: activeStatus, search: searchTerm, company_id: compId },
            { preserveState: true }
        );
    };

    // Sort vessels locally based on selection
    const sortedVessels = [...vessels].sort((a, b) => {
        if (sortBy === 'nama') {
            return a.name.localeCompare(b.name);
        }
        if (sortBy === 'terdekat') {
            const dateA = a.eta ? new Date(a.eta).getTime() : 0;
            const dateB = b.eta ? new Date(b.eta).getTime() : 0;
            return dateA - dateB;
        }
        return 0; // default
    });

    // Filter companies locally based on company search
    const filteredCompanies = companies.filter((c) => {
        if (!companySearchTerm.trim()) return true;
        const q = companySearchTerm.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            (c.code && c.code.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q))
        );
    });

    const selectedMasterShip = allMasterShips.find((s) => s.id === selectedMasterShipId);

    const handleSelectMasterShip = (shipId: string) => {
        setSelectedMasterShipId(shipId);
        const found = allMasterShips.find((s) => s.id === shipId);
        if (found) {
            if (found.captain_name) setArrivalCaptainName(found.captain_name);
            if (found.captain_phone) setArrivalCaptainPhone(found.captain_phone);
            if (found.port_id) setArrivalPortId(found.port_id);
            else if (ports.length > 0 && !arrivalPortId) setArrivalPortId(ports[0].id);
        }
    };

    // Save Ship / Schedule Arrival
    const handleSaveShipArrival = (e: React.FormEvent) => {
        e.preventDefault();
        setArrivalErrors({});

        if (shipModalTab === 'existing') {
            router.post(
                '/ship-arrivals',
                {
                    ship_selection_type: 'existing',
                    ship_id: selectedMasterShipId,
                    port_id: arrivalPortId || (ports.length > 0 ? ports[0].id : null),
                    eta: arrivalEta ? new Date(arrivalEta).toISOString() : '',
                    captain_name: arrivalCaptainName || null,
                    captain_phone: arrivalCaptainPhone || null,
                    arrival_notes: arrivalNotes || null,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setShowAddModal(false);
                        setSelectedMasterShipId('');
                        setArrivalNotes('');
                    },
                    onError: (errors) => setArrivalErrors(errors as Record<string, string>),
                }
            );
        } else {
            router.post(
                '/ship-arrivals',
                {
                    ship_selection_type: 'new',
                    name: newShipName.trim(),
                    imo_number: newShipIMO.trim(),
                    ship_type: newShipType,
                    company_selection_type: isNewCompany ? 'new' : 'existing',
                    ship_company_id: isNewCompany ? null : newShipCompanyId || null,
                    new_company_name: isNewCompany ? newCompanyName.trim() : null,
                    new_company_code: isNewCompany ? newCompanyCode.trim() : null,
                    gross_tonnage: newShipGrossTonnage ? parseFloat(newShipGrossTonnage) : null,
                    length: newShipLength ? parseFloat(newShipLength) : null,
                    call_sign: newShipCallSign.trim() || null,
                    image: newShipImage,
                    port_id: arrivalPortId || (ports.length > 0 ? ports[0].id : null),
                    eta: arrivalEta ? new Date(arrivalEta).toISOString() : '',
                    captain_name: arrivalCaptainName.trim() || null,
                    captain_phone: arrivalCaptainPhone.trim() || null,
                    arrival_notes: arrivalNotes.trim() || null,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setShowAddModal(false);
                        setNewShipName('');
                        setNewShipIMO('');
                        setNewShipGrossTonnage('');
                        setNewShipLength('');
                        setNewShipCallSign('');
                        setNewShipImage(null);
                        setIsNewCompany(false);
                        setNewCompanyName('');
                        setNewCompanyCode('');
                        setArrivalNotes('');
                    },
                    onError: (errors) => setArrivalErrors(errors as Record<string, string>),
                }
            );
        }
    };

    // Save Company
    const handleSaveCompany = (e: React.FormEvent) => {
        e.preventDefault();
        setCompanyErrors({});

        router.post(
            '/companies',
            {
                name: companyFormName,
                code: companyFormCode,
                phone: companyFormPhone,
                email: companyFormEmail,
                address: companyFormAddress,
            },
            {
                onSuccess: () => {
                    setShowAddCompanyModal(false);
                    setCompanyFormName('');
                    setCompanyFormCode('');
                    setCompanyFormPhone('');
                    setCompanyFormEmail('');
                    setCompanyFormAddress('');
                },
                onError: (errors) => setCompanyErrors(errors as Record<string, string>),
            }
        );
    };

    // Status pill renderer
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'Labuh':
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full ' +
                            'text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706] flex-shrink-0'
                        }
                    >
                        Labuh
                    </span>
                );
            case 'Akan Datang':
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full ' +
                            'text-[11px] font-semibold bg-[#E0F0FF] text-[#0060F4] flex-shrink-0'
                        }
                    >
                        Akan Datang
                    </span>
                );
            case 'Sandar':
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full ' +
                            'text-[11px] font-semibold bg-[#DCF7E8] text-[#087443] flex-shrink-0'
                        }
                    >
                        Sandar
                    </span>
                );
            case 'Selesai':
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full ' +
                            'text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B] flex-shrink-0'
                        }
                    >
                        Selesai
                    </span>
                );
            default:
                return (
                    <span
                        className={
                            'whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full ' +
                            'text-[11px] font-semibold bg-[#E0F0FF] text-[#0060F4] flex-shrink-0'
                        }
                    >
                        {status}
                    </span>
                );
        }
    };

    // Mobile tabs definitions matching 2. Menu Kapal.png
    const mobileStatusTabs = [
        { label: 'Semua', count: counts.semua, value: 'Semua' },
        { label: 'Akan Datang', count: counts.akan_datang, value: 'Akan Datang' },
        { label: 'Labuh', count: counts.labuh, value: 'Labuh' },
        { label: 'Sandar', count: counts.sandar, value: 'Sandar' },
        { label: 'Selesai', count: counts.selesai, value: 'Selesai' },
    ];

    // Group only from persisted ETA values; records without ETA remain in the other group.
    const todayVessels: Vessel[] = [];
    const tomorrowVessels: Vessel[] = [];
    const otherVessels: Vessel[] = [];
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const formatGroupDate = (value: Date) =>
        new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(value);

    sortedVessels.forEach((v) => {
        if (!v.eta) {
            otherVessels.push(v);
            return;
        }
        const d = new Date(v.eta);
        if (Number.isNaN(d.getTime())) {
            otherVessels.push(v);
        } else if (d.toDateString() === now.toDateString()) {
            todayVessels.push(v);
        } else if (d.toDateString() === tomorrow.toDateString()) {
            tomorrowVessels.push(v);
        } else {
            otherVessels.push(v);
        }
    });

    return (
        <AppLayout title="Kapal" transparentMobileHeader mobileBackground="surface">
            <Head title="Kapal — PT Samudra Jaya Andalas" />

            {/* ═══════════════════════════════════════════════════════════════
                MOBILE VIEW (< md): EXACT MATCH TO "2. Menu Kapal.png"
               ═══════════════════════════════════════════════════════════════ */}
            <div className="md:hidden -mt-0">
                {/* 1. HERO BANNER HEADER */}
                <div
                    className={
                        'mobile-photo-copy relative w-full overflow-hidden min-h-[200px] flex flex-col ' +
                        'bg-[#8FCDF4] ' +
                        'justify-end pt-20 pb-8 px-4 text-white'
                    }
                >
                    <img
                        src="/images/prima-banner.jpg"
                        alt="Pelabuhan & Kapal SJA"
                        width={1280}
                        height={720}
                        fetchPriority="high"
                        className="absolute inset-0 size-full object-cover object-[center_35%]"
                    />
                    {/* Title & Subtitle inside Hero Banner */}
                    <div className="relative z-10 mt-5 mb-2">
                        <h1 className="text-[28px] font-extrabold tracking-tight text-white leading-tight">
                            Kapal
                        </h1>
                        <p className="mt-0.5 text-[12px] font-medium text-white">
                            Setiap baris adalah satu kunjungan dengan nomor job tersendiri.
                        </p>
                    </div>
                </div>

                {/* 2. ROUNDED SHEET CONTAINER */}
                <div className="relative z-20 -mt-5 bg-sja-surface rounded-t-[28px] pt-4 px-3.5 pb-8 sm:pb-10">
                    <nav
                        aria-label="Navigasi data kapal"
                        className="hidden"
                    >
                        <Link
                            href="/vessels"
                            aria-current="page"
                            className="rounded-lg bg-[#0060F4] px-2 py-2 text-center text-[11px] font-bold text-white shadow-sm"
                        >
                            Kedatangan
                        </Link>
                        <Link
                            href="/master/vessels"
                            className="rounded-lg px-2 py-2 text-center text-[11px] font-bold text-[#082870] hover:bg-white dark:text-[#94A3B8] dark:hover:bg-[#132847]"
                        >
                            Master Kapal
                        </Link>
                        <Link
                            href="/reports"
                            className="rounded-lg px-2 py-2 text-center text-[11px] font-bold text-[#082870] hover:bg-white dark:text-[#94A3B8] dark:hover:bg-[#132847]"
                        >
                            Laporan
                        </Link>
                    </nav>

                    {/* Search & Filter Bar */}
                    <div className="flex items-center gap-2">
                        {/* Search Input */}
                        <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
                            <div
                                className={
                                    'absolute inset-y-0 left-0 pl-3 flex items-center ' +
                                    'pointer-events-none text-[#8C9BB9]'
                                }
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.2}
                                    viewBox="0 0 24 24"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari nama kapal, SPK, atau lokasi..."
                                className={
                                    'w-full pl-9 pr-7 py-2 bg-white dark:bg-[#071322] border ' +
                                    'border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl text-xs ' +
                                    'text-[#0B1F63] dark:text-[#F1F5F9] placeholder-[#8C9BB9] ' +
                                    'focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 ' +
                                    'focus:border-[#0060F4] shadow-2xs'
                                }
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        router.get('/vessels', {
                                            status: activeStatus,
                                            company_id: companyFilter,
                                        });
                                    }}
                                    className={
                                        'absolute inset-y-0 right-0 pr-2.5 flex items-center ' +
                                        'text-[#8C9BB9] text-xs hover:text-[#C62840]'
                                    }
                                >
                                    ✕
                                </button>
                            )}
                        </form>

                        {/* Filter Button with Funnel */}
                        <button
                            type="button"
                            onClick={() => setShowMobileFilterSheet(!showMobileFilterSheet)}
                            className={
                                'inline-flex items-center gap-1.5 px-3 py-2 bg-white ' +
                                'dark:bg-[#071322] border border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F] rounded-xl text-xs font-semibold ' +
                                'text-[#0B1F63] dark:text-[#F1F5F9] hover:bg-[#F0F8FF] ' +
                                'transition-all flex-shrink-0 shadow-2xs'
                            }
                        >
                            <svg
                                className="w-3.5 h-3.5 text-[#0060F4]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            <span>Filter</span>
                        </button>

                        {/* Admin Add Button on Mobile */}
                        {canCreateShip && (
                            <Link
                                href="/work-orders/create"
                                className={
                                    'inline-flex items-center gap-1 px-3 py-2 bg-[#0060F4] ' +
                                    'hover:bg-[#0052D4] active:bg-[#082870] text-white ' +
                                    'rounded-xl text-xs font-bold shadow-xs transition-colors flex-shrink-0'
                                }
                                title="Buat SPK dan jadwalkan kunjungan kapal"
                            >
                                <span className="text-base leading-none font-bold">+</span>
                                <span>Buat SPK</span>
                            </Link>
                        )}
                    </div>

                    {/* Filter Sheet / Options if toggled */}
                    <AnimatePresence>
                        {showMobileFilterSheet && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={
                                    'overflow-hidden mt-2 p-3 rounded-xl bg-[#F0F8FF] ' +
                                    'dark:bg-[#071322] border border-[#DCEAF8] ' +
                                    'dark:border-[#1E3A5F] space-y-2'
                                }
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-[#082870] dark:text-[#F1F5F9]">
                                        Filter Perusahaan:
                                    </span>
                                    {companyFilter && (
                                        <button
                                            type="button"
                                            onClick={() => handleCompanyFilterChange('')}
                                            className="text-[11px] text-[#C62840] font-bold"
                                        >
                                            Reset Filter
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={companyFilter}
                                    onChange={(e) => handleCompanyFilterChange(e.target.value)}
                                    className={
                                        'w-full text-xs font-medium bg-white dark:bg-[#0C1D36] ' +
                                        'border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                        'rounded-lg p-2'
                                    }
                                >
                                    <option value="">Semua Perusahaan ({companies.length})</option>
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.code ? `(${c.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Horizontal Status Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-3 scrollbar-none">
                        {mobileStatusTabs.map((tab) => {
                            const isActive = activeStatus === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => handleFilterStatus(tab.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer flex-shrink-0 ${isActive
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : 'bg-[#EAF4FE] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8] hover:bg-[#DCEAF8]'
                                        }`}
                                >
                                    <span>{tab.label}</span>
                                    <span>({tab.count})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Group 1: "Hari ini" */}
                    {todayVessels.length > 0 && (
                        <div className="mt-2 space-y-2.5">
                            {/* Section Header */}
                            <div className="flex items-center justify-between pt-1 pb-1">
                                <h2 className="text-sm font-bold text-[#082870] dark:text-[#F1F5F9]">
                                    Hari ini
                                </h2>
                                <span className="text-xs text-[#52658E] dark:text-[#94A3B8] font-medium">
                                    {formatGroupDate(now)}
                                </span>
                            </div>

                            {/* Cards in Hari ini */}
                            {todayVessels.map((vessel) => (
                                <Link
                                    key={vessel.visit_id}
                                    href={`/vessels/${vessel.id}?visit=${vessel.visit_id}`}
                                    aria-label={`Buka detail ${vessel.name}, ${vessel.job_number}`}
                                    className="block group"
                                >
                                    <div
                                        className={
                                            'bg-white dark:bg-[#0C1D36] p-2.5 rounded-2xl border ' +
                                            'border-[#E2EEF9] dark:border-[#1E3A5F] shadow-2xs ' +
                                            'hover:border-[#0060F4]/40 transition-all flex ' +
                                            'items-center gap-3'
                                        }
                                    >
                                        {/* Left: Thumbnail image */}
                                        <ShipImage
                                            src={vessel.image}
                                            alt={vessel.name}
                                            className={
                                                'min-h-24 w-24 self-stretch rounded-xl object-cover ' +
                                                'flex-shrink-0 border sm:w-28 ' +
                                                'border-[#DCEAF8]/60 dark:border-[#1E3A5F]'
                                            }
                                        />

                                        {/* Middle: Details */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            {/* Row 1: Ship name */}
                                            <h3
                                                className={
                                                    'wrap-anywhere text-balance font-bold text-[13.5px] ' +
                                                    'leading-5 text-[#082870] ' +
                                                    'transition-colors group-hover:text-[#0060F4] ' +
                                                    'dark:text-[#F1F5F9]'
                                                }
                                            >
                                                {vessel.name}
                                            </h3>

                                            {/* Row 2: Status */}
                                            <div className="flex items-center">
                                                {renderStatusBadge(vessel.status)}
                                            </div>

                                            {/* Row 3: Full job number */}
                                            <p
                                                translate="no"
                                                className={
                                                    'wrap-anywhere text-[10px] font-bold leading-4 ' +
                                                    'text-[#52658E] dark:text-[#94A3B8]'
                                                }
                                            >
                                                {vessel.job_number}
                                            </p>

                                            {/* Row 4: Date + Location */}
                                            <div
                                                className={
                                                    'flex items-center gap-2 text-[11px] ' +
                                                    'text-[#52658E] dark:text-[#94A3B8] flex-wrap'
                                                }
                                            >
                                                <div className="flex items-center gap-1 font-medium whitespace-nowrap">
                                                    <svg
                                                        className="w-3.5 h-3.5 text-[#52658E] shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <rect
                                                            x="3"
                                                            y="4"
                                                            width="18"
                                                            height="18"
                                                            rx="2"
                                                            ry="2"
                                                        />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    <span>{formatEtaDateTime(vessel.eta)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <svg
                                                        className="w-3.5 h-3.5 text-[#52658E] shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                        />
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                        />
                                                    </svg>
                                                    <span className="wrap-anywhere text-pretty">
                                                        {vessel.port_name || 'Pelabuhan belum diisi'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Row 5: Kebutuhan + Pengajuan */}
                                            <div
                                                className={
                                                    'flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ' +
                                                    'text-[#52658E] dark:text-[#94A3B8] ' +
                                                    'whitespace-nowrap'
                                                }
                                            >
                                                <div
                                                    className={
                                                        'inline-flex items-center gap-1 ' +
                                                        'whitespace-nowrap shrink-0'
                                                    }
                                                >
                                                    <svg
                                                        className="w-3.5 h-3.5 text-[#0060F4] shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                                        />
                                                    </svg>
                                                    <span>Kebutuhan:</span>
                                                    <span
                                                        className={`whitespace-nowrap ${vessel.needs_count && vessel.needs_count > 0 ? 'text-[#0060F4] font-bold' : 'font-medium'}`}
                                                    >
                                                        {vessel.needs_count &&
                                                            vessel.needs_count > 0
                                                            ? `${vessel.needs_count}\u00A0item`
                                                            : '-'}
                                                    </span>
                                                </div>
                                                <div
                                                    className={
                                                        'inline-flex items-center gap-1 ' +
                                                        'whitespace-nowrap shrink-0'
                                                    }
                                                >
                                                    <svg
                                                        className="w-3.5 h-3.5 text-[#52658E] shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d={
                                                                'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-' +
                                                                '2V5a2 2 0 012-2h5.586a1 1 0 01.7' +
                                                                '07.293l5.414 5.414a1 1 0 01.293.' +
                                                                '707V19a2 2 0 01-2 2z'
                                                            }
                                                        />
                                                    </svg>
                                                    <span>Pengajuan:</span>
                                                    <span
                                                        className={`whitespace-nowrap ${vessel.requests_count && vessel.requests_count > 0 ? 'text-[#082870] dark:text-white font-bold' : 'font-medium'}`}
                                                    >
                                                        {vessel.requests_count &&
                                                            vessel.requests_count > 0
                                                            ? `${vessel.requests_count}`
                                                            : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Blue Chevron */}
                                        <div className="flex-shrink-0 text-[#0060F4] pr-1">
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={2.5}
                                                viewBox="0 0 24 24"
                                            >
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Group 2: "Besok" */}
                    {tomorrowVessels.length > 0 && (
                        <div className="mt-4 space-y-2.5">
                            {/* Section Header */}
                            <div className="flex items-center justify-between pt-1 pb-1">
                                <h2 className="text-sm font-bold text-[#082870] dark:text-[#F1F5F9]">
                                    Besok
                                </h2>
                                <span className="text-xs text-[#52658E] dark:text-[#94A3B8] font-medium">
                                    {formatGroupDate(tomorrow)}
                                </span>
                            </div>

                            {/* Cards in Besok */}
                            {tomorrowVessels.map((vessel) => (
                                <Link
                                    key={vessel.visit_id}
                                    href={`/vessels/${vessel.id}?visit=${vessel.visit_id}`}
                                    aria-label={`Buka detail ${vessel.name}, ${vessel.job_number}`}
                                    className="block group"
                                >
                                    <div
                                        className={
                                            'bg-white dark:bg-[#0C1D36] p-2.5 rounded-2xl border ' +
                                            'border-[#E2EEF9] dark:border-[#1E3A5F] shadow-2xs ' +
                                            'hover:border-[#0060F4]/40 transition-all flex ' +
                                            'items-center gap-3'
                                        }
                                    >
                                        {/* Left: Thumbnail image */}
                                        <ShipImage
                                            src={vessel.image}
                                            alt={vessel.name}
                                            className={
                                                'min-h-24 w-24 self-stretch rounded-xl object-cover ' +
                                                'flex-shrink-0 border sm:w-28 ' +
                                                'border-[#DCEAF8]/60 dark:border-[#1E3A5F]'
                                            }
                                        />

                                        {/* Middle: Details */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            {/* Row 1: Ship name */}
                                            <h3
                                                className={
                                                    'wrap-anywhere text-balance font-bold text-[13.5px] ' +
                                                    'leading-5 text-[#082870] ' +
                                                    'transition-colors group-hover:text-[#0060F4] ' +
                                                    'dark:text-[#F1F5F9]'
                                                }
                                            >
                                                {vessel.name}
                                            </h3>

                                            {/* Row 2: Status */}
                                            <div className="flex items-center">
                                                {renderStatusBadge(vessel.status)}
                                            </div>

                                            {/* Row 3: Full job number */}
                                            <p
                                                translate="no"
                                                className={
                                                    'wrap-anywhere text-[10px] font-bold leading-4 ' +
                                                    'text-[#52658E] dark:text-[#94A3B8]'
                                                }
                                            >
                                                {vessel.job_number}
                                            </p>

                                            {/* Row 4: Date + Location */}
                                            <div
                                                className={
                                                    'flex items-center gap-2 text-[11px] ' +
                                                    'text-[#52658E] dark:text-[#94A3B8] flex-wrap'
                                                }
                                            >
                                                <div className="flex items-center gap-1 font-medium whitespace-nowrap">
                                                    <svg
                                                        className="w-3.5 h-3.5 text-[#52658E] shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <rect
                                                            x="3"
                                                            y="4"
                                                            width="18"
                                                            height="18"
                                                            rx="2"
                                                            ry="2"
                                                        />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    <span>{formatEtaDateTime(vessel.eta)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <svg
                                                        className="w-3.5 h-3.5 text-[#52658E] shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                        />
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                        />
                                                    </svg>
                                                    <span className="wrap-anywhere text-pretty">
                                                        {vessel.port_name || 'Pelabuhan belum diisi'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Row 5: Kebutuhan + Pengajuan */}
                                            <div
                                                className={
                                                    'flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ' +
                                                    'text-[#52658E] dark:text-[#94A3B8] ' +
                                                    'whitespace-nowrap'
                                                }
                                            >
                                                <div
                                                    className={
                                                        'inline-flex items-center gap-1 ' +
                                                        'whitespace-nowrap shrink-0'
                                                    }
                                                >
                                                    <svg
                                                        className="w-3.5 h-3.5 text-[#0060F4] shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                                        />
                                                    </svg>
                                                    <span>Kebutuhan:</span>
                                                    <span
                                                        className={`whitespace-nowrap ${vessel.needs_count && vessel.needs_count > 0 ? 'text-[#0060F4] font-bold' : 'font-medium'}`}
                                                    >
                                                        {vessel.needs_count &&
                                                            vessel.needs_count > 0
                                                            ? `${vessel.needs_count}\u00A0item`
                                                            : '-'}
                                                    </span>
                                                </div>
                                                <div
                                                    className={
                                                        'inline-flex items-center gap-1 ' +
                                                        'whitespace-nowrap shrink-0'
                                                    }
                                                >
                                                    <svg
                                                        className="w-3.5 h-3.5 text-[#52658E] shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d={
                                                                'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-' +
                                                                '2V5a2 2 0 012-2h5.586a1 1 0 01.7' +
                                                                '07.293l5.414 5.414a1 1 0 01.293.' +
                                                                '707V19a2 2 0 01-2 2z'
                                                            }
                                                        />
                                                    </svg>
                                                    <span>Pengajuan:</span>
                                                    <span
                                                        className={`whitespace-nowrap ${vessel.requests_count && vessel.requests_count > 0 ? 'text-[#082870] dark:text-white font-bold' : 'font-medium'}`}
                                                    >
                                                        {vessel.requests_count &&
                                                            vessel.requests_count > 0
                                                            ? `${vessel.requests_count}`
                                                            : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Blue Chevron */}
                                        <div className="flex-shrink-0 text-[#0060F4] pr-1">
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={2.5}
                                                viewBox="0 0 24 24"
                                            >
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {sortedVessels.length === 0 && (
                        <div
                            className={
                                'p-8 text-center bg-[#F0F8FF] dark:bg-[#071322] rounded-2xl border ' +
                                'border-[#DCEAF8] dark:border-[#1E3A5F] mt-4'
                            }
                        >
                            <p className="text-xs font-bold text-[#082870] dark:text-[#F1F5F9]">
                                Tidak ada kedatangan kapal yang cocok
                            </p>
                            <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-1">
                                Coba ubah kata kunci pencarian atau status.
                            </p>
                        </div>
                    )}

                    {/* Bottom Info Bar: Menampilkan 5 dari 5 kapal | Urutkan */}
                    <div
                        className={
                            'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs ' +
                            'text-[#52658E] dark:text-[#94A3B8] pt-3 pb-1 mt-1'
                        }
                    >
                        <span>
                            Menampilkan {sortedVessels.length} dari {counts.semua} kapal
                        </span>
                        <div
                            className={
                                'relative inline-flex items-center gap-1 font-semibold ' +
                                'text-[#082870] dark:text-[#38BDF8]'
                            }
                        >
                            <label htmlFor="mobile-vessel-sort">⇅ Urutkan:</label>
                            <select
                                id="mobile-vessel-sort"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className={
                                    'bg-transparent border-none rounded-md text-xs ' +
                                    'font-semibold text-[#082870] dark:text-[#38BDF8] pr-4 ' +
                                    'py-1 pl-0.5 focus-visible:outline-2 ' +
                                    'focus-visible:outline-offset-2 ' +
                                    'focus-visible:outline-[#0060F4] appearance-none ' +
                                    'cursor-pointer'
                                }
                            >
                                <option value="terdekat">Tanggal (Terdekat)</option>
                                <option value="nama">Nama (A-Z)</option>
                            </select>
                            <svg
                                className={
                                    'w-3 h-3 text-[#082870] dark:text-[#38BDF8] ' +
                                    'pointer-events-none absolute right-0 top-1/2 ' +
                                    '-translate-y-1/2'
                                }
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                viewBox="0 0 24 24"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                DESKTOP VIEW (>= md): COMPLETE CORPORATE MARITIME MASTER VIEW
               ═══════════════════════════════════════════════════════════════ */}
            <div className="hidden md:block">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4 max-w-7xl mx-auto pb-10"
                >
                    {/* Top Level Module Switcher */}
                    <motion.div
                        variants={itemVariants}
                        className="hidden"
                    >
                        <div
                            className={
                                'flex items-center gap-2 p-1 bg-[#E0F0FF]/60 dark:bg-[#0C1D36] ' +
                                'rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F]'
                            }
                        >
                            <button
                                type="button"
                                onClick={() => setActiveModule('kapal')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${activeModule === 'kapal'
                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#082870] dark:text-[#94A3B8] hover:bg-white/60 dark:hover:bg-[#132847]'
                                    }`}
                            >
                                <svg
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 17h18l-2 4H5l-2-4Zm2-5h14l2 5H3l2-5Z"
                                    />
                                </svg>
                                <span>Kapal</span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-black ${activeModule === 'kapal'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white dark:bg-[#071322] text-[#0060F4] ' +
                                        'dark:text-[#38BDF8] border border-[#DCEAF8] ' +
                                        'dark:border-[#1E3A5F]'
                                        }`}
                                >
                                    {vessels.length}
                                </span>
                            </button>

                            <Link
                                href="/master/vessels"
                                className={
                                    'flex items-center gap-2 rounded-xl px-4 py-2 text-xs ' +
                                    'font-extrabold text-[#082870] transition-colors hover:bg-white/60 ' +
                                    'dark:text-[#94A3B8] dark:hover:bg-[#132847] sm:text-sm'
                                }
                            >
                                <svg
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 5h16v14H4zM8 9h8M8 13h8"
                                    />
                                </svg>
                                <span>Master Kapal</span>
                                <span
                                    className={
                                        'rounded-full border border-[#DCEAF8] bg-white px-2 py-0.5 ' +
                                        'text-[11px] font-black text-[#0060F4] dark:border-[#1E3A5F] ' +
                                        'dark:bg-[#071322] dark:text-[#38BDF8]'
                                    }
                                >
                                    {allMasterShips.length}
                                </span>
                            </Link>

                            <button
                                type="button"
                                onClick={() => setActiveModule('perusahaan')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${activeModule === 'perusahaan'
                                    ? 'bg-[#082870] dark:bg-[#2563EB] text-white shadow-sm'
                                    : 'text-[#082870] dark:text-[#94A3B8] hover:bg-white/60 dark:hover:bg-[#132847]'
                                    }`}
                            >
                                <svg
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 21V5h16v16M8 9h2m4 0h2m-8 4h2m4 0h2M3 21h18"
                                    />
                                </svg>
                                <span>Master Perusahaan</span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-black ${activeModule === 'perusahaan'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white dark:bg-[#071322] text-[#082870] ' +
                                        'dark:text-[#F1F5F9] border border-[#DCEAF8] ' +
                                        'dark:border-[#1E3A5F]'
                                        }`}
                                >
                                    {companies.length}
                                </span>
                            </button>
                        </div>

                        {canCreateShip && (
                            <div className="flex items-center gap-2">
                                {activeModule === 'kapal' ? (
                                    <Link
                                        href="/work-orders/create"
                                        className={
                                            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ' +
                                            'bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] ' +
                                            'text-white text-xs sm:text-sm font-bold shadow-sm ' +
                                            'transition-all flex-shrink-0 cursor-pointer'
                                        }
                                    >
                                        <span className="text-base leading-none font-bold">+</span>
                                        <span>Buat SPK &amp; Kunjungan</span>
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCompanyModal(true)}
                                        className={
                                            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ' +
                                            'bg-[#082870] dark:bg-[#1E3A5F] hover:bg-[#0D2945] ' +
                                            'dark:hover:bg-[#285585] text-white text-xs sm:text-sm ' +
                                            'font-bold shadow-sm transition-all flex-shrink-0 ' +
                                            'cursor-pointer'
                                        }
                                    >
                                        <span className="text-base leading-none font-bold">+</span>
                                        <span>Tambah Perusahaan Baru</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>

                    {/* DESKTOP VIEW 1: MASTER KAPAL */}
                    {activeModule === 'kapal' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h1
                                        className={
                                            'text-2xl sm:text-3xl font-extrabold text-[#0B1F63] ' +
                                            'dark:text-[#F1F5F9] tracking-tight'
                                        }
                                    >
                                        Daftar Kapal
                                    </h1>
                                    <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                        Daftar kunjungan kapal berdasarkan nomor job dan jadwal operasional SPK
                                    </p>
                                </div>

                                {companyFilter && (
                                    <div
                                        className={
                                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ' +
                                            'bg-[#E0F0FF] dark:bg-[#0C1D36] border ' +
                                            'border-[#0060F4]/30 dark:border-[#1E3A5F] text-xs ' +
                                            'text-[#082870] dark:text-[#F1F5F9]'
                                        }
                                    >
                                        <span className="text-[#52658E] dark:text-[#94A3B8]">
                                            Filter Perusahaan:
                                        </span>
                                        <span className="font-bold">
                                            {companies.find((c) => c.id === companyFilter)?.name ||
                                                'Perusahaan Terpilih'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCompanyFilterChange('')}
                                            className={
                                                'text-[#C62840] dark:text-[#F87171] ' +
                                                'hover:underline font-bold ml-1 cursor-pointer'
                                            }
                                        >
                                            ✕ Reset
                                        </button>
                                    </div>
                                )}

                                {/* {canCreateShip && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(true)}
                                        className={
                                            'inline-flex items-center gap-2 rounded-xl bg-[#0060F4] ' +
                                            'px-4 py-2.5 text-xs font-bold text-white shadow-sm ' +
                                            'transition-colors hover:bg-[#0052D4] active:bg-[#082870] ' +
                                            'sm:text-sm'
                                        }
                                    >
                                        <svg
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2.5}
                                                d="M12 5v14M5 12h14"
                                            />
                                        </svg>
                                        Tambah Kapal
                                    </button>
                                )} */}
                            </div>

                            {/* Search Bar, Company Filter Dropdown, and Sort */}
                            <div
                                className={
                                    'grid grid-cols-2 items-center gap-2.5 ' +
                                    'xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)_auto]'
                                }
                            >
                                <form
                                    onSubmit={handleSearch}
                                    className="col-span-2 min-w-0 relative xl:col-span-1"
                                >
                                    <div
                                        className={
                                            'absolute inset-y-0 left-0 pl-3.5 flex items-center ' +
                                            'pointer-events-none text-[#8C9BB9] dark:text-[#64748B]'
                                        }
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            viewBox="0 0 24 24"
                                        >
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Cari nama kapal, nomor IMO, agen, atau lokasi..."
                                        aria-label="Cari kapal"
                                        className={
                                            'w-full pl-10 pr-9 py-2.5 bg-white ' +
                                            'dark:bg-[#0C1D36] border border-[#DCEAF8] ' +
                                            'dark:border-[#1E3A5F] rounded-xl text-xs ' +
                                            'sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9] ' +
                                            'placeholder-[#8C9BB9] focus:outline-none ' +
                                            'focus:ring-2 focus:ring-[#0060F4]/30 ' +
                                            'focus:border-[#0060F4] shadow-xs'
                                        }
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchTerm('');
                                                router.get('/vessels', {
                                                    status: activeStatus,
                                                    company_id: companyFilter,
                                                });
                                            }}
                                            className={
                                                'absolute inset-y-0 right-0 pr-3 flex ' +
                                                'items-center text-[#8C9BB9] ' +
                                                'hover:text-[#C62840]'
                                            }
                                        >
                                            ✕
                                        </button>
                                    )}
                                </form>

                                {/* Company Filter */}
                                <div className="relative min-w-0">
                                    <select
                                        aria-label="Filter perusahaan pelayaran"
                                        value={companyFilter}
                                        onChange={(e) => handleCompanyFilterChange(e.target.value)}
                                        className={
                                            'w-full appearance-none bg-white dark:bg-[#0C1D36] ' +
                                            'border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                            'rounded-xl pl-8 pr-8 py-2.5 text-xs font-bold ' +
                                            'text-[#0B1F63] dark:text-[#F1F5F9] ' +
                                            'hover:bg-[#F0F8FF] focus:outline-none ' +
                                            'focus:ring-2 focus:ring-[#0060F4]/30 shadow-xs ' +
                                            'cursor-pointer'
                                        }
                                    >
                                        <option value="">
                                            Semua Perusahaan ({companies.length})
                                        </option>
                                        {companies.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.code ? `(${c.code})` : ''} —{' '}
                                                {c.ships_count ?? c.ships?.length ?? 0} Kapal
                                            </option>
                                        ))}
                                    </select>
                                    <span
                                        className={
                                            'absolute left-2.5 top-1/2 -translate-y-1/2 ' +
                                            'pointer-events-none text-xs'
                                        }
                                    >
                                        🏢
                                    </span>
                                    <svg
                                        className={
                                            'w-3 h-3 text-[#52658E] absolute right-2.5 top-1/2 ' +
                                            '-translate-y-1/2 pointer-events-none'
                                        }
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <polyline
                                            points="6 9 12 15 18 9"
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>

                                {/* Sort */}
                                <div className="relative min-w-0">
                                    <select
                                        aria-label="Urutkan kapal"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className={
                                            'w-full appearance-none bg-white dark:bg-[#0C1D36] ' +
                                            'border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                            'rounded-xl pl-7 pr-7 py-2.5 text-xs font-bold ' +
                                            'text-[#0B1F63] dark:text-[#F1F5F9] ' +
                                            'hover:bg-[#F0F8FF] focus:outline-none ' +
                                            'focus:ring-2 focus:ring-[#0060F4]/30 shadow-xs ' +
                                            'cursor-pointer'
                                        }
                                    >
                                        <option value="terdekat">Jadwal ETA (Terdekat)</option>
                                        <option value="nama">Nama A-Z</option>
                                    </select>
                                    <span
                                        className={
                                            'absolute left-2.5 top-1/2 -translate-y-1/2 ' +
                                            'pointer-events-none text-xs text-[#52658E]'
                                        }
                                    >
                                        ⇅
                                    </span>
                                    <svg
                                        className={
                                            'w-3 h-3 text-[#52658E] absolute right-2 top-1/2 ' +
                                            '-translate-y-1/2 pointer-events-none'
                                        }
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <polyline
                                            points="6 9 12 15 18 9"
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Status Tabs */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {mobileStatusTabs.map((tab) => {
                                    const isActive = activeStatus === tab.value;
                                    return (
                                        <button
                                            key={tab.value}
                                            type="button"
                                            onClick={() => handleFilterStatus(tab.value)}
                                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all select-none shadow-xs cursor-pointer ${isActive
                                                ? 'bg-[#0060F4] text-white shadow-[#0060F4]/20'
                                                : 'bg-[#F0F8FF] dark:bg-[#0C1D36] ' +
                                                'text-[#0057D9] dark:text-[#94A3B8] ' +
                                                'hover:bg-[#E0F0FF] border ' +
                                                'border-[#DCEAF8]/60 ' +
                                                'dark:border-[#1E3A5F]'
                                                }`}
                                        >
                                            <span>{tab.label}</span>
                                            <span
                                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive
                                                    ? 'bg-white/25 text-white'
                                                    : 'bg-white dark:bg-[#071322] ' +
                                                    'text-[#0057D9] dark:text-[#38BDF8] ' +
                                                    'border border-[#DCEAF8] ' +
                                                    'dark:border-[#1E3A5F]'
                                                    }`}
                                            >
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Cards List Desktop */}
                            <div className="space-y-3">
                                {sortedVessels.map((vessel) => (
                                    <Link
                                        key={vessel.visit_id}
                                        href={`/vessels/${vessel.id}?visit=${vessel.visit_id}`}
                                        aria-label={`Buka detail ${vessel.name}, ${vessel.job_number}`}
                                        className="block group"
                                    >
                                        <div
                                            className={
                                                'bg-white dark:bg-[#0C1D36] p-4 rounded-[18px] ' +
                                                'border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                                'shadow-xs group-hover:border-[#0060F4]/40 ' +
                                                'group-hover:shadow-md transition-all flex ' +
                                                'items-center justify-between gap-4'
                                            }
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-4">
                                                <ShipImage
                                                    src={vessel.image}
                                                    alt={vessel.name}
                                                    className={
                                                        'w-24 h-20 rounded-[14px] object-cover ' +
                                                        'flex-shrink-0 border border-[#DCEAF8] ' +
                                                        'dark:border-[#1E3A5F]'
                                                    }
                                                />

                                                <div className="min-w-0 flex-1 space-y-1.5">
                                                    <h3
                                                        className={
                                                            'truncate text-base font-bold ' +
                                                            'text-[#0B1F63] transition-colors ' +
                                                            'group-hover:text-[#0060F4] ' +
                                                            'dark:text-[#F1F5F9]'
                                                        }
                                                    >
                                                        {vessel.name}
                                                    </h3>

                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        {renderStatusBadge(vessel.status)}
                                                        <span
                                                            className={
                                                                'truncate text-xs font-bold tracking-wide ' +
                                                                'text-[#52658E] dark:text-[#94A3B8]'
                                                            }
                                                        >
                                                            {vessel.job_number}
                                                        </span>
                                                    </div>

                                                    <div
                                                        className={
                                                            'flex flex-wrap items-center gap-x-4 gap-y-1 ' +
                                                            'text-xs text-[#52658E] dark:text-[#94A3B8]'
                                                        }
                                                    >
                                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                                            <svg
                                                                aria-hidden="true"
                                                                className="h-4 w-4 shrink-0"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth={2}
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <rect
                                                                    x="3"
                                                                    y="4"
                                                                    width="18"
                                                                    height="18"
                                                                    rx="2"
                                                                    ry="2"
                                                                />
                                                                <line
                                                                    x1="16"
                                                                    y1="2"
                                                                    x2="16"
                                                                    y2="6"
                                                                />
                                                                <line
                                                                    x1="8"
                                                                    y1="2"
                                                                    x2="8"
                                                                    y2="6"
                                                                />
                                                                <line
                                                                    x1="3"
                                                                    y1="10"
                                                                    x2="21"
                                                                    y2="10"
                                                                />
                                                            </svg>
                                                            {formatEtaDateTime(vessel.eta)}
                                                        </span>
                                                        <span className="inline-flex min-w-0 items-center gap-1.5">
                                                            <svg
                                                                aria-hidden="true"
                                                                className="h-4 w-4 shrink-0"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth={2}
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M17.657 16.657 13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0Z"
                                                                />
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                                                />
                                                            </svg>
                                                            <span className="truncate">
                                                                {vessel.port_name ||
                                                                    'Pelabuhan belum diisi'}
                                                            </span>
                                                        </span>
                                                    </div>

                                                    <div
                                                        className={
                                                            'flex flex-wrap items-center gap-x-4 gap-y-1 ' +
                                                            'text-xs text-[#52658E] dark:text-[#94A3B8]'
                                                        }
                                                    >
                                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                                            <svg
                                                                aria-hidden="true"
                                                                className="h-4 w-4 shrink-0 text-[#0060F4]"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth={2}
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="m20 7-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                                                />
                                                            </svg>
                                                            <span>Kebutuhan:</span>
                                                            <strong className="text-[#0060F4]">
                                                                {vessel.needs_count
                                                                    ? `${vessel.needs_count} item`
                                                                    : '-'}
                                                            </strong>
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                                            <svg
                                                                aria-hidden="true"
                                                                className="h-4 w-4 shrink-0"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth={2}
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
                                                                />
                                                            </svg>
                                                            <span>Pengajuan:</span>
                                                            <strong className="text-[#082870] dark:text-white">
                                                                {vessel.requests_count || '-'}
                                                            </strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                aria-hidden="true"
                                                className={
                                                    'flex h-10 w-10 flex-shrink-0 items-center ' +
                                                    'justify-center rounded-full bg-[#E0F0FF] ' +
                                                    'text-[#0060F4] transition-transform ' +
                                                    'group-hover:translate-x-0.5 dark:bg-[#071322]'
                                                }
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth={2.5}
                                                    viewBox="0 0 24 24"
                                                >
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DESKTOP VIEW 2: MASTER PERUSAHAAN */}
                    {activeModule === 'perusahaan' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <h1
                                        className={
                                            'text-2xl sm:text-3xl font-extrabold text-[#0B1F63] ' +
                                            'dark:text-[#F1F5F9] tracking-tight'
                                        }
                                    >
                                        Master Perusahaan Pelayaran
                                    </h1>
                                    <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                        Daftar perusahaan pemilik / operator armada kapal yang
                                        bekerjasama dengan SJA
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAddCompanyModal(true)}
                                    className={
                                        'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ' +
                                        'bg-[#082870] hover:bg-[#0D2945] text-white text-xs ' +
                                        'sm:text-sm font-bold shadow-sm transition-all'
                                    }
                                >
                                    + Tambah Perusahaan Baru
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative max-w-md">
                                <input
                                    type="text"
                                    value={companySearchTerm}
                                    onChange={(e) => setCompanySearchTerm(e.target.value)}
                                    placeholder="Cari nama perusahaan, kode, email, atau telepon..."
                                    className={
                                        'w-full pl-4 pr-4 py-2.5 bg-white dark:bg-[#0C1D36] ' +
                                        'border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                        'rounded-xl text-xs sm:text-sm'
                                    }
                                />
                            </div>

                            {/* Company Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredCompanies.map((c) => (
                                    <Card
                                        key={c.id}
                                        className={
                                            'p-5 border border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                            'bg-white dark:bg-[#0C1D36] flex flex-col ' +
                                            'justify-between space-y-4'
                                        }
                                    >
                                        <div>
                                            <div
                                                className={
                                                    'flex items-start justify-between gap-2 pb-3 ' +
                                                    'border-b border-[#DCEAF8] ' +
                                                    'dark:border-[#1E3A5F]'
                                                }
                                            >
                                                <div>
                                                    <h3
                                                        className={
                                                            'font-extrabold text-base ' +
                                                            'text-[#0B1F63] dark:text-[#F1F5F9]'
                                                        }
                                                    >
                                                        {c.name}
                                                    </h3>
                                                    {c.code && (
                                                        <span
                                                            className={
                                                                'text-[10px] font-mono font-bold ' +
                                                                'px-2 py-0.5 rounded-full ' +
                                                                'bg-[#E0F0FF] text-[#0060F4]'
                                                            }
                                                        >
                                                            KODE: {c.code}
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className={
                                                        'px-2.5 py-0.5 rounded-full text-[10px] ' +
                                                        'font-bold bg-[#DCF7E8] text-[#087443]'
                                                    }
                                                >
                                                    Aktif
                                                </span>
                                            </div>

                                            <div
                                                className={
                                                    'space-y-1.5 text-xs text-[#52658E] ' +
                                                    'dark:text-[#94A3B8] pt-3'
                                                }
                                            >
                                                {c.phone && <p>📞 {c.phone}</p>}
                                                {c.email && <p>✉️ {c.email}</p>}
                                                {c.address && (
                                                    <p className="line-clamp-2">📍 {c.address}</p>
                                                )}
                                            </div>

                                            <div className="pt-3 mt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                                                <div className="flex items-center justify-between text-xs mb-2">
                                                    <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                        Armada Kapal
                                                    </span>
                                                    <span
                                                        className={
                                                            'px-2 py-0.5 rounded-full bg-[#0060F4] ' +
                                                            'text-white text-[11px] font-black'
                                                        }
                                                    >
                                                        {c.ships_count ?? c.ships?.length ?? 0}{' '}
                                                        Kapal
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(c.ships || []).map((s) => (
                                                        <Link
                                                            key={s.id}
                                                            href={`/vessels/${s.id}`}
                                                            className={
                                                                'inline-flex items-center ' +
                                                                'gap-1 px-2 py-0.5 rounded-md ' +
                                                                'text-[11px] bg-[#F0F8FF] ' +
                                                                'text-[#082870] font-semibold ' +
                                                                'border border-[#DCEAF8]'
                                                            }
                                                        >
                                                            🚢 {s.name}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCompanyFilter(c.id);
                                                setActiveModule('kapal');
                                                router.get('/vessels', {
                                                    company_id: c.id,
                                                    status: activeStatus,
                                                });
                                            }}
                                            className={
                                                'w-full text-center py-2 px-3 rounded-xl ' +
                                                'bg-[#F0F8FF] hover:bg-[#0060F4] ' +
                                                'text-[#0060F4] hover:text-white text-xs ' +
                                                'font-bold transition-all border ' +
                                                'border-[#DCEAF8]'
                                            }
                                        >
                                            Lihat Armada Kapal &rarr;
                                        </button>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MODALS: TAMBAH KAPAL & TAMBAH PERUSAHAAN
               ═══════════════════════════════════════════════════════════════ */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setArrivalErrors({}); setShowAddModal(false); }}
                title={
                    <div>
                        <div className="text-base sm:text-lg font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                            {shipModalTab === 'existing'
                                ? 'Pencatatan Kunjungan Kapal (Job Baru)'
                                : 'Pendaftaran Kapal & Kunjungan Baru'}
                        </div>
                        <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                            Hierarki SJA: Perusahaan → Kapal (Master) → Kunjungan Baru
                        </p>
                    </div>
                }
                size="lg"
                asBottomSheetOnMobile={true}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setArrivalErrors({}); setShowAddModal(false); }}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSaveShipArrival}
                        >
                            {shipModalTab === 'existing'
                                ? 'Jadwalkan Kunjungan Baru'
                                : 'Simpan Kapal & Jadwalkan'}
                        </Button>
                    </>
                }
            >
                <form noValidate onSubmit={handleSaveShipArrival} className="space-y-4">
                    <FormErrorSummary errors={arrivalErrors} />
                    {/* Tab Selector: Existing vs New */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F0F8FF] dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl">
                        <button
                            type="button"
                            onClick={() => setShipModalTab('existing')}
                            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${shipModalTab === 'existing'
                                ? 'bg-[#0060F4] text-white shadow-xs'
                                : 'text-[#082870] dark:text-[#94A3B8] hover:bg-white/60 dark:hover:bg-[#0D2945]'
                                }`}
                        >
                            <span>🚢</span>
                            <span>Kapal Ada di Master</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShipModalTab('new')}
                            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${shipModalTab === 'new'
                                ? 'bg-[#0060F4] text-white shadow-xs'
                                : 'text-[#082870] dark:text-[#94A3B8] hover:bg-white/60 dark:hover:bg-[#0D2945]'
                                }`}
                        >
                            <span>➕</span>
                            <span>Daftarkan Kapal Baru</span>
                        </button>
                    </div>

                    {/* MODE 1: PILIH KAPAL DARI MASTER */}
                    {shipModalTab === 'existing' && (
                        <div className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] mb-1">
                                    Pilih Kapal Terdaftar *
                                </label>
                                <select
                                    required
                                    name="ship_id"
                                    value={selectedMasterShipId}
                                    onChange={(e) => handleSelectMasterShip(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#071322] text-[#0B1F63] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                                >
                                    <option value="">-- Pilih Kapal dari Master Armada --</option>
                                    {allMasterShips.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.imo_number || 'Tanpa IMO'} • {s.company?.name || 'Umum'})
                                        </option>
                                    ))}
                                </select>
                                {arrivalErrors.ship_id && <p role="alert" className="mt-1 text-[11px] font-semibold text-[#C62840]">{arrivalErrors.ship_id}</p>}
                            </div>

                            {/* Info Card Kapal Terpilih */}
                            {selectedMasterShip ? (
                                <div className="p-3 rounded-xl bg-[#F0F8FF] dark:bg-[#0A1A2F] border border-[#DCEAF8] dark:border-[#1E3A5F] space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold text-[#082870] dark:text-[#38BDF8]">
                                            <span>🏢</span>
                                            <span>Perusahaan Pemilik:</span>
                                            <span className="text-[#0B1F63] dark:text-white font-extrabold">
                                                {selectedMasterShip.company?.name || 'PT Pelayaran SJA (Umum)'}
                                            </span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCF7E8] text-[#087443]">
                                            Master Terdaftar
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#DCEAF8] dark:border-[#1E3A5F] text-[#52658E] dark:text-[#94A3B8]">
                                        <div>
                                            <span className="block text-[10px]">Nomor IMO:</span>
                                            <span className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {selectedMasterShip.imo_number || '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px]">Tipe Kapal:</span>
                                            <span className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {selectedMasterShip.ship_type || 'Cargo'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px]">Gross Tonnage:</span>
                                            <span className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {selectedMasterShip.gross_tonnage ? `${selectedMasterShip.gross_tonnage} GT` : '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px]">Call Sign:</span>
                                            <span className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {selectedMasterShip.call_sign || '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-[#0060F4] dark:text-[#38BDF8] italic pt-1">
                                        Data kapal & perusahaan di atas otomatis terhubung. Buat Kunjungan/Job baru di bawah:
                                    </p>
                                </div>
                            ) : (
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                                    Pilih kapal di atas untuk menampilkan data perusahaan pemilik dan mengisi jadwal kedatangan baru.
                                </div>
                            )}

                            {/* Arrival Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] mb-1">
                                        Jadwal Kedatangan (ETA) *
                                    </label>
                                    <input
                                        name="eta"
                                        type="datetime-local"
                                        required
                                        value={arrivalEta}
                                        onChange={(e) => setArrivalEta(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#071322] text-[#0B1F63] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                                    />
                                    {arrivalErrors.eta && <p role="alert" className="mt-1 text-[11px] font-semibold text-[#C62840]">{arrivalErrors.eta}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] mb-1">
                                        Pelabuhan Tujuan
                                    </label>
                                    <select
                                        name="port_id"
                                        value={arrivalPortId}
                                        onChange={(e) => setArrivalPortId(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#071322] text-[#0B1F63] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                                    >
                                        {ports.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.code ? `(${p.code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                    name="captain_name"
                                    label="Nama Nahkoda (Kapten)"
                                    value={arrivalCaptainName}
                                    onChange={(e) => setArrivalCaptainName(e.target.value)}
                                    placeholder="Capt. Bambang"
                                    sizeVariant="sm"
                                    error={arrivalErrors.captain_name}
                                />
                                <Input
                                    name="captain_phone"
                                    label="No. Telepon Nahkoda / Kontak"
                                    value={arrivalCaptainPhone}
                                    onChange={(e) => setArrivalCaptainPhone(e.target.value)}
                                    placeholder="0812..."
                                    sizeVariant="sm"
                                    error={arrivalErrors.captain_phone}
                                />
                            </div>

                            <Input
                                name="arrival_notes"
                                label="Catatan Kunjungan / Instruksi SPK"
                                value={arrivalNotes}
                                onChange={(e) => setArrivalNotes(e.target.value)}
                                placeholder="Rencana sandar dermaga KSOP / labuh rede..."
                                sizeVariant="sm"
                                error={arrivalErrors.arrival_notes}
                            />
                        </div>
                    )}

                    {/* MODE 2: DAFTARKAN KAPAL BARU */}
                    {shipModalTab === 'new' && (
                        <div className="space-y-3.5">
                            {/* Perusahaan Pemilik */}
                            <div className="p-3 rounded-xl bg-[#F0F8FF] dark:bg-[#0A1A2F] border border-[#DCEAF8] dark:border-[#1E3A5F] space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        Perusahaan Pemilik Kapal *
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsNewCompany(!isNewCompany)}
                                        className="text-[#0060F4] dark:text-[#38BDF8] font-bold"
                                    >
                                        {isNewCompany ? '← Pilih Perusahaan Ada' : '+ Perusahaan Baru'}
                                    </button>
                                </div>
                                {!isNewCompany ? (
                                    <div>
                                        <select
                                            required
                                            name="ship_company_id"
                                            value={newShipCompanyId}
                                            onChange={(e) => setNewShipCompanyId(e.target.value)}
                                            aria-invalid={arrivalErrors.ship_company_id ? true : undefined}
                                            aria-describedby={arrivalErrors.ship_company_id ? 'arrival-ship-company-error' : undefined}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#071322] text-[#0B1F63] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                                        >
                                            <option value="">-- Pilih Perusahaan Pelayaran --</option>
                                            {companies.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} {c.code ? `(${c.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {arrivalErrors.ship_company_id && <p id="arrival-ship-company-error" role="alert" className="mt-1 text-[11px] font-semibold text-[#C62840]">{arrivalErrors.ship_company_id}</p>}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <Input
                                            name="new_company_name"
                                            label="Nama Perusahaan Baru"
                                            required
                                            value={newCompanyName}
                                            onChange={(e) => setNewCompanyName(e.target.value)}
                                            placeholder="PT Pelayaran..."
                                            sizeVariant="sm"
                                            error={arrivalErrors.new_company_name}
                                        />
                                        <Input
                                            name="new_company_code"
                                            label="Kode Singkat (Opsional)"
                                            value={newCompanyCode}
                                            onChange={(e) => setNewCompanyCode(e.target.value)}
                                            placeholder="Contoh: PMS"
                                            sizeVariant="sm"
                                            error={arrivalErrors.new_company_code}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Identitas Kapal Baru */}
                            <Input
                                name="name"
                                label="Nama Kapal Baru"
                                required
                                value={newShipName}
                                onChange={(e) => setNewShipName(e.target.value)}
                                placeholder="Contoh: KM Samudra Mandiri 01"
                                sizeVariant="sm"
                                error={arrivalErrors.name}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                    name="imo_number"
                                    label="Nomor IMO"
                                    value={newShipIMO}
                                    onChange={(e) => setNewShipIMO(e.target.value)}
                                    placeholder="7 Digit (mis. 9812345)"
                                    sizeVariant="sm"
                                    error={arrivalErrors.imo_number}
                                />
                                <Select
                                    name="ship_type"
                                    label="Tipe Kapal"
                                    value={newShipType}
                                    onChange={(e) => setNewShipType(e.target.value)}
                                    sizeVariant="sm"
                                    options={[
                                        { value: 'Container Ship', label: 'Container Ship' },
                                        { value: 'General Cargo', label: 'General Cargo' },
                                        { value: 'Oil Tanker', label: 'Oil Tanker' },
                                        { value: 'Bulk Carrier', label: 'Bulk Carrier' },
                                        { value: 'Chemical Tanker', label: 'Chemical Tanker' },
                                        { value: 'Tugboat / Barge', label: 'Tugboat / Barge' },
                                    ]}
                                    error={arrivalErrors.ship_type}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <Input
                                    name="gross_tonnage"
                                    label="Gross Tonnage (GT)"
                                    type="number"
                                    value={newShipGrossTonnage}
                                    onChange={(e) => setNewShipGrossTonnage(e.target.value)}
                                    placeholder="5400"
                                    sizeVariant="sm"
                                    error={arrivalErrors.gross_tonnage}
                                />
                                <Input
                                    name="length"
                                    label="Panjang Kapal (LOA/m)"
                                    type="number"
                                    value={newShipLength}
                                    onChange={(e) => setNewShipLength(e.target.value)}
                                    placeholder="128.5"
                                    sizeVariant="sm"
                                    error={arrivalErrors.length}
                                />
                                <Input
                                    name="call_sign"
                                    label="Call Sign"
                                    value={newShipCallSign}
                                    onChange={(e) => setNewShipCallSign(e.target.value)}
                                    placeholder="PKSL"
                                    sizeVariant="sm"
                                    error={arrivalErrors.call_sign}
                                />
                            </div>

                            <PhotoUploadPicker
                                label="Foto Kapal (Opsional)"
                                value={newShipImage}
                                onChange={setNewShipImage}
                                mode="both"
                                accept="image/jpeg,image/png,image/webp"
                                maxSizeMb={5}
                                variant="compact"
                                helperText="JPG, PNG, atau WebP. Maksimal 5 MB."
                                error={arrivalErrors.image}
                            />

                            {/* Kunjungan Perdana */}
                            <div className="pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                                <span className="block text-xs font-bold text-[#082870] dark:text-[#38BDF8] mb-2">
                                    Jadwal Kunjungan Perdana
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] mb-1">
                                            Jadwal Kedatangan (ETA) *
                                        </label>
                                        <input
                                            name="eta"
                                            type="datetime-local"
                                            required
                                            value={arrivalEta}
                                            onChange={(e) => setArrivalEta(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#071322] text-[#0B1F63] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                                        />
                                        {arrivalErrors.eta && <p role="alert" className="mt-1 text-[11px] font-semibold text-[#C62840]">{arrivalErrors.eta}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] mb-1">
                                            Pelabuhan Tujuan
                                        </label>
                                        <select
                                            name="port_id"
                                            value={arrivalPortId}
                                            onChange={(e) => setArrivalPortId(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#071322] text-[#0B1F63] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                                        >
                                            {ports.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.code ? `(${p.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </Modal>

            {/* Modal Tambah Perusahaan */}
            <Modal
                isOpen={showAddCompanyModal}
                onClose={() => { setCompanyErrors({}); setShowAddCompanyModal(false); }}
                title="Tambah Perusahaan Pelayaran Baru"
                size="md"
                asBottomSheetOnMobile={true}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setCompanyErrors({}); setShowAddCompanyModal(false); }}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSaveCompany}
                        >
                            Simpan Perusahaan
                        </Button>
                    </>
                }
            >
                <form noValidate onSubmit={handleSaveCompany} className="space-y-3.5">
                    <FormErrorSummary errors={companyErrors} />
                    <Input
                        name="name"
                        label="Nama Resmi Perusahaan Pelayaran"
                        required
                        value={companyFormName}
                        onChange={(e) => setCompanyFormName(e.target.value)}
                        placeholder="Contoh: PT Pelayaran Nusantara Mandiri"
                        sizeVariant="sm"
                        error={companyErrors.name}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            name="code"
                            label="Kode Singkatan"
                            value={companyFormCode}
                            onChange={(e) => setCompanyFormCode(e.target.value)}
                            placeholder="Contoh: PNM"
                            sizeVariant="sm"
                            error={companyErrors.code}
                        />
                        <Input
                            name="phone"
                            label="No. Telepon / PIC"
                            value={companyFormPhone}
                            onChange={(e) => setCompanyFormPhone(e.target.value)}
                            placeholder="031-xxxxxxx"
                            sizeVariant="sm"
                            error={companyErrors.phone}
                        />
                    </div>
                    <Input
                        name="email"
                        label="Email Resmi"
                        type="email"
                        value={companyFormEmail}
                        onChange={(e) => setCompanyFormEmail(e.target.value)}
                        placeholder="ops@pelayaran.co.id"
                        sizeVariant="sm"
                        error={companyErrors.email}
                    />
                    <Input
                        name="address"
                        label="Alamat Kantor"
                        value={companyFormAddress}
                        onChange={(e) => setCompanyFormAddress(e.target.value)}
                        placeholder="Jl. Tanjung Perak Barat..."
                        sizeVariant="sm"
                        error={companyErrors.address}
                    />
                </form>
            </Modal>
        </AppLayout>
    );
}
