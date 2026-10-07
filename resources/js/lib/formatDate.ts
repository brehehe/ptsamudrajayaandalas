const LOCALE = 'id-ID';
const TIME_ZONE = 'Asia/Jakarta';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
