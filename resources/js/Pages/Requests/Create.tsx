import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import Modal from '../../Components/overlays/Modal';
import { playSjaChime } from '../../Components/feedback/AudioNotification';

interface Company {
    id: string;
    code: string;
    name: string;
}

interface Ship {
    id: string;
    name: string;
    imo_number: string;
    ship_company_id?: string | null;
    company?: Company;
}

interface Port {
    id: string;
    code: string;
    name: string;
}

interface ServiceType {
    id: string;
    code: string;
    name: string;
    is_default: boolean;
}

interface ProductPortPrice {
    port_id: string;
    service_type: string;
    selling_price: string | number;
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
    port_prices?: ProductPortPrice[];
    vendor?: {
        id: string;
        name: string;
    };
}

interface RequestsCreateProps {
    companies: Company[];
    ships: Ship[];
    ports: Port[];
    serviceTypes: ServiceType[];
    products: Product[];
}

interface NeedItemForm {
    product_id: string;
    item_name: string;
    unit: string;
    quantity: number;
    required_date: string;
    required_time: string;
    notes: string;
    is_urgent: boolean;
    attachment_name?: string;
}

const formatRupiah = (val?: number | string): string => {
    if (!val) return 'Rp 0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
};

export default function RequestsCreate({
    companies = [],
    ships = [],
    ports = [],
    serviceTypes = [],
    products = [],
}: RequestsCreateProps) {
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

    // Modal Tambah Perusahaan Inline
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyCode, setNewCompanyCode] = useState('');

    // Modal Tambah Kapal Inline
    const [isShipModalOpen, setIsShipModalOpen] = useState(false);
    const [newShipName, setNewShipName] = useState('');
    const [newShipImo, setNewShipImo] = useState('');

    // Main Wizard Form State
    const { data, setData, post, processing, errors } = useForm({
        // Wizard 1
        company_id: companies[0]?.id || '',
        is_new_company: false,
        new_company_name: '',
        ship_id: ships[0]?.id || '',
        is_new_ship: false,
        new_ship_name: '',
        new_ship_imo: '',
        service_type: 'Sandar',
        port_id: ports[0]?.id || '',

        // Wizard 2 (Multiple NeedItems)
        items: [
            {
                product_id: products[0]?.id || '',
                item_name: products[0]?.name || 'Air Tawar (Fresh Water Supply)',
                unit: products[0]?.unit || 'Ton',
                quantity: 10,
                required_date: new Date().toISOString().split('T')[0],
                required_time: '10:00',
                notes: 'Kebutuhan awal sandar armada.',
                is_urgent: false,
                attachment_name: '',
            },
        ] as NeedItemForm[],

        // Wizard 3
        notes: '',
        confirmed_agreement: false,
    });

    // Filter ships based on selected company
    const filteredShips = data.company_id
        ? ships.filter((s) => s.ship_company_id === data.company_id || !s.ship_company_id)
        : ships;

    const selectedCompany = companies.find((c) => c.id === data.company_id);
    const selectedShip = ships.find((s) => s.id === data.ship_id);
    const selectedPort = ports.find((p) => p.id === data.port_id);

    // Handle adding items in Wizard 2
    const handleAddItem = () => {
        const defaultProd = products[0];
        setData('items', [
            ...data.items,
            {
                product_id: defaultProd?.id || '',
                item_name: defaultProd?.name || 'Item Kebutuhan Kapal',
                unit: defaultProd?.unit || 'Unit',
                quantity: 1,
                required_date: new Date().toISOString().split('T')[0],
                required_time: '12:00',
                notes: '',
                is_urgent: false,
                attachment_name: '',
            },
        ]);
    };

    const handleRemoveItem = (index: number) => {
        if (data.items.length <= 1) {
            alert('Minimal harus ada 1 item kebutuhan.');
            return;
        }
        setData(
            'items',
            data.items.filter((_, i) => i !== index)
        );
    };

    const handleItemChange = (index: number, field: keyof NeedItemForm, value: any) => {
        const updated = [...data.items];
        updated[index] = {
            ...updated[index],
            [field]: value,
        };

        // If product changed, update unit and name
        if (field === 'product_id') {
            const prod = products.find((p) => p.id === value);
            if (prod) {
                updated[index].item_name = prod.name;
                updated[index].unit = prod.unit;
            }
        }

        setData('items', updated);
    };

    // Calculate Estimated Price for an item given current port & service type
    const getItemPrice = (item: NeedItemForm): number => {
        const prod = products.find((p) => p.id === item.product_id);
        if (!prod) return 0;

        if (prod.port_prices && prod.port_prices.length > 0) {
            const match = prod.port_prices.find(
                (pp) => pp.port_id === data.port_id && pp.service_type === data.service_type
            );
            if (match && Number(match.selling_price) > 0) {
                return Number(match.selling_price);
            }
        }

        if (data.service_type === 'Labuh' && Number(prod.price_labuh) > 0) {
            return Number(prod.price_labuh);
        }
        if (Number(prod.price_sandar) > 0) {
            return Number(prod.price_sandar);
        }
        return Number(prod.selling_price_default) || 0;
    };

    const totalEstimatedCost = data.items.reduce((acc, item) => {
        return acc + getItemPrice(item) * (Number(item.quantity) || 0);
    }, 0);

    // Save inline company
    const handleSaveInlineCompany = () => {
        if (!newCompanyName.trim()) return;
        setData((prev) => ({
            ...prev,
            is_new_company: true,
            new_company_name: newCompanyName,
            company_id: '',
        }));
        setIsCompanyModalOpen(false);
    };

    // Save inline ship
    const handleSaveInlineShip = () => {
        if (!newShipName.trim()) return;
        setData((prev) => ({
            ...prev,
            is_new_ship: true,
            new_ship_name: newShipName,
            new_ship_imo: newShipImo || 'IMO-' + Math.floor(1000000 + Math.random() * 9000000),
            ship_id: '',
        }));
        setIsShipModalOpen(false);
    };

    // Final Wizard Submit
    const handleSubmitWizard = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.confirmed_agreement) {
            alert('Silakan centang persetujuan kebenaran data pengajuan.');
            return;
        }

        // Play synthetic maritime chime sound
        playSjaChime('success');

        post('/requests/wizard', {
            onSuccess: () => {
                // Success redirect handled by controller
            },
        });
    };

    return (
        <AppLayout title="Form Pengajuan Kebutuhan Kapal">
            <Head title="Form Pengajuan — PT Samudra Jaya Andalas" />

            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 pb-12">
                {/* Clean Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 px-1">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#0060F4]/10 text-[#0060F4]">
                                Modul Lapangan (Pak Prima)
                            </span>
                            <span className="text-[11px] text-[#52658E]">Form Order Keagenan</span>
                        </div>
                        <h1 className="text-lg md:text-2xl font-black text-[#0B1F63] tracking-tight">
                            Pengajuan Kebutuhan Kapal
                        </h1>
                        <p className="text-xs text-[#52658E] mt-0.5">
                            Isi profil kapal, pilih logistik Master Produk, review dan teruskan ke Bu Titik (Admin).
                        </p>
                    </div>

                    <Link
                        href="/requests"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#52658E] hover:text-[#0060F4] transition-colors py-1 self-start sm:self-center"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Kembali ke Daftar
                    </Link>
                </div>

                {/* Modern Sleek Stepper - Compact & Fully Visible */}
                <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-[#DCEAF8] shadow-xs">
                    {/* Top Progress Track */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-2.5">
                        <div className={`h-1 rounded-full transition-all duration-300 ${
                            currentStep >= 1 ? 'bg-[#0060F4]' : 'bg-[#E0F0FF]'
                        }`} />
                        <div className={`h-1 rounded-full transition-all duration-300 ${
                            currentStep >= 2 ? 'bg-[#0060F4]' : 'bg-[#E0F0FF]'
                        }`} />
                        <div className={`h-1 rounded-full transition-all duration-300 ${
                            currentStep >= 3 ? 'bg-[#0060F4]' : 'bg-[#E0F0FF]'
                        }`} />
                    </div>

                    <div className="grid grid-cols-3 gap-1 sm:gap-3 relative">
                        {/* Step 1 Tab */}
                        <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className={`flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5 p-1.5 sm:p-2.5 rounded-xl text-center sm:text-left transition-all ${
                                currentStep === 1
                                    ? 'bg-[#E0F0FF] border border-[#0060F4]/40 text-[#0060F4] ring-1 ring-[#0060F4]/20'
                                    : currentStep > 1
                                    ? 'bg-[#DCF7E8]/60 text-[#087443] hover:bg-[#DCF7E8]'
                                    : 'text-[#8C9BB9] hover:bg-[#F0F8FF]'
                            }`}
                        >
                            <span
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 transition-all ${
                                    currentStep === 1
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : currentStep > 1
                                        ? 'bg-[#087443] text-white'
                                        : 'bg-[#F0F8FF] text-[#8C9BB9] border border-[#DCEAF8]'
                                }`}
                            >
                                {currentStep > 1 ? '✓' : '1'}
                            </span>
                            <div className="w-full min-w-0">
                                <p className="text-[9px] font-bold uppercase tracking-wider leading-none text-[#52658E]">
                                    Langkah 1
                                </p>
                                <p className={`text-[10.5px] sm:text-xs md:text-sm font-bold leading-tight mt-0.5 whitespace-normal break-words ${
                                    currentStep === 1 ? 'text-[#0060F4]' : currentStep > 1 ? 'text-[#087443]' : 'text-[#52658E]'
                                }`}>
                                    Kapal & Pelabuhan
                                </p>
                            </div>
                        </button>

                        {/* Step 2 Tab */}
                        <button
                            type="button"
                            onClick={() => {
                                if (!data.company_id && !data.new_company_name) return;
                                if (!data.ship_id && !data.new_ship_name) return;
                                setCurrentStep(2);
                            }}
                            className={`flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5 p-1.5 sm:p-2.5 rounded-xl text-center sm:text-left transition-all ${
                                currentStep === 2
                                    ? 'bg-[#E0F0FF] border border-[#0060F4]/40 text-[#0060F4] ring-1 ring-[#0060F4]/20'
                                    : currentStep > 2
                                    ? 'bg-[#DCF7E8]/60 text-[#087443] hover:bg-[#DCF7E8]'
                                    : 'text-[#8C9BB9] hover:bg-[#F0F8FF]'
                            }`}
                        >
                            <span
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 transition-all ${
                                    currentStep === 2
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : currentStep > 2
                                        ? 'bg-[#087443] text-white'
                                        : 'bg-[#F0F8FF] text-[#8C9BB9] border border-[#DCEAF8]'
                                }`}
                            >
                                {currentStep > 2 ? '✓' : '2'}
                            </span>
                            <div className="w-full min-w-0">
                                <p className="text-[9px] font-bold uppercase tracking-wider leading-none text-[#52658E]">
                                    Langkah 2
                                </p>
                                <p className={`text-[10.5px] sm:text-xs md:text-sm font-bold leading-tight mt-0.5 whitespace-normal break-words ${
                                    currentStep === 2 ? 'text-[#0060F4]' : currentStep > 2 ? 'text-[#087443]' : 'text-[#52658E]'
                                }`}>
                                    Daftar Kebutuhan
                                </p>
                            </div>
                        </button>

                        {/* Step 3 Tab */}
                        <button
                            type="button"
                            onClick={() => {
                                if (data.items.length === 0) return;
                                setCurrentStep(3);
                            }}
                            className={`flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5 p-1.5 sm:p-2.5 rounded-xl text-center sm:text-left transition-all ${
                                currentStep === 3
                                    ? 'bg-[#E0F0FF] border border-[#0060F4]/40 text-[#0060F4] ring-1 ring-[#0060F4]/20'
                                    : 'text-[#8C9BB9] hover:bg-[#F0F8FF]'
                            }`}
                        >
                            <span
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 transition-all ${
                                    currentStep === 3
                                        ? 'bg-[#0060F4] text-white shadow-xs'
                                        : 'bg-[#F0F8FF] text-[#8C9BB9] border border-[#DCEAF8]'
                                }`}
                            >
                                3
                            </span>
                            <div className="w-full min-w-0">
                                <p className="text-[9px] font-bold uppercase tracking-wider leading-none text-[#52658E]">
                                    Langkah 3
                                </p>
                                <p className={`text-[10.5px] sm:text-xs md:text-sm font-bold leading-tight mt-0.5 whitespace-normal break-words ${
                                    currentStep === 3 ? 'text-[#0060F4]' : 'text-[#52658E]'
                                }`}>
                                    Review & Kirim
                                </p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Main Card Container */}
                <div className="bg-white rounded-2xl border border-[#DCEAF8] shadow-sm p-3.5 sm:p-6 md:p-7">
                    {/* ============================================================ */}
                    {/* WIZARD STEP 1: PROFIL KAPAL & LOKASI                         */}
                    {/* ============================================================ */}
                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div className="border-b border-[#DCEAF8] pb-3">
                                <h2 className="text-base font-black text-[#0B1F63]">
                                    Langkah 1: Tentukan Perusahaan, Kapal, Tipe Kegiatan, & Pelabuhan
                                </h2>
                                <p className="text-xs text-[#52658E] mt-0.5">
                                    Bila nama perusahaan atau kapal belum terdaftar, Anda dapat langsung menambahkannya secara instan.
                                </p>
                            </div>

                            {/* Perusahaan Pelayaran */}
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <label className="text-xs font-bold text-[#0B1F63] flex items-center gap-1">
                                        Perusahaan Pelayaran / Klien <span className="text-[#C62840]">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCompanyModalOpen(true)}
                                        className="text-[11px] font-bold text-[#0060F4] hover:text-[#082870] flex items-center gap-0.5 transition-colors flex-shrink-0"
                                    >
                                        <span className="text-xs font-bold">＋</span> Tambah Baru
                                    </button>
                                </div>

                                {data.is_new_company ? (
                                    <div className="p-3 rounded-xl bg-[#DCF7E8] border border-[#087443]/30 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-[#087443] uppercase">Perusahaan Baru Terdaftar:</span>
                                            <p className="text-xs md:text-sm font-bold text-[#0B1F63]">{data.new_company_name}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setData('is_new_company', false)}
                                            className="text-xs font-bold text-[#C62840] hover:underline px-2 py-1 rounded-md"
                                        >
                                            Ganti
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select
                                            value={data.company_id}
                                            onChange={(e) => setData('company_id', e.target.value)}
                                            className="w-full h-11 px-3.5 pr-9 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63] bg-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] transition-all"
                                        >
                                            <option value="">-- Pilih Perusahaan Pelayaran --</option>
                                            {companies.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} {c.code ? `(${c.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Nama Kapal */}
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <label className="text-xs font-bold text-[#0B1F63] flex items-center gap-1">
                                        Nama Kapal Armada <span className="text-[#C62840]">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsShipModalOpen(true)}
                                        className="text-[11px] font-bold text-[#0060F4] hover:text-[#082870] flex items-center gap-0.5 transition-colors flex-shrink-0"
                                    >
                                        <span className="text-xs font-bold">＋</span> Tambah Baru
                                    </button>
                                </div>

                                {data.is_new_ship ? (
                                    <div className="p-3 rounded-xl bg-[#DCF7E8] border border-[#087443]/30 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-[#087443] uppercase">Kapal Baru Terdaftar:</span>
                                            <p className="text-xs md:text-sm font-bold text-[#0B1F63]">{data.new_ship_name} ({data.new_ship_imo})</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setData('is_new_ship', false)}
                                            className="text-xs font-bold text-[#C62840] hover:underline px-2 py-1 rounded-md"
                                        >
                                            Ganti
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select
                                            value={data.ship_id}
                                            onChange={(e) => setData('ship_id', e.target.value)}
                                            className="w-full h-11 px-3.5 pr-9 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63] bg-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] transition-all"
                                        >
                                            <option value="">-- Pilih Nama Kapal --</option>
                                            {filteredShips.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} (IMO: {s.imo_number})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Tipe Kegiatan (Sandar vs Labuh) */}
                            <div>
                                <label className="block text-xs font-bold text-[#0B1F63] mb-1.5">
                                    Tipe Kegiatan Kapal <span className="text-[#C62840]">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setData('service_type', 'Sandar')}
                                        className={`relative p-3.5 rounded-xl border text-left transition-all ${
                                            data.service_type === 'Sandar'
                                                ? 'bg-[#0060F4] text-white border-[#0060F4] shadow-md shadow-[#0060F4]/20 ring-2 ring-[#0060F4]/30'
                                                : 'bg-white text-[#0B1F63] border-[#DCEAF8] hover:border-[#0060F4]/40 hover:bg-[#F0F8FF]/50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-base">⚓</span>
                                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                data.service_type === 'Sandar'
                                                    ? 'border-white bg-white text-[#0060F4]'
                                                    : 'border-[#DCEAF8] bg-white'
                                            }`}>
                                                {data.service_type === 'Sandar' && (
                                                    <span className="w-2 h-2 rounded-full bg-[#0060F4]" />
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold leading-tight">Sandar</p>
                                        <p className={`text-[11px] mt-0.5 leading-tight ${
                                            data.service_type === 'Sandar' ? 'text-white/80' : 'text-[#52658E]'
                                        }`}>
                                            Di Dermaga Pelabuhan
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setData('service_type', 'Labuh')}
                                        className={`relative p-3.5 rounded-xl border text-left transition-all ${
                                            data.service_type === 'Labuh'
                                                ? 'bg-[#0060F4] text-white border-[#0060F4] shadow-md shadow-[#0060F4]/20 ring-2 ring-[#0060F4]/30'
                                                : 'bg-white text-[#0B1F63] border-[#DCEAF8] hover:border-[#0060F4]/40 hover:bg-[#F0F8FF]/50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-base">🌊</span>
                                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                data.service_type === 'Labuh'
                                                    ? 'border-white bg-white text-[#0060F4]'
                                                    : 'border-[#DCEAF8] bg-white'
                                            }`}>
                                                {data.service_type === 'Labuh' && (
                                                    <span className="w-2 h-2 rounded-full bg-[#0060F4]" />
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold leading-tight">Labuh</p>
                                        <p className={`text-[11px] mt-0.5 leading-tight ${
                                            data.service_type === 'Labuh' ? 'text-white/80' : 'text-[#52658E]'
                                        }`}>
                                            Area Perairan / Buoy
                                        </p>
                                    </button>
                                </div>
                                <p className="text-[11px] text-[#52658E] mt-1.5 flex items-center gap-1">
                                    <span>💡</span>
                                    Penentuan tipe kegiatan otomatis menyesuaikan harga Master Produk untuk logistik yang dipilih.
                                </p>
                            </div>

                            {/* Pelabuhan Singgah */}
                            <div>
                                <label className="block text-xs font-bold text-[#0B1F63] mb-1.5">
                                    Pelabuhan Singgah <span className="text-[#C62840]">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={data.port_id}
                                        onChange={(e) => setData('port_id', e.target.value)}
                                        className="w-full h-11 px-3.5 pr-9 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63] bg-white focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] transition-all"
                                    >
                                        {ports.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-[11px] text-[#52658E] mt-1.5">
                                    Dermaga Boom Baru Palembang, Tanjung Perak, Tanjung Priok, atau pelabuhan operasional lainnya.
                                </p>
                            </div>

                            {/* Action Button */}
                            <div className="pt-4 border-t border-[#DCEAF8]">
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => {
                                        if (!data.company_id && !data.new_company_name) {
                                            alert('Silakan pilih atau masukkan data perusahaan pelayaran.');
                                            return;
                                        }
                                        if (!data.ship_id && !data.new_ship_name) {
                                            alert('Silakan pilih atau masukkan nama kapal.');
                                            return;
                                        }
                                        setCurrentStep(2);
                                    }}
                                    className="w-full md:w-auto md:ml-auto h-11 px-7 bg-[#0060F4] hover:bg-[#082870] text-white text-xs md:text-sm font-bold rounded-xl shadow-sm flex items-center justify-center gap-2"
                                >
                                    Lanjut ke Langkah 2: Daftar Kebutuhan →
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* WIZARD STEP 2: MULTI-ITEM KEBUTUHAN                          */}
                    {/* ============================================================ */}
                    {currentStep === 2 && (
                        <div className="space-y-5">
                            <div className="border-b border-[#DCEAF8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div>
                                    <h2 className="text-base font-black text-[#0B1F63]">
                                        Langkah 2: Input Kebutuhan Kapal (NeedItems)
                                    </h2>
                                    <p className="text-xs text-[#52658E] mt-0.5">
                                        Pilih produk dari Master Produk, tentukan jumlah, satuan, tanggal, dan prioritas urgent.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="px-3.5 py-2 bg-[#0060F4] hover:bg-[#082870] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all self-start sm:self-center"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Tambah Item Kebutuhan
                                </button>
                            </div>

                            {/* List of Items */}
                            <div className="space-y-3.5">
                                {data.items.map((item, idx) => {
                                    const unitPrice = getItemPrice(item);
                                    const subtotal = unitPrice * (Number(item.quantity) || 0);
                                    const selectedProd = products.find((p) => p.id === item.product_id);

                                    return (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-xl border transition-all ${
                                                item.is_urgent
                                                    ? 'bg-[#FFE7EC]/30 border-[#C62840]/30'
                                                    : 'bg-[#F0F8FF]/40 border-[#DCEAF8]'
                                            }`}
                                        >
                                            {/* Item Card Header */}
                                            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#DCEAF8]/70">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-[#0B1F63] text-white text-[11px] font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#0B1F63]">
                                                        Item Kebutuhan #{idx + 1}
                                                    </span>
                                                    {selectedProd?.item_type === 'jasa' ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F0FF] text-[#0060F4]">
                                                            Jasa Keagenan
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCF7E8] text-[#087443]">
                                                            Reimburse / Non-Jasa
                                                        </span>
                                                    )}
                                                </div>

                                                {data.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(idx)}
                                                        className="text-xs text-[#C62840] hover:text-red-700 font-bold flex items-center gap-1 transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Hapus
                                                    </button>
                                                )}
                                            </div>

                                            {/* Fields Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                {/* Pilihan Master Produk */}
                                                <div className="md:col-span-2">
                                                    <label className="block text-[11px] font-bold text-[#0B1F63] mb-1">
                                                        Jenis Kebutuhan (Master Produk) <span className="text-[#C62840]">*</span>
                                                    </label>
                                                    <select
                                                        value={item.product_id}
                                                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                                                        className="w-full h-10 px-3 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63] bg-white focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                                                    >
                                                        <option value="">-- Pilih dari Master Produk --</option>
                                                        {products.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} [{p.category} • {p.item_type === 'jasa' ? 'Jasa' : 'Reimburse'}]
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Jumlah & Satuan */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-[#0B1F63] mb-1">
                                                            Jumlah <span className="text-[#C62840]">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min={0.1}
                                                            step={0.1}
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                            className="w-full h-10 px-3 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63] bg-white font-mono"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-[#0B1F63] mb-1">
                                                            Satuan
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={item.unit}
                                                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                                            className="w-full h-10 px-3 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63] bg-white"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {/* Waktu Dibutuhkan */}
                                                <div>
                                                    <label className="block text-[11px] font-bold text-[#0B1F63] mb-1">
                                                        Dibutuhkan Pada
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={item.required_date}
                                                        onChange={(e) => handleItemChange(idx, 'required_date', e.target.value)}
                                                        className="w-full h-10 px-3 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63] bg-white"
                                                    />
                                                </div>
                                            </div>

                                            {/* Keterangan & Urgent & Estimasi Biaya */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-2 border-t border-[#DCEAF8]/50">
                                                <div className="md:col-span-2">
                                                    <input
                                                        type="text"
                                                        value={item.notes}
                                                        onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                                                        placeholder="Catatan spesifik (misal: bunker MGO 0.5%, air tawar dermaga barat)..."
                                                        className="w-full h-9 px-3 text-xs border border-[#DCEAF8] rounded-lg text-[#0B1F63] bg-white placeholder-[#8C9BB9]"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.is_urgent}
                                                            onChange={(e) => handleItemChange(idx, 'is_urgent', e.target.checked)}
                                                            className="w-4 h-4 rounded text-[#C62840] border-[#DCEAF8] focus:ring-[#C62840]"
                                                        />
                                                        <span className={`text-xs font-bold ${item.is_urgent ? 'text-[#C62840]' : 'text-[#52658E]'}`}>
                                                            🚨 Urgent
                                                        </span>
                                                    </label>

                                                    <div className="text-right">
                                                        <span className="text-[10px] text-[#52658E] block">Estimasi Tarif:</span>
                                                        <span className="text-xs font-mono font-black text-[#0B1F63]">
                                                            {formatRupiah(subtotal)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Total Cost Estimate Footer */}
                            <div className="p-4 rounded-xl bg-[#E0F0FF]/60 border border-[#0060F4]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <p className="text-xs font-bold text-[#0B1F63]">
                                        Total Estimasi Kebutuhan ({data.items.length} Item Terinput):
                                    </p>
                                    <p className="text-[11px] text-[#52658E]">
                                        *Harga final akan diverifikasi oleh Admin (Bu Titik) berdasarkan kuotasi rekanan vendor riil.
                                    </p>
                                </div>
                                <p className="text-lg md:text-xl font-mono font-black text-[#0060F4]">
                                    {formatRupiah(totalEstimatedCost)}
                                </p>
                            </div>

                            {/* Buttons Step 2 */}
                            <div className="pt-4 border-t border-[#DCEAF8] flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    className="w-full sm:w-auto h-11 px-5 border border-[#DCEAF8] bg-white hover:bg-[#F0F8FF] text-[#52658E] hover:text-[#0B1F63] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                >
                                    ← Kembali ke Langkah 1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(3)}
                                    className="w-full sm:w-auto h-11 px-7 bg-[#0060F4] hover:bg-[#082870] text-white text-xs md:text-sm font-bold rounded-xl shadow-md shadow-[#0060F4]/20 flex items-center justify-center gap-2 transition-all"
                                >
                                    Lanjut ke Review & Kirim →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* WIZARD STEP 3: REVIEW & SUBMIT                               */}
                    {/* ============================================================ */}
                    {currentStep === 3 && (
                        <form onSubmit={handleSubmitWizard} className="space-y-4 sm:space-y-5">
                            <div className="border-b border-[#DCEAF8] pb-3">
                                <h2 className="text-sm sm:text-base font-black text-[#0B1F63]">
                                    Langkah 3: Review Hasil Permintaan & Konfirmasi Pengajuan
                                </h2>
                                <p className="text-xs text-[#52658E] mt-0.5">
                                    Periksa kembali ringkasan data sebelum diteruskan ke Bu Titik (Admin Operasional).
                                </p>
                            </div>

                            {/* Unified Summary Card (Mobile Friendly) */}
                            <div className="bg-[#F0F8FF]/80 rounded-xl border border-[#DCEAF8] p-3.5 space-y-3 text-xs shadow-xs">
                                <div className="flex items-center justify-between pb-2 border-b border-[#DCEAF8]/70">
                                    <span className="font-bold text-[#082870] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                        <span>🚢</span> Ringkasan Pengajuan
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCF7E8] text-[#087443] border border-[#087443]/20">
                                        {data.items.length} Item Kebutuhan
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-[#52658E] block uppercase tracking-wider">Perusahaan Pelayaran</span>
                                        <span className="font-bold text-[#0B1F63] text-xs block truncate mt-0.5">
                                            {data.is_new_company ? data.new_company_name : selectedCompany?.name || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-[#52658E] block uppercase tracking-wider">Nama Kapal & IMO</span>
                                        <span className="font-bold text-[#0B1F63] text-xs block truncate mt-0.5">
                                            {data.is_new_ship ? data.new_ship_name : selectedShip?.name || '-'}
                                            <span className="font-mono text-[11px] font-normal text-[#52658E] ml-1">
                                                ({data.is_new_ship ? data.new_ship_imo : selectedShip?.imo_number || '-'})
                                            </span>
                                        </span>
                                    </div>
                                    <div className="pt-2 sm:pt-0 sm:border-t-0 border-t border-[#DCEAF8]/50">
                                        <span className="text-[10px] font-bold text-[#52658E] block uppercase tracking-wider">Tipe Kegiatan</span>
                                        <span className="font-bold text-[#0060F4] text-xs flex items-center gap-1 mt-0.5">
                                            {data.service_type === 'Sandar' ? '⚓ Sandar (Dermaga Pelabuhan)' : '🌊 Labuh (Area Perairan / Buoy)'}
                                        </span>
                                    </div>
                                    <div className="pt-2 sm:pt-0 sm:border-t-0 border-t border-[#DCEAF8]/50">
                                        <span className="text-[10px] font-bold text-[#52658E] block uppercase tracking-wider">Pelabuhan Singgah</span>
                                        <span className="font-bold text-[#0B1F63] text-xs block truncate mt-0.5">
                                            {selectedPort?.name} ({selectedPort?.code})
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Daftar Kebutuhan (Mobile Cards + Desktop Table) */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold text-[#0B1F63] uppercase tracking-wider">
                                        Daftar Kebutuhan yang Diajukan
                                    </h3>
                                    <span className="text-[11px] font-bold text-[#52658E]">
                                        Total: <strong className="font-mono text-[#0060F4]">{formatRupiah(totalEstimatedCost)}</strong>
                                    </span>
                                </div>

                                {/* Mobile Card List (md:hidden) */}
                                <div className="space-y-2 md:hidden">
                                    {data.items.map((it, idx) => {
                                        const p = getItemPrice(it);
                                        const sub = p * (Number(it.quantity) || 0);
                                        const prod = products.find((pr) => pr.id === it.product_id);

                                        return (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-xl border border-[#DCEAF8] bg-white shadow-xs space-y-2"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-[#0D2945] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            {idx + 1}
                                                        </span>
                                                        <div>
                                                            <span className="text-xs font-bold text-[#0B1F63] leading-snug block">
                                                                {it.item_name}
                                                            </span>
                                                            {it.notes && (
                                                                <p className="text-[11px] text-[#52658E] italic mt-0.5">
                                                                    {it.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            prod?.item_type === 'jasa'
                                                                ? 'bg-[#E0F0FF] text-[#0060F4]'
                                                                : 'bg-[#DCF7E8] text-[#087443]'
                                                        }`}>
                                                            {prod?.item_type === 'jasa' ? 'Jasa' : 'Reimburse'}
                                                        </span>
                                                        {it.is_urgent && (
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFE7EC] text-[#C62840]">
                                                                🚨 Urgent
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-[#DCEAF8]/60 text-xs pl-7">
                                                    <div className="text-[#52658E] text-[11px]">
                                                        <span className="font-bold text-[#0B1F63]">{it.quantity} {it.unit}</span>
                                                        {it.required_date && (
                                                            <>
                                                                <span className="mx-1 text-[#DCEAF8]">|</span>
                                                                <span>{it.required_date}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-mono font-bold text-xs text-[#0060F4]">
                                                            {formatRupiah(sub)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop Table View (hidden md:block) */}
                                <div className="hidden md:block border border-[#DCEAF8] rounded-xl overflow-x-auto">
                                    <table className="w-full text-left text-xs min-w-[500px]">
                                        <thead>
                                            <tr className="bg-[#0D2945] text-[#E7F0FA]">
                                                <th className="py-2.5 px-3">NO</th>
                                                <th className="py-2.5 px-3">KEBUTUHAN</th>
                                                <th className="py-2.5 px-3">TIPE</th>
                                                <th className="py-2.5 px-3 text-right">JUMLAH</th>
                                                <th className="py-2.5 px-3">TANGGAL</th>
                                                <th className="py-2.5 px-3 text-center">PRIORITAS</th>
                                                <th className="py-2.5 px-3 text-right">ESTIMASI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#DCEAF8]/60">
                                            {data.items.map((it, idx) => {
                                                const p = getItemPrice(it);
                                                const sub = p * (Number(it.quantity) || 0);
                                                const prod = products.find((pr) => pr.id === it.product_id);

                                                return (
                                                    <tr key={idx} className="hover:bg-[#F0F8FF]/50">
                                                        <td className="py-2.5 px-3 font-bold text-[#52658E]">{idx + 1}</td>
                                                        <td className="py-2.5 px-3">
                                                            <span className="font-bold text-[#0B1F63]">{it.item_name}</span>
                                                            {it.notes && (
                                                                <p className="text-[10px] text-[#52658E] italic">{it.notes}</p>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                prod?.item_type === 'jasa'
                                                                    ? 'bg-[#E0F0FF] text-[#0060F4]'
                                                                    : 'bg-[#DCF7E8] text-[#087443]'
                                                            }`}>
                                                                {prod?.item_type === 'jasa' ? 'Jasa' : 'Reimburse'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#0B1F63]">
                                                            {it.quantity} {it.unit}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-[#52658E] font-medium">
                                                            {it.required_date}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            {it.is_urgent ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE7EC] text-[#C62840]">
                                                                    🚨 Urgent
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0F8FF] text-[#52658E]">
                                                                    Normal
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0B1F63]">
                                                            {formatRupiah(sub)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Catatan Tambahan Lapangan */}
                            <div>
                                <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                                    Catatan Tambahan untuk Admin (Bu Titik)
                                </label>
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={2}
                                    placeholder="Contoh: Kapal estimasi tiba besok sore jam 16:00, mohon diprioritaskan air tawar dan clearance..."
                                    className="w-full px-3 py-2 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63] focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4]"
                                />
                            </div>

                            {/* Konfirmasi Checkbox */}
                            <div className="p-3 sm:p-3.5 rounded-xl bg-[#F0F8FF] border border-[#0060F4]/20 flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="confirmed_agreement"
                                    checked={data.confirmed_agreement}
                                    onChange={(e) => setData('confirmed_agreement', e.target.checked)}
                                    className="w-4 h-4 mt-0.5 rounded text-[#0060F4] border-[#DCEAF8] focus:ring-[#0060F4] cursor-pointer flex-shrink-0"
                                    required
                                />
                                <label htmlFor="confirmed_agreement" className="text-xs text-[#0B1F63] cursor-pointer leading-relaxed">
                                    <strong>Saya menyatakan data kebutuhan kapal di atas telah diverifikasi riil di lapangan</strong> dan siap diproses oleh Bu Titik (Admin) untuk kuotasi vendor & persetujuan Direktur.
                                </label>
                            </div>

                            {/* Submit & Back Actions */}
                            <div className="pt-3.5 border-t border-[#DCEAF8] flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(2)}
                                    className="w-full sm:w-auto h-11 px-5 border border-[#DCEAF8] bg-white hover:bg-[#F0F8FF] text-[#52658E] hover:text-[#0B1F63] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                >
                                    ← Kembali ke Langkah 2
                                </button>

                                <button
                                    type="submit"
                                    disabled={processing || !data.confirmed_agreement}
                                    className="w-full sm:w-auto h-11 bg-[#0060F4] hover:bg-[#082870] text-white px-7 text-xs md:text-sm font-bold rounded-xl shadow-md shadow-[#0060F4]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {processing ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan ke Admin (Bu Titik)'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Modal Inline Tambah Perusahaan */}
            <Modal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                title="Tambah Perusahaan Pelayaran Baru (Cepat)"
                size="sm"
            >
                <div className="space-y-3 p-1">
                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Nama Perusahaan Pelayaran <span className="text-[#C62840]">*</span>
                        </label>
                        <input
                            type="text"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            placeholder="PT Pelayaran Samudra Mandiri"
                            className="w-full h-10 px-3 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63]"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Kode Singkatan (Opsional)
                        </label>
                        <input
                            type="text"
                            value={newCompanyCode}
                            onChange={(e) => setNewCompanyCode(e.target.value.toUpperCase())}
                            placeholder="PSM"
                            className="w-full h-10 px-3 text-xs md:text-sm font-mono border border-[#DCEAF8] rounded-xl text-[#0B1F63]"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button type="button" variant="secondary" onClick={() => setIsCompanyModalOpen(false)} className="px-3 py-1.5 text-xs">
                            Batal
                        </Button>
                        <Button type="button" variant="primary" onClick={handleSaveInlineCompany} className="px-4 py-1.5 text-xs font-bold bg-[#0060F4] text-white">
                            Gunakan Perusahaan Ini
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Inline Tambah Kapal */}
            <Modal
                isOpen={isShipModalOpen}
                onClose={() => setIsShipModalOpen(false)}
                title="Tambah Kapal Baru (Cepat)"
                size="sm"
            >
                <div className="space-y-3 p-1">
                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Nama Kapal <span className="text-[#C62840]">*</span>
                        </label>
                        <input
                            type="text"
                            value={newShipName}
                            onChange={(e) => setNewShipName(e.target.value)}
                            placeholder="MV Ocean Mariner / TB Samudra 08"
                            className="w-full h-10 px-3 text-xs md:text-sm border border-[#DCEAF8] rounded-xl text-[#0B1F63]"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#0B1F63] mb-1">
                            Nomor IMO / Call Sign
                        </label>
                        <input
                            type="text"
                            value={newShipImo}
                            onChange={(e) => setNewShipImo(e.target.value)}
                            placeholder="IMO 9876543"
                            className="w-full h-10 px-3 text-xs md:text-sm font-mono border border-[#DCEAF8] rounded-xl text-[#0B1F63]"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button type="button" variant="secondary" onClick={() => setIsShipModalOpen(false)} className="px-3 py-1.5 text-xs">
                            Batal
                        </Button>
                        <Button type="button" variant="primary" onClick={handleSaveInlineShip} className="px-4 py-1.5 text-xs font-bold bg-[#0060F4] text-white">
                            Gunakan Kapal Ini
                        </Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
