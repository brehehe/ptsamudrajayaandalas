<?php

namespace App\Notifications;

use App\Models\CostDocument;
use App\Notifications\Channels\FirebaseCloudMessagingChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class VendorInvoiceDueReminder extends Notification
{
    use Queueable;

    public function __construct(
        public readonly CostDocument $costDocument,
        public readonly int $daysUntilDue
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast', FirebaseCloudMessagingChannel::class];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->payload();
    }

    /**
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
        return 'vendor-invoice-due-reminder';
    }

    public function broadcastType(): string
    {
        return 'vendor-invoice-due-reminder';
    }

    /**
     * @return array<string, string|null>
     */
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

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        $timing = $this->daysUntilDue < 0
            ? 'telah lewat jatuh tempo'
            : ($this->daysUntilDue === 0 ? 'jatuh tempo hari ini' : "jatuh tempo H-{$this->daysUntilDue}");

        $vendorName = $this->costDocument->vendor?->name ?? $this->costDocument->issuer_name ?? 'Vendor';

        return [
            'title' => 'Pengingat jatuh tempo invoice vendor',
            'message' => "Invoice vendor {$this->costDocument->document_number} ({$vendorName}) {$timing}.",
            'url' => route('expenses.index', ['tab' => 'vendor_invoices'], false),
            'action_label' => 'Periksa Invoice Vendor',
            'action_required' => true,
            'tone' => $this->daysUntilDue <= 0 ? 'red' : 'blue',
            'entity_type' => 'cost_document',
            'entity_id' => (string) $this->costDocument->id,
            'cost_document_id' => (string) $this->costDocument->id,
            'document_number' => $this->costDocument->document_number,
            'reminder_date' => now()->toDateString(),
            'due_date' => $this->costDocument->due_date?->toDateString(),
            'days_until_due' => $this->daysUntilDue,
            'status' => $timing,
            'created_at' => now()->toISOString(),
        ];
    }
}
