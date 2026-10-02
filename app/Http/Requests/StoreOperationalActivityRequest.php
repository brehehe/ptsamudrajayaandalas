<?php

namespace App\Http\Requests;

use App\Models\PortCall;
use App\Models\ShipRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreOperationalActivityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['Owner', 'Admin', 'Admin Sistem', 'Lapangan', 'Tim Lapangan', 'Staf Operasional']) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'activity_date' => ['required', 'date'],
            'activity_time' => ['nullable', 'string', 'max:10'],
            'location_name' => ['required', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'is_vessel_related' => ['required', 'boolean'],
            'ship_id' => ['nullable', 'uuid', 'exists:ships,id'],
            'port_call_id' => ['nullable', 'uuid', 'exists:port_calls,id'],
            'request_id' => ['nullable', 'uuid', 'exists:requests,id'],
            'category' => ['nullable', 'string', 'max:100'],
            'category_other' => [
                'nullable',
                'string',
                'max:100',
                Rule::requiredIf(fn (): bool => in_array(
                    $this->string('category')->toString(),
                    ['Lainnya', 'Aktivitas Lainnya'],
                    true,
                )),
            ],
            'title' => ['required', 'string', 'max:255'],
            'detail' => ['required', 'string', 'max:2000'],
            'vessel_position' => ['nullable', 'required_if:is_vessel_related,1,true', 'in:scheduled,anchored,berthed,departed'],
            'cargo_activity' => ['nullable', 'in:bongkar,muat,tidak_ada'],
            'cargo_quantity' => ['nullable', 'numeric', 'min:0'],
            'cargo_unit' => ['nullable', 'required_with:cargo_quantity', 'string', 'max:50'],
            'progress_percent' => ['nullable', 'integer', 'between:0,100'],
            'constraints' => ['nullable', 'string', 'max:2000'],
            'next_plan' => ['nullable', 'string', 'max:2000'],
            'photos' => ['nullable', 'array', 'max:10'],
            'photos.*' => ['image', 'max:5120'],
        ];
    }

    /**
     * @return array<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['is_vessel_related', 'ship_id', 'port_call_id', 'request_id'])
                    || ! $this->boolean('is_vessel_related')) {
                    return;
                }

                $shipId = $this->string('ship_id')->toString();

                if ($shipId === '') {
                    $validator->errors()->add('ship_id', 'Kapal wajib dipilih untuk aktivitas kapal.');

                    return;
                }

                $portCallId = $this->string('port_call_id')->toString();
                if ($portCallId !== '' && ! PortCall::query()
                    ->whereKey($portCallId)
                    ->where('ship_id', $shipId)
                    ->exists()) {
                    $validator->errors()->add('port_call_id', 'Kunjungan / job tidak sesuai dengan kapal yang dipilih.');
                }
                if ($portCallId === '') {
                    $validator->errors()->add('port_call_id', 'Kunjungan / job wajib dipilih untuk aktivitas kapal.');
                }

                $requestId = $this->string('request_id')->toString();
                if ($requestId !== '') {
                    $requestMatchesContext = ShipRequest::query()
                        ->whereKey($requestId)
                        ->where('ship_id', $shipId)
                        ->when($portCallId !== '', fn ($query) => $query->where('port_call_id', $portCallId))
                        ->exists();

                    if (! $requestMatchesContext) {
                        $validator->errors()->add('request_id', 'Pengajuan tidak sesuai dengan kapal atau kunjungan yang dipilih.');
                    }
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
            'title.required' => 'Judul aktivitas wajib diisi.',
            'detail.required' => 'Detail aktivitas wajib diisi.',
            'location_name.required' => 'Lokasi / area aktivitas wajib diisi.',
            'category_other.required' => 'Jenis aktivitas lainnya wajib diisi.',
            'category_other.max' => 'Jenis aktivitas lainnya maksimal 100 karakter.',
            'photos.max' => 'Foto dokumentasi maksimal 10 foto.',
            'photos.*.image' => 'File foto harus berupa gambar.',
            'photos.*.max' => 'Ukuran setiap foto maksimal 5 MB.',
        ];
    }
}
