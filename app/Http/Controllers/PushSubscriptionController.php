<?php

namespace App\Http\Controllers;

use App\Http\Requests\DestroyPushSubscriptionRequest;
use App\Http\Requests\StorePushSubscriptionRequest;
use App\Models\PushSubscription;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class PushSubscriptionController extends Controller
{
    public function store(StorePushSubscriptionRequest $request): Response
    {
        $validated = $request->validated();

        PushSubscription::query()->updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => $request->user()->id,
                'platform' => 'web',
                'device_name' => $validated['device_name'] ?? null,
                'user_agent' => Str::limit((string) $request->userAgent(), 1000, ''),
                'last_seen_at' => now(),
            ],
        );

        return response()->noContent();
    }

    public function destroy(DestroyPushSubscriptionRequest $request): Response
    {
        $request->user()
            ->pushSubscriptions()
            ->where('token', $request->validated('token'))
            ->delete();

        return response()->noContent();
    }
}
