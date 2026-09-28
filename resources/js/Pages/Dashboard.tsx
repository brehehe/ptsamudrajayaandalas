import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import AppLayout from '../Layouts/AppLayout';
import Card from '../Components/ui/Card';
import Button from '../Components/ui/Button';
import StatusBadge from '../Components/ui/StatusBadge';
import Table, { Column } from '../Components/tables/Table';
import { PageProps } from '@/types';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
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

interface DashboardProps {
    kpi: {
        kapal_aktif: number;
        ships_by_status: Record<string, number>;
        total_pengajuan: number;
        requests_by_status: Record<string, number>;
        total_nilai_pengajuan?: string;
        pendapatan_diterima?: number;
        total_pendapatan_diterima?: number;
        total_piutang?: number;
        total_invoiced?: number;
        collection_rate?: number;
        kapal_sandar_hari_ini: number;
    };
    latest_requests: Array<{
        id: string;
        request_number: string;
        date: string;
        time: string;
        ship_name: string;
        ship_imo: string;
        notes: string;
        status: string;
        estimated_cost: number;
    }>;
    attention_ships: Array<{
        id: string;
        name: string;
        status: string;
        status_type?: string;
        imo: string;
        type: string;
        port: string;
        date_range?: string;
        image_url?: string;
        dock_days?: string;
        needs_count?: number;
    }>;
    schedules: Array<{
        time: string;
        ship_name: string;
        status: string;
    }>;
    notifications?: Array<{
        id: number;
        title: string;
        detail: string;
        time: string;
        icon: string;
        color: string;
        bg: string;
    }>;
    activity_chart?: {
        period: string;
        days: string[];
        data: Array<{ day: string; dibuat: number; disetujui: number; diproses: number; selesai: number }>;
        metrics: {
            dibuat: { count: number; trend: string; is_up: boolean };
            disetujui: { count: number; trend: string; is_up: boolean };
            diproses: { count: number; trend: string; is_up: boolean };
            selesai: { count: number; trend: string; is_up: boolean };
        };
    };
    needs_today?: Array<{
        kapal: string;
        kebutuhan: string;
        jumlah: string;
        jadwal: string;
        status: string;
        pengajuan: string;
    }>;
    my_requests_stats: {
        total: number;
        menunggu: number;
        diproses: number;
        disetujui: number;
    };
    ships: Array<{
        id: string;
        name: string;
        status: string;
        imo_number: string;
    }>;
    financial_overview?: {
        total_invoiced: number;
        total_collected: number;
        total_outstanding: number;
        collection_rate: number;
        aging: {
            current: number;
            overdue_30: number;
            overdue_60: number;
            total: number;
        };
        chart: {
            months: string[];
            data: Array<{
                month: string;
                invoiced: number;
                collected: number;
                outstanding: number;
            }>;
        };
        recent_invoices: Array<{
            id: string;
            invoice_number: string;
            invoice_type: string;
            company_name: string;
            ship_name: string;
            invoice_date: string;
            due_date: string;
            is_overdue: boolean;
            grand_total: number;
            paid_amount: number;
            outstanding_amount: number;
            status: string;
        }>;
    };
    summary_today?: {
        kapal_hari_ini: number;
        aktivitas_hari_ini: number;
        kebutuhan_menunggu: number;
        pengajuan_diproses: number;
    };
    today_ships?: Array<{
        id: string;
        name: string;
        status: string;
        status_variant?: 'success' | 'info' | 'waiting' | 'processing';
        eta: string;
        port: string;
        image_url: string;
    }>;
    recent_activities?: Array<{
        id: number;
        time: string;
        title: string;
        subtitle: string;
        type: string;
        color: string;
        bg: string;
        link: string;
    }>;
    submission_info?: {
        count: number;
        title: string;
        subtitle: string;
        action_text: string;
        action_url: string;
    };
    prima_header?: {
        greeting: string;
        user_name: string;
        role_name: string;
        date: string;
        location: string;
        temperature: string;
        weather: string;
        quote: string;
        banner_image: string;
    };
}

