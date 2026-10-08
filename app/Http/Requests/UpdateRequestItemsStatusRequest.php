<?php

namespace App\Http\Requests;

use App\Models\ShipRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRequestItemsStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        $shipRequest = ShipRequest::query()->findOrFail($this->route('id'));

        return $this->user()?->can('process', $shipRequest) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => [
                'required',
                'uuid',
                'distinct',
                Rule::exists('request_items', 'id')
                    ->where('request_id', (string) $this->route('id')),
            ],
            'status' => ['required', 'string', Rule::in(['dalam_proses', 'selesai'])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'item_ids.required' => 'Pilih minimal satu item yang akan diperbarui.',
            'item_ids.min' => 'Pilih minimal satu item yang akan diperbarui.',
            'item_ids.*.exists' => 'Salah satu item tidak termasuk dalam pengajuan ini.',
            'item_ids.*.distinct' => 'Item yang sama tidak boleh dipilih lebih dari sekali.',
            'status.required' => 'Tahap item berikutnya wajib dipilih.',
            'status.in' => 'Tahap item berikutnya tidak valid.',
        ];
    }
}
