<?php

use App\Models\PushSubscription;
use App\Models\User;
use App\Notifications\Channels\FirebaseCloudMessagingChannel;
use App\Notifications\WorkflowActionNotification;
use App\Support\FirebaseCloudMessaging;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

function configureFirebaseTestCredentials(): void
{
    $privateKeyResource = openssl_pkey_new([
        'private_key_bits' => 2048,
        'private_key_type' => OPENSSL_KEYTYPE_RSA,
    ]);
    expect($privateKeyResource)->not->toBeFalse();

    $privateKey = '';
    expect(openssl_pkey_export($privateKeyResource, $privateKey))->toBeTrue();

    config([
        'cache.default' => 'array',
        'services.firebase.project_id' => 'gride-notification',
        'services.firebase.credentials_base64' => base64_encode(json_encode([
            'project_id' => 'gride-notification',
            'client_email' => 'firebase-admin@example.test',
            'private_key' => $privateKey,
            'token_uri' => 'https://oauth2.googleapis.com/token',
        ], JSON_THROW_ON_ERROR)),
    ]);
    Cache::clear();
}

function firebaseWorkflowNotification(): WorkflowActionNotification
{
    return new WorkflowActionNotification([
        'title' => 'Pengajuan baru',
        'message' => 'Pengajuan menunggu pemeriksaan Admin.',
        'url' => '/requests/JOB-001/detail',
        'action_label' => 'Periksa pengajuan',
        'action_required' => true,
        'tone' => 'blue',
        'entity_type' => 'ship_request',
        'entity_id' => 'request-001',
        'created_at' => now()->toIso8601String(),
    ]);
}

test('firebase client obtains an oauth token and sends a data-only web push message', function () {
    configureFirebaseTestCredentials();
    Http::preventStrayRequests();
    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'firebase-access-token',
            'expires_in' => 3600,
        ]),
        'https://fcm.googleapis.com/v1/projects/gride-notification/messages:send' => Http::response([
            'name' => 'projects/gride-notification/messages/message-001',
        ]),
    ]);

    $sent = app(FirebaseCloudMessaging::class)->send('registered-device-token', [
        'title' => 'Pengajuan baru',
        'body' => 'Ada pengajuan yang perlu diperiksa.',
        'url' => '/requests/JOB-001/detail',
        'entity_type' => 'ship_request',
        'entity_id' => 'request-001',
    ]);

    expect($sent)->toBeTrue();
    Http::assertSentCount(2);
    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://fcm.googleapis.com/v1/projects/gride-notification/messages:send'
        && $request->hasHeader('Authorization', 'Bearer firebase-access-token')
        && $request['message']['token'] === 'registered-device-token'
        && $request['message']['data']['title'] === 'Pengajuan baru'
        && $request['message']['webpush']['fcm_options']['link'] === url('/requests/JOB-001/detail'));
});

test('firebase channel removes a device token rejected as unregistered', function () {
    configureFirebaseTestCredentials();
    Http::preventStrayRequests();
    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'firebase-access-token',
            'expires_in' => 3600,
        ]),
        'https://fcm.googleapis.com/v1/projects/gride-notification/messages:send' => Http::response([
            'error' => [
                'status' => 'NOT_FOUND',
                'details' => [['errorCode' => 'UNREGISTERED']],
            ],
        ], 404),
    ]);
    $user = User::factory()->create();
    $subscription = PushSubscription::factory()->for($user)->create();

    $result = app(FirebaseCloudMessagingChannel::class)->send($user, firebaseWorkflowNotification());

    expect($result)->toBe(['sent' => 0, 'removed' => 1]);
    $this->assertModelMissing($subscription);
});

test('firebase channel is a no-op when server credentials are not configured', function () {
    config([
        'services.firebase.project_id' => null,
        'services.firebase.credentials_base64' => null,
    ]);
    Http::preventStrayRequests();
    $user = User::factory()->create();
    $subscription = PushSubscription::factory()->for($user)->create();

    $result = app(FirebaseCloudMessagingChannel::class)->send($user, firebaseWorkflowNotification());

    expect($result)->toBe(['sent' => 0, 'removed' => 0]);
    $this->assertModelExists($subscription);
    Http::assertNothingSent();
});
