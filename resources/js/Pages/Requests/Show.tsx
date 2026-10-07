import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    Anchor,
    ArrowLeft,
    Building2,
    CalendarDays,
    Check,
    CheckCircle2,
    CirclePause,
    CircleX,
    Clock,
    Copy,
    DollarSign,
    ExternalLink,
    FileCheck2,
    FileText,
    Flame,
    Layers,
    LockKeyhole,
    MapPin,
    PackagePlus,
    Plus,
    RotateCcw,
    Save,
    Send,
    Ship as ShipIcon,
    Tag,
    UserRound,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import { playSjaChime } from '../../Components/feedback/AudioNotification';
import Modal from '../../Components/overlays/Modal';
import { formatRupiahInput, normalizeRupiahInput } from '../../Components/forms/MoneyInput';
import RequestWorkflowPanel from '../../Components/RequestWorkflowPanel';
import Table from '../../Components/tables/Table';
import ShipImage from '../../Components/vessels/ShipImage';
import type { PageProps } from '../../types';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Input from '../../Components/forms/Input';
import Textarea from '../../Components/forms/Textarea';
import Checkbox from '../../Components/forms/Checkbox';
import Select from '../../Components/selects/Select';

interface ProductOption {
    id: string;
    code: string;
    name: string;
    unit: string;
    item_type: 'jasa' | 'non_jasa';
    selling_price_default: number | string;
    hpp_default: number | string;
}

interface RequestItem {
    id: string;
    item_name: string;
    unit?: string;
    quantity: number | string;
    hpp_price?: number | string;
    selling_price?: number | string;
    status: string;
    director_status?: string;
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
    invoices: Array<{
        id: string;
        invoice_number: string;
        invoice_type: string;
        grand_total: number | string;
        status: string;
    }>;
}

interface RequestShowProps {
    job?: JobInfo;
    requests?: ShipRequest[];
    request?: ShipRequest;
    products: ProductOption[];
    capabilities: {
        can_review_prices: boolean;
        can_decide_items: boolean;
        can_view_hpp: boolean;
        can_create_requests: boolean;
        can_process_requests: boolean;
    };
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

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatEtaDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const day = d.getDate().toString().padStart(2, '0');
        const month = MONTHS_ID[d.getMonth()] || '-';
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');

        if (hours === '00' && minutes === '00') {
            return `${day} ${month} ${year}  --:--`;
        }

        return `${day} ${month} ${year}  ${hours}:${minutes}`;
    } catch {
        return dateStr;
    }
};

const getEtaParts = (dateStr?: string | null): { date: string; time: string } => {
    if (!dateStr) return { date: 'Belum ditentukan', time: '--:--' };
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: dateStr, time: '' };

        const day = d.getDate().toString().padStart(2, '0');
        const month = MONTHS_ID[d.getMonth()] || '-';
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');

        return {
            date: `${day} ${month} ${year}`,
            time: `${hours}:${minutes}`,
        };
    } catch {
        return { date: dateStr || '-', time: '' };
    }
};

const renderVesselStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('anchor') || s.includes('labuh')) {
        return (
            <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#D97706] shadow-2xs">
                Labuh
            </span>
        );
    }
    if (s.includes('berth') || s.includes('sandar')) {
        return (
            <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#DCF7E8] text-[#087443] shadow-2xs">
                Sandar
            </span>
        );
    }
    if (s.includes('sched') || s.includes('datang') || s.includes('akan')) {
        return (
            <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#E0F0FF] text-[#0060F4] shadow-2xs">
                Akan Datang
            </span>
        );
    }
    if (s.includes('depart') || s.includes('selesai') || s.includes('finish')) {
        return (
            <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#F1F5F9] text-[#64748B] shadow-2xs">
                Selesai
            </span>
        );
    }
    return (
        <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#E0F0FF] text-[#0060F4] shadow-2xs">
            {status || 'Labuh'}
        </span>
    );
};

const formatServiceType = (type?: string): string => {
    if (!type) return 'Layanan Umum';
    switch (type.toLowerCase()) {
        case 'clearance_in':
            return 'Clearance In (Kedatangan)';
        case 'clearance_out':
            return 'Clearance Out (Keberangkatan)';
        case 'sandar':
            return 'Pelayanan Sandar Kapal';
        case 'labuh':
            return 'Pelayanan Labuh Kapal';
        case 'kebutuhan_kapal':
            return 'Logistik Kebutuhan Kapal';
        default:
            return type
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (char) => char.toUpperCase());
    }
};

function DirectorStatus({ status, itemStatus }: { status?: string; itemStatus?: string }) {
    const normalized = status === 'approved' || status === 'rejected' ? status : 'pending';

    if (normalized === 'approved') {
        return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-[#DCF7E8] px-2.5 py-1 text-xs font-bold text-[#087443] dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Disetujui
            </span>
        );
    }

    if (normalized === 'rejected') {
        return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-rose-200 bg-[#FFE7EC] px-2.5 py-1 text-xs font-bold text-[#C62840] dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                <span className="size-1.5 rounded-full bg-rose-500" />
                Ditolak
            </span>
        );
    }

    const label = itemStatus === 'diajukan_ke_direktur' ? 'Review Direktur' : 'Menunggu Review';

    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-[#FFF0CC] px-2.5 py-1 text-xs font-bold text-[#A65300] dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            {label}
        </span>
    );
}

type DirectorDecision = 'approved' | 'pending' | 'rejected';

interface PriceDraft {
    hpp_price: string;
    selling_price: string;
}

interface DecisionDraft {
    status: DirectorDecision;
    director_notes: string;
}

interface DesktopRequestItemRow {
    request: ShipRequest;
    item: RequestItem;
    needsAttention: boolean;
    isFirstForRequest: boolean;
    updatedAt: number;
}

