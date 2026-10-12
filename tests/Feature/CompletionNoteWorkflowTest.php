<?php

use App\Models\CompletionNote;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function completionWorkflowUser(string $role): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

function completionWorkflowPortCall(string $status, User $creator): PortCall
{
    $company = ShipCompany::create(['name' => 'PT Klien Nota Rampung', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Nota Rampung', 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => 'NT01', 'name' => 'Pelabuhan Nota', 'city' => 'Gresik', 'is_active' => true]);
    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-NOTA-001',
        'client_number' => 'SPK/KLIEN/NOTA/001',
        'company_id' => $company->id,
        'status' => 'awaiting_completion_note',
        'created_by' => $creator->id,
        'assigned_to' => $creator->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
    ]);

    return PortCall::create([
        'job_number' => 'JOB-NOTA-001',
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => $status,
        'departed_at' => $status === 'departed' ? now()->subDay() : null,
        'completion_note_due_at' => now()->addDay(),
        'financial_status' => 'waiting_completion_note',
    ]);
}

test('completion note is uploaded once and reconciled against prior job payments', function () {
    Storage::fake('local');
    $admin = completionWorkflowUser('Admin');
    $portCall = completionWorkflowPortCall('departed', $admin);

    $this->actingAs($admin)
        ->get(route('completion-notes.create', ['port_call_id' => $portCall->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('CompletionNotes/Create')
            ->where('preselectedPortCallId', $portCall->id)
            ->where('portCalls.0.id', $portCall->id)
            ->where('portCalls.0.client_spk_number', 'SPK/KLIEN/NOTA/001'));

    $this->actingAs($admin)->post(route('completion-notes.store'), [
        'port_call_id' => $portCall->id,
        'actual_amount' => 1250000,
        'document' => UploadedFile::fake()->create('nota-rampung.pdf', 100, 'application/pdf'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $note = CompletionNote::query()->firstOrFail();
    Storage::disk('local')->assertExists($note->document_path);
    expect($note->document_number)->toStartWith('NR-SJA-')
        ->and($note->status)->toBe('reconciled')
        ->and((float) $note->actual_amount)->toBe(1250000.0)
        ->and((float) $note->reconciliation->initial_total)->toBe(0.0)
        ->and((float) $note->reconciliation->variance)->toBe(1250000.0)
        ->and($note->reconciliation->status)->toBe('shortfall')
        ->and($portCall->fresh()->financial_status)->toBe('reconciliation_shortfall');

    $this->actingAs($admin)
        ->get(route('completion-notes.index'))
        ->assertInertia(fn ($page) => $page
            ->component('CompletionNotes/Index')
            ->has('notes.data', 1)
            ->where('notes.data.0.id', $note->id)
            ->where('notes.data.0.port_call.job_number', 'JOB-NOTA-001'));

    $this->actingAs($admin)->post(route('completion-notes.store'), [
        'port_call_id' => $portCall->id,
        'actual_amount' => 1250000,
        'document' => UploadedFile::fake()->create('nota-rampung-2.pdf', 100, 'application/pdf'),
    ])->assertSessionHasErrors('port_call_id');

    $this->assertDatabaseCount('completion_notes', 1);
});

test('vessel and request job details expose the same completion note record', function () {
    $admin = completionWorkflowUser('Admin');
    $portCall = completionWorkflowPortCall('departed', $admin);
    $note = CompletionNote::create([
        'port_call_id' => $portCall->id,
        'document_number' => 'NR-SJA-DETAIL-001',
        'departed_at' => $portCall->departed_at,
        'issued_at' => now()->toDateString(),
        'uploaded_at' => now(),
        'document_path' => 'sja/completion-notes/detail.pdf',
        'actual_amount' => 900000,
        'status' => 'uploaded',
        'uploaded_by' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->get(route('vessels.show', [
            'id' => $portCall->ship_id,
            'visit' => $portCall->id,
        ]))
        ->assertInertia(fn ($page) => $page
            ->component('Vessels/Show')
            ->where('canCreateCompletionNotes', true)
            ->where('selectedVisit.completion_note.id', $note->id)
            ->where('selectedVisit.completion_note.document_number', 'NR-SJA-DETAIL-001'));

    $this->actingAs($admin)
        ->get(route('requests.detail', $portCall->job_number))
        ->assertInertia(fn ($page) => $page
            ->component('Requests/Show')
            ->where('capabilities.can_create_completion_notes', true)
            ->where('job.completion_note.id', $note->id)
            ->where('job.completion_note.document_number', 'NR-SJA-DETAIL-001'));
});

test('completion note cannot be uploaded before the ship departs', function () {
    Storage::fake('local');
    $admin = completionWorkflowUser('Admin');
    $portCall = completionWorkflowPortCall('berthed', $admin);

    $this->actingAs($admin)->post(route('completion-notes.store'), [
        'port_call_id' => $portCall->id,
        'actual_amount' => 500000,
        'document' => UploadedFile::fake()->create('nota.pdf', 20, 'application/pdf'),
    ])->assertSessionHasErrors('port_call_id');

    $this->assertDatabaseCount('completion_notes', 0);
});

test('word completion note document can be uploaded and viewed inline', function () {
    Storage::fake('local');
    $admin = completionWorkflowUser('Admin');
    $portCall = completionWorkflowPortCall('departed', $admin);

    $this->actingAs($admin)->post(route('completion-notes.store'), [
        'port_call_id' => $portCall->id,
        'actual_amount' => 750000,
        'document' => UploadedFile::fake()->create(
            'nota-rampung.docx',
            100,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $note = CompletionNote::query()->sole();
    Storage::disk('local')->assertExists($note->document_path);

    $response = $this->actingAs($admin)->get(route('completion-notes.document', [
        'completionNote' => $note,
        'view' => 1,
    ]));

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toStartWith('inline;');
});
