import { router } from '@inertiajs/react';
import { Check, CircleCheckBig, LockKeyhole, Play, Ship, Wrench } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from './overlays/ConfirmDialog';
import Button from './ui/Button';

export interface WorkflowRequest {
    id: string;
    request_number: string;
    status: string;
    service_type?: string | null;
    requested_port_call_status?: string | null;
    items?: Array<{
        director_status?: string | null;
    }>;
}

interface RequestWorkflowPanelProps {
    request: WorkflowRequest;
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

export default function RequestWorkflowPanel({
    request,
    canProcess,
    compact = false,
    className = '',
}: RequestWorkflowPanelProps) {
    const [processing, setProcessing] = useState(false);
    const [confirmingCompletion, setConfirmingCompletion] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isApproved = request.status === 'Disetujui';
    const isProcessing = ['Dalam Proses', 'Diproses'].includes(request.status);
    const isCompleted = request.status === 'Selesai';
    const isClearanceIn = request.service_type === 'clearance_in';
    const isClearanceOut = request.service_type === 'clearance_out';
    const hasUnapprovedItems = Boolean(
        request.items?.some((item) => item.director_status !== 'approved')
    );
    const targetLabel = targetStatusLabel(request.requested_port_call_status);
    const label = serviceLabel(request.service_type);

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
        ? hasUnapprovedItems
            ? 'Masih ada item yang belum disetujui Direktur. Selesaikan approval sebelum proses dimulai.'
            : `Approval Direktur selesai dan harga telah dikunci. Admin dapat memulai ${label.toLowerCase()}.`
        : isProcessing
          ? isClearanceIn || isClearanceOut
              ? `Proses sedang berjalan. Saat diselesaikan, status kunjungan akan berubah menjadi ${targetLabel}.`
              : 'Pemenuhan sedang berjalan. Tandai terpenuhi setelah barang atau jasa benar-benar diterima.'
          : isClearanceOut
            ? 'Clearance Out selesai. Kapal berstatus Berangkat dan menunggu Nota Rampung.'
            : `${label} telah selesai dicatat.`;

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
                            disabled={hasUnapprovedItems}
                            aria-busy={processing}
                            leftIcon={
                                isProcessing ? (
                                    <Ship className="size-3.5" aria-hidden="true" />
                                ) : (
                                    <Play className="size-3.5" aria-hidden="true" />
                                )
                            }
                            onClick={() => {
                                if (isApproved) {
                                    updateStatus('Dalam Proses');
                                } else {
                                    setConfirmingCompletion(true);
                                }
                            }}
                        >
                            {isApproved ? startLabel : completionLabel}
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
            className={`bg-[#F8FBFF] px-4 py-3.5 dark:bg-[#071322]/70 sm:px-5 ${className}`}
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
                                {description}
                            </p>
                        </div>
                    </div>

                    {!compact && (
                        <ol className="mt-3 grid grid-cols-3 gap-1" aria-label="Tahapan pengajuan">
                            {steps.map((step, index) => (
                                <li key={step.label} className="flex min-w-0 items-center gap-1.5">
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
                                    <span className="truncate text-[10px] font-semibold text-[#52658E] dark:text-[#94A3B8] sm:text-[11px]">
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

                {(isApproved || isProcessing) && (
                    <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                        {canProcess ? (
                            <Button
                                type="button"
                                size="sm"
                                isLoading={processing}
                                disabled={hasUnapprovedItems}
                                aria-busy={processing}
                                leftIcon={
                                    isProcessing ? (
                                        <Ship className="size-3.5" aria-hidden="true" />
                                    ) : (
                                        <Play className="size-3.5" aria-hidden="true" />
                                    )
                                }
                                onClick={() => {
                                    if (isApproved) {
                                        updateStatus('Dalam Proses');
                                    } else {
                                        setConfirmingCompletion(true);
                                    }
                                }}
                            >
                                {isApproved ? startLabel : completionLabel}
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
