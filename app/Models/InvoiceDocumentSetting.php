<?php

namespace App\Models;

use Database\Factories\InvoiceDocumentSettingFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceDocumentSetting extends Model
{
    /** @use HasFactory<InvoiceDocumentSettingFactory> */
    use HasFactory, HasUuids;

    public const DOCUMENT_KEY = 'invoice_document';

    protected $fillable = [
        'setting_key',
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
        'updated_by',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
