<?php

namespace App\Http\Controllers;

use App\Models\OutgoingPayment;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\ShipRequest;
use App\Support\WorkflowNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    public function __construct(private readonly WorkflowNotifier $workflowNotifier) {}

    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'menunggu');
        $search = $request->query('search');

        $requestsQuery = ShipRequest::query()->with([
            'ship.company',
            'company',
            'port',
            'portCall.workOrder',
            'portCall.port',
            'portCall.ship.company',
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
            $requestsQuery->where(function ($query) {
                $query->whereIn('status', ['Menunggu Approval Direktur', 'Menunggu Approval'])
                    ->orWhereHas('items', fn ($itemQuery) => $itemQuery
                        ->where('status', 'diajukan_ke_direktur')
                        ->where('director_status', 'pending'));
            });
            $paymentsQuery->where('verification_status', 'pending');
        } elseif ($tab === 'disetujui') {
            $requestsQuery->whereIn('status', ['Disetujui', 'Disetujui Sebagian', 'Dalam Proses', 'Selesai']);
            $paymentsQuery->where('verification_status', 'verified');
        } elseif ($tab === 'ditolak') {
            $requestsQuery->where('status', 'Ditolak');
            $paymentsQuery->where('verification_status', 'rejected');
        }

        if ($search) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $requestsQuery->where(function ($q) use ($search, $like) {
                $q->where('request_number', $like, "%{$search}%")
                    ->orWhere('notes', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$search}%"));
            });

            $paymentsQuery->where(function ($q) use ($search, $like) {
                $q->where('reference_number', $like, "%{$search}%")
                    ->orWhere('recipient', $like, "%{$search}%")
                    ->orWhere('payment_type', $like, "%{$search}%");
            });
        }

        $pendingRequests = $requestsQuery->orderByDesc('created_at')->get();
        $pendingPayments = $paymentsQuery->orderByDesc('created_at')->get();

        $counts = [
            'semua' => ShipRequest::count() + OutgoingPayment::count(),
            'menunggu' => ShipRequest::query()
                ->where(function ($query) {
                    $query->whereIn('status', ['Menunggu Approval Direktur', 'Menunggu Approval'])
                        ->orWhereHas('items', fn ($itemQuery) => $itemQuery
                            ->where('status', 'diajukan_ke_direktur')
                            ->where('director_status', 'pending'));
                })
                ->count() + OutgoingPayment::where('verification_status', 'pending')->count(),
            'disetujui' => ShipRequest::whereIn('status', ['Disetujui', 'Disetujui Sebagian', 'Dalam Proses', 'Selesai'])->count() + OutgoingPayment::where('verification_status', 'verified')->count(),
            'ditolak' => ShipRequest::where('status', 'Ditolak')->count() + OutgoingPayment::where('verification_status', 'rejected')->count(),
        ];

        return Inertia::render('Approvals/Index', [
            'requests' => $pendingRequests,
            'payments' => $pendingPayments,
            'counts' => $counts,
            'activeTab' => $tab,
            'search' => $search ?? '',
            'capabilities' => [
                'can_decide_items' => $request->user()?->isDirector() ?? false,
                'can_view_hpp' => true,
                'is_director' => (bool) $request->user()?->isDirector(),
                'can_process_requests' => $request->user()?->isOperationalAdmin() ?? false,
            ],
        ]);
    }

    public function show(Request $request, string $id): Response
    {
        $isUuid = Str::isUuid($id);

        // 1. Try finding PortCall (Job) by ID or job_number
        $portCallQuery = PortCall::with([
            'ship.company',
            'port',
            'workOrder',
            'requests' => fn ($query) => $query
                ->orderByDesc('created_at')
                ->orderByDesc('id'),
            'requests.ship.company',
            'requests.company',
            'requests.port',
            'requests.creator',
            'requests.invoices',
            'requests.items.product.vendor',
            'requests.items.vendor',
        ]);

        $portCall = $isUuid
            ? $portCallQuery->where('id', $id)->first()
            : $portCallQuery->where('job_number', $id)->first();

        $shipRequest = null;

        if ($portCall) {
            $reqQuery = $request->query('req');
            if ($reqQuery) {
                $shipRequest = $portCall->requests->first(function ($r) use ($reqQuery) {
                    return $r->id === $reqQuery || $r->request_number === $reqQuery;
                }) ?? $portCall->requests->first();
            } else {
                $shipRequest = $portCall->requests->first();
            }
        } else {
            // 2. Try finding ShipRequest by ID or request_number
            $shipRequestQuery = ShipRequest::with([
                'ship.company',
                'company',
                'port',
                'portCall.port',
                'portCall.workOrder',
                'portCall.ship.company',
                'portCall.requests' => fn ($query) => $query
                    ->orderByDesc('created_at')
                    ->orderByDesc('id'),
                'portCall.requests.creator',
                'portCall.requests.invoices',
                'portCall.requests.items.product.vendor',
                'portCall.requests.items.vendor',
                'creator',
                'invoices',
                'items.product.vendor',
                'items.vendor',
            ]);

            $shipRequest = $isUuid
                ? $shipRequestQuery->where('id', $id)->firstOrFail()
                : $shipRequestQuery->where('request_number', $id)->firstOrFail();

            $portCall = $shipRequest->portCall;
        }

        $allRequests = $portCall ? $portCall->requests : ($shipRequest ? collect([$shipRequest]) : collect());

        $canDecideItems = $request->user()?->isDirector() ?? false;

        // Calculate summary figures
        $totalHppPending = 0;
        $totalHppApproved = 0;
        $totalHppRejected = 0;
        $totalHppAll = 0;
        $totalSellingAll = 0;
        $pendingItemsCount = 0;
        $approvedItemsCount = 0;
        $rejectedItemsCount = 0;
        $totalItemsCount = 0;

        foreach ($allRequests as $req) {
            foreach ($req->items as $item) {
                $qty = (float) $item->quantity;
                $hpp = (float) $item->hpp_price;
                $selling = (float) $item->selling_price;
                $lineHpp = $qty * $hpp;
                $lineSelling = $qty * $selling;

                $totalHppAll += $lineHpp;
                $totalSellingAll += $lineSelling;
                $totalItemsCount++;

                if ($item->director_status === 'approved') {
                    $totalHppApproved += $lineHpp;
                    $approvedItemsCount++;
                } elseif ($item->director_status === 'rejected') {
                    $totalHppRejected += $lineHpp;
                    $rejectedItemsCount++;
                } else {
                    $totalHppPending += $lineHpp;
                    $pendingItemsCount++;
                }
            }
        }

        return Inertia::render('Approvals/Show', [
            'job' => $portCall,
            'requests' => $allRequests,
            'request' => $shipRequest ?? $allRequests->first(),
            'capabilities' => [
                'can_decide_items' => $canDecideItems,
                'can_view_hpp' => true,
                'is_director' => (bool) $request->user()?->isDirector(),
                'can_process_requests' => $request->user()?->isOperationalAdmin() ?? false,
            ],
            'summary' => [
                'total_hpp_pending' => $totalHppPending,
                'total_hpp_approved' => $totalHppApproved,
                'total_hpp_rejected' => $totalHppRejected,
                'total_hpp_all' => $totalHppAll,
                'total_selling_all' => $totalSellingAll,
                'pending_items_count' => $pendingItemsCount,
                'approved_items_count' => $approvedItemsCount,
                'rejected_items_count' => $rejectedItemsCount,
                'total_items_count' => $totalItemsCount,
            ],
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
            $decidedItemIds = collect();

            if (in_array($shipRequest->status, ['Selesai', 'Dibatalkan'], true)) {
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
                        default => 'pending',
                    },
                ]);

                $decidedItemIds->push($item->id);

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

            $returnedItemCount = $decidedItemIds->isNotEmpty()
                ? $this->returnUnselectedItemsToAdmin($shipRequest, $decidedItemIds, $request)
                : 0;

            $requestStatus = $this->syncRequestApprovalStatus($shipRequest);

            if (function_exists('activity')) {
                activity('approval')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log("Direktur memutuskan persetujuan item pada pengajuan {$shipRequest->request_number}");
            }

            if ($requestStatus !== 'Menunggu Approval Direktur') {
                $this->workflowNotifier->notifyDirectorDecision($shipRequest, $request->user());
            }

            $message = "Keputusan item pengajuan {$shipRequest->request_number} berhasil disimpan.";
            if ($returnedItemCount > 0) {
                $message .= " {$returnedItemCount} item yang tidak dipilih dikembalikan ke Admin untuk diajukan ulang.";
            }

            return redirect()->back()->with('success', $message);
        });
    }

    public function approveRequest(Request $request, string $id): RedirectResponse
    {
        return DB::transaction(function () use ($id, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);
            $this->authorizeDirectorDecision($request);

            if (in_array($shipRequest->status, ['Selesai', 'Dibatalkan'], true)) {
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

            $this->workflowNotifier->notifyDirectorDecision($shipRequest, $request->user());

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

            if (in_array($shipRequest->status, ['Selesai', 'Dibatalkan'], true)) {
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
            $this->workflowNotifier->notifyDirectorDecision($shipRequest, $request->user());

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

            if (in_array($item->request->status, ['Selesai', 'Dibatalkan'], true)) {
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

            $requestStatus = $this->syncRequestApprovalStatus($item->request);

            if ($requestStatus !== 'Menunggu Approval Direktur') {
                $this->workflowNotifier->notifyDirectorDecision($item->request, $request->user());
            }

            return redirect()->back()->with('success', "Status item {$item->item_name} berhasil diubah menjadi {$status}.");
        });
    }

    private function authorizeDirectorDecision(Request $request): void
    {
        if (! $request->user()?->isDirector()) {
            abort(403, 'Hanya Direktur yang dapat memberikan keputusan pengajuan.');
        }
    }

    private function syncRequestApprovalStatus(ShipRequest $shipRequest): string
    {
        $items = $shipRequest->items()->get(['status', 'director_status']);
        $awaitingDirector = $items->where('status', 'diajukan_ke_direktur')
            ->where('director_status', 'pending')
            ->count();
        $status = $shipRequest->resolveWorkflowStatus($items);

        $shipRequest->update([
            'status' => $status,
            'director_reviewed_at' => $awaitingDirector === 0 ? now() : null,
            'cancelled_at' => $status === 'Ditolak' ? now() : null,
        ]);

        return $status;
    }

    /**
     * @param  Collection<int, string>  $decidedItemIds
     */
    private function returnUnselectedItemsToAdmin(
        ShipRequest $shipRequest,
        Collection $decidedItemIds,
        Request $request
    ): int {
        $unselectedItems = $shipRequest->items()
            ->where('status', 'diajukan_ke_direktur')
            ->where('director_status', 'pending')
            ->whereNotIn('id', $decidedItemIds)
            ->lockForUpdate()
            ->get();

        foreach ($unselectedItems as $item) {
            $item->update([
                'status' => 'pending',
                'director_status' => 'pending',
                'director_notes' => 'Belum diputuskan Direktur. Silakan ajukan ulang setelah ditinjau Admin.',
            ]);

            if (function_exists('activity')) {
                activity('request-item-approval')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'decision' => 'returned_to_admin',
                    ])
                    ->log('Item yang tidak dipilih Direktur dikembalikan ke Admin');
            }
        }

        return $unselectedItems->count();
    }

    public function batchItemDecision(Request $request): RedirectResponse
    {
        $this->authorizeDirectorDecision($request);

        $validated = $request->validate([
            'decisions' => ['required', 'array', 'min:1'],
            'decisions.*.item_id' => ['required', 'uuid', 'exists:request_items,id'],
            'decisions.*.status' => ['required', 'in:approved,pending,rejected'],
            'decisions.*.director_notes' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $itemIds = collect($validated['decisions'])->pluck('item_id');
            $items = RequestItem::lockForUpdate()->whereIn('id', $itemIds)->get()->keyBy('id');
            $decidedItemIdsByRequest = collect();

            foreach ($validated['decisions'] as $dec) {
                /** @var RequestItem|null $item */
                $item = $items->get($dec['item_id']);
                if (! $item || $item->status !== 'diajukan_ke_direktur') {
                    continue;
                }

                $status = $dec['status'];
                $item->update([
                    'director_status' => $status,
                    'director_notes' => $dec['director_notes'] ?? $item->director_notes,
                    'status' => match ($status) {
                        'approved' => 'disetujui',
                        'rejected' => 'ditolak',
                        default => 'pending',
                    },
                ]);

                if (function_exists('activity')) {
                    activity('request-item-approval')
                        ->performedOn($item)
                        ->causedBy($request->user())
                        ->withProperties([
                            'request_id' => $item->request_id,
                            'decision' => $status,
                            'hpp_price' => (float) $item->hpp_price,
                            'selling_price' => (float) $item->selling_price,
                            'notes' => $dec['director_notes'] ?? null,
                        ])
                        ->log('Direktur memberikan keputusan pada item pengajuan');
                }

                $requestItemIds = $decidedItemIdsByRequest->get($item->request_id, collect());
                $requestItemIds->push($item->id);
                $decidedItemIdsByRequest->put($item->request_id, $requestItemIds);
            }

            $returnedItemCount = 0;

            foreach ($decidedItemIdsByRequest as $requestId => $decidedItemIds) {
                $shipRequest = ShipRequest::lockForUpdate()->find($requestId);
                if ($shipRequest) {
                    $returnedItemCount += $this->returnUnselectedItemsToAdmin(
                        $shipRequest,
                        $decidedItemIds,
                        $request
                    );
                    $requestStatus = $this->syncRequestApprovalStatus($shipRequest);
                    if ($requestStatus !== 'Menunggu Approval Direktur') {
                        $this->workflowNotifier->notifyDirectorDecision($shipRequest, $request->user());
                    }
                }
            }

            $message = 'Keputusan Direktur berhasil disimpan.';
            if ($returnedItemCount > 0) {
                $message .= " {$returnedItemCount} item yang tidak dipilih dikembalikan ke Admin untuk diajukan ulang.";
            }

            return redirect()->back()->with('success', $message);
        });
    }
}
