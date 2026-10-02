import Button from '@/Components/ui/Button';
import Logo from '@/Components/ui/Logo';
import ThemeToggle from '@/Components/ui/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import { Anchor, Building2, CheckCircle2, Ship, UserRound } from 'lucide-react';
import type { FormEventHandler } from 'react';

interface LoginProps {
    status?: string;
    canResetPassword?: boolean;
}

const demoAccounts = [
    {
        name: 'Bu Titik',
        email: 'titik@samudrajaya.co.id',
        role: 'Admin',
        subtitle: 'Administrasi dan operasional',
        icon: Building2,
    },
    {
        name: 'Pak Prima',
        email: 'prima@samudrajaya.co.id',
        role: 'Lapangan',
        subtitle: 'Kunjungan dan aktivitas kapal',
        icon: Anchor,
    },
    {
        name: 'Pak Ryan',
        email: 'ryan@samudrajaya.co.id',
        role: 'Direktur',
        subtitle: 'Persetujuan dan pengawasan',
        icon: UserRound,
    },
    {
        name: 'Hendra Wijaya',
        email: 'owner@samudrajaya.co.id',
        role: 'Owner',
        subtitle: 'Ringkasan strategis perusahaan',
        icon: Ship,
    },
];

export default function Login({ status, canResetPassword }: LoginProps) {
    const { isDark } = useTheme();
    const shouldReduceMotion = useReducedMotion();
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
            onError: (submissionErrors) => {
                const firstInvalidField = submissionErrors.email ? 'email' : submissionErrors.password ? 'password' : null;

                if (firstInvalidField) {
                    document.getElementById(firstInvalidField)?.focus();
                }
            },
        });
    };

    const handleQuickLogin = (email: string) => {
        setData({
            email,
            password: 'password',
            remember: true,
        });

        router.post(route('login'), {
            email,
            password: 'password',
            remember: true,
        });
    };

    return (
        <div className="min-h-dvh bg-[#F5FAFF] text-[#0B1F63] selection:bg-[#0060F4] selection:text-white dark:bg-[#071322] dark:text-[#F1F5F9] dark:[color-scheme:dark] lg:grid lg:grid-cols-2">
            <Head>
                <title>Masuk Sistem — PT Samudra Jaya Andalas</title>
                <meta head-key="theme-color" name="theme-color" content={isDark ? '#071322' : '#F5FAFF'} />
            </Head>

            <a
                href="#main-content"
                className="sr-only z-50 rounded-lg bg-white px-4 py-3 font-bold text-[#0B1F63] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-[#0060F4]"
            >
                Lewati ke formulir masuk
            </a>

            <section className="relative hidden min-h-dvh overflow-hidden bg-[#061B3D] text-white lg:flex lg:flex-col lg:justify-between">
                <img
                    src="/images/harbor-banner.jpg"
                    width="1376"
                    height="768"
                    fetchPriority="high"
                    alt="Kegiatan kapal dan bongkar muat di area pelabuhan"
                    className="absolute inset-0 size-full object-cover"
                />
                <div className="absolute inset-0 bg-[#061B3D]/68" />

                <div className="relative p-8 xl:p-12">
                    <Link
                        href="/"
                        className="inline-flex rounded-xl bg-[#061B3D]/55 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        <Logo variant="dark" />
                    </Link>
                </div>

                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                    className="relative max-w-2xl p-8 xl:p-12"
                >
                    <div className="mb-6 h-1 w-16 rounded-full bg-[#19B5F7]" />
                    <h2 className="max-w-xl text-balance text-4xl font-black leading-tight xl:text-5xl">
                        People on Ground. Support at Sea.
                    </h2>
                    <p className="mt-4 max-w-xl text-pretty text-sm leading-6 text-white/80 xl:text-base xl:leading-7">
                        Satu pusat kendali untuk koordinasi kunjungan kapal, kebutuhan operasional, dokumen, dan keuangan PT Samudra Jaya Andalas.
                    </p>
                    <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 border-t border-white/20 pt-5 text-xs font-semibold text-white/85">
                        <span>Operasional kapal</span>
                        <span>Kontrol dokumen</span>
                        <span>Monitoring keuangan</span>
                    </div>
                </motion.div>
            </section>

            <main id="main-content" tabIndex={-1} className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 sm:px-8 lg:px-10 xl:px-16">
                <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
                    <ThemeToggle variant="pill" />
                </div>

                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                    className="relative z-10 w-full max-w-xl pt-14 sm:pt-10 lg:pt-0"
                >
                    <div className="mb-7 lg:hidden">
                        <Link
                            href="/"
                            className="inline-flex rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                        >
                            <Logo />
                        </Link>
                    </div>

                    <header className="mb-6">
                        <p className="text-sm font-semibold text-[#0060F4] dark:text-[#60A5FA]">Selamat datang kembali</p>
                        <h1 className="mt-1 text-balance text-3xl font-black text-[#0B1F63] sm:text-4xl dark:text-[#F1F5F9]">Masuk ke sistem</h1>
                        <p className="mt-2 text-pretty text-sm leading-6 text-[#52658E] dark:text-[#A8BAD0]">
                            Gunakan akun PT SJA untuk melanjutkan ke ruang kerja Anda.
                        </p>
                    </header>

                    <div className="rounded-2xl border border-[#DCEAF8] bg-white p-5 shadow-sm sm:p-7 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                        {status && (
                            <div
                                role="status"
                                aria-live="polite"
                                className="mb-5 flex items-start gap-2 rounded-xl border border-[#BCE8CF] bg-[#EAF9F0] p-3 text-sm font-medium text-[#087443] dark:border-[#176044] dark:bg-[#0B3328] dark:text-[#6EE7B7]"
                            >
                                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                                <span>{status}</span>
                            </div>
                        )}

                        <form onSubmit={submit} className="grid gap-5">
                            <div>
                                <label htmlFor="email" className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    Alamat email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    autoComplete="username"
                                    spellCheck={false}
                                    required
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                    placeholder="nama@samudrajaya.co.id"
                                    onChange={(event) => setData('email', event.target.value)}
                                    className="mt-2 block min-h-12 w-full rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] px-4 text-sm text-[#0B1F63] placeholder:text-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#29496D] dark:bg-[#091A2E] dark:text-[#F1F5F9] dark:placeholder:text-[#71849D] dark:focus-visible:border-[#38BDF8] dark:focus-visible:ring-[#38BDF8]/25"
                                />
                                {errors.email && (
                                    <p id="email-error" role="alert" className="mt-1.5 text-xs font-medium text-[#C62840] dark:text-[#FCA5A5]">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="password" className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    Kata sandi
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    autoComplete="current-password"
                                    required
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                    placeholder="Masukkan kata sandi…"
                                    onChange={(event) => setData('password', event.target.value)}
                                    className="mt-2 block min-h-12 w-full rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] px-4 text-sm text-[#0B1F63] placeholder:text-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#29496D] dark:bg-[#091A2E] dark:text-[#F1F5F9] dark:placeholder:text-[#71849D] dark:focus-visible:border-[#38BDF8] dark:focus-visible:ring-[#38BDF8]/25"
                                />
                                {errors.password && (
                                    <p id="password-error" role="alert" className="mt-1.5 text-xs font-medium text-[#C62840] dark:text-[#FCA5A5]">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-[#52658E] dark:text-[#A8BAD0]">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(event) => setData('remember', event.target.checked)}
                                        className="rounded border-[#C7DCF0] bg-white text-[#0060F4] focus:ring-[#0060F4]/30 dark:border-[#416283] dark:bg-[#091A2E]"
                                    />
                                    Ingat saya
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-[#0060F4] hover:bg-[#EAF4FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#60A5FA] dark:hover:bg-[#132847]"
                                    >
                                        Lupa kata sandi?
                                    </Link>
                                )}
                            </div>

                            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={processing}>
                                Masuk ke Sistem
                            </Button>
                        </form>

                        <section className="mt-6 border-t border-[#DCEAF8] pt-5 dark:border-[#1E3A5F]" aria-labelledby="demo-accounts-title">
                            <div className="flex items-center justify-between gap-3">
                                <h2 id="demo-accounts-title" className="text-xs font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Akun demo</h2>
                                <span className="text-[10px] text-[#7C91AC] dark:text-[#94A3B8]">Pilih sesuai peran</span>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {demoAccounts.map((account) => {
                                    const Icon = account.icon;

                                    return (
                                        <button
                                            key={account.email}
                                            type="button"
                                            onClick={() => handleQuickLogin(account.email)}
                                            className={`grid min-h-[72px] grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${
                                                data.email === account.email
                                                    ? 'border-[#0060F4] bg-[#EAF4FF] dark:border-[#38BDF8] dark:bg-[#12335A]'
                                                    : 'border-[#DCEAF8] bg-[#F8FBFF] hover:border-[#9CC9F5] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#091A2E] dark:hover:border-[#416C98] dark:hover:bg-[#102844]'
                                            }`}
                                        >
                                            <span className="flex size-8 items-center justify-center rounded-lg bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52] dark:text-[#60A5FA]">
                                                <Icon aria-hidden="true" className="size-4" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-xs font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">{account.name}</span>
                                                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-[#0060F4] dark:bg-[#17375D] dark:text-[#7DD3FC]">{account.role}</span>
                                                </span>
                                                <span className="mt-1 block truncate text-[10px] text-[#52658E] dark:text-[#A8BAD0]">{account.subtitle}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
