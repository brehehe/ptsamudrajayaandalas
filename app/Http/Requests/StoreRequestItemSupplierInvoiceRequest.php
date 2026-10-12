<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequestItemSupplierInvoiceRequest extends FormRequest
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
            'vendor_id' => ['required', 'uuid', 'exists:vendors,id'],
            'hpp_price' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'supplier_invoice_number' => ['required', 'string', 'max:100'],
            'supplier_invoice_date' => ['required', 'date'],
            'supplier_invoice_received_date' => ['required', 'date', 'after_or_equal:supplier_invoice_date'],
            'supplier_invoice_due_date' => ['nullable', 'date', 'after_or_equal:supplier_invoice_date'],
            'supplier_invoice_document' => [
                $this->route('requestItem')?->supplier_invoice_path ? 'nullable' : 'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'extensions:pdf,jpg,jpeg,png',
                'max:10240',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'vendor_id.required' => 'Vendor supplier wajib dipilih.',
            'hpp_price.gt' => 'HPP item harus lebih besar dari Rp 0.',
            'supplier_invoice_number.required' => 'Nomor nota invoice supplier wajib diisi.',
            'supplier_invoice_date.required' => 'Tanggal nota invoice supplier wajib diisi.',
            'supplier_invoice_received_date.required' => 'Tanggal penerimaan nota wajib diisi.',
            'supplier_invoice_received_date.after_or_equal' => 'Tanggal penerimaan tidak boleh sebelum tanggal nota.',
            'supplier_invoice_document.required' => 'Dokumen nota invoice supplier wajib diunggah.',
            'supplier_invoice_document.mimes' => 'Dokumen nota supplier harus berupa PDF, JPG, JPEG, atau PNG.',
            'supplier_invoice_document.max' => 'Ukuran dokumen nota supplier maksimal 10 MB.',
        ];
    }
}
