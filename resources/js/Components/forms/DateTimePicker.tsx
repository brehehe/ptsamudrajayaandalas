import { CalendarClock, CalendarDays, Clock3 } from 'lucide-react';
import { useId } from 'react';

export interface DateTimePickerProps {
    id?: string;
    label: string;
    dateValue: string;
    timeValue: string;
    onDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
    dateName?: string;
    timeName?: string;
    dateError?: string;
    timeError?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    minDate?: string;
    maxDate?: string;
    minTime?: string;
    maxTime?: string;
    sizeVariant?: 'sm' | 'md' | 'lg';
    layout?: 'combined' | 'split';
    className?: string;
}

const sizeStyles = {
    sm: 'h-11 rounded-lg px-3 text-base',
    md: 'h-12 rounded-xl px-3.5 text-base',
    lg: 'h-13 rounded-xl px-4 text-base',
};

const getInputClassName = (
    sizeVariant: NonNullable<DateTimePickerProps['sizeVariant']>,
    hasError: boolean,
    disabled: boolean
): string => {
    const stateStyles = hasError
        ? 'border-[#C62840] focus-visible:border-[#C62840] focus-visible:ring-[#C62840]/20 ' +
          'dark:border-[#EF4444] dark:focus-visible:border-[#EF4444] ' +
          'dark:focus-visible:ring-[#EF4444]/20'
        : 'border-[#DCEAF8] hover:border-[#0060F4]/50 focus-visible:border-[#0060F4] ' +
          'focus-visible:ring-[#0060F4]/20 dark:border-[#1E3A5F] ' +
          'dark:hover:border-[#38BDF8]/50 dark:focus-visible:border-[#38BDF8] ' +
          'dark:focus-visible:ring-[#38BDF8]/20';
    const disabledStyles = disabled
        ? 'cursor-not-allowed border-[#DCEAF8] bg-[#F0F8FF]/60 text-[#8C9BB9] ' +
          'dark:border-[#1E3A5F] dark:bg-[#071322]/60 dark:text-[#64748B]'
        : 'bg-white text-[#0B1F63] dark:bg-[#0C1D36] dark:text-[#F1F5F9]';

    return (
        'block min-w-0 w-full border font-normal tabular-nums outline-none transition-colors ' +
        'focus-visible:ring-2 focus-visible:ring-offset-0 disabled:opacity-100 ' +
        'read-only:cursor-default read-only:bg-[#F0F8FF]/60 read-only:text-[#52658E] ' +
        'dark:read-only:bg-[#071322]/60 dark:read-only:text-[#94A3B8] ' +
        '[color-scheme:light] dark:[color-scheme:dark] ' +
        `${sizeStyles[sizeVariant]} ${stateStyles} ${disabledStyles}`
    );
};

const toDateTimeValue = (date: string, time: string): string => {
    if (!date || !time) {
        return '';
    }

    return `${date}T${time.slice(0, 5)}`;
};

const toBoundaryValue = (
    date: string | undefined,
    time: string | undefined,
    fallbackTime: string
): string | undefined => {
    if (!date) {
        return undefined;
    }

    return `${date}T${(time || fallbackTime).slice(0, 5)}`;
};

