import React, { useMemo, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ChevronRight, CircleCheckBig, FileCheck2, Landmark, Plus, Search, WalletCards } from 'lucide-react';
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
import Checkbox from '../../Components/forms/Checkbox';
import DocumentActions from '../../Components/ui/DocumentActions';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import Textarea from '../../Components/forms/Textarea';
import { formatDate } from '../../lib/formatDate';
import type { PageProps } from '../../types';

interface OptionItem { id: string | number; name: string }
interface Payment { id: string; amount: number; recipient: string; reference_number: string; payment_destination?: string; verification_status: string; proof_path?: string | null; usage_proof_path?: string | null; beneficiary?: { id: number; name: string }; recorder?: { name: string }; actual_amount?: number | null; remaining_amount?: number | null }
interface FundingRequest { id: string; kopra_reference?: string | null; requested_amount: number; approved_amount?: number | null; status: string; receipts: Array<{ id: string; amount: number; received_date: string; reference_number: string; proof_path?: string | null }>; payments: Payment[] }
interface FundingCostDocument { id: string; document_number?: string | null; document_type: string; document_path?: string | null; verified_total?: number | string; paid_amount?: number | string; payment_status?: string; vendor?: { name: string } }
interface ExpenseLine { description: string; amount: number; cost_document_item?: { cost_document?: FundingCostDocument } }
interface ExpenseRequest { id: string; request_number: string; status: string; total: number; currency: string; notes?: string | null; creator?: { id: number; name: string }; port_call?: { job_number?: string | null; ship?: { name: string }; port?: { name: string } }; items: ExpenseLine[]; funding_request?: FundingRequest | null }
interface OperationalItemOption { id: string; item_name: string; quantity: number | string; unit?: string | null; hpp_price: number | string; request?: { request_number: string; port_call_id: string; port_call?: { job_number?: string | null; ship?: { name: string }; port?: { name: string } } } }
interface Paginated<T> { data: T[]; links: Array<{ url: string | null; label: string; active: boolean }>; current_page: number; last_page: number; from: number | null; to: number | null; total: number }
interface Props { expenseRequests: Paginated<ExpenseRequest>; portCalls: Array<{ id: string; job_number?: string | null; ship?: { name: string }; port?: { name: string } }>; availableOperationalItems: OperationalItemOption[]; operationalUsers: OptionItem[]; filters: { search: string; status: string }; abilities: { create: boolean; adminReview: boolean; directorApprove: boolean; manageFunding: boolean } }

const labels: Record<string, string> = {
    waiting_admin_review: 'Menunggu Pemeriksaan Admin', waiting_director: 'Menunggu Approval Direktur',
    revision: 'Perlu Revisi', rejected: 'Ditolak', approved_director: 'Disetujui Direktur',
    kopra_submitted: 'Menunggu Approval Kopra', kopra_approved: 'Disetujui di Kopra', kopra_rejected: 'Ditolak di Kopra',
    funds_received_partial: 'Dana Cair Sebagian', funds_received: 'Dana Cair', payment_in_progress: 'Pembayaran Dicatat',
    waiting_usage_proof: 'Menunggu Bukti Penggunaan', completed: 'Selesai',
    pending: 'Menunggu Verifikasi Admin', waiting_admin_verification: 'Menunggu Verifikasi Admin', verified: 'Terverifikasi',
};
const fundingQuickFilters = [
    { value: 'all', label: 'Semua' },
    { value: 'waiting_admin_review', label: 'Review Admin' },
    { value: 'waiting_director', label: 'Approval Direktur' },
    { value: 'approved_director', label: 'Disetujui' },
    { value: 'kopra_submitted', label: 'Proses Kopra' },
    { value: 'funds_received', label: 'Dana Cair' },
    { value: 'payment_in_progress', label: 'Pembayaran' },
    { value: 'completed', label: 'Selesai' },
];
const money = (value: number | string | null | undefined) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));

type ActionState = { type: string; expense?: ExpenseRequest; funding?: FundingRequest; payment?: Payment } | null;

