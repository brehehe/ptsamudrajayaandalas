<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVendorInvoiceRequest extends FormRequest
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
            'port_call_id' => ['required', 'uuid', 'exists:port_calls,id'],
            'vendor_id' => ['required', 'uuid', 'exists:vendors,id'],
            'document_number' => [
                'required', 'string', 'max:100',
                Rule::unique('cost_documents', 'document_number')
                    ->where(fn ($query) => $query->where('vendor_id', $this->input('vendor_id'))->whereNull('deleted_at')),
            ],
            'document_date' => ['required', 'date'],
            'received_date' => ['required', 'date', 'after_or_equal:document_date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:document_date'],
            'request_item_ids' => ['required', 'array', 'min:1', 'max:100'],
            'request_item_ids.*' => ['required', 'distinct:strict', 'uuid', 'exists:request_items,id'],
            'tax_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
