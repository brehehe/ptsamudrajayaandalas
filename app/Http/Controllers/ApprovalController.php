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
            'items.product.vendor',
            'items.vendor',
        ]);

        $paymentsQuery = OutgoingPayment::query()->with([
            'portCall.ship',
            'portCall.port',
            'recorder',
            'verifier',
        ]);

        if ($tab === 'menunggu') {
            $requestsQuery->whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur']);
            $paymentsQuery->where('verification_status', 'pending');
        } elseif ($tab === 'disetujui') {
            $requestsQuery->whereIn('status', ['Disetujui', 'Dalam Proses', 'Selesai']);
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
            'menunggu' => ShipRequest::whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur'])->count() + OutgoingPayment::where('verification_status', 'pending')->count(),
            'disetujui' => ShipRequest::whereIn('status', ['Disetujui', 'Dalam Proses', 'Selesai'])->count() + OutgoingPayment::where('verification_status', 'verified')->count(),
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
            $shipRequest = ShipRequest::with('items')->findOrFail($id);

            foreach ($validated['decisions'] as $dec) {
                $item = RequestItem::where('request_id', $shipRequest->id)->where('id', $dec['item_id'])->first();
                if ($item) {
                    $item->update([
                        'director_status' => $dec['status'],
                        'director_notes' => $dec['director_notes'] ?? $item->director_notes,
                        'status' => $dec['status'] === 'approved' ? 'disetujui' : ($dec['status'] === 'rejected' ? 'ditolak' : 'pending'),
                    ]);
                }
            }

            // Check how many are approved
            $approvedCount = $shipRequest->items()->where('director_status', 'approved')->count();
            $rejectedCount = $shipRequest->items()->where('director_status', 'rejected')->count();

            if ($approvedCount > 0) {
                $shipRequest->update([
                    'status' => 'Disetujui',
                    'director_reviewed_at' => now(),
                ]);
            } elseif ($rejectedCount === $shipRequest->items()->count()) {
                $shipRequest->update([
                    'status' => 'Ditolak',
                    'director_reviewed_at' => now(),
                ]);
            }

            if (function_exists('activity')) {
                activity('approval')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log("Direktur Pak Ryan memutuskan persetujuan item pada pengajuan {$shipRequest->request_number}");
            }

            try {
                event(new DirectorApprovalCompleted($shipRequest));
            } catch (\Throwable) {
            }

            return redirect()->back()->with('success', "Keputusan item pengajuan {$shipRequest->request_number} berhasil disimpan dan dikembalikan ke Admin.");
        });
    }

    public function approveRequest(Request $request, string $id): RedirectResponse
    {
        return DB::transaction(function () use ($id, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);

            if (! in_array($shipRequest->status, ['Menunggu Approval', 'Menunggu Approval Direktur'])) {
                return redirect()->back()->with('error', "Pengajuan {$shipRequest->request_number} sudah diproses sebelumnya (Status: {$shipRequest->status}).");
            }

            // Approve all items currently forwarded/pending
            $shipRequest->items()->whereIn('director_status', ['pending', 'diajukan_ke_direktur'])->update([
                'director_status' => 'approved',
                'status' => 'disetujui',
            ]);

            $shipRequest->update([
                'status' => 'Disetujui',
                'director_reviewed_at' => now(),
            ]);

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

        return DB::transaction(function () use ($validated, $id) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);

            if (! in_array($shipRequest->status, ['Menunggu Approval', 'Menunggu Approval Direktur'])) {
                return redirect()->back()->with('error', "Pengajuan {$shipRequest->request_number} tidak dapat ditolak karena berstatus {$shipRequest->status}.");
            }

            $shipRequest->items()->where('director_status', 'pending')->update([
                'director_status' => 'rejected',
                'status' => 'ditolak',
                'director_notes' => $validated['reason'] ?? 'Ditolak oleh Direktur',
            ]);

            $note = $shipRequest->notes;
            if (! empty($validated['reason'])) {
                $note .= " [Alasan Penolakan Direktur: {$validated['reason']}]";
            }

            $shipRequest->update([
                'status' => 'Ditolak',
                'notes' => $note,
                'cancelled_at' => now(),
                'director_reviewed_at' => now(),
            ]);

            return redirect()->back()->with('success', "Pengajuan {$shipRequest->request_number} telah ditolak.");
        });
    }

    public function verifyPayment(Request $request, string $id): RedirectResponse
    {
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

        return DB::transaction(function () use ($id, $validated) {
            $item = RequestItem::with('request')->findOrFail($id);
            $status = $validated['decision'];
            $item->update([
                'director_status' => $status,
                'director_notes' => $validated['notes'] ?? $item->director_notes,
                'status' => $status === 'approved' ? 'disetujui' : ($status === 'rejected' ? 'ditolak' : 'pending'),
            ]);

            if ($item->request) {
                $shipRequest = $item->request;
                $approvedCount = $shipRequest->items()->where('director_status', 'approved')->count();
                if ($approvedCount > 0) {
                    $shipRequest->update([
                        'status' => 'Disetujui',
                        'director_reviewed_at' => now(),
                    ]);
                }
            }

            return redirect()->back()->with('success', "Status item {$item->item_name} berhasil diubah menjadi {$status}.");
        });
    }
}
