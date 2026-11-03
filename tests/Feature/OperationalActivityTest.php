<?php

use App\Models\OperationalActivity;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Lapangan', 'guard_name' => 'web']);
});

test('activity can be saved without photos when required details are complete', function () {
    $user = User::factory()->create();
    $user->assignRole('Lapangan');

    $response = $this->actingAs($user)
        ->from(route('operations.index'))
        ->post(route('operations.activities.store'), [
            'activity_date' => '2026-09-30',
            'activity_time' => '10:35',
            'location_name' => 'Dermaga Pelabuhan Gresik',
            'is_vessel_related' => false,
            'category' => 'Aktivitas Lainnya',
            'category_other' => 'Koordinasi area dermaga',
            'title' => 'Koordinasi area dermaga',
            'detail' => 'Koordinasi lapangan telah selesai dan area dinyatakan aman.',
        ]);

    $response
        ->assertRedirect(route('operations.index'))
        ->assertSessionHas('success', 'Aktivitas lapangan berhasil dicatat.');

    $activity = OperationalActivity::query()->sole();

    expect($activity->photos)->toBe([])
        ->and($activity->created_by)->toBe($user->id)
        ->and($activity->category)->toBe('Koordinasi area dermaga')
        ->and($activity->title)->toBe('Koordinasi area dermaga');
});

test('custom activity category is required when other category is selected', function (string $category) {
    $user = User::factory()->create();
    $user->assignRole('Lapangan');

    $response = $this->actingAs($user)
        ->from(route('operations.index'))
        ->post(route('operations.activities.store'), [
            'activity_date' => '2026-09-30',
            'activity_time' => '10:35',
            'location_name' => 'Dermaga Pelabuhan Gresik',
            'is_vessel_related' => false,
            'category' => $category,
            'title' => 'Aktivitas lainnya',
            'detail' => 'Aktivitas lainnya memerlukan informasi kategori yang lebih spesifik.',
        ]);

    $response->assertRedirect(route('operations.index'))
        ->assertSessionHasErrors([
            'category_other' => 'Jenis aktivitas lainnya wajib diisi.',
        ]);

    expect(OperationalActivity::query()->count())->toBe(0);
})->with(['kategori modal kapal' => 'Lainnya', 'kategori form aktivitas' => 'Aktivitas Lainnya']);

test('vessel activity is saved against its selected visit job', function () {
    $user = User::factory()->create();
    $user->assignRole('Lapangan');
    $ship = Ship::create(['name' => 'KM Kunjungan Tepat', 'status' => 'Labuh', 'is_active' => true]);
    $visit = PortCall::create([
        'job_number' => 'JOB-ACT-001',
        'ship_id' => $ship->id,
        'status' => 'anchored',
        'eta_at' => '2026-09-30 08:00:00',
    ]);

    $response = $this->actingAs($user)
        ->from(route('vessels.show', ['id' => $ship->id, 'visit' => $visit->id]))
        ->post(route('operations.activities.store'), [
            'activity_date' => '2026-09-30',
            'activity_time' => '10:35',
            'location_name' => 'Dermaga Pelabuhan Gresik',
            'is_vessel_related' => true,
            'ship_id' => $ship->id,
            'port_call_id' => $visit->id,
            'category' => 'Kegiatan Kapal',
            'title' => 'Bongkar muat',
            'detail' => 'Bongkar muat sedang berlangsung sesuai job kunjungan.',
            'vessel_position' => 'anchored',
            'cargo_activity' => 'bongkar',
            'cargo_quantity' => 125.5,
            'cargo_unit' => 'Ton',
            'progress_percent' => 40,
            'constraints' => 'Cuaca berubah.',
            'next_plan' => 'Lanjut bongkar setelah kondisi aman.',
        ]);

    $response->assertRedirect(route('vessels.show', ['id' => $ship->id, 'visit' => $visit->id]))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Aktivitas lapangan berhasil dicatat.');

    $this->assertDatabaseHas('operational_activities', [
        'ship_id' => $ship->id,
        'port_call_id' => $visit->id,
        'request_id' => null,
        'title' => 'Bongkar muat',
        'vessel_position' => 'anchored',
        'cargo_activity' => 'bongkar',
        'cargo_quantity' => 125.5,
        'cargo_unit' => 'Ton',
        'progress_percent' => 40,
    ]);
});

test('vessel activity rejects a visit job that belongs to another ship', function () {
    $user = User::factory()->create();
    $user->assignRole('Lapangan');
    $ship = Ship::create(['name' => 'KM Satu', 'status' => 'Labuh', 'is_active' => true]);
    $otherShip = Ship::create(['name' => 'KM Dua', 'status' => 'Labuh', 'is_active' => true]);
    $otherVisit = PortCall::create([
        'job_number' => 'JOB-ACT-002',
        'ship_id' => $otherShip->id,
        'status' => 'anchored',
        'eta_at' => '2026-09-30 08:00:00',
    ]);

    $response = $this->actingAs($user)
        ->from(route('vessels.show', ['id' => $ship->id]))
        ->post(route('operations.activities.store'), [
            'activity_date' => '2026-09-30',
            'activity_time' => '10:35',
            'location_name' => 'Dermaga Pelabuhan Gresik',
            'is_vessel_related' => true,
            'ship_id' => $ship->id,
            'port_call_id' => $otherVisit->id,
            'category' => 'Kegiatan Kapal',
            'title' => 'Aktivitas tidak valid',
            'detail' => 'Aktivitas ini tidak boleh masuk ke job kapal lain.',
            'vessel_position' => 'anchored',
        ]);

    $response->assertRedirect(route('vessels.show', ['id' => $ship->id]))
        ->assertSessionHasErrors([
            'port_call_id' => 'Kunjungan / job tidak sesuai dengan kapal yang dipilih.',
        ]);

    expect(OperationalActivity::query()->count())->toBe(0);
});

