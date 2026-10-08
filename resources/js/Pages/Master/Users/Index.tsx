import React, { useMemo, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Clock3, Mail, Pencil, Search, Trash2, UserRoundPlus, UsersRound } from 'lucide-react';
import AppLayout from '../../../Layouts/AppLayout';
import ConfirmDialog from '../../../Components/overlays/ConfirmDialog';
import Input from '../../../Components/forms/Input';
import Modal from '../../../Components/overlays/Modal';
import Select from '../../../Components/selects/Select';
import Table, { type Column } from '../../../Components/tables/Table';
import TableMobile from '../../../Components/tables/TableMobile';
import Button from '../../../Components/ui/Button';
import StatusBadge from '../../../Components/ui/StatusBadge';
import { formatDateTime } from '../../../lib/formatDate';
import MobilePageHero from '../../../Components/navigation/MobilePageHero';
import FormErrorSummary from '../../../Components/forms/FormErrorSummary';

interface UserItem {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    job_title?: string | null;
    is_active?: boolean;
    account_status?: string;
    last_login_at?: string | null;
    roles?: Array<{ id: number; name: string }>;
    can_update: boolean;
    can_delete: boolean;
}

interface MasterUsersIndexProps {
    users: UserItem[];
    roles: string[];
    search: string;
    can_manage: boolean;
}

const roleName = (user: UserItem): string => user.roles?.[0]?.name ?? 'Tanpa Peran';
const createUserFormId = 'create-master-user-form';
const editUserFormId = 'edit-master-user-form';

function AccountStatus({ user }: { user: UserItem }) {
    if (user.is_active === false) {
        return <StatusBadge status="inactive" label="Dinonaktifkan" size="sm" />;
    }

    if (user.account_status === 'pending_activation') {
        return <StatusBadge status="waiting" label="Belum Aktif" size="sm" />;
    }

    return <StatusBadge status="success" label="Aktif" size="sm" />;
}

