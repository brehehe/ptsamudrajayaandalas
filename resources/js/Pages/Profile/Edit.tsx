import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import MobilePageHero from '@/Components/navigation/MobilePageHero';
import ConfirmDialog from '@/Components/overlays/ConfirmDialog';
import AlertToast, { AlertToastMessage } from '@/Components/feedback/AlertToast';
import { useTheme } from '@/hooks/useTheme';
import { PageProps } from '@/types';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileInfo {
    name: string;
    email: string;
    role: string;
    title: string;
    phone: string;
    department: string;
    location: string;
    company: string;
}

export default function Edit({
    mustVerifyEmail,
    status,
    profileInfo,
}: PageProps<{
    mustVerifyEmail: boolean;
    status?: string;
    profileInfo?: ProfileInfo;
}>) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const info: ProfileInfo = profileInfo || {
        name: user.name || 'Pak Prima',
        email: user.email || 'prima@sja.co.id',
        role: user.primary_role || 'Staf Lapangan',
        title: 'Staf Lapangan',
        phone: '0812 3456 7890',
        department: 'Operasional Lapangan',
        location: 'Surabaya',
        company: 'PT. Samudra Jaya Andalas',
    };

    // Sub-screen navigation: 'menu' (Screen 1) | 'akun' (Screen 2) | 'password' (Screen 3) | 'notifikasi' (Screen 4) | 'tampilan' (Screen 5)
    const [activeSubScreen, setActiveSubScreen] = useState<'menu' | 'akun' | 'password' | 'notifikasi' | 'tampilan'>('akun');
    const [mobileView, setMobileView] = useState<'menu' | 'detail'>('menu');

    // Password form state
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

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password validation checklist
    const hasMinLength = passwordData.password.length >= 8;
    const hasUpperAndLower = /[a-z]/.test(passwordData.password) && /[A-Z]/.test(passwordData.password);
    const hasNumber = /[0-9]/.test(passwordData.password);
    const hasSymbol = /[^A-Za-z0-9]/.test(passwordData.password);

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updatePassword('/password', {
            preserveScroll: true,
            onSuccess: () => resetPassword(),
        });
    };

    // Notification Toggles (saved locally)
    const [notifPengajuan, setNotifPengajuan] = useState(true);
    const [notifKapal, setNotifKapal] = useState(true);
    const [notifJadwal, setNotifJadwal] = useState(true);
    const [toast, setToast] = useState<AlertToastMessage | null>(null);

    const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
        setToast({ message, variant });
    };

    // Appearance Preferences
    const { resolvedTheme, setTheme } = useTheme();
    const selectedTheme = resolvedTheme === 'dark' ? 'gelap' : 'terang';
    const [dateFormat, setDateFormat] = useState('DD MMMM YYYY');
    const [timezone, setTimezone] = useState('WIB (GMT+7)');

    const handleThemeChange = (theme: 'terang' | 'gelap') => {
        setTheme(theme === 'gelap' ? 'dark' : 'light');
        showToast(`Tema aplikasi diubah ke ${theme === 'terang' ? 'Terang' : 'Gelap'}`);
    };

    // Logout confirmation dialog
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [logoutProcessing, setLogoutProcessing] = useState(false);

    const handleLogoutClick = () => {
        setIsLogoutConfirmOpen(true);
    };

    const handleConfirmLogout = () => {
        setLogoutProcessing(true);
        router.post('/logout', {}, {
            onFinish: () => setLogoutProcessing(false),
        });
    };

    const navigateTo = (screen: 'akun' | 'password' | 'notifikasi' | 'tampilan') => {
        setActiveSubScreen(screen);
        setMobileView('detail');
    };

    return (
        <AppLayout
            title="Profil"
            transparentMobileHeader={mobileView === 'menu'}
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Profil — PT Samudra Jaya Andalas" />

            {/* Mobile Hero Banner - Only displayed on mobile when in main menu */}
            {mobileView === 'menu' && (
                <MobilePageHero
                    title="Profil"
                    description="Kelola akun dan pengaturan Anda"
                />
            )}

            <div className={`max-w-6xl mx-auto pb-3 sm:pb-6 md:pb-16 px-0 md:px-6 ${
                mobileView === 'menu'
                    ? 'relative z-10 -mt-6 rounded-t-[28px] bg-white px-4 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 min-h-[calc(100dvh-200px)]'
                    : 'px-0 pt-0 min-h-[calc(100dvh-56px)] flex flex-col'
            }`}>

                {/* Header banner - visible on desktop */}
                <div className="hidden md:block mb-5 pt-3 md:pt-0">
                    <h1 className="text-2xl font-black text-[#0B1F63] dark:text-white tracking-tight">
                        Profil
                    </h1>
                    <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                        Kelola akun dan pengaturan Anda
                    </p>
                </div>

                {/* Responsive Layout: Desktop 2-column, Mobile Drill-down */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    {/* LEFT COLUMN: Profile Summary Card + Menu List (Visible on desktop or when mobileView === 'menu') */}
                    <div
                        className={`md:col-span-5 lg:col-span-4 space-y-4 ${
                            mobileView === 'detail' ? 'hidden md:block' : 'block'
                        }`}
                    >
                        {/* Profile Info Card (Screen 1 Top) */}
                        <div className="bg-white dark:bg-[#0C1D36] border sm:border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-2xl p-6 shadow-xs text-center relative overflow-hidden">
                            {/* Avatar with Camera Overlay Badge */}
                            <div className="relative inline-block mx-auto mb-3">
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white dark:border-[#0C1D36] shadow-md bg-[#E0F0FF] mx-auto">
                                    <img
                                        src="/images/avatar-prima.jpg"
                                        alt={info.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            // Fallback to avatar-titik or initial
                                            (e.target as HTMLImageElement).src = '/images/avatar-titik.png';
                                        }}
                                    />
                                </div>
                                <div
                                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#0060F4] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#0C1D36] cursor-pointer hover:bg-[#082870] transition-colors"
                                    title="Ubah Foto Profil"
                                    onClick={() => showToast('Fitur unggah foto avatar dapat diatur melalui Super Admin.')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="text-lg font-black text-[#0B1F63] dark:text-white tracking-tight">
                                {info.name}
                            </h2>
                            <p className="text-xs font-semibold text-[#0060F4] dark:text-[#38BDF8] mt-0.5">
                                {info.title || info.role}
                            </p>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5 font-medium">
                                {info.company}
                            </p>
                        </div>

                        {/* Navigation Menu List (Screen 1 Bottom) */}
                        <div className="space-y-2.5 sm:space-y-3">
                            {/* 1. Informasi Akun */}
                            <button
                                type="button"
                                onClick={() => navigateTo('akun')}
                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                                    activeSubScreen === 'akun'
                                        ? 'bg-[#E8F1FD] dark:bg-[#132847] border-[#0060F4]/30 text-[#0060F4] dark:text-[#38BDF8] font-bold shadow-xs'
                                        : 'bg-white dark:bg-[#0C1D36] border-[#DCEAF8] dark:border-[#1E3A5F] hover:bg-[#F0F8FF] dark:hover:bg-[#102444] text-[#0B1F63] dark:text-white font-semibold'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#E0F0FF] dark:bg-[#1A3358] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold">Informasi Akun</span>
                                </div>
                                <svg className="w-4 h-4 text-[#52658E]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {/* 2. Ubah Kata Sandi */}
                            <button
                                type="button"
                                onClick={() => navigateTo('password')}
                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                                    activeSubScreen === 'password'
                                        ? 'bg-[#E8F1FD] dark:bg-[#132847] border-[#0060F4]/30 text-[#0060F4] dark:text-[#38BDF8] font-bold shadow-xs'
                                        : 'bg-white dark:bg-[#0C1D36] border-[#DCEAF8] dark:border-[#1E3A5F] hover:bg-[#F0F8FF] dark:hover:bg-[#102444] text-[#0B1F63] dark:text-white font-semibold'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#E0F0FF] dark:bg-[#1A3358] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold">Ubah Kata Sandi</span>
                                </div>
                                <svg className="w-4 h-4 text-[#52658E]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {/* 3. Pengaturan Notifikasi */}
                            <button
                                type="button"
                                onClick={() => navigateTo('notifikasi')}
                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                                    activeSubScreen === 'notifikasi'
                                        ? 'bg-[#E8F1FD] dark:bg-[#132847] border-[#0060F4]/30 text-[#0060F4] dark:text-[#38BDF8] font-bold shadow-xs'
                                        : 'bg-white dark:bg-[#0C1D36] border-[#DCEAF8] dark:border-[#1E3A5F] hover:bg-[#F0F8FF] dark:hover:bg-[#102444] text-[#0B1F63] dark:text-white font-semibold'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#E0F0FF] dark:bg-[#1A3358] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold">Pengaturan Notifikasi</span>
                                </div>
                                <svg className="w-4 h-4 text-[#52658E]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {/* 4. Preferensi Tampilan */}
                            <button
                                type="button"
                                onClick={() => navigateTo('tampilan')}
                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                                    activeSubScreen === 'tampilan'
                                        ? 'bg-[#E8F1FD] dark:bg-[#132847] border-[#0060F4]/30 text-[#0060F4] dark:text-[#38BDF8] font-bold shadow-xs'
                                        : 'bg-white dark:bg-[#0C1D36] border-[#DCEAF8] dark:border-[#1E3A5F] hover:bg-[#F0F8FF] dark:hover:bg-[#102444] text-[#0B1F63] dark:text-white font-semibold'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#E0F0FF] dark:bg-[#1A3358] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold">Preferensi Tampilan</span>
                                </div>
                                <svg className="w-4 h-4 text-[#52658E]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {/* 5. Keluar (Logout) */}
                            <button
                                type="button"
                                onClick={handleLogoutClick}
                                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-[#FFF0F2] dark:bg-[#3D141C]/50 hover:bg-[#FFE4E8] dark:hover:bg-[#4D1A24] transition-all text-left text-[#C62840] font-bold cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#FFE7EC] dark:bg-[#3D141C] text-[#C62840] flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold">Keluar</span>
                                </div>
                                <svg className="w-4 h-4 text-[#C62840]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Active Sub-screen View */}
                    <div
                        className={`md:col-span-7 lg:col-span-8 ${
                            mobileView === 'menu' ? 'hidden md:block' : 'block'
                        }`}
                    >
                        {/* Mobile Back Header Bar (Sticky Top) */}
                        <div className="sticky top-16 z-20 flex items-center gap-3 border-b border-[#DCEAF8] bg-white px-4 py-3.5 shadow-xs dark:border-[#1E3A5F] dark:bg-[#0C1D36] md:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileView('menu')}
                                className="flex size-11 items-center justify-center rounded-full bg-[#E0F0FF] text-[#0060F4] transition-colors hover:bg-[#0060F4] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:bg-[#1A3358] dark:text-[#38BDF8]"
                                aria-label="Kembali ke Menu Profil"
                            >
                                <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h2 className="text-base font-extrabold text-[#0B1F63] dark:text-white">
                                {activeSubScreen === 'akun' && 'Informasi Akun'}
                                {activeSubScreen === 'password' && 'Ubah Kata Sandi'}
                                {activeSubScreen === 'notifikasi' && 'Pengaturan Notifikasi'}
                                {activeSubScreen === 'tampilan' && 'Preferensi Tampilan'}
                            </h2>
                        </div>

                        {/* ── SCREEN 2: INFORMASI AKUN ── */}
                        {activeSubScreen === 'akun' && (
                            <div className="bg-white dark:bg-[#0C1D36] sm:border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-none sm:rounded-2xl p-4 sm:p-7 shadow-none sm:shadow-xs space-y-3.5 sm:space-y-4 flex-1">
                                <div className="hidden md:flex items-center justify-between border-b border-[#DCEAF8] dark:border-[#1E3A5F] pb-4">
                                    <div>
                                        <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">
                                            Informasi Akun
                                        </h2>
                                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                            Data diri terverifikasi staf operasional SJA
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#DCF7E8] text-[#087443]">
                                        Akun Terverifikasi
                                    </span>
                                </div>

                                {/* Center Avatar with edit icon */}
                                <div className="text-center pt-2 pb-1">
                                    <div className="relative inline-block mx-auto">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#E0F0FF] dark:border-[#1E3A5F] shadow-sm bg-[#E0F0FF] mx-auto">
                                            <img
                                                src="/images/avatar-prima.jpg"
                                                alt={info.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/images/avatar-titik.png';
                                                }}
                                            />
                                        </div>
                                        <div
                                            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0060F4] text-white flex items-center justify-center shadow-xs cursor-pointer hover:bg-[#082870] transition-colors"
                                            title="Ubah Foto Profil"
                                            onClick={() => showToast('Ubah foto profil melalui Super Admin.')}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Fields matching Screen 2 */}
                                <div className="space-y-3.5">
                                    {/* Nama Lengkap */}
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                            Nama Lengkap
                                        </label>
                                        <div className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-[#081528] border border-[#DCEAF8] dark:border-[#1E3A5F] text-sm font-semibold text-[#0B1F63] dark:text-white">
                                            {info.name}
                                        </div>
                                    </div>

                                    {/* Jabatan */}
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                            Jabatan
                                        </label>
                                        <div className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-[#081528] border border-[#DCEAF8] dark:border-[#1E3A5F] text-sm font-semibold text-[#0B1F63] dark:text-white">
                                            {info.title || info.role}
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                            Email
                                        </label>
                                        <div className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-[#081528] border border-[#DCEAF8] dark:border-[#1E3A5F] text-sm font-semibold text-[#0B1F63] dark:text-white flex items-center gap-2.5">
                                            <svg className="w-4 h-4 text-[#0060F4] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            <span>{info.email}</span>
                                        </div>
                                    </div>

                                    {/* No. Handphone */}
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                            No. Handphone
                                        </label>
                                        <div className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-[#081528] border border-[#DCEAF8] dark:border-[#1E3A5F] text-sm font-semibold text-[#0B1F63] dark:text-white flex items-center gap-2.5">
                                            <svg className="w-4 h-4 text-[#0060F4] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span>{info.phone}</span>
                                        </div>
                                    </div>

                                    {/* Departemen */}
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                            Departemen
                                        </label>
                                        <div className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-[#081528] border border-[#DCEAF8] dark:border-[#1E3A5F] text-sm font-semibold text-[#0B1F63] dark:text-white">
                                            {info.department}
                                        </div>
                                    </div>

                                    {/* Lokasi Kerja */}
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                            Lokasi Kerja
                                        </label>
                                        <div className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-[#081528] border border-[#DCEAF8] dark:border-[#1E3A5F] text-sm font-semibold text-[#0B1F63] dark:text-white flex items-center gap-2.5">
                                            <svg className="w-4 h-4 text-[#0060F4] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>{info.location}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Blue Lock Callout Box */}
                                <div className="mt-5 p-4 rounded-xl bg-[#E0F0FF]/60 dark:bg-[#132847]/60 border border-[#DCEAF8] dark:border-[#1E3A5F] flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#0060F4] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <div className="text-xs text-[#0B1F63] dark:text-[#E7F0FA] leading-relaxed">
                                        <p className="font-bold">Informasi ini tidak dapat diubah.</p>
                                        <p className="text-[#52658E] dark:text-[#B5C8DC] mt-0.5">
                                            Untuk perubahan data profil, silakan hubungi Super Admin Sistem Keagenan Kapal.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── SCREEN 3: UBAH KATA SANDI ── */}
                        {activeSubScreen === 'password' && (
                            <div className="bg-white dark:bg-[#0C1D36] sm:border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-none sm:rounded-2xl p-4 sm:p-7 shadow-none sm:shadow-xs space-y-4 sm:space-y-5 flex-1">
                                {/* Large Lock Circle Illustration */}
                                <div className="text-center pt-2">
                                    <div className="w-20 h-20 rounded-full bg-[#E0F0FF] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">
                                        Jaga keamanan akun Anda
                                    </h2>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1">
                                        Gunakan kata sandi yang kuat dan rahasia.
                                    </p>
                                </div>

                                {passwordSuccess && (
                                    <div className="p-3.5 rounded-xl bg-[#DCF7E8] text-[#087443] text-xs font-bold flex items-center gap-2 border border-[#087443]/20">
                                        <span>✓</span>
                                        <span>Kata sandi Anda berhasil diperbarui.</span>
                                    </div>
                                )}

                                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg mx-auto">
                                    {/* Kata Sandi Saat Ini */}
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                            Kata Sandi Saat Ini
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52658E]">
                                                <svg className="w-4 h-4 text-[#0060F4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={passwordData.current_password}
                                                onChange={(e) => setPasswordData('current_password', e.target.value)}
                                                placeholder="Masukkan kata sandi saat ini"
                                                className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#52658E] hover:text-[#0B1F63] cursor-pointer"
                                            >
                                                {showCurrentPassword ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        {passwordErrors.current_password && (
                                            <p className="text-xs text-[#C62840] mt-1 font-medium">{passwordErrors.current_password}</p>
                                        )}
                                    </div>

                                    {/* Kata Sandi Baru */}
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                            Kata Sandi Baru
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52658E]">
                                                <svg className="w-4 h-4 text-[#0060F4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                value={passwordData.password}
                                                onChange={(e) => setPasswordData('password', e.target.value)}
                                                placeholder="Minimal 8 karakter"
                                                className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#52658E] hover:text-[#0B1F63] cursor-pointer"
                                            >
                                                {showNewPassword ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        {passwordErrors.password && (
                                            <p className="text-xs text-[#C62840] mt-1 font-medium">{passwordErrors.password}</p>
                                        )}
                                    </div>

                                    {/* Password Criteria Checklist Box */}
                                    <div className="p-3.5 rounded-xl bg-[#F0F8FF] dark:bg-[#081528] border border-[#DCEAF8] dark:border-[#1E3A5F] space-y-1.5 text-xs">
                                        <p className="font-bold text-[#0B1F63] dark:text-[#E7F0FA]">Kata sandi yang baik:</p>
                                        <div className="space-y-1 text-[#52658E] dark:text-[#B5C8DC]">
                                            <div className="flex items-center gap-2">
                                                <span className={hasMinLength ? 'text-[#087443] font-bold' : 'text-[#52658E]'}>
                                                    {hasMinLength ? '✓' : '•'}
                                                </span>
                                                <span className={hasMinLength ? 'text-[#087443] font-semibold' : ''}>
                                                    Minimal 8 karakter
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={hasUpperAndLower ? 'text-[#087443] font-bold' : 'text-[#52658E]'}>
                                                    {hasUpperAndLower ? '✓' : '•'}
                                                </span>
                                                <span className={hasUpperAndLower ? 'text-[#087443] font-semibold' : ''}>
                                                    Menggunakan huruf besar dan kecil
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={hasNumber ? 'text-[#087443] font-bold' : 'text-[#52658E]'}>
                                                    {hasNumber ? '✓' : '•'}
                                                </span>
                                                <span className={hasNumber ? 'text-[#087443] font-semibold' : ''}>
                                                    Menggunakan angka
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={hasSymbol ? 'text-[#087443] font-bold' : 'text-[#52658E]'}>
                                                    {hasSymbol ? '✓' : '•'}
                                                </span>
                                                <span className={hasSymbol ? 'text-[#087443] font-semibold' : ''}>
                                                    Menggunakan simbol (contoh: !@#$%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Konfirmasi Kata Sandi Baru */}
                                    <div>
                                        <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                            Konfirmasi Kata Sandi Baru
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52658E]">
                                                <svg className="w-4 h-4 text-[#0060F4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={passwordData.password_confirmation}
                                                onChange={(e) => setPasswordData('password_confirmation', e.target.value)}
                                                placeholder="Ulangi kata sandi baru"
                                                className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] text-sm text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#52658E] hover:text-[#0B1F63] cursor-pointer"
                                            >
                                                {showConfirmPassword ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={passwordProcessing}
                                            className="w-full py-3.5 px-4 rounded-xl bg-[#0060F4] hover:bg-[#082870] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </svg>
                                            <span>{passwordProcessing ? 'Menyimpan...' : 'Ubah Kata Sandi'}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ── SCREEN 4: PENGATURAN NOTIFIKASI ── */}
                        {activeSubScreen === 'notifikasi' && (
                            <div className="bg-white dark:bg-[#0C1D36] sm:border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-none sm:rounded-2xl p-4 sm:p-7 shadow-none sm:shadow-xs space-y-4 sm:space-y-5 flex-1">
                                {/* Centered Bell Circle */}
                                <div className="text-center pt-2">
                                    <div className="w-20 h-20 rounded-full bg-[#E0F0FF] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                    <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">
                                        Atur Notifikasi
                                    </h2>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1">
                                        Pilih jenis notifikasi yang ingin Anda terima.
                                    </p>
                                </div>

                                {/* 3 Notification Toggle Rows */}
                                <div className="space-y-3 pt-2">
                                    {/* 1. Status Pengajuan */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528]">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-[#E0F0FF] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-[#0B1F63] dark:text-white">
                                                    Status Pengajuan
                                                </h3>
                                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                                    Notifikasi perubahan status pengajuan (diproses, selesai, dll).
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = !notifPengajuan;
                                                setNotifPengajuan(next);
                                                showToast(next ? 'Notifikasi Status Pengajuan diaktifkan' : 'Notifikasi Status Pengajuan dinonaktifkan');
                                            }}
                                            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                                                notifPengajuan ? 'bg-[#0060F4]' : 'bg-gray-300 dark:bg-gray-700'
                                            }`}
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                                    notifPengajuan ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* 2. Informasi Kapal */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528]">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-[#E0F0FF] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 19l2.5 3h15l2.5-3L20 12H4L2 19z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12V6h4v6" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 12V8h4v4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-[#0B1F63] dark:text-white">
                                                    Informasi Kapal
                                                </h3>
                                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                                    Notifikasi update jadwal & aktivitas kapal.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = !notifKapal;
                                                setNotifKapal(next);
                                                showToast(next ? 'Notifikasi Informasi Kapal diaktifkan' : 'Notifikasi Informasi Kapal dinonaktifkan');
                                            }}
                                            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                                                notifKapal ? 'bg-[#0060F4]' : 'bg-gray-300 dark:bg-gray-700'
                                            }`}
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                                    notifKapal ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* 3. Pengingat Jadwal */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528]">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-[#E0F0FF] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-[#0B1F63] dark:text-white">
                                                    Pengingat Jadwal
                                                </h3>
                                                <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                                                    Notifikasi jadwal kapal yang akan datang.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = !notifJadwal;
                                                setNotifJadwal(next);
                                                showToast(next ? 'Notifikasi Pengingat Jadwal diaktifkan' : 'Notifikasi Pengingat Jadwal dinonaktifkan');
                                            }}
                                            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                                                notifJadwal ? 'bg-[#0060F4]' : 'bg-gray-300 dark:bg-gray-700'
                                            }`}
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                                    notifJadwal ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Callout Info */}
                                <div className="mt-5 p-4 rounded-xl bg-[#E0F0FF]/60 dark:bg-[#132847]/60 border border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-[#0060F4] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                        i
                                    </div>
                                    <p className="text-xs text-[#0B1F63] dark:text-[#E7F0FA]">
                                        Notifikasi akan dikirim melalui aplikasi dan email (jika ada).
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── SCREEN 5: PREFERENSI TAMPILAN ── */}
                        {activeSubScreen === 'tampilan' && (
                            <div className="bg-white dark:bg-[#0C1D36] sm:border border-[#DCEAF8] dark:border-[#1E3A5F] rounded-none sm:rounded-2xl p-4 sm:p-7 shadow-none sm:shadow-xs space-y-4 sm:space-y-5 flex-1">
                                {/* Centered Gear Circle */}
                                <div className="text-center pt-2">
                                    <div className="w-20 h-20 rounded-full bg-[#E0F0FF] dark:bg-[#132847] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-lg font-black text-[#0B1F63] dark:text-white">
                                        Pengaturan Tampilan
                                    </h2>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1">
                                        Sesuaikan tampilan aplikasi sesuai kenyamanan Anda.
                                    </p>
                                </div>

                                {/* Section 1: Tema Aplikasi */}
                                <div>
                                    <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-2.5">
                                        Tema Aplikasi
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Terang */}
                                        <button
                                            type="button"
                                            onClick={() => handleThemeChange('terang')}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer relative ${
                                                selectedTheme === 'terang'
                                                    ? 'border-[#0060F4] bg-[#F0F8FF] dark:bg-[#102444] text-[#0060F4]'
                                                    : 'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] text-[#52658E] hover:border-[#0060F4]/40'
                                            }`}
                                        >
                                            {selectedTheme === 'terang' && (
                                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0060F4] text-white flex items-center justify-center text-[10px] font-bold">
                                                    ✓
                                                </div>
                                            )}
                                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-500 flex items-center justify-center">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-bold">Terang</span>
                                        </button>

                                        {/* Gelap */}
                                        <button
                                            type="button"
                                            onClick={() => handleThemeChange('gelap')}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer relative ${
                                                selectedTheme === 'gelap'
                                                    ? 'border-[#0060F4] bg-[#F0F8FF] dark:bg-[#102444] text-[#0060F4] dark:text-[#38BDF8]'
                                                    : 'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#081528] text-[#52658E] hover:border-[#0060F4]/40'
                                            }`}
                                        >
                                            {selectedTheme === 'gelap' && (
                                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0060F4] text-white flex items-center justify-center text-[10px] font-bold">
                                                    ✓
                                                </div>
                                            )}
                                            <div className="w-10 h-10 rounded-xl bg-slate-700 text-blue-200 flex items-center justify-center">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-bold">Gelap</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Section 2: Format Tanggal */}
                                <div>
                                    <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                        Format Tanggal
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0060F4]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <select
                                            value={dateFormat}
                                            onChange={(e) => {
                                                setDateFormat(e.target.value);
                                                showToast(`Format tanggal diubah ke ${e.target.value}`);
                                            }}
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] text-sm font-semibold text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4] appearance-none cursor-pointer"
                                        >
                                            <option value="DD MMMM YYYY">DD MMMM YYYY</option>
                                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#52658E]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1 font-medium">
                                        Contoh: 16 September 2026
                                    </p>
                                </div>

                                {/* Section 3: Zona Waktu */}
                                <div>
                                    <label className="block text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] mb-1">
                                        Zona Waktu
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0060F4]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <select
                                            value={timezone}
                                            onChange={(e) => {
                                                setTimezone(e.target.value);
                                                showToast(`Zona waktu diubah ke ${e.target.value}`);
                                            }}
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#081528] text-sm font-semibold text-[#0B1F63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0060F4] appearance-none cursor-pointer"
                                        >
                                            <option value="WIB (GMT+7)">WIB (GMT+7)</option>
                                            <option value="WITA (GMT+8)">WITA (GMT+8)</option>
                                            <option value="WIT (GMT+9)">WIT (GMT+9)</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#52658E]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Logout Confirmation Dialog (Bottom Sheet on Mobile) ── */}
            <ConfirmDialog
                isOpen={isLogoutConfirmOpen}
                onClose={() => {
                    if (!logoutProcessing) setIsLogoutConfirmOpen(false);
                }}
                onConfirm={handleConfirmLogout}
                title="Konfirmasi Keluar"
                description="Apakah Anda yakin ingin keluar dari Sistem Keagenan Kapal PT Samudra Jaya Andalas?"
                confirmLabel={logoutProcessing ? 'Mengeluarkan…' : 'Ya, Keluar'}
                confirmVariant="danger"
                processing={logoutProcessing}
                asBottomSheetOnMobile={true}
            >
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300">
                    <svg className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Sesi Anda akan diakhiri dan Anda perlu login kembali untuk mengakses sistem.</span>
                </div>
            </ConfirmDialog>

            {/* ── Standard AlertToast Feedback ── */}
            {toast && (
                <AlertToast
                    variant={toast.variant}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}
        </AppLayout>
    );
}
