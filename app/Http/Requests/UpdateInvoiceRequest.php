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

                if (! isset($line['source_item_ids']) || ! is_array($line['source_item_ids'])) {
                    $lines[$i]['source_item_ids'] = [];
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
            'lines.*.description' => ['required', 'string'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0', 'max:9999999999.99'],
            'lines.*.unit' => ['required', 'string', 'max:50'],
            'lines.*.total_price' => ['nullable', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'lines.*.unit_price' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'lines.*.allocated_hpp' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'lines.*.source_item_ids' => ['nullable', 'array', 'max:100'],
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
            'port_call_id.required' => 'Pilih Job kunjungan kapal terlebih dahulu.',
            'port_call_id.uuid' => 'Format Job kunjungan kapal tidak valid.',
            'port_call_id.exists' => 'Job kunjungan kapal yang dipilih tidak ditemukan.',
            'company_id.required' => 'Perusahaan klien wajib dipilih.',
            'company_id.uuid' => 'Format perusahaan klien tidak valid.',
            'company_id.exists' => 'Perusahaan klien yang dipilih tidak ditemukan.',
            'invoice_type.required' => 'Tipe invoice wajib dipilih.',
            'invoice_type.in' => 'Tipe invoice harus berupa Jasa Keagenan atau Reimbursement.',
            'due_date.required' => 'Tanggal jatuh tempo wajib diisi.',
            'due_date.date' => 'Format tanggal jatuh tempo tidak valid.',
            'lines.required' => 'Tambahkan minimal satu baris tagihan.',
            'lines.min' => 'Tambahkan minimal satu baris tagihan.',
            'lines.*.description.required' => 'Nama setiap baris tagihan wajib diisi.',
            'lines.*.section_title.max' => 'Nama bagian dokumen maksimal 100 karakter.',
            'lines.*.quantity.required' => 'Kuantitas baris tagihan wajib diisi.',
            'lines.*.quantity.numeric' => 'Kuantitas baris tagihan harus berupa angka.',
            'lines.*.quantity.gt' => 'Kuantitas baris tagihan harus lebih dari nol.',
            'lines.*.unit.required' => 'Satuan baris tagihan wajib diisi.',
            'lines.*.unit_price.required' => 'Harga jual baris tagihan wajib diisi.',
            'lines.*.unit_price.numeric' => 'Harga jual baris tagihan harus berupa angka.',
            'lines.*.unit_price.gt' => 'Harga jual baris tagihan harus lebih dari nol.',
            'lines.*.total_price.gt' => 'Total harga baris tagihan harus lebih dari nol.',
            'lines.*.source_item_ids.present' => 'Data item sumber pengajuan wajib disertakan.',
            'lines.*.source_item_ids.array' => 'Data item sumber pengajuan harus berupa daftar.',
            'lines.*.source_item_ids.*.exists' => 'Item pengajuan yang dipilih tidak valid atau sudah tidak tersedia.',
            'addon_total.numeric' => 'Biaya tambahan harus berupa angka.',
            'tax.numeric' => 'Pajak harus berupa angka.',
            'subject.max' => 'Perihal maksimal 255 karakter.',
            'origin_port_name.max' => 'Pelabuhan asal maksimal 255 karakter.',
            'destination_port_name.max' => 'Pelabuhan tujuan maksimal 255 karakter.',
            'notes.max' => 'Catatan maksimal 1000 karakter.',
            'supporting_document.file' => 'Dokumen pendukung harus berupa file.',
            'supporting_document.mimes' => 'Dokumen pendukung harus berupa PDF, Word, JPG, JPEG, atau PNG.',
            'supporting_document.max' => 'Ukuran dokumen pendukung maksimal 10 MB.',
        ];
    }
}
