<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterVendorController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');

        $query = Vendor::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%")
                    ->orWhere('address', 'ilike', "%{$search}%");
            });
        }

        $vendors = $query->orderBy('name')->get();

        return Inertia::render('Master/Vendors/Index', [
            'vendors' => $vendors,
            'search' => $search ?? '',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:vendors,code'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        Vendor::create([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', "Vendor {$validated['name']} berhasil ditambahkan.");
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $vendor = Vendor::findOrFail($id);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:vendors,code,'.$vendor->id],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
        ]);

        $vendor->update([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'is_active' => $validated['is_active'],
        ]);

        return redirect()->back()->with('success', "Data vendor {$vendor->name} berhasil diperbarui.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $vendor = Vendor::findOrFail($id);
        $name = $vendor->name;
        $vendor->delete();

        return redirect()->back()->with('success', "Vendor {$name} berhasil dinonaktifkan.");
    }
}
