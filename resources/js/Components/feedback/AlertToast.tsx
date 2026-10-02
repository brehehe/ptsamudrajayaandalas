import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface AlertToastMessage {
    variant: 'success' | 'error';
    message: string;
}

export interface AlertToastProps extends AlertToastMessage {
    onClose: () => void;
}

export default function AlertToast({ variant, message, onClose }: AlertToastProps) {
    const Icon = variant === 'success' ? CheckCircle2 : CircleAlert;
    const statusClass =
        variant === 'success'
            ? 'text-[var(--sja-status-success-foreground)] bg-[var(--sja-status-success-background)]'
            : 'text-[var(--sja-status-danger-foreground)] bg-[var(--sja-status-danger-background)]';

    return createPortal(
        <div
            className={
                'fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-60 mx-auto ' +
                'max-w-lg rounded-2xl border border-sja-border bg-sja-surface p-4 shadow-lg'
            }
            role={variant === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
        >
            <div className="flex items-start gap-3">
                <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${statusClass}`}
                >
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                    <p className="font-semibold text-[var(--sja-heading)]">
                        {variant === 'success' ? 'Berhasil' : 'Belum dapat disimpan'}
                    </p>
                    <p className="break-words text-[var(--sja-secondary-text)]">{message}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup notifikasi"
                    className={
                        '-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center ' +
                        'rounded-xl text-[var(--sja-secondary-text)] hover:bg-sja-background ' +
                        'focus-visible:outline-2 focus-visible:outline-sja-primary'
                    }
                >
                    <X className="size-5" aria-hidden="true" />
                </button>
            </div>
        </div>,
        document.body
    );
}
