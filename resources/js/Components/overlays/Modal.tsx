import React, { Fragment, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    // Handle Escape key
    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEsc, onClose]);

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

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
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
                            initial={
                                asBottomSheetOnMobile
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
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            className={`w-full ${sizeClasses[size]} bg-white dark:bg-[#0C1D36] ${
                                asBottomSheetOnMobile
                                    ? 'rounded-t-[28px] sm:rounded-2xl'
                                    : 'rounded-2xl'
                            } border border-[#DCEAF8] dark:border-[#1E3A5F] shadow-[0_20px_60px_rgba(8,40,112,0.3)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-left cursor-default flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden ${className}`}
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
                                                'w-8 h-8 rounded-full flex items-center ' +
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
                                    'px-5 py-4 overflow-y-auto flex-1 text-xs sm:text-sm ' +
                                    'text-[#0B1F63] dark:text-[#F1F5F9] bg-white dark:bg-[#0C1D36]'
                                }
                            >
                                {children}
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div
                                    className={
                                        'px-5 py-3.5 border-t border-[#DCEAF8] ' +
                                        'dark:border-[#1E3A5F] bg-[#F0F8FF] dark:bg-[#071322] flex ' +
                                        'items-center justify-end gap-2.5 flex-shrink-0'
                                    }
                                >
                                    {footer}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
