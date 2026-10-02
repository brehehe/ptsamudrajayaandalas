import type { ReactNode } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    onClose: () => void;
    processing?: boolean;
    disabled?: boolean;
    asBottomSheetOnMobile?: boolean;
    confirmVariant?: 'primary' | 'danger';
    children?: ReactNode;
}

export default function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmLabel,
    onConfirm,
    onClose,
    processing = false,
    disabled = false,
    asBottomSheetOnMobile = true,
    confirmVariant = 'primary',
    children,
}: ConfirmDialogProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!processing) onClose();
            }}
            title={title}
            subtitle={description}
            asBottomSheetOnMobile={asBottomSheetOnMobile}
            size="md"
            footer={
                <div className="flex items-center gap-3 w-full">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={processing}
                        className={
                            'flex-1 justify-center py-2.5 rounded-xl border border-[#DCEAF8] ' +
                            'dark:border-[#1E3A5F] text-xs font-bold text-[#082870] ' +
                            'dark:text-[#94A3B8]'
                        }
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        variant={confirmVariant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        isLoading={processing}
                        disabled={disabled}
                        className={
                            confirmVariant === 'danger'
                                ? 'flex-1 justify-center py-2.5 rounded-xl bg-[#C62840] hover:bg-[#A81E32] active:bg-[#8B1828] text-white text-xs font-bold shadow-xs whitespace-nowrap'
                                : 'flex-1 justify-center py-2.5 rounded-xl bg-[#0060F4] hover:bg-[#0052D4] text-white text-xs font-bold shadow-xs whitespace-nowrap'
                        }
                    >
                        {processing ? 'Menyimpan…' : confirmLabel}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4 pt-1">{children}</div>
        </Modal>
    );
}
