<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMasterVesselRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'ship_company_id' => ['required', 'uuid', 'exists:ship_companies,id'],
            'imo_number' => ['nullable', 'string', 'max:50'],
            'call_sign' => ['nullable', 'string', 'max:50'],
            'flag' => ['nullable', 'string', 'max:50'],
            'ship_type' => ['nullable', 'string', 'max:100'],
            'gross_tonnage' => ['nullable', 'numeric', 'min:0'],
            'length' => ['nullable', 'numeric', 'min:0'],
            'captain_name' => ['nullable', 'string', 'max:255'],
            'captain_phone' => ['nullable', 'string', 'max:50'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_image' => ['nullable', 'boolean'],
        ];
    }
}
