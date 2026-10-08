<?php

use App\Models\Port;
use App\Models\Ship;
use App\Models\ShipCompany;
use Database\Seeders\SjaMasterSeeder;

test('master seeder creates related companies ships and ports without duplicates', function () {
    $this->seed(SjaMasterSeeder::class);
    $this->seed(SjaMasterSeeder::class);

    $company = ShipCompany::query()->where('code', 'DEMO-CLIENT-01')->firstOrFail();
    $port = Port::query()->where('code', 'IDGRS')->firstOrFail();
    $ship = Ship::query()->where('name', 'MV Demo Nusantara')->firstOrFail();

    expect(ShipCompany::query()->whereIn('code', ['DEMO-CLIENT-01', 'DEMO-CLIENT-02'])->count())->toBe(2)
        ->and(Port::query()->whereIn('code', ['IDGRS', 'IDSUB', 'IDMYR', 'IDPKG'])->count())->toBe(4)
        ->and(Ship::query()->whereIn('name', ['MV Demo Nusantara', 'MT Demo Andalas', 'TB Demo Bahari', 'KM Demo Samudra'])->count())->toBe(4)
        ->and($ship->ship_company_id)->toBe($company->id)
        ->and($ship->port_id)->toBe($port->id)
        ->and($ship->imo_number)->toBeNull();
});

test('master seeder restores its soft deleted master records', function () {
    $this->seed(SjaMasterSeeder::class);

    $company = ShipCompany::query()->where('code', 'DEMO-CLIENT-01')->firstOrFail();
    $port = Port::query()->where('code', 'IDGRS')->firstOrFail();
    $ship = Ship::query()->where('name', 'MV Demo Nusantara')->firstOrFail();

    $ship->delete();
    $port->delete();
    $company->delete();

    $this->seed(SjaMasterSeeder::class);

    expect($company->fresh()->trashed())->toBeFalse()
        ->and($port->fresh()->trashed())->toBeFalse()
        ->and($ship->fresh()->trashed())->toBeFalse();
});
