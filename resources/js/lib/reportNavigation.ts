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
        key: 'pengajuan',
        label: 'Pengajuan',
        shortLabel: 'Pengajuan',
        routeName: 'reports.requests',
        href: '/reports/requests',
        description: 'Daftar pengajuan kebutuhan beserta laporan PDF yang siap dicetak.',
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
        key: 'pengeluaran_kapal',
        label: 'Pengeluaran Kapal',
        shortLabel: 'Kapal Harian',
        routeName: 'reports.vessel-daily-expenses',
        href: '/reports/vessel-daily-expenses',
        description: 'Monitoring pengeluaran per kapal dan per item setiap hari (dari awal sandar s/d keluar) untuk Pak Rian & Admin.',
    },
    {
        key: 'aktivitas',
        label: 'Aktivitas',
        shortLabel: 'Aktivitas',
        routeName: 'reports.activities',
        href: '/reports/activities',
        description: 'Aktivitas lapangan, laporan harian, dan kendala operasional.',
    },
] as const;

export const EXTRA_REPORT_SECTIONS = [
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

export const ALL_REPORT_SECTIONS = [...REPORT_SECTIONS, ...EXTRA_REPORT_SECTIONS] as const;

export type ReportSectionKey = (typeof ALL_REPORT_SECTIONS)[number]['key'];

export const reportSectionByKey = (key: string) =>
    ALL_REPORT_SECTIONS.find((section) => section.key === key) ?? REPORT_SECTIONS[0];