export default function Dashboard({
    kpi,
    latest_requests,
    attention_ships,
    schedules,
    notifications = [],
    activity_chart,
    needs_today = [],
    my_requests_stats,
    ships,
    financial_overview,
    summary_today,
    today_ships = [],
    recent_activities = [],
    submission_info,
    prima_header,
}: DashboardProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;
    const isPakPrima = user?.email?.includes('prima') || user?.name?.includes('Prima');

    const [requestTab, setRequestTab] = useState<'semua' | 'menunggu' | 'proses' | 'selesai'>('semua');
    const [invoiceTab, setInvoiceTab] = useState<'semua' | 'piutang' | 'lunas' | 'agency' | 'reimburse'>('semua');
    const [needsShipFilter, setNeedsShipFilter] = useState('Semua (12)');

    // ── Real-Time Header Data (Tanggal, Jam, Cuaca, Lokasi) ──
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [dateDisplayMode, setDateDisplayMode] = useState<'date' | 'time' | 'full'>('date');
    const [weatherData, setWeatherData] = useState<{
        temp: string;
        weather: string;
        icon: string;
        isLive: boolean;
    }>({
        temp: prima_header?.temperature || '28°C',
        weather: prima_header?.weather || 'Cerah Berawan',
        icon: '🌤️',
        isLive: false,
    });
    const [locationName, setLocationName] = useState<string>(prima_header?.location || 'Pelabuhan Gresik');
    const [isGpsActive, setIsGpsActive] = useState<boolean>(false);

    // Live Clock Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Real-Time Indonesian Date Formatter
    const liveDateFormatted = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(currentTime);

    const liveFullDateFormatted = new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(currentTime);

    const liveTimeFormatted = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(currentTime) + ' WIB';

    // Dynamic Greeting based on real-time hour
    const liveHour = currentTime.getHours();
    const liveGreeting = liveHour >= 4 && liveHour < 11
        ? 'Selamat Pagi,'
        : liveHour >= 11 && liveHour < 15
        ? 'Selamat Siang,'
        : liveHour >= 15 && liveHour < 18
        ? 'Selamat Sore,'
        : 'Selamat Malam,';

    // Real-Time Weather Fetch via Open-Meteo API (Pelabuhan Gresik coords: -7.1566, 112.6555)
    useEffect(() => {
        let isMounted = true;
        const fetchWeather = async () => {
            try {
                const response = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=-7.1566&longitude=112.6555&current=temperature_2m,weather_code,is_day'
                );
                if (!response.ok) return;
                const data = await response.json();
                if (!isMounted || !data?.current) return;

                const code = data.current.weather_code;
                const isDay = data.current.is_day === 1;
                const temp = `${Math.round(data.current.temperature_2m)}°C`;

                let weatherLabel = 'Cerah Berawan';
                let weatherIcon = '🌤️';

                if (code === 0) {
                    weatherLabel = 'Cerah';
                    weatherIcon = isDay ? '☀️' : '🌙';
                } else if (code === 1 || code === 2) {
                    weatherLabel = 'Cerah Berawan';
                    weatherIcon = isDay ? '🌤️' : '☁️';
                } else if (code === 3) {
                    weatherLabel = 'Berawan';
                    weatherIcon = '☁️';
                } else if (code === 45 || code === 48) {
                    weatherLabel = 'Berkabut';
                    weatherIcon = '🌫️';
                } else if (code >= 51 && code <= 55) {
                    weatherLabel = 'Gerimis Ringan';
                    weatherIcon = '🌦️';
                } else if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
                    weatherLabel = 'Hujan';
                    weatherIcon = '🌧️';
                } else if (code >= 95) {
                    weatherLabel = 'Hujan Petir';
                    weatherIcon = '⛈️';
                }

                setWeatherData({
                    temp,
                    weather: weatherLabel,
                    icon: weatherIcon,
                    isLive: true,
                });
            } catch (err) {
                // Silently fallback to server props
            }
        };

        fetchWeather();
        const weatherInterval = setInterval(fetchWeather, 10 * 60 * 1000);
        return () => {
            isMounted = false;
            clearInterval(weatherInterval);
        };
    }, []);

    // Real-Time Geolocation Check
    useEffect(() => {
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                () => {
                    setIsGpsActive(true);
                },
                () => {
                    setIsGpsActive(false);
                },
                { timeout: 5000, maximumAge: 300000 }
            );
        }
    }, []);

    // Fallback notifications if empty
    const activeNotifications = notifications.length > 0 ? notifications : [
        {
            id: 1,
            title: 'Pengajuan baru',
            detail: 'REQ-00245 - MT Amigo Solar 200 Liter',
            time: '10:24',
            icon: 'check',
            color: '#0060F4',
            bg: '#E0F0FF',
        },
        {
            id: 2,
            title: 'Kapal MT Amigo sandar hari ini',
            detail: '12 Jan 2026, 08:00',
            time: '08:00',
            icon: 'anchor',
            color: '#A65300',
            bg: '#FFF0CC',
        },
        {
            id: 3,
            title: 'Vendor sudah konfirmasi',
            detail: 'Fresh Water 20 Ton - MT Kyodo',
            time: '09:17',
            icon: 'check-circle',
            color: '#087443',
            bg: '#DCF7E8',
        },
        {
            id: 4,
            title: 'Invoice dari vendor diterima',
            detail: 'INV-00012 - PT Sumber Rejeki',
            time: '08:45',
            icon: 'file',
            color: '#6840BB',
            bg: '#EFE7FF',
        },
        {
            id: 5,
            title: 'Jadwal keberangkatan',
            detail: 'KM Lestari Jaya 12 Jan 2026, 16:00',
            time: '08:30',
            icon: 'calendar',
            color: '#0060F4',
            bg: '#E0F0FF',
        },
    ];

    // Fallback activity chart data
    const chartData = activity_chart || {
        period: '7 Hari Terakhir',
        days: ['6 Jan', '7 Jan', '8 Jan', '9 Jan', '10 Jan', '11 Jan', '12 Jan'],
        data: [
            { day: '6 Jan', dibuat: 5, disetujui: 4, diproses: 3, selesai: 6 },
            { day: '7 Jan', dibuat: 8, disetujui: 6, diproses: 4, selesai: 9 },
            { day: '8 Jan', dibuat: 10, disetujui: 8, diproses: 6, selesai: 12 },
            { day: '9 Jan', dibuat: 12, disetujui: 10, diproses: 7, selesai: 15 },
            { day: '10 Jan', dibuat: 14, disetujui: 12, diproses: 8, selesai: 19 },
            { day: '11 Jan', dibuat: 16, disetujui: 14, diproses: 10, selesai: 23 },
            { day: '12 Jan', dibuat: 18, disetujui: 16, diproses: 9, selesai: 28 },
        ],
        metrics: {
            dibuat: { count: 18, trend: '↑ 12%', is_up: true },
            disetujui: { count: 16, trend: '↑ 8%', is_up: true },
            diproses: { count: 9, trend: '↓ 5%', is_up: false },
            selesai: { count: 28, trend: '↑ 20%', is_up: true },
        },
    };

    // Filter requests based on active tab
    const filteredRequests = latest_requests.filter((r) => {
        if (requestTab === 'menunggu') return r.status.toLowerCase().includes('menunggu');
        if (requestTab === 'proses') return r.status.toLowerCase().includes('proses') || r.status.toLowerCase().includes('vendor');
        if (requestTab === 'selesai') return r.status.toLowerCase().includes('selesai');
        return true;
    });

    // Needs today list
    const activeNeedsToday = needs_today.length > 0 ? needs_today : [
        {
            kapal: 'MT Amigo',
            kebutuhan: 'Solar',
            jumlah: '200 Liter',
            jadwal: 'Hari ini',
            status: 'Diproses',
            pengajuan: 'REQ-00245',
        },
        {
            kapal: 'MT Amigo',
            kebutuhan: 'Fresh Water',
            jumlah: '8 Ton',
            jadwal: 'Hari ini',
            status: 'Menunggu Approval',
            pengajuan: 'REQ-00246',
        },
        {
            kapal: 'MT Amigo',
            kebutuhan: 'Perahu',
            jumlah: '1 Unit',
            jadwal: 'Sore',
            status: 'Dalam Proses',
            pengajuan: 'REQ-00247',
        },
        {
            kapal: 'MV Ocean Star',
            kebutuhan: 'Clearance',
            jumlah: '1 Paket',
            jadwal: 'Hari ini',
            status: 'Selesai',
            pengajuan: 'REQ-00242',
        },
        {
            kapal: 'MV Ocean Star',
            kebutuhan: 'Bahan Makanan',
            jumlah: '1 Paket',
            jadwal: 'Hari ini',
            status: 'Dalam Proses',
            pengajuan: 'REQ-00248',
        },
    ];

    const filteredNeeds = activeNeedsToday.filter((item) => {
        if (needsShipFilter.startsWith('MT Amigo')) return item.kapal.includes('MT Amigo');
        if (needsShipFilter.startsWith('MV Ocean Star')) return item.kapal.includes('MV Ocean Star');
        if (needsShipFilter.startsWith('KM Sarana Lintas')) return item.kapal.includes('KM Sarana Lintas');
        if (needsShipFilter.startsWith('Lainnya')) return !item.kapal.includes('MT Amigo') && !item.kapal.includes('MV Ocean Star');
        return true;
    });

    const requestColumns: Column<DashboardProps['latest_requests'][0]>[] = [
        {
            key: 'request_number',
            header: 'No. Pengajuan',
            width: '14%',
            render: (req) => (
                <span className="font-bold text-[#0060F4] text-xs whitespace-nowrap">
                    {req.request_number}
                </span>
            ),
        },
        {
            key: 'date',
            header: 'Tanggal',
            width: '13%',
            render: (req) => (
                <div className="whitespace-nowrap text-[#52658E] text-[11px] leading-tight">
                    <div>{req.date}</div>
                    <div className="text-[9.5px] text-[#8C9BB9]">{req.time}</div>
                </div>
            ),
        },
        {
            key: 'ship_name',
            header: 'Kapal',
            width: '16%',
            render: (req) => (
                <span className="font-semibold text-[#0B1F63] text-xs truncate block" title={req.ship_name}>
                    {req.ship_name}
                </span>
            ),
        },
        {
            key: 'notes',
            header: 'Kebutuhan',
            width: '17%',
            render: (req) => (
                <span className="text-[#52658E] text-xs truncate block" title={req.notes}>
                    {req.notes}
                </span>
            ),
        },
        {
            key: 'amount',
            header: 'Jumlah',
            align: 'center',
            width: '7%',
            render: () => <span className="text-[#52658E] text-xs">—</span>,
        },
        {
            key: 'estimated_cost',
            header: 'Nilai Estimasi',
            width: '16%',
            render: (req) => (
                <span className="font-semibold text-[#0B1F63] text-xs whitespace-nowrap">
                    Rp {req.estimated_cost?.toLocaleString('id-ID') || '2.150.000'}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '13%',
            render: (req) => (
                <StatusBadge status={req.status} label={req.status} size="sm" />
            ),
        },
        {
            key: 'actions',
            header: 'Aksi',
            align: 'right',
            width: '4%',
            render: () => (
                <button className="text-[#8C9BB9] hover:text-[#0060F4] font-bold p-1 rounded">
                    •••
                </button>
            ),
        },
    ];

    const needsColumns: Column<NonNullable<DashboardProps['needs_today']>[0]>[] = [
        {
            key: 'kapal',
            header: 'Kapal',
            width: '18%',
            render: (item) => (
                <span className="font-semibold text-[#0B1F63] text-xs truncate block" title={item.kapal}>
                    {item.kapal}
                </span>
            ),
        },
        {
            key: 'kebutuhan',
            header: 'Kebutuhan',
            width: '18%',
            render: (item) => (
                <span className="text-[#52658E] text-xs truncate block" title={item.kebutuhan}>
                    {item.kebutuhan}
                </span>
            ),
        },
        {
            key: 'jumlah',
            header: 'Jumlah',
            width: '13%',
            render: (item) => (
                <span className="font-semibold text-[#0B1F63] text-xs whitespace-nowrap">
                    {item.jumlah}
                </span>
            ),
        },
        {
            key: 'jadwal',
            header: 'Jadwal',
            width: '12%',
            render: (item) => <span className="text-[#52658E] text-xs whitespace-nowrap">{item.jadwal}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            width: '18%',
            render: (item) => (
                <StatusBadge status={item.status} label={item.status} size="sm" />
            ),
        },
        {
            key: 'pengajuan',
            header: 'Pengajuan',
            width: '16%',
            render: (item) => (
                <Link href="/requests" className="font-bold text-[#0060F4] hover:underline whitespace-nowrap text-xs">
                    {item.pengajuan}
                </Link>
            ),
        },
        {
            key: 'actions',
            header: 'Aksi',
            align: 'right',
            width: '5%',
            render: () => (
                <button className="text-[#8C9BB9] hover:text-[#0060F4] font-bold p-1 rounded">
                    •••
                </button>
            ),
        },
    ];

    const defaultFinancial = {
        total_invoiced: 180700000,
        total_collected: 45200000,
        total_outstanding: 135500000,
        collection_rate: 25.0,
        aging: {
            current: 124500000,
            overdue_30: 11000000,
            overdue_60: 0,
            total: 135500000,
        },
        chart: {
            months: ['Agt 2025', 'Sep 2025', 'Okt 2025', 'Nov 2025', 'Des 2025', 'Jan 2026'],
            data: [
                { month: 'Agt', invoiced: 125.0, collected: 110.0, outstanding: 15.0 },
                { month: 'Sep', invoiced: 140.0, collected: 135.0, outstanding: 5.0 },
                { month: 'Okt', invoiced: 155.0, collected: 142.0, outstanding: 13.0 },
                { month: 'Nov', invoiced: 165.0, collected: 150.0, outstanding: 15.0 },
                { month: 'Des', invoiced: 195.0, collected: 175.0, outstanding: 20.0 },
                { month: 'Jan', invoiced: 180.7, collected: 45.2, outstanding: 135.5 },
            ],
        },
        recent_invoices: [],
    };

    const financial = financial_overview || defaultFinancial;

    const formatRupiah = (val: number) => {
        return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
    };

    const filteredInvoices = (financial.recent_invoices || []).filter((inv) => {
        if (invoiceTab === 'piutang') return inv.outstanding_amount > 0;
        if (invoiceTab === 'lunas') return inv.status === 'paid' || inv.outstanding_amount === 0;
        if (invoiceTab === 'agency') return inv.invoice_type?.toLowerCase() === 'agency';
        if (invoiceTab === 'reimburse') return inv.invoice_type?.toLowerCase() === 'reimburse';
        return true;
    });

    const invoiceColumns: Column<NonNullable<DashboardProps['financial_overview']>['recent_invoices'][0]>[] = [
        {
            key: 'invoice_number',
            header: 'No. Faktur',
            width: '15%',
            render: (inv) => (
                <div>
                    <Link
                        href="/invoices"
                        className="font-bold text-[#0060F4] text-xs hover:underline block"
                    >
                        {inv.invoice_number}
                    </Link>
                    <span className="text-[10px] text-[#8C9BB9] uppercase tracking-wider font-semibold">
                        {inv.invoice_type === 'agency' ? 'Keagenan / Jasa' : 'Reimburse'}
                    </span>
                </div>
            ),
        },
        {
            key: 'company_name',
            header: 'Klien / Perusahaan',
            width: '20%',
            render: (inv) => (
                <div className="min-w-0 pr-2">
                    <span className="font-semibold text-[#0B1F63] text-xs truncate block" title={inv.company_name}>
                        {inv.company_name}
                    </span>
                    <span className="text-[10.5px] text-[#52658E] truncate block mt-0.5" title={inv.ship_name}>
                        Armada: {inv.ship_name}
                    </span>
                </div>
            ),
        },
        {
            key: 'invoice_date',
            header: 'Tanggal & Jatuh Tempo',
            width: '17%',
            render: (inv) => (
                <div className="text-[11px] leading-tight text-[#52658E]">
                    <div className="font-medium text-[#0B1F63]">{inv.invoice_date}</div>
                    <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${inv.is_overdue ? 'text-[#C62840] font-bold' : 'text-[#8C9BB9]'}`}>
                        <span>Tempo: {inv.due_date}</span>
                        {inv.is_overdue && (
                            <span className="bg-[#FFE7EC] text-[#C62840] text-[9px] px-1 py-0.2 rounded font-bold">
                                Overdue
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'grand_total',
            header: 'Total Tagihan',
            width: '14%',
            render: (inv) => (
                <span className="font-semibold text-[#0B1F63] text-xs whitespace-nowrap">
                    {formatRupiah(inv.grand_total)}
                </span>
            ),
        },
        {
            key: 'paid_amount',
            header: 'Kas Diterima',
            width: '13%',
            render: (inv) => (
                <span className="font-medium text-[#087443] text-xs whitespace-nowrap">
                    {formatRupiah(inv.paid_amount)}
                </span>
            ),
        },
        {
            key: 'outstanding_amount',
            header: 'Sisa Piutang',
            width: '14%',
            render: (inv) => (
                <span className={`text-xs whitespace-nowrap font-bold ${inv.outstanding_amount > 0 ? 'text-[#C62840]' : 'text-[#087443]'}`}>
                    {inv.outstanding_amount > 0 ? formatRupiah(inv.outstanding_amount) : 'Lunas (Rp 0)'}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '11%',
            render: (inv) => {
                const isPaid = inv.status === 'paid' || inv.outstanding_amount === 0;
                const isSent = inv.status === 'sent';
                return (
                    <StatusBadge
                        status={isPaid ? 'Selesai' : (isSent ? 'Diproses' : 'Menunggu Approval')}
                        label={isPaid ? 'Lunas' : (isSent ? 'Terkirim' : 'Rilis')}
                        size="sm"
                    />
                );
            },
        },
        {
            key: 'actions',
            header: 'Aksi',
            align: 'right',
            width: '5%',
            render: () => (
                <Link
                    href="/invoices"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] text-[#0060F4] hover:bg-[#E0F0FF] transition-colors"
                    title="Buka Faktur"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </Link>
            ),
        },
    ];

    return (
        <AppLayout title="Operational Control Center" transparentMobileHeader={true}>
            <Head title="Operational Control Center — PT Samudra Jaya Andalas" />

            {/* =========================================================================
                DESKTOP VIEW (Bu Titik - Operational Control Center)
               ========================================================================= */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="hidden md:block space-y-5"
            >
                {/* Hero Welcome Banner */}
                <motion.div
                    variants={itemVariants}
                    className="relative rounded-[16px] overflow-hidden text-white shadow-[0_4px_24px_rgba(8,40,112,0.12)] border border-[#1E4A74]/40 min-h-[140px] flex items-center p-6 lg:p-7"
                >
                    {/* Background Harbor Image with Gradient Overlay */}
                    <img
                        src="/images/harbor-banner.jpg"
                        alt="Port Harbor"
                        className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#071E4A]/95 via-[#0A2E6E]/88 via-55% to-[#082046]/75" />

                    {/* Content inside banner */}
                    <div className="relative z-10 w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="space-y-1 max-w-xl">
                            <span className="text-xs font-semibold tracking-wider text-white/85 uppercase">
                                Selamat Datang,
                            </span>
                            <div className="flex items-baseline gap-3">
                                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                                    Bu Titik
                                </h1>
                                <span className="text-xs font-medium text-[#B5C8DC]">
                                    Operational Control Center
                                </span>
                            </div>
                            <p className="text-xs lg:text-sm text-[#DCEAF8]/90 italic pt-1">
                                &ldquo;Koordinasi yang baik hari ini, kelancaran perjalanan esok.&rdquo;
                            </p>
                        </div>

                        {/* Date, Time, Weather & Location (Clean Right-Aligned Typography) */}
                        <div className="flex flex-col items-end text-right space-y-1 text-white">
                            <p className="text-xs font-medium text-[#DCEAF8]">
                                Selasa, 12 Januari 2026
                            </p>
                            <p className="text-3xl lg:text-4xl font-bold tracking-tight font-sans text-white leading-none">
                                10:24
                            </p>
                            <div className="flex items-center gap-3 pt-1 text-xs text-[#E7F0FA]">
                                <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-[#19B5F7]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                    </svg>
                                    Pelabuhan Gresik
                                </span>
                                <span className="text-white/40">•</span>
                                <span className="flex items-center gap-1">
                                    <span>⛅</span>
                                    <span className="font-semibold">28°C</span>
                                    <span className="text-[#B5C8DC]">Cerah Berawan</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4 KPI Metrics Cards in 2x2 Layout */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
                    {/* Card 1: Kapal Aktif */}
                    <Card padding="none" className="p-4 xl:p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-[12px] bg-[#E0F0FF] text-[#0060F4] flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-2xl xl:text-3xl font-extrabold text-[#0B1F63] leading-none">
                                    {kpi.kapal_aktif || 8}
                                </div>
                                <div className="text-xs font-bold text-[#0B1F63] mt-1">
                                    Kapal Aktif
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-[#52658E] space-y-1 border-l border-[#DCEAF8] pl-4 sm:pl-5">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#0057D9]" />
                                <span className="font-medium">2 Akan Datang</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#087443]" />
                                <span className="font-medium">3 Sandar</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#A65300]" />
                                <span className="font-medium">2 Labuh</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#C62840]" />
                                <span className="font-medium">1 Berangkat</span>
                            </div>
                        </div>
                    </Card>

                    {/* Card 2: Total Pengajuan */}
                    <Card padding="none" className="p-4 xl:p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-[12px] bg-[#E0F0FF] text-[#0060F4] flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-2xl xl:text-3xl font-extrabold text-[#0B1F63] leading-none">
                                    {kpi.total_pengajuan || 47}
                                </div>
                                <div className="text-xs font-bold text-[#0B1F63] mt-1">
                                    Total Pengajuan
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-[#52658E] space-y-1.5 border-l border-[#DCEAF8] pl-4 sm:pl-5">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#A65300]" />
                                <span className="font-medium">7 Menunggu Approval</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#6840BB]" />
                                <span className="font-medium">12 Diproses</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#087443]" />
                                <span className="font-medium">28 Selesai</span>
                            </div>
                        </div>
                    </Card>

                    {/* Card 3: Pendapatan Diterima & Stat Piutang */}
                    <Card padding="none" className="p-4 xl:p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-[12px] bg-[#DCF7E8] text-[#087443] flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xl xl:text-2xl font-extrabold text-[#087443] leading-tight">
                                    {formatRupiah(financial.total_collected)}
                                </div>
                                <div className="text-xs font-bold text-[#0B1F63] mt-1">
                                    Pendapatan Diterima
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-[#52658E] space-y-1.5 border-l border-[#DCEAF8] pl-4 sm:pl-5 min-w-[175px]">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#087443]" />
                                    <span className="font-medium text-[#52658E]">Total Diterima</span>
                                </div>
                                <span className="font-bold text-[#087443]">
                                    {formatRupiah(financial.total_collected)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#C62840]" />
                                    <span className="font-medium text-[#52658E]">Piutang</span>
                                </div>
                                <span className="font-bold text-[#C62840]">
                                    {formatRupiah(financial.total_outstanding)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#0060F4]" />
                                    <span className="font-medium text-[#52658E]">Total Ditagihkan</span>
                                </div>
                                <span className="font-bold text-[#0060F4]">
                                    {formatRupiah(financial.total_invoiced)}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Card 4: Kapal Sandar Hari Ini */}
                    <Card padding="none" className="p-4 xl:p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-[12px] bg-[#E0F0FF] text-[#0060F4] flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-2xl xl:text-3xl font-extrabold text-[#0B1F63] leading-none">
                                    {kpi.kapal_sandar_hari_ini || 5}
                                </div>
                                <div className="text-xs font-bold text-[#0B1F63] mt-1">
                                    Kapal Sandar Hari Ini
                                </div>
                            </div>
                        </div>
                        <div className="text-right border-l border-[#DCEAF8] pl-4 sm:pl-5">
                            <Link
                                href="/vessels"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0060F4] hover:text-[#0050D0] bg-[#E0F0FF] hover:bg-[#D0E6FC] px-3 py-1.5 rounded-[8px] transition-colors"
                            >
                                <span>Lihat Detail</span>
                                <span>&rarr;</span>
                            </Link>
                            <div className="text-[11px] text-[#52658E] font-medium mt-1.5">
                                Pelabuhan Gresik
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* =========================================================================
                    1. Pengajuan Terbaru (Grid 1 / Full Width)
                   ========================================================================= */}
                <motion.div variants={itemVariants}>
                    <Card
                        title="Pengajuan Terbaru"
                        actions={
                            <Link href="/requests" className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1">
                                Lihat Semua &rarr;
                            </Link>
                        }
                        overflow="hidden"
                    >
                        {/* Filter Tabs using Button */}
                        <div className="px-4 xl:px-5 py-2.5 border-b border-[#DCEAF8] flex items-center gap-2 overflow-x-auto">
                            <Button
                                size="sm"
                                variant={requestTab === 'semua' ? 'primary' : 'outline'}
                                onClick={() => setRequestTab('semua')}
                                className="!h-8 !px-3 !rounded-[8px] text-xs font-semibold"
                            >
                                Semua Pengajuan
                            </Button>
                            <Button
                                size="sm"
                                variant={requestTab === 'menunggu' ? 'primary' : 'outline'}
                                onClick={() => setRequestTab('menunggu')}
                                className="!h-8 !px-3 !rounded-[8px] text-xs font-semibold flex items-center gap-1.5"
                            >
                                <span>Menunggu Approval</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    requestTab === 'menunggu' ? 'bg-white text-[#0060F4]' : 'bg-[#FFF0CC] text-[#A65300]'
                                }`}>
                                    7
                                </span>
                            </Button>
                            <Button
                                size="sm"
                                variant={requestTab === 'proses' ? 'primary' : 'outline'}
                                onClick={() => setRequestTab('proses')}
                                className="!h-8 !px-3 !rounded-[8px] text-xs font-semibold flex items-center gap-1.5"
                            >
                                <span>Dalam Proses</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    requestTab === 'proses' ? 'bg-white text-[#0060F4]' : 'bg-[#EFE7FF] text-[#6840BB]'
                                }`}>
                                    12
                                </span>
                            </Button>
                            <Button
                                size="sm"
                                variant={requestTab === 'selesai' ? 'primary' : 'outline'}
                                onClick={() => setRequestTab('selesai')}
                                className="!h-8 !px-3 !rounded-[8px] text-xs font-semibold flex items-center gap-1.5"
                            >
                                <span>Selesai</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    requestTab === 'selesai' ? 'bg-white text-[#0060F4]' : 'bg-[#DCF7E8] text-[#087443]'
                                }`}>
                                    28
                                </span>
                            </Button>
                        </div>

                        {/* Table using Reusable Table Component */}
                        <Table
                            columns={requestColumns}
                            data={filteredRequests}
                            keyExtractor={(req) => req.id}
                            compact={true}
                            className="border-none rounded-none shadow-none"
                        />
                    </Card>
                </motion.div>

                {/* =========================================================================
                    2. Kapal dalam Perhatian | Jadwal Kapal Hari Ini (Grid 2)
                   ========================================================================= */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                    {/* Card 1: Kapal dalam Perhatian */}
                    <Card
                        header={
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#0060F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <h4 className="font-bold text-sm sm:text-base text-[#0B1F63]">Kapal dalam Perhatian</h4>
                                </div>
                                <Link href="/ships" className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1">
                                    <span>Lihat Semua</span>
                                    <span>&rarr;</span>
                                </Link>
                            </div>
                        }
                        overflow="hidden"
                        className="flex flex-col"
                    >
                        <div className="p-4 xl:p-5 divide-y divide-[#DCEAF8]/80 flex-1">
                            {attention_ships.map((ship) => (
                                <Link
                                    key={ship.id}
                                    href="/ships"
                                    className="py-3 flex items-center justify-between gap-2.5 hover:bg-[#F0F8FF]/60 rounded-xl px-2.5 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-11 rounded-[8px] overflow-hidden border border-[#DCEAF8] flex-shrink-0 bg-[#E0F0FF]">
                                            <img
                                                src={ship.image_url || '/images/vessel-amigo.jpg'}
                                                alt={ship.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-[#0B1F63] truncate group-hover:text-[#0060F4] transition-colors">
                                                    {ship.name}
                                                </p>
                                                <StatusBadge
                                                    status={ship.status}
                                                    label={ship.status}
                                                    size="sm"
                                                />
                                            </div>
                                            <p className="text-[11px] text-[#52658E] mt-0.5 truncate">
                                                {ship.date_range || '12 - 21 Jan 2026 (10 hari)'}
                                            </p>
                                            <p className="text-[10px] text-[#8C9BB9]">
                                                {ship.port || 'Pelabuhan Gresik'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[#8C9BB9] group-hover:text-[#0060F4] group-hover:translate-x-0.5 text-sm transition-all">&rarr;</span>
                                </Link>
                            ))}
                        </div>
                    </Card>

                    {/* Card 2: Jadwal Kapal Hari Ini */}
                    <Card
                        header={
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#0060F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <h4 className="font-bold text-sm sm:text-base text-[#0B1F63]">Jadwal Kapal Hari Ini</h4>
                                </div>
                                <Link href="/ships" className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1">
                                    <span>Lihat Semua</span>
                                    <span>&rarr;</span>
                                </Link>
                            </div>
                        }
                        overflow="hidden"
                        className="flex flex-col"
                    >
                        <div className="p-4 xl:p-5 divide-y divide-[#DCEAF8]/80 flex-1">
                            {schedules.map((item, idx) => (
                                <div key={idx} className="py-3 flex items-center justify-between text-xs px-2.5 hover:bg-[#F0F8FF]/60 rounded-xl transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="font-mono text-xs text-[#0060F4] font-bold bg-[#E0F0FF] px-2.5 py-1.5 rounded-[8px] border border-[#B9DCFF]">
                                            {item.time}
                                        </span>
                                        <div className="min-w-0">
                                            <span className="font-bold text-[#0B1F63] truncate text-xs block">{item.ship_name}</span>
                                            <span className="text-[11px] text-[#52658E] mt-0.5 block">Pelabuhan Gresik • ETA/ETD Hari Ini</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={item.status} label={item.status} size="sm" />
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>

                {/* =========================================================================
                    3. Kebutuhan Hari Ini (Grid 1 / Full Width)
                   ========================================================================= */}
                <motion.div variants={itemVariants}>
                    <Card
                        title="Kebutuhan Hari Ini"
                        actions={
                            <div className="flex items-center gap-1.5 bg-white border border-[#DCEAF8] rounded-[8px] px-2.5 py-1 text-xs font-semibold text-[#0B1F63]">
                                <button className="p-0.5 text-[#52658E] hover:text-[#0060F4]">&larr;</button>
                                <span>12 Januari 2026</span>
                                <button className="p-0.5 text-[#52658E] hover:text-[#0060F4]">&rarr;</button>
                            </div>
                        }
                        overflow="hidden"
                    >
                        {/* Filter Chips using Button */}
                        <div className="px-4 xl:px-5 py-2.5 border-b border-[#DCEAF8] flex items-center gap-2 overflow-x-auto">
                            {['Semua (12)', 'MT Amigo (4)', 'MV Ocean Star (3)', 'KM Sarana Lintas (2)', 'Lainnya (3)'].map((chip) => (
                                <Button
                                    key={chip}
                                    size="sm"
                                    variant={needsShipFilter === chip ? 'primary' : 'outline'}
                                    onClick={() => setNeedsShipFilter(chip)}
                                    className="!h-7 !px-2.5 !rounded-[7px] text-xs font-medium whitespace-nowrap"
                                >
                                    {chip}
                                </Button>
                            ))}
                        </div>

                        {/* Table using Reusable Table Component */}
                        <Table
                            columns={needsColumns}
                            data={filteredNeeds}
                            keyExtractor={(item, idx) => `${item.pengajuan}-${idx}`}
                            compact={true}
                            className="border-none rounded-none shadow-none"
                        />
                    </Card>
                </motion.div>

                {/* =========================================================================
                    4. Aktivitas Pengajuan | Arus Kas & Piutang Klien (Grid 2)
                   ========================================================================= */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                    {/* Card 1: Aktivitas Pengajuan */}
                    <Card
                        header={
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-[#0060F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <h4 className="font-bold text-sm sm:text-base text-[#0B1F63]">Aktivitas Pengajuan</h4>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-medium text-[#52658E] bg-[#F0F8FF] border border-[#DCEAF8] px-2.5 py-1 rounded-[6px] flex items-center gap-1">
                                        7 Hari Terakhir
                                    </span>
                                </div>
                            </div>
                        }
                        overflow="hidden"
                        className="flex flex-col h-full"
                    >
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-3 pb-3 text-xs text-[#52658E]">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0060F4]" /> Dibuat
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#087443]" /> Disetujui
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" /> Diproses
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0057D9]" /> Selesai
                                </span>
                            </div>

                            {/* Multi-Bar Chart with Left Ticks */}
                            <div className="pt-2 pb-2">
                                <div className="flex items-end gap-2.5 h-36">
                                    {/* Y-axis Ticks */}
                                    <div className="flex flex-col justify-between h-full text-[10px] text-[#8C9BB9] pr-1 py-1 font-mono">
                                        <span>15</span>
                                        <span>10</span>
                                        <span>5</span>
                                        <span>0</span>
                                    </div>

                                    {/* 7 Days Bars */}
                                    <div className="flex-1 flex items-end justify-between gap-1.5 h-full border-b border-[#DCEAF8] pb-1">
                                        {chartData.data.map((bar, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                                                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full max-w-[65px]">
                                                    <div
                                                        className="w-1.5 sm:w-2.5 bg-[#0060F4] rounded-t-[3px] transition-all hover:opacity-80"
                                                        style={{ height: `${Math.min(bar.dibuat * 5.2, 100)}%` }}
                                                        title={`Dibuat: ${bar.dibuat}`}
                                                    />
                                                    <div
                                                        className="w-1.5 sm:w-2.5 bg-[#087443] rounded-t-[3px] transition-all hover:opacity-80"
                                                        style={{ height: `${Math.min(bar.disetujui * 5.2, 100)}%` }}
                                                        title={`Disetujui: ${bar.disetujui}`}
                                                    />
                                                    <div
                                                        className="w-1.5 sm:w-2.5 bg-[#F5A623] rounded-t-[3px] transition-all hover:opacity-80"
                                                        style={{ height: `${Math.min(bar.diproses * 5.2, 100)}%` }}
                                                        title={`Diproses: ${bar.diproses}`}
                                                    />
                                                    <div
                                                        className="w-1.5 sm:w-2.5 bg-[#0057D9] rounded-t-[3px] transition-all hover:opacity-80"
                                                        style={{ height: `${Math.min(bar.selesai * 3.4, 100)}%` }}
                                                        title={`Selesai: ${bar.selesai}`}
                                                    />
                                                </div>
                                                <span className="text-[10px] sm:text-xs text-[#8C9BB9] font-medium whitespace-nowrap">{bar.day}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Summary metrics */}
                            <div className="mt-4 pt-4 border-t border-[#DCEAF8] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
                                <div className="bg-[#F0F8FF]/60 p-2.5 rounded-xl border border-[#DCEAF8]">
                                    <span className="block font-extrabold text-[#0B1F63] text-base">18</span>
                                    <span className="text-[11px] text-[#52658E] block mt-0.5">Dibuat</span>
                                    <span className="text-[11px] text-[#087443] font-bold mt-0.5 inline-block">↑ 12%</span>
                                </div>
                                <div className="bg-[#F0F8FF]/60 p-2.5 rounded-xl border border-[#DCEAF8]">
                                    <span className="block font-extrabold text-[#0B1F63] text-base">16</span>
                                    <span className="text-[11px] text-[#52658E] block mt-0.5">Disetujui</span>
                                    <span className="text-[11px] text-[#087443] font-bold mt-0.5 inline-block">↑ 8%</span>
                                </div>
                                <div className="bg-[#F0F8FF]/60 p-2.5 rounded-xl border border-[#DCEAF8]">
                                    <span className="block font-extrabold text-[#0B1F63] text-base">9</span>
                                    <span className="text-[11px] text-[#52658E] block mt-0.5">Diproses</span>
                                    <span className="text-[11px] text-[#C62840] font-bold mt-0.5 inline-block">↓ 5%</span>
                                </div>
                                <div className="bg-[#F0F8FF]/60 p-2.5 rounded-xl border border-[#DCEAF8]">
                                    <span className="block font-extrabold text-[#0B1F63] text-base">28</span>
                                    <span className="text-[11px] text-[#52658E] block mt-0.5">Selesai</span>
                                    <span className="text-[11px] text-[#087443] font-bold mt-0.5 inline-block">↑ 20%</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Card 2: Arus Kas & Piutang Klien */}
                    <Card
                        header={
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-[8px] bg-[#E0F0FF] text-[#0060F4] flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm sm:text-base text-[#0B1F63]">Arus Kas & Piutang Klien</h4>
                                    </div>
                                </div>
                                <Link
                                    href="/receivables"
                                    className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1 whitespace-nowrap"
                                >
                                    Buku Piutang &rarr;
                                </Link>
                            </div>
                        }
                        overflow="hidden"
                        className="flex flex-col h-full"
                    >
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                            {/* 4 Mini KPI Summary Cards in 2x2 */}
                            <div className="grid grid-cols-2 gap-2.5 mb-4">
                                <div className="p-2.5 rounded-[12px] bg-[#F0F8FF] border border-[#DCEAF8]">
                                    <span className="text-[10px] font-semibold text-[#52658E] block">Total Ditagihkan</span>
                                    <p className="text-sm sm:text-base font-extrabold text-[#0B1F63] mt-0.5 truncate" title={formatRupiah(financial.total_invoiced)}>
                                        {formatRupiah(financial.total_invoiced)}
                                    </p>
                                    <span className="text-[9.5px] text-[#52658E] block mt-0.5">8 Faktur Resmi</span>
                                </div>

                                <div className="p-2.5 rounded-[12px] bg-[#DCF7E8]/40 border border-[#B7EDCE]">
                                    <span className="text-[10px] font-semibold text-[#087443] block">Pendapatan Diterima</span>
                                    <p className="text-sm sm:text-base font-extrabold text-[#087443] mt-0.5 truncate" title={formatRupiah(financial.total_collected)}>
                                        {formatRupiah(financial.total_collected)}
                                    </p>
                                    <span className="text-[9.5px] text-[#087443] font-medium block mt-0.5">Kas Masuk</span>
                                </div>

                                <div className="p-2.5 rounded-[12px] bg-[#FFE7EC]/50 border border-[#FFCCD5]">
                                    <span className="text-[10px] font-semibold text-[#C62840] block">Total Piutang</span>
                                    <p className="text-sm sm:text-base font-extrabold text-[#C62840] mt-0.5 truncate" title={formatRupiah(financial.total_outstanding)}>
                                        {formatRupiah(financial.total_outstanding)}
                                    </p>
                                    <span className="text-[9.5px] text-[#C62840] font-medium block mt-0.5">Belum Lunas</span>
                                </div>

                                <div className="p-2.5 rounded-[12px] bg-[#F0F8FF] border border-[#DCEAF8]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-[#52658E]">Kolektibilitas</span>
                                        <span className="text-[11px] font-bold text-[#0060F4]">{financial.collection_rate}%</span>
                                    </div>
                                    <div className="w-full bg-[#DCEAF8] rounded-full h-1.5 mt-1.5 overflow-hidden">
                                        <div
                                            className="bg-[#0060F4] h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(financial.collection_rate, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[9.5px] text-[#52658E] block mt-1">Target: &ge; 80%</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex items-center justify-between pb-2 text-[11px] text-[#52658E]">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-[#0060F4]" /> Ditagihkan
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-[#087443]" /> Diterima
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-[#C62840]" /> Piutang
                                </span>
                            </div>

                            {/* 6-Month Multi-Bar Chart */}
                            <div className="pt-1 pb-1">
                                <div className="flex items-end gap-2.5 h-36">
                                    {/* Y-axis Ticks in Millions */}
                                    <div className="flex flex-col justify-between h-full text-[9.5px] text-[#8C9BB9] pr-1 py-1 font-mono select-none">
                                        <span>200M</span>
                                        <span>150M</span>
                                        <span>100M</span>
                                        <span>50M</span>
                                        <span>0</span>
                                    </div>

                                    {/* Month Bars */}
                                    <div className="flex-1 flex items-end justify-between gap-1.5 h-full border-b border-[#DCEAF8] pb-1">
                                        {financial.chart.data.map((bar, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                                                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1.5 h-full max-w-[70px]">
                                                    <div
                                                        className="w-1.5 sm:w-2.5 bg-[#0060F4] rounded-t-[3px] transition-all hover:opacity-85"
                                                        style={{ height: `${Math.min(Math.round((bar.invoiced / 220) * 100), 100)}%` }}
                                                        title={`${bar.month}: Ditagihkan Rp ${bar.invoiced} Jt`}
                                                    />
                                                    <div
                                                        className="w-1.5 sm:w-2.5 bg-[#087443] rounded-t-[3px] transition-all hover:opacity-85"
                                                        style={{ height: `${Math.min(Math.round((bar.collected / 220) * 100), 100)}%` }}
                                                        title={`${bar.month}: Diterima Rp ${bar.collected} Jt`}
                                                    />
                                                    <div
                                                        className="w-1.5 sm:w-2.5 bg-[#C62840] rounded-t-[3px] transition-all hover:opacity-85"
                                                        style={{ height: `${Math.min(Math.round((bar.outstanding / 220) * 100), 100)}%` }}
                                                        title={`${bar.month}: Piutang Rp ${bar.outstanding} Jt`}
                                                    />
                                                </div>
                                                <span className="text-[10px] sm:text-[11px] text-[#8C9BB9] font-medium whitespace-nowrap">{bar.month}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Aging Analysis Footer */}
                            <div className="mt-3.5 pt-3 border-t border-[#DCEAF8] flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                                    <span className="text-[#52658E] font-medium">Umur Piutang:</span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#E0F0FF] text-[#0057D9] font-semibold">
                                        &lt;30h: {formatRupiah(financial.aging.current)}
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FFF0CC] text-[#A65300] font-semibold">
                                        31-60h: {formatRupiah(financial.aging.overdue_30)}
                                    </span>
                                    {financial.aging.overdue_60 > 0 && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FFE7EC] text-[#C62840] font-semibold">
                                            &gt;60h: {formatRupiah(financial.aging.overdue_60)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* =========================================================================
                    6. Monitoring Tagihan & Piutang Klien (Grid 1 / Full Width)
                   ========================================================================= */}
                <motion.div variants={itemVariants}>
                    <Card
                        title="Monitoring Tagihan & Piutang Klien"
                        actions={
                            <div className="flex items-center gap-3">
                                <Link href="/invoices" className="text-xs font-semibold text-[#0060F4] hover:underline flex items-center gap-1">
                                    Kelola Semua Faktur &rarr;
                                </Link>
                            </div>
                        }
                        overflow="hidden"
                    >
                        {/* Filter Tabs using Button */}
                        <div className="px-4 xl:px-5 py-2.5 border-b border-[#DCEAF8] flex items-center gap-2 overflow-x-auto">
                            <Button
                                size="sm"
                                variant={invoiceTab === 'semua' ? 'primary' : 'outline'}
                                onClick={() => setInvoiceTab('semua')}
                                className="!h-8 !px-3 !rounded-[8px] text-xs font-semibold"
                            >
                                Semua Tagihan ({financial.recent_invoices?.length || 8})
                            </Button>
                            <Button
                                size="sm"
                                variant={invoiceTab === 'piutang' ? 'primary' : 'outline'}
                                onClick={() => setInvoiceTab('piutang')}
                                className="!h-8 !px-3 !rounded-[8px] text-xs font-semibold flex items-center gap-1.5"
                            >
                                <span>Piutang Belum Lunas</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    invoiceTab === 'piutang' ? 'bg-white text-[#0060F4]' : 'bg-[#FFE7EC] text-[#C62840]'
                                }`}>
                                    {financial.recent_invoices?.filter(i => i.outstanding_amount > 0).length || 6}
                                </span>
                            </Button>
                            <Button
                                size="sm"
                                variant={invoiceTab === 'lunas' ? 'primary' : 'outline'}
                                onClick={() => setInvoiceTab('lunas')}
                                className="!h-8 !px-3 !rounded-[8px] text-xs font-semibold flex items-center gap-1.5"
                            >
                                <span>Lunas</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    invoiceTab === 'lunas' ? 'bg-white text-[#0060F4]' : 'bg-[#DCF7E8] text-[#087443]'
                                }`}>
                                    {financial.recent_invoices?.filter(i => i.status === 'paid' || i.outstanding_amount === 0).length || 2}
                                </span>
                            </Button>
                            <Button
                                size="sm"
                                variant={invoiceTab === 'agency' ? 'primary' : 'outline'}
                                onClick={() => setInvoiceTab('agency')}
                                className="!h-8 !px-3 !rounded-[8px] text-xs font-semibold"
                            >
                                Invoice Keagenan
                            </Button>
                            <Button
                                size="sm"
                                variant={invoiceTab === 'reimburse' ? 'primary' : 'outline'}
                                onClick={() => setInvoiceTab('reimburse')}
                                className="!h-8 !px-3 !rounded-[8px] text-xs font-semibold"
                            >
                                Invoice Reimburse
                            </Button>
                        </div>

                        {/* Table using Reusable Table Component */}
                        <Table
                            columns={invoiceColumns}
                            data={filteredInvoices}
                            keyExtractor={(inv) => inv.id}
                            compact={true}
                            className="border-none rounded-none shadow-none"
                        />
                    </Card>
                </motion.div>

                {/* =========================================================================
                    7. Quick Action | Notifikasi (Grid 2)
                   ========================================================================= */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                    {/* Card 1: Quick Action */}
                    <Card
                        header={
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#0060F4] dark:text-[#38BDF8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <h4 className="font-bold text-sm sm:text-base text-[#0B1F63] dark:text-[#F1F5F9]">Quick Action</h4>
                            </div>
                        }
                        overflow="hidden"
                        className="flex flex-col"
                    >
                        <div className="p-4 xl:p-5 grid grid-cols-2 gap-3 flex-1">
                            <Link
                                href="/requests"
                                className="flex flex-col justify-center items-center text-center p-4 rounded-[12px] border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#E0F0FF]/40 dark:bg-[#0060F4]/10 hover:bg-[#E0F0FF]/80 dark:hover:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#38BDF8] transition-all hover:shadow-xs group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-[#071322] flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                                    <span className="text-xl font-bold text-[#0060F4] dark:text-[#38BDF8]">+</span>
                                </div>
                                <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Input Kebutuhan</span>
                                <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">Kebutuhan logistik baru</span>
                            </Link>

                            <Link
                                href="/requests"
                                className="flex flex-col justify-center items-center text-center p-4 rounded-[12px] border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#DCF7E8]/40 dark:bg-[#10B981]/10 hover:bg-[#DCF7E8]/80 dark:hover:bg-[#10B981]/20 text-[#087443] dark:text-[#34D399] transition-all hover:shadow-xs group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-[#071322] flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                                    <svg className="w-5 h-5 text-[#087443] dark:text-[#34D399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Buat Pengajuan</span>
                                <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">Form pengajuan armada</span>
                            </Link>

                            <button
                                type="button"
                                className="flex flex-col justify-center items-center text-center p-4 rounded-[12px] border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#FFF0CC]/40 dark:bg-[#F59E0B]/10 hover:bg-[#FFF0CC]/80 dark:hover:bg-[#F59E0B]/20 text-[#A65300] dark:text-[#FBBF24] transition-all hover:shadow-xs group cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-[#071322] flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                                    <svg className="w-5 h-5 text-[#A65300] dark:text-[#FBBF24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Input Invoice</span>
                                <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">Tagihan dari vendor</span>
                            </button>

                            <Link
                                href="/reports"
                                className="flex flex-col justify-center items-center text-center p-4 rounded-[12px] border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#EFE7FF]/40 dark:bg-[#8B5CF6]/10 hover:bg-[#EFE7FF]/80 dark:hover:bg-[#8B5CF6]/20 text-[#6840BB] dark:text-[#C084FC] transition-all hover:shadow-xs group cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-[#071322] flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                                    <svg className="w-5 h-5 text-[#6840BB] dark:text-[#C084FC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Lihat Laporan</span>
                                <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">Rekapitulasi berkala</span>
                            </Link>
                        </div>
                    </Card>

                    {/* Card 2: Notifikasi */}
                    <Card
                        header={
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#0060F4] dark:text-[#38BDF8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <h4 className="font-bold text-sm sm:text-base text-[#0B1F63] dark:text-[#F1F5F9]">Notifikasi</h4>
                                </div>
                                <Link href="/requests" className="text-xs font-semibold text-[#0060F4] dark:text-[#38BDF8] hover:underline flex items-center gap-1">
                                    <span>Lihat Semua</span>
                                    <span>&rarr;</span>
                                </Link>
                            </div>
                        }
                        overflow="hidden"
                        className="flex flex-col"
                    >
                        <div className="p-4 xl:p-5 divide-y divide-[#DCEAF8]/80 dark:divide-[#1E3A5F]/80 flex-1">
                            {activeNotifications.map((n) => (
                                <div key={n.id} className="py-2.5 flex items-start gap-2.5">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: n.bg, color: n.color }}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0 text-xs">
                                        <div className="flex items-baseline justify-between gap-1">
                                            <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] truncate">{n.title}</p>
                                            <span className="text-[10px] text-[#8C9BB9] dark:text-[#64748B] flex-shrink-0">{n.time}</span>
                                        </div>
                                        <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] truncate mt-0.5">{n.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            </motion.div>

            {/* =========================================================================
                MOBILE VIEW (Pak Prima - Staf Lapangan - Annotated Reference Match)
               ========================================================================= */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.06, delayChildren: 0.02 },
                    },
                }}
                className="md:hidden bg-[#F0F8FF] dark:bg-[#071322]"
            >
                {/* ── 1. FULL-BLEED HERO BANNER: SHIP BACKGROUND WITH GREETING, METADATA & QUOTE ── */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { duration: 0.3 } },
                    }}
                    className="relative w-full overflow-hidden flex flex-col justify-between min-h-[310px] sm:min-h-[330px]"
                >
                    {/* Full background image - edge-to-edge under transparent navbar */}
                    <img
                        src={prima_header?.banner_image || '/images/prima-banner.jpg'}
                        alt="Pelabuhan & Kapal SJA"
                        className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
                    />
                    {/* Deep ocean maritime gradient overlay for high contrast text */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#001433]/85 via-black/45 via-45% to-black/85 pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0060F4]/20 via-transparent to-transparent pointer-events-none" />

                    {/* Content inside the full background hero */}
                    <div className="relative z-10 flex flex-col justify-between flex-1 pt-[64px] sm:pt-[70px] pb-11 sm:pb-12 px-4 sm:px-5">
                        {/* Top: Greeting & Metadata Row */}
                        <div className="flex items-start justify-between gap-3">
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                            >
                                <p className="text-xs font-semibold text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                    {liveGreeting || prima_header?.greeting || 'Selamat Pagi,'}
                                </p>
                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                    <span>{prima_header?.user_name || 'Pak Prima'}</span>
                                    <motion.span
                                        whileHover={{ scale: 1.25 }}
                                        whileTap={{ scale: 0.85 }}
                                        className="inline-block"
                                    >
                                        <span
                                            className="animate-waving-hand text-xl sm:text-2xl inline-block select-none cursor-pointer"
                                            role="img"
                                            aria-label="melambai"
                                            style={{ transformOrigin: '70% 70%' }}
                                        >
                                            👋
                                        </span>
                                    </motion.span>
                                </h1>
                                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white text-[11px] font-semibold shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                                    <span>{prima_header?.role_name || 'Staff Lapangan'}</span>
                                </div>
                            </motion.div>

                            {/* Date, Location, Weather (Real-Time + Framer Motion) */}
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="flex flex-col items-end text-right space-y-1.5"
                            >
                                {/* ── Framer Option for Tanggal (Interactive Real-Time Badge with Mode Toggle) ── */}
                                <motion.button
                                    type="button"
                                    onClick={() => setDateDisplayMode((prev) => (prev === 'date' ? 'time' : prev === 'time' ? 'full' : 'date'))}
                                    whileHover={{ scale: 1.06, y: -2 }}
                                    whileTap={{ scale: 0.92 }}
                                    animate={{
                                        boxShadow: [
                                            '0 0 0px rgba(56,189,248,0)',
                                            '0 0 14px rgba(56,189,248,0.4)',
                                            '0 0 0px rgba(56,189,248,0)',
                                        ],
                                        borderColor: [
                                            'rgba(255,255,255,0.2)',
                                            'rgba(56,189,248,0.55)',
                                            'rgba(255,255,255,0.2)',
                                        ],
                                    }}
                                    transition={{
                                        boxShadow: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' },
                                        borderColor: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' },
                                        scale: { type: 'spring', stiffness: 450, damping: 20 },
                                    }}
                                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 hover:bg-black/60 active:bg-black/75 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white shadow-xs cursor-pointer select-none transition-colors"
                                    title="Klik untuk ganti mode: Tanggal / Jam Real-time / Hari"
                                >
                                    <motion.div
                                        animate={{ rotate: [0, -8, 8, 0] }}
                                        transition={{ repeat: Infinity, repeatDelay: 4.5, duration: 0.8 }}
                                        className="text-[#38BDF8]"
                                    >
                                        {dateDisplayMode === 'time' ? (
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                        ) : (
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                        )}
                                    </motion.div>

                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={dateDisplayMode}
                                            initial={{ opacity: 0, y: 3 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -3 }}
                                            transition={{ duration: 0.18 }}
                                            className="drop-shadow-xs"
                                        >
                                            {dateDisplayMode === 'date'
                                                ? liveDateFormatted
                                                : dateDisplayMode === 'time'
                                                ? liveTimeFormatted
                                                : liveFullDateFormatted}
                                        </motion.span>
                                    </AnimatePresence>

                                    {/* Real-time live sync indicator dot */}
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" title="Sinkronisasi real-time aktif" />
                                </motion.button>

                                {/* ── Real-Time Location Badge with Framer Motion ── */}
                                <motion.div
                                    whileHover={{ scale: 1.04, x: -1 }}
                                    whileTap={{ scale: 0.96 }}
                                    className="flex items-center gap-1 text-[11px] font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pr-1 cursor-default"
                                >
                                    <svg className="w-3.5 h-3.5 text-[#38BDF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    <span>{locationName}</span>
                                    {isGpsActive && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-ping" title="GPS Aktif" />
                                    )}
                                </motion.div>

                                {/* ── Real-Time Weather Badge with Framer Motion ── */}
                                <motion.div
                                    whileHover={{ scale: 1.04, y: -1 }}
                                    whileTap={{ scale: 0.96 }}
                                    className="flex items-center gap-1.5 pr-1 cursor-default"
                                >
                                    <motion.span
                                        animate={{ y: [0, -2.5, 0] }}
                                        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                                        className="text-base leading-none inline-block"
                                    >
                                        {weatherData.icon}
                                    </motion.span>
                                    <span className="text-sm font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                        {weatherData.temp}
                                    </span>
                                    <span className="text-[10.5px] font-medium text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                        {weatherData.weather}
                                    </span>
                                    {weatherData.isLive && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" title="Cuaca Real-time Aktif" />
                                    )}
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Bottom: Maritime Quote without card block - clean typography floating on hero */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.35 }}
                            className="mt-auto pt-2 pb-1.5"
                        >
                            <p className="text-xs sm:text-[13px] text-white/95 italic font-medium leading-relaxed drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] max-w-sm sm:max-w-md">
                                &ldquo;{prima_header?.quote || 'Laut yang tenang bukan berarti tidak ada badai, tapi ada kapten yang selalu siap.'}&rdquo;
                            </p>
                        </motion.div>
                    </div>
                </motion.div>

                {/* ── LOWER CONTENT FEED (Overlapping Rounded Sheet with Standard Padding) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="relative z-10 -mt-8 sm:-mt-9 rounded-t-[28px] bg-[#F0F8FF] dark:bg-[#071322] px-3.5 pt-3.5 pb-8 sm:pb-10 space-y-3.5 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
                >

                {/* ── 2. RINGKASAN HARI INI (Blue Maritime Container with 4 Cards) ── */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.32 } },
                    }}
                    className="rounded-[18px] bg-gradient-to-br from-[#0060F4] via-[#0055DC] to-[#082870] p-3.5 text-white shadow-[0_4px_20px_rgba(0,96,244,0.28)]"
                >
                    {/* Header bar */}
                    <div className="flex items-center gap-2 mb-3 px-0.5">
                        <div className="w-5 h-5 flex items-center justify-center text-white">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                                <path d="M6 12V6h4v6" />
                                <path d="M14 12V8h4v4" />
                                <line x1="12" y1="2" x2="12" y2="6" />
                            </svg>
                        </div>
                        <h2 className="font-extrabold text-sm tracking-tight text-white">
                            Ringkasan Hari Ini
                        </h2>
                    </div>

                    {/* 4 KPI Cards Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {/* 1. Kapal Hari Ini */}
                        <motion.div whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.94 }} transition={{ type: 'spring', stiffness: 450, damping: 25 }}>
                            <Link
                                href="/vessels"
                                className="bg-[#E0F0FF] dark:bg-[#0060F4]/20 border border-[#C6E2FF] dark:border-[#0060F4]/40 rounded-[14px] p-2 flex flex-col justify-between hover:shadow-xs transition-all text-left h-full"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="w-6 h-6 rounded-lg bg-[#0060F4] text-white flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                                            <path d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                                        </svg>
                                    </div>
                                    <span className="text-[#0060F4] font-bold text-xs">&rsaquo;</span>
                                </div>
                                <div className="my-1">
                                    <span className="block text-xl font-black text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                        {summary_today?.kapal_hari_ini ?? 5}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#0060F4] dark:text-[#60A5FA] leading-tight block">
                                        Kapal Hari Ini
                                    </span>
                                </div>
                            </Link>
                        </motion.div>

                        {/* 2. Aktivitas Hari Ini */}
                        <motion.div whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.94 }} transition={{ type: 'spring', stiffness: 450, damping: 25 }}>
                            <Link
                                href="/operations"
                                className="bg-[#DCF7E8] dark:bg-[#10B981]/20 border border-[#BCEFD4] dark:border-[#10B981]/40 rounded-[14px] p-2 flex flex-col justify-between hover:shadow-xs transition-all text-left h-full"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="w-6 h-6 rounded-lg bg-[#087443] text-white flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <span className="text-[#087443] font-bold text-xs">&rsaquo;</span>
                                </div>
                                <div className="my-1">
                                    <span className="block text-xl font-black text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                        {summary_today?.aktivitas_hari_ini ?? 3}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#087443] dark:text-[#34D399] leading-tight block">
                                        Aktivitas Hari Ini
                                    </span>
                                </div>
                            </Link>
                        </motion.div>

                        {/* 3. Kebutuhan Menunggu */}
                        <motion.div whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.94 }} transition={{ type: 'spring', stiffness: 450, damping: 25 }}>
                            <Link
                                href="/needs"
                                className="bg-[#FFF0CC] dark:bg-[#F59E0B]/20 border border-[#FFE099] dark:border-[#F59E0B]/40 rounded-[14px] p-2 flex flex-col justify-between hover:shadow-xs transition-all text-left h-full"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="w-6 h-6 rounded-lg bg-[#A65300] text-white flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                        </svg>
                                    </div>
                                    <span className="text-[#A65300] font-bold text-xs">&rsaquo;</span>
                                </div>
                                <div className="my-1">
                                    <span className="block text-xl font-black text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                        {summary_today?.kebutuhan_menunggu ?? 4}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#A65300] dark:text-[#FBBF24] leading-tight block">
                                        Kebutuhan Menunggu
                                    </span>
                                </div>
                            </Link>
                        </motion.div>

                        {/* 4. Pengajuan Diproses */}
                        <motion.div whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.94 }} transition={{ type: 'spring', stiffness: 450, damping: 25 }}>
                            <Link
                                href="/requests"
                                className="bg-[#EFE7FF] dark:bg-[#8B5CF6]/20 border border-[#D8C2FF] dark:border-[#8B5CF6]/40 rounded-[14px] p-2 flex flex-col justify-between hover:shadow-xs transition-all text-left h-full"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="w-6 h-6 rounded-lg bg-[#6840BB] text-white flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                    </div>
                                    <span className="text-[#6840BB] font-bold text-xs">&rsaquo;</span>
                                </div>
                                <div className="my-1">
                                    <span className="block text-xl font-black text-[#0B1F63] dark:text-[#F1F5F9] leading-none">
                                        {summary_today?.pengajuan_diproses ?? 2}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#6840BB] dark:text-[#C084FC] leading-tight block">
                                        Pengajuan Diproses
                                    </span>
                                </div>
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>

                {/* ── 3. KAPAL HARI INI (Ship Cards List) ── */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                    }}
                    className="space-y-2.5"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-[#0B1F63] dark:text-[#F1F5F9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                                <path d="M6 12V6h4v6" />
                                <path d="M14 12V8h4v4" />
                            </svg>
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Kapal Hari Ini
                            </h3>
                        </div>
                        <Link
                            href="/vessels"
                            className="text-xs font-bold text-[#0060F4] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
                        >
                            <span>Lihat Semua</span>
                            <span className="text-sm leading-none">&rarr;</span>
                        </Link>
                    </div>

                    {/* Ship Cards */}
                    <div className="space-y-2">
                        {(() => {
                            const shipItems = today_ships.length > 0 ? today_ships : [
                                {
                                    id: '01a08f28-d41b-7227-a3a9-3d49046e2237',
                                    name: 'KM Sarana Lintas Nusantara',
                                    status: 'Sandar',
                                    status_variant: 'success' as const,
                                    eta: '12 Jan 2026 14:00',
                                    port: 'Pelabuhan Gresik',
                                    image_url: '/images/vessel-sarana.jpg',
                                },
                                {
                                    id: '01a08f28-d421-71c4-866b-35502dcfe8bb',
                                    name: 'MT Kyodo',
                                    status: 'Labuh',
                                    status_variant: 'info' as const,
                                    eta: '12 Jan 2026 16:00',
                                    port: 'Pelabuhan Gresik',
                                    image_url: '/images/vessel-kyodo.jpg',
                                },
                                {
                                    id: '01a08f28-d422-71a1-997c-14885a9091c2',
                                    name: 'MT Amigo',
                                    status: 'Menuju Pelabuhan',
                                    status_variant: 'waiting' as const,
                                    eta: '12 Jan 2026 10:00',
                                    port: 'Pelabuhan Gresik',
                                    image_url: '/images/vessel-amigo.jpg',
                                },
                                {
                                    id: '01a0d72d-c5f5-724d-b5e3-6e74544587a0',
                                    name: 'KM Clarity 08',
                                    status: 'Labuh',
                                    status_variant: 'info' as const,
                                    eta: '13 Jan 2026 08:00',
                                    port: 'Pelabuhan Gresik',
                                    image_url: '/images/vessel-ocean-star.jpg',
                                },
                                {
                                    id: '01a0d72d-c606-7151-a8f7-a3535f8389ed',
                                    name: 'KM Lintas Bahari 16',
                                    status: 'Berangkat',
                                    status_variant: 'processing' as const,
                                    eta: '14 Jan 2026 09:00',
                                    port: 'Pelabuhan Gresik',
                                    image_url: '/images/vessel-lestari-jaya.jpg',
                                },
                            ];

                            return shipItems.map((ship) => {
                                const isSandar = ship.status.toLowerCase().includes('sandar');
                                const isLabuh = ship.status.toLowerCase().includes('labuh');
                                const isMenuju = ship.status.toLowerCase().includes('menuju') || ship.status.toLowerCase().includes('datang');
                                const isBerangkat = ship.status.toLowerCase().includes('berangkat');

                                const badgeClass = isSandar
                                    ? 'bg-[#DCF7E8] text-[#087443] dark:bg-[#10B981]/25 dark:text-[#34D399]'
                                    : isLabuh
                                    ? 'bg-[#E0F0FF] text-[#0057D9] dark:bg-[#0060F4]/25 dark:text-[#60A5FA]'
                                    : isMenuju
                                    ? 'bg-[#FFF0CC] text-[#A65300] dark:bg-[#F59E0B]/25 dark:text-[#FBBF24]'
                                    : isBerangkat
                                    ? 'bg-[#EFE7FF] text-[#6840BB] dark:bg-[#8B5CF6]/25 dark:text-[#C084FC]'
                                    : 'bg-[#EDF2F7] text-[#526580] dark:bg-[#1E293B] dark:text-[#94A3B8]';

                                return (
                                    <motion.div
                                        key={ship.id || ship.name}
                                        whileHover={{ y: -2, scale: 1.01 }}
                                        whileTap={{ scale: 0.985 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Link
                                            href={`/vessels/${ship.id}`}
                                            className="block bg-white dark:bg-[#0C1D36] p-2.5 sm:p-3 rounded-[16px] border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-[0_2px_8px_rgba(8,40,112,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:border-[#0060F4]/40 active:scale-[0.99] transition-all"
                                        >
                                        <div className="flex items-center justify-between gap-3">
                                            {/* Thumbnail + Vessel Info */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <img
                                                    src={ship.image_url || '/images/vessel-sarana.jpg'}
                                                    alt={ship.name}
                                                    className="w-18 h-14 rounded-[12px] object-cover flex-shrink-0 border border-[#DCEAF8] dark:border-[#1E3A5F]"
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h4 className="text-xs sm:text-sm font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] truncate">
                                                            {ship.name}
                                                        </h4>
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                                                            {ship.status}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#52658E] dark:text-[#94A3B8] flex-wrap">
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <svg className="w-3 h-3 text-[#0060F4] dark:text-[#38BDF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                            </svg>
                                                            <span>ETA {ship.eta}</span>
                                                        </span>
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <svg className="w-3 h-3 text-[#0060F4] dark:text-[#38BDF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                                <circle cx="12" cy="10" r="3" />
                                                            </svg>
                                                            <span>{ship.port || 'Pelabuhan Gresik'}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Chevron */}
                                            <div className="flex-shrink-0 text-[#8C9BB9] dark:text-[#64748B] pr-1">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </div>
                                        </div>
                                    </Link>
                                    </motion.div>
                                );
                            });
                        })()}
                    </div>
                </motion.div>

                {/* ── 4. AKTIVITAS TERBARU (Timeline List) ── */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                    }}
                    className="space-y-2.5"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-[#0B1F63] dark:text-[#F1F5F9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <h3 className="font-extrabold text-base text-[#0B1F63] dark:text-[#F1F5F9]">
                                Aktivitas Terbaru
                            </h3>
                        </div>
                        <Link
                            href="/operations"
                            className="text-xs font-bold text-[#0060F4] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
                        >
                            <span>Lihat Semua</span>
                            <span className="text-sm leading-none">&rarr;</span>
                        </Link>
                    </div>

                    {/* Timeline List Card */}
                    <div className="bg-white dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-[16px] shadow-[0_2px_8px_rgba(8,40,112,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] p-3.5 space-y-4">
                        {(() => {
                            const activities = recent_activities.length > 0 ? recent_activities : [
                                {
                                    id: 1,
                                    time: '14:00',
                                    title: 'Kapal tiba — KM Sarana Lintas Nusantara',
                                    subtitle: 'Kapal telah tiba di area pelabuhan.',
                                    type: 'ship',
                                    color: '#0060F4',
                                    bg: '#0060F4',
                                    link: '/vessels',
                                },
                                {
                                    id: 2,
                                    time: '10:30',
                                    title: 'Clearance In — MT Kyodo',
                                    subtitle: 'Pengajuan clearance in telah diterima Bu Titik.',
                                    type: 'document',
                                    color: '#087443',
                                    bg: '#087443',
                                    link: '/requests',
                                },
                                {
                                    id: 3,
                                    time: '09:15',
                                    title: 'Form Kebutuhan — MT Amigo',
                                    subtitle: '3 item kebutuhan telah diinput oleh Pak Prima.',
                                    type: 'package',
                                    color: '#A65300',
                                    bg: '#A65300',
                                    link: '/needs',
                                },
                            ];

                            return activities.map((item, idx) => {
                                const isLast = idx === activities.length - 1;

                                return (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{ x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Link
                                            href={item.link || '/operations'}
                                            className="relative flex items-start gap-3 group active:opacity-80 transition-opacity"
                                        >
                                            {/* Timeline vertical connector line */}
                                            {!isLast && (
                                                <div
                                                    className="absolute left-[15px] top-[32px] bottom-[-16px] w-[2px] bg-[#DCEAF8] dark:bg-[#1E3A5F]"
                                                    aria-hidden="true"
                                                />
                                            )}

                                            {/* Circular Icon */}
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-xs z-10"
                                                style={{ backgroundColor: item.color }}
                                            >
                                                {item.type === 'ship' && (
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                                        <path d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                                                    </svg>
                                                )}
                                                {item.type === 'document' && (
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                        <polyline points="14 2 14 8 20 8" />
                                                    </svg>
                                                )}
                                                {item.type === 'package' && (
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                                    </svg>
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0 pr-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                                                        {item.time}
                                                    </span>
                                                    <h4 className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9] truncate group-hover:text-[#0060F4] transition-colors">
                                                        {item.title}
                                                    </h4>
                                                </div>
                                                <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-0.5 leading-normal">
                                                    {item.subtitle}
                                                </p>
                                            </div>

                                            {/* Arrow */}
                                            <div className="flex-shrink-0 text-[#8C9BB9] dark:text-[#64748B] pt-1">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            });
                        })()}
                    </div>
                </motion.div>
                </motion.div>
            </motion.div>
        </AppLayout>
    );
}
