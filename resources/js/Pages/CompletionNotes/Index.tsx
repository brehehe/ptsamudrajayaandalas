import React, { useMemo, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, ChevronRight, FileCheck2, FileText, Plus, Search } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import MobilePageHero from '../../Components/navigation/MobilePageHero';
import FilterBar from '../../Components/filters/FilterBar';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import Modal from '../../Components/overlays/Modal';
import Input from '../../Components/forms/Input';
import MoneyInput from '../../Components/forms/MoneyInput';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import Select from '../../Components/selects/Select';
import Pagination from '../../Components/pagination/Pagination';
import DocumentActions from '../../Components/ui/DocumentActions';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Textarea from '../../Components/forms/Textarea';

interface PortCall {
    id: string;
    job_number?: string;
    departed_at: string;
    completion_note_due_at?: string | null;
    approved_request_item_count?: number;
    approved_cost_total?: number;
    recorded_cost_total?: number;
    ship?: { name: string };
    port?: { name: string };
}

interface CompletionNote {
    id: string;
    document_number: string;
    issued_at: string;
    uploaded_at: string;
    due_at?: string | null;
    actual_amount: number;
    status: string;
    port_call?: PortCall;
    uploader?: { name: string };
    verifier?: { name: string };
    reconciliation?: { initial_total: number; actual_total: number; variance: number; adjustment: number } | null;
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
    waitingPortCalls: PortCall[];
    filters: { search: string; status: string };
    abilities: { create: boolean; manage: boolean };
}

const money = (value: number | string) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value || 0));

const formatDate = (value?: string | null) => value
    ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';

const labels: Record<string, string> = {
    uploaded: 'Sudah Diunggah', verified: 'Terverifikasi', reconciled: 'Rekonsiliasi Selesai',
};

const statusFilters = [
    { value: 'all', label: 'Semua' }, { value: 'waiting', label: 'Menunggu' },
    { value: 'overdue', label: 'Terlambat' }, { value: 'uploaded', label: 'Diunggah' },
    { value: 'verified', label: 'Terverifikasi' }, { value: 'reconciled', label: 'Selesai' },
];