export default function RequestShow({
    job,
    requests = [],
    request: initialRequest,
    products,
    capabilities,
}: RequestShowProps) {
    const { auth, errors } = usePage<PageProps>().props;

    const allRequests = useMemo(() => {
        if (requests && requests.length > 0) return requests;
        if (initialRequest) return [initialRequest];
        return [];
    }, [requests, initialRequest]);

    const currentJob = job || allRequests[0]?.port_call;
    const currentShip = currentJob?.ship || allRequests[0]?.ship;
    const currentPort = currentJob?.port || allRequests[0]?.port;
    const currentCompany = currentJob?.ship?.company || currentShip?.company || allRequests[0]?.company;

    const jobNumber = currentJob?.job_number || 'JOB Kegiatan';
    const shipName = currentShip?.name ?? allRequests[0]?.ship?.name ?? 'Kapal Belum Ditentukan';
    const shipImage = currentShip?.image ?? allRequests[0]?.ship?.image ?? null;
    const imoNumber = currentShip?.imo_number ?? allRequests[0]?.ship?.imo_number ?? '-';
    const shipType = currentShip?.ship_type ?? allRequests[0]?.ship?.ship_type ?? '-';
    const companyName = currentCompany?.name ?? allRequests[0]?.company?.name ?? allRequests[0]?.ship?.company?.name ?? '-';
    const portName = currentPort?.name ?? allRequests[0]?.port?.name ?? '-';

    const canUseAdminActions = capabilities.can_review_prices;

    // Track selected items per request for forward-to-director
    const [selectedItemIdsByReq, setSelectedItemIdsByReq] = useState<Record<string, string[]>>({});
    // Track price drafts per item
    const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});
    // Track director decision drafts per item
    const [decisionDrafts, setDecisionDrafts] = useState<Record<string, DecisionDraft>>({});

    const [savingItemId, setSavingItemId] = useState<string | null>(null);
    const [savingReqId, setSavingReqId] = useState<string | null>(null);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [priceValidationErrors, setPriceValidationErrors] = useState<string[]>([]);

    // Modals
    const [addItemTargetReqId, setAddItemTargetReqId] = useState<string | null>(null);
    const [revisionTarget, setRevisionTarget] = useState<{ requestId: string; item: RequestItem } | null>(null);
    const [revisionReason, setRevisionReason] = useState('');
    const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

    // Initialize drafts from items
    useEffect(() => {
        const drafts: Record<string, PriceDraft> = {};
        const decisions: Record<string, DecisionDraft> = {};
        const selected: Record<string, string[]> = {};

        allRequests.forEach((req) => {
            const isReqActive = !['Dalam Proses', 'Selesai', 'Dibatalkan'].includes(req.status);
            const editableIds: string[] = [];
            (req.items || []).forEach((item) => {
                drafts[item.id] = {
                    hpp_price: normalizeRupiahInput(item.hpp_price ?? 0),
                    selling_price: normalizeRupiahInput(item.selling_price ?? 0),
                };
                if (
                    isReqActive &&
                    item.director_status !== 'approved' &&
                    item.status !== 'diajukan_ke_direktur' &&
                    !item.is_invoiced
                ) {
                    editableIds.push(item.id);
                }
                if (item.status === 'diajukan_ke_direktur' && item.director_status === 'pending') {
                    decisions[item.id] = {
                        status: 'pending' as DirectorDecision,
                        director_notes: item.director_notes ?? '',
                    };
                }
            });
            selected[req.id] = editableIds;
        });

        setPriceDrafts(drafts);
        setDecisionDrafts(decisions);
        setSelectedItemIdsByReq(selected);
    }, [allRequests]);

    const itemForm = useForm({
        product_id: '',
        item_name: '',
        quantity: '1',
        unit: 'Dokumen',
        notes: '',
        is_urgent: false,
    });

    const selectProduct = (productId: string) => {
        const product = products.find((item) => item.id === productId);
        itemForm.setData((current) => ({
            ...current,
            product_id: productId,
            item_name: product?.name ?? current.item_name,
            unit: product?.unit ?? current.unit,
        }));
    };

    const submitItem = (event: FormEvent) => {
        event.preventDefault();
        if (!addItemTargetReqId) return;

        itemForm.post(route('requests.items.store', addItemTargetReqId), {
            preserveScroll: true,
            onSuccess: () => {
                itemForm.reset();
                setAddItemTargetReqId(null);
                playSjaChime('success');
            },
        });
    };

    const handleSaveItemPrice = (requestId: string, itemId: string) => {
        const draft = priceDrafts[itemId];
        if (!draft) return;

        setSavingItemId(itemId);
        router.post(
            route('requests.items.update-price', [requestId, itemId]),
            {
                hpp_price: parseFloat(draft.hpp_price) || 0,
                selling_price: parseFloat(draft.selling_price) || 0,
            },
            {
                preserveScroll: true,
                onFinish: () => setSavingItemId(null),
            }
        );
    };

    const handleSaveAllPricesForReq = (req: ShipRequest) => {
        const editableItems = (req.items || []).filter(
            (it) => it.director_status !== 'approved' && it.status !== 'diajukan_ke_direktur' && !it.is_invoiced
        );
        const itemsToSave = editableItems.map((item) => ({
            id: item.id,
            hpp_price: parseFloat(priceDrafts[item.id]?.hpp_price ?? String(item.hpp_price)) || 0,
            selling_price: parseFloat(priceDrafts[item.id]?.selling_price ?? String(item.selling_price)) || 0,
        }));

        if (itemsToSave.length === 0) return;

        setSavingReqId(req.id);
        router.post(
            route('requests.items.batch-update-prices'),
            { items: itemsToSave },
            {
                preserveScroll: true,
                onFinish: () => setSavingReqId(null),
            }
        );
    };

    const allEditableItemsAcrossJob = useMemo(() => {
        const list: { requestId: string; item: RequestItem }[] = [];
        allRequests.forEach((req) => {
            if (!['Dalam Proses', 'Selesai', 'Dibatalkan'].includes(req.status)) {
                (req.items || []).forEach((it) => {
                    if (it.director_status !== 'approved' && it.status !== 'diajukan_ke_direktur' && !it.is_invoiced) {
                        list.push({ requestId: req.id, item: it });
                    }
                });
            }
        });
        return list;
    }, [allRequests]);

    const validSelectedItemsAcrossJob = useMemo(() => {
        return allEditableItemsAcrossJob.filter(({ requestId, item }) => {
            return (selectedItemIdsByReq[requestId] || []).includes(item.id);
        });
    }, [allEditableItemsAcrossJob, selectedItemIdsByReq]);

    const totalSelectedCount = validSelectedItemsAcrossJob.length;

    const desktopRows = useMemo<DesktopRequestItemRow[]>(() => {
        const rows = allRequests.flatMap((req) => {
            const requestIsActive = !['Dalam Proses', 'Selesai', 'Dibatalkan'].includes(req.status);

            return (req.items || []).map((item) => {
                const isEditable =
                    requestIsActive &&
                    item.director_status !== 'approved' &&
                    item.status !== 'diajukan_ke_direktur' &&
                    !item.is_invoiced;
                const needsAttention = capabilities.can_decide_items
                    ? item.status === 'diajukan_ke_direktur' && item.director_status === 'pending'
                    : canUseAdminActions
                      ? isEditable ||
                        (item.director_status === 'approved' &&
                            ['Disetujui', 'Disetujui Sebagian'].includes(req.status)) ||
                        item.director_status === 'rejected'
                      : capabilities.can_create_requests && item.director_status === 'rejected';
                const updatedAt = Math.max(
                    0,
                    ...[item.updated_at, item.created_at, req.updated_at, req.created_at]
                        .map((value) => (value ? Date.parse(value) : 0))
                        .filter((value) => !Number.isNaN(value))
                );

                return {
                    request: req,
                    item,
                    needsAttention,
                    isFirstForRequest: false,
                    updatedAt,
                };
            });
        });

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
    }, [allRequests, canUseAdminActions, capabilities.can_create_requests, capabilities.can_decide_items]);

    const isAllSelectedAcrossJob =
        allEditableItemsAcrossJob.length > 0 &&
        totalSelectedCount === allEditableItemsAcrossJob.length;

    const isIndeterminateAcrossJob =
        totalSelectedCount > 0 &&
        totalSelectedCount < allEditableItemsAcrossJob.length;

    const handleToggleSelectAllAcrossJob = () => {
        const next: Record<string, string[]> = {};
        allRequests.forEach((r) => {
            next[r.id] = [];
        });

        if (!isAllSelectedAcrossJob) {
            allEditableItemsAcrossJob.forEach(({ requestId, item }) => {
                if (!next[requestId]) {
                    next[requestId] = [];
                }
                next[requestId].push(item.id);
            });
        }

        setSelectedItemIdsByReq(next);
    };

    const handleBatchForwardAllToDirector = () => {
        if (validSelectedItemsAcrossJob.length === 0) return;

        // Validasi: pastikan setiap item yang diajukan sudah memiliki HPP dan Harga Jual > 0
        const zeroPriceItems = validSelectedItemsAcrossJob.filter(({ item }) => {
            const hpp = parseFloat(priceDrafts[item.id]?.hpp_price ?? String(item.hpp_price ?? 0)) || 0;
            const selling = parseFloat(priceDrafts[item.id]?.selling_price ?? String(item.selling_price ?? 0)) || 0;
            return hpp <= 0 || selling <= 0;
        });

        if (zeroPriceItems.length > 0) {
            playSjaChime('alert');
            const msgs = zeroPriceItems.map(({ item, requestId }) => {
                const req = allRequests.find((r) => r.id === requestId);
                return `Item "${item.item_name}" (${req?.request_number || 'Pengajuan'}) belum memiliki harga HPP atau Harga Jual (> Rp 0). Harap lengkapi harga terlebih dahulu sebelum diajukan ke Direktur.`;
            });
            setPriceValidationErrors(msgs);
            return;
        }

        setPriceValidationErrors([]);

        const allSelectedIds = validSelectedItemsAcrossJob.map(({ item }) => item.id);

        router.post(
            route('requests.batch-forward-director'),
            {
                selected_items: allSelectedIds,
                item_prices: allSelectedIds.map((itemId) => ({
                    id: itemId,
                    hpp_price: parseFloat(priceDrafts[itemId]?.hpp_price ?? '0') || 0,
                    selling_price: parseFloat(priceDrafts[itemId]?.selling_price ?? '0') || 0,
                })),
                admin_notes: 'Pengajuan sekaligus seluruh item kebutuhan kapal kepada Direktur.',
            },
            {
                preserveScroll: true,
                onStart: () => setActiveAction('batch-forward-all'),
                onSuccess: () => playSjaChime('success'),
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const handleSaveAllPricesAcrossJob = () => {
        if (allEditableItemsAcrossJob.length === 0) return;

        const itemsToSave = allEditableItemsAcrossJob.map(({ item }) => ({
            id: item.id,
            hpp_price: parseFloat(priceDrafts[item.id]?.hpp_price ?? String(item.hpp_price)) || 0,
            selling_price: parseFloat(priceDrafts[item.id]?.selling_price ?? String(item.selling_price)) || 0,
        }));

        setActiveAction('batch-save-all');
        router.post(
            route('requests.items.batch-update-prices'),
            { items: itemsToSave },
            {
                preserveScroll: true,
                onSuccess: () => playSjaChime('success'),
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const totalUrgentCount = useMemo(() => {
        return allRequests.reduce((sum, req) => {
            return sum + (req.items || []).filter((it) => it.is_urgent).length;
        }, 0);
    }, [allRequests]);

    const submitAdminReview = (reqId: string) => {
        const req = allRequests.find((r) => r.id === reqId);
        if (!req) return;

        const selectedIds = selectedItemIdsByReq[reqId] || [];
        if (selectedIds.length === 0) return;

        const reqItems = req.items || [];
        const selectedItems = reqItems.filter((it) => selectedIds.includes(it.id));

        // Validasi: pastikan setiap item yang diajukan sudah memiliki HPP dan Harga Jual > 0
        const zeroPriceItems = selectedItems.filter((item) => {
            const hpp = parseFloat(priceDrafts[item.id]?.hpp_price ?? String(item.hpp_price ?? 0)) || 0;
            const selling = parseFloat(priceDrafts[item.id]?.selling_price ?? String(item.selling_price ?? 0)) || 0;
            return hpp <= 0 || selling <= 0;
        });

        if (zeroPriceItems.length > 0) {
            playSjaChime('alert');
            const msgs = zeroPriceItems.map(
                (item) => `Item "${item.item_name}" pada pengajuan ${req.request_number} belum memiliki harga HPP atau Harga Jual (> Rp 0). Harap lengkapi harga terlebih dahulu sebelum diajukan ke Direktur.`
            );
            setPriceValidationErrors(msgs);
            return;
        }

        setPriceValidationErrors([]);

        router.post(
            route('requests.forward-director', reqId),
            {
                selected_items: selectedIds,
                item_prices: selectedIds.map((itemId) => ({
                    id: itemId,
                    hpp_price: parseFloat(priceDrafts[itemId]?.hpp_price ?? '0') || 0,
                    selling_price: parseFloat(priceDrafts[itemId]?.selling_price ?? '0') || 0,
                })),
                admin_notes: 'Harga telah ditinjau dan item terpilih diajukan.',
            },
            {
                preserveScroll: true,
                onStart: () => setActiveAction(`forward-${reqId}`),
                onSuccess: () => playSjaChime('success'),
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const submitDirectorDecisions = (reqId: string, forwardedItems: RequestItem[]) => {
        if (forwardedItems.length === 0) return;

        router.post(
            route('approvals.requests.item-decision', reqId),
            {
                decisions: forwardedItems.map((item) => ({
                    item_id: item.id,
                    status: decisionDrafts[item.id]?.status ?? 'pending',
                    director_notes: decisionDrafts[item.id]?.director_notes ?? '',
                })),
            },
            {
                preserveScroll: true,
                onStart: () => setActiveAction(`director-${reqId}`),
                onSuccess: () => playSjaChime('success'),
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const submitRevision = () => {
        if (!revisionTarget || !revisionReason.trim()) return;

        router.post(
            route('requests.items.revision', [revisionTarget.requestId, revisionTarget.item.id]),
            { reason: revisionReason },
            {
                preserveScroll: true,
                onStart: () => setActiveAction('revision'),
                onSuccess: () => {
                    setRevisionTarget(null);
                    setRevisionReason('');
                    playSjaChime('success');
                },
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const handleCopy = (numberStr: string) => {
        navigator.clipboard.writeText(numberStr);
        setCopiedNumber(numberStr);
        playSjaChime('info');
        setTimeout(() => setCopiedNumber(null), 2000);
    };

    const runAction = (name: string, url: string, data: Parameters<typeof router.post>[1] = {}) => {
        router.post(url, data, {
            preserveScroll: true,
            onStart: () => setActiveAction(name),
            onFinish: () => setActiveAction(null),
        });
    };

    return (
        <AppLayout
            title={`Job ${jobNumber} — ${shipName}`}
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title={`${jobNumber} • ${shipName} — Detail Kegiatan Kapal & Pengajuan`} />

            {/* ═══════════════════════════════════════════════════════════════
                MOBILE VIEW (< md): EXACT MATCH TO Vessels/Show.tsx
               ═══════════════════════════════════════════════════════════════ */}
            {/* Ship Hero Photo sits behind the shared transparent mobile navbar */}
            <div className="relative h-52 w-full overflow-hidden bg-[#DCEAF8] md:hidden">
                <ShipImage
                    src={shipImage}
                    alt={shipName}
                    width={1280}
                    height={720}
                    fetchPriority="high"
                    className="size-full object-cover"
                />
                <div className="absolute bottom-3 right-3 z-10">
                    {renderVesselStatusBadge(currentJob?.status || 'Labuh')}
                </div>
            </div>

            {/* Mobile Top Header Bar matching Vessels/Show */}
            <div
                className={
                    'sticky top-16 z-20 bg-white dark:bg-[#0C1D36] ' +
                    'px-4 py-2 flex items-center justify-between ' +
                    'border-b border-[#DCEAF8] dark:border-[#1E3A5F] md:hidden'
                }
            >
                <Link
                    href={route('requests.index')}
                    className="-ml-2 flex size-11 items-center justify-center rounded-full text-[#082870] transition-colors hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-white dark:hover:bg-[#152E52]"
                    aria-label="Kembali ke Daftar Pengajuan"
                >
                    <svg
                        aria-hidden="true"
                        className="size-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </Link>

                <h1 className="text-center text-sm font-bold text-[#082870] dark:text-white truncate px-2 flex-1">
                    {shipName}
                </h1>

                <div className="flex items-center gap-1.5 shrink-0">
                    {currentJob?.work_order?.system_number && (
                        <Link
                            href={route('work-orders.detail', currentJob.work_order.id)}
                            prefetch
                            aria-label={`Buka SPK ${currentJob.work_order.system_number}`}
                            className="flex size-9 items-center justify-center rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] text-[#0060F4] hover:bg-[#E0F0FF] dark:border-[#1E3A5F] dark:bg-[#132847] dark:text-[#60A5FA]"
                        >
                            <FileText aria-hidden="true" className="size-4" />
                        </Link>
                    )}
                    {capabilities.can_create_requests && (
                        <Link
                            href={route('requests.create')}
                            prefetch
                            aria-label="Buat pengajuan baru"
                            className="flex size-9 items-center justify-center rounded-xl bg-[#0060F4] text-white shadow-xs hover:bg-[#082870]"
                        >
                            <Plus aria-hidden="true" className="size-4" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Mobile Continuous Seamless Content Surface */}
            <div className="bg-white dark:bg-[#0C1D36] pb-3 md:hidden">
                {/* Ship Name & Subtitle Card */}
                <div className="px-4 pt-4 pb-3 border-b border-[#E2EEF9] dark:border-[#1E3A5F]">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl font-extrabold text-[#082870] dark:text-white leading-tight break-words">
                                {shipName}
                            </h2>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-0.5 break-words">
                                {companyName || 'Perusahaan belum diisi'} {imoNumber ? `• IMO ${imoNumber}` : ''}
                            </p>
                        </div>
                        <span className="font-mono text-xs font-black text-[#0060F4] bg-[#E0F0FF] dark:bg-[#132847] dark:text-[#60A5FA] px-2.5 py-1 rounded-lg shrink-0">
                            {jobNumber}
                        </span>
                    </div>

                    {/* 3 Pills: ETA | PELABUHAN | SPK */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3.5">
                        {(() => {
                            const etaParts = getEtaParts(currentJob?.eta_at || allRequests[0]?.request_date);
                            return (
                                <>
                                    <div className="p-2.5 rounded-xl bg-[#F0F8FF] dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center">
                                        <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] font-bold uppercase block tracking-wider">
                                            ETA
                                        </span>
                                        <span className="font-bold text-[#082870] dark:text-white block mt-1 leading-tight text-[11px] break-words">
                                            {etaParts.date}
                                        </span>
                                        <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] block mt-0.5 font-medium">
                                            {etaParts.time || '-'}
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-[#F0F8FF] dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center">
                                        <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] font-bold uppercase block tracking-wider">
                                            PELABUHAN
                                        </span>
                                        <span className="font-bold text-[#082870] dark:text-white block mt-1 leading-tight text-[10.5px] break-words">
                                            {portName}
                                        </span>
                                        <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] block mt-0.5 font-medium">
                                            {currentPort?.code ? `Kode: ${currentPort.code}` : 'Kode belum tersedia'}
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-[#F0F8FF] dark:bg-[#071322] border border-[#DCEAF8] dark:border-[#1E3A5F] flex flex-col justify-center">
                                        <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] font-bold uppercase block tracking-wider">
                                            SPK
                                        </span>
                                        <span className="block break-words font-mono text-[9.5px] font-bold leading-tight text-[#082870] dark:text-white">
                                            {currentJob?.work_order?.system_number || '-'}
                                        </span>
                                        <span className="text-[10px] text-[#52658E] dark:text-[#94A3B8] block mt-0.5 font-medium">
                                            {currentShip?.call_sign ? `Call: ${currentShip.call_sign}` : 'Call sign belum tersedia'}
                                        </span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>

            <div className="mx-auto w-full max-w-full space-y-5 bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] sm:px-6 md:bg-transparent md:pt-6 md:dark:bg-transparent lg:px-8">
                {/* Desktop Navigation and Top Action Bar (hidden md:flex) */}
                <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={route('requests.index')}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-[#52658E] shadow-sm ring-1 ring-[#DCEAF8] transition hover:bg-[#F0F8FF] hover:text-[#0060F4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:bg-[#0C1D36] dark:text-[#94A3B8] dark:ring-[#1E3A5F] dark:hover:bg-[#132847] dark:hover:text-[#38BDF8]"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Kembali ke daftar kegiatan kapal
                    </Link>

                    <div className="flex flex-wrap items-center gap-2">
                        {currentJob?.work_order?.system_number && (
                            <Link
                                href={route('work-orders.index', { search: currentJob.work_order.system_number })}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#DCEAF8] bg-white px-3 text-xs font-bold text-[#0B1F63] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                            >
                                <FileText className="size-3.5 text-[#0060F4]" />
                                SPK {currentJob.work_order.system_number}
                                <ExternalLink className="size-3 text-[#52658E]" />
                            </Link>
                        )}

                        {capabilities.can_create_requests && (
                            <Link
                                href={route('requests.create')}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#0060F4] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#082870] active:scale-[0.99]"
                            >
                                <Plus className="size-3.5" />
                                <span>Buat Pengajuan Baru</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Desktop Overview Card (hidden md:block) */}
                <Card className="hidden md:block overflow-hidden border-[#DCEAF8] shadow-sm dark:border-[#1E3A5F]" padding="none">
                    <div className="p-5 sm:p-6 bg-gradient-to-r from-[#F0F8FF] via-white to-[#F0F8FF]/50 dark:from-[#071322] dark:via-[#0C1D36] dark:to-[#071322]">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 space-y-2.5">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#BCE0FD] bg-[#E0F0FF] px-3 py-1 font-mono text-xs font-extrabold text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#132847] dark:text-[#60A5FA]">
                                        <Layers className="size-3.5 text-[#0060F4] dark:text-[#60A5FA]" />
                                        <span>{jobNumber}</span>
                                    </span>

                                    {currentJob?.status && (
                                        <StatusBadge
                                            status={currentJob.status}
                                            label={`Job: ${currentJob.status}`}
                                            showDot
                                            size="sm"
                                        />
                                    )}

                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                                        <Anchor className="size-3 text-blue-600 dark:text-blue-400" />
                                        {portName}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <h1 className="text-balance text-2xl font-black tracking-tight text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">
                                        {shipName}
                                    </h1>
                                    <p className="max-w-2xl text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">
                                        Kegiatan pelayanan keagenan dan logistik operasional kapal PT Samudra Jaya Andalas.
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
                                value: currentJob?.eta_at ? formatDateTime(currentJob.eta_at) : (allRequests[0] ? formatDateTime(allRequests[0].request_date) : '-'),
                                sub: currentJob?.etd_at ? `ETD: ${formatDateTime(currentJob.etd_at)}` : 'Jadwal operasional kapal',
                            },
                            {
                                icon: FileText,
                                label: 'Surat Perintah Kerja (SPK)',
                                value: currentJob?.work_order?.system_number ? currentJob.work_order.system_number : (currentShip?.call_sign ? `Call Sign: ${currentShip.call_sign}` : 'Keagenan Kapal'),
                                sub: currentShip?.flag ? `Bendera: ${currentShip.flag}` : 'Operasional Wilayah Kerja SJA',
                            },
                        ].map(({ icon: Icon, label, value, sub }) => (
                            <div key={label} className="min-w-0 bg-white p-4 dark:bg-[#0C1D36]">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                    <Icon className="size-4 shrink-0 text-[#0060F4] dark:text-[#60A5FA]" aria-hidden="true" />
                                    {label}
                                </div>
                                <p className="mt-1 text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9] break-words">
                                    {value}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[#8C9BB9] dark:text-[#64748B] break-words">
                                    {sub}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* 2. DAFTAR LANGSUNG SEMUA PENGAJUAN & ITEM-ITEMNYA */}
                <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                <FileText className="size-4" />
                            </span>
                            <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-[#0B1F63] dark:text-[#F1F5F9] leading-tight break-words">
                                Daftar Surat Pengajuan &amp; Rincian Kebutuhan
                            </h2>
                        </div>
                        <span className="shrink-0 rounded-xl border border-[#DCEAF8] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]">
                            {allRequests.length} Pengajuan
                        </span>
                    </div>

                    {/* Alert Banner jika ada validasi harga Rp 0 atau error backend */}
                    {(priceValidationErrors.length > 0 || errors?.selected_items) && (
                        <div role="alert" className="border-l-2 border-amber-500 bg-amber-50/70 px-3 py-2.5 dark:bg-amber-950/30">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <div className="min-w-0 flex-1 text-xs text-amber-900 dark:text-amber-200">
                                    <p className="font-bold">Lengkapi HPP dan harga jual item terpilih.</p>
                                    {errors?.selected_items && (
                                        <p className="mt-1 font-semibold text-rose-600 dark:text-rose-400">
                                            {errors.selected_items}
                                        </p>
                                    )}
                                    {priceValidationErrors.length > 0 && (
                                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                                            {priceValidationErrors.map((msg, idx) => (
                                                <li key={idx}>{msg}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {priceValidationErrors.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setPriceValidationErrors([])}
                                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-[#0060F4] dark:text-amber-300 dark:hover:bg-amber-900"
                                        aria-label="Tutup pesan validasi"
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Toolbar Aksi Sekaligus (Batch Actions ke Direktur) */}
                    {canUseAdminActions && allEditableItemsAcrossJob.length > 0 && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-[#BCE0FD] bg-[#E0F0FF]/90 p-4 shadow-sm dark:border-[#1E3A5F] dark:bg-[#0C1D36] sm:flex-row sm:items-center sm:justify-between md:bg-gradient-to-r md:from-[#E0F0FF]/90 md:via-white md:to-[#E0F0FF]/70 md:dark:from-[#0C1D36] md:dark:via-[#071322] md:dark:to-[#0C1D36]">
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelectedAcrossJob}
                                        ref={(el) => {
                                            if (el) el.indeterminate = isIndeterminateAcrossJob;
                                        }}
                                        onChange={handleToggleSelectAllAcrossJob}
                                        className="size-4 rounded border-[#BCE0FD] text-[#0060F4] focus:ring-[#0060F4]"
                                    />
                                    <span>Pilih Semua Item ({totalSelectedCount} dari {allEditableItemsAcrossJob.length} dipilih)</span>
                                </label>

                                {totalUrgentCount > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                        <Flame className="size-3.5 fill-rose-600 text-rose-600 animate-pulse" />
                                        {totalUrgentCount} Item Mendesak
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    leftIcon={<Save className="size-3.5" />}
                                    disabled={activeAction !== null || allEditableItemsAcrossJob.length === 0}
                                    onClick={handleSaveAllPricesAcrossJob}
                                >
                                    {activeAction === 'batch-save-all' ? 'Menyimpan...' : `Simpan Semua Harga (${allEditableItemsAcrossJob.length})`}
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="primary"
                                    leftIcon={<Send className="size-3.5" />}
                                    isLoading={activeAction === 'batch-forward-all'}
                                    disabled={activeAction !== null || totalSelectedCount === 0}
                                    onClick={handleBatchForwardAllToDirector}
                                    className="bg-[#0060F4] hover:bg-[#082870] font-bold shadow-xs"
                                >
                                    Ajukan Sekaligus ke Direktur ({totalSelectedCount} Item)
                                </Button>
                            </div>
                        </div>
                    )}

                    <Table<DesktopRequestItemRow>
                        className="hidden md:block"
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
                                width: '230px',
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
                                width: '160px',
                                render: ({ request: req, item }) => {
                                    const isEditable =
                                        !['Dalam Proses', 'Selesai', 'Dibatalkan'].includes(req.status) &&
                                        item.director_status !== 'approved' &&
                                        item.status !== 'diajukan_ke_direktur' &&
                                        !item.is_invoiced;

                                    if (!capabilities.can_view_hpp) {
                                        return '-';
                                    }

                                    if (canUseAdminActions && isEditable) {
                                        return (
                                            <label className="block">
                                                <span className="sr-only">HPP {item.item_name}</span>
                                                <div className="flex h-9 min-w-36 items-center rounded-lg border border-[#DCEAF8] bg-white px-2 focus-within:border-[#0060F4] focus-within:ring-2 focus-within:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                    <span className="mr-1 text-[11px] font-bold text-[#52658E]">Rp</span>
                                                    <input
                                                        type="text"
                                                        name={`desktop_hpp_${item.id}`}
                                                        autoComplete="off"
                                                        inputMode="numeric"
                                                        value={formatRupiahInput(priceDrafts[item.id]?.hpp_price ?? '0')}
                                                        onChange={(event) =>
                                                            setPriceDrafts((current) => ({
                                                                ...current,
                                                                [item.id]: {
                                                                    ...current[item.id],
                                                                    hpp_price: normalizeRupiahInput(event.target.value),
                                                                },
                                                            }))
                                                        }
                                                        className="w-full border-0 bg-transparent p-0 text-right font-mono text-xs font-bold tabular-nums focus:ring-0"
                                                    />
                                                </div>
                                            </label>
                                        );
                                    }

                                    return (
                                        <span className="whitespace-nowrap font-mono font-bold tabular-nums">
                                            {formatRupiah(item.hpp_price)}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: 'selling_price',
                                header: 'Harga Jual',
                                align: 'right',
                                width: '160px',
                                render: ({ request: req, item }) => {
                                    const isEditable =
                                        !['Dalam Proses', 'Selesai', 'Dibatalkan'].includes(req.status) &&
                                        item.director_status !== 'approved' &&
                                        item.status !== 'diajukan_ke_direktur' &&
                                        !item.is_invoiced;

                                    if (canUseAdminActions && isEditable) {
                                        return (
                                            <label className="block">
                                                <span className="sr-only">Harga jual {item.item_name}</span>
                                                <div className="flex h-9 min-w-36 items-center rounded-lg border border-[#BCE0FD] bg-white px-2 focus-within:border-[#0060F4] focus-within:ring-2 focus-within:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                    <span className="mr-1 text-[11px] font-bold text-[#0060F4]">Rp</span>
                                                    <input
                                                        type="text"
                                                        name={`desktop_selling_${item.id}`}
                                                        autoComplete="off"
                                                        inputMode="numeric"
                                                        value={formatRupiahInput(priceDrafts[item.id]?.selling_price ?? '0')}
                                                        onChange={(event) =>
                                                            setPriceDrafts((current) => ({
                                                                ...current,
                                                                [item.id]: {
                                                                    ...current[item.id],
                                                                    selling_price: normalizeRupiahInput(event.target.value),
                                                                },
                                                            }))
                                                        }
                                                        className="w-full border-0 bg-transparent p-0 text-right font-mono text-xs font-bold tabular-nums text-[#0060F4] focus:ring-0"
                                                    />
                                                </div>
                                            </label>
                                        );
                                    }

                                    return (
                                        <span className="whitespace-nowrap font-mono font-bold tabular-nums text-[#0060F4]">
                                            {formatRupiah(item.selling_price)}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: 'subtotal',
                                header: 'Subtotal',
                                align: 'right',
                                width: '155px',
                                render: ({ item }) => (
                                    <span className="whitespace-nowrap font-mono font-bold tabular-nums">
                                        {formatRupiah(
                                            Number(priceDrafts[item.id]?.selling_price ?? item.selling_price ?? 0) *
                                                Number(item.quantity)
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
                                        <DirectorStatus
                                            status={item.director_status}
                                            itemStatus={item.status}
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
                                width: '230px',
                                render: ({ request: req, item, isFirstForRequest }) => {
                                    const isEditable =
                                        !['Dalam Proses', 'Selesai', 'Dibatalkan'].includes(req.status) &&
                                        item.director_status !== 'approved' &&
                                        item.status !== 'diajukan_ke_direktur' &&
                                        !item.is_invoiced;
                                    const selectedIds = selectedItemIdsByReq[req.id] || [];
                                    const canAddItem =
                                        capabilities.can_create_requests &&
                                        !['Selesai', 'Dibatalkan'].includes(req.status);
                                    const canCreateClearanceInvoice =
                                        canUseAdminActions &&
                                        req.service_type === 'clearance_in' &&
                                        (req.items || []).some(
                                            (requestItem) =>
                                                requestItem.director_status === 'approved' &&
                                                !requestItem.is_invoiced
                                        );

                                    return (
                                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                                            {canUseAdminActions && isEditable && (
                                                <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#DCEAF8] bg-white px-2 text-xs font-semibold text-[#52658E] hover:border-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#94A3B8]">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={(event) => {
                                                            const checked = event.target.checked;
                                                            setSelectedItemIdsByReq((current) => {
                                                                const previous = current[req.id] || [];

                                                                return {
                                                                    ...current,
                                                                    [req.id]: checked
                                                                        ? Array.from(new Set([...previous, item.id]))
                                                                        : previous.filter((id) => id !== item.id),
                                                                };
                                                            });
                                                        }}
                                                        className="size-4 rounded border-[#BCE0FD] text-[#0060F4] focus:ring-[#0060F4]"
                                                    />
                                                    Pilih
                                                </label>
                                            )}

                                            {canUseAdminActions && isEditable && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveItemPrice(req.id, item.id)}
                                                    disabled={savingItemId === item.id}
                                                    className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#E0F0FF] px-2.5 text-xs font-bold text-[#0060F4] hover:bg-[#BCE0FD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] disabled:opacity-50 dark:bg-[#132847] dark:text-[#60A5FA]"
                                                >
                                                    <Save className="size-3" aria-hidden="true" />
                                                    {savingItemId === item.id ? 'Menyimpan…' : 'Simpan'}
                                                </button>
                                            )}

                                            {canUseAdminActions &&
                                                item.director_status === 'approved' &&
                                                !item.is_invoiced && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setRevisionTarget({ requestId: req.id, item })
                                                        }
                                                        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:hover:bg-[#132847]"
                                                    >
                                                        <RotateCcw className="size-3" aria-hidden="true" />
                                                        Revisi
                                                    </button>
                                                )}

                                            {isFirstForRequest && canAddItem && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAddItemTargetReqId(req.id)}
                                                    className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#0B1F63] hover:bg-[#F0F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:text-[#F1F5F9] dark:hover:bg-[#132847]"
                                                >
                                                    <Plus className="size-3" aria-hidden="true" />
                                                    Tambah
                                                </button>
                                            )}

                                            {isFirstForRequest && canCreateClearanceInvoice && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        runAction(
                                                            `clearance-invoice-${req.id}`,
                                                            route('requests.clearance-in-invoice', req.id)
                                                        )
                                                    }
                                                    disabled={activeAction !== null}
                                                    className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#0060F4] px-2.5 text-xs font-bold text-white hover:bg-[#082870] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] disabled:opacity-50"
                                                >
                                                    <FileText className="size-3" aria-hidden="true" />
                                                    Invoice
                                                </button>
                                            )}

                                            {isFirstForRequest && (
                                                <RequestWorkflowPanel
                                                    request={req}
                                                    canProcess={capabilities.can_process_requests}
                                                    compact
                                                />
                                            )}
                                        </div>
                                    );
                                },
                            },
                        ]}
                        data={desktopRows}
                        keyExtractor={(row) => row.item.id}
                        compact
                        minWidth="1545px"
                        emptyMessage="Data Tidak Ditemukan"
                        rowClassName={(row) =>
                            row.needsAttention
                                ? '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A] border-l-4 border-l-[#0060F4]'
                                : row.item.is_urgent
                                  ? '!bg-rose-50/70 dark:!bg-rose-950/30'
                                  : ''
                        }
                    />

                    <div className="md:hidden">
                        {allRequests.length > 0 ? (
                            allRequests.map((req, reqIndex) => {
                            const reqItems = req.items || [];
                            const editableItems = reqItems.filter(
                                (it) => it.director_status !== 'approved' && it.status !== 'diajukan_ke_direktur' && !it.is_invoiced
                            );
                            const forwardedItems = reqItems.filter(
                                (it) => it.status === 'diajukan_ke_direktur' && it.director_status === 'pending'
                            );
                            const selectedIds = selectedItemIdsByReq[req.id] || [];
                            const canForwardThisReq =
                                canUseAdminActions &&
                                editableItems.length > 0 &&
                                !['Dalam Proses', 'Selesai', 'Dibatalkan'].includes(req.status);
                            const canAddItemToReq =
                                capabilities.can_create_requests &&
                                !['Selesai', 'Dibatalkan'].includes(req.status);
                            const hasApprovedUninvoicedItem = reqItems.some(
                                (it) => it.director_status === 'approved' && !it.is_invoiced
                            );
                            const hasUrgentItem = reqItems.some((it) => it.is_urgent);

                            const reqTotalHpp = reqItems.reduce(
                                (sum, it) => sum + Number(it.hpp_price ?? 0) * Number(it.quantity),
                                0
                            );
                            const reqTotalSelling = reqItems.reduce(
                                (sum, it) => sum + Number(it.selling_price ?? 0) * Number(it.quantity),
                                0
                            );
                            const itemNeedsAction = (item: RequestItem): boolean => {
                                if (capabilities.can_decide_items) {
                                    return (
                                        item.status === 'diajukan_ke_direktur' &&
                                        item.director_status === 'pending'
                                    );
                                }

                                if (canUseAdminActions) {
                                    return (
                                        editableItems.some((editable) => editable.id === item.id) ||
                                        (item.director_status === 'approved' &&
                                            ['Disetujui', 'Disetujui Sebagian'].includes(req.status)) ||
                                        item.director_status === 'rejected'
                                    );
                                }

                                return (
                                    capabilities.can_create_requests &&
                                    item.director_status === 'rejected'
                                );
                            };
                            const sortedReqItems = [...reqItems].sort(
                                (first, second) =>
                                    Number(itemNeedsAction(second)) - Number(itemNeedsAction(first))
                            );

                            return (
                                <section
                                    key={req.id}
                                    className="space-y-3 border-t border-[#DCEAF8] pt-4 dark:border-[#1E3A5F]"
                                >
                                    {/* Header Pengajuan */}
                                    <div className="border-b border-[#DCEAF8] bg-white py-4 dark:border-[#1E3A5F] dark:bg-[#0C1D36] md:rounded-t-2xl md:bg-[#F8FBFF] md:px-5 md:dark:bg-[#0E223F]">
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

                                                    {hasUrgentItem && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black uppercase text-white shadow-2xs">
                                                            <Flame className="size-3 fill-white" />
                                                            Urgent
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                    <span>{req.creator?.name || 'Staff'}</span>
                                                    <span>•</span>
                                                    <span>{formatDateTime(req.request_date)}</span>
                                                    {req.notes && !req.notes.toLowerCase().includes('pengajuan clearance in untuk kapal') && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="italic">"{req.notes}"</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons for this Pengajuan */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* {canUseAdminActions && editableItems.length > 0 && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        leftIcon={<Save className="size-3" />}
                                                        disabled={savingReqId === req.id}
                                                        onClick={() => handleSaveAllPricesForReq(req)}
                                                    >
                                                        {savingReqId === req.id ? 'Menyimpan...' : `Simpan Harga (${editableItems.length})`}
                                                    </Button>
                                                )}

                                                {canForwardThisReq && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        leftIcon={<Send className="size-3" />}
                                                        isLoading={activeAction === `forward-${req.id}`}
                                                        disabled={activeAction !== null || selectedIds.length === 0}
                                                        onClick={() => submitAdminReview(req.id)}
                                                        className={reqItems.some((it) => it.director_status === 'rejected') ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold' : undefined}
                                                    >
                                                        {reqItems.some((it) => it.director_status === 'rejected')
                                                            ? `Ajukan Ulang ke Direktur (${selectedIds.length})`
                                                            : `Ajukan ke Direktur (${selectedIds.length})`}
                                                    </Button>
                                                )} */}

                                                {canAddItemToReq && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        leftIcon={<Plus className="size-3" />}
                                                        onClick={() => setAddItemTargetReqId(req.id)}
                                                    >
                                                        Tambah Item
                                                    </Button>
                                                )}

                                                {canUseAdminActions && req.service_type === 'clearance_in' && hasApprovedUninvoicedItem && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="primary"
                                                        leftIcon={<FileText className="size-3" />}
                                                        isLoading={activeAction === `clearance-invoice-${req.id}`}
                                                        onClick={() => runAction(`clearance-invoice-${req.id}`, route('requests.clearance-in-invoice', req.id))}
                                                    >
                                                        Terbitkan Invoice
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <RequestWorkflowPanel
                                        request={req}
                                        canProcess={capabilities.can_process_requests}
                                        className="border-b border-[#DCEAF8] dark:border-[#1E3A5F]"
                                    />

                                    {/* Catatan ringkas jika terdapat item ditolak Direktur */}
                                    {reqItems.some((it) => it.director_status === 'rejected') && (
                                        <p className="flex items-center gap-2 border-l-2 border-rose-500 pl-3 text-xs text-rose-700 dark:text-rose-300">
                                            <CircleX className="size-4 shrink-0" />
                                            Ada item ditolak. Periksa catatan, revisi, lalu ajukan ulang.
                                        </p>
                                    )}

                                    {/* Tabel & Kartu Item Kebutuhan */}
                                    {reqItems.length > 0 ? (
                                        <>
                                            <Table<RequestItem>
                                                className="hidden md:block"
                                                columns={[
                                                    ...(canUseAdminActions
                                                        ? [
                                                            {
                                                                key: 'select',
                                                                header: (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            editableItems.length > 0 &&
                                                                            editableItems.every((item) =>
                                                                                selectedIds.includes(item.id)
                                                                            )
                                                                        }
                                                                        disabled={editableItems.length === 0}
                                                                        onChange={(event) => {
                                                                            const checked = event.target.checked;
                                                                            setSelectedItemIdsByReq((current) => ({
                                                                                ...current,
                                                                                [req.id]: checked
                                                                                    ? editableItems.map(
                                                                                        (item) => item.id
                                                                                    )
                                                                                    : [],
                                                                            }));
                                                                        }}
                                                                        aria-label={`Pilih semua item ${req.request_number}`}
                                                                        className="size-4 rounded border-[#BCE0FD] text-[#0060F4] focus:ring-[#0060F4] disabled:opacity-40"
                                                                    />
                                                                ),
                                                                align: 'center' as const,
                                                                width: '52px',
                                                                render: (item: RequestItem) => {
                                                                    const isEditable = editableItems.some(
                                                                        (editable) =>
                                                                            editable.id === item.id
                                                                    );
                                                                    return (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedIds.includes(
                                                                                item.id
                                                                            )}
                                                                            disabled={!isEditable}
                                                                            onChange={(event) => {
                                                                                const checked =
                                                                                    event.target.checked;
                                                                                setSelectedItemIdsByReq(
                                                                                    (current) => {
                                                                                        const previous =
                                                                                            current[req.id] || [];
                                                                                        return {
                                                                                            ...current,
                                                                                            [req.id]: checked
                                                                                                ? [
                                                                                                    ...previous,
                                                                                                    item.id,
                                                                                                ]
                                                                                                : previous.filter(
                                                                                                    (id) =>
                                                                                                        id !==
                                                                                                        item.id
                                                                                                ),
                                                                                        };
                                                                                    }
                                                                                );
                                                                            }}
                                                                            aria-label={`Pilih ${item.item_name}`}
                                                                            className="size-4 rounded border-[#BCE0FD] text-[#0060F4] focus:ring-[#0060F4] disabled:opacity-40"
                                                                        />
                                                                    );
                                                                },
                                                            },
                                                        ]
                                                        : []),
                                                    {
                                                        key: 'item',
                                                        header: 'Item / Vendor',
                                                        width: '280px',
                                                        render: (item) => (
                                                            <div className="space-y-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <strong>{item.item_name}</strong>
                                                                    {itemNeedsAction(item) && (
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
                                                                    {item.vendor?.name ||
                                                                        'Vendor belum ditentukan'}
                                                                </p>
                                                                {item.notes && (
                                                                    <p className="text-[11px] text-[#52658E]">
                                                                        {item.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ),
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
                                                    ...(capabilities.can_view_hpp
                                                        ? [
                                                            {
                                                                key: 'hpp',
                                                                header: 'HPP',
                                                                align: 'right' as const,
                                                                width: '180px',
                                                                render: (item: RequestItem) => {
                                                                    const isEditable = editableItems.some(
                                                                        (editable) =>
                                                                            editable.id === item.id
                                                                    );
                                                                    if (
                                                                        canUseAdminActions &&
                                                                        isEditable
                                                                    ) {
                                                                        return (
                                                                            <label className="block">
                                                                                <span className="sr-only">
                                                                                    HPP {item.item_name}
                                                                                </span>
                                                                                <div className="flex h-9 min-w-[150px] items-center rounded-[10px] border border-[#DCEAF8] bg-white px-2.5 focus-within:border-[#0060F4] focus-within:ring-2 focus-within:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                                                    <span className="mr-1 text-[11px] font-bold text-[#52658E]">
                                                                                        Rp
                                                                                    </span>
                                                                                    <input
                                                                                        type="text"
                                                                                        name={`hpp_${item.id}`}
                                                                                        autoComplete="off"
                                                                                        inputMode="numeric"
                                                                                        value={formatRupiahInput(
                                                                                            priceDrafts[
                                                                                                item.id
                                                                                            ]?.hpp_price ??
                                                                                            '0'
                                                                                        )}
                                                                                        onChange={(event) =>
                                                                                            setPriceDrafts(
                                                                                                (current) => ({
                                                                                                    ...current,
                                                                                                    [item.id]: {
                                                                                                        ...current[
                                                                                                        item.id
                                                                                                        ],
                                                                                                        hpp_price:
                                                                                                            normalizeRupiahInput(
                                                                                                                event
                                                                                                                    .target
                                                                                                                    .value
                                                                                                            ),
                                                                                                    },
                                                                                                })
                                                                                            )
                                                                                        }
                                                                                        className="w-full border-0 bg-transparent p-0 text-right font-mono text-xs font-bold focus:ring-0"
                                                                                    />
                                                                                </div>
                                                                            </label>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <span className="whitespace-nowrap font-mono font-bold">
                                                                            {formatRupiah(
                                                                                item.hpp_price
                                                                            )}
                                                                        </span>
                                                                    );
                                                                },
                                                            },
                                                        ]
                                                        : []),
                                                    {
                                                        key: 'selling',
                                                        header: 'Harga Jual',
                                                        align: 'right' as const,
                                                        width: '180px',
                                                        render: (item) => {
                                                            const isEditable = editableItems.some(
                                                                (editable) => editable.id === item.id
                                                            );
                                                            if (canUseAdminActions && isEditable) {
                                                                return (
                                                                    <label className="block">
                                                                        <span className="sr-only">
                                                                            Harga jual {item.item_name}
                                                                        </span>
                                                                        <div className="flex h-9 min-w-[150px] items-center rounded-[10px] border border-[#BCE0FD] bg-white px-2.5 focus-within:border-[#0060F4] focus-within:ring-2 focus-within:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                                            <span className="mr-1 text-[11px] font-bold text-[#0060F4]">
                                                                                Rp
                                                                            </span>
                                                                            <input
                                                                                type="text"
                                                                                name={`selling_price_${item.id}`}
                                                                                autoComplete="off"
                                                                                inputMode="numeric"
                                                                                value={formatRupiahInput(
                                                                                    priceDrafts[item.id]
                                                                                        ?.selling_price ?? '0'
                                                                                )}
                                                                                onChange={(event) =>
                                                                                    setPriceDrafts(
                                                                                        (current) => ({
                                                                                            ...current,
                                                                                            [item.id]: {
                                                                                                ...current[
                                                                                                item.id
                                                                                                ],
                                                                                                selling_price:
                                                                                                    normalizeRupiahInput(
                                                                                                        event
                                                                                                            .target
                                                                                                            .value
                                                                                                    ),
                                                                                            },
                                                                                        })
                                                                                    )
                                                                                }
                                                                                className="w-full border-0 bg-transparent p-0 text-right font-mono text-xs font-bold text-[#0060F4] focus:ring-0"
                                                                            />
                                                                        </div>
                                                                    </label>
                                                                );
                                                            }
                                                            return (
                                                                <span className="whitespace-nowrap font-mono font-bold text-[#0060F4]">
                                                                    {formatRupiah(item.selling_price)}
                                                                </span>
                                                            );
                                                        },
                                                    },
                                                    {
                                                        key: 'subtotal',
                                                        header: 'Subtotal',
                                                        align: 'right' as const,
                                                        width: '170px',
                                                        render: (item) => (
                                                            <span className="whitespace-nowrap font-mono font-bold">
                                                                {formatRupiah(
                                                                    Number(
                                                                        priceDrafts[item.id]
                                                                            ?.selling_price ??
                                                                        item.selling_price ??
                                                                        0
                                                                    ) * Number(item.quantity)
                                                                )}
                                                            </span>
                                                        ),
                                                    },
                                                    {
                                                        key: 'status',
                                                        header: 'Status',
                                                        align: 'center' as const,
                                                        width: '170px',
                                                        render: (item) => (
                                                            <div>
                                                                <DirectorStatus
                                                                    status={item.director_status}
                                                                    itemStatus={item.status}
                                                                />
                                                                {item.director_notes && (
                                                                    <p className="mt-1 text-[11px] text-[#52658E]">
                                                                        {item.director_notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ),
                                                    },
                                                    {
                                                        key: 'action',
                                                        header: 'Aksi',
                                                        align: 'center' as const,
                                                        width: '120px',
                                                        render: (item) => {
                                                            const isEditable = editableItems.some(
                                                                (editable) => editable.id === item.id
                                                            );
                                                            return (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    {canUseAdminActions && isEditable && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleSaveItemPrice(
                                                                                    req.id,
                                                                                    item.id
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                savingItemId === item.id
                                                                            }
                                                                            className="inline-flex min-h-9 items-center gap-1 rounded-[10px] bg-[#E0F0FF] px-3 font-bold text-[#0060F4] hover:bg-[#BCE0FD] disabled:opacity-50"
                                                                        >
                                                                            <Save className="size-3" />
                                                                            Simpan
                                                                        </button>
                                                                    )}
                                                                    {canUseAdminActions &&
                                                                        item.director_status ===
                                                                        'approved' &&
                                                                        !item.is_invoiced && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setRevisionTarget({
                                                                                        requestId: req.id,
                                                                                        item,
                                                                                    })
                                                                                }
                                                                                className="inline-flex min-h-9 items-center gap-1 rounded-[10px] px-3 font-semibold text-[#0060F4] hover:bg-[#E0F0FF]"
                                                                            >
                                                                                <RotateCcw className="size-3" />
                                                                                Revisi
                                                                            </button>
                                                                        )}
                                                                </div>
                                                            );
                                                        },
                                                    },
                                                ]}
                                                data={sortedReqItems}
                                                keyExtractor={(item) => item.id}
                                                compact
                                                minWidth="1210px"
                                                emptyMessage="Data Tidak Ditemukan"
                                                rowClassName={(item) => {
                                                    if (itemNeedsAction(item)) {
                                                        return '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A] border-l-4 border-l-[#0060F4]';
                                                    }
                                                    return item.is_urgent
                                                        ? '!bg-rose-50/70 dark:!bg-rose-950/30'
                                                        : '';
                                                }}
                                            />

                                            <div className="hidden flex-wrap justify-end gap-x-5 gap-y-1 text-xs text-[#52658E] md:flex">
                                                {capabilities.can_view_hpp && (
                                                    <span>
                                                        HPP: <strong>{formatRupiah(reqTotalHpp)}</strong>
                                                    </span>
                                                )}
                                                <span>
                                                    Jual:{' '}
                                                    <strong>{formatRupiah(reqTotalSelling)}</strong>
                                                </span>
                                                {capabilities.can_view_hpp && (
                                                    <span>
                                                        Margin:{' '}
                                                        <strong>
                                                            {formatRupiah(
                                                                reqTotalSelling - reqTotalHpp
                                                            )}
                                                        </strong>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Mobile Item Cards View (< md) */}
                                            <div className="space-y-3 md:hidden">
                                                {/* Per-Request Select All Bar for Mobile */}
                                                {canUseAdminActions && editableItems.length > 0 && !['Dalam Proses', 'Selesai', 'Dibatalkan'].includes(req.status) && (
                                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F0F8FF] dark:bg-[#132847]/50 border border-[#BCE0FD] dark:border-[#1E3A5F]">
                                                        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                            <input
                                                                type="checkbox"
                                                                checked={editableItems.length > 0 && editableItems.every((it) => selectedIds.includes(it.id))}
                                                                onChange={(event) => {
                                                                    const checked = event.target.checked;
                                                                    setSelectedItemIdsByReq((current) => ({
                                                                        ...current,
                                                                        [req.id]: checked ? editableItems.map((it) => it.id) : [],
                                                                    }));
                                                                }}
                                                                className="size-4 rounded border-[#BCE0FD] text-[#0060F4] focus:ring-[#0060F4]"
                                                            />
                                                            <span>Pilih Semua Item ({editableItems.filter((it) => selectedIds.includes(it.id)).length}/{editableItems.length})</span>
                                                        </label>
                                                        <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                            {selectedIds.length} dipilih
                                                        </span>
                                                    </div>
                                                )}

                                                {reqItems.map((item) => {
                                                    const isEditable = editableItems.some((ed) => ed.id === item.id);
                                                    const isSelected = selectedIds.includes(item.id);
                                                    const isLocked = item.director_status === 'approved';
                                                    const isUrgent = Boolean(item.is_urgent);
                                                    const itemHpp = parseFloat(priceDrafts[item.id]?.hpp_price ?? String(item.hpp_price ?? 0)) || 0;
                                                    const itemSelling = parseFloat(priceDrafts[item.id]?.selling_price ?? String(item.selling_price ?? 0)) || 0;
                                                    const itemSubtotal = itemSelling * Number(item.quantity);
                                                    const hasZeroPriceWarning = isSelected && (itemHpp <= 0 || itemSelling <= 0);

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`space-y-2.5 rounded-2xl border p-3.5 shadow-2xs transition-[background-color,border-color,box-shadow] ${isUrgent
                                                                    ? isSelected
                                                                        ? 'bg-rose-100/90 dark:bg-rose-950/70 border-rose-500 ring-1 ring-rose-500'
                                                                        : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400'
                                                                    : isSelected
                                                                        ? 'bg-[#F0F8FF] dark:bg-[#132847]/70 border-[#0060F4] ring-1 ring-[#0060F4]'
                                                                        : 'bg-white dark:bg-[#0C1D36] border-[#DCEAF8] dark:border-[#1E3A5F]'
                                                                }`}
                                                        >
                                                            {/* Item Card Header */}
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex items-start gap-2.5 min-w-0">
                                                                    {canUseAdminActions && (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            disabled={!isEditable}
                                                                            aria-label={`Pilih ${item.item_name}`}
                                                                            onChange={(event) => {
                                                                                const checked = event.target.checked;
                                                                                setSelectedItemIdsByReq((current) => {
                                                                                    const prev = current[req.id] || [];
                                                                                    return {
                                                                                        ...current,
                                                                                        [req.id]: checked
                                                                                            ? [...prev, item.id]
                                                                                            : prev.filter((id) => id !== item.id),
                                                                                    };
                                                                                });
                                                                            }}
                                                                            className="size-4.5 rounded border-[#B7C9DF] text-[#0060F4] focus:ring-[#0060F4] mt-0.5 disabled:opacity-40"
                                                                        />
                                                                    )}
                                                                    <div className="min-w-0 space-y-1">
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            {isUrgent && (
                                                                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[9.5px] font-black uppercase text-white shadow-2xs">
                                                                                    <Flame aria-hidden="true" className="size-2.5 fill-white" />
                                                                                    Mendesak
                                                                                </span>
                                                                            )}
                                                                            <h4 className="font-black text-xs text-[#0B1F63] dark:text-[#F1F5F9] break-words">
                                                                                {item.item_name}
                                                                            </h4>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                                            <Building2 aria-hidden="true" className="size-3 shrink-0 text-[#0060F4]" />
                                                                            <span className="break-words">{item.vendor?.name || 'Vendor: Belum ditentukan'}</span>
                                                                        </div>
                                                                        {item.notes && (
                                                                            <p className="text-[11px] italic text-[#52658E] dark:text-[#94A3B8]">
                                                                                "{item.notes}"
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Qty Badge */}
                                                                <div className="shrink-0 text-right">
                                                                    <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-[#0B1F63] dark:text-[#F1F5F9] bg-[#E0F0FF] dark:bg-[#132847] px-2 py-0.5 rounded-lg border border-[#BCE0FD] dark:border-[#1E3A5F]">
                                                                        {item.quantity} {item.unit || 'Dokumen'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Status Approval & Director Notes */}
                                                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60 text-xs">
                                                                <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8] font-medium">Status:</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <DirectorStatus status={item.director_status} itemStatus={item.status} />
                                                                </div>
                                                            </div>
                                                            {item.director_notes && (
                                                                <p className="text-[10.5px] italic text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg border border-rose-200 dark:border-rose-900">
                                                                    Catatan Direktur: "{item.director_notes}"
                                                                </p>
                                                            )}

                                                            {/* Warning Banner if selected and Rp 0 */}
                                                            {hasZeroPriceWarning && (
                                                                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                                                    <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0 text-amber-600" />
                                                                    <span>Harga masih Rp 0! Harap isi HPP &amp; Harga Jual (&gt; Rp 0) sebelum diajukan.</span>
                                                                </div>
                                                            )}

                                                            {/* Pricing Inputs / Details */}
                                                            <div className="rounded-xl bg-[#F8FBFF] dark:bg-[#071322]/60 p-2.5 border border-[#DCEAF8] dark:border-[#1E3A5F] space-y-2">
                                                                {canUseAdminActions && isEditable ? (
                                                                    <div className="space-y-2">
                                                                        {capabilities.can_view_hpp && (
                                                                            <div className="flex items-center justify-between gap-2 text-xs">
                                                                                <label
                                                                                    htmlFor={`mobile-hpp-${item.id}`}
                                                                                    className="shrink-0 text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]"
                                                                                >
                                                                                    HPP:
                                                                                </label>
                                                                                <div className={`flex min-h-8 w-36 items-center rounded-lg border bg-white px-2 shadow-2xs focus-within:border-[#0060F4] focus-within:ring-2 focus-within:ring-[#0060F4]/20 dark:bg-[#0C1D36] ${isSelected && itemHpp <= 0 ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-[#DCEAF8] dark:border-[#1E3A5F]'
                                                                                    }`}>
                                                                                    <span className="text-[10.5px] font-bold text-[#52658E] mr-1">Rp</span>
                                                                                    <input
                                                                                        id={`mobile-hpp-${item.id}`}
                                                                                        name={`mobile_hpp_${item.id}`}
                                                                                        type="text"
                                                                                        inputMode="numeric"
                                                                                        autoComplete="off"
                                                                                        value={formatRupiahInput(priceDrafts[item.id]?.hpp_price ?? '0')}
                                                                                        onChange={(e) =>
                                                                                            setPriceDrafts((cur) => ({
                                                                                                ...cur,
                                                                                                [item.id]: {
                                                                                                    ...cur[item.id],
                                                                                                    hpp_price: normalizeRupiahInput(e.target.value),
                                                                                                },
                                                                                            }))
                                                                                        }
                                                                                        className="w-full border-0 bg-transparent p-0 text-right font-mono text-xs font-bold tabular-nums text-[#0B1F63] focus:ring-0 dark:text-[#F1F5F9]"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-center justify-between gap-2 text-xs">
                                                                            <label
                                                                                htmlFor={`mobile-selling-${item.id}`}
                                                                                className="shrink-0 text-[11px] font-bold text-[#0060F4] dark:text-[#60A5FA]"
                                                                            >
                                                                                Harga Jual:
                                                                            </label>
                                                                            <div className={`flex min-h-8 w-36 items-center rounded-lg border bg-white px-2 shadow-2xs focus-within:border-[#0060F4] focus-within:ring-2 focus-within:ring-[#0060F4]/20 dark:bg-[#0C1D36] ${isSelected && itemSelling <= 0 ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-[#BCE0FD] dark:border-[#1E3A5F]'
                                                                                }`}>
                                                                                <span className="text-[10.5px] font-bold text-[#0060F4] mr-1">Rp</span>
                                                                                <input
                                                                                    id={`mobile-selling-${item.id}`}
                                                                                    name={`mobile_selling_${item.id}`}
                                                                                    type="text"
                                                                                    inputMode="numeric"
                                                                                    autoComplete="off"
                                                                                    value={formatRupiahInput(priceDrafts[item.id]?.selling_price ?? '0')}
                                                                                    onChange={(e) =>
                                                                                        setPriceDrafts((cur) => ({
                                                                                            ...cur,
                                                                                            [item.id]: {
                                                                                                ...cur[item.id],
                                                                                                selling_price: normalizeRupiahInput(e.target.value),
                                                                                            },
                                                                                        }))
                                                                                    }
                                                                                    className="w-full border-0 bg-transparent p-0 text-right font-mono text-xs font-black tabular-nums text-[#0060F4] focus:ring-0 dark:text-[#60A5FA]"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center justify-between pt-1 border-t border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60">
                                                                            <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">Subtotal:</span>
                                                                            <span className="font-mono text-xs font-black text-[#0B1F63] dark:text-[#F1F5F9]">
                                                                                {formatRupiah(itemSubtotal)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-1 text-xs">
                                                                        {capabilities.can_view_hpp && (
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">HPP:</span>
                                                                                <span className="font-mono text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                                                    {formatRupiah(item.hpp_price)}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Harga Jual:</span>
                                                                            <span className="font-mono text-xs font-black text-[#0060F4] dark:text-[#60A5FA]">
                                                                                {formatRupiah(item.selling_price)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between pt-1 border-t border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60">
                                                                            <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">Subtotal:</span>
                                                                            <span className="font-mono text-xs font-black text-[#0B1F63] dark:text-[#F1F5F9]">
                                                                                {formatRupiah(itemSubtotal)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Action Button for item (Simpan / Revisi) */}
                                                            {canUseAdminActions && (
                                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                                    {isEditable && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveItemPrice(req.id, item.id)}
                                                                            disabled={savingItemId === item.id}
                                                                            className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-lg bg-[#E0F0FF] px-3 text-xs font-bold text-[#0060F4] hover:bg-[#BCE0FD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] disabled:opacity-60 dark:bg-[#132847] dark:text-[#60A5FA]"
                                                                        >
                                                                            <Save aria-hidden="true" className="size-3" />
                                                                            <span>{savingItemId === item.id ? 'Menyimpan…' : 'Simpan Harga'}</span>
                                                                        </button>
                                                                    )}
                                                                    {isLocked && !item.is_invoiced && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setRevisionTarget({ requestId: req.id, item })}
                                                                            className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-lg px-3 text-xs font-semibold text-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:hover:bg-[#152E52]"
                                                                        >
                                                                            <RotateCcw aria-hidden="true" className="size-3" />
                                                                            <span>Revisi</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Mobile Subtotal Card Summary */}
                                                <div className="rounded-xl bg-[#F8FBFF] dark:bg-[#071322] p-3 border border-[#DCEAF8] dark:border-[#1E3A5F] space-y-1.5 text-xs">
                                                    <div className="flex items-center justify-between font-bold text-[#52658E] dark:text-[#94A3B8]">
                                                        <span>Subtotal ({reqItems.length} Item):</span>
                                                        <span className="font-mono text-[#0B1F63] dark:text-[#F1F5F9]">
                                                            {formatRupiah(reqTotalSelling)}
                                                        </span>
                                                    </div>
                                                    {capabilities.can_view_hpp && (
                                                        <div className="flex items-center justify-between text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                            <span>Total HPP:</span>
                                                            <span className="font-mono font-medium">{formatRupiah(reqTotalHpp)}</span>
                                                        </div>
                                                    )}
                                                    {capabilities.can_view_hpp && (
                                                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60">
                                                            <span>Margin:</span>
                                                            <span className="font-mono">{formatRupiah(reqTotalSelling - reqTotalHpp)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>


                                            {/* Panel Keputusan Direktur per Pengajuan (Jika ada item menunggu keputusan) */}
                                            {capabilities.can_decide_items && forwardedItems.length > 0 && (
                                                <div className="border-t border-[#BCE0FD] bg-[#F0F8FF]/70 p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#0060F4] dark:text-[#60A5FA]">
                                                                <CheckCircle2 className="size-3.5" />
                                                                Review Direktur Diperlukan ({forwardedItems.length} Item)
                                                            </span>
                                                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                                Tentukan keputusan persetujuan untuk item yang diajukan oleh Admin Operasional.
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() =>
                                                                    setDecisionDrafts((cur) => {
                                                                        const next = { ...cur };
                                                                        forwardedItems.forEach((it) => {
                                                                            next[it.id] = { ...next[it.id], status: 'approved' };
                                                                        });
                                                                        return next;
                                                                    })
                                                                }
                                                            >
                                                                Setujui Semua
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                isLoading={activeAction === `director-${req.id}`}
                                                                onClick={() => submitDirectorDecisions(req.id, forwardedItems)}
                                                            >
                                                                Simpan Keputusan Direktur
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 space-y-2">
                                                        {forwardedItems.map((item) => {
                                                            const decision = decisionDrafts[item.id] ?? {
                                                                status: 'pending' as DirectorDecision,
                                                                director_notes: '',
                                                            };

                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className="flex flex-col gap-2 rounded-xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#0C1D36] sm:flex-row sm:items-center sm:justify-between"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                                            {item.item_name} ({item.quantity} {item.unit})
                                                                        </p>
                                                                        <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                                                            HPP: {formatRupiah(item.hpp_price)} • Jual: {formatRupiah(item.selling_price)}
                                                                        </p>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        {([
                                                                            { val: 'approved', label: 'Setujui', icon: CheckCircle2, cls: 'bg-emerald-600 text-white' },
                                                                            { val: 'pending', label: 'Pending', icon: CirclePause, cls: 'bg-amber-500 text-white' },
                                                                            { val: 'rejected', label: 'Tolak', icon: CircleX, cls: 'bg-rose-600 text-white' },
                                                                        ] as const).map(({ val, label, icon: Icon, cls }) => (
                                                                            <button
                                                                                key={val}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setDecisionDrafts((cur) => ({
                                                                                        ...cur,
                                                                                        [item.id]: { ...decision, status: val },
                                                                                    }))
                                                                                }
                                                                                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition ${decision.status === val
                                                                                        ? cls
                                                                                        : 'border-[#DCEAF8] bg-white text-[#52658E] hover:bg-[#F0F8FF] dark:border-[#1E3A5F] dark:bg-[#0C1D36]'
                                                                                    }`}
                                                                            >
                                                                                <Icon className="size-3" />
                                                                                <span>{label}</span>
                                                                            </button>
                                                                        ))}

                                                                        <input
                                                                            type="text"
                                                                            placeholder="Catatan Direktur..."
                                                                            value={decision.director_notes}
                                                                            onChange={(e) =>
                                                                                setDecisionDrafts((cur) => ({
                                                                                    ...cur,
                                                                                    [item.id]: { ...decision, director_notes: e.target.value },
                                                                                }))
                                                                            }
                                                                            className="min-h-8 rounded-lg border border-[#DCEAF8] px-2 py-0.5 text-xs text-[#0B1F63] focus:border-[#0060F4] focus:ring-0 dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Invoices Terkait Pengajuan Ini */}
                                            {req.invoices && req.invoices.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-2 border-t border-[#DCEAF8] bg-[#F8FBFF] px-4 py-2.5 text-xs dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                    <span className="font-bold text-[#52658E] dark:text-[#94A3B8]">
                                                        Invoice Terbit:
                                                    </span>
                                                    {req.invoices.map((inv) => (
                                                        <span
                                                            key={inv.id}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#BCE0FD] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#60A5FA]"
                                                        >
                                                            <FileText className="size-3" />
                                                            <span>{inv.invoice_number}</span>
                                                            <span className="text-[10px] text-[#52658E]">({formatRupiah(inv.grand_total)})</span>
                                                            <StatusBadge status={inv.status} label={inv.status} size="sm" showDot={false} />
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="p-8 text-center text-xs text-[#52658E] dark:text-[#94A3B8]">
                                            <p className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                                Data Tidak Ditemukan
                                            </p>
                                            {canAddItemToReq && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAddItemTargetReqId(req.id);
                                                    }}
                                                    className="mt-2.5 inline-flex items-center gap-1 font-bold text-[#0060F4] hover:underline"
                                                >
                                                    <Plus className="size-3.5" />
                                                    Tambah item sekarang
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </section>
                            );
                        })
                    ) : (
                        <Card className="p-12 text-center rounded-2xl border-[#DCEAF8] dark:border-[#1E3A5F]">
                            <div className="text-4xl mb-3">📋</div>
                            <h3 className="text-base font-bold text-[#0B1F63] dark:text-white">
                                Belum ada surat pengajuan untuk kegiatan kapal ini
                            </h3>
                            <p className="text-xs text-[#52658E] dark:text-[#94A3B8] mt-1 max-w-md mx-auto">
                                {capabilities.can_create_requests
                                    ? 'Silakan buat surat pengajuan baru untuk menambahkan rincian kebutuhan logistik kapal.'
                                    : 'Belum ada surat pengajuan yang dapat ditampilkan untuk kegiatan kapal ini.'}
                            </p>
                            {capabilities.can_create_requests && (
                                <Link
                                    href={route('requests.create')}
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0060F4] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#082870]"
                                >
                                    <Plus className="size-3.5" />
                                    <span>Buat Pengajuan Baru</span>
                                </Link>
                            )}
                        </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Tambah Item Kebutuhan */}
            <Modal
                isOpen={addItemTargetReqId !== null}
                onClose={() => {
                    setAddItemTargetReqId(null);
                    itemForm.reset();
                    itemForm.clearErrors();
                }}
                title="Tambah Kebutuhan Kapal"
                subtitle="Tambahkan item barang atau jasa logistik untuk surat pengajuan ini."
                size="md"
            >
                <form noValidate onSubmit={submitItem} className="space-y-4">
                    <FormErrorSummary errors={itemForm.errors} />
                    {/* Pilih Cepat dari Katalog Master Produk */}
                    <Select name="product_id" label="Pilih dari Katalog Layanan / Produk (Opsional)" value={itemForm.data.product_id} onChange={(event) => selectProduct(event.target.value)} error={itemForm.errors.product_id} options={[{ value: '', label: 'Ketik manual atau pilih dari katalog' }, ...products.map((product) => ({ value: product.id, label: `${product.name} (${product.unit}) — ${product.item_type === 'jasa' ? 'Jasa' : 'Non-Jasa'}` }))]} />
                    <Input required name="item_name" autoComplete="off" label="Nama Item Kebutuhan / Layanan" value={itemForm.data.item_name} onChange={(event) => itemForm.setData('item_name', event.target.value)} placeholder="Contoh: Air Tawar 50 Ton" error={itemForm.errors.item_name} />

                    <div className="grid grid-cols-2 gap-3">
                        <Input required name="quantity" label="Jumlah (Qty)" type="number" step="any" min="0.01" value={itemForm.data.quantity} onChange={(event) => itemForm.setData('quantity', event.target.value)} error={itemForm.errors.quantity} />
                        <Input required name="unit" autoComplete="off" label="Satuan" value={itemForm.data.unit} onChange={(event) => itemForm.setData('unit', event.target.value)} placeholder="Ton, Dokumen, Jam, Trip" error={itemForm.errors.unit} />
                    </div>

                    <Textarea name="notes" label="Catatan / Spesifikasi Khusus (Opsional)" rows={2} value={itemForm.data.notes} onChange={(event) => itemForm.setData('notes', event.target.value)} placeholder="Keterangan tambahan untuk vendor atau kebutuhan operasional…" error={itemForm.errors.notes} maxLength={500} showCharCount />

                    <Checkbox id="is_urgent_checkbox" checked={itemForm.data.is_urgent} onChange={(event) => itemForm.setData('is_urgent', event.target.checked)} error={itemForm.errors.is_urgent} label={<span className="flex items-center gap-1 text-rose-600"><Flame className="size-3.5 fill-rose-500" /> Tandai Sebagai Kebutuhan Mendesak</span>} />

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setAddItemTargetReqId(null);
                                itemForm.reset();
                                itemForm.clearErrors();
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            isLoading={itemForm.processing}
                        >
                            Simpan Item
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Revisi Harga */}
            <Modal
                isOpen={revisionTarget !== null}
                onClose={() => {
                    if (activeAction !== 'revision') {
                        setRevisionTarget(null);
                        setRevisionReason('');
                    }
                }}
                title="Ajukan Revisi Harga Item"
                subtitle={`Buka kembali persetujuan harga untuk ${revisionTarget?.item.item_name ?? 'item ini'}.`}
                size="md"
            >
                <div className="space-y-4">
                    <label className="block text-xs font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                        Alasan Revisi Harga *
                        <textarea
                            rows={3}
                            value={revisionReason}
                            onChange={(e) => setRevisionReason(e.target.value)}
                            placeholder="Contoh: Ada koreksi penawaran dari vendor atau perubahan margin..."
                            className="mt-1.5 w-full rounded-xl border-[#DCEAF8] text-xs text-[#0B1F63] focus:border-[#0060F4] focus:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#F1F5F9]"
                        />
                    </label>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#DCEAF8] dark:border-[#1E3A5F]">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={activeAction === 'revision'}
                            onClick={() => {
                                setRevisionTarget(null);
                                setRevisionReason('');
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={!revisionReason.trim()}
                            isLoading={activeAction === 'revision'}
                            onClick={submitRevision}
                        >
                            Ajukan Revisi
                        </Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
