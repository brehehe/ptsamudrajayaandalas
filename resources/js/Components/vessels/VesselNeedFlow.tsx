import React, { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    Pencil,
    Phone,
    Send,
    Trash2,
} from 'lucide-react';
import PhotoUploadPicker from '../forms/PhotoUploadPicker';
import Input from '../forms/Input';
import DateTimePicker from '../forms/DateTimePicker';
import Textarea from '../forms/Textarea';
import Select from '../selects/Select';
import RadioGroup from '../forms/Radio';
import Modal from '../overlays/Modal';
import type { MasterProduct, Ship } from './types';
import { formatEtaDateTime } from './format';
import ShipImage from './ShipImage';
import FormErrorSummary from '../forms/FormErrorSummary';

export type NeedFlowStep = 'none' | 'header' | 'items' | 'review' | 'success';

interface NeedItem {
    product_id?: string;
    item_name: string;
    is_custom: boolean;
    quantity: number | string;
    unit: string;
    notes: string;
    required_date: string;
    required_time: string;
    is_urgent: boolean;
}

interface HeaderValidationErrors {
    section?: string;
    sectionOther?: string;
    date?: string;
    orderedByName?: string;
    orderedByPhone?: string;
}

interface ItemValidationErrors {
    urgency?: string;
    product?: string;
    itemName?: string;
    quantity?: string;
    unit?: string;
}

const CUSTOM_PRODUCT_VALUE = '__custom_product__';

const getTodayDateInputValue = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const formatIndonesianDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const months = [
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
            ];
            return `${day} ${months[month]} ${year}`;
        }
    } catch {
        // fallback
    }
    return dateStr;
};

interface VesselNeedFlowProps {
    vessel: Ship;
    products: MasterProduct[];
    portCallId?: string;
    clientPicName?: string | null;
    clientPicContact?: string | null;
    step: NeedFlowStep;
    section?: string;
    onSectionChange?: (section: string) => void;
    onStepChange: (step: NeedFlowStep) => void;
    onReturnToOverview: () => void;
}

