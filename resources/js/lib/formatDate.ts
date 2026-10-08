const LOCALE = 'id-ID';
const TIME_ZONE = 'Asia/Jakarta';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const toDateInputValue = (dayOffset = 0): string => {
    const target = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(target);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${values.year}-${values.month}-${values.day}`;
};

const toDate = (value?: string | Date | null): Date | null => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const normalizedValue = DATE_ONLY_PATTERN.test(value)
        ? `${value}T00:00:00+07:00`
        : value;
    const parsedDate = new Date(normalizedValue);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatDate = (value?: string | Date | null, fallback = '—'): string => {
    const date = toDate(value);

    if (!date) {
        return fallback;
    }

    return new Intl.DateTimeFormat(LOCALE, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: TIME_ZONE,
    }).format(date);
};

export const formatDateTime = (value?: string | Date | null, fallback = '—'): string => {
    const date = toDate(value);

    if (!date) {
        return fallback;
    }

    return new Intl.DateTimeFormat(LOCALE, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: TIME_ZONE,
    }).format(date);
};
