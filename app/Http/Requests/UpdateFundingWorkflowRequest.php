<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFundingWorkflowRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null && ! $this->user()->isOwner();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in([
                'submit_kopra',
                'approve_kopra',
                'reject_kopra',
                'record_receipt',
                'record_payment',
                'submit_usage',
                'verify_usage',
            ])],
            'kopra_reference' => ['nullable', 'required_if:action,submit_kopra', 'string', 'max:100'],
            'submitted_date' => ['nullable', 'required_if:action,submit_kopra', 'date'],
            'approved_amount' => ['nullable', 'required_if:action,approve_kopra', 'numeric', 'min:1'],
            'received_date' => ['nullable', 'required_if:action,record_receipt', 'date'],
            'destination_account' => ['nullable', 'required_if:action,record_receipt', 'string', 'max:255'],
            'reference_number' => ['nullable', 'required_if:action,record_receipt,record_payment', 'string', 'max:100'],
            'amount' => ['nullable', 'required_if:action,record_receipt,record_payment', 'numeric', 'min:1'],
            'payment_destination' => ['nullable', 'required_if:action,record_payment', Rule::in(['operational'])],
            'recipient' => ['nullable', 'required_if:action,record_payment', 'string', 'max:255'],
            'beneficiary_user_id' => [
                'nullable',
                Rule::requiredIf(fn (): bool => $this->input('action') === 'record_payment'
                    && $this->input('payment_destination') === 'operational'),
                'integer',
                'exists:users,id',
            ],
            'payment_date' => ['nullable', 'required_if:action,record_payment', 'date'],
            'actual_amount' => ['nullable', 'required_if:action,submit_usage', 'numeric', 'min:0'],
            'remaining_amount' => ['nullable', 'required_if:action,submit_usage', 'numeric', 'min:0'],
            'notes' => ['nullable', 'required_if:action,reject_kopra', 'string', 'max:2000'],
            'proof' => ['nullable', 'required_if:action,record_receipt,record_payment,submit_usage', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
