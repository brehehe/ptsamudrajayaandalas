import { CalendarDays } from 'lucide-react';
import { formatDate } from '../../lib/formatDate';

interface RequirementDateProps {
    value?: string | null;
}

export default function RequirementDate({ value }: RequirementDateProps) {
    const formattedDate = formatDate(value, 'Belum ditentukan');

    return (
        <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] leading-5 text-[#52658E] dark:text-[#94A3B8]">
            <CalendarDays
                aria-hidden="true"
                className="size-3.5 shrink-0 text-[#0060F4] dark:text-[#60A5FA]"
            />
            <span>Dibutuhkan:</span>
            {value ? (
                <time
                    dateTime={value}
                    className="font-semibold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]"
                >
                    {formattedDate}
                </time>
            ) : (
                <span className="font-semibold text-[#8C9BB9] dark:text-[#64748B]">
                    {formattedDate}
                </span>
            )}
        </p>
    );
}
