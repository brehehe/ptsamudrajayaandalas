import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import {
    Table,
    TableMobile,
    Pagination,
    Modal,
    Input,
    DateTimePicker,
    MoneyInput,
    Textarea,
    Toggle,
    Select,
    SelectSearch,
    RadioGroup,
    Checkbox,
    FilterBar,
    Card,
    StatCard,
    Chart,
    Button,
    StatusBadge,
    ConfirmDialog,
    AlertToast,
    type AlertToastMessage,
} from '../../Components';

interface SampleVessel {
    id: string;
    name: string;
    imo: string;
    type: string;
    status: string;
    agent: string;
    eta: string;
    dwt: number;
}

const SAMPLE_VESSELS: SampleVessel[] = [
    {
        id: '1',
        name: 'MV AMIGO II',
        imo: '9148207',
        type: 'General Cargo',
        status: 'Akan Datang',
        agent: 'PT Samudra Jaya Andalas',
        eta: '12 Jan 2026, 08:00',
        dwt: 8500,
    },
    {
        id: '2',
        name: 'TB SARANA 09 / BG ANDALAS',
        imo: '9821443',
        type: 'Tug & Barge',
        status: 'Labuh',
        agent: 'PT Samudra Jaya Andalas',
        eta: '11 Jan 2026, 14:30',
        dwt: 3200,
    },
    {
        id: '3',
        name: 'MV KYODO PHOENIX',
        imo: '9320114',
        type: 'Container Ship',
        status: 'Sandar',
        agent: 'PT Samudra Jaya Andalas',
        eta: '10 Jan 2026, 06:15',
        dwt: 14200,
    },
    {
        id: '4',
        name: 'MT OCEAN MARINER',
        imo: '9543128',
        type: 'Oil Tanker',
        status: 'Selesai',
        agent: 'PT Samudra Jaya Andalas',
        eta: '08 Jan 2026, 19:00',
        dwt: 18500,
    },
];

