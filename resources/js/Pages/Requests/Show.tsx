import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarDays,
    CheckCircle2,
    CirclePause,
    CircleX,
    FileText,
    LockKeyhole,
    MapPin,
    PackagePlus,
    Plus,
    RotateCcw,
    Send,
    ShieldAlert,
    Split,
    UserRound,
    X,
    Zap,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import { playSjaChime } from '../../Components/feedback/AudioNotification';
import Modal from '../../Components/overlays/Modal';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import { formatRupiahInput, normalizeRupiahInput } from '../../Components/forms/MoneyInput';
import type { PageProps } from '../../types';

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
    vendor?: {
        id: string;
        name: string;
    };
}

interface ShipRequest {
    id: string;
    request_number: string;
    status: string;
    request_date: string;
    created_at: string;
    completed_at?: string | null;
    forwarded_to_director_at?: string | null;
    director_reviewed_at?: string | null;
    notes?: string;
    service_type?: string;
    ship?: {
        id: string;
        name: string;
        imo_number?: string;
        image?: string;
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
    request: ShipRequest;
    products: ProductOption[];
    capabilities: {
        can_review_prices: boolean;
        can_decide_items: boolean;
        can_view_hpp: boolean;
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

function DirectorStatus({ status, itemStatus }: { status?: string; itemStatus?: string }) {
    const variants = {
        approved: 'bg-[#DCF7E8] text-[#087443] dark:bg-emerald-950 dark:text-emerald-300',
        rejected: 'bg-[#FFE7EC] text-[#C62840] dark:bg-rose-950 dark:text-rose-300',
        pending: 'bg-[#FFF0CC] text-[#A65300] dark:bg-amber-950 dark:text-amber-300',
    };
    const normalized = status === 'approved' || status === 'rejected' ? status : 'pending';
    const label =
        normalized === 'approved'
            ? 'Disetujui'
            : normalized === 'rejected'
              ? 'Ditolak'
              : itemStatus === 'diajukan_ke_direktur'
                ? 'Review Direktur'
                : 'Pending Admin';

    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${variants[normalized]}`}
        >
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

export default function RequestShow({
    request: shipRequest,
    products,
    capabilities,
}: RequestShowProps) {
    const { auth } = usePage<PageProps>().props;
    const [showAddItemForm, setShowAddItemForm] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [adminItemFilter, setAdminItemFilter] = useState<'all' | 'urgent' | 'regular'>('all');
    const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});
    const [decisionDrafts, setDecisionDrafts] = useState<Record<string, DecisionDraft>>({});
    const [revisionItem, setRevisionItem] = useState<RequestItem | null>(null);
    const [revisionReason, setRevisionReason] = useState('');
    const canUseAdminActions = capabilities.can_review_prices;
    const hasDirectorRole =
        auth.user.roles?.includes('Direktur') || auth.user.roles?.includes('Owner');
    const isDirectorProfile = ['Direktur', 'Owner'].includes(auth.user.primary_role ?? '');
    const canAddItem = !['Selesai', 'Dibatalkan'].includes(shipRequest.status);
    const editableItems = useMemo(
        () =>
            shipRequest.items.filter(
                (item) =>
                    item.director_status !== 'approved' &&
                    item.status !== 'diajukan_ke_direktur' &&
                    !item.is_invoiced
            ),
        [shipRequest.items]
    );
    const forwardedItems = useMemo(
        () =>
            shipRequest.items.filter(
                (item) =>
                    item.status === 'diajukan_ke_direktur' && item.director_status === 'pending'
            ),
        [shipRequest.items]
    );
    const visibleItems = useMemo(
        () =>
            adminItemFilter === 'all'
                ? shipRequest.items
                : shipRequest.items.filter((item) =>
                      adminItemFilter === 'urgent' ? item.is_urgent : !item.is_urgent
                  ),
        [adminItemFilter, shipRequest.items]
    );
    const filteredEditableItems = useMemo(
        () => visibleItems.filter((item) => editableItems.some((editable) => editable.id === item.id)),
        [editableItems, visibleItems]
    );

    useEffect(() => {
        setSelectedItemIds(editableItems.map((item) => item.id));
        setPriceDrafts(
            Object.fromEntries(
                editableItems.map((item) => [
                    item.id,
                    {
                        hpp_price: String(item.hpp_price ?? 0),
                        selling_price: String(item.selling_price ?? 0),
                    },
                ])
            )
        );
    }, [editableItems]);

    useEffect(() => {
        setDecisionDrafts(
            Object.fromEntries(
                forwardedItems.map((item) => [
                    item.id,
                    {
                        status: 'pending' as DirectorDecision,
                        director_notes: item.director_notes ?? '',
                    },
                ])
            )
        );
    }, [forwardedItems]);

    const itemForm = useForm({
        product_id: '',
        item_name: '',
        quantity: '1',
        unit: 'Unit',
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
        itemForm.post(route('requests.items.store', shipRequest.id), {
            preserveScroll: true,
            onSuccess: () => {
                itemForm.reset();
                setShowAddItemForm(false);
                playSjaChime('success');
            },
        });
    };

    const runAction = (name: string, url: string, data: Parameters<typeof router.post>[1] = {}) => {
        router.post(url, data, {
            preserveScroll: true,
            onStart: () => setActiveAction(name),
            onFinish: () => setActiveAction(null),
        });
    };

    const submitAdminReview = () => {
        if (selectedItemIds.length === 0) return;

        router.post(
            route('requests.forward-director', shipRequest.id),
            {
                selected_items: selectedItemIds,
                item_prices: selectedItemIds.map((itemId) => ({
                    id: itemId,
                    hpp_price: priceDrafts[itemId]?.hpp_price ?? '0',
                    selling_price: priceDrafts[itemId]?.selling_price ?? '0',
                })),
                admin_notes: 'Harga telah ditinjau dan item terpilih diajukan.',
            },
            {
                preserveScroll: true,
                onStart: () => setActiveAction('forward'),
                onSuccess: () => {
                    playSjaChime('success');
                },
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const submitDirectorDecisions = () => {
        if (forwardedItems.length === 0) return;

        router.post(
            route('approvals.requests.item-decision', shipRequest.id),
            {
                decisions: forwardedItems.map((item) => ({
                    item_id: item.id,
                    status: decisionDrafts[item.id]?.status ?? 'pending',
                    director_notes: decisionDrafts[item.id]?.director_notes ?? '',
                })),
            },
            {
                preserveScroll: true,
                onStart: () => setActiveAction('director-decisions'),
                onSuccess: () => playSjaChime('success'),
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const submitRevision = () => {
        if (!revisionItem || !revisionReason.trim()) return;

        router.post(
            route('requests.items.revision', [shipRequest.id, revisionItem.id]),
            { reason: revisionReason },
            {
                preserveScroll: true,
                onStart: () => setActiveAction('revision'),
                onSuccess: () => {
                    setRevisionItem(null);
                    setRevisionReason('');
                    playSjaChime('success');
                },
                onFinish: () => setActiveAction(null),
            }
        );
    };

    const companyName = shipRequest.company?.name ?? shipRequest.ship?.company?.name ?? '-';
    const portName = shipRequest.port?.name ?? '-';
    const hasApprovedUninvoicedItem = shipRequest.items.some(
        (item) => item.director_status === 'approved' && !item.is_invoiced
    );
    const canForward =
        canUseAdminActions &&
        editableItems.length > 0 &&
        !['Dalam Proses', 'Selesai', 'Dibatalkan'].includes(shipRequest.status);
    const totalHpp = shipRequest.items.reduce(
        (total, item) => total + Number(item.hpp_price ?? 0) * Number(item.quantity),
        0
    );
    const totalSelling = shipRequest.items.reduce(
        (total, item) => total + Number(item.selling_price ?? 0) * Number(item.quantity),
        0
    );

    return (
        <AppLayout
            title="Detail Pengajuan"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title={`${shipRequest.request_number} — Detail Pengajuan`} />

            <MobilePageHero
                title="Detail Pengajuan"
                description={`${shipRequest.request_number} • ${shipRequest.status}`}
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-5 rounded-t-[28px] bg-white px-4 pb-4 pt-4 dark:bg-[#0C1D36] sm:pb-8 md:mt-0 md:min-h-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <Link
                    href={route('requests.index')}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#52658E] hover:bg-white hover:text-[#0060F4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:text-[#94A3B8] dark:hover:bg-[#0C1D36] dark:hover:text-[#38BDF8]"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Kembali ke daftar pengajuan
                </Link>

                <Card className="overflow-hidden" padding="none">
                    <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-[#E0F0FF] px-2.5 py-1 font-mono text-xs font-bold text-[#0060F4] dark:bg-[#152E52] dark:text-[#60A5FA]">
                                    {shipRequest.request_number}
                                </span>
                                <StatusBadge
                                    status={shipRequest.status}
                                    label={shipRequest.status}
                                    showDot
                                    size="sm"
                                />
                            </div>
                            <h1 className="text-balance text-2xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">
                                Detail Pengajuan
                            </h1>
                            <p className="max-w-2xl text-pretty text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">
                                Rincian kebutuhan kapal, persetujuan Direktur, proses operasional,
                                dan dokumen penagihan.
                            </p>
                        </div>

                        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#DCEAF8] bg-[#F0F8FF]/70 p-3.5 dark:border-[#1E3A5F] dark:bg-[#071322] lg:min-w-72">
                            <img
                                src={shipRequest.ship?.image || '/images/vessel-sarana.jpg'}
                                alt={shipRequest.ship?.name || 'Kapal'}
                                className="size-16 shrink-0 rounded-xl border border-[#DCEAF8] object-cover dark:border-[#1E3A5F]"
                            />
                            <div className="min-w-0">
                                <p className="truncate text-base font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {shipRequest.ship?.name ?? 'Kapal tidak ditemukan'}
                                </p>
                                <p className="mt-0.5 text-sm text-[#52658E] dark:text-[#94A3B8]">
                                    IMO {shipRequest.ship?.imo_number || '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-px border-t border-[#DCEAF8] bg-[#DCEAF8] dark:border-[#1E3A5F] dark:bg-[#1E3A5F] sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { icon: Building2, label: 'Perusahaan', value: companyName },
                            { icon: MapPin, label: 'Pelabuhan', value: portName },
                            {
                                icon: CalendarDays,
                                label: 'Tanggal Pengajuan',
                                value: formatDateTime(shipRequest.request_date),
                            },
                            {
                                icon: UserRound,
                                label: 'Diajukan Oleh',
                                value: shipRequest.creator?.name ?? '-',
                            },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="min-w-0 bg-white p-4 dark:bg-[#0C1D36]">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                                    {label}
                                </div>
                                <p className="mt-1.5 truncate text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                    {value}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                    <div className="min-w-0 space-y-5">
                        <Card padding="md">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-balance text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        Rincian Logistik & Kebutuhan
                                    </h2>
                                    <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">
                                        {shipRequest.items.length} item dalam pengajuan ini
                                    </p>
                                </div>
                                {canAddItem && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        leftIcon={
                                            showAddItemForm ? (
                                                <X className="size-4" aria-hidden="true" />
                                            ) : (
                                                <Plus className="size-4" aria-hidden="true" />
                                            )
                                        }
                                        onClick={() => setShowAddItemForm((visible) => !visible)}
                                        aria-expanded={showAddItemForm}
                                    >
                                        {showAddItemForm ? 'Tutup Form' : 'Tambah Item'}
                                    </Button>
                                )}
                            </div>

                            {shipRequest.items.length > 0 ? (
                                <>
                                    {capabilities.can_view_hpp && (
                                        <div className="mb-4 grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] p-3.5 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Total HPP</p>
                                                <p className="mt-1 font-mono text-base font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">
                                                    {formatRupiah(totalHpp)}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-[#BCE0FD] bg-[#F0F8FF] p-3.5 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Total Harga Jual</p>
                                                <p className="mt-1 font-mono text-base font-extrabold tabular-nums text-[#0060F4] dark:text-[#60A5FA]">
                                                    {formatRupiah(totalSelling)}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900 dark:bg-emerald-950/40">
                                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Estimasi Margin</p>
                                                <p className="mt-1 font-mono text-base font-extrabold tabular-nums text-emerald-800 dark:text-emerald-200">
                                                    {formatRupiah(totalSelling - totalHpp)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {canForward && (
                                        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-[#BCE0FD] bg-[#F0F8FF]/70 p-3.5 dark:border-[#1E3A5F] dark:bg-[#071322] xl:flex-row xl:items-center xl:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Review harga oleh Admin</p>
                                                <p className="mt-0.5 text-xs leading-5 text-[#52658E] dark:text-[#94A3B8]">
                                                    Centang item yang akan dikirim. Item lain tetap Pending dan tidak terlihat oleh Direktur.
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 dark:bg-[#0C1D36]" aria-label="Filter item berdasarkan urgensi">
                                                    {([
                                                        { value: 'all', label: 'Semua' },
                                                        { value: 'urgent', label: 'Urgent' },
                                                        { value: 'regular', label: 'Non-Urgent' },
                                                    ] as const).map((filter) => (
                                                        <button
                                                            key={filter.value}
                                                            type="button"
                                                            aria-pressed={adminItemFilter === filter.value}
                                                            onClick={() => setAdminItemFilter(filter.value)}
                                                            className={`min-h-9 rounded-md px-2.5 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] ${adminItemFilter === filter.value ? 'bg-[#0060F4] text-white' : 'text-[#52658E] hover:bg-[#F0F8FF] dark:text-[#94A3B8] dark:hover:bg-[#132847]'}`}
                                                        >
                                                            {filter.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-bold text-[#0060F4] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:hover:bg-[#132847]"
                                                    onClick={() => {
                                                        const filteredIds = filteredEditableItems.map((item) => item.id);
                                                        const allFilteredSelected = filteredIds.every((id) => selectedItemIds.includes(id));
                                                        setSelectedItemIds((current) =>
                                                            allFilteredSelected
                                                                ? current.filter((id) => !filteredIds.includes(id))
                                                                : Array.from(new Set([...current, ...filteredIds]))
                                                        );
                                                    }}
                                                >
                                                    {filteredEditableItems.every((item) => selectedItemIds.includes(item.id))
                                                        ? 'Hapus hasil filter'
                                                        : 'Pilih hasil filter'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="hidden overflow-x-auto rounded-xl border border-[#DCEAF8] dark:border-[#1E3A5F] md:block">
                                        <table className="w-full min-w-[920px] text-left text-sm">
                                            <thead className="bg-[#0D2945] text-[#E7F0FA]">
                                                <tr>
                                                    {canUseAdminActions && <th className="w-12 px-3 py-3 text-center font-semibold">Pilih</th>}
                                                    <th className="min-w-64 px-4 py-3 font-semibold">Item & Vendor</th>
                                                    <th className="w-32 px-4 py-3 text-right font-semibold">Qty</th>
                                                    {capabilities.can_view_hpp && <th className="w-48 px-4 py-3 text-right font-semibold">HPP</th>}
                                                    <th className="w-48 px-4 py-3 text-right font-semibold">Harga Jual</th>
                                                    <th className="w-40 px-4 py-3 text-center font-semibold">Status Item</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#DCEAF8] dark:divide-[#1E3A5F]">
                                                {visibleItems.map((item) => {
                                                    const isEditable = editableItems.some((editable) => editable.id === item.id);
                                                    const isSelected = selectedItemIds.includes(item.id);
                                                    const isLocked = item.director_status === 'approved';

                                                    return (
                                                    <tr key={item.id} className={`align-top ${isSelected ? 'bg-[#F0F8FF]/70 dark:bg-[#132847]' : 'hover:bg-[#F0F8FF]/60 dark:hover:bg-[#132847]'}`}>
                                                        {canUseAdminActions && (
                                                            <td className="px-3 py-4 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    disabled={!isEditable}
                                                                    aria-label={`Pilih ${item.item_name} untuk dikirim ke Direktur`}
                                                                    onChange={(event) =>
                                                                        setSelectedItemIds((current) =>
                                                                            event.target.checked
                                                                                ? [...current, item.id]
                                                                                : current.filter((id) => id !== item.id)
                                                                        )
                                                                    }
                                                                    className="size-4 rounded border-[#B7C9DF] text-[#0060F4] focus:ring-[#0060F4] disabled:cursor-not-allowed disabled:opacity-40"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-start gap-2">
                                                                {item.is_urgent && (
                                                                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#C62840]" aria-label="Mendesak" />
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="font-bold leading-5 text-[#0B1F63] dark:text-[#F1F5F9]">
                                                                        {item.item_name}
                                                                    </p>
                                                                    {item.notes && (
                                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#52658E] dark:text-[#94A3B8]">
                                                                            {item.notes}
                                                                        </p>
                                                                    )}
                                                                    <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                                        Vendor: <span className="font-semibold text-[#0B1F63] dark:text-[#CBD5E1]">{item.vendor?.name || 'Belum ditentukan'}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-right font-mono font-semibold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">
                                                            {item.quantity} {item.unit}
                                                        </td>
                                                        {capabilities.can_view_hpp && (
                                                            <td className="px-4 py-4 text-right">
                                                                {canUseAdminActions && isEditable ? (
                                                                    <label className="block">
                                                                        <span className="sr-only">HPP {item.item_name}</span>
                                                                        <span className="flex min-h-10 items-center rounded-lg border border-[#DCEAF8] bg-white px-2.5 focus-within:border-[#0060F4] focus-within:ring-2 focus-within:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                                                                            <span className="mr-1 text-xs text-[#52658E]">Rp</span>
                                                                            <input
                                                                                type="text"
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
                                                                                className="w-full border-0 bg-transparent p-0 text-right font-mono text-sm font-bold tabular-nums text-[#0B1F63] focus:ring-0 dark:text-[#F1F5F9]"
                                                                            />
                                                                        </span>
                                                                    </label>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">
                                                                        {isLocked && <LockKeyhole className="size-3.5 text-[#087443]" aria-label="Harga terkunci" />}
                                                                        {formatRupiah(item.hpp_price)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-4 text-right">
                                                            {canUseAdminActions && isEditable ? (
                                                                <label className="block">
                                                                    <span className="sr-only">Harga Jual {item.item_name}</span>
                                                                    <span className="flex min-h-10 items-center rounded-lg border border-[#BCE0FD] bg-white px-2.5 focus-within:border-[#0060F4] focus-within:ring-2 focus-within:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                                                                        <span className="mr-1 text-xs text-[#52658E]">Rp</span>
                                                                        <input
                                                                            type="text"
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
                                                                            className="w-full border-0 bg-transparent p-0 text-right font-mono text-sm font-bold tabular-nums text-[#0060F4] focus:ring-0 dark:text-[#60A5FA]"
                                                                        />
                                                                    </span>
                                                                </label>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-bold tabular-nums text-[#0060F4] dark:text-[#60A5FA]">
                                                                    {isLocked && <LockKeyhole className="size-3.5 text-[#087443]" aria-label="Harga terkunci" />}
                                                                    {formatRupiah(item.selling_price)}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <DirectorStatus status={item.director_status} itemStatus={item.status} />
                                                            {canUseAdminActions && isLocked && !item.is_invoiced && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRevisionItem(item)}
                                                                    className="mx-auto mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#0060F4] hover:bg-[#E0F0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:hover:bg-[#152E52]"
                                                                >
                                                                    <RotateCcw className="size-3.5" aria-hidden="true" />
                                                                    Ajukan revisi
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="space-y-3 md:hidden">
                                        {visibleItems.map((item) => {
                                            const isEditable = editableItems.some((editable) => editable.id === item.id);
                                            const isSelected = selectedItemIds.includes(item.id);
                                            const isLocked = item.director_status === 'approved';

                                            return (
                                            <article key={item.id} className={`rounded-xl border p-4 ${isSelected ? 'border-[#8FC9FF] bg-[#F0F8FF]/70 dark:border-[#2563EB] dark:bg-[#132847]' : 'border-[#DCEAF8] dark:border-[#1E3A5F]'}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 items-start gap-2">
                                                        {canUseAdminActions && (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                disabled={!isEditable}
                                                                aria-label={`Pilih ${item.item_name} untuk dikirim ke Direktur`}
                                                                onChange={(event) =>
                                                                    setSelectedItemIds((current) =>
                                                                        event.target.checked
                                                                            ? [...current, item.id]
                                                                            : current.filter((id) => id !== item.id)
                                                                    )
                                                                }
                                                                className="mt-0.5 size-4 rounded border-[#B7C9DF] text-[#0060F4] focus:ring-[#0060F4] disabled:opacity-40"
                                                            />
                                                        )}
                                                        {item.is_urgent && (
                                                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#C62840]" aria-label="Mendesak" />
                                                        )}
                                                        <h3 className="text-pretty font-bold leading-5 text-[#0B1F63] dark:text-[#F1F5F9]">
                                                            {item.item_name}
                                                        </h3>
                                                    </div>
                                                    <DirectorStatus status={item.director_status} itemStatus={item.status} />
                                                </div>
                                                <dl className={`mt-4 grid gap-3 text-sm ${capabilities.can_view_hpp ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                    <div>
                                                        <dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Jumlah</dt>
                                                        <dd className="mt-1 font-mono font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">
                                                            {item.quantity} {item.unit}
                                                        </dd>
                                                    </div>
                                                    {capabilities.can_view_hpp && (
                                                        <div>
                                                            <dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">HPP</dt>
                                                            <dd className="mt-1 font-mono font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">
                                                                {formatRupiah(item.hpp_price)}
                                                            </dd>
                                                        </div>
                                                    )}
                                                </dl>
                                                <div className="mt-3">
                                                    <p className="text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">Harga Jual</p>
                                                    {canUseAdminActions && isEditable ? (
                                                        <div className="mt-1 grid grid-cols-2 gap-2">
                                                            {capabilities.can_view_hpp && (
                                                                <label className="block text-xs font-semibold text-[#52658E]">
                                                                    HPP
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={formatRupiahInput(priceDrafts[item.id]?.hpp_price ?? '0')}
                                                                        onChange={(event) => setPriceDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], hpp_price: normalizeRupiahInput(event.target.value) } }))}
                                                                        className="mt-1 min-h-11 w-full rounded-lg border-[#DCEAF8] bg-white text-right font-mono font-bold dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                                                    />
                                                                </label>
                                                            )}
                                                            <label className="block text-xs font-semibold text-[#52658E]">
                                                                Harga Jual
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={formatRupiahInput(priceDrafts[item.id]?.selling_price ?? '0')}
                                                                    onChange={(event) => setPriceDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], selling_price: normalizeRupiahInput(event.target.value) } }))}
                                                                    className="mt-1 min-h-11 w-full rounded-lg border-[#BCE0FD] bg-white text-right font-mono font-bold text-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                                                />
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <p className="mt-1 inline-flex items-center gap-1.5 font-mono font-extrabold tabular-nums text-[#0060F4] dark:text-[#60A5FA]">
                                                            {isLocked && <LockKeyhole className="size-3.5 text-[#087443]" aria-label="Harga terkunci" />}
                                                            {formatRupiah(item.selling_price)}
                                                        </p>
                                                    )}
                                                </div>
                                                <p className="mt-3 text-xs text-[#52658E] dark:text-[#94A3B8]">Vendor: <span className="font-semibold text-[#0B1F63] dark:text-[#CBD5E1]">{item.vendor?.name || 'Belum ditentukan'}</span></p>
                                                {canUseAdminActions && isLocked && !item.is_invoiced && (
                                                    <Button type="button" variant="outline" size="sm" className="mt-3 w-full" leftIcon={<RotateCcw className="size-4" aria-hidden="true" />} onClick={() => setRevisionItem(item)}>
                                                        Ajukan Revisi Harga
                                                    </Button>
                                                )}
                                            </article>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-xl border border-dashed border-[#DCEAF8] px-5 py-10 text-center dark:border-[#1E3A5F]">
                                    <PackagePlus className="mx-auto size-8 text-[#8C9BB9]" aria-hidden="true" />
                                    <p className="mt-3 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">Belum ada item kebutuhan</p>
                                    <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">Tambahkan item agar pengajuan dapat diproses.</p>
                                </div>
                            )}

                            {showAddItemForm && canAddItem && (
                                <form onSubmit={submitItem} className="mt-5 space-y-4 rounded-xl border border-[#BCE0FD] bg-[#F0F8FF]/70 p-4 dark:border-[#1E3A5F] dark:bg-[#071322] sm:p-5">
                                    <div>
                                        <h3 className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Tambah kebutuhan susulan</h3>
                                        <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">Item baru akan masuk ke alur persetujuan pengajuan ini.</p>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            Produk master
                                            <select
                                                value={itemForm.data.product_id}
                                                onChange={(event) => selectProduct(event.target.value)}
                                                className="mt-1.5 min-h-11 w-full rounded-xl border-[#DCEAF8] bg-white text-sm focus:border-[#0060F4] focus:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                            >
                                                <option value="">Pilih atau isi manual</option>
                                                {products.map((product) => (
                                                    <option key={product.id} value={product.id}>
                                                        {product.name} — {formatRupiah(product.selling_price_default)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="block text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            Nama kebutuhan
                                            <input
                                                required
                                                value={itemForm.data.item_name}
                                                onChange={(event) => itemForm.setData('item_name', event.target.value)}
                                                className="mt-1.5 min-h-11 w-full rounded-xl border-[#DCEAF8] bg-white text-sm focus:border-[#0060F4] focus:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                            />
                                            {itemForm.errors.item_name && <span className="mt-1 block text-xs text-[#C62840]">{itemForm.errors.item_name}</span>}
                                        </label>
                                        <label className="block text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            Jumlah
                                            <input
                                                required
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={itemForm.data.quantity}
                                                onChange={(event) => itemForm.setData('quantity', event.target.value)}
                                                className="mt-1.5 min-h-11 w-full rounded-xl border-[#DCEAF8] bg-white text-sm focus:border-[#0060F4] focus:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                            />
                                        </label>
                                        <label className="block text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            Satuan
                                            <input
                                                required
                                                value={itemForm.data.unit}
                                                onChange={(event) => itemForm.setData('unit', event.target.value)}
                                                className="mt-1.5 min-h-11 w-full rounded-xl border-[#DCEAF8] bg-white text-sm focus:border-[#0060F4] focus:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                            />
                                        </label>
                                    </div>
                                    <label className="block text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                        Catatan atau spesifikasi
                                        <textarea
                                            rows={3}
                                            value={itemForm.data.notes}
                                            onChange={(event) => itemForm.setData('notes', event.target.value)}
                                            className="mt-1.5 w-full rounded-xl border-[#DCEAF8] bg-white text-sm focus:border-[#0060F4] focus:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                        />
                                    </label>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                                            <input
                                                type="checkbox"
                                                checked={itemForm.data.is_urgent}
                                                onChange={(event) => itemForm.setData('is_urgent', event.target.checked)}
                                                className="rounded border-[#DCEAF8] text-[#C62840] focus:ring-[#C62840]"
                                            />
                                            <AlertTriangle className="size-4 text-[#C62840]" aria-hidden="true" />
                                            Tandai sebagai kebutuhan mendesak
                                        </label>
                                        <div className="flex gap-2 sm:justify-end">
                                            <Button type="button" variant="outline" onClick={() => setShowAddItemForm(false)}>
                                                Batal
                                            </Button>
                                            <Button type="submit" isLoading={itemForm.processing}>
                                                Simpan Item
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </Card>

                        {capabilities.can_decide_items && forwardedItems.length > 0 && (
                            <Card className="border-[#BCE0FD] dark:border-[#1E3A5F]" padding="md">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0060F4] dark:text-[#60A5FA]">Tahap Direktur</p>
                                        <h2 className="mt-1 text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Keputusan per item</h2>
                                        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">
                                            Hanya item yang dikirim Admin yang tampil di sini. Item yang disetujui akan mengunci HPP dan Harga Jual.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="min-h-10 rounded-lg border border-emerald-200 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                                            onClick={() =>
                                                setDecisionDrafts((current) =>
                                                    Object.fromEntries(
                                                        forwardedItems.map((item) => [
                                                            item.id,
                                                            { ...current[item.id], status: 'approved' as DirectorDecision },
                                                        ])
                                                    )
                                                )
                                            }
                                        >
                                            Setujui semua kiriman
                                        </button>
                                        <button
                                            type="button"
                                            className="min-h-10 rounded-lg border border-[#DCEAF8] px-3 text-xs font-bold text-[#52658E] hover:bg-[#F0F8FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:border-[#1E3A5F] dark:hover:bg-[#132847]"
                                            onClick={() =>
                                                setDecisionDrafts((current) =>
                                                    Object.fromEntries(
                                                        forwardedItems.map((item) => [
                                                            item.id,
                                                            { ...current[item.id], status: 'pending' as DirectorDecision },
                                                        ])
                                                    )
                                                )
                                            }
                                        >
                                            Pending semua
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {forwardedItems.map((item) => {
                                        const decision = decisionDrafts[item.id] ?? {
                                            status: 'pending' as DirectorDecision,
                                            director_notes: '',
                                        };

                                        return (
                                            <article key={item.id} className="rounded-xl border border-[#DCEAF8] bg-white p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{item.item_name}</h3>
                                                            {item.is_urgent && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">Urgent</span>}
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#52658E] dark:text-[#94A3B8]">
                                                            <span>Qty: <strong className="text-[#0B1F63] dark:text-[#CBD5E1]">{item.quantity} {item.unit}</strong></span>
                                                            <span>HPP: <strong className="font-mono text-[#0B1F63] dark:text-[#CBD5E1]">{formatRupiah(item.hpp_price)}</strong></span>
                                                            <span>Harga Jual: <strong className="font-mono text-[#0060F4] dark:text-[#60A5FA]">{formatRupiah(item.selling_price)}</strong></span>
                                                        </div>
                                                    </div>
                                                    <div className="grid w-full grid-cols-3 gap-2 xl:w-auto">
                                                        {([
                                                            { value: 'approved', label: 'Setujui', icon: CheckCircle2, active: 'bg-emerald-600 text-white border-emerald-600', idle: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900 dark:hover:bg-emerald-950' },
                                                            { value: 'pending', label: 'Pending', icon: CirclePause, active: 'bg-amber-500 text-white border-amber-500', idle: 'text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-900 dark:hover:bg-amber-950' },
                                                            { value: 'rejected', label: 'Tolak', icon: CircleX, active: 'bg-rose-600 text-white border-rose-600', idle: 'text-rose-700 border-rose-200 hover:bg-rose-50 dark:text-rose-300 dark:border-rose-900 dark:hover:bg-rose-950' },
                                                        ] as const).map(({ value, label, icon: Icon, active, idle }) => (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                aria-pressed={decision.status === value}
                                                                onClick={() => setDecisionDrafts((current) => ({ ...current, [item.id]: { ...decision, status: value } }))}
                                                                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] ${decision.status === value ? active : idle}`}
                                                            >
                                                                <Icon className="size-4" aria-hidden="true" />
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <label className="mt-3 block text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                                    Catatan Direktur (opsional)
                                                    <input
                                                        type="text"
                                                        maxLength={500}
                                                        value={decision.director_notes}
                                                        onChange={(event) => setDecisionDrafts((current) => ({ ...current, [item.id]: { ...decision, director_notes: event.target.value } }))}
                                                        placeholder="Contoh: setujui sesuai penawaran, revisi vendor, atau alasan pending."
                                                        className="mt-1.5 min-h-11 w-full rounded-lg border-[#DCEAF8] bg-white text-sm focus:border-[#0060F4] focus:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36]"
                                                    />
                                                </label>
                                            </article>
                                        );
                                    })}
                                </div>

                                <div className="mt-5 flex justify-end">
                                    <Button
                                        type="button"
                                        leftIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
                                        isLoading={activeAction === 'director-decisions'}
                                        disabled={activeAction !== null}
                                        onClick={submitDirectorDecisions}
                                    >
                                        Simpan Keputusan Item
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {shipRequest.invoices.length > 0 && (
                            <Card padding="md">
                                <h2 className="text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Invoice diterbitkan</h2>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {shipRequest.invoices.map((invoice) => (
                                        <div key={invoice.id} className="rounded-xl border border-[#DCEAF8] p-4 dark:border-[#1E3A5F]">
                                            <div className="flex items-start justify-between gap-3">
                                                <FileText className="size-5 shrink-0 text-[#0060F4]" aria-hidden="true" />
                                                <StatusBadge status={invoice.status} label={invoice.status} size="sm" />
                                            </div>
                                            <p className="mt-3 font-mono text-sm font-bold text-[#0060F4] dark:text-[#60A5FA]">{invoice.invoice_number}</p>
                                            <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">{invoice.invoice_type === 'agency' ? 'Keagenan / Jasa' : 'Reimburse'}</p>
                                            <p className="mt-3 font-mono text-base font-extrabold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{formatRupiah(invoice.grand_total)}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    <aside className="space-y-5 lg:sticky lg:top-5">
                        <Card padding="md">
                            <h2 className="text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Ringkasan pengajuan</h2>
                            <dl className="mt-4 space-y-4 text-sm">
                                <div>
                                    <dt className="text-[#52658E] dark:text-[#94A3B8]">Jenis layanan</dt>
                                    <dd className="mt-1 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{shipRequest.service_type || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-[#52658E] dark:text-[#94A3B8]">Catatan</dt>
                                    <dd className="mt-1 whitespace-pre-line text-pretty font-medium leading-6 text-[#0B1F63] dark:text-[#F1F5F9]">{shipRequest.notes || '-'}</dd>
                                </div>
                            </dl>
                        </Card>

                        {isDirectorProfile && !hasDirectorRole && (
                            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40" padding="md">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                                    <div>
                                        <h2 className="font-extrabold text-amber-900 dark:text-amber-100">Role Direktur belum aktif</h2>
                                        <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
                                            Profil terbaca sebagai Direktur, tetapi akun belum memiliki role Direktur pada database. Aksi persetujuan belum dapat digunakan.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {canUseAdminActions && (
                            <Card padding="md">
                                <h2 className="text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Aksi Admin</h2>
                                <p className="mt-1 text-sm leading-5 text-[#52658E] dark:text-[#94A3B8]">Lanjutkan pengajuan sesuai tahap persetujuannya.</p>
                                <div className="mt-4 space-y-2.5">
                                    {canForward && (
                                        <Button
                                            className="w-full justify-start"
                                            leftIcon={<Send className="size-4" aria-hidden="true" />}
                                            disabled={activeAction !== null || selectedItemIds.length === 0}
                                            isLoading={activeAction === 'forward'}
                                            onClick={submitAdminReview}
                                        >
                                            Ajukan
                                        </Button>
                                    )}
                                    {shipRequest.service_type === 'clearance_in' && hasApprovedUninvoicedItem && (
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                            leftIcon={<Zap className="size-4" aria-hidden="true" />}
                                            disabled={activeAction !== null}
                                            isLoading={activeAction === 'clearance-invoice'}
                                            onClick={() => runAction('clearance-invoice', route('requests.clearance-in-invoice', shipRequest.id))}
                                        >
                                            Buat Invoice Clearance In
                                        </Button>
                                    )}
                                    {hasApprovedUninvoicedItem && shipRequest.service_type !== 'clearance_in' && (
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                                            leftIcon={<Split className="size-4" aria-hidden="true" />}
                                            disabled={activeAction !== null}
                                            isLoading={activeAction === 'split-invoice'}
                                            onClick={() => runAction('split-invoice', route('requests.split-invoices', shipRequest.id))}
                                        >
                                            Pecah Invoice
                                        </Button>
                                    )}
                                    {!canForward && !hasApprovedUninvoicedItem && (
                                        <p className="rounded-xl bg-[#F0F8FF] px-3 py-3 text-sm leading-5 text-[#52658E] dark:bg-[#071322] dark:text-[#94A3B8]">
                                            Belum ada tindakan Admin yang tersedia untuk status ini.
                                        </p>
                                    )}
                                </div>
                            </Card>
                        )}

                        <Card padding="md">
                            <h2 className="text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Riwayat status</h2>
                            <ol className="mt-5 space-y-5 border-l-2 border-[#DCEAF8] pl-5 dark:border-[#1E3A5F]">
                                <li className="relative">
                                    <span className="absolute -left-[27px] top-0.5 size-3 rounded-full bg-[#0060F4] ring-4 ring-white dark:ring-[#0C1D36]" />
                                    <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Pengajuan dibuat</p>
                                    <p className="mt-1 text-xs leading-5 text-[#52658E] dark:text-[#94A3B8]">{formatDateTime(shipRequest.created_at)} oleh {shipRequest.creator?.name || '-'}</p>
                                </li>
                                {shipRequest.forwarded_to_director_at && (
                                    <li className="relative">
                                        <span className="absolute -left-[27px] top-0.5 size-3 rounded-full bg-[#19B5F7] ring-4 ring-white dark:ring-[#0C1D36]" />
                                        <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Dikirim ke Direktur</p>
                                        <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">{formatDateTime(shipRequest.forwarded_to_director_at)}</p>
                                    </li>
                                )}
                                {shipRequest.director_reviewed_at && (
                                    <li className="relative">
                                        <span className="absolute -left-[27px] top-0.5 size-3 rounded-full bg-[#087443] ring-4 ring-white dark:ring-[#0C1D36]" />
                                        <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Keputusan Direktur</p>
                                        <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">{formatDateTime(shipRequest.director_reviewed_at)}</p>
                                    </li>
                                )}
                                <li className="relative">
                                    <span className="absolute -left-[27px] top-0.5 size-3 rounded-full bg-[#A65300] ring-4 ring-white dark:ring-[#0C1D36]" />
                                    <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Status saat ini</p>
                                    <div className="mt-2"><StatusBadge status={shipRequest.status} label={shipRequest.status} size="sm" /></div>
                                </li>
                            </ol>
                        </Card>
                    </aside>
                </div>
            </div>

            <Modal
                isOpen={revisionItem !== null}
                onClose={() => {
                    if (activeAction !== 'revision') {
                        setRevisionItem(null);
                        setRevisionReason('');
                    }
                }}
                title="Ajukan Revisi Harga"
                subtitle={`Buka kembali harga ${revisionItem?.item_name ?? 'item'} untuk proses approval ulang.`}
                size="md"
                footer={
                    <div className="flex w-full gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            disabled={activeAction === 'revision'}
                            onClick={() => {
                                setRevisionItem(null);
                                setRevisionReason('');
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            className="flex-1"
                            disabled={!revisionReason.trim()}
                            isLoading={activeAction === 'revision'}
                            onClick={submitRevision}
                        >
                            Buka Revisi
                        </Button>
                    </div>
                }
            >
                <label className="block text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">
                    Alasan revisi
                    <textarea
                        rows={4}
                        value={revisionReason}
                        onChange={(event) => setRevisionReason(event.target.value)}
                        placeholder="Contoh: ada perubahan penawaran vendor atau koreksi harga jual."
                        className="mt-2 w-full rounded-xl border-[#DCEAF8] text-sm focus:border-[#0060F4] focus:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#071322]"
                    />
                </label>
            </Modal>
        </AppLayout>
    );
}
