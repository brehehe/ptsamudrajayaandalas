import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Modal from '../../../Components/overlays/Modal';
import MobilePageHero from '../../../Components/navigation/MobilePageHero';

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
    permissions_count?: number;
    permissions?: string[];
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
    const [viewingRole, setViewingRole] = useState<RoleItem | null>(null);

    return (
        <AppLayout title="Master Peran & Hak Akses" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Master Role — PT Samudra Jaya Andalas" />

            <MobilePageHero title="Peran & Hak Akses" description="Lihat pembagian kewenangan setiap peran di sistem SJA." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                {/* Header Banner */}
                <div
                    className={
                        'hidden flex-col md:flex-row md:items-center justify-between gap-4 bg-white md:flex ' +
                        'p-5 md:p-6 rounded-[16px] border border-[#DCEAF8] ' +
                        'shadow-[0_2px_12px_rgba(8,40,112,0.04)]'
                    }
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className={
                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ' +
                                    'font-bold bg-[#0060F4]/10 text-[#0060F4]'
                                }
                            >
                                Otoritas & Keamanan
                            </span>
                            <span className="text-xs text-[#52658E]">
                                Spatie Laravel Permission
                            </span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-[#0B1F63] tracking-tight">
                            Master Peran Pengguna (Role SJA)
                        </h1>
                        <p className="text-xs md:text-sm text-[#52658E] mt-0.5">
                            Struktur pembagian kewenangan operasional, approval anggaran, dan
                            pelaporan PT Samudra Jaya Andalas.
                        </p>
                    </div>

                    <Link
                        href="/master/users"
                        className={
                            'inline-flex items-center gap-2 px-4 py-2.5 bg-[#0060F4] ' +
                            'hover:bg-[#082870] text-white rounded-[12px] text-xs font-bold ' +
                            'transition-all shadow-sm'
                        }
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={
                                    'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-' +
                                    '1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
                                }
                            />
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
                                className={
                                    'p-6 bg-white border border-[#DCEAF8] rounded-[16px] ' +
                                    'shadow-sm hover:border-[#0060F4]/40 transition-all flex ' +
                                    'flex-col justify-between'
                                }
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={
                                                    'text-2xl p-2 rounded-xl bg-[#F0F8FF] border ' +
                                                    'border-[#DCEAF8]'
                                                }
                                            >
                                                {cfg.icon}
                                            </span>
                                            <div>
                                                <h3 className="text-lg font-black text-[#0B1F63]">
                                                    {role.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}
                                                    >
                                                        {role.users_count} Personil Terdaftar
                                                    </span>
                                                    {role.permissions_count !== undefined && (
                                                        <span
                                                            className={
                                                                'inline-block px-2 py-0.5 ' +
                                                                'rounded-full text-[10px] ' +
                                                                'font-semibold bg-[#E0F0FF] ' +
                                                                'text-[#0060F4] border ' +
                                                                'border-[#BCE0FD]'
                                                            }
                                                        >
                                                            {role.permissions_count} Hak Akses
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setViewingRole(role)}
                                            className={
                                                'px-3 py-1.5 rounded-xl text-[11px] font-bold ' +
                                                'text-[#0060F4] hover:bg-[#F0F8FF] border ' +
                                                'border-[#DCEAF8] transition-colors ' +
                                                'cursor-pointer'
                                            }
                                        >
                                            Rincian Hak Akses →
                                        </button>
                                    </div>

                                    <p className="text-xs text-[#52658E] mt-3.5 leading-relaxed">
                                        {role.description}
                                    </p>

                                    {/* Assigned Personnel */}
                                    <div className="mt-4 pt-3.5 border-t border-[#DCEAF8]">
                                        <p
                                            className={
                                                'text-[11px] font-bold uppercase tracking-wider ' +
                                                'text-[#52658E] mb-2'
                                            }
                                        >
                                            Personil Pengguna Aktif:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {role.users.length === 0 ? (
                                                <span className="text-xs italic text-[#52658E]/60">
                                                    Belum ada personil ditetapkan
                                                </span>
                                            ) : (
                                                role.users.map((u) => (
                                                    <span
                                                        key={u.id}
                                                        className={
                                                            'inline-flex items-center gap-1.5 ' +
                                                            'px-2.5 py-1 rounded-[8px] ' +
                                                            'bg-[#F0F8FF] border ' +
                                                            'border-[#DCEAF8] text-xs ' +
                                                            'font-semibold text-[#0B1F63]'
                                                        }
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-[#0060F4]" />
                                                        {u.name}
                                                        <span className="text-[10px] text-[#52658E]">
                                                            ({u.email})
                                                        </span>
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

            {/* Modal Detail Hak Akses Spatie */}
            {viewingRole && (
                <Modal
                    isOpen={!!viewingRole}
                    onClose={() => setViewingRole(null)}
                    title={`Rincian Hak Akses (Permissions) — Peran ${viewingRole.name}`}
                >
                    <div className="space-y-4 text-xs">
                        <div className="p-3 bg-[#F0F8FF] rounded-xl border border-[#DCEAF8]">
                            <p className="text-[#0B1F63] font-semibold">Deskripsi Wewenang:</p>
                            <p className="text-[#52658E] mt-0.5">{viewingRole.description}</p>
                            <div className="mt-2 text-[11px] font-bold text-[#0060F4]">
                                Total {viewingRole.permissions?.length || 0} permissions Spatie
                                aktif untuk peran ini.
                            </div>
                        </div>

                        <div>
                            <p className="font-bold uppercase tracking-wider text-[#52658E] mb-2">
                                Daftar Spatie Permissions:
                            </p>
                            <div className="max-h-64 overflow-y-auto pr-1 flex flex-wrap gap-1.5">
                                {viewingRole.permissions && viewingRole.permissions.length > 0 ? (
                                    viewingRole.permissions.map((perm) => (
                                        <span
                                            key={perm}
                                            className={
                                                'px-2 py-1 rounded-md text-[11px] font-mono ' +
                                                'bg-white border border-[#DCEAF8] ' +
                                                'text-[#082870]'
                                            }
                                        >
                                            ✓ {perm}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-neutral-500 italic">
                                        Belum ada permission terdaftar.
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-[#DCEAF8]">
                            <button
                                type="button"
                                onClick={() => setViewingRole(null)}
                                className={
                                    'px-4 py-2 bg-[#0060F4] text-white rounded-xl text-xs ' +
                                    'font-bold hover:bg-[#0052D4]'
                                }
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
