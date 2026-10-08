import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { FilePlus2, Search } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import DocumentActions from '../../Components/ui/DocumentActions';
import Input from '../../Components/forms/Input';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import Pagination from '../../Components/pagination/Pagination';
import Select from '../../Components/selects/Select';
import StatusBadge from '../../Components/ui/StatusBadge';
import { ResponsiveTable, type Column } from '../../Components/tables/Table';
import { formatDate } from '../../lib/formatDate';

interface CompletionNote {
    id: string;
    document_number: string;
    issued_at: string;
    uploaded_at: string;
    document_path: string;
    status: string;
    uploader?: { name: string } | null;
    port_call?: {
        job_number: string;
        ship?: { name: string } | null;
        port?: { name: string } | null;
        work_order?: { company?: { name: string } | null } | null;
    } | null;
}

interface Paginated<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    notes: Paginated<CompletionNote>;
    filters: { search: string; status: string };
    abilities: { create: boolean };
}

const statusLabel: Record<string, string> = {
    uploaded: 'Sudah Diunggah',
    verified: 'Terverifikasi',
    reconciled: 'Selesai',
};

export default function CompletionNotesIndex({ notes, filters, abilities }: Props) {
    const [search, setSearch] = useState(filters.search);
    const applyFilters = (status = filters.status) => router.get('/completion-notes', { search, status }, {
        preserveState: true,
        preserveScroll: true,
    });

    const actions = (note: CompletionNote) => (
        <DocumentActions
            viewHref={`/completion-notes/${note.id}/document?view=1`}
            downloadHref={`/completion-notes/${note.id}/document`}
            viewLabel="Lihat nota"
            downloadLabel="Unduh nota"
        />
    );
    const columns: Column<CompletionNote>[] = [
        { key: 'document', header: 'Nota Rampung', wrap: 'normal', render: (note) => <div><p className="font-mono font-bold text-[#0060F4]" translate="no">{note.document_number}</p><p className="text-[11px] text-[#52658E]">{formatDate(note.uploaded_at)}</p></div> },
        { key: 'job', header: 'Job / Kapal', wrap: 'normal', render: (note) => <div><p className="font-semibold" translate="no">{note.port_call?.job_number || '—'}</p><p className="text-[11px] text-[#52658E]">{note.port_call?.ship?.name || 'Kapal tidak tersedia'}</p></div> },
        { key: 'company', header: 'Perusahaan', wrap: 'normal', render: (note) => note.port_call?.work_order?.company?.name || '—' },
        { key: 'port', header: 'Pelabuhan', wrap: 'normal', render: (note) => note.port_call?.port?.name || '—' },
        { key: 'status', header: 'Status', render: (note) => <StatusBadge status={note.status === 'uploaded' ? 'Aktif' : 'Selesai'} label={statusLabel[note.status] || note.status} showDot /> },
        { key: 'actions', header: 'Aksi', align: 'right', render: actions },
    ];

    return (
        <AppLayout title="Nota Rampung" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Nota Rampung — PT Samudra Jaya Andalas" />
            <MobilePageHero title="Nota Rampung" description="Arsipkan bukti Nota Rampung pada Job kapal yang sesuai." />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-12 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <div className="hidden items-end justify-between gap-4 border-b border-[#DCEAF8] pb-4 md:flex dark:border-[#1E3A5F]">
                    <div>
                        <h1 className="text-balance text-3xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Nota Rampung</h1>
                        <p className="mt-1 text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">Pilih Job lalu unggah dokumen final tanpa proses rekonsiliasi tambahan.</p>
                    </div>
                    {abilities.create && <Link href="/completion-notes/create" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35"><FilePlus2 aria-hidden="true" className="size-4" />Unggah Nota Rampung</Link>}
                </div>

                <Card padding="md">
                    <form onSubmit={(event) => { event.preventDefault(); applyFilters(); }} className="flex flex-col gap-3 sm:flex-row">
                        <Input name="search" autoComplete="off" aria-label="Cari Nota Rampung" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor nota atau kapal…" leftIcon={<Search aria-hidden="true" className="size-4" />} />
                        <Select
                            aria-label="Filter status Nota Rampung"
                            value={filters.status}
                            onChange={(event) => applyFilters(event.target.value)}
                            className="sm:w-56"
                            options={[
                                { value: 'all', label: 'Semua status' },
                                { value: 'uploaded', label: 'Sudah diunggah' },
                                { value: 'verified', label: 'Terverifikasi (lama)' },
                                { value: 'reconciled', label: 'Selesai (lama)' },
                            ]}
                        />
                        <Button type="submit" variant="outline">Cari</Button>
                    </form>
                </Card>

                {abilities.create && <Link href="/completion-notes/create" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]/35 md:hidden"><FilePlus2 aria-hidden="true" className="size-4" />Unggah Nota Rampung</Link>}

                <ResponsiveTable
                    data={notes.data}
                    keyExtractor={(note) => note.id}
                    desktop={{ columns, compact: true, minWidth: '900px' }}
                    mobile={{
                        titleRender: (note) => note.document_number,
                        subtitleRender: (note) => note.port_call?.ship?.name || 'Kapal tidak tersedia',
                        statusRender: (note) => <StatusBadge status={note.status === 'uploaded' ? 'Aktif' : 'Selesai'} label={statusLabel[note.status] || note.status} />,
                        fields: [
                            { label: 'Job', render: (note) => note.port_call?.job_number || '—' },
                            { label: 'Perusahaan', render: (note) => note.port_call?.work_order?.company?.name || '—' },
                            { label: 'Diunggah', render: (note) => formatDate(note.uploaded_at) },
                        ],
                        actionsRender: actions,
                    }}
                />
                <Pagination links={notes.links} currentPage={notes.current_page} lastPage={notes.last_page} total={notes.total} from={notes.from ?? undefined} to={notes.to ?? undefined} />
            </div>
        </AppLayout>
    );
}
