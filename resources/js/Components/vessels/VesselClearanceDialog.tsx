import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import ConfirmDialog from '../overlays/ConfirmDialog';
import RadioGroup from '../forms/Radio';
import Input from '../forms/Input';
import type { AlertToastMessage } from '../feedback/AlertToast';
import type { ClearancePortCall, MasterProduct } from './types';
import FormErrorSummary from '../forms/FormErrorSummary';

interface VesselClearanceDialogProps {
    direction: 'in' | 'out';
    vesselName: string;
    portCalls: ClearancePortCall[];
    selectedPortCallId?: string | null;
    products?: MasterProduct[];
    onClose: () => void;
    onFeedback: (message: AlertToastMessage) => void;
}

interface ClearanceItemForm {
    product_id?: string;
    item_name: string;
    unit: string;
    hpp_price: number;
}



export default function VesselClearanceDialog({
    direction,
    vesselName,
    portCalls,
    selectedPortCallId,
    products = [],
    onClose,
    onFeedback,
}: VesselClearanceDialogProps) {
    const selected =
        portCalls.find((portCall) => portCall.id === selectedPortCallId) ??
        portCalls.find((portCall) => portCall.status === 'scheduled') ??
        portCalls[0];
    const isArrival = direction === 'in';
    const now = new Date();
    const localDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');
    const form = useForm({
        status: isArrival ? '' : 'departed',
        occurred_at: localDate,
        expected_status: selected?.status ?? '',
    });

    const [clearanceItems, setClearanceItems] = useState<ClearanceItemForm[]>([]);

    useEffect(() => {
        if (isArrival) {
            if (form.data.status === 'berthed') {
                const prodTaktis = products.find((p) => p.code === 'PRD-PLD-TAKTIS');
                const prodEpb = products.find((p) => p.code === 'PRD-PLD-EPB');
                setClearanceItems([
                    {
                        product_id: prodTaktis?.id,
                        item_name: 'Taktis Penyandaran',
                        unit: prodTaktis?.unit || 'Kegiatan',
                        hpp_price: prodTaktis?.hpp_default ? Number(prodTaktis.hpp_default) : 0,
                    },
                    {
                        product_id: prodEpb?.id,
                        item_name: 'Pembayaran EPB (Pandu Tunda)',
                        unit: prodEpb?.unit || 'Kegiatan',
                        hpp_price: prodEpb?.hpp_default ? Number(prodEpb.hpp_default) : 100000,
                    },
                ]);
            } else if (form.data.status === 'anchored') {
                const prodClr = products.find((p) => p.code === 'PRD-CLR');
                setClearanceItems([
                    {
                        product_id: prodClr?.id,
                        item_name: 'Clearance In (Syahbandar & Karantina)',
                        unit: prodClr?.unit || 'Dokumen',
                        hpp_price: prodClr?.hpp_default ? Number(prodClr.hpp_default) : 2500000,
                    },
                ]);
            } else {
                setClearanceItems([]);
            }
        } else {
            const prodClr = products.find((p) => p.code === 'PRD-CLR');
            setClearanceItems([
                {
                    product_id: prodClr?.id,
                    item_name: 'Clearance Out (Syahbandar & Karantina)',
                    unit: prodClr?.unit || 'Dokumen',
                    hpp_price: prodClr?.hpp_default ? Number(prodClr.hpp_default) : 2500000,
                },
            ]);
        }
    }, [isArrival, form.data.status, products]);



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
            items: clearanceItems.map((it) => ({
                product_id: it.product_id,
                item_name: it.item_name,
                hpp_price: it.hpp_price,
            })),
        }));
        form.patch(selected.update_url, {
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = page.props.flash as { success?: string; error?: string } | undefined;
                if (flash?.error) {
                    form.setError('status', flash.error);
                    return;
                }
                onClose();
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
                    <FormErrorSummary errors={form.errors} />
                    {isArrival && (
                        <RadioGroup
                            required
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
                        id={`clearance-${direction}-actual-date`}
                        name="occurred_at"
                        type="date"
                        label={isArrival ? 'Tanggal kedatangan aktual' : 'Tanggal keberangkatan aktual'}
                        value={form.data.occurred_at}
                        max={localDate}
                        onChange={(event) => form.setData('occurred_at', event.target.value)}
                        autoComplete="off"
                        required
                        disabled={form.processing}
                        error={form.errors.occurred_at}
                    />
                </div>
            )}
        </ConfirmDialog>
    );
}
