<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class MasterUserController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorizeUserManagement($request);
        $search = $request->query('search');

        $query = User::query()->with('roles');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->get();
        $roles = $request->user()->isOwner()
            ? ['Owner', 'Direktur', 'Admin', 'Lapangan']
            : ['Lapangan'];

        return Inertia::render('Master/Users/Index', [
            'users' => $users,
            'roles' => $roles,
            'search' => $search ?? '',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeUserManagement($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', 'exists:roles,name'],
            'phone' => ['nullable', 'string', 'max:30'],
            'job_title' => ['nullable', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $this->authorizeRoleAssignment($request, $validated['role']);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'job_title' => $validated['job_title'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'account_status' => ($validated['is_active'] ?? true) ? 'pending_activation' : 'disabled',
        ]);

        $user->assignRole($validated['role']);

        return redirect()->back()->with('success', "Pengguna {$user->name} berhasil ditambahkan dengan peran {$validated['role']}.");
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $this->authorizeUserManagement($request);
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'role' => ['required', 'string', 'exists:roles,name'],
            'password' => ['nullable', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
            'job_title' => ['nullable', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $this->authorizeTargetUser($request, $user);
        $this->authorizeRoleAssignment($request, $validated['role']);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'job_title' => $validated['job_title'] ?? null,
            'is_active' => $validated['is_active'] ?? $user->is_active,
            'account_status' => ($validated['is_active'] ?? $user->is_active)
                ? ($user->activated_at ? 'active' : 'pending_activation')
                : 'disabled',
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        $user->syncRoles([$validated['role']]);

        return redirect()->back()->with('success', "Data pengguna {$user->name} berhasil diperbarui.");
    }

    public function destroy(Request $request, int $id): RedirectResponse
    {
        $this->authorizeUserManagement($request);
        if ($request->user()->id === $id) {
            return redirect()->back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        $user = User::findOrFail($id);
        $this->authorizeTargetUser($request, $user);
        $name = $user->name;
        $user->delete();

        return redirect()->back()->with('success', "Pengguna {$name} berhasil dihapus.");
    }

    private function authorizeUserManagement(Request $request): void
    {
        if (! $request->user()?->isOwner() && ! $request->user()?->isOperationalAdmin()) {
            abort(403, 'Anda tidak memiliki kewenangan mengelola pengguna.');
        }
    }

    private function authorizeRoleAssignment(Request $request, string $role): void
    {
        if (! $request->user()->isOwner() && $role !== 'Lapangan') {
            abort(403, 'Admin hanya dapat membuat dan mengelola akun Operasional.');
        }
    }

    private function authorizeTargetUser(Request $request, User $target): void
    {
        if (! $request->user()->isOwner() && ! $target->hasAnyRole(['Lapangan', 'Tim Lapangan', 'Staf Operasional'])) {
            abort(403, 'Admin hanya dapat mengelola akun Operasional.');
        }
    }
}
