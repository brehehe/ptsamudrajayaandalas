<?php

use App\Models\ExpenseRequest;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;

function createTaktisUser(string $role): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

test('operational admin can submit taktis supplement for price shortage', function () {
    $admin = createTaktisUser('Admin');
    $ship = Ship::create([
        'name' => 'TB Samudra Perkasa',
        'status' => 'Sandar',
        'is_active' => true,
    ]);

    $portCall = PortCall::create([
        'ship_id' => $ship->id,
        'job_number' => 'JOB-SPK-TEST-001',
        'status' => 'berthed',
    ]);

    $parentRequest = ShipRequest::create([
        'request_number' => 'PGJ-2026-0015',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'service_type' => 'clearance_in',
        'created_by' => $admin->id,
        'status' => 'Disetujui',
        'request_date' => now()->toDateString(),
    ]);

    RequestItem::create([
        'request_id' => $parentRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Taktis Penyandaran',
        'quantity' => 1,
        'unit' => 'Kegiatan',
        'hpp_price' => 1500000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);

    // Admin submits 200,000 shortage
    $response = $this->actingAs($admin)->post(route('requests.taktis-supplement', $parentRequest->id), [
        'item_name' => 'Tambahan Biaya Taktis Penyandaran (Kekurangan Realisasi)',
        'amount' => 200000,
        'required_date' => now()->toDateString(),
        'notes' => 'Kenaikan taktis riil di pelabuhan dari 1.5jt menjadi 1.7jt, selisih 200rb.',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('requests', [
        'port_call_id' => $portCall->id,
        'status' => 'Menunggu Approval Direktur',
    ]);

    $this->assertDatabaseHas('request_items', [
        'item_name' => 'Tambahan Biaya Taktis Penyandaran (Kekurangan Realisasi)',
        'hpp_price' => 200000,
        'status' => 'diajukan_ke_direktur',
        'director_status' => 'pending',
    ]);
});

test('taktis supplement requires valid amount and item name', function () {
    $admin = createTaktisUser('Admin');
    $ship = Ship::create(['name' => 'TB Test Ship', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create(['ship_id' => $ship->id, 'job_number' => 'JOB-TEST-VAL']);

    $parentRequest = ShipRequest::create([
        'request_number' => 'PGJ-2026-0016',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'status' => 'Disetujui',
        'created_by' => $admin->id,
        'request_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($admin)->post(route('requests.taktis-supplement', $parentRequest->id), [
        'item_name' => '',
        'amount' => -500,
    ]);

    $response->assertSessionHasErrors(['item_name', 'amount']);
});

test('approvals index passes total HPP for disetujui tab to direktur', function () {
    $director = createTaktisUser('Direktur');
    $ship = Ship::create(['name' => 'TB Test Ship 2', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create(['ship_id' => $ship->id, 'job_number' => 'JOB-TEST-APP']);

    $approvedReq = ShipRequest::create([
        'request_number' => 'PGJ-2026-0017',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'status' => 'Disetujui',
        'created_by' => $director->id,
        'request_date' => now()->toDateString(),
    ]);

    RequestItem::create([
        'request_id' => $approvedReq->id,
        'item_type' => 'jasa',
        'item_name' => 'Clearance In',
        'quantity' => 1,
        'unit' => 'Kegiatan',
        'hpp_price' => 1250000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);

    $response = $this->actingAs($director)->get(route('approvals.index', ['tab' => 'disetujui']));

    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Approvals/Index')
        ->has('approved_requests_total_hpp')
        ->has('all_requests_total_hpp')
        ->where('approved_requests_total_hpp', fn ($val) => (float) $val >= 1250000)
    );
});

test('expense request supporting document route is accessible to reviewer', function () {
    $director = createTaktisUser('Direktur');
    $admin = createTaktisUser('Admin');

    Storage::fake('local');
    $file = UploadedFile::fake()->create('lampiran.pdf', 100, 'application/pdf');
    $path = $file->store('sja/expenses/company', 'local');

    $expense = ExpenseRequest::create([
        'request_number' => 'EXP-2026-0099',
        'scope' => 'company',
        'created_by' => $admin->id,
        'status' => 'rejected',
        'total' => 500000,
        'notes' => 'Nota kurang stempel basah dari toko',
        'supporting_document_path' => $path,
    ]);

    $response = $this->actingAs($director)->get(route('expenses.company.documents', [
        'expenseRequest' => $expense->id,
        'type' => 'supporting',
        'view' => 1,
    ]));

    $response->assertOk();
});

test('surplus reallocation from another item on same vessel records actualization and reduces shortage', function () {
    $admin = createTaktisUser('Admin');
    $ship = Ship::create(['name' => 'KM Samudra 88', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create(['ship_id' => $ship->id, 'job_number' => 'JOB-SURPLUS-01']);

    $parentRequest = ShipRequest::create([
        'request_number' => 'PGJ-2026-SURP-1',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'status' => 'Disetujui',
        'created_by' => $admin->id,
        'request_date' => now()->toDateString(),
    ]);

    $sourceItem = RequestItem::create([
        'request_id' => $parentRequest->id,
        'item_type' => 'jasa',
        'item_name' => 'Clearance In (Syahbandar & Karantina)',
        'quantity' => 1,
        'unit' => 'Dokumen',
        'hpp_price' => 2000000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);

    $response = $this->actingAs($admin)->post(route('requests.taktis-supplement', $parentRequest->id), [
        'item_name' => 'Kekurangan Pengurusan Sertifikat & Biaya Taktis',
        'amount' => 200000,
        'surplus_source_item_id' => $sourceItem->id,
        'surplus_amount' => 300000,
        'actualization_notes' => 'Clearance In hanya habis 1.700.000, surplus 300.000 dialihkan untuk sertifikat kapal.',
        'notes' => 'Tambahan 200.000 setelah subsidi silang surplus.',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $sourceItem->refresh();
    expect($sourceItem->notes)->toContain('[PENGALIHAN DANA]')
        ->and($sourceItem->notes)->toContain('300.000');

    $this->assertDatabaseHas('request_items', [
        'item_name' => 'Kekurangan Pengurusan Sertifikat & Biaya Taktis',
        'hpp_price' => 200000,
    ]);
});

test('adding custom item can automatically register into master products catalog', function () {
    $admin = createTaktisUser('Admin');
    $ship = Ship::create(['name' => 'KM Jaya Perkasa', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create(['ship_id' => $ship->id, 'job_number' => 'JOB-MASTER-01']);

    $request = ShipRequest::create([
        'request_number' => 'PGJ-2026-MSTR-1',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'status' => 'Dalam Proses',
        'created_by' => $admin->id,
        'request_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($admin)->post(route('requests.items.store', $request->id), [
        'item_name' => 'Pengurusan Sertifikat Sanitasi Kapal',
        'item_type' => 'jasa',
        'quantity' => 1,
        'unit' => 'Sertifikat',
        'hpp_price' => 750000,
        'save_as_master_product' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('products', [
        'name' => 'Pengurusan Sertifikat Sanitasi Kapal',
        'item_type' => 'jasa',
        'unit' => 'Sertifikat',
    ]);
});

test('vessel daily expenses report endpoint provides daily accumulation summary to direktur and admin', function () {
    $director = createTaktisUser('Direktur');
    $ship = Ship::create(['name' => 'KM Monitor Samudra', 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create([
        'ship_id' => $ship->id,
        'job_number' => 'JOB-MONITOR-01',
        'status' => 'berthed',
        'eta_at' => now()->subDays(3),
        'etd_at' => now()->addDays(2),
    ]);

    $request = ShipRequest::create([
        'request_number' => 'PGJ-2026-MON-1',
        'ship_id' => $ship->id,
        'port_call_id' => $portCall->id,
        'status' => 'Disetujui',
        'created_by' => $director->id,
        'request_date' => now()->subDays(2)->toDateString(),
    ]);

    RequestItem::create([
        'request_id' => $request->id,
        'item_type' => 'jasa',
        'item_name' => 'Taktis Sandar & Pandu',
        'quantity' => 1,
        'unit' => 'Kegiatan',
        'hpp_price' => 1000000,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);

    $response = $this->actingAs($director)->get(route('reports.vessel-daily-expenses'));

    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Reports/Index')
        ->has('vesselDailyExpenseSummary')
        ->where('vesselDailyExpenseSummary.total_vessels', fn ($val) => $val >= 1)
        ->where('vesselDailyExpenseSummary.total_expenses', fn ($val) => (float) $val >= 1000000)
    );
});
