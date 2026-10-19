import React, { useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    Building2,
    FileText,
    Landmark,
    RotateCcw,
    Save,
    Signature,
} from 'lucide-react';
import AppLayout from '../../../Layouts/AppLayout';
import FormErrorSummary from '../../../Components/forms/FormErrorSummary';
import Input from '../../../Components/forms/Input';
import Textarea from '../../../Components/forms/Textarea';
import MobilePageHero from '../../../Components/navigation/MobilePageHero';
import Button from '../../../Components/ui/Button';
import Card from '../../../Components/ui/Card';
import { MaritimeCrestIcon } from '../../../Components/ui/Logo';
import type { ClientInvoiceDocumentSettings } from '../../../Components/finance/ClientInvoiceDocument';

interface InvoiceSettingsPageProps {
    settings: ClientInvoiceDocumentSettings;
    usesEnvironmentDefaults: boolean;
}

interface SettingsSectionProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
}

function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
    return (
        <section className="border-b border-[#DCEAF8] px-4 py-5 last:border-b-0 dark:border-[#1E3A5F] sm:px-6 sm:py-6">
            <div className="mb-4 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52] dark:text-[#60A5FA]">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h2 className="text-balance text-base font-extrabold text-[#0B1F63] dark:text-white">
                        {title}
                    </h2>
                    <p className="mt-0.5 max-w-2xl text-pretty text-xs leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                        {description}
                    </p>
                </div>
            </div>
            {children}
        </section>
    );
}

function DocumentIdentityPreview({ settings }: { settings: ClientInvoiceDocumentSettings }) {
    return (
        <Card overflow="hidden" className="lg:sticky lg:top-20">
            <div className="border-b border-[#DCEAF8] px-4 py-3.5 dark:border-[#1E3A5F] sm:px-5">
                <div className="flex items-center gap-2">
                    <FileText aria-hidden="true" className="size-4 text-[#0060F4]" />
                    <h2 className="text-balance text-sm font-extrabold text-[#0B1F63] dark:text-white">
                        Pratinjau identitas dokumen
                    </h2>
                </div>
                <p className="mt-1 text-pretty text-xs leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                    Perubahan terlihat langsung di sini dan dipakai pada pratinjau serta PDF invoice baru setelah disimpan.
                </p>
            </div>

            <div className="bg-[#E8F3FC] p-3 dark:bg-[#071322] sm:p-5">
                <div className="mx-auto aspect-[210/297] w-full max-w-[440px] overflow-hidden rounded-sm bg-white px-[8%] py-[9%] font-serif text-slate-950 shadow-md">
                    <div className="text-center">
                        <div className="mx-auto mb-2 size-8 sm:size-10" aria-hidden="true">
                            <MaritimeCrestIcon />
                        </div>
                        <p className="text-balance text-[13px] font-bold leading-tight text-[#245D91] sm:text-lg">
                            {settings.company_name}
                        </p>
                        <p className="mt-1 text-[7px] font-bold sm:text-[9px]">{settings.business_label}</p>
                        <p className="mt-1 whitespace-normal text-[6px] font-semibold leading-relaxed [overflow-wrap:anywhere] sm:text-[8px]">
                            KANTOR PUSAT: {settings.office_address}
                        </p>
                        <p className="whitespace-normal text-[6px] leading-relaxed [overflow-wrap:anywhere] sm:text-[8px]">
                            Telp. {settings.phone} · {settings.email}
                        </p>
                    </div>

                    <div className="mt-3 border-t-2 border-slate-900 pt-1 text-center sm:mt-5">
                        <p className="text-[9px] font-bold underline underline-offset-2 sm:text-xs">INVOICE</p>
                    </div>

                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2 text-[7px] leading-relaxed sm:mt-6 sm:text-[9px]">
                        <div>
                            <p className="font-bold">Pembayaran ditransfer ke:</p>
                            <p className="mt-1 font-bold">{settings.bank_account_name}</p>
                            <p className="font-bold">a/c {settings.bank_account_number}</p>
                            <p className="font-bold">{settings.bank_name}</p>
                        </div>
                        <div className="min-w-20 text-center sm:min-w-28">
                            <p>Hormat kami,</p>
                            <div className="h-12 sm:h-16" />
                            <p className="border-t border-slate-900 pt-1 font-bold">{settings.signatory_title}</p>
                        </div>
                    </div>

                    <p className="mt-5 text-right text-[6px] sm:text-[8px]">
                        {settings.city}, tanggal dokumen
                    </p>
                </div>
            </div>
        </Card>
    );
}

