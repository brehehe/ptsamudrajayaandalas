import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { motion, Variants } from 'framer-motion';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';

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

interface ShipCompany {
    id: string;
    code?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
}

interface ShipRequest {
    id: string;
    request_number: string;
    status: string;
    request_date: string;
    notes?: string;
    created_at: string;
}

interface Ship {
    id: string;
    name: string;
    imo_number: string;
    ship_type?: string;
    status: string;
    agent_name?: string;
    is_active: boolean;
    image?: string;
    created_at?: string;
    eta?: string;
    ship_company_id?: string;
    company?: ShipCompany;
    requests?: ShipRequest[];
}

import { formatEtaDateTime } from './Index';

interface VesselShowProps {
    vessel: Ship;
}

const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '12 Jan 2026';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

export default function VesselShow({ vessel }: VesselShowProps) {
    const requests = vessel.requests || [];

    return (
        <AppLayout title={`Detail Kapal — ${vessel.name}`}>
            <Head title={`${vessel.name} — PT Samudra Jaya Andalas`} />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6 max-w-7xl mx-auto pb-12"
            >
                {/* Back Link & Header */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                    <div className="space-y-1">
                        <Link
                            href="/vessels"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0060F4] dark:text-[#38BDF8] hover:underline mb-1"
                        >
                            &larr; Kembali ke Menu Kapal
                        </Link>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {vessel.name}
                            </h1>
                            <StatusBadge status={vessel.status} label={vessel.status} showDot size="md" />
                            {vessel.is_active && (
                                <span className="text-xs font-semibold text-[#087443] dark:text-[#34D399] bg-[#DCF7E8] dark:bg-[#10B981]/20 px-2.5 py-1 rounded-full border border-transparent dark:border-[#10B981]/30">
                                    Aktif Terdaftar
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                            IMO: <span className="font-mono font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{vessel.imo_number || '-'}</span> • Tipe: {vessel.ship_type || 'General Cargo'} • Agen: {vessel.agent_name || 'PT Samudra Jaya Andalas'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/requests">
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button variant="primary" size="md" leftIcon={<span>+</span>}>
                                    Buat Pengajuan
                                </Button>
                            </motion.div>
                        </Link>
                    </div>
                </motion.div>

                {/* Vessel Hero Image Banner */}
                <motion.div
                    variants={itemVariants}
                    className="relative h-48 sm:h-64 rounded-2xl overflow-hidden border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-sm group"
                >
                    <img
                        src={vessel.image || '/images/vessel-sarana.jpg'}
                        alt={vessel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#082870]/90 via-[#082870]/30 to-transparent flex items-end p-5">
                        <div className="text-white space-y-1">
                            <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                                {vessel.ship_type || 'Armada Niaga'}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black">{vessel.name}</h2>
                            <p className="text-xs text-white/80">IMO: {vessel.imo_number} • Agen: {vessel.agent_name || 'PT Samudra Jaya Andalas'}</p>
                        </div>
                    </div>
                </motion.div>

                {/* KPI Summary Cards */}
                <motion.div
                    variants={itemVariants}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
                >
                    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                        <Card className="p-3.5 sm:p-4 border border-[#DCEAF8] dark:border-[#1E3A5F] h-full">
                            <div className="text-[10px] sm:text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] uppercase tracking-wider">
                                Status Operasional
                            </div>
                            <div className="text-base sm:text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] mt-1 flex items-center gap-1.5">
                                <span>{vessel.status}</span>
                            </div>
                            <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-0.5 truncate">
                                Pelabuhan Tg. Perak / Gresik
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                        <Card className="p-3.5 sm:p-4 border border-[#DCEAF8] dark:border-[#1E3A5F] h-full">
                            <div className="text-[10px] sm:text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] uppercase tracking-wider">
                                Nomor IMO Resmi
                            </div>
                            <div className="text-base sm:text-lg font-mono font-extrabold text-[#0060F4] dark:text-[#38BDF8] mt-1">
                                {vessel.imo_number || 'N/A'}
                            </div>
                            <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-0.5 truncate">
                                Terverifikasi Lloyds Register
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                        <Card className="p-3.5 sm:p-4 border border-[#DCEAF8] dark:border-[#1E3A5F] h-full">
                            <div className="text-[10px] sm:text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] uppercase tracking-wider">
                                Tipe Kapal & Muatan
                            </div>
                            <div className="text-base sm:text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] mt-1 truncate">
                                {vessel.ship_type || 'General Cargo'}
                            </div>
                            <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mt-0.5 truncate">
                                Kapasitas DWT Standar
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                        <Card className="p-3.5 sm:p-4 border border-[#DCEAF8] dark:border-[#1E3A5F] h-full">
                            <div className="text-[10px] sm:text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8] uppercase tracking-wider">
                                Pengajuan Kebutuhan
                            </div>
                            <div className="text-base sm:text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] mt-1">
                                {requests.length} Permintaan
                            </div>
                            <div className="text-[11px] text-[#087443] dark:text-[#34D399] mt-0.5 truncate font-medium">
                                Tercatat dalam sistem
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Vessel Technical Specs & Port Details */}
                <motion.div
                    variants={itemVariants}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                    <Card className="p-5 border border-[#DCEAF8] dark:border-[#1E3A5F] lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[#DCEAF8] dark:border-[#1E3A5F]">
                            <h3 className="text-base font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Spesifikasi Teknis Kapal
                            </h3>
                            <span className="text-xs text-[#52658E] dark:text-[#94A3B8]">Data Terverifikasi</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            <div className="p-3.5 rounded-xl bg-[#F0F8FF]/60 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center min-h-[64px]">
                                <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px] font-medium block">Nama Resmi</span>
                                <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] text-sm block mt-0.5 leading-snug">{vessel.name}</span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#F0F8FF]/60 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center min-h-[64px]">
                                <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px] font-medium block">Nomor IMO</span>
                                <span className="font-mono font-bold text-[#0B1F63] dark:text-[#F1F5F9] text-sm block mt-0.5 leading-snug">{vessel.imo_number || '-'}</span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#F0F8FF]/60 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center min-h-[64px]">
                                <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px] font-medium block">Tipe Armada</span>
                                <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] text-sm block mt-0.5 leading-snug">{vessel.ship_type || 'General Cargo'}</span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#F0F8FF]/60 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center min-h-[64px]">
                                <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px] font-medium block">Bendera Negara</span>
                                <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] text-sm block mt-0.5 leading-snug">🇮🇩 Indonesia</span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#F0F8FF]/60 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center min-h-[64px]">
                                <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px] font-medium block">Agen Pengurus</span>
                                <span className="font-bold text-[#0060F4] dark:text-[#38BDF8] text-sm block mt-0.5 leading-snug truncate">{vessel.agent_name || 'PT Samudra Jaya Andalas'}</span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#F0F8FF]/60 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center min-h-[64px]">
                                <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px] font-medium block">Status Kelaiklautan</span>
                                <span className="font-bold text-[#087443] dark:text-[#34D399] text-sm block mt-0.5 leading-snug">Laik Laut (Valid)</span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#F0F8FF]/60 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center min-h-[64px]">
                                <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px] font-medium block">Perusahaan Pemilik (Company)</span>
                                <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] text-sm block mt-0.5 leading-snug truncate">
                                    {vessel.company?.name ? `${vessel.company.name} (${vessel.company.code || 'PR'})` : 'Perusahaan Belum Terdaftar'}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#F0F8FF]/60 dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center min-h-[64px]">
                                <span className="text-[#52658E] dark:text-[#94A3B8] text-[11px] font-medium block">
                                    {vessel.status === 'Selesai' ? 'Waktu Departure' : 'Estimasi Kedatangan (ETA)'}
                                </span>
                                <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] text-sm block mt-0.5 leading-snug">
                                    {formatEtaDateTime(vessel.eta)}
                                </span>
                            </div>
                        </div>

                        {/* Recent Requests Table for this vessel */}
                        <div className="pt-4 border-t border-[#DCEAF8] dark:border-[#1E3A5F] space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    Riwayat Pengajuan Kebutuhan Kapal Ini
                                </h4>
                                <Link
                                    href="/requests"
                                    className="text-xs font-bold text-[#0060F4] dark:text-[#38BDF8] hover:underline"
                                >
                                    Semua Pengajuan &rarr;
                                </Link>
                            </div>

                            {requests.length > 0 ? (
                                <div className="space-y-2.5">
                                    {requests.map((r) => (
                                        <motion.div
                                            key={r.id}
                                            whileHover={{ y: -1 }}
                                            transition={{ duration: 0.15 }}
                                            className="p-3.5 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#071322] hover:border-[#0060F4]/30 dark:hover:border-[#38BDF8]/40 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs shadow-xs"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono font-bold text-[#082870] dark:text-[#F1F5F9] text-xs">
                                                        {r.request_number}
                                                    </span>
                                                    <span className="text-[11px] text-[#8C9BB9] dark:text-[#94A3B8] font-medium">
                                                        {formatDate(r.request_date || r.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] truncate mt-0.5">
                                                    {r.notes || 'Permintaan logistik kapal'}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-start sm:justify-end flex-shrink-0">
                                                <StatusBadge status={r.status} label={r.status} size="sm" showDot />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center bg-[#F0F8FF]/40 dark:bg-[#071322]/50 rounded-xl border border-dashed border-[#DCEAF8] dark:border-[#1E3A5F]">
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                        Belum ada pengajuan kebutuhan yang tercatat untuk kapal ini.
                                    </p>
                                    <Link href="/requests" className="mt-2 inline-block">
                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                            <Button variant="outline" size="sm">
                                                + Buat Pengajuan Pertama
                                            </Button>
                                        </motion.div>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Operational Contacts & Quick Information */}
                    <div className="space-y-4">
                        <Card className="p-5 border border-[#DCEAF8] dark:border-[#1E3A5F] space-y-4">
                            <h3 className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9] pb-2 border-b border-[#DCEAF8] dark:border-[#1E3A5F]">
                                Kontak Lapangan & Keagenan
                            </h3>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <span className="text-[#52658E] dark:text-[#94A3B8] block text-[11px]">Staff Operasional Bertugas</span>
                                    <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] mt-0.5">Pak Prima (Field Agent)</p>
                                    <p className="text-[11px] text-[#0060F4] dark:text-[#38BDF8] font-mono">+62 812-3456-7890</p>
                                </div>

                                <div className="pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                                    <span className="text-[#52658E] dark:text-[#94A3B8] block text-[11px]">Admin Operasional Pusat (OCC)</span>
                                    <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] mt-0.5">Bu Titik (Head of Operations)</p>
                                    <p className="text-[11px] text-[#0060F4] dark:text-[#38BDF8] font-mono">titik@samudrajaya.co.id</p>
                                </div>

                                <div className="pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                                    <span className="text-[#52658E] dark:text-[#94A3B8] block text-[11px]">Kantor Keagenan Surabaya</span>
                                    <p className="text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                        Jl. Tanjung Perak Barat No. 88, Surabaya, Jawa Timur
                                    </p>
                                </div>

                                {vessel.company && (
                                    <div className="pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                                        <span className="text-[#52658E] dark:text-[#94A3B8] block text-[11px]">Perusahaan Pemilik / Shipping Co.</span>
                                        <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] mt-0.5">{vessel.company.name} {vessel.company.code ? `(${vessel.company.code})` : ''}</p>
                                        {vessel.company.phone && <p className="text-[11px] text-[#0060F4] dark:text-[#38BDF8] font-mono">{vessel.company.phone}</p>}
                                        {vessel.company.email && <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-mono">{vessel.company.email}</p>}
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card className="p-5 border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#0D2945] text-[#E7F0FA] space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#19B5F7]">
                                Prosedur Keagenan SJA
                            </h3>
                            <p className="text-xs text-[#B5C8DC] leading-relaxed">
                                Seluruh kebutuhan logistik (Fresh Water, Bunkering, Clearance Karantina) harus diajukan melalui sistem ini untuk pencatatan otomatis ke Activity Log dan verifikasi OCC.
                            </p>
                        </Card>
                    </div>
                </motion.div>
            </motion.div>
        </AppLayout>
    );
}