const today = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${value.year}-${value.month}-${value.day}`;
};

const initialActionData = () => ({
    action: '', decision: 'approve', notes: '', approved_amount: '', kopra_reference: '',
    submitted_date: today(), received_date: today(), destination_account: '', reference_number: '',
    amount: '', payment_destination: 'operational', recipient: '', beneficiary_user_id: '',
    payment_date: today(), actual_amount: '', remaining_amount: '', proof: null as File | null,
});

export default function FundingIndex({ expenseRequests, portCalls, availableOperationalItems, operationalUsers, filters, abilities }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [search, setSearch] = useState(filters.search);
    const [createOpen, setCreateOpen] = useState(false);
    const [action, setAction] = useState<ActionState>(null);
    const [detailExpense, setDetailExpense] = useState<ExpenseRequest | null>(null);
    const createForm = useForm({ port_call_id: '', source_type: 'operational', document_date: today(), request_item_ids: [] as string[], notes: '', document: null as File | null });
    const actionForm = useForm(initialActionData());
    const actionErrorRef = useRef<HTMLDivElement>(null);
    const selectableOperationalItems = useMemo(
        () => availableOperationalItems.filter((item) => item.request?.port_call_id === createForm.data.port_call_id),
        [availableOperationalItems, createForm.data.port_call_id],
    );
    const selectedOperationalItems = useMemo(
        () => availableOperationalItems.filter((item) => createForm.data.request_item_ids.includes(item.id)),
        [availableOperationalItems, createForm.data.request_item_ids],
    );
    const operationalTotal = selectedOperationalItems.reduce(
        (total, item) => total + Number(item.hpp_price) * Number(item.quantity),
        0,
    );
    const filter = (status = filters.status) => router.get('/funding', { search, status }, { preserveState: true });

    const openAction = (next: NonNullable<ActionState>) => {
        const formData = initialActionData();
        formData.action = next.type;
        if (next.expense) formData.approved_amount = String(next.expense.total);
        if (next.funding) formData.approved_amount = String(next.funding.approved_amount || next.funding.requested_amount);
        if (next.payment) formData.amount = String(next.payment.amount);

        actionForm.clearErrors();
        actionForm.setData(formData);
        setAction(next);
    };

    const submitCreate = (event: React.FormEvent) => {
        event.preventDefault();
        createForm.post('/funding/requests', { forceFormData: true, onSuccess: () => { setCreateOpen(false); createForm.reset(); } });
    };

    const selectOperationalPortCall = (portCallId: string) => {
        createForm.setData((data) => ({ ...data, port_call_id: portCallId, request_item_ids: [] }));
    };

    const toggleOperationalItem = (itemId: string, checked: boolean) => {
        createForm.setData('request_item_ids', checked
            ? [...createForm.data.request_item_ids, itemId]
            : createForm.data.request_item_ids.filter((id) => id !== itemId));
    };

    const submitAction = (event: React.FormEvent) => {
        event.preventDefault();
        if (!action) return;
        const options = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setAction(null),
            onError: () => {
                window.requestAnimationFrame(() => actionErrorRef.current?.focus());
            },
        };
        if (action.type === 'admin_review') actionForm.post(`/funding/expense-requests/${action.expense?.id}/admin-review`, options);
        else if (action.type === 'director_review') actionForm.post(`/funding/expense-requests/${action.expense?.id}/director-review`, options);
        else if (['submit_usage', 'verify_usage'].includes(action.type)) actionForm.post(`/funding/payments/${action.payment?.id}/transition`, options);
        else actionForm.post(`/funding/requests/${action.funding?.id}/transition`, options);
    };

    const actionTitle = action ? ({
        admin_review: 'Periksa Pengajuan Admin',
        director_review: 'Keputusan Direktur',
        submit_kopra: 'Catat Pengajuan Kopra',
        approve_kopra: 'Catat Keputusan Kopra',
        record_receipt: 'Catat Dana Cair',
        record_payment: 'Transfer Dana Operasional',
        submit_usage: 'Unggah Realisasi Dana',
        verify_usage: action.payment?.payment_destination === 'vendor' ? 'Verifikasi Pembayaran Vendor' : 'Verifikasi Realisasi Dana',
    }[action.type] || 'Perbarui Tahap Pendanaan') : 'Perbarui Tahap Pendanaan';
    const actionSubmitLabel = action?.type === 'verify_usage'
        ? (action.payment?.payment_destination === 'vendor' ? 'Verifikasi & Perbarui Invoice' : 'Verifikasi Realisasi')
        : 'Simpan Tahap';

    return (
        <AppLayout
            title="Pengajuan Pendanaan"
            transparentMobileHeader
            noPaddingMobile
            mobileBackground="surface"
        >
            <Head title="Pendanaan — PT Samudra Jaya Andalas" />

            <MobilePageHero
                title="Pendanaan & Kopra"
                description={auth.user.primary_role === 'Direktur' ? 'Periksa pengajuan yang menunggu keputusan dan pantau proses Kopra.' : 'Pantau pengajuan biaya, pencairan, pembayaran, dan realisasi per kunjungan.'}
            />

            <div className="relative z-10 mx-auto -mt-6 max-w-7xl space-y-4 rounded-t-[28px] bg-white px-4 pb-10 pt-4 dark:bg-[#0C1D36] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
                <div className="hidden flex-col gap-3 border-b border-[#DCEAF8] pb-3 sm:flex-row sm:items-center sm:justify-between md:flex dark:border-[#1E3A5F]">
                    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0060F4]">Keuangan Operasional</p><h1 className="text-2xl font-extrabold text-[#0B1F63] dark:text-[#F1F5F9] sm:text-3xl">Pengajuan Pendanaan & Kopra</h1><p className="mt-1 max-w-3xl text-sm text-[#52658E] dark:text-[#94A3B8]">Mencatat invoice vendor atau biaya lapangan, approval web SJA, proses eksternal Kopra, pencairan, pembayaran, dan realisasi tanpa menganggap sistem memindahkan dana.</p></div>
                    {abilities.create && availableOperationalItems.length > 0 && <Button variant="outline" onClick={() => setCreateOpen(true)} leftIcon={<Plus aria-hidden="true" className="size-4" />}>Dana Operasional</Button>}
                </div>

                {abilities.create && (
                    <div className="grid gap-2 md:hidden">
                        {availableOperationalItems.length > 0 && <Button className="min-h-11 w-full font-bold" onClick={() => setCreateOpen(true)} leftIcon={<Plus aria-hidden="true" className="size-4" />}>
                            Ajukan Dana Operasional
                        </Button>}
                    </div>
                )}

                <div className="md:hidden">
                    <FilterBar
                        searchValue={search}
                        onSearchChange={setSearch}
                        onSearchSubmit={() => filter()}
                        searchPlaceholder="Cari nomor, kapal, atau catatan…"
                        searchAriaLabel="Cari pendanaan"
                        chips={fundingQuickFilters.map((item) => ({ id: item.value, label: item.label }))}
                        activeChipId={filters.status}
                        onChipChange={filter}
                        filterCountBadge={filters.status === 'all' ? 0 : 1}
                        filterTitle="Pilih status pendanaan"
                        filterControls={(
                            <Select
                                aria-label="Filter status pendanaan"
                                value={filters.status}
                                onChange={(event) => filter(event.target.value)}
                                options={[
                                    { value: 'all', label: 'Semua status' },
                                    ...Object.entries(labels).map(([value, label]) => ({ value, label })),
                                ]}
                            />
                        )}
                        className="!border-0 !bg-transparent !p-0 !shadow-none dark:!bg-transparent"
                    />
                </div>

                <form onSubmit={(e) => { e.preventDefault(); filter(); }} className="hidden gap-2 rounded-2xl border border-[#DCEAF8] bg-[#F8FBFF] p-3 sm:grid-cols-[1fr_260px_auto] dark:border-[#1E3A5F] dark:bg-[#071322] md:grid md:bg-transparent md:p-0 md:dark:bg-transparent">
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" placeholder="Cari nomor pengajuan, kapal, atau catatan…" aria-label="Cari pendanaan" leftIcon={<Search aria-hidden="true" className="size-4" />} />
                    <Select value={filters.status} onChange={(e) => filter(e.target.value)} aria-label="Filter status pendanaan" options={[{ value: 'all', label: 'Semua status' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} />
                    <Button type="submit" variant="secondary">Cari</Button>
                </form>

                {expenseRequests.data.length === 0 ? <Card className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><WalletCards aria-hidden="true" className="size-10 text-[#8C9BB9]" /><div><h2 className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Belum ada pengajuan pendanaan</h2><p className="mt-1 text-sm text-[#52658E] dark:text-[#94A3B8]">Data baru muncul setelah kebutuhan dana operasional diajukan.</p></div></Card> : (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {expenseRequests.data.map((item) => {
                            const funding = item.funding_request;
                            const status = funding?.status || item.status;
                            const received = funding?.receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0) || 0;
                            const paid = funding?.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
                            return <Card key={item.id} className="overflow-hidden">
                                <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-all text-base font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{item.request_number}</p><p className="mt-1 break-words text-xs text-[#52658E] dark:text-[#94A3B8]">{item.port_call?.ship?.name || '-'} · <span translate="no">{item.port_call?.job_number || '-'}</span> · {item.creator?.name || '-'}</p></div><StatusBadge status={labels[status] || status} /></div>
                                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F0F8FF] p-3 dark:bg-[#102642]"><div className="min-w-0"><p className="text-[10px] text-[#52658E]">Diajukan</p><p className="mt-1 truncate text-xs font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(item.total)}</p></div><div className="min-w-0"><p className="text-[10px] text-[#52658E]">Dana Cair</p><p className="mt-1 truncate text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{money(received)}</p></div><div className="min-w-0"><p className="text-[10px] text-[#52658E]">Dialokasikan</p><p className="mt-1 truncate text-xs font-bold tabular-nums text-[#0060F4]">{money(paid)}</p></div></div>
                                    <div className="hidden space-y-2 text-xs text-[#52658E] dark:text-[#94A3B8] md:block">
                                        {item.items.map((line, index) => <div key={index} className="flex items-start gap-2"><FileCheck2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#0060F4]" /><div><p className="font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{line.description}</p><p>{line.cost_document_item?.cost_document?.vendor?.name || 'Pengeluaran operasional'} · {money(line.amount)}</p></div></div>)}
                                        {funding?.kopra_reference && <p className="flex items-center gap-2"><Landmark aria-hidden="true" className="size-4" />Referensi Kopra: <strong>{funding.kopra_reference}</strong></p>}
                                    </div>
                                    {funding?.payments.length ? (
                                        <div className="space-y-2 border-t border-[#DCEAF8] pt-3 dark:border-[#1E3A5F]">
                                            <p className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Pembayaran & realisasi</p>
                                            {funding.payments.map((payment) => (
                                                <div key={payment.id} className="flex flex-col gap-2 rounded-xl border border-[#DCEAF8] bg-[#F8FBFF] p-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                    <div className="min-w-0">
                                                        <p className="break-words text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{payment.recipient} · {money(payment.amount)}</p>
                                                        <p className="mt-0.5 break-all text-[11px] text-[#52658E]" translate="no">{payment.reference_number}</p>
                                                        <StatusBadge
                                                            className="mt-2"
                                                            size="sm"
                                                            status={payment.verification_status === 'verified' ? 'success' : 'waiting'}
                                                            label={labels[payment.verification_status] || payment.verification_status}
                                                            showDot
                                                        />
                                                    </div>
                                                    <div className="flex shrink-0 flex-wrap gap-2">
                                                        {payment.verification_status === 'waiting_usage_proof' && (payment.beneficiary?.id === auth.user.id || abilities.manageFunding) && (
                                                            <Button size="sm" onClick={() => openAction({ type: 'submit_usage', payment })}>Unggah Realisasi</Button>
                                                        )}
                                                        {['pending', 'waiting_admin_verification'].includes(payment.verification_status) && abilities.manageFunding && (
                                                            <Button size="sm" onClick={() => openAction({ type: 'verify_usage', payment })}>
                                                                Verifikasi Pembayaran
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    <div className="flex flex-wrap gap-2 border-t border-[#DCEAF8] pt-3 dark:border-[#1E3A5F]">
                                        <Button size="sm" variant="outline" onClick={() => setDetailExpense(item)} rightIcon={<ChevronRight aria-hidden="true" className="size-4" />}>Detail</Button>
                                        {item.status === 'waiting_admin_review' && abilities.adminReview && <Button size="sm" onClick={() => openAction({ type: 'admin_review', expense: item })}>Periksa Admin</Button>}
                                        {item.status === 'waiting_director' && abilities.directorApprove && <Button size="sm" onClick={() => openAction({ type: 'director_review', expense: item })}>Keputusan Direktur</Button>}
                                        {funding?.status === 'approved_director' && abilities.manageFunding && <Button size="sm" onClick={() => openAction({ type: 'submit_kopra', funding })}>Catat Pengajuan Kopra</Button>}
                                        {funding?.status === 'kopra_submitted' && abilities.directorApprove && <Button size="sm" onClick={() => openAction({ type: 'approve_kopra', funding })}>Approval Kopra</Button>}
                                        {funding && ['kopra_approved', 'funds_received_partial'].includes(funding.status) && abilities.manageFunding && <Button size="sm" onClick={() => openAction({ type: 'record_receipt', funding })}>Catat Dana Cair</Button>}
                                        {funding && ['funds_received', 'funds_received_partial', 'payment_in_progress'].includes(funding.status) && abilities.manageFunding && <Button size="sm" onClick={() => openAction({ type: 'record_payment', funding, expense: item })}>Transfer ke Operasional</Button>}
                                    </div>
                                </div>
                            </Card>;
                        })}
                    </div>
                )}
                <Pagination links={expenseRequests.links} currentPage={expenseRequests.current_page} lastPage={expenseRequests.last_page} total={expenseRequests.total} from={expenseRequests.from ?? undefined} to={expenseRequests.to ?? undefined} />
            </div>

            {detailExpense && (
                <Modal
                    isOpen
                    onClose={() => setDetailExpense(null)}
                    title={`Detail ${detailExpense.request_number}`}
                    subtitle="Rincian biaya, sumber dokumen, pencairan, dan pembayaran."
                    size="lg"
                    asBottomSheetOnMobile
                    footer={<Button variant="secondary" onClick={() => setDetailExpense(null)}>Tutup</Button>}
                >
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-[#DCEAF8] bg-[#F0F8FF] p-4 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-extrabold text-[#0060F4]" translate="no">{detailExpense.request_number}</p>
                                    <h2 className="mt-1 text-balance text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">{detailExpense.port_call?.ship?.name || 'Kapal tidak tersedia'}</h2>
                                    <p className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">{detailExpense.port_call?.job_number || '-'} · {detailExpense.port_call?.port?.name || '-'} · {detailExpense.creator?.name || '-'}</p>
                                </div>
                                <StatusBadge status={labels[detailExpense.funding_request?.status || detailExpense.status] || detailExpense.funding_request?.status || detailExpense.status} />
                            </div>
                        </div>

                        <dl className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]"><dt className="text-[11px] text-[#52658E]">Total diajukan</dt><dd className="mt-1 text-sm font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(detailExpense.total)}</dd></div>
                            <div className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]"><dt className="text-[11px] text-[#52658E]">Referensi Kopra</dt><dd className="mt-1 truncate text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{detailExpense.funding_request?.kopra_reference || 'Belum dicatat'}</dd></div>
                        </dl>

                        <section aria-labelledby="funding-items-title">
                            <h3 id="funding-items-title" className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Rincian biaya</h3>
                            <div className="mt-2 space-y-2">
                                {detailExpense.items.map((line, index) => (
                                    <div key={`${line.description}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]">
                                        <div className="min-w-0">
                                            <p className="break-words text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{line.description}</p>
                                            <p className="mt-0.5 truncate text-xs text-[#52658E]">{line.cost_document_item?.cost_document?.vendor?.name || 'Pengeluaran operasional'}</p>
                                            {line.cost_document_item?.cost_document?.document_path && (
                                                <DocumentActions
                                                    className="mt-2"
                                                    viewHref={`/funding/documents/cost/${line.cost_document_item.cost_document.id}?view=1`}
                                                    downloadHref={`/funding/documents/cost/${line.cost_document_item.cost_document.id}`}
                                                    viewLabel="Lihat dokumen"
                                                />
                                            )}
                                        </div>
                                        <p className="shrink-0 text-sm font-bold tabular-nums text-[#0060F4]">{money(line.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {detailExpense.funding_request?.receipts.length ? (
                            <section aria-labelledby="funding-receipts-title">
                                <h3 id="funding-receipts-title" className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Pencairan dana</h3>
                                <div className="mt-2 space-y-2">
                                    {detailExpense.funding_request.receipts.map((receipt) => (
                                        <div key={receipt.id} className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{receipt.reference_number}</p>
                                                    <p className="mt-0.5 text-xs text-[#52658E]">{formatDate(receipt.received_date)}</p>
                                                </div>
                                                <p className="shrink-0 text-sm font-bold tabular-nums">{money(receipt.amount)}</p>
                                            </div>
                                            {receipt.proof_path && (
                                                <DocumentActions
                                                    className="mt-2"
                                                    viewHref={`/funding/documents/receipt/${receipt.id}?view=1`}
                                                    downloadHref={`/funding/documents/receipt/${receipt.id}`}
                                                    viewLabel="Lihat bukti pencairan"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : null}

                        {detailExpense.funding_request?.payments.length ? (
                            <section aria-labelledby="funding-payments-title">
                                <h3 id="funding-payments-title" className="text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Pembayaran & realisasi</h3>
                                <div className="mt-2 space-y-2">
                                    {detailExpense.funding_request.payments.map((payment) => (
                                        <div key={payment.id} className="rounded-xl border border-[#DCEAF8] p-3 dark:border-[#1E3A5F]">
                                            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{payment.recipient}</p><p className="mt-0.5 truncate text-xs text-[#52658E]" translate="no">{payment.reference_number}</p></div><p className="shrink-0 text-sm font-bold tabular-nums">{money(payment.amount)}</p></div>
                                            <p className="mt-2 text-xs text-[#52658E]">{labels[payment.verification_status] || payment.verification_status}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {payment.proof_path && (
                                                    <DocumentActions
                                                        viewHref={`/funding/documents/payment/${payment.id}?view=1`}
                                                        downloadHref={`/funding/documents/payment/${payment.id}`}
                                                        viewLabel="Lihat pembayaran"
                                                    />
                                                )}
                                                {payment.usage_proof_path && (
                                                    <DocumentActions
                                                        viewHref={`/funding/documents/usage/${payment.id}?view=1`}
                                                        downloadHref={`/funding/documents/usage/${payment.id}`}
                                                        viewLabel="Lihat realisasi"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : null}
                    </div>
                </Modal>
            )}

            <Modal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                title="Pengajuan Dana Operasional"
                subtitle="Untuk biaya lapangan yang akan direalisasikan oleh petugas Operasional."
                size="xl"
                asBottomSheetOnMobile
                footer={(
                    <>
                        <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Batal</Button>
                        <Button type="submit" form="funding-create-form" disabled={createForm.data.request_item_ids.length === 0} isLoading={createForm.processing}>Kirim Pengajuan</Button>
                    </>
                )}
            >
                <form id="funding-create-form" noValidate onSubmit={submitCreate} className="space-y-4">
                    <FormErrorSummary errors={createForm.errors} />
                    <div className="grid gap-x-1 gap-y-4 sm:grid-cols-2">
                        <Select required label="Kunjungan / Job" value={createForm.data.port_call_id} onChange={(e) => selectOperationalPortCall(e.target.value)} placeholder="Pilih job" options={portCalls.map((p) => ({ value: p.id, label: `${p.job_number || '-'} · ${p.ship?.name || '-'}` }))} error={createForm.errors.port_call_id} />
                        <Input required label="Tanggal Dokumen" type="date" value={createForm.data.document_date} onChange={(e) => createForm.setData('document_date', e.target.value)} error={createForm.errors.document_date} />
                        <fieldset className="sm:col-span-2">
                            <legend className="mb-2 text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Item pengajuan untuk dana operasional</legend>
                            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[#DCEAF8] p-2 dark:border-[#1E3A5F]">
                                {!createForm.data.port_call_id ? (
                                    <p className="p-3 text-sm text-[#52658E]">Pilih Kunjungan/Job untuk melihat item yang sudah disetujui.</p>
                                ) : selectableOperationalItems.length === 0 ? (
                                    <p className="p-3 text-sm text-[#52658E]">Tidak ada item tersedia. Item mungkin belum disetujui atau sudah dipakai.</p>
                                ) : selectableOperationalItems.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-[#E0F0FF] p-3 dark:border-[#1E3A5F]">
                                        <Checkbox
                                            checked={createForm.data.request_item_ids.includes(item.id)}
                                            onChange={(event) => toggleOperationalItem(item.id, event.target.checked)}
                                            label={`${item.item_name} · ${item.quantity} ${item.unit || 'Paket'}`}
                                            description={`${item.request?.request_number || 'Pengajuan'} · ${money(Number(item.hpp_price) * Number(item.quantity))}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            {createForm.errors.request_item_ids && <p role="alert" className="mt-1.5 text-xs font-semibold text-[#C62840]">{createForm.errors.request_item_ids}</p>}
                        </fieldset>
                        <div className="sm:col-span-2 rounded-xl border border-[#DCEAF8] bg-[#F0F8FF] px-3 py-2.5 dark:border-[#1E3A5F] dark:bg-[#071322]">
                            <p className="text-[11px] text-[#52658E]">Total diajukan dari HPP yang disetujui</p>
                            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{money(operationalTotal)}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <PhotoUploadPicker
                                label="Dokumen / bukti"
                                value={createForm.data.document}
                                onChange={(file) => createForm.setData('document', file)}
                                mode="gallery"
                                accept=".pdf,.jpg,.jpeg,.png"
                                maxSizeMb={10}
                                variant="compact"
                                error={createForm.errors.document}
                                helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB."
                            />
                        </div>
                    </div>
                    <Textarea id="funding-notes" name="notes" autoComplete="off" label="Catatan" value={createForm.data.notes} onChange={(e) => createForm.setData('notes', e.target.value)} error={createForm.errors.notes} maxLength={2000} showCharCount />
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(action)}
                onClose={() => {
                    if (!actionForm.processing) {
                        actionForm.clearErrors();
                        setAction(null);
                    }
                }}
                title={actionTitle}
                subtitle="Keputusan, referensi, nominal, dan bukti akan masuk histori aktivitas."
                size="lg"
                footer={(
                    <>
                        <Button type="button" variant="secondary" disabled={actionForm.processing} onClick={() => { actionForm.clearErrors(); setAction(null); }}>Batal</Button>
                        <Button type="submit" form="funding-action-form" isLoading={actionForm.processing}>{actionSubmitLabel}</Button>
                    </>
                )}
            >
                <form id="funding-action-form" noValidate onSubmit={submitAction} className="space-y-4">
                    <FormErrorSummary ref={actionErrorRef} errors={actionForm.errors} />

                    {action?.type === 'admin_review' || action?.type === 'director_review' ? (
                        <>
                            <Select name="decision" autoComplete="off" label="Keputusan" value={actionForm.data.decision} onChange={(e) => actionForm.setData('decision', e.target.value)} error={actionForm.errors.decision} options={[{ value: 'approve', label: 'Setujui / Lanjutkan' }, { value: 'revision', label: 'Perlu Revisi' }, { value: 'reject', label: 'Tolak' }]} />
                            {action?.type === 'director_review' && actionForm.data.decision === 'approve' && <MoneyInput required name="approved_amount" autoComplete="off" label="Nominal Disetujui" value={actionForm.data.approved_amount} onChange={(value) => actionForm.setData('approved_amount', value)} error={actionForm.errors.approved_amount} />}
                        </>
                    ) : null}

                    {action?.type === 'submit_kopra' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input required name="kopra_reference" autoComplete="off" spellCheck={false} label="Nomor Pengajuan Kopra" value={actionForm.data.kopra_reference} onChange={(e) => actionForm.setData('kopra_reference', e.target.value)} error={actionForm.errors.kopra_reference} />
                            <Input required name="submitted_date" autoComplete="off" label="Tanggal Pengajuan" type="date" value={actionForm.data.submitted_date} onChange={(e) => actionForm.setData('submitted_date', e.target.value)} error={actionForm.errors.submitted_date} />
                        </div>
                    )}

                    {action?.type === 'approve_kopra' && (
                        <>
                            <Select name="action" autoComplete="off" label="Keputusan Kopra" value={actionForm.data.action} onChange={(e) => actionForm.setData('action', e.target.value)} error={actionForm.errors.action} options={[{ value: 'approve_kopra', label: 'Disetujui di Kopra' }, { value: 'reject_kopra', label: 'Ditolak di Kopra' }]} />
                            {actionForm.data.action === 'approve_kopra' && <MoneyInput required name="approved_amount" autoComplete="off" label="Nominal Disetujui" value={actionForm.data.approved_amount} onChange={(value) => actionForm.setData('approved_amount', value)} error={actionForm.errors.approved_amount} />}
                        </>
                    )}

                    {action?.type === 'record_receipt' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input required name="received_date" autoComplete="off" label="Tanggal Dana Cair" type="date" value={actionForm.data.received_date} onChange={(e) => actionForm.setData('received_date', e.target.value)} error={actionForm.errors.received_date} />
                            <MoneyInput required name="amount" autoComplete="off" label="Nominal Cair" value={actionForm.data.amount} onChange={(value) => actionForm.setData('amount', value)} error={actionForm.errors.amount} />
                            <Input required name="destination_account" autoComplete="off" label="Rekening Penerima" value={actionForm.data.destination_account} onChange={(e) => actionForm.setData('destination_account', e.target.value)} error={actionForm.errors.destination_account} />
                            <Input required name="reference_number" autoComplete="off" spellCheck={false} label="Referensi Pencairan" value={actionForm.data.reference_number} onChange={(e) => actionForm.setData('reference_number', e.target.value)} error={actionForm.errors.reference_number} />
                            <div className="sm:col-span-2">
                                <PhotoUploadPicker label="Bukti pencairan" required value={actionForm.data.proof} onChange={(file) => actionForm.setData('proof', file)} mode="gallery" accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={actionForm.errors.proof} helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB." />
                            </div>
                        </div>
                    )}

                    {action?.type === 'record_payment' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input required name="recipient" autoComplete="off" label="Penerima" value={actionForm.data.recipient} onChange={(e) => actionForm.setData('recipient', e.target.value)} error={actionForm.errors.recipient} />
                            <Select required name="beneficiary_user_id" autoComplete="off" label="Petugas Operasional" value={actionForm.data.beneficiary_user_id} onChange={(e) => actionForm.setData('beneficiary_user_id', e.target.value)} placeholder="Pilih petugas" error={actionForm.errors.beneficiary_user_id} options={operationalUsers.map((u) => ({ value: u.id, label: u.name }))} />
                            <MoneyInput required name="amount" autoComplete="off" label="Nominal" value={actionForm.data.amount} onChange={(value) => actionForm.setData('amount', value)} error={actionForm.errors.amount} />
                            <Input required name="payment_date" autoComplete="off" label="Tanggal" type="date" value={actionForm.data.payment_date} onChange={(e) => actionForm.setData('payment_date', e.target.value)} error={actionForm.errors.payment_date} />
                            <Input required name="reference_number" autoComplete="off" spellCheck={false} label="Referensi Transfer" value={actionForm.data.reference_number} onChange={(e) => actionForm.setData('reference_number', e.target.value)} error={actionForm.errors.reference_number} />
                            <div className="sm:col-span-2">
                                <PhotoUploadPicker label="Bukti pembayaran" required value={actionForm.data.proof} onChange={(file) => actionForm.setData('proof', file)} mode="gallery" accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={actionForm.errors.proof} helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB." />
                            </div>
                        </div>
                    )}

                    {action?.type === 'submit_usage' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <MoneyInput required name="actual_amount" autoComplete="off" label="Nominal Aktual" value={actionForm.data.actual_amount} onChange={(value) => actionForm.setData('actual_amount', value)} error={actionForm.errors.actual_amount} />
                            <MoneyInput required name="remaining_amount" autoComplete="off" label="Sisa Dana" value={actionForm.data.remaining_amount} onChange={(value) => actionForm.setData('remaining_amount', value)} error={actionForm.errors.remaining_amount} />
                            <div className="sm:col-span-2">
                                <PhotoUploadPicker label="Bukti penggunaan" required value={actionForm.data.proof} onChange={(file) => actionForm.setData('proof', file)} mode="gallery" accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} variant="compact" error={actionForm.errors.proof} helperText="PDF, JPG, JPEG, atau PNG. Maksimal 10 MB." />
                            </div>
                        </div>
                    )}

                    {action?.type === 'verify_usage' && action.payment && (
                        <div className="rounded-2xl border border-[#B9E8D0] bg-[#F0FCF6] p-4 dark:border-emerald-900 dark:bg-emerald-950/25">
                            <div className="flex items-start gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#DCF7E8] text-[#087443] dark:bg-emerald-900/60 dark:text-emerald-300">
                                    <CircleCheckBig aria-hidden="true" className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{action.payment.recipient}</p>
                                    <p className="mt-1 text-lg font-extrabold tabular-nums text-[#087443] dark:text-emerald-300">{money(action.payment.amount)}</p>
                                    <p className="mt-1 break-all text-xs text-[#52658E]" translate="no">Referensi: {action.payment.reference_number}</p>
                                    <p className="mt-3 text-xs leading-relaxed text-[#52658E] dark:text-[#94A3B8]">
                                        Pastikan bukti pembayaran sudah sesuai. Setelah diverifikasi, nominal dialokasikan ke invoice vendor dan statusnya otomatis menjadi Dibayar atau Dibayar Sebagian.
                                    </p>
                                    {action.payment.proof_path && (
                                        <DocumentActions
                                            className="mt-3"
                                            viewHref={`/funding/documents/payment/${action.payment.id}?view=1`}
                                            downloadHref={`/funding/documents/payment/${action.payment.id}`}
                                            viewLabel="Lihat bukti pembayaran"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {action?.type !== 'verify_usage' && (
                        <Textarea id="action-notes" name="notes" autoComplete="off" label="Catatan / Alasan" value={actionForm.data.notes} onChange={(e) => actionForm.setData('notes', e.target.value)} error={actionForm.errors.notes} maxLength={2000} showCharCount />
                    )}
                </form>
            </Modal>
        </AppLayout>
    );
}
