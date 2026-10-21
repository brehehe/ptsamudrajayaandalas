import React, { FormEvent, useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, FilePlus2, FileText, FileUp, ListChecks, MapPin, RotateCcw, Search, Send, Ship, SlidersHorizontal, X } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import Checkbox from '../../Components/forms/Checkbox';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Input from '../../Components/forms/Input';
import MoneyInput, { normalizeRupiahInput } from '../../Components/forms/MoneyInput';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import Textarea from '../../Components/forms/Textarea';
import StatusBadge from '../../Components/ui/StatusBadge';
import Tabs from '../../Components/ui/Tabs';
import Table, { Column } from '../../Components/tables/Table';
import ShipImage from '../../Components/vessels/ShipImage';
import Modal from '../../Components/overlays/Modal';
import Select from '../../Components/selects/Select';
import SelectSearch, { type SelectSearchOption } from '../../Components/selects/SelectSearch';
import DateRangePicker, { DateRange } from '../../Components/forms/DateRangePicker';
import ImportExportActions from '../../Components/ui/ImportExportActions';
import { toDateInputValue } from '../../lib/formatDate';

interface RequestItem {
    id: string;
    item_name?: string;
    quantity: number | string;
    unit?: string;
    hpp_price?: number | string;
    status: string;
    director_status?: string;
    attachment_url?: string | null;
    supplier_invoice_number?: string | null;
    supplier_invoice_date?: string | null;
    supplier_invoice_received_date?: string | null;
    supplier_invoice_due_date?: string | null;
    supplier_invoice_url?: string | null;
    supplier_invoice_complete?: boolean;
    is_invoiced?: boolean;
    vendor?: {
        id: string;
        name: string;
    };
    surplus_source_item_id?: string | null;
    surplus_source_item_name?: string | null;
    surplus_amount?: number | string | null;
    original_hpp_price?: number | string | null;
}

interface VendorOption {
    id: string;
    name: string;
}

interface ShipRequest {
    id: string;
    request_number: string;
    status: string;
    request_date: string;
    created_at: string;
    ship?: {
        id: string;
        name: string;
        image?: string | null;
        company?: { name: string };
    };
    company?: { name: string };
    port?: { name: string };
    port_call?: {
        id: string;
        job_number?: string;
        status?: string;
        eta_at?: string;
        port?: { name: string };
        work_order?: { system_number: string };
    };
    items?: RequestItem[];
    creator?: {
        id: number | string;
        name: string;
    };
}

interface PortCall {
    id: string;
    job_number: string;
    status?: string;
    eta_at?: string;
    created_at?: string;
    updated_at?: string;
    ship?: {
        id: string;
        name: string;
        image?: string | null;
        company?: { name: string };
    };
    port?: { name: string };
    work_order?: { system_number: string };
}

interface RequestsIndexProps {
    requests: ShipRequest[];
    portCalls?: PortCall[];
    counts: {
        semua?: number;
        menunggu?: number;
        diproses?: number;
        selesai?: number;
    };
    activeTab: string;
    search: string;
    vendors?: VendorOption[];
    ships?: Array<{ id: string; name: string; ship_company_id?: string; company?: { id?: string; name: string } }>;
    companies?: Array<{ id: string; name: string }>;
    jobs?: Array<{ id: string; job_number?: string; ship_id?: string }>;
    filters?: {
        search?: string;
        company_id?: string;
        ship_id?: string;
        job?: string;
        start_date?: string;
        end_date?: string;
    };
    capabilities?: {
        can_review_prices: boolean;
        can_decide_items: boolean;
        can_view_hpp: boolean;
        can_create_requests: boolean;
        can_process_requests: boolean;
    };
}

interface JobRow {
    key: string;
    jobNumber: string;
    shipName: string;
    shipImage?: string | null;
    companyName: string;
    portName: string;
    requests: ShipRequest[];
    totalItems: number;
    evidenceCount: number;
    totalHpp: number;
    status: string;
    updatedAt: string;
    isNew: boolean;
    creatorNames: string[];
    forwardableItemCount: number;
    readyItemIds: string[];
    forwardableItems: ForwardableItem[];
}

interface ForwardableItem {
    id: string;
    itemName: string;
    requestNumber: string;
    quantity: number | string;
    unit?: string;
    hppPrice: number;
    isReady: boolean;
    readinessLabel: string;
    requestItem: RequestItem;
}

interface SupplierInvoiceTarget {
    jobKey: string;
    item: ForwardableItem;
}

const DEFAULT_CAPABILITIES = {
    can_review_prices: false,
    can_decide_items: false,
    can_view_hpp: false,
    can_create_requests: false,
    can_process_requests: false,
};

const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);

const parseRupiah = (value?: number | string | null): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
};

const formatDate = (value?: string): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const normalizeStatus = (status?: string): string => (status || '').trim().toLowerCase();

const requestStatusLabel = (status: string): string =>
    normalizeStatus(status) === 'menunggu approval' ? 'Menunggu Approval Admin' : status;

const statusPriority = (status: string): number => {
    const normalized = normalizeStatus(status);
    if (normalized.includes('tolak')) return 5;
    if (normalized.includes('menunggu')) return 4;
    if (normalized.includes('setuju')) return 3;
    if (normalized.includes('proses')) return 2;
    return 1;
};

