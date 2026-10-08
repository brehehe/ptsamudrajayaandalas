<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    public function markRead(Request $request, string $notification): RedirectResponse
    {
        /** @var DatabaseNotification $databaseNotification */
        $databaseNotification = $request->user()
            ->notifications()
            ->whereKey($notification)
            ->firstOrFail();

        if (($databaseNotification->data['action_required'] ?? false) && $databaseNotification->read_at === null) {
            return back()->with('error', 'Notifikasi tugas akan selesai otomatis setelah tindak lanjut dilakukan.');
        }

        $databaseNotification->markAsRead();

        return back();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $request->user()
            ->unreadNotifications
            ->filter(fn (DatabaseNotification $notification): bool => ! ($notification->data['action_required'] ?? false))
            ->each->markAsRead();

        return back();
    }
}
