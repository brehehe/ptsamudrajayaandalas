import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import { CircleAlert } from 'lucide-react';

export interface FormErrorSummaryProps {
    errors: Record<string, string | undefined>;
    title?: string;
    className?: string;
    autoFocus?: boolean;
}

const FormErrorSummary = forwardRef<HTMLDivElement, FormErrorSummaryProps>(
    ({ errors, title = 'Periksa kembali data berikut:', className = '', autoFocus = true }, forwardedRef) => {
        const localRef = useRef<HTMLDivElement>(null);
        const messages = useMemo(
            () => Array.from(new Set(Object.values(errors).filter((message): message is string => Boolean(message)))),
            [errors],
        );
        const errorSignature = messages.join('|');

        useEffect(() => {
            if (!autoFocus || !errorSignature) {
                return;
            }

            const animationFrame = window.requestAnimationFrame(() => localRef.current?.focus());

            return () => window.cancelAnimationFrame(animationFrame);
        }, [autoFocus, errorSignature]);

        const setRef = (node: HTMLDivElement | null) => {
            localRef.current = node;

            if (typeof forwardedRef === 'function') {
                forwardedRef(node);
            } else if (forwardedRef) {
                forwardedRef.current = node;
            }
        };

        if (messages.length === 0) {
            return null;
        }

        return (
            <div
                ref={setRef}
                role="alert"
                aria-live="polite"
                tabIndex={-1}
                className={`rounded-xl border border-[#F8BAC5] bg-[#FFF1F3] px-3 py-2.5 text-[#9F1239] outline-none focus-visible:ring-2 focus-visible:ring-[#C62840]/30 dark:border-[#7F1D1D] dark:bg-[#450A0A]/35 dark:text-[#FCA5A5] ${className}`}
            >
                <div className="flex items-start gap-2">
                    <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs font-bold">{title}</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] font-medium leading-relaxed">
                            {messages.map((message) => <li key={message}>{message}</li>)}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
);

FormErrorSummary.displayName = 'FormErrorSummary';

export default FormErrorSummary;
