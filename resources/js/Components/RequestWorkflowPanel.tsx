import { router } from '@inertiajs/react';
import { Check, CircleCheckBig, ListChecks, LockKeyhole, Play, Ship, Wrench } from 'lucide-react';
import { useState } from 'react';
import Checkbox from './forms/Checkbox';
import ConfirmDialog from './overlays/ConfirmDialog';
import Modal from './overlays/Modal';
import Button from './ui/Button';

export interface WorkflowItem {
    id?: string;
    item_name?: string;
    quantity?: number | string;
    unit?: string;
    status?: string | null;
    director_status?: string | null;
}

export interface WorkflowRequest {
    id: string;
    request_number: string;
    status: string;
    service_type?: string | null;
    requested_port_call_status?: string | null;
    items?: WorkflowItem[];
}

interface RequestWorkflowPanelProps {
    request: WorkflowRequest;
    canProcess: boolean;
    compact?: boolean;
    inlineItemActions?: boolean;
    className?: string;
}

interface RequestItemWorkflowActionProps {
    requestId: string;
    requestNumber: string;
    serviceType?: string | null;
    item: WorkflowItem & { id: string };
    canProcess: boolean;
    compact?: boolean;
    className?: string;
}

const targetStatusLabel = (status?: string | null): string => {
    if (status === 'anchored') return 'Labuh';
    if (status === 'berthed') return 'Sandar';
    if (status === 'departed') return 'Berangkat';

    return 'status operasional berikutnya';
};

const serviceLabel = (serviceType?: string | null): string => {
    if (serviceType === 'clearance_in') return 'Clearance In';
    if (serviceType === 'clearance_out') return 'Clearance Out';

    return 'Pemenuhan Kebutuhan';
};

