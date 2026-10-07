<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientReceiptRequest extends FormRequest
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
            'company_id' => ['required', 'uuid', 'exists:ship_companies,id'],
            'invoice_id' => ['required', 'uuid', 'exists:invoices,id'],
            'received_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:1', 'max:9999999999999.99'],
            'destination_account' => ['required', 'string', 'max:255'],
            'bank_reference' => ['required', 'string', 'max:100', 'unique:client_receipts,bank_reference'],
            'proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
