<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VesselIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::in(['Semua', 'Akan Datang', 'Labuh', 'Sandar', 'Selesai'])],
            'search' => ['nullable', 'string', 'max:100'],
            'company_id' => ['nullable', 'uuid', 'exists:ship_companies,id'],
            'ship_id' => ['nullable', 'uuid', 'exists:ships,id'],
            'job' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(['terbaru', 'terdekat', 'nama'])],
        ];
    }
}
