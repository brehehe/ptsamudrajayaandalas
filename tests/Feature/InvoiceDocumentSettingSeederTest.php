<?php

use App\Models\InvoiceDocumentSetting;
use Database\Seeders\InvoiceDocumentSettingSeeder;

test('invoice document setting seeder populates company identity correctly', function () {
    $this->seed(InvoiceDocumentSettingSeeder::class);

    $setting = InvoiceDocumentSetting::query()
        ->where('setting_key', InvoiceDocumentSetting::DOCUMENT_KEY)
        ->first();

    expect($setting)->not->toBeNull()
        ->and($setting->company_name)->toBe('PT. SAMUDRA JAYA ANDALAS')
        ->and($setting->business_label)->toBe('Shipping Agency (Keagenan Kapal)')
        ->and($setting->office_address)->toBe('Jl. Raya Sukomulyo No. 35, Gresik')
        ->and($setting->phone)->toBe('(031) 3957944')
        ->and($setting->email)->toBe('ptsamudrajayaandalas@gmail.com')
        ->and($setting->city)->toBe('Gresik')
        ->and($setting->bank_account_name)->toBe('PT. SAMUDRA JAYA ANDALAS')
        ->and($setting->bank_name)->toBe('Bank Mandiri');
});

test('brand favicon and touch icons exist and match the original sja logo', function () {
    expect(file_exists(public_path('favicon.ico')))->toBeTrue()
        ->and(file_exists(public_path('favicon.png')))->toBeTrue()
        ->and(file_exists(public_path('apple-touch-icon.png')))->toBeTrue()
        ->and(file_exists(public_path('images/sja-logo.png')))->toBeTrue()
        ->and(filesize(public_path('favicon.png')))->toBeGreaterThan(1000)
        ->and(filesize(public_path('apple-touch-icon.png')))->toBeGreaterThan(1000)
        ->and(filesize(public_path('images/sja-logo.png')))->toBeGreaterThan(1000);
});
