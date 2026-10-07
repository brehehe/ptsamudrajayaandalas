import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import Modal from '../../../Components/overlays/Modal';
import MobilePageHero from '../../../Components/navigation/MobilePageHero';
import { ResponsiveTable, type Column } from '../../../Components/tables/Table';
import FormErrorSummary from '../../../Components/forms/FormErrorSummary';
import Input from '../../../Components/forms/Input';
import Textarea from '../../../Components/forms/Textarea';

interface ShipSummary {
    id: string;
    name: string;
    imo_number: string;
    status: string;
}

interface Company {
    id: string;
    code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    is_active: boolean;
    ships_count?: number;
    ships?: ShipSummary[];
}

interface MasterCompaniesProps {
    companies: Company[];
    search: string;
}

export default function MasterCompaniesIndex({
    companies = [],
    search = '',
}: MasterCompaniesProps) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);

    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        name: '',
        code: '',
        phone: '',
        email: '',
        address: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/master/companies', { search: searchTerm }, { preserveState: true });
    };

    const openAddModal = () => {
        clearErrors();
        setEditingCompany(null);
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (comp: Company) => {
        clearErrors();
        setEditingCompany(comp);
        setData({
            name: comp.name,
            code: comp.code || '',
            phone: comp.phone || '',
            email: comp.email || '',
            address: comp.address || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCompany) {
            put(`/master/companies/${editingCompany.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/master/companies', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (comp: Company) => {
        if (confirm(`Yakin ingin menonaktifkan perusahaan "${comp.name}"?`)) {
            destroy(`/master/companies/${comp.id}`);
        }
    };

    const companyActions = (company: Company) => (
        <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => openEditModal(company)} leftIcon={<Pencil aria-hidden="true" className="size-3.5" />}>Edit</Button>
            <Button size="sm" variant="ghost" className="text-[#C62840] hover:bg-[#FFE7EC] hover:text-[#C62840]" onClick={() => handleDelete(company)} leftIcon={<Trash2 aria-hidden="true" className="size-3.5" />}>Nonaktifkan</Button>
        </div>
    );

    const columns: Column<Company>[] = [
        { key: 'company', header: 'Perusahaan', wrap: 'normal', render: (company) => <div><p className="font-bold text-[#0B1F63] dark:text-white">{company.name}</p><p className="font-mono text-[10px] text-[#0060F4]">{company.code || '—'}</p></div> },
        { key: 'phone', header: 'Telepon', wrap: 'normal', render: (company) => company.phone || '—' },
        { key: 'email', header: 'Email', wrap: 'normal', render: (company) => company.email || '—' },
        { key: 'address', header: 'Alamat', wrap: 'normal', render: (company) => company.address || '—' },
        { key: 'ships', header: 'Armada', align: 'center', render: (company) => `${company.ships_count ?? company.ships?.length ?? 0} kapal` },
        { key: 'actions', header: 'Aksi', align: 'right', render: companyActions },
    ];

    return (
        <AppLayout title="Data Perusahaan Pelayaran" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Master Perusahaan — PT Samudra Jaya Andalas" />

            <MobilePageHero title="Master Perusahaan" description="Kelola perusahaan pemilik kapal dan mitra keagenan." />

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
                                Master Klien & Rekanan
                            </span>
                            <span className="text-xs text-[#52658E]">Keagenan Kapal</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-[#0B1F63] tracking-tight">
                            Data Perusahaan Pelayaran (Shipping Line)
                        </h1>
                        <p className="text-xs md:text-sm text-[#52658E] mt-0.5">
                            Daftar perusahaan pemilik kapal, operator armada, dan mitra keagenan PT
                            Samudra Jaya Andalas.
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        onClick={openAddModal}
                        className={
                            'bg-[#0060F4] hover:bg-[#082870] text-white px-4 py-2.5 ' +
                            'rounded-[12px] shadow-sm flex items-center gap-2 text-sm ' +
                            'font-semibold'
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
                                strokeWidth={2.5}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Tambah Perusahaan Baru
                    </Button>
                </div>

                {/* Filter & Search */}
                <Card className="border border-[#DCEAF8] bg-white p-3.5 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                    <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <label className="min-w-0 flex-1 text-xs font-bold text-[#0B1F63] dark:text-white">
                            Cari perusahaan
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Nama, kode, email, atau telepon…"
                                className="mt-1.5 h-11 w-full rounded-xl border border-[#DCEAF8] bg-white px-3.5 text-sm font-normal text-[#0B1F63] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                            />
                        </label>
                        <Button type="submit" variant="secondary">Cari</Button>
                    </form>
                </Card>

                <Button className="w-full md:hidden" onClick={openAddModal}>+ Tambah Perusahaan</Button>

                <ResponsiveTable<Company>
                    data={companies}
                    keyExtractor={(company) => company.id}
                    desktop={{ columns, compact: true, minWidth: '940px' }}
                    mobile={{
                        titleRender: (company) => company.name,
                        subtitleRender: (company) => company.code || 'Tanpa kode',
                        fields: [
                            { label: 'Telepon', render: (company) => company.phone || '—' },
                            { label: 'Email', render: (company) => company.email || '—' },
                            { label: 'Armada', render: (company) => `${company.ships_count ?? company.ships?.length ?? 0} kapal` },
                            { label: 'Alamat', fullWidth: true, render: (company) => company.address || '—' },
                        ],
                        actionsRender: companyActions,
                    }}
                />
            </div>


            {/* Modal Tambah & Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    clearErrors();
                    setIsModalOpen(false);
                }}
                title={
                    editingCompany
                        ? `Edit Perusahaan: ${editingCompany.name}`
                        : 'Tambah Perusahaan Pelayaran Baru'
                }
                size="md"
            >
                <form noValidate onSubmit={handleSubmit} className="space-y-4">
                    <FormErrorSummary errors={errors} />
                    <Input required name="name" autoComplete="organization" label="Nama Perusahaan" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Contoh: PT Pelayaran Bahtera Nusantara" error={errors.name} />

                    <div className="grid grid-cols-2 gap-4">
                        <Input name="code" autoComplete="off" label="Kode Perusahaan" value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} placeholder="Contoh: PBN" className="font-mono" error={errors.code} />
                        <Input name="phone" autoComplete="tel" label="Telepon / PIC" type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="Contoh: 031-xxxx atau 081xxx" error={errors.phone} />
                    </div>

                    <Input name="email" autoComplete="email" label="Email Perusahaan" type="email" spellCheck={false} value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="Contoh: agency@company.com" error={errors.email} />
                    <Textarea name="address" autoComplete="street-address" label="Alamat Kantor" value={data.address} onChange={(e) => setData('address', e.target.value)} rows={2} placeholder="Contoh: alamat kantor pusat atau cabang operasional…" error={errors.address} />

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCEAF8]">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                clearErrors();
                                setIsModalOpen(false);
                            }}
                            className="px-4 py-2 text-xs font-bold rounded-[10px]"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={processing}
                            className={
                                'bg-[#0060F4] hover:bg-[#082870] text-white px-5 py-2 text-xs ' +
                                'font-bold rounded-[10px]'
                            }
                        >
                            {processing
                                ? 'Menyimpan...'
                                : editingCompany
                                  ? 'Perbarui Perusahaan'
                                  : 'Simpan Perusahaan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
