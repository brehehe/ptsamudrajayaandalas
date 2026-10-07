<?php

namespace App\Http\Requests;

use App\Models\ShipRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateShipRequestStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        $shipRequest = ShipRequest::query()->findOrFail($this->route('id'));

        return $this->user()?->can('process', $shipRequest) ?? false;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:Dalam Proses,Selesai,Dibatalkan'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'status.required' => 'Tahap proses berikutnya wajib dipilih.',
            'status.in' => 'Tahap proses berikutnya tidak valid.',
        ];
    }
}
