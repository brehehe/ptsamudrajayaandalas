import React, { useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Building2, PackageOpen, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import AppLayout from '../../../Layouts/AppLayout';
import Card from '../../../Components/ui/Card';
import Button from '../../../Components/ui/Button';
import StatusBadge from '../../../Components/ui/StatusBadge';
import Modal from '../../../Components/overlays/Modal';
import ConfirmDialog from '../../../Components/overlays/ConfirmDialog';
import Select from '../../../Components/selects/Select';
import { ResponsiveTable, type Column } from '../../../Components/tables/Table';
import MobilePageHero from '../../../Components/navigation/MobilePageHero';
import FilterBar from '../../../Components/filters/FilterBar';
import Tabs from '../../../Components/ui/Tabs';
import FormErrorSummary from '../../../Components/forms/FormErrorSummary';
import Input from '../../../Components/forms/Input';
import MoneyInput from '../../../Components/forms/MoneyInput';
import Textarea from '../../../Components/forms/Textarea';

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
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

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

    const applyFilters = () => {
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
        clearErrors();
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
        clearErrors();
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

    const handleDeleteProduct = () => {
        if (!productToDelete) {
            return;
        }

        destroy(`/master/products/${productToDelete.id}`, {
            preserveScroll: true,
            onFinish: () => setProductToDelete(null),
        });
    };

    const productActions = (product: Product) => (
        <div className="flex items-center justify-end gap-1.5">
            <Button
                type="button"
                size="sm"
                variant="ghost"
                className="size-9 !px-0"
                onClick={() => openEditModal(product)}
                aria-label={`Edit ${product.name}`}
                title="Edit produk"
            >
                <Pencil aria-hidden="true" className="size-4" />
            </Button>
            <Button
                type="button"
                size="sm"
                variant="ghost"
                className="size-9 !px-0 !text-[#C62840] hover:!bg-[#FFE7EC] dark:hover:!bg-[#C62840]/15"
                onClick={() => setProductToDelete(product)}
                aria-label={`Nonaktifkan ${product.name}`}
                title="Nonaktifkan produk"
            >
                <Trash2 aria-hidden="true" className="size-4" />
            </Button>
        </div>
    );

    const columns = useMemo<Column<Product>[]>(
        () => [
            {
                key: 'product',
                header: 'Produk',
                width: '240px',
                render: (product) => (
                    <div className="min-w-0">
                        <p className="font-bold text-[#0B1F63] dark:text-white">{product.name}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#0060F4]">{product.code}</p>
                    </div>
                ),
            },
            {
                key: 'category',
                header: 'Kategori',
                width: '140px',
                render: (product) => (
                    <span className="inline-flex rounded-lg border border-[#DCEAF8] bg-[#F0F8FF] px-2 py-1 text-[11px] font-semibold text-[#082870] dark:border-[#1E3A5F] dark:bg-[#132847] dark:text-[#E2E8F0]">
                        {product.category}
                    </span>
                ),
            },
            {
                key: 'type',
                header: 'Tipe invoice',
                width: '130px',
                render: (product) => (
                    <StatusBadge
                        size="sm"
                        status={product.item_type === 'jasa' ? 'info' : 'success'}
                        label={product.item_type === 'jasa' ? 'Jasa (PPh 2%)' : 'Reimburse'}
                        showDot
                    />
                ),
            },
            { key: 'unit', header: 'Satuan', width: '90px', wrap: 'nowrap' },
            {
                key: 'hpp',
                header: 'HPP vendor',
                width: '135px',
                align: 'right',
                render: (product) => <span className="tabular-nums text-[#52658E]">{formatRupiah(product.hpp_default)}</span>,
            },
            {
                key: 'sandar',
                header: 'Jual sandar',
                width: '135px',
                align: 'right',
                render: (product) => <span className="font-bold tabular-nums">{formatRupiah(product.price_sandar || product.selling_price_default)}</span>,
            },
            {
                key: 'labuh',
                header: 'Jual labuh',
                width: '135px',
                align: 'right',
                render: (product) => <span className="font-bold tabular-nums text-[#0060F4]">{formatRupiah(product.price_labuh || product.selling_price_default)}</span>,
            },
            {
                key: 'vendor',
                header: 'Vendor rekomendasi',
                width: '190px',
                render: (product) => product.vendor ? (
                    <div>
                        <p className="font-semibold">{product.vendor.name}</p>
                        <p className="mt-0.5 text-[10px] text-[#52658E]">{product.vendor.phone || '-'}</p>
                    </div>
                ) : <span className="text-[#52658E]">Vendor bebas / internal</span>,
            },
            {
                key: 'actions',
                header: 'Aksi',
                width: '90px',
                align: 'right',
                render: productActions,
            },
        ],
        [],
    );

    return (
        <AppLayout
            title="Master Produk & Layanan"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Master Produk — PT Samudra Jaya Andalas" />

            <MobilePageHero
                title="Master Produk"
                description="Kelola katalog layanan, harga, satuan, dan vendor rekomendasi."
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:space-y-6 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                {/* Header Banner */}
                <div
                    className={
                        'hidden md:flex md:flex-row md:items-center justify-between gap-4 bg-white ' +
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
                            <Settings2 aria-hidden="true" className="size-4" />
                            <span>Tipe Kegiatan</span>
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
                            <Plus aria-hidden="true" className="size-4" />
                            Tambah Produk Baru
                        </Button>
                    </div>
                </div>

                <Button
                    type="button"
                    className="w-full md:hidden"
                    onClick={openAddModal}
                    leftIcon={<Plus aria-hidden="true" className="size-4" />}
                >
                    Tambah Produk
                </Button>

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

                <div className="overflow-hidden rounded-2xl border border-[#DCEAF8] bg-white dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                    <Tabs
                        items={[
                            { id: 'all', label: 'Semua', count: stats.total },
                            { id: 'jasa', label: 'Jasa & Keagenan', count: stats.jasa },
                            { id: 'non_jasa', label: 'Reimburse', count: stats.non_jasa },
                        ]}
                        activeId={selectedType}
                        onChange={handleTypeTabChange}
                        ariaLabel="Tipe produk"
                    />
                    <FilterBar
                        searchValue={search}
                        onSearchChange={setSearch}
                        onSearchSubmit={applyFilters}
                        searchPlaceholder="Cari kode, nama, atau vendor…"
                        searchAriaLabel="Cari produk"
                        filterCountBadge={selectedCategory === 'all' ? 0 : 1}
                        filterControls={(
                            <Select
                                aria-label="Filter kategori produk"
                                value={selectedCategory}
                                onChange={(event) => {
                                    const category = event.target.value;
                                    setSelectedCategory(category);
                                    router.get('/master/products', { search, type: selectedType, category }, { preserveState: true });
                                }}
                                options={[
                                    { value: 'all', label: 'Semua kategori' },
                                    ...categories.map((category) => ({ value: category, label: category })),
                                ]}
                            />
                        )}
                        className="!rounded-none !border-0 !shadow-none"
                    />
                </div>

                <ResponsiveTable<Product>
                    data={products}
                    keyExtractor={(product) => product.id}
                    desktop={{
                        columns,
                        compact: true,
                        minWidth: '1180px',
                        emptyMessage: 'Data Tidak Ditemukan',
                        emptyIcon: <PackageOpen aria-hidden="true" className="mx-auto size-7" />,
                    }}
                    mobile={{
                        titleRender: (product) => product.name,
                        subtitleRender: (product) => product.code,
                        statusRender: (product) => (
                            <StatusBadge
                                size="sm"
                                status={product.item_type === 'jasa' ? 'info' : 'success'}
                                label={product.item_type === 'jasa' ? 'Jasa' : 'Reimburse'}
                            />
                        ),
                        imageRender: () => (
                            <span className="flex size-11 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                <PackageOpen aria-hidden="true" className="size-5" />
                            </span>
                        ),
                        fields: [
                            { label: 'Kategori', fullWidth: true, render: (product) => product.category },
                            { label: 'Satuan', render: (product) => product.unit },
                            { label: 'HPP vendor', render: (product) => <span className="tabular-nums">{formatRupiah(product.hpp_default)}</span> },
                            { label: 'Jual sandar', render: (product) => <span className="tabular-nums">{formatRupiah(product.price_sandar || product.selling_price_default)}</span> },
                            { label: 'Jual labuh', render: (product) => <span className="tabular-nums text-[#0060F4]">{formatRupiah(product.price_labuh || product.selling_price_default)}</span> },
                            {
                                label: 'Vendor rekomendasi',
                                fullWidth: true,
                                icon: <Building2 aria-hidden="true" className="size-3" />,
                                render: (product) => product.vendor?.name || 'Vendor bebas / internal',
                            },
                        ],
                        actionsRender: productActions,
                        emptyMessage: 'Data Tidak Ditemukan',
                        emptyIcon: <PackageOpen aria-hidden="true" className="mx-auto size-7" />,
                    }}
                />
            </div>

            {/* Modal Tambah / Edit Produk */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    clearErrors();
                    setIsModalOpen(false);
                }}
                title={
                    editingProduct
                        ? `Edit Master Produk: ${editingProduct.code}`
                        : 'Tambah Master Produk & Layanan'
                }
                size="lg"
            >
                <form noValidate onSubmit={handleSubmitProduct} className="space-y-4">
                    <FormErrorSummary errors={errors} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input required name="code" autoComplete="off" label="Kode Produk / Layanan" value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} placeholder="Contoh: PRD-FW" className="font-mono" error={errors.code} />
                        <Input required name="name" autoComplete="off" label="Nama Produk / Layanan" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Contoh: Air Tawar" error={errors.name} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select required name="item_type" label="Tipe Invoice" value={data.item_type} onChange={(e) => setData('item_type', e.target.value as 'jasa' | 'non_jasa')} error={errors.item_type} options={[{ value: 'jasa', label: 'Jasa / Keagenan (PPh 2%)' }, { value: 'non_jasa', label: 'Non-Jasa / Reimburse' }]} />
                        <Input required name="category" autoComplete="off" label="Kategori" value={data.category} onChange={(e) => setData('category', e.target.value)} placeholder="Air, BBM, Clearance…" error={errors.category} />
                        <Input required name="unit" autoComplete="off" label="Satuan" value={data.unit} onChange={(e) => setData('unit', e.target.value)} placeholder="Ton, Liter, Paket…" error={errors.unit} />
                    </div>

                    {/* Harga Pokok & Harga Jual Default */}
                    <div className="p-3 bg-[#F0F8FF] rounded-[12px] border border-[#DCEAF8] space-y-3">
                        <p className="text-xs font-bold text-[#0B1F63] uppercase tracking-wider">
                            Matriks Harga (HPP & Jual Berdasarkan Tipe Sandar / Labuh)
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <MoneyInput required name="hpp_default" label="HPP Vendor Default" value={data.hpp_default} onChange={(value) => setData('hpp_default', Number(value))} error={errors.hpp_default} />
                            <MoneyInput name="price_sandar" label="Harga Jual Sandar" value={data.price_sandar} onChange={(value) => setData('price_sandar', Number(value))} error={errors.price_sandar} />
                            <MoneyInput name="price_labuh" label="Harga Jual Labuh" value={data.price_labuh} onChange={(value) => setData('price_labuh', Number(value))} error={errors.price_labuh} />
                        </div>
                    </div>

                    {/* Vendor Terkait */}
                    <Select name="vendor_id" label="Vendor Penyedia Terkait (Opsional)" value={data.vendor_id || ''} onChange={(e) => setData('vendor_id', e.target.value)} error={errors.vendor_id} helperText="Memudahkan Admin mencocokkan harga dan pesanan ke vendor." options={[{ value: '', label: 'Tanpa vendor khusus / disediakan langsung' }, ...vendors.map((vendor) => ({ value: vendor.id, label: `${vendor.name} (${vendor.code})` }))]} />

                    {/* Deskripsi */}
                    <Textarea name="description" label="Keterangan / Spesifikasi Layanan" value={data.description} onChange={(e) => setData('description', e.target.value)} rows={2} placeholder="Catatan teknis kebutuhan armada atau izin…" error={errors.description} />

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
                                : editingProduct
                                  ? 'Perbarui Produk'
                                  : 'Simpan Produk'}
                        </Button>
                    </div>
                </form>
            </Modal>
            <ConfirmDialog
                isOpen={Boolean(productToDelete)}
                title="Nonaktifkan produk?"
                description={productToDelete ? `${productToDelete.name} tidak akan tersedia untuk transaksi baru.` : ''}
                confirmLabel="Nonaktifkan"
                confirmVariant="danger"
                processing={processing}
                onClose={() => setProductToDelete(null)}
                onConfirm={handleDeleteProduct}
            />
        </AppLayout>
    );
}
