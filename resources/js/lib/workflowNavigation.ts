export interface WorkflowNextAction {
    label: string;
    href: string;
}

const includesAny = (value: string, terms: string[]): boolean =>
    terms.some((term) => value.includes(term));

export const resolveWorkflowNextAction = (
    currentUrl: string,
    role: string | undefined,
    message: string,
): WorkflowNextAction => {
    const path = currentUrl.split('?')[0].replace(/\/$/, '') || '/';
    const normalizedRole = (role ?? '').toLowerCase();
    const normalizedMessage = message.toLowerCase();
    const isFieldRole = includesAny(normalizedRole, ['lapangan', 'operasional', 'staff']);
    const isDirector = normalizedRole.includes('direktur');

    if (path.startsWith('/work-orders')) {
        return { label: 'Lanjut ke Kapal', href: '/vessels' };
    }

    if (path.startsWith('/vessels')) {
        return { label: 'Lanjut ke Aktivitas', href: '/operations' };
    }

    if (path.startsWith('/operations')) {
        if (includesAny(normalizedMessage, ['aktivitas', 'laporan harian'])) {
            return { label: 'Lihat Riwayat Aktivitas', href: '/operations?tab=aktivitas' };
        }

        if (!isFieldRole && includesAny(normalizedMessage, ['selesai', 'berangkat', 'departed'])) {
            return { label: 'Lanjut ke Nota Rampung', href: '/completion-notes' };
        }

        return isFieldRole
            ? { label: 'Lanjut ke Kebutuhan', href: '/needs' }
            : { label: 'Pantau Operasional', href: '/operations' };
    }

    if (path.startsWith('/needs')) {
        return { label: 'Lanjut ke Pengajuan', href: '/requests' };
    }

    if (path.startsWith('/requests')) {
        if (includesAny(normalizedMessage, ['draft invoice', 'tipe invoice', 'baris clearance'])) {
            return { label: 'Lanjut ke Invoice Klien', href: '/invoices' };
        }

        return isDirector
            ? { label: 'Buka Antrean Approval', href: '/approvals?tab=menunggu' }
            : { label: 'Pantau Pengajuan', href: '/requests' };
    }

    if (path.startsWith('/approvals')) {
        return { label: 'Buka Antrean Berikutnya', href: '/approvals?tab=menunggu' };
    }

    if (path.startsWith('/vendor-invoices')) {
        if (includesAny(normalizedMessage, ['pembayaran', 'dibayar'])) {
            return { label: 'Lihat di Pengeluaran', href: '/expenses' };
        }

        if (normalizedMessage.includes('verifikasi')) {
            return { label: 'Bayar Invoice Vendor', href: '/vendor-invoices' };
        }

        return { label: 'Tinjau Invoice Vendor', href: '/vendor-invoices' };
    }

    if (path.startsWith('/funding')) {
        return { label: 'Lanjut ke Invoice Vendor', href: '/vendor-invoices' };
    }

    if (path.startsWith('/expenses')) {
        return includesAny(normalizedMessage, ['pembayaran', 'invoice'])
            ? { label: 'Lihat Invoice Vendor', href: '/vendor-invoices' }
            : { label: 'Pantau Pengeluaran', href: '/expenses' };
    }

    if (path.startsWith('/completion-notes')) {
        return { label: 'Lanjut ke Invoice Klien', href: '/invoices' };
    }

    if (path.startsWith('/invoices')) {
        return { label: 'Lanjut ke Piutang', href: '/receivables' };
    }

    if (path.startsWith('/receivables')) {
        return { label: 'Lihat Laporan Piutang', href: '/reports/receivables' };
    }

    return { label: 'Kembali ke Beranda', href: '/dashboard' };
};
