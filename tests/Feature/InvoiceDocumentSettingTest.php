<?php

use App\Models\Invoice;
use App\Models\InvoiceDocumentSetting;
use App\Models\User;
use App\Support\InvoiceDocumentSettings;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/** @return array<string, string> */
function invoiceDocumentSettingPayload(array $overrides = []): array
{
    return [
        'company_name' => 'PT. SAMUDRA JAYA ANDALAS',
        'business_label' => 'SHIPPING AGENCY',
        'office_address' => 'Jl. Raya Sukomulyo No. 35 Gresik',
        'phone' => '(031) 3957944',
        'email' => 'invoice@samudrajaya.test',
        'city' => 'Gresik',
        'bank_account_name' => 'PT Samudra Jaya Andalas',
        'bank_account_number' => '1780008999886',
        'bank_name' => 'Bank Mandiri',
        'signatory_title' => 'Direktur',
        ...$overrides,
    ];
}

function invoiceSettingManager(string $permission = 'settings.manage'): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->givePermissionTo(Permission::firstOrCreate([
        'name' => $permission,
        'guard_name' => 'web',
    ]));

    return $user;
}

test('invoice setting policy follows granular permissions', function (string $permission, bool $allowed) {
    $user = User::factory()->create(['is_active' => true]);

    if ($permission !== 'none') {
        $user->givePermissionTo(Permission::firstOrCreate([
            'name' => $permission,
            'guard_name' => 'web',
        ]));
    }

    expect($user->can('viewAny', InvoiceDocumentSetting::class))->toBe($allowed)
        ->and($user->can('create', InvoiceDocumentSetting::class))->toBe($allowed);
})->with([
    'settings manager' => ['settings.manage', true],
    'master manager' => ['masters.manage', true],
    'without permission' => ['none', false],
]);

test('only authorized users can open and update invoice settings', function () {
    $unprivilegedUser = User::factory()->create(['is_active' => true]);

    $this->get(route('master.invoice-settings.index'))->assertRedirect(route('login'));
    $this->actingAs($unprivilegedUser)
        ->get(route('master.invoice-settings.index'))
        ->assertForbidden();
    $this->actingAs($unprivilegedUser)
        ->patch(route('master.invoice-settings.update'), invoiceDocumentSettingPayload())
        ->assertForbidden();
    $this->assertDatabaseCount('invoice_document_settings', 0);
});

test('authorized user sees environment defaults before a master record exists', function () {
    config()->set('sja.invoice_document.company_name', 'PT Default dari Server');
    $manager = invoiceSettingManager();

    $this->actingAs($manager)
        ->get(route('master.invoice-settings.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Master/InvoiceSettings/Index')
            ->where('settings.company_name', 'PT Default dari Server')
            ->where('usesEnvironmentDefaults', true));
});

test('authorized user saves validated settings and records an audit entry', function () {
    $manager = invoiceSettingManager('masters.manage');
    $payload = invoiceDocumentSettingPayload();

    $this->actingAs($manager)
        ->patch(route('master.invoice-settings.update'), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('invoice_document_settings', [
        'setting_key' => InvoiceDocumentSetting::DOCUMENT_KEY,
        'company_name' => $payload['company_name'],
        'bank_account_number' => $payload['bank_account_number'],
        'updated_by' => $manager->id,
    ]);
    $this->assertDatabaseHas('activity_log', [
        'log_name' => 'invoice-settings',
        'causer_id' => $manager->id,
        'description' => 'Pengaturan dokumen invoice diperbarui',
    ]);
});

test('invoice settings reject invalid contact data without changing the stored values', function () {
    $manager = invoiceSettingManager();
    InvoiceDocumentSetting::factory()->create(invoiceDocumentSettingPayload([
        'setting_key' => InvoiceDocumentSetting::DOCUMENT_KEY,
    ]));

    $this->actingAs($manager)
        ->from(route('master.invoice-settings.index'))
        ->patch(route('master.invoice-settings.update'), invoiceDocumentSettingPayload([
            'company_name' => '',
            'email' => 'alamat-bukan-email',
        ]))
        ->assertRedirect(route('master.invoice-settings.index'))
        ->assertSessionHasErrors(['company_name', 'email']);

    expect(InvoiceDocumentSetting::query()->sole()->company_name)
        ->toBe('PT. SAMUDRA JAYA ANDALAS');
});

test('saved master settings feed invoice create edit and generated pdf', function () {
    $admin = invoiceSettingManager('masters.manage');
    $admin->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));
    InvoiceDocumentSetting::factory()->create(invoiceDocumentSettingPayload([
        'setting_key' => InvoiceDocumentSetting::DOCUMENT_KEY,
        'company_name' => 'PT SJA Dokumen Terpadu',
        'bank_account_number' => '9988776655',
    ]));

    $this->actingAs($admin)
        ->get(route('invoices.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Invoices/Form')
            ->where('documentSettings.company_name', 'PT SJA Dokumen Terpadu')
            ->where('documentSettings.bank_account_number', '9988776655'));

    $invoice = Invoice::create([
        'invoice_number' => 'INV-SETTING-001',
        'invoice_date' => '2026-10-17',
        'due_date' => '2026-10-31',
        'subtotal' => 100000,
        'grand_total' => 100000,
        'outstanding_amount' => 100000,
    ]);

    $this->actingAs($admin)
        ->get(route('invoices.edit', $invoice))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Invoices/Form')
            ->where('documentSettings.company_name', 'PT SJA Dokumen Terpadu')
            ->where('documentSettings.bank_account_number', '9988776655'));

    $response = $this->actingAs($admin)
        ->get(route('invoices.documents.generated', $invoice).'?view=1');

    $response->assertOk()->assertHeader('content-type', 'application/pdf');
    expect($response->getContent())
        ->toContain('(PT SJA Dokumen Terpadu) Tj')
        ->toContain('(a/c 9988776655) Tj');
    expect(app(InvoiceDocumentSettings::class)->usesEnvironmentDefaults())->toBeFalse();
});
