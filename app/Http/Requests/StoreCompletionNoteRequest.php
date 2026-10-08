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
            'port_call_id' => ['required', 'uuid', 'exists:port_calls,id', 'unique:completion_notes,port_call_id'],
            'document' => ['required', 'file', 'mimes:doc,docx,pdf,jpg,jpeg,png', 'extensions:doc,docx,pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'port_call_id.required' => 'Pilih Job yang akan menerima Nota Rampung.',
            'port_call_id.unique' => 'Nota Rampung untuk Job ini sudah pernah diunggah.',
            'document.required' => 'Dokumen Nota Rampung wajib diunggah.',
            'document.mimes' => 'Dokumen harus berupa Word, PDF, JPG, JPEG, atau PNG.',
            'document.max' => 'Ukuran dokumen maksimal 10 MB.',
        ];
    }
}
