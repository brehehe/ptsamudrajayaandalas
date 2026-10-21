<?php

namespace App\Http\Requests;

use App\Models\Invoice;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $invoice = $this->route('invoice');

        return $invoice instanceof Invoice
            && ($this->user()?->can('update', $invoice) ?? false);
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('lines') && is_array($this->lines)) {
            $lines = $this->lines;
            foreach ($lines as $i => $line) {
                if (! is_array($line)) {
                    continue;
                }
                $qty = isset($line['quantity']) && is_numeric($line['quantity']) && (float) $line['quantity'] > 0
                    ? (float) $line['quantity']
                    : 1.0;

                if (isset($line['total_price']) && is_numeric($line['total_price']) && (float) $line['total_price'] > 0) {
                    $total = (float) $line['total_price'];
                    $lines[$i]['unit_price'] = (string) round($total / $qty, 2);
                } elseif (isset($line['unit_price']) && is_numeric($line['unit_price']) && (float) $line['unit_price'] > 0) {
                    if (! isset($line['total_price']) || ! is_numeric($line['total_price']) || (float) $line['total_price'] <= 0) {
                        $lines[$i]['total_price'] = (string) round((float) $line['unit_price'] * $qty, 2);
                    }
                }
            }
            $this->merge(['lines' => $lines]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'port_call_id' => ['required', 'uuid', 'exists:port_calls,id'],
            'company_id' => ['required', 'uuid', 'exists:ship_companies,id'],
            'subject' => ['nullable', 'string', 'max:255'],
            'origin_port_name' => ['nullable', 'string', 'max:255'],
            'destination_port_name' => ['nullable', 'string', 'max:255'],
            'lines' => ['required', 'array', 'min:1', 'max:100'],
            'lines.*.section_title' => ['nullable', 'string', 'max:100'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0', 'max:9999999999.99'],
            'lines.*.unit' => ['required', 'string', 'max:50'],
            'lines.*.total_price' => ['nullable', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'lines.*.unit_price' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'lines.*.allocated_hpp' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'lines.*.source_item_ids' => ['present', 'array', 'max:100'],
            'lines.*.source_item_ids.*' => ['required', 'uuid', 'exists:request_items,id'],
            'invoice_type' => ['required', 'in:agency,reimburse'],
            'addon_total' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'tax' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'due_date' => ['required', 'date'],
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
            'lines.*.section_title.max' => 'Nama bagian dokumen maksimal 100 karakter.',
            'lines.*.quantity.gt' => 'Kuantitas baris tagihan harus lebih dari nol.',
            'lines.*.unit_price.gt' => 'Harga jual baris tagihan harus lebih dari nol.',
            'supporting_document.mimes' => 'Dokumen pendukung harus berupa PDF, Word, JPG, JPEG, atau PNG.',
            'supporting_document.max' => 'Ukuran dokumen pendukung maksimal 10 MB.',
        ];
    }
}
