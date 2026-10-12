<?php

namespace App\Notifications;

use App\Models\Invoice;
use App\Notifications\Channels\FirebaseCloudMessagingChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ReceivableDueReminder extends Notification implements ShouldQueueAfterCommit
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public readonly Invoice $invoice, public readonly int $daysUntilDue) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast', FirebaseCloudMessagingChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->payload();
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return $this->payload();
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload());
    }

    public function databaseType(object $notifiable): string
    {
        return 'receivable-due-reminder';
    }

    public function broadcastType(): string
    {
        return 'receivable-due-reminder';
    }

    /** @return array<string, string|null> */
    public function toFirebase(object $notifiable): array
    {
        $payload = $this->payload();

        return [
            'title' => $payload['title'],
            'body' => $payload['message'],
            'url' => $payload['url'],
            'action_label' => $payload['action_label'],
            'tone' => $payload['tone'],
            'entity_type' => $payload['entity_type'],
            'entity_id' => $payload['entity_id'],
            'notification_id' => $this->id,
        ];
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $timing = $this->daysUntilDue === 0 ? 'jatuh tempo hari ini' : "jatuh tempo H-{$this->daysUntilDue}";

        return [
            'title' => 'Pengingat jatuh tempo invoice',
            'message' => "Invoice {$this->invoice->invoice_number} {$timing}.",
            'url' => route('receivables.index'),
            'action_label' => 'Buka Monitoring Piutang',
            'action_required' => true,
            'tone' => $this->daysUntilDue === 0 ? 'danger' : 'warning',
            'entity_type' => 'invoice',
            'entity_id' => $this->invoice->id,
            'invoice_id' => $this->invoice->id,
            'invoice_number' => $this->invoice->invoice_number,
            'reminder_date' => now()->toDateString(),
            'due_date' => $this->invoice->due_date?->toDateString(),
            'days_until_due' => $this->daysUntilDue,
            'status' => $timing,
            'created_at' => now()->toISOString(),
        ];
    }
}
