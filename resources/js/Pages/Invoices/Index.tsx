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
    invoice_type: 'agency' | 'reimburse';
    invoice_date: string;
    due_date: string;
    subtotal: number;
    addon_total: number;
    tax: number;
    grand_total: number;
    paid_amount: number;
    outstanding_amount: number;
    status: string;
    delivery_status: string;
    notes?: string;
    company?: {
        id: string;
        name: string;
    };
    port_call?: {
        job_number: string;
        ship?: {
            name: string;
            imo_number: string;
        };
    };
}

interface InvoicesIndexProps {
    invoices: Invoice[];
    companies: Array<{ id: string; name: string }>;
    portCalls: Array<{ id: string; job_number: string; ship?: { name: string } }>;
    shipRequests: Array<{ id: string; request_number: string; ship?: { name: string } }>;
    stats: {
        total_invoiced: number;
        total_paid: number;
        total_outstanding: number;
        count: number;
        agency_count: number;
        reimburse_count: number;
    };
    filters: {
        type: string;
        status: string;
        search: string;
    };
}

export default function InvoicesIndex({
    invoices,
    companies,
    portCalls,
    shipRequests,
    stats,
    filters,
}: InvoicesIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [workflowInvoice, setWorkflowInvoice] = useState<Invoice | null>(null);
    const [workflowAction, setWorkflowAction] = useState<'release' | 'mark_sent'>('release');

    const { data, setData, post, processing, reset } = useForm({
        port_call_id: portCalls[0]?.id || '',
        company_id: companies[0]?.id || '',
        request_id: shipRequests[0]?.id || '',
        invoice_type: 'agency',
        subtotal: '',
        addon_total: '0',
        tax: '0',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
    });
    const workflowForm = useForm({ action: 'release', document: null as File | null, delivery_proof: null as File | null });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/invoices',
            { search, type: filters.type, status: filters.status },
            { preserveState: true }
        );
    };

    const handleFilterType = (type: string) => {
        router.get('/invoices', { type, status: filters.status, search }, { preserveState: true });
    };

    const handleRelease = (invoice: Invoice) => {
        workflowForm.reset();
        workflowForm.setData('action', 'release');
        setWorkflowAction('release');
        setWorkflowInvoice(invoice);
    };

    const handleMarkSent = (invoice: Invoice) => {
        workflowForm.reset();
        workflowForm.setData('action', 'mark_sent');
        setWorkflowAction('mark_sent');
        setWorkflowInvoice(invoice);
    };

    const submitWorkflow = (event: React.FormEvent) => {
        event.preventDefault();
        if (!workflowInvoice) return;
        const endpoint = workflowAction === 'release' ? 'release' : 'mark-sent';
        workflowForm.post(`/invoices/${workflowInvoice.id}/${endpoint}`, {
            forceFormData: true, preserveScroll: true, onSuccess: () => setWorkflowInvoice(null),
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/invoices', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
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
        <AppLayout title="Invoice & Tagihan Klien (Dual Invoice SJA)">
            <Head title="Invoice & Tagihan — PT Samudra Jaya Andalas" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* ── Top Level Segment Switcher & CTA Button (matching Gambar 2) ── */}
                <div
                    className={
                        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 ' +
                        'border-b border-[#DCEAF8] dark:border-[#1E3A5F]'
                    }
                >
                    <div
                        className={
                            'flex items-center gap-2 p-1 bg-[#E0F0FF]/60 dark:bg-[#0C1D36] ' +
                            'rounded-2xl border border-[#DCEAF8] dark:border-[#1E3A5F] self-start'
                        }
                    >
                        <button
                            type="button"
                            onClick={() => handleFilterType('all')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                filters.type === 'all'
                                    ? 'bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#082870] dark:text-[#94A3B8] hover:bg-white/60 dark:hover:bg-[#1E3A5F]'
                            }`}
                        >
                            <span>🧾</span>
                            <span>Semua Invoice</span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                    filters.type === 'all'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white dark:bg-[#071322] text-[#0060F4] ' +
                                          'dark:text-[#38BDF8] border border-[#DCEAF8] ' +
                                          'dark:border-[#1E3A5F]'
                                }`}
                            >
                                {stats.count}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleFilterType('agency')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                filters.type === 'agency'
                                    ? 'bg-[#082870] dark:bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#082870] dark:text-[#94A3B8] hover:bg-white/60 dark:hover:bg-[#1E3A5F]'
                            }`}
                        >
                            <span>🏢</span>
                            <span>Jasa Keagenan (PPN)</span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                    filters.type === 'agency'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white dark:bg-[#071322] text-[#082870] ' +
                                          'dark:text-[#F1F5F9] border border-[#DCEAF8] ' +
                                          'dark:border-[#1E3A5F]'
                                }`}
                            >
                                {stats.agency_count}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleFilterType('reimburse')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                                filters.type === 'reimburse'
                                    ? 'bg-[#082870] dark:bg-[#0060F4] text-white shadow-sm'
                                    : 'text-[#082870] dark:text-[#94A3B8] hover:bg-white/60 dark:hover:bg-[#1E3A5F]'
                            }`}
                        >
                            <span>⚓</span>
                            <span>Reimbursement</span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                    filters.type === 'reimburse'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white dark:bg-[#071322] text-[#082870] ' +
                                          'dark:text-[#F1F5F9] border border-[#DCEAF8] ' +
                                          'dark:border-[#1E3A5F]'
                                }`}
                            >
                                {stats.reimburse_count}
                            </span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className={
                            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ' +
                            'bg-[#0060F4] hover:bg-[#0052D4] active:bg-[#082870] text-white ' +
                            'text-xs sm:text-sm font-bold shadow-sm transition-all ' +
                            'flex-shrink-0 cursor-pointer self-start sm:self-auto'
                        }
                    >
                        <span className="text-base leading-none font-bold">+</span>
                        <span>Buat Invoice Baru</span>
                    </button>
                </div>

                {/* ── Title Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1
                            className={
                                'text-2xl sm:text-3xl font-extrabold text-[#0B1F63] ' +
                                'dark:text-[#F1F5F9] tracking-tight'
                            }
                        >
                            Invoice & Tagihan Klien
                        </h1>
                        <p className="text-xs sm:text-sm text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            Invoice Jasa Keagenan dan Reimburse memakai nilai serta konfigurasi pajak transaksi yang disetujui.
                        </p>
                    </div>
                </div>

                {/* ── Stats Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-medium">
                            Total Nilai Tagihan (Invoiced)
                        </div>
                        <div className="text-xl font-bold text-[#082870] dark:text-[#F1F5F9] mt-0.5">
                            {formatRupiah(stats.total_invoiced)}
                        </div>
                        <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8] mt-0.5">
                            {stats.agency_count} Agency • {stats.reimburse_count} Reimburse
                        </div>
                    </div>

                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Sudah Dibayar Klien
                        </div>
                        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                            {formatRupiah(stats.total_paid)}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">
                            Penerimaan kas terkonfirmasi
                        </div>
                    </div>

                    <div
                        className={
                            'bg-white dark:bg-[#0C1D36] p-3.5 rounded-xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] shadow-xs'
                        }
                    >
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                            Sisa Piutang Berjalan
                        </div>
                        <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                            {formatRupiah(stats.total_outstanding)}
                        </div>
                        <div className="text-[10px] text-rose-600 dark:text-rose-400/80 mt-0.5">
                            Menunggu pelunasan klien
                        </div>
                    </div>
                </div>

                {/* ── Search Bar ── */}
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
                        placeholder="Cari nomor invoice, nama klien, atau armada kapal..."
                        className={
                            'w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#0C1D36] border ' +
                            'border-[#DCEAF8] dark:border-[#1E3A5F] rounded-xl text-xs ' +
                            'sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9] ' +
                            'placeholder-[#8C9BB9] dark:placeholder-[#64748B] ' +
                            'focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 ' +
                            'focus:border-[#0060F4] shadow-xs'
                        }
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                router.get('/invoices', { type: filters.type });
                            }}
                            className={
                                'absolute inset-y-0 right-0 pr-3 flex items-center ' +
                                'text-[#8C9BB9] hover:text-[#C62840] dark:hover:text-[#F87171]'
                            }
                        >
                            ✕
                        </button>
                    )}
                </form>

                {/* Invoices Table */}
                <Card className="overflow-hidden border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr
                                    className={
                                        'bg-[#F0F8FF] dark:bg-[#071322] border-b border-[#DCEAF8] ' +
                                        'dark:border-[#1E3A5F] text-[#082870] dark:text-[#94A3B8] ' +
                                        'font-semibold uppercase tracking-wider'
                                    }
                                >
                                    <th className="py-3 px-4">No. Invoice</th>
                                    <th className="py-3 px-4">Kategori Tagihan</th>
                                    <th className="py-3 px-4">Perusahaan Klien & Kapal</th>
                                    <th className="py-3 px-4">Jatuh Tempo</th>
                                    <th className="py-3 px-4">Total Nilai Tagihan</th>
                                    <th className="py-3 px-4">Status & Distribusi</th>
                                    <th className="py-3 px-4 text-right">Aksi Dokumen</th>
                                </tr>
                            </thead>
                            <tbody
                                className={
                                    'divide-y divide-[#DCEAF8]/60 dark:divide-[#1E3A5F] ' +
                                    'text-[#0B1F63] dark:text-[#F1F5F9]'
                                }
                            >
                                {invoices.map((inv) => (
                                    <tr
                                        key={inv.id}
                                        className="hover:bg-[#F0F8FF]/50 dark:hover:bg-[#1E3A5F]/30 transition-colors"
                                    >
                                        <td
                                            className={
                                                'py-3.5 px-4 font-mono font-medium text-[#0060F4] ' +
                                                'dark:text-[#38BDF8]'
                                            }
                                        >
                                            {inv.invoice_number}
                                            <div className="text-[10px] text-[#52658E] dark:text-[#94A3B8] font-sans">
                                                Tgl:{' '}
                                                {new Date(inv.invoice_date).toLocaleDateString(
                                                    'id-ID',
                                                    {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    }
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span
                                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                                    inv.invoice_type === 'agency'
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 ' +
                                                          'text-[#0060F4] dark:text-blue-300 ' +
                                                          'border border-blue-200 ' +
                                                          'dark:border-blue-800'
                                                        : 'bg-emerald-50 ' +
                                                          'dark:bg-emerald-900/30 ' +
                                                          'text-emerald-700 ' +
                                                          'dark:text-emerald-300 border ' +
                                                          'border-emerald-200 ' +
                                                          'dark:border-emerald-800'
                                                }`}
                                            >
                                                {inv.invoice_type === 'agency'
                                                    ? 'Jasa Keagenan'
                                                    : 'Reimbursement'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-[#082870] dark:text-[#F1F5F9]">
                                                {inv.company?.name || 'Klien'}
                                            </div>
                                            <div className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                Armada: {inv.port_call?.ship?.name || '-'} (
                                                {inv.port_call?.job_number || '-'})
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-[#52658E] dark:text-[#94A3B8]">
                                            {new Date(inv.due_date).toLocaleDateString('id-ID', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </td>
                                        <td
                                            className={
                                                'py-3.5 px-4 font-mono font-bold text-neutral-900 ' +
                                                'dark:text-[#F1F5F9]'
                                            }
                                        >
                                            {formatRupiah(inv.grand_total)}
                                            {inv.outstanding_amount > 0 && inv.paid_amount > 0 && (
                                                <div
                                                    className={
                                                        'text-[10px] text-rose-600 ' +
                                                        'dark:text-rose-400 font-sans font-normal'
                                                    }
                                                >
                                                    Sisa: {formatRupiah(inv.outstanding_amount)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <StatusBadge
                                                    status={
                                                        inv.status === 'paid'
                                                            ? 'Selesai'
                                                            : inv.status === 'sent'
                                                              ? 'Dalam Proses'
                                                              : 'Aktif'
                                                    }
                                                    label={
                                                        inv.status === 'paid'
                                                            ? 'Lunas'
                                                            : inv.status === 'sent'
                                                              ? 'Terkirim'
                                                              : 'Dirilis'
                                                    }
                                                />
                                                <span className="text-[10px] text-[#52658E]">
                                                    {inv.delivery_status === 'delivered'
                                                        ? 'Tanda Terima Ada'
                                                        : 'Menunggu Kirim'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {inv.status === 'draft' && (
                                                    <button
                                                        onClick={() => handleRelease(inv)}
                                                        className={
                                                            'px-2.5 py-1 bg-[#0060F4] ' +
                                                            'hover:bg-[#082870] text-white ' +
                                                            'rounded-md text-[11px] ' +
                                                            'font-semibold transition'
                                                        }
                                                    >
                                                        Release
                                                    </button>
                                                )}
                                                {inv.status === 'released' && (
                                                    <button
                                                        onClick={() => handleMarkSent(inv)}
                                                        className={
                                                            'px-2.5 py-1 bg-purple-600 ' +
                                                            'hover:bg-purple-700 text-white ' +
                                                            'rounded-md text-[11px] ' +
                                                            'font-semibold transition'
                                                        }
                                                    >
                                                        Kirim Klien
                                                    </button>
                                                )}
                                                {inv.status === 'sent' && (
                                                    <span className="text-[11px] text-neutral-500 font-medium">
                                                        Tertagih
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal Create Invoice */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Penerbitan Invoice Baru (SJA)"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Tipe Invoice
                            </label>
                            <select
                                value={data.invoice_type}
                                onChange={(e) => {
                                    const t = e.target.value;
                                    setData({
                                        ...data,
                                        invoice_type: t,
                                        tax: '0',
                                    });
                                }}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            >
                                <option value="agency">Jasa Keagenan</option>
                                <option value="reimburse">
                                    Reimburse (Biaya Pelindo / Vendor)
                                </option>
                            </select>
                        </div>

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
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Kunjungan Kapal (Port Call)
                            </label>
                            <select
                                value={data.port_call_id}
                                onChange={(e) => setData('port_call_id', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            >
                                {portCalls.map((pc) => (
                                    <option key={pc.id} value={pc.id}>
                                        {pc.job_number} — {pc.ship?.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Referensi Pengajuan (Request)
                            </label>
                            <select
                                value={data.request_id}
                                onChange={(e) => setData('request_id', e.target.value)}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            >
                                {shipRequests.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.request_number} — {r.ship?.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Subtotal (IDR)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formatRupiahInput(data.subtotal)}
                                onChange={(e) => setData('subtotal', normalizeRupiahInput(e.target.value))}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Materai / Addon
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formatRupiahInput(data.addon_total)}
                                onChange={(e) => setData('addon_total', normalizeRupiahInput(e.target.value))}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-[#082870] block mb-1">
                                Pajak (sesuai konfigurasi transaksi)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formatRupiahInput(data.tax)}
                                onChange={(e) => setData('tax', normalizeRupiahInput(e.target.value))}
                                className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Tanggal Jatuh Tempo
                        </label>
                        <input
                            type="date"
                            value={data.due_date}
                            onChange={(e) => setData('due_date', e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-[#082870] block mb-1">
                            Keterangan / Notes
                        </label>
                        <textarea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={2}
                            placeholder="Penjelasan rincian jasa keagenan atau nota pihak ketiga..."
                            className="w-full text-xs rounded-xl border border-[#DCEAF8] p-2.5 bg-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8]">
                        <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={processing}
                            className="bg-[#0060F4] text-white"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan Invoice Draft'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(workflowInvoice)} onClose={() => setWorkflowInvoice(null)} title={workflowAction === 'release' ? 'Rilis Invoice Klien' : 'Catat Pengiriman Invoice'} subtitle={workflowInvoice?.invoice_number}>
                <form onSubmit={submitWorkflow} className="space-y-4 p-5">
                    {workflowAction === 'release' ? <div><label className="mb-1.5 block text-xs font-bold text-[#0B1F63]">Dokumen final bertanda tangan</label><input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => workflowForm.setData('document', event.target.files?.[0] || null)} className="w-full rounded-xl border border-[#DCEAF8] bg-white p-3 text-xs" />{workflowForm.errors.document && <p role="alert" className="mt-1 text-xs text-[#C62840]">{workflowForm.errors.document}</p>}</div> : <div><label className="mb-1.5 block text-xs font-bold text-[#0B1F63]">Bukti pengiriman kepada klien</label><input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => workflowForm.setData('delivery_proof', event.target.files?.[0] || null)} className="w-full rounded-xl border border-[#DCEAF8] bg-white p-3 text-xs" />{workflowForm.errors.delivery_proof && <p role="alert" className="mt-1 text-xs text-[#C62840]">{workflowForm.errors.delivery_proof}</p>}</div>}
                    <p className="rounded-xl bg-[#F0F8FF] p-3 text-xs text-[#52658E]">Status hanya mencatat kejadian yang sudah berlangsung. Sistem tidak mengirim invoice atau memindahkan dana secara otomatis.</p>
                    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setWorkflowInvoice(null)}>Batal</Button><Button type="submit" isLoading={workflowForm.processing}>{workflowAction === 'release' ? 'Rilis Invoice' : 'Catat Pengiriman'}</Button></div>
                </form>
            </Modal>
        </AppLayout>
    );
}