export default function DateTimePicker({
    id,
    label,
    dateValue,
    timeValue,
    onDateChange,
    onTimeChange,
    dateName,
    timeName,
    dateError,
    timeError,
    error,
    helperText,
    required = false,
    disabled = false,
    readOnly = false,
    minDate,
    maxDate,
    minTime,
    maxTime,
    sizeVariant = 'md',
    layout = 'combined',
    className = '',
}: DateTimePickerProps) {
    const generatedId = useId().replace(/:/g, '');
    const fieldId = id ?? `date-time-${generatedId}`;
    const inputId = `${fieldId}-input`;
    const helperId = `${fieldId}-helper`;
    const errorId = `${fieldId}-error`;
    const errorMessage = error || dateError || timeError;
    const dateTimeValue = toDateTimeValue(dateValue, timeValue);

    const handleChange = (value: string): void => {
        const [nextDate = '', nextTime = ''] = value.split('T');

        onDateChange(nextDate);
        onTimeChange(nextTime.slice(0, 5));
    };

    if (layout === 'split') {
        const dateInputId = `${fieldId}-date`;
        const timeInputId = `${fieldId}-time`;

        return (
            <div className={`min-w-0 space-y-1.5 text-left ${className}`}>
                <div
                    id={`${fieldId}-label`}
                    className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]"
                >
                    {label}
                    {required && (
                        <span aria-hidden="true" className="ml-0.5 text-[#C62840] dark:text-[#F87171]">
                            *
                        </span>
                    )}
                </div>

                <div
                    role="group"
                    aria-labelledby={`${fieldId}-label`}
                    className="grid grid-cols-[minmax(0,3fr)_minmax(112px,2fr)] gap-2"
                >
                    <div className="relative min-w-0">
                        <CalendarDays
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-5 -translate-y-1/2 text-[#0060F4]"
                            strokeWidth={2}
                        />
                        <label htmlFor={dateInputId} className="sr-only">
                            Tanggal {label}
                        </label>
                        <input
                            id={dateInputId}
                            name={dateName ?? `${fieldId}_date`}
                            type="date"
                            autoComplete="off"
                            value={dateValue}
                            onChange={(event) => onDateChange(event.target.value)}
                            required={required}
                            disabled={disabled}
                            readOnly={readOnly}
                            min={minDate}
                            max={maxDate}
                            aria-invalid={Boolean(error || dateError)}
                            aria-describedby={errorMessage ? errorId : helperText ? helperId : undefined}
                            className={`${getInputClassName(sizeVariant, Boolean(error || dateError), disabled)} !pl-11`}
                        />
                    </div>

                    <div className="relative min-w-0">
                        <Clock3
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-5 -translate-y-1/2 text-[#0060F4]"
                            strokeWidth={2}
                        />
                        <label htmlFor={timeInputId} className="sr-only">
                            Waktu {label}
                        </label>
                        <input
                            id={timeInputId}
                            name={timeName ?? `${fieldId}_time`}
                            type="time"
                            autoComplete="off"
                            step={60}
                            value={timeValue}
                            onChange={(event) => onTimeChange(event.target.value)}
                            required={required}
                            disabled={disabled}
                            readOnly={readOnly}
                            min={minTime}
                            max={maxTime}
                            aria-invalid={Boolean(error || timeError)}
                            aria-describedby={errorMessage ? errorId : helperText ? helperId : undefined}
                            className={`${getInputClassName(sizeVariant, Boolean(error || timeError), disabled)} !pl-11`}
                        />
                    </div>
                </div>

                {errorMessage ? (
                    <p
                        id={errorId}
                        role="alert"
                        className="text-[11px] font-semibold text-[#C62840] dark:text-[#F87171]"
                    >
                        {errorMessage}
                    </p>
                ) : helperText ? (
                    <p id={helperId} className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                        {helperText}
                    </p>
                ) : null}
            </div>
        );
    }

    return (
        <fieldset
            className={`min-w-0 space-y-2 text-left ${className}`}
            disabled={disabled}
        >
            <legend
                className={
                    'flex items-center gap-1.5 text-sm font-bold text-[#0060F4] ' +
                    'dark:text-[#38BDF8]'
                }
            >
                <CalendarClock aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
                <span>{label}</span>
                {required && (
                    <span aria-hidden="true" className="text-[#C62840] dark:text-[#F87171]">
                        *
                    </span>
                )}
            </legend>

            <label htmlFor={inputId} className="sr-only">
                {label}
            </label>
            <input
                id={inputId}
                type="datetime-local"
                autoComplete="off"
                step={60}
                value={dateTimeValue}
                onChange={(event) => handleChange(event.target.value)}
                required={required}
                readOnly={readOnly}
                min={toBoundaryValue(minDate, minTime, '00:00')}
                max={toBoundaryValue(maxDate, maxTime, '23:59')}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? errorId : helperText ? helperId : undefined}
                className={getInputClassName(sizeVariant, Boolean(errorMessage), disabled)}
            />

            <input type="hidden" name={dateName ?? `${fieldId}_date`} value={dateValue} />
            <input type="hidden" name={timeName ?? `${fieldId}_time`} value={timeValue} />

            {errorMessage ? (
                <p
                    id={errorId}
                    aria-live="polite"
                    className="text-[11px] font-semibold text-[#C62840] dark:text-[#F87171]"
                >
                    {errorMessage}
                </p>
            ) : helperText ? (
                <p id={helperId} className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                    {helperText}
                </p>
            ) : null}
        </fieldset>
    );
}