test('activity can be saved for other ship without job and with custom position', function () {
    $user = User::factory()->create();
    $user->assignRole('Lapangan');

    $response = $this->actingAs($user)
        ->from(route('operations.index'))
        ->post(route('operations.activities.store'), [
            'activity_date' => '2026-10-22',
            'activity_time' => '09:00',
            'location_name' => 'Dermaga Luar',
            'is_vessel_related' => true,
            'ship_id' => '__other__',
            'custom_ship_name' => 'KM Sumber Berkah',
            'category' => 'Kegiatan Kapal',
            'title' => 'Pengecekan Tali Sandar',
            'detail' => 'Pengecekan tali sandar kapal eksternal selesai.',
            'vessel_position' => 'berthed',
        ]);

    $response
        ->assertRedirect(route('operations.index'))
        ->assertSessionHas('success', 'Aktivitas lapangan berhasil dicatat.');

    $activity = OperationalActivity::query()->where('title', 'Pengecekan Tali Sandar')->first();

    expect($activity)->not->toBeNull()
        ->and($activity->ship_id)->toBeNull()
        ->and($activity->custom_ship_name)->toBe('KM Sumber Berkah')
        ->and($activity->port_call_id)->toBeNull()
        ->and($activity->vessel_position)->toBe('berthed');
});

test('activity for registered ship can skip port call job and save successfully', function () {
    $user = User::factory()->create();
    $user->assignRole('Lapangan');
    $ship = Ship::create(['name' => 'KM Mitra Sejati', 'status' => 'Labuh', 'is_active' => true]);

    $response = $this->actingAs($user)
        ->from(route('operations.index'))
        ->post(route('operations.activities.store'), [
            'activity_date' => '2026-10-22',
            'activity_time' => '10:00',
            'location_name' => 'Area Labuh',
            'is_vessel_related' => true,
            'ship_id' => $ship->id,
            'category' => 'Kegiatan Kapal',
            'title' => 'Monitoring Posisi Labuh',
            'detail' => 'Monitoring rutin tanpa nomor SPK/job aktif.',
            'vessel_position' => 'anchored',
        ]);

    $response
        ->assertRedirect(route('operations.index'))
        ->assertSessionHas('success', 'Aktivitas lapangan berhasil dicatat.');

    $activity = OperationalActivity::query()->where('title', 'Monitoring Posisi Labuh')->first();

    expect($activity)->not->toBeNull()
        ->and($activity->ship_id)->toBe($ship->id)
        ->and($activity->port_call_id)->toBeNull()
        ->and($activity->vessel_position)->toBe('anchored');
});

test('operations index filters work correctly with status, ship, company, and search', function () {
    $user = User::factory()->create();
    $user->assignRole('Lapangan');

    $company = ShipCompany::create(['name' => 'PT Pelayaran Maju Jaya', 'is_active' => true]);
    $ship = Ship::create(['name' => 'KM Samudra 88', 'ship_company_id' => $company->id, 'status' => 'Sandar', 'is_active' => true]);
    $portCall = PortCall::create([
        'job_number' => 'JOB-FILTER-001',
        'ship_id' => $ship->id,
        'status' => 'berthed',
        'eta_at' => '2026-10-20 08:00:00',
    ]);

    $response = $this->actingAs($user)->get(route('operations.index', [
        'company_id' => $company->id,
        'ship_id' => $ship->id,
        'job' => 'JOB-FILTER-001',
        'status' => 'berthed',
        'search' => 'Samudra',
    ]));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Operations/Index')
            ->has('portCalls', 1)
            ->where('filters.company_id', $company->id)
            ->where('filters.ship_id', $ship->id)
            ->where('filters.job', 'JOB-FILTER-001')
            ->where('filters.status', 'berthed')
            ->where('filters.search', 'Samudra')
        );
});

test('operational activity can be deleted by authorized staff', function () {
    $user = User::factory()->create();
    $user->assignRole('Lapangan');

    $activity = OperationalActivity::create([
        'activity_date' => '2026-10-20',
        'activity_time' => '11:00',
        'location_name' => 'Dermaga Mirah',
        'is_vessel_related' => false,
        'category' => 'Kegiatan Kapal',
        'title' => 'Pemeriksaan tali tambat',
        'detail' => 'Pemeriksaan tali tambat selesai dilakukan.',
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->from(route('operations.index'))
        ->delete(route('operations.activities.destroy', $activity->id));

    $response->assertRedirect(route('operations.index'))
        ->assertSessionHas('success', 'Aktivitas lapangan berhasil dihapus.');

    expect(OperationalActivity::find($activity->id))->toBeNull();
    expect(OperationalActivity::withTrashed()->find($activity->id))->not->toBeNull();
});
