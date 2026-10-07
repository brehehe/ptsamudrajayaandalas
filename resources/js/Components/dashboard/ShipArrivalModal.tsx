import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '../overlays/Modal';
import Button from '../ui/Button';
import FormErrorSummary from '../forms/FormErrorSummary';

interface Port {
    id: string;
    name: string;
    code: string;
    city: string;
}

interface ShipCompany {
    id: string;
    name: string;
    code: string;
}

interface ExistingShip {
    id: string;
    name: string;
    imo_number?: string;
    ship_type?: string;
    gross_tonnage?: number | string;
    length?: number | string;
    call_sign?: string;
    captain_name?: string;
    captain_phone?: string;
    ship_company_id?: string;
    port_id?: string;
    status?: string;
    eta?: string;
}

interface ShipArrivalModalProps {
    isOpen: boolean;
    onClose: () => void;
    ports?: Port[];
    companies?: ShipCompany[];
    allShips?: ExistingShip[];
}

export default function ShipArrivalModal({
    isOpen,
    onClose,
    ports = [],
    companies = [],
    allShips = [],
}: ShipArrivalModalProps) {
    const [isNewShip, setIsNewShip] = useState<boolean>(false);
    const [isNewCompany, setIsNewCompany] = useState<boolean>(false);

    // Initial ETA: default to tomorrow at 08:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const defaultEtaStr = tomorrow.toISOString().slice(0, 16);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        ship_selection_type: 'existing' as 'existing' | 'new',
        ship_id: '',
        name: '',
        imo_number: '',
        ship_type: 'Cargo Ship',
        company_selection_type: 'existing' as 'existing' | 'new',
        ship_company_id: companies.length > 0 ? companies[0].id : '',
        new_company_name: '',
        new_company_code: '',
        gross_tonnage: '',
        length: '',
        call_sign: '',
        captain_name: '',
        captain_phone: '',
        port_id: ports.length > 0 ? ports[0].id : '',
        eta: defaultEtaStr,
        arrival_notes: '',
    });

    // Handle existing ship change -> autofill details
    const handleShipSelect = (selectedId: string) => {
        if (!selectedId) {
            setData((prev) => ({
                ...prev,
                ship_id: '',
                name: '',
                imo_number: '',
                gross_tonnage: '',
                length: '',
                call_sign: '',
                captain_name: '',
                captain_phone: '',
            }));
            return;
        }

        const found = allShips.find((s) => s.id === selectedId);
        if (found) {
            setData((prev) => ({
                ...prev,
                ship_id: found.id,
                name: found.name,
                imo_number: found.imo_number || '',
                ship_type: found.ship_type || 'Cargo Ship',
                gross_tonnage: found.gross_tonnage ? String(found.gross_tonnage) : '',
                length: found.length ? String(found.length) : '',
                call_sign: found.call_sign || '',
                captain_name: found.captain_name || '',
                captain_phone: found.captain_phone || '',
                ship_company_id: found.ship_company_id || prev.ship_company_id,
                port_id: found.port_id || prev.port_id,
            }));
        }
    };

    const toggleNewShip = (active: boolean) => {
        setIsNewShip(active);
        setData((prev) => ({
            ...prev,
            ship_selection_type: active ? 'new' : 'existing',
            ship_id: active ? '' : allShips[0]?.id || '',
            name: active ? '' : allShips[0]?.name || '',
        }));
        if (!active && allShips.length > 0) {
            handleShipSelect(allShips[0].id);
        }
    };

    const toggleNewCompany = (active: boolean) => {
        setIsNewCompany(active);
        setData((prev) => ({
            ...prev,
            company_selection_type: active ? 'new' : 'existing',
            ship_company_id: active ? '' : companies[0]?.id || '',
            new_company_name: '',
            new_company_code: '',
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/ship-arrivals', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setIsNewShip(false);
                setIsNewCompany(false);
                onClose();
            },
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { clearErrors(); onClose(); }}
            title={
                <div className="flex items-center gap-2.5">
                    <div
                        className={
                            'w-9 h-9 rounded-xl bg-[#E0F0FF] dark:bg-[#082870] text-[#0060F4] ' +
                            'dark:text-[#19B5F7] flex items-center justify-center flex-shrink-0'
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
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                            Input Kapal Yang Akan Datang
                        </h2>
                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                            Catat jadwal kedatangan armada untuk monitoring tim operasional & staf
                            lapangan
                        </p>
                    </div>
                </div>
            }
            size="2xl"
        >
            <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-2">
                <FormErrorSummary errors={errors} />
                {/* 1. MASTER PERUSAHAAN */}
                <div
                    className={
                        'p-3.5 rounded-xl bg-[#F0F8FF]/80 dark:bg-[#071322]/80 border ' +
                        'border-[#DCEAF8] dark:border-[#1E3A5F]'
                    }
                >
                    <div className="flex items-center justify-between mb-2">
                        <label
                            className={
                                'text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] flex ' +
                                'items-center gap-1.5'
                            }
                        >
                            <span className="w-2 h-2 rounded-full bg-[#0060F4]" />
                            Master Perusahaan Pelayaran / Prinsipal
                        </label>
                        <button
                            type="button"
                            onClick={() => toggleNewCompany(!isNewCompany)}
                            className={
                                'text-xs font-semibold text-[#0060F4] hover:text-[#082870] ' +
                                'dark:text-[#19B5F7] underline transition-colors'
                            }
                        >
                            {isNewCompany
                                ? '← Pilih dari Daftar Perusahaan'
                                : '+ Tambah Perusahaan Baru'}
                        </button>
                    </div>

                    {!isNewCompany ? (
                        <div>
                            <select
                                required
                                name="ship_company_id"
                                value={data.ship_company_id}
                                onChange={(e) => setData('ship_company_id', e.target.value)}
                                className={
                                    'w-full px-3 py-2 text-xs rounded-lg border ' +
                                    'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                    'dark:bg-[#0D2945] text-[#0B1F63] dark:text-[#E7F0FA] ' +
                                    'focus:ring-2 focus:ring-[#0060F4] focus:outline-none'
                                }
                            >
                                <option value="">-- Pilih Perusahaan Pelayaran --</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.code ? `(${c.code})` : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.ship_company_id && (
                                <p className="text-[11px] text-red-500 mt-1">
                                    {errors.ship_company_id}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block mb-1">
                                    Nama Perusahaan *
                                </label>
                                <input
                                    required
                                    name="new_company_name"
                                    type="text"
                                    value={data.new_company_name}
                                    onChange={(e) => setData('new_company_name', e.target.value)}
                                    placeholder="Contoh: PT Pelayaran Samudra Nusantara"
                                    className={
                                        'w-full px-3 py-2 text-xs rounded-lg border ' +
                                        'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                        'dark:bg-[#0D2945] text-[#0B1F63] dark:text-[#E7F0FA] ' +
                                        'focus:ring-2 focus:ring-[#0060F4] focus:outline-none'
                                    }
                                />
                                {errors.new_company_name && (
                                    <p className="text-[11px] text-red-500 mt-0.5">
                                        {errors.new_company_name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block mb-1">
                                    Kode Singkat (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={data.new_company_code}
                                    onChange={(e) => setData('new_company_code', e.target.value)}
                                    placeholder="Contoh: PSN"
                                    className={
                                        'w-full px-3 py-2 text-xs rounded-lg border ' +
                                        'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                        'dark:bg-[#0D2945] text-[#0B1F63] dark:text-[#E7F0FA] ' +
                                        'focus:ring-2 focus:ring-[#0060F4] focus:outline-none'
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. MASTER KAPAL */}
                <div
                    className={
                        'p-3.5 rounded-xl bg-white dark:bg-[#0B1F38] border border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] shadow-xs'
                    }
                >
                    <div className="flex items-center justify-between mb-2">
                        <label
                            className={
                                'text-xs font-bold text-[#0B1F63] dark:text-[#E7F0FA] flex ' +
                                'items-center gap-1.5'
                            }
                        >
                            <span className="w-2 h-2 rounded-full bg-[#087443]" />
                            Master Kapal (Armada)
                        </label>
                        <button
                            type="button"
                            onClick={() => toggleNewShip(!isNewShip)}
                            className={
                                'text-xs font-semibold text-[#0060F4] hover:text-[#082870] ' +
                                'dark:text-[#19B5F7] underline transition-colors'
                            }
                        >
                            {isNewShip ? '← Pilih dari Kapal Terdaftar' : '+ Tambah Kapal Baru'}
                        </button>
                    </div>

                    {!isNewShip ? (
                        <div>
                            <select
                                required
                                name="ship_id"
                                value={data.ship_id}
                                onChange={(e) => handleShipSelect(e.target.value)}
                                className={
                                    'w-full px-3 py-2 text-xs rounded-lg border ' +
                                    'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                    'dark:bg-[#0D2945] text-[#0B1F63] dark:text-[#E7F0FA] ' +
                                    'focus:ring-2 focus:ring-[#0060F4] focus:outline-none'
                                }
                            >
                                <option value="">-- Pilih Kapal --</option>
                                {allShips.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.imo_number || 'No IMO'} -{' '}
                                        {s.ship_type || 'Cargo'})
                                    </option>
                                ))}
                            </select>
                            {errors.ship_id && (
                                <p className="text-[11px] text-red-500 mt-1">{errors.ship_id}</p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                                <label className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block mb-1">
                                    Nama Kapal *
                                </label>
                                <input
                                    required
                                    name="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Contoh: KM Samudra Raya 01"
                                    className={
                                        'w-full px-3 py-2 text-xs rounded-lg border ' +
                                        'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                        'dark:bg-[#0D2945] text-[#0B1F63] dark:text-[#E7F0FA] ' +
                                        'focus:ring-2 focus:ring-[#0060F4] focus:outline-none'
                                    }
                                />
                                {errors.name && (
                                    <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block mb-1">
                                    IMO Number
                                </label>
                                <input
                                    type="text"
                                    value={data.imo_number}
                                    onChange={(e) => setData('imo_number', e.target.value)}
                                    placeholder="Contoh: 9812456"
                                    className={
                                        'w-full px-3 py-2 text-xs rounded-lg border ' +
                                        'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                        'dark:bg-[#0D2945] text-[#0B1F63] dark:text-[#E7F0FA] ' +
                                        'focus:ring-2 focus:ring-[#0060F4] focus:outline-none'
                                    }
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-[#52658E] dark:text-[#94A3B8] block mb-1">
                                    Tipe Kapal
                                </label>
                                <select
                                    value={data.ship_type}
                                    onChange={(e) => setData('ship_type', e.target.value)}
                                    className={
                                        'w-full px-3 py-2 text-xs rounded-lg border ' +
                                        'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                        'dark:bg-[#0D2945] text-[#0B1F63] dark:text-[#E7F0FA] ' +
                                        'focus:ring-2 focus:ring-[#0060F4] focus:outline-none'
                                    }
                                >
                                    <option value="Cargo Ship">General Cargo</option>
                                    <option value="Oil Tanker">Oil Tanker</option>
                                    <option value="Chemical Tanker">Chemical Tanker</option>
                                    <option value="Bulk Carrier">Bulk Carrier</option>
                                    <option value="Container Ship">Container Ship</option>
                                    <option value="Tugboat">Tugboat / Tongkang</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. GT, PANJANG & CALL SIGN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-[#0B1F63] dark:text-[#E7F0FA] block mb-1">
                            Gross Tonnage (GT)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="any"
                                value={data.gross_tonnage}
                                onChange={(e) => setData('gross_tonnage', e.target.value)}
                                placeholder="5400"
                                className={
                                    'w-full px-3 py-2 text-xs rounded-lg border ' +
                                    'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                    'dark:bg-[#0D2945] text-[#0B1F63] dark:text-[#E7F0FA] ' +
                                    'focus:ring-2 focus:ring-[#0060F4] focus:outline-none pr-10'
                                }
                            />
                            <span className="absolute right-3 top-2 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                GT
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#0B1F63] dark:text-[#E7F0FA] block mb-1">
                            Panjang Kapal (LOA)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="any"
                                value={data.length}
                                onChange={(e) => setData('length', e.target.value)}
                                placeholder="128.5"
                                className={
                                    'w-full px-3 py-2 text-xs rounded-lg border ' +
                                    'border-[#DCEAF8] dark:border-[#1E3A5F] bg-white ' +
                                    'dark:bg-[#0D2945] text-[#0B1F63] dark:text-[#E7F0FA] ' +
                                    'focus:ring-2 focus:ring-[#0060F4] focus:outline-none pr-10'
                                }
                            />
                            <span className="absolute right-3 top-2 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                Meter
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#0B1F63] dark:text-[#E7F0FA] block mb-1">
                            Call Sign
                        </label>
                        <input
                            type="text"
                            value={data.call_sign}
                            onChange={(e) => setData('call_sign', e.target.value)}
                            placeholder="PKSL / VRCD3"
                            className={
                                'w-full px-3 py-2 text-xs rounded-lg border border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F] bg-white dark:bg-[#0D2945] ' +
                                'text-[#0B1F63] dark:text-[#E7F0FA] focus:ring-2 ' +
                                'focus:ring-[#0060F4] focus:outline-none uppercase'
                            }
                        />
                    </div>
                </div>

                {/* 4. NAHKODA & NOMOR TELEPON */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-[#0B1F63] dark:text-[#E7F0FA] block mb-1">
                            Nama Nahkoda (Kapten)
                        </label>
                        <input
                            type="text"
                            value={data.captain_name}
                            onChange={(e) => setData('captain_name', e.target.value)}
                            placeholder="Contoh: Capt. Bambang Prasetyo"
                            className={
                                'w-full px-3 py-2 text-xs rounded-lg border border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F] bg-white dark:bg-[#0D2945] ' +
                                'text-[#0B1F63] dark:text-[#E7F0FA] focus:ring-2 ' +
                                'focus:ring-[#0060F4] focus:outline-none'
                            }
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#0B1F63] dark:text-[#E7F0FA] block mb-1">
                            Nomor Telepon Nahkoda / Agen (Opsional)
                        </label>
                        <input
                            type="text"
                            value={data.captain_phone}
                            onChange={(e) => setData('captain_phone', e.target.value)}
                            placeholder="+62 812-3456-7890"
                            className={
                                'w-full px-3 py-2 text-xs rounded-lg border border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F] bg-white dark:bg-[#0D2945] ' +
                                'text-[#0B1F63] dark:text-[#E7F0FA] focus:ring-2 ' +
                                'focus:ring-[#0060F4] focus:outline-none'
                            }
                        />
                    </div>
                </div>

                {/* 5. MASTER PELABUHAN & TANGGAL KEDATANGAN (ETA) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-[#0B1F63] dark:text-[#E7F0FA] block mb-1">
                            Pelabuhan Tujuan (Master Pelabuhan)
                        </label>
                        <select
                            name="port_id"
                            value={data.port_id}
                            onChange={(e) => setData('port_id', e.target.value)}
                            className={
                                'w-full px-3 py-2 text-xs rounded-lg border border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F] bg-white dark:bg-[#0D2945] ' +
                                'text-[#0B1F63] dark:text-[#E7F0FA] focus:ring-2 ' +
                                'focus:ring-[#0060F4] focus:outline-none font-medium'
                            }
                        >
                            {ports.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.code}) - {p.city}
                                </option>
                            ))}
                        </select>
                        {errors.port_id && (
                            <p className="text-[11px] text-red-500 mt-1">{errors.port_id}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#0B1F63] dark:text-[#E7F0FA] block mb-1">
                            Tanggal & Waktu Kedatangan (ETA) *
                        </label>
                        <input
                            required
                            name="eta"
                            type="datetime-local"
                            value={data.eta}
                            onChange={(e) => setData('eta', e.target.value)}
                            className={
                                'w-full px-3 py-2 text-xs rounded-lg border border-[#DCEAF8] ' +
                                'dark:border-[#1E3A5F] bg-white dark:bg-[#0D2945] ' +
                                'text-[#0B1F63] dark:text-[#E7F0FA] focus:ring-2 ' +
                                'focus:ring-[#0060F4] focus:outline-none font-medium'
                            }
                        />
                        {errors.eta && (
                            <p className="text-[11px] text-red-500 mt-1">{errors.eta}</p>
                        )}
                    </div>
                </div>

                {/* 6. CATATAN KEDATANGAN */}
                <div>
                    <label className="text-xs font-semibold text-[#0B1F63] dark:text-[#E7F0FA] block mb-1">
                        Catatan Operasional Kedatangan (Opsional)
                    </label>
                    <textarea
                        rows={2}
                        value={data.arrival_notes}
                        onChange={(e) => setData('arrival_notes', e.target.value)}
                        placeholder="Kebutuhan bunker saat tiba, rencana sandar di dermaga KSOP, dll..."
                        className={
                            'w-full px-3 py-2 text-xs rounded-lg border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] bg-white dark:bg-[#0D2945] text-[#0B1F63] ' +
                            'dark:text-[#E7F0FA] focus:ring-2 focus:ring-[#0060F4] ' +
                            'focus:outline-none'
                        }
                    />
                </div>

                {/* MODAL ACTIONS */}
                <div
                    className={
                        'pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center ' +
                        'justify-end gap-2.5'
                    }
                >
                    <button
                        type="button"
                        onClick={() => { clearErrors(); onClose(); }}
                        className={
                            'px-4 py-2 text-xs font-medium text-[#52658E] dark:text-[#94A3B8] ' +
                            'hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg ' +
                            'transition-colors'
                        }
                    >
                        Batal
                    </button>
                    <Button
                        type="submit"
                        disabled={processing}
                        className={
                            'px-5 py-2 text-xs font-bold shadow-md bg-[#0060F4] ' +
                            'hover:bg-[#082870] text-white rounded-lg flex items-center gap-1.5'
                        }
                    >
                        {processing ? (
                            <>
                                <span
                                    className={
                                        'w-3.5 h-3.5 border-2 border-white border-t-transparent ' +
                                        'rounded-full animate-spin'
                                    }
                                />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
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
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span>Simpan & Jadwalkan Kedatangan</span>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
