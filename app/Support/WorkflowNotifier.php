<?php

namespace App\Support;

use App\Models\ShipRequest;
use App\Models\User;
use App\Notifications\WorkflowActionNotification;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

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

    public function notifyForwardedToDirector(ShipRequest $shipRequest, User $actor): void
    {
        $shipRequest->loadMissing(['ship', 'portCall']);
        $this->resolveForUser($actor, $shipRequest);

        $this->send($this->usersWithRoles(['Direktur']), [
            ...$this->requestPayload($shipRequest, true),
            'title' => "Persetujuan baru {$shipRequest->request_number}",
            'message' => "{$actor->name} meneruskan pengajuan {$shipRequest->ship?->name} untuk keputusan Direktur.",
            'action_label' => 'Buka persetujuan',
            'action_required' => true,
            'tone' => 'blue',
        ]);
    }

    public function notifyDirectorDecision(ShipRequest $shipRequest, User $actor): void
    {
        $shipRequest->loadMissing(['ship', 'portCall', 'creator']);
        $this->resolveForUser($actor, $shipRequest);

        $decisionLabel = $shipRequest->status === 'Ditolak'
            ? 'ditolak'
            : ($shipRequest->status === 'Disetujui Sebagian' ? 'disetujui sebagian' : 'disetujui');

        $administrators = $this->usersWithRoles(['Admin', 'Admin Sistem'])
            ->where('id', '!=', $actor->id);

        $this->send($administrators, [
            ...$this->requestPayload($shipRequest),
            'title' => "Keputusan Direktur {$shipRequest->request_number}",
            'message' => "Pengajuan {$shipRequest->ship?->name} {$decisionLabel}. Admin perlu menindaklanjuti hasil keputusan.",
            'action_label' => 'Tindak lanjuti',
            'action_required' => true,
            'tone' => $shipRequest->status === 'Ditolak' ? 'red' : 'blue',
        ]);

        if ($shipRequest->creator && ! $administrators->contains('id', $shipRequest->creator->id)) {
            $this->send(collect([$shipRequest->creator]), [
                ...$this->requestPayload($shipRequest),
                'title' => "Status pengajuan {$shipRequest->request_number}",
                'message' => "Direktur telah memutuskan pengajuan {$shipRequest->ship?->name}: {$decisionLabel}.",
                'action_label' => 'Lihat status',
                'action_required' => false,
                'tone' => $shipRequest->status === 'Ditolak' ? 'red' : 'green',
            ]);
        }
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
        $user->unreadNotifications()
            ->get()
            ->filter(fn (DatabaseNotification $notification): bool => ($notification->data['entity_type'] ?? null) === 'ship_request'
                && ($notification->data['entity_id'] ?? null) === (string) $shipRequest->id
            )
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

        Notification::send($recipients, new WorkflowActionNotification($payload));
    }
}
