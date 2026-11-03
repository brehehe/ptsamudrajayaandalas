import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
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
    RotateCcw,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import ConfirmDialog from '../../Components/overlays/ConfirmDialog';
import Modal from '../../Components/overlays/Modal';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Tabs from '../../Components/ui/Tabs';
import Button from '../../Components/ui/Button';
import ShipImage from '../../Components/vessels/ShipImage';
import { FileViewerTrigger } from '../../Components/ui/FileViewer';
import DateRangePicker, { type DateRange } from '../../Components/forms/DateRangePicker';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import ItemSubmissionHistoryBadge, { type ItemSubmissionRound } from '../../Components/requests/ItemSubmissionHistoryBadge';

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
    surplus_source_item_id?: string | null;
    surplus_source_item_name?: string | null;
    surplus_amount?: number | string | null;
    original_hpp_price?: number | string | null;
    submission_count?: number;
    submission_round_label?: string;
    was_previously_unselected?: boolean;
    submission_history?: ItemSubmissionRound[];
    latest_submission_date?: string;
    history_summary?: string;
}

interface ShipRequest {
    id: string;
    request_number: string;
    status: string;
    service_type?: string;
    request_date: string;
    created_at: string;
    admin_forward_notes?: string | null;
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
    approvedCount: number;
    approvedEvidenceCount: number;
    approvedHpp: number;
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
    companies?: Array<{ id: string; name: string }>;
    ships?: Array<{ id: string; name: string; ship_company_id?: string }>;
    jobs?: Array<{ id: string; job_number?: string; ship_id?: string }>;
    counts: { semua?: number; menunggu: number; disetujui: number; ditolak: number };
    activeTab: string;
    search: string;
    date: string;
    filters?: {
        tab?: string;
        status?: string;
        search?: string;
        company_id?: string;
        ship_id?: string;
        job?: string;
        start_date?: string;
        end_date?: string;
        date?: string;
    };
    dailySummary: {
        date: string;
        ship_count: number;
        request_count: number;
        item_count: number;
        total_hpp: number;
        approved_hpp: number;
    };
    all_requests_total_hpp?: number;
    waiting_requests_total_hpp?: number;
    approved_requests_total_hpp?: number;
    rejected_requests_total_hpp?: number;
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

const isPendingDirectorItem = (item: RequestItem): boolean => {
    const s = normalized(item.status);
    return (
        s === 'diajukan_ke_direktur' &&
        (!item.director_status || item.director_status === 'pending')
    );
};

const isApprovedDirectorItem = (item: RequestItem): boolean => {
    const s = normalized(item.status);
    const ds = normalized(item.director_status);
    return ds === 'approved' || s === 'approved' || s === 'disetujui';
};

const itemHppTotal = (item: RequestItem): number =>
    Number(item.hpp_price || 0) * Number(item.quantity || 0);

export default function ApprovalsIndex({
    requests,
    payments,
    companyExpenses = [],
    companies = [],
    ships = [],
    jobs = [],
    counts,
    activeTab,
    search: initialSearch,
    date,
    filters,
    dailySummary,
    all_requests_total_hpp,
    waiting_requests_total_hpp,
    approved_requests_total_hpp,
    rejected_requests_total_hpp,
    capabilities = DEFAULT_CAPABILITIES,
}: ApprovalsIndexProps) {
    const [search, setSearch] = useState(filters?.search ?? initialSearch ?? '');
    const [companyId, setCompanyId] = useState(filters?.company_id ?? '');
    const [shipId, setShipId] = useState(filters?.ship_id ?? '');
    const [job, setJob] = useState(filters?.job ?? '');
    const [status, setStatus] = useState(filters?.tab ?? activeTab ?? 'menunggu');
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: filters?.start_date ?? '',
        endDate: filters?.end_date ?? '',
    });

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modalCompanyId, setModalCompanyId] = useState(filters?.company_id ?? '');
    const [modalShipId, setModalShipId] = useState(filters?.ship_id ?? '');
    const [modalJob, setModalJob] = useState(filters?.job ?? '');
    const [modalStatus, setModalStatus] = useState(filters?.tab ?? activeTab ?? 'menunggu');
    const [modalDateRange, setModalDateRange] = useState<DateRange>({
        startDate: filters?.start_date ?? '',
        endDate: filters?.end_date ?? '',
    });

    const availableShips = useMemo(() => {
        if (!companyId) return ships;
        return ships.filter((s) => s.ship_company_id === companyId);
    }, [ships, companyId]);

    const modalAvailableShips = useMemo(() => {
        if (!modalCompanyId) return ships;
        return ships.filter((s) => s.ship_company_id === modalCompanyId);
    }, [ships, modalCompanyId]);

    const companyOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Perusahaan' },
        ...companies.map((c) => ({ value: c.id, label: c.name })),
    ], [companies]);

    const shipOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Kapal' },
        ...availableShips.map((s) => ({ value: s.id, label: s.name })),
    ], [availableShips]);

    const modalShipOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Kapal' },
        ...modalAvailableShips.map((s) => ({ value: s.id, label: s.name })),
    ], [modalAvailableShips]);

    const jobOptions: SelectSearchOption[] = useMemo(() => [
        { value: '', label: 'Semua Job' },
        ...jobs.map((j) => ({ value: j.job_number || j.id, label: j.job_number || j.id })),
    ], [jobs]);

    const modalJobOptions: SelectSearchOption[] = useMemo(() => {
        const list = modalShipId
            ? (jobs || []).filter((j) => !j.ship_id || j.ship_id === modalShipId)
            : (jobs || []);
        return [
            { value: '', label: 'Semua Job' },
            ...list.map((j) => ({ value: j.job_number || j.id, label: j.job_number || j.id })),
        ];
    }, [jobs, modalShipId]);

    const statusOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: 'menunggu', label: `Menunggu Approval (${counts.menunggu || 0})` },
            { value: 'disetujui', label: `Disetujui (${counts.disetujui || 0})` },
            { value: 'ditolak', label: `Ditolak (${counts.ditolak || 0})` },
            { value: 'semua', label: `Semua Status (${counts.semua || 0})` },
        ],
        [counts]
    );

    const activeFilterCount = [
        companyId,
        shipId,
        job,
        status && status !== 'menunggu' && status !== 'semua' ? status : '',
        dateRange.startDate || dateRange.endDate ? 'date' : '',
    ].filter(Boolean).length;

    const hasActiveFilters = Boolean(
        search || companyId || shipId || job || (status && status !== 'menunggu' && status !== 'semua') || dateRange.startDate || dateRange.endDate
    );

    const applyFilters = (overrides?: Record<string, string | undefined>) => {
        const nextFilters = {
            tab: status,
            search: search || undefined,
            company_id: companyId || undefined,
            ship_id: shipId || undefined,
            job: job || undefined,
            start_date: dateRange.startDate || undefined,
            end_date: dateRange.endDate || undefined,
            ...overrides,
        };
        router.get('/approvals', nextFilters, { preserveState: true });
    };

    const resetFilters = () => {
        setSearch('');
        setCompanyId('');
        setShipId('');
        setJob('');
        setStatus('menunggu');
        const emptyRange: DateRange = { startDate: '', endDate: '' };
        setDateRange(emptyRange);
        router.get('/approvals', { tab: 'menunggu' }, { preserveState: true });
    };

    const [approvalTarget, setApprovalTarget] = useState<ApprovalRow | null>(null);
    const [isBatchApprovalOpen, setIsBatchApprovalOpen] = useState(false);
    const [selectedApprovalItemIds, setSelectedApprovalItemIds] = useState<string[]>([]);
    const [approvingJobKey, setApprovingJobKey] = useState<string | null>(null);
    const [approvalErrors, setApprovalErrors] = useState<Record<string, string>>({});
    const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);

    const requestNeedsAction = (request: ShipRequest): boolean => {
        const status = normalized(request.status);

        if (capabilities.can_decide_items) {
            return (
                status === 'menunggu approval direktur' ||
                (request.items || []).some(isPendingDirectorItem)
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

            const approvedItems = items.filter(isApprovedDirectorItem);
            const approved = approvedItems.length;
            const approvedEvidenceCount = approvedItems.filter(
                (item) => item.attachment_url || item.supplier_invoice_url
            ).length;
            const approvedHpp = approvedItems.reduce((total, item) => total + itemHppTotal(item), 0);

            const evidenceCount = items.filter((item) => item.attachment_url || item.supplier_invoice_url).length;
            const existing = groups.get(key);

            if (!existing) {
                groups.set(key, {
                    key,
                    jobNumber: request.port_call?.job_number || request.request_number,
                    shipName: request.ship?.name || request.port_call?.ship?.name || request.service_type || 'Biaya Operasional Perusahaan',
                    shipImage: request.ship?.image || request.port_call?.ship?.image,
                    companyName:
                        request.company?.name ||
                        request.ship?.company?.name ||
                        request.port_call?.ship?.company?.name ||
                        'PT Samudra Jaya Andalas',
                    portName: request.port_call?.port?.name || request.port?.name || 'Kantor / Operasional',
                    requests: [request],
                    itemCount: items.length,
                    evidenceCount,
                    pendingCount: pending,
                    pendingEvidenceCount,
                    pendingHpp,
                    approvedCount: approved,
                    approvedEvidenceCount,
                    approvedHpp,
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
            existing.approvedCount += approved;
            existing.approvedEvidenceCount += approvedEvidenceCount;
            existing.approvedHpp += approvedHpp;
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

        if (activeTab === 'menunggu') {
            return sortedRows.filter((row) => row.pendingCount > 0);
        }

        if (activeTab === 'disetujui') {
            return sortedRows.filter((row) => row.approvedCount > 0);
        }

        return sortedRows;
    }, [requests, capabilities, activeTab]);

    const visit = (tab = activeTab, query = search, selectedDate = date): void => {
        applyFilters({ tab, search: query || undefined, date: selectedDate || undefined });
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
        setApprovalErrors({});
        setIsBatchApprovalOpen(false);
        setApprovalTarget(row);
    };

    const openBatchApprovalSelection = (): void => {
        setSelectedApprovalItemIds([]);
        setApprovalErrors({});
        setApprovalTarget(null);
        setIsBatchApprovalOpen(true);
    };

    const closeApprovalSelection = (): void => {
        setApprovalTarget(null);
        setIsBatchApprovalOpen(false);
        setSelectedApprovalItemIds([]);
        setApprovalErrors({});
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

        setApprovalErrors({});
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
                onError: (errors) => setApprovalErrors(errors as Record<string, string>),
                onFinish: () => setApprovingJobKey(null),
            }
        );
    };

    const queueSummary = useMemo(() => {
        const rowsToCount = activeTab === 'menunggu'
            ? approvalRows.filter((row) => row.pendingCount > 0)
            : (activeTab === 'disetujui'
                ? approvalRows.filter((row) => row.approvedCount > 0)
                : approvalRows);

        const totalHppPending = rowsToCount.reduce((total, row) => total + (row.pendingHpp || 0), 0);
        const totalHppApproved = rowsToCount.reduce((total, row) => total + (row.approvedHpp || 0), 0);
        const totalHppRows = rowsToCount.reduce((total, row) => total + (row.totalHpp || 0), 0);

        let activeHpp = totalHppRows;
        let activeHppLabel = 'Total HPP Selesai / Disetujui';
        let itemHeaderLabel = 'Item Terbuka';
        let totalItems = rowsToCount.reduce((total, row) => total + row.itemCount, 0);

        if (activeTab === 'menunggu') {
            activeHpp = waiting_requests_total_hpp ?? totalHppPending;
            activeHppLabel = 'HPP Perlu Diputuskan';
            itemHeaderLabel = 'Item Ditinjau';
            totalItems = rowsToCount.reduce(
                (total, row) => total + row.pendingCount,
                0
            );
        } else if (activeTab === 'disetujui') {
            activeHpp = approved_requests_total_hpp ?? totalHppApproved;
            activeHppLabel = 'Total HPP Disetujui';
            itemHeaderLabel = 'Item Disetujui';
            totalItems = rowsToCount.reduce(
                (total, row) => total + (row.approvedCount > 0 ? row.approvedCount : row.itemCount),
                0
            );
        } else if (activeTab === 'ditolak') {
            activeHpp = rejected_requests_total_hpp ?? totalHppRows;
            activeHppLabel = 'Total HPP Ditolak';
            itemHeaderLabel = 'Item Ditolak';
        }

        return {
            jobCount: rowsToCount.length,
            requestCount: rowsToCount.reduce(
                (total, row) => total + row.requests.length,
                0
            ),
            itemCount: totalItems,
            totalHppAll: all_requests_total_hpp ?? totalHppRows,
            totalHppDaftar: totalHppRows,
            totalHpp: totalHppPending > 0 ? totalHppPending : totalHppRows,
            activeHpp,
            activeHppLabel,
            itemHeaderLabel,
        };
    }, [approvalRows, activeTab, all_requests_total_hpp, waiting_requests_total_hpp, approved_requests_total_hpp, rejected_requests_total_hpp]);

    const renderApprovalCard = (row: ApprovalRow) => {
        const isWaitingView = activeTab === 'menunggu';
        const isApprovedView = activeTab === 'disetujui';

        const actionableRequests = row.requests.filter((request) =>
            (request.items || []).some(isPendingDirectorItem)
        );
        const approvedRequests = row.requests.filter((request) =>
            (request.items || []).some(isApprovedDirectorItem)
        );
        const displayedRequests = isWaitingView
            ? actionableRequests
            : (isApprovedView && approvedRequests.length > 0 ? approvedRequests : row.requests);

        const displayedItemCount = isWaitingView
            ? row.pendingCount
            : (isApprovedView ? row.approvedCount : row.itemCount);
        const displayedEvidenceCount = isWaitingView
            ? row.pendingEvidenceCount
            : (isApprovedView ? row.approvedEvidenceCount : row.evidenceCount);
        const displayedHpp = isWaitingView
            ? (row.pendingCount > 0 ? row.pendingHpp : row.totalHpp)
            : (isApprovedView ? row.approvedHpp : row.totalHpp);

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
                                const approvedItems = requestItems.filter(isApprovedDirectorItem);
                                const activeItems = isWaitingView
                                    ? pendingItems
                                    : (isApprovedView ? approvedItems : requestItems);
                                const requestItemCount = isWaitingView
                                    ? pendingItems.length
                                    : (isApprovedView ? approvedItems.length : requestItems.length);
                                const requestHpp = activeItems.reduce((total, item) => total + itemHppTotal(item), 0);

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
                                                {requestItemCount} item {isWaitingView ? 'menunggu keputusan' : (isApprovedView ? 'disetujui Direktur' : 'dalam pengajuan')}
                                            </p>
                                            {shipRequest.admin_forward_notes && (
                                                <p className="mt-1.5 rounded-lg bg-[#E0F0FF] px-2 py-1.5 text-[11px] leading-4 text-[#0B1F63] dark:bg-[#132847] dark:text-[#D8E7F6]">
                                                    <strong>Catatan Admin:</strong>{' '}
                                                    <span className="break-words">{shipRequest.admin_forward_notes}</span>
                                                </p>
                                            )}
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
                                {isApprovedView ? 'Total HPP Disetujui' : (isWaitingView && row.pendingCount > 0 ? 'Total HPP Perlu Ditinjau' : 'Total HPP Pengajuan')}
                            </p>
                            <p className="mt-0.5 font-mono text-base sm:text-lg font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                {formatCurrency(displayedHpp)}
                            </p>
                            {isWaitingView && row.pendingHpp > 0 && row.pendingHpp !== row.totalHpp && (
                                <p className="mt-0.5 text-[11px] font-bold text-[#0060F4] dark:text-[#60A5FA]">
                                    Perlu diputuskan: {formatCurrency(row.pendingHpp)}
                                </p>
                            )}
                            {isApprovedView && row.approvedHpp > 0 && row.approvedHpp !== row.totalHpp && (
                                <p className="mt-0.5 text-[11px] font-bold text-[#087443] dark:text-emerald-400">
                                    Dari total pengajuan: {formatCurrency(row.totalHpp)}
                                </p>
                            )}
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

            <MobilePageHero title="Persetujuan" description="Tinjau pengajuan yang memerlukan keputusan." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none md:dark:bg-transparent">
                <header className="hidden md:block">
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9]">
                        Persetujuan
                    </h1>
                    <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">
                        Pengajuan yang perlu ditinjau oleh Direktur.
                    </p>
                </header>

                <section
                    className="overflow-hidden rounded-2xl border border-[#0060F4]/30 bg-linear-to-br from-[#E0F0FF] via-white to-[#F0F8FF] shadow-[0_10px_30px_rgba(0,96,244,0.08)] dark:border-[#285585] dark:from-[#102B4A] dark:via-[#0C1D36] dark:to-[#071322]"
                    aria-labelledby="approval-queue-heading"
                >
                    <div className="flex flex-col gap-2.5 border-b border-[#BCE0FD] p-3.5 sm:p-4 dark:border-[#285585] sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 id="approval-queue-heading" className="text-sm sm:text-base font-extrabold text-[#0B1F63] dark:text-white">
                                    {activeTab === 'menunggu'
                                        ? 'Antrean Keputusan Direktur'
                                        : activeTab === 'disetujui'
                                            ? 'Rekap Pengajuan Disetujui Direktur'
                                            : activeTab === 'ditolak'
                                                ? 'Rekap Pengajuan Ditolak Direktur'
                                                : 'Rekap Seluruh Pengajuan Kapal'}
                                </h2>
                                <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                    {queueSummary.jobCount} Job {activeTab === 'disetujui' ? 'Disetujui' : activeTab === 'ditolak' ? 'Ditolak' : 'Aktif'}
                                </span>
                            </div>
                            <p className="mt-1 hidden max-w-3xl text-xs leading-relaxed text-[#52658E] dark:text-[#B5C8DC] sm:block">
                                {activeTab === 'menunggu'
                                    ? 'Pengajuan yang dikirim bersamaan dikelompokkan per job. Rincian setiap REQ tetap dipisahkan agar keputusan mudah diperiksa.'
                                    : activeTab === 'disetujui'
                                        ? 'Daftar job dan pengajuan yang telah disetujui Direktur dan siap diproses ke operasional/vendor invoice.'
                                        : 'Rincian pengajuan dan HPP per job untuk pengawasan Direktur.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#BCE0FD] bg-white px-2.5 py-1 text-xs font-bold text-[#0060F4] dark:border-[#285585] dark:bg-[#071322] dark:text-[#60A5FA]">
                                <Layers3 aria-hidden="true" className="size-3.5" />
                                {queueSummary.itemCount} item {activeTab === 'menunggu' ? 'menunggu' : activeTab === 'disetujui' ? 'disetujui' : ''}
                            </div>
                            {activeTab === 'menunggu' && capabilities.can_decide_items && queueSummary.jobCount > 1 && (
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

                    <dl className="grid grid-cols-2 gap-px bg-[#BCE0FD] dark:bg-[#285585] sm:grid-cols-3 lg:grid-cols-5">
                        <div className="bg-white/90 p-2.5 sm:p-3.5 dark:bg-[#0C1D36]/95">
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                {activeTab === 'disetujui' ? 'Job Disetujui' : activeTab === 'ditolak' ? 'Job Ditolak' : 'Job Aktif'}
                            </dt>
                            <dd className="mt-0.5 break-words font-mono text-sm sm:text-base font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                {queueSummary.jobCount}
                            </dd>
                        </div>
                        <div className="bg-white/90 p-2.5 sm:p-3.5 dark:bg-[#0C1D36]/95">
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                Surat Pengajuan
                            </dt>
                            <dd className="mt-0.5 break-words font-mono text-sm sm:text-base font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                {queueSummary.requestCount}
                            </dd>
                        </div>
                        <div className="bg-white/90 p-2.5 sm:p-3.5 dark:bg-[#0C1D36]/95">
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                {queueSummary.itemHeaderLabel}
                            </dt>
                            <dd className="mt-0.5 break-words font-mono text-sm sm:text-base font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                {queueSummary.itemCount}
                            </dd>
                        </div>
                        <div className="bg-[#EAF5FF] p-2.5 sm:p-3.5 dark:bg-[#102B4A]/95 col-span-2 sm:col-span-1 border-t sm:border-t-0 border-[#BCE0FD] dark:border-[#285585]">
                            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#0060F4] dark:text-[#60A5FA]">
                                Total HPP Semua Pengajuan
                            </dt>
                            <dd className="mt-0.5 break-words font-mono text-sm sm:text-base font-black tabular-nums text-[#082870] dark:text-white">
                                {formatCurrency(queueSummary.totalHppAll)}
                            </dd>
                        </div>
                        <div className="bg-white/90 p-2.5 sm:p-3.5 dark:bg-[#0C1D36]/95 col-span-2 sm:col-span-1">
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#52658E] dark:text-[#94A3B8]">
                                {queueSummary.activeHppLabel}
                            </dt>
                            <dd className="mt-0.5 break-words font-mono text-sm sm:text-base font-extrabold tabular-nums text-[#0B1F63] dark:text-white">
                                {formatCurrency(queueSummary.activeHpp)}
                            </dd>
                        </div>
                    </dl>
                </section>

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

                <section className="space-y-3" aria-label="Filter persetujuan">
                    <Card padding="md" className="shadow-xs">
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                {/* Search Input */}
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        visit(activeTab, search);
                                    }}
                                    className="relative flex-1"
                                >
                                    <Search
                                        aria-hidden="true"
                                        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8C9BB9]"
                                    />
                                    <input
                                        type="search"
                                        name="search"
                                        autoComplete="off"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Cari job, kapal, pengajuan, atau pembayaran…"
                                        aria-label="Cari persetujuan"
                                        className="w-full h-11 pl-10 pr-9 bg-[#F8FBFF] border border-[#DCEAF8] rounded-xl text-xs sm:text-sm font-semibold text-[#0B1F63] placeholder-[#8C9BB9] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/30 focus:border-[#0060F4] dark:bg-[#071322] dark:border-[#1E3A5F] dark:text-white"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                visit(activeTab, '');
                                            }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9BB9] hover:text-[#C62840]"
                                            aria-label="Hapus pencarian"
                                        >
                                            <X aria-hidden="true" className="size-4" />
                                        </button>
                                    )}
                                </form>

                                {/* Filter Trigger Button */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        type="button"
                                        variant={activeFilterCount > 0 ? 'primary' : 'outline'}
                                        onClick={() => {
                                            setModalCompanyId(companyId);
                                            setModalShipId(shipId);
                                            setModalJob(job);
                                            setModalStatus(status);
                                            setModalDateRange(dateRange);
                                            setIsFilterModalOpen(true);
                                        }}
                                        leftIcon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
                                        className="h-11 px-4 text-xs font-bold"
                                        aria-haspopup="dialog"
                                        aria-expanded={isFilterModalOpen}
                                    >
                                        <span>Filter</span>
                                        {activeFilterCount > 0 && (
                                            <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-white/25 text-[11px] font-black text-white dark:bg-black/30">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                    </Button>

                                    {hasActiveFilters && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={resetFilters}
                                            className="h-11 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                        >
                                            <RotateCcw aria-hidden="true" className="size-3.5 mr-1" />
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Active Filter Chips */}
                            {activeFilterCount > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60 text-xs">
                                    <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">Filter aktif:</span>
                                    {companyId && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                            Perusahaan: {companies.find((c) => c.id === companyId)?.name || companyId}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCompanyId('');
                                                    setShipId('');
                                                    applyFilters({ company_id: undefined, ship_id: undefined });
                                                }}
                                                className="hover:text-[#C62840]"
                                                aria-label="Hapus filter perusahaan"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                    {shipId && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                            Kapal: {ships.find((s) => s.id === shipId)?.name || shipId}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShipId('');
                                                    applyFilters({ ship_id: undefined });
                                                }}
                                                className="hover:text-[#C62840]"
                                                aria-label="Hapus filter kapal"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                    {job && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                            Job: {job}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setJob('');
                                                    applyFilters({ job: undefined });
                                                }}
                                                className="hover:text-[#C62840]"
                                                aria-label="Hapus filter job"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                    {status && status !== 'semua' && status !== 'menunggu' && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                            Status: {status === 'disetujui' ? 'Disetujui' : status === 'ditolak' ? 'Ditolak' : status}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStatus('menunggu');
                                                    applyFilters({ tab: 'menunggu' });
                                                }}
                                                className="hover:text-[#C62840]"
                                                aria-label="Hapus filter status"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                    {(dateRange.startDate || dateRange.endDate) && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                            Periode: {dateRange.startDate || '…'} s/d {dateRange.endDate || '…'}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDateRange({ startDate: '', endDate: '' });
                                                    applyFilters({ start_date: undefined, end_date: undefined });
                                                }}
                                                className="hover:text-[#C62840]"
                                                aria-label="Hapus filter tanggal"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>

                    <Tabs
                        items={[
                            { id: 'menunggu', label: 'Menunggu', count: counts.menunggu },
                            { id: 'disetujui', label: 'Disetujui', count: counts.disetujui },
                            // { id: 'ditolak', label: 'Ditolak', count: counts.ditolak },
                            { id: 'semua', label: 'Semua', count: counts.semua },
                        ]}
                        activeId={activeTab}
                        onChange={(value) => {
                            setStatus(value);
                            visit(value);
                        }}
                        ariaLabel="Filter status persetujuan"
                        className="rounded-t-2xl border-x border-t border-[#DCEAF8] dark:border-[#1E3A5F]"
                    />
                </section>

                <section className="space-y-3" aria-labelledby="approval-list-heading">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <h2 id="approval-list-heading" className="text-base font-extrabold text-[#0B1F63] dark:text-white">
                                Pengajuan per Job
                            </h2>
                            <p className="mt-0.5 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                Setiap kartu merangkum seluruh REQ dalam satu kegiatan kapal atau operasional.
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

                <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                    “Baru” hanya tampil pada status yang membutuhkan tindakan role Anda.
                </p>
            </div>

            {/* Floating approval bar on mobile positioned above the bottom navigation */}
            {activeTab === 'menunggu' && capabilities.can_decide_items && queueSummary.itemCount > 0 && (
                <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 sm:hidden">
                    <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#BCE0FD] bg-white/95 p-2.5 shadow-[0_8px_24px_rgba(0,96,244,0.18)] backdrop-blur-md dark:border-[#285585] dark:bg-[#0C1D36]/95">
                        <div className="flex min-w-0 items-center gap-2 pl-2 text-xs font-extrabold text-[#0060F4] dark:text-[#60A5FA]">
                            <Layers3 aria-hidden="true" className="size-4 shrink-0" />
                            <span className="truncate">{queueSummary.itemCount} item menunggu</span>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            leftIcon={<CheckCircle2 aria-hidden="true" className="size-4" />}
                            disabled={approvingJobKey !== null}
                            onClick={() => {
                                if (queueSummary.jobCount > 1) {
                                    openBatchApprovalSelection();
                                } else if (approvalRows.length > 0) {
                                    openApprovalSelection(approvalRows[0]);
                                }
                            }}
                            className="shrink-0 bg-[#0060F4] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#0050D0]"
                        >
                            Setujui Pengajuan
                        </Button>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={isApprovalSelectionOpen}
                title={isBatchApprovalOpen ? 'Pilih Item dari Beberapa Job' : 'Pilih Item yang Disetujui'}
                description={isBatchApprovalOpen
                    ? 'Pilih item secara kondisional dari beberapa kapal. Job tanpa item terpilih tetap menunggu keputusan Direktur.'
                    : 'Setiap item diputuskan terpisah. Item yang tidak dipilih otomatis kembali ke Admin untuk ditinjau dan diajukan ulang.'}
                confirmLabel={isBatchApprovalOpen
                    ? `Setujui Pengajuan (${selectedApprovalItems.length} Item · ${selectedApprovalJobKeys.size} Job)`
                    : `Setujui Pengajuan (${selectedApprovalItems.length} Item)`}
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
                        {Object.keys(approvalErrors).length > 0 && (
                            <FormErrorSummary errors={approvalErrors} />
                        )}
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
                                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                    <span className="break-all font-mono text-[10px] font-semibold text-[#0060F4]">
                                                                        {requestNumber}
                                                                    </span>
                                                                    <ItemSubmissionHistoryBadge item={item} />
                                                                </div>
                                                                <span className="mt-1 block break-words text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                                    {item.vendor?.name || 'Tanpa vendor/supplier'} · Qty {item.quantity}
                                                                    {item.supplier_invoice_number
                                                                        ? ` · ${item.supplier_invoice_number}`
                                                                        : ''}
                                                                </span>
                                                                {item.surplus_amount && Number(item.surplus_amount) > 0 && (
                                                                    <span className="mt-1.5 block rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] leading-tight text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                                                        🔄 Dialihkan <strong>{formatCurrency(Number(item.surplus_amount))}</strong> dari item <strong>{item.surplus_source_item_name || 'lain'}</strong>.
                                                                        {item.original_hpp_price && Number(item.original_hpp_price) > Number(item.hpp_price) && (
                                                                            <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400">
                                                                                (Total Nota: {formatCurrency(Number(item.original_hpp_price))})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </label>

                                                        <div className="mt-2 border-t border-[#DCEAF8]/80 pt-2 dark:border-[#1E3A5F]/80 sm:pl-8">
                                                            {item.supplier_invoice_url ? (
                                                                <FileViewerTrigger
                                                                    url={`${item.supplier_invoice_url}?view=1`}
                                                                    downloadUrl={`${item.supplier_invoice_url}?download=1`}
                                                                    title={`Bukti Invoice Supplier: ${item.item_name || 'Item Pengajuan'}${item.supplier_invoice_number ? ` (${item.supplier_invoice_number})` : ''}`}
                                                                    fileType={item.supplier_invoice_is_image ? 'image' : undefined}
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
                                                                </FileViewerTrigger>
                                                            ) : item.attachment_url ? (
                                                                <FileViewerTrigger
                                                                    url={`${item.attachment_url}?view=1`}
                                                                    downloadUrl={`${item.attachment_url}?download=1`}
                                                                    title={`Bukti Upload: ${item.item_name || 'Item Pengajuan'}`}
                                                                    fileType={item.attachment_is_image ? 'image' : undefined}
                                                                    aria-label={`Buka bukti upload untuk ${item.item_name || 'item pengajuan'}`}
                                                                    className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-bold text-amber-700 hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 sm:w-auto"
                                                                >
                                                                    <FileText aria-hidden="true" className="size-3.5" />
                                                                    Bukti upload
                                                                    <ExternalLink aria-hidden="true" className="size-3" />
                                                                </FileViewerTrigger>
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

            {/* Modal Filter */}
            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter Pengajuan & Persetujuan"
                subtitle="Sesuaikan kriteria filter untuk mempersempit daftar persetujuan."
                size="lg"
                asBottomSheetOnMobile
                footer={(
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between w-full gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setModalCompanyId('');
                                setModalShipId('');
                                setModalJob('');
                                setModalStatus('menunggu');
                                setModalDateRange({ startDate: '', endDate: '' });
                            }}
                            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                        >
                            <RotateCcw aria-hidden="true" className="size-3.5 mr-1.5" />
                            Reset Pilihan
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsFilterModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => {
                                    setCompanyId(modalCompanyId);
                                    setShipId(modalShipId);
                                    setJob(modalJob);
                                    setStatus(modalStatus);
                                    setDateRange(modalDateRange);
                                    setIsFilterModalOpen(false);
                                    applyFilters({
                                        tab: modalStatus,
                                        company_id: modalCompanyId || undefined,
                                        ship_id: modalShipId || undefined,
                                        job: modalJob || undefined,
                                        start_date: modalDateRange.startDate || undefined,
                                        end_date: modalDateRange.endDate || undefined,
                                    });
                                }}
                            >
                                Terapkan Filter
                            </Button>
                        </div>
                    </div>
                )}
            >
                <div className="space-y-4 py-1">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SelectSearch
                            label="Perusahaan Pelayaran"
                            value={modalCompanyId}
                            onChange={(value) => {
                                setModalCompanyId(String(value || ''));
                                setModalShipId('');
                            }}
                            options={companyOptions}
                            placeholder="Pilih Perusahaan"
                            searchPlaceholder="Cari perusahaan…"
                        />
                        <SelectSearch
                            label="Armada Kapal"
                            value={modalShipId}
                            onChange={(value) => setModalShipId(String(value || ''))}
                            options={modalShipOptions}
                            placeholder="Pilih Kapal"
                            searchPlaceholder="Cari kapal…"
                        />
                        <SelectSearch
                            label="Nomor Job / Port Call"
                            value={modalJob}
                            onChange={(value) => setModalJob(String(value || ''))}
                            options={modalJobOptions}
                            placeholder="Pilih Job"
                            searchPlaceholder="Cari nomor job…"
                        />
                        <SelectSearch
                            label="Status Persetujuan"
                            value={modalStatus}
                            onChange={(value) => setModalStatus(String(value || 'menunggu'))}
                            options={statusOptions}
                            placeholder="Pilih Status"
                        />
                        <div className="space-y-1.5 text-left sm:col-span-2">
                            <p className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Periode Tanggal</p>
                            <DateRangePicker
                                value={modalDateRange}
                                onChange={setModalDateRange}
                                placeholder="Pilih Rentang Tanggal"
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
