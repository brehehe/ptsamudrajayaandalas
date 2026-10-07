<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOutgoingPaymentRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'cost_document_id' => [
                'required',
                'uuid',
                Rule::exists('cost_documents', 'id')
                    ->where('document_type', 'vendor_invoice')
                    ->whereNull('deleted_at'),
            ],
            'amount' => ['required', 'numeric', 'min:1', 'max:9999999999999.99'],
            'payment_date' => ['required', 'date'],
            'reference_number' => ['required', 'string', 'max:100', 'unique:outgoing_payments,reference_number'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
