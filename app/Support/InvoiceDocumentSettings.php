<?php

namespace App\Support;

use App\Models\InvoiceDocumentSetting;

final class InvoiceDocumentSettings
{
    /** @var list<string> */
    public const FIELDS = [
        'company_name',
        'business_label',
        'office_address',
        'phone',
        'email',
        'city',
        'bank_account_name',
        'bank_account_number',
        'bank_name',
        'signatory_title',
    ];

    /** @var array<string, string>|null */
    private ?array $resolved = null;

    /** @return array<string, string> */
    public function all(): array
    {
        if ($this->resolved !== null) {
            return $this->resolved;
        }

        $defaults = collect(config('sja.invoice_document', []))
            ->only(self::FIELDS)
            ->map(fn (mixed $value): string => (string) $value);
        $persisted = InvoiceDocumentSetting::query()
            ->where('setting_key', InvoiceDocumentSetting::DOCUMENT_KEY)
            ->first(self::FIELDS);

        $this->resolved = $persisted
            ? $defaults->merge($persisted->only(self::FIELDS))->all()
            : $defaults->all();

        return $this->resolved;
    }

    public function get(string $key): string
    {
        return $this->all()[$key] ?? '';
    }

    public function usesEnvironmentDefaults(): bool
    {
        return ! InvoiceDocumentSetting::query()
            ->where('setting_key', InvoiceDocumentSetting::DOCUMENT_KEY)
            ->exists();
    }
}
