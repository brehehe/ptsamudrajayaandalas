<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewExpenseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['Owner', 'Admin', 'Admin Sistem', 'Direktur']) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in(['approve', 'revision', 'reject'])],
            'notes' => ['nullable', 'required_unless:decision,approve', 'string', 'max:1000'],
            'approved_amount' => [
                'nullable',
                Rule::requiredIf(fn (): bool => $this->routeIs('funding.director-review') && $this->input('decision') === 'approve'),
                'numeric',
                'min:1',
            ],
        ];
    }
}
