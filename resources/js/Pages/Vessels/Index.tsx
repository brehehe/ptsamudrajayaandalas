import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import Modal from '../../Components/overlays/Modal';
import Input from '../../Components/forms/Input';
import Select from '../../Components/selects/Select';

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
    name: string;
    imo_number: string;
    ship_type: string;
    status: string;
    agent_name: string;
    is_active: boolean;
    image?: string;
    eta?: string;
    created_at?: string;
    ship_company_id?: string;
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
    };
    activeStatus: string;
    selectedCompanyId?: string;
    search: string;
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const formatEtaDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return '12 Jan 2026 14:00';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const day = d.getDate().toString().padStart(2, '0');
        const month = MONTHS_ID[d.getMonth()] || 'Jan';
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');

        return `${day} ${month} ${year} ${hours}:${minutes}`;
    } catch {
        return dateStr;
    }
};

export default function VesselsIndex({
    vessels,
    companies = [],
    counts,
    activeStatus = 'Semua',
    selectedCompanyId = '',
    search = '',
}: VesselsIndexProps) {
    // Active Master Module: 'kapal' | 'perusahaan'
    const [activeModule, setActiveModule] = useState<'kapal' | 'perusahaan'>('kapal');

    const [searchTerm, setSearchTerm] = useState(search);
    const [companyFilter, setCompanyFilter] = useState(selectedCompanyId);
    const [sortBy, setSortBy] = useState<'terbaru' | 'nama' | 'eta'>('terbaru');

    // Modal state for Kapal
    const [showAddModal, setShowAddModal] = useState(false);
    const [newShipName, setNewShipName] = useState('');
    const [newShipIMO, setNewShipIMO] = useState('');
    const [newShipType, setNewShipType] = useState('Container Ship');
    const [newShipAgent, setNewShipAgent] = useState('PT Samudra Jaya Andalas');
    const [newShipStatus, setNewShipStatus] = useState('Akan Datang');
    const [newShipCompanyId, setNewShipCompanyId] = useState('');
    const [isNewCompany, setIsNewCompany] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyCode, setNewCompanyCode] = useState('');
    const [newCompanyPhone, setNewCompanyPhone] = useState('');
    const [newCompanyEmail, setNewCompanyEmail] = useState('');
    const [newCompanyAddress, setNewCompanyAddress] = useState('');
    const [newShipEta, setNewShipEta] = useState(
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    );

    // Modal state for Master Perusahaan
    const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
    const [companyFormName, setCompanyFormName] = useState('');
    const [companyFormCode, setCompanyFormCode] = useState('');
    const [companyFormPhone, setCompanyFormPhone] = useState('');
    const [companyFormEmail, setCompanyFormEmail] = useState('');
    const [companyFormAddress, setCompanyFormAddress] = useState('');
    const [companySearchTerm, setCompanySearchTerm] = useState('');

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
        if (sortBy === 'eta') {
            const dateA = a.eta ? new Date(a.eta).getTime() : 0;
            const dateB = b.eta ? new Date(b.eta).getTime() : 0;
            return dateA - dateB;
        }
        return 0; // Default: 'terbaru' from server
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

    // Save Ship (supporting both existing company and creating new company on the fly)
    const handleSaveShip = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newShipName || !newShipIMO) {
            alert('Nama Kapal dan Nomor IMO wajib diisi.');
            return;
        }
        if (isNewCompany && !newCompanyName.trim()) {
            alert('Nama Perusahaan Baru wajib diisi jika memilih opsi Buat Perusahaan Baru.');
            return;
        }

        router.post(
            '/vessels',
            {
                name: newShipName,
                imo_number: newShipIMO,
                ship_type: newShipType,
                agent_name: newShipAgent,
                status: newShipStatus,
                eta: newShipEta ? new Date(newShipEta).toISOString() : null,
                ship_company_id: isNewCompany ? null : (newShipCompanyId || null),
                is_new_company: isNewCompany,
                new_company_name: isNewCompany ? newCompanyName : null,
                new_company_code: isNewCompany ? newCompanyCode : null,
                new_company_phone: isNewCompany ? newCompanyPhone : null,
                new_company_email: isNewCompany ? newCompanyEmail : null,
                new_company_address: isNewCompany ? newCompanyAddress : null,
            },
            {
                onSuccess: () => {
                    setShowAddModal(false);
                    setNewShipName('');
                    setNewShipIMO('');
                    setIsNewCompany(false);
                    setNewCompanyName('');
                    setNewCompanyCode('');
                    setNewCompanyPhone('');
                    setNewCompanyEmail('');
                    setNewCompanyAddress('');
                },
            }
        );
    };

    // Save Company (Master Perusahaan)
    const handleSaveCompany = (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyFormName.trim()) {
            alert('Nama Perusahaan Pelayaran wajib diisi.');
            return;
        }

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
            }
        );
    };

    const tabs = [
        {
            label: 'Semua',
            count: counts.semua,
            value: 'Semua',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12V5h5v7M14 12V7h4v5M12 2v3" />
                </svg>
            ),
        },
        {
            label: 'Akan Datang',
            count: counts.akan_datang,
            value: 'Akan Datang',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m0-14a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 0014 0" />
                </svg>
            ),
        },
        {
            label: 'Labuh',
            count: counts.labuh,
            value: 'Labuh',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m0-14a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 0014 0" />
                </svg>
            ),
        },
        {
            label: 'Sandar',
            count: counts.sandar,
            value: 'Sandar',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
        },
    ];

    // Status pill renderer matching 2. Menu Kapal.png
    // Status pill renderer matching 2. Menu Kapal.png
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'Labuh':
                return (
                    <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF0CC] dark:bg-[#F59E0B]/20 text-[#A65300] dark:text-[#FBBF24] border border-transparent dark:border-[#F59E0B]/30 flex-shrink-0">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 5v14m0-14a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 0014 0" />
                        </svg>
                        Labuh
                    </span>
                );
            case 'Akan Datang':
                return (
                    <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#0057D9] dark:text-[#60A5FA] border border-transparent dark:border-[#0060F4]/30 flex-shrink-0">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                        </svg>
                        Akan Datang
                    </span>
                );
            case 'Sandar':
                return (
                    <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCF7E8] dark:bg-[#10B981]/20 text-[#087443] dark:text-[#34D399] border border-transparent dark:border-[#10B981]/30 flex-shrink-0">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                        </svg>
                        Sandar
                    </span>
                );
            case 'Dalam Proses':
                return (
                    <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFE7D1] dark:bg-[#8B5CF6]/20 text-[#C05621] dark:text-[#C084FC] border border-transparent dark:border-[#8B5CF6]/30 flex-shrink-0">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" clipRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L8.914 5.75c-.378.156-.737.351-1.071.58l-1.848-.952a1.875 1.875 0 00-2.316.488L2.474 7.202a1.875 1.875 0 00.222 2.355l1.455 1.5a7.48 7.48 0 000 1.886l-1.455 1.5a1.875 1.875 0 00-.222 2.355l1.205 1.336a1.875 1.875 0 002.316.488l1.848-.952c.334.229.693.424 1.071.58l.314 1.933c.151.904.933 1.567 1.85 1.567h1.844c.917 0 1.699-.663 1.85-1.567l.314-1.933c.378-.156.737-.351 1.071-.58l1.848.952a1.875 1.875 0 002.316-.488l1.205-1.336a1.875 1.875 0 00-.222-2.355l-1.455-1.5a7.48 7.48 0 000-1.886l1.455-1.5a1.875 1.875 0 00.222-2.355l-1.205-1.336a1.875 1.875 0 00-2.316-.488l-1.848.952a7.472 7.472 0 00-1.071-.58l-.314-1.933A1.875 1.875 0 0012.922 2.25h-1.844zM12 9.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
                        </svg>
                        Dalam Proses
                    </span>
                );
            case 'Selesai':
            default:
                return (
                    <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#0057D9] dark:text-[#60A5FA] border border-transparent dark:border-[#0060F4]/30 flex-shrink-0">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Selesai
                    </span>
                );
        }
    };

    return (
        <AppLayout title="Menu Kapal">
            <Head title="Menu Kapal & Perusahaan — PT Samudra Jaya Andalas" />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4 max-w-7xl mx-auto pb-10"
            >
                {/* ── Top Level Module Segment Switcher: Master Kapal vs Master Perusahaan ── */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#DCEAF8] dark:border-[#1E3A5F]">
                    <div className="flex items-center gap-2 p-1 bg-[#E0F0FF]/60 dark:bg-[#0C1D36] rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] self-start">
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setActiveModule('kapal')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                activeModule === 'kapal'
                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#082870] dark:text-[#94A3B8] hover:bg-white/60 dark:hover:bg-[#132847]'
                            }`}
                        >
                            <span>🚢</span>
                            <span>Master Kapal</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                activeModule === 'kapal' ? 'bg-white/20 text-white' : 'bg-white dark:bg-[#071322] text-[#0060F4] dark:text-[#38BDF8] border border-[#DCEAF8] dark:border-[#1E3A5F]'
                            }`}>
                                {vessels.length}
                            </span>
                        </motion.button>

                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setActiveModule('perusahaan')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                activeModule === 'perusahaan'
                                    ? 'bg-[#082870] dark:bg-[#2563EB] text-white shadow-sm'
                                    : 'text-[#082870] dark:text-[#94A3B8] hover:bg-white/60 dark:hover:bg-[#132847]'
                            }`}
                        >
                            <span>🏢</span>
                            <span>Master Perusahaan</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                activeModule === 'perusahaan' ? 'bg-white/20 text-white' : 'bg-white dark:bg-[#071322] text-[#082870] dark:text-[#F1F5F9] border border-[#DCEAF8] dark:border-[#1E3A5F]'
                            }`}>
                                {companies.length}
                            </span>
                        </motion.button>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeModule === 'kapal' ? (
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex-shrink-0 cursor-pointer"
                            >
                                <span className="text-base leading-none font-bold">+</span>
                                <span>Tambah Kapal Baru</span>
                            </motion.button>
                        ) : (
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAddCompanyModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#082870] dark:bg-[#1E3A5F] hover:bg-[#0D2945] dark:hover:bg-[#285585] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex-shrink-0 cursor-pointer"
                            >
                                <span className="text-base leading-none font-bold">+</span>
                                <span>Tambah Perusahaan Baru</span>
                            </motion.button>
                        )}
                    </div>
                </motion.div>

                {/* ═══════════════════════════════════════════════════════════════
                    VIEW 1: MASTER KAPAL (ARMADA)
                   ═══════════════════════════════════════════════════════════════ */}
                {activeModule === 'kapal' && (
                    <motion.div
                        key="kapal-view"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        {/* ── Title Header ── */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] tracking-tight">
                                    Daftar Armada Kapal
                                </h1>
                                <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                    Data armada operasional keagenan dan perusahaan pemilik kapal
                                </p>
                            </div>

                            {companyFilter && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E0F0FF] dark:bg-[#0C1D36] border border-[#0060F4]/30 dark:border-[#1E3A5F] text-xs text-[#082870] dark:text-[#F1F5F9]">
                                    <span className="text-[#52658E] dark:text-[#94A3B8]">Filter Perusahaan:</span>
                                    <span className="font-bold">
                                        {companies.find((c) => c.id === companyFilter)?.name || 'Perusahaan Terpilih'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCompanyFilterChange('')}
                                        className="text-[#C62840] dark:text-[#F87171] hover:underline font-bold ml-1 cursor-pointer"
                                    >
                                        ✕ Reset
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Search Bar, Company Filter Dropdown, and Sort Dropdown ── */}
                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                            {/* Search Input */}
                            <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C9BB9] dark:text-[#64748B]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Cari nama kapal, nomor IMO, agen, atau perusahaan..."
                                    className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl text-xs sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9] placeholder-[#8C9BB9] dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] dark:focus:border-[#38BDF8] shadow-xs"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            router.get('/vessels', { status: activeStatus, company_id: companyFilter });
                                        }}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8C9BB9] hover:text-[#C62840] dark:hover:text-[#F87171]"
                                    >
                                        ✕
                                    </button>
                                )}
                            </form>

                            {/* Filter Perusahaan Dropdown */}
                            <div className="relative flex-shrink-0 min-w-[200px]">
                                <select
                                    value={companyFilter}
                                    onChange={(e) => handleCompanyFilterChange(e.target.value)}
                                    className="w-full appearance-none bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl pl-8 pr-8 py-2.5 text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] hover:bg-[#F0F8FF] dark:hover:bg-[#132847] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 shadow-xs cursor-pointer"
                                >
                                    <option value="">🏢 Semua Perusahaan ({companies.length})</option>
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id} className="dark:bg-[#0C1D36] dark:text-[#F1F5F9]">
                                            {c.name} {c.code ? `(${c.code})` : ''} — {c.ships_count ?? c.ships?.length ?? 0} Kapal
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs">🏢</span>
                                <svg className="w-3 h-3 text-[#52658E] dark:text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <polyline points="6 9 12 15 18 9" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            {/* Sort Dropdown */}
                            <div className="relative flex-shrink-0">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="appearance-none bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl pl-7 pr-7 py-2.5 text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] hover:bg-[#F0F8FF] dark:hover:bg-[#132847] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 shadow-xs cursor-pointer"
                                >
                                    <option value="terbaru" className="dark:bg-[#0C1D36] dark:text-[#F1F5F9]">Terbaru</option>
                                    <option value="nama" className="dark:bg-[#0C1D36] dark:text-[#F1F5F9]">Nama A-Z</option>
                                    <option value="eta" className="dark:bg-[#0C1D36] dark:text-[#F1F5F9]">Jadwal ETA</option>
                                </select>
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-[#52658E] dark:text-[#94A3B8]">⇅</span>
                                <svg className="w-3 h-3 text-[#52658E] dark:text-[#94A3B8] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <polyline points="6 9 12 15 18 9" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </motion.div>

                        {/* ── Status Tabs Matching 2. Menu Kapal.png ── */}
                        <motion.div variants={itemVariants} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {tabs.map((tab) => {
                                const isActive = activeStatus === tab.value;
                                return (
                                    <motion.button
                                        key={tab.value}
                                        type="button"
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => handleFilterStatus(tab.value)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all select-none shadow-xs cursor-pointer ${
                                            isActive
                                                ? 'bg-[#0060F4] text-white shadow-[#0060F4]/20'
                                                : 'bg-[#F0F8FF] dark:bg-[#0C1D36] text-[#0057D9] dark:text-[#94A3B8] hover:bg-[#E0F0FF] dark:hover:bg-[#132847] border border-[#DCEAF8]/60 dark:border-[#1E3A5F]'
                                        }`}
                                    >
                                        <span className={isActive ? 'text-white' : 'text-[#0060F4] dark:text-[#38BDF8]'}>
                                            {tab.icon}
                                        </span>
                                        <span>{tab.label}</span>
                                        <span
                                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                                isActive
                                                    ? 'bg-white/25 text-white'
                                                    : 'bg-white dark:bg-[#071322] text-[#0057D9] dark:text-[#38BDF8] border border-[#DCEAF8] dark:border-[#1E3A5F]'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </motion.div>

                        {/* ── Vessel Cards List ── */}
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-3"
                        >
                            {sortedVessels.map((vessel) => (
                                <motion.div
                                    key={vessel.id}
                                    variants={itemVariants}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.995 }}
                                    transition={{ duration: 0.16 }}
                                >
                                    <Link
                                        href={`/vessels/${vessel.id}`}
                                        className="block group"
                                    >
                                        <div className="bg-white dark:bg-[#0C1D36] p-3.5 sm:p-4 rounded-[18px] border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-[0_2px_8px_rgba(11,31,99,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] group-hover:border-[#0060F4]/40 dark:group-hover:border-[#38BDF8]/50 group-hover:shadow-[0_4px_16px_rgba(0,96,244,0.08)] transition-all">
                                            <div className="flex items-start gap-3 sm:gap-4">
                                                {/* Left: Vessel Photo */}
                                                <img
                                                    src={vessel.image || '/images/vessel-sarana.jpg'}
                                                    alt={vessel.name}
                                                    className="w-22 h-20 sm:w-28 sm:h-22 rounded-[14px] object-cover flex-shrink-0 border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs"
                                                />

                                                {/* Right: Content Area */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                                                    {/* Row 1: Ship Name + Company Badge + Aktif/Nonaktif */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="text-sm sm:text-base font-bold text-[#0B1F63] dark:text-[#F1F5F9] leading-snug group-hover:text-[#0060F4] dark:group-hover:text-[#38BDF8] transition-colors break-words">
                                                                    {vessel.name}
                                                                </h3>
                                                                {/* Company Badge */}
                                                                {vessel.company ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0060F4] dark:text-[#60A5FA] bg-[#E0F0FF]/90 dark:bg-[#0060F4]/20 px-2 py-0.5 rounded-lg border border-[#BCE0FD] dark:border-[#0060F4]/30">
                                                                        <span>🏢</span>
                                                                        <span>{vessel.company.name}</span>
                                                                        {vessel.company.code && (
                                                                            <span className="font-mono text-[10px] text-[#082870] dark:text-[#93C5FD] font-bold">
                                                                                ({vessel.company.code})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#52658E] dark:text-[#94A3B8] bg-[#F0F8FF] dark:bg-[#071322] px-2 py-0.5 rounded-lg border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                                                        <span>🏢</span>
                                                                        <span>{vessel.agent_name || 'PT Samudra Jaya Andalas'}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Aktif / Nonaktif Badge */}
                                                        <div className="flex-shrink-0">
                                                            {vessel.is_active ? (
                                                                <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCF7E8] dark:bg-[#10B981]/20 text-[#087443] dark:text-[#34D399] border border-transparent dark:border-[#10B981]/30">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#087443] dark:bg-[#34D399]" />
                                                                    Aktif
                                                                </span>
                                                            ) : (
                                                                <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF2F7] dark:bg-[#64748B]/20 text-[#526580] dark:text-[#94A3B8] border border-transparent dark:border-[#64748B]/30">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#526580] dark:bg-[#94A3B8]" />
                                                                    Nonaktif
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Status Badge */}
                                                    <div className="my-1 flex items-center">
                                                        {renderStatusBadge(vessel.status)}
                                                    </div>

                                                    {/* Row 3: Details & Schedule */}
                                                    <div className="hidden sm:flex sm:items-end sm:justify-between gap-2 pt-0.5 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                        <div className="min-w-0 leading-tight space-y-0.5">
                                                            <p className="truncate text-[#52658E] dark:text-[#94A3B8]">
                                                                IMO {vessel.imo_number || '-'} &nbsp;|&nbsp; {vessel.ship_type || 'General Cargo'}
                                                            </p>
                                                            <p className="truncate text-[#52658E] dark:text-[#94A3B8]">
                                                                Agen Pengurus: <span className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{vessel.agent_name || 'PT Samudra Jaya Andalas'}</span>
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                                                            <div>
                                                                <div className="flex items-center justify-end gap-1 font-medium text-[#0B1F63] dark:text-[#F1F5F9] text-[11px]">
                                                                    <svg className="w-3.5 h-3.5 text-[#0060F4] dark:text-[#38BDF8] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                                    </svg>
                                                                    <span className="whitespace-nowrap font-semibold">{formatEtaDateTime(vessel.eta)}</span>
                                                                </div>
                                                                <span className="text-[10px] text-[#8C9BB9] dark:text-[#64748B] block mt-0.5">
                                                                    {vessel.status === 'Selesai' ? 'Departure' : 'ETA / Waktu'}
                                                                </span>
                                                            </div>

                                                            <svg className="w-4 h-4 text-[#8C9BB9] dark:text-[#64748B] group-hover:text-[#0060F4] dark:group-hover:text-[#38BDF8] group-hover:translate-x-0.5 transition-all flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="9 18 15 12 9 6" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    {/* Mobile layout */}
                                                    <div className="sm:hidden space-y-1 text-[11px] text-[#52658E] dark:text-[#94A3B8] pt-0.5">
                                                        <p className="leading-tight text-[#52658E] dark:text-[#94A3B8]">
                                                            IMO {vessel.imo_number || '-'} &nbsp;|&nbsp; {vessel.ship_type || 'General Cargo'}
                                                        </p>

                                                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60 text-[11px]">
                                                            <div className="flex items-center gap-1.5 font-medium text-[#0B1F63] dark:text-[#F1F5F9] min-w-0">
                                                                <svg className="w-3.5 h-3.5 text-[#0060F4] dark:text-[#38BDF8] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                                    <line x1="16" y1="2" x2="16" y2="6" />
                                                                    <line x1="8" y1="2" x2="8" y2="6" />
                                                                    <line x1="3" y1="10" x2="21" y2="10" />
                                                                </svg>
                                                                <span className="whitespace-nowrap font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                                    {formatEtaDateTime(vessel.eta)}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1 text-[#0060F4] dark:text-[#38BDF8] font-semibold text-[11px] flex-shrink-0">
                                                                <span>Lihat</span>
                                                                <svg className="w-3.5 h-3.5 text-[#0060F4] dark:text-[#38BDF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="9 18 15 12 9 6" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>

                        {sortedVessels.length === 0 && (
                            <Card className="p-12 text-center border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                <div className="w-16 h-16 rounded-2xl bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#38BDF8] mx-auto flex items-center justify-center mb-3">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 12V5h5v7M14 12V7h4v5M12 2v3" />
                                    </svg>
                                </div>
                                <h4 className="text-base font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Tidak ada kapal yang ditemukan</h4>
                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1">
                                    Coba ubah kata kunci pencarian, filter perusahaan, atau pilih tab status yang lain.
                                </p>
                            </Card>
                        )}
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    VIEW 2: MASTER PERUSAHAAN (SHIPPING COMPANIES)
                    1 Perusahaan hasMany Kapal
                   ═══════════════════════════════════════════════════════════════ */}
                {activeModule === 'perusahaan' && (
                    <motion.div
                        key="perusahaan-view"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] tracking-tight">
                                    Master Perusahaan Pelayaran
                                </h1>
                                <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                    Daftar perusahaan pemilik / operator armada kapal (1 Perusahaan dapat memiliki banyak kapal)
                                </p>
                            </div>

                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAddCompanyModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#082870] dark:bg-[#1E3A5F] hover:bg-[#0D2945] dark:hover:bg-[#285585] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex-shrink-0 cursor-pointer self-start sm:self-auto"
                            >
                                <span className="text-base leading-none font-bold">+</span>
                                <span>Tambah Perusahaan Baru</span>
                            </motion.button>
                        </div>

                        {/* Search Company */}
                        <div className="relative max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C9BB9] dark:text-[#64748B]">
                                🔍
                            </div>
                            <input
                                type="text"
                                value={companySearchTerm}
                                onChange={(e) => setCompanySearchTerm(e.target.value)}
                                placeholder="Cari nama perusahaan, kode, email, atau telepon..."
                                className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl text-xs sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9] placeholder-[#8C9BB9] dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] dark:focus:border-[#38BDF8] shadow-xs"
                            />
                            {companySearchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setCompanySearchTerm('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8C9BB9] hover:text-[#C62840] dark:hover:text-[#F87171]"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Company Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredCompanies.map((c) => {
                                const shipCount = c.ships_count ?? c.ships?.length ?? 0;
                                const companyShips = c.ships || [];

                                return (
                                    <motion.div
                                        key={c.id}
                                        whileHover={{ y: -3 }}
                                        transition={{ duration: 0.16 }}
                                        className="h-full"
                                    >
                                        <Card className="p-5 border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] h-full flex flex-col justify-between space-y-4 hover:border-[#0060F4]/40 dark:hover:border-[#38BDF8]/50 hover:shadow-md transition-all">
                                            <div>
                                                {/* Header: Company Name + Code */}
                                                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#DCEAF8] dark:border-[#1E3A5F]">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl">🏢</span>
                                                            <h3 className="font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] text-base leading-snug">
                                                                {c.name}
                                                            </h3>
                                                        </div>
                                                        {c.code && (
                                                            <span className="mt-1 inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#60A5FA] border border-[#BCE0FD] dark:border-[#0060F4]/30">
                                                                KODE: {c.code}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCF7E8] dark:bg-[#10B981]/20 text-[#087443] dark:text-[#34D399] border border-transparent dark:border-[#10B981]/30 flex-shrink-0">
                                                        Aktif
                                                    </span>
                                                </div>

                                                {/* Contact Details */}
                                                <div className="space-y-1.5 text-xs text-[#52658E] dark:text-[#94A3B8] pt-3">
                                                    {c.phone && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[#0060F4] dark:text-[#38BDF8]">📞</span>
                                                            <span className="font-mono text-[#0B1F63] dark:text-[#F1F5F9] font-semibold">{c.phone}</span>
                                                        </div>
                                                    )}
                                                    {c.email && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[#0060F4] dark:text-[#38BDF8]">✉️</span>
                                                            <span className="text-[#0B1F63] dark:text-[#F1F5F9] truncate">{c.email}</span>
                                                        </div>
                                                    )}
                                                    {c.address && (
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-[#0060F4] dark:text-[#38BDF8]">📍</span>
                                                            <span className="text-[11px] line-clamp-2 text-[#52658E] dark:text-[#94A3B8]">{c.address}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Armada Kapal Dimiliki (1 Perusahaan -> Banyak Kapal) */}
                                                <div className="pt-3 mt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                                                    <div className="flex items-center justify-between text-xs mb-2">
                                                        <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                            Armada Kapal Terdaftar
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full bg-[#0060F4] text-white text-[11px] font-black">
                                                            {shipCount} Kapal
                                                        </span>
                                                    </div>

                                                    {companyShips.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {companyShips.map((s) => (
                                                                <Link
                                                                    key={s.id}
                                                                    href={`/vessels/${s.id}`}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0F8FF] dark:bg-[#071322] hover:bg-[#E0F0FF] dark:hover:bg-[#132847] text-[#082870] dark:text-[#F1F5F9] border border-[#DCEAF8] dark:border-[#1E3A5F] transition-colors"
                                                                >
                                                                    <span>🚢</span>
                                                                    <span className="truncate max-w-[130px]">{s.name}</span>
                                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-white dark:bg-[#0C1D36] font-bold text-[#0060F4] dark:text-[#38BDF8]">
                                                                        {s.status}
                                                                    </span>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[11px] text-[#8C9BB9] dark:text-[#64748B] italic">
                                                            Belum ada kapal yang terhubung ke perusahaan ini.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action to view all ships of this company */}
                                            <div className="pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCompanyFilter(c.id);
                                                        setActiveModule('kapal');
                                                        router.get('/vessels', { company_id: c.id, status: activeStatus });
                                                    }}
                                                    className="w-full text-center py-2 px-3 rounded-xl bg-[#F0F8FF] dark:bg-[#071322] hover:bg-[#0060F4] dark:hover:bg-[#0060F4] text-[#0060F4] dark:text-[#38BDF8] hover:text-white dark:hover:text-white text-xs font-bold transition-all border border-[#DCEAF8] dark:border-[#1E3A5F] cursor-pointer"
                                                >
                                                    Lihat Armada Kapal ({shipCount}) &rarr;
                                                </button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {filteredCompanies.length === 0 && (
                            <Card className="p-12 text-center border border-[#DCEAF8] dark:border-[#1E3A5F]">
                                <div className="w-16 h-16 rounded-2xl bg-[#E0F0FF] dark:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#38BDF8] mx-auto flex items-center justify-center mb-3 text-2xl">
                                    🏢
                                </div>
                                <h4 className="text-base font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Tidak ada perusahaan yang ditemukan</h4>
                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1">
                                    Coba ubah kata kunci pencarian atau daftarkan perusahaan pelayaran baru.
                                </p>
                            </Card>
                        )}
                    </motion.div>
                )}
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════════
                MODAL 1: TAMBAH KAPAL BARU (Bisa pilih perusahaan / buat perusahaan baru)
               ═══════════════════════════════════════════════════════════════ */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title={
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E0F0FF] text-[#0060F4] flex items-center justify-center text-base">
                            🚢
                        </div>
                        <span>Tambah Kapal Baru</span>
                    </div>
                }
                subtitle="Daftarkan data armada kapal niaga dan hubungkan ke perusahaan pemilik"
                size="md"
                asBottomSheetOnMobile={true}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddModal(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSaveShip}
                        >
                            Simpan Kapal
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSaveShip} className="space-y-3.5">
                    <Input
                        label="Nama Kapal"
                        required
                        value={newShipName}
                        onChange={(e) => setNewShipName(e.target.value)}
                        placeholder="Contoh: KM Samudra Mandiri 01"
                        sizeVariant="sm"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Nomor IMO"
                            required
                            value={newShipIMO}
                            onChange={(e) => setNewShipIMO(e.target.value)}
                            placeholder="7 Digit (mis. 9812345)"
                            sizeVariant="sm"
                        />
                        <Select
                            label="Tipe Kapal"
                            value={newShipType}
                            onChange={(e) => setNewShipType(e.target.value)}
                            sizeVariant="sm"
                            options={[
                                { value: 'Container Ship', label: 'Container Ship' },
                                { value: 'General Cargo', label: 'General Cargo' },
                                { value: 'Oil Tanker', label: 'Oil Tanker' },
                                { value: 'Bulk Carrier', label: 'Bulk Carrier' },
                                { value: 'Tugboat / Barge', label: 'Tugboat / Barge' },
                            ]}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                            label="Status Operasi"
                            value={newShipStatus}
                            onChange={(e) => setNewShipStatus(e.target.value)}
                            sizeVariant="sm"
                            options={[
                                { value: 'Akan Datang', label: 'Akan Datang' },
                                { value: 'Labuh', label: 'Labuh' },
                                { value: 'Sandar', label: 'Sandar' },
                                { value: 'Dalam Proses', label: 'Dalam Proses' },
                                { value: 'Selesai', label: 'Selesai' },
                            ]}
                        />
                        <Input
                            label="Agen Pengurus"
                            value={newShipAgent}
                            onChange={(e) => setNewShipAgent(e.target.value)}
                            placeholder="PT Samudra Jaya Andalas"
                            sizeVariant="sm"
                        />
                    </div>

                    {/* ── Perusahaan Pemilik / Shipping Company Selection ── */}
                    <div className="p-3.5 rounded-2xl bg-[#F0F8FF]/80 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] flex items-center gap-1.5 select-none">
                                <span>🏢</span>
                                <span>Perusahaan Pemilik / Operator Kapal</span>
                            </label>

                            <button
                                type="button"
                                onClick={() => setIsNewCompany(!isNewCompany)}
                                className="text-xs font-bold text-[#0060F4] dark:text-[#38BDF8] hover:underline cursor-pointer"
                            >
                                {isNewCompany ? '← Pilih dari Perusahaan Ada' : '+ Perusahaan Baru'}
                            </button>
                        </div>

                        {!isNewCompany ? (
                            <Select
                                value={newShipCompanyId}
                                onChange={(e) => setNewShipCompanyId(e.target.value)}
                                sizeVariant="sm"
                                placeholder="-- Pilih Perusahaan Pelayaran / Owner --"
                                options={[
                                    { value: '', label: '-- Pilih Perusahaan Pelayaran / Owner --' },
                                    ...companies.map((c) => ({
                                        value: c.id,
                                        label: `${c.name} ${c.code ? `(${c.code})` : ''}`,
                                    })),
                                ]}
                                helperText="Pilih perusahaan yang sudah terdaftar di Master Perusahaan."
                            />
                        ) : (
                            /* Inline New Company Form */
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F]"
                            >
                                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0C1D36] border border-[#BCE0FD] dark:border-[#1E3A5F] space-y-2.5">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#082870] dark:text-[#38BDF8]">
                                        <span>✨</span>
                                        <span>Input Data Perusahaan Baru</span>
                                    </div>

                                    <Input
                                        label="Nama Perusahaan Baru"
                                        required
                                        value={newCompanyName}
                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                        placeholder="Contoh: PT Armada Bahari Nusantara"
                                        sizeVariant="sm"
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <Input
                                            label="Kode Singkatan"
                                            value={newCompanyCode}
                                            onChange={(e) => setNewCompanyCode(e.target.value)}
                                            placeholder="Misal: ABN"
                                            sizeVariant="sm"
                                        />
                                        <Input
                                            label="No. Telepon / PIC"
                                            value={newCompanyPhone}
                                            onChange={(e) => setNewCompanyPhone(e.target.value)}
                                            placeholder="031-xxxxxxx"
                                            sizeVariant="sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <Input
                                            label="Email Resmi"
                                            type="email"
                                            value={newCompanyEmail}
                                            onChange={(e) => setNewCompanyEmail(e.target.value)}
                                            placeholder="ops@perusahaan.co.id"
                                            sizeVariant="sm"
                                        />
                                        <Input
                                            label="Alamat Kantor"
                                            value={newCompanyAddress}
                                            onChange={(e) => setNewCompanyAddress(e.target.value)}
                                            placeholder="Kota / Pelabuhan Asal"
                                            sizeVariant="sm"
                                        />
                                    </div>

                                    <p className="text-[11px] text-[#087443] dark:text-[#34D399] font-medium">
                                        ✓ Perusahaan baru akan otomatis dibuat di Master Perusahaan dan langsung dihubungkan ke kapal ini.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <Input
                        label="Jadwal Kedatangan (ETA)"
                        type="datetime-local"
                        value={newShipEta}
                        onChange={(e) => setNewShipEta(e.target.value)}
                        sizeVariant="sm"
                    />
                </form>
            </Modal>

            {/* ═══════════════════════════════════════════════════════════════
                MODAL 2: TAMBAH MASTER PERUSAHAAN BARU (Mandiri)
               ═══════════════════════════════════════════════════════════════ */}
            <Modal
                isOpen={showAddCompanyModal}
                onClose={() => setShowAddCompanyModal(false)}
                title={
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E0F0FF] text-[#082870] flex items-center justify-center text-base">
                            🏢
                        </div>
                        <span>Tambah Perusahaan Pelayaran Baru</span>
                    </div>
                }
                subtitle="Daftarkan perusahaan pemilik / operator kapal ke dalam Master Perusahaan SJA"
                size="md"
                asBottomSheetOnMobile={true}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddCompanyModal(false)}
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
                <form onSubmit={handleSaveCompany} className="space-y-3.5">
                    <Input
                        label="Nama Resmi Perusahaan Pelayaran"
                        required
                        value={companyFormName}
                        onChange={(e) => setCompanyFormName(e.target.value)}
                        placeholder="Contoh: PT Pelayaran Nusantara Mandiri"
                        sizeVariant="sm"
                        helperText="Nama legal perusahaan sesuai SIUPAL / sertifikat keagenan."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Kode Singkatan Perusahaan"
                            value={companyFormCode}
                            onChange={(e) => setCompanyFormCode(e.target.value)}
                            placeholder="Contoh: PNM"
                            sizeVariant="sm"
                        />
                        <Input
                            label="No. Telepon / WhatsApp PIC"
                            value={companyFormPhone}
                            onChange={(e) => setCompanyFormPhone(e.target.value)}
                            placeholder="031-xxxxxxx / +62..."
                            sizeVariant="sm"
                        />
                    </div>

                    <Input
                        label="Email Resmi Operasional"
                        type="email"
                        value={companyFormEmail}
                        onChange={(e) => setCompanyFormEmail(e.target.value)}
                        placeholder="ops@pelayaran.co.id"
                        sizeVariant="sm"
                    />

                    <Input
                        label="Alamat Kantor / Domisili Pelabuhan"
                        value={companyFormAddress}
                        onChange={(e) => setCompanyFormAddress(e.target.value)}
                        placeholder="Jl. Tanjung Perak Barat, Surabaya"
                        sizeVariant="sm"
                    />
                </form>
            </Modal>
        </AppLayout>
    );
}
