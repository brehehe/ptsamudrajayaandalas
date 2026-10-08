<?php

namespace App\Notifications\Channels;

use App\Models\PushSubscription;
use App\Support\FirebaseCloudMessaging;
use Illuminate\Notifications\Notification;

class FirebaseCloudMessagingChannel
{
    public function __construct(private FirebaseCloudMessaging $messaging) {}

    /** @return array{sent: int, removed: int} */
    public function send(object $notifiable, Notification $notification): array
    {
        if (! $this->messaging->isConfigured()
            || ! method_exists($notifiable, 'pushSubscriptions')
            || ! method_exists($notification, 'toFirebase')) {
            return ['sent' => 0, 'removed' => 0];
        }

        /** @var array<string, string|null> $payload */
        $payload = $notification->toFirebase($notifiable);
        $sent = 0;
        $removed = 0;

        $notifiable->pushSubscriptions()
            ->orderBy('id')
            ->each(function (PushSubscription $subscription) use ($payload, &$sent, &$removed): void {
                if ($this->messaging->send($subscription->token, $payload)) {
                    $sent++;

                    return;
                }

                $subscription->delete();
                $removed++;
            });

        return ['sent' => $sent, 'removed' => $removed];
    }
}
