<?php

namespace App\Http\Controllers;

use App\Models\Ship;
use App\Models\ShipCompany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VesselController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status', 'Semua');
        $search = $request->query('search');
        $companyId = $request->query('company_id');

        $query = Ship::query()->with('company')->where('is_active', true);

        if ($status && $status !== 'Semua') {
            $query->where('status', 'ilike', "%{$status}%");
        }

        if ($companyId) {
            $query->where('ship_company_id', $companyId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('imo_number', 'ilike', "%{$search}%")
                    ->orWhere('agent_name', 'ilike', "%{$search}%")
                    ->orWhereHas('company', function ($cq) use ($search) {
                        $cq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('code', 'ilike', "%{$search}%");
                    });
            });
        }

        $vessels = $query->orderBy('name')->get();

        $companies = ShipCompany::where('is_active', true)
            ->withCount(['ships' => function ($q) {
                $q->where('is_active', true);
            }])
            ->with(['ships' => function ($q) {
                $q->where('is_active', true)->select('id', 'name', 'imo_number', 'status', 'ship_type', 'ship_company_id');
            }])
            ->orderBy('name')
            ->get();

        $counts = [
            'semua' => Ship::where('is_active', true)->count(),
            'akan_datang' => Ship::where('is_active', true)->where('status', 'Akan Datang')->count(),
            'labuh' => Ship::where('is_active', true)->where('status', 'Labuh')->count(),
            'sandar' => Ship::where('is_active', true)->where('status', 'Sandar')->count(),
        ];

        return Inertia::render('Vessels/Index', [
            'vessels' => $vessels,
            'companies' => $companies,
            'counts' => $counts,
            'activeStatus' => $status,
            'selectedCompanyId' => $companyId ?? '',
            'search' => $search ?? '',
        ]);
    }

    public function show(string $id): Response
    {
        $vessel = Ship::with([
            'company',
            'requests' => function ($q) {
                $q->orderByDesc('created_at')->limit(10);
            },
        ])->findOrFail($id);

        return Inertia::render('Vessels/Show', [
            'vessel' => $vessel,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'imo_number' => 'required|string|max:20',
            'ship_type' => 'required|string|max:100',
            'status' => 'required|string|max:50',
            'agent_name' => 'nullable|string|max:255',
            'eta' => 'nullable|date',
            'ship_company_id' => 'nullable|uuid|exists:ship_companies,id',
            'is_new_company' => 'nullable|boolean',
            'new_company_name' => 'nullable|required_if:is_new_company,true|string|max:255',
            'new_company_code' => 'nullable|string|max:50',
            'new_company_phone' => 'nullable|string|max:50',
            'new_company_email' => 'nullable|email|max:255',
            'new_company_address' => 'nullable|string',
        ]);

        $companyId = $validated['ship_company_id'] ?? null;

        // If user creates a new shipping company on the fly
        if (! empty($validated['is_new_company']) && ! empty($validated['new_company_name'])) {
            $companyCode = ! empty($validated['new_company_code'])
                ? strtoupper(trim($validated['new_company_code']))
                : strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $validated['new_company_name']), 0, 3));

            $newCompany = ShipCompany::create([
                'name' => trim($validated['new_company_name']),
                'code' => $companyCode,
                'phone' => $validated['new_company_phone'] ?? null,
                'email' => $validated['new_company_email'] ?? null,
                'address' => $validated['new_company_address'] ?? null,
                'is_active' => true,
            ]);

            $companyId = $newCompany->id;
        }

        Ship::create([
            'name' => $validated['name'],
            'imo_number' => $validated['imo_number'],
            'ship_type' => $validated['ship_type'],
            'status' => $validated['status'],
            'ship_company_id' => $companyId,
            'agent_name' => $validated['agent_name'] ?? 'PT Samudra Jaya Andalas',
            'eta' => $validated['eta'] ?? now()->addDays(2),
            'is_active' => true,
        ]);

        return redirect()->route('vessels.index')->with('success', 'Kapal dan data perusahaan berhasil disimpan.');
    }

    public function storeCompany(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $code = ! empty($validated['code'])
            ? strtoupper(trim($validated['code']))
            : strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $validated['name']), 0, 3));

        ShipCompany::create([
            'name' => trim($validated['name']),
            'code' => $code,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'is_active' => true,
        ]);

        return redirect()->route('vessels.index', ['tab' => 'companies'])->with('success', 'Perusahaan pelayaran baru berhasil ditambahkan.');
    }
}
