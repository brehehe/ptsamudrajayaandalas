<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompletionNoteRequest extends FormRequest
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
            'action' => ['required', 'in:verify,reconcile'],
            'actual_total' => ['required_if:action,reconcile', 'nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'adjustment' => ['nullable', 'numeric', 'min:-9999999999999.99', 'max:9999999999999.99'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
