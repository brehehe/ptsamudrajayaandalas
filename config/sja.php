<?php

return [
    'invoice_document' => [
        'company_name' => env('SJA_INVOICE_COMPANY_NAME', 'PT. SAMUDRA JAYA ANDALAS'),
        'business_label' => env('SJA_INVOICE_BUSINESS_LABEL', 'SHIPPING AGENCY'),
        'office_address' => env('SJA_INVOICE_OFFICE_ADDRESS', 'Belum dikonfigurasi'),
        'phone' => env('SJA_INVOICE_PHONE', 'Belum dikonfigurasi'),
        'email' => env('SJA_INVOICE_EMAIL', 'Belum dikonfigurasi'),
        'city' => env('SJA_INVOICE_CITY', 'Gresik'),
        'bank_account_name' => env('SJA_INVOICE_BANK_ACCOUNT_NAME', 'PT Samudra Jaya Andalas'),
        'bank_account_number' => env('SJA_INVOICE_BANK_ACCOUNT_NUMBER', 'Belum dikonfigurasi'),
        'bank_name' => env('SJA_INVOICE_BANK_NAME', 'Belum dikonfigurasi'),
        'signatory_title' => env('SJA_INVOICE_SIGNATORY_TITLE', 'Direktur'),
    ],
    'receivable_reminder_days' => array_values(array_filter(
        array_map('intval', explode(',', (string) env('SJA_RECEIVABLE_REMINDER_DAYS', '2,1'))),
        fn (int $day): bool => $day >= 0,
    )),
    'receivable_reminder_time' => env('SJA_RECEIVABLE_REMINDER_TIME', '08:00'),
];
