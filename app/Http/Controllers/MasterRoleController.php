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
        $roleDescriptions = [
            'Owner' => 'Pemilik perusahaan dengan wewenang monitoring total seluruh transaksi, piutang, dan laporan eksekutif.',
            'Direktur' => 'Direktur operasional (Pak Ryan) dengan wewenang approval anggaran, filter keputusan pengajuan, dan otorisasi Kopra.',
            'Admin' => 'Staf operasional & keuangan (Bu Titik) pengelola alur pengajuan, penyesuaian harga vendor, dan rilis invoice dual-kategori.',
            'Lapangan' => 'Petugas operasional lapangan (Pak Prima) penanggung jawab kunjungan kapal, input pengajuan kebutuhan, dan laporan harian.',
        ];

        $roles = Role::whereIn('name', ['Owner', 'Direktur', 'Admin', 'Lapangan'])
            ->with(['users' => fn ($q) => $q->select('id', 'name', 'email')])
            ->get()
            ->map(function ($role) use ($roleDescriptions) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'description' => $roleDescriptions[$role->name] ?? 'Peran sistem keagenan kapal SJA.',
                    'users_count' => $role->users->count(),
                    'users' => $role->users,
                ];
            });

        return Inertia::render('Master/Roles/Index', [
            'roles' => $roles,
        ]);
    }
}
