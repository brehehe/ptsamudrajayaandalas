<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMasterVesselRequest;
use App\Http\Requests\UpdateMasterVesselRequest;
use App\Models\Ship;
use App\Models\ShipCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class MasterVesselController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $query = Ship::query()
            ->with('company:id,name,code')
            ->withCount('portCalls')
            ->where('is_active', true);

        if ($search) {
            $query->where(function ($shipQuery) use ($search, $like) {
                $shipQuery->where('name', $like, "%{$search}%")
                    ->orWhere('imo_number', $like, "%{$search}%")
                    ->orWhere('call_sign', $like, "%{$search}%")
                    ->orWhere('ship_type', $like, "%{$search}%")
                    ->orWhereHas('company', function ($companyQuery) use ($search, $like) {
                        $companyQuery->where('name', $like, "%{$search}%")
                            ->orWhere('code', $like, "%{$search}%");
                    });
            });
        }

        return Inertia::render('Master/Vessels/Index', [
            'vessels' => $query->orderBy('name')->orderBy('id')->get(),
            'companies' => ShipCompany::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'search' => $search ?? '',
            'canManage' => $request->user()?->isOperationalAdmin() ?? false,
        ]);
    }

    public function store(StoreMasterVesselRequest $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validated();
        $imagePath = $request->file('image')?->store('sja/vessels', 'public');

        $ship = Ship::create([
            'name' => trim($validated['name']),
            'ship_company_id' => $validated['ship_company_id'],
            'imo_number' => ! empty($validated['imo_number']) ? trim($validated['imo_number']) : null,
            'call_sign' => ! empty($validated['call_sign']) ? trim($validated['call_sign']) : null,
            'flag' => ! empty($validated['flag']) ? trim($validated['flag']) : 'Indonesia',
            'ship_type' => ! empty($validated['ship_type']) ? trim($validated['ship_type']) : null,
            'gross_tonnage' => $validated['gross_tonnage'] ?? null,
            'length' => $validated['length'] ?? null,
            'captain_name' => ! empty($validated['captain_name']) ? trim($validated['captain_name']) : null,
            'captain_phone' => ! empty($validated['captain_phone']) ? trim($validated['captain_phone']) : null,
            'status' => 'Akan Datang',
            'image' => $imagePath ? '/storage/'.$imagePath : null,
            'created_by' => $request->user()?->id,
            'is_active' => true,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Kapal {$ship->name} berhasil ditambahkan.",
                'vessel' => [
                    'id' => $ship->id,
                    'name' => $ship->name,
                    'ship_company_id' => $ship->ship_company_id,
                    'imo_number' => $ship->imo_number,
                    'ship_type' => $ship->ship_type,
                    'gross_tonnage' => $ship->gross_tonnage,
                    'call_sign' => $ship->call_sign,
                    'flag' => $ship->flag,
                    'image' => $ship->image,
                ],
            ], 201);
        }

        return redirect()->back()
            ->with('success', "Kapal {$ship->name} berhasil ditambahkan.")
            ->with('created_vessel', [
                'id' => $ship->id,
                'name' => $ship->name,
                'ship_company_id' => $ship->ship_company_id,
            ]);
    }

    public function update(UpdateMasterVesselRequest $request, Ship $ship): RedirectResponse
    {
        $validated = $request->validated();
        $previousImage = $ship->image;
        $imagePath = $request->file('image')?->store('sja/vessels', 'public');

        $ship->update([
            'name' => trim($validated['name']),
            'ship_company_id' => $validated['ship_company_id'],
            'imo_number' => ! empty($validated['imo_number']) ? trim($validated['imo_number']) : null,
            'call_sign' => ! empty($validated['call_sign']) ? trim($validated['call_sign']) : null,
            'flag' => ! empty($validated['flag']) ? trim($validated['flag']) : 'Indonesia',
            'ship_type' => ! empty($validated['ship_type']) ? trim($validated['ship_type']) : null,
            'gross_tonnage' => $validated['gross_tonnage'] ?? null,
            'length' => $validated['length'] ?? null,
            'captain_name' => ! empty($validated['captain_name']) ? trim($validated['captain_name']) : null,
            'captain_phone' => ! empty($validated['captain_phone']) ? trim($validated['captain_phone']) : null,
            'image' => $imagePath
                ? '/storage/'.$imagePath
                : (($validated['remove_image'] ?? false) ? null : $previousImage),
        ]);

        if ($imagePath || ($validated['remove_image'] ?? false)) {
            $this->deleteManagedImage($previousImage);
        }

        return redirect()->back()->with('success', "Data kapal {$ship->name} berhasil diperbarui.");
    }

    public function destroy(Request $request, Ship $ship): RedirectResponse
    {
        abort_unless($request->user()?->isOperationalAdmin(), 403);

        $name = $ship->name;
        $ship->update(['is_active' => false]);

        return redirect()->back()->with('success', "Kapal {$name} berhasil dihapus dari master aktif.");
    }

    private function deleteManagedImage(?string $image): void
    {
        if (! $image || ! str_starts_with($image, '/storage/sja/vessels/')) {
            return;
        }

        Storage::disk('public')->delete(str_replace('/storage/', '', $image));
    }
}