export function RequestItemWorkflowAction({
    requestId,
    requestNumber,
    serviceType,
    item,
    canProcess,
    compact = false,
    className = '',
}: RequestItemWorkflowActionProps) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isApproved = item.director_status === 'approved';
    const isStartable = isApproved && item.status === 'disetujui';
    const isInProgress = isApproved && item.status === 'dalam_proses';
    const isCompleted = isApproved && item.status === 'selesai';

    if (!isApproved) {
        return null;
    }

    if (isCompleted) {
        return (
            <span
                className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#DCF7E8] px-2.5 text-xs font-bold text-[#087443] dark:bg-emerald-950/60 dark:text-emerald-300 ${className}`}
            >
                <CircleCheckBig className="size-3.5" aria-hidden="true" />
                Selesai
            </span>
        );
    }

    if (!canProcess || (!isStartable && !isInProgress)) {
        return null;
    }

    const nextStatus = isStartable ? 'dalam_proses' : 'selesai';
    const actionLabel = isStartable
        ? serviceType === 'clearance_in'
            ? 'Mulai Clearance In'
            : serviceType === 'clearance_out'
              ? 'Mulai Clearance Out'
              : compact
                ? 'Mulai Proses'
                : 'Mulai Pemenuhan'
        : serviceType === 'clearance_in'
          ? 'Selesaikan Clearance In'
          : serviceType === 'clearance_out'
            ? 'Selesaikan Clearance Out'
            : compact
              ? 'Tandai Selesai'
              : 'Tandai Terpenuhi';

    const updateItemStatus = () => {
        if (processing) return;

        setError(null);
        router.patch(
            route('needs.items.update-status', requestId),
            { status: nextStatus, item_ids: [item.id] },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onError: (errors) => {
                    const firstError = Object.values(errors)[0];
                    setError(firstError || 'Tahap item belum dapat diperbarui.');
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <div className={`flex min-w-0 flex-col items-stretch gap-1 ${className}`}>
            <Button
                type="button"
                size="sm"
                variant={isInProgress ? 'primary' : 'secondary'}
                className="min-h-11 w-full touch-manipulation justify-center sm:min-h-9 sm:w-auto"
                leftIcon={
                    isStartable ? (
                        <Play className="size-3.5" aria-hidden="true" />
                    ) : (
                        <CircleCheckBig className="size-3.5" aria-hidden="true" />
                    )
                }
                isLoading={processing}
                aria-label={`${actionLabel} untuk ${item.item_name || `item ${requestNumber}`}`}
                onClick={updateItemStatus}
            >
                {actionLabel}
            </Button>
            {error && (
                <p
                    role="alert"
                    className="max-w-56 text-pretty text-center text-[11px] font-semibold leading-4 text-[#C62840] dark:text-rose-300"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

export default function RequestWorkflowPanel({
    request,
    canProcess,
    compact = false,
    inlineItemActions = false,
    className = '',
}: RequestWorkflowPanelProps) {
    const [processing, setProcessing] = useState(false);
    const [confirmingCompletion, setConfirmingCompletion] = useState(false);
    const [managingItems, setManagingItems] = useState(false);
    const [selectedStartIds, setSelectedStartIds] = useState<string[]>([]);
    const [selectedCompletionIds, setSelectedCompletionIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const isApproved = ['Disetujui', 'Disetujui Sebagian'].includes(request.status);
    const isPartiallyApproved = request.status === 'Disetujui Sebagian';
    const isProcessing = ['Dalam Proses', 'Diproses'].includes(request.status);
    const isCompleted = request.status === 'Selesai';
    const isClearanceIn = request.service_type === 'clearance_in';
    const isClearanceOut = request.service_type === 'clearance_out';
    const hasUnapprovedItems = Boolean(
        request.items?.some((item) => item.director_status !== 'approved')
    );
    const targetLabel = targetStatusLabel(request.requested_port_call_status);
    const label = serviceLabel(request.service_type);
    const approvedItems = (request.items ?? []).filter(
        (item): item is typeof item & { id: string } =>
            Boolean(item.id) && item.director_status === 'approved'
    );
    const startableItems = approvedItems.filter((item) => item.status === 'disetujui');
    const processingItems = approvedItems.filter((item) => item.status === 'dalam_proses');
    const completedItems = approvedItems.filter((item) => item.status === 'selesai');
    const hasItemWorkflow = Boolean(request.items?.some((item) => item.id));

    if (!isApproved && !isProcessing && !isCompleted) {
        return null;
    }

    const startLabel = isClearanceIn
        ? 'Mulai Clearance In'
        : isClearanceOut
          ? 'Mulai Clearance Out'
          : 'Mulai Pemenuhan';
    const completionLabel = isClearanceIn
        ? 'Selesaikan Clearance In'
        : isClearanceOut
          ? 'Konfirmasi Kapal Berangkat'
          : 'Tandai Terpenuhi';
    const description = isApproved
        ? isPartiallyApproved
            ? `Item yang sudah disetujui dapat langsung diproses. Item lainnya tetap menunggu keputusan Direktur tanpa menghambat ${label.toLowerCase()}.`
            : `Approval Direktur selesai dan harga telah dikunci. Admin dapat memulai ${label.toLowerCase()}.`
        : isProcessing
          ? isClearanceIn || isClearanceOut
              ? `Proses sedang berjalan. Saat diselesaikan, status kunjungan akan berubah menjadi ${targetLabel}.`
              : 'Pemenuhan sedang berjalan. Tandai terpenuhi setelah barang atau jasa benar-benar diterima.'
          : isClearanceOut
            ? 'Clearance Out selesai. Kapal berstatus Berangkat dan menunggu Nota Rampung.'
            : `${label} telah selesai dicatat.`;
    const visibleDescription = inlineItemActions && hasItemWorkflow && !isCompleted
        ? `${description} Gunakan aksi pada masing-masing item di bawah.`
        : description;

    const updateStatus = (status: 'Dalam Proses' | 'Selesai') => {
        if (processing) return;

        setError(null);
        router.patch(
            route('needs.update-status', request.id),
            { status },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onSuccess: () => setConfirmingCompletion(false),
                onError: (errors) => {
                    const firstError = Object.values(errors)[0];
                    setError(firstError || 'Tahap proses belum dapat diperbarui.');
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    const updateItemStatus = (
        status: 'dalam_proses' | 'selesai',
        itemIds: string[]
    ) => {
        if (processing || itemIds.length === 0) return;

        setError(null);
        router.patch(
            route('needs.items.update-status', request.id),
            { status, item_ids: itemIds },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onSuccess: () => {
                    if (status === 'dalam_proses') {
                        setSelectedStartIds([]);
                    } else {
                        setSelectedCompletionIds([]);
                    }
                },
                onError: (errors) => {
                    const firstError = Object.values(errors)[0];
                    setError(firstError || 'Tahap item belum dapat diperbarui.');
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    const toggleItem = (
        itemId: string,
        selectedIds: string[],
        setSelectedIds: (ids: string[]) => void
    ) => {
        setSelectedIds(
            selectedIds.includes(itemId)
                ? selectedIds.filter((id) => id !== itemId)
                : [...selectedIds, itemId]
        );
    };

    const setAllItems = (
        itemIds: string[],
        checked: boolean,
        setSelectedIds: (ids: string[]) => void
    ) => setSelectedIds(checked ? itemIds : []);

    const renderItemSelection = (
        title: string,
        helper: string,
        items: typeof approvedItems,
        selectedIds: string[],
        setSelectedIds: (ids: string[]) => void,
        actionLabel: string,
        status: 'dalam_proses' | 'selesai'
    ) => {
        if (items.length === 0) return null;

        const itemIds = items.map((item) => item.id);
        const allSelected = itemIds.every((id) => selectedIds.includes(id));
        const partiallySelected = !allSelected && itemIds.some((id) => selectedIds.includes(id));

        return (
            <section className="rounded-2xl border border-[#DCEAF8] bg-[#F8FBFF] p-3.5 dark:border-[#1E3A5F] dark:bg-[#071322]/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                            {title}
                        </h4>
                        <p className="mt-0.5 text-xs leading-5 text-[#52658E] dark:text-[#94A3B8]">
                            {helper}
                        </p>
                    </div>
                    <Checkbox
                        id={`${request.id}-${status}-all`}
                        checked={allSelected}
                        indeterminate={partiallySelected}
                        onChange={(event) => setAllItems(itemIds, event.target.checked, setSelectedIds)}
                        label={`Pilih semua (${items.length})`}
                        sizeVariant="sm"
                        disabled={processing}
                        className="shrink-0"
                    />
                </div>

                <div className="mt-3 divide-y divide-[#DCEAF8] overflow-hidden rounded-xl border border-[#DCEAF8] bg-white dark:divide-[#1E3A5F] dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                    {items.map((item) => (
                        <div key={item.id} className="p-3">
                            <Checkbox
                                id={`${request.id}-${status}-${item.id}`}
                                checked={selectedIds.includes(item.id)}
                                onChange={() => toggleItem(item.id, selectedIds, setSelectedIds)}
                                disabled={processing}
                                label={item.item_name || 'Item pengajuan'}
                                description={`${Number(item.quantity ?? 0).toLocaleString('id-ID')} ${item.unit || ''}`.trim()}
                                sizeVariant="sm"
                            />
                        </div>
                    ))}
                </div>

                <Button
                    type="button"
                    size="sm"
                    className="mt-3 min-h-11 w-full justify-center sm:min-h-9 sm:w-auto"
                    leftIcon={status === 'dalam_proses' ? <Play className="size-3.5" /> : <CircleCheckBig className="size-3.5" />}
                    isLoading={processing}
                    disabled={selectedIds.length === 0}
                    onClick={() => updateItemStatus(status, selectedIds)}
                >
                    {actionLabel} ({selectedIds.length})
                </Button>
            </section>
        );
    };

    const steps = [
        {
            label: 'Approval Direktur',
            done: isApproved || isProcessing || isCompleted,
            current: isApproved,
        },
        {
            label: 'Proses Admin',
            done: isProcessing || isCompleted,
            current: isProcessing,
        },
        {
            label: isClearanceIn || isClearanceOut ? `Kapal ${targetLabel}` : 'Terpenuhi',
            done: isCompleted,
            current: isCompleted,
        },
    ];

    const itemWorkflowModal = (
        <Modal
            isOpen={managingItems}
            onClose={() => {
                if (!processing) setManagingItems(false);
            }}
            title={`Kelola ${label} per Item`}
            subtitle={`${request.request_number} · Pilih satu atau beberapa item dalam sekali tindakan.`}
            size="lg"
            asBottomSheetOnMobile
            footer={
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center sm:w-auto"
                    disabled={processing}
                    onClick={() => setManagingItems(false)}
                >
                    Tutup
                </Button>
            }
        >
            <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F0F8FF] p-2.5 text-center dark:bg-[#071322]">
                    <div>
                        <p className="text-lg font-black tabular-nums text-[#0060F4]">{startableItems.length}</p>
                        <p className="text-[10px] font-bold text-[#52658E] dark:text-[#94A3B8]">Siap diproses</p>
                    </div>
                    <div>
                        <p className="text-lg font-black tabular-nums text-[#6D3CCB]">{processingItems.length}</p>
                        <p className="text-[10px] font-bold text-[#52658E] dark:text-[#94A3B8]">Dalam proses</p>
                    </div>
                    <div>
                        <p className="text-lg font-black tabular-nums text-[#087443]">{completedItems.length}</p>
                        <p className="text-[10px] font-bold text-[#52658E] dark:text-[#94A3B8]">Selesai</p>
                    </div>
                </div>

                {renderItemSelection(
                    'Item siap diproses',
                    `Pilih item yang akan memulai ${label.toLowerCase()}.`,
                    startableItems,
                    selectedStartIds,
                    setSelectedStartIds,
                    isClearanceIn ? 'Mulai Clearance In' : isClearanceOut ? 'Mulai Clearance Out' : 'Mulai Pemenuhan',
                    'dalam_proses'
                )}

                {renderItemSelection(
                    'Item dalam proses',
                    isClearanceIn || isClearanceOut
                        ? `Status kunjungan berubah menjadi ${targetLabel} hanya setelah seluruh item selesai.`
                        : 'Tandai selesai setelah barang atau jasa benar-benar diterima.',
                    processingItems,
                    selectedCompletionIds,
                    setSelectedCompletionIds,
                    isClearanceIn ? 'Selesaikan Clearance In' : isClearanceOut ? 'Selesaikan Clearance Out' : 'Tandai Terpenuhi',
                    'selesai'
                )}

                {startableItems.length === 0 && processingItems.length === 0 && (
                    <div className="rounded-2xl border border-[#BFE8D2] bg-[#F3FCF7] p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
                        <CircleCheckBig className="mx-auto size-6 text-[#087443]" aria-hidden="true" />
                        <p className="mt-2 text-sm font-extrabold text-[#087443] dark:text-emerald-300">
                            {hasUnapprovedItems ? 'Item yang disetujui telah selesai' : 'Semua item telah selesai'}
                        </p>
                        {hasUnapprovedItems && (
                            <p className="mt-1 text-xs leading-5 text-[#52658E] dark:text-[#94A3B8]">
                                Item lainnya tetap menunggu keputusan Direktur dan dapat diproses setelah disetujui.
                            </p>
                        )}
                    </div>
                )}

                {error && (
                    <p role="alert" className="rounded-xl bg-[#FFE7EC] px-3 py-2 text-xs font-semibold text-[#C62840] dark:bg-rose-950/50 dark:text-rose-300">
                        {error}
                    </p>
                )}
            </div>
        </Modal>
    );

    if (compact) {
        return (
            <>
                <div
                    aria-label={`Tindak lanjut ${request.request_number}`}
                    className={`flex flex-col items-center gap-1.5 ${className}`}
                >
                    {isCompleted ? (
                        <span className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#DCF7E8] px-2.5 text-xs font-bold text-[#087443] dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CircleCheckBig className="size-3.5" aria-hidden="true" />
                            Proses Selesai
                        </span>
                    ) : canProcess ? (
                        <Button
                            type="button"
                            size="sm"
                            isLoading={processing}
                            disabled={hasItemWorkflow ? approvedItems.length === 0 : hasUnapprovedItems}
                            aria-busy={processing}
                            leftIcon={
                                hasItemWorkflow ? (
                                    <ListChecks className="size-3.5" aria-hidden="true" />
                                ) : isProcessing ? (
                                    <Ship className="size-3.5" aria-hidden="true" />
                                ) : (
                                    <Play className="size-3.5" aria-hidden="true" />
                                )
                            }
                            onClick={() => {
                                if (hasItemWorkflow) {
                                    setManagingItems(true);
                                } else if (isApproved) {
                                    updateStatus('Dalam Proses');
                                } else {
                                    setConfirmingCompletion(true);
                                }
                            }}
                        >
                            {hasItemWorkflow ? 'Kelola Item' : isApproved ? startLabel : completionLabel}
                        </Button>
                    ) : (
                        <span className="inline-flex min-h-9 items-center whitespace-nowrap rounded-lg border border-[#DCEAF8] bg-white px-2.5 text-xs font-semibold text-[#52658E] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#94A3B8]">
                            Menunggu Admin
                        </span>
                    )}

                    {error && (
                        <p role="alert" className="max-w-52 text-pretty text-center text-[11px] font-semibold text-[#C62840] dark:text-rose-300">
                            {error}
                        </p>
                    )}
                </div>

                {!inlineItemActions && itemWorkflowModal}

                <ConfirmDialog
                    isOpen={confirmingCompletion}
                    title={completionLabel}
                    description={
                        isClearanceIn || isClearanceOut
                            ? `Tindakan ini menyelesaikan ${label} dan mengubah status kunjungan menjadi ${targetLabel}.`
                            : 'Pastikan barang atau jasa telah benar-benar dipenuhi. Pembayaran vendor tetap dicatat melalui alur invoice dan pendanaan.'
                    }
                    confirmLabel={completionLabel}
                    processing={processing}
                    onClose={() => setConfirmingCompletion(false)}
                    onConfirm={() => updateStatus('Selesai')}
                >
                    <p className="text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">
                        Status akan dicatat pada riwayat aktivitas dan tidak dapat dilewati tanpa tahap “Dalam Proses”.
                    </p>
                </ConfirmDialog>
            </>
        );
    }

    return (
        <section
            aria-label={`Alur tindak lanjut ${request.request_number}`}
            className={`bg-[#F8FBFF] px-3 py-3 dark:bg-[#071322]/70 sm:px-5 sm:py-3.5 ${className}`}
        >
            <div className={`flex gap-4 ${compact ? 'flex-col' : 'flex-col lg:flex-row lg:items-center lg:justify-between'}`}>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]">
                            {isCompleted ? (
                                <CircleCheckBig className="size-4.5" aria-hidden="true" />
                            ) : isProcessing ? (
                                <Wrench className="size-4.5" aria-hidden="true" />
                            ) : (
                                <LockKeyhole className="size-4.5" aria-hidden="true" />
                            )}
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                                {isCompleted ? 'Proses selesai' : isProcessing ? 'Sedang diproses Admin' : 'Langkah selanjutnya'}
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-[#52658E] dark:text-[#94A3B8]">
                                {visibleDescription}
                            </p>
                        </div>
                    </div>

                    {!compact && (
                        <ol className="mt-3 grid grid-cols-3 gap-2 sm:gap-1" aria-label="Tahapan pengajuan">
                            {steps.map((step, index) => (
                                <li key={step.label} className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:text-left">
                                    <span
                                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                                            step.done
                                                ? 'border-[#087443] bg-[#DCF7E8] text-[#087443] dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : step.current
                                                  ? 'border-[#0060F4] bg-[#E0F0FF] text-[#0060F4]'
                                                  : 'border-[#B7C9DF] bg-white text-[#8C9BB9] dark:border-[#334B6D] dark:bg-[#0C1D36]'
                                        }`}
                                    >
                                        {step.done ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                                    </span>
                                    <span className="break-words text-[10px] font-semibold leading-tight text-[#52658E] dark:text-[#94A3B8] sm:text-[11px]">
                                        {step.label}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}

                    {error && (
                        <p role="alert" className="mt-2 text-xs font-semibold text-[#C62840] dark:text-rose-300">
                            {error}
                        </p>
                    )}
                </div>

                {(isApproved || isProcessing) && (!hasItemWorkflow || !inlineItemActions) && (
                    <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                        {canProcess ? (
                            <Button
                                type="button"
                                size="sm"
                                className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                                isLoading={processing}
                                disabled={hasItemWorkflow ? approvedItems.length === 0 : hasUnapprovedItems}
                                aria-busy={processing}
                                leftIcon={
                                    hasItemWorkflow ? (
                                        <ListChecks className="size-3.5" aria-hidden="true" />
                                    ) : isProcessing ? (
                                        <Ship className="size-3.5" aria-hidden="true" />
                                    ) : (
                                        <Play className="size-3.5" aria-hidden="true" />
                                    )
                                }
                                onClick={() => {
                                    if (hasItemWorkflow) {
                                        setManagingItems(true);
                                    } else if (isApproved) {
                                        updateStatus('Dalam Proses');
                                    } else {
                                        setConfirmingCompletion(true);
                                    }
                                }}
                            >
                                {hasItemWorkflow
                                    ? `Kelola ${isClearanceIn || isClearanceOut ? label : 'Pemenuhan'}`
                                    : isApproved
                                      ? startLabel
                                      : completionLabel}
                            </Button>
                        ) : (
                            <span className="inline-flex min-h-9 items-center rounded-xl border border-[#DCEAF8] bg-white px-3 text-xs font-semibold text-[#52658E] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#94A3B8]">
                                Menunggu tindak lanjut Admin
                            </span>
                        )}
                        {isApproved && !hasUnapprovedItems && (
                            <span className="text-[10px] text-[#8C9BB9] dark:text-[#64748B]">
                                Harga tidak dapat diubah tanpa revisi approval.
                            </span>
                        )}
                    </div>
                )}
            </div>

            {!inlineItemActions && itemWorkflowModal}

            <ConfirmDialog
                isOpen={confirmingCompletion}
                title={completionLabel}
                description={
                    isClearanceIn || isClearanceOut
                        ? `Tindakan ini menyelesaikan ${label} dan mengubah status kunjungan menjadi ${targetLabel}.`
                        : 'Pastikan barang atau jasa telah benar-benar dipenuhi. Pembayaran vendor tetap dicatat melalui alur invoice dan pendanaan.'
                }
                confirmLabel={completionLabel}
                processing={processing}
                onClose={() => setConfirmingCompletion(false)}
                onConfirm={() => updateStatus('Selesai')}
            >
                <p className="text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">
                    Status akan dicatat pada riwayat aktivitas dan tidak dapat dilewati tanpa tahap “Dalam Proses”.
                </p>
            </ConfirmDialog>
        </section>
    );
}
