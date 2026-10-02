import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { PropsWithChildren } from 'react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => { },
    role = 'dialog',
    panelClassName = '',
    asBottomSheetOnMobile = false,
}: PropsWithChildren<{
    show: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    closeable?: boolean;
    onClose: CallableFunction;
    role?: 'dialog' | 'alertdialog';
    panelClassName?: string;
    asBottomSheetOnMobile?: boolean;
}>) {
    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[maxWidth];

    return (
        <Transition show={show} leave="duration-200">
            <Dialog
                as="div"
                id="modal"
                role={role}
                className={
                    `fixed inset-0 z-50 flex transform ${asBottomSheetOnMobile
                        ? 'items-end sm:items-center p-0 sm:p-4'
                        : 'items-center px-4 py-6 sm:px-0'
                    } overflow-y-auto transition-all`
                }
                onClose={close}
            >
                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="absolute inset-0 bg-gray-500/75 dark:bg-black/80 backdrop-blur-xs" />
                </TransitionChild>

                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom={
                        asBottomSheetOnMobile
                            ? 'opacity-0 translate-y-full sm:translate-y-0 sm:scale-95'
                            : 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
                    }
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo={
                        asBottomSheetOnMobile
                            ? 'opacity-0 translate-y-full sm:translate-y-0 sm:scale-95'
                            : 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
                    }
                >
                    <DialogPanel
                        className={`relative z-10 ${asBottomSheetOnMobile
                                ? 'mb-0 rounded-t-[28px] sm:rounded-2xl w-full'
                                : 'mb-6 rounded-lg'
                            } transform overflow-hidden bg-white dark:bg-[#0C1D36] text-gray-900 dark:text-[#F1F5F9] border border-transparent dark:border-[#1E3A5F] shadow-xl transition-all sm:mx-auto sm:w-full motion-reduce:transform-none motion-reduce:transition-none ${maxWidthClass} ${panelClassName}`}
                    >
                        {asBottomSheetOnMobile && (
                            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white dark:bg-[#0C1D36]">
                                <div className="w-12 h-1.5 rounded-full bg-[#DCEAF8] dark:bg-[#1E3A5F]" />
                            </div>
                        )}
                        {children}
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}
