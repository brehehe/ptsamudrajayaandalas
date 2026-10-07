<?php

namespace App\Http\Requests;

use App\Models\PortCall;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePortCallStatusRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('updateStatus', PortCall::findOrFail($this->route('id'))) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:scheduled,anchored,berthed,departed,completed'],
            'expected_status' => ['sometimes', 'required', 'string'],
            'occurred_at' => ['nullable', 'date', 'before_or_equal:now'],
            'completion_note_due_at' => ['nullable', 'date', 'after:occurred_at'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'status.in' => 'Status kunjungan tidak valid.',
            'occurred_at.date' => 'Tanggal kejadian harus valid.',
            'occurred_at.before_or_equal' => 'Tanggal kejadian tidak boleh di masa depan.',
            'completion_note_due_at.required_if' => 'Tanggal target Nota Rampung wajib diisi untuk keberangkatan kapal.',
        ];
    }
}
