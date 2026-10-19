import React, { FormEvent, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    MapPin,
    RotateCcw,
    Search,
    Ship,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../overlays/Modal';
import Select from '../selects/Select';
import Input from '../forms/Input';

export interface DashboardFilters {
    search?: string;
    ship_id?: string;
    company_id?: string;
    port_id?: string;
    period?: string;
    start_date?: string;
    end_date?: string;
}

export interface DashboardFilterBarProps {
    filters: DashboardFilters;
    ships?: Array<{ id: string; name: string }>;
    companies?: Array<{ id: string; name: string }>;
    ports?: Array<{ id: string; name: string; city?: string }>;
    role?: 'admin' | 'operasional' | 'direktur' | 'owner';
    className?: string;
    isMobile?: boolean;
}

export default function DashboardFilterBar({
    filters,
    ships = [],
    companies = [],
    ports = [],
    role = 'admin',
    className = '',
    isMobile = false,
}: DashboardFilterBarProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal temporary state
    const [modalShipId, setModalShipId] = useState(filters.ship_id || '');
    const [modalCompanyId, setModalCompanyId] = useState(filters.company_id || '');
    const [modalPortId, setModalPortId] = useState(filters.port_id || '');
    const [modalPeriod, setModalPeriod] = useState(filters.period || 'semua');
    const [modalStartDate, setModalStartDate] = useState(filters.start_date || '');
    const [modalEndDate, setModalEndDate] = useState(filters.end_date || '');

    const currentPeriod = filters.period || 'semua';

    const periodOptions = [
        { id: 'semua', label: 'Semua Waktu' },
        { id: 'hari_ini', label: 'Hari Ini' },
        { id: '7_hari', label: '7 Hari' },
        { id: 'bulan_ini', label: 'Bulan Ini' },
    ];

    const searchPlaceholder = useMemo(() => {
        switch (role) {
            case 'operasional':
                return 'Cari kapal atau aktivitas operasional…';
            case 'direktur':
                return 'Cari pengajuan, kapal, atau transaksi…';
            case 'owner':
                return 'Cari transaksi, kapal, atau perusahaan…';
            default:
                return 'Cari kapal, no. job, pengajuan, atau invoice…';
        }
    }, [role]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.ship_id) count++;
        if (filters.company_id) count++;
        if (filters.port_id) count++;
        if (filters.period && filters.period !== 'semua') count++;
        if (filters.start_date || filters.end_date) count++;
        return count;
    }, [filters]);

    const hasAnyFilter = Boolean(
        filters.search ||
        filters.ship_id ||
        filters.company_id ||
        filters.port_id ||
        (filters.period && filters.period !== 'semua') ||
        filters.start_date ||
        filters.end_date
    );

    const navigate = (nextFilters: Partial<DashboardFilters>) => {
        const merged: DashboardFilters = {
            search: search.trim() || undefined,
            ship_id: filters.ship_id || undefined,
            company_id: filters.company_id || undefined,
            port_id: filters.port_id || undefined,
            period: filters.period && filters.period !== 'semua' ? filters.period : undefined,
            start_date: filters.start_date || undefined,
            end_date: filters.end_date || undefined,
            ...nextFilters,
        };

        // Clean empty keys
        const params: Record<string, string> = {};
        if (merged.search) params.search = merged.search;
        if (merged.ship_id) params.ship_id = merged.ship_id;
        if (merged.company_id) params.company_id = merged.company_id;
        if (merged.port_id) params.port_id = merged.port_id;
        if (merged.period && merged.period !== 'semua') params.period = merged.period;
        if (merged.start_date) params.start_date = merged.start_date;
        if (merged.end_date) params.end_date = merged.end_date;

        router.get(route('dashboard'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        navigate({ search: search.trim() || undefined });
    };

    const handlePeriodChipClick = (periodId: string) => {
        navigate({
            period: periodId !== 'semua' ? periodId : undefined,
            start_date: undefined,
            end_date: undefined,
        });
    };

    const openModal = () => {
        setModalShipId(filters.ship_id || '');
        setModalCompanyId(filters.company_id || '');
        setModalPortId(filters.port_id || '');
        setModalPeriod(filters.period || 'semua');
        setModalStartDate(filters.start_date || '');
        setModalEndDate(filters.end_date || '');
        setIsModalOpen(true);
    };

    const handleApplyModal = () => {
        setIsModalOpen(false);
        navigate({
            ship_id: modalShipId || undefined,
            company_id: modalCompanyId || undefined,
            port_id: modalPortId || undefined,
            period: modalPeriod !== 'semua' ? modalPeriod : undefined,
            start_date: modalPeriod === 'custom' && modalStartDate ? modalStartDate : undefined,
            end_date: modalPeriod === 'custom' && modalEndDate ? modalEndDate : undefined,
        });
    };

    const handleResetAll = () => {
        setSearch('');
        setModalShipId('');
        setModalCompanyId('');
        setModalPortId('');
        setModalPeriod('semua');
        setModalStartDate('');
        setModalEndDate('');
        setIsModalOpen(false);
        router.get(route('dashboard'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const shipOptions = useMemo(() => [
        { value: '', label: 'Semua Kapal' },
        ...ships.map((s) => ({ value: s.id, label: s.name })),
    ], [ships]);

    const companyOptions = useMemo(() => [
        { value: '', label: 'Semua Perusahaan / Klien' },
        ...companies.map((c) => ({ value: c.id, label: c.name })),
    ], [companies]);

    const portOptions = useMemo(() => [
        { value: '', label: 'Semua Pelabuhan' },
        ...ports.map((p) => ({ value: p.id, label: p.city ? `${p.name} (${p.city})` : p.name })),
    ], [ports]);

    const modalPeriodOptions = [
        { value: 'semua', label: 'Semua Waktu' },
        { value: 'hari_ini', label: 'Hari Ini' },
        { value: '7_hari', label: '7 Hari Terakhir' },
        { value: 'bulan_ini', label: 'Bulan Ini' },
        { value: 'custom', label: 'Rentang Tanggal Kustom' },
    ];

    // Selected labels for active filter pills
    const selectedShipName = useMemo(
        () => ships.find((s) => s.id === filters.ship_id)?.name,
        [ships, filters.ship_id]
    );
    const selectedCompanyName = useMemo(
        () => companies.find((c) => c.id === filters.company_id)?.name,
        [companies, filters.company_id]
    );
    const selectedPortName = useMemo(
        () => ports.find((p) => p.id === filters.port_id)?.name,
        [ports, filters.port_id]
    );
    const periodLabel = useMemo(() => {
        if (!filters.period || filters.period === 'semua') return null;
        if (filters.period === 'hari_ini') return 'Hari Ini';
        if (filters.period === '7_hari') return '7 Hari Terakhir';
        if (filters.period === 'bulan_ini') return 'Bulan Ini';
        if (filters.period === 'custom') {
            if (filters.start_date && filters.end_date) {
                return `${filters.start_date} s/d ${filters.end_date}`;
            }
            return 'Tanggal Kustom';
        }
        return filters.period;
    }, [filters.period, filters.start_date, filters.end_date]);

    return (
        <Card
            className={`border border-[#DCEAF8] p-3 sm:p-4 dark:border-[#1E3A5F] dark:bg-[#0C1D36] ${className}`}
        >
            <div className="space-y-3">
                {/* Search Bar + Filter Trigger */}
                <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
                    <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1">
                        <Search
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#0060F4] dark:text-[#38BDF8]"
                        />
                        <input
                            type="search"
                            name="search"
                            autoComplete="off"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            aria-label="Cari data dashboard"
                            className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] pl-10 pr-11 text-xs font-semibold text-[#0B1F63] placeholder:text-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/30 sm:text-sm dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    navigate({ search: undefined });
                                }}
                                className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-xl text-[#8C9BB9] hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-[#0060F4] dark:hover:text-[#F87171]"
                                aria-label="Hapus kata kunci pencarian"
                            >
                                <X aria-hidden="true" className="size-4" />
                            </button>
                        )}
                    </form>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            variant={activeFilterCount > 0 ? 'primary' : 'outline'}
                            onClick={openModal}
                            leftIcon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
                            className="h-11 flex-1 px-4 text-xs font-bold sm:flex-none"
                            aria-haspopup="dialog"
                            aria-expanded={isModalOpen}
                        >
                            <span>Filter</span>
                            {activeFilterCount > 0 && (
                                <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-white/25 text-[11px] font-black text-white dark:bg-black/30">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>

                        {hasAnyFilter && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetAll}
                                className="h-11 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                aria-label="Reset semua filter"
                            >
                                <RotateCcw aria-hidden="true" className="mr-1 size-3.5" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Quick Period Chips Row */}
                <div
                    aria-label="Pilihan periode cepat"
                    className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none"
                >
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-[#52658E] dark:text-[#94A3B8]">
                        Periode:
                    </span>
                    {periodOptions.map((opt) => {
                        const isActive = currentPeriod === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handlePeriodChipClick(opt.id)}
                                aria-pressed={isActive}
                                className={`flex min-h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-[#0060F4] ${
                                    isActive
                                        ? 'bg-[#0060F4] text-white shadow-xs dark:bg-[#0060F4]'
                                        : 'border border-[#DCEAF8] bg-white text-[#52658E] hover:border-[#0060F4]/40 hover:bg-[#E0F0FF] hover:text-[#082870] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#94A3B8] dark:hover:bg-[#132847] dark:hover:text-white'
                                }`}
                            >
                                <span>{opt.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Active Filter Tags */}
                {hasAnyFilter && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-[#DCEAF8]/60 pt-2.5 text-xs dark:border-[#1E3A5F]/60">
                        <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                            Filter aktif:
                        </span>

                        {filters.search && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-2.5 py-1 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                Cari: “{filters.search}”
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        navigate({ search: undefined });
                                    }}
                                    className="ml-0.5 text-[#0060F4] hover:text-rose-600 dark:text-[#38BDF8] dark:hover:text-rose-400"
                                    aria-label="Hapus filter pencarian"
                                >
                                    ✕
                                </button>
                            </span>
                        )}

                        {selectedShipName && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-2.5 py-1 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                <Ship aria-hidden="true" className="size-3" />
                                Kapal: {selectedShipName}
                                <button
                                    type="button"
                                    onClick={() => navigate({ ship_id: undefined })}
                                    className="ml-0.5 text-[#0060F4] hover:text-rose-600 dark:text-[#38BDF8] dark:hover:text-rose-400"
                                    aria-label="Hapus filter kapal"
                                >
                                    ✕
                                </button>
                            </span>
                        )}

                        {selectedCompanyName && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-2.5 py-1 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                <Building2 aria-hidden="true" className="size-3" />
                                Klien: {selectedCompanyName}
                                <button
                                    type="button"
                                    onClick={() => navigate({ company_id: undefined })}
                                    className="ml-0.5 text-[#0060F4] hover:text-rose-600 dark:text-[#38BDF8] dark:hover:text-rose-400"
                                    aria-label="Hapus filter klien"
                                >
                                    ✕
                                </button>
                            </span>
                        )}

                        {selectedPortName && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-2.5 py-1 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                <MapPin aria-hidden="true" className="size-3" />
                                Pelabuhan: {selectedPortName}
                                <button
                                    type="button"
                                    onClick={() => navigate({ port_id: undefined })}
                                    className="ml-0.5 text-[#0060F4] hover:text-rose-600 dark:text-[#38BDF8] dark:hover:text-rose-400"
                                    aria-label="Hapus filter pelabuhan"
                                >
                                    ✕
                                </button>
                            </span>
                        )}

                        {periodLabel && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-2.5 py-1 text-[11px] font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                <Calendar aria-hidden="true" className="size-3" />
                                Periode: {periodLabel}
                                <button
                                    type="button"
                                    onClick={() => navigate({ period: undefined, start_date: undefined, end_date: undefined })}
                                    className="ml-0.5 text-[#0060F4] hover:text-rose-600 dark:text-[#38BDF8] dark:hover:text-rose-400"
                                    aria-label="Hapus filter periode"
                                >
                                    ✕
                                </button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Filter Modal / Bottom Sheet */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Filter Dashboard"
                subtitle="Sesuaikan data dan metrik dashboard berdasarkan kriteria operasional"
                size="md"
                asBottomSheetOnMobile={true}
                footer={
                    <div className="flex w-full items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setModalShipId('');
                                setModalCompanyId('');
                                setModalPortId('');
                                setModalPeriod('semua');
                                setModalStartDate('');
                                setModalEndDate('');
                            }}
                            className="text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        >
                            Reset Pilihan
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleApplyModal}
                                className="text-xs font-bold"
                            >
                                Terapkan Filter
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="space-y-4 py-1">
                    {/* Filter Kapal */}
                    <div>
                        <Select
                            label="Pilih Kapal"
                            value={modalShipId}
                            onChange={(e) => setModalShipId(e.target.value)}
                            options={shipOptions}
                        />
                    </div>

                    {/* Filter Perusahaan/Klien */}
                    {role !== 'operasional' && (
                        <div>
                            <Select
                                label="Pilih Perusahaan / Klien"
                                value={modalCompanyId}
                                onChange={(e) => setModalCompanyId(e.target.value)}
                                options={companyOptions}
                            />
                        </div>
                    )}

                    {/* Filter Pelabuhan */}
                    <div>
                        <Select
                            label="Pilih Pelabuhan"
                            value={modalPortId}
                            onChange={(e) => setModalPortId(e.target.value)}
                            options={portOptions}
                        />
                    </div>

                    {/* Filter Periode */}
                    <div>
                        <Select
                            label="Periode Waktu"
                            value={modalPeriod}
                            onChange={(e) => setModalPeriod(e.target.value)}
                            options={modalPeriodOptions}
                        />
                    </div>

                    {/* Custom Date Range if custom is selected */}
                    {modalPeriod === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] mb-1.5">
                                    Tanggal Mulai
                                </label>
                                <input
                                    type="date"
                                    value={modalStartDate}
                                    onChange={(e) => setModalStartDate(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-white px-3 text-xs text-[#0B1F63] focus-visible:border-[#0060F4] focus-visible:outline-none dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] mb-1.5">
                                    Tanggal Selesai
                                </label>
                                <input
                                    type="date"
                                    value={modalEndDate}
                                    onChange={(e) => setModalEndDate(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-white px-3 text-xs text-[#0B1F63] focus-visible:border-[#0060F4] focus-visible:outline-none dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </Card>
    );
}
