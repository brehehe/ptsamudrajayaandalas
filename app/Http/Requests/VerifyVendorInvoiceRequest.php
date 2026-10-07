<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyVendorInvoiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isOperationalAdmin() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', 'in:verify,reject'],
            'verified_total' => ['required_if:decision,verify', 'nullable', 'numeric', 'min:1', 'max:9999999999999.99'],
            'notes' => ['required_if:decision,reject', 'nullable', 'string', 'max:2000'],
        ];
    }
}
