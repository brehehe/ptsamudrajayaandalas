<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && ($user->can('reports.view') || $user->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['all', 'scheduled', 'anchored', 'berthed', 'departed', 'completed'])],
            'company_id' => ['nullable', 'uuid', Rule::exists('ship_companies', 'id')],
            'ship_id' => ['nullable', 'uuid', Rule::exists('ships', 'id')],
            'job' => ['nullable', 'string', 'max:100'],
            'tab' => ['nullable', Rule::in([
                'ringkasan_margin',
                'invoice',
                'piutang',
                'pengeluaran',
                'aktivitas',
                'laba_rugi',
                'keuangan_kas',
                'operasional',
            ])],
            'sort' => ['nullable', Rule::in(['date', 'amount', 'status', 'number', 'name', 'progress'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ];
    }
}
