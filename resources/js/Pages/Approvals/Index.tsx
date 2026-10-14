import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    ExternalLink,
    FileCheck2,
    FileText,
    Files,
    Layers3,
    MapPin,
    Search,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import Table, { Column } from '../../Components/tables/Table';
import TableMobile from '../../Components/tables/TableMobile';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import ConfirmDialog from '../../Components/overlays/ConfirmDialog';
import Tabs from '../../Components/ui/Tabs';
import Button from '../../Components/ui/Button';
import ShipImage from '../../Components/vessels/ShipImage';

interface RequestItem {
    id: string;
    item_name?: string;
    quantity: number | string;
    hpp_price?: number | string;
    status: string;
    director_status?: string;
    vendor?: { name: string };
    attachment_url?: string | null;
    attachment_is_image?: boolean;
    supplier_invoice_number?: string | null;
    supplier_invoice_url?: string | null;
    supplier_invoice_is_image?: boolean;
}

interface ShipRequest {
    id: string;
    request_number: string;
    status: string;
    request_date: string;
    created_at: string;
    company?: { name: string };
    port?: { name: string };
    ship?: { name: string; image?: string | null; company?: { name: string } };
    port_call?: {
        id?: string;
        job_number?: string;
        port?: { name: string };
        ship?: { name: string; image?: string | null; company?: { name: string } };
    };
    items?: RequestItem[];
}

interface OutgoingPayment {
    id: string;
    reference_number: string;
    payment_type: string;
    recipient: string;
    amount: number;
    currency: string;
    payment_date: string;
    verification_status: string;
    port_call?: { job_number: string; ship?: { name: string } };
    verifier?: { name: string };
}

interface ApprovalRow {
    key: string;
    jobNumber: string;
    shipName: string;
    shipImage?: string | null;
    companyName: string;
    portName: string;
    requests: ShipRequest[];
    itemCount: number;
    evidenceCount: number;
    pendingCount: number;
    pendingEvidenceCount: number;
    pendingHpp: number;
    totalHpp: number;
    status: string;
    updatedAt: string;
    isNew: boolean;
}

interface ApprovalTargetItem {
    jobKey: string;
    requestNumber: string;
    item: RequestItem;
}

interface CompanyExpenseItem {
    id: string;
    request_number: string;
    scope: string;
    category: string;
    status: string;
    currency: string;
    total: number;
    notes?: string | null;
    supporting_document_path?: string | null;
    created_at: string;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    creator?: { id: string; name: string };
    reviewer?: { id: string; name: string };
    realizer?: { id: string; name: string };
    items?: Array<{
        id: string;
        description: string;
        amount: number;
        currency: string;
    }>;
}

interface ApprovalsIndexProps {
    requests: ShipRequest[];
    payments: OutgoingPayment[];
    companyExpenses?: CompanyExpenseItem[];
    counts: { semua?: number; menunggu: number; disetujui: number; ditolak: number };
    activeTab: string;
    search: string;
    date: string;
    dailySummary: {
        date: string;
        ship_count: number;
        request_count: number;
        item_count: number;
        total_hpp: number;
        approved_hpp: number;
    };
    capabilities?: {
        can_decide_items: boolean;
        can_view_hpp: boolean;
        is_director: boolean;
        can_process_requests: boolean;
    };
}

const DEFAULT_CAPABILITIES = {
    can_decide_items: false,
    can_view_hpp: false,
    is_director: false,
    can_process_requests: false,
};

const formatCurrency = (value: number, currency = 'IDR'): string =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(value);

const formatDate = (value?: string): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const normalized = (value?: string): string => (value || '').trim().toLowerCase();

const isPendingDirectorItem = (item: RequestItem): boolean =>
    normalized(item.status) === 'diajukan_ke_direktur' &&
    (!item.director_status || item.director_status === 'pending');

const itemHppTotal = (item: RequestItem): number =>
    Number(item.hpp_price || 0) * Number(item.quantity || 0);

