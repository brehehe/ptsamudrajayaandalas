<?php

use App\Models\PushSubscription;
use App\Models\User;

test('authenticated user can register a browser push subscription', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('push-subscriptions.store'), [
            'token' => 'fcm-device-token-1',
            'device_name' => 'Chrome Desktop',
        ], [
            'User-Agent' => 'SJA Test Browser',
        ])
        ->assertNoContent();

    $subscription = PushSubscription::query()->sole();

    expect($subscription->user_id)->toBe($user->id)
        ->and($subscription->token)->toBe('fcm-device-token-1')
        ->and($subscription->device_name)->toBe('Chrome Desktop')
        ->and($subscription->user_agent)->toBe('SJA Test Browser')
        ->and($subscription->last_seen_at)->not->toBeNull();
});

test('browser token follows the current authenticated account without creating duplicates', function () {
    $firstUser = User::factory()->create();
    $secondUser = User::factory()->create();
    PushSubscription::factory()->for($firstUser)->create([
        'token' => 'shared-browser-token',
    ]);

    $this->actingAs($secondUser)
        ->post(route('push-subscriptions.store'), [
            'token' => 'shared-browser-token',
            'device_name' => 'Chrome Mobile',
        ])
        ->assertNoContent();

    expect(PushSubscription::query()->count())->toBe(1)
        ->and(PushSubscription::query()->sole()->user_id)->toBe($secondUser->id);
});

test('user can remove only their own browser push subscription', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $ownSubscription = PushSubscription::factory()->for($user)->create();
    $otherSubscription = PushSubscription::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->delete(route('push-subscriptions.destroy'), [
            'token' => $otherSubscription->token,
        ])
        ->assertNoContent();

    $this->assertModelExists($otherSubscription);

    $this->actingAs($user)
        ->delete(route('push-subscriptions.destroy'), [
            'token' => $ownSubscription->token,
        ])
        ->assertNoContent();

    $this->assertModelMissing($ownSubscription);
});

test('push subscription endpoints require authentication and a valid token', function () {
    $this->post(route('push-subscriptions.store'), ['token' => 'guest-token'])
        ->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create())
        ->post(route('push-subscriptions.store'), [])
        ->assertSessionHasErrors([
            'token' => 'Token notifikasi perangkat tidak tersedia.',
        ]);
});
