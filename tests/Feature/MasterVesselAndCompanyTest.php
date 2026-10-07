<?php

use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function masterTestUser(string $role = 'Admin'): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

test('authenticated user can store a company and receive json response', function () {
    $user = masterTestUser('Admin');

    $response = $this->actingAs($user)->postJson(route('master.companies.store'), [
        'name' => 'PT Pelayaran Samudra Andalas Jaya',
        'code' => 'PSAJ',
        'phone' => '081234567890',
        'email' => 'contact@psaj.co.id',
        'address' => 'Jl. Pelabuhan No. 12 Surabaya',
    ]);

    $response->assertStatus(201);
    $response->assertJson([
        'success' => true,
        'company' => [
            'name' => 'PT Pelayaran Samudra Andalas Jaya',
            'code' => 'PSAJ',
        ],
    ]);

    $this->assertDatabaseHas('ship_companies', [
        'name' => 'PT Pelayaran Samudra Andalas Jaya',
        'code' => 'PSAJ',
        'is_active' => true,
    ]);
});

test('authenticated user can store a vessel associated with a company', function () {
    Storage::fake('public');
    $user = masterTestUser('Admin');
    $company = ShipCompany::create([
        'name' => 'PT Armada Nusantara',
        'code' => 'AN',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->postJson(route('master.vessels.store'), [
        'name' => 'TB Nusantara Perkasa 01',
        'ship_company_id' => $company->id,
        'imo_number' => '9876543',
        'call_sign' => 'YDA123',
        'flag' => 'Indonesia',
        'ship_type' => 'Tugboat',
        'gross_tonnage' => 250,
        'length' => 28.5,
        'image' => UploadedFile::fake()->image('tugboat.jpg'),
    ]);

    $response->assertStatus(201);
    $response->assertJson([
        'success' => true,
        'vessel' => [
            'name' => 'TB Nusantara Perkasa 01',
            'ship_company_id' => $company->id,
            'imo_number' => '9876543',
            'ship_type' => 'Tugboat',
        ],
    ]);

    $image = $response->json('vessel.image');
    expect($image)->toStartWith('/storage/sja/vessels/');
    Storage::disk('public')->assertExists(str_replace('/storage/', '', $image));

    $this->assertDatabaseHas('ships', [
        'name' => 'TB Nusantara Perkasa 01',
        'ship_company_id' => $company->id,
        'imo_number' => '9876543',
        'ship_type' => 'Tugboat',
        'is_active' => true,
    ]);
});

test('master vessel page is editable by admin and read only for owner', function () {
    $company = ShipCompany::create([
        'name' => 'PT Armada Nusantara',
        'code' => 'AN',
        'is_active' => true,
    ]);

    Ship::create([
        'name' => 'TB Master Satu',
        'ship_company_id' => $company->id,
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);

    $admin = masterTestUser('Admin');
    $owner = masterTestUser('Owner');

    $this->actingAs($admin)
        ->get(route('master.vessels.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Master/Vessels/Index')
            ->where('canManage', true)
            ->has('companies', 1)
            ->has('vessels', 1));

    $this->actingAs($owner)
        ->get(route('master.vessels.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('canManage', false));
});

test('admin can update a vessel photo and remove a vessel from active master', function () {
    Storage::fake('public');
    Storage::disk('public')->put('sja/vessels/old.jpg', 'old-image');

    $admin = masterTestUser('Admin');
    $company = ShipCompany::create([
        'name' => 'PT Armada Nusantara',
        'code' => 'AN',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'name' => 'TB Lama',
        'ship_company_id' => $company->id,
        'status' => 'Akan Datang',
        'image' => '/storage/sja/vessels/old.jpg',
        'is_active' => true,
    ]);

    $this->actingAs($admin)->post(route('master.vessels.update', $ship), [
        '_method' => 'patch',
        'name' => 'TB Baru',
        'ship_company_id' => $company->id,
        'flag' => 'Indonesia',
        'image' => UploadedFile::fake()->image('replacement.jpg'),
    ])->assertRedirect();

    $ship->refresh();
    expect($ship->name)->toBe('TB Baru')
        ->and($ship->image)->toStartWith('/storage/sja/vessels/');
    Storage::disk('public')->assertMissing('sja/vessels/old.jpg');
    Storage::disk('public')->assertExists(str_replace('/storage/', '', $ship->image));

    $this->actingAs($admin)
        ->delete(route('master.vessels.destroy', $ship))
        ->assertRedirect();

    $this->assertDatabaseHas('ships', [
        'id' => $ship->id,
        'is_active' => false,
        'deleted_at' => null,
    ]);
});

test('owner and field staff cannot mutate master vessels', function () {
    $company = ShipCompany::create([
        'name' => 'PT Armada Nusantara',
        'code' => 'AN',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'name' => 'TB Terbatas',
        'ship_company_id' => $company->id,
        'status' => 'Akan Datang',
        'is_active' => true,
    ]);

    foreach (['Owner', 'Lapangan'] as $role) {
        $user = masterTestUser($role);

        $this->actingAs($user)->post(route('master.vessels.store'), [
            'name' => 'Tidak Diizinkan',
            'ship_company_id' => $company->id,
        ])->assertForbidden();

        $this->actingAs($user)->delete(route('master.vessels.destroy', $ship))->assertForbidden();
    }
});

test('storing vessel requires valid company id and name', function () {
    $user = masterTestUser('Admin');

    $response = $this->actingAs($user)->postJson(route('master.vessels.store'), [
        'name' => '',
        'ship_company_id' => '00000000-0000-0000-0000-000000000000',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['name', 'ship_company_id']);
});
