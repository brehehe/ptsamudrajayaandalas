import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';

interface VesselCompany {
    id: string;
    name: string;
    code?: string | null;
}

interface MasterVessel {
    id: string;
    name: string;
    imo_number?: string | null;
    call_sign?: string | null;
    flag?: string | null;
    ship_type?: string | null;
    gross_tonnage?: number | string | null;
    length?: number | string | null;
    captain_name?: string | null;
    captain_phone?: string | null;
    company?: VesselCompany | null;
    port_calls_count: number;
}

interface MasterVesselsIndexProps {
    vessels: MasterVessel[];
    search: string;
}

export default function MasterVesselsIndex({
    vessels = [],
    search = '',
}: MasterVesselsIndexProps) {
    const [searchTerm, setSearchTerm] = useState(search);

    const handleSearch = (event: React.FormEvent) => {
        event.preventDefault();
        router.get('/master/vessels', { search: searchTerm }, { preserveState: true });
    };

    return (
        <AppLayout title="Master Kapal">
            <Head title="Master Kapal — PT Samudra Jaya Andalas" />

            <div className="mx-auto max-w-7xl space-y-5 pb-10">
                <section
                    className={
                        'flex flex-col gap-5 rounded-2xl border border-[#DCEAF8] bg-white p-5 ' +
                        'shadow-[0_2px_12px_rgba(8,40,112,0.04)] dark:border-[#1E3A5F] ' +
                        'dark:bg-[#0C1D36] md:flex-row md:items-center md:justify-between md:p-6'
                    }
                >
                    <div className="max-w-3xl">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                                className={
                                    'inline-flex items-center rounded-full bg-[#0060F4]/10 px-2.5 ' +
                                    'py-1 text-xs font-bold text-[#0060F4] dark:text-[#38BDF8]'
                                }
                            >
                                Master Data
                            </span>
                            <span className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                Identitas armada
                            </span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-[#0B1F63] dark:text-[#F1F5F9] md:text-3xl">
                            Master Kapal
                        </h1>
                        <p className="mt-1 text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">
                            Satu kapal dicatat satu kali di sini. Setiap jadwal kedatangan kapal
                            tersebut disimpan sebagai kunjungan dan nomor job yang berbeda.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/reports"
                            className={
                                'inline-flex min-h-10 items-center gap-2 rounded-xl border ' +
                                'border-[#DCEAF8] bg-white px-4 py-2 text-sm font-bold ' +
                                'text-[#082870] transition-colors hover:bg-[#F0F8FF] ' +
                                'dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9] ' +
                                'dark:hover:bg-[#132847]'
                            }
                        >
                            <svg
                                aria-hidden="true"
                                className="h-4 w-4 text-[#0060F4] dark:text-[#38BDF8]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 19V9m5 10V5m5 14v-7m5 7V3"
                                />
                            </svg>
                            Lihat Laporan
                        </Link>
                        <Link
                            href="/vessels"
                            className={
                                'inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0060F4] ' +
                                'px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors ' +
                                'hover:bg-[#0052D4]'
                            }
                        >
                            <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M12 5v14M5 12h14"
                                />
                            </svg>
                            Catat Kedatangan
                        </Link>
                    </div>
                </section>

                <section
                    className={
                        'flex items-start gap-3 rounded-2xl border border-[#BCE0FD] bg-[#EAF4FE] ' +
                        'p-4 text-sm text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#0A1A2F] ' +
                        'dark:text-[#DCEAF8]'
                    }
                >
                    <svg
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0060F4] dark:text-[#38BDF8]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                        <path strokeLinecap="round" strokeWidth={2} d="M12 11v5m0-8h.01" />
                    </svg>
                    <p>
                        Kapal yang sama dapat muncul beberapa kali di menu{' '}
                        <Link href="/vessels" className="font-bold text-[#0060F4] hover:underline">
                            Kapal
                        </Link>{' '}
                        karena setiap baris mewakili kunjungan yang berbeda. Kunjungan selesai tetap
                        tersimpan di menu Laporan.
                    </p>
                </section>

                <Card className="rounded-2xl border border-[#DCEAF8] bg-white p-4 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-[#52658E] dark:text-[#94A3B8]">
                            <span className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {vessels.length}
                            </span>{' '}
                            kapal terdaftar
                        </p>

                        <form onSubmit={handleSearch} className="flex w-full items-center gap-2 md:w-auto">
                            <label className="sr-only" htmlFor="master-vessel-search">
                                Cari master kapal
                            </label>
                            <div className="relative min-w-0 flex-1 md:w-80">
                                <svg
                                    aria-hidden="true"
                                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C9BB9]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <circle cx="11" cy="11" r="8" strokeWidth={2} />
                                    <path strokeLinecap="round" strokeWidth={2} d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    id="master-vessel-search"
                                    type="search"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Nama kapal, IMO, call sign, perusahaan..."
                                    className={
                                        'w-full rounded-xl border border-[#DCEAF8] bg-white py-2.5 ' +
                                        'pl-9 pr-3 text-sm text-[#0B1F63] placeholder:text-[#8C9BB9] ' +
                                        'focus:border-[#0060F4] focus:outline-none focus:ring-2 ' +
                                        'focus:ring-[#0060F4]/20 dark:border-[#1E3A5F] ' +
                                        'dark:bg-[#071322] dark:text-[#F1F5F9]'
                                    }
                                />
                            </div>
                            <Button type="submit" variant="secondary" className="min-h-10 rounded-xl px-4">
                                Cari
                            </Button>
                        </form>
                    </div>
                </Card>

                {vessels.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {vessels.map((vessel) => (
                            <Card
                                key={vessel.id}
                                className={
                                    'rounded-2xl border border-[#DCEAF8] bg-white p-5 shadow-sm ' +
                                    'transition-colors hover:border-[#0060F4]/40 dark:border-[#1E3A5F] ' +
                                    'dark:bg-[#0C1D36]'
                                }
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-black text-[#0B1F63] dark:text-[#F1F5F9]">
                                                {vessel.name}
                                            </h2>
                                            <span
                                                className={
                                                    'rounded-full bg-[#E0F0FF] px-2 py-0.5 text-[11px] ' +
                                                    'font-bold text-[#0060F4] dark:bg-[#132847] ' +
                                                    'dark:text-[#38BDF8]'
                                                }
                                            >
                                                {vessel.port_calls_count} kunjungan
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                            {vessel.company?.name || 'Perusahaan belum ditentukan'}
                                            {vessel.company?.code ? ` (${vessel.company.code})` : ''}
                                        </p>
                                    </div>
                                    <div
                                        className={
                                            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ' +
                                            'bg-[#EAF4FE] text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]'
                                        }
                                    >
                                        <svg
                                            aria-hidden="true"
                                            className="h-5 w-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 17h18l-2 4H5l-2-4Zm2-5h14l2 5H3l2-5Zm3 0V6h4v6m3 0V8h3v4"
                                            />
                                        </svg>
                                    </div>
                                </div>

                                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[#DCEAF8] py-4 text-xs dark:border-[#1E3A5F] sm:grid-cols-3">
                                    <div>
                                        <dt className="text-[#8C9BB9]">Nomor IMO</dt>
                                        <dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {vessel.imo_number || '-'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-[#8C9BB9]">Call Sign</dt>
                                        <dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {vessel.call_sign || '-'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-[#8C9BB9]">Tipe</dt>
                                        <dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {vessel.ship_type || '-'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-[#8C9BB9]">Gross Tonnage</dt>
                                        <dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {vessel.gross_tonnage ? `${vessel.gross_tonnage} GT` : '-'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-[#8C9BB9]">Panjang</dt>
                                        <dd className="mt-0.5 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {vessel.length ? `${vessel.length} m` : '-'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-[#8C9BB9]">Nahkoda</dt>
                                        <dd className="mt-0.5 truncate font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {vessel.captain_name || '-'}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                                    <Link
                                        href={`/vessels/${vessel.id}`}
                                        className="text-xs font-bold text-[#52658E] hover:text-[#0060F4] dark:text-[#94A3B8] dark:hover:text-[#38BDF8]"
                                    >
                                        Lihat detail kapal
                                    </Link>
                                    <Link
                                        href={`/vessels?search=${encodeURIComponent(vessel.name)}`}
                                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#EAF4FE] px-3 py-2 text-xs font-bold text-[#0060F4] hover:bg-[#DCEAF8] dark:bg-[#132847] dark:text-[#38BDF8]"
                                    >
                                        Riwayat kedatangan
                                        <span aria-hidden="true">&rarr;</span>
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="rounded-2xl border border-dashed border-[#BCE0FD] bg-white p-10 text-center dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                        <h2 className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                            Tidak ada master kapal ditemukan
                        </h2>
                        <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">
                            Ubah kata pencarian atau catat kapal baru melalui menu Kapal.
                        </p>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
