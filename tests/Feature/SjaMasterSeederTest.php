<?php

use App\Models\Port;
use App\Models\Product;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\Vendor;
use Database\Seeders\SjaDemoFleetSeeder;
use Database\Seeders\SjaMasterSeeder;

test('master seeder seeds clean master data without dummy companies and ships by default', function () {
    $this->seed(SjaMasterSeeder::class);
    $this->seed(SjaMasterSeeder::class); // Idempotency check

    $port = Port::query()->where('code', 'IDGRS')->firstOrFail();
    $pelindo = Vendor::query()->where('code', 'VND-PELINDO')->firstOrFail();
    $tacticalBerthing = Product::query()->where('code', 'PRD-PLD-TAKTIS')->firstOrFail();
    $epbPayment = Product::query()->where('code', 'PRD-PLD-EPB')->firstOrFail();

    // Pastikan tidak ada data dummy perusahaan atau kapal yang terbuat
    expect(ShipCompany::query()->count())->toBe(0)
        ->and(Ship::query()->count())->toBe(0)
        ->and(Port::query()->whereIn('code', ['IDGRS', 'IDSUB', 'IDMYR', 'IDPKG'])->count())->toBe(4)
        ->and(Vendor::query()->whereIn('code', ['VND-PELINDO', 'VND-PERTAMINA', 'VND-TIRTA', 'VND-BAHARI', 'VND-NELAYAN'])->count())->toBe(5)
        ->and($tacticalBerthing->name)->toBe('Taktis Penyandaran')
        ->and($tacticalBerthing->category)->toBe('Jasa Keagenan')
        ->and($tacticalBerthing->item_type)->toBe('jasa')
        ->and((float) $tacticalBerthing->tax_rate)->toBe(2.0)
        ->and((float) $tacticalBerthing->hpp_default)->toBe(0.0)
        ->and($tacticalBerthing->vendor_id)->toBeNull()
        ->and($epbPayment->name)->toBe('Pembayaran EPB (Pandu Tunda)')
        ->and($epbPayment->category)->toBe('Jasa Keagenan')
        ->and($epbPayment->item_type)->toBe('jasa')
        ->and((float) $epbPayment->tax_rate)->toBe(2.0)
        ->and((float) $epbPayment->hpp_default)->toBe(0.0)
        ->and($epbPayment->vendor_id)->toBe($pelindo->id);
});

test('master seeder restores its soft deleted master records', function () {
    $this->seed(SjaMasterSeeder::class);

    $port = Port::query()->where('code', 'IDGRS')->firstOrFail();
    $vendor = Vendor::query()->where('code', 'VND-PELINDO')->firstOrFail();

    $port->delete();
    $vendor->delete();

    $this->seed(SjaMasterSeeder::class);

    expect($port->fresh()->trashed())->toBeFalse()
        ->and($vendor->fresh()->trashed())->toBeFalse();
});

test('demo fleet seeder or withDummyFleet option seeds demo companies and ships when explicitly requested', function () {
    $this->seed(SjaMasterSeeder::class);

    // Default tanpa dummy
    expect(ShipCompany::count())->toBe(0)
        ->and(Ship::count())->toBe(0);

    // Jalankan seeder armada demo
    $this->seed(SjaDemoFleetSeeder::class);

    $company = ShipCompany::query()->where('code', 'DEMO-CLIENT-01')->firstOrFail();
    $port = Port::query()->where('code', 'IDGRS')->firstOrFail();
    $ship = Ship::query()->where('name', 'MV Demo Nusantara')->firstOrFail();

    expect(ShipCompany::query()->whereIn('code', ['DEMO-CLIENT-01', 'DEMO-CLIENT-02'])->count())->toBe(2)
        ->and(Ship::query()->whereIn('name', ['MV Demo Nusantara', 'MT Demo Andalas', 'TB Demo Bahari', 'KM Demo Samudra'])->count())->toBe(4)
        ->and($ship->ship_company_id)->toBe($company->id)
        ->and($ship->port_id)->toBe($port->id)
        ->and($ship->imo_number)->toBeNull();
});

test('master seeder can conditionally seed demo fleet via withDummyFleet property', function () {
    $seeder = new SjaMasterSeeder(withDummyFleet: true);
    $seeder->run();

    expect(ShipCompany::query()->whereIn('code', ['DEMO-CLIENT-01', 'DEMO-CLIENT-02'])->count())->toBe(2)
        ->and(Ship::query()->whereIn('name', ['MV Demo Nusantara', 'MT Demo Andalas', 'TB Demo Bahari', 'KM Demo Samudra'])->count())->toBe(4);
});
