import React, { FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Logo from '../../Components/ui/Logo';
import Button from '../../Components/ui/Button';

interface LoginProps {
    status?: string;
    canResetPassword?: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const handleQuickLogin = (email: string) => {
        setData({
            email,
            password: 'password',
            remember: true,
        });
    };

    return (
        <div className="min-h-screen bg-[#F0F8FF] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-[#0060F4] selection:text-white">
            <Head title="Masuk Sistem — PT Samudra Jaya Andalas" />

            {/* Subtle maritime grid background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#0060F4_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
                <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
                    <Logo />
                </Link>
                <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                    Masuk ke Sistem Keagenan
                </h2>
                <p className="mt-2 text-sm text-[#52658E]">
                    Akses portal operasional kapal terintegrasi
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
                <div className="bg-white py-8 px-6 sm:px-10 shadow-[0_8px_30px_rgba(8,40,112,0.06)] border border-[#DCEAF8] rounded-[16px]">
                    {status && (
                        <div className="mb-4 p-3 rounded-xl bg-[#DCF7E8] text-[#087443] text-sm font-medium border border-[#BCE0FD]">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#0B1F63]">
                                Alamat Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                required
                                placeholder="nama@samudrajaya.co.id"
                                onChange={(e) => setData('email', e.target.value)}
                                className="mt-1.5 block w-full px-3.5 py-2.5 bg-[#F0F8FF]/40 border border-[#DCEAF8] rounded-[12px] text-sm text-[#0B1F63] placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] transition-all"
                            />
                            {errors.email && (
                                <p className="mt-1.5 text-xs text-[#C62840] font-medium">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-[#0B1F63]">
                                Kata Sandi
                            </label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                autoComplete="current-password"
                                required
                                placeholder="••••••••"
                                onChange={(e) => setData('password', e.target.value)}
                                className="mt-1.5 block w-full px-3.5 py-2.5 bg-[#F0F8FF]/40 border border-[#DCEAF8] rounded-[12px] text-sm text-[#0B1F63] placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] transition-all"
                            />
                            {errors.password && (
                                <p className="mt-1.5 text-xs text-[#C62840] font-medium">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-[#DCEAF8] text-[#0060F4] shadow-sm focus:ring-[#0060F4]/30"
                                />
                                <span className="text-xs text-[#52658E]">Ingat saya</span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-xs font-semibold text-[#0060F4] hover:underline"
                                >
                                    Lupa sandi?
                                </Link>
                            )}
                        </div>

                        <div>
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full shadow-md shadow-[#0060F4]/20"
                                isLoading={processing}
                            >
                                Masuk ke Sistem
                            </Button>
                        </div>
                    </form>

                    {/* Quick Login Helper for Testing / Demo */}
                    <div className="mt-6 pt-6 border-t border-[#DCEAF8]">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#52658E] text-center mb-3">
                            Pilih Akun Demo Cepat
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleQuickLogin('titik@samudrajaya.co.id')}
                                className="p-2 text-left rounded-xl bg-[#F0F8FF] hover:bg-[#E0F0FF] border border-[#DCEAF8] transition-colors"
                            >
                                <p className="text-xs font-bold text-[#0B1F63]">Bu Titik</p>
                                <p className="text-[11px] text-[#52658E]">Operational Center</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleQuickLogin('prima@samudrajaya.co.id')}
                                className="p-2 text-left rounded-xl bg-[#F0F8FF] hover:bg-[#E0F0FF] border border-[#DCEAF8] transition-colors"
                            >
                                <p className="text-xs font-bold text-[#0B1F63]">Pak Prima</p>
                                <p className="text-[11px] text-[#52658E]">Staf Lapangan</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleQuickLogin('admin@samudrajaya.co.id')}
                                className="p-2 text-left rounded-xl bg-[#F0F8FF] hover:bg-[#E0F0FF] border border-[#DCEAF8] transition-colors"
                            >
                                <p className="text-xs font-bold text-[#0B1F63]">Admin</p>
                                <p className="text-[11px] text-[#52658E]">Admin Sistem</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleQuickLogin('owner@samudrajaya.co.id')}
                                className="p-2 text-left rounded-xl bg-[#F0F8FF] hover:bg-[#E0F0FF] border border-[#DCEAF8] transition-colors"
                            >
                                <p className="text-xs font-bold text-[#0B1F63]">Hendra Wijaya</p>
                                <p className="text-[11px] text-[#52658E]">Owner / Direktur</p>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-xs font-semibold text-[#52658E] hover:text-[#0060F4] transition-colors"
                    >
                        ← Kembali ke Halaman Utama (Landing Page)
                    </Link>
                </div>
            </div>
        </div>
    );
}
