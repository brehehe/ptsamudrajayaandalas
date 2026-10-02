import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import Button from '../../Components/ui/Button';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import { formatRupiahInput, normalizeRupiahInput } from '../../Components/forms/MoneyInput';

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_type: string;
    due_date: string;
    grand_total: number;
    paid_amount: number;
    outstanding_amount: number;
    company?: {
        id: string;
        name: string;
    };
    port_call?: {
        ship?: {
            name: string;
        };
    };
}

interface ClientReceipt {
    id: string;
    received_date: string;
    amount: number;
    destination_account: string;
    bank_reference: string;
    status: string;
    company?: {
        name: string;
    };
    recorder?: {
        name: string;
    };
    allocations?: Array<{ invoice?: { invoice_number: string } }>;
}

interface ReceivablesIndexProps {
    unpaidInvoices: Invoice[];
    receipts: ClientReceipt[];
    aging: {
        current: number;
        overdue_30: number;
        overdue_60: number;
        total: number;
    };
    companies: Array<{ id: string; name: string }>;
    search: string;
}

export default function ReceivablesIndex({
    unpaidInvoices,
    receipts,
    aging,
    companies,
    search: initialSearch,
}: ReceivablesIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [activeTab, setActiveTab] = useState<'invoices' | 'receipts'>('invoices');
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        company_id: companies[0]?.id || '',
        invoice_id: unpaidInvoices[0]?.id || '',
        received_date: new Date().toISOString().split('T')[0],
        amount: unpaidInvoices[0]?.outstanding_amount
            ? String(unpaidInvoices[0].outstanding_amount)
            : '',
        destination_account: '',
        bank_reference: '',
        proof: null as File | null,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/receivables', { search }, { preserveState: true });
    };

    const handleReceiptSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/receivables/receipts', {
            forceFormData: true,
            onSuccess: () => {
                setIsReceiptModalOpen(false);
                reset();
            },
        });
    };

    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <AppLayout title="Piutang & Pelunasan Pembayaran Klien">
            <Head title="Piutang Klien - PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div
                    className={
                        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 ' +
                        'border-b border-[#DCEAF8]'
                    }
                >
                    <div
                        className={
                            'flex items-center gap-2 p-1 bg-[#E0F0FF]/60 rounded-2xl border ' +
                            'border-[#DCEAF8] self-start'
                        }
                    >
                        <button
                            type="button"
                            onClick={() => setActiveTab('invoices')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'invoices'
                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#52658E] hover:text-[#0B1F63] hover:bg-white/50'
                            }`}
                        >
                            <span>🧾</span>
                            <span>Faktur Belum Lunas</span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                    activeTab === 'invoices'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white text-[#0B1F63] border border-[#DCEAF8]'
                                }`}
                            >
                                {unpaidInvoices.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('receipts')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'receipts'
                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#52658E] hover:text-[#0B1F63] hover:bg-white/50'
                            }`}
                        >
                            <span>🏦</span>
                            <span>Riwayat Pembayaran</span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                    activeTab === 'receipts'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white text-[#0B1F63] border border-[#DCEAF8]'
                                }`}
                            >
                                {receipts.length}
                            </span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsReceiptModalOpen(true)}
                        className={
                            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ' +
                            'bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white ' +
                            'text-xs sm:text-sm font-bold shadow-sm transition-all ' +
                            'flex-shrink-0 cursor-pointer self-start sm:self-auto'
                        }
                    >
                        <span className="text-base leading-none font-bold">+</span>
                        <span>Catat Pembayaran Masuk</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F63] tracking-tight">
                            Piutang Klien & Penerimaan Kas
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] mt-0.5">
                            Pengawasan umur piutang armada (aging), monitoring jatuh tempo, dan
                            pencatatan kas/bank
                        </p>
                    </div>
                </div>

                {/* Aging Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-[#DCEAF8] shadow-xs">
                        <div className="text-[11px] text-[#52658E] font-medium">
                            Total Piutang Berjalan
                        </div>
                        <div className="text-xl font-bold text-[#082870] mt-1">
                            {formatRupiah(aging.total)}
                        </div>
                        <div className="text-[10px] text-[#52658E] mt-0.5">
                            Semua faktur belum lunas
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#DCEAF8] shadow-xs">
                        <div className="text-[11px] text-emerald-600 font-medium">
                            Lancar (&lt; 30 Hari)
                        </div>
                        <div className="text-xl font-bold text-emerald-700 mt-1">
                            {formatRupiah(aging.current)}
                        </div>
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                            Dalam batas tempo wajar
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#DCEAF8] shadow-xs">
                        <div className="text-[11px] text-amber-600 font-medium">
                            Jatuh Tempo 31 - 60 Hari
                        </div>
                        <div className="text-xl font-bold text-amber-700 mt-1">
                            {formatRupiah(aging.overdue_30)}
                        </div>
                        <div className="text-[10px] text-amber-600 mt-0.5">
                            Perlu follow-up penagihan
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#DCEAF8] shadow-xs">
                        <div className="text-[11px] text-rose-600 font-medium">
                            Menunggak (&gt; 60 Hari)
                        </div>
                        <div className="text-xl font-bold text-rose-700 mt-1">
                            {formatRupiah(aging.overdue_60)}
                        </div>
                        <div className="text-[10px] text-rose-600 mt-0.5">
                            Peringatan penundaan jasa
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
                    <div
                        className={
                            'absolute inset-y-0 left-0 pl-3.5 flex items-center ' +
                            'pointer-events-none text-[#8C9BB9]'
                        }
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nomor faktur invoice, nama klien, atau referensi bank..."
                        className={
                            'w-full pl-10 pr-24 h-11 bg-white border border-[#DCEAF8] ' +
                            'rounded-xl text-sm text-[#0B1F63] placeholder-[#8C9BB9] shadow-xs ' +
                            'focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 ' +
                            'focus:border-[#0060F4]'
                        }
                    />
                    <button
                        type="submit"
                        className={
                            'absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#0060F4] ' +
                            'hover:bg-[#0052D4] text-white text-xs font-bold rounded-lg ' +
                            'transition-colors cursor-pointer'
                        }
                    >
                        Cari
                    </button>
                </form>

                {/* Content Table */}
                {activeTab === 'invoices' ? (
                    <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr
                                        className={
                                            'bg-[#F0F8FF] border-b border-[#DCEAF8] text-[#082870] ' +
                                            'font-semibold uppercase tracking-wider'
                                        }
                                    >
                                        <th className="py-3 px-4">No. Invoice</th>
                                        <th className="py-3 px-4">Kategori</th>
                                        <th className="py-3 px-4">Perusahaan Klien</th>
                                        <th className="py-3 px-4">Kapal</th>
                                        <th className="py-3 px-4">Jatuh Tempo</th>
                                        <th className="py-3 px-4">Total Tagihan</th>
                                        <th className="py-3 px-4">Sisa Piutang</th>
                                        <th className="py-3 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#DCEAF8]/60 text-[#0B1F63]">
                                    {unpaidInvoices.map((inv) => (
                                        <tr
                                            key={inv.id}
                                            className="hover:bg-[#F0F8FF]/50 transition-colors"
                                        >
                                            <td className="py-3.5 px-4 font-mono font-medium text-[#0060F4]">
                                                {inv.invoice_number}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${
                                                        inv.invoice_type === 'agency'
                                                            ? 'bg-blue-50 text-[#0060F4]'
                                                            : 'bg-emerald-50 text-emerald-700'
                                                    }`}
                                                >
                                                    {inv.invoice_type === 'agency'
                                                        ? 'Jasa Keagenan'
                                                        : 'Reimburse'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-[#082870]">
                                                {inv.company?.name || 'Klien'}
                                            </td>
                                            <td className="py-3.5 px-4 text-neutral-800">
                                                {inv.port_call?.ship?.name || '-'}
                                            </td>
                                            <td className="py-3.5 px-4 text-[#52658E]">
                                                {new Date(inv.due_date).toLocaleDateString(
                                                    'id-ID',
                                                    {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    }
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-neutral-700">
                                                {formatRupiah(inv.grand_total)}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                                                {formatRupiah(inv.outstanding_amount)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setData({
                                                            ...data,
                                                            company_id:
                                                                inv.company?.id || data.company_id,
                                                            invoice_id: inv.id,
                                                            amount: String(inv.outstanding_amount),
                                                        });
                                                        setIsReceiptModalOpen(true);
                                                    }}
                                                    className={
                                                        'px-2.5 py-1 bg-emerald-600 ' +
                                                        'hover:bg-emerald-700 text-white ' +
                                                        'rounded-md text-[11px] font-semibold ' +
                                                        'transition shadow-xs'
                                                    }
                                                >
                                                    Bayar Lunas
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <Card className="overflow-hidden border border-[#DCEAF8] shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr
                                        className={
                                            'bg-[#F0F8FF] border-b border-[#DCEAF8] text-[#082870] ' +
                                            'font-semibold uppercase tracking-wider'
                                        }
                                    >
                                        <th className="py-3 px-4">No. Ref Bank</th>
                                        <th className="py-3 px-4">Perusahaan Klien</th>
                                        <th className="py-3 px-4">Rekening Tujuan</th>
                                        <th className="py-3 px-4">Nominal Diterima</th>
                                        <th className="py-3 px-4">Tanggal Masuk</th>
                                        <th className="py-3 px-4">Status Kas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#DCEAF8]/60 text-[#0B1F63]">
                                    {receipts.map((rc) => (
                                        <tr
                                            key={rc.id}
                                            className="hover:bg-[#F0F8FF]/50 transition-colors"
                                        >
                                            <td className="py-3.5 px-4 font-mono font-medium text-[#0060F4]">
                                                {rc.bank_reference}
                                                {rc.allocations?.[0]?.invoice && <span className="mt-0.5 block font-sans text-[10px] text-[#52658E]">{rc.allocations[0].invoice.invoice_number}</span>}
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-[#082870]">
                                                {rc.company?.name || 'Klien'}
                                            </td>
                                            <td className="py-3.5 px-4 text-[#52658E]">
                                                {rc.destination_account}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                                                {formatRupiah(rc.amount)}
                                            </td>
                                            <td className="py-3.5 px-4 text-[#52658E]">
                                                {new Date(rc.received_date).toLocaleDateString(
                                                    'id-ID',
                                                    {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    }
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <StatusBadge
                                                    status="Selesai"
                                                    label="Terkonfirmasi"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Modal Catat Pembayaran Masuk */}
            <Modal
                isOpen={isReceiptModalOpen}
                onClose={() => setIsReceiptModalOpen(false)}
                title="Catat Penerimaan Pembayaran dari Klien"
            >
                <form onSubmit={handleReceiptSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Perusahaan Klien
                        </label>
                        <select
                            value={data.company_id}
                            onChange={(e) => setData('company_id', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        >
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Alokasikan ke Invoice
                        </label>
                        <select
                            value={data.invoice_id}
                            onChange={(e) => {
                                const selected = unpaidInvoices.find(
                                    (inv) => inv.id === e.target.value
                                );
                                setData({
                                    ...data,
                                    invoice_id: e.target.value,
                                    company_id: selected?.company?.id || data.company_id,
                                    amount: selected
                                        ? String(selected.outstanding_amount)
                                        : data.amount,
                                });
                            }}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        >
                            <option value="">-- Pilih invoice --</option>
                            {unpaidInvoices.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                    {inv.invoice_number} — Sisa:{' '}
                                    {formatRupiah(inv.outstanding_amount)} ({inv.company?.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Nominal Diterima (IDR)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formatRupiahInput(data.amount)}
                                onChange={(e) => setData('amount', normalizeRupiahInput(e.target.value))}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Tanggal Masuk Rekening
                            </label>
                            <input
                                type="date"
                                value={data.received_date}
                                onChange={(e) => setData('received_date', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            No. Referensi Bank / Kliring
                        </label>
                        <input
                            type="text"
                            value={data.bank_reference}
                            onChange={(e) => setData('bank_reference', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Bukti Pembayaran
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setData('proof', e.target.files?.[0] || null)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Rekening Tujuan Penerima
                        </label>
                        <input
                            type="text"
                            value={data.destination_account}
                            onChange={(e) => setData('destination_account', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button variant="secondary" onClick={() => setIsReceiptModalOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={processing}
                            className="bg-[#0060F4] text-white"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan Penerimaan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
