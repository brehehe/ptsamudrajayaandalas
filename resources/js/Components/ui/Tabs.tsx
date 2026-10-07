import React, { ReactNode, useRef } from 'react';

export interface TabItem {
    id: string;
    label: ReactNode;
    icon?: ReactNode;
    count?: number;
    disabled?: boolean;
    tabId?: string;
    controls?: string;
}

interface TabsProps {
    items: TabItem[];
    activeId: string;
    onChange: (id: string) => void;
    ariaLabel: string;
    className?: string;
    equalWidth?: boolean;
}

export default function Tabs({
    items,
    activeId,
    onChange,
    ariaLabel,
    className = '',
    equalWidth = false,
}: TabsProps) {
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const moveFocus = (currentIndex: number, direction: 1 | -1) => {
        if (items.length < 2) {
            return;
        }

        let nextIndex = currentIndex;

        for (let attempts = 0; attempts < items.length; attempts += 1) {
            nextIndex = (nextIndex + direction + items.length) % items.length;

            if (!items[nextIndex]?.disabled) {
                onChange(items[nextIndex].id);
                buttonRefs.current[nextIndex]?.focus();
                return;
            }
        }
    };

    const focusBoundaryItem = (direction: 1 | -1) => {
        const startIndex = direction === 1 ? 0 : items.length - 1;

        for (
            let index = startIndex;
            index >= 0 && index < items.length;
            index += direction
        ) {
            if (!items[index]?.disabled) {
                onChange(items[index].id);
                buttonRefs.current[index]?.focus();
                return;
            }
        }
    };

    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className={`${
                equalWidth ? 'grid grid-flow-col auto-cols-fr' : 'flex'
            } overflow-x-auto border-b border-[#DCEAF8] bg-white scrollbar-none dark:border-[#1E3A5F] dark:bg-[#0C1D36] ${className}`}
        >
            {items.map((item, index) => {
                const isActive = item.id === activeId;

                return (
                    <button
                        key={item.id}
                        ref={(element) => {
                            buttonRefs.current[index] = element;
                        }}
                        type="button"
                        id={item.tabId}
                        role="tab"
                        aria-controls={item.controls}
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        disabled={item.disabled}
                        onClick={() => onChange(item.id)}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowRight') {
                                event.preventDefault();
                                moveFocus(index, 1);
                            } else if (event.key === 'ArrowLeft') {
                                event.preventDefault();
                                moveFocus(index, -1);
                            } else if (event.key === 'Home') {
                                event.preventDefault();
                                focusBoundaryItem(1);
                            } else if (event.key === 'End') {
                                event.preventDefault();
                                focusBoundaryItem(-1);
                            }
                        }}
                        className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0060F4] disabled:cursor-not-allowed disabled:opacity-50 ${
                            isActive
                                ? 'border-[#0060F4] bg-[#F0F8FF] text-[#0060F4] dark:bg-[#082870]/20 dark:text-[#60A5FA]'
                                : 'border-transparent text-[#52658E] hover:bg-[#F8FBFF] hover:text-[#082870] dark:text-[#94A3B8] dark:hover:bg-[#132847] dark:hover:text-white'
                        } ${equalWidth ? 'w-full' : ''}`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.count !== undefined && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                                    isActive
                                        ? 'bg-[#0060F4] text-white'
                                        : 'bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA]'
                                }`}
                            >
                                {item.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
