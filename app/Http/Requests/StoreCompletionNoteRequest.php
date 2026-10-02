<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompletionNoteRequest extends FormRequest
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
            'port_call_id' => ['required', 'uuid', 'exists:port_calls,id', 'unique:completion_notes,port_call_id'],
            'document_number' => ['required', 'string', 'max:100', 'unique:completion_notes,document_number'],
            'issued_at' => ['required', 'date'],
            'downloaded_at' => ['nullable', 'date', 'after_or_equal:issued_at'],
            'actual_amount' => ['required', 'numeric', 'min:0', 'max:9999999999999.99'],
            'document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
