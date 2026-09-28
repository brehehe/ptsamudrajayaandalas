<?php

namespace App\Http\Controllers;

use App\Models\ServiceType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServiceTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $types = ServiceType::where('is_active', true)->orderByDesc('is_default')->orderBy('name')->get();

        return Inertia::render('Master/ServiceTypes/Index', [
            'serviceTypes' => $types,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:service_types,code'],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        $st = ServiceType::create([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_default' => $validated['is_default'] ?? false,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', "Tipe kegiatan {$st->name} berhasil ditambahkan.");
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $st = ServiceType::findOrFail($id);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:service_types,code,'.$st->id],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        $st->update($validated);

        return redirect()->back()->with('success', "Tipe kegiatan {$st->name} berhasil diperbarui.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $st = ServiceType::findOrFail($id);
        if ($st->is_default) {
            return redirect()->back()->with('error', "Tipe kegiatan default ({$st->name}) tidak boleh dihapus.");
        }

        $st->delete();

        return redirect()->back()->with('success', "Tipe kegiatan {$st->name} berhasil dinonaktifkan.");
    }
}
