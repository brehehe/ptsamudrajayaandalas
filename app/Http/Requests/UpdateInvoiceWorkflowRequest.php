<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceWorkflowRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isOperationalAdmin() || $this->user()?->isOwner();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'action' => ['required', 'in:release,mark_sent'],
            'document' => ['required_if:action,release', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'delivery_proof' => ['required_if:action,mark_sent', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
