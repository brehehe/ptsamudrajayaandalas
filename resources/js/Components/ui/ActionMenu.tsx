import { Menu, MenuButton, MenuItem, MenuItems, MenuSection, MenuSeparator } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { ChevronDown, EllipsisVertical } from 'lucide-react';
import type { ReactNode } from 'react';

type ActionMenuTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

interface ActionMenuItemBase {
    id: string;
    label: string;
    icon: ReactNode;
    ariaLabel?: string;
    disabled?: boolean;
    tone?: ActionMenuTone;
}

export interface ActionMenuLinkItem extends ActionMenuItemBase {
    href: string;
    onSelect?: never;
    inertia?: boolean;
    target?: '_blank';
    download?: boolean | string;
}

export interface ActionMenuButtonItem extends ActionMenuItemBase {
    href?: never;
    onSelect: () => void;
    inertia?: never;
    target?: never;
    download?: never;
}

export type ActionMenuItem = ActionMenuLinkItem | ActionMenuButtonItem;

export interface ActionMenuGroup {
    id: string;
    label?: string;
    items: ActionMenuItem[];
}

export interface ActionMenuProps {
    label: string;
    groups: ActionMenuGroup[];
    className?: string;
    buttonLabel?: string;
    buttonIcon?: ReactNode;
    buttonVariant?: 'primary' | 'outline' | 'secondary';
    trigger?: ReactNode;
}

const iconToneClasses: Record<ActionMenuTone, string> = {
    default: 'text-[#52658E] dark:text-[#94A3B8]',
    primary: 'text-[#0060F4] dark:text-[#60A5FA]',
    success: 'text-[#087443] dark:text-emerald-400',
    warning: 'text-[#A65300] dark:text-amber-400',
    danger: 'text-[#C62840] dark:text-rose-400',
};

const itemTextClasses: Record<ActionMenuTone, string> = {
    default: 'text-[#0B1F63] dark:text-[#E7F0FA]',
    primary: 'text-[#0B1F63] dark:text-[#E7F0FA]',
    success: 'text-[#087443] dark:text-emerald-300',
    warning: 'text-[#0B1F63] dark:text-[#E7F0FA]',
    danger: 'text-[#C62840] dark:text-rose-300',
};

export default function ActionMenu({
    label,
    groups,
    className = '',
    buttonLabel,
    buttonIcon,
    buttonVariant = 'outline',
    trigger,
}: ActionMenuProps) {
    const visibleGroups = groups.filter((group) => group.items.length > 0);

    if (visibleGroups.length === 0) {
        return null;
    }

    const renderItemContent = (item: ActionMenuItem) => {
        const tone = item.tone || 'default';

        return (
            <>
                <span className={`flex size-5 shrink-0 items-center justify-center ${iconToneClasses[tone]}`}>
                    {item.icon}
                </span>
                <span className={`min-w-0 whitespace-normal [overflow-wrap:anywhere] ${itemTextClasses[tone]}`}>
                    {item.label}
                </span>
            </>
        );
    };

    return (
        <Menu as="div" className={`relative inline-flex ${className}`}>
            {trigger ? (
                <MenuButton className="focus:outline-none">
                    {trigger}
                </MenuButton>
            ) : buttonLabel ? (
                <MenuButton
                    type="button"
                    aria-label={label}
                    title={label}
                    className={
                        buttonVariant === 'primary'
                            ? 'inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-xl bg-[#0060F4] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#082870] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 active:scale-[0.99]'
                            : 'inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-xl border border-[#DCEAF8] bg-white px-3.5 text-xs font-bold text-[#0B1F63] shadow-xs transition hover:border-[#0060F4] hover:bg-[#F0F8FF] hover:text-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 active:bg-[#E0F0FF] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9] dark:hover:border-[#285585] dark:hover:bg-[#132847] dark:hover:text-[#60A5FA]'
                    }
                >
                    {buttonIcon}
                    <span>{buttonLabel}</span>
                    <ChevronDown className="size-3.5 text-[#52658E] opacity-80 dark:text-[#94A3B8]" />
                </MenuButton>
            ) : (
                <MenuButton
                    type="button"
                    aria-label={label}
                    title={label}
                    className={
                        'inline-flex size-11 touch-manipulation items-center justify-center rounded-xl border border-[#DCEAF8] ' +
                        'bg-white text-[#52658E] shadow-xs transition-colors duration-150 ' +
                        'hover:border-[#B9D9FF] hover:bg-[#F0F8FF] hover:text-[#0060F4] ' +
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 ' +
                        'focus-visible:ring-offset-2 active:bg-[#E0F0FF] dark:border-[#1E3A5F] ' +
                        'dark:bg-[#0C1D36] dark:text-[#B5C8DC] dark:hover:border-[#285585] ' +
                        'dark:hover:bg-[#132847] dark:hover:text-[#60A5FA]'
                    }
                >
                    <EllipsisVertical aria-hidden="true" className="size-5" />
                </MenuButton>
            )}

            <MenuItems
                anchor={{ to: 'bottom end', gap: 8, padding: 12 }}
                portal
                className={
                    'z-50 max-h-96 w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain ' +
                    'rounded-2xl border border-[#DCEAF8] bg-white p-1.5 shadow-lg ' +
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 ' +
                    'dark:border-[#1E3A5F] dark:bg-[#0C1D36]'
                }
            >
                {visibleGroups.map((group, groupIndex) => (
                    <MenuSection key={group.id} className="space-y-0.5">
                        {group.label && (
                            <div className="px-3 pb-1 pt-2 text-[11px] font-bold text-[#52658E] dark:text-[#94A3B8]">
                                {group.label}
                            </div>
                        )}

                        {group.items.map((item) => (
                            <MenuItem key={item.id} disabled={item.disabled}>
                                {({ focus }) => {
                                    const itemClassName =
                                        `flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ` +
                                        `font-semibold transition-colors duration-150 focus-visible:outline-none ` +
                                        `focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0060F4]/35 ` +
                                        `disabled:cursor-not-allowed disabled:opacity-50 ${focus ? 'bg-[#F0F8FF] dark:bg-[#132847]' : ''}`;

                                    if ('href' in item) {
                                        if (item.inertia) {
                                            return (
                                                <Link
                                                    href={item.href}
                                                    aria-label={item.ariaLabel}
                                                    className={itemClassName}
                                                >
                                                    {renderItemContent(item)}
                                                </Link>
                                            );
                                        }

                                        return (
                                            <a
                                                href={item.href}
                                                aria-label={item.ariaLabel}
                                                target={item.target}
                                                rel={item.target === '_blank' ? 'noreferrer' : undefined}
                                                download={item.download}
                                                className={itemClassName}
                                            >
                                                {renderItemContent(item)}
                                            </a>
                                        );
                                    }

                                    return (
                                        <button
                                            type="button"
                                            aria-label={item.ariaLabel}
                                            disabled={item.disabled}
                                            onClick={item.onSelect}
                                            className={itemClassName}
                                        >
                                            {renderItemContent(item)}
                                        </button>
                                    );
                                }}
                            </MenuItem>
                        ))}

                        {groupIndex < visibleGroups.length - 1 && (
                            <MenuSeparator className="my-1.5 border-t border-[#DCEAF8] dark:border-[#1E3A5F]" />
                        )}
                    </MenuSection>
                ))}
            </MenuItems>
        </Menu>
    );
}
