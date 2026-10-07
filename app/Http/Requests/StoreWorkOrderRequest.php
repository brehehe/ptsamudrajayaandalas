<?php

namespace App\Http\Requests;

use App\Models\Ship;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreWorkOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', WorkOrder::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'client_number' => Str::upper(trim((string) $this->input('client_number'))),
            'activity_name' => trim((string) $this->input('activity_name')),
            'activity_description' => $this->filled('activity_description')
                ? trim((string) $this->input('activity_description'))
                : null,
            'client_pic_name' => $this->filled('client_pic_name')
                ? trim((string) $this->input('client_pic_name'))
                : null,
            'client_pic_contact' => $this->filled('client_pic_contact')
                ? trim((string) $this->input('client_pic_contact'))
                : null,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'client_number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('work_orders', 'client_number')
                    ->where(fn ($query) => $query->where('company_id', $this->input('company_id'))),
            ],
            'company_id' => [
                'required',
                'uuid',
                Rule::exists('ship_companies', 'id')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'ship_id' => [
                'required',
                'uuid',
                Rule::exists('ships', 'id')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'port_id' => [
                'required',
                'uuid',
                Rule::exists('ports', 'id')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'document_date' => ['required', 'date', 'before_or_equal:received_at'],
            'received_at' => ['required', 'date'],
            'eta_at' => ['required', 'date'],
            'etd_at' => ['nullable', 'date', 'after:eta_at'],
            'activity_name' => ['required', 'string', 'max:255'],
            'activity_description' => ['nullable', 'string', 'max:2000'],
            'assigned_to' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'client_pic_name' => ['nullable', 'string', 'max:255'],
            'client_pic_contact' => ['nullable', 'string', 'max:100'],
            'status' => ['required', Rule::in(['draft', 'active'])],
            'document' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'extensions:pdf,jpg,jpeg,png',
                'max:10240',
            ],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $validator->errors()->hasAny(['company_id', 'ship_id'])) {
                    $ship = Ship::query()->find($this->input('ship_id'));

                    if ($ship && $ship->ship_company_id !== $this->input('company_id')) {
                        $validator->errors()->add('ship_id', 'Kapal yang dipilih tidak terhubung dengan perusahaan tersebut.');
                    }
                }

                if ($validator->errors()->has('assigned_to')) {
                    return;
                }

                $assignee = User::query()->find($this->integer('assigned_to'));
                if (! $assignee?->hasAnyRole(['Admin', 'Admin Sistem', 'Lapangan', 'Tim Lapangan', 'Staf Operasional'])) {
                    $validator->errors()->add('assigned_to', 'Penanggung jawab harus berasal dari tim Admin atau Operasional yang aktif.');

                    return;
                }

                if ($this->user()?->isStaff() && $assignee->id !== $this->user()->id) {
                    $validator->errors()->add('assigned_to', 'Operasional hanya dapat menugaskan SPK kepada dirinya sendiri.');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'client_number.required' => 'Nomor SPK klien wajib diisi.',
            'client_number.unique' => 'Nomor SPK ini sudah tercatat untuk perusahaan yang dipilih.',
            'document_date.before_or_equal' => 'Tanggal SPK tidak boleh melewati waktu dokumen diterima.',
            'etd_at.after' => 'ETD harus setelah ETA.',
            'document.required' => 'Dokumen SPK wajib diunggah sebelum SPK disimpan.',
            'document.mimes' => 'Dokumen SPK harus berupa PDF, JPG, JPEG, atau PNG.',
            'document.extensions' => 'Ekstensi dokumen SPK harus PDF, JPG, JPEG, atau PNG.',
            'document.max' => 'Ukuran dokumen SPK maksimal 10 MB.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'company_id' => 'perusahaan',
            'ship_id' => 'kapal',
            'port_id' => 'pelabuhan',
            'document_date' => 'tanggal SPK',
            'received_at' => 'waktu diterima',
            'eta_at' => 'ETA',
            'etd_at' => 'ETD',
            'activity_name' => 'jenis kegiatan',
            'assigned_to' => 'penanggung jawab',
        ];
    }
}
