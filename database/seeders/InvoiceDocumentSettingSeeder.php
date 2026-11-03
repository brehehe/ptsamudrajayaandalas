<?php

namespace Database\Seeders;

use App\Models\InvoiceDocumentSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class InvoiceDocumentSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::where('email', 'titik@gmail.com')->first()
            ?? User::where('email', 'ryan@gmail.com')->first()
            ?? User::first();

        InvoiceDocumentSetting::updateOrCreate(
            ['setting_key' => InvoiceDocumentSetting::DOCUMENT_KEY],
            [
                'company_name' => 'PT. SAMUDRA JAYA ANDALAS',
                'business_label' => 'Shipping Agency (Keagenan Kapal)',
                'office_address' => 'Jl. Raya Sukomulyo No. 35, Gresik',
                'phone' => '(031) 3957944',
                'email' => 'ptsamudrajayaandalas@gmail.com',
                'city' => 'Gresik',
                'bank_account_name' => 'PT. SAMUDRA JAYA ANDALAS',
                'bank_account_number' => '178-00-0899988-6',
                'bank_name' => 'Bank Mandiri',
                'signatory_title' => 'Direktur',
                'updated_by' => $admin?->id,
            ]
        );
    }
}
