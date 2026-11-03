<?php

return [
    'invoice_document' => [
        'company_name' => env('SJA_INVOICE_COMPANY_NAME', 'PT. SAMUDRA JAYA ANDALAS'),
        'business_label' => env('SJA_INVOICE_BUSINESS_LABEL', 'Shipping Agency (Keagenan Kapal)'),
        'office_address' => env('SJA_INVOICE_OFFICE_ADDRESS', 'Jl. Raya Sukomulyo No. 35, Gresik'),
        'phone' => env('SJA_INVOICE_PHONE', '(031) 3957944'),
        'email' => env('SJA_INVOICE_EMAIL', 'ptsamudrajayaandalas@gmail.com'),
        'city' => env('SJA_INVOICE_CITY', 'Gresik'),
        'bank_account_name' => env('SJA_INVOICE_BANK_ACCOUNT_NAME', 'PT. SAMUDRA JAYA ANDALAS'),
        'bank_account_number' => env('SJA_INVOICE_BANK_ACCOUNT_NUMBER', '178-00-0899988-6'),
        'bank_name' => env('SJA_INVOICE_BANK_NAME', 'Bank Mandiri'),
        'signatory_title' => env('SJA_INVOICE_SIGNATORY_TITLE', 'Direktur'),
    ],
    'receivable_reminder_days' => array_values(array_filter(
        array_map('intval', explode(',', (string) env('SJA_RECEIVABLE_REMINDER_DAYS', '2,1'))),
        fn (int $day): bool => $day >= 0,
    )),
    'receivable_reminder_time' => env('SJA_RECEIVABLE_REMINDER_TIME', '08:00'),
];
