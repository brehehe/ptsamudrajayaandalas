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