export default function ApprovalsIndex({
    requests,
    payments,
    companyExpenses = [],
    counts,
    activeTab,
    search: initialSearch,
    date,
    dailySummary,
    capabilities = DEFAULT_CAPABILITIES,
}: ApprovalsIndexProps) {
    const [search, setSearch] = useState(initialSearch);
    const [section, setSection] = useState<'requests' | 'payments'>('requests');
    const [paymentSubTab, setPaymentSubTab] = useState<'company_expenses' | 'vendor_payments'>('company_expenses');
    const [decidingExpenseId, setDecidingExpenseId] = useState<string | null>(null);
    const [rejectingExpense, setRejectingExpense] = useState<CompanyExpenseItem | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState('');
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [approvalTarget, setApprovalTarget] = useState<ApprovalRow | null>(null);
    const [isBatchApprovalOpen, setIsBatchApprovalOpen] = useState(false);
    const [selectedApprovalItemIds, setSelectedApprovalItemIds] = useState<string[]>([]);
    const [approvingJobKey, setApprovingJobKey] = useState<string | null>(null);
    const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);

    const requestNeedsAction = (request: ShipRequest): boolean => {
        const status = normalized(request.status);

        if (capabilities.can_decide_items) {
            return (
                status === 'menunggu approval direktur' ||
                (request.items || []).some(
                    (item) =>
                        normalized(item.status).includes('direktur') &&
                        (!item.director_status || item.director_status === 'pending')
                )
            );
        }

        return (
            capabilities.can_process_requests &&
            ['disetujui', 'disetujui sebagian'].includes(status)
        );
    };

    const approvalRows = useMemo<ApprovalRow[]>(() => {
        const groups = new Map<string, ApprovalRow>();

        requests.forEach((request) => {
            const key = request.port_call?.id || request.port_call?.job_number || request.id;
            const items = request.items || [];
            const hpp = items.reduce((total, item) => total + itemHppTotal(item), 0);
            const pendingItems = items.filter(isPendingDirectorItem);
            const pending = pendingItems.length;
            const pendingEvidenceCount = pendingItems.filter(
                (item) => item.attachment_url || item.supplier_invoice_url
            ).length;
            const pendingHpp = pendingItems.reduce((total, item) => total + itemHppTotal(item), 0);
            const evidenceCount = items.filter((item) => item.attachment_url || item.supplier_invoice_url).length;
            const existing = groups.get(key);

            if (!existing) {
                groups.set(key, {
                    key,
                    jobNumber: request.port_call?.job_number || request.request_number,
                    shipName: request.ship?.name || request.port_call?.ship?.name || '-',
                    shipImage: request.ship?.image || request.port_call?.ship?.image,
                    companyName:
                        request.company?.name ||
                        request.ship?.company?.name ||
                        request.port_call?.ship?.company?.name ||
                        '-',
                    portName: request.port_call?.port?.name || request.port?.name || '-',
                    requests: [request],
                    itemCount: items.length,
                    evidenceCount,
                    pendingCount: pending,
                    pendingEvidenceCount,
                    pendingHpp,
                    totalHpp: hpp,
                    status: request.status,
                    updatedAt: request.created_at || request.request_date,
                    isNew: requestNeedsAction(request),
                });
                return;
            }

            existing.requests.push(request);
            existing.itemCount += items.length;
            existing.evidenceCount += evidenceCount;
            existing.pendingCount += pending;
            existing.pendingEvidenceCount += pendingEvidenceCount;
            existing.pendingHpp += pendingHpp;
            existing.totalHpp += hpp;
            existing.isNew = existing.isNew || requestNeedsAction(request);
            if (
                new Date(request.created_at).getTime() > new Date(existing.updatedAt).getTime()
            ) {
                existing.updatedAt = request.created_at;
                existing.status = request.status;
            }
        });

        const sortedRows = Array.from(groups.values()).sort((a, b) => {
            if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        return activeTab === 'menunggu'
            ? sortedRows.filter((row) => row.pendingCount > 0)
            : sortedRows;
    }, [requests, capabilities, activeTab]);

    const paymentRows = useMemo(
        () =>
            [...payments].sort((a, b) => {
                const aNew = capabilities.can_decide_items && a.verification_status === 'pending';
                const bNew = capabilities.can_decide_items && b.verification_status === 'pending';
                if (aNew !== bNew) return aNew ? -1 : 1;
                return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime();
            }),
        [payments, capabilities.can_decide_items]
    );

    const paymentColumns = useMemo<Column<OutgoingPayment>[]>(
        () => [
            {
                key: 'reference',
                header: 'Referensi / Tanggal',
                width: '210px',
                render: (payment) => {
                    const isNew =
                        capabilities.can_decide_items &&
                        payment.verification_status === 'pending';
                    return (
                        <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-bold text-[#0060F4]">
                                    {payment.reference_number}
                                </span>
                                {isNew && (
                                    <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                        Baru
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-[#52658E]">{formatDate(payment.payment_date)}</p>
                        </div>
                    );
                },
            },
            {
                key: 'recipient',
                header: 'Penerima / Job',
                width: '260px',
                render: (payment) => (
                    <div>
                        <p className="font-semibold">{payment.recipient}</p>
                        <p className="mt-1 text-[#52658E]">
                            {payment.port_call?.ship?.name || '-'} ·{' '}
                            {payment.port_call?.job_number || '-'}
                        </p>
                    </div>
                ),
            },
            {
                key: 'type',
                header: 'Jenis',
                width: '180px',
                render: (payment) => payment.payment_type,
            },
            {
                key: 'amount',
                header: 'Nominal',
                align: 'right',
                width: '170px',
                render: (payment) => (
                    <span className="whitespace-nowrap font-mono font-bold tabular-nums">
                        {formatCurrency(payment.amount, payment.currency || 'IDR')}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Status',
                width: '170px',
                render: (payment) => (
                    <StatusBadge
                        status={
                            payment.verification_status === 'verified'
                                ? 'Disetujui'
                                : payment.verification_status === 'rejected'
                                    ? 'Ditolak'
                                    : 'Menunggu Approval'
                        }
                        label={
                            payment.verification_status === 'verified'
                                ? 'Terverifikasi'
                                : payment.verification_status === 'rejected'
                                    ? 'Ditolak'
                                    : 'Menunggu'
                        }
                        size="sm"
                        showDot
                    />
                ),
            },
            {
                key: 'action',
                header: 'Aksi',
                align: 'right',
                width: '150px',
                render: (payment) =>
                    capabilities.can_decide_items && payment.verification_status === 'pending' ? (
                        <button
                            type="button"
                            disabled={verifyingId !== null}
                            onClick={() => {
                                setVerifyingId(payment.id);
                                router.post(
                                    `/approvals/payments/${payment.id}/verify`,
                                    {},
                                    {
                                        preserveScroll: true,
                                        onFinish: () => setVerifyingId(null),
                                    }
                                );
                            }}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-[#0060F4] px-3 font-bold text-white hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Check aria-hidden="true" className="size-3.5" />
                            {verifyingId === payment.id ? 'Memproses' : 'Verifikasi'}
                        </button>
                    ) : (
                        <span className="text-[#52658E]">
                            {payment.verifier?.name || '—'}
                        </span>
                    ),
            },
        ],
        [capabilities.can_decide_items, verifyingId]
    );

    const handleApproveExpense = (item: CompanyExpenseItem) => {
        setDecidingExpenseId(item.id);
        router.post(
            `/approvals/company-expenses/${item.id}/decision`,
            { decision: 'approve' },
            {
                preserveScroll: true,
                onFinish: () => setDecidingExpenseId(null),
            }
        );
    };

    const handleConfirmRejectExpense = () => {
        if (!rejectingExpense) return;
        setDecidingExpenseId(rejectingExpense.id);
        router.post(
            `/approvals/company-expenses/${rejectingExpense.id}/decision`,
            { decision: 'reject', notes: rejectionNotes },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejectingExpense(null);
                    setRejectionNotes('');
                },
                onFinish: () => setDecidingExpenseId(null),
            }
        );
    };

    const companyExpenseRows = useMemo(
        () =>
            [...(companyExpenses || [])].sort((a, b) => {
                const aNew = capabilities.can_decide_items && a.status === 'waiting_director';
                const bNew = capabilities.can_decide_items && b.status === 'waiting_director';
                if (aNew !== bNew) return aNew ? -1 : 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }),
        [companyExpenses, capabilities.can_decide_items]
    );

    const companyExpenseColumns = useMemo<Column<CompanyExpenseItem>[]>(
        () => [
            {
                key: 'request_number',
                header: 'Nomor / Tanggal',
                width: '210px',
                render: (item) => {
                    const isNew = capabilities.can_decide_items && item.status === 'waiting_director';
                    return (
                        <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-bold text-[#0060F4]">
                                    {item.request_number}
                                </span>
                                {isNew && (
                                    <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                        Perlu Approval
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">{formatDate(item.created_at)}</p>
                        </div>
                    );
                },
            },
            {
                key: 'category',
                header: 'Kategori / Pemohon',
                width: '240px',
                render: (item) => (
                    <div>
                        <span className="inline-block rounded-md bg-[#DCEAF8] dark:bg-[#1E3A5F] px-2 py-0.5 text-xs font-semibold text-[#0B1F63] dark:text-white">
                            {item.category || 'Operasional'}
                        </span>
                        <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                            Diajukan: <span className="font-medium text-[#0B1F63] dark:text-[#F1F5F9]">{item.creator?.name || 'Staff'}</span>
                        </p>
                        {item.notes && (
                            <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8] line-clamp-1 italic" title={item.notes}>
                                "{item.notes}"
                            </p>
                        )}
                    </div>
                ),
            },
            {
                key: 'items',
                header: 'Rincian Item',
                width: '260px',
                render: (item) => (
                    <div className="space-y-1">
                        {(item.items || []).slice(0, 2).map((it, idx) => (
                            <div key={it.id || idx} className="text-xs text-[#0B1F63] dark:text-[#F1F5F9] flex justify-between gap-2">
                                <span className="truncate">{it.description}</span>
                                <span className="font-mono font-semibold shrink-0">{formatCurrency(it.amount, it.currency || 'IDR')}</span>
                            </div>
                        ))}
                        {(item.items || []).length > 2 && (
                            <p className="text-[11px] font-bold text-[#0060F4]">
                                +{item.items!.length - 2} item lainnya
                            </p>
                        )}
                        {item.supporting_document_path && (
                            <a
                                href={`/storage/${item.supporting_document_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0060F4] hover:underline mt-1"
                            >
                                <Files aria-hidden="true" className="size-3" />
                                Bukti / Lampiran
                            </a>
                        )}
                    </div>
                ),
            },
            {
                key: 'total',
                header: 'Total Biaya',
                align: 'right',
                width: '170px',
                render: (item) => (
                    <span className="whitespace-nowrap font-mono font-bold tabular-nums text-base text-[#0B1F63] dark:text-white">
                        {formatCurrency(item.total, item.currency || 'IDR')}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Status',
                width: '180px',
                render: (item) => {
                    const statusLabel =
                        item.status === 'waiting_director'
                            ? 'Menunggu Approval'
                            : item.status === 'approved'
                                ? 'Disetujui'
                                : item.status === 'rejected'
                                    ? 'Ditolak'
                                    : item.status === 'realized'
                                        ? 'Terealisasi'
                                        : item.status;
                    return (
                        <div>
                            <StatusBadge
                                status={
                                    item.status === 'approved' || item.status === 'realized'
                                        ? 'Disetujui'
                                        : item.status === 'rejected'
                                            ? 'Ditolak'
                                            : 'Menunggu Approval Direktur'
                                }
                                label={statusLabel}
                                size="sm"
                                showDot
                            />
                            {item.reviewer && (
                                <p className="mt-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                    Oleh: <span className="font-semibold">{item.reviewer.name}</span>
                                    {item.reviewed_at && ` · ${formatDate(item.reviewed_at)}`}
                                </p>
                            )}
                        </div>
                    );
                },
            },
            {
                key: 'action',
                header: 'Aksi',
                align: 'right',
                width: '190px',
                render: (item) => {
                    const isWaiting = item.status === 'waiting_director';
                    if (capabilities.can_decide_items && isWaiting) {
                        return (
                            <div className="flex items-center justify-end gap-1.5">
                                <button
                                    type="button"
                                    disabled={decidingExpenseId !== null}
                                    onClick={() => handleApproveExpense(item)}
                                    className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-[#0060F4] px-2.5 text-xs font-bold text-white hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Check aria-hidden="true" className="size-3.5" />
                                    {decidingExpenseId === item.id ? '...' : 'Setujui'}
                                </button>
                                <button
                                    type="button"
                                    disabled={decidingExpenseId !== null}
                                    onClick={() => {
                                        setRejectingExpense(item);
                                        setRejectionNotes('');
                                    }}
                                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#FCA5A5] bg-white px-2.5 text-xs font-bold text-[#DC2626] hover:bg-[#FEF2F2] dark:border-[#7F1D1D] dark:bg-[#071322] dark:text-[#F87171] dark:hover:bg-[#450A0A] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <X aria-hidden="true" className="size-3.5" />
                                    Tolak
                                </button>
                            </div>
                        );
                    }
                    return (
                        <span className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                            {item.status === 'approved' ? 'Telah Disetujui' : item.status === 'rejected' ? 'Telah Ditolak' : '—'}
                        </span>
                    );
                },
            },
        ],
        [capabilities.can_decide_items, decidingExpenseId]
    );

    const visit = (tab = activeTab, query = search, selectedDate = date): void => {
        router.get('/approvals', { tab, search: query || undefined, date: selectedDate || undefined }, { preserveState: true });
    };

    const approvalSelectionRows = useMemo(
        () => isBatchApprovalOpen
            ? approvalRows.filter((row) => row.pendingCount > 0)
            : approvalTarget
                ? [approvalTarget]
                : [],
        [approvalRows, approvalTarget, isBatchApprovalOpen]
    );
    const approvalTargetItems = useMemo<ApprovalTargetItem[]>(
        () => approvalSelectionRows.flatMap((row) =>
            row.requests.flatMap((shipRequest) =>
                (shipRequest.items || [])
                    .filter(isPendingDirectorItem)
                    .map((item) => ({
                        jobKey: row.key,
                        requestNumber: shipRequest.request_number,
                        item,
                    }))
            )
        ),
        [approvalSelectionRows]
    );
    const selectedApprovalItems = useMemo(() => {
        const selectedItemIds = new Set(selectedApprovalItemIds);

        return approvalTargetItems.filter(({ item }) => selectedItemIds.has(item.id));
    }, [approvalTargetItems, selectedApprovalItemIds]);
    const selectedApprovalHpp = useMemo(
        () => selectedApprovalItems.reduce((total, { item }) => total + itemHppTotal(item), 0),
        [selectedApprovalItems]
    );
    const selectedApprovalJobKeys = useMemo(
        () => new Set(selectedApprovalItems.map(({ jobKey }) => jobKey)),
        [selectedApprovalItems]
    );
    const processedApprovalItems = useMemo(
        () => approvalTargetItems.filter(({ jobKey }) => selectedApprovalJobKeys.has(jobKey)),
        [approvalTargetItems, selectedApprovalJobKeys]
    );
    const returnedApprovalItemCount = processedApprovalItems.length - selectedApprovalItems.length;
    const isApprovalSelectionOpen = approvalTarget !== null || isBatchApprovalOpen;

    const openApprovalSelection = (row: ApprovalRow): void => {
        setSelectedApprovalItemIds([]);
        setIsBatchApprovalOpen(false);
        setApprovalTarget(row);
    };

    const openBatchApprovalSelection = (): void => {
        setSelectedApprovalItemIds([]);
        setApprovalTarget(null);
        setIsBatchApprovalOpen(true);
    };

    const closeApprovalSelection = (): void => {
        setApprovalTarget(null);
        setIsBatchApprovalOpen(false);
        setSelectedApprovalItemIds([]);
    };

    const toggleApprovalItem = (itemId: string): void => {
        setSelectedApprovalItemIds((current) =>
            current.includes(itemId)
                ? current.filter((id) => id !== itemId)
                : [...current, itemId]
        );
    };

    const toggleApprovalJob = (jobKey: string): void => {
        const jobItemIds = approvalTargetItems
            .filter((targetItem) => targetItem.jobKey === jobKey)
            .map(({ item }) => item.id);

        setSelectedApprovalItemIds((current) => {
            const allSelected = jobItemIds.length > 0
                && jobItemIds.every((itemId) => current.includes(itemId));

            if (allSelected) {
                return current.filter((itemId) => !jobItemIds.includes(itemId));
            }

            return Array.from(new Set([...current, ...jobItemIds]));
        });
    };

    const toggleAllApprovalItems = (): void => {
        const actionableItemIds = approvalTargetItems.map(({ item }) => item.id);
        const allSelected = actionableItemIds.length > 0
            && actionableItemIds.every((id) => selectedApprovalItemIds.includes(id));

        setSelectedApprovalItemIds(allSelected ? [] : actionableItemIds);
    };

    const approveSelectedItems = (): void => {
        if (!isApprovalSelectionOpen || selectedApprovalItemIds.length === 0) return;

        const selectedItemIds = new Set(selectedApprovalItemIds);
        const pendingItems = processedApprovalItems.map(({ item }) => ({
            item,
            isSelected: selectedItemIds.has(item.id),
        }));

        if (pendingItems.length === 0) {
            closeApprovalSelection();
            return;
        }

        setApprovingJobKey(isBatchApprovalOpen ? 'batch' : approvalTarget?.key || 'selection');
        router.post(
            route('approvals.requests.batch-item-decision'),
            {
                decisions: pendingItems.map(({ item, isSelected }) => ({
                    item_id: item.id,
                    status: isSelected ? 'approved' : 'pending',
                    director_notes: isSelected
                        ? null
                        : 'Belum dipilih Direktur. Silakan ajukan ulang setelah ditinjau Admin.',
                })),
            },
            {
                preserveScroll: true,
                onSuccess: closeApprovalSelection,
                onFinish: () => setApprovingJobKey(null),
            }
        );
    };

    const queueSummary = useMemo(() => {
        const pendingRows = approvalRows.filter((row) => row.pendingCount > 0);

        return {
            jobCount: pendingRows.length,
            requestCount: pendingRows.reduce(
                (total, row) => total + row.requests.filter((request) =>
                    (request.items || []).some(isPendingDirectorItem)
                ).length,
                0
            ),
            itemCount: pendingRows.reduce((total, row) => total + row.pendingCount, 0),
            totalHpp: pendingRows.reduce((total, row) => total + row.pendingHpp, 0),
        };
    }, [approvalRows]);

    const renderApprovalCard = (row: ApprovalRow) => {
        const isWaitingView = activeTab === 'menunggu';
        const actionableRequests = row.requests.filter((request) =>
            (request.items || []).some(isPendingDirectorItem)
        );
        const displayedRequests = isWaitingView && actionableRequests.length > 0
            ? actionableRequests
            : row.requests;
        const displayedItemCount = isWaitingView ? row.pendingCount : row.itemCount;
        const displayedEvidenceCount = isWaitingView ? row.pendingEvidenceCount : row.evidenceCount;
        const displayedHpp = isWaitingView && row.pendingCount > 0 ? row.pendingHpp : row.totalHpp;

        return (
            <Card
                key={row.key}
                role="article"
                overflow="hidden"
                className={`flex h-full flex-col ${row.isNew
                        ? 'border-l-4 border-l-[#0060F4] ring-1 ring-[#0060F4]/10 dark:border-l-[#38BDF8]'
                        : ''
                    }`}
            >
                <div className="flex flex-col gap-2.5 border-b border-[#DCEAF8] bg-[#F8FBFF] p-3.5 sm:p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-mono text-xs font-extrabold text-[#0060F4] dark:text-[#38BDF8]">
                            {row.jobNumber}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {row.isNew && (
                                <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                    Perlu Ditinjau
                                </span>
                            )}
                            <StatusBadge status={row.status} label={row.status} size="sm" showDot />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <ShipImage
                            src={row.shipImage}
                            alt={`Foto ${row.shipName}`}
                            width={48}
                            height={48}
                            loading="lazy"
                            className="size-12 shrink-0 rounded-xl object-cover ring-1 ring-[#DCEAF8] dark:ring-[#1E3A5F]"
                            placeholderIconClassName="size-5"
                        />
                        <div className="min-w-0 flex-1">
                            <h3 className="break-words text-base font-extrabold leading-snug text-[#0B1F63] dark:text-white">
                                {row.shipName}
                            </h3>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-[#0060F4]" />
                                <span className="truncate">{row.portName}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 flex-col gap-3.5 p-3.5 sm:gap-4 sm:p-4">
                    <div className="flex items-start gap-2 text-xs sm:text-sm text-[#0B1F63] dark:text-[#F1F5F9]">
                        <Building2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#0060F4]" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                Klien
                            </p>
                            <p className="break-words font-bold">{row.companyName}</p>
                        </div>
                    </div>

                    <dl className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] p-2 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                <Files aria-hidden="true" className="size-3 shrink-0" />
                                <span className="truncate">Surat</span>
                            </dt>
                            <dd className="mt-0.5 text-base sm:text-lg font-extrabold text-[#0B1F63] dark:text-white">
                                {displayedRequests.length}
                            </dd>
                        </div>
                        <div className="rounded-xl border border-[#BCE0FD] bg-[#F0F8FF] p-2 dark:border-[#285585] dark:bg-[#102B4A]">
                            <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#0060F4] dark:text-[#60A5FA]">
                                <Layers3 aria-hidden="true" className="size-3 shrink-0" />
                                <span className="truncate">{isWaitingView ? 'Ditinjau' : 'Item'}</span>
                            </dt>
                            <dd className="mt-0.5 text-base sm:text-lg font-extrabold text-[#0060F4] dark:text-[#60A5FA]">
                                {displayedItemCount}
                            </dd>
                        </div>
                        <div className="rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] p-2 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                <FileCheck2 aria-hidden="true" className="size-3 shrink-0" />
                                <span className="truncate">Bukti</span>
                            </dt>
                            <dd className="mt-0.5 text-base sm:text-lg font-extrabold text-[#0B1F63] dark:text-white">
                                {displayedEvidenceCount}
                            </dd>
                        </div>
                    </dl>

                    <section className="flex-1" aria-label={`Rincian pengajuan ${row.jobNumber}`}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h4 className="text-xs font-extrabold text-[#0B1F63] dark:text-white">
                                Rincian per REQ
                            </h4>
                            {displayedRequests.length > 1 && (
                                <span className="rounded-full bg-[#E0F0FF] px-2 py-0.5 text-[10px] font-bold text-[#0060F4] dark:bg-[#0060F4]/20 dark:text-[#60A5FA]">
                                    Dikirim sekaligus
                                </span>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {displayedRequests.map((shipRequest) => {
                                const requestItems = shipRequest.items || [];
                                const pendingItems = requestItems.filter(isPendingDirectorItem);
                                const requestItemCount = isWaitingView ? pendingItems.length : requestItems.length;
                                const requestHpp = (isWaitingView && pendingItems.length > 0
                                    ? pendingItems
                                    : requestItems
                                ).reduce((total, item) => total + itemHppTotal(item), 0);

                                return (
                                    <div
                                        key={shipRequest.id}
                                        className="flex flex-col gap-1 rounded-xl border border-[#DCEAF8] px-3 py-2 dark:border-[#1E3A5F] sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-mono text-xs font-bold text-[#0060F4] dark:text-[#38BDF8]">
                                                {shipRequest.request_number}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                {requestItemCount} item {isWaitingView ? 'menunggu keputusan' : 'dalam pengajuan'}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-mono text-xs font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                            {formatCurrency(requestHpp)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="border-t border-[#DCEAF8] bg-[#F8FBFF] p-3.5 sm:p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                {isWaitingView ? 'HPP yang perlu diputuskan' : 'Total HPP'}
                            </p>
                            <p className="mt-0.5 font-mono text-base sm:text-lg font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                {formatCurrency(displayedHpp)}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                <Clock3 aria-hidden="true" className="size-3 shrink-0" /> Diperbarui {formatDate(row.updatedAt)}
                            </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {isWaitingView && capabilities.can_decide_items && row.pendingCount > 0 && (
                                <Button
                                    type="button"
                                    size="md"
                                    leftIcon={<CheckCircle2 aria-hidden="true" className="size-4" />}
                                    disabled={approvingJobKey !== null}
                                    onClick={() => openApprovalSelection(row)}
                                    className="min-h-11 w-full bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                >
                                    Pilih &amp; Setujui
                                </Button>
                            )}
                            <Link
                                href={route('approvals.detail', row.jobNumber)}
                                prefetch
                                aria-label={`${row.pendingCount > 0 ? 'Tinjau' : 'Buka'} persetujuan ${row.jobNumber}`}
                                className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] ${isWaitingView && capabilities.can_decide_items && row.pendingCount > 0
                                        ? 'border border-[#BCE0FD] bg-white text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] dark:border-[#285585] dark:bg-[#0C1D36] dark:hover:bg-[#102B4A]'
                                        : 'bg-[#0060F4] text-white shadow-sm hover:bg-[#0050D0]'
                                    }`}
                            >
                                {row.pendingCount > 0 ? `Tinjau ${row.pendingCount} Item` : 'Lihat Detail'}
                                <ArrowRight aria-hidden="true" className="size-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <AppLayout title="Persetujuan" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Persetujuan - PT Samudra Jaya Andalas" />

            <MobilePageHero title="Persetujuan" description="Tinjau pengajuan dan pembayaran yang memerlukan keputusan." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <header className="hidden md:block">
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9]">
                        Persetujuan
                    </h1>
                    <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">
                        Pengajuan dan pembayaran yang perlu ditinjau.
                    </p>
                </header>

                <Tabs
                    items={[
                        { id: 'requests', label: 'Pengajuan Kapal', count: approvalRows.length, icon: <FileCheck2 aria-hidden="true" className="size-4" /> },
                        { id: 'payments', label: 'Pembayaran & Biaya', count: payments.length + (companyExpenses?.length || 0), icon: <Banknote aria-hidden="true" className="size-4" /> },
                    ]}
                    activeId={section}
                    onChange={(value) => setSection(value as 'requests' | 'payments')}
                    ariaLabel="Jenis persetujuan"
                    equalWidth
                    className="rounded-t-2xl border-x border-t border-[#DCEAF8] dark:border-[#1E3A5F]"
                />

                {section === 'requests' && activeTab === 'menunggu' && (
                    <section
                        className="overflow-hidden rounded-2xl border border-[#0060F4]/30 bg-linear-to-br from-[#E0F0FF] via-white to-[#F0F8FF] shadow-[0_10px_30px_rgba(0,96,244,0.08)] dark:border-[#285585] dark:from-[#102B4A] dark:via-[#0C1D36] dark:to-[#071322]"
                        aria-labelledby="approval-queue-heading"
                    >
                        <div className="flex flex-col gap-2.5 border-b border-[#BCE0FD] p-3.5 sm:p-4 dark:border-[#285585] sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 id="approval-queue-heading" className="text-sm sm:text-base font-extrabold text-[#0B1F63] dark:text-white">
                                        Antrean Keputusan Direktur
                                    </h2>
                                    <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                        {queueSummary.jobCount} Job
                                    </span>
                                </div>
                                <p className="mt-1 hidden max-w-3xl text-xs leading-relaxed text-[#52658E] dark:text-[#B5C8DC] sm:block">
                                    Pengajuan yang dikirim bersamaan dikelompokkan per job. Rincian setiap REQ tetap dipisahkan agar keputusan mudah diperiksa.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#BCE0FD] bg-white px-2.5 py-1 text-xs font-bold text-[#0060F4] dark:border-[#285585] dark:bg-[#071322] dark:text-[#60A5FA]">
                                    <Layers3 aria-hidden="true" className="size-3.5" />
                                    {queueSummary.itemCount} item menunggu
                                </div>
                                {capabilities.can_decide_items && queueSummary.jobCount > 1 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        leftIcon={<CheckCircle2 aria-hidden="true" className="size-4" />}
                                        disabled={approvingJobKey !== null}
                                        onClick={openBatchApprovalSelection}
                                        className="min-h-9 bg-[#0060F4] px-3 font-bold text-white hover:bg-[#0050D0]"
                                    >
                                        Setujui Beberapa Job
                                    </Button>
                                )}
                            </div>
                        </div>

                        <dl className="grid grid-cols-2 gap-px bg-[#BCE0FD] dark:bg-[#285585] sm:grid-cols-4">
                            {[
                                ['Job Aktif', queueSummary.jobCount],
                                ['Surat Pengajuan', queueSummary.requestCount],
                                ['Item Ditinjau', queueSummary.itemCount],
                                ['Total HPP Ditinjau', formatCurrency(queueSummary.totalHpp)],
                            ].map(([label, value]) => (
                                <div key={String(label)} className="bg-white/90 p-2.5 sm:p-3.5 dark:bg-[#0C1D36]/95">
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                        {label}
                                    </dt>
                                    <dd className="mt-0.5 break-words font-mono text-sm sm:text-base font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}

                {section === 'requests' && (
                    <>
                        {/* Mobile: Sleek Collapsible Daily Summary */}
                        <div className="sm:hidden">
                            <button
                                type="button"
                                onClick={() => setIsDailySummaryOpen(!isDailySummaryOpen)}
                                className="flex w-full items-center justify-between rounded-xl border border-[#B9D9FF] bg-[#F0F8FF] px-3.5 py-2.5 text-xs font-bold text-[#0B1F63] dark:border-[#285585] dark:bg-[#102B4A] dark:text-white"
                            >
                                <span className="flex items-center gap-2">
                                    <FileText aria-hidden="true" className="size-4 text-[#0060F4]" />
                                    <span>Rekap Harian ({formatDate(date || dailySummary.date)})</span>
                                </span>
                                <span className="flex items-center gap-1 text-[11px] text-[#0060F4] dark:text-[#38BDF8]">
                                    {isDailySummaryOpen ? 'Tutup' : 'Lihat'}
                                    {isDailySummaryOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                </span>
                            </button>

                            {isDailySummaryOpen && (
                                <div className="mt-2 space-y-2.5 rounded-2xl border border-[#B9D9FF] bg-[#F0F8FF] p-3 dark:border-[#285585] dark:bg-[#102B4A]">
                                    <div>
                                        <label className="text-xs font-bold text-[#0B1F63] dark:text-white">
                                            Tanggal rekap
                                            <input
                                                name="date"
                                                autoComplete="off"
                                                type="date"
                                                value={date || dailySummary.date}
                                                onChange={(event) => visit(activeTab, search, event.target.value)}
                                                className="mt-1 block h-9 w-full rounded-xl border border-[#DCEAF8] bg-white px-2.5 text-xs text-[#0B1F63] focus-visible:border-[#0060F4] focus-visible:outline-none dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                                            />
                                        </label>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-2">
                                        {[
                                            ['Kapal', dailySummary.ship_count],
                                            ['Pengajuan', dailySummary.request_count],
                                            ['Item', dailySummary.item_count],
                                            ['Total HPP', formatCurrency(dailySummary.total_hpp)],
                                            ['HPP Disetujui', formatCurrency(dailySummary.approved_hpp)],
                                        ].map(([label, value]) => (
                                            <div key={String(label)} className="rounded-xl border border-[#DCEAF8] bg-white p-2 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E]">{label}</dt>
                                                <dd className="mt-0.5 break-words font-mono text-xs font-bold tabular-nums text-[#0B1F63] dark:text-white">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            )}
                        </div>

                        {/* Desktop: Always Visible Daily Summary */}
                        <section className="hidden sm:block rounded-2xl border border-[#B9D9FF] bg-[#F0F8FF] p-3 dark:border-[#285585] dark:bg-[#102B4A]" aria-label="Rekap pengajuan harian">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-sm font-extrabold text-[#0B1F63] dark:text-white">Rekap Harian Semua Kapal</h2>
                                    <p className="mt-0.5 text-xs text-[#52658E] dark:text-[#94A3B8]">Ringkasan biaya pengajuan pada tanggal yang sama.</p>
                                </div>
                                <label className="text-xs font-bold text-[#0B1F63] dark:text-white">
                                    Tanggal rekap
                                    <input
                                        name="date"
                                        autoComplete="off"
                                        type="date"
                                        value={date || dailySummary.date}
                                        onChange={(event) => visit(activeTab, search, event.target.value)}
                                        className="mt-1 block h-11 rounded-xl border border-[#DCEAF8] bg-white px-3 text-sm focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322]"
                                    />
                                </label>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {[
                                    ['Kapal', dailySummary.ship_count],
                                    ['Pengajuan', dailySummary.request_count],
                                    ['Item', dailySummary.item_count],
                                    ['Total HPP', formatCurrency(dailySummary.total_hpp)],
                                    ['HPP Disetujui', formatCurrency(dailySummary.approved_hpp)],
                                ].map(([label, value]) => (
                                    <div key={String(label)} className="rounded-xl border border-[#DCEAF8] bg-white p-2.5 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E]">{label}</dt>
                                        <dd className="mt-1 break-words font-bold tabular-nums text-[#0B1F63] dark:text-white">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    </>
                )}

                <section className="space-y-3" aria-label="Filter persetujuan">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            visit();
                        }}
                        className="relative"
                    >
                        <Search
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#0060F4]"
                        />
                        <input
                            type="search"
                            name="search"
                            autoComplete="off"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari job, kapal, pengajuan, atau pembayaran…"
                            aria-label="Cari persetujuan"
                            className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-white pl-10 pr-11 text-sm text-[#0B1F63] shadow-xs placeholder:text-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9]"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    visit(activeTab, '');
                                }}
                                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#52658E] hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#0060F4]"
                                aria-label="Hapus pencarian"
                            >
                                <X aria-hidden="true" className="size-4" />
                            </button>
                        )}
                    </form>

                    <Tabs
                        items={[
                            { id: 'menunggu', label: 'Menunggu', count: counts.menunggu },
                            { id: 'disetujui', label: 'Disetujui', count: counts.disetujui },
                            { id: 'ditolak', label: 'Ditolak', count: counts.ditolak },
                        ]}
                        activeId={activeTab}
                        onChange={(value) => visit(value)}
                        ariaLabel="Filter status persetujuan"
                        className="rounded-t-2xl border-x border-t border-[#DCEAF8] dark:border-[#1E3A5F]"
                    />
                </section>

                {section === 'requests' ? (
                    <section className="space-y-3" aria-labelledby="approval-list-heading">
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <h2 id="approval-list-heading" className="text-base font-extrabold text-[#0B1F63] dark:text-white">
                                    Pengajuan per Job
                                </h2>
                                <p className="mt-0.5 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                    Setiap kartu merangkum seluruh REQ dalam satu kegiatan kapal.
                                </p>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-[#52658E] dark:text-[#94A3B8]">
                                {approvalRows.length} job
                            </span>
                        </div>

                        {approvalRows.length > 0 ? (
                            <div className="grid items-stretch gap-4 xl:grid-cols-2">
                                {approvalRows.map(renderApprovalCard)}
                            </div>
                        ) : (
                            <Card className="p-10 text-center">
                                <FileCheck2 aria-hidden="true" className="mx-auto size-8 text-[#8C9BB9] dark:text-[#64748B]" />
                                <h3 className="mt-3 text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                    Tidak ada pengajuan pada antrean ini
                                </h3>
                                <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                    Coba pilih status lain atau ubah kata kunci pencarian.
                                </p>
                            </Card>
                        )}
                    </section>
                ) : (
                    <div className="space-y-4">
                        {/* <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#DCEAF8] bg-[#F8FBFF] p-2 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <button
                                type="button"
                                onClick={() => setPaymentSubTab('company_expenses')}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all ${
                                    paymentSubTab === 'company_expenses'
                                        ? 'bg-[#0060F4] text-white shadow-sm'
                                        : 'bg-white text-[#52658E] hover:bg-[#F0F8FF] hover:text-[#0B1F63] dark:bg-[#0C1D36] dark:text-[#94A3B8] dark:hover:bg-[#102B4A] dark:hover:text-white border border-[#DCEAF8] dark:border-[#1E3A5F]'
                                }`}
                            >
                                <Building2 aria-hidden="true" className="size-4" />
                                <span>Pengajuan Biaya Perusahaan</span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-mono font-bold ${
                                        paymentSubTab === 'company_expenses'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-[#E0F0FF] text-[#0060F4] dark:bg-[#102B4A] dark:text-[#60A5FA]'
                                    }`}
                                >
                                    {companyExpenseRows.length}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentSubTab('vendor_payments')}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all ${
                                    paymentSubTab === 'vendor_payments'
                                        ? 'bg-[#0060F4] text-white shadow-sm'
                                        : 'bg-white text-[#52658E] hover:bg-[#F0F8FF] hover:text-[#0B1F63] dark:bg-[#0C1D36] dark:text-[#94A3B8] dark:hover:bg-[#102B4A] dark:hover:text-white border border-[#DCEAF8] dark:border-[#1E3A5F]'
                                }`}
                            >
                                <Banknote aria-hidden="true" className="size-4" />
                                <span>Verifikasi Pembayaran Vendor</span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-mono font-bold ${
                                        paymentSubTab === 'vendor_payments'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-[#E0F0FF] text-[#0060F4] dark:bg-[#102B4A] dark:text-[#60A5FA]'
                                    }`}
                                >
                                    {paymentRows.length}
                                </span>
                            </button>
                        </div> */}

                        {paymentSubTab === 'company_expenses' ? (
                            <>
                                <div className="hidden md:block">
                                    <Table
                                        columns={companyExpenseColumns}
                                        data={companyExpenseRows}
                                        keyExtractor={(item) => item.id}
                                        compact
                                        minWidth="1080px"
                                        emptyIcon={<Building2 aria-hidden="true" className="mx-auto size-7" />}
                                        emptyMessage="Tidak ada pengajuan biaya perusahaan pada antrean ini"
                                        rowClassName={(item) =>
                                            capabilities.can_decide_items && item.status === 'waiting_director'
                                                ? '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A] border-l-4 border-l-[#0060F4]'
                                                : ''
                                        }
                                    />
                                </div>
                                <TableMobile
                                    className="md:hidden"
                                    data={companyExpenseRows}
                                    keyExtractor={(item) => item.id}
                                    titleRender={(item) => item.request_number}
                                    subtitleRender={(item) => `${item.category || 'Operasional'} · ${item.creator?.name || 'Staff'}`}
                                    statusRender={(item) => {
                                        const label =
                                            item.status === 'waiting_director'
                                                ? 'Menunggu Approval'
                                                : item.status === 'approved'
                                                    ? 'Disetujui'
                                                    : item.status === 'rejected'
                                                        ? 'Ditolak'
                                                        : item.status === 'realized'
                                                            ? 'Terealisasi'
                                                            : item.status;
                                        return (
                                            <StatusBadge
                                                status={
                                                    item.status === 'approved' || item.status === 'realized'
                                                        ? 'Disetujui'
                                                        : item.status === 'rejected'
                                                            ? 'Ditolak'
                                                            : 'Menunggu Approval Direktur'
                                                }
                                                label={label}
                                                size="sm"
                                            />
                                        );
                                    }}
                                    fields={[
                                        { label: 'Tanggal', render: (item) => formatDate(item.created_at) },
                                        {
                                            label: 'Nominal',
                                            fullWidth: true,
                                            render: (item) => (
                                                <span className="font-bold tabular-nums text-base text-[#0B1F63] dark:text-white">
                                                    {formatCurrency(item.total, item.currency || 'IDR')}
                                                </span>
                                            ),
                                        },
                                        { label: 'Catatan', fullWidth: true, render: (item) => item.notes || '-' },
                                        {
                                            label: 'Pemeriksa',
                                            fullWidth: true,
                                            render: (item) =>
                                                item.reviewer
                                                    ? `${item.reviewer.name}${item.reviewed_at ? ` (${formatDate(item.reviewed_at)})` : ''}`
                                                    : '-',
                                        },
                                    ]}
                                    actionsRender={(item) =>
                                        capabilities.can_decide_items && item.status === 'waiting_director' ? (
                                            <div className="flex w-full gap-2">
                                                <button
                                                    type="button"
                                                    disabled={decidingExpenseId !== null}
                                                    onClick={() => handleApproveExpense(item)}
                                                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0060F4] px-3 text-sm font-bold text-white hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] disabled:opacity-50"
                                                >
                                                    <Check aria-hidden="true" className="size-4" />
                                                    {decidingExpenseId === item.id ? 'Memproses...' : 'Setujui'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={decidingExpenseId !== null}
                                                    onClick={() => {
                                                        setRejectingExpense(item);
                                                        setRejectionNotes('');
                                                    }}
                                                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#FCA5A5] bg-white px-3 text-sm font-bold text-[#DC2626] hover:bg-[#FEF2F2] dark:border-[#7F1D1D] dark:bg-[#071322] dark:text-[#F87171] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626] disabled:opacity-50"
                                                >
                                                    <X aria-hidden="true" className="size-4" />
                                                    Tolak
                                                </button>
                                            </div>
                                        ) : undefined
                                    }
                                    emptyIcon={<Building2 aria-hidden="true" className="mx-auto size-7" />}
                                    emptyMessage="Tidak ada pengajuan biaya perusahaan"
                                />
                            </>
                        ) : (
                            <>
                                <div className="hidden md:block">
                                    <Table
                                        columns={paymentColumns}
                                        data={paymentRows}
                                        keyExtractor={(payment) => payment.id}
                                        compact
                                        minWidth="1080px"
                                        emptyIcon={<Banknote aria-hidden="true" className="mx-auto size-7" />}
                                        emptyMessage="Data Tidak Ditemukan"
                                        rowClassName={(payment) =>
                                            capabilities.can_decide_items && payment.verification_status === 'pending'
                                                ? '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A] border-l-4 border-l-[#0060F4]'
                                                : ''
                                        }
                                    />
                                </div>
                                <TableMobile
                                    className="md:hidden"
                                    data={paymentRows}
                                    keyExtractor={(payment) => payment.id}
                                    titleRender={(payment) => payment.recipient}
                                    subtitleRender={(payment) => payment.reference_number}
                                    statusRender={(payment) => (
                                        <StatusBadge
                                            status={
                                                payment.verification_status === 'verified'
                                                    ? 'Disetujui'
                                                    : payment.verification_status === 'rejected'
                                                        ? 'Ditolak'
                                                        : 'Menunggu Approval'
                                            }
                                            label={
                                                payment.verification_status === 'verified'
                                                    ? 'Terverifikasi'
                                                    : payment.verification_status === 'rejected'
                                                        ? 'Ditolak'
                                                        : 'Menunggu'
                                            }
                                            size="sm"
                                        />
                                    )}
                                    fields={[
                                        { label: 'Job', fullWidth: true, render: (payment) => payment.port_call?.job_number || '-' },
                                        { label: 'Jenis', render: (payment) => payment.payment_type },
                                        { label: 'Tanggal', render: (payment) => formatDate(payment.payment_date) },
                                        {
                                            label: 'Nominal',
                                            fullWidth: true,
                                            render: (payment) => (
                                                <span className="font-bold tabular-nums">
                                                    {formatCurrency(payment.amount, payment.currency || 'IDR')}
                                                </span>
                                            ),
                                        },
                                    ]}
                                    actionsRender={(payment) =>
                                        capabilities.can_decide_items && payment.verification_status === 'pending' ? (
                                            <button
                                                type="button"
                                                disabled={verifyingId !== null}
                                                onClick={() => {
                                                    setVerifyingId(payment.id);
                                                    router.post(
                                                        `/approvals/payments/${payment.id}/verify`,
                                                        {},
                                                        { preserveScroll: true, onFinish: () => setVerifyingId(null) }
                                                    );
                                                }}
                                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Check aria-hidden="true" className="size-4" />
                                                {verifyingId === payment.id ? 'Memproses' : 'Verifikasi'}
                                            </button>
                                        ) : undefined
                                    }
                                    emptyIcon={<Banknote aria-hidden="true" className="mx-auto size-7" />}
                                    emptyMessage="Data Tidak Ditemukan"
                                />
                            </>
                        )}
                    </div>
                )}

                <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                    “Baru” hanya tampil pada status yang membutuhkan tindakan role Anda.
                </p>
            </div>

            <ConfirmDialog
                isOpen={isApprovalSelectionOpen}
                title={isBatchApprovalOpen ? 'Pilih Item dari Beberapa Job' : 'Pilih Item yang Disetujui'}
                description={isBatchApprovalOpen
                    ? 'Pilih item secara kondisional dari beberapa kapal. Job tanpa item terpilih tetap menunggu keputusan Direktur.'
                    : 'Setiap item diputuskan terpisah. Item yang tidak dipilih otomatis kembali ke Admin untuk ditinjau dan diajukan ulang.'}
                confirmLabel={isBatchApprovalOpen
                    ? `Setujui ${selectedApprovalItems.length} Item (${selectedApprovalJobKeys.size} Job)`
                    : `Setujui ${selectedApprovalItems.length} Item`}
                onConfirm={approveSelectedItems}
                onClose={() => {
                    if (approvingJobKey === null) {
                        closeApprovalSelection();
                    }
                }}
                processing={isApprovalSelectionOpen && approvingJobKey !== null}
                disabled={!isApprovalSelectionOpen || selectedApprovalItemIds.length === 0}
            >
                {isApprovalSelectionOpen && (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-[#BCE0FD] bg-[#F0F8FF] p-4 dark:border-[#285585] dark:bg-[#102B4A]">
                            <p className="break-all font-mono text-xs font-extrabold text-[#0060F4]">
                                {isBatchApprovalOpen ? 'APPROVAL LINTAS JOB' : approvalTarget?.jobNumber}
                            </p>
                            <p className="mt-1 text-base font-extrabold text-[#0B1F63] dark:text-white">
                                {isBatchApprovalOpen
                                    ? `${selectedApprovalJobKeys.size} dari ${approvalSelectionRows.length} job akan diproses`
                                    : approvalTarget?.shipName}
                            </p>
                            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                        Dipilih
                                    </dt>
                                    <dd className="mt-0.5 font-mono text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                        {selectedApprovalItems.length} Item
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                        Kembali
                                    </dt>
                                    <dd className="mt-0.5 font-mono text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                        {returnedApprovalItemCount} Item
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                        Job Diproses
                                    </dt>
                                    <dd className="mt-0.5 font-mono text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                        {selectedApprovalJobKeys.size} Job
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                        HPP Dipilih
                                    </dt>
                                    <dd className="mt-0.5 break-words font-mono text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                        {formatCurrency(selectedApprovalHpp)}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#DCEAF8] bg-white px-3 py-2.5 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <input
                                type="checkbox"
                                checked={approvalTargetItems.length > 0
                                    && approvalTargetItems.every(({ item }) =>
                                        selectedApprovalItemIds.includes(item.id)
                                    )}
                                onChange={toggleAllApprovalItems}
                                className="size-5 rounded border-[#B7C9DF] text-[#0060F4] focus:ring-[#0060F4]"
                            />
                            <span>
                                <span className="block text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                    Pilih semua item
                                </span>
                                <span className="block text-xs text-[#52658E] dark:text-[#94A3B8]">
                                    {selectedApprovalItems.length} dari {approvalTargetItems.length} item dipilih
                                </span>
                            </span>
                        </label>

                        <div className="max-h-80 space-y-3 overflow-y-auto pr-1 sm:max-h-96" aria-label="Daftar item yang dapat disetujui">
                            {approvalSelectionRows.map((row) => {
                                const jobItems = approvalTargetItems.filter(({ jobKey }) => jobKey === row.key);
                                const selectedJobItemCount = jobItems.filter(({ item }) =>
                                    selectedApprovalItemIds.includes(item.id)
                                ).length;
                                const allJobItemsSelected = jobItems.length > 0
                                    && selectedJobItemCount === jobItems.length;

                                return (
                                    <section
                                        key={row.key}
                                        className="overflow-hidden rounded-xl border border-[#BCE0FD] bg-[#F8FBFF] dark:border-[#285585] dark:bg-[#071322]"
                                        aria-label={`Item approval ${row.jobNumber}`}
                                    >
                                        <div className="flex items-center justify-between gap-3 border-b border-[#DCEAF8] bg-[#F0F8FF] px-3 py-2.5 dark:border-[#1E3A5F] dark:bg-[#102B4A]">
                                            <label className="flex min-w-0 cursor-pointer items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={allJobItemsSelected}
                                                    onChange={() => toggleApprovalJob(row.key)}
                                                    aria-label={`Pilih semua item ${row.jobNumber}`}
                                                    className="size-5 shrink-0 rounded border-[#B7C9DF] text-[#0060F4] focus:ring-[#0060F4]"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block break-all font-mono text-[11px] font-extrabold text-[#0060F4]">
                                                        {row.jobNumber}
                                                    </span>
                                                    <span className="block truncate text-xs font-bold text-[#0B1F63] dark:text-white">
                                                        {row.shipName}
                                                    </span>
                                                </span>
                                            </label>
                                            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#52658E] dark:bg-[#071322] dark:text-[#94A3B8]">
                                                {selectedJobItemCount}/{jobItems.length} item
                                            </span>
                                        </div>

                                        <div className="space-y-2 p-2.5">
                                            {jobItems.map(({ requestNumber, item }) => {
                                                const isSelected = selectedApprovalItemIds.includes(item.id);

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`rounded-xl border px-3 py-2.5 transition-colors ${isSelected
                                                                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                                                                : 'border-[#DCEAF8] bg-white hover:border-[#BCE0FD] dark:border-[#1E3A5F] dark:bg-[#0C1D36]'
                                                            }`}
                                                    >
                                                        <label className="flex min-h-11 cursor-pointer items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleApprovalItem(item.id)}
                                                                aria-label={`Pilih ${item.item_name || 'item pengajuan'} dari ${requestNumber}`}
                                                                className="mt-0.5 size-5 shrink-0 rounded border-[#B7C9DF] text-emerald-600 focus:ring-emerald-500"
                                                            />
                                                            <span className="min-w-0 flex-1">
                                                                <span className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                                                    <span className="break-words text-sm font-extrabold text-[#0B1F63] dark:text-white">
                                                                        {item.item_name || 'Item pengajuan'}
                                                                    </span>
                                                                    <span className="shrink-0 font-mono text-xs font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                                                        {formatCurrency(itemHppTotal(item))}
                                                                    </span>
                                                                </span>
                                                                <span className="mt-1 block break-all font-mono text-[10px] font-semibold text-[#0060F4]">
                                                                    {requestNumber}
                                                                </span>
                                                                <span className="mt-1 block break-words text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                                    {item.vendor?.name || 'Vendor belum ditentukan'} · Qty {item.quantity}
                                                                    {item.supplier_invoice_number
                                                                        ? ` · ${item.supplier_invoice_number}`
                                                                        : ''}
                                                                </span>
                                                            </span>
                                                        </label>

                                                        <div className="mt-2 border-t border-[#DCEAF8]/80 pt-2 dark:border-[#1E3A5F]/80 sm:pl-8">
                                                            {item.supplier_invoice_url ? (
                                                                <a
                                                                    href={`${item.supplier_invoice_url}?view=1`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    aria-label={`Buka bukti invoice supplier untuk ${item.item_name || 'item pengajuan'}`}
                                                                    className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[#BCE0FD] bg-[#F0F8FF] px-2.5 text-[11px] font-bold text-[#0060F4] hover:border-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#285585] dark:bg-[#102B4A] dark:text-[#60A5FA] sm:w-auto"
                                                                >
                                                                    {item.supplier_invoice_is_image ? (
                                                                        <img
                                                                            src={`${item.supplier_invoice_url}?view=1`}
                                                                            alt=""
                                                                            className="size-8 rounded object-cover"
                                                                            loading="lazy"
                                                                        />
                                                                    ) : (
                                                                        <FileText aria-hidden="true" className="size-3.5" />
                                                                    )}
                                                                    <span>{item.supplier_invoice_number || 'Buka invoice'}</span>
                                                                    <ExternalLink aria-hidden="true" className="size-3" />
                                                                </a>
                                                            ) : item.attachment_url ? (
                                                                <a
                                                                    href={`${item.attachment_url}?view=1`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    aria-label={`Buka bukti upload untuk ${item.item_name || 'item pengajuan'}`}
                                                                    className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-bold text-amber-700 hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 sm:w-auto"
                                                                >
                                                                    <FileText aria-hidden="true" className="size-3.5" />
                                                                    Bukti upload
                                                                    <ExternalLink aria-hidden="true" className="size-3" />
                                                                </a>
                                                            ) : (
                                                                <span className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-dashed border-[#D7A334] bg-amber-50 px-2.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 sm:w-auto">
                                                                    Invoice belum tersedia
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                            {isBatchApprovalOpen
                                ? 'Hanya job yang memiliki item terpilih yang diproses. Item lain dalam job tersebut kembali ke Admin, sedangkan job tanpa pilihan tetap menunggu Direktur.'
                                : 'Item terpilih disetujui dan HPP-nya dikunci. Item yang tidak dipilih dikembalikan ke Admin dengan status menunggu pengajuan ulang.'}
                        </p>
                    </div>
                )}
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={rejectingExpense !== null}
                title="Tolak Pengajuan Biaya Perusahaan"
                description={`Masukkan alasan penolakan untuk pengajuan ${rejectingExpense?.request_number || ''}. Alasan ini akan tercatat dan dikirimkan ke pemohon.`}
                confirmLabel="Tolak Pengajuan"
                onConfirm={handleConfirmRejectExpense}
                onClose={() => {
                    if (decidingExpenseId === null) {
                        setRejectingExpense(null);
                        setRejectionNotes('');
                    }
                }}
                processing={decidingExpenseId !== null}
                disabled={!rejectionNotes.trim()}
            >
                {rejectingExpense && (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs dark:border-[#7F1D1D] dark:bg-[#450A0A]/30">
                            <p className="font-bold text-[#DC2626] dark:text-[#F87171]">
                                Total Pengajuan: {formatCurrency(rejectingExpense.total, rejectingExpense.currency || 'IDR')}
                            </p>
                            <p className="mt-0.5 text-[#7F1D1D] dark:text-[#FCA5A5]">
                                Kategori: {rejectingExpense.category || 'Operasional'} · Diajukan oleh: {rejectingExpense.creator?.name || 'Staff'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#0B1F63] dark:text-white">
                                Alasan Penolakan <span className="text-[#DC2626]">*</span>
                            </label>
                            <textarea
                                value={rejectionNotes}
                                onChange={(e) => setRejectionNotes(e.target.value)}
                                placeholder="Tuliskan alasan penolakan untuk pemohon..."
                                rows={3}
                                className="mt-1.5 w-full rounded-xl border border-[#DCEAF8] bg-white p-3 text-sm text-[#0B1F63] placeholder:text-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                            />
                        </div>
                    </div>
                )}
            </ConfirmDialog>
        </AppLayout>
    );
}
