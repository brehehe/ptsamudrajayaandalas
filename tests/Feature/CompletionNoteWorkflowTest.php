<?php

use App\Models\CompletionNote;
use App\Models\CostReconciliation;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function completionWorkflowUser(string $role): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

function completionWorkflowPortCall(string $status): PortCall
{
    $ship = Ship::create(['name' => 'KM Nota Rampung', 'is_active' => true]);
    $port = Port::create(['code' => 'NT01', 'name' => 'Pelabuhan Nota', 'city' => 'Gresik', 'is_active' => true]);

    return PortCall::create([
        'job_number' => 'JOB-NOTA-001',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => $status,
        'departed_at' => $status === 'departed' ? now()->subDay() : null,
        'completion_note_due_at' => now()->addDay(),
        'financial_status' => 'waiting_completion_note',
    ]);
}

test('completion note is accepted only after departure then verified and reconciled once', function () {
    Storage::fake('local');
    $admin = completionWorkflowUser('Admin');
    $portCall = completionWorkflowPortCall('departed');

    $this->actingAs($admin)->post(route('completion-notes.store'), [
        'port_call_id' => $portCall->id,
        'document_number' => 'NR-PELINDO-001',
        'issued_at' => now()->toDateString(),
        'downloaded_at' => now()->toDateString(),
        'actual_amount' => 2750000,
        'document' => UploadedFile::fake()->create('nota-rampung.pdf', 100, 'application/pdf'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $note = CompletionNote::query()->firstOrFail();
    Storage::disk('local')->assertExists($note->document_path);

    $this->actingAs($admin)->post(route('completion-notes.transition', $note), [
        'action' => 'verify',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($admin)->post(route('completion-notes.transition', $note), [
        'action' => 'reconcile',
        'initial_total' => 2500000,
        'actual_total' => 2750000,
        'adjustment' => 250000,
        'notes' => 'Selisih dicatat sebagai realisasi.',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $reconciliation = CostReconciliation::query()->firstOrFail();
    expect($note->fresh()->status)->toBe('reconciled')
        ->and((float) $reconciliation->variance)->toBe(250000.0)
        ->and($portCall->fresh()->financial_status)->toBe('billing')
        ->and($portCall->fresh()->reconciled_at)->not->toBeNull();

    $this->actingAs($admin)->post(route('completion-notes.transition', $note), [
        'action' => 'reconcile', 'initial_total' => 1, 'actual_total' => 1,
    ])->assertForbidden();
});

test('completion note cannot be uploaded before the ship departs', function () {
    Storage::fake('local');
    $admin = completionWorkflowUser('Admin');
    $portCall = completionWorkflowPortCall('berthed');

    $this->actingAs($admin)->post(route('completion-notes.store'), [
        'port_call_id' => $portCall->id,
        'document_number' => 'NR-EARLY-001',
        'issued_at' => now()->toDateString(),
        'actual_amount' => 100000,
        'document' => UploadedFile::fake()->create('nota.pdf', 20, 'application/pdf'),
    ])->assertSessionHasErrors('port_call_id');

    $this->assertDatabaseCount('completion_notes', 0);
});