export default function MasterUsersIndex({
    users,
    roles,
    search: initialSearch,
    can_manage: canManage,
}: MasterUsersIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const defaultRole = roles.includes('Lapangan') ? 'Lapangan' : (roles[0] ?? '');

    const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        role: defaultRole,
        phone: '',
        job_title: '',
        is_active: true,
    });

    const resetUserForm = () => {
        clearErrors();
        reset();
        setData('role', defaultRole);
    };

    const openCreateModal = () => {
        resetUserForm();
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        clearErrors();
        setIsCreateModalOpen(false);
    };

    const closeEditModal = () => {
        clearErrors();
        setEditingUser(null);
    };

    const openEditModal = (user: UserItem) => {
        clearErrors();
        setEditingUser(user);
        setData({
            name: user.name,
            email: user.email,
            password: '',
            role: roleName(user) === 'Tanpa Peran' ? defaultRole : roleName(user),
            phone: user.phone ?? '',
            job_title: user.job_title ?? '',
            is_active: user.is_active !== false,
        });
    };

    const submitSearch = (event: React.FormEvent) => {
        event.preventDefault();
        router.get('/master/users', { search }, { preserveState: true, replace: true });
    };

    const submitCreate = (event: React.FormEvent) => {
        event.preventDefault();
        post('/master/users', {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateModalOpen(false);
                resetUserForm();
            },
        });
    };

    const submitEdit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingUser) {
            return;
        }

        put(`/master/users/${editingUser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingUser(null);
                resetUserForm();
            },
        });
    };

    const deleteUser = () => {
        if (!userToDelete) {
            return;
        }

        setIsDeleting(true);
        router.delete(`/master/users/${userToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => setUserToDelete(null),
            onFinish: () => setIsDeleting(false),
        });
    };

    const actionButtons = (user: UserItem) => {
        if (!user.can_update && !user.can_delete) {
            return (
                <span className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                    Dilindungi
                </span>
            );
        }

        return (
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                {user.can_update && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(user)}
                        leftIcon={<Pencil aria-hidden="true" className="size-3.5" />}
                        aria-label={`Edit ${user.name}`}
                    >
                        Edit
                    </Button>
                )}
                {user.can_delete && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setUserToDelete(user)}
                        className="text-[#C62840] hover:bg-[#FFE7EC] hover:text-[#C62840]"
                        leftIcon={<Trash2 aria-hidden="true" className="size-3.5" />}
                        aria-label={`Hapus ${user.name}`}
                    >
                        Hapus
                    </Button>
                )}
            </div>
        );
    };

    const columns = useMemo<Column<UserItem>[]>(
        () => [
            {
                key: 'name',
                header: 'Pengguna',
                width: '28%',
                render: (user) => (
                    <div className="flex min-w-[190px] items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E0F0FF] text-xs font-bold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                            {user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                            <span className="block break-words font-bold text-[#082870] dark:text-white">
                                {user.name}
                            </span>
                            <span className="block text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                {user.job_title || 'Belum ada jabatan'}
                            </span>
                        </span>
                    </div>
                ),
            },
            {
                key: 'email',
                header: 'Email',
                width: '25%',
                wrap: 'nowrap',
                render: (user) => user.email,
            },
            {
                key: 'role',
                header: 'Peran',
                align: 'center',
                render: (user) => <StatusBadge status="success" label={roleName(user)} size="sm" />,
            },
            {
                key: 'status',
                header: 'Status',
                align: 'center',
                render: (user) => <AccountStatus user={user} />,
            },
            {
                key: 'last_login_at',
                header: 'Login Terakhir',
                wrap: 'nowrap',
                render: (user) => (
                    <span className="tabular-nums text-[#52658E] dark:text-[#94A3B8]">
                        {formatDateTime(user.last_login_at, 'Belum pernah')}
                    </span>
                ),
            },
            ...(canManage
                ? [{
                    key: 'actions',
                    header: 'Aksi',
                    align: 'right' as const,
                    render: actionButtons,
                }]
                : []),
        ],
        [canManage],
    );

    const userForm = (formId: string, onSubmit: (event: React.FormEvent) => void, isEditing = false) => (
        <form id={formId} noValidate onSubmit={onSubmit} className="space-y-3.5">
            <FormErrorSummary errors={errors} />
            <Input
                required
                name="name"
                label="Nama lengkap"
                autoComplete="name"
                value={data.name}
                onChange={(event) => setData('name', event.target.value)}
                error={errors.name}
                placeholder="Contoh: Prima Saputra…"
            />
            <Input
                required
                type="email"
                name="email"
                label="Email"
                autoComplete="email"
                spellCheck={false}
                value={data.email}
                onChange={(event) => setData('email', event.target.value)}
                error={errors.email}
                placeholder="nama@gmail.com…"
            />
            <div className="grid gap-3 sm:grid-cols-2">
                <Input type="tel" name="phone" label="Nomor telepon" autoComplete="tel" value={data.phone} onChange={(event) => setData('phone', event.target.value)} error={errors.phone} />
                <Input name="job_title" label="Jabatan" autoComplete="organization-title" value={data.job_title} onChange={(event) => setData('job_title', event.target.value)} error={errors.job_title} />
            </div>
            {isEditing && (
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#DCEAF8] px-3 dark:border-[#1E3A5F]">
                    <input type="checkbox" checked={data.is_active} onChange={(event) => setData('is_active', event.target.checked)} className="size-4 rounded border-[#DCEAF8] text-[#0060F4] focus-visible:ring-[#0060F4]" />
                    <span className="font-semibold text-[#082870] dark:text-white">Akun aktif</span>
                </label>
            )}
            <Input
                required={!isEditing}
                type="password"
                name="password"
                label={isEditing ? 'Kata sandi baru' : 'Kata sandi'}
                helperText={isEditing ? 'Kosongkan jika tidak diubah.' : 'Minimal 8 karakter.'}
                autoComplete="new-password"
                value={data.password}
                onChange={(event) => setData('password', event.target.value)}
                error={errors.password}
                placeholder="Minimal 8 karakter…"
            />
            <Select
                required
                name="role"
                label="Peran akses"
                value={data.role}
                options={roles.map((role) => ({ value: role, label: role }))}
                helperText="Pilih peran sesuai tanggung jawab pengguna."
                error={errors.role}
            />
        </form>
    );

    const userModalFooter = (formId: string, isEditing = false) => (
        <>
            <Button
                type="button"
                variant="secondary"
                onClick={isEditing ? closeEditModal : closeCreateModal}
            >
                Batal
            </Button>
            <Button type="submit" form={formId} variant="primary" isLoading={processing}>
                {isEditing ? 'Perbarui' : 'Simpan'}
            </Button>
        </>
    );

    return (
        <AppLayout title="Manajemen Pengguna" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Manajemen Pengguna - PT Samudra Jaya Andalas" />

            <MobilePageHero title="Manajemen Pengguna" description="Kelola akun dan peran akses pengguna SJA." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <header className="hidden flex-col gap-3 border-b border-[#DCEAF8] pb-4 sm:flex-row sm:items-end sm:justify-between md:flex dark:border-[#1E3A5F]">
                    <div>
                        <h1 className="text-balance text-2xl font-extrabold text-[#0B1F63] sm:text-3xl dark:text-white">Manajemen Pengguna</h1>
                        <p className="mt-1 text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">Kelola seluruh akun dan peran akses pengguna SJA.</p>
                    </div>
                    {canManage && (
                        <Button type="button" onClick={openCreateModal} leftIcon={<UserRoundPlus aria-hidden="true" className="size-4" />} className="self-start sm:self-auto">
                            Tambah Pengguna
                        </Button>
                    )}
                </header>

                {canManage && <Button className="w-full md:hidden" type="button" onClick={openCreateModal} leftIcon={<UserRoundPlus aria-hidden="true" className="size-4" />}>Tambah Pengguna</Button>}

                <form onSubmit={submitSearch} className="flex items-end gap-2 rounded-2xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                    <Input name="search" label="Cari pengguna" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama atau email…" leftIcon={<Search aria-hidden="true" className="size-4" />} />
                    <Button type="submit" variant="secondary">Cari</Button>
                </form>

                <div className="hidden md:block">
                    <Table columns={columns} data={users} keyExtractor={(user) => user.id} compact minWidth="800px" emptyMessage="Data Tidak Ditemukan" />
                </div>

                <TableMobile
                    className="md:hidden"
                    data={users}
                    keyExtractor={(user) => user.id}
                    titleRender={(user) => user.name}
                    subtitleRender={(user) => user.job_title || 'Belum ada jabatan'}
                    statusRender={(user) => <AccountStatus user={user} />}
                    imageRender={(user) => <span className="flex size-11 items-center justify-center rounded-xl bg-[#E0F0FF] font-bold text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">{user.name.slice(0, 1).toUpperCase()}</span>}
                    fields={[
                        { label: 'Email', icon: <Mail aria-hidden="true" className="size-3" />, fullWidth: true, render: (user) => user.email },
                        { label: 'Peran', render: (user) => roleName(user) },
                        { label: 'Login terakhir', icon: <Clock3 aria-hidden="true" className="size-3" />, render: (user) => formatDateTime(user.last_login_at, 'Belum pernah') },
                    ]}
                    actionsRender={canManage ? (user) => actionButtons(user) : undefined}
                    emptyMessage="Data Tidak Ditemukan"
                    emptyIcon={<UsersRound aria-hidden="true" className="mx-auto size-7" />}
                />
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                title="Tambah Pengguna"
                footer={userModalFooter(createUserFormId)}
            >
                {userForm(createUserFormId, submitCreate)}
            </Modal>
            <Modal
                isOpen={Boolean(editingUser)}
                onClose={closeEditModal}
                title={editingUser ? `Edit ${editingUser.name}` : 'Edit Pengguna'}
                footer={userModalFooter(editUserFormId, true)}
            >
                {userForm(editUserFormId, submitEdit, true)}
            </Modal>
            <ConfirmDialog
                isOpen={Boolean(userToDelete)}
                title="Hapus pengguna?"
                description={userToDelete ? `Akun ${userToDelete.name} tidak dapat digunakan setelah dihapus.` : ''}
                confirmLabel="Hapus Pengguna"
                confirmVariant="danger"
                processing={isDeleting}
                onClose={() => setUserToDelete(null)}
                onConfirm={deleteUser}
            />
        </AppLayout>
    );
}