export default function RequestsIndex({
    requests,
    portCalls = [],
    counts,
    activeTab,
    search: initialSearch,
    vendors = [],
    ships = [],
    companies = [],
    jobs = [],
    filters,
    capabilities = DEFAULT_CAPABILITIES,
}: RequestsIndexProps) {
    const [search, setSearch] = useState(filters?.search || initialSearch || '');
    const [companyId, setCompanyId] = useState(filters?.company_id || '');
    const [shipId, setShipId] = useState(filters?.ship_id || '');
    const [jobNumber, setJobNumber] = useState(filters?.job || '');
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: filters?.start_date || '',
        endDate: filters?.end_date || '',
    });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modalCompanyId, setModalCompanyId] = useState(filters?.company_id || '');
    const [modalShipId, setModalShipId] = useState(filters?.ship_id || '');
    const [modalJobNumber, setModalJobNumber] = useState(filters?.job || '');
    const [modalDateRange, setModalDateRange] = useState<DateRange>({
        startDate: filters?.start_date || '',
        endDate: filters?.end_date || '',
    });

    const modalAvailableShips = useMemo(() => {
        if (!modalCompanyId) return ships;
        return ships.filter((ship) => (ship.ship_company_id || ship.company?.id) === modalCompanyId);
    }, [modalCompanyId, ships]);

    const companyOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: '', label: 'Semua Perusahaan' },
            ...companies.map((c) => ({ value: c.id, label: c.name })),
        ],
        [companies]
    );

    const modalShipOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: '', label: 'Semua Kapal' },
            ...modalAvailableShips.map((ship) => ({ value: ship.id, label: ship.name })),
        ],
        [modalAvailableShips]
    );

    const jobOptions = useMemo<SelectSearchOption[]>(
        () => [
            { value: '', label: 'Semua Job' },
            ...jobs.map((j) => ({ value: j.job_number || j.id, label: j.job_number || j.id })),
        ],
        [jobs]
    );

    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [itemPickerJobKey, setItemPickerJobKey] = useState<string | null>(null);
    const [isBatchForwarding, setIsBatchForwarding] = useState(false);
    const [batchError, setBatchError] = useState('');
    const [batchAdminNotes, setBatchAdminNotes] = useState('');
    const [supplierInvoiceTarget, setSupplierInvoiceTarget] = useState<SupplierInvoiceTarget | null>(null);
    const supplierInvoiceForm = useForm({
        vendor_id: '',
        hpp_price: '',
        surplus_source_item_id: '',
        surplus_amount: '',
        supplier_invoice_number: '',
        supplier_invoice_date: toDateInputValue(),
        supplier_invoice_received_date: toDateInputValue(),
        supplier_invoice_due_date: '',
        supplier_invoice_document: null as File | null,
    });

    const requestNeedsAction = (request: ShipRequest): boolean => {
        const status = normalizeStatus(request.status);
        const items = request.items || [];

        if (capabilities.can_decide_items) {
            return (
                status === 'menunggu approval direktur' ||
                items.some(
                    (item) =>
                        normalizeStatus(item.status).includes('direktur') &&
                        (!item.director_status || item.director_status === 'pending')
                )
            );
        }

        if (capabilities.can_review_prices || capabilities.can_process_requests) {
            return (
                ['menunggu approval', 'disetujui', 'disetujui sebagian'].includes(status) ||
                items.some((item) => item.director_status === 'rejected')
            );
        }

        if (capabilities.can_create_requests) {
            return status === 'ditolak' || items.some((item) => item.director_status === 'rejected');
        }

        return false;
    };

    const rows = useMemo<JobRow[]>(() => {
        const groups = new Map<string, JobRow>();

        portCalls.forEach((portCall) => {
            groups.set(portCall.id, {
                key: portCall.id,
                jobNumber: portCall.job_number || portCall.work_order?.system_number || '-',
                shipName: portCall.ship?.name || 'Kapal belum ditentukan',
                shipImage: portCall.ship?.image,
                companyName: portCall.ship?.company?.name || '-',
                portName: portCall.port?.name || '-',
                requests: [],
                totalItems: 0,
                evidenceCount: 0,
                totalHpp: 0,
                status: 'Belum Ada Pengajuan',
                updatedAt: portCall.updated_at || portCall.eta_at || portCall.created_at || '',
                isNew: capabilities.can_create_requests,
                creatorNames: [],
                forwardableItemCount: 0,
                readyItemIds: [],
                forwardableItems: [],
            });
        });

        requests.forEach((request) => {
            const key = request.port_call?.id || request.port_call?.job_number || request.id;
            const existing = groups.get(key);
            const items = request.items || [];
            const updatedAt = request.created_at || request.request_date;
            const requestHpp = items.reduce(
                (total, item) => total + Number(item.hpp_price || 0) * Number(item.quantity || 0),
                0
            );
            const evidenceCount = items.filter((item) => item.attachment_url || item.supplier_invoice_url).length;
            const creatorName = request.creator?.name;
            if (!existing) {
                groups.set(key, {
                    key,
                    jobNumber:
                        request.port_call?.job_number ||
                        request.port_call?.work_order?.system_number ||
                        request.request_number,
                    shipName: request.ship?.name || 'Kapal belum ditentukan',
                    shipImage: request.ship?.image,
                    companyName: request.company?.name || request.ship?.company?.name || '-',
                    portName: request.port_call?.port?.name || request.port?.name || '-',
                    requests: [request],
                    totalItems: items.length,
                    evidenceCount,
                    totalHpp: requestHpp,
                    status: request.status,
                    updatedAt,
                    isNew: requestNeedsAction(request),
                    creatorNames: creatorName ? [creatorName] : [],
                    forwardableItemCount: 0,
                    readyItemIds: [],
                    forwardableItems: [],
                });
                return;
            }

            const hadRequests = existing.requests.length > 0;
            existing.requests.push(request);
            existing.totalItems += items.length;
            existing.evidenceCount += evidenceCount;
            existing.totalHpp += requestHpp;
            if (creatorName && !existing.creatorNames.includes(creatorName)) {
                existing.creatorNames.push(creatorName);
            }
            existing.isNew = hadRequests
                ? existing.isNew || requestNeedsAction(request)
                : requestNeedsAction(request);

            if (!hadRequests || statusPriority(request.status) > statusPriority(existing.status)) {
                existing.status = request.status;
            }
            if (new Date(updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
                existing.updatedAt = updatedAt;
            }
        });

        return Array.from(groups.values()).map((row) => {
            const forwardableItems: ForwardableItem[] = row.requests.flatMap((request) => {
                if (['selesai', 'dibatalkan'].includes(normalizeStatus(request.status))) {
                    return [];
                }

                return (request.items || [])
                    .filter((item) => {
                        const itemStatus = normalizeStatus(item.status);

                        return item.director_status !== 'approved' &&
                            !item.is_invoiced &&
                            itemStatus !== 'diajukan_ke_direktur';
                    })
                    .map((item) => {
                        const hasSupplierInvoice = Boolean(item.supplier_invoice_complete);
                        const hppPrice = Number(item.hpp_price || 0);
                        const hasValidHpp = hppPrice > 0;
                        const readinessLabel = !hasSupplierInvoice && !hasValidHpp
                            ? 'Lengkapi nota supplier dan HPP'
                            : !hasSupplierInvoice
                              ? 'Nota supplier belum lengkap'
                              : !hasValidHpp
                                ? 'HPP belum diisi'
                                : 'Siap diajukan ke Direktur';

                        return {
                            id: item.id,
                            itemName: item.item_name || 'Item kebutuhan',
                            requestNumber: request.request_number,
                            quantity: item.quantity,
                            unit: item.unit,
                            hppPrice,
                            isReady: hasSupplierInvoice && hasValidHpp,
                            readinessLabel,
                            requestItem: item,
                        };
                    });
            });
            const readyItemIds = forwardableItems
                .filter((item) => item.isReady)
                .map((item) => item.id);

            return {
                ...row,
                forwardableItemCount: forwardableItems.length,
                readyItemIds,
                forwardableItems,
            };
        }).sort((a, b) => {
            if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [requests, portCalls, capabilities]);

    const columns = useMemo<Column<JobRow>[]>(
        () => [
            {
                key: 'job',
                header: 'Job / Kapal',
                width: '260px',
                render: (row) => (
                    <div className="flex min-w-0 items-center gap-2.5">
                        <ShipImage src={row.shipImage} alt={`Foto ${row.shipName}`} width={44} height={44} loading="lazy" className="size-11 shrink-0 rounded-lg object-cover" placeholderIconClassName="size-4" />
                        <div className="whitespace-nowrap">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="whitespace-nowrap font-mono text-xs font-bold text-[#0060F4]">
                                    {row.jobNumber}
                                </span>
                                {row.isNew && (
                                    <span className="rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                        Baru
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 whitespace-nowrap font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {row.shipName}
                            </p>
                            {row.creatorNames.length > 0 && (
                                <p className="mt-0.5 whitespace-nowrap text-[11px] text-[#0060F4] dark:text-[#38BDF8]">
                                    Diajukan: <span className="font-semibold">{row.creatorNames.join(', ')}</span>
                                </p>
                            )}
                        </div>
                    </div>
                ),
            },
            {
                key: 'location',
                header: 'Klien / Pelabuhan',
                width: '240px',
                render: (row) => (
                    <div className="space-y-1 whitespace-nowrap">
                        <p className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                            {row.companyName}
                        </p>
                        <p className="text-[#52658E] dark:text-[#94A3B8]">{row.portName}</p>
                    </div>
                ),
            },
            {
                key: 'requests',
                header: 'Pengajuan',
                width: '130px',
                render: (row) => (
                    <div className="whitespace-nowrap">
                        <strong>{row.requests.length}</strong> surat · <strong>{row.totalItems}</strong>{' '}
                        item
                        <p className="mt-1 text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                            {row.evidenceCount} bukti item
                        </p>
                        {capabilities.can_review_prices && row.forwardableItemCount > 0 && (
                            <p className={`mt-1 text-[11px] font-bold ${
                                row.readyItemIds.length > 0
                                    ? 'text-[#087A45] dark:text-[#34D399]'
                                    : 'text-[#B85C00] dark:text-[#FBBF24]'
                            }`}>
                                {row.readyItemIds.length}/{row.forwardableItemCount} item siap dikirim
                            </p>
                        )}
                    </div>
                ),
            },
            {
                key: 'status',
                header: 'Status',
                width: '180px',
                render: (row) => (
                    <StatusBadge status={row.status} label={requestStatusLabel(row.status)} size="sm" showDot />
                ),
            },
            {
                key: 'value',
                header: 'Total HPP',
                align: 'right',
                width: '190px',
                render: (row) => (
                    <div className="whitespace-nowrap font-mono tabular-nums">
                        <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                            {formatCurrency(row.totalHpp)}
                        </p>
                    </div>
                ),
            },
            {
                key: 'updated',
                header: 'Diperbarui',
                width: '150px',
                render: (row) => (
                    <span className="whitespace-nowrap text-[#52658E] dark:text-[#94A3B8]">
                        {formatDate(row.updatedAt)}
                    </span>
                ),
            },
            {
                key: 'action',
                header: 'Aksi',
                align: 'right',
                width: '250px',
                render: (row) => {
                    const selectedCount = row.forwardableItems.filter((item) => selectedItemIds.includes(item.id)).length;

                    return (
                        <div className="flex items-center justify-end gap-2">
                            {capabilities.can_review_prices && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={selectedCount > 0 ? 'primary' : 'outline'}
                                    disabled={row.forwardableItemCount === 0}
                                    leftIcon={<ListChecks aria-hidden="true" className="size-4" />}
                                    onClick={() => setItemPickerJobKey(row.key)}
                                >
                                    {selectedCount > 0 ? `${selectedCount} Item Dipilih` : 'Pilih Item'}
                                </Button>
                            )}
                            <Link
                                href={route('requests.detail', row.jobNumber)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-[#DCEAF8] bg-white px-3 font-bold text-[#0060F4] hover:border-[#0060F4] hover:bg-[#F0F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322]"
                                aria-label={`Buka ${row.jobNumber}`}
                            >
                                Buka <ArrowRight aria-hidden="true" className="size-3.5" />
                            </Link>
                        </div>
                    );
                },
            },
        ],
        [capabilities.can_review_prices, selectedItemIds]
    );

    const visit = (
        tab = activeTab,
        query = search,
        comp = companyId,
        ship = shipId,
        job = jobNumber,
        dRange = dateRange
    ): void => {
        setSelectedItemIds([]);
        setItemPickerJobKey(null);
        setBatchError('');
        router.get(
            route('requests.index'),
            {
                tab,
                search: query || undefined,
                company_id: comp || undefined,
                ship_id: ship || undefined,
                job: job || undefined,
                start_date: dRange.startDate || undefined,
                end_date: dRange.endDate || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const openFilterModal = (): void => {
        setModalCompanyId(companyId);
        setModalShipId(shipId);
        setModalJobNumber(jobNumber);
        setModalDateRange(dateRange);
        setIsFilterModalOpen(true);
    };

    const applyModalFilters = (): void => {
        setCompanyId(modalCompanyId);
        setShipId(modalShipId);
        setJobNumber(modalJobNumber);
        setDateRange(modalDateRange);
        setIsFilterModalOpen(false);
        visit(activeTab, search, modalCompanyId, modalShipId, modalJobNumber, modalDateRange);
    };

    const handleResetAllFilters = (): void => {
        setSearch('');
        setCompanyId('');
        setShipId('');
        setJobNumber('');
        const emptyRange: DateRange = { startDate: '', endDate: '' };
        setDateRange(emptyRange);
        visit(activeTab, '', '', '', '', emptyRange);
    };

    const hasActiveFilters = Boolean(
        search || companyId || shipId || jobNumber || dateRange.startDate || dateRange.endDate
    );
    const activeFilterCount = [
        companyId,
        shipId,
        jobNumber,
        dateRange.startDate || dateRange.endDate,
    ].filter(Boolean).length;

    const selectedRows = useMemo(
        () => rows.filter((row) => row.forwardableItems.some((item) => selectedItemIds.includes(item.id))),
        [rows, selectedItemIds]
    );
    const itemPickerRow = useMemo(
        () => rows.find((row) => row.key === itemPickerJobKey) || null,
        [rows, itemPickerJobKey]
    );

    const toggleItemSelection = (itemId: string, selected: boolean): void => {
        setBatchError('');
        setSelectedItemIds((current) =>
            selected ? Array.from(new Set([...current, itemId])) : current.filter((id) => id !== itemId)
        );
    };

    const availableSurplusItemsForModal = useMemo(() => {
        if (!supplierInvoiceTarget) return [];
        const job = rows.find((r) => r.key === supplierInvoiceTarget.jobKey);
        if (!job) return [];
        return job.requests
            .flatMap((req) => req.items || [])
            .filter((it) => it.id !== supplierInvoiceTarget.item.id);
    }, [supplierInvoiceTarget, rows]);

    const openSupplierInvoiceModal = (item: ForwardableItem, jobKey: string): void => {
        const requestItem = item.requestItem;
        const currentDate = toDateInputValue();
        const grossHpp = requestItem.original_hpp_price ?? requestItem.hpp_price ?? 0;

        setItemPickerJobKey(null);
        setSupplierInvoiceTarget({ item, jobKey });
        supplierInvoiceForm.setData({
            vendor_id: requestItem.vendor?.id ?? '',
            hpp_price: normalizeRupiahInput(grossHpp),
            surplus_source_item_id: requestItem.surplus_source_item_id ?? '',
            surplus_amount: requestItem.surplus_amount ? normalizeRupiahInput(requestItem.surplus_amount) : '',
            supplier_invoice_number: requestItem.supplier_invoice_number ?? '',
            supplier_invoice_date: requestItem.supplier_invoice_date?.slice(0, 10) || currentDate,
            supplier_invoice_received_date: requestItem.supplier_invoice_received_date?.slice(0, 10) || currentDate,
            supplier_invoice_due_date: requestItem.supplier_invoice_due_date?.slice(0, 10) ?? '',
            supplier_invoice_document: null,
        });
        supplierInvoiceForm.clearErrors();
    };

    const closeSupplierInvoiceModal = (restoreItemPicker = true): void => {
        const jobKey = supplierInvoiceTarget?.jobKey;

        setSupplierInvoiceTarget(null);
        supplierInvoiceForm.reset();
        supplierInvoiceForm.clearErrors();

        if (restoreItemPicker && jobKey) {
            setItemPickerJobKey(jobKey);
        }
    };

    const submitSupplierInvoice = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        if (!supplierInvoiceTarget) return;

        const { item, jobKey } = supplierInvoiceTarget;

        supplierInvoiceForm.post(route('request-items.supplier-invoice.store', item.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setSelectedItemIds((current) => Array.from(new Set([...current, item.id])));
                setSupplierInvoiceTarget(null);
                supplierInvoiceForm.reset();
                supplierInvoiceForm.clearErrors();
                setItemPickerJobKey(jobKey);
            },
        });
    };

    const submitSelectedItems = (): void => {
        if (selectedItemIds.length === 0 || isBatchForwarding) return;

        setBatchError('');
        router.post(
            route('requests.batch-forward-director'),
            {
                selected_items: selectedItemIds,
                admin_notes: batchAdminNotes.trim() || null,
            },
            {
                preserveScroll: true,
                onStart: () => setIsBatchForwarding(true),
                onSuccess: () => {
                    setSelectedItemIds([]);
                    setItemPickerJobKey(null);
                    setBatchAdminNotes('');
                },
                onError: (errors) => {
                    const message = Object.values(errors).find((error) => typeof error === 'string');
                    setBatchError(message || 'Pengajuan belum dapat dikirim. Periksa kembali data item.');
                },
                onFinish: () => setIsBatchForwarding(false),
            }
        );
    };

    const renderBatchActionBar = (mobile = false) => {
        if (!capabilities.can_review_prices) return null;

        return (
            <section
                aria-label="Kirim item pilihan ke Direktur"
                className={`rounded-2xl border border-[#B9D9FF] bg-[#EAF5FF] p-3 dark:border-[#285585] dark:bg-[#102B4A] ${
                    mobile ? 'mb-3' : ''
                }`}
            >
                <div className={`flex gap-3 ${mobile ? 'flex-col' : 'items-center justify-between'}`}>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-[#082870] dark:text-white">
                            Kirim item pilihan ke Direktur
                        </p>
                        <p className="mt-0.5 text-xs text-[#52658E] dark:text-[#B5C8DC]" aria-live="polite">
                            {selectedRows.length > 0
                                ? `${selectedItemIds.length} item dari ${selectedRows.length} kapal dipilih.`
                                : 'Buka “Pilih Item” pada kapal, lalu centang item yang akan dikirim.'}
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        isLoading={isBatchForwarding}
                        disabled={selectedItemIds.length === 0}
                        leftIcon={<Send aria-hidden="true" className="size-4" />}
                        onClick={submitSelectedItems}
                        className={mobile ? 'w-full' : 'shrink-0'}
                    >
                        Kirim {selectedItemIds.length > 0 ? `${selectedItemIds.length} Item` : 'ke Direktur'}
                    </Button>
                </div>
                <div className="mt-3">
                    <Textarea
                        id={mobile ? 'batch-admin-notes-mobile' : 'batch-admin-notes-desktop'}
                        name="admin_notes"
                        autoComplete="off"
                        label="Catatan untuk Direktur (Opsional)"
                        helperText="Catatan ini akan tampil bersama pengajuan di halaman approval Direktur."
                        rows={2}
                        maxLength={1000}
                        showCharCount
                        value={batchAdminNotes}
                        onChange={(event) => setBatchAdminNotes(event.target.value)}
                        disabled={isBatchForwarding}
                        placeholder="Contoh: HPP Taktis sudah ditinjau dan tidak menggunakan vendor…"
                    />
                </div>
                {batchError && (
                    <p className="mt-2 text-xs font-semibold text-[#C62840] dark:text-[#F87171]" role="alert">
                        {batchError}
                    </p>
                )}
            </section>
        );
    };

    const renderFilterToolbar = () => (
        <Card padding="md">
            <div className="space-y-3">
                <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            visit();
                        }}
                        className="relative min-w-0 flex-1"
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
                            placeholder="Cari job, kapal, atau nomor pengajuan…"
                            aria-label="Cari pengajuan"
                            className="h-11 w-full rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] pl-10 pr-11 text-xs font-semibold text-[#0B1F63] placeholder:text-[#8C9BB9] focus-visible:border-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/30 sm:text-sm dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-white"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    visit(activeTab, '', companyId, shipId, jobNumber, dateRange);
                                }}
                                className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-xl text-[#8C9BB9] hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#0060F4] dark:hover:text-[#F87171]"
                                aria-label="Hapus pencarian"
                            >
                                <X aria-hidden="true" className="size-4" />
                            </button>
                        )}
                    </form>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            variant={activeFilterCount > 0 ? 'primary' : 'outline'}
                            onClick={openFilterModal}
                            leftIcon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
                            className="h-11 flex-1 px-4 text-xs font-bold sm:flex-none"
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
                                onClick={handleResetAllFilters}
                                className="h-11 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                                <RotateCcw aria-hidden="true" className="mr-1 size-3.5" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-[#DCEAF8]/60 pt-2.5 text-xs dark:border-[#1E3A5F]/60">
                        <span className="text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                            Filter aktif:
                        </span>
                        {companyId && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                Perusahaan: {companies.find((company) => company.id === companyId)?.name || companyId}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCompanyId('');
                                        setShipId('');
                                        visit(activeTab, search, '', '', jobNumber, dateRange);
                                    }}
                                    className="flex size-6 items-center justify-center rounded-full hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4]"
                                    aria-label="Hapus filter perusahaan"
                                >
                                    <X aria-hidden="true" className="size-3" />
                                </button>
                            </span>
                        )}
                        {shipId && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                Kapal: {ships.find((ship) => ship.id === shipId)?.name || shipId}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShipId('');
                                        visit(activeTab, search, companyId, '', jobNumber, dateRange);
                                    }}
                                    className="flex size-6 items-center justify-center rounded-full hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4]"
                                    aria-label="Hapus filter kapal"
                                >
                                    <X aria-hidden="true" className="size-3" />
                                </button>
                            </span>
                        )}
                        {jobNumber && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                Job: {jobNumber}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setJobNumber('');
                                        visit(activeTab, search, companyId, shipId, '', dateRange);
                                    }}
                                    className="flex size-6 items-center justify-center rounded-full hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4]"
                                    aria-label="Hapus filter job"
                                >
                                    <X aria-hidden="true" className="size-3" />
                                </button>
                            </span>
                        )}
                        {(dateRange.startDate || dateRange.endDate) && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1 text-xs font-semibold text-[#0060F4] dark:bg-[#132847] dark:text-[#38BDF8]">
                                Periode: {dateRange.startDate || 'Awal'} — {dateRange.endDate || 'Akhir'}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const emptyRange: DateRange = { startDate: '', endDate: '' };
                                        setDateRange(emptyRange);
                                        visit(activeTab, search, companyId, shipId, jobNumber, emptyRange);
                                    }}
                                    className="flex size-6 items-center justify-center rounded-full hover:text-[#C62840] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0060F4]"
                                    aria-label="Hapus filter periode"
                                >
                                    <X aria-hidden="true" className="size-3" />
                                </button>
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );

    return (
        <AppLayout
            title="Pengajuan"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Pengajuan - PT Samudra Jaya Andalas" />

            <div className="md:hidden">
                <div className="mobile-photo-copy relative flex min-h-[200px] w-full flex-col justify-end overflow-hidden bg-[#8FCDF4] px-4 pb-8 pt-20 text-white">
                    <img
                        src="/images/prima-banner.jpg"
                        alt="Pelabuhan dan kapal PT Samudra Jaya Andalas"
                        width={1280}
                        height={720}
                        fetchPriority="high"
                        className="absolute inset-0 size-full object-cover object-[center_35%]"
                    />
                    {/* Bottom shadow overlay — only shadows the bottom portion, leaving top photo bright */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#020b18]/90 via-[#051329]/50 to-transparent"
                    />
                    <div className="relative z-10">
                        <h1 className="text-balance text-[28px] font-extrabold leading-tight text-white">
                            Pengajuan
                        </h1>
                        <p className="mt-1 text-pretty text-xs font-medium text-white">
                            Kebutuhan operasional per kunjungan kapal.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 -mt-5 rounded-t-[28px] bg-sja-surface px-3.5 pb-10 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] dark:bg-[#071322]">
                    {renderFilterToolbar()}

                    <div className="mt-3 flex flex-col gap-2">
                        <ImportExportActions
                            resource="requests"
                            resourceTitle="Pengajuan"
                            canManage={capabilities.can_create_requests}
                            className="w-full justify-between"
                        />
                        {capabilities.can_create_requests && (
                            <Link
                                href={route('requests.create')}
                                prefetch
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35"
                            >
                                <FilePlus2 aria-hidden="true" className="size-4" />
                                Buat Pengajuan
                            </Link>
                        )}
                    </div>

                    <Tabs
                        className="mt-3 py-1"
                        ariaLabel="Filter status pengajuan"
                        activeId={activeTab}
                        onChange={visit}
                        items={[
                            { id: 'semua', label: 'Semua', count: counts.semua || 0 },
                            { id: 'menunggu', label: 'Menunggu', count: counts.menunggu || 0 },
                            { id: 'diproses', label: 'Diproses', count: counts.diproses || 0 },
                            { id: 'selesai', label: 'Selesai', count: counts.selesai || 0 },
                        ]}
                    />

                    {renderBatchActionBar(true)}

                    {rows.length > 0 ? (
                        <div className="space-y-2.5">
                            {rows.map((row) => {
                                const selectedCount = row.forwardableItems.filter((item) => selectedItemIds.includes(item.id)).length;

                                return (
                                    <article
                                        key={row.key}
                                        className={`overflow-hidden rounded-2xl border bg-white shadow-2xs dark:bg-[#0C1D36] ${
                                            selectedCount > 0
                                                ? 'border-[#0060F4] ring-2 ring-[#0060F4]/20 dark:border-[#38BDF8]'
                                                : row.isNew
                                                  ? 'border-[#0060F4] ring-1 ring-[#0060F4]/15 dark:border-[#38BDF8]'
                                                  : 'border-[#E2EEF9] dark:border-[#1E3A5F]'
                                        }`}
                                    >
                                        {capabilities.can_review_prices && (
                                            <div className="flex items-center justify-between gap-3 border-b border-[#E2EEF9] bg-[#F8FBFF] px-3 py-2 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                <p className="text-[11px] font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                                    {row.forwardableItemCount > 0
                                                        ? `${row.readyItemIds.length}/${row.forwardableItemCount} item siap dipilih`
                                                        : 'Tidak ada item yang dapat diajukan'}
                                                </p>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={selectedCount > 0 ? 'primary' : 'outline'}
                                                    disabled={row.forwardableItemCount === 0}
                                                    leftIcon={<ListChecks aria-hidden="true" className="size-4" />}
                                                    onClick={() => setItemPickerJobKey(row.key)}
                                                    className="shrink-0"
                                                >
                                                    {selectedCount > 0 ? `${selectedCount} Dipilih` : 'Pilih Item'}
                                                </Button>
                                            </div>
                                        )}
                                        <Link
                                            href={route('requests.detail', row.jobNumber)}
                                            prefetch
                                            aria-label={`Buka pengajuan ${row.jobNumber} untuk ${row.shipName}`}
                                            className="group grid min-h-28 touch-manipulation grid-cols-[6rem_minmax(0,1fr)] items-stretch gap-x-3 gap-y-2 p-2.5 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#0060F4]"
                                        >
                                    <ShipImage
                                        src={row.shipImage}
                                        alt={`Foto ${row.shipName}`}
                                        width={112}
                                        height={112}
                                        loading="lazy"
                                        className="size-full min-h-28 rounded-xl border border-[#DCEAF8]/60 object-cover dark:border-[#1E3A5F]"
                                    />

                                    <div className="min-w-0 space-y-1.5 py-0.5">
                                        <div className="flex min-w-0 items-start justify-between gap-2">
                                            <h2 className="min-w-0 break-words text-pretty text-[13.5px] font-bold leading-5 text-[#082870] group-hover:text-[#0060F4] dark:text-[#F1F5F9]">
                                                {row.shipName}
                                            </h2>
                                            {row.isNew && (
                                                <span className="shrink-0 whitespace-nowrap rounded-full bg-[#0060F4] px-2 py-0.5 text-[10px] font-bold text-white">
                                                    Baru
                                                </span>
                                            )}
                                        </div>

                                        <StatusBadge
                                            status={row.status}
                                            label={requestStatusLabel(row.status)}
                                            size="sm"
                                            className="max-w-full shrink-0 whitespace-nowrap"
                                        />

                                        <div className="flex min-w-0 items-start gap-1 text-[11px] leading-4 text-[#52658E] dark:text-[#94A3B8]">
                                            <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-[#0060F4]" />
                                            <span className="min-w-0 break-words">{row.portName}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                            <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                                            <span className="tabular-nums">{formatDate(row.updatedAt)}</span>
                                        </div>

                                        {row.creatorNames.length > 0 && (
                                            <p className="text-[11px] text-[#0060F4] dark:text-[#38BDF8]">
                                                Diajukan oleh: <span className="font-semibold">{row.creatorNames.join(', ')}</span>
                                            </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                            <span><strong className="text-[#082870] dark:text-white">{row.requests.length}</strong> surat</span>
                                            <span><strong className="text-[#0060F4]">{row.totalItems}</strong> item</span>
                                            <span><strong className="text-[#0060F4]">{row.evidenceCount}</strong> bukti</span>
                                            <span className="font-semibold tabular-nums text-[#082870] dark:text-white">
                                                {formatCurrency(row.totalHpp)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-span-2 flex min-w-0 items-start gap-2 border-t border-[#E2EEF9] px-1 pt-2 dark:border-[#1E3A5F]">
                                        <span className="shrink-0 text-[10px] font-semibold text-[#8C9BB9] dark:text-[#64748B]">
                                            Job
                                        </span>
                                        <span className="min-w-0 flex-1 break-words font-mono text-[10px] font-bold leading-4 text-[#52658E] dark:text-[#94A3B8]" translate="no">
                                            {row.jobNumber}
                                        </span>
                                        <ArrowRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#0060F4]" />
                                    </div>
                                        </Link>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="border-y border-[#DCEAF8] py-10 text-center dark:border-[#1E3A5F]">
                            <FileText aria-hidden="true" className="mx-auto size-8 text-[#8C9BB9]" />
                            <p className="mt-3 text-sm font-bold text-[#082870] dark:text-white">Data Tidak Ditemukan</p>
                            <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">Ubah pencarian atau filter status.</p>
                        </div>
                    )}

                    <p className="mt-4 flex items-center justify-between gap-3 border-t border-[#DCEAF8] pt-3 text-xs text-[#52658E] dark:border-[#1E3A5F] dark:text-[#94A3B8]">
                        <span>{rows.length} kegiatan ditampilkan</span>
                        <span>Terbaru lebih dulu</span>
                    </p>
                </div>
            </div>

            <div className="mx-auto hidden max-w-7xl space-y-4 pb-10 md:block">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9]">
                            Pengajuan
                        </h1>
                        <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">
                            Antrean kebutuhan per kegiatan kapal.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ImportExportActions
                            resource="requests"
                            resourceTitle="Pengajuan"
                            canManage={capabilities.can_create_requests}
                        />
                        {capabilities.can_create_requests && (
                            <Link
                                href={route('requests.create')}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]"
                            >
                                <FilePlus2 aria-hidden="true" className="size-4" />
                                Buat Pengajuan
                            </Link>
                        )}
                    </div>
                </header>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-[#DCEAF8] bg-white p-4 shadow-2xs dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Total Pengajuan</span>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-[#EAF4FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                                <FileText className="size-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-black text-[#0B1F63] dark:text-white">
                            {counts.semua || 0}
                        </p>
                        <span className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">Semua pengajuan</span>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/20">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Menunggu Approval</span>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                                <Clock className="size-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
                            {counts.menunggu || 0}
                        </p>
                        <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Perlu tindak lanjut</span>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-2xs dark:border-blue-900/60 dark:bg-blue-950/20">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Sedang Diproses</span>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                                <Send className="size-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-200">
                            {counts.diproses || 0}
                        </p>
                        <span className="text-[11px] text-blue-700/80 dark:text-blue-400/80">Pembelian & verifikasi</span>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Selesai</span>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <CheckCircle2 className="size-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
                            {counts.selesai || 0}
                        </p>
                        <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">Tuntas dipenuhi</span>
                    </div>
                </div>

                <section className="space-y-3" aria-label="Filter pengajuan">
                    {renderFilterToolbar()}

                    <Tabs
                        ariaLabel="Filter status pengajuan"
                        activeId={activeTab}
                        onChange={visit}
                        items={[
                            { id: 'semua', label: 'Semua', count: counts.semua || 0 },
                            { id: 'menunggu', label: 'Menunggu', count: counts.menunggu || 0 },
                            { id: 'diproses', label: 'Diproses', count: counts.diproses || 0 },
                            { id: 'selesai', label: 'Selesai', count: counts.selesai || 0 },
                        ]}
                    />
                </section>

                {renderBatchActionBar()}

                <Table
                    columns={columns}
                    data={rows}
                    keyExtractor={(row) => row.key}
                    isLoading={isBatchForwarding}
                    compact
                    minWidth="1180px"
                    emptyIcon={<FileText aria-hidden="true" className="mx-auto size-7" />}
                    emptyMessage="Data Tidak Ditemukan"
                    rowClassName={(row) =>
                        row.isNew
                            ? '!bg-[#E0F0FF]/70 dark:!bg-[#102B4A]'
                            : ''
                    }
                />

                <p className="flex items-center gap-1.5 text-xs text-[#52658E] dark:text-[#94A3B8]">
                    <Ship aria-hidden="true" className="size-3.5" />
                    {rows.length} kegiatan ditampilkan. “Baru” menandai tugas yang perlu ditindaklanjuti
                    oleh role Anda.
                </p>
            </div>

            <Modal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filter Pengajuan"
                subtitle="Saring pengajuan berdasarkan perusahaan, kapal, job, atau periode"
                size="lg"
                asBottomSheetOnMobile
                footer={(
                    <div className="flex w-full items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setModalCompanyId('');
                                setModalShipId('');
                                setModalJobNumber('');
                                setModalDateRange({ startDate: '', endDate: '' });
                            }}
                            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                        >
                            <RotateCcw aria-hidden="true" className="mr-1.5 size-3.5" />
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
                            <Button type="button" variant="primary" onClick={applyModalFilters}>
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
                                const nextCompanyId = String(value || '');
                                setModalCompanyId(nextCompanyId);
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
                            value={modalJobNumber}
                            onChange={(value) => setModalJobNumber(String(value || ''))}
                            options={jobOptions}
                            placeholder="Pilih Job"
                            searchPlaceholder="Cari nomor job…"
                        />
                        <div className="space-y-1.5 text-left">
                            <p className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Periode Pengajuan
                            </p>
                            <DateRangePicker
                                value={modalDateRange}
                                onChange={setModalDateRange}
                                placeholder="Pilih Rentang Tanggal"
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={itemPickerRow !== null}
                onClose={() => setItemPickerJobKey(null)}
                title="Pilih Item untuk Direktur"
                subtitle={itemPickerRow
                    ? `${itemPickerRow.jobNumber} · ${itemPickerRow.shipName}`
                    : undefined}
                size="lg"
                footer={(
                    <div className="flex w-full items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]" role="status">
                            {itemPickerRow?.forwardableItems.filter((item) => selectedItemIds.includes(item.id)).length || 0} item dipilih dari kapal ini
                        </p>
                        <Button type="button" onClick={() => setItemPickerJobKey(null)}>
                            Selesai Pilih Item
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-3">
                    <div className="rounded-xl border border-[#BCE0FD] bg-[#F0F8FF] p-3 text-xs text-[#52658E] dark:border-[#285585] dark:bg-[#102B4A] dark:text-[#B5C8DC]">
                        Centang hanya item yang ingin diajukan. Item Taktis tidak memerlukan vendor atau nota supplier; item lain tetap harus dilengkapi sebelum dikirim.
                    </div>

                    <div className="space-y-2">
                        {itemPickerRow?.forwardableItems.map((item) => {
                            const isSelected = selectedItemIds.includes(item.id);

                            return (
                                <div
                                    key={item.id}
                                    className={`rounded-xl border p-3 transition-colors ${
                                        isSelected
                                            ? 'border-[#0060F4] bg-[#F0F8FF] dark:border-[#38BDF8] dark:bg-[#102B4A]'
                                            : 'border-[#DCEAF8] bg-white dark:border-[#1E3A5F] dark:bg-[#071322]'
                                    }`}
                                >
                                    <Checkbox
                                        id={`select-item-${item.id}`}
                                        checked={isSelected}
                                        disabled={!item.isReady || isBatchForwarding}
                                        label={item.itemName}
                                        description={`${item.requestNumber} · ${item.quantity} ${item.unit || ''} · HPP ${formatCurrency(item.hppPrice)}`}
                                        onChange={(event) => toggleItemSelection(item.id, event.target.checked)}
                                    />
                                    {item.requestItem.surplus_amount && Number(item.requestItem.surplus_amount) > 0 && (
                                        <div className="mt-1 ml-7 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                            🔄 Dialihkan <strong>{formatCurrency(Number(item.requestItem.surplus_amount))}</strong> dari {item.requestItem.surplus_source_item_name || 'item lain'}
                                            {item.requestItem.original_hpp_price && Number(item.requestItem.original_hpp_price) > Number(item.requestItem.hpp_price) && (
                                                <span className="ml-1 text-amber-700 dark:text-amber-400">
                                                    (Nota: {formatCurrency(Number(item.requestItem.original_hpp_price))})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-7">
                                        <p className={`text-[11px] font-bold ${
                                            item.isReady
                                                ? 'text-[#087A45] dark:text-[#34D399]'
                                                : 'text-[#B85C00] dark:text-[#FBBF24]'
                                        }`}>
                                            {item.readinessLabel}
                                        </p>
                                        {!item.isReady && itemPickerRow && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openSupplierInvoiceModal(item, itemPickerRow.key)}
                                                disabled={isBatchForwarding}
                                                leftIcon={<FileUp aria-hidden="true" className="size-3.5" />}
                                            >
                                                {item.requestItem.supplier_invoice_url
                                                    ? 'Lengkapi Data Nota'
                                                    : 'Unggah Nota Supplier'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={supplierInvoiceTarget !== null}
                onClose={() => closeSupplierInvoiceModal()}
                title="Nota Invoice Supplier"
                subtitle={supplierInvoiceTarget
                    ? `${supplierInvoiceTarget.item.requestNumber} · ${supplierInvoiceTarget.item.itemName}`
                    : undefined}
                size="lg"
                footer={(
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => closeSupplierInvoiceModal()}
                            disabled={supplierInvoiceForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="supplier-invoice-index-form"
                            isLoading={supplierInvoiceForm.processing}
                        >
                            Simpan Nota Supplier
                        </Button>
                    </>
                )}
            >
                <form
                    id="supplier-invoice-index-form"
                    noValidate
                    onSubmit={submitSupplierInvoice}
                    className="space-y-4"
                >
                    <FormErrorSummary errors={supplierInvoiceForm.errors} />

                    <div className="rounded-xl border border-[#BCE0FD] bg-[#F0F8FF] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                        <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                            {supplierInvoiceTarget?.item.itemName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                            Setelah tersimpan, item otomatis dipilih dan siap dikirim ke Direktur.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            name="supplier_vendor_id"
                            label="Vendor Supplier (Opsional)"
                            value={supplierInvoiceForm.data.vendor_id}
                            onChange={(event) => supplierInvoiceForm.setData('vendor_id', event.target.value)}
                            options={[
                                { value: '', label: 'Tanpa vendor/supplier' },
                                ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
                            ]}
                            error={supplierInvoiceForm.errors.vendor_id}
                        />
                        <MoneyInput
                            required
                            id="supplier_index_hpp_price"
                            label="HPP per Satuan"
                            value={supplierInvoiceForm.data.hpp_price}
                            onChange={(value) => supplierInvoiceForm.setData('hpp_price', value)}
                            error={supplierInvoiceForm.errors.hpp_price}
                        />
                    </div>

                    {/* Pengalihan Kelebihan Biaya dari Item Lain (Kapal Sama) — Opsional */}
                    <div className="rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] p-3 text-xs dark:border-[#1E3A5F] dark:bg-[#071322]">
                        <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9] mb-1">
                            Pengalihan Kelebihan Biaya dari Item Lain (Kapal Sama) — Opsional
                        </p>
                        <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8] mb-2.5">
                            Jika terdapat item lain pada kapal yang sama memiliki kelebihan/sisa dana, sisa biaya tersebut dapat dialihkan untuk menutup kekurangan ini.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-[#0B1F63] dark:text-[#F1F5F9] mb-1">
                                    Item Sumber Kelebihan Biaya
                                </label>
                                <select
                                    value={supplierInvoiceForm.data.surplus_source_item_id}
                                    onChange={(e) => supplierInvoiceForm.setData('surplus_source_item_id', e.target.value)}
                                    className="w-full h-10 rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] px-2.5 text-xs text-[#0B1F63] dark:text-[#F1F5F9]"
                                >
                                    <option value="">Tanpa pengalihan (langsung ajukan riil)</option>
                                    {availableSurplusItemsForModal.map((it) => (
                                        <option key={it.id} value={it.id}>
                                            {it.item_name} ({formatCurrency(Number(it.hpp_price || 0))})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {supplierInvoiceForm.data.surplus_source_item_id && (
                                <div>
                                    <label className="block text-xs font-semibold text-[#0B1F63] dark:text-[#F1F5F9] mb-1">
                                        Nominal Kelebihan yang Dialihkan (Rp)
                                    </label>
                                    <MoneyInput
                                        id="supplier_index_surplus_amount"
                                        name="surplus_amount"
                                        value={supplierInvoiceForm.data.surplus_amount}
                                        onChange={(val) => supplierInvoiceForm.setData('surplus_amount', val)}
                                        placeholder="Contoh: 500.000"
                                        error={supplierInvoiceForm.errors.surplus_amount}
                                    />
                                </div>
                            )}
                        </div>

                        {supplierInvoiceForm.data.surplus_source_item_id && (
                            <div className="mt-3 rounded-lg border border-[#BCE0FD] bg-[#EAF4FE] p-2.5 text-[11px] text-[#0B1F63] dark:border-[#1E3A5F] dark:bg-[#0D2447] dark:text-[#F1F5F9]">
                                <div className="flex justify-between font-semibold">
                                    <span>Total HPP Nota Supplier:</span>
                                    <span>{formatCurrency(parseRupiah(supplierInvoiceForm.data.hpp_price) || 0)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                    <span>Pengalihan dari Item Lain:</span>
                                    <span>- {formatCurrency(parseRupiah(supplierInvoiceForm.data.surplus_amount) || 0)}</span>
                                </div>
                                <div className="mt-1 pt-1 border-t border-[#BCE0FD] dark:border-[#1E3A5F] flex justify-between font-bold text-xs text-[#0060F4] dark:text-[#60A5FA]">
                                    <span>HPP Real yang Diajukan ke Direktur:</span>
                                    <span>
                                        {formatCurrency(
                                            Math.max(
                                                0,
                                                (parseRupiah(supplierInvoiceForm.data.hpp_price) || 0) -
                                                    (parseRupiah(supplierInvoiceForm.data.surplus_amount) || 0)
                                            )
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <Input
                        required
                        name="supplier_invoice_number"
                        autoComplete="off"
                        label="Nomor Invoice Supplier"
                        value={supplierInvoiceForm.data.supplier_invoice_number}
                        onChange={(event) => supplierInvoiceForm.setData('supplier_invoice_number', event.target.value)}
                        error={supplierInvoiceForm.errors.supplier_invoice_number}
                        placeholder="Contoh: INV/VENDOR/2026/001"
                    />

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Input
                            required
                            type="date"
                            name="supplier_invoice_date"
                            label="Tanggal Invoice"
                            value={supplierInvoiceForm.data.supplier_invoice_date}
                            onChange={(event) => supplierInvoiceForm.setData('supplier_invoice_date', event.target.value)}
                            error={supplierInvoiceForm.errors.supplier_invoice_date}
                        />
                        <Input
                            required
                            type="date"
                            name="supplier_invoice_received_date"
                            label="Tanggal Diterima"
                            value={supplierInvoiceForm.data.supplier_invoice_received_date}
                            onChange={(event) => supplierInvoiceForm.setData('supplier_invoice_received_date', event.target.value)}
                            error={supplierInvoiceForm.errors.supplier_invoice_received_date}
                        />
                        <Input
                            type="date"
                            name="supplier_invoice_due_date"
                            label="Jatuh Tempo (Opsional)"
                            value={supplierInvoiceForm.data.supplier_invoice_due_date}
                            onChange={(event) => supplierInvoiceForm.setData('supplier_invoice_due_date', event.target.value)}
                            error={supplierInvoiceForm.errors.supplier_invoice_due_date}
                        />
                    </div>

                    <PhotoUploadPicker
                        required={!supplierInvoiceTarget?.item.requestItem.supplier_invoice_url}
                        label={supplierInvoiceTarget?.item.requestItem.supplier_invoice_url
                            ? 'Ganti Dokumen Nota (Opsional)'
                            : 'Dokumen Nota Invoice Supplier'}
                        previewUrl={supplierInvoiceTarget?.item.requestItem.supplier_invoice_url ? `${supplierInvoiceTarget.item.requestItem.supplier_invoice_url}?view=1` : undefined}
                        value={supplierInvoiceForm.data.supplier_invoice_document}
                        onChange={(file) => supplierInvoiceForm.setData('supplier_invoice_document', file)}
                        mode="gallery"
                        accept=".pdf,.jpg,.jpeg,.png"
                        maxSizeMb={10}
                        variant="compact"
                        resizeImages={false}
                        error={supplierInvoiceForm.errors.supplier_invoice_document}
                        helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB. Setiap item wajib memiliki dokumen sendiri."
                    />
                </form>
            </Modal>
        </AppLayout>
    );
}
