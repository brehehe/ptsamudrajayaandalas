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
            'lines' => ['required', 'array', 'min:1', 'max:100'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0', 'max:9999999999.99'],
            'lines.*.unit' => ['required', 'string', 'max:50'],
            'lines.*.unit_price' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'lines.*.source_item_ids' => ['present', 'array', 'max:100'],
            'lines.*.source_item_ids.*' => ['required', 'uuid', 'exists:request_items,id'],
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
            'lines.required' => 'Tambahkan minimal satu baris tagihan.',
            'lines.min' => 'Tambahkan minimal satu baris tagihan.',
            'lines.*.description.required' => 'Nama setiap baris tagihan wajib diisi.',
            'lines.*.quantity.gt' => 'Kuantitas baris tagihan harus lebih dari nol.',
            'lines.*.unit_price.gt' => 'Harga jual baris tagihan harus lebih dari nol.',
            'supporting_document.mimes' => 'Dokumen pendukung harus berupa PDF, Word, JPG, JPEG, atau PNG.',
            'supporting_document.max' => 'Ukuran dokumen pendukung maksimal 10 MB.',
        ];
    }
}
