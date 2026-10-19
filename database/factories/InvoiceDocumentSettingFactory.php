<?php

namespace Database\Factories;

use App\Models\InvoiceDocumentSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvoiceDocumentSetting>
 */
class InvoiceDocumentSettingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'setting_key' => InvoiceDocumentSetting::DOCUMENT_KEY,
            'company_name' => 'PT. SAMUDRA JAYA ANDALAS',
            'business_label' => 'SHIPPING AGENCY',
            'office_address' => fake()->address(),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->companyEmail(),
            'city' => 'Gresik',
            'bank_account_name' => 'PT Samudra Jaya Andalas',
            'bank_account_number' => fake()->numerify('##########'),
            'bank_name' => fake()->company(),
            'signatory_title' => 'Direktur',
        ];
    }
}
