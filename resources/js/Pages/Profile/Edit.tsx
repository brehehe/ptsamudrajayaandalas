import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Card from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import Input from '@/Components/forms/Input';

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

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    // Profile info form
    const {
        data: profileData,
        setData: setProfileData,
        patch: updateProfile,
        errors: profileErrors,
        processing: profileProcessing,
        recentlySuccessful: profileSuccess,
    } = useForm({
        name: user.name,
        email: user.email,
    });

    // Password form
    const {
        data: passwordData,
        setData: setPasswordData,
        put: updatePassword,
        errors: passwordErrors,
        reset: resetPassword,
        processing: passwordProcessing,
        recentlySuccessful: passwordSuccess,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [activeTab, setActiveTab] = useState<'info' | 'keamanan'>('info');

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfile('/profile');
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updatePassword('/password', {
            onSuccess: () => resetPassword(),
        });
    };

    const handleLogout = () => {
        if (confirm('Apakah Anda yakin ingin keluar dari sistem keagenan?')) {
            router.post('/logout');
        }
    };

    // User initials for avatar
    const initials = user?.name
        ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
        : 'SJA';

    return (
        <AppLayout title="Profil Saya">
            <Head title="Profil Saya — PT Samudra Jaya Andalas" />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-5xl mx-auto space-y-5 pb-12"
            >
                {/* ── Profile Header Card ── */}
                <motion.div
                    variants={itemVariants}
                    className="bg-gradient-to-r from-[#082870] via-[#003EA8] to-[#0060F4] rounded-2xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden"
                >
                    {/* Background nautical pattern overlay */}
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-8 translate-y-8">
                        <svg className="w-64 h-64" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 19h20L12 2zm0 4l6 11H6l6-11z" />
                        </svg>
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                            {/* Big Avatar */}
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white text-[#0060F4] flex items-center justify-center text-xl sm:text-2xl font-black shadow-lg flex-shrink-0 ring-4 ring-white/20">
                                {initials}
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                                        {user.name}
                                    </h1>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCF7E8] text-[#087443]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#087443]" />
                                        Aktif Bertugas
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-white/90 font-medium">
                                    {user.email}
                                </p>
                                <p className="text-xs text-[#B5C8DC] flex items-center gap-1.5 pt-0.5">
                                    <span>📍</span>
                                    <span>Wilayah Pelabuhan Gresik & Tanjung Perak</span>
                                </p>
                            </div>
                        </div>

                        {/* Logout Quick Button */}
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold transition-all border border-white/20 shadow-xs self-end sm:self-auto cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Keluar (Logout)</span>
                        </motion.button>
                    </div>

                    {/* Operational Badges Row */}
                    <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                            <span className="text-white/70 block text-[10px]">Peran / Jabatan</span>
                            <span className="font-bold text-white mt-0.5 block">Staff Lapangan</span>
                        </div>
                        <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                            <span className="text-white/70 block text-[10px]">ID Karyawan</span>
                            <span className="font-mono font-bold text-white mt-0.5 block">SJA-0182</span>
                        </div>
                        <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                            <span className="text-white/70 block text-[10px]">Shift Hari Ini</span>
                            <span className="font-bold text-white mt-0.5 block">08:00 - 17:00</span>
                        </div>
                        <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                            <span className="text-white/70 block text-[10px]">Cabang Utama</span>
                            <span className="font-bold text-white mt-0.5 block">Jawa Timur</span>
                        </div>
                    </div>
                </motion.div>

                {/* ── Tabs Navigation ── */}
                <motion.div variants={itemVariants} className="flex items-center gap-2 border-b border-[#DCEAF8] pb-1">
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setActiveTab('info')}
                        className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                            activeTab === 'info'
                                ? 'bg-[#0060F4] text-white shadow-xs'
                                : 'text-[#52658E] hover:text-[#0B1F63] hover:bg-white'
                        }`}
                    >
                        Informasi Profil
                    </motion.button>
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setActiveTab('keamanan')}
                        className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                            activeTab === 'keamanan'
                                ? 'bg-[#0060F4] text-white shadow-xs'
                                : 'text-[#52658E] hover:text-[#0B1F63] hover:bg-white'
                        }`}
                    >
                        Keamanan & Password
                    </motion.button>
                </motion.div>

                {/* ── TAB CONTENT WITH ANIMATE PRESENCE ── */}
                <AnimatePresence mode="wait">
                    {activeTab === 'info' && (
                        <motion.div
                            key="tab-info"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <Card className="p-5 sm:p-6 border border-[#DCEAF8] space-y-5">
                                <div className="border-b border-[#DCEAF8] pb-3">
                                    <h2 className="text-base font-extrabold text-[#0B1F63]">
                                        Informasi Akun
                                    </h2>
                                    <p className="text-xs text-[#52658E] mt-0.5">
                                        Perbarui informasi kontak dan data diri Anda di sistem keagenan.
                                    </p>
                                </div>

                                {profileSuccess && (
                                    <div className="p-3 rounded-xl bg-[#DCF7E8] text-[#087443] text-xs font-bold flex items-center gap-2">
                                        <span>✓</span>
                                        <span>Profil berhasil diperbarui.</span>
                                    </div>
                                )}

                                <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-xl">
                                    <Input
                                        label="Nama Lengkap"
                                        required
                                        value={profileData.name}
                                        onChange={(e) => setProfileData('name', e.target.value)}
                                        error={profileErrors.name}
                                        sizeVariant="md"
                                    />

                                    <Input
                                        label="Alamat Email"
                                        type="email"
                                        required
                                        value={profileData.email}
                                        onChange={(e) => setProfileData('email', e.target.value)}
                                        error={profileErrors.email}
                                        sizeVariant="md"
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <Input
                                            label="Peran Sistem"
                                            value="Staff Lapangan (Tim Lapangan)"
                                            disabled
                                            sizeVariant="sm"
                                        />
                                        <Input
                                            label="Wilayah Operasi"
                                            value="Gresik & Tanjung Perak"
                                            disabled
                                            sizeVariant="sm"
                                        />
                                    </div>

                                    <div className="pt-3">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="md"
                                            disabled={profileProcessing}
                                            isLoading={profileProcessing}
                                            className="shadow-xs"
                                        >
                                            Simpan Perubahan
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    )}

                    {activeTab === 'keamanan' && (
                        <motion.div
                            key="tab-keamanan"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <Card className="p-5 sm:p-6 border border-[#DCEAF8] space-y-5">
                                <div className="border-b border-[#DCEAF8] pb-3">
                                    <h2 className="text-base font-extrabold text-[#0B1F63]">
                                        Perbarui Kata Sandi
                                    </h2>
                                    <p className="text-xs text-[#52658E] mt-0.5">
                                        Pastikan akun Anda menggunakan kata sandi yang panjang dan unik untuk menjaga keamanan data keagenan.
                                    </p>
                                </div>

                                {passwordSuccess && (
                                    <div className="p-3 rounded-xl bg-[#DCF7E8] text-[#087443] text-xs font-bold flex items-center gap-2">
                                        <span>✓</span>
                                        <span>Kata sandi berhasil diperbarui.</span>
                                    </div>
                                )}

                                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
                                    <Input
                                        label="Kata Sandi Saat Ini"
                                        type="password"
                                        required
                                        value={passwordData.current_password}
                                        onChange={(e) => setPasswordData('current_password', e.target.value)}
                                        error={passwordErrors.current_password}
                                        autoComplete="current-password"
                                        sizeVariant="md"
                                    />

                                    <Input
                                        label="Kata Sandi Baru"
                                        type="password"
                                        required
                                        value={passwordData.password}
                                        onChange={(e) => setPasswordData('password', e.target.value)}
                                        error={passwordErrors.password}
                                        autoComplete="new-password"
                                        sizeVariant="md"
                                    />

                                    <Input
                                        label="Konfirmasi Kata Sandi Baru"
                                        type="password"
                                        required
                                        value={passwordData.password_confirmation}
                                        onChange={(e) => setPasswordData('password_confirmation', e.target.value)}
                                        error={passwordErrors.password_confirmation}
                                        autoComplete="new-password"
                                        sizeVariant="md"
                                    />

                                    <div className="pt-3">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="md"
                                            disabled={passwordProcessing}
                                            isLoading={passwordProcessing}
                                            className="shadow-xs"
                                        >
                                            Perbarui Kata Sandi
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Logout Card for Mobile Staff Convenience ── */}
                <motion.div variants={itemVariants}>
                    <Card className="p-5 border border-[#FFE7EC] bg-[#FFF5F6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-[#C62840]">
                                Keluar dari Akun
                            </h3>
                            <p className="text-xs text-[#9B1C31] mt-0.5">
                                Akhiri sesi kerja Anda pada perangkat ini dengan aman.
                            </p>
                        </div>

                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleLogout}
                            className="px-5 py-2.5 rounded-xl bg-[#E53E3E] hover:bg-[#C62840] text-white text-xs font-bold shadow-sm transition-all self-start sm:self-auto cursor-pointer"
                        >
                            Keluar Sekarang
                        </motion.button>
                    </Card>
                </motion.div>
            </motion.div>
        </AppLayout>
    );
}
