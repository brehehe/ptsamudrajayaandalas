<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMasterUserRequest;
use App\Http\Requests\UpdateMasterUserRequest;
use App\Models\User;
use App\Support\UserRoleHierarchy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class MasterUserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);
        $search = $request->query('search');
        /** @var User $actor */
        $actor = $request->user();

        $query = User::query()->with('roles');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'job_title' => $user->job_title,
                'is_active' => $user->is_active,
                'account_status' => $user->account_status,
                'last_login_at' => $user->last_login_at,
                'roles' => $user->roles->map->only(['id', 'name'])->values(),
                'can_update' => $actor->can('update', $user),
                'can_delete' => $actor->can('delete', $user),
            ]);
        $assignableRoles = UserRoleHierarchy::assignableRoles($actor);
        $availableRoles = Role::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $assignableRoles)
            ->pluck('name')
            ->all();
        $roles = array_values(array_intersect($assignableRoles, $availableRoles));

        return Inertia::render('Master/Users/Index', [
            'users' => $users,
            'roles' => $roles,
            'search' => $search ?? '',
            'can_manage' => $actor->can('create', User::class) && $roles !== [],
        ]);
    }

    public function store(StoreMasterUserRequest $request): RedirectResponse
    {
        Gate::authorize('create', User::class);
        $validated = $request->validated();

        $user = DB::transaction(function () use ($validated): User {
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

            return $user;
        });

        return redirect()->back()->with('success', "Pengguna {$user->name} berhasil ditambahkan dengan peran {$validated['role']}.");
    }

    public function update(UpdateMasterUserRequest $request, int $id): RedirectResponse
    {
        $user = User::findOrFail($id);
        Gate::authorize('update', $user);
        $validated = $request->validated();

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

        DB::transaction(function () use ($user, $updateData, $validated): void {
            $user->update($updateData);
            $user->syncRoles([$validated['role']]);
        });

        return redirect()->back()->with('success', "Data pengguna {$user->name} berhasil diperbarui.");
    }

    public function destroy(Request $request, int $id): RedirectResponse
    {
        if ($request->user()->id === $id) {
            return redirect()->back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        $user = User::findOrFail($id);
        Gate::authorize('delete', $user);
        $name = $user->name;
        $user->delete();

        return redirect()->back()->with('success', "Pengguna {$name} berhasil dihapus.");
    }
}
