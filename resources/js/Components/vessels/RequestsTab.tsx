import type { ShipRequest } from './types';

interface RequestsTabProps {
    requests: ShipRequest[];
}

export default function RequestsTab({ requests }: RequestsTabProps) {
    return (
        <div className="px-4 pt-3 pb-3 space-y-3.5">
            <h3 className="font-extrabold text-sm text-[#082870] dark:text-white">
                Pengajuan &amp; Status Operasional
            </h3>
            {requests.length > 0 ? (
                <div className="space-y-2.5">
                    {requests.map((r) => (
                        <div
                            key={r.id}
                            className={
                                'p-3.5 rounded-2xl bg-[#F8FAFD] dark:bg-[#071322]/60 border ' +
                                'border-[#DCEAF8] dark:border-[#1E3A5F] shadow-2xs space-y-2 ' +
                                'text-xs'
                            }
                        >
                            <div className="flex items-center justify-between font-bold">
                                <span className="font-mono text-[#0060F4] dark:text-[#38BDF8]">
                                    {r.request_number}
                                </span>
                                <span
                                    className={
                                        'px-2 py-0.5 rounded-full bg-[#E0F0FF] ' +
                                        'dark:bg-[#0060F4]/20 text-[#0060F4] dark:text-[#38BDF8] ' +
                                        'text-[10.5px]'
                                    }
                                >
                                    {r.status}
                                </span>
                            </div>
                            <p className="text-[#52658E] dark:text-[#94A3B8]">
                                {r.notes || 'Pengajuan kebutuhan keagenan kapal'}
                            </p>
                            <div
                                className={
                                    'text-[11px] text-[#8C9BB9] pt-1 border-t border-[#DCEAF8]/60 ' +
                                    'dark:border-[#1E3A5F]'
                                }
                            >
                                Tanggal: {r.request_date}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className={
                        'p-6 text-center bg-[#F8FAFD] dark:bg-[#071322]/60 rounded-2xl border ' +
                        'border-[#DCEAF8] dark:border-[#1E3A5F] text-xs text-[#52658E] ' +
                        'dark:text-[#94A3B8]'
                    }
                >
                    Belum ada pengajuan aktif.
                </div>
            )}
        </div>
    );
}
