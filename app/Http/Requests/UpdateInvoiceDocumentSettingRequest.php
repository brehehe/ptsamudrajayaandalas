<?php

namespace App\Http\Requests;

use App\Models\InvoiceDocumentSetting;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInvoiceDocumentSettingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', InvoiceDocumentSetting::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'business_label' => ['required', 'string', 'max:255'],
            'office_address' => ['required', 'string', 'max:1000'],
            'phone' => ['required', 'string', 'max:100'],
            'email' => [
                'required',
                'string',
                'max:255',
                Rule::when($this->input('email') !== 'Belum dikonfigurasi', ['email:rfc']),
            ],
            'city' => ['required', 'string', 'max:100'],
            'bank_account_name' => ['required', 'string', 'max:255'],
            'bank_account_number' => ['required', 'string', 'max:100'],
            'bank_name' => ['required', 'string', 'max:255'],
            'signatory_title' => ['required', 'string', 'max:100'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'company_name' => 'nama perusahaan',
            'business_label' => 'bidang usaha',
            'office_address' => 'alamat kantor',
            'phone' => 'nomor telepon',
            'email' => 'email perusahaan',
            'city' => 'kota penerbitan',
            'bank_account_name' => 'nama pemilik rekening',
            'bank_account_number' => 'nomor rekening',
            'bank_name' => 'nama bank',
            'signatory_title' => 'jabatan penanda tangan',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(collect($this->all())
            ->map(fn (mixed $value): mixed => is_string($value) ? trim($value) : $value)
            ->all());
    }
}
