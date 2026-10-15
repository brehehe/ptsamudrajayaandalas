export const REPORT_SECTIONS = [
    {
        key: 'ringkasan_margin',
        label: 'Margin per Job',
        shortLabel: 'Margin',
        routeName: 'reports.margin',
        href: '/reports/margin',
        description: 'Ringkasan tagihan, HPP, dan margin setiap kegiatan kapal.',
    },
    {
        key: 'invoice',
        label: 'Invoice',
        shortLabel: 'Invoice',
        routeName: 'reports.invoices',
        href: '/reports/invoices',
        description: 'Nilai, status, dan pembayaran invoice klien.',
    },
    {
        key: 'piutang',
        label: 'Piutang',
        shortLabel: 'Piutang',
        routeName: 'reports.receivables',
        href: '/reports/receivables',
        description: 'Saldo piutang, umur tagihan, dan tingkat kolektibilitas.',
    },
    {
        key: 'pengeluaran',
        label: 'Pengeluaran',
        shortLabel: 'Keluar',
        routeName: 'reports.expenses',
        href: '/reports/expenses',
        description: 'Realisasi pengeluaran dan status verifikasi pembayaran.',
    },
    {
        key: 'aktivitas',
        label: 'Aktivitas',
        shortLabel: 'Aktivitas',
        routeName: 'reports.activities',
        href: '/reports/activities',
        description: 'Aktivitas lapangan, laporan harian, dan kendala operasional.',
    },
    {
        key: 'laba_rugi',
        label: 'Laba Rugi',
        shortLabel: 'Laba Rugi',
        routeName: 'reports.profit-loss',
        href: '/reports/profit-loss',
        description: 'Pendapatan, HPP, beban operasional, dan laba bersih perusahaan.',
    },
    {
        key: 'keuangan_kas',
        label: 'Arus Kas',
        shortLabel: 'Kas',
        routeName: 'reports.cash-flow',
        href: '/reports/cash-flow',
        description: 'Arus kas masuk, kas keluar, dan posisi keuangan berjalan.',
    },
    {
        key: 'operasional',
        label: 'Operasional',
        shortLabel: 'Operasi',
        routeName: 'reports.operations',
        href: '/reports/operations',
        description: 'Kinerja kunjungan kapal dan produktivitas operasional.',
    },
] as const;

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number]['key'];

export const reportSectionByKey = (key: ReportSectionKey) =>
    REPORT_SECTIONS.find((section) => section.key === key) ?? REPORT_SECTIONS[0];
