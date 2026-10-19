<?php

namespace App\Support;

use App\Models\ExpenseRequest;
use App\Models\ShipRequest;
use App\Models\User;
use App\Notifications\WorkflowActionNotification;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class WorkflowNotifier
{
    public function notifySubmission(ShipRequest $shipRequest, User $actor): void
    {
        $shipRequest->loadMissing(['ship', 'portCall']);

        $recipients = $this->usersWithRoles(['Admin', 'Admin Sistem'])
            ->where('id', '!=', $actor->id);

        $this->send($recipients, [
            ...$this->requestPayload($shipRequest),
            'title' => "Pengajuan baru {$shipRequest->request_number}",
            'message' => "{$actor->name} mengirim pengajuan untuk {$shipRequest->ship?->name} dan menunggu pemeriksaan Admin.",
            'action_label' => 'Periksa pengajuan',
            'action_required' => true,
            'tone' => 'blue',
        ]);
    }

    public function notifyClearanceSubmission(ShipRequest $shipRequest, User $actor, string $label): void
    {
        $shipRequest->loadMissing(['ship', 'portCall']);

        $recipients = $this->usersWithRoles(['Admin', 'Admin Sistem'])
            ->where('id', '!=', $actor->id);

        $this->send($recipients, [
            ...$this->requestPayload($shipRequest),
            'title' => "Pengajuan {$label} {$shipRequest->request_number}",
            'message' => "{$actor->name} mengirim {$label} untuk {$shipRequest->ship?->name} ({$shipRequest->portCall?->job_number}).",
            'action_label' => 'Periksa pengajuan',
            'action_required' => true,
            'tone' => 'blue',
        ]);
    }

    public function notifyBatchSubmission(Collection|array $shipRequests, User $actor, ?string $batchCode = null): void
    {
        $requests = collect($shipRequests)->filter()->values();
        if ($requests->isEmpty()) {
            return;
        }

        $requests->each(fn (ShipRequest $req) => $req->loadMissing(['ship', 'portCall']));

        if ($requests->count() === 1) {
            $this->notifySubmission($requests->first(), $actor);

            return;
        }

        $first = $requests->first();
        $uniqueShips = $requests->map(fn ($r) => $r->ship?->name)->filter()->unique()->values();
        $shipList = $uniqueShips->join(', ');
        $batchLabel = $batchCode ?: "{$requests->count()} pengajuan";

        $recipients = $this->usersWithRoles(['Admin', 'Admin Sistem'])
            ->where('id', '!=', $actor->id);

        $this->send($recipients, [
            'url' => route('requests.index', ['tab' => 'menunggu'], false),
            'entity_type' => 'ship_request_batch',
            'entity_id' => (string) $first->id,
            'entity_ids' => $requests->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
            'request_number' => $batchCode ?: $first->request_number,
            'ship_name' => "{$uniqueShips->count()} kapal",
            'ship_image' => $first->ship?->image,
            'status' => 'Menunggu Approval',
            'created_at' => now()->toIso8601String(),
            'title' => "Pengajuan baru {$batchLabel} ({$requests->count()} kapal)",
            'message' => "{$actor->name} mengirim pengajuan untuk {$requests->count()} kapal ({$shipList}) dan menunggu pemeriksaan Admin.",
            'action_label' => 'Periksa pengajuan',
            'action_required' => true,
            'tone' => 'blue',
        ]);
    }

    public function notifyForwardedToDirector(ShipRequest $shipRequest, User $actor, int $itemCount = 0): void
    {
        $this->notifyBatchForwardedToDirector(collect([$shipRequest]), $actor, $itemCount);
    }

    /**
     * @param  Collection<int, ShipRequest>|array<int, ShipRequest>  $shipRequests
     */
    public function notifyBatchForwardedToDirector(Collection|array $shipRequests, User $actor, int $itemCount = 0): void
    {
        $requests = collect($shipRequests)->filter()->values();
        if ($requests->isEmpty()) {
            return;
        }

        $requests->each(function (ShipRequest $req) use ($actor) {
            $req->loadMissing(['ship', 'portCall']);
            $this->resolveForUser($actor, $req);
        });

        $directors = $this->usersWithRoles(['Direktur']);
        if ($directors->isEmpty()) {
            return;
        }

        $first = $requests->first();

        if ($requests->count() === 1) {
            $itemLabel = $itemCount > 0 ? " ({$itemCount} item)" : '';

            $this->send($directors, [
                ...$this->requestPayload($first, true),
                'title' => "Persetujuan baru {$first->request_number}",
                'message' => "{$actor->name} meneruskan pengajuan {$first->ship?->name}{$itemLabel} untuk keputusan Direktur.",
                'action_label' => 'Buka persetujuan',
                'action_required' => true,
                'tone' => 'blue',
            ]);

            return;
        }

        $uniqueShips = $requests->map(fn ($r) => $r->ship?->name)->filter()->unique()->values();
        $shipName = $uniqueShips->count() === 1 ? $uniqueShips->first() : "{$uniqueShips->count()} kapal";

        $jobNumbers = $requests->map(fn ($r) => $r->portCall?->job_number)->filter()->unique()->values();
        $sameJob = $jobNumbers->count() === 1 ? $jobNumbers->first() : null;

        $itemLabel = $itemCount > 0 ? " ({$itemCount} item)" : '';

        if ($sameJob) {
            $title = "Persetujuan baru ({$sameJob})";
            $message = "{$actor->name} meneruskan {$requests->count()} pengajuan{$itemLabel} untuk kapal {$shipName} ({$sameJob}) untuk keputusan Direktur.";
            $url = route('approvals.detail', ['id' => $sameJob], false);
        } else {
            $title = "Persetujuan baru {$requests->count()} pengajuan";
            $message = "{$actor->name} meneruskan {$requests->count()} pengajuan{$itemLabel} untuk {$shipName} untuk keputusan Direktur.";
            $url = route('approvals.index', ['tab' => 'menunggu'], false);
        }

        $this->send($directors, [
            'url' => $url,
            'entity_type' => 'ship_request_batch',
            'entity_id' => (string) $first->id,
            'entity_ids' => $requests->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
            'job_number' => $sameJob,
            'request_number' => $sameJob ?: $first->request_number,
            'ship_name' => $shipName,
            'ship_image' => $first->ship?->image,
            'status' => 'Menunggu Approval Direktur',
            'created_at' => now()->toIso8601String(),
            'title' => $title,
            'message' => $message,
            'action_label' => 'Buka persetujuan',
            'action_required' => true,
            'tone' => 'blue',
        ]);
    }

    public function notifyDirectorDecision(
        ShipRequest $shipRequest,
        User $actor,
        int $approvedItemCount = 0,
        int $returnedItemCount = 0,
    ): void {
        $shipRequest->loadMissing(['ship', 'portCall', 'creator']);
        $this->resolveForUser($actor, $shipRequest);

        $decisionLabel = $shipRequest->status === 'Ditolak'
            ? 'ditolak'
            : ($shipRequest->status === 'Disetujui Sebagian' ? 'disetujui sebagian' : 'disetujui');
        $itemSummary = $this->directorDecisionItemSummary($approvedItemCount, $returnedItemCount);

        $administrators = $this->usersWithRoles(['Admin', 'Admin Sistem'])
            ->where('id', '!=', $actor->id);

        $this->send($administrators, [
            ...$this->requestPayload($shipRequest),
            'title' => "Keputusan Direktur {$shipRequest->request_number}",
            'message' => "Pengajuan {$shipRequest->ship?->name} {$decisionLabel}.{$itemSummary} Admin perlu menindaklanjuti hasil keputusan.",
            'action_label' => 'Tindak lanjuti',
            'action_required' => true,
            'tone' => $shipRequest->status === 'Ditolak' ? 'red' : 'blue',
        ]);

        if ($shipRequest->creator && ! $administrators->contains('id', $shipRequest->creator->id)) {
            $this->send(collect([$shipRequest->creator]), [
                ...$this->requestPayload($shipRequest),
                'title' => "Status pengajuan {$shipRequest->request_number}",
                'message' => "Direktur telah memutuskan pengajuan {$shipRequest->ship?->name}: {$decisionLabel}.{$itemSummary}",
                'action_label' => 'Lihat status',
                'action_required' => false,
                'tone' => $shipRequest->status === 'Ditolak' ? 'red' : 'green',
            ]);
        }
    }

    /**
     * @param  Collection<int, ShipRequest>|array<int, ShipRequest>  $shipRequests
     */
    public function notifyBatchDirectorDecision(
        Collection|array $shipRequests,
        User $actor,
        int $approvedItemCount = 0,
        int $returnedItemCount = 0,
    ): void {
        $requests = collect($shipRequests)->filter()->values();
        if ($requests->isEmpty()) {
            return;
        }

        $requests->each(function (ShipRequest $req) use ($actor) {
            $req->loadMissing(['ship', 'portCall', 'creator']);
            $this->resolveForUser($actor, $req);
        });

        if ($requests->count() === 1) {
            $this->notifyDirectorDecision(
                $requests->first(),
                $actor,
                $approvedItemCount,
                $returnedItemCount,
            );

            return;
        }

        $allRejected = $requests->every(fn ($r) => $r->status === 'Ditolak');
        $allApproved = $requests->every(fn ($r) => $r->status === 'Disetujui');
        $decisionLabel = $allRejected ? 'ditolak' : ($allApproved ? 'disetujui' : 'disetujui sebagian');
        $itemSummary = $this->directorDecisionItemSummary($approvedItemCount, $returnedItemCount);

        $uniqueShips = $requests->map(fn ($r) => $r->ship?->name)->filter()->unique()->values();
        $shipName = $uniqueShips->count() === 1 ? $uniqueShips->first() : "{$uniqueShips->count()} kapal";

        $jobNumbers = $requests->map(fn ($r) => $r->portCall?->job_number)->filter()->unique()->values();
        $sameJob = $jobNumbers->count() === 1 ? $jobNumbers->first() : null;

        $first = $requests->first();

        if ($sameJob) {
            $title = "Keputusan Direktur ({$sameJob})";
            $message = "Direktur telah memutuskan {$requests->count()} pengajuan untuk kapal {$shipName} ({$sameJob}): {$decisionLabel}.{$itemSummary} Admin perlu menindaklanjuti hasil keputusan.";
            $url = route('requests.detail', ['id' => $sameJob], false);
        } else {
            $title = "Keputusan Direktur {$requests->count()} pengajuan";
            $message = "Direktur telah memutuskan {$requests->count()} pengajuan untuk {$shipName}: {$decisionLabel}.{$itemSummary} Admin perlu menindaklanjuti hasil keputusan.";
            $url = route('requests.index', ['tab' => 'diproses'], false);
        }

        $administrators = $this->usersWithRoles(['Admin', 'Admin Sistem'])
            ->where('id', '!=', $actor->id);

        $this->send($administrators, [
            'url' => $url,
            'entity_type' => 'ship_request_batch',
            'entity_id' => (string) $first->id,
            'entity_ids' => $requests->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
            'job_number' => $sameJob,
            'request_number' => $sameJob ?: $first->request_number,
            'ship_name' => $shipName,
            'ship_image' => $first->ship?->image,
            'status' => $allRejected ? 'Ditolak' : ($allApproved ? 'Disetujui' : 'Disetujui Sebagian'),
            'created_at' => now()->toIso8601String(),
            'title' => $title,
            'message' => $message,
            'action_label' => 'Tindak lanjuti',
            'action_required' => true,
            'tone' => $allRejected ? 'red' : 'blue',
        ]);

        $creators = $requests->pluck('creator')->filter()->unique('id');
        foreach ($creators as $creator) {
            if ($administrators->contains('id', $creator->id) || $creator->is($actor)) {
                continue;
            }
            $creatorRequests = $requests->filter(fn ($r) => $r->created_by === $creator->id);
            $this->send(collect([$creator]), [
                'url' => $url,
                'entity_type' => 'ship_request_batch',
                'entity_id' => (string) $creatorRequests->first()->id,
                'entity_ids' => $creatorRequests->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
                'job_number' => $sameJob,
                'request_number' => $sameJob ?: $creatorRequests->first()->request_number,
                'ship_name' => $shipName,
                'ship_image' => $creatorRequests->first()->ship?->image,
                'status' => $allRejected ? 'Ditolak' : ($allApproved ? 'Disetujui' : 'Disetujui Sebagian'),
                'created_at' => now()->toIso8601String(),
                'title' => "Status pengajuan ({$creatorRequests->count()} pengajuan)",
                'message' => "Direktur telah memutuskan {$creatorRequests->count()} pengajuan untuk {$shipName}: {$decisionLabel}.{$itemSummary}",
                'action_label' => 'Lihat status',
                'action_required' => false,
                'tone' => $allRejected ? 'red' : 'green',
            ]);
        }
    }

    private function directorDecisionItemSummary(int $approvedItemCount, int $returnedItemCount): string
    {
        if ($approvedItemCount === 0 && $returnedItemCount === 0) {
            return '';
        }

        return " {$approvedItemCount} item disetujui dan {$returnedItemCount} item dikembalikan ke Admin.";
    }

    public function notifyCompanyExpenseSubmission(ExpenseRequest $expenseRequest, User $actor): void
    {
        $directors = $this->usersWithRoles(['Direktur']);
        $formattedAmount = 'Rp '.number_format((float) $expenseRequest->total, 0, ',', '.');

        $this->send($directors, [
            'title' => "Pengajuan biaya perusahaan {$expenseRequest->request_number}",
            'message' => "{$actor->name} mengajukan biaya perusahaan {$expenseRequest->category} ({$formattedAmount}) menunggu keputusan Direktur.",
            'url' => route('approvals.index', ['tab' => 'menunggu'], false),
            'action_label' => 'Buka persetujuan',
            'action_required' => true,
            'tone' => 'blue',
            'entity_type' => 'company_expense',
            'entity_id' => (string) $expenseRequest->id,
            'request_number' => $expenseRequest->request_number,
            'status' => 'Menunggu Direktur',
            'created_at' => now()->toIso8601String(),
        ]);
    }

    public function notifyCompanyExpenseDecision(ExpenseRequest $expenseRequest, User $actor): void
    {
        $expenseRequest->loadMissing(['creator']);
        $decisionLabel = $expenseRequest->status === 'approved' ? 'disetujui' : 'ditolak';
        $formattedAmount = 'Rp '.number_format((float) $expenseRequest->total, 0, ',', '.');

        $recipients = $this->usersWithRoles(['Admin', 'Admin Sistem'])
            ->where('id', '!=', $actor->id);

        if ($expenseRequest->creator && ! $recipients->contains('id', $expenseRequest->creator->id) && $expenseRequest->creator->id !== $actor->id) {
            $recipients = $recipients->push($expenseRequest->creator);
        }

        $this->send($recipients, [
            'title' => "Biaya perusahaan {$decisionLabel} {$expenseRequest->request_number}",
            'message' => "Direktur telah memutuskan pengajuan {$expenseRequest->category} ({$formattedAmount}): {$decisionLabel}.",
            'url' => route('expenses.index', ['tab' => 'company_expenses'], false),
            'action_label' => 'Lihat pengajuan',
            'action_required' => $expenseRequest->status === 'approved',
            'tone' => $expenseRequest->status === 'approved' ? 'green' : 'red',
            'entity_type' => 'company_expense',
            'entity_id' => (string) $expenseRequest->id,
            'request_number' => $expenseRequest->request_number,
            'status' => $expenseRequest->status === 'approved' ? 'Disetujui' : 'Ditolak',
            'created_at' => now()->toIso8601String(),
        ]);
    }

    public function notifyStatusUpdated(ShipRequest $shipRequest, User $actor): void
    {
        $shipRequest->loadMissing(['ship', 'portCall', 'creator']);
        $this->resolveForUser($actor, $shipRequest);

        if (! $shipRequest->creator || $shipRequest->creator->is($actor)) {
            return;
        }

        $this->send(collect([$shipRequest->creator]), [
            ...$this->requestPayload($shipRequest),
            'title' => "Pengajuan {$shipRequest->status}",
            'message' => "{$actor->name} memperbarui pengajuan {$shipRequest->request_number} untuk {$shipRequest->ship?->name}.",
            'action_label' => 'Lihat pengajuan',
            'action_required' => false,
            'tone' => in_array($shipRequest->status, ['Selesai', 'Disetujui'], true) ? 'green' : 'blue',
        ]);
    }

    public function resolveForUser(User $user, ShipRequest $shipRequest): void
    {
        $shipRequest->loadMissing('portCall');
        $requestId = (string) $shipRequest->id;
        $jobNumber = $shipRequest->portCall?->job_number;

        $user->unreadNotifications()
            ->get()
            ->filter(function (DatabaseNotification $notification) use ($requestId, $jobNumber): bool {
                $entityType = $notification->data['entity_type'] ?? null;
                if (! in_array($entityType, ['ship_request', 'ship_request_batch'], true)) {
                    return false;
                }

                $entityId = (string) ($notification->data['entity_id'] ?? '');
                if ($entityId === $requestId) {
                    return true;
                }

                $entityIds = $notification->data['entity_ids'] ?? [];
                if (is_array($entityIds) && in_array($requestId, $entityIds, true)) {
                    return true;
                }

                $notifJob = $notification->data['job_number'] ?? null;
                if ($jobNumber && $notifJob && $notifJob === $jobNumber) {
                    return true;
                }

                return false;
            })
            ->each->markAsRead();
    }

    /**
     * @param  Collection<int, ShipRequest>|array<int, ShipRequest>  $shipRequests
     */
    public function resolveBatchForUser(User $user, Collection|array $shipRequests): void
    {
        $requests = collect($shipRequests)->filter()->values();
        if ($requests->isEmpty()) {
            return;
        }

        $requestIds = $requests->pluck('id')->map(fn ($id) => (string) $id)->all();
        $jobNumbers = $requests->map(fn ($r) => $r->portCall?->job_number)->filter()->unique()->all();

        $user->unreadNotifications()
            ->get()
            ->filter(function (DatabaseNotification $notification) use ($requestIds, $jobNumbers): bool {
                $entityType = $notification->data['entity_type'] ?? null;
                if (! in_array($entityType, ['ship_request', 'ship_request_batch'], true)) {
                    return false;
                }

                $entityId = (string) ($notification->data['entity_id'] ?? '');
                if (in_array($entityId, $requestIds, true)) {
                    return true;
                }

                $entityIds = $notification->data['entity_ids'] ?? [];
                if (is_array($entityIds) && ! empty(array_intersect($entityIds, $requestIds))) {
                    return true;
                }

                $jobNumber = $notification->data['job_number'] ?? null;
                if ($jobNumber && in_array($jobNumber, $jobNumbers, true)) {
                    return true;
                }

                return false;
            })
            ->each->markAsRead();
    }

    /**
     * @param  array<int, string>  $roles
     * @return Collection<int, User>
     */
    private function usersWithRoles(array $roles): Collection
    {
        return User::query()
            ->whereHas('roles', fn ($query) => $query->whereIn('name', $roles))
            ->where('is_active', true)
            ->get();
    }

    /** @return array<string, mixed> */
    private function requestPayload(ShipRequest $shipRequest, bool $approvalUrl = false): array
    {
        $routeParameter = $shipRequest->portCall?->job_number ?: $shipRequest->id;

        return [
            'url' => route(
                $approvalUrl ? 'approvals.detail' : 'requests.detail',
                ['id' => $routeParameter, 'req' => $shipRequest->id],
                false,
            ),
            'entity_type' => 'ship_request',
            'entity_id' => (string) $shipRequest->id,
            'request_number' => $shipRequest->request_number,
            'ship_name' => $shipRequest->ship?->name ?? 'Kapal tidak tersedia',
            'ship_image' => $shipRequest->ship?->image,
            'status' => $shipRequest->status,
            'created_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @param  Collection<int, User>  $recipients
     * @param  array<string, mixed>  $payload
     */
    private function send(Collection $recipients, array $payload): void
    {
        if ($recipients->isEmpty()) {
            return;
        }

        try {
            Notification::sendNow($recipients, new WorkflowActionNotification($payload));
        } catch (\Throwable $e) {
            Log::warning('Workflow notification broadcast failed: '.$e->getMessage());
            try {
                foreach ($recipients as $recipient) {
                    $recipient->notifications()->create([
                        'id' => (string) Str::uuid(),
                        'type' => 'workflow-action',
                        'data' => $payload,
                        'read_at' => null,
                    ]);
                }
            } catch (\Throwable $dbException) {
                Log::error('Fallback notification storage failed: '.$dbException->getMessage());
            }
        }
    }
}
