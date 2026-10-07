import React, { useState } from 'react';
import type { OperationalActivityData } from './types';
import Modal from '../overlays/Modal';
import { Camera, MapPin } from 'lucide-react';
import { formatDate } from '../../lib/formatDate';

interface ActivityTabProps {
    activities?: OperationalActivityData[];
    onRecordActivity: () => void;
    canRecord?: boolean;
}

export default function ActivityTab({
    activities = [],
    onRecordActivity,
    canRecord = true,
}: ActivityTabProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    const getBadgeStyle = (category: string) => {
        switch (category) {
            case 'Bongkar Muat':
                return 'bg-[#FEF3C7] text-[#D97706] dark:bg-[#78350F]/40 dark:text-[#FCD34D]';
            case 'Kendala Operasional':
                return 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D]/40 dark:text-[#FCA5A5]';
            case 'Kegiatan Kapal':
                return 'bg-[#E0F0FF] text-[#0060F4] dark:bg-[#0C1D36] dark:text-[#38BDF8]';
            default:
                return 'bg-[#DCF7E8] text-[#087443] dark:bg-[#064E3B]/40 dark:text-[#6EE7B7]';
        }
    };

    return (
        <div className="px-4 pt-3 pb-3 space-y-3 text-left">
            <div className="flex items-center justify-between text-xs pb-0.5">
                <h3 className="font-extrabold text-sm text-[#082870] dark:text-white">
                    Laporan Aktivitas Harian ({activities.length})
                </h3>
                {canRecord && (
                    <button
                        type="button"
                        onClick={onRecordActivity}
                        className="text-[#0060F4] dark:text-[#38BDF8] font-bold text-xs hover:underline cursor-pointer"
                    >
                        + Catat Aktivitas
                    </button>
                )}
            </div>

            {activities.length === 0 ? (
                <div className="py-8 text-center space-y-2 border border-dashed border-[#DCEAF8] dark:border-[#1E3A5F] rounded-2xl p-4 bg-[#F8FBFF] dark:bg-[#071322]">
                    <div className="w-10 h-10 rounded-full bg-[#E0F0FF] dark:bg-[#0C1D36] text-[#0060F4] dark:text-[#38BDF8] flex items-center justify-center mx-auto">
                        <Camera className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-xs text-[#082870] dark:text-white">
                        Belum ada aktivitas tercatat untuk kapal ini
                    </p>
                    <p className="text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                        Catat aktivitas bongkar muat, inspeksi, atau kegiatan operasional kapal.
                    </p>
                    {canRecord && (
                        <button
                            type="button"
                            onClick={onRecordActivity}
                            className="mt-2 px-3 py-1.5 rounded-xl bg-[#0060F4] text-white text-xs font-bold shadow-xs hover:bg-[#0052D0] cursor-pointer"
                        >
                            + Catat Aktivitas Pertama
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.map((act) => {
                        const photos = act.photos || [];
                        return (
                            <div
                                key={act.id}
                                className={
                                    'p-3.5 rounded-2xl bg-[#F8FAFD] dark:bg-[#071322]/60 border ' +
                                    'border-[#DCEAF8] dark:border-[#1E3A5F] text-xs space-y-2 shadow-2xs'
                                }
                            >
                                <div className="flex items-center justify-between text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                    <span>
                                        {formatDate(act.activity_date)}
                                        {act.activity_time ? ` • ${act.activity_time}` : ''}
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${getBadgeStyle(
                                            act.category
                                        )}`}
                                    >
                                        {act.category || 'Kegiatan Kapal'}
                                    </span>
                                </div>

                                <p className="font-bold text-xs text-[#082870] dark:text-white leading-snug">
                                    {act.title}
                                </p>

                                <p className="text-[#52658E] dark:text-[#94A3B8] leading-relaxed text-[11.5px]">
                                    {act.detail}
                                </p>

                                {/* Location & Photo count */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-[#1E3A5F] text-[11px] text-[#52658E] dark:text-[#94A3B8]">
                                    <span className="flex items-center gap-1 font-medium">
                                        <MapPin className="w-3.5 h-3.5 text-[#0060F4] dark:text-[#38BDF8]" />
                                        <span>{act.location_name}</span>
                                    </span>
                                    {photos.length > 0 && (
                                        <span className="flex items-center gap-1 font-semibold text-[#0060F4] dark:text-[#38BDF8]">
                                            <Camera className="w-3.5 h-3.5" />
                                            <span>{photos.length} foto</span>
                                        </span>
                                    )}
                                </div>

                                {/* Photos Thumbnails */}
                                {photos.length > 0 && (
                                    <div className="flex items-center gap-2 overflow-x-auto pt-1 no-scrollbar">
                                        {photos.map((src, idx) => (
                                            <img
                                                key={idx}
                                                src={src}
                                                alt={`Foto ${idx + 1}`}
                                                onClick={() => setSelectedPhoto(src)}
                                                className="w-16 h-16 rounded-xl object-cover border border-[#DCEAF8] dark:border-[#1E3A5F] cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Photo Viewer Modal */}
            <Modal
                isOpen={Boolean(selectedPhoto)}
                onClose={() => setSelectedPhoto(null)}
                title="Foto Dokumentasi Aktivitas"
                size="lg"
                asBottomSheetOnMobile={false}
            >
                {selectedPhoto && (
                    <div className="flex justify-center items-center py-2 bg-slate-950 rounded-xl overflow-hidden">
                        <img
                            src={selectedPhoto}
                            alt="Dokumentasi aktivitas"
                            className="max-h-[70dvh] max-w-full object-contain"
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}
