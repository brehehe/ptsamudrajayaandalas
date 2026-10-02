import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import Modal from '../../../Components/overlays/Modal';

interface ServiceType {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    is_default: boolean;
    is_active: boolean;
}

interface MasterServiceTypesProps {
    serviceTypes: ServiceType[];
}

export default function MasterServiceTypesIndex({ serviceTypes = [] }: MasterServiceTypesProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<ServiceType | null>(null);

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
        code: '',
        name: '',
        description: '',
        is_default: false,
    });

    const openAddModal = () => {
        setEditingType(null);
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (st: ServiceType) => {
        setEditingType(st);
        setData({
            code: st.code,
            name: st.name,
            description: st.description || '',
            is_default: st.is_default,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingType) {
            put(`/master/service-types/${editingType.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/master/service-types', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (st: ServiceType) => {
        if (confirm(`Yakin ingin menonaktifkan tipe kegiatan "${st.name}"?`)) {
            destroy(`/master/service-types/${st.id}`);
        }
    };

    return (
        <AppLayout title="Data Tipe Kegiatan Kapal">
            <Head title="Tipe Layanan Kapal — PT Samudra Jaya Andalas" />

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
                                Referensi Operasional
                            </span>
                            <span className="text-xs text-[#52658E]">Sandar & Labuh</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-[#0B1F63] tracking-tight">
                            Data Tipe Kegiatan Kapal (Activity Types)
                        </h1>
                        <p className="text-xs md:text-sm text-[#52658E] mt-0.5">
                            Klasifikasi kegiatan kapal saat berada di pelabuhan (Default: Sandar &
                            Labuh).
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
                        Tambah Tipe Baru
                    </Button>
                </div>

                {/* Table */}
                <Card className="bg-white border border-[#DCEAF8] rounded-[16px] overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs md:text-sm">
                        <thead>
                            <tr className="bg-[#0D2945] text-[#E7F0FA]">
                                <th className="py-3 px-4 font-bold">KODE</th>
                                <th className="py-3 px-4 font-bold">NAMA TIPE KEGIATAN</th>
                                <th className="py-3 px-4 font-bold">STATUS DEFAULT</th>
                                <th className="py-3 px-4 font-bold">DESKRIPSI</th>
                                <th className="py-3 px-4 font-bold text-center">AKSI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DCEAF8]/60">
                            {serviceTypes.map((st) => (
                                <tr key={st.id} className="hover:bg-[#F0F8FF]/60 transition-colors">
                                    <td className="py-3 px-4 font-mono font-bold text-[#0060F4]">
                                        {st.code}
                                    </td>
                                    <td className="py-3 px-4 font-bold text-[#0B1F63]">
                                        {st.name}
                                    </td>
                                    <td className="py-3 px-4">
                                        {st.is_default ? (
                                            <span
                                                className={
                                                    'px-2.5 py-0.5 rounded-full text-[11px] ' +
                                                    'font-bold bg-[#DCF7E8] text-[#087443]'
                                                }
                                            >
                                                Default Sistem
                                            </span>
                                        ) : (
                                            <span
                                                className={
                                                    'px-2.5 py-0.5 rounded-full text-[11px] ' +
                                                    'font-semibold bg-[#F0F8FF] text-[#52658E]'
                                                }
                                            >
                                                Opsional
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-xs text-[#52658E]">
                                        {st.description || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => openEditModal(st)}
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
                                                            'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h' +
                                                            '11a2 2 0 002-2v-5m-1.414-9.414a2 2 0' +
                                                            ' 112.828 2.828L11.828 15H9v-2.828l8.' +
                                                            '586-8.586z'
                                                        }
                                                    />
                                                </svg>
                                            </button>
                                            {!st.is_default && (
                                                <button
                                                    onClick={() => handleDelete(st)}
                                                    className={
                                                        'p-1.5 rounded-[8px] text-[#C62840] ' +
                                                        'hover:bg-[#FFE7EC] transition-colors'
                                                    }
                                                    title="Hapus"
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
                                                                'M19 7l-.867 12.142A2 2 0 0116.13' +
                                                                '8 21H7.862a2 2 0 01-1.995-1.858L' +
                                                                '5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-' +
                                                                '1-1h-4a1 1 0 00-1 1v3M4 7h16'
                                                            }
                                                        />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>

            {/* Modal Tambah / Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingType ? `Edit Tipe: ${editingType.name}` : 'Tambah Tipe Kegiatan Baru'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                                Kode Tipe <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                placeholder="SDR, LBH..."
                                className={
                                    'w-full px-3 py-2 text-xs md:text-sm font-mono border ' +
                                    'border-[#DCEAF8] rounded-[10px] text-[#0B1F63] ' +
                                    'focus:ring-2 focus:ring-[#0060F4]'
                                }
                                required
                            />
                            {errors.code && (
                                <p className="text-[11px] text-red-500 mt-0.5">{errors.code}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                                Nama Tipe Kegiatan <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Contoh: Sandar, Labuh..."
                                className={
                                    'w-full px-3 py-2 text-xs md:text-sm border ' +
                                    'border-[#DCEAF8] rounded-[10px] text-[#0B1F63] ' +
                                    'focus:ring-2 focus:ring-[#0060F4]'
                                }
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Deskripsi
                        </label>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={2}
                            placeholder="Deskripsi kegiatan..."
                            className={
                                'w-full px-3 py-2 text-xs md:text-sm border border-[#DCEAF8] ' +
                                'rounded-[10px] text-[#0B1F63]'
                            }
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_default"
                            checked={data.is_default}
                            onChange={(e) => setData('is_default', e.target.checked)}
                            className="w-4 h-4 rounded text-[#0060F4] border-[#DCEAF8] focus:ring-[#0060F4]"
                        />
                        <label
                            htmlFor="is_default"
                            className="text-xs font-semibold text-[#0B1F63]"
                        >
                            Jadikan Tipe Kegiatan Utama (Default)
                        </label>
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
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
