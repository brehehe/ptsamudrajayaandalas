<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Support\UserRoleHierarchy;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMasterUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $targetUser = User::query()->find($this->route('id'));

        return $targetUser !== null
            && ($this->user()?->can('update', $targetUser) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $actor = $this->user();
        $assignableRoles = $actor instanceof User
            ? UserRoleHierarchy::assignableRoles($actor)
            : [];

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore((int) $this->route('id')),
            ],
            'role' => [
                'required',
                'string',
                Rule::in($assignableRoles),
                Rule::exists('roles', 'name')->where('guard_name', 'web'),
            ],
            'password' => ['nullable', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
            'job_title' => ['nullable', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
