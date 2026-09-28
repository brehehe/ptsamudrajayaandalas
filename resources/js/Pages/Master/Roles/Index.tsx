import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';

interface UserSummary {
    id: number;
    name: string;
    email: string;
}

interface RoleItem {
    id: number;
    name: 'Owner' | 'Direktur' | 'Admin' | 'Lapangan';
    description: string;
    users_count: number;
    users: UserSummary[];
}

interface MasterRolesProps {
    roles: RoleItem[];
}

const ROLE_BADGE_CONFIG = {
    Owner: {
        bg: 'bg-[#082870]/10',
        text: 'text-[#082870]',
        icon: '👑',
        border: 'border-[#082870]/20',
        accent: 'from-[#082870] to-[#0060F4]',
    },
    Direktur: {
        bg: 'bg-[#6840BB]/10',
        text: 'text-[#6840BB]',
        icon: '🏛️',
        border: 'border-[#6840BB]/20',
        accent: 'from-[#6840BB] to-[#8C62EA]',
    },
    Admin: {
        bg: 'bg-[#0060F4]/10',
        text: 'text-[#0060F4]',
        icon: '💼',
        border: 'border-[#0060F4]/20',
        accent: 'from-[#0060F4] to-[#19B5F7]',
    },
    Lapangan: {
        bg: 'bg-[#087443]/10',
        text: 'text-[#087443]',
        icon: '⚓',
        border: 'border-[#087443]/20',
        accent: 'from-[#087443] to-[#10B981]',
    },
};

export default function MasterRolesIndex({ roles = [] }: MasterRolesProps) {
    return (
        <AppLayout title="Master Peran & Hak Akses">
            <Head title="Master Role — PT Samudra Jaya Andalas" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-[16px] border border-[#DCEAF8] shadow-[0_2px_12px_rgba(8,40,112,0.04)]">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0060F4]/10 text-[#0060F4]">
                                Otoritas & Keamanan
                            </span>
                            <span className="text-xs text-[#52658E]">Spatie Permissions</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-[#0B1F63] tracking-tight">
                            Master Peran Pengguna (Role SJA)
                        </h1>
                        <p className="text-xs md:text-sm text-[#52658E] mt-0.5">
                            Struktur pembagian kewenangan operasional, approval anggaran, dan pelaporan PT Samudra Jaya Andalas.
                        </p>
                    </div>

                    <Link
                        href="/master/users"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0060F4] hover:bg-[#082870] text-white rounded-[12px] text-xs font-bold transition-all shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Kelola Akun Pengguna
                    </Link>
                </div>

                {/* Grid 4 Roles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {roles.map((role) => {
                        const cfg = ROLE_BADGE_CONFIG[role.name] || ROLE_BADGE_CONFIG.Admin;

                        return (
                            <Card
                                key={role.id}
                                className="p-6 bg-white border border-[#DCEAF8] rounded-[16px] shadow-sm hover:border-[#0060F4]/40 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl p-2 rounded-xl bg-[#F0F8FF] border border-[#DCEAF8]">
                                                {cfg.icon}
                                            </span>
                                            <div>
                                                <h3 className="text-lg font-black text-[#0B1F63]">
                                                    {role.name}
                                                </h3>
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                                    {role.users_count} Personil Terdaftar
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-[#52658E] mt-3.5 leading-relaxed">
                                        {role.description}
                                    </p>

                                    {/* Assigned Personnel */}
                                    <div className="mt-4 pt-3.5 border-t border-[#DCEAF8]">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#52658E] mb-2">
                                            Personil Pengguna Aktif:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {role.users.length === 0 ? (
                                                <span className="text-xs italic text-[#52658E]/60">Belum ada personil ditetapkan</span>
                                            ) : (
                                                role.users.map((u) => (
                                                    <span
                                                        key={u.id}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#F0F8FF] border border-[#DCEAF8] text-xs font-semibold text-[#0B1F63]"
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-[#0060F4]" />
                                                        {u.name}
                                                        <span className="text-[10px] text-[#52658E]">({u.email})</span>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
