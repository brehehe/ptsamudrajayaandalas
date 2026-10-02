import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import StatusBadge from '../../../Components/ui/StatusBadge';
import Modal from '../../../Components/overlays/Modal';

interface UserItem {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    job_title?: string | null;
    is_active?: boolean;
    account_status?: string;
    activated_at?: string | null;
    last_login_at?: string | null;
    roles?: Array<{
        id: number;
        name: string;
    }>;
}

interface MasterUsersIndexProps {
    users: UserItem[];
    roles: string[];
    search: string;
}

export default function MasterUsersIndex({
    users,
    roles,
    search: initialSearch,
}: MasterUsersIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);

    const { data, setData, post, put, processing, reset, errors } = useForm({
        name: '',
        email: '',
        password: '',
        role: roles[0] || 'Tim Lapangan',
        phone: '',
        job_title: '',
        is_active: true,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/master/users', { search }, { preserveState: true });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/master/users', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        put(`/master/users/${editingUser.id}`, {
            onSuccess: () => {
                setEditingUser(null);
                reset();
            },
        });
    };

    const handleDelete = (user: UserItem) => {
        if (confirm(`Apakah Anda yakin ingin menghapus pengguna ${user.name}?`)) {
            router.delete(`/master/users/${user.id}`);
        }
    };

    return (
        <AppLayout title="Manajemen Pengguna & Peran Akses">
            <Head title="Manajemen User - PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div
                    className={
                        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 ' +
                        'border-b border-[#DCEAF8]'
                    }
                >
                    <div
                        className={
                            'flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border ' +
                            'border-[#DCEAF8] self-start'
                        }
                    >
                        <div
                            className={
                                'px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex ' +
                                'items-center gap-2 bg-[#0060F4] text-white shadow-sm'
                            }
                        >
                            <span>👥</span>
                            <span>Manajemen Pengguna</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white">
                                {users.length}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            reset();
                            setIsCreateModalOpen(true);
                        }}
                        className={
                            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ' +
                            'bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white ' +
                            'text-xs sm:text-sm font-bold shadow-sm transition-all ' +
                            'flex-shrink-0 cursor-pointer self-start sm:self-auto'
                        }
                    >
                        <span className="text-base leading-none font-bold">+</span>
                        <span>Tambah Pengguna Baru</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Manajemen Pengguna & Hak Akses
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] mt-0.5">
                            Pengaturan akun staf PT Samudra Jaya Andalas berdasarkan peran
                            (Role-Based Access Control)
                        </p>
                    </div>
                </div>

                {/* ── Search Bar ── */}
                <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
                    <div
                        className={
                            'absolute inset-y-0 left-0 pl-3.5 flex items-center ' +
                            'pointer-events-none text-[#8C9BB9]'
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
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama atau email staf pengguna..."
                        className={
                            'w-full pl-10 pr-24 h-11 bg-white border border-[#DCEAF8] ' +
                            'rounded-xl text-sm text-[#0B1F63] placeholder-[#8C9BB9] shadow-xs ' +
                            'focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 ' +
                            'focus:border-[#0060F4]'
                        }
                    />
                    <button
                        type="submit"
                        className={
                            'absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#0060F4] ' +
                            'hover:bg-[#0052D4] text-white text-xs font-bold rounded-lg ' +
                            'transition-colors cursor-pointer'
                        }
                    >
                        Cari
                    </button>
                </form>

                {/* Users Table */}
                <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr
                                    className={
                                        'bg-[#F0F8FF] border-b border-[#DCEAF8] text-[#082870] ' +
                                        'font-semibold uppercase tracking-wider'
                                    }
                                >
                                    <th className="py-3 px-4">Nama Pengguna</th>
                                    <th className="py-3 px-4">Alamat Email</th>
                                    <th className="py-3 px-4">Peran (Spatie Role)</th>
                                    <th className="py-3 px-4">Status Akun</th>
                                    <th className="py-3 px-4">Terakhir Login</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCEAF8]/60 text-[#0B1F63]">
                                {users.map((u) => {
                                    const roleName =
                                        u.roles && u.roles.length > 0
                                            ? u.roles[0].name
                                            : 'Tanpa Peran';
                                    return (
                                        <tr
                                            key={u.id}
                                            className="hover:bg-[#F0F8FF]/50 transition-colors"
                                        >
                                            <td
                                                className={
                                                    'py-3.5 px-4 font-semibold text-[#082870] flex ' +
                                                    'items-center gap-2.5'
                                                }
                                            >
                                                <div
                                                    className={
                                                        'w-8 h-8 rounded-full bg-[#E0F0FF] ' +
                                                        'text-[#0060F4] font-bold flex ' +
                                                        'items-center justify-center text-xs'
                                                    }
                                                >
                                                    {u.name[0]}
                                                </div>
                                                <div>
                                                    <div>{u.name}</div>
                                                    <div className="text-[10px] text-[#52658E] font-normal">
                                                        ID #{u.id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-neutral-800">
                                                {u.email}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                                        roleName === 'Owner'
                                                            ? 'bg-[#A65300]/10 text-[#A65300] border border-[#A65300]/25'
                                                            : roleName === 'Direktur'
                                                              ? 'bg-[#6840BB]/10 text-[#6840BB] border border-[#6840BB]/25'
                                                              : roleName === 'Lapangan'
                                                                ? 'bg-[#087443]/10 text-[#087443] border border-[#087443]/25'
                                                                : 'bg-[#0060F4]/10 text-[#0060F4] border border-[#0060F4]/25'
                                                    }`}
                                                >
                                                    {roleName}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <StatusBadge status={u.is_active === false ? 'Nonaktif' : u.account_status === 'pending_activation' ? 'waiting' : 'Aktif'} label={u.is_active === false ? 'Dinonaktifkan' : u.account_status === 'pending_activation' ? 'Belum Aktif' : 'Aktif'} />
                                            </td>
                                            <td className="py-3.5 px-4 text-[#52658E]">{u.last_login_at ? new Date(u.last_login_at).toLocaleString('id-ID') : 'Belum pernah'}</td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(u);
                                                            setData({
                                                                name: u.name,
                                                                email: u.email,
                                                                password: '',
                                                                role: roleName,
                                                                phone: u.phone || '',
                                                                job_title: u.job_title || '',
                                                                is_active: u.is_active !== false,
                                                            });
                                                        }}
                                                        className={
                                                            'text-[#0060F4] hover:underline ' +
                                                            'font-semibold text-[11px]'
                                                        }
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(u)}
                                                        className="text-rose-600 hover:underline text-[11px]"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal Tambah User */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Tambah Pengguna Baru"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Nama Lengkap
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Contoh: Ryan Pratama"
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Email Akun
                        </label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="ryan@samudrajaya.co.id"
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div><label className="font-semibold text-[#082870] block mb-1">Nomor Telepon</label><input type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="min-h-11 w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white" /></div>
                        <div><label className="font-semibold text-[#082870] block mb-1">Jabatan</label><input type="text" value={data.job_title} onChange={(e) => setData('job_title', e.target.value)} className="min-h-11 w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white" /></div>
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Kata Sandi (Password)
                        </label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Minimal 8 karakter..."
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Peran Akses (Spatie Role)
                        </label>
                        <select
                            value={data.role}
                            onChange={(e) => setData('role', e.target.value)}
                            className={
                                'w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 ' +
                                'bg-white font-medium text-[#0B1F63]'
                            }
                        >
                            {roles.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={processing}
                            className="bg-[#0060F4] text-white"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan Pengguna'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit User */}
            {editingUser && (
                <Modal
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    title={`Edit Pengguna ${editingUser.name}`}
                >
                    <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Nama Lengkap
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">Email</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div><label className="font-semibold text-[#082870] block mb-1">Nomor Telepon</label><input type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="min-h-11 w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white" /></div>
                            <div><label className="font-semibold text-[#082870] block mb-1">Jabatan</label><input type="text" value={data.job_title} onChange={(e) => setData('job_title', e.target.value)} className="min-h-11 w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white" /></div>
                        </div>

                        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#DCEAF8] px-3">
                            <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="size-4 rounded border-[#DCEAF8] text-[#0060F4]" />
                            <span className="font-semibold text-[#082870]">Akun aktif</span>
                        </label>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Kata Sandi Baru{' '}
                                <span className="text-[#8C9BB9] font-normal">
                                    (Kosongkan jika tidak ingin diubah)
                                </span>
                            </label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Minimal 8 karakter..."
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Peran Akses (Spatie Role)
                            </label>
                            <select
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                                className={
                                    'w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 ' +
                                    'bg-white font-medium text-[#0B1F63]'
                                }
                            >
                                {roles.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={processing}
                                className="bg-[#0060F4] text-white"
                            >
                                {processing ? 'Memperbarui...' : 'Perbarui Pengguna'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </AppLayout>
    );
}
