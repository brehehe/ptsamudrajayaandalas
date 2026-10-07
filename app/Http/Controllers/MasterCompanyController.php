<?php

namespace App\Http\Controllers;

use App\Models\ShipCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterCompanyController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');

        $query = ShipCompany::query()
            ->withCount(['ships' => fn ($q) => $q->where('is_active', true)])
            ->with(['ships' => fn ($q) => $q->where('is_active', true)->select('id', 'ship_company_id', 'name', 'imo_number', 'status')])
            ->where('is_active', true);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        $companies = $query->orderBy('name')->get();

        return Inertia::render('Master/Companies/Index', [
            'companies' => $companies,
            'search' => $search ?? '',
        ]);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
        ]);

        $code = ! empty($validated['code'])
            ? strtoupper(trim($validated['code']))
            : strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $validated['name']), 0, 3));

        $company = ShipCompany::create([
            'name' => trim($validated['name']),
            'code' => $code,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'is_active' => true,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Perusahaan {$company->name} berhasil ditambahkan.",
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'code' => $company->code,
                    'phone' => $company->phone,
                    'email' => $company->email,
                    'address' => $company->address,
                ],
            ], 201);
        }

        return redirect()->back()
            ->with('success', "Perusahaan {$company->name} berhasil ditambahkan.")
            ->with('created_company', [
                'id' => $company->id,
                'name' => $company->name,
            ]);
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $company = ShipCompany::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
        ]);

        $company->update($validated);

        return redirect()->back()->with('success', "Data perusahaan {$company->name} berhasil diperbarui.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $company = ShipCompany::findOrFail($id);
        $name = $company->name;
        $company->delete();

        return redirect()->back()->with('success', "Perusahaan {$name} berhasil dinonaktifkan.");
    }
}
