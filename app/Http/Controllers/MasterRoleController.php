<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class MasterRoleController extends Controller
{
    public function index(Request $request): Response
    {
        if (! $request->user()?->isOwner() && ! $request->user()?->isOperationalAdmin()) {
            abort(403, 'Anda tidak memiliki kewenangan melihat pengaturan role.');
        }

        $roleDescriptions = [
            'Owner' => 'Pemilik perusahaan dengan wewenang monitoring total seluruh transaksi, piutang, dan laporan eksekutif.',
            'Direktur' => 'Direktur operasional dengan wewenang approval anggaran, filter keputusan pengajuan, dan otorisasi Kopra.',
            'Admin' => 'Staf operasional & keuangan pengelola alur pengajuan, penyesuaian harga vendor, dan rilis invoice dual-kategori.',
            'Lapangan' => 'Petugas operasional lapangan penanggung jawab kunjungan kapal, input pengajuan kebutuhan, dan laporan harian.',
        ];

        $order = ['Owner' => 1, 'Direktur' => 2, 'Admin' => 3, 'Lapangan' => 4];

        $roles = Role::whereIn('name', ['Owner', 'Direktur', 'Admin', 'Lapangan'])
            ->with([
                'users' => fn ($q) => $q->select('id', 'name', 'email'),
                'permissions' => fn ($q) => $q->select('id', 'name')->orderBy('name'),
            ])
            ->get()
            ->sortBy(fn ($role) => $order[$role->name] ?? 99)
            ->values()
            ->map(function ($role) use ($roleDescriptions) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'description' => $roleDescriptions[$role->name] ?? 'Peran sistem keagenan kapal SJA.',
                    'users_count' => $role->users->count(),
                    'users' => $role->users,
                    'permissions_count' => $role->permissions->count(),
                    'permissions' => $role->permissions->pluck('name'),
                ];
            });

        return Inertia::render('Master/Roles/Index', [
            'roles' => $roles,
        ]);
    }
}
