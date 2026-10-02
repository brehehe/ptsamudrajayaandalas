import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import StatusBadge from '../../../Components/ui/StatusBadge';
import Modal from '../../../Components/overlays/Modal';
import Input from '../../../Components/forms/Input';
import Select from '../../../Components/selects/Select';
import Textarea from '../../../Components/forms/Textarea';
import { formatRupiahInput, normalizeRupiahInput } from '../../../Components/forms/MoneyInput';

interface Vendor {
    id: string;
    code: string;
    name: string;
    phone?: string;
    email?: string;
}

interface Port {
    id: string;
    code: string;
    name: string;
}

interface ProductPortPrice {
    id: string;
    product_id: string;
    port_id: string;
    service_type: string;
    selling_price: string | number;
    port?: Port;
}

interface Product {
    id: string;
    code: string;
    name: string;
    category: string;
    item_type: 'jasa' | 'non_jasa';
    unit: string;
    hpp_default: string | number;
    selling_price_default: string | number;
    price_sandar?: string | number;
    price_labuh?: string | number;
    tax_rate?: string | number;
    vendor_id?: string | null;
    description?: string | null;
    is_active: boolean;
    vendor?: Vendor;
    port_prices?: ProductPortPrice[];
}

interface MasterProductsProps {
    products: Product[];
    vendors: Vendor[];
    ports: Port[];
    categories: string[];
    stats: {
        total: number;
        jasa: number;
        non_jasa: number;
    };
    filters: {
        search: string;
        type: string;
        category: string;
    };
}

const formatRupiah = (val?: string | number): string => {
    if (val === undefined || val === null || val === '') return 'Rp 0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
};

