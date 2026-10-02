<?php

namespace App\Http\Controllers;

use App\Events\DirectorApprovalCompleted;
use App\Models\OutgoingPayment;
use App\Models\RequestItem;
use App\Models\ShipRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'menunggu');
        $search = $request->query('search');

        $requestsQuery = ShipRequest::query()->with([
            'ship.company',
            'company',
            'port',
            'creator',
            'items' => fn ($query) => $query
                ->whereIn('status', ['diajukan_ke_direktur', 'disetujui', 'ditolak'])
                ->with(['product.vendor', 'vendor']),
        ]);

        $paymentsQuery = OutgoingPayment::query()->with([
            'portCall.ship',
            'portCall.port',
            'recorder',
            'verifier',
        ]);

        if ($tab === 'menunggu') {
            $requestsQuery->where('status', 'Menunggu Approval Direktur');
            $paymentsQuery->where('verification_status', 'pending');
        } elseif ($tab === 'disetujui') {
            $requestsQuery->whereIn('status', ['Disetujui', 'Disetujui Sebagian', 'Dalam Proses', 'Selesai']);
            $paymentsQuery->where('verification_status', 'verified');
        } elseif ($tab === 'ditolak') {
            $requestsQuery->where('status', 'Ditolak');
            $paymentsQuery->where('verification_status', 'rejected');
        }

        if ($search) {
            $requestsQuery->where(function ($q) use ($search) {
                $q->where('request_number', 'ilike', "%{$search}%")
                    ->orWhere('notes', 'ilike', "%{$search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', 'ilike', "%{$search}%"));
            });

            $paymentsQuery->where(function ($q) use ($search) {
                $q->where('reference_number', 'ilike', "%{$search}%")
                    ->orWhere('recipient', 'ilike', "%{$search}%")
                    ->orWhere('payment_type', 'ilike', "%{$search}%");
            });
        }

        $pendingRequests = $requestsQuery->orderByDesc('created_at')->get();
        $pendingPayments = $paymentsQuery->orderByDesc('created_at')->get();

        $counts = [
            'menunggu' => ShipRequest::where('status', 'Menunggu Approval Direktur')->count() + OutgoingPayment::where('verification_status', 'pending')->count(),
            'disetujui' => ShipRequest::whereIn('status', ['Disetujui', 'Disetujui Sebagian', 'Dalam Proses', 'Selesai'])->count() + OutgoingPayment::where('verification_status', 'verified')->count(),
            'ditolak' => ShipRequest::where('status', 'Ditolak')->count() + OutgoingPayment::where('verification_status', 'rejected')->count(),
        ];

        return Inertia::render('Approvals/Index', [
            'requests' => $pendingRequests,
            'payments' => $pendingPayments,
            'counts' => $counts,
            'activeTab' => $tab,
            'search' => $search ?? '',
        ]);
    }

    public function itemDecision(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'decisions' => ['required', 'array', 'min:1'],
            'decisions.*.item_id' => ['required', 'uuid', 'exists:request_items,id'],
            'decisions.*.status' => ['required', 'in:approved,rejected,pending'],
            'decisions.*.director_notes' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($id, $validated, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);
            $this->authorizeDirectorDecision($request);

            if ($shipRequest->status !== 'Menunggu Approval Direktur') {
                return redirect()->back()->with('error', 'Pengajuan ini belum dikirim Admin atau sudah selesai ditinjau.');
            }

            foreach ($validated['decisions'] as $dec) {
                $item = RequestItem::lockForUpdate()
                    ->where('request_id', $shipRequest->id)
                    ->where('id', $dec['item_id'])
                    ->firstOrFail();

                if ($item->status !== 'diajukan_ke_direktur') {
                    continue;
                }

                $status = $dec['status'];
                $item->update([
                    'director_status' => $status,
                    'director_notes' => $dec['director_notes'] ?? $item->director_notes,
                    'status' => match ($status) {
                        'approved' => 'disetujui',
                        'rejected' => 'ditolak',
                        default => 'diajukan_ke_direktur',
                    },
                ]);

                activity('request-item-approval')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'decision' => $status,
                        'hpp_price' => (float) $item->hpp_price,
                        'selling_price' => (float) $item->selling_price,
                        'notes' => $dec['director_notes'] ?? null,
                    ])
                    ->log('Direktur memberikan keputusan pada item pengajuan');
            }

            $requestStatus = $this->syncRequestApprovalStatus($shipRequest);

            if (function_exists('activity')) {
                activity('approval')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log("Direktur memutuskan persetujuan item pada pengajuan {$shipRequest->request_number}");
            }

            if ($requestStatus !== 'Menunggu Approval Direktur') {
                try {
                    event(new DirectorApprovalCompleted($shipRequest));
                } catch (\Throwable) {
                }
            }

            return redirect()->back()->with('success', "Keputusan item pengajuan {$shipRequest->request_number} berhasil disimpan dan dikembalikan ke Admin.");
        });
    }

    public function approveRequest(Request $request, string $id): RedirectResponse
    {
        return DB::transaction(function () use ($id, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);
            $this->authorizeDirectorDecision($request);

            if ($shipRequest->status !== 'Menunggu Approval Direktur') {
                return redirect()->back()->with('error', "Pengajuan {$shipRequest->request_number} sudah diproses sebelumnya (Status: {$shipRequest->status}).");
            }

            $forwardedItems = $shipRequest->items()
                ->where('status', 'diajukan_ke_direktur')
                ->where('director_status', 'pending')
                ->lockForUpdate()
                ->get();

            if ($forwardedItems->isEmpty()) {
                return redirect()->back()->with('error', 'Tidak ada item kiriman Admin yang menunggu keputusan Direktur.');
            }

            foreach ($forwardedItems as $item) {
                $item->update([
                    'director_status' => 'approved',
                    'status' => 'disetujui',
                ]);

                activity('request-item-approval')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'decision' => 'approved',
                        'hpp_price' => (float) $item->hpp_price,
                        'selling_price' => (float) $item->selling_price,
                    ])
                    ->log('Direktur menyetujui item dan mengunci harga');
            }

            $this->syncRequestApprovalStatus($shipRequest);

            if (function_exists('activity')) {
                activity('approval')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log("Direktur menyetujui seluruh item pengajuan {$shipRequest->request_number}");
            }

            try {
                event(new DirectorApprovalCompleted($shipRequest));
            } catch (\Throwable) {
            }

            return redirect()->back()->with('success', "Pengajuan {$shipRequest->request_number} berhasil disetujui oleh Direktur.");
        });
    }

    public function rejectRequest(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($validated, $id, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);
            $this->authorizeDirectorDecision($request);

            if ($shipRequest->status !== 'Menunggu Approval Direktur') {
                return redirect()->back()->with('error', "Pengajuan {$shipRequest->request_number} tidak dapat ditolak karena berstatus {$shipRequest->status}.");
            }

            $forwardedItems = $shipRequest->items()
                ->where('status', 'diajukan_ke_direktur')
                ->where('director_status', 'pending')
                ->lockForUpdate()
                ->get();

            if ($forwardedItems->isEmpty()) {
                return redirect()->back()->with('error', 'Tidak ada item kiriman Admin yang dapat ditolak.');
            }

            foreach ($forwardedItems as $item) {
                $item->update([
                    'director_status' => 'rejected',
                    'status' => 'ditolak',
                    'director_notes' => $validated['reason'] ?? 'Ditolak oleh Direktur',
                ]);

                activity('request-item-approval')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'decision' => 'rejected',
                        'hpp_price' => (float) $item->hpp_price,
                        'selling_price' => (float) $item->selling_price,
                        'notes' => $validated['reason'] ?? null,
                    ])
                    ->log('Direktur menolak item pengajuan');
            }

            $note = $shipRequest->notes;
            if (! empty($validated['reason'])) {
                $note .= " [Alasan Penolakan Direktur: {$validated['reason']}]";
            }

            $shipRequest->update(['notes' => $note]);
            $this->syncRequestApprovalStatus($shipRequest);

            return redirect()->back()->with('success', "Pengajuan {$shipRequest->request_number} telah ditolak.");
        });
    }

    public function verifyPayment(Request $request, string $id): RedirectResponse
    {
        $this->authorizeDirectorDecision($request);

        return DB::transaction(function () use ($request, $id) {
            $payment = OutgoingPayment::lockForUpdate()->findOrFail($id);

            if ($payment->verification_status === 'verified') {
                return redirect()->back()->with('error', "Pembayaran {$payment->reference_number} sudah diverifikasi sebelumnya.");
            }

            $payment->update([
                'verification_status' => 'verified',
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
            ]);

            return redirect()->back()->with('success', "Pembayaran {$payment->reference_number} telah diverifikasi.");
        });
    }

    public function singleItemDecision(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected,pending'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($id, $validated, $request) {
            $item = RequestItem::query()->lockForUpdate()->with('request')->findOrFail($id);
            $this->authorizeDirectorDecision($request);

            if (! $item->request || $item->status !== 'diajukan_ke_direktur') {
                return redirect()->back()->with('error', 'Item ini belum dikirim Admin atau sudah diputuskan sebelumnya.');
            }

            if ($item->request->status !== 'Menunggu Approval Direktur') {
                return redirect()->back()->with('error', 'Pengajuan ini belum dikirim Admin atau sudah selesai ditinjau.');
            }

            $status = $validated['decision'];
            $item->update([
                'director_status' => $status,
                'director_notes' => $validated['notes'] ?? $item->director_notes,
                'status' => match ($status) {
                    'approved' => 'disetujui',
                    'rejected' => 'ditolak',
                    default => 'diajukan_ke_direktur',
                },
            ]);

            activity('request-item-approval')
                ->performedOn($item)
                ->causedBy($request->user())
                ->withProperties([
                    'request_id' => $item->request->id,
                    'decision' => $status,
                    'hpp_price' => (float) $item->hpp_price,
                    'selling_price' => (float) $item->selling_price,
                    'notes' => $validated['notes'] ?? null,
                ])
                ->log('Direktur memberikan keputusan pada item pengajuan');

            $this->syncRequestApprovalStatus($item->request);

            return redirect()->back()->with('success', "Status item {$item->item_name} berhasil diubah menjadi {$status}.");
        });
    }

    private function authorizeDirectorDecision(Request $request): void
    {
        if (! $request->user()?->isDirector() && ! $request->user()?->isOwner()) {
            abort(403, 'Hanya Direktur yang dapat memberikan keputusan pengajuan.');
        }
    }

    private function syncRequestApprovalStatus(ShipRequest $shipRequest): string
    {
        $items = $shipRequest->items()->get(['status', 'director_status']);
        $totalItems = $items->count();
        $approvedItems = $items->where('director_status', 'approved')->count();
        $rejectedItems = $items->where('director_status', 'rejected')->count();
        $awaitingDirector = $items->where('status', 'diajukan_ke_direktur')
            ->where('director_status', 'pending')
            ->count();

        $status = match (true) {
            $awaitingDirector > 0 => 'Menunggu Approval Direktur',
            $totalItems > 0 && $approvedItems === $totalItems => 'Disetujui',
            $approvedItems > 0 => 'Disetujui Sebagian',
            $totalItems > 0 && $rejectedItems === $totalItems => 'Ditolak',
            default => 'Menunggu Approval',
        };

        $shipRequest->update([
            'status' => $status,
            'director_reviewed_at' => $awaitingDirector === 0 ? now() : null,
            'cancelled_at' => $status === 'Ditolak' ? now() : null,
        ]);

        return $status;
    }
}
