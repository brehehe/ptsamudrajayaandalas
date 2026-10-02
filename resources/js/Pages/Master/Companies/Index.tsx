import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import Modal from '../../../Components/overlays/Modal';

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
        setEditingCompany(null);
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (comp: Company) => {
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

    return (
        <AppLayout title="Data Perusahaan Pelayaran">
            <Head title="Master Perusahaan — PT Samudra Jaya Andalas" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div
                    className={
                        'flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white ' +
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
                <Card className="p-4 bg-white border border-[#DCEAF8] rounded-[16px]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="text-xs text-[#52658E] font-medium">
                            Menampilkan{' '}
                            <span className="font-bold text-[#0B1F63]">{companies.length}</span>{' '}
                            perusahaan terdaftar
                        </div>

                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <div className="relative w-full md:w-72">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Cari nama perusahaan, kode, email..."
                                    className={
                                        'w-full px-3 py-2 text-xs md:text-sm bg-white border ' +
                                        'border-[#DCEAF8] rounded-[10px] text-[#0B1F63] ' +
                                        'focus:outline-none focus:ring-2 focus:ring-[#0060F4]'
                                    }
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="secondary"
                                className="px-3 py-2 text-xs font-bold rounded-[10px]"
                            >
                                Cari
                            </Button>
                        </form>
                    </div>
                </Card>

                {/* Grid of Companies */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companies.map((comp) => (
                        <Card
                            key={comp.id}
                            className={
                                'p-5 bg-white border border-[#DCEAF8] rounded-[16px] shadow-sm ' +
                                'hover:border-[#0060F4]/40 transition-all flex flex-col ' +
                                'justify-between'
                            }
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span
                                            className={
                                                'px-2 py-0.5 rounded-[6px] text-[10px] font-bold ' +
                                                'bg-[#E0F0FF] text-[#0060F4] font-mono'
                                            }
                                        >
                                            {comp.code || 'CO-SJA'}
                                        </span>
                                        <h3 className="font-bold text-base text-[#0B1F63] mt-1.5 leading-snug">
                                            {comp.name}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditModal(comp)}
                                            className={
                                                'p-1.5 rounded-[8px] text-[#0060F4] ' +
                                                'hover:bg-[#E0F0FF] transition-colors'
                                            }
                                            title="Edit"
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
                                                        'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2' +
                                                        ' 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828' +
                                                        ' 2.828L11.828 15H9v-2.828l8.586-8.586z'
                                                    }
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(comp)}
                                            className={
                                                'p-1.5 rounded-[8px] text-[#C62840] ' +
                                                'hover:bg-[#FFE7EC] transition-colors'
                                            }
                                            title="Nonaktifkan"
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
                                                        'M19 7l-.867 12.142A2 2 0 0116.138 21H7.8' +
                                                        '62a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m' +
                                                        '1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 ' +
                                                        '7h16'
                                                    }
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3.5 space-y-1.5 text-xs text-[#52658E]">
                                    {comp.phone && (
                                        <div className="flex items-center gap-2">
                                            <svg
                                                className="w-3.5 h-3.5 text-[#0060F4] flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d={
                                                        'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1' +
                                                        '.498 4.493a1 1 0 01-.502 1.21l-2.257 1.1' +
                                                        '3a11.042 11.042 0 005.516 5.516l1.13-2.2' +
                                                        '57a1 1 0 011.21-.502l4.493 1.498a1 1 0 0' +
                                                        '1.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 ' +
                                                        '14.284 3 6V5z'
                                                    }
                                                />
                                            </svg>
                                            <span>{comp.phone}</span>
                                        </div>
                                    )}
                                    {comp.email && (
                                        <div className="flex items-center gap-2">
                                            <svg
                                                className="w-3.5 h-3.5 text-[#0060F4] flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d={
                                                        'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h' +
                                                        '14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00' +
                                                        '-2 2v10a2 2 0 002 2z'
                                                    }
                                                />
                                            </svg>
                                            <span className="truncate">{comp.email}</span>
                                        </div>
                                    )}
                                    {comp.address && (
                                        <div className="flex items-start gap-2">
                                            <svg
                                                className="w-3.5 h-3.5 text-[#0060F4] flex-shrink-0 mt-0.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                            <span className="line-clamp-2">{comp.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-[#DCEAF8] flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-[#52658E]">
                                    Armada Terdaftar:
                                </span>
                                <span
                                    className={
                                        'px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0F8FF] ' +
                                        'text-[#0B1F63] border border-[#DCEAF8]'
                                    }
                                >
                                    {comp.ships_count ?? comp.ships?.length ?? 0} Kapal
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Modal Tambah & Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    editingCompany
                        ? `Edit Perusahaan: ${editingCompany.name}`
                        : 'Tambah Perusahaan Pelayaran Baru'
                }
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Nama Perusahaan <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Contoh: PT Pelayaran Bahtera Nusantara"
                            className={
                                'w-full px-3 py-2 text-xs md:text-sm border border-[#DCEAF8] ' +
                                'rounded-[10px] text-[#0B1F63] focus:ring-2 ' +
                                'focus:ring-[#0060F4]'
                            }
                            required
                        />
                        {errors.name && (
                            <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                                Kode Perusahaan
                            </label>
                            <input
                                type="text"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                placeholder="PBN, SAM..."
                                className={
                                    'w-full px-3 py-2 text-xs md:text-sm font-mono border ' +
                                    'border-[#DCEAF8] rounded-[10px] text-[#0B1F63] ' +
                                    'focus:ring-2 focus:ring-[#0060F4]'
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                                Telepon / PIC
                            </label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                placeholder="031-xxxx / 081xxx"
                                className={
                                    'w-full px-3 py-2 text-xs md:text-sm border ' +
                                    'border-[#DCEAF8] rounded-[10px] text-[#0B1F63] ' +
                                    'focus:ring-2 focus:ring-[#0060F4]'
                                }
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Email Perusahaan
                        </label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="agency@company.com"
                            className={
                                'w-full px-3 py-2 text-xs md:text-sm border border-[#DCEAF8] ' +
                                'rounded-[10px] text-[#0B1F63] focus:ring-2 ' +
                                'focus:ring-[#0060F4]'
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Alamat Kantor
                        </label>
                        <textarea
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            rows={2}
                            placeholder="Alamat lengkap kantor pusat / cabang operasional..."
                            className={
                                'w-full px-3 py-2 text-xs md:text-sm border border-[#DCEAF8] ' +
                                'rounded-[10px] text-[#0B1F63] focus:ring-2 ' +
                                'focus:ring-[#0060F4]'
                            }
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCEAF8]">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
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
