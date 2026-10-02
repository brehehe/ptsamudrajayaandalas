<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreOutgoingPaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['Owner', 'Admin', 'Admin Sistem']) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'port_call_id' => ['required', 'uuid', 'exists:port_calls,id'],
            'payment_type' => ['required', 'string', 'max:100'],
            'recipient' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:1'],
            'payment_date' => ['required', 'date'],
            'reference_number' => ['required', 'string', 'max:100', 'unique:outgoing_payments,reference_number'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
