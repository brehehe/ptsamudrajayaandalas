import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Navbar from '../Components/navigation/Navbar';
import Button from '../Components/ui/Button';
import Card from '../Components/ui/Card';
import StatusBadge from '../Components/ui/StatusBadge';
import Logo from '../Components/ui/Logo';

interface WelcomeProps {
    auth: {
        user?: {
            id: number;
            name: string;
            email: string;
        };
    };
}

export default function Welcome({ auth }: WelcomeProps) {
    const isAuthenticated = !!auth?.user;

    return (
        <div className="min-h-screen bg-[#F0F8FF] text-[#0B1F63] selection:bg-[#0060F4] selection:text-white">
            <Head title="PT Samudra Jaya Andalas — Keagenan Kapal & Ship Agency Management System" />

            {/* Navigation Bar */}
            <Navbar isAuthenticated={isAuthenticated} />

            {/* Hero Section (#beranda) */}
            <section
                id="beranda"
                className={
                    'relative overflow-hidden border-b border-[#DCEAF8] bg-white pb-20 pt-28 ' +
                    'md:bg-gradient-to-b md:from-white md:via-[#F0F8FF] md:to-[#E0F0FF]/40 ' +
                    'md:pb-28 md:pt-36'
                }
            >
                {/* Subtle maritime grid background */}
                <div
                    className={
                        'pointer-events-none absolute inset-0 hidden opacity-[0.03] md:block ' +
                        'bg-[radial-gradient(#0060F4_1px,transparent_1px)] ' +
                        '[background-size:24px_24px]'
                    }
                />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        {/* Text Column */}
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div
                                className={
                                    'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ' +
                                    'bg-[#E0F0FF] border border-[#BCE0FD] text-[#0060F4] text-xs ' +
                                    'sm:text-sm font-semibold tracking-wide'
                                }
                            >
                                <span className="w-2 h-2 rounded-full bg-[#0060F4] animate-pulse" />
                                PT. SAMUDRA JAYA ANDALAS
                            </div>

                            <h1
                                className={
                                    'text-3xl sm:text-4xl lg:text-5xl font-extrabold ' +
                                    'tracking-tight text-[#0B1F63] leading-[1.15]'
                                }
                            >
                                Operasional Kapal dalam{' '}
                                <span
                                    className={
                                        'text-[#0060F4] md:bg-gradient-to-r md:from-[#0060F4] ' +
                                        'md:to-[#19B5F7] md:bg-clip-text md:text-transparent'
                                    }
                                >
                                    Satu Alur yang Terhubung
                                </span>
                            </h1>

                            <p className="text-base sm:text-lg text-[#52658E] leading-relaxed max-w-2xl font-normal">
                                Kelola informasi kapal, pengajuan kebutuhan, koordinasi layanan
                                pelabuhan, dan pemantauan status operasional terpadu melalui sistem
                                PT Samudra Jaya Andalas.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                <Link href={isAuthenticated ? '/dashboard' : '/login'}>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="shadow-md shadow-[#0060F4]/20"
                                    >
                                        {isAuthenticated ? 'Buka Dashboard Sistem' : 'Masuk Sistem'}
                                    </Button>
                                </Link>
                                <a href="#layanan">
                                    <Button variant="outline" size="lg">
                                        Lihat Layanan
                                    </Button>
                                </a>
                            </div>

                            {/* Trust badges */}
                            <div className="pt-6 border-t border-[#DCEAF8] grid grid-cols-3 gap-4">
                                <div>
                                    <span className="block text-2xl font-bold text-[#0B1F63]">
                                        24/7
                                    </span>
                                    <span className="text-xs text-[#52658E]">
                                        Dukungan Keagenan Pelabuhan
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-2xl font-bold text-[#0B1F63]">
                                        Real-Time
                                    </span>
                                    <span className="text-xs text-[#52658E]">
                                        Pelacakan Status Kebutuhan
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-2xl font-bold text-[#0B1F63]">
                                        Tepat Waktu
                                    </span>
                                    <span className="text-xs text-[#52658E]">
                                        Clearance & Dokumen Kapal
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Visual Hero Mockup Preview */}
                        <div className="lg:col-span-5 relative">
                            <div
                                className={
                                    'relative mx-auto rounded-[20px] bg-[#E0F0FF] p-2.5 ' +
                                    'md:bg-gradient-to-br md:from-[#19B5F7]/30 md:to-[#0060F4]/40 ' +
                                    'shadow-[0_16px_40px_rgba(8,40,112,0.12)] border ' +
                                    'border-[#BCE0FD]'
                                }
                            >
                                <div
                                    className={
                                        'rounded-[16px] overflow-hidden bg-white border ' +
                                        'border-[#DCEAF8] shadow-inner'
                                    }
                                >
                                    {/* Preview Header */}
                                    <div className="bg-[#0D2945] px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#C62840]" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#087443]" />
                                        </div>
                                        <span
                                            className={
                                                'text-[11px] font-semibold tracking-wider ' +
                                                'text-[#B5C8DC] uppercase'
                                            }
                                        >
                                            Operational Control Center
                                        </span>
                                    </div>

                                    {/* Maritime Photo Banner */}
                                    <div
                                        className={
                                            'mobile-photo-copy relative flex h-44 flex-col ' +
                                            'justify-end overflow-hidden bg-[#8FCDF4] p-4 text-white ' +
                                            'md:bg-gradient-to-r md:from-[#082870] md:to-[#0D2945]'
                                        }
                                    >
                                        <img
                                            src="/images/port-bg.jpg"
                                            alt="Pelabuhan dan Kapal PT Samudra Jaya Andalas"
                                            className={
                                                'absolute inset-0 size-full object-cover ' +
                                                'md:mix-blend-overlay md:opacity-60'
                                            }
                                            onError={(e) => {
                                                // Fallback graceful gradient if image missing
                                                (e.target as HTMLImageElement).style.display =
                                                    'none';
                                            }}
                                        />
                                        <div className="relative z-10">
                                            <span className="text-xs text-[#19B5F7] font-semibold">
                                                Pelabuhan Gresik
                                            </span>
                                            <h3 className="text-lg font-bold text-white leading-tight">
                                                Monitoring Kapal & Layanan Sandar
                                            </h3>
                                            <p className="text-xs text-white/80 mt-1">
                                                Koordinasi cepat, kelancaran operasional pelayaran
                                            </p>
                                        </div>
                                    </div>

                                    {/* Simulated Live Queue */}
                                    <div className="p-4 space-y-3 bg-white">
                                        <div
                                            className={
                                                'flex items-center justify-between pb-2 border-b ' +
                                                'border-gray-100'
                                            }
                                        >
                                            <span className="text-xs font-bold text-[#0B1F63]">
                                                Kapal Aktif Hari Ini
                                            </span>
                                            <span className="text-[11px] font-semibold text-[#0060F4]">
                                                6 Kapal Terpantau
                                            </span>
                                        </div>

                                        <div
                                            className={
                                                'flex items-center justify-between p-2 rounded-xl ' +
                                                'bg-[#F0F8FF] border border-[#DCEAF8]'
                                            }
                                        >
                                            <div>
                                                <p className="text-xs font-bold text-[#0B1F63]">
                                                    KM Sarana Lintas Nusantara
                                                </p>
                                                <p className="text-[11px] text-[#52658E]">
                                                    General Cargo • IMO 9234567
                                                </p>
                                            </div>
                                            <StatusBadge status="labuh" label="Labuh" showDot />
                                        </div>

                                        <div
                                            className={
                                                'flex items-center justify-between p-2 rounded-xl ' +
                                                'bg-[#F0F8FF] border border-[#DCEAF8]'
                                            }
                                        >
                                            <div>
                                                <p className="text-xs font-bold text-[#0B1F63]">
                                                    MT Amigo
                                                </p>
                                                <p className="text-[11px] text-[#52658E]">
                                                    Container Ship • IMO 8765432
                                                </p>
                                            </div>
                                            <StatusBadge status="sandar" label="Sandar" showDot />
                                        </div>

                                        <div
                                            className={
                                                'flex items-center justify-between p-2 rounded-xl ' +
                                                'bg-[#F0F8FF] border border-[#DCEAF8]'
                                            }
                                        >
                                            <div>
                                                <p className="text-xs font-bold text-[#0B1F63]">
                                                    MT Kyodo
                                                </p>
                                                <p className="text-[11px] text-[#52658E]">
                                                    Oil Tanker • IMO 9876543
                                                </p>
                                            </div>
                                            <StatusBadge
                                                status="akan_datang"
                                                label="Akan Datang"
                                                showDot
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tentang Perusahaan (#tentang) */}
            <section id="tentang" className="py-20 bg-white border-b border-[#DCEAF8]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <span
                            className={
                                'text-xs font-bold uppercase tracking-wider text-[#0060F4] ' +
                                'bg-[#E0F0FF] px-3 py-1 rounded-full'
                            }
                        >
                            Tentang Perusahaan
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F63] tracking-tight">
                            Dedikasi Penuh untuk Kelancaran Pelayaran Anda
                        </h2>
                        <p className="text-base text-[#52658E] leading-relaxed">
                            PT Samudra Jaya Andalas adalah perusahaan keagenan kapal (Ship Agency)
                            yang berpengalaman melayani operasional kapal domestik dan
                            internasional. Kami bertindak sebagai penghubung resmi antara pemilik
                            kapal, nakhoda, otoritas pelabuhan, dan penyedia layanan maritim untuk
                            memastikan setiap kunjungan kapal berjalan lancar, aman, dan efisien.
                        </p>
                    </div>

                    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="p-6 text-left hoverable">
                            <div
                                className={
                                    'w-12 h-12 rounded-[14px] bg-[#E0F0FF] flex items-center ' +
                                    'justify-center text-[#0060F4] mb-5'
                                }
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944' +
                                            'a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0' +
                                            ' 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.' +
                                            '622 0-1.042-.133-2.052-.382-3.016z'
                                        }
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-[#0B1F63] mb-2">
                                Kepatuhan Regulasi & Otoritas
                            </h3>
                            <p className="text-sm text-[#52658E] leading-relaxed">
                                Seluruh prosedur perizinan, administrasi pelabuhan, bea cukai,
                                karantina, dan imigrasi dikoordinasikan secara ketat sesuai
                                peraturan maritim yang berlaku.
                            </p>
                        </Card>

                        <Card className="p-6 text-left hoverable">
                            <div
                                className={
                                    'w-12 h-12 rounded-[14px] bg-[#E0F0FF] flex items-center ' +
                                    'justify-center text-[#0060F4] mb-5'
                                }
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-[#0B1F63] mb-2">
                                Respon Cepat Staf Lapangan
                            </h3>
                            <p className="text-sm text-[#52658E] leading-relaxed">
                                Staf operasional kami siap siaga di dermaga dan area labuh untuk
                                melayani kebutuhan mendesak kapal, kru, maupun koordinasi bunker dan
                                air tawar.
                            </p>
                        </Card>

                        <Card className="p-6 text-left hoverable">
                            <div
                                className={
                                    'w-12 h-12 rounded-[14px] bg-[#E0F0FF] flex items-center ' +
                                    'justify-center text-[#0060F4] mb-5'
                                }
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 0' +
                                            '12-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293' +
                                            '.707V19a2 2 0 01-2 2z'
                                        }
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-[#0B1F63] mb-2">
                                Transparansi Biaya & Pelaporan
                            </h3>
                            <p className="text-sm text-[#52658E] leading-relaxed">
                                Rekapitulasi nota Pelindo, biaya jasa pihak ketiga, dan dokumen
                                pendukung dicatat secara transparan dan diverifikasi sebelum
                                penagihan ke prinsipal.
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Layanan Kami (#layanan) */}
            <section id="layanan" className="py-20 bg-[#F0F8FF] border-b border-[#DCEAF8]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <span
                            className={
                                'text-xs font-bold uppercase tracking-wider text-[#0060F4] ' +
                                'bg-[#E0F0FF] px-3 py-1 rounded-full'
                            }
                        >
                            Layanan Keagenan
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F63] tracking-tight">
                            Solusi Komprehensif di Pelabuhan
                        </h2>
                        <p className="text-base text-[#52658E] leading-relaxed">
                            Kami menyediakan ragam layanan komersial dan operasional pelabuhan untuk
                            mendukung kebutuhan kapal selama berlabuh dan bersandar.
                        </p>
                    </div>

                    <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="p-6 text-left hoverable bg-white">
                            <div
                                className={
                                    'h-10 w-10 rounded-xl bg-[#0060F4] text-white flex ' +
                                    'items-center justify-center font-bold mb-4'
                                }
                            >
                                1
                            </div>
                            <h3 className="text-lg font-bold text-[#0B1F63] mb-2">
                                Port Clearance In & Out
                            </h3>
                            <p className="text-sm text-[#52658E] leading-relaxed">
                                Pengurusan dokumen izin kedatangan dan keberangkatan kapal dengan
                                instansi KSOP, Karantina Kesehatan, Bea Cukai, dan Imigrasi.
                            </p>
                        </Card>

                        <Card className="p-6 text-left hoverable bg-white">
                            <div
                                className={
                                    'h-10 w-10 rounded-xl bg-[#0060F4] text-white flex ' +
                                    'items-center justify-center font-bold mb-4'
                                }
                            >
                                2
                            </div>
                            <h3 className="text-lg font-bold text-[#0B1F63] mb-2">
                                Koordinasi Tambat & Pandu
                            </h3>
                            <p className="text-sm text-[#52658E] leading-relaxed">
                                Pengaturan jadwal pandu tunda, alur pelayaran APBS, dan alokasi
                                dermaga sandar bekerja sama erat dengan Pelindo.
                            </p>
                        </Card>

                        <Card className="p-6 text-left hoverable bg-white">
                            <div
                                className={
                                    'h-10 w-10 rounded-xl bg-[#0060F4] text-white flex ' +
                                    'items-center justify-center font-bold mb-4'
                                }
                            >
                                3
                            </div>
                            <h3 className="text-lg font-bold text-[#0B1F63] mb-2">
                                Pasokan Fresh Water & Bunker
                            </h3>
                            <p className="text-sm text-[#52658E] leading-relaxed">
                                Penyediaan suplai air tawar berkualitas tinggi dan bahan bakar
                                minyak (BBM) solar dengan pengukuran akurat dan tepat waktu.
                            </p>
                        </Card>

                        <Card className="p-6 text-left hoverable bg-white">
                            <div
                                className={
                                    'h-10 w-10 rounded-xl bg-[#0060F4] text-white flex ' +
                                    'items-center justify-center font-bold mb-4'
                                }
                            >
                                4
                            </div>
                            <h3 className="text-lg font-bold text-[#0B1F63] mb-2">
                                Crew Change & Transportasi
                            </h3>
                            <p className="text-sm text-[#52658E] leading-relaxed">
                                Layanan penjemputan kru kapal, pengurusan visa/sign-on sign-off,
                                akomodasi, dan transportasi darat maupun laut (perahu motor).
                            </p>
                        </Card>

                        <Card className="p-6 text-left hoverable bg-white">
                            <div
                                className={
                                    'h-10 w-10 rounded-xl bg-[#0060F4] text-white flex ' +
                                    'items-center justify-center font-bold mb-4'
                                }
                            >
                                5
                            </div>
                            <h3 className="text-lg font-bold text-[#0B1F63] mb-2">
                                Ship Chandling & Provisions
                            </h3>
                            <p className="text-sm text-[#52658E] leading-relaxed">
                                Pemenuhan bahan makanan segar, perlengkapan dek dan mesin, suku
                                cadang kapal, serta perlengkapan keselamatan.
                            </p>
                        </Card>

                        <Card className="p-6 text-left hoverable bg-white">
                            <div
                                className={
                                    'h-10 w-10 rounded-xl bg-[#0060F4] text-white flex ' +
                                    'items-center justify-center font-bold mb-4'
                                }
                            >
                                6
                            </div>
                            <h3 className="text-lg font-bold text-[#0B1F63] mb-2">
                                Disbursement & Rekonsiliasi
                            </h3>
                            <p className="text-sm text-[#52658E] leading-relaxed">
                                Pengelolaan estimasi biaya (FDA/PDA), penanganan invoice nota
                                rampung Pelindo, dan penerbitan invoice penagihan resmi.
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Sistem Operasional (#sistem) */}
            <section id="sistem" className="py-20 bg-white border-b border-[#DCEAF8]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-6 space-y-6">
                            <span
                                className={
                                    'text-xs font-bold uppercase tracking-wider text-[#0060F4] ' +
                                    'bg-[#E0F0FF] px-3 py-1 rounded-full'
                                }
                            >
                                Portal Internal
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F63] tracking-tight">
                                Ship Agency Management System
                            </h2>
                            <p className="text-base text-[#52658E] leading-relaxed">
                                Antarmuka terintegrasi yang menghubungkan staf lapangan di dermaga
                                dengan tim operasional dan manajemen di kantor pusat:
                            </p>

                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div
                                        className={
                                            'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                            'items-center justify-center flex-shrink-0 font-bold ' +
                                            'mt-0.5'
                                        }
                                    >
                                        ✓
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#0B1F63]">
                                            Informasi Kapal & Jadwal Real-Time
                                        </h4>
                                        <p className="text-sm text-[#52658E]">
                                            Pemantauan status kapal (Akan Datang, Labuh, Sandar,
                                            Selesai) beserta jadwal ETA dan nomor IMO.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start">
                                    <div
                                        className={
                                            'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                            'items-center justify-center flex-shrink-0 font-bold ' +
                                            'mt-0.5'
                                        }
                                    >
                                        ✓
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#0B1F63]">
                                            Pencatatan Pengajuan Kebutuhan Terstruktur
                                        </h4>
                                        <p className="text-sm text-[#52658E]">
                                            Staf dapat mengajukan kebutuhan pasokan secara cepat
                                            melalui formulir bertahap 4 langkah.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start">
                                    <div
                                        className={
                                            'w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#0060F4] flex ' +
                                            'items-center justify-center flex-shrink-0 font-bold ' +
                                            'mt-0.5'
                                        }
                                    >
                                        ✓
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#0B1F63]">
                                            Persetujuan & Jejak Audit Lengkap
                                        </h4>
                                        <p className="text-sm text-[#52658E]">
                                            Setiap perubahan status, persetujuan biaya, dan bukti
                                            transaksi terekam otomatis untuk integritas operasional.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Link href={isAuthenticated ? '/dashboard' : '/login'}>
                                    <Button variant="primary" size="lg">
                                        Masuk ke Portal Operasional
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Visual dual preview: Desktop & Mobile Card */}
                        <div className="lg:col-span-6 relative">
                            <div
                                className={
                                    'p-6 rounded-[20px] bg-[#F0F8FF] border border-[#DCEAF8] ' +
                                    'shadow-sm space-y-4'
                                }
                            >
                                <div className="flex items-center justify-between pb-3 border-b border-[#DCEAF8]">
                                    <span className="text-xs font-bold text-[#0B1F63] uppercase tracking-wider">
                                        Tampilan Multi-Platform
                                    </span>
                                    <span className="text-xs text-[#0060F4] font-semibold">
                                        Desktop & Mobile Web
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Desktop preview card */}
                                    <div className="p-4 rounded-xl bg-white border border-[#DCEAF8] shadow-xs">
                                        <div
                                            className={
                                                'w-8 h-8 rounded-lg bg-[#0D2945] text-white flex ' +
                                                'items-center justify-center mb-3'
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
                                                        'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M' +
                                                        '5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2' +
                                                        ' 0 00-2 2v10a2 2 0 002 2z'
                                                    }
                                                />
                                            </svg>
                                        </div>
                                        <h5 className="font-bold text-sm text-[#0B1F63]">
                                            Control Center Desktop
                                        </h5>
                                        <p className="text-xs text-[#52658E] mt-1">
                                            Dirancang untuk Bu Titik dan tim kantor: rekapitulasi
                                            KPI, approval, keuangan, dan tabel pengajuan.
                                        </p>
                                    </div>

                                    {/* Mobile preview card */}
                                    <div className="p-4 rounded-xl bg-white border border-[#DCEAF8] shadow-xs">
                                        <div
                                            className={
                                                'w-8 h-8 rounded-lg bg-[#0060F4] text-white flex ' +
                                                'items-center justify-center mb-3'
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
                                                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <h5 className="font-bold text-sm text-[#0B1F63]">
                                            Staff Lapangan Mobile
                                        </h5>
                                        <p className="text-xs text-[#52658E] mt-1">
                                            Dirancang untuk Pak Prima di dermaga: input kebutuhan
                                            cepat, status kapal harian, dan navigasi ergonomis.
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className={
                                        'p-4 rounded-xl bg-[#E0F0FF] border border-[#BCE0FD] flex ' +
                                        'items-center justify-between'
                                    }
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-[#087443]" />
                                        <span className="text-xs font-semibold text-[#0B1F63]">
                                            Sistem Aktif & Terhubung ke Database PostgreSQL
                                        </span>
                                    </div>
                                    <Link
                                        href="/login"
                                        className="text-xs font-bold text-[#0060F4] hover:underline"
                                    >
                                        Akses Akun &rarr;
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Kontak & Footer (#kontak) */}
            <footer
                id="kontak"
                className="bg-[#0D2945] text-white pt-16 pb-12 border-t border-[#173B5C]"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#173B5C]">
                        {/* Company Info */}
                        <div className="md:col-span-5 space-y-4">
                            <Logo variant="dark" />
                            <p className="text-sm text-[#B5C8DC] leading-relaxed max-w-sm">
                                Perusahaan keagenan kapal terpercaya di Pelabuhan Gresik dan Tanjung
                                Perak, Jawa Timur. Menyediakan layanan terpadu untuk efisiensi dan
                                keamanan pelayaran.
                            </p>
                            <p className="text-xs text-[#7A98B6]">
                                Operational Control Center & Marine Agency Services
                            </p>
                        </div>

                        {/* Quick Nav */}
                        <div className="md:col-span-3 space-y-3">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-[#19B5F7]">
                                Navigasi
                            </h4>
                            <ul className="space-y-2 text-sm text-[#B5C8DC]">
                                <li>
                                    <a
                                        href="#beranda"
                                        className="hover:text-white transition-colors"
                                    >
                                        Beranda
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#tentang"
                                        className="hover:text-white transition-colors"
                                    >
                                        Tentang Kami
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#layanan"
                                        className="hover:text-white transition-colors"
                                    >
                                        Layanan Keagenan
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#sistem"
                                        className="hover:text-white transition-colors"
                                    >
                                        Sistem Operasional
                                    </a>
                                </li>
                                <li>
                                    <Link
                                        href="/login"
                                        className="hover:text-white transition-colors font-semibold text-[#19B5F7]"
                                    >
                                        Masuk Sistem
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Contact info */}
                        <div className="md:col-span-4 space-y-3">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-[#19B5F7]">
                                Kontak Operasional
                            </h4>
                            <div className="space-y-2 text-sm text-[#B5C8DC]">
                                <p className="flex items-start gap-2">
                                    <span className="text-[#19B5F7] font-bold">📍</span>
                                    <span>Kawasan Pelabuhan Gresik, Jawa Timur, Indonesia</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="text-[#19B5F7] font-bold">✉️</span>
                                    <span>operasional@samudrajaya.co.id</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="text-[#19B5F7] font-bold">🕒</span>
                                    <span>Layanan Lapangan: 24 Jam / 7 Hari</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom copyright */}
                    <div
                        className={
                            'pt-8 flex flex-col sm:flex-row items-center justify-between text-xs ' +
                            'text-[#7A98B6] gap-4'
                        }
                    >
                        <p>
                            © 2026 PT Samudra Jaya Andalas. Seluruh hak cipta dilindungi
                            undang-undang.
                        </p>
                        <p className="flex items-center gap-2">
                            <span>Ship Agency Management System</span>
                            <span>•</span>
                            <span>Corporate Maritime</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
