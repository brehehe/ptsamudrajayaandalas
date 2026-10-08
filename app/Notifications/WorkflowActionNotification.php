<?php

namespace App\Notifications;

use App\Notifications\Channels\FirebaseCloudMessagingChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class WorkflowActionNotification extends Notification implements ShouldQueueAfterCommit
{
    use Queueable;

    /**
     * @param  array{
     *     title: string,
     *     message: string,
     *     url: string,
     *     action_label: string,
     *     action_required: bool,
     *     tone: string,
     *     entity_type: string,
     *     entity_id: string,
     *     request_number?: string,
     *     ship_name?: string,
     *     ship_image?: string|null,
     *     status?: string,
     *     created_at: string
     * }  $payload
     */
    public function __construct(public readonly array $payload) {}

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
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->payload;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return $this->payload;
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload);
    }

    public function databaseType(object $notifiable): string
    {
        return 'workflow-action';
    }

    public function broadcastType(): string
    {
        return 'workflow-action';
    }

    /** @return array<string, string|null> */
    public function toFirebase(object $notifiable): array
    {
        return [
            'title' => $this->payload['title'],
            'body' => $this->payload['message'],
            'url' => $this->payload['url'],
            'action_label' => $this->payload['action_label'],
            'tone' => $this->payload['tone'],
            'entity_type' => $this->payload['entity_type'],
            'entity_id' => $this->payload['entity_id'],
            'notification_id' => $this->id,
        ];
    }
}
