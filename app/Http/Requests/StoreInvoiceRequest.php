<?php

namespace App\Http\Requests;

use App\Models\Invoice;
use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Invoice::class) ?? false;
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
            'company_id' => ['required', 'uuid', 'exists:ship_companies,id'],
            'request_id' => ['required', 'uuid', 'exists:requests,id'],
            'request_item_ids' => ['required', 'array', 'min:1', 'max:100'],
            'request_item_ids.*' => ['required', 'distinct:strict', 'uuid', 'exists:request_items,id'],
            'invoice_type' => ['required', 'in:agency,reimburse'],
            'addon_total' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'tax' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'due_date' => ['required', 'date', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'supporting_document' => ['nullable', 'file', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'max:10240'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'request_item_ids.required' => 'Pilih minimal satu item kebutuhan untuk invoice.',
            'request_item_ids.min' => 'Pilih minimal satu item kebutuhan untuk invoice.',
            'supporting_document.mimes' => 'Dokumen pendukung harus berupa PDF, Word, JPG, JPEG, atau PNG.',
            'supporting_document.max' => 'Ukuran dokumen pendukung maksimal 10 MB.',
        ];
    }
}
