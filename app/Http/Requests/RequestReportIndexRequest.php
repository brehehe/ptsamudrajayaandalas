<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestReportIndexRequest extends FormRequest
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
            'company_id' => ['nullable', 'string'],
            'ship_id' => ['nullable', 'string'],
            'job' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in([
                'all',
                'Menunggu Approval',
                'Menunggu Approval Direktur',
                'Disetujui',
                'Disetujui Sebagian',
                'Dalam Proses',
                'Diproses',
                'Selesai',
                'Ditolak',
                'Dibatalkan',
            ])],
            'sort' => ['nullable', Rule::in(['date', 'number', 'status', 'name'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ];
    }
}
