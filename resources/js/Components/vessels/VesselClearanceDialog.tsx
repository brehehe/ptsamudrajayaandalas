import { useForm } from '@inertiajs/react';
import ConfirmDialog from '../overlays/ConfirmDialog';
import RadioGroup from '../forms/Radio';
import Input from '../forms/Input';
import type { AlertToastMessage } from '../feedback/AlertToast';
import type { ClearancePortCall } from './types';

interface VesselClearanceDialogProps {
    direction: 'in' | 'out';
    vesselName: string;
    portCalls: ClearancePortCall[];
    selectedPortCallId?: string | null;
    onClose: () => void;
    onFeedback: (message: AlertToastMessage) => void;
}

export default function VesselClearanceDialog({
    direction,
    vesselName,
    portCalls,
    selectedPortCallId,
    onClose,
    onFeedback,
}: VesselClearanceDialogProps) {
    const selected =
        portCalls.find((portCall) => portCall.id === selectedPortCallId) ??
        portCalls.find((portCall) => portCall.status === 'scheduled') ??
        portCalls[0];
    const isArrival = direction === 'in';
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    const form = useForm({
        status: isArrival ? '' : 'departed',
        occurred_at: localNow,
        expected_status: selected?.status ?? '',
    });
    const blockReason = !portCalls.length
        ? 'Tidak ada kunjungan aktif yang dapat Anda kelola. Hubungi admin untuk memeriksa job dan penugasan kapal.'
        : !selected
          ? 'Pilih job kunjungan yang akan dicatat.'
          : isArrival
            ? selected.clearance_in_block_reason
            : !selected.can_clearance_out
              ? 'Clearance Out hanya tersedia setelah kapal berstatus Labuh atau Sandar.'
              : null;

    const submit = () => {
        if (!selected || blockReason || form.processing) return;
        form.transform((data) => ({
            ...data,
            expected_status: selected.status,
            occurred_at: new Date(data.occurred_at).toISOString(),
        }));
        form.patch(selected.update_url, {
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = page.props.flash as { success?: string; error?: string } | undefined;
                if (flash?.error) {
                    form.setError('status', flash.error);
                    onFeedback({ variant: 'error', message: flash.error });
                    return;
                }
                onClose();
                onFeedback({
                    variant: 'success',
                    message: flash?.success ?? 'Pengajuan clearance berhasil dibuat.',
                });
            },
            onError: (errors) =>
                onFeedback({
                    variant: 'error',
                    message: Object.values(errors)[0] || 'Periksa kembali data clearance.',
                }),
        });
    };

    return (
        <ConfirmDialog
            isOpen
            title={`Ajukan Clearance ${isArrival ? 'In' : 'Out'}`}
            description={
                isArrival
                    ? `Ajukan kedatangan ${vesselName} dan pilih target status. Status kapal berubah setelah disetujui Direktur dan diselesaikan Admin.`
                    : `Ajukan keberangkatan ${vesselName}. Status kapal berubah menjadi Selesai setelah disetujui Direktur dan diselesaikan Admin.`
            }
            confirmLabel={`Ajukan Clearance ${isArrival ? 'In' : 'Out'}`}
            onConfirm={submit}
            onClose={onClose}
            processing={form.processing}
            disabled={Boolean(blockReason) || !form.data.status || !form.data.occurred_at}
        >
            {blockReason ? (
                <p
                    role="status"
                    className={
                        'rounded-xl bg-[var(--sja-status-waiting-background)] p-3 text-sm ' +
                        'text-[var(--sja-status-waiting-foreground)]'
                    }
                >
                    {blockReason}
                </p>
            ) : (
                <div className="space-y-4">
                    {isArrival && (
                        <RadioGroup
                            name="clearance-next-status"
                            label="Target status setelah pengajuan selesai"
                            value={form.data.status}
                            onChange={(value) => form.setData('status', value)}
                            options={[
                                {
                                    value: 'anchored',
                                    label: 'Labuh',
                                    description: 'Kapal lego jangkar atau menunggu antrean.',
                                },
                                {
                                    value: 'berthed',
                                    label: 'Sandar',
                                    description: 'Kapal langsung bersandar di dermaga.',
                                },
                            ]}
                            disabled={form.processing}
                            error={form.errors.status}
                        />
                    )}
                    <Input
                        type="datetime-local"
                        label={isArrival ? 'Waktu kedatangan aktual' : 'Waktu keberangkatan aktual'}
                        value={form.data.occurred_at}
                        onChange={(event) => form.setData('occurred_at', event.target.value)}
                        required
                        disabled={form.processing}
                        error={form.errors.occurred_at}
                    />
                </div>
            )}
            {form.errors.status && (
                <p role="alert" className="text-sm text-[var(--sja-status-danger-foreground)]">
                    {form.errors.status}
                </p>
            )}
        </ConfirmDialog>
    );
}
