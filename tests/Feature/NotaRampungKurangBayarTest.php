<?php

use App\Models\CompletionNote;
use App\Models\PortCall;
use App\Models\RequestHistory;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function createNotaRampungUser(string $role): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

test('operational admin can upload nota rampung and submit shortfall request to director', function () {
    Storage::fake('local');

    $admin = createNotaRampungUser('Admin');
    $ship = Ship::create([
        'name' => 'TB Samudra Pelindo',
        'status' => 'Sandar',
        'is_active' => true,
    ]);

    $portCall = PortCall::create([
        'ship_id' => $ship->id,
        'job_number' => 'JOB-PLD-001',
        'status' => 'berthed',
    ]);

    $parentRequest = ShipRequest::create([
        'request_number' => 'PGJ-2026-0010',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'service_type' => 'clearance_in',
        'created_by' => $admin->id,
        'status' => 'Disetujui',
        'request_date' => now()->toDateString(),
    ]);

    $file = UploadedFile::fake()->create('nota_rampung_pelindo.pdf', 500, 'application/pdf');

    $response = $this->actingAs($admin)->post(route('requests.nota-rampung-kurang-bayar', $portCall->job_number), [
        'document' => $file,
        'shortfall_amount' => 2500000,
        'document_number' => 'NR-PELINDO-2026-0099',
        'submission_date' => now()->toDateString(),
        'notes' => 'Kekurangan bayar labuh tambat dan pandu Pelindo.',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // 1. CompletionNote created
    $this->assertDatabaseHas('completion_notes', [
        'port_call_id' => $portCall->id,
        'document_number' => 'NR-PELINDO-2026-0099',
        'actual_amount' => 2500000,
        'status' => 'uploaded',
    ]);

    // 2. New ShipRequest created with status Menunggu Approval Direktur
    $newRequest = ShipRequest::where('port_call_id', $portCall->id)
        ->where('request_number', '!=', 'PGJ-2026-0010')
        ->first();

    expect($newRequest)->not->toBeNull();
    expect($newRequest->status)->toBe('Menunggu Approval Direktur');
    expect($newRequest->forwarded_to_director_at)->not->toBeNull();

    // 3. RequestItem created
    $item = RequestItem::where('request_id', $newRequest->id)->first();
    expect($item)->not->toBeNull();
    expect((float) $item->hpp_price)->toBe(2500000.0);
    expect($item->status)->toBe('diajukan_ke_direktur');
    expect($item->director_status)->toBe('pending');
    expect($item->supplier_invoice_number)->toBe('NR-PELINDO-2026-0099');
    expect($item->hasCompleteSupplierInvoice())->toBeTrue();

    // 4. RequestHistory logged
    $history = RequestHistory::where('request_id', $newRequest->id)->first();
    expect($history)->not->toBeNull();
    expect($history->actor_role)->toBe('Admin');
    expect($history->action)->toBe('submitted_to_director');

    // 5. Parent request history logged
    $parentHistory = RequestHistory::where('request_id', $parentRequest->id)->first();
    expect($parentHistory)->not->toBeNull();
});

test('nota rampung shortfall requires document and positive amount', function () {
    $admin = createNotaRampungUser('Admin');
    $ship = Ship::create(['name' => 'TB Test Ship 2', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create(['ship_id' => $ship->id, 'job_number' => 'JOB-VAL-002']);

    $response = $this->actingAs($admin)->post(route('requests.nota-rampung-kurang-bayar', $portCall->id), [
        'document' => null,
        'shortfall_amount' => -100,
    ]);

    $response->assertSessionHasErrors(['document', 'shortfall_amount']);
});

test('director can approve the nota rampung shortfall request', function () {
    Storage::fake('local');

    $admin = createNotaRampungUser('Admin');
    $director = createNotaRampungUser('Direktur');
    $ship = Ship::create(['name' => 'TB Kapal Pelindo', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create(['ship_id' => $ship->id, 'job_number' => 'JOB-PLD-003']);

    $file = UploadedFile::fake()->create('nota_rampung.pdf', 300, 'application/pdf');

    $this->actingAs($admin)->post(route('requests.nota-rampung-kurang-bayar', $portCall->id), [
        'document' => $file,
        'shortfall_amount' => 1750000,
        'document_number' => 'NR-PELINDO-1234',
        'submission_date' => now()->toDateString(),
        'notes' => 'Kurang bayar',
    ]);

    $newRequest = ShipRequest::where('port_call_id', $portCall->id)->first();
    $item = RequestItem::where('request_id', $newRequest->id)->first();

    $response = $this->actingAs($director)->post(route('approvals.requests.item-decision', $newRequest->id), [
        'decisions' => [
            [
                'item_id' => $item->id,
                'status' => 'approved',
                'director_notes' => 'Disetujui untuk bayar kekurangan Pelindo',
            ],
        ],
    ]);

    $response->assertRedirect();
    $item->refresh();
    expect($item->director_status)->toBe('approved');
    expect($item->status)->toBe('disetujui');
});