export default function CompletionNotesIndex({ notes, waitingPortCalls, filters, abilities }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [createOpen, setCreateOpen] = useState(false);
    const [activeNote, setActiveNote] = useState<CompletionNote | null>(null);
    const [detailNote, setDetailNote] = useState<CompletionNote | null>(null);
    const [action, setAction] = useState<'verify' | 'reconcile'>('verify');
    const createForm = useForm({ port_call_id: '', document_number: '', issued_at: '', downloaded_at: '', actual_amount: '', notes: '', document: null as File | null });
    const actionForm = useForm({ action: 'verify', initial_total: '', actual_total: '', adjustment: '0', notes: '' });
    const selectedPortCall = useMemo(
        () => waitingPortCalls.find((portCall) => portCall.id === createForm.data.port_call_id),
        [waitingPortCalls, createForm.data.port_call_id],
    );

    const filter = (status = filters.status) => router.get('/completion-notes', { search, status }, { preserveState: true, preserveScroll: true });
    const submitCreate = (event: React.FormEvent) => {
        event.preventDefault();
        createForm.post('/completion-notes', { forceFormData: true, onSuccess: () => { setCreateOpen(false); createForm.reset(); } });
    };
    const openAction = (note: CompletionNote, nextAction: 'verify' | 'reconcile') => {
        setDetailNote(null);
        setActiveNote(note);
        setAction(nextAction);
        actionForm.setData({
            action: nextAction,
            initial_total: String(note.port_call?.approved_cost_total || 0),
            actual_total: String(note.port_call?.recorded_cost_total || note.actual_amount),
            adjustment: '0',
            notes: '',
        });
    };
    const submitAction = (event: React.FormEvent) => {
        event.preventDefault();
        if (!activeNote) return;
        actionForm.post(`/completion-notes/${activeNote.id}/transition`, { preserveScroll: true, onSuccess: () => setActiveNote(null) });
    };

    return (
        <AppLayout title="Nota Rampung" transparentMobileHeader noPaddingMobile mobileBackground="surface">
            <Head title="Nota Rampung — PT Samudra Jaya Andalas" />
            <MobilePageHero title="Nota Rampung" description="Pantau dokumen Pelindo dan selesaikan rekonsiliasi biaya." />

            <div className="relative z-10 -mt-7 min-h-[calc(100dvh-9rem)] rounded-t-[28px] bg-white px-4 pb-12 pt-5 dark:bg-[#071322] md:mx-auto md:mt-0 md:max-w-7xl md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <div className="hidden items-end justify-between gap-4 md:flex">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0060F4]">Pelindo & Rekonsiliasi</p>
                        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#0B1F63] dark:text-[#F1F5F9]">Nota Rampung</h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#52658E] dark:text-[#94A3B8]">Pantau dokumen setelah kapal berangkat, unggah hasil dari Pelindo, lalu rekonsiliasi nilai awal dan aktual.</p>
                    </div>
                    {abilities.create && waitingPortCalls.length > 0 && <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus aria-hidden="true" className="size-4" />}>Unggah Nota</Button>}
                </div>

                {abilities.create && waitingPortCalls.length > 0 && <Button className="mb-4 min-h-11 w-full justify-center font-bold md:hidden" onClick={() => setCreateOpen(true)} leftIcon={<Plus aria-hidden="true" className="size-4" />}>Unggah Nota Rampung</Button>}

                <div className="space-y-4 md:mt-5 md:space-y-5">
                    <div className="md:hidden">
                        <FilterBar
                            searchValue={search}
                            onSearchChange={setSearch}
                            onSearchSubmit={() => filter()}
                            searchPlaceholder="Cari nomor nota atau kapal…"
                            searchAriaLabel="Cari Nota Rampung"
                            chips={statusFilters.map((item) => ({ id: item.value, label: item.label }))}
                            activeChipId={filters.status}
                            onChipChange={filter}
                            filterCountBadge={filters.status === 'all' ? 0 : 1}
                            filterTitle="Pilih status Nota Rampung"
                            filterControls={(
                                <Select
                                    aria-label="Filter status Nota Rampung"
                                    value={filters.status}
                                    onChange={(event) => filter(event.target.value)}
                                    options={statusFilters.map((item) => ({
                                        value: item.value,
                                        label: item.value === 'all' ? 'Semua status' : item.label,
                                    }))}
                                />
                            )}
                            className="!border-0 !bg-transparent !p-0 !shadow-none dark:!bg-transparent"
                        />
                    </div>

                    <div className="hidden rounded-2xl border border-[#DCEAF8] bg-white p-4 dark:border-[#1E3A5F] dark:bg-[#0C1D36] md:block">
                        <form onSubmit={(event) => { event.preventDefault(); filter(); }} className="flex gap-3">
                            <Input name="search" autoComplete="off" aria-label="Cari Nota Rampung" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor nota atau kapal…" leftIcon={<Search aria-hidden="true" className="size-4" />} />
                            <Select aria-label="Filter status Nota Rampung" value={filters.status} onChange={(event) => filter(event.target.value)} className="w-56" options={statusFilters.map((item) => ({ value: item.value, label: item.value === 'all' ? 'Semua status' : item.label }))} />
                            <Button type="submit" variant="outline">Cari</Button>
                        </form>
                    </div>

                    {waitingPortCalls.length > 0 && (
                        <Card padding="md" className="border-[#F4C867] bg-[#FFF9E8] dark:border-[#6B4E16] dark:bg-[#3B2B0B]/30">
                            <div className="flex items-start gap-3">
                                <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#A65300]" />
                                <div><h2 className="font-bold text-[#713A00] dark:text-[#FBBF24]">{waitingPortCalls.length} kunjungan menunggu Nota Rampung</h2><p className="mt-1 text-sm text-[#8A520D] dark:text-[#FDE68A]">Tanggal target dicatat saat Clearance Out. Dokumen baru dianggap tersedia setelah benar-benar diunggah.</p></div>
                            </div>
                        </Card>
                    )}

                    {notes.data.length === 0 ? (
                        <Card padding="lg" className="text-center">
                            <FileText aria-hidden="true" className="mx-auto size-9 text-[#8C9BB9]" />
                            <h2 className="mt-3 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Belum ada Nota Rampung</h2>
                            <p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">Ubah filter atau unggah dokumen Pelindo yang sudah tersedia.</p>
                            {abilities.create && waitingPortCalls.length > 0 && <Button className="mt-4" onClick={() => setCreateOpen(true)} leftIcon={<Plus aria-hidden="true" className="size-4" />}>Unggah Nota</Button>}
                        </Card>
                    ) : (
                        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                            {notes.data.map((note) => {
                                const overdue = Boolean(note.due_at && new Date(note.due_at) < new Date() && note.status !== 'reconciled');
                                return (
                                    <Card key={note.id} padding="md" className="overflow-hidden">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0"><p className="truncate font-mono text-sm font-bold text-[#0060F4]" translate="no">{note.document_number}</p><h2 className="mt-1 truncate text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">{note.port_call?.ship?.name || 'Kapal'}</h2><p className="mt-1 truncate text-xs text-[#52658E] dark:text-[#94A3B8]">{note.port_call?.job_number || '-'} · {note.port_call?.port?.name || '-'}</p></div>
                                            <ChevronRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#8C9BB9] md:hidden" />
                                            <div className="hidden flex-wrap justify-end gap-1.5 md:flex"><StatusBadge status={note.status} label={labels[note.status] || note.status} showDot />{overdue && <StatusBadge status="danger" label="Melewati target" />}</div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-1.5 md:hidden"><StatusBadge status={note.status} label={labels[note.status] || note.status} showDot />{overdue && <StatusBadge status="danger" label="Melewati target" />}</div>
                                        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F0F8FF]/70 p-3 dark:bg-[#071322]/60">
                                            <div><dt className="text-[11px] text-[#52658E]">Nilai nota</dt><dd className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(note.actual_amount)}</dd></div>
                                            <div><dt className="text-[11px] text-[#52658E]">Tanggal terbit</dt><dd className="mt-0.5 text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(note.issued_at)}</dd></div>
                                            {note.reconciliation && <><div className="hidden md:block"><dt className="text-[11px] text-[#52658E]">Nilai aktual</dt><dd className="mt-0.5 text-sm font-bold tabular-nums">{money(note.reconciliation.actual_total)}</dd></div><div className="hidden md:block"><dt className="text-[11px] text-[#52658E]">Selisih</dt><dd className={`mt-0.5 text-sm font-bold tabular-nums ${Number(note.reconciliation.variance) > 0 ? 'text-[#C62840]' : 'text-[#087443]'}`}>{money(note.reconciliation.variance)}</dd></div></>}
                                        </dl>
                                        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#DCEAF8] pt-3 dark:border-[#1E3A5F]">
                                            <Button size="sm" variant="outline" onClick={() => setDetailNote(note)} rightIcon={<ChevronRight aria-hidden="true" className="size-4" />}>Detail</Button>
                                            <DocumentActions
                                                viewHref={`/completion-notes/${note.id}/document?view=1`}
                                                downloadHref={`/completion-notes/${note.id}/document`}
                                                viewLabel="Lihat Dokumen"
                                            />
                                            {abilities.manage && note.status === 'uploaded' && <Button size="sm" onClick={() => openAction(note, 'verify')} leftIcon={<FileCheck2 aria-hidden="true" className="size-4" />}>Verifikasi</Button>}
                                            {abilities.manage && note.status === 'verified' && <Button size="sm" onClick={() => openAction(note, 'reconcile')}>Rekonsiliasi</Button>}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                    <Pagination links={notes.links} currentPage={notes.current_page} lastPage={notes.last_page} total={notes.total} from={notes.from ?? undefined} to={notes.to ?? undefined} />
                </div>
            </div>

            {detailNote && (
                <Modal
                    isOpen
                    onClose={() => setDetailNote(null)}
                    title={`Detail ${detailNote.document_number}`}
                    subtitle="Ringkasan dokumen Pelindo dan hasil rekonsiliasi."
                    size="lg"
                    asBottomSheetOnMobile
                    footer={(
                        <>
                            <Button variant="secondary" onClick={() => setDetailNote(null)}>Tutup</Button>
                            <DocumentActions
                                viewHref={`/completion-notes/${detailNote.id}/document?view=1`}
                                downloadHref={`/completion-notes/${detailNote.id}/document`}
                                viewLabel="Lihat Dokumen"
                            />
                        </>
                    )}
                >
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-[#DCEAF8] bg-[#F0F8FF] p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-mono text-sm font-bold text-[#0060F4]" translate="no">{detailNote.document_number}</p><h2 className="mt-1 text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">{detailNote.port_call?.ship?.name || 'Kapal'}</h2><p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">{detailNote.port_call?.job_number || '-'} · {detailNote.port_call?.port?.name || '-'}</p></div><StatusBadge status={detailNote.status} label={labels[detailNote.status] || detailNote.status} showDot /></div>
                        </div>
                        <dl className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]"><dt className="text-[11px] text-[#52658E]">Nilai nota</dt><dd className="mt-1 text-sm font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(detailNote.actual_amount)}</dd></div>
                            <div className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]"><dt className="text-[11px] text-[#52658E]">Tanggal terbit</dt><dd className="mt-1 text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(detailNote.issued_at)}</dd></div>
                            <div className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]"><dt className="text-[11px] text-[#52658E]">Diunggah oleh</dt><dd className="mt-1 truncate text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{detailNote.uploader?.name || '-'}</dd></div>
                            <div className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]"><dt className="text-[11px] text-[#52658E]">Diverifikasi oleh</dt><dd className="mt-1 truncate text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{detailNote.verifier?.name || 'Belum diverifikasi'}</dd></div>
                        </dl>
                        {detailNote.reconciliation && <section aria-labelledby="reconciliation-title"><h3 id="reconciliation-title" className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Hasil rekonsiliasi</h3><dl className="mt-2 divide-y divide-[#DCEAF8] rounded-xl border border-[#DCEAF8] px-3 dark:divide-[#1E3A5F] dark:border-[#1E3A5F]"><div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-[#52658E]">Nilai awal</dt><dd className="font-bold tabular-nums">{money(detailNote.reconciliation.initial_total)}</dd></div><div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-[#52658E]">Nilai aktual</dt><dd className="font-bold tabular-nums">{money(detailNote.reconciliation.actual_total)}</dd></div><div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-[#52658E]">Penyesuaian</dt><dd className="font-bold tabular-nums">{money(detailNote.reconciliation.adjustment)}</dd></div><div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-[#52658E]">Selisih</dt><dd className={`font-bold tabular-nums ${Number(detailNote.reconciliation.variance) > 0 ? 'text-[#C62840]' : 'text-[#087443]'}`}>{money(detailNote.reconciliation.variance)}</dd></div></dl></section>}
                    </div>
                </Modal>
            )}

            <Modal
                isOpen={createOpen}
                onClose={() => { createForm.clearErrors(); setCreateOpen(false); }}
                title="Unggah Nota Rampung"
                subtitle="Pilih kunjungan kapal yang sudah berangkat."
                size="lg"
                asBottomSheetOnMobile
                footer={(
                    <>
                        <Button type="button" variant="secondary" onClick={() => { createForm.clearErrors(); setCreateOpen(false); }}>Batal</Button>
                        <Button type="submit" form="completion-note-create-form" isLoading={createForm.processing}>Unggah Nota</Button>
                    </>
                )}
            >
                <form id="completion-note-create-form" noValidate onSubmit={submitCreate} className="space-y-4">
                    <FormErrorSummary errors={createForm.errors} />
                    <Select required label="Kunjungan / Job" value={createForm.data.port_call_id} onChange={(event) => createForm.setData('port_call_id', event.target.value)} placeholder="Pilih kapal" options={waitingPortCalls.map((call) => ({ value: call.id, label: `${call.job_number || '-'} · ${call.ship?.name || '-'}` }))} error={createForm.errors.port_call_id} />
                    {selectedPortCall && (
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] p-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <div><p className="text-[11px] text-[#52658E]">Item disetujui</p><p className="mt-0.5 text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedPortCall.approved_request_item_count || 0} item</p></div>
                            <div><p className="text-[11px] text-[#52658E]">HPP awal</p><p className="mt-0.5 text-sm font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(selectedPortCall.approved_cost_total || 0)}</p></div>
                        </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2"><Input required label="Nomor Nota Rampung" name="document_number" autoComplete="off" value={createForm.data.document_number} onChange={(event) => createForm.setData('document_number', event.target.value)} error={createForm.errors.document_number} /><Input required label="Tanggal terbit" type="date" name="issued_at" value={createForm.data.issued_at} onChange={(event) => createForm.setData('issued_at', event.target.value)} error={createForm.errors.issued_at} /><Input label="Tanggal diunduh" type="date" name="downloaded_at" value={createForm.data.downloaded_at} onChange={(event) => createForm.setData('downloaded_at', event.target.value)} error={createForm.errors.downloaded_at} /><MoneyInput required label="Nilai biaya" name="actual_amount" value={createForm.data.actual_amount} onChange={(value) => createForm.setData('actual_amount', value)} error={createForm.errors.actual_amount} /><div className="sm:col-span-2"><PhotoUploadPicker required label="Dokumen Nota Rampung" value={createForm.data.document} onChange={(file) => createForm.setData('document', file)} mode="gallery" accept=".doc,.docx,.pdf,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={createForm.errors.document} helperText="Word, PDF, JPG, JPEG, atau PNG. Maksimal 10 MB." /></div></div>
                    <Textarea id="completion-note-notes" name="notes" autoComplete="off" label="Catatan" value={createForm.data.notes} onChange={(event) => createForm.setData('notes', event.target.value)} error={createForm.errors.notes} rows={3} maxLength={2000} showCharCount />
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(activeNote)}
                onClose={() => { actionForm.clearErrors(); setActiveNote(null); }}
                title={action === 'verify' ? 'Verifikasi Nota Rampung' : 'Rekonsiliasi Biaya'}
                subtitle="Nilai awal diambil otomatis dari item pengajuan yang disetujui."
                size="lg"
                asBottomSheetOnMobile
                footer={(
                    <>
                        <Button type="button" variant="secondary" onClick={() => setActiveNote(null)}>Batal</Button>
                        <Button type="submit" form="completion-note-action-form" isLoading={actionForm.processing}>
                            {action === 'verify' ? 'Verifikasi' : 'Simpan Rekonsiliasi'}
                        </Button>
                    </>
                )}
            >
                <form id="completion-note-action-form" noValidate onSubmit={submitAction} className="space-y-4">
                    <FormErrorSummary errors={actionForm.errors} />
                    {action === 'reconcile' && <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] px-3 py-2.5 dark:border-[#1E3A5F] dark:bg-[#071322]"><p className="text-[11px] font-semibold text-[#52658E]">Total nilai awal</p><p className="mt-1 text-sm font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(actionForm.data.initial_total)}</p><p className="mt-1 text-[10px] text-[#52658E]">Dari HPP item yang disetujui Direktur</p></div><MoneyInput required label="Total aktual/final" name="actual_total" value={actionForm.data.actual_total} onChange={(value) => actionForm.setData('actual_total', value)} error={actionForm.errors.actual_total} /><MoneyInput label="Penyesuaian" name="adjustment" value={actionForm.data.adjustment} onChange={(value) => actionForm.setData('adjustment', value)} error={actionForm.errors.adjustment} allowNegative /></div>}
                    <Textarea id="completion-action-notes" name="notes" autoComplete="off" label="Catatan" value={actionForm.data.notes} onChange={(event) => actionForm.setData('notes', event.target.value)} error={actionForm.errors.notes} rows={3} maxLength={2000} showCharCount />
                </form>
            </Modal>
        </AppLayout>
    );
}
