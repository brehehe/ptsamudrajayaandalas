<?php

use App\Models\ExpenseRequest;
use App\Models\FundingRequest;
use App\Models\OutgoingPayment;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function fundingUser(string $role): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

function fundingPortCall(): PortCall
{
    $ship = Ship::create(['name' => 'KM Funding Workflow', 'is_active' => true]);
    $port = Port::create(['code' => 'IDFND', 'name' => 'Pelabuhan Funding', 'city' => 'Gresik', 'is_active' => true]);

    return PortCall::create([
        'job_number' => 'JOB-FUNDING-001',
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'anchored',
        'financial_status' => 'pending_reconciliation',
    ]);
}

function fundingRequestItem(PortCall $portCall, User $creator, float $amount): RequestItem
{
    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-FUNDING-001',
        'ship_id' => $portCall->ship_id,
        'port_id' => $portCall->port_id,
        'port_call_id' => $portCall->id,
        'created_by' => $creator->id,
        'status' => 'Disetujui',
        'request_date' => '2026-10-01',
    ]);

    return $shipRequest->items()->create([
        'item_name' => 'Pengurusan sertifikat kapal',
        'quantity' => 1,
        'unit' => 'Paket',
        'hpp_price' => $amount,
        'selling_price' => $amount * 1.2,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
}

test('operational funding follows admin director kopra disbursement realization and verification stages', function () {
    Storage::fake('local');
    $operational = fundingUser('Lapangan');
    $admin = fundingUser('Admin');
    $director = fundingUser('Direktur');
    $portCall = fundingPortCall();
    $requestItem = fundingRequestItem($portCall, $operational, 1500000);

    $this->actingAs($operational)->post(route('funding.requests.store'), [
        'port_call_id' => $portCall->id,
        'source_type' => 'operational',
        'document_date' => '2026-10-01',
        'request_item_ids' => [$requestItem->id],
        'notes' => 'Dibutuhkan petugas lapangan.',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $expense = ExpenseRequest::query()->firstOrFail();
    expect($expense->status)->toBe('waiting_admin_review')
        ->and($expense->items()->value('request_item_id'))->toBe($requestItem->id);

    $this->actingAs($operational)->post(route('funding.requests.store'), [
        'port_call_id' => $portCall->id,
        'source_type' => 'operational',
        'document_date' => '2026-10-01',
        'request_item_ids' => [$requestItem->id],
    ])->assertSessionHasErrors('request_item_ids');

    $this->assertDatabaseCount('expense_requests', 1);

    $this->actingAs($admin)->post(route('funding.admin-review', $expense), [
        'decision' => 'approve',
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($expense->fresh()->status)->toBe('waiting_director');

    $this->actingAs($director)->post(route('funding.director-review', $expense), [
        'decision' => 'approve',
        'approved_amount' => 1500000,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $funding = FundingRequest::query()->firstOrFail();
    expect($funding->status)->toBe('approved_director');

    $this->actingAs($admin)->post(route('funding.transition', $funding), [
        'action' => 'submit_kopra',
        'kopra_reference' => 'KOPRA-TEST-001',
        'submitted_date' => '2026-10-02',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($director)->post(route('funding.transition', $funding), [
        'action' => 'approve_kopra',
        'approved_amount' => 1500000,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($admin)->post(route('funding.transition', $funding), [
        'action' => 'record_payment',
        'payment_destination' => 'vendor',
        'recipient' => 'Vendor eksternal',
        'payment_date' => '2026-10-03',
        'reference_number' => 'TRF-VENDOR-001',
        'amount' => 100000,
        'proof' => UploadedFile::fake()->image('vendor.jpg'),
    ])->assertInvalid(['payment_destination']);

    $this->assertDatabaseCount('outgoing_payments', 0);

    $this->actingAs($admin)->post(route('funding.transition', $funding), [
        'action' => 'record_receipt',
        'received_date' => '2026-10-03',
        'destination_account' => 'Rekening operasional SJA',
        'reference_number' => 'CAIR-TEST-001',
        'amount' => 1500000,
        'proof' => UploadedFile::fake()->image('pencairan.jpg'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($admin)->post(route('funding.transition', $funding), [
        'action' => 'record_payment',
        'payment_destination' => 'operational',
        'recipient' => $operational->name,
        'beneficiary_user_id' => $operational->id,
        'payment_date' => '2026-10-03',
        'reference_number' => 'TRF-PRIMA-001',
        'amount' => 1500000,
        'proof' => UploadedFile::fake()->image('transfer.jpg'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $payment = OutgoingPayment::query()->firstOrFail();
    expect($payment->verification_status)->toBe('waiting_usage_proof');

    $this->actingAs($operational)->post(route('funding.payments.transition', $payment), [
        'action' => 'submit_usage',
        'actual_amount' => 1400000,
        'remaining_amount' => 100000,
        'notes' => 'Sertifikat selesai diurus.',
        'proof' => UploadedFile::fake()->image('realisasi.jpg'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($admin)->post(route('funding.payments.transition', $payment), [
        'action' => 'verify_usage',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($payment->fresh()->verification_status)->toBe('verified')
        ->and($funding->fresh()->status)->toBe('completed')
        ->and($expense->fresh()->status)->toBe('completed');
});

test('operational user cannot approve their own funding request', function () {
    $operational = fundingUser('Lapangan');
    $portCall = fundingPortCall();
    $expense = ExpenseRequest::create([
        'request_number' => 'FND-SELF-001',
        'port_call_id' => $portCall->id,
        'status' => 'waiting_director',
        'currency' => 'IDR',
        'total' => 500000,
        'created_by' => $operational->id,
        'submitted_at' => now(),
    ]);

    $this->actingAs($operational)->post(route('funding.director-review', $expense), [
        'decision' => 'approve',
        'approved_amount' => 500000,
    ])->assertForbidden();

    expect($expense->fresh()->status)->toBe('waiting_director');
});
