<?php

namespace App\Http\Controllers;

use App\Models\Port;
use App\Models\PortCall;
use App\Models\Product;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class VesselController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status', 'Semua');
        $search = $request->query('search');
        $companyId = $request->query('company_id');

        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $statuses = [
            'Akan Datang' => ['scheduled', 'Akan Datang'],
            'Labuh' => ['anchored', 'Labuh'],
            'Sandar' => ['berthed', 'Sandar'],
            'Selesai' => ['departed', 'completed', 'Selesai'],
        ];

        $query = PortCall::query()
            ->with(['ship.company', 'port', 'requests.items'])
            ->whereHas('ship', fn ($shipQuery) => $shipQuery->where('is_active', true));

        if ($status && $status !== 'Semua') {
            $query->whereIn('status', $statuses[$status] ?? [$status]);
        }

        if ($companyId) {
            $query->whereHas('ship', fn ($shipQuery) => $shipQuery->where('ship_company_id', $companyId));
        }

        if ($search) {
            $query->where(function ($q) use ($search, $like) {
                $q->where('job_number', $like, "%{$search}%")
                    ->orWhereHas('ship', function ($shipQuery) use ($search, $like) {
                        $shipQuery->where('name', $like, "%{$search}%")
                            ->orWhere('imo_number', $like, "%{$search}%")
                            ->orWhere('agent_name', $like, "%{$search}%");
                    })
                    ->orWhereHas('ship.company', function ($companyQuery) use ($search, $like) {
                        $companyQuery->where('name', $like, "%{$search}%")
                            ->orWhere('code', $like, "%{$search}%");
                    })
                    ->orWhereHas('port', function ($portQuery) use ($search, $like) {
                        $portQuery->where('name', $like, "%{$search}%");
                    });
            });
        }

        $vessels = $query->orderBy('eta_at')->orderBy('id')->get()->map(function (PortCall $portCall) {
            $ship = $portCall->ship;
            $needsCount = $portCall->requests->flatMap->items->count();
            $requestsCount = $portCall->requests->count();
            $translatedStatus = match ($portCall->status) {
                'scheduled' => 'Akan Datang',
                'anchored' => 'Labuh',
                'berthed' => 'Sandar',
                'departed', 'completed' => 'Selesai',
                default => $portCall->status,
            };

            return [
                'id' => $ship->id,
                'visit_id' => $portCall->id,
                'job_number' => $portCall->job_number,
                'name' => $ship->name,
                'imo_number' => $ship->imo_number,
                'ship_type' => $ship->ship_type,
                'status' => $translatedStatus,
                'agent_name' => $ship->agent_name,
                'is_active' => $ship->is_active,
                'image' => $ship->image,
                'eta' => $portCall->eta_at?->toISOString(),
                'port_name' => $portCall->port?->name,
                'needs_count' => $needsCount,
                'requests_count' => $requestsCount,
                'ship_company_id' => $ship->ship_company_id,
                'company' => $ship->company,
                'created_at' => $portCall->created_at?->toISOString(),
            ];
        });

        $companies = ShipCompany::where('is_active', true)
            ->withCount(['ships' => function ($q) {
                $q->where('is_active', true);
            }])
            ->with(['ships' => function ($q) {
                $q->where('is_active', true)->select('id', 'name', 'imo_number', 'status', 'ship_type', 'ship_company_id');
            }])
            ->orderBy('name')
            ->get();

        $activePortCalls = fn () => PortCall::query()
            ->whereHas('ship', fn ($shipQuery) => $shipQuery->where('is_active', true));

        $counts = [
            'semua' => $activePortCalls()->count(),
            'akan_datang' => $activePortCalls()->whereIn('status', $statuses['Akan Datang'])->count(),
            'labuh' => $activePortCalls()->whereIn('status', $statuses['Labuh'])->count(),
            'sandar' => $activePortCalls()->whereIn('status', $statuses['Sandar'])->count(),
            'selesai' => $activePortCalls()->whereIn('status', $statuses['Selesai'])->count(),
        ];

        $ports = Port::where('is_active', true)->select('id', 'name', 'code')->orderBy('name')->get();
        $allMasterShips = Ship::where('is_active', true)
            ->with('company')
            ->select('id', 'name', 'imo_number', 'ship_type', 'gross_tonnage', 'length', 'call_sign', 'captain_name', 'ship_company_id', 'port_id', 'image')
            ->orderBy('name')
            ->get();
        $canCreateShip = $request->user()?->isOperationalAdmin() ?? false;

        return Inertia::render('Vessels/Index', [
            'vessels' => $vessels,
            'companies' => $companies,
            'counts' => $counts,
            'ports' => $ports,
            'allMasterShips' => $allMasterShips,
            'canCreateShip' => $canCreateShip,
            'activeStatus' => $status,
            'selectedCompanyId' => $companyId ?? '',
            'search' => $search ?? '',
        ]);
    }

    public function show(Request $request, string $id): Response
    {
        $vessel = Ship::with([
            'company',
            'port',
            'requests' => function ($q) {
                $q->with('items')->orderByDesc('created_at');
            },
        ])->findOrFail($id);

        $products = Product::where('is_active', true)
            ->select('id', 'name', 'code', 'category', 'unit', 'item_type')
            ->orderBy('name')
            ->get();

        $portCalls = $vessel->portCalls()
            ->with(['port', 'clearanceInRequests:id,port_call_id'])
            ->orderByDesc('eta_at')
            ->get();

        $clearancePortCalls = $portCalls
            ->whereNotIn('status', ['departed', 'completed'])
            ->filter(fn (PortCall $portCall) => $request->user()->can('updateStatus', $portCall))
            ->map(fn (PortCall $portCall) => [
                'id' => $portCall->id,
                'job_number' => $portCall->job_number,
                'status' => $portCall->status,
                'clearance_in_block_reason' => $portCall->clearanceInBlockReason(),
                'can_clearance_out' => in_array($portCall->status, ['anchored', 'berthed'], true),
                'update_url' => route('operations.port-calls.status', $portCall->id, false),
            ])->values();

        $requestedPortCallId = $request->string('visit')->toString();
        $requestedVisit = $requestedPortCallId !== ''
            ? $portCalls->firstWhere('id', $requestedPortCallId)
            : null;

        if ($requestedPortCallId !== '' && ! $requestedVisit) {
            abort(404);
        }

        $selectedPortCall = $clearancePortCalls->firstWhere('id', $requestedPortCallId)
            ?? $clearancePortCalls->firstWhere('status', 'scheduled')
            ?? $clearancePortCalls->first();
        $selectedVisit = $requestedVisit
            ?? $portCalls->firstWhere('id', $selectedPortCall['id'] ?? null)
            ?? $portCalls->first();

        $vessel->load([
            'operationalActivities' => fn ($query) => $query
                ->where('port_call_id', $selectedVisit?->id)
                ->with('creator'),
        ]);

        $needs = $selectedVisit
            ? $vessel->requests
                ->where('port_call_id', $selectedVisit->id)
                ->reject(fn (ShipRequest $shipRequest) => in_array(
                    $shipRequest->service_type,
                    ['clearance_in', 'clearance_out'],
                    true,
                ))
                ->values()
                ->map(fn (ShipRequest $shipRequest) => [
                    'id' => $shipRequest->id,
                    'request_number' => $shipRequest->request_number,
                    'status' => $shipRequest->status,
                    'request_date' => $shipRequest->request_date?->toDateString(),
                    'port_call_id' => $shipRequest->port_call_id,
                    'service_type' => $shipRequest->service_type,
                    'notes' => $shipRequest->notes,
                    'created_at' => $shipRequest->created_at?->toISOString(),
                    'items' => $shipRequest->items->map(fn (RequestItem $item) => [
                        'id' => $item->id,
                        'item_name' => $item->item_name,
                        'quantity' => $item->quantity,
                        'unit' => $item->unit,
                        'notes' => $item->notes,
                        'required_date' => $item->required_date?->toDateString(),
                        'required_time' => $item->required_time,
                        'is_urgent' => $item->is_urgent,
                        'director_status' => $item->director_status,
                    ])->values(),
                ])
            : collect();

        $vesselPayload = $vessel->toArray();
        $vesselPayload['eta'] = $selectedVisit?->eta_at?->toISOString();
        $vesselPayload['port'] = $selectedVisit?->port?->toArray();

        return Inertia::render('Vessels/Show', [
            'vessel' => $vesselPayload,
            'needs' => $needs,
            'products' => $products,
            'clearancePortCalls' => $clearancePortCalls,
            'selectedPortCallId' => $selectedPortCall['id'] ?? null,
            'selectedVisit' => $selectedVisit ? [
                'id' => $selectedVisit->id,
                'job_number' => $selectedVisit->job_number,
                'status' => $selectedVisit->status,
                'eta_at' => $selectedVisit->eta_at?->toISOString(),
                'etd_at' => $selectedVisit->etd_at?->toISOString(),
                'port' => $selectedVisit->port?->only(['id', 'name', 'code', 'city']),
            ] : null,
            'canManageClearance' => $request->user()->isStaff() || $request->user()->isOperationalAdmin(),
            'canProcessRequests' => $request->user()->isOperationalAdmin(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->user()?->isOperationalAdmin()) {
            abort(403, 'Hanya Admin yang berwenang menambahkan kapal atau kunjungan baru.');
        }

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

        $ship = Ship::create([
            'name' => $validated['name'],
            'imo_number' => $validated['imo_number'],
            'ship_type' => $validated['ship_type'],
            'status' => $validated['status'],
            'ship_company_id' => $companyId,
            'agent_name' => $validated['agent_name'] ?? 'PT Samudra Jaya Andalas',
            'eta' => $validated['eta'] ?? now()->addDays(2),
            'is_active' => true,
        ]);

        $portId = $ship->port_id;
        if (! $portId) {
            $portId = Port::where('is_active', true)->first()?->id ?? Port::first()?->id;
        }

        $effectiveCompanyId = $companyId ?: ShipCompany::where('is_active', true)->first()?->id ?: ShipCompany::first()?->id;
        $effectiveUserId = $request->user()?->id ?: User::first()?->id ?: 1;

        $workOrder = WorkOrder::create([
            'system_number' => 'SPK-SJA-'.date('y').'-'.strtoupper(Str::random(5)),
            'client_number' => 'SPK/'.($ship->company?->code ?: 'SJA').'/'.date('m/Y').'/'.rand(100, 999),
            'company_id' => $effectiveCompanyId,
            'document_date' => now()->toDateString(),
            'received_at' => now(),
            'source' => 'system',
            'status' => 'accepted',
            'created_by' => $effectiveUserId,
            'assigned_to' => $effectiveUserId,
            'planned_ship_id' => $ship->id,
            'planned_port_id' => $portId,
            'planned_eta_at' => $ship->eta ?? now()->addDays(2),
        ]);

        PortCall::create([
            'ship_id' => $ship->id,
            'port_id' => $portId,
            'work_order_id' => $workOrder->id,
            'job_number' => 'JOB-'.date('Ymd').'-'.rand(100, 999),
            'status' => 'scheduled',
            'financial_status' => 'pending_reconciliation',
            'eta_at' => $ship->eta ?? now()->addDays(2),
        ]);

        return redirect()->route('vessels.index')->with('success', 'Kapal dan data perusahaan berhasil disimpan.');
    }

    public function storeCompany(Request $request): RedirectResponse
    {
        if (! $request->user()?->isOperationalAdmin()) {
            abort(403, 'Hanya Admin yang berwenang menambahkan perusahaan pelayaran.');
        }

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

    public function storeArrival(Request $request): RedirectResponse
    {
        if (! $request->user()?->isOperationalAdmin()) {
            abort(403, 'Hanya Admin yang berwenang menambahkan kedatangan kapal baru.');
        }
        $validated = $request->validate([
            'ship_selection_type' => 'required|in:existing,new',
            'ship_id' => 'nullable|required_if:ship_selection_type,existing|uuid|exists:ships,id',
            'name' => 'nullable|required_if:ship_selection_type,new|string|max:255',
            'imo_number' => 'nullable|string|max:50',
            'ship_type' => 'nullable|string|max:100',
            'company_selection_type' => 'nullable|in:existing,new',
            'ship_company_id' => 'nullable|required_if:company_selection_type,existing|uuid|exists:ship_companies,id',
            'new_company_name' => 'nullable|required_if:company_selection_type,new|string|max:255',
            'new_company_code' => 'nullable|string|max:50',
            'gross_tonnage' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'call_sign' => 'nullable|string|max:50',
            'captain_name' => 'nullable|string|max:255',
            'captain_phone' => 'nullable|string|max:50',
            'port_id' => 'nullable|uuid|exists:ports,id',
            'eta' => 'required|date',
            'arrival_notes' => 'nullable|string',
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $companyId = $validated['ship_company_id'] ?? null;

        if (($validated['company_selection_type'] ?? '') === 'new' && ! empty($validated['new_company_name'])) {
            $companyCode = ! empty($validated['new_company_code'])
                ? strtoupper(trim($validated['new_company_code']))
                : strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $validated['new_company_name']), 0, 3));

            $newCompany = ShipCompany::create([
                'name' => trim($validated['new_company_name']),
                'code' => $companyCode,
                'is_active' => true,
            ]);

            $companyId = $newCompany->id;
        }

        if ($validated['ship_selection_type'] === 'existing' && ! empty($validated['ship_id'])) {
            $ship = Ship::findOrFail($validated['ship_id']);
            $ship->update([
                'ship_company_id' => $companyId ?: $ship->ship_company_id,
                'port_id' => $validated['port_id'] ?? $ship->port_id,
                'gross_tonnage' => $validated['gross_tonnage'] ?? $ship->gross_tonnage,
                'length' => $validated['length'] ?? $ship->length,
                'call_sign' => $validated['call_sign'] ?? $ship->call_sign,
                'captain_name' => $validated['captain_name'] ?? $ship->captain_name,
                'captain_phone' => $validated['captain_phone'] ?? $ship->captain_phone,
                'status' => 'Akan Datang',
                'eta' => $validated['eta'],
                'arrival_notes' => $validated['arrival_notes'] ?? $ship->arrival_notes,
                'is_active' => true,
            ]);
        } else {
            $imagePath = $request->file('image')?->store('sja/vessels', 'public');

            $ship = Ship::create([
                'ship_company_id' => $companyId,
                'port_id' => $validated['port_id'] ?? null,
                'name' => trim($validated['name']),
                'imo_number' => ! empty($validated['imo_number']) ? trim($validated['imo_number']) : null,
                'ship_type' => $validated['ship_type'] ?: null,
                'gross_tonnage' => $validated['gross_tonnage'] ?? null,
                'length' => $validated['length'] ?? null,
                'call_sign' => $validated['call_sign'] ?? null,
                'captain_name' => $validated['captain_name'] ?? null,
                'captain_phone' => $validated['captain_phone'] ?? null,
                'status' => 'Akan Datang',
                'eta' => $validated['eta'],
                'agent_name' => 'PT Samudra Jaya Andalas',
                'arrival_notes' => $validated['arrival_notes'] ?? null,
                'image' => $imagePath ? '/storage/'.$imagePath : null,
                'created_by' => $request->user()?->id,
                'is_active' => true,
            ]);
        }

        $portId = $ship->port_id ?? $validated['port_id'] ?? null;
        if (! $portId) {
            $portId = Port::where('is_active', true)->first()?->id ?? Port::first()?->id;
        }

        $effectiveCompanyId = $ship->ship_company_id ?: ShipCompany::where('is_active', true)->first()?->id ?: ShipCompany::first()?->id;
        $effectiveUserId = $request->user()?->id ?: User::first()?->id ?: 1;

        $workOrder = WorkOrder::create([
            'system_number' => 'SPK-SJA-'.date('y').'-'.strtoupper(Str::random(5)),
            'client_number' => 'SPK/'.($ship->company?->code ?: 'SJA').'/'.date('m/Y').'/'.rand(100, 999),
            'company_id' => $effectiveCompanyId,
            'document_date' => now()->toDateString(),
            'received_at' => now(),
            'source' => 'system',
            'status' => 'accepted',
            'created_by' => $effectiveUserId,
            'assigned_to' => $effectiveUserId,
            'planned_ship_id' => $ship->id,
            'planned_port_id' => $portId,
            'planned_eta_at' => $validated['eta'],
        ]);

        // Create or schedule a PortCall
        PortCall::create([
            'ship_id' => $ship->id,
            'port_id' => $portId,
            'work_order_id' => $workOrder->id,
            'job_number' => 'JOB-'.date('Ymd').'-'.rand(100, 999),
            'status' => 'scheduled',
            'financial_status' => 'pending_reconciliation',
            'eta_at' => $validated['eta'],
        ]);

        return redirect()->back()->with('success', "Data kedatangan kapal {$ship->name} berhasil dicatat dan status disetel ke 'Akan Datang'.");
    }
}
