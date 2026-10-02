<?php

use App\Models\OperationalActivity;
use App\Models\PortCall;
use App\Models\Ship;
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