export default function InvoiceSettingsIndex({
    settings,
    usesEnvironmentDefaults,
}: InvoiceSettingsPageProps) {
    const form = useForm<ClientInvoiceDocumentSettings>({ ...settings });

    useEffect(() => {
        const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
            if (!form.isDirty || form.processing) {
                return;
            }

            event.preventDefault();
        };

        window.addEventListener('beforeunload', warnAboutUnsavedChanges);

        return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
    }, [form.isDirty, form.processing]);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.patch('/master/invoice-settings', {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    };

    return (
        <AppLayout
            title="Pengaturan Invoice"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Pengaturan Invoice — PT Samudra Jaya Andalas" />

            <MobilePageHero
                title="Pengaturan Invoice"
                description="Kelola identitas perusahaan, rekening pembayaran, dan penanda tangan dokumen."
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-28 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pb-10 md:pt-0 md:dark:bg-transparent">
                <header className="hidden items-start justify-between gap-5 rounded-2xl border border-[#DCEAF8] bg-white p-6 shadow-sm dark:border-[#1E3A5F] dark:bg-[#0C1D36] md:flex">
                    <div className="max-w-3xl">
                        <h1 className="text-balance text-2xl font-black text-[#0B1F63] dark:text-white">
                            Pengaturan dokumen invoice
                        </h1>
                        <p className="mt-1 text-pretty text-sm leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                            Satu sumber identitas untuk editor, pratinjau, dan PDF invoice keagenan maupun reimbursement.
                        </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-[#E0F0FF] px-3 py-1.5 text-xs font-bold text-[#0057D9] dark:bg-[#152E52] dark:text-[#60A5FA]">
                        {usesEnvironmentDefaults ? 'Sumber: konfigurasi server' : 'Sumber: master tersimpan'}
                    </span>
                </header>

                {usesEnvironmentDefaults && (
                    <div className="rounded-xl border border-[#B9D9F7] bg-[#F0F8FF] px-4 py-3 text-sm text-[#164E78] dark:border-[#1E4A74] dark:bg-[#102A47] dark:text-[#BAE6FD]" role="status">
                        Nilai awal masih mengikuti konfigurasi server. Simpan halaman ini untuk menjadikannya pengaturan master yang dapat dikelola dari aplikasi.
                    </div>
                )}

                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
                    <form onSubmit={submit} noValidate>
                        <Card overflow="hidden">
                            <FormErrorSummary
                                errors={form.errors}
                                className="m-4 mb-0 sm:m-6 sm:mb-0"
                            />

                            <SettingsSection
                                icon={<Building2 aria-hidden="true" className="size-5" />}
                                title="Identitas perusahaan"
                                description="Ditampilkan pada kop surat dan lokasi penerbitan invoice."
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input
                                        id="company_name"
                                        name="company_name"
                                        label="Nama perusahaan"
                                        required
                                        autoComplete="organization"
                                        value={form.data.company_name}
                                        onChange={(event) => form.setData('company_name', event.target.value)}
                                        error={form.errors.company_name}
                                    />
                                    <Input
                                        id="business_label"
                                        name="business_label"
                                        label="Bidang usaha"
                                        required
                                        value={form.data.business_label}
                                        onChange={(event) => form.setData('business_label', event.target.value)}
                                        error={form.errors.business_label}
                                    />
                                    <div className="sm:col-span-2">
                                        <Textarea
                                            id="office_address"
                                            name="office_address"
                                            label="Alamat kantor"
                                            required
                                            rows={3}
                                            autoComplete="street-address"
                                            value={form.data.office_address}
                                            onChange={(event) => form.setData('office_address', event.target.value)}
                                            error={form.errors.office_address}
                                        />
                                    </div>
                                    <Input
                                        id="city"
                                        name="city"
                                        label="Kota penerbitan"
                                        required
                                        autoComplete="address-level2"
                                        value={form.data.city}
                                        onChange={(event) => form.setData('city', event.target.value)}
                                        error={form.errors.city}
                                    />
                                </div>
                            </SettingsSection>

                            <SettingsSection
                                icon={<FileText aria-hidden="true" className="size-5" />}
                                title="Kontak perusahaan"
                                description="Dicetak pada bagian kepala dokumen agar klien dapat menghubungi perusahaan."
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input
                                        id="phone"
                                        name="phone"
                                        label="Nomor telepon"
                                        required
                                        type="tel"
                                        autoComplete="tel"
                                        value={form.data.phone}
                                        onChange={(event) => form.setData('phone', event.target.value)}
                                        error={form.errors.phone}
                                    />
                                    <Input
                                        id="email"
                                        name="email"
                                        label="Email perusahaan"
                                        required
                                        type="email"
                                        inputMode="email"
                                        autoComplete="email"
                                        spellCheck={false}
                                        value={form.data.email}
                                        onChange={(event) => form.setData('email', event.target.value)}
                                        error={form.errors.email}
                                    />
                                </div>
                            </SettingsSection>

                            <SettingsSection
                                icon={<Landmark aria-hidden="true" className="size-5" />}
                                title="Rekening pembayaran"
                                description="Rekening tujuan pembayaran yang dicetak pada bagian akhir invoice."
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input
                                        id="bank_account_name"
                                        name="bank_account_name"
                                        label="Nama pemilik rekening"
                                        required
                                        value={form.data.bank_account_name}
                                        onChange={(event) => form.setData('bank_account_name', event.target.value)}
                                        error={form.errors.bank_account_name}
                                    />
                                    <Input
                                        id="bank_account_number"
                                        name="bank_account_number"
                                        label="Nomor rekening"
                                        required
                                        inputMode="numeric"
                                        autoComplete="off"
                                        spellCheck={false}
                                        value={form.data.bank_account_number}
                                        onChange={(event) => form.setData('bank_account_number', event.target.value)}
                                        error={form.errors.bank_account_number}
                                    />
                                    <Input
                                        id="bank_name"
                                        name="bank_name"
                                        label="Nama bank"
                                        required
                                        value={form.data.bank_name}
                                        onChange={(event) => form.setData('bank_name', event.target.value)}
                                        error={form.errors.bank_name}
                                    />
                                </div>
                            </SettingsSection>

                            <SettingsSection
                                icon={<Signature aria-hidden="true" className="size-5" />}
                                title="Penanda tangan"
                                description="Jabatan yang tampil di bawah area tanda tangan pada dokumen."
                            >
                                <Input
                                    id="signatory_title"
                                    name="signatory_title"
                                    label="Jabatan penanda tangan"
                                    required
                                    value={form.data.signatory_title}
                                    onChange={(event) => form.setData('signatory_title', event.target.value)}
                                    error={form.errors.signatory_title}
                                />
                            </SettingsSection>

                            <div className="flex flex-col-reverse gap-2 border-t border-[#DCEAF8] bg-[#F8FBFF] px-4 py-4 dark:border-[#1E3A5F] dark:bg-[#071322] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <p className="min-h-5 text-xs font-semibold text-[#087443] dark:text-[#6EE7B7]" aria-live="polite">
                                    {form.recentlySuccessful ? 'Pengaturan tersimpan dan siap digunakan.' : ''}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 sm:flex-none"
                                        disabled={!form.isDirty || form.processing}
                                        leftIcon={<RotateCcw aria-hidden="true" className="size-4" />}
                                        onClick={() => form.reset()}
                                    >
                                        Batalkan perubahan
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 sm:flex-none"
                                        disabled={!form.isDirty}
                                        isLoading={form.processing}
                                        leftIcon={<Save aria-hidden="true" className="size-4" />}
                                    >
                                        Simpan pengaturan
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </form>

                    <DocumentIdentityPreview settings={form.data} />
                </div>
            </div>
        </AppLayout>
    );
}