export default function Showcase() {
    // Stat & Chart State
    const [selectedChartType, setSelectedChartType] = useState<'bar' | 'line' | 'donut'>('bar');

    // Filter Bar State
    const [searchVal, setSearchVal] = useState('');
    const [activeChip, setActiveChip] = useState('semua');
    const [activeFilters, setActiveFilters] = useState([
        { key: 'status', label: 'Status', value: 'Semua Status' },
        { key: 'port', label: 'Pelabuhan', value: 'Tanjung Perak' },
    ]);

    // Table State
    const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>(['1']);
    const [sortCol, setSortCol] = useState('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [tableViewMode, setTableViewMode] = useState<'desktop' | 'mobile'>('desktop');

    // Pagination State
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    // Form Controls State
    const [inputText, setInputText] = useState('MV Samudra Nusantara');
    const [dateTimeValue, setDateTimeValue] = useState({ date: '', time: '' });
    const [inputMoney, setInputMoney] = useState('12500000');
    const [textareaVal, setTextareaVal] = useState(
        'Permintaan bunker fresh water 15 ton dan koordinasi clearance in dengan karantina pelabuhan.'
    );
    const [toggleState, setToggleState] = useState(true);
    const [selectVal, setSelectVal] = useState('clearance');
    const [comboboxVal, setComboboxVal] = useState<string | number>('vessel-1');
    const [radioVal, setRadioVal] = useState('urgent');
    const [checkboxVal, setCheckboxVal] = useState(true);
    const [indeterminateVal, setIndeterminateVal] = useState(true);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [demoToast, setDemoToast] = useState<AlertToastMessage | null>(null);
    const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');

    // Chart Data
    const chartData = [
        { label: 'Senin', value: 8, color: '#0060F4' },
        { label: 'Selasa', value: 14, color: '#082870' },
        { label: 'Rabu', value: 19, color: '#19B5F7' },
        { label: 'Kamis', value: 12, color: '#087443' },
        { label: 'Jumat', value: 24, color: '#A65300' },
        { label: 'Sabtu', value: 16, color: '#6840BB' },
        { label: 'Minggu', value: 10, color: '#0060F4' },
    ];

    const donutData = [
        { label: 'Akan Datang', value: 12, color: '#0060F4' },
        { label: 'Labuh (Anchored)', value: 8, color: '#A65300' },
        { label: 'Sandar (Berther)', value: 15, color: '#087443' },
        { label: 'Selesai / Out', value: 25, color: '#52658E' },
    ];

    return (
        <AppLayout title="Komponen SJA — Corporate Maritime Design System">
            <Head title="Showcase Komponen SJA — PT Samudra Jaya Andalas" />

            <div className="space-y-10 max-w-7xl mx-auto pb-16">
                {/* Header Banner */}
                <div
                    className={
                        'rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#0D2945] via-[#082870] ' +
                        'to-[#0060F4] text-white shadow-md relative overflow-hidden'
                    }
                >
                    <div className="relative z-10 space-y-2">
                        <div
                            className={
                                'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 ' +
                                'text-[#19B5F7] text-xs font-bold backdrop-blur-xs'
                            }
                        >
                            <span>⚓ Corporate Maritime Design System</span>
                            <span>•</span>
                            <span>Setup Penuh</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                            Galeri Komponen UI PT Samudra Jaya Andalas
                        </h1>
                        <p className="text-xs sm:text-sm text-[#DCEAF8] max-w-2xl leading-relaxed">
                            Pustaka komponen antarmuka terstandarisasi untuk sistem keagenan kapal.
                            Mendukung desktop dan mobile staf lapangan, validasi interaktif, token
                            maritim, serta aksesibilitas.
                        </p>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* 1. STAT CARDS & METRICS                                  */}
                {/* ======================================================== */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-extrabold text-[#0B1F63]">
                                1. Stat / KPI Cards
                            </h2>
                            <p className="text-xs text-[#52658E]">
                                Ringkasan metrik operasional dan keuangan.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Total Armada Aktif"
                            value="28 Kapal"
                            trend={{ value: '12%', isPositive: true, label: 'vs minggu lalu' }}
                            icon={<span>🚢</span>}
                            iconBg="bg-[#E0F0FF]"
                            iconColor="text-[#0060F4]"
                            sparklineData={[12, 14, 18, 16, 22, 25, 28]}
                        />

                        <StatCard
                            title="Pengajuan Pending"
                            value="7 Berkas"
                            trend={{
                                value: '3 Berkas',
                                isPositive: false,
                                label: 'perlu ACC Titik',
                            }}
                            icon={<span>📋</span>}
                            iconBg="bg-[#FFF0CC]"
                            iconColor="text-[#A65300]"
                            sparklineData={[9, 8, 12, 10, 8, 9, 7]}
                        />

                        <StatCard
                            title="Invoice Reimburse"
                            value="Rp 148,5 Jt"
                            trend={{ value: '8.4%', isPositive: true, label: 'terverifikasi' }}
                            icon={<span>💳</span>}
                            iconBg="bg-[#DCF7E8]"
                            iconColor="text-[#087443]"
                            sparklineData={[90, 110, 105, 120, 135, 140, 148]}
                        />

                        <StatCard
                            title="Kapal Sandar Perak"
                            value="14 Unit"
                            subtext="Pelabuhan Tj. Perak & Gresik"
                            icon={<span>⚓</span>}
                            iconBg="bg-[#EFE7FF]"
                            iconColor="text-[#6840BB]"
                        />
                    </div>
                </section>

                {/* ======================================================== */}
                {/* 2. CHARTS                                                */}
                {/* ======================================================== */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-extrabold text-[#0B1F63]">
                                2. Chart Visualizations
                            </h2>
                            <p className="text-xs text-[#52658E]">
                                Grafik performa kapal, kunjungan, dan distribusi status.
                            </p>
                        </div>

                        {/* Chart Switcher Buttons */}
                        <div
                            className={
                                'inline-flex rounded-xl p-1 bg-[#F0F8FF] border border-[#DCEAF8] ' +
                                'self-start sm:self-auto'
                            }
                        >
                            {(['bar', 'line', 'donut'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setSelectedChartType(t)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                                        selectedChartType === t
                                            ? 'bg-[#0060F4] text-white shadow-xs'
                                            : 'text-[#52658E] hover:text-[#0B1F63]'
                                    }`}
                                >
                                    {t === 'bar'
                                        ? 'Bar Chart'
                                        : t === 'line'
                                          ? 'Line Area'
                                          : 'Donut Ring'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2">
                            <Chart
                                type={selectedChartType === 'donut' ? 'bar' : selectedChartType}
                                data={chartData}
                                title="Aktivitas Pelayanan Kapal Mingguan"
                                subtitle="Jumlah kunjungan dan operasional keagenan harian di pelabuhan"
                                valueSuffix=" Kunjungan"
                                height={240}
                            />
                        </div>

                        <div>
                            <Chart
                                type="donut"
                                data={donutData}
                                title="Komposisi Status Armada"
                                subtitle="Distribusi posisi operasional armada aktif"
                                valueSuffix=" Kapal"
                                height={240}
                            />
                        </div>
                    </div>
                </section>

                {/* ======================================================== */}
                {/* 3. FILTER BAR                                            */}
                {/* ======================================================== */}
                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-extrabold text-[#0B1F63]">
                            3. Filter & FilterBar
                        </h2>
                        <p className="text-xs text-[#52658E]">
                            Kontrol pencarian, chips kategori, dan tag filter aktif.
                        </p>
                    </div>

                    <FilterBar
                        searchValue={searchVal}
                        onSearchChange={setSearchVal}
                        searchPlaceholder="Cari nama kapal, nomor IMO, agen pengurus..."
                        chips={[
                            { id: 'semua', label: 'Semua Kapal', count: 28 },
                            { id: 'datang', label: 'Akan Datang', count: 12 },
                            { id: 'labuh', label: 'Labuh', count: 8 },
                            { id: 'sandar', label: 'Sandar', count: 15 },
                        ]}
                        activeChipId={activeChip}
                        onChipChange={setActiveChip}
                        activeFilters={activeFilters}
                        onRemoveFilter={(key) =>
                            setActiveFilters((prev) => prev.filter((f) => f.key !== key))
                        }
                        onResetFilters={() => setActiveFilters([])}
                        onOpenFilterModal={() => setModalOpen(true)}
                        filterCountBadge={activeFilters.length}
                    />
                </section>

                {/* ======================================================== */}
                {/* 4. TABLE & TABLE MOBILE                                  */}
                {/* ======================================================== */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-extrabold text-[#0B1F63]">
                                4. Table (Desktop) & TableMobile (Staff Lapangan)
                            </h2>
                            <p className="text-xs text-[#52658E]">
                                Tampilan data tabel desktop berfitur lengkap dan mode kartu mobile.
                            </p>
                        </div>

                        {/* Mode View Switcher */}
                        <div
                            className={
                                'inline-flex rounded-xl p-1 bg-[#F0F8FF] border border-[#DCEAF8] ' +
                                'self-start sm:self-auto'
                            }
                        >
                            <button
                                type="button"
                                onClick={() => setTableViewMode('desktop')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    tableViewMode === 'desktop'
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : 'text-[#52658E] hover:text-[#0B1F63]'
                                }`}
                            >
                                <span>🖥️ Desktop Table</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTableViewMode('mobile')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    tableViewMode === 'mobile'
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : 'text-[#52658E] hover:text-[#0B1F63]'
                                }`}
                            >
                                <span>📱 TableMobile (Cards)</span>
                            </button>
                        </div>
                    </div>

                    {tableViewMode === 'desktop' ? (
                        <Table<SampleVessel>
                            data={SAMPLE_VESSELS}
                            keyExtractor={(v) => v.id}
                            selectable
                            selectedKeys={selectedKeys}
                            onSelectRow={(key, checked) => {
                                setSelectedKeys((prev) =>
                                    checked ? [...prev, key] : prev.filter((k) => k !== key)
                                );
                            }}
                            onSelectAll={(checked) => {
                                setSelectedKeys(checked ? SAMPLE_VESSELS.map((v) => v.id) : []);
                            }}
                            sortColumn={sortCol}
                            sortDirection={sortDir}
                            onSort={(col) => {
                                if (sortCol === col) {
                                    setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                                } else {
                                    setSortCol(col);
                                    setSortDir('asc');
                                }
                            }}
                            columns={[
                                {
                                    key: 'name',
                                    header: 'Nama Kapal',
                                    sortable: true,
                                    render: (v) => (
                                        <div>
                                            <span className="font-bold text-[#0B1F63] block">
                                                {v.name}
                                            </span>
                                            <span className="text-[11px] text-[#52658E] font-mono">
                                                IMO: {v.imo}
                                            </span>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'type',
                                    header: 'Tipe Kapal',
                                    sortable: true,
                                    render: (v) => (
                                        <span className="text-xs font-medium">{v.type}</span>
                                    ),
                                },
                                {
                                    key: 'status',
                                    header: 'Status',
                                    render: (v) => (
                                        <StatusBadge
                                            status={v.status}
                                            label={v.status}
                                            showDot
                                            size="sm"
                                        />
                                    ),
                                },
                                {
                                    key: 'eta',
                                    header: 'Estimasi Kedatangan (ETA)',
                                    sortable: true,
                                    render: (v) => (
                                        <span className="text-xs text-[#52658E]">{v.eta}</span>
                                    ),
                                },
                                {
                                    key: 'dwt',
                                    header: 'Kapasitas DWT',
                                    align: 'right',
                                    sortable: true,
                                    render: (v) => (
                                        <span className="font-mono font-bold text-[#0B1F63]">
                                            {v.dwt.toLocaleString('id-ID')} Ton
                                        </span>
                                    ),
                                },
                                {
                                    key: 'actions',
                                    header: 'Aksi',
                                    align: 'center',
                                    render: (v) => (
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setModalOpen(true)}
                                                className={
                                                    'px-2.5 py-1 rounded-lg bg-[#E0F0FF] ' +
                                                    'text-[#0060F4] font-bold text-xs ' +
                                                    'hover:bg-[#0060F4] hover:text-white ' +
                                                    'transition'
                                                }
                                            >
                                                Detail
                                            </button>
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    ) : (
                        <TableMobile<SampleVessel>
                            data={SAMPLE_VESSELS}
                            keyExtractor={(v) => v.id}
                            titleRender={(v) => v.name}
                            subtitleRender={(v) => `IMO: ${v.imo} • ${v.type}`}
                            statusRender={(v) => (
                                <StatusBadge status={v.status} label={v.status} showDot size="sm" />
                            )}
                            imageRender={() => (
                                <div
                                    className={
                                        'w-11 h-11 rounded-xl bg-[#E0F0FF] text-[#0060F4] flex ' +
                                        'items-center justify-center text-lg font-black ' +
                                        'flex-shrink-0 border border-[#DCEAF8]'
                                    }
                                >
                                    🚢
                                </div>
                            )}
                            fields={[
                                {
                                    label: 'ETA Kedatangan',
                                    render: (v) => v.eta,
                                    icon: '🕒',
                                },
                                {
                                    label: 'Kapasitas Muatan',
                                    render: (v) => `${v.dwt.toLocaleString('id-ID')} Ton`,
                                    icon: '⚖️',
                                },
                                {
                                    label: 'Agen Operasional',
                                    render: (v) => v.agent,
                                    fullWidth: true,
                                    icon: '🏢',
                                },
                            ]}
                            actionsRender={(v) => (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setModalOpen(true)}
                                    >
                                        Lihat Detail
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => setModalOpen(true)}
                                    >
                                        + Pengajuan
                                    </Button>
                                </>
                            )}
                        />
                    )}

                    {/* Pagination */}
                    <Pagination
                        currentPage={page}
                        lastPage={4}
                        from={1}
                        to={4}
                        total={28}
                        perPage={perPage}
                        onPageChange={setPage}
                        onPerPageChange={setPerPage}
                    />
                </section>

                {/* ======================================================== */}
                {/* 5. FORM CONTROLS & INPUTS                                */}
                {/* ======================================================== */}
                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-extrabold text-[#0B1F63]">
                            5. Input, DateTimePicker, MoneyInput, Select, Combobox & Toggles
                        </h2>
                        <p className="text-xs text-[#52658E]">
                            Komponen masukan data standar SJA dengan validasi, mata uang, pencarian,
                            dan switch.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-20">
                        {/* Text Input */}
                        <Card className="p-4 sm:p-5 border border-[#DCEAF8] space-y-4">
                            <h3 className="font-bold text-sm text-[#0B1F63]">Input Teks Standar</h3>
                            <Input
                                label="Nama Kapal (Vessel Name)"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Masukkan nama kapal..."
                                leftIcon={<span>🚢</span>}
                                clearable
                                onClear={() => setInputText('')}
                                helperText="Sesuai dokumen sertifikat kebangsaan kapal."
                            />

                            <Input
                                label="Validasi Error Input"
                                value="99999999"
                                onChange={() => {}}
                                error="Nomor IMO harus terdiri dari 7 digit angka resmi."
                            />
                        </Card>

                        {/* Money Input & Textarea */}
                        <Card className="p-4 sm:p-5 border border-[#DCEAF8] space-y-4">
                            <h3 className="font-bold text-sm text-[#0B1F63]">
                                MoneyInput & Textarea
                            </h3>
                            <MoneyInput
                                label="Estimasi Biaya Tambat / Labuh"
                                value={inputMoney}
                                onChange={setInputMoney}
                                helperText="Otomatis diformat standar mata uang Rupiah (IDR)."
                            />

                            <Textarea
                                label="Catatan Tambahan Agen"
                                value={textareaVal}
                                onChange={(e) => setTextareaVal(e.target.value)}
                                rows={2}
                                maxLength={200}
                                showCharCount
                            />
                        </Card>

                        <Card className="space-y-4 border border-[#DCEAF8] p-4 sm:p-5 md:col-span-2 lg:col-span-1">
                            <h3 className="font-bold text-sm text-[#0B1F63]">DateTimePicker</h3>
                            <DateTimePicker
                                id="showcase-schedule"
                                label="Jadwal Dibutuhkan"
                                dateValue={dateTimeValue.date}
                                timeValue={dateTimeValue.time}
                                onDateChange={(date) =>
                                    setDateTimeValue((current) => ({ ...current, date }))
                                }
                                onTimeChange={(time) =>
                                    setDateTimeValue((current) => ({ ...current, time }))
                                }
                                helperText="Tanggal dan waktu dapat diisi tanpa memuat ulang halaman."
                            />
                        </Card>

                        {/* Select & SelectSearch */}
                        <Card className="p-4 sm:p-5 border border-[#DCEAF8] space-y-4">
                            <h3 className="font-bold text-sm text-[#0B1F63]">
                                Select & SelectSearch
                            </h3>
                            <Select
                                label="Kategori Layanan Pelabuhan"
                                value={selectVal}
                                onChange={(e) => setSelectVal(e.target.value)}
                                options={[
                                    { value: 'clearance', label: 'Clearance In & Out' },
                                    { value: 'bunker', label: 'Bunker Fresh Water & BBM' },
                                    { value: 'crew', label: 'Crew Change & Transport' },
                                    { value: 'repair', label: 'Perbaikan Mesin & Las' },
                                ]}
                            />

                            <SelectSearch
                                label="Pilih Kapal (Combobox Live Search)"
                                value={comboboxVal}
                                onChange={setComboboxVal}
                                searchPlaceholder="Ketik nama atau IMO..."
                                options={[
                                    {
                                        value: 'vessel-1',
                                        label: 'MV AMIGO II',
                                        description: 'IMO: 9148207 • General Cargo',
                                        badge: 'Labuh',
                                        icon: '🚢',
                                    },
                                    {
                                        value: 'vessel-2',
                                        label: 'TB SARANA 09',
                                        description: 'IMO: 9821443 • Tug & Barge',
                                        badge: 'Sandar',
                                        icon: '⛵',
                                    },
                                    {
                                        value: 'vessel-3',
                                        label: 'MV KYODO PHOENIX',
                                        description: 'IMO: 9320114 • Container',
                                        badge: 'Akan Datang',
                                        icon: '🚢',
                                    },
                                ]}
                            />
                        </Card>
                    </div>

                    {/* Radio, Checkbox, Toggle Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                        {/* Radio Group Card Variant */}
                        <Card className="p-4 sm:p-5 border border-[#DCEAF8] space-y-3">
                            <h3 className="font-bold text-sm text-[#0B1F63]">
                                Radio Group (Card Variant)
                            </h3>
                            <RadioGroup
                                name="priority"
                                value={radioVal}
                                onChange={setRadioVal}
                                options={[
                                    {
                                        value: 'normal',
                                        label: 'Layanan Rutin',
                                        description: 'Proses verifikasi standar 1x24 jam.',
                                        icon: '🕒',
                                    },
                                    {
                                        value: 'urgent',
                                        label: 'Prioritas Tinggi (Urgent)',
                                        description: 'Kebutuhan mendesak kapal berlayar.',
                                        badge: 'Cepat',
                                        icon: '⚡',
                                    },
                                ]}
                            />
                        </Card>

                        {/* Checkboxes */}
                        <Card className="p-4 sm:p-5 border border-[#DCEAF8] space-y-4">
                            <h3 className="font-bold text-sm text-[#0B1F63]">
                                Checkbox & Indeterminate
                            </h3>
                            <Checkbox
                                checked={checkboxVal}
                                onChange={(e) => setCheckboxVal(e.target.checked)}
                                label="Surat Persetujuan Berlayar (SPB) Valid"
                                description="Telah diperiksa oleh petugas syahbandar terkait."
                            />

                            <Checkbox
                                checked={indeterminateVal}
                                indeterminate={indeterminateVal}
                                onChange={() => setIndeterminateVal(!indeterminateVal)}
                                label="Pilih Parsial (Indeterminate)"
                                description="Sebagian dokumen clearance telah diunggah."
                            />
                        </Card>

                        {/* Toggles & Cards Variant */}
                        <Card className="p-4 sm:p-5 border border-[#DCEAF8] space-y-4">
                            <h3 className="font-bold text-sm text-[#0B1F63]">Toggle Switch</h3>
                            <Toggle
                                checked={toggleState}
                                onChange={setToggleState}
                                label="Notifikasi WhatsApp Staff Lapangan"
                                description="Kirim pembaruan status langsung ke ponsel petugas."
                            />

                            <div className="pt-2 border-t border-[#DCEAF8]">
                                <Button
                                    variant="primary"
                                    size="md"
                                    className="w-full shadow-xs"
                                    onClick={() => setModalOpen(true)}
                                >
                                    Buka Modal Interaktif
                                </Button>
                            </div>
                        </Card>
                    </div>
                </section>

                {/* ======================================================== */}
                {/* 6. MODAL & OVERLAY DEMO                                  */}
                {/* ======================================================== */}
                <section className="space-y-4 rounded-2xl border border-sja-border bg-sja-surface p-5">
                    <h2 className="text-lg font-bold text-[var(--sja-heading)]">
                        Konfirmasi &amp; Alert Toast
                    </h2>
                    <p className="text-sm text-[var(--sja-secondary-text)]">
                        Pratinjau komponen reusable. Tidak mengubah status kapal atau menyimpan data
                        operasional.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button type="button" onClick={() => setConfirmOpen(true)}>
                            Pratinjau konfirmasi
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setDemoToast({
                                    variant: 'error',
                                    message:
                                        'Contoh pesan gagal. Periksa kembali data sebelum mencoba lagi.',
                                })
                            }
                        >
                            Pratinjau toast gagal
                        </Button>
                    </div>
                </section>
                <ConfirmDialog
                    isOpen={confirmOpen}
                    title="Contoh konfirmasi"
                    description="Ini hanya pratinjau. Tidak ada data operasional yang diubah."
                    confirmLabel="Lanjutkan pratinjau"
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={() => {
                        setConfirmOpen(false);
                        setDemoToast({
                            variant: 'success',
                            message: 'Contoh notifikasi berhasil. Tidak ada data yang disimpan.',
                        });
                    }}
                />
                {demoToast && <AlertToast {...demoToast} onClose={() => setDemoToast(null)} />}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title="Detail Pelayanan Kapal — MV AMIGO II"
                    subtitle="Nomor Permintaan: REQ-00246 • Status: Menunggu Verifikasi Titik"
                    size={modalSize}
                    footer={
                        <>
                            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                                Tutup
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    alert('Aksi konfirmasi berhasil dijalankan!');
                                    setModalOpen(false);
                                }}
                            >
                                Konfirmasi & Simpan
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#52658E]">Ukuran Modal:</span>
                            {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                                <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setModalSize(sz)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                        modalSize === sz
                                            ? 'bg-[#0060F4] text-white'
                                            : 'bg-[#F0F8FF] text-[#52658E]'
                                    }`}
                                >
                                    {sz.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F0F8FF] border border-[#DCEAF8] space-y-1.5">
                            <div className="text-xs font-bold text-[#0B1F63]">
                                ℹ Fitur Otomatis Mobile Bottom Sheet
                            </div>
                            <p className="text-xs text-[#52658E] leading-relaxed">
                                Di layar ponsel atau tablet kecil, dialog modal ini otomatis
                                bertransformasi menjadi <strong>Mobile Bottom Sheet Drawer</strong>{' '}
                                dengan animasi tarikan sentuh, memudahkan jempol pengguna lapangan
                                (Pak Prima) saat bertugas di dermaga.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl border border-[#DCEAF8]">
                                <span className="text-[#8C9BB9] text-[11px] block">
                                    Jenis Permintaan
                                </span>
                                <span className="font-bold text-[#0B1F63] mt-0.5 block">
                                    Fresh Water 15 Ton
                                </span>
                            </div>
                            <div className="p-3 rounded-xl border border-[#DCEAF8]">
                                <span className="text-[#8C9BB9] text-[11px] block">
                                    Lokasi Sandar
                                </span>
                                <span className="font-bold text-[#0B1F63] mt-0.5 block">
                                    Dermaga Jamrud Utara
                                </span>
                            </div>
                        </div>
                    </div>
                </Modal>
            </div>
        </AppLayout>
    );
}
