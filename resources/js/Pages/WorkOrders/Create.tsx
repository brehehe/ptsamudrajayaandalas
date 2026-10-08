import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CalendarClock,
    Check,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Info,
    MapPin,
    Plus,
    Ship,
    Upload,
    UserRound,
    X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import Input from '../../Components/forms/Input';
import PhotoUploadPicker from '../../Components/forms/PhotoUploadPicker';
import Textarea from '../../Components/forms/Textarea';
import ConfirmDialog from '../../Components/overlays/ConfirmDialog';
import Modal from '../../Components/overlays/Modal';
import Select from '../../Components/selects/Select';
import SelectSearch from '../../Components/selects/SelectSearch';
import Button from '../../Components/ui/Button';
import Card from '../../Components/ui/Card';
import StatusBadge from '../../Components/ui/StatusBadge';
import AppLayout from '../../Layouts/AppLayout';
import { optimizeImageFile } from '../../lib/optimizeImageFile';
import type { PageProps } from '../../types';
import FormErrorSummary from '../../Components/forms/FormErrorSummary';
import ShipImage from '../../Components/vessels/ShipImage';
import { playSjaChime } from '../../Components/feedback/AudioNotification';

interface OptionItem {
    id: string | number;
    name: string;
    ship_company_id?: string;
    imo_number?: string | null;
    ship_type?: string | null;
    gross_tonnage?: string | null;
    image?: string | null;
    city?: string | null;
}

interface ShipFormData {
    name: string;
    ship_company_id: string;
    ship_type: string;
    imo_number: string;
    call_sign: string;
    gross_tonnage: string;
    length: string;
    flag: string;
    image: File | null;
}

interface Props {
    companies: OptionItem[];
    ships: OptionItem[];
    ports: OptionItem[];
    assignees: OptionItem[];
    defaultAssigneeId?: number | null;
    canCreateVessels: boolean;
}

interface CreatedWorkOrder {
    id: string;
    system_number: string;
    status: 'draft' | 'active' | string;
    received_at?: string | null;
    ship_id: string;
    ship_name: string;
    ship_image?: string | null;
    port_call_id?: string | null;
    job_number?: string | null;
}

interface WorkOrderForm {
    client_number: string;
    company_id: string;
    ship_id: string;
    port_id: string;
    document_date: string;
    received_at: string;
    eta_at: string;
    etd_at: string;
    activity_name: string;
    activity_description: string;
    assigned_to: string;
    client_pic_name: string;
    client_pic_contact: string;
    status: 'draft' | 'active';
    document: File | null;
}

type FormField = keyof WorkOrderForm;

const steps = [
    { title: 'Data SPK', description: 'Dokumen dari klien', icon: FileText },
    { title: 'Kunjungan', description: 'Kapal, lokasi, jadwal', icon: Ship },
    { title: 'Eksekusi', description: 'Kegiatan & petugas', icon: UserRound },
    { title: 'Review', description: 'Periksa sebelum simpan', icon: ClipboardCheck },
];

const fieldSteps: Partial<Record<FormField, number>> = {
    client_number: 0,
    document_date: 0,
    received_at: 0,
    client_pic_name: 0,
    client_pic_contact: 0,
    document: 0,
    company_id: 1,
    ship_id: 1,
    port_id: 1,
    eta_at: 1,
    etd_at: 1,
    activity_name: 2,
    activity_description: 2,
    assigned_to: 2,
};

const toLocalInputValue = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

    return localDate.toISOString().slice(0, 16);
};

const formatDate = (value: string) => {
    if (!value) {
        return 'Belum diisi';
    }

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value));
};

const fileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
        return `${Math.ceil(bytes / 1024)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const allowedDocumentExtensions = new Set(['pdf', 'jpg', 'jpeg', 'png']);

export default function WorkOrdersCreate({
    companies,
    ships,
    ports,
    assignees,
    defaultAssigneeId,
    canCreateVessels,
}: Props) {
    const { auth, flash } = usePage<PageProps & {
        flash?: PageProps['flash'] & { created_work_order?: CreatedWorkOrder | null };
    }>().props;
    const createdWorkOrder = flash?.created_work_order ?? null;
    const now = useMemo(() => new Date(), []);
    const [currentStep, setCurrentStep] = useState(0);
    const [clientErrors, setClientErrors] = useState<Partial<Record<FormField, string>>>({});
    const [confirmed, setConfirmed] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
    const role = auth.user?.primary_role || 'Pengguna';
    const isFieldStaff = role === 'Lapangan';

    useEffect(() => {
        if (createdWorkOrder) {
            playSjaChime('success');
        }
    }, [createdWorkOrder?.id]);

    // Dynamic lists to allow inline additions without losing SPK form progress
    const [companyList, setCompanyList] = useState<OptionItem[]>(companies);
    const [shipList, setShipList] = useState<OptionItem[]>(ships);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Modal state: Tambah Perusahaan
    const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
    const [companyFormData, setCompanyFormData] = useState({
        name: '',
        code: '',
        phone: '',
        email: '',
        address: '',
    });
    const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});
    const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);

    // Modal state: Tambah Kapal
    const [isAddShipOpen, setIsAddShipOpen] = useState(false);
    const [shipFormData, setShipFormData] = useState<ShipFormData>({
        name: '',
        ship_company_id: '',
        ship_type: 'Tugboat',
        imo_number: '',
        call_sign: '',
        gross_tonnage: '',
        length: '',
        flag: 'Indonesia',
        image: null,
    });
    const [shipErrors, setShipErrors] = useState<Record<string, string>>({});
    const [isSubmittingShip, setIsSubmittingShip] = useState(false);

    useEffect(() => {
        setCompanyList(companies);
    }, [companies]);

    useEffect(() => {
        setShipList(ships);
    }, [ships]);

    const form = useForm<WorkOrderForm>({
        client_number: '',
        company_id: '',
        ship_id: '',
        port_id: '',
        document_date: toLocalInputValue(now).slice(0, 10),
        received_at: toLocalInputValue(now),
        eta_at: '',
        etd_at: '',
        activity_name: '',
        activity_description: '',
        assigned_to: defaultAssigneeId ? String(defaultAssigneeId) : '',
        client_pic_name: '',
        client_pic_contact: '',
        status: 'draft',
        document: null,
    });

    const filteredShips = useMemo(
        () => shipList.filter((ship) => String(ship.ship_company_id) === form.data.company_id),
        [shipList, form.data.company_id],
    );
    const selectedCompany = companyList.find((item) => String(item.id) === form.data.company_id);
    const selectedShip = shipList.find((item) => String(item.id) === form.data.ship_id);
    const selectedPort = ports.find((item) => String(item.id) === form.data.port_id);
    const selectedAssignee = assignees.find((item) => String(item.id) === form.data.assigned_to);
    const serverErrorCount = Object.keys(form.errors).length;

    const handleOpenAddCompany = () => {
        setCompanyFormData({
            name: '',
            code: '',
            phone: '',
            email: '',
            address: '',
        });
        setCompanyErrors({});
        setIsAddCompanyOpen(true);
    };

    const handleSaveCompany = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const errors: Record<string, string> = {};
        if (!companyFormData.name.trim()) {
            errors.name = 'Nama perusahaan wajib diisi.';
        }
        if (Object.keys(errors).length > 0) {
            setCompanyErrors(errors);
            return;
        }

        setIsSubmittingCompany(true);
        setCompanyErrors({});

        try {
            const response = await window.axios.post('/master/companies', companyFormData, {
                headers: { Accept: 'application/json' },
            });
            const created = response.data?.company;
            if (created && created.id) {
                const newOption: OptionItem = {
                    id: created.id,
                    name: created.name,
                };
                setCompanyList((prev) => {
                    const exists = prev.some((c) => String(c.id) === String(created.id));
                    return exists ? prev : [...prev, newOption].sort((a, b) => a.name.localeCompare(b.name));
                });
                updateCompany(created.id);
                // Pre-fill ship modal company too if user creates ship next
                setShipFormData((prev) => ({ ...prev, ship_company_id: String(created.id) }));
                setIsAddCompanyOpen(false);
                setNotification({
                    type: 'success',
                    message: `Perusahaan "${created.name}" berhasil ditambahkan dan dipilih.`,
                });
            }
        } catch (err: any) {
            if (err?.response?.data?.errors) {
                setCompanyErrors(err.response.data.errors);
            } else {
                setCompanyErrors({
                    general: err?.response?.data?.message || 'Gagal menyimpan perusahaan. Periksa koneksi dan coba lagi.',
                });
            }
        } finally {
            setIsSubmittingCompany(false);
        }
    };

    const handleOpenAddShip = () => {
        setShipFormData({
            name: '',
            ship_company_id: form.data.company_id || '',
            ship_type: 'Tugboat',
            imo_number: '',
            call_sign: '',
            gross_tonnage: '',
            length: '',
            flag: 'Indonesia',
            image: null,
        });
        setShipErrors({});
        setIsAddShipOpen(true);
    };

    const handleSaveShip = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const errors: Record<string, string> = {};
        if (!shipFormData.ship_company_id) {
            errors.ship_company_id = 'Pilih perusahaan pemilik kapal terlebih dahulu.';
        }
        if (!shipFormData.name.trim()) {
            errors.name = 'Nama kapal wajib diisi.';
        }
        if (Object.keys(errors).length > 0) {
            setShipErrors(errors);
            return;
        }

        setIsSubmittingShip(true);
        setShipErrors({});

        try {
            const payload = new FormData();

            Object.entries(shipFormData).forEach(([key, value]) => {
                if (value instanceof File) {
                    payload.append(key, value);
                } else if (value !== null) {
                    payload.append(key, value);
                }
            });

            const response = await window.axios.post(route('master.vessels.store'), payload, {
                headers: { Accept: 'application/json' },
            });
            const created = response.data?.vessel;
            if (created && created.id) {
                const newOption: OptionItem = {
                    id: created.id,
                    name: created.name,
                    ship_company_id: String(created.ship_company_id),
                    imo_number: created.imo_number || null,
                    ship_type: created.ship_type || null,
                    gross_tonnage: created.gross_tonnage ? String(created.gross_tonnage) : null,
                    image: created.image || null,
                };
                setShipList((prev) => {
                    const exists = prev.some((s) => String(s.id) === String(created.id));
                    return exists ? prev : [...prev, newOption].sort((a, b) => a.name.localeCompare(b.name));
                });
                // Ensure the main form company is set to this ship's company
                if (form.data.company_id !== String(created.ship_company_id)) {
                    form.setData((current) => ({
                        ...current,
                        company_id: String(created.ship_company_id),
                        ship_id: String(created.id),
                    }));
                } else {
                    updateField('ship_id', String(created.id));
                }
                setIsAddShipOpen(false);
                setNotification({
                    type: 'success',
                    message: `Kapal "${created.name}" berhasil didaftarkan dan dipilih.`,
                });
            }
        } catch (err: any) {
            if (err?.response?.data?.errors) {
                setShipErrors(err.response.data.errors);
            } else {
                setShipErrors({
                    general: err?.response?.data?.message || 'Gagal menyimpan kapal. Periksa koneksi dan coba lagi.',
                });
            }
        } finally {
            setIsSubmittingShip(false);
        }
    };

    useEffect(() => {
        const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
            if (!form.isDirty || form.processing) {
                return;
            }

            event.preventDefault();
        };

        window.addEventListener('beforeunload', warnAboutUnsavedChanges);

        return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
    }, [form.isDirty, form.processing]);

    const errorFor = (field: FormField) => clientErrors[field] || form.errors[field];

    const updateField = (field: FormField, value: WorkOrderForm[FormField]) => {
        form.setData({ ...form.data, [field]: value });
        form.clearErrors(field);
        setClientErrors((current) => {
            if (!current[field]) {
                return current;
            }

            const next = { ...current };
            delete next[field];

            return next;
        });
    };

    const updateCompany = (value: string | number) => {
        form.setData({
            ...form.data,
            company_id: String(value),
            ship_id: '',
        });
        form.clearErrors('company_id', 'ship_id');
        setClientErrors((current) => {
            const next = { ...current };
            delete next.company_id;
            delete next.ship_id;

            return next;
        });
    };

    const focusField = (field: FormField) => {
        requestAnimationFrame(() => {
            document.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
        });
    };

    const validateStep = (step: number) => {
        const errors: Partial<Record<FormField, string>> = {};

        if (step === 0) {
            if (!form.data.client_number.trim()) errors.client_number = 'Nomor SPK klien wajib diisi.';
            if (form.data.client_number.trim().length > 100) errors.client_number = 'Nomor SPK klien maksimal 100 karakter.';
            if (!form.data.document_date) errors.document_date = 'Tanggal SPK wajib diisi.';
            if (!form.data.received_at) errors.received_at = 'Waktu dokumen diterima wajib diisi.';
            if (form.data.document_date && form.data.received_at && form.data.document_date > form.data.received_at.slice(0, 10)) {
                errors.document_date = 'Tanggal SPK tidak boleh melewati waktu dokumen diterima.';
            }
            if (form.data.client_pic_name.length > 255) errors.client_pic_name = 'Nama PIC maksimal 255 karakter.';
            if (form.data.client_pic_contact.length > 100) errors.client_pic_contact = 'Kontak PIC maksimal 100 karakter.';

            if (!form.data.document) {
                errors.document = 'Dokumen SPK wajib diunggah sebelum SPK disimpan.';
            } else {
                const extension = form.data.document.name.split('.').pop()?.toLowerCase() || '';

                if (!allowedDocumentExtensions.has(extension)) {
                    errors.document = 'Dokumen SPK harus berupa PDF, JPG, JPEG, atau PNG.';
                } else if (form.data.document.size > 10 * 1024 * 1024) {
                    errors.document = 'Ukuran dokumen SPK maksimal 10 MB.';
                }
            }
        }

        if (step === 1) {
            if (!form.data.company_id) errors.company_id = 'Pilih perusahaan pemilik kapal.';
            if (!form.data.ship_id) errors.ship_id = 'Pilih kapal dari perusahaan tersebut.';
            if (!form.data.port_id) errors.port_id = 'Pilih pelabuhan kunjungan.';
            if (!form.data.eta_at) errors.eta_at = 'ETA wajib diisi.';
            if (form.data.eta_at && form.data.etd_at && new Date(form.data.etd_at) <= new Date(form.data.eta_at)) {
                errors.etd_at = 'ETD harus setelah ETA.';
            }
        }

        if (step === 2) {
            if (!form.data.activity_name.trim()) errors.activity_name = 'Jenis kegiatan wajib diisi.';
            if (form.data.activity_name.trim().length > 255) errors.activity_name = 'Jenis kegiatan maksimal 255 karakter.';
            if (!form.data.assigned_to) errors.assigned_to = 'Pilih penanggung jawab SPK.';
            if (form.data.activity_description.length > 2000) errors.activity_description = 'Rincian kegiatan maksimal 2000 karakter.';
        }

        setClientErrors((current) => {
            const next = { ...current };

            Object.entries(fieldSteps).forEach(([field, fieldStep]) => {
                if (fieldStep === step) {
                    delete next[field as FormField];
                }
            });

            return { ...next, ...errors };
        });

        const firstInvalidField = Object.keys(errors)[0] as FormField | undefined;
        if (firstInvalidField) {
            focusField(firstInvalidField);
        }

        return Object.keys(errors).length === 0;
    };

    const goToNextStep = () => {
        if (!validateStep(currentStep)) {
            return;
        }

        setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
        window.scrollTo({ top: 0 });
    };

    const goToPreviousStep = () => {
        setCurrentStep((step) => Math.max(step - 1, 0));
        window.scrollTo({ top: 0 });
    };

    const handleServerErrors = (errors: Record<string, string>) => {
        const firstField = Object.keys(errors).find((field) => field in fieldSteps) as FormField | undefined;
        if (!firstField) {
            return;
        }

        setCurrentStep(fieldSteps[firstField] ?? 0);
        focusField(firstField);
    };

    const submit = (status: 'draft' | 'active') => {
        for (let step = 0; step <= 2; step += 1) {
            if (!validateStep(step)) {
                setCurrentStep(step);

                return;
            }
        }

        if (!confirmed) {
            setReviewError('Konfirmasi bahwa data SPK dan kunjungan sudah benar.');

            return;
        }

        setReviewError(null);
        form.transform((data) => ({ ...data, status }));
        form.post('/work-orders', {
            forceFormData: true,
            preserveScroll: true,
            onError: handleServerErrors,
        });
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (currentStep < steps.length - 1) {
            goToNextStep();

            return;
        }

        submit('active');
    };

    if (createdWorkOrder) {
        const vesselUrl = createdWorkOrder.port_call_id
            ? `${route('vessels.show', createdWorkOrder.ship_id)}?visit=${encodeURIComponent(createdWorkOrder.port_call_id)}`
            : route('vessels.show', createdWorkOrder.ship_id);
        const receivedDate = createdWorkOrder.received_at
            ? new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
            }).format(new Date(createdWorkOrder.received_at))
            : '-';

        return (
            <AppLayout title="SPK Berhasil">
                <Head title="SPK Berhasil Dibuat — PT Samudra Jaya Andalas" />

                <main className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-2xl items-center justify-center px-1 py-6 sm:px-4">
                    <Card className="w-full overflow-hidden p-0 text-center">
                        <div className="px-5 py-8 sm:px-10 sm:py-10">
                            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-[#DCF7E8] text-[#087443] shadow-[0_14px_32px_rgba(8,116,67,0.18)]">
                                <Check aria-hidden="true" className="size-12" strokeWidth={3} />
                            </div>

                            <h1 className="mt-7 text-3xl font-black text-[#0060F4] sm:text-4xl">
                                SPK Berhasil Dibuat!
                            </h1>
                            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#52658E] sm:text-base dark:text-[#AFC0D4]">
                                Data SPK dan kunjungan kapal sudah tersimpan di sistem. Pilih tujuan berikutnya untuk melanjutkan pekerjaan.
                            </p>

                            <dl className="mt-7 grid gap-4 rounded-2xl border border-[#DCEAF8] bg-[#F0F8FF] p-5 text-left dark:border-[#1E3A5F] dark:bg-[#102642] sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
                                <ShipImage
                                    src={createdWorkOrder.ship_image}
                                    alt={`Foto ${createdWorkOrder.ship_name}`}
                                    width={72}
                                    height={72}
                                    className="size-[72px] rounded-xl object-cover"
                                    placeholderIconClassName="size-7"
                                />
                                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs font-medium text-[#52658E] dark:text-[#AFC0D4]">Nomor SPK</dt>
                                        <dd className="mt-1 break-all font-mono text-sm font-extrabold text-[#0B1F63] dark:text-white">{createdWorkOrder.system_number}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium text-[#52658E] dark:text-[#AFC0D4]">Nomor Job</dt>
                                        <dd className="mt-1 break-all font-mono text-sm font-extrabold text-[#0B1F63] dark:text-white">{createdWorkOrder.job_number ?? '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium text-[#52658E] dark:text-[#AFC0D4]">Kapal</dt>
                                        <dd className="mt-1 break-words text-sm font-extrabold text-[#0B1F63] dark:text-white">{createdWorkOrder.ship_name}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium text-[#52658E] dark:text-[#AFC0D4]">Tanggal diterima</dt>
                                        <dd className="mt-1 text-sm font-extrabold text-[#0B1F63] dark:text-white">{receivedDate}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="sr-only">Status</dt>
                                        <dd>
                                            <StatusBadge
                                                status={createdWorkOrder.status === 'active' ? 'Aktif' : 'Draft'}
                                                label={createdWorkOrder.status === 'active' ? 'Aktif' : 'Draft'}
                                                showDot
                                            />
                                        </dd>
                                    </div>
                                </div>
                            </dl>

                            <div className="mt-7 grid gap-3 sm:grid-cols-2">
                                <Link
                                    href={vesselUrl}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0060F4] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0050D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-offset-2"
                                >
                                    <Ship aria-hidden="true" className="size-4" />
                                    Buka Kapal & Kunjungan
                                </Link>
                                <Link
                                    href={route('work-orders.index')}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#0060F4] bg-white px-5 text-sm font-bold text-[#0060F4] transition-colors hover:bg-[#F0F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] focus-visible:ring-offset-2 dark:bg-[#0C1D36] dark:hover:bg-[#102642]"
                                >
                                    <ArrowLeft aria-hidden="true" className="size-4" />
                                    Kembali ke Daftar SPK
                                </Link>
                            </div>

                            <Link
                                href={route('work-orders.detail', createdWorkOrder.id)}
                                className="mt-5 inline-flex min-h-11 items-center justify-center px-3 text-sm font-bold text-[#52658E] underline-offset-4 hover:text-[#0060F4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:text-[#AFC0D4]"
                            >
                                Lihat detail SPK
                            </Link>
                        </div>
                    </Card>
                </main>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Tambah SPK">
            <Head title="Tambah SPK — PT Samudra Jaya Andalas" />

            <div className="mx-auto max-w-7xl pb-2 md:pb-8">
                <header className="mb-5 flex items-start gap-3 border-b border-[#DCEAF8] pb-5 dark:border-[#1E3A5F]">
                    {form.isDirty ? (
                        <button
                            type="button"
                            onClick={() => setShowCancelConfirmation(true)}
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#DCEAF8] bg-white text-[#0B1F63] hover:border-[#0060F4] hover:text-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                            aria-label="Kembali ke daftar SPK"
                        >
                            <ArrowLeft aria-hidden="true" className="size-5" />
                        </button>
                    ) : (
                        <Link
                            href="/work-orders"
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#DCEAF8] bg-white text-[#0B1F63] hover:border-[#0060F4] hover:text-[#0060F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                            aria-label="Kembali ke daftar SPK"
                        >
                            <ArrowLeft aria-hidden="true" className="size-5" />
                        </Link>
                    )}
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0060F4]">SPK baru · Langkah {currentStep + 1} dari {steps.length}</p>
                        <h1 className="mt-1 text-balance text-2xl font-extrabold text-[#0B1F63] sm:text-3xl dark:text-[#F1F5F9]">Buat SPK & Kunjungan</h1>
                        {/* <p className="mt-1 max-w-3xl text-pretty text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">
                            Satu SPK membuat satu nomor job. Seluruh aktivitas, kebutuhan, biaya, dan invoice berikutnya akan mengikuti kunjungan ini.
                        </p> */}
                    </div>
                </header>

                <div className="mb-5 md:hidden" aria-label={`Langkah ${currentStep + 1} dari ${steps.length}: ${steps[currentStep].title}`}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{steps[currentStep].title}</p>
                        <p className="text-xs tabular-nums text-[#52658E] dark:text-[#94A3B8]">{Math.round(((currentStep + 1) / steps.length) * 100)}%</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#DCEAF8] dark:bg-[#1E3A5F]">
                        <div className="h-full rounded-full bg-[#0060F4]" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
                    </div>
                </div>

                <ol className="mb-6 hidden grid-cols-4 overflow-hidden rounded-2xl border border-[#DCEAF8] bg-white md:grid dark:border-[#1E3A5F] dark:bg-[#0C1D36]" aria-label="Tahapan pembuatan SPK">
                    {steps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isComplete = index < currentStep;
                        const isCurrent = index === currentStep;

                        return (
                            <li key={step.title} className={`border-r border-[#DCEAF8] p-4 last:border-r-0 dark:border-[#1E3A5F] ${isCurrent ? 'bg-[#F0F8FF] dark:bg-[#102642]' : ''}`}>
                                <button
                                    type="button"
                                    disabled={index > currentStep}
                                    onClick={() => setCurrentStep(index)}
                                    className="flex w-full items-center gap-3 text-left disabled:cursor-not-allowed"
                                    aria-current={isCurrent ? 'step' : undefined}
                                >
                                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${isComplete || isCurrent ? 'bg-[#0060F4] text-white' : 'bg-[#EDF2F7] text-[#52658E] dark:bg-[#1E3A5F] dark:text-[#94A3B8]'}`}>
                                        {isComplete ? <Check aria-hidden="true" className="size-4" /> : <StepIcon aria-hidden="true" className="size-4" />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{step.title}</span>
                                        <span className="block truncate text-xs text-[#52658E] dark:text-[#94A3B8]">{step.description}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>

                {serverErrorCount > 0 && (
                    <div role="alert" aria-live="polite" className="mb-5 rounded-2xl border border-[#C62840]/20 bg-[#FFE7EC] p-4 text-sm text-[#9F1239] dark:bg-[#C62840]/15 dark:text-[#FCA5A5]">
                        <p className="font-bold">Ada {serverErrorCount} data yang perlu diperbaiki.</p>
                        <p className="mt-1">Periksa pesan pada field yang ditandai, lalu kirim kembali.</p>
                    </div>
                )}

                {notification && (
                    <div
                        role="alert"
                        aria-live="polite"
                        className={`mb-5 flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm transition-colors ${notification.type === 'success'
                            ? 'border-[#087443]/20 bg-[#DCF7E8] text-[#087443] dark:bg-[#087443]/15 dark:text-[#86EFAC]'
                            : 'border-[#C62840]/20 bg-[#FFE7EC] text-[#9F1239] dark:bg-[#C62840]/15 dark:text-[#FCA5A5]'
                            }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="size-5 shrink-0" />
                            <p className="font-semibold">{notification.message}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNotification(null)}
                            className="rounded-lg p-1 text-current opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]"
                            aria-label="Tutup notifikasi"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <FormErrorSummary errors={{ ...form.errors, ...clientErrors }} className="mb-4" />
                    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <Card className="overflow-hidden">
                            <div className="border-b border-[#DCEAF8] bg-[#F8FBFF] px-5 py-4 dark:border-[#1E3A5F] dark:bg-[#102642]">
                                <h2 className="text-balance text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">{steps[currentStep].title}</h2>
                                <p className="mt-1 text-pretty text-sm text-[#52658E] dark:text-[#94A3B8]">{steps[currentStep].description}</p>
                            </div>

                            <div className="p-4 sm:p-6">
                                {currentStep === 0 && (
                                    <fieldset className="grid gap-5 sm:grid-cols-2">
                                        <legend className="sr-only">Data dokumen SPK</legend>
                                        <Input
                                            id="client-number"
                                            name="client_number"
                                            required
                                            autoComplete="off"
                                            label="Nomor SPK Klien"
                                            maxLength={100}
                                            placeholder="Contoh: SPK/SJA/010/2026"
                                            value={form.data.client_number}
                                            onChange={(event) => updateField('client_number', event.target.value)}
                                            error={errorFor('client_number')}
                                        />
                                        <Input
                                            id="document-date"
                                            name="document_date"
                                            required
                                            autoComplete="off"
                                            label="Tanggal SPK"
                                            type="date"
                                            value={form.data.document_date}
                                            onChange={(event) => updateField('document_date', event.target.value)}
                                            error={errorFor('document_date')}
                                        />
                                        <Input
                                            id="received-at"
                                            name="received_at"
                                            required
                                            autoComplete="off"
                                            label="Tanggal & Waktu Diterima"
                                            type="datetime-local"
                                            value={form.data.received_at}
                                            onChange={(event) => updateField('received_at', event.target.value)}
                                            error={errorFor('received_at')}
                                        />
                                        <Input
                                            id="client-pic-name"
                                            name="client_pic_name"
                                            autoComplete="off"
                                            label="PIC Klien"
                                            maxLength={255}
                                            placeholder="Nama PIC (opsional)"
                                            value={form.data.client_pic_name}
                                            onChange={(event) => updateField('client_pic_name', event.target.value)}
                                            error={errorFor('client_pic_name')}
                                        />
                                        <Input
                                            id="client-pic-contact"
                                            name="client_pic_contact"
                                            autoComplete="off"
                                            inputMode="tel"
                                            label="Kontak PIC"
                                            maxLength={100}
                                            placeholder="Nomor telepon atau email (opsional)"
                                            value={form.data.client_pic_contact}
                                            onChange={(event) => updateField('client_pic_contact', event.target.value)}
                                            error={errorFor('client_pic_contact')}
                                        />

                                        <div className="sm:col-span-2">
                                            <p className="mb-1.5 text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Dokumen SPK <span className="text-[#C62840] dark:text-[#F87171] ml-0.5">*</span></p>
                                            <label
                                                htmlFor="spk-document"
                                                className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center focus-within:ring-2 focus-within:ring-[#0060F4] ${errorFor('document') ? 'border-[#C62840] bg-[#FFE7EC]/40' : 'border-[#9FC7EF] bg-[#F8FBFF] hover:border-[#0060F4] hover:bg-[#F0F8FF] dark:border-[#285585] dark:bg-[#071322] dark:hover:bg-[#102642]'}`}
                                            >
                                                <input
                                                    id="spk-document"
                                                    name="document"
                                                    type="file"
                                                    required
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    aria-invalid={Boolean(errorFor('document'))}
                                                    aria-describedby={errorFor('document') ? 'document-error' : undefined}
                                                    className="sr-only"
                                                    onChange={async (event) => {
                                                        const selectedFile = event.target.files?.[0] || null;
                                                        const preparedFile = selectedFile
                                                            ? await optimizeImageFile(selectedFile, {
                                                                maxWidth: 2560,
                                                                maxHeight: 2560,
                                                                quality: 0.92,
                                                                maxSizeBytes: 10 * 1024 * 1024,
                                                            })
                                                            : null;
                                                        updateField('document', preparedFile);
                                                    }}
                                                />
                                                <span className="flex size-11 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52]">
                                                    <Upload aria-hidden="true" className="size-5" />
                                                </span>
                                                <span className="mt-3 text-sm font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Pilih dokumen SPK</span>
                                                <span className="mt-1 text-xs text-[#52658E] dark:text-[#94A3B8]">PDF, JPG, JPEG, atau PNG · maksimal 10 MB</span>
                                            </label>
                                            {errorFor('document') && <p id="document-error" role="alert" className="mt-1.5 text-xs font-semibold text-[#C62840] dark:text-[#F87171]">{errorFor('document')}</p>}

                                            {form.data.document && (
                                                <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#DCEAF8] bg-white p-3 dark:border-[#1E3A5F] dark:bg-[#0C1D36]">
                                                    <FileText aria-hidden="true" className="size-5 shrink-0 text-[#0060F4]" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{form.data.document.name}</p>
                                                        <p className="text-xs tabular-nums text-[#52658E] dark:text-[#94A3B8]">{fileSize(form.data.document.size)}</p>
                                                    </div>
                                                    <button type="button" onClick={() => updateField('document', null)} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[#52658E] hover:bg-[#FFE7EC] hover:text-[#C62840] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]" aria-label="Hapus dokumen terpilih">
                                                        <X aria-hidden="true" className="size-4" />
                                                    </button>
                                                </div>
                                            )}

                                            {form.progress && (
                                                <div className="mt-3" aria-live="polite">
                                                    <div className="mb-1 flex justify-between text-xs font-semibold text-[#52658E] dark:text-[#94A3B8]">
                                                        <span>Mengunggah dokumen…</span>
                                                        <span className="tabular-nums">{form.progress.percentage}%</span>
                                                    </div>
                                                    <progress className="h-2 w-full overflow-hidden rounded-full accent-[#0060F4]" max="100" value={form.progress.percentage} />
                                                </div>
                                            )}
                                        </div>
                                    </fieldset>
                                )}

                                {currentStep === 1 && (
                                    <fieldset className="grid gap-5 sm:grid-cols-2">
                                        <legend className="sr-only">Data kunjungan kapal</legend>
                                        {/* <div className="sm:col-span-2 rounded-2xl border border-[#DCEAF8] bg-[#F0F8FF] p-4 dark:border-[#1E3A5F] dark:bg-[#102642]">
                                            <div className="flex gap-3">
                                                <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#0060F4]" />
                                                <div>
                                                    <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Pilih dari Master Kapal</p>
                                                    <p className="mt-1 text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">Kapal dapat dipakai kembali, tetapi setiap kedatangan selalu membuat Kunjungan/Job baru.</p>
                                                    {canCreateVessels && (
                                                        <Link href="/master/vessels" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#0060F4] hover:text-[#082870] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4]">
                                                            Kelola Master Kapal
                                                            <ArrowRight aria-hidden="true" className="size-4" />
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div> */}
                                        <SelectSearch
                                            id="company-id"
                                            name="company_id"
                                            required
                                            label="Perusahaan / Klien"
                                            action={
                                                <button
                                                    type="button"
                                                    onClick={handleOpenAddCompany}
                                                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold text-[#0060F4] transition-colors hover:bg-[#E0F0FF] hover:text-[#082870] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:text-[#38BDF8] dark:hover:bg-[#1E3A5F] dark:hover:text-[#93C5FD]"
                                                    title="Tambah Perusahaan Baru"
                                                >
                                                    <Plus aria-hidden="true" className="size-3.5" />
                                                    <span>Tambah Perusahaan</span>
                                                </button>
                                            }
                                            value={form.data.company_id}
                                            onChange={updateCompany}
                                            placeholder="Pilih perusahaan…"
                                            searchPlaceholder="Cari nama perusahaan…"
                                            clearable={false}
                                            options={companyList.map((item) => ({
                                                value: item.id,
                                                label: item.name,
                                                icon: <Building2 aria-hidden="true" className="size-4" />,
                                            }))}
                                            error={errorFor('company_id')}
                                        />
                                        <SelectSearch
                                            id="ship-id"
                                            name="ship_id"
                                            required
                                            label="Kapal"
                                            action={canCreateVessels ? (
                                                <button
                                                    type="button"
                                                    onClick={handleOpenAddShip}
                                                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold text-[#0060F4] transition-colors hover:bg-[#E0F0FF] hover:text-[#082870] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:text-[#38BDF8] dark:hover:bg-[#1E3A5F] dark:hover:text-[#93C5FD]"
                                                    title="Tambah Kapal Baru"
                                                >
                                                    <Plus aria-hidden="true" className="size-3.5" />
                                                    <span>Tambah Kapal</span>
                                                </button>
                                            ) : undefined}
                                            value={form.data.ship_id}
                                            onChange={(value) => updateField('ship_id', String(value))}
                                            placeholder={form.data.company_id ? 'Pilih kapal…' : 'Pilih perusahaan lebih dahulu'}
                                            searchPlaceholder="Cari nama, jenis, atau IMO…"
                                            disabled={!form.data.company_id}
                                            clearable={false}
                                            options={filteredShips.map((item) => ({
                                                value: item.id,
                                                label: item.name,
                                                description: [item.ship_type, item.imo_number ? `IMO ${item.imo_number}` : null].filter(Boolean).join(' · '),
                                                icon: <Ship aria-hidden="true" className="size-4" />,
                                            }))}
                                            error={errorFor('ship_id')}
                                            helperText={
                                                form.data.company_id && filteredShips.length === 0
                                                    ? 'Belum ada kapal aktif untuk perusahaan ini. Klik "+ Tambah Kapal" di atas untuk mendaftarkan armada kapal.'
                                                    : undefined
                                            }
                                        />
                                        <SelectSearch
                                            id="port-id"
                                            name="port_id"
                                            required
                                            label="Pelabuhan"
                                            value={form.data.port_id}
                                            onChange={(value) => updateField('port_id', String(value))}
                                            placeholder="Pilih pelabuhan…"
                                            searchPlaceholder="Cari pelabuhan atau kota…"
                                            clearable={false}
                                            options={ports.map((item) => ({
                                                value: item.id,
                                                label: item.name,
                                                description: item.city || undefined,
                                                icon: <MapPin aria-hidden="true" className="size-4" />,
                                            }))}
                                            error={errorFor('port_id')}
                                        />
                                        <Input
                                            id="eta-at"
                                            name="eta_at"
                                            required
                                            autoComplete="off"
                                            label="ETA"
                                            type="datetime-local"
                                            value={form.data.eta_at}
                                            onChange={(event) => updateField('eta_at', event.target.value)}
                                            error={errorFor('eta_at')}
                                            helperText="Estimasi kedatangan wajib untuk membuat job."
                                        />
                                        <Input
                                            id="etd-at"
                                            name="etd_at"
                                            autoComplete="off"
                                            label="ETD"
                                            type="datetime-local"
                                            value={form.data.etd_at}
                                            onChange={(event) => updateField('etd_at', event.target.value)}
                                            error={errorFor('etd_at')}
                                            helperText="Opsional bila jadwal keberangkatan belum diketahui."
                                        />

                                        {selectedShip && (
                                            <div className="sm:col-span-2 grid gap-3 rounded-2xl border border-[#DCEAF8] bg-[#F8FBFF] p-4 sm:grid-cols-3 dark:border-[#1E3A5F] dark:bg-[#071322]">
                                                <div><p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Kapal</p><p className="mt-1 font-bold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedShip.name}</p></div>
                                                <div><p className="text-xs text-[#52658E] dark:text-[#94A3B8]">Jenis</p><p className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedShip.ship_type || '-'}</p></div>
                                                <div><p className="text-xs text-[#52658E] dark:text-[#94A3B8]">IMO / GT</p><p className="mt-1 font-semibold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{selectedShip.imo_number || '-'}{selectedShip.gross_tonnage ? ` · ${selectedShip.gross_tonnage} GT` : ''}</p></div>
                                            </div>
                                        )}
                                    </fieldset>
                                )}

                                {currentStep === 2 && (
                                    <fieldset className="grid gap-5 sm:grid-cols-2">
                                        <legend className="sr-only">Data eksekusi SPK</legend>
                                        <Input
                                            id="activity-name"
                                            name="activity_name"
                                            required
                                            autoComplete="off"
                                            label="Jenis Kegiatan"
                                            maxLength={255}
                                            placeholder="Contoh: Keagenan bongkar muat"
                                            value={form.data.activity_name}
                                            onChange={(event) => updateField('activity_name', event.target.value)}
                                            error={errorFor('activity_name')}
                                        />
                                        <SelectSearch
                                            id="assigned-to"
                                            name="assigned_to"
                                            required
                                            disabled={isFieldStaff}
                                            label="Penanggung Jawab"
                                            value={form.data.assigned_to}
                                            onChange={(value) => updateField('assigned_to', String(value))}
                                            placeholder="Pilih petugas…"
                                            searchPlaceholder="Cari nama petugas…"
                                            clearable={false}
                                            options={assignees.map((item) => ({
                                                value: item.id,
                                                label: item.name,
                                                icon: <UserRound aria-hidden="true" className="size-4" />,
                                            }))}
                                            error={errorFor('assigned_to')}
                                            helperText={isFieldStaff ? 'SPK yang Anda buat otomatis ditugaskan kepada Anda.' : 'Admin dapat menugaskan SPK kepada tim Operasional atau dirinya sendiri.'}
                                        />
                                        <div className="sm:col-span-2">
                                            <Textarea
                                                id="activity-description"
                                                name="activity_description"
                                                label="Rincian Kegiatan / Catatan"
                                                placeholder="Jelaskan ruang lingkup pekerjaan, instruksi klien, atau catatan awal…"
                                                rows={5}
                                                maxLength={2000}
                                                showCharCount
                                                value={form.data.activity_description}
                                                onChange={(event) => updateField('activity_description', event.target.value)}
                                                error={errorFor('activity_description')}
                                            />
                                        </div>
                                        <div className="sm:col-span-2 rounded-2xl border border-[#DCEAF8] bg-[#F0F8FF] p-4 dark:border-[#1E3A5F] dark:bg-[#102642]">
                                            <p className="font-bold text-[#0B1F63] dark:text-[#F1F5F9]">Batas pekerjaan operasional</p>
                                            <p className="mt-1 text-sm leading-6 text-[#52658E] dark:text-[#94A3B8]">Menandai operasional selesai tidak menutup SPK. Nota Rampung, rekonsiliasi, invoice, dan pembayaran tetap diproses terpisah.</p>
                                        </div>
                                    </fieldset>
                                )}

                                {currentStep === 3 && (
                                    <div className="divide-y divide-[#DCEAF8] dark:divide-[#1E3A5F]">
                                        <section aria-labelledby="review-spk" className="pb-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 id="review-spk" className="font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Dokumen SPK</h3>
                                                <button type="button" onClick={() => setCurrentStep(0)} className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-bold text-[#0060F4] hover:text-[#082870] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:hover:text-[#7DD3FC]">Ubah data</button>
                                            </div>
                                            <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                                                <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Nomor klien</dt><dd className="mt-1 break-words font-semibold text-[#0B1F63] dark:text-[#F1F5F9]" translate="no">{form.data.client_number || '-'}</dd></div>
                                                <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Diterima</dt><dd className="mt-1 font-semibold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(form.data.received_at)}</dd></div>
                                                <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">PIC klien</dt><dd className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{form.data.client_pic_name || '-'}</dd></div>
                                                <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Dokumen</dt><dd className="mt-1 truncate font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{form.data.document?.name || 'Belum diunggah'}</dd></div>
                                            </dl>
                                        </section>

                                        <section aria-labelledby="review-visit" className="py-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 id="review-visit" className="font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Kunjungan / Job</h3>
                                                <button type="button" onClick={() => setCurrentStep(1)} className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-bold text-[#0060F4] hover:text-[#082870] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:hover:text-[#7DD3FC]">Ubah data</button>
                                            </div>
                                            <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                                                <div><dt className="flex items-center gap-1.5 text-xs text-[#52658E] dark:text-[#94A3B8]"><Building2 aria-hidden="true" className="size-3.5" />Perusahaan</dt><dd className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedCompany?.name || '-'}</dd></div>
                                                <div><dt className="flex items-center gap-1.5 text-xs text-[#52658E] dark:text-[#94A3B8]"><Ship aria-hidden="true" className="size-3.5" />Kapal</dt><dd className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedShip?.name || '-'}</dd></div>
                                                <div><dt className="flex items-center gap-1.5 text-xs text-[#52658E] dark:text-[#94A3B8]"><MapPin aria-hidden="true" className="size-3.5" />Pelabuhan</dt><dd className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedPort?.name || '-'}</dd></div>
                                                <div><dt className="flex items-center gap-1.5 text-xs text-[#52658E] dark:text-[#94A3B8]"><CalendarClock aria-hidden="true" className="size-3.5" />ETA / ETD</dt><dd className="mt-1 font-semibold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(form.data.eta_at)}<span className="block text-xs font-normal text-[#52658E] dark:text-[#94A3B8]">ETD: {form.data.etd_at ? formatDate(form.data.etd_at) : 'Belum ditentukan'}</span></dd></div>
                                            </dl>
                                        </section>

                                        <section aria-labelledby="review-execution" className="py-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 id="review-execution" className="font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Eksekusi</h3>
                                                <button type="button" onClick={() => setCurrentStep(2)} className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-bold text-[#0060F4] hover:text-[#082870] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:hover:text-[#7DD3FC]">Ubah data</button>
                                            </div>
                                            <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                                                <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Jenis kegiatan</dt><dd className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{form.data.activity_name || '-'}</dd></div>
                                                <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Penanggung jawab</dt><dd className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedAssignee?.name || '-'}</dd></div>
                                                {form.data.activity_description && <div className="sm:col-span-2"><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Catatan</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#0B1F63] dark:text-[#F1F5F9]">{form.data.activity_description}</dd></div>}
                                            </dl>
                                        </section>

                                        <section aria-labelledby="review-confirmation" className="pt-5">
                                            <h3 id="review-confirmation" className="font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">Konfirmasi data</h3>
                                            <label htmlFor="review-confirmed" className="mt-3 flex cursor-pointer items-start gap-3">
                                                <input
                                                    id="review-confirmed"
                                                    type="checkbox"
                                                    checked={confirmed}
                                                    aria-invalid={reviewError ? true : undefined}
                                                    aria-describedby={reviewError ? 'review-confirmation-error' : undefined}
                                                    onChange={(event) => { setConfirmed(event.target.checked); setReviewError(null); }}
                                                    className={`mt-0.5 size-5 shrink-0 rounded text-[#0060F4] focus:ring-[#0060F4] ${reviewError ? 'border-[#C62840]' : 'border-[#9FC7EF]'}`}
                                                />
                                                <span className="text-sm leading-6 text-[#0B1F63] dark:text-[#F1F5F9]">Saya sudah memeriksa bahwa perusahaan, kapal, pelabuhan, jadwal, dan penanggung jawab merujuk pada kunjungan yang benar.</span>
                                            </label>
                                            {reviewError && <p id="review-confirmation-error" role="alert" className="mt-2 pl-8 text-sm font-semibold text-[#C62840] dark:text-[#F87171]">{reviewError}</p>}
                                        </section>
                                    </div>
                                )}
                            </div>
                        </Card>

                        <aside className="space-y-4 lg:sticky lg:top-20" aria-label="Ringkasan kunjungan">
                            <Card className="overflow-hidden">
                                <div className="bg-[#0D2945] p-5 text-white">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-11 items-center justify-center rounded-xl bg-white/10"><Ship aria-hidden="true" className="size-5 text-[#7DD3FC]" /></span>
                                        <div className="min-w-0">
                                            <p className="text-xs text-[#B5C8DC]">Kunjungan baru</p>
                                            <p className="truncate font-extrabold">{selectedShip?.name || 'Kapal belum dipilih'}</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 break-words text-sm font-semibold text-[#E7F0FA]" translate="no">{form.data.client_number || 'Nomor SPK belum diisi'}</p>
                                </div>
                                <dl className="grid gap-4 p-5 text-sm">
                                    <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Perusahaan</dt><dd className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedCompany?.name || '-'}</dd></div>
                                    <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Pelabuhan</dt><dd className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedPort?.name || '-'}</dd></div>
                                    <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">ETA</dt><dd className="mt-1 font-semibold tabular-nums text-[#0B1F63] dark:text-[#F1F5F9]">{formatDate(form.data.eta_at)}</dd></div>
                                    <div><dt className="text-xs text-[#52658E] dark:text-[#94A3B8]">Penanggung jawab</dt><dd className="mt-1 font-semibold text-[#0B1F63] dark:text-[#F1F5F9]">{selectedAssignee?.name || '-'}</dd></div>
                                </dl>
                            </Card>

                            {/* <div className="rounded-2xl border border-[#9FC7EF] bg-[#F0F8FF] p-4 text-sm leading-6 text-[#285585] dark:border-[#285585] dark:bg-[#102642] dark:text-[#B5C8DC]">
                                <p className="font-bold text-[#082870] dark:text-[#F1F5F9]">Nomor job dibuat otomatis</p>
                                <p className="mt-1">Sistem membuat nomor SPK internal dan job kunjungan setelah data berhasil disimpan.</p>
                            </div> */}
                        </aside>
                    </div>

                    <div className="mt-4 border-t border-[#DCEAF8] bg-white px-1 py-3 md:sticky md:bottom-0 md:z-20 md:mt-5 md:bg-white/95 md:backdrop-blur-sm dark:border-[#1E3A5F] dark:bg-[#071322] md:dark:bg-[#071322]/95">
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" onClick={() => form.isDirty ? setShowCancelConfirmation(true) : router.visit('/work-orders')} className="flex-1 sm:flex-none">
                                    Batal
                                </Button>
                                {currentStep > 0 && <Button type="button" variant="outline" onClick={goToPreviousStep} className="flex-1 sm:flex-none">Kembali</Button>}
                            </div>

                            {currentStep < steps.length - 1 ? (
                                <Button type="submit" rightIcon={<ArrowRight aria-hidden="true" className="size-4" />} className="w-full sm:w-auto">
                                    Lanjut ke {steps[currentStep + 1].title}
                                </Button>
                            ) : (
                                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                    <Button type="button" variant="secondary" disabled={form.processing} onClick={() => submit('draft')} className="w-full sm:w-auto">
                                        Simpan sebagai Draft
                                    </Button>
                                    <Button type="button" isLoading={form.processing} onClick={() => submit('active')} className="w-full sm:w-auto">
                                        {form.processing ? 'Menyimpan…' : 'Buat & Aktifkan SPK'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            <ConfirmDialog
                isOpen={showCancelConfirmation}
                title="Batalkan pembuatan SPK?"
                description="Data yang sudah Anda isi pada halaman ini belum tersimpan."
                confirmLabel="Buang perubahan"
                confirmVariant="danger"
                onClose={() => setShowCancelConfirmation(false)}
                onConfirm={() => router.visit('/work-orders')}
            />

            {/* Modal Tambah Perusahaan / Klien */}
            <Modal
                isOpen={isAddCompanyOpen}
                onClose={() => !isSubmittingCompany && setIsAddCompanyOpen(false)}
                title={
                    <div className="flex items-center gap-2.5 text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52] dark:text-[#38BDF8]">
                            <Building2 aria-hidden="true" className="size-5" />
                        </span>
                        <span>Tambah Perusahaan / Klien</span>
                    </div>
                }
                subtitle="Daftarkan perusahaan pemilik atau agen kapal yang tercatat dalam SPK."
                size="lg"
                footer={
                    <div className="flex w-full items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isSubmittingCompany}
                            onClick={() => setIsAddCompanyOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            isLoading={isSubmittingCompany}
                            onClick={() => handleSaveCompany()}
                        >
                            Simpan Perusahaan
                        </Button>
                    </div>
                }
            >
                <form
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveCompany();
                    }}
                    className="space-y-4"
                >
                    <FormErrorSummary errors={companyErrors} />
                    <Input
                        id="company-modal-name"
                        name="name"
                        required
                        autoFocus
                        label="Nama Perusahaan"
                        placeholder="Contoh: PT Pelayaran Bahari Mandiri"
                        value={companyFormData.name}
                        onChange={(e) => {
                            setCompanyFormData((prev) => ({ ...prev, name: e.target.value }));
                            if (companyErrors.name) setCompanyErrors((prev) => ({ ...prev, name: '' }));
                        }}
                        error={companyErrors.name}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            id="company-modal-code"
                            name="code"
                            label="Kode Singkatan (Opsional)"
                            placeholder="Contoh: PBM (otomatis jika kosong)"
                            value={companyFormData.code}
                            onChange={(e) => setCompanyFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            error={companyErrors.code}
                            helperText="Maksimal 10 karakter"
                        />
                        <Input
                            id="company-modal-phone"
                            name="phone"
                            label="Nomor Telepon (Opsional)"
                            placeholder="Contoh: 021-5551234 / 0812..."
                            value={companyFormData.phone}
                            onChange={(e) => setCompanyFormData((prev) => ({ ...prev, phone: e.target.value }))}
                            error={companyErrors.phone}
                        />
                    </div>
                    <Input
                        id="company-modal-email"
                        name="email"
                        type="email"
                        label="Email Perusahaan (Opsional)"
                        placeholder="Contoh: agency@perusahaan.co.id"
                        value={companyFormData.email}
                        onChange={(e) => setCompanyFormData((prev) => ({ ...prev, email: e.target.value }))}
                        error={companyErrors.email}
                    />
                    <Textarea
                        id="company-modal-address"
                        name="address"
                        label="Alamat Kantor (Opsional)"
                        placeholder="Alamat kantor atau domisili perusahaan..."
                        rows={3}
                        value={companyFormData.address}
                        onChange={(e) => setCompanyFormData((prev) => ({ ...prev, address: e.target.value }))}
                        error={companyErrors.address}
                    />
                </form>
            </Modal>

            {/* Modal Tambah Kapal */}
            <Modal
                isOpen={isAddShipOpen}
                onClose={() => !isSubmittingShip && setIsAddShipOpen(false)}
                title={
                    <div className="flex items-center gap-2.5 text-lg font-extrabold text-[#0B1F63] dark:text-[#F1F5F9]">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-[#E0F0FF] text-[#0060F4] dark:bg-[#152E52] dark:text-[#38BDF8]">
                            <Ship aria-hidden="true" className="size-5" />
                        </span>
                        <span>Tambah Kapal Baru</span>
                    </div>
                }
                subtitle="Daftarkan armada kapal ke dalam Master Kapal untuk kunjungan ini."
                size="lg"
                footer={
                    <div className="flex w-full items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isSubmittingShip}
                            onClick={() => setIsAddShipOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            isLoading={isSubmittingShip}
                            onClick={() => handleSaveShip()}
                        >
                            Simpan Kapal
                        </Button>
                    </div>
                }
            >
                <form
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveShip();
                    }}
                    className="space-y-4"
                >
                    <FormErrorSummary errors={shipErrors} />

                    {/* Perusahaan Pemilik (Hierarchy: Perusahaan Terlebih Dahulu) */}
                    <div className="rounded-2xl border border-[#DCEAF8] bg-[#F0F8FF] p-4 dark:border-[#1E3A5F] dark:bg-[#102642]">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <label htmlFor="ship-modal-company" className="text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Perusahaan Pemilik / Klien <span className="text-[#C62840] dark:text-[#F87171]">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    handleOpenAddCompany();
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#0060F4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0060F4] dark:text-[#38BDF8]"
                            >
                                <Plus aria-hidden="true" className="size-3" />
                                <span>Tambah Perusahaan Baru</span>
                            </button>
                        </div>
                        <select
                            id="ship-modal-company"
                            required
                            value={shipFormData.ship_company_id}
                            onChange={(e) => {
                                setShipFormData((prev) => ({ ...prev, ship_company_id: e.target.value }));
                                if (shipErrors.ship_company_id) setShipErrors((prev) => ({ ...prev, ship_company_id: '' }));
                            }}
                            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0B1F63] focus:border-[#0060F4] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/20 dark:bg-[#0C1D36] dark:text-[#F1F5F9] ${shipErrors.ship_company_id
                                ? 'border-[#C62840] ring-1 ring-[#C62840] dark:border-[#EF4444]'
                                : 'border-[#DCEAF8] dark:border-[#1E3A5F]'
                                }`}
                        >
                            <option value="">-- Pilih Perusahaan Terlebih Dahulu --</option>
                            {companyList.map((comp) => (
                                <option key={comp.id} value={comp.id}>
                                    {comp.name}
                                </option>
                            ))}
                        </select>
                        {shipErrors.ship_company_id && (
                            <p className="mt-1.5 text-xs font-semibold text-[#C62840] dark:text-[#F87171]">
                                {shipErrors.ship_company_id}
                            </p>
                        )}
                        <p className="mt-2 text-xs text-[#52658E] dark:text-[#94A3B8]">
                            Kapal wajib terdaftar di bawah perusahaan pemilik kapal/klien. Pastikan perusahaan dipilih atau ditambahkan terlebih dahulu.
                        </p>
                    </div>

                    <Input
                        id="ship-modal-name"
                        name="name"
                        required
                        label="Nama Kapal"
                        placeholder="Contoh: TB Samudra Jaya 01 / BG Andalas Perkasa"
                        value={shipFormData.name}
                        onChange={(e) => {
                            setShipFormData((prev) => ({ ...prev, name: e.target.value }));
                            if (shipErrors.name) setShipErrors((prev) => ({ ...prev, name: '' }));
                        }}
                        error={shipErrors.name}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="ship-modal-type" className="mb-1.5 block text-xs font-bold text-[#0B1F63] dark:text-[#F1F5F9]">
                                Jenis Kapal
                            </label>
                            <select
                                id="ship-modal-type"
                                value={shipFormData.ship_type}
                                onChange={(e) => setShipFormData((prev) => ({ ...prev, ship_type: e.target.value }))}
                                className="w-full rounded-xl border border-[#DCEAF8] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0B1F63] focus:border-[#0060F4] focus:outline-none focus:ring-2 focus:ring-[#0060F4]/20 dark:border-[#1E3A5F] dark:bg-[#0C1D36] dark:text-[#F1F5F9]"
                            >
                                <option value="Tugboat">Tugboat (Kapal Tunda)</option>
                                <option value="Tongkang / Barge">Tongkang / Barge</option>
                                <option value="General Cargo">General Cargo</option>
                                <option value="Bulk Carrier">Bulk Carrier</option>
                                <option value="Tanker">Tanker (Oil / Chemical / Gas)</option>
                                <option value="Container">Container / Peti Kemas</option>
                                <option value="SPOB">SPOB (Self Propelled Oil Barge)</option>
                                <option value="LCT">LCT (Landing Craft Tank)</option>
                                <option value="Supply Vessel">Supply Vessel / AHTS</option>
                                <option value="Kapal Penumpang">Kapal Penumpang / Ferry</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <Input
                            id="ship-modal-imo"
                            name="imo_number"
                            label="Nomor IMO (Opsional)"
                            placeholder="Contoh: 9876543"
                            value={shipFormData.imo_number}
                            onChange={(e) => setShipFormData((prev) => ({ ...prev, imo_number: e.target.value }))}
                            error={shipErrors.imo_number}
                        />
                    </div>

                    <Input
                        id="ship-modal-callsign"
                        name="call_sign"
                        label="Call Sign (Opsional)"
                        placeholder="Contoh: YDA123"
                        value={shipFormData.call_sign}
                        onChange={(e) => setShipFormData((prev) => ({ ...prev, call_sign: e.target.value }))}
                        error={shipErrors.call_sign}
                    />
                    <Input
                        id="ship-modal-gt"
                        name="gross_tonnage"
                        type="number"
                        min="0"
                        step="any"
                        label="Gross Tonnage / GT (Opsional)"
                        placeholder="Contoh: 3500"
                        value={shipFormData.gross_tonnage}
                        onChange={(e) => setShipFormData((prev) => ({ ...prev, gross_tonnage: e.target.value }))}
                        error={shipErrors.gross_tonnage}
                    />
                    <Input
                        id="ship-modal-flag"
                        name="flag"
                        label="Bendera Kapal"
                        placeholder="Contoh: Indonesia"
                        value={shipFormData.flag}
                        onChange={(e) => setShipFormData((prev) => ({ ...prev, flag: e.target.value }))}
                        error={shipErrors.flag}
                    />

                    <PhotoUploadPicker
                        label="Foto Kapal (Opsional)"
                        value={shipFormData.image}
                        onChange={(file) => {
                            setShipFormData((previous) => ({ ...previous, image: file }));
                            if (shipErrors.image) {
                                setShipErrors((previous) => ({ ...previous, image: '' }));
                            }
                        }}
                        mode="both"
                        accept="image/jpeg,image/png,image/webp"
                        maxSizeMb={5}
                        variant="compact"
                        error={shipErrors.image}
                        helperText="JPG, PNG, atau WebP. Maksimal 5 MB."
                    />
                </form>
            </Modal>
        </AppLayout>
    );
}
