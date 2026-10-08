<?php

use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Notifications\WorkflowActionNotification;
use App\Support\WorkflowNotifier;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function workflowNotificationUser(string $role, bool $active = true): User
{
    $user = User::factory()->create(['is_active' => $active]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

function workflowShipRequest(User $creator, string $status = 'Menunggu Approval'): ShipRequest
{
    $company = ShipCompany::create([
        'name' => 'PT Notifikasi Workflow',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'name' => 'KM Notifikasi',
        'ship_company_id' => $company->id,
        'image' => 'ships/notifikasi.jpg',
        'is_active' => true,
    ]);

    return ShipRequest::create([
        'request_number' => 'PGJ-NOTIF-'.fake()->unique()->numerify('####'),
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'created_by' => $creator->id,
        'status' => $status,
        'request_date' => today(),
    ]);
}

test('a new operational submission notifies only active administrators with an actionable payload', function () {
    Notification::fake();

    $operational = workflowNotificationUser('Lapangan');
    $administrator = workflowNotificationUser('Admin');
    $inactiveAdministrator = workflowNotificationUser('Admin Sistem', false);
    $director = workflowNotificationUser('Direktur');
    $shipRequest = workflowShipRequest($operational);

    app(WorkflowNotifier::class)->notifySubmission($shipRequest, $operational);

    Notification::assertSentTo(
        $administrator,
        WorkflowActionNotification::class,
        function (WorkflowActionNotification $notification): bool {
            return $notification->payload['action_required'] === true
                && $notification->payload['tone'] === 'blue'
                && $notification->payload['entity_type'] === 'ship_request'
                && $notification->payload['ship_name'] === 'KM Notifikasi'
                && str_contains($notification->payload['url'], '/requests/');
        },
    );
    Notification::assertNotSentTo($operational, WorkflowActionNotification::class);
    Notification::assertNotSentTo($inactiveAdministrator, WorkflowActionNotification::class);
    Notification::assertNotSentTo($director, WorkflowActionNotification::class);
});

test('forwarding resolves the administrator task and creates a director task', function () {
    Notification::fake();

    $operational = workflowNotificationUser('Lapangan');
    $administrator = workflowNotificationUser('Admin');
    $director = workflowNotificationUser('Direktur');
    $shipRequest = workflowShipRequest($operational, 'Menunggu Approval Direktur');

    $administrator->notifications()->create([
        'id' => (string) Str::uuid(),
        'type' => 'workflow-action',
        'data' => [
            'title' => 'Pengajuan baru',
            'message' => 'Periksa pengajuan.',
            'url' => '/requests',
            'action_label' => 'Periksa',
            'action_required' => true,
            'tone' => 'blue',
            'entity_type' => 'ship_request',
            'entity_id' => (string) $shipRequest->id,
            'created_at' => now()->toIso8601String(),
        ],
    ]);

    expect($administrator->unreadNotifications()->count())->toBe(1);

    app(WorkflowNotifier::class)->notifyForwardedToDirector($shipRequest, $administrator);

    expect($administrator->unreadNotifications()->count())->toBe(0);
    Notification::assertSentTo(
        $director,
        WorkflowActionNotification::class,
        fn (WorkflowActionNotification $notification): bool => $notification->payload['action_required'] === true
            && str_contains($notification->payload['url'], '/approvals/'),
    );
});

test('action notifications cannot be dismissed manually but informational notifications can', function () {
    $administrator = workflowNotificationUser('Admin');

    $required = new WorkflowActionNotification([
        'title' => 'Tugas wajib',
        'message' => 'Selesaikan proses.',
        'url' => '/requests',
        'action_label' => 'Buka',
        'action_required' => true,
        'tone' => 'blue',
        'entity_type' => 'ship_request',
        'entity_id' => 'required-task',
        'created_at' => now()->toIso8601String(),
    ]);
    $information = new WorkflowActionNotification([
        'title' => 'Informasi',
        'message' => 'Status sudah diperbarui.',
        'url' => '/requests',
        'action_label' => 'Lihat',
        'action_required' => false,
        'tone' => 'green',
        'entity_type' => 'ship_request',
        'entity_id' => 'information',
        'created_at' => now()->toIso8601String(),
    ]);

    $administrator->notifyNow($required, ['database']);
    $administrator->notifyNow($information, ['database']);

    $requiredRecord = $administrator->notifications()->where('data->entity_id', 'required-task')->firstOrFail();
    $informationRecord = $administrator->notifications()->where('data->entity_id', 'information')->firstOrFail();

    $this->actingAs($administrator)
        ->from(route('dashboard'))
        ->post(route('notifications.read', $requiredRecord->id))
        ->assertRedirect(route('dashboard'))
        ->assertSessionHas('error');

    expect($requiredRecord->fresh()->read_at)->toBeNull();

    $this->actingAs($administrator)
        ->from(route('dashboard'))
        ->post(route('notifications.read', $informationRecord->id))
        ->assertRedirect(route('dashboard'));

    expect($informationRecord->fresh()->read_at)->not->toBeNull();
});

test('dashboard places actionable submissions above newer informational submissions', function () {
    $administrator = workflowNotificationUser('Admin');
    $operational = workflowNotificationUser('Lapangan');
    $actionable = workflowShipRequest($operational, 'Menunggu Approval');
    $informational = workflowShipRequest($operational, 'Dalam Proses');

    $actionable->forceFill([
        'created_at' => now()->subDay(),
        'updated_at' => now()->subDay(),
    ])->saveQuietly();
    $informational->forceFill([
        'created_at' => now(),
        'updated_at' => now(),
    ])->saveQuietly();

    $this->actingAs($administrator)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('latest_requests.0.id', (string) $actionable->id)
            ->where('latest_requests.0.is_new', true)
            ->where('latest_requests.1.id', (string) $informational->id)
            ->where('latest_requests.1.is_new', false)
        );
});
