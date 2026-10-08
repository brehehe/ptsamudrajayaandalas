<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateRequestItemsStatusRequest;
use App\Http\Requests\UpdateShipRequestStatusRequest;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\WorkOrder;
use App\Support\WorkflowNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NeedController extends Controller
{
    public function __construct(private readonly WorkflowNotifier $workflowNotifier) {}

    public function index(Request $request): Response
    {
        $status = $request->query('status', 'semua');
        $search = $request->query('search');

        $query = ShipRequest::query()->with(['ship.company', 'creator', 'portCall.port']);

        if ($status === 'menunggu') {
            $query->whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur']);
        } elseif ($status === 'proses') {
            $query->whereIn('status', ['Dalam Proses', 'Disetujui', 'Diproses']);
        } elseif ($status === 'selesai') {
            $query->whereIn('status', ['Selesai', 'Dibatalkan']);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'ilike', "%{$search}%")
                    ->orWhere('notes', 'ilike', "%{$search}%")
                    ->orWhereHas('ship', function ($sq) use ($search) {
                        $sq->where('name', 'ilike', "%{$search}%");
                    });
            });
        }

        $needs = $query->orderByDesc('created_at')->get();

        $ships = Ship::where('is_active', true)->orderBy('name')->get();
        $portCalls = PortCall::with(['ship', 'port'])->whereIn('status', ['scheduled', 'anchored', 'berthed'])->get();

        return Inertia::render('Needs/Index', [
            'needs' => $needs,
            'ships' => $ships,
            'portCalls' => $portCalls,
            'counts' => [
                'semua' => ShipRequest::count(),
                'menunggu' => ShipRequest::whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur'])->count(),
                'proses' => ShipRequest::whereIn('status', ['Dalam Proses', 'Disetujui', 'Diproses'])->count(),
                'selesai' => ShipRequest::whereIn('status', ['Selesai', 'Dibatalkan'])->count(),
            ],
            'activeStatus' => $status,
            'search' => $search ?? '',
            'capabilities' => [
                'can_create' => $request->user()?->can('create', ShipRequest::class) ?? false,
                'can_process' => $request->user()?->isOperationalAdmin() ?? false,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless(
            $request->user()?->can('create', ShipRequest::class),
            403,
        );
        // Check if payload contains multi-item list from mobile flow
        if ($request->has('items') && is_array($request->input('items'))) {
            $validated = $request->validate([
                'ship_id' => ['required', 'exists:ships,id'],
                'port_call_id' => ['required', 'exists:port_calls,id'],
                'section' => ['required', 'string', 'max:100'],
                'ordered_by_name' => ['required', 'string', 'max:255'],
                'ordered_by_phone' => ['required', 'string', 'regex:/^[0-9+().\s-]{8,20}$/'],
                'required_at' => ['nullable', 'string', 'max:255'],
                'status' => ['nullable', 'string', 'in:Draft,Menunggu Approval,Dalam Proses,Selesai'],
                'request_date' => ['required', 'date_format:Y-m-d'],
                'notes' => ['nullable', 'string'],
                'items' => ['required', 'array', 'min:1'],
                'items.*.item_name' => ['required', 'string', 'max:255'],
                'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
                'items.*.unit' => ['required', 'string', 'max:50'],
                'items.*.notes' => ['nullable', 'string'],
                'items.*.is_urgent' => ['required', 'boolean'],
                'items.*.required_date' => ['nullable', 'date_format:Y-m-d'],
                'items.*.required_time' => ['nullable', 'date_format:H:i'],
                'items.*.product_id' => ['nullable', 'uuid', 'exists:products,id'],
                'photo' => ['nullable', 'image', 'max:5120'],
            ], [
                'section.required' => 'Bagian wajib dipilih.',
                'ordered_by_name.required' => 'Nama nahkoda wajib diisi.',
                'ordered_by_phone.required' => 'Nomor HP nahkoda wajib diisi.',
                'ordered_by_phone.regex' => 'Format nomor HP nahkoda tidak valid.',
                'request_date.required' => 'Tanggal form wajib diisi.',
                'items.*.is_urgent.required' => 'Prioritas setiap kebutuhan wajib dipilih.',
                'photo.image' => 'File foto form kapal harus berupa gambar.',
                'photo.max' => 'Ukuran foto form kapal maksimal 5 MB.',
            ]);

            return DB::transaction(function () use ($request, $validated): RedirectResponse {
                $dateSlug = date('Ymd');
                $countToday = ShipRequest::withTrashed()->whereDate('created_at', now()->toDateString())->count() + 1;
                $reqNumber = sprintf('REQ-%s-%03d', $dateSlug, $countToday);

                $section = $validated['section'];
                $orderedBy = $validated['ordered_by_name'];
                $phone = $validated['ordered_by_phone'];
                $status = $validated['status'] ?? 'Menunggu Approval';

                $portCall = PortCall::query()
                    ->whereKey($validated['port_call_id'])
                    ->where('ship_id', $validated['ship_id'])
                    ->lockForUpdate()
                    ->first();

                if (! $portCall) {
                    throw ValidationException::withMessages([
                        'port_call_id' => 'Kunjungan / job tidak sesuai dengan kapal yang dipilih.',
                    ]);
                }

                if (! $portCall->acceptsNewRequests()) {
                    throw ValidationException::withMessages([
                        'port_call_id' => 'Pengajuan baru tidak dapat dibuat karena kunjungan / job sudah berstatus Selesai.',
                    ]);
                }

                $photoPath = null;
                if ($request->hasFile('photo')) {
                    $photoPath = $request->file('photo')->store('form_kapal', 'public');
                }

                if ($portCall->work_order_id) {
                    WorkOrder::query()
                        ->lockForUpdate()
                        ->find($portCall->work_order_id)
                        ?->fillMissingClientPic($orderedBy, $phone);
                }

                $notesText = "Bagian: {$section} | Pemesan: {$orderedBy} ({$phone})";
                if (! empty($validated['required_at'])) {
                    $notesText .= " | Dibutuhkan: {$validated['required_at']}";
                }
                if (! empty($validated['notes'])) {
                    $notesText .= " | Catatan: {$validated['notes']}";
                }

                $shipRequest = ShipRequest::create([
                    'request_number' => $reqNumber,
                    'ship_id' => $validated['ship_id'],
                    'port_call_id' => $validated['port_call_id'],
                    'created_by' => $request->user()?->id,
                    'status' => $status,
                    'request_date' => $validated['request_date'],
                    'notes' => $notesText,
                ]);

                foreach ($validated['items'] as $item) {
                    RequestItem::create([
                        'request_id' => $shipRequest->id,
                        'product_id' => $item['product_id'] ?? null,
                        'item_type' => 'product',
                        'item_name' => $item['item_name'],
                        'quantity' => $item['quantity'],
                        'unit' => $item['unit'],
                        'notes' => $item['notes'] ?? null,
                        'is_urgent' => $item['is_urgent'],
                        'required_date' => ! empty($item['required_date']) ? $item['required_date'] : null,
                        'required_time' => ! empty($item['required_time']) ? $item['required_time'] : null,
                        'attachment_path' => $photoPath,
                        'status' => 'Pending',
                    ]);
                }

                $this->workflowNotifier->notifySubmission($shipRequest, $request->user());

                return redirect()->back()
                    ->with('success', "Kebutuhan {$reqNumber} berhasil diajukan dan disimpan.")
                    ->with('submitted_request_number', $reqNumber)
                    ->with('submitted_request_id', $shipRequest->id);
            });
        }

        $validated = $request->validate([
            'ship_id' => ['required', 'exists:ships,id'],
            'port_call_id' => ['required', 'exists:port_calls,id'],
            'need_type' => ['required', 'string'],
            'quantity' => ['required', 'numeric', 'min:1'],
            'unit' => ['required', 'string'],
            'required_at' => ['required', 'string'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $portCall = PortCall::query()
            ->whereKey($validated['port_call_id'])
            ->where('ship_id', $validated['ship_id'])
            ->first();

        if (! $portCall) {
            throw ValidationException::withMessages([
                'port_call_id' => 'Kunjungan / job tidak sesuai dengan kapal yang dipilih.',
            ]);
        }

        if (! $portCall->acceptsNewRequests()) {
            throw ValidationException::withMessages([
                'port_call_id' => 'Pengajuan baru tidak dapat dibuat karena kunjungan / job sudah berstatus Selesai.',
            ]);
        }

        $lastReq = ShipRequest::withTrashed()->orderByDesc('created_at')->first();
        $nextNum = 260;
        if ($lastReq && preg_match('/REQ-(?:SJA-26-)?(\d+)/', $lastReq->request_number, $matches)) {
            $nextNum = (int) $matches[1] + 1;
        }
        $reqNumber = sprintf('REQ-SJA-26-%04d', $nextNum);

        $newRequest = ShipRequest::create([
            'request_number' => $reqNumber,
            'ship_id' => $validated['ship_id'],
            'port_call_id' => $validated['port_call_id'],
            'created_by' => $request->user()->id,
            'status' => 'Menunggu Approval',
            'request_date' => now()->toDateString(),
            'notes' => "{$validated['need_type']} {$validated['quantity']} {$validated['unit']} - Dibutuhkan: {$validated['required_at']}. Catatan: ".($validated['notes'] ?? '-'),
        ]);

        $this->workflowNotifier->notifySubmission($newRequest, $request->user());

        return redirect()->back()->with('success', "Kebutuhan {$reqNumber} berhasil dicatat dan siap ditinjau.");
    }

    public function updateStatus(UpdateShipRequestStatusRequest $request, string $id): RedirectResponse
    {
        $validated = $request->validated();

        return DB::transaction(function () use ($id, $request, $validated): RedirectResponse {
            $need = ShipRequest::lockForUpdate()->findOrFail($id);
            $nextStatus = $validated['status'];
            $previousStatus = $need->status;
            $transitions = [
                'Menunggu Approval' => ['Dibatalkan'],
                'Menunggu Approval Direktur' => ['Dibatalkan'],
                'Disetujui' => ['Dalam Proses', 'Dibatalkan'],
                'Dalam Proses' => ['Selesai', 'Dibatalkan'],
                'Diproses' => ['Selesai', 'Dibatalkan'],
            ];

            if (! in_array($nextStatus, $transitions[$need->status] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => "Pengajuan berstatus {$need->status} tidak dapat diubah langsung menjadi {$nextStatus}.",
                ]);
            }

            if ($nextStatus === 'Dalam Proses') {
                $hasUnapprovedItems = $need->items()
                    ->where(function ($query) {
                        $query->whereNull('director_status')
                            ->orWhere('director_status', '!=', 'approved');
                    })
                    ->exists();

                if ($hasUnapprovedItems) {
                    throw ValidationException::withMessages([
                        'status' => 'Pengajuan belum dapat diproses karena masih ada item yang belum disetujui Direktur.',
                    ]);
                }
            }

            if ($nextStatus === 'Selesai') {
                $this->applyApprovedOperationalStatus($need, $request);
            }

            if ($nextStatus === 'Dalam Proses') {
                $need->items()
                    ->where('director_status', 'approved')
                    ->where('status', 'disetujui')
                    ->update(['status' => 'dalam_proses']);
            } elseif ($nextStatus === 'Selesai') {
                $need->items()
                    ->where('director_status', 'approved')
                    ->whereIn('status', ['disetujui', 'dalam_proses'])
                    ->update(['status' => 'selesai']);
            }

            $need->update([
                'status' => $nextStatus,
                'completed_at' => $nextStatus === 'Selesai' ? now() : null,
                'cancelled_at' => $nextStatus === 'Dibatalkan' ? now() : null,
            ]);

            $this->workflowNotifier->notifyStatusUpdated($need, $request->user());

            activity('request-processing')
                ->performedOn($need)
                ->causedBy($request->user())
                ->withProperties([
                    'from' => $previousStatus,
                    'to' => $nextStatus,
                    'service_type' => $need->service_type,
                    'port_call_id' => $need->port_call_id,
                ])
                ->log('Admin memperbarui tahap proses pengajuan');

            $updatesVesselStatus = in_array($need->service_type, ['clearance_in', 'clearance_out'], true);
            $message = match ($nextStatus) {
                'Dalam Proses' => "Pengajuan {$need->request_number} mulai diproses Admin.",
                'Selesai' => $updatesVesselStatus
                    ? "Pengajuan {$need->request_number} diselesaikan dan status operasional terkait telah diperbarui."
                    : "Pemenuhan kebutuhan {$need->request_number} telah diselesaikan.",
                default => "Pengajuan {$need->request_number} dibatalkan.",
            };

            return redirect()->back()->with('success', $message);
        });
    }

    public function updateItemStatuses(UpdateRequestItemsStatusRequest $request, string $id): RedirectResponse
    {
        $validated = $request->validated();

        return DB::transaction(function () use ($id, $request, $validated): RedirectResponse {
            $need = ShipRequest::query()->lockForUpdate()->findOrFail($id);
            $nextItemStatus = $validated['status'];
            $selectedItemIds = collect($validated['item_ids'])->values();
            $items = $need->items()
                ->whereIn('id', $selectedItemIds)
                ->lockForUpdate()
                ->get();

            if ($items->count() !== $selectedItemIds->count()) {
                throw ValidationException::withMessages([
                    'item_ids' => 'Salah satu item tidak termasuk dalam pengajuan ini.',
                ]);
            }

            $allowedRequestStatuses = $nextItemStatus === 'dalam_proses'
                ? ['Disetujui', 'Disetujui Sebagian', 'Dalam Proses', 'Diproses', 'Selesai']
                : ['Disetujui Sebagian', 'Dalam Proses', 'Diproses'];

            if (! in_array($need->status, $allowedRequestStatuses, true)) {
                throw ValidationException::withMessages([
                    'status' => "Item pada pengajuan berstatus {$need->status} belum dapat diperbarui ke tahap ini.",
                ]);
            }

            $requiredCurrentStatus = $nextItemStatus === 'dalam_proses' ? 'disetujui' : 'dalam_proses';
            $invalidItem = $items->first(fn (RequestItem $item): bool => $item->director_status !== 'approved'
                || $item->status !== $requiredCurrentStatus);

            if ($invalidItem) {
                throw ValidationException::withMessages([
                    'item_ids' => $nextItemStatus === 'dalam_proses'
                        ? "Item {$invalidItem->item_name} belum disetujui atau sudah mulai diproses."
                        : "Item {$invalidItem->item_name} belum berada pada tahap Dalam Proses.",
                ]);
            }

            RequestItem::query()
                ->whereIn('id', $selectedItemIds)
                ->update(['status' => $nextItemStatus]);

            $allItems = $need->items()
                ->lockForUpdate()
                ->get(['id', 'status', 'director_status']);
            $previousRequestStatus = $need->status;
            $nextRequestStatus = $need->resolveWorkflowStatus($allItems);
            $allItemsCompleted = $nextRequestStatus === 'Selesai';

            if ($allItemsCompleted) {
                $this->applyApprovedOperationalStatus($need, $request);
            }

            $need->update([
                'status' => $nextRequestStatus,
                'completed_at' => $allItemsCompleted ? now() : null,
                'cancelled_at' => null,
            ]);

            $this->workflowNotifier->notifyStatusUpdated($need, $request->user());

            activity('request-item-processing')
                ->performedOn($need)
                ->causedBy($request->user())
                ->withProperties([
                    'from' => $previousRequestStatus,
                    'to' => $nextRequestStatus,
                    'item_status' => $nextItemStatus,
                    'item_ids' => $selectedItemIds->all(),
                    'item_count' => $selectedItemIds->count(),
                    'service_type' => $need->service_type,
                ])
                ->log('Admin memperbarui tahap proses item pengajuan');

            $itemCount = $selectedItemIds->count();
            $message = $nextItemStatus === 'dalam_proses'
                ? "{$itemCount} item pada {$need->request_number} mulai diproses."
                : ($allItemsCompleted
                    ? "Seluruh item pada {$need->request_number} telah selesai."
                    : "{$itemCount} item pada {$need->request_number} telah ditandai selesai.");

            return redirect()->back()->with('success', $message);
        });
    }

    private function applyApprovedOperationalStatus(ShipRequest $need, Request $request): void
    {
        if (! in_array($need->service_type, ['clearance_in', 'clearance_out'], true)) {
            return;
        }

        $portCall = PortCall::lockForUpdate()->findOrFail($need->port_call_id);
        $targetStatus = $need->requested_port_call_status;
        $allowedTransitions = [
            'scheduled' => ['anchored', 'berthed'],
            'anchored' => ['departed'],
            'berthed' => ['departed'],
        ];

        if (! $targetStatus) {
            throw ValidationException::withMessages([
                'status' => 'Status kunjungan sudah berubah atau target operasional pengajuan tidak valid.',
            ]);
        }

        if ($portCall->status === $targetStatus) {
            return;
        }

        if (! in_array($targetStatus, $allowedTransitions[$portCall->status] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => 'Status kunjungan sudah berubah atau target operasional pengajuan tidak valid.',
            ]);
        }

        $occurredAt = $need->operational_occurred_at ?? now();
        $updateData = ['status' => $targetStatus];
        if ($portCall->status === 'scheduled') {
            $updateData['arrived_at'] = $occurredAt;
        }
        if ($targetStatus === 'berthed') {
            $updateData['berthed_at'] = $occurredAt;
        }
        if ($targetStatus === 'departed') {
            $updateData['departed_at'] = $occurredAt;
            $updateData['financial_status'] = 'waiting_completion_note';
        }

        $portCall->update($updateData);
        if ($targetStatus === 'departed') {
            $portCall->workOrder?->update([
                'status' => 'awaiting_completion_note',
                'operational_completed_at' => now(),
            ]);
        }
        $shipStatus = match ($targetStatus) {
            'anchored' => 'Labuh',
            'berthed' => 'Sandar',
            default => 'Selesai',
        };
        $portCall->ship()->update(['status' => $shipStatus]);

        activity('clearance')->performedOn($portCall)->causedBy($request->user())
            ->withProperties([
                'request_id' => $need->id,
                'to' => $targetStatus,
                'occurred_at' => $occurredAt->toIso8601String(),
            ])
            ->log('Status operasional kunjungan diterapkan setelah pengajuan selesai');
    }
}
