import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, CircleAlert, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface AlertToastAction {
    label: string;
    href: string;
}

export type AlertToastMessage = {
    variant: 'success';
    message: string;
    action: AlertToastAction;
} | {
    variant: 'error';
    message: string;
    action?: AlertToastAction;
};

export type AlertToastProps = AlertToastMessage & {
    onClose: () => void;
};

export default function AlertToast(props: AlertToastProps) {
    const { variant, message, onClose } = props;
    const action = 'action' in props ? props.action : undefined;
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
            aria-live={variant === 'error' ? 'assertive' : 'polite'}
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
                    {action && (
                        <Link
                            href={action.href}
                            onClick={onClose}
                            className={
                                'mt-3 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl ' +
                                'touch-manipulation bg-sja-primary px-4 py-2 text-center text-sm font-bold text-white transition-colors ' +
                                'hover:bg-[#082870] focus-visible:outline-2 focus-visible:outline-offset-2 ' +
                                'focus-visible:outline-sja-primary motion-reduce:transition-none'
                            }
                        >
                            <span className="break-words">{action.label}</span>
                            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                        </Link>
                    )}
                    {variant === 'error' && !action && (
                        <button
                            type="button"
                            onClick={onClose}
                            className={
                                'mt-3 inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl ' +
                                'border border-[var(--sja-status-danger-foreground)] px-4 py-2 text-sm font-bold ' +
                                'text-[var(--sja-status-danger-foreground)] transition-colors ' +
                                'hover:bg-[var(--sja-status-danger-background)] focus-visible:outline-2 ' +
                                'focus-visible:outline-offset-2 focus-visible:outline-sja-primary motion-reduce:transition-none'
                            }
                        >
                            Periksa Kembali
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup notifikasi"
                    className={
                        '-mr-2 -mt-2 flex size-11 shrink-0 touch-manipulation items-center justify-center ' +
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
