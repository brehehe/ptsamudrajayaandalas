import { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Anchor,
    ArrowLeft,
    Building2,
    CalendarDays,
    Check,
    CheckCircle2,
    CircleX,
    Copy,
    ExternalLink,
    FileText,
    Flame,
    Info,
    Layers,
    MapPin,
    Ship as ShipIcon,
    Tag,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import { playSjaChime } from '../../Components/feedback/AudioNotification';
import Modal from '../../Components/overlays/Modal';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import RequestWorkflowPanel from '../../Components/RequestWorkflowPanel';
import Table from '../../Components/tables/Table';
import ShipImage from '../../Components/vessels/ShipImage';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';

interface RequestItem {
    id: string;
    item_name: string;
    unit?: string;
    quantity: number | string;
    hpp_price?: number | string;
    selling_price?: number | string;
    status: string;
    director_status?: 'approved' | 'rejected' | 'pending' | string;
    director_notes?: string;
    is_urgent: boolean;
    is_invoiced?: boolean;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    vendor?: {
        id: string;
        name: string;
    };
}

interface JobInfo {
    id: string;
    job_number?: string;
    status?: string;
    eta_at?: string;
    etd_at?: string;
    arrived_at?: string;
    berthed_at?: string;
    departed_at?: string;
    port?: {
        id: string;
        name: string;
        code?: string;
    };
    ship?: {
        id: string;
        name: string;
        imo_number?: string;
        call_sign?: string;
        flag?: string;
        ship_type?: string;
        image?: string | null;
        company?: {
            id: string;
            name: string;
        };
    };
    work_order?: {
        id: string;
        system_number: string;
        client_number?: string;
    };
}

interface ShipRequest {
    id: string;
    request_number: string;
    status: string;
    request_date: string;
    created_at: string;
    updated_at?: string;
    completed_at?: string | null;
    forwarded_to_director_at?: string | null;
    director_reviewed_at?: string | null;
    notes?: string;
    service_type?: string;
    requested_port_call_status?: string | null;
    operational_occurred_at?: string | null;
    ship?: {
        id: string;
        name: string;
        imo_number?: string;
        call_sign?: string;
        flag?: string;
        ship_type?: string;
        image?: string | null;
        company?: {
            id: string;
            name: string;
        };
    };
    company?: {
        id: string;
        name: string;
    };
    port?: {
        id: string;
        name: string;
        code?: string;
    };
    port_call?: JobInfo;
    creator?: {
        id: number;
        name: string;
    };
    items: RequestItem[];
    invoices?: Array<{
        id: string;
        invoice_number: string;
        invoice_type: string;
        grand_total: number | string;
        status: string;
    }>;
}

interface ApprovalSummary {
    total_hpp_pending: number;
    total_hpp_approved: number;
    total_hpp_rejected: number;
    total_hpp_all: number;
    total_selling_all: number;
    pending_items_count: number;
    approved_items_count: number;
    rejected_items_count: number;
    total_items_count: number;
}

interface ApprovalShowProps {
    job?: JobInfo | null;
    requests?: ShipRequest[];
    request?: ShipRequest;
    capabilities: {
        can_decide_items: boolean;
        can_view_hpp: boolean;
        is_director: boolean;
        can_process_requests: boolean;
    };
    summary: ApprovalSummary;
}

interface DesktopApprovalItemRow {
    request: ShipRequest;
    item: RequestItem;
    needsAttention: boolean;
    isFirstForRequest: boolean;
    updatedAt: number;
}

const formatRupiah = (value?: number | string): string => {
    const amount = Number(value ?? 0);

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDateTime = (value?: string | null): string => {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

const isDecidableItem = (item: RequestItem): boolean =>
    item.status === 'diajukan_ke_direktur' && item.director_status === 'pending';

export default function ApprovalShow({
    job,
    requests = [],
    request,
    capabilities,
    summary,
}: ApprovalShowProps) {
    const allRequests = useMemo(() => {
        if (requests && requests.length > 0) return requests;
        if (request) return [request];
        return [];
    }, [requests, request]);

    const activeJob = job ?? allRequests[0]?.port_call ?? null;
    const currentShip = activeJob?.ship ?? allRequests[0]?.ship ?? null;
    const currentPort = activeJob?.port ?? allRequests[0]?.port ?? null;

    const shipName = currentShip?.name || 'Kapal Belum Ditentukan';
    const shipImage = currentShip?.image ?? null;
    const imoNumber = currentShip?.imo_number || '-';
    const shipType = currentShip?.ship_type || '-';
    const companyName = currentShip?.company?.name || allRequests[0]?.company?.name || 'Klien Keagenan';
    const portName = currentPort?.name || 'Pelabuhan Belum Ditentukan';
    const jobNumber = activeJob?.job_number || allRequests[0]?.request_number || 'JOB-SJA';

    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectionErrors, setRejectionErrors] = useState<Record<string, string>>({});

    const toggleSelectItem = (itemId: string) => {
        setSelectedItemIds((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
        );
    };

    const toggleSelectAllForReq = (req: ShipRequest) => {
        const decidableIds = (req.items || []).filter(isDecidableItem).map((item) => item.id);
        const allSelected = decidableIds.length > 0 && decidableIds.every((id) => selectedItemIds.includes(id));

        if (allSelected) {
            setSelectedItemIds((prev) => prev.filter((id) => !decidableIds.includes(id)));
        } else {
            setSelectedItemIds((prev) => Array.from(new Set([...prev, ...decidableIds])));
        }
    };

    const handleOpenBatchReject = () => {
        if (selectedItemIds.length === 0) return;
        setIsRejectModalOpen(true);
        setRejectReason('');
        setRejectionErrors({});
    };

    const handleBatchApproveSelected = () => {
        if (selectedItemIds.length === 0) return;

        const payload = selectedItemIds.map((id) => ({
            item_id: id,
            status: 'approved',
            director_notes: null,
        }));

        setActiveAction('batch-selected');
        router.post(
            route('approvals.requests.batch-item-decision'),
            { decisions: payload },
            {
                preserveScroll: true,
                onSuccess: () => {
                    playSjaChime('success');
                    setSelectedItemIds([]);
                },
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const submitRejectModal = () => {
        if (selectedItemIds.length === 0) return;

        const payload = selectedItemIds.map((id) => ({
            item_id: id,
            status: 'rejected',
            director_notes: rejectReason.trim(),
        }));

        setActiveAction('batch-reject-modal');
        setRejectionErrors({});
        router.post(
            route('approvals.requests.batch-item-decision'),
            { decisions: payload },
            {
                preserveScroll: true,
                onSuccess: () => {
                    playSjaChime('alert');
                    setSelectedItemIds([]);
                    setIsRejectModalOpen(false);
                    setRejectReason('');
                    setRejectionErrors({});
                },
                onError: (errors) => setRejectionErrors(errors as Record<string, string>),
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const pendingItemsAcrossJob = useMemo(() => {
        const list: { reqId: string; item: RequestItem }[] = [];
        allRequests.forEach((req) => {
            (req.items || []).forEach((item) => {
                if (isDecidableItem(item)) {
                    list.push({ reqId: req.id, item });
                }
            });
        });
        return list;
    }, [allRequests]);

    const pendingItemIds = useMemo(
        () => pendingItemsAcrossJob.map(({ item }) => item.id),
        [pendingItemsAcrossJob]
    );
    const desktopRows = useMemo<DesktopApprovalItemRow[]>(() => {
        const rows = allRequests.flatMap((req) =>
            (req.items || []).map((item) => {
                const updatedAt = Math.max(
                    0,
                    ...[item.updated_at, item.created_at, req.updated_at, req.created_at]
                        .map((value) => (value ? Date.parse(value) : 0))
                        .filter((value) => !Number.isNaN(value))
                );

                return {
                    request: req,
                    item,
                    needsAttention: capabilities.can_decide_items && isDecidableItem(item),
                    isFirstForRequest: false,
                    updatedAt,
                };
            })
        );

        rows.sort((first, second) => {
            const attentionOrder = Number(second.needsAttention) - Number(first.needsAttention);

            if (attentionOrder !== 0) {
                return attentionOrder;
            }

            return second.updatedAt - first.updatedAt;
        });

        const visibleRequests = new Set<string>();

        return rows.map((row) => {
            const isFirstForRequest = !visibleRequests.has(row.request.id);
            visibleRequests.add(row.request.id);

            return { ...row, isFirstForRequest };
        });
    }, [allRequests, capabilities.can_decide_items]);
    const areAllPendingItemsSelected =
        pendingItemIds.length > 0 && pendingItemIds.every((id) => selectedItemIds.includes(id));

    const toggleSelectAllPendingItems = () => {
        setSelectedItemIds(areAllPendingItemsSelected ? [] : pendingItemIds);
    };

    const totalUrgentCount = useMemo(() => {
        return allRequests.reduce((sum, req) => {
            return sum + (req.items || []).filter((it) => it.is_urgent).length;
        }, 0);
    }, [allRequests]);

    const handleCopy = (numberStr: string) => {
        navigator.clipboard.writeText(numberStr);
        setCopiedNumber(numberStr);
        playSjaChime('info');
        setTimeout(() => setCopiedNumber(null), 2000);
    };

    return (
        <AppLayout
            title={`Approval Anggaran — Job ${jobNumber}`}
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title={`Approval Anggaran ${jobNumber} • ${shipName} — PT Samudra Jaya Andalas`} />

            <MobilePageHero
                title={`Approval Anggaran ${jobNumber}`}
                description={`${shipName} • HPP Kas Operasional`}
            />

            <div className="relative z-10 mx-auto -mt-6 w-full max-w-full space-y-5 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] sm:px-6 lg:px-8 md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                {/* ── Top Navigation Bar ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={route('approvals.index')}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-[#52658E] shadow-sm ring-1 ring-[#DCEAF8] transition hover:bg-[#F0F8FF] hover:text-[#0060F4] focus:outline-none dark:bg-[#0C1D36] dark:text-[#94A3B8] dark:ring-[#1E3A5F] dark:hover:bg-[#132847]"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        <span>Kembali ke Daftar Approval</span>
                    </Link>

                    <div className="flex flex-wrap items-center gap-2">
                        {activeJob?.work_order?.system_number && (
                            <Link
                                href={route('work-orders.index', { search: activeJob.work_order.system_number })}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#DCEAF8] bg-white px-3 text-xs font-bold text-[#0B1F63] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                            >
                                <FileText className="size-3.5 text-[#0060F4]" />
                                <span>SPK {activeJob.work_order.system_number}</span>
                                <ExternalLink className="size-3 text-[#52658E]" />
                            </Link>
                        )}

                        <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#BCE0FD] bg-[#E0F0FF] px-3.5 text-xs font-black text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#132847] dark:text-[#60A5FA]">
                            <Layers className="size-3.5" />
                            <span>Job {jobNumber}</span>
                        </span>
                    </div>
                </div>

                {/* ── 1. Informasi Kapal & Nomor Job (Langsung di Atas) ── */}
                <Card className="overflow-hidden border-[#DCEAF8] shadow-sm dark:border-[#1E3A5F]" padding="none">
                    <div className="bg-[#F0F8FF] p-5 dark:bg-[#071322] sm:p-6 md:bg-gradient-to-r md:from-[#F0F8FF] md:via-white md:to-[#F0F8FF]/50 md:dark:from-[#071322] md:dark:via-[#0C1D36] md:dark:to-[#071322]">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 space-y-2.5">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#BCE0FD] bg-[#E0F0FF] px-3 py-1 font-mono text-xs font-extrabold text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#132847] dark:text-[#60A5FA]">
                                        <Layers className="size-3.5 text-[#0060F4] dark:text-[#60A5FA]" />
                                        <span>{jobNumber}</span>
                                    </span>

                                    {activeJob?.status && (
                                        <StatusBadge
                                            status={activeJob.status}
                                            label={`Job: ${activeJob.status}`}
                                            showDot
                                            size="sm"
                                        />
                                    )}

                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                                        <Anchor className="size-3 text-blue-600 dark:text-blue-400" />
                                        <span>{portName}</span>
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <h1 className="text-balance text-2xl font-black tracking-tight text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">
                                        {shipName}
                                    </h1>
                                    <p className="max-w-2xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">
                                        Tinjau dan putuskan persetujuan biaya pengeluaran operasional (HPP) PT Samudra Jaya Andalas sebelum pencairan dana.
                                    </p>
                                </div>
                            </div>

                            {/* Vessel Preview Box */}
                            <div className="flex shrink-0 items-center gap-3.5 rounded-2xl border border-[#BCE0FD] bg-white/90 p-3.5 shadow-sm backdrop-blur-sm dark:border-[#1E3A5F] dark:bg-[#0C1D36] lg:min-w-80">
                                <div className="relative">
                                    <ShipImage
                                        src={shipImage}
                                        alt={shipName}
                                        className="size-16 shrink-0 rounded-xl border border-[#DCEAF8] object-cover dark:border-[#1E3A5F]"
                                    />
                                    <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#0060F4] text-white shadow">
                                        <ShipIcon className="size-3" />
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0060F4] dark:text-[#60A5FA]">
                                        Informasi Kapal
                                    </span>
                                    <p className="truncate text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        {shipName}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs font-medium text-[#52658E] dark:text-[#94A3B8]">
                                        IMO {imoNumber} {shipType !== '-' ? `• ${shipType}` : ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="grid gap-px border-t border-[#DCEAF8] bg-[#DCEAF8] dark:border-[#1E3A5F] dark:bg-[#1E3A5F] sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                icon: Building2,
                                label: 'Perusahaan Pemilik / Agen',
                                value: companyName,
                                sub: 'Client / Owner Kapal',
                            },
                            {
                                icon: MapPin,
                                label: 'Pelabuhan Sandar / Labuh',
                                value: portName,
                                sub: currentPort?.code ? `Kode: ${currentPort.code}` : 'Wilayah Kerja SJA',
                            },
                            {
                                icon: CalendarDays,
                                label: 'Estimasi Kedatangan (ETA)',
                                value: activeJob?.eta_at ? formatDateTime(activeJob.eta_at) : (allRequests[0] ? formatDateTime(allRequests[0].request_date) : '-'),
                                sub: activeJob?.etd_at ? `ETD: ${formatDateTime(activeJob.etd_at)}` : 'Jadwal operasional kapal',
                            },
                            {
                                icon: FileText,
                                label: 'Surat Perintah Kerja (SPK)',
                                value: activeJob?.work_order?.system_number ? activeJob.work_order.system_number : (currentShip?.call_sign ? `Call Sign: ${currentShip.call_sign}` : 'Keagenan Kapal'),
                                sub: currentShip?.flag ? `Bendera: ${currentShip.flag}` : 'Operasional Wilayah Kerja SJA',
                            },
                        ].map(({ icon: Icon, label, value, sub }) => (
                            <div key={label} className="min-w-0 bg-white p-4 dark:bg-[#0C1D36]">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                    <Icon className="size-4 shrink-0 text-[#0060F4] dark:text-[#60A5FA]" aria-hidden="true" />
                                    <span>{label}</span>
                                </div>
                                <p className="mt-1 truncate text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {value}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-[#8C9BB9] dark:text-[#64748B]">
                                    {sub}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* ── 2. Anggaran HPP Executive Summary Card (Per flow.md) ── */}
                <Card className="border-[#BCE0FD] bg-[#EAF4FF] dark:border-[#1E3A5F] dark:bg-[#0C1D36] md:bg-gradient-to-r md:from-[#EAF4FF] md:via-white md:to-[#EAF4FF]/60 md:dark:from-[#0C1D36] md:dark:via-[#0E223F] md:dark:to-[#0C1D36]">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-9 items-center justify-center rounded-xl bg-[#0060F4] text-white shadow-xs">
                                    <Layers className="size-4.5" />
                                </span>
                                <div>
                                    <h2 className="text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        Ringkasan Anggaran HPP & Keputusan Direktur
                                    </h2>
                                    <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                        Fokus keputusan Direktur adalah persetujuan pengeluaran modal (HPP / Biaya Vendor)
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {totalUrgentCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 shadow-2xs dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                                        <Flame className="size-3.5 fill-rose-600 text-rose-600 animate-pulse" />
                                        <span>{totalUrgentCount} Item Mendesak / Urgent</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Metric Tiles */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl border border-[#DCEAF8] bg-white p-3.5 shadow-2xs dark:border-[#1E3A5F] dark:bg-[#071322]">
                                <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                                    HPP Menunggu Review
                                </span>
                                <p className="mt-1 font-mono text-base font-black text-[#0060F4] dark:text-[#60A5FA]">
                                    {formatRupiah(summary.total_hpp_pending)}
                                </p>
                                <p className="mt-0.5 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
                                    {summary.pending_items_count} item menunggu ACC
                                </p>
                            </div>

                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs dark:border-emerald-900 dark:bg-emerald-950/30">
                                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                                    HPP Disetujui (ACC)
                                </span>
                                <p className="mt-1 font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
                                    {formatRupiah(summary.total_hpp_approved)}
                                </p>
                                <p className="mt-0.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    {summary.approved_items_count} item disetujui
                                </p>
                            </div>

                            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-2xs dark:border-rose-900 dark:bg-rose-950/30">
                                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                                    HPP Ditolak
                                </span>
                                <p className="mt-1 font-mono text-base font-black text-rose-700 dark:text-rose-400">
                                    {formatRupiah(summary.total_hpp_rejected)}
                                </p>
                                <p className="mt-0.5 text-[10.5px] font-semibold text-rose-600 dark:text-rose-400">
                                    {summary.rejected_items_count} item ditolak
                                </p>
                            </div>

                            <div className="rounded-xl border border-[#DCEAF8] bg-white p-3.5 shadow-2xs dark:border-[#1E3A5F] dark:bg-[#071322]">
                                <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                                    Total Estimasi Jual (Invoice Klien)
                                </span>
                                <p className="mt-1 font-mono text-base font-black text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {formatRupiah(summary.total_selling_all)}
                                </p>
                                <p className="mt-0.5 text-[10.5px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                    Margin: {formatRupiah(summary.total_selling_all - summary.total_hpp_all)}
                                </p>
                            </div>
                        </div>

                        <p className="flex items-center gap-2 border-l-2 border-[#0060F4] pl-3 text-xs text-[#52658E] dark:text-[#94A3B8]">
                            <Info className="size-4 shrink-0 text-[#0060F4]" />
                            Item disetujui akan terkunci; item ditolak kembali ke Admin untuk direvisi.
                        </p>
                    </div>
                </Card>

                {/* Banner Notifikasi Jika Ada Item Ditolak */}
                {summary.rejected_items_count > 0 && (
                    <p className="flex items-center gap-2 border-l-2 border-rose-500 bg-rose-50/60 px-3 py-2 text-xs font-semibold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                        <CircleX className="size-4 shrink-0" />
                        {summary.rejected_items_count} item ditolak dan menunggu revisi Admin.
                    </p>
                )}

                {/* ── 3. Aksi keputusan Direktur ── */}
                {capabilities.can_decide_items && pendingItemsAcrossJob.length > 0 && (
                    <div className="sticky top-2 z-30 flex flex-col gap-3 rounded-2xl border border-[#BCE0FD] bg-white p-4 shadow-lg dark:border-[#1E3A5F] dark:bg-[#0C1D36] sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex min-h-11 cursor-pointer items-center gap-3">
                            <input
                                type="checkbox"
                                checked={areAllPendingItemsSelected}
                                onChange={toggleSelectAllPendingItems}
                                aria-label="Pilih semua item yang menunggu keputusan"
                                className="size-5 rounded border-[#B7C9DF] text-[#0060F4] focus:ring-[#0060F4]"
                            />
                            <span>
                                <span className="block text-sm font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    Pilih semua
                                </span>
                                <span className="block text-xs text-[#52658E] dark:text-[#94A3B8]">
                                    {selectedItemIds.length} dari {pendingItemsAcrossJob.length} item dipilih
                                </span>
                            </span>
                        </label>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                            {selectedItemIds.length > 0 && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setSelectedItemIds([])}
                                    className="col-span-2 sm:col-span-1"
                                >
                                    Batal Pilihan
                                </Button>
                            )}

                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                leftIcon={<CircleX className="size-3.5" />}
                                disabled={selectedItemIds.length === 0 || activeAction !== null}
                                onClick={handleOpenBatchReject}
                                className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            >
                                Tolak ({selectedItemIds.length})
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                leftIcon={<CheckCircle2 className="size-3.5" />}
                                isLoading={activeAction === 'batch-selected'}
                                disabled={selectedItemIds.length === 0 || activeAction !== null}
                                onClick={handleBatchApproveSelected}
                                className="bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                            >
                                Setujui ({selectedItemIds.length})
                            </Button>
                        </div>
                    </div>
                )}

                <div className="hidden space-y-3 pt-1 md:block">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                <FileText className="size-4" aria-hidden="true" />
                            </span>
                            <h2 className="text-balance text-lg font-black text-[#0B1F63] dark:text-[#F1F5F9]">
                                Pengajuan &amp; Evaluasi HPP
                            </h2>
                        </div>
                        <span className="shrink-0 rounded-lg border border-[#DCEAF8] bg-white px-2.5 py-1 text-xs font-bold text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]">
                            {desktopRows.length} Item
                        </span>
                    </div>

                    <Table<DesktopApprovalItemRow>
                        columns={[
                            {
                                key: 'request_number',
                                header: 'Nomor Pengajuan',
                                width: '185px',
                                render: (row) => (
                                    <div className="min-w-0 space-y-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(row.request.request_number)}
                                            className="inline-flex max-w-full items-start gap-1 text-left font-mono text-xs font-bold text-[#0060F4] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                                            title="Salin nomor pengajuan"
                                        >
                                            <Tag className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                                            <span className="whitespace-normal break-words" translate="no">
                                                {row.request.request_number}
                                            </span>
                                            {copiedNumber === row.request.request_number && (
                                                <Check className="mt-0.5 size-3 shrink-0 text-[#087443]" aria-hidden="true" />
                                            )}
                                        </button>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {row.needsAttention && (
                                                <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold text-white">
                                                    Baru
                                                </span>
                                            )}
                                            <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                {row.request.creator?.name || 'Staff'}
                                            </span>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                key: 'item',
                                header: 'Item',
                                width: '235px',
                                render: ({ item }) => (
                                    <div className="space-y-1">
                                        <p className="text-pretty font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            {item.item_name}
                                        </p>
                                        {item.is_urgent && (
                                            <span className="inline-flex rounded-full bg-[#FFE7EC] px-2 py-0.5 text-[10px] font-bold text-[#C62840] dark:bg-rose-950/60 dark:text-rose-300">
                                                Urgent
                                            </span>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: 'vendor',
                                header: 'Vendor',
                                width: '165px',
                                render: ({ item }) => (
                                    <span className="text-pretty text-[#52658E] dark:text-[#94A3B8]">
                                        {item.vendor?.name || 'Belum ditentukan'}
                                    </span>
                                ),
                            },
                            {
                                key: 'quantity',
                                header: 'Qty',
                                align: 'right',
                                width: '95px',
                                render: ({ item }) => (
                                    <span className="whitespace-nowrap font-mono font-bold tabular-nums">
                                        {item.quantity} {item.unit || 'Dokumen'}
                                    </span>
                                ),
                            },
                            {
                                key: 'hpp',
                                header: 'HPP',
                                align: 'right',
                                width: '145px',
                                render: ({ item }) => (
                                    <span className="whitespace-nowrap font-mono font-bold tabular-nums">
                                        {formatRupiah(item.hpp_price)}
                                    </span>
                                ),
                            },
                            {
                                key: 'selling_price',
                                header: 'Harga Jual',
                                align: 'right',
                                width: '145px',
                                render: ({ item }) => (
                                    <span className="whitespace-nowrap font-mono font-bold tabular-nums text-[#0060F4]">
                                        {formatRupiah(item.selling_price)}
                                    </span>
                                ),
                            },
                            {
                                key: 'subtotal',
                                header: 'Subtotal',
                                align: 'right',
                                width: '155px',
                                render: ({ item }) => (
                                    <span className="whitespace-nowrap font-mono font-bold tabular-nums">
                                        {formatRupiah(
                                            Number(item.selling_price || 0) * Number(item.quantity)
                                        )}
                                    </span>
                                ),
                            },
                            {
                                key: 'status',
                                header: 'Status',
                                align: 'center',
                                width: '165px',
                                render: ({ request: req, item }) => (
                                    <div className="space-y-1.5">
                                        <StatusBadge
                                            status={
                                                item.director_status === 'approved'
                                                    ? 'Disetujui'
                                                    : item.director_status === 'rejected'
                                                      ? 'Ditolak'
                                                      : 'Menunggu Approval'
                                            }
                                            label={
                                                item.director_status === 'approved'
                                                    ? 'Disetujui'
                                                    : item.director_status === 'rejected'
                                                      ? 'Ditolak'
                                                      : 'Menunggu'
                                            }
                                            size="sm"
                                            showDot
                                        />
                                        <p className="text-pretty text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                            {req.status}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: 'action',
                                header: 'Aksi',
                                align: 'center',
                                width: '205px',
                                render: ({ request: req, item, isFirstForRequest }) => (
                                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                                        {capabilities.can_decide_items && isDecidableItem(item) && (
                                            <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#DCEAF8] bg-white px-2.5 text-xs font-semibold text-[#52658E] hover:border-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#94A3B8]">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItemIds.includes(item.id)}
                                                    onChange={() => toggleSelectItem(item.id)}
                                                    className="size-4 rounded border-[#B7C9DF] text-[#0060F4] focus:ring-[#0060F4]"
                                                />
                                                Pilih
                                            </label>
                                        )}

                                        {isFirstForRequest && (
                                            <RequestWorkflowPanel
                                                request={req}
                                                canProcess={capabilities.can_process_requests}
                                                compact
                                            />
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                        data={desktopRows}
                        keyExtractor={(row) => row.item.id}
                        compact
                        minWidth="1495px"
                        emptyMessage="Data Tidak Ditemukan"
                        rowClassName={(row) =>
                            row.needsAttention
                                ? '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A] border-l-4 border-l-[#0060F4]'
                                : row.item.is_urgent
                                  ? '!bg-rose-50/70 dark:!bg-rose-950/30'
                                  : ''
                        }
                    />
                </div>

                {/* ── 4. Stacked Pengajuan Cards (mobile) ── */}
                <div className="space-y-6 pt-1 md:hidden">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                <FileText className="size-4" />
                            </span>
                            <h2 className="text-lg font-black tracking-tight text-[#0B1F63] dark:text-[#F1F5F9]">
                                Daftar Pengajuan Kebutuhan & Evaluasi HPP
                            </h2>
                        </div>
                        <span className="rounded-xl border border-[#DCEAF8] bg-white px-3 py-1 font-mono text-xs font-bold text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]">
                            {allRequests.length} Pengajuan
                        </span>
                    </div>

                    {allRequests.map((req, reqIndex) => {
                        const reqItems = req.items || [];
                        const hasUrgent = reqItems.some((it) => it.is_urgent);
                        const decidableReqItems = reqItems.filter(isDecidableItem);
                        const isAllReqSelected =
                            decidableReqItems.length > 0 &&
                            decidableReqItems.every((it) => selectedItemIds.includes(it.id));

                        const reqTotalHpp = reqItems.reduce(
                            (sum, it) => sum + Number(it.hpp_price ?? 0) * Number(it.quantity),
                            0
                        );
                        const reqTotalApprovedHpp = reqItems.reduce(
                            (sum, item) =>
                                item.director_status === 'approved'
                                    ? sum + Number(item.hpp_price ?? 0) * Number(item.quantity)
                                    : sum,
                            0
                        );
                        const reqTotalSelling = reqItems.reduce(
                            (sum, it) => sum + Number(it.selling_price ?? 0) * Number(it.quantity),
                            0
                        );
                        const sortedReqItems = [...reqItems].sort((first, second) => {
                            const firstIsNew = capabilities.can_decide_items && isDecidableItem(first);
                            const secondIsNew = capabilities.can_decide_items && isDecidableItem(second);

                            return Number(secondIsNew) - Number(firstIsNew);
                        });

                        return (
                            <section
                                key={req.id}
                                className="space-y-3 border-t border-[#DCEAF8] pt-4 dark:border-[#1E3A5F]"
                            >
                                {/* Header Card Pengajuan */}
                                <div className="border-b border-[#DCEAF8] bg-[#F8FBFF] p-4.5 dark:border-[#1E3A5F] dark:bg-[#0C1D36] sm:p-5 md:bg-gradient-to-r md:from-[#F8FBFF] md:via-white md:to-[#F8FBFF] md:dark:from-[#0C1D36] md:dark:via-[#0E223F] md:dark:to-[#0C1D36]">
                                    <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="flex size-6 items-center justify-center rounded-md bg-[#0060F4] text-xs font-black text-white">
                                                    {reqIndex + 1}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(req.request_number)}
                                                    title="Klik untuk menyalin nomor pengajuan"
                                                    className="group inline-flex items-center gap-1.5 rounded-lg border border-[#BCE0FD] bg-[#E0F0FF] px-2.5 py-1 font-mono text-xs font-black text-[#0060F4] transition hover:bg-[#BCE0FD] focus:outline-none dark:border-[#1E3A5F] dark:bg-[#132847] dark:text-[#60A5FA]"
                                                >
                                                    <Tag className="size-3 text-[#0060F4] dark:text-[#60A5FA]" />
                                                    <span>{req.request_number}</span>
                                                    {copiedNumber === req.request_number ? (
                                                        <Check className="size-3 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="size-3 text-[#52658E] opacity-70 group-hover:opacity-100" />
                                                    )}
                                                    {copiedNumber === req.request_number && (
                                                        <span className="text-[10px] font-bold text-emerald-600">Tersalin!</span>
                                                    )}
                                                </button>

                                                <StatusBadge
                                                    status={req.status}
                                                    label={req.status}
                                                    showDot
                                                    size="sm"
                                                />

                                                {hasUrgent && (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black uppercase text-white shadow-2xs">
                                                        <Flame className="size-3 fill-white" />
                                                        Urgent
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                <span>Diajukan oleh: <strong>{req.creator?.name || 'Pengguna tidak tersedia'}</strong></span>
                                                <span>•</span>
                                                <span>{formatDateTime(req.request_date)}</span>
                                                {req.notes && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="italic">"{req.notes}"</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                <RequestWorkflowPanel
                                    request={req}
                                    canProcess={capabilities.can_process_requests}
                                    className="border-b border-[#DCEAF8] dark:border-[#1E3A5F]"
                                />

                                <Table<RequestItem>
                                    columns={[
                                        ...(capabilities.can_decide_items
                                            ? [
                                                  {
                                                      key: 'select',
                                                      header: (
                                                          <input
                                                              type="checkbox"
                                                              checked={isAllReqSelected}
                                                              disabled={decidableReqItems.length === 0}
                                                              onChange={() => toggleSelectAllForReq(req)}
                                                              aria-label="Pilih semua item"
                                                              className="size-4 rounded border-[#B7C9DF] text-[#0060F4] focus:ring-[#0060F4] disabled:opacity-40"
                                                          />
                                                      ),
                                                      align: 'center' as const,
                                                      width: '52px',
                                                      render: (item: RequestItem) => (
                                                          <input
                                                              type="checkbox"
                                                              checked={selectedItemIds.includes(item.id)}
                                                              disabled={!isDecidableItem(item)}
                                                              onChange={() => toggleSelectItem(item.id)}
                                                              aria-label={`Pilih ${item.item_name}`}
                                                              className="size-4 rounded border-[#B7C9DF] text-[#0060F4] focus:ring-[#0060F4] disabled:opacity-40"
                                                          />
                                                      ),
                                                  },
                                              ]
                                            : []),
                                        {
                                            key: 'item',
                                            header: 'Item / Vendor',
                                            width: '280px',
                                            render: (item) => {
                                                const isNew = capabilities.can_decide_items && isDecidableItem(item);
                                                return (
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <strong>{item.item_name}</strong>
                                                            {isNew && (
                                                                <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                                                    Baru
                                                                </span>
                                                            )}
                                                            {item.is_urgent && (
                                                                <span className="rounded-full bg-[#FFE7EC] px-2 py-0.5 text-[10px] font-bold text-[#C62840]">
                                                                    Urgent
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[#52658E]">
                                                            {item.vendor?.name || 'Vendor belum ditentukan'}
                                                        </p>
                                                        {item.notes && (
                                                            <p className="text-[11px] text-[#52658E]">{item.notes}</p>
                                                        )}
                                                    </div>
                                                );
                                            },
                                        },
                                        {
                                            key: 'quantity',
                                            header: 'Qty',
                                            align: 'right' as const,
                                            width: '100px',
                                            render: (item) => (
                                                <span className="whitespace-nowrap font-mono font-bold">
                                                    {item.quantity} {item.unit || 'Dokumen'}
                                                </span>
                                            ),
                                        },
                                        {
                                            key: 'hpp',
                                            header: 'HPP',
                                            align: 'right' as const,
                                            width: '170px',
                                            render: (item) => (
                                                <div className="whitespace-nowrap font-mono tabular-nums">
                                                    <p>{formatRupiah(item.hpp_price)}</p>
                                                    <strong className="text-[#0060F4]">
                                                        {formatRupiah(
                                                            Number(item.hpp_price || 0) *
                                                                Number(item.quantity)
                                                        )}
                                                    </strong>
                                                </div>
                                            ),
                                        },
                                        {
                                            key: 'selling',
                                            header: 'Harga Jual',
                                            align: 'right' as const,
                                            width: '170px',
                                            render: (item) => (
                                                <span className="whitespace-nowrap font-mono font-bold tabular-nums">
                                                    {formatRupiah(
                                                        Number(item.selling_price || 0) *
                                                            Number(item.quantity)
                                                    )}
                                                </span>
                                            ),
                                        },
                                        {
                                            key: 'status',
                                            header: 'Status',
                                            align: 'center' as const,
                                            width: '140px',
                                            render: (item) => (
                                                <StatusBadge
                                                    status={
                                                        item.director_status === 'approved'
                                                            ? 'Disetujui'
                                                            : item.director_status === 'rejected'
                                                              ? 'Ditolak'
                                                              : 'Menunggu Approval'
                                                    }
                                                    label={
                                                        item.director_status === 'approved'
                                                            ? 'Disetujui'
                                                            : item.director_status === 'rejected'
                                                              ? 'Ditolak'
                                                              : 'Menunggu'
                                                    }
                                                    size="sm"
                                                    showDot
                                                />
                                            ),
                                        },
                                    ]}
                                    data={sortedReqItems}
                                    keyExtractor={(item) => item.id}
                                    compact
                                    minWidth="850px"
                                    emptyMessage="Data Tidak Ditemukan"
                                    rowClassName={(item) => {
                                        const isNew = capabilities.can_decide_items && isDecidableItem(item);
                                        if (isNew) {
                                            return '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A] border-l-4 border-l-[#0060F4]';
                                        }
                                        return item.is_urgent
                                            ? '!bg-rose-50/70 dark:!bg-rose-950/30'
                                            : '';
                                    }}
                                />

                                <div className="flex flex-wrap justify-end gap-x-5 gap-y-1 text-xs text-[#52658E]">
                                    <span>HPP: <strong>{formatRupiah(reqTotalHpp)}</strong></span>
                                    <span>Jual: <strong>{formatRupiah(reqTotalSelling)}</strong></span>
                                    <span>ACC: <strong>{formatRupiah(reqTotalApprovedHpp)}</strong></span>
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* Modal penolakan item terpilih */}
            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => {
                    setIsRejectModalOpen(false);
                    setRejectReason('');
                    setRejectionErrors({});
                }}
                title={`Tolak ${selectedItemIds.length} Item Kebutuhan`}
            >
                <div className="space-y-4">
                    <FormErrorSummary errors={rejectionErrors} />
                    <p className="text-sm text-[#0B1F63] dark:text-[#F1F5F9]">
                        <strong>{selectedItemIds.length} item</strong> akan dikembalikan ke Admin untuk direvisi.
                    </p>

                    <div>
                        <label
                            htmlFor="director-rejection-reason"
                            className="mb-1 block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]"
                        >
                            Alasan penolakan <span className="text-rose-600">*</span>
                        </label>
                        <textarea
                            id="director-rejection-reason"
                            rows={3}
                            name="director_notes"
                            required
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Contoh: harga vendor perlu disesuaikan."
                            aria-invalid={Object.keys(rejectionErrors).length > 0 ? true : undefined}
                            className={`w-full rounded-xl border p-3 text-xs text-[#0B1F63] focus:ring-0 dark:bg-[#0C1D36] dark:text-[#F1F5F9] ${Object.keys(rejectionErrors).length > 0 ? 'border-[#C62840] focus:border-[#C62840]' : 'border-[#DCEAF8] focus:border-[#0060F4] dark:border-[#1E3A5F]'}`}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                setIsRejectModalOpen(false);
                                setRejectReason('');
                                setRejectionErrors({});
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            disabled={activeAction !== null}
                            isLoading={activeAction === 'batch-reject-modal'}
                            onClick={submitRejectModal}
                            className="bg-rose-600 font-bold text-white hover:bg-rose-700"
                        >
                            Tolak item terpilih
                        </Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
