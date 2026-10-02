const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const formatEtaDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return '12 Jan 2026 14:00';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const day = d.getDate().toString().padStart(2, '0');
        const month = MONTHS_ID[d.getMonth()] || 'Jan';
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');

        return `${day} ${month} ${year} • ${hours}:${minutes}`;
    } catch {
        return dateStr;
    }
};

