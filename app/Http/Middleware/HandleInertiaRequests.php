<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'primary_role' => $user->getPrimaryRoleName(),
                    'roles' => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                ] : null,
            ],
            'notifications' => fn (): array => $user ? [
                'unread_count' => $user->unreadNotifications()->count(),
                'items' => $user->notifications()
                    ->latest()
                    ->limit(15)
                    ->get()
                    ->map(fn (DatabaseNotification $notification): array => [
                        'id' => $notification->id,
                        'type' => $notification->type,
                        'title' => $notification->data['title'] ?? 'Notifikasi',
                        'message' => $notification->data['message'] ?? '',
                        'url' => $notification->data['url'] ?? '/dashboard',
                        'action_label' => $notification->data['action_label'] ?? 'Buka',
                        'action_required' => (bool) ($notification->data['action_required'] ?? false),
                        'tone' => $notification->data['tone'] ?? 'blue',
                        'entity_type' => $notification->data['entity_type'] ?? null,
                        'entity_id' => $notification->data['entity_id'] ?? null,
                        'request_number' => $notification->data['request_number'] ?? null,
                        'ship_name' => $notification->data['ship_name'] ?? null,
                        'ship_image' => $notification->data['ship_image'] ?? null,
                        'status' => $notification->data['status'] ?? null,
                        'read_at' => $notification->read_at?->toIso8601String(),
                        'created_at' => $notification->created_at?->toIso8601String(),
                    ])
                    ->values(),
            ] : ['unread_count' => 0, 'items' => []],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'submitted_request_number' => fn () => $request->session()->get('submitted_request_number'),
                'submitted_request_id' => fn () => $request->session()->get('submitted_request_id'),
                'created_work_order' => fn () => $request->session()->get('created_work_order'),
            ],
        ];
    }
}
