import React, { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: ReactNode;
    subtitle?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    closeOnBackdrop?: boolean;
    closeOnEsc?: boolean;
    showCloseButton?: boolean;
    asBottomSheetOnMobile?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    full: 'sm:max-w-5xl',
};

export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    size = 'md',
    closeOnBackdrop = true,
    closeOnEsc = true,
    showCloseButton = true,
    asBottomSheetOnMobile = true,
    className = '',
}: ModalProps) {
    const shouldReduceMotion = useReducedMotion();
    const titleId = useId();
    const subtitleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && closeOnEsc) {
                onClose();
                return;
            }

            if (e.key === 'Tab' && dialogRef.current) {
                const focusableElements = Array.from(
                    dialogRef.current.querySelectorAll<HTMLElement>(
                        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    )
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (!firstElement || !lastElement) {
                    e.preventDefault();
                    dialogRef.current.focus();
                } else if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEsc, onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocusedElement = document.activeElement as HTMLElement | null;
        const animationFrame = window.requestAnimationFrame(() => {
            const firstFocusableElement = dialogRef.current?.querySelector<HTMLElement>(
                'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
            );

            (firstFocusableElement || dialogRef.current)?.focus();
        });

        return () => {
            window.cancelAnimationFrame(animationFrame);
            previouslyFocusedElement?.focus();
        };
    }, [isOpen]);

    // Handle Body Scroll Lock
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-60 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                        onClick={() => closeOnBackdrop && onClose()}
                        className="fixed inset-0 bg-[#082870]/60 backdrop-blur-sm z-0"
                        aria-hidden="true"
                    />

                    {/* Dialog Container */}
                    <div
                        onClick={() => closeOnBackdrop && onClose()}
                        className={`relative z-10 min-h-full flex ${
                            asBottomSheetOnMobile ? 'items-end sm:items-center' : 'items-center'
                        } justify-center p-0 sm:p-4 text-center cursor-pointer`}
                    >
                        <motion.div
                            ref={dialogRef}
                            initial={
                                shouldReduceMotion
                                    ? false
                                    : asBottomSheetOnMobile
                                    ? { opacity: 0, y: '100%' }
                                    : { opacity: 0, scale: 0.95, y: -10 }
                            }
                            animate={
                                asBottomSheetOnMobile
                                    ? { opacity: 1, y: 0 }
                                    : { opacity: 1, scale: 1, y: 0 }
                            }
                            exit={
                                asBottomSheetOnMobile
                                    ? { opacity: 0, y: '100%' }
                                    : { opacity: 0, scale: 0.95, y: -10 }
                            }
                            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            tabIndex={-1}
                            aria-modal="true"
                            aria-labelledby={title ? titleId : undefined}
                            aria-describedby={subtitle ? subtitleId : undefined}
                            className={`w-full ${sizeClasses[size]} bg-white dark:bg-[#0C1D36] ${
                                asBottomSheetOnMobile
                                    ? 'rounded-t-[28px] sm:rounded-2xl'
                                    : 'rounded-2xl'
                            } border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-[0_20px_60px_rgba(8,40,112,0.3)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-left cursor-default flex flex-col max-h-[90dvh] sm:max-h-[85dvh] overflow-hidden ${className}`}
                        >
                            {/* Mobile Pull Bar for Bottom Sheet */}
                            {asBottomSheetOnMobile && (
                                <div
                                    className={
                                        'sm:hidden flex justify-center pt-3 pb-1 bg-white ' +
                                        'dark:bg-[#0C1D36] rounded-t-[28px]'
                                    }
                                >
                                    <div className="w-12 h-1.5 rounded-full bg-[#DCEAF8] dark:bg-[#1E3A5F]" />
                                </div>
                            )}

                            {/* Header */}
                            {(title || showCloseButton) && (
                                <div
                                    className={
                                        'px-5 py-4 border-b border-[#DCEAF8] dark:border-[#1E3A5F] ' +
                                        'flex items-center justify-between gap-3 flex-shrink-0 ' +
                                        'bg-white dark:bg-[#0C1D36]'
                                    }
                                >
                                    <div className="min-w-0 flex-1">
                                        {title && (
                                            <div
                                                id={titleId}
                                                className={
                                                    'text-base sm:text-lg font-extrabold ' +
                                                    'text-[#0B1F63] dark:text-[#F1F5F9] ' +
                                                    'leading-snug'
                                                }
                                            >
                                                {title}
                                            </div>
                                        )}
                                        {subtitle && (
                                            <p
                                                id={subtitleId}
                                                className={
                                                    'text-xs text-[#52658E] dark:text-[#94A3B8] ' +
                                                    'mt-0.5 leading-relaxed'
                                                }
                                            >
                                                {subtitle}
                                            </p>
                                        )}
                                    </div>

                                    {showCloseButton && (
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className={
                                                'size-11 rounded-full flex items-center ' +
                                                'justify-center text-[#52658E] ' +
                                                'dark:text-[#94A3B8] hover:text-[#C62840] ' +
                                                'dark:hover:text-[#F87171] hover:bg-[#FFE7EC] ' +
                                                'dark:hover:bg-[#EF4444]/20 transition-colors ' +
                                                'flex-shrink-0 cursor-pointer'
                                            }
                                            aria-label="Tutup dialog"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2.5}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Body */}
                            <div
                                className={
                                    'min-h-0 px-5 pt-4 overflow-y-auto flex-1 text-xs sm:text-sm ' +
                                    'overscroll-contain text-[#0B1F63] dark:text-[#F1F5F9] ' +
                                    'bg-white dark:bg-[#0C1D36] ' +
                                    (asBottomSheetOnMobile && !footer
                                        ? 'pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4'
                                        : 'pb-4')
                                }
                            >
                                {children}
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div
                                    className={
                                        'px-5 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:py-3.5 border-t border-[#DCEAF8] ' +
                                        'dark:border-[#1E3A5F] bg-[#F0F8FF] dark:bg-[#071322] flex ' +
                                        'flex-col-reverse items-stretch gap-2 flex-shrink-0 ' +
                                        'sm:flex-row sm:items-center sm:justify-end'
                                    }
                                >
                                    {footer}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