export default function VesselNeedFlow({
    vessel,
    products,
    portCallId,
    clientPicName,
    clientPicContact,
    step: needFlowStep,
    section: initialSection,
    onSectionChange,
    onStepChange,
    onReturnToOverview,
}: VesselNeedFlowProps) {
    // Form state for Tambah Kebutuhan
    const [formSection, setFormSection] = useState<'Deck' | 'Engine' | 'Lainnya'>('Deck');
    const [formSectionOther, setFormSectionOther] = useState('');
    const [formDate, setFormDate] = useState(getTodayDateInputValue);
    const [formOrderedByName, setFormOrderedByName] = useState(clientPicName || vessel.captain_name || '');
    const [formOrderedByPhone, setFormOrderedByPhone] = useState(clientPicContact || vessel.captain_phone || '');

    useEffect(() => {
        setFormOrderedByName(clientPicName || vessel.captain_name || '');
        setFormOrderedByPhone(clientPicContact || vessel.captain_phone || '');
    }, [clientPicContact, clientPicName, portCallId, vessel.captain_name, vessel.captain_phone]);

    // Sync section with parent and OverviewTab
    useEffect(() => {
        const effectiveSection = formSection === 'Lainnya'
            ? (formSectionOther.trim() || 'Lainnya')
            : formSection;
        onSectionChange?.(effectiveSection);
    }, [formSection, formSectionOther, onSectionChange]);

    // Items list (with detail "Dibutuhkan Pada" per item as requested)
    const [itemsList, setItemsList] = useState<NeedItem[]>([
        {
            product_id: '',
            item_name: '',
            is_custom: false,
            quantity: '',
            unit: '',
            notes: '',
            is_urgent: false,
            required_date: '',
            required_time: '',
        },
    ]);

    // Document photo upload
    const [formPhoto, setFormPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
    const [submissionMessage, setSubmissionMessage] = useState('');
    const [submissionError, setSubmissionError] = useState('');
    const [submissionErrors, setSubmissionErrors] = useState<Record<string, string>>({});
    const [submittedRequestNumber, setSubmittedRequestNumber] = useState('');
    const [submittedRequestId, setSubmittedRequestId] = useState('');
    const [photoError, setPhotoError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [headerErrors, setHeaderErrors] = useState<HeaderValidationErrors>({});
    const [itemErrors, setItemErrors] = useState<Record<number, ItemValidationErrors>>({});

    const clearHeaderError = (field: keyof HeaderValidationErrors) => {
        setHeaderErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    };

    const clearItemError = (index: number, field: keyof ItemValidationErrors) => {
        setItemErrors((currentErrors) => ({
            ...currentErrors,
            [index]: { ...currentErrors[index], [field]: undefined },
        }));
    };

    const handleContinueToItems = () => {
        const errors: HeaderValidationErrors = {};

        if (!formSection) {
            errors.section = 'Pilih bagian kapal terlebih dahulu.';
        }
        if (formSection === 'Lainnya' && !formSectionOther.trim()) {
            errors.sectionOther = 'Nama bagian lainnya wajib diisi.';
        }
        if (!formDate) {
            errors.date = 'Tanggal form wajib diisi.';
        }
        if (!formOrderedByName.trim()) {
            errors.orderedByName = 'Nama nahkoda wajib diisi.';
        }
        if (!formOrderedByPhone.trim()) {
            errors.orderedByPhone = 'Nomor HP nahkoda wajib diisi.';
        } else if (!/^[0-9+().\s-]{8,20}$/.test(formOrderedByPhone.trim())) {
            errors.orderedByPhone = 'Masukkan nomor HP yang valid (8–20 karakter).';
        }

        setHeaderErrors(errors);

        if (Object.keys(errors).length === 0) {
            onStepChange('items');
        }
    };

    const handleContinueToReview = () => {
        const errors: Record<number, ItemValidationErrors> = {};

        itemsList.forEach((item, index) => {
            const itemValidationErrors: ItemValidationErrors = {};

            if (item.is_urgent === null) {
                itemValidationErrors.urgency = 'Pilih prioritas kebutuhan.';
            }
            if (!item.product_id && !item.is_custom) {
                itemValidationErrors.product = 'Pilih produk atau opsi Lainnya.';
            }
            if (item.is_custom && !item.item_name.trim()) {
                itemValidationErrors.itemName = 'Nama barang lainnya wajib diisi.';
            }
            if (item.quantity === '' || Number(item.quantity) <= 0) {
                itemValidationErrors.quantity = 'Jumlah harus lebih dari 0.';
            }
            if (!item.unit.trim()) {
                itemValidationErrors.unit = 'Satuan wajib diisi.';
            }

            if (Object.keys(itemValidationErrors).length > 0) {
                errors[index] = itemValidationErrors;
            }
        });

        setItemErrors(errors);

        if (Object.keys(errors).length === 0) {
            onStepChange('review');
        }
    };

    // Handle Item Change
    const updateItem = <K extends keyof NeedItem>(index: number, field: K, value: NeedItem[K]) => {
        setItemsList((currentItems) =>
            currentItems.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item
            )
        );
    };

    // Selecting a Product from Master Produk & Katalog Layanan
    const handleSelectProduct = (index: number, productId: string) => {
        const prod = products.find((p) => p.id === productId);
        setItemsList((currentItems) =>
            currentItems.map((item, itemIndex) => {
                if (itemIndex !== index) {
                    return item;
                }

                if (productId === CUSTOM_PRODUCT_VALUE) {
                    return {
                        ...item,
                        product_id: '',
                        item_name: '',
                        unit: '',
                        is_custom: true,
                    };
                }

                return prod
                    ? {
                        ...item,
                        product_id: prod.id,
                        item_name: prod.name,
                        unit: prod.unit || 'Unit',
                        is_custom: false,
                    }
                    : {
                        ...item,
                        product_id: '',
                        item_name: '',
                        unit: '',
                        is_custom: false,
                    };
            })
        );
    };

    const addItem = () => {
        setItemErrors({});
        setItemsList((currentItems) => [
            ...currentItems,
            {
                product_id: '',
                item_name: '',
                is_custom: false,
                quantity: '',
                unit: '',
                notes: '',
                is_urgent: false,
                required_date: '',
                required_time: '',
            },
        ]);
    };

    const removeItem = (index: number) => {
        setItemErrors({});
        setItemsList((currentItems) =>
            currentItems.length > 1
                ? currentItems.filter((_, itemIndex) => itemIndex !== index)
                : currentItems
        );
    };

    const clearSelectedPhoto = () => {
        if (photoPreview) {
            URL.revokeObjectURL(photoPreview);
        }

        setFormPhoto(null);
        setPhotoPreview(null);
        setIsPhotoViewerOpen(false);

        if (photoInputRef.current) {
            photoInputRef.current.value = '';
        }
    };

    // Photo selection
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            clearSelectedPhoto();
            setPhotoError('File harus berupa gambar.');

            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            clearSelectedPhoto();
            setPhotoError('Ukuran gambar maksimal 5 MB.');

            return;
        }

        if (photoPreview) {
            URL.revokeObjectURL(photoPreview);
        }

        setPhotoError('');
        setFormPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    // Submit the completed need request.
    const handleFinalSubmit = () => {
        if (isSubmitting) return;
        if (!portCallId) {
            setSubmissionError('Pilih Kunjungan / Job aktif sebelum membuat kebutuhan.');
            return;
        }
        setIsSubmitting(true);
        setSubmissionError('');
        setSubmissionErrors({});

        const formData = new FormData();
        formData.append('ship_id', vessel.id);
        formData.append('port_call_id', portCallId);
        formData.append('section', formSection === 'Lainnya' ? formSectionOther : formSection);
        formData.append('ordered_by_name', formOrderedByName);
        formData.append('ordered_by_phone', formOrderedByPhone);
        formData.append('request_date', formDate);
        formData.append('status', 'Menunggu Approval');

        itemsList.forEach((it, idx) => {
            formData.append(`items[${idx}][item_name]`, it.item_name);
            formData.append(`items[${idx}][quantity]`, String(it.quantity));
            formData.append(`items[${idx}][unit]`, it.unit);
            formData.append(`items[${idx}][notes]`, it.notes || '');
            if (it.is_urgent !== null) {
                formData.append(`items[${idx}][is_urgent]`, it.is_urgent ? '1' : '0');
            }
            formData.append(`items[${idx}][required_date]`, it.required_date);
            formData.append(`items[${idx}][required_time]`, it.required_time);
            if (it.product_id) {
                formData.append(`items[${idx}][product_id]`, it.product_id);
            }
        });

        if (formPhoto) {
            formData.append('photo', formPhoto);
        }

        router.post('/needs', formData, {
            forceFormData: true,
            onSuccess: (page) => {
                const flash = page.props.flash as
                    | {
                        success?: string;
                        error?: string;
                        submitted_request_number?: string;
                        submitted_request_id?: string;
                    }
                    | undefined;

                if (flash?.error) {
                    setSubmissionError(flash.error);
                    return;
                }

                const reqNum =
                    flash?.submitted_request_number ||
                    flash?.success?.match(/REQ-[0-9]+-[0-9]+/)?.[0] ||
                    `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`;

                setSubmittedRequestNumber(reqNum);
                if (flash?.submitted_request_id) {
                    setSubmittedRequestId(flash.submitted_request_id);
                }
                setSubmissionMessage(flash?.success || 'Kebutuhan berhasil disimpan.');
                setSubmissionErrors({});
                onStepChange('success');
            },
            onError: (errors) => {
                const validationErrors = errors as Record<string, string>;
                const firstError = Object.values(validationErrors)[0];

                setSubmissionErrors(validationErrors);
                setSubmissionError(typeof firstError === 'string' ? firstError : 'Kebutuhan gagal disimpan.');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const flowProgress = (activeStep: Exclude<NeedFlowStep, 'none' | 'success'>) => {
        const steps = [
            { key: 'header', label: 'Informasi' },
            { key: 'items', label: 'Item' },
            { key: 'review', label: 'Review' },
        ] as const;
        const activeIndex = steps.findIndex((step) => step.key === activeStep);

        return (
            <ol aria-label="Tahapan tambah kebutuhan" className="ml-auto hidden items-center gap-2 md:flex">
                {steps.map((step, index) => {
                    const isCurrent = step.key === activeStep;
                    const isComplete = index < activeIndex;

                    return (
                        <React.Fragment key={step.key}>
                            {index > 0 && (
                                <span
                                    aria-hidden="true"
                                    className={`h-px w-6 ${isComplete || isCurrent ? 'bg-[#0060F4]' : 'bg-[#DCEAF8] dark:bg-[#1E3A5F]'}`}
                                />
                            )}
                            <li
                                aria-current={isCurrent ? 'step' : undefined}
                                className={`flex items-center gap-2 text-xs font-bold ${isCurrent || isComplete
                                    ? 'text-[#0060F4] dark:text-[#60A5FA]'
                                    : 'text-[#8C9BB9] dark:text-[#64748B]'
                                    }`}
                            >
                                <span
                                    className={`flex size-7 items-center justify-center rounded-full border ${isCurrent || isComplete
                                        ? 'border-[#0060F4] bg-[#0060F4] text-white'
                                        : 'border-[#DCEAF8] bg-white dark:border-[#1E3A5F] dark:bg-[#071322]'
                                        }`}
                                >
                                    {isComplete ? (
                                        <CheckCircle2 aria-hidden="true" className="size-4" />
                                    ) : (
                                        index + 1
                                    )}
                                </span>
                                <span>{step.label}</span>
                            </li>
                        </React.Fragment>
                    );
                })}
            </ol>
        );
    };

    return (
        <>
            {needFlowStep === 'header' && (
                <div
                    className={
                        'bg-sja-surface min-h-[calc(100dvh-3.5rem)] ' +
                        'pb-[calc(7rem+env(safe-area-inset-bottom))] md:min-h-0 md:overflow-hidden md:pb-0 ' +
                        'md:rounded-2xl md:border md:border-[#DCEAF8] md:bg-white md:shadow-sm ' +
                        'dark:md:border-[#1E3A5F] dark:md:bg-[#0C1D36]'
                    }
                >
                    {/* Top Bar: ← Tambah Kebutuhan */}
                    <div
                        className={
                            'sticky top-0 z-30 flex items-center gap-3 border-b border-[#DCEAF8] ' +
                            'bg-white px-4 py-3 dark:border-[#1E3A5F] dark:bg-[#0C1D36] ' +
                            'md:static md:px-6 md:py-5'
                        }
                    >
                        <button
                            type="button"
                            onClick={() => onStepChange('none')}
                            aria-label="Kembali ke detail kapal"
                            className={
                                'size-11 -ml-3 flex items-center justify-center rounded-xl ' +
                                'text-[#082870] dark:text-white focus-visible:outline-2 ' +
                                'focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]'
                            }
                        >
                            <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2.5} />
                        </button>
                        <div>
                            <h2 className="text-balance text-base font-extrabold text-[#082870] md:text-lg dark:text-white">
                                Tambah Kebutuhan
                            </h2>
                            <p className="hidden text-xs text-[#52658E] md:block dark:text-[#94A3B8]">
                                Lengkapi informasi pemesan dan kebutuhan kapal.
                            </p>
                        </div>
                        {flowProgress('header')}
                    </div>

                    <div className="space-y-6 py-4 md:p-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                        {/* Ship Preview Card */}
                        <div className="px-4 md:px-0 lg:col-span-2">
                            <div
                                className={
                                    'flex items-center gap-3 rounded-2xl border border-[#BCE0FD] ' +
                                    'bg-[#F0F8FF] p-3 shadow-xs dark:border-[#1E3A5F] ' +
                                    'dark:bg-[#071322] md:p-4'
                                }
                            >
                                <ShipImage
                                    src={vessel.image}
                                    alt={vessel.name}
                                    className={
                                        'h-20 w-20 shrink-0 rounded-xl border border-[#BCE0FD] ' +
                                        'object-cover dark:border-[#1E3A5F]'
                                    }
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                    <h3 className="truncate text-sm font-bold text-[#082870] dark:text-white">
                                        {vessel.name}
                                    </h3>
                                    <div>
                                        <span
                                            className={
                                                'inline-flex rounded-full bg-[#FEF3C7] px-2.5 ' +
                                                'py-0.5 text-[10px] font-bold text-[#D97706]'
                                            }
                                        >
                                            {vessel.status}
                                        </span>
                                    </div>
                                    <p className="truncate text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        {vessel.company?.name || 'Perusahaan belum diisi'}
                                    </p>
                                    <p className="flex items-center gap-1.5 text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                        <CalendarDays aria-hidden="true" className="size-3.5" />
                                        <span>{formatEtaDateTime(vessel.eta)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Section: Informasi Kapal (Otomatis) */}
                        <section className="space-y-3 px-4 md:px-0 lg:rounded-2xl lg:border lg:border-[#DCEAF8] lg:p-5 dark:lg:border-[#1E3A5F] dark:lg:bg-[#071322]/40">
                            <h4 className="text-lg font-bold text-[#082870] dark:text-white">
                                Informasi Kapal (Otomatis)
                            </h4>
                            <div className="space-y-3">
                                <Input
                                    label="Perusahaan Pelayaran"
                                    value={
                                        vessel.company?.name || 'Perusahaan belum diisi'
                                    }
                                    disabled
                                    aria-label="Perusahaan pelayaran otomatis"
                                    sizeVariant="sm"
                                    className={
                                        'font-semibold disabled:cursor-not-allowed ' +
                                        'disabled:border-[#BCE0FD] disabled:bg-[#F0F8FF] ' +
                                        'disabled:text-[#082870] disabled:opacity-100 ' +
                                        'dark:disabled:border-[#1E3A5F] ' +
                                        'dark:disabled:bg-[#0C1D36] dark:disabled:text-[#BFDBFE]'
                                    }
                                />
                                <Input
                                    label="Alamat Perusahaan"
                                    value={
                                        vessel.company?.address || 'Alamat belum diisi'
                                    }
                                    disabled
                                    aria-label="Alamat perusahaan otomatis"
                                    sizeVariant="sm"
                                    className={
                                        'font-semibold disabled:cursor-not-allowed ' +
                                        'disabled:border-[#BCE0FD] disabled:bg-[#F0F8FF] ' +
                                        'disabled:text-[#082870] disabled:opacity-100 ' +
                                        'dark:disabled:border-[#1E3A5F] ' +
                                        'dark:disabled:bg-[#0C1D36] dark:disabled:text-[#BFDBFE]'
                                    }
                                />
                                <Input
                                    label="Nama Kapal"
                                    value={vessel.name}
                                    disabled
                                    aria-label="Nama kapal otomatis"
                                    sizeVariant="sm"
                                    className={
                                        'font-semibold disabled:cursor-not-allowed ' +
                                        'disabled:border-[#BCE0FD] disabled:bg-[#F0F8FF] ' +
                                        'disabled:text-[#082870] disabled:opacity-100 ' +
                                        'dark:disabled:border-[#1E3A5F] ' +
                                        'dark:disabled:bg-[#0C1D36] dark:disabled:text-[#BFDBFE]'
                                    }
                                />
                            </div>
                        </section>

                        {/* Section: Informasi Form Kapal */}
                        <section className="space-y-3 px-4 md:px-0 lg:rounded-2xl lg:border lg:border-[#DCEAF8] lg:p-5 dark:lg:border-[#1E3A5F] dark:lg:bg-[#071322]/40">
                            <h4 className="text-lg font-bold text-[#082870] dark:text-white">
                                Informasi Form Kapal
                            </h4>

                            <div className="space-y-4 text-xs">
                                {/* Bagian * */}
                                <div>
                                    <label className="font-bold text-[#082870] dark:text-white block mb-1.5">
                                        Bagian <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Deck', 'Engine', 'Lainnya'] as const).map((b) => (
                                            <button
                                                key={b}
                                                type="button"
                                                onClick={() => {
                                                    setFormSection(b);
                                                    clearHeaderError('section');
                                                    if (b !== 'Lainnya') {
                                                        clearHeaderError('sectionOther');
                                                    }
                                                }}
                                                aria-pressed={formSection === b}
                                                className={`min-h-11 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${formSection === b
                                                    ? 'bg-[#0060F4] text-white shadow-xs'
                                                    : 'border border-[#DCEAF8] bg-[#F0F8FF] text-[#082870] hover:border-[#0060F4]/40 dark:border-[#1E3A5F] dark:bg-[#071322] dark:text-[#BFDBFE]'
                                                    }`}
                                            >
                                                {b}
                                            </button>
                                        ))}
                                    </div>
                                    {headerErrors.section && (
                                        <p className="mt-1.5 text-[11px] font-semibold text-[#C62840] dark:text-[#F87171]">
                                            {headerErrors.section}
                                        </p>
                                    )}
                                    {formSection === 'Lainnya' && (
                                        <Input
                                            type="text"
                                            aria-label="Bagian lainnya"
                                            value={formSectionOther}
                                            onChange={(e) => {
                                                setFormSectionOther(e.target.value);
                                                clearHeaderError('sectionOther');
                                            }}
                                            placeholder="Tulis bagian lainnya (jika Lainnya)"
                                            className="mt-2"
                                            sizeVariant="sm"
                                            error={headerErrors.sectionOther}
                                        />
                                    )}
                                </div>

                                {/* Tanggal / Bulan / Tahun * */}
                                <Input
                                    label="Tanggal / Bulan / Tahun"
                                    type="date"
                                    required
                                    value={formDate}
                                    onChange={(e) => {
                                        setFormDate(e.target.value);
                                        clearHeaderError('date');
                                    }}
                                    sizeVariant="sm"
                                    error={headerErrors.date}
                                />

                                {/* Nama Pemesan / Nahkoda * */}
                                <Input
                                    label="Nama Pemesan (Nahkoda)"
                                    type="text"
                                    required
                                    value={formOrderedByName}
                                    onChange={(e) => {
                                        setFormOrderedByName(e.target.value);
                                        clearHeaderError('orderedByName');
                                    }}
                                    placeholder="Nama nahkoda belum tersedia"
                                    sizeVariant="sm"
                                    error={headerErrors.orderedByName}
                                />

                                {/* Nomor Telepon / Nomor HP * */}
                                <Input
                                    label="Nomor Telepon (Nomor HP)"
                                    type="tel"
                                    required
                                    inputMode="tel"
                                    maxLength={20}
                                    value={formOrderedByPhone}
                                    onChange={(e) => {
                                        setFormOrderedByPhone(e.target.value);
                                        clearHeaderError('orderedByPhone');
                                    }}
                                    placeholder="Nomor HP nahkoda belum tersedia"
                                    leftIcon={<Phone aria-hidden="true" className="size-4" />}
                                    sizeVariant="sm"
                                    error={headerErrors.orderedByPhone}
                                />
                            </div>
                        </section>

                        {/* Button: Lanjut ke Detail Item */}
                        <div className="px-4 md:px-0 lg:col-start-2">
                            <button
                                type="button"
                                onClick={handleContinueToItems}
                                className={
                                    'w-full min-h-11 py-3 rounded-xl bg-[#0060F4] ' +
                                    'hover:bg-[#0052D4] text-white text-xs font-bold shadow-sm ' +
                                    'transition-colors focus-visible:outline-2 ' +
                                    'focus-visible:outline-offset-2 ' +
                                    'focus-visible:outline-[#0060F4]'
                                }
                            >
                                Lanjutkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                    SUB-FLOW C: STEP 2 - TAMBAH KEBUTUHAN (DETAIL ITEM - SCREEN 4)
                   ───────────────────────────────────────────────────────────── */}
            {needFlowStep === 'items' && (
                <div
                    className={
                        'bg-sja-surface min-h-[calc(100dvh-3.5rem)] ' +
                        'pb-[calc(7rem+env(safe-area-inset-bottom))] md:min-h-0 md:overflow-hidden md:pb-0 ' +
                        'md:rounded-2xl md:border md:border-[#DCEAF8] md:bg-white md:shadow-sm ' +
                        'dark:md:border-[#1E3A5F] dark:md:bg-[#0C1D36]'
                    }
                >
                    {/* Top Bar: ← Tambah Kebutuhan */}
                    <div
                        className={
                            'sticky top-0 z-30 flex items-center gap-3 border-b border-[#DCEAF8] ' +
                            'bg-white px-4 py-3 dark:border-[#1E3A5F] dark:bg-[#0C1D36] ' +
                            'md:static md:px-6 md:py-5'
                        }
                    >
                        <button
                            type="button"
                            onClick={() => onStepChange('header')}
                            aria-label="Kembali ke informasi form kapal"
                            className={
                                'size-11 -ml-3 flex items-center justify-center rounded-xl ' +
                                'text-[#082870] dark:text-white focus-visible:outline-2 ' +
                                'focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]'
                            }
                        >
                            <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2.5} />
                        </button>
                        <div>
                            <h2 className="text-balance text-base font-extrabold text-[#082870] md:text-lg dark:text-white">
                                Tambah Kebutuhan
                            </h2>
                            <p className="hidden text-xs text-[#52658E] md:block dark:text-[#94A3B8]">
                                Tambahkan barang, jumlah, dan jadwal kebutuhan.
                            </p>
                        </div>
                        {flowProgress('items')}
                    </div>

                    <div className="space-y-6 py-4 md:p-6">
                        <div className="px-4 md:px-0">
                            <h3 className="text-balance text-sm font-bold text-[#082870] md:text-base dark:text-white">
                                Detail Kebutuhan
                            </h3>
                            <p className="text-pretty text-xs text-[#52658E] dark:text-[#94A3B8]">
                                Input semua item kebutuhan sesuai form kapal.
                            </p>
                        </div>

                        <div className="space-y-6 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.75fr)] md:items-start md:gap-6 md:space-y-0">
                            <div className="space-y-4">
                                {/* Items List */}
                                <div className="divide-y divide-[var(--sja-border)] md:space-y-4 md:divide-y-0">
                                    {itemsList.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="space-y-4 px-4 py-5 text-xs first:pt-0 last:pb-0 md:rounded-2xl md:border md:border-[#DCEAF8] md:bg-[#F8FAFD] md:p-5 dark:md:border-[#1E3A5F] dark:md:bg-[#071322]/40"
                                        >
                                            <div
                                                className={
                                                    'flex items-center justify-between pb-1 border-b ' +
                                                    'border-slate-100 dark:border-[#1E3A5F]'
                                                }
                                            >
                                                <span className="font-extrabold text-xs text-[#082870] dark:text-white">
                                                    Item {idx + 1}
                                                </span>
                                                {itemsList.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(idx)}
                                                        aria-label={`Hapus item ${idx + 1}`}
                                                        className={
                                                            'flex min-h-11 items-center gap-1.5 rounded-xl px-2 ' +
                                                            'text-xs font-bold text-red-500 hover:bg-red-50 ' +
                                                            'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
                                                            'focus-visible:outline-[#C62840] dark:hover:bg-red-950/30'
                                                        }
                                                    >
                                                        <Trash2 aria-hidden="true" className="size-4" />
                                                        <span>Hapus</span>
                                                    </button>
                                                )}
                                            </div>

                                            <RadioGroup
                                                name={`item-${idx}-urgency`}
                                                label="Prioritas kebutuhan"
                                                value={item.is_urgent ? 'urgent' : 'normal'}
                                                onChange={(value) => {
                                                    updateItem(idx, 'is_urgent', value === 'urgent');
                                                    clearItemError(idx, 'urgency');
                                                }}
                                                error={itemErrors[idx]?.urgency}
                                                layout="grid-2"
                                                options={[
                                                    { value: 'normal', label: 'Normal' },
                                                    { value: 'urgent', label: 'Urgent' },
                                                ]}
                                            />

                                            {/* Nama Barang / Item (Connected to Master Produk & Katalog Layanan) */}
                                            <div>
                                                <label
                                                    htmlFor={`item-${idx}-product`}
                                                    className="font-bold text-[#082870] dark:text-white block mb-1"
                                                >
                                                    Nama Barang / Item{' '}
                                                    <span className="text-red-500">*</span>
                                                </label>

                                                {/* Dropdown / Selection from Master Produk */}
                                                <Select
                                                    id={`item-${idx}-product`}
                                                    aria-label={`Pilih produk untuk item ${idx + 1}`}
                                                    value={
                                                        item.is_custom
                                                            ? CUSTOM_PRODUCT_VALUE
                                                            : item.product_id || ''
                                                    }
                                                    onChange={(e) => {
                                                        handleSelectProduct(idx, e.target.value);
                                                        clearItemError(idx, 'product');
                                                        clearItemError(idx, 'itemName');
                                                        clearItemError(idx, 'unit');
                                                    }}
                                                    options={[
                                                        ...products.map((product) => ({
                                                            value: product.id,
                                                            label: `${product.name} (${product.unit})`,
                                                        })),
                                                        {
                                                            value: CUSTOM_PRODUCT_VALUE,
                                                            label: 'Lainnya / Tulis Manual',
                                                        },
                                                    ]}
                                                    placeholder="-- Pilih dari Master Produk SJA --"
                                                    sizeVariant="sm"
                                                    className={item.is_custom ? 'mb-1.5' : ''}
                                                    error={itemErrors[idx]?.product}
                                                />

                                                {item.is_custom && (
                                                    <Input
                                                        id={`item-${idx}-name`}
                                                        type="text"
                                                        required
                                                        value={item.item_name}
                                                        onChange={(e) => {
                                                            updateItem(idx, 'item_name', e.target.value);
                                                            clearItemError(idx, 'itemName');
                                                        }}
                                                        placeholder="Tulis nama barang atau kebutuhan lainnya"
                                                        aria-label={`Nama barang manual untuk item ${idx + 1}`}
                                                        sizeVariant="sm"
                                                        error={itemErrors[idx]?.itemName}
                                                    />
                                                )}
                                            </div>

                                            {/* Jumlah & Satuan */}
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <Input
                                                    id={`item-${idx}-quantity`}
                                                    label="Jumlah"
                                                    type="number"
                                                    required
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        updateItem(idx, 'quantity', e.target.value);
                                                        clearItemError(idx, 'quantity');
                                                    }}
                                                    sizeVariant="sm"
                                                    error={itemErrors[idx]?.quantity}
                                                />
                                                <Input
                                                    id={`item-${idx}-unit`}
                                                    label="Satuan"
                                                    type="text"
                                                    required
                                                    value={item.unit}
                                                    onChange={(e) => {
                                                        updateItem(idx, 'unit', e.target.value);
                                                        clearItemError(idx, 'unit');
                                                    }}
                                                    placeholder="Ton, Lonjor, Liter, Pcs"
                                                    sizeVariant="sm"
                                                    error={itemErrors[idx]?.unit}
                                                />
                                            </div>

                                            {/* Keterangan */}
                                            <Textarea
                                                id={`item-${idx}-notes`}
                                                label="Keterangan"
                                                rows={2}
                                                value={item.notes}
                                                onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                                                placeholder="Untuk kebutuhan operasional kapal"
                                            />

                                            <DateTimePicker
                                                id={`item-${idx}-required-at`}
                                                label="Jadwal Dibutuhkan (Per Item)"
                                                dateValue={item.required_date}
                                                timeValue={item.required_time}
                                                onDateChange={(value) =>
                                                    updateItem(idx, 'required_date', value)
                                                }
                                                onTimeChange={(value) =>
                                                    updateItem(idx, 'required_time', value)
                                                }
                                                className="border-t border-slate-100 pt-2 dark:border-[#1E3A5F]"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* + Tambah Item Lain Button */}
                                <div className="px-4 md:px-0">
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className={
                                            'flex min-h-11 w-full items-center justify-center gap-1.5 ' +
                                            'rounded-xl border-2 border-dashed border-[#0060F4] ' +
                                            'bg-sja-surface py-2.5 text-xs font-bold text-[#0060F4] ' +
                                            'hover:bg-[var(--sja-primary-soft)] ' +
                                            'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
                                            'focus-visible:outline-[#0060F4]'
                                        }
                                    >
                                        <span className="text-base font-bold">+</span>
                                        <span>Tambah Item Lain</span>
                                    </button>
                                </div>
                            </div>

                            {/* Upload Foto Form Kapal */}
                            <div className="space-y-3 px-4 md:sticky md:top-6 md:rounded-2xl md:border md:border-[#DCEAF8] md:bg-[#F8FAFD] md:p-5 dark:md:border-[#1E3A5F] dark:md:bg-[#071322]/40">
                                <h3 className="text-xs font-bold text-[#082870] dark:text-white">
                                    Upload Foto Form Kapal{' '}
                                    <span className="font-medium text-[#52658E] dark:text-[#94A3B8]">
                                        (Opsional)
                                    </span>
                                </h3>

                                <PhotoUploadPicker
                                    value={formPhoto}
                                    previewUrl={photoPreview}
                                    onChange={(file, pUrl) => {
                                        setFormPhoto(file);
                                        setPhotoPreview(pUrl || null);
                                        setPhotoError('');
                                    }}
                                    error={photoError}
                                    helperText="Tambahkan foto form asli dari kapal jika tersedia. Maksimal 5 MB."
                                />
                            </div>
                        </div>

                        {/* Bottom Navigation Buttons */}
                        <div className="flex items-center gap-3 px-4 pt-2 md:justify-end md:px-0">
                            <button
                                type="button"
                                onClick={() => onStepChange('header')}
                                className={
                                    'min-h-11 flex-1 rounded-xl border border-[#DCEAF8] bg-white ' +
                                    'px-5 py-3 text-xs font-bold text-[#082870] hover:bg-[#F0F8FF] ' +
                                    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
                                    'focus-visible:outline-[#0060F4] md:flex-none dark:border-[#1E3A5F] ' +
                                    'dark:bg-[#071322] dark:text-white dark:hover:bg-[#132847]'
                                }
                            >
                                &larr; Kembali
                            </button>
                            <button
                                type="button"
                                onClick={handleContinueToReview}
                                className="min-h-11 flex-1 rounded-xl bg-[#0060F4] px-5 py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#0052D4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] md:flex-none"
                            >
                                Simpan &amp; Lanjut &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                    SUB-FLOW D: STEP 3 - REVIEW & AJUKAN
                   ───────────────────────────────────────────────────────────── */}
            {needFlowStep === 'review' && (
                <div
                    className={
                        'bg-sja-surface min-h-[calc(100dvh-3.5rem)] ' +
                        'pb-[calc(7rem+env(safe-area-inset-bottom))] md:min-h-0 md:overflow-hidden md:pb-0 ' +
                        'md:rounded-2xl md:border md:border-[#DCEAF8] md:bg-white md:shadow-sm ' +
                        'dark:md:border-[#1E3A5F] dark:md:bg-[#0C1D36]'
                    }
                >
                    {/* Top Bar: ← Review & Ajukan */}
                    <div
                        className={
                            'sticky top-0 z-30 flex items-center gap-3 border-b border-[#DCEAF8] ' +
                            'bg-white px-4 py-3 dark:border-[#1E3A5F] dark:bg-[#0C1D36] ' +
                            'md:static md:px-6 md:py-5'
                        }
                    >
                        <button
                            type="button"
                            onClick={() => onStepChange('items')}
                            aria-label="Kembali ke detail kebutuhan"
                            className={
                                'size-11 -ml-3 flex items-center justify-center rounded-xl ' +
                                'text-[#082870] dark:text-white focus-visible:outline-2 ' +
                                'focus-visible:outline-offset-2 focus-visible:outline-[#0060F4]'
                            }
                        >
                            <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2.5} />
                        </button>
                        <div>
                            <h2 className="text-balance text-base font-extrabold text-[#082870] md:text-lg dark:text-white">
                                Review &amp; Ajukan
                            </h2>
                            <p className="hidden text-xs text-[#52658E] md:block dark:text-[#94A3B8]">
                                Periksa kembali informasi sebelum diajukan.
                            </p>
                        </div>
                        {flowProgress('review')}
                    </div>

                    <div className="space-y-6 py-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 md:p-6">
                        <div className="px-4 md:col-span-2 md:px-0">
                            <FormErrorSummary errors={submissionErrors} />
                        </div>
                        {/* Ship Card with Card Container (Gambar 3) */}
                        <div className="px-4 md:col-span-2 md:px-0">
                            <div
                                className={
                                    'flex items-center gap-3 rounded-2xl border border-[#BCE0FD] ' +
                                    'bg-[#F0F8FF] p-3 shadow-xs dark:border-[#1E3A5F] ' +
                                    'dark:bg-[#0C1D36]'
                                }
                            >
                                <ShipImage
                                    src={vessel.image}
                                    alt={vessel.name}
                                    className={
                                        'h-20 w-20 shrink-0 rounded-xl border border-[#BCE0FD] ' +
                                        'object-cover dark:border-[#1E3A5F]'
                                    }
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                    <h3 className="truncate text-sm font-bold text-[#082870] dark:text-white">
                                        {vessel.name}
                                    </h3>
                                    <div>
                                        <span
                                            className={
                                                'inline-flex rounded-full bg-[#FEF3C7] px-2.5 ' +
                                                'py-0.5 text-[10px] font-bold text-[#D97706]'
                                            }
                                        >
                                            {vessel.status}
                                        </span>
                                    </div>
                                    <p className="truncate text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                        {vessel.company?.name || 'Perusahaan belum diisi'}
                                    </p>
                                    <p className="flex items-center gap-1.5 text-[10px] text-[#52658E] dark:text-[#94A3B8]">
                                        <CalendarDays aria-hidden="true" className="size-3.5" />
                                        <span>{formatEtaDateTime(vessel.eta)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Summary Metadata List — Tanpa Garis Bawah (Gambar 4) */}
                        <div
                            className={
                                'space-y-2 px-4 text-xs [&>div]:flex-wrap [&>div]:gap-x-4 ' +
                                '[&>div]:gap-y-1 [&>div>span]:break-words md:rounded-2xl ' +
                                'md:border md:border-[#DCEAF8] md:bg-[#F8FAFD] md:p-5 ' +
                                'dark:md:border-[#1E3A5F] dark:md:bg-[#071322]/40'
                            }
                        >
                            <div className="flex items-center justify-between py-1">
                                <span className="text-[#52658E]">Tanggal Form</span>
                                <span className="font-bold text-[#082870] dark:text-white">
                                    {formDate || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-[#52658E]">Bagian</span>
                                <span className="font-bold text-[#082870] dark:text-white">
                                    {formSection === 'Lainnya'
                                        ? formSectionOther || '-'
                                        : formSection || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-[#52658E]">Nama Pemesan (Nahkoda)</span>
                                <span className="font-bold text-[#082870] dark:text-white">
                                    {formOrderedByName || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-[#52658E]">Nomor Telepon (Nomor HP)</span>
                                <span className="font-bold text-[#082870] dark:text-white">
                                    {formOrderedByPhone || '-'}
                                </span>
                            </div>
                        </div>

                        {/* Section: Daftar Item with Ubah Button */}
                        <div className="space-y-3 border-y border-sja-border px-4 py-4 md:rounded-2xl md:border md:border-[#DCEAF8] md:bg-[#F8FAFD] md:p-5 dark:md:border-[#1E3A5F] dark:md:bg-[#071322]/40">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-[#082870] dark:text-white">
                                    Daftar Item ({itemsList.length})
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => onStepChange('items')}
                                    className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-[#0060F4] hover:bg-[#E0F0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] dark:hover:bg-[#132847]"
                                >
                                    <Pencil aria-hidden="true" className="size-4" />
                                    <span>Ubah</span>
                                </button>
                            </div>

                            <div className="space-y-2.5 text-xs">
                                {itemsList.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={
                                            'space-y-0.5 border-b border-slate-100 ' +
                                            'dark:border-[#1E3A5F] pb-2 last:border-0 last:pb-0'
                                        }
                                    >
                                        <div
                                            className={
                                                'flex flex-wrap items-center justify-between ' +
                                                'gap-x-3 gap-y-1 break-words font-bold ' +
                                                'text-[#082870] dark:text-white'
                                            }
                                        >
                                            <span>
                                                {idx + 1}. {item.item_name}
                                            </span>
                                            {item.is_urgent && (
                                                <span
                                                    className={
                                                        'rounded-full ' +
                                                        'bg-[var(--sja-status-danger-background)] ' +
                                                        'px-2 py-1 text-xs ' +
                                                        'text-[var(--sja-status-danger-foreground)]'
                                                    }
                                                >
                                                    Urgent
                                                </span>
                                            )}
                                            <span className="font-semibold text-[#0060F4]">
                                                {item.quantity} {item.unit}
                                            </span>
                                        </div>
                                        {item.notes && (
                                            <p className="text-[11px] text-[#52658E]">
                                                {item.notes}
                                            </p>
                                        )}
                                        {item.required_date && (
                                            <p className="text-[10px] text-[#0060F4]">
                                                Jadwal item: {formatIndonesianDate(item.required_date)}{' '}
                                                {item.required_time}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Foto Form Kapal Terlampir */}
                        {photoPreview && (
                            <div className="px-4 md:col-span-2 md:px-0">
                                <div className="p-3.5 rounded-2xl bg-[#F8FAFD] dark:bg-[#071322]/60 border border-[#DCEAF8] dark:border-[#1E3A5F] flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <img
                                            src={photoPreview}
                                            alt="Pratinjau foto form kapal"
                                            className="size-14 rounded-xl object-cover border border-[#DCEAF8] dark:border-[#1E3A5F] shrink-0 bg-slate-900"
                                        />
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-[#082870] dark:text-white block truncate">
                                                {formPhoto?.name || 'Foto Form Kapal'}
                                            </span>
                                            <span className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                                                Foto Terlampir {formPhoto ? `(${(formPhoto.size / 1024).toFixed(1)} KB)` : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setIsPhotoViewerOpen(true)}
                                            className="px-3 py-1.5 rounded-xl bg-[#0060F4]/10 dark:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#38BDF8] text-xs font-bold hover:bg-[#0060F4]/20 transition-colors cursor-pointer"
                                        >
                                            Lihat
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onStepChange('items')}
                                            className="px-3 py-1.5 rounded-xl text-[#52658E] dark:text-[#94A3B8] text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            Ubah
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {submissionError && Object.keys(submissionErrors).length === 0 && (
                            <p
                                role="alert"
                                className="px-4 text-sm text-[var(--sja-status-danger-foreground)] md:col-span-2 md:px-0"
                            >
                                {submissionError}
                            </p>
                        )}
                        <div className="flex items-center gap-3 px-4 pt-2 md:col-span-2 md:justify-end md:px-0">
                            <button
                                type="button"
                                onClick={() => onStepChange('items')}
                                className={
                                    'min-h-11 flex-1 rounded-xl border border-[#DCEAF8] bg-white ' +
                                    'px-5 py-3 text-xs font-bold text-[#082870] hover:bg-[#F0F8FF] ' +
                                    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
                                    'focus-visible:outline-[#0060F4] md:flex-none dark:border-[#1E3A5F] ' +
                                    'dark:bg-[#071322] dark:text-white dark:hover:bg-[#132847]'
                                }
                            >
                                &larr; Kembali
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleFinalSubmit}
                                className={
                                    'flex min-h-11 flex-1 items-center justify-center gap-1.5 ' +
                                    'rounded-xl bg-[#0060F4] px-5 py-3 text-xs font-bold text-white ' +
                                    'shadow-sm transition-colors hover:bg-[#0052D4] ' +
                                    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
                                    'focus-visible:outline-[#0060F4] disabled:cursor-not-allowed ' +
                                    'disabled:opacity-60 md:flex-none'
                                }
                            >
                                <Send aria-hidden="true" className="size-4" />
                                <span>{isSubmitting ? 'Mengajukan...' : 'Ajukan'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                    SUB-FLOW E: STEP 4 - BERHASIL DIAJUKAN
                   ───────────────────────────────────────────────────────────── */}
            {needFlowStep === 'success' && (
                <div
                    className={
                        'flex min-h-screen flex-col items-center justify-center space-y-4 ' +
                        'bg-white p-4 text-center dark:bg-[#071322] md:min-h-0 md:rounded-2xl ' +
                        'md:border md:border-[#DCEAF8] md:p-12 md:shadow-sm ' +
                        'dark:md:border-[#1E3A5F]'
                    }
                >
                    {/* Confetti & Success Animation Container */}
                    <div className="relative w-full max-w-xs sm:max-w-sm flex flex-col items-center">
                        {/* Confetti Particles (SVG) */}
                        <div className="absolute -top-6 inset-x-0 h-28 pointer-events-none overflow-visible flex justify-center">
                            <svg
                                className="w-72 h-28"
                                viewBox="0 0 288 112"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                {/* Blue ribbon & rectangles */}
                                <rect
                                    x="24"
                                    y="38"
                                    width="6"
                                    height="12"
                                    rx="2"
                                    transform="rotate(25 24 38)"
                                    fill="#0060F4"
                                />
                                <rect
                                    x="85"
                                    y="14"
                                    width="7"
                                    height="13"
                                    rx="2"
                                    transform="rotate(-30 85 14)"
                                    fill="#0060F4"
                                />
                                <rect
                                    x="250"
                                    y="44"
                                    width="6"
                                    height="12"
                                    rx="2"
                                    transform="rotate(35 250 44)"
                                    fill="#0060F4"
                                />
                                {/* Green dots & pills */}
                                <circle cx="38" cy="18" r="4.5" fill="#22C55E" />
                                <rect
                                    x="240"
                                    y="12"
                                    width="7"
                                    height="13"
                                    rx="2.5"
                                    transform="rotate(-20 240 12)"
                                    fill="#22C55E"
                                />
                                <circle cx="252" cy="70" r="3.5" fill="#22C55E" />
                                {/* Yellow / Amber dots & bowties */}
                                <circle cx="70" cy="54" r="4" fill="#F59E0B" />
                                <path
                                    d="M214 16 L218 22 L214 28 L222 28 L218 22 L222 16 Z"
                                    fill="#F59E0B"
                                />
                                <circle cx="26" cy="68" r="4" fill="#F59E0B" />
                                {/* Red / Orange accents */}
                                <circle cx="218" cy="62" r="3.5" fill="#EF4444" />
                                <rect
                                    x="68"
                                    y="12"
                                    width="5"
                                    height="10"
                                    rx="2"
                                    transform="rotate(40 68 12)"
                                    fill="#EF4444"
                                />
                                <rect
                                    x="188"
                                    y="18"
                                    width="6"
                                    height="10"
                                    rx="2"
                                    transform="rotate(-15 188 18)"
                                    fill="#F97316"
                                />
                            </svg>
                        </div>

                        {/* Large Vibrant Green Circle with Checkmark */}
                        <div className="relative z-10 w-20 h-20 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-lg shadow-green-500/25">
                            <svg
                                className="w-10 h-10 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="space-y-1 pt-1">
                        <h2 className="text-2xl font-black text-[#0060F4] dark:text-[#38BDF8] tracking-tight">
                            Pengajuan Berhasil!
                        </h2>
                        <p className="text-xs text-[#52658E] dark:text-[#94A3B8] max-w-xs mx-auto leading-relaxed">
                            Data kebutuhan kapal telah berhasil diajukan dan tercatat di sistem.
                        </p>
                    </div>

                    {/* Confirmation Summary Card matching Gambar 1 */}
                    <div className="w-full max-w-xs sm:max-w-sm rounded-2xl bg-[#F0F8FF]/80 dark:bg-[#0C1D36] border border-[#DCEAF8] dark:border-[#1E3A5F] p-4 text-xs space-y-2.5 text-left">
                        <div className="flex items-center justify-between">
                            <span className="text-[#52658E] dark:text-[#94A3B8]">Nomor Pengajuan</span>
                            <span className="font-bold text-[#082870] dark:text-white">
                                {submittedRequestNumber || '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#52658E] dark:text-[#94A3B8]">Kapal</span>
                            <span className="font-bold text-[#082870] dark:text-white truncate max-w-[200px] text-right">
                                {vessel.name}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#52658E] dark:text-[#94A3B8]">Tanggal Form</span>
                            <span className="font-bold text-[#082870] dark:text-white">
                                {formatIndonesianDate(formDate)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#52658E] dark:text-[#94A3B8]">Jumlah Item</span>
                            <span className="font-bold text-[#082870] dark:text-white">
                                {itemsList.length} Item
                            </span>
                        </div>
                        {photoPreview && (
                            <div className="flex items-center justify-between">
                                <span className="text-[#52658E] dark:text-[#94A3B8]">Foto Form Kapal</span>
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 aria-hidden="true" className="size-4" />
                                    Tersimpan
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[#52658E] dark:text-[#94A3B8]">Status</span>
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                                Menunggu Approval
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons matching Gambar 1 */}
                    <div className="w-full max-w-xs sm:max-w-sm space-y-2.5 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (submittedRequestId) {
                                    router.get(`/requests/${submittedRequestId}`);
                                } else if (submittedRequestNumber) {
                                    router.get(
                                        `/requests?search=${encodeURIComponent(submittedRequestNumber)}`
                                    );
                                } else {
                                    router.get('/requests');
                                }
                            }}
                            className="min-h-11 w-full rounded-xl bg-[#0060F4] px-4 py-3.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-[#0052D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] sm:text-sm"
                        >
                            Lihat Detail Pengajuan
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onStepChange('none');
                                onReturnToOverview();
                            }}
                            className="min-h-11 w-full rounded-xl border border-[#0060F4] bg-white px-4 py-3.5 text-xs font-bold text-[#0060F4] transition-colors hover:bg-[#F0F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0060F4] sm:text-sm dark:border-[#38BDF8] dark:bg-[#0C1D36] dark:text-[#38BDF8] dark:hover:bg-[#132847]"
                        >
                            Kembali ke Detail Kapal
                        </button>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isPhotoViewerOpen && Boolean(photoPreview)}
                onClose={() => setIsPhotoViewerOpen(false)}
                title="Foto Form Kapal"
                size="lg"
                asBottomSheetOnMobile={false}
            >
                {photoPreview && (
                    <img
                        src={photoPreview}
                        alt="Foto form kapal yang dipilih"
                        className="max-h-[70dvh] w-full rounded-xl object-contain"
                    />
                )}
            </Modal>
        </>
    );
}
