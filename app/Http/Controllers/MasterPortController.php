<?php

namespace App\Http\Controllers;

use App\Models\Port;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterPortController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');

        $query = Port::query()->withCount('portCalls');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%")
                    ->orWhere('city', 'ilike', "%{$search}%");
            });
        }

        $ports = $query->orderBy('name')->get();

        return Inertia::render('Master/Ports/Index', [
            'ports' => $ports,
            'search' => $search ?? '',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:10', 'unique:ports,code'],
            'name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'country' => ['required', 'string', 'max:2'],
            'timezone' => ['required', 'string', 'max:50'],
        ]);

        Port::create([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'city' => $validated['city'],
            'country' => strtoupper($validated['country']),
            'timezone' => $validated['timezone'],
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', "Pelabuhan {$validated['name']} ({$validated['code']}) berhasil ditambahkan.");
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $port = Port::findOrFail($id);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:10', 'unique:ports,code,'.$port->id],
            'name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'country' => ['required', 'string', 'max:2'],
            'timezone' => ['required', 'string', 'max:50'],
            'is_active' => ['required', 'boolean'],
        ]);

        $port->update([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'city' => $validated['city'],
            'country' => strtoupper($validated['country']),
            'timezone' => $validated['timezone'],
            'is_active' => $validated['is_active'],
        ]);

        return redirect()->back()->with('success', "Data pelabuhan {$port->name} berhasil diperbarui.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $port = Port::findOrFail($id);
        $name = $port->name;
        $port->delete();

        return redirect()->back()->with('success', "Pelabuhan {$name} berhasil dinonaktifkan.");
    }
}