export default function MasterProductsIndex({
    products = [],
    vendors = [],
    ports = [],
    categories = [],
    stats = { total: 0, jasa: 0, non_jasa: 0 },
    filters = { search: '', type: 'all', category: 'all' },
}: MasterProductsProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
        category: 'Jasa Keagenan',
        item_type: 'jasa' as 'jasa' | 'non_jasa',
        unit: 'Paket',
        hpp_default: 0,
        selling_price_default: 0,
        price_sandar: 0,
        price_labuh: 0,
        vendor_id: '',
        description: '',
        port_prices: [] as Array<{
            port_id: string;
            service_type: 'Sandar' | 'Labuh';
            selling_price: number;
        }>,
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/master/products',
            {
                search,
                type: selectedType,
                category: selectedCategory,
            },
            { preserveState: true }
        );
    };

    const handleTypeTabChange = (type: string) => {
        setSelectedType(type);
        router.get(
            '/master/products',
            {
                search,
                type,
                category: selectedCategory,
            },
            { preserveState: true }
        );
    };

    const openAddModal = () => {
        setEditingProduct(null);
        reset();
        setData({
            code: 'PRD-' + Math.floor(100 + Math.random() * 900),
            name: '',
            category: 'Jasa Keagenan',
            item_type: 'jasa',
            unit: 'Paket',
            hpp_default: 0,
            selling_price_default: 0,
            price_sandar: 0,
            price_labuh: 0,
            vendor_id: vendors[0]?.id || '',
            description: '',
            port_prices: ports.map((p) => ({
                port_id: p.id,
                service_type: 'Sandar' as const,
                selling_price: 0,
            })),
        });
        setIsModalOpen(true);
    };

    const openEditModal = (prod: Product) => {
        setEditingProduct(prod);
        setData({
            code: prod.code,
            name: prod.name,
            category: prod.category,
            item_type: prod.item_type,
            unit: prod.unit,
            hpp_default: Number(prod.hpp_default) || 0,
            selling_price_default: Number(prod.selling_price_default) || 0,
            price_sandar: Number(prod.price_sandar) || Number(prod.selling_price_default) || 0,
            price_labuh: Number(prod.price_labuh) || Number(prod.selling_price_default) || 0,
            vendor_id: prod.vendor_id || '',
            description: prod.description || '',
            port_prices:
                prod.port_prices?.map((pp) => ({
                    port_id: pp.port_id,
                    service_type: pp.service_type as 'Sandar' | 'Labuh',
                    selling_price: Number(pp.selling_price) || 0,
                })) || [],
        });
        setIsModalOpen(true);
    };

    const handleSubmitProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            put(`/master/products/${editingProduct.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/master/products', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDeleteProduct = (prod: Product) => {
        if (confirm(`Yakin ingin menonaktifkan produk master "${prod.name}"?`)) {
            destroy(`/master/products/${prod.id}`);
        }
    };

    return (
        <AppLayout title="Master Produk & Layanan">
            <Head title="Master Produk — PT Samudra Jaya Andalas" />

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
                                Master Data Operasional
                            </span>
                            <span className="text-xs text-[#52658E]">Corporate Maritime</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-[#0B1F63] tracking-tight">
                            Master Produk & Katalog Layanan
                        </h1>
                        <p className="text-xs md:text-sm text-[#52658E] mt-0.5">
                            Kelola HPP, harga jual Sandar & Labuh per pelabuhan, referensi vendor,
                            dan kategori Jasa vs Reimburse.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                            href="/master/service-types"
                            className={
                                'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[12px] ' +
                                'bg-[#F0F8FF] hover:bg-[#E0F0FF] text-[#082870] border ' +
                                'border-[#DCEAF8] text-xs font-bold transition-all'
                            }
                        >
                            <span>⚙️ Tipe Kegiatan (Sandar/Labuh)</span>
                        </Link>
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
                            Tambah Produk Baru
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="p-4 bg-white border border-[#DCEAF8] rounded-[16px]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-[#52658E] uppercase tracking-wider">
                                    Total Produk Aktif
                                </p>
                                <p className="text-2xl font-black text-[#0B1F63] mt-1">
                                    {stats.total}
                                </p>
                            </div>
                            <div
                                className={
                                    'w-10 h-10 rounded-xl bg-[#0060F4]/10 flex items-center ' +
                                    'justify-center text-[#0060F4]'
                                }
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                    />
                                </svg>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 bg-white border border-[#DCEAF8] rounded-[16px]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-[#52658E] uppercase tracking-wider">
                                    Kategori Jasa (Agency/PPh)
                                </p>
                                <p className="text-2xl font-black text-[#0057D9] mt-1">
                                    {stats.jasa}
                                </p>
                            </div>
                            <div
                                className={
                                    'w-10 h-10 rounded-xl bg-[#E0F0FF] flex items-center ' +
                                    'justify-center text-[#0057D9]'
                                }
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.58' +
                                            '6a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2' +
                                            ' 2 0 01-2 2z'
                                        }
                                    />
                                </svg>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 bg-white border border-[#DCEAF8] rounded-[16px]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-[#52658E] uppercase tracking-wider">
                                    Kategori Non-Jasa (Reimburse)
                                </p>
                                <p className="text-2xl font-black text-[#087443] mt-1">
                                    {stats.non_jasa}
                                </p>
                            </div>
                            <div
                                className={
                                    'w-10 h-10 rounded-xl bg-[#DCF7E8] flex items-center ' +
                                    'justify-center text-[#087443]'
                                }
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2' +
                                            '.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4' +
                                            ' 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'
                                        }
                                    />
                                </svg>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filter Tabs & Search */}
                <Card className="p-4 md:p-5 bg-white border border-[#DCEAF8] rounded-[16px]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Tabs: Semua | Jasa | Non-Jasa */}
                        <div
                            className={
                                'flex items-center gap-1 bg-[#F0F8FF] p-1 rounded-[12px] border ' +
                                'border-[#DCEAF8] overflow-x-auto'
                            }
                        >
                            <button
                                onClick={() => handleTypeTabChange('all')}
                                className={`px-4 py-2 rounded-[9px] text-xs font-bold transition-all whitespace-nowrap ${
                                    selectedType === 'all'
                                        ? 'bg-white text-[#0060F4] shadow-sm'
                                        : 'text-[#52658E] hover:text-[#0B1F63]'
                                }`}
                            >
                                Semua Produk ({stats.total})
                            </button>
                            <button
                                onClick={() => handleTypeTabChange('jasa')}
                                className={`px-4 py-2 rounded-[9px] text-xs font-bold transition-all whitespace-nowrap ${
                                    selectedType === 'jasa'
                                        ? 'bg-white text-[#0057D9] shadow-sm'
                                        : 'text-[#52658E] hover:text-[#0B1F63]'
                                }`}
                            >
                                Jasa & Keagenan ({stats.jasa})
                            </button>
                            <button
                                onClick={() => handleTypeTabChange('non_jasa')}
                                className={`px-4 py-2 rounded-[9px] text-xs font-bold transition-all whitespace-nowrap ${
                                    selectedType === 'non_jasa'
                                        ? 'bg-white text-[#087443] shadow-sm'
                                        : 'text-[#52658E] hover:text-[#0B1F63]'
                                }`}
                            >
                                Non-Jasa / Reimburse ({stats.non_jasa})
                            </button>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                            <div className="relative w-full md:w-72">
                                <span
                                    className={
                                        'absolute inset-y-0 left-0 pl-3 flex items-center ' +
                                        'pointer-events-none text-[#52658E]'
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
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari kode, nama, vendor..."
                                    className={
                                        'w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-white ' +
                                        'border border-[#DCEAF8] rounded-[10px] text-[#0B1F63] ' +
                                        'focus:outline-none focus:ring-2 focus:ring-[#0060F4]'
                                    }
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="secondary"
                                className="px-3 py-2 text-xs font-bold rounded-[10px]"
                            >
                                Filter
                            </Button>
                        </form>
                    </div>
                </Card>

                {/* Table Data Produk */}
                <Card
                    className={
                        'bg-white border border-[#DCEAF8] rounded-[16px] overflow-hidden ' +
                        'shadow-[0_2px_12px_rgba(8,40,112,0.04)]'
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs md:text-sm border-collapse">
                            <thead>
                                <tr className="bg-[#0D2945] text-[#E7F0FA] border-b border-[#173B5C]">
                                    <th className="py-3.5 px-4 font-bold">KODE & PRODUK</th>
                                    <th className="py-3.5 px-3 font-bold">KATEGORI</th>
                                    <th className="py-3.5 px-3 font-bold">TIPE INVOICE</th>
                                    <th className="py-3.5 px-3 font-bold">SATUAN</th>
                                    <th className="py-3.5 px-3 font-bold text-right">HPP VENDOR</th>
                                    <th className="py-3.5 px-3 font-bold text-right">
                                        JUAL (SANDAR)
                                    </th>
                                    <th className="py-3.5 px-3 font-bold text-right">
                                        JUAL (LABUH)
                                    </th>
                                    <th className="py-3.5 px-3 font-bold">VENDOR REKOMENDASI</th>
                                    <th className="py-3.5 px-4 font-bold text-center">AKSI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCEAF8]/60">
                                {products.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="py-12 text-center text-[#52658E]"
                                        >
                                            <p className="font-semibold text-sm">
                                                Tidak ada data produk yang sesuai filter.
                                            </p>
                                            <p className="text-xs text-[#52658E]/70 mt-1">
                                                Silakan sesuaikan kata kunci pencarian atau tambah
                                                produk baru.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((prod) => (
                                        <tr
                                            key={prod.id}
                                            className="hover:bg-[#F0F8FF]/60 transition-colors"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-[#0B1F63]">
                                                    {prod.name}
                                                </div>
                                                <div className="text-[11px] font-mono text-[#0060F4]">
                                                    {prod.code}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span
                                                    className={
                                                        'px-2 py-0.5 rounded-[6px] text-[11px] ' +
                                                        'font-semibold bg-[#F0F8FF] text-[#082870] ' +
                                                        'border border-[#DCEAF8]'
                                                    }
                                                >
                                                    {prod.category}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                {prod.item_type === 'jasa' ? (
                                                    <span
                                                        className={
                                                            'inline-flex items-center gap-1 px-2.5 ' +
                                                            'py-0.5 rounded-full text-[11px] ' +
                                                            'font-bold bg-[#E0F0FF] text-[#0057D9]'
                                                        }
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#0057D9]" />
                                                        Jasa (PPh 2%)
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={
                                                            'inline-flex items-center gap-1 px-2.5 ' +
                                                            'py-0.5 rounded-full text-[11px] ' +
                                                            'font-bold bg-[#DCF7E8] text-[#087443]'
                                                        }
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#087443]" />
                                                        Reimburse
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 font-medium text-[#52658E]">
                                                {prod.unit}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-medium text-[#52658E]">
                                                {formatRupiah(prod.hpp_default)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-[#0B1F63]">
                                                {formatRupiah(
                                                    prod.price_sandar || prod.selling_price_default
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-[#0060F4]">
                                                {formatRupiah(
                                                    prod.price_labuh || prod.selling_price_default
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                {prod.vendor ? (
                                                    <div>
                                                        <p className="font-semibold text-xs text-[#0B1F63]">
                                                            {prod.vendor.name}
                                                        </p>
                                                        <p className="text-[10px] text-[#52658E]">
                                                            {prod.vendor.phone || '-'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] italic text-[#52658E]/60">
                                                        Vendor Bebas / Internal
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(prod)}
                                                        className={
                                                            'p-1.5 rounded-[8px] ' +
                                                            'text-[#0060F4] hover:bg-[#E0F0FF] ' +
                                                            'transition-colors'
                                                        }
                                                        title="Edit Produk"
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
                                                                    'M11 5H6a2 2 0 00-2 2v11a2 2 ' +
                                                                    '0 002 2h11a2 2 0 002-2v-5m-1' +
                                                                    '.414-9.414a2 2 0 112.828 2.8' +
                                                                    '28L11.828 15H9v-2.828l8.586-' +
                                                                    '8.586z'
                                                                }
                                                            />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(prod)}
                                                        className={
                                                            'p-1.5 rounded-[8px] ' +
                                                            'text-[#C62840] hover:bg-[#FFE7EC] ' +
                                                            'transition-colors'
                                                        }
                                                        title="Hapus / Nonaktifkan"
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
                                                                    'M19 7l-.867 12.142A2 2 0 011' +
                                                                    '6.138 21H7.862a2 2 0 01-1.99' +
                                                                    '5-1.858L5 7m5 4v6m4-6v6m1-10' +
                                                                    'V4a1 1 0 00-1-1h-4a1 1 0 00-' +
                                                                    '1 1v3M4 7h16'
                                                                }
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal Tambah / Edit Produk */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    editingProduct
                        ? `Edit Master Produk: ${editingProduct.code}`
                        : 'Tambah Master Produk & Layanan'
                }
                size="lg"
            >
                <form onSubmit={handleSubmitProduct} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                                Kode Produk / Layanan <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                placeholder="Contoh: PRD-FW, PRD-MGO"
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
                                Nama Produk / Layanan <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Contoh: Air Tawar (Fresh Water Supply)"
                                className={
                                    'w-full px-3 py-2 text-xs md:text-sm border ' +
                                    'border-[#DCEAF8] rounded-[10px] text-[#0B1F63] ' +
                                    'focus:ring-2 focus:ring-[#0060F4]'
                                }
                                required
                            />
                            {errors.name && (
                                <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                                Tipe Invoice <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={data.item_type}
                                onChange={(e) =>
                                    setData('item_type', e.target.value as 'jasa' | 'non_jasa')
                                }
                                className={
                                    'w-full px-3 py-2 text-xs md:text-sm border ' +
                                    'border-[#DCEAF8] rounded-[10px] text-[#0B1F63] bg-white ' +
                                    'focus:ring-2 focus:ring-[#0060F4]'
                                }
                            >
                                <option value="jasa">Jasa / Keagenan (PPh 2%)</option>
                                <option value="non_jasa">
                                    Non-Jasa / Reimburse (BBM, Air, Pelindo)
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                                Kategori <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                placeholder="Air, BBM, Perahu, Clearance..."
                                className={
                                    'w-full px-3 py-2 text-xs md:text-sm border ' +
                                    'border-[#DCEAF8] rounded-[10px] text-[#0B1F63] ' +
                                    'focus:ring-2 focus:ring-[#0060F4]'
                                }
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                                Satuan <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.unit}
                                onChange={(e) => setData('unit', e.target.value)}
                                placeholder="Ton, Liter, Trip, Orang, Paket..."
                                className={
                                    'w-full px-3 py-2 text-xs md:text-sm border ' +
                                    'border-[#DCEAF8] rounded-[10px] text-[#0B1F63] ' +
                                    'focus:ring-2 focus:ring-[#0060F4]'
                                }
                                required
                            />
                        </div>
                    </div>

                    {/* Harga Pokok & Harga Jual Default */}
                    <div className="p-3 bg-[#F0F8FF] rounded-[12px] border border-[#DCEAF8] space-y-3">
                        <p className="text-xs font-bold text-[#0B1F63] uppercase tracking-wider">
                            Matriks Harga (HPP & Jual Berdasarkan Tipe Sandar / Labuh)
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-[#52658E] mb-1">
                                    HPP Vendor Default (Rp)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatRupiahInput(data.hpp_default)}
                                    onChange={(e) =>
                                        setData('hpp_default', Number(normalizeRupiahInput(e.target.value)))
                                    }
                                    className={
                                        'w-full px-3 py-2 text-xs md:text-sm font-mono border ' +
                                        'border-[#DCEAF8] rounded-[10px] bg-white ' +
                                        'text-[#0B1F63]'
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-[#52658E] mb-1">
                                    Harga Jual Sandar (Rp)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatRupiahInput(data.price_sandar)}
                                    onChange={(e) =>
                                        setData('price_sandar', Number(normalizeRupiahInput(e.target.value)))
                                    }
                                    className={
                                        'w-full px-3 py-2 text-xs md:text-sm font-mono border ' +
                                        'border-[#DCEAF8] rounded-[10px] bg-white ' +
                                        'text-[#0B1F63]'
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-[#52658E] mb-1">
                                    Harga Jual Labuh (Rp)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatRupiahInput(data.price_labuh)}
                                    onChange={(e) =>
                                        setData('price_labuh', Number(normalizeRupiahInput(e.target.value)))
                                    }
                                    className={
                                        'w-full px-3 py-2 text-xs md:text-sm font-mono border ' +
                                        'border-[#DCEAF8] rounded-[10px] bg-white ' +
                                        'text-[#0B1F63]'
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Vendor Terkait */}
                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Vendor Penyedia Terkait (Opsional)
                        </label>
                        <select
                            value={data.vendor_id || ''}
                            onChange={(e) => setData('vendor_id', e.target.value)}
                            className={
                                'w-full px-3 py-2 text-xs md:text-sm border border-[#DCEAF8] ' +
                                'rounded-[10px] text-[#0B1F63] bg-white'
                            }
                        >
                            <option value="">
                                -- Tanpa Vendor Khusus / Disediakan Langsung --
                            </option>
                            {vendors.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name} ({v.code})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-[#52658E] mt-1">
                            Informasi vendor ini memudahkan Admin mencocokkan kuotasi
                            harga dan pesanan logistik ke vendor riil.
                        </p>
                    </div>

                    {/* Deskripsi */}
                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Keterangan / Spesifikasi Layanan
                        </label>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={2}
                            placeholder="Catatan teknis kebutuhan armada atau izin..."
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
                                : editingProduct
                                  ? 'Perbarui Produk'
                                  : 'Simpan Produk'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
