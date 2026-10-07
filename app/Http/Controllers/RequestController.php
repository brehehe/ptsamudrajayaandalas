<?php

namespace App\Http\Controllers;

use App\Events\ShipRequestSubmitted;
use App\Models\Invoice;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Product;
use App\Models\ProductPortPrice;
use App\Models\RequestItem;
use App\Models\ServiceType;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\Vendor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RequestController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'semua');
        $search = $request->query('search');

        $includedStatuses = match ($tab) {
            'menunggu' => ['Menunggu Approval', 'Menunggu', 'pending'],
            'diproses' => ['Dalam Proses', 'Diproses', 'Disetujui', 'Disetujui Sebagian'],
            'selesai', 'riwayat' => ['Selesai', 'Dibatalkan'],
            default => null,
        };
        $excludedStatuses = $tab === 'aktif' ? ['Selesai', 'Dibatalkan'] : null;

        $query = ShipRequest::query()->with([
            'ship.company',
            'company',
            'port',
            'portCall.workOrder',
            'portCall.port',
            'creator',
            'invoices',
            'items.product.vendor',
            'items.vendor',
        ]);

        if ($includedStatuses) {
            $query->whereIn('status', $includedStatuses);
        } elseif ($excludedStatuses) {
            $query->whereNotIn('status', $excludedStatuses);
        }

        if ($search) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $like) {
                $q->where('request_number', $like, "%{$search}%")
                    ->orWhere('notes', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('items', fn ($iq) => $iq->where('item_name', $like, "%{$search}%"))
                    ->orWhereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$search}%"));
            });
        }

        $requests = $query->orderByDesc('created_at')->get();

        $portCallsQuery = PortCall::query()->with([
            'ship.company',
            'port',
            'workOrder',
        ]);

        if ($includedStatuses) {
            $portCallsQuery->whereHas('requests', fn ($query) => $query->whereIn('status', $includedStatuses));
        } elseif ($excludedStatuses) {
            $portCallsQuery->whereHas('requests', fn ($query) => $query->whereNotIn('status', $excludedStatuses));
        }

        if ($search) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $portCallsQuery->where(function ($query) use ($search, $like) {
                $query->where('job_number', $like, "%{$search}%")
                    ->orWhereHas('ship', function ($shipQuery) use ($search, $like) {
                        $shipQuery->where('name', $like, "%{$search}%")
                            ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', $like, "%{$search}%"));
                    })
                    ->orWhereHas('port', fn ($portQuery) => $portQuery->where('name', $like, "%{$search}%"))
                    ->orWhereHas('requests', function ($requestQuery) use ($search, $like) {
                        $requestQuery->where('request_number', $like, "%{$search}%")
                            ->orWhere('notes', $like, "%{$search}%")
                            ->orWhereHas('items', fn ($itemQuery) => $itemQuery->where('item_name', $like, "%{$search}%"));
                    });
            });
        }

        $portCalls = $portCallsQuery->orderByDesc('created_at')->get();

        $countRows = function (?array $included = null, ?array $excluded = null): int {
            $portCallQuery = PortCall::query();
            $orphanRequestQuery = ShipRequest::query()->whereNull('port_call_id');

            if ($included) {
                $portCallQuery->whereHas('requests', fn ($query) => $query->whereIn('status', $included));
                $orphanRequestQuery->whereIn('status', $included);
            } elseif ($excluded) {
                $portCallQuery->whereHas('requests', fn ($query) => $query->whereNotIn('status', $excluded));
                $orphanRequestQuery->whereNotIn('status', $excluded);
            }

            return $portCallQuery->count() + $orphanRequestQuery->count();
        };

        $semuaCount = $countRows();
        $menungguCount = $countRows(['Menunggu Approval', 'Menunggu', 'pending']);
        $diprosesCount = $countRows(['Dalam Proses', 'Diproses', 'Disetujui', 'Disetujui Sebagian']);
        $selesaiCount = $countRows(['Selesai', 'Dibatalkan']);
        $activeCount = $countRows(null, ['Selesai', 'Dibatalkan']);
        $historyCount = $selesaiCount;

        $ships = Ship::query()->where('is_active', true)->with('company')->orderBy('name')->get();
        $companies = ShipCompany::query()->where('is_active', true)->orderBy('name')->get();
        $ports = Port::query()->where('is_active', true)->orderBy('name')->get();
        $products = Product::query()->where('is_active', true)->with('vendor')->orderBy('name')->get();
        $vendors = Vendor::query()->where('is_active', true)->orderBy('name')->get();

        $canReviewPrices = $request->user()?->isOperationalAdmin() ?? false;
        $canDecideItems = $request->user()?->isDirector() ?? false;
        $canViewHpp = $canReviewPrices || $canDecideItems || ($request->user()?->isOwner() ?? false);

        if (! $canViewHpp) {
            $requests->each(function ($req) {
                $req->items->each->makeHidden('hpp_price');
            });
            $products->each->makeHidden('hpp_default');
        }

        return Inertia::render('Requests/Index', [
            'requests' => $requests,
            'portCalls' => $portCalls,
            'ships' => $ships,
            'companies' => $companies,
            'ports' => $ports,
            'products' => $products,
            'vendors' => $vendors,
            'capabilities' => [
                'can_review_prices' => $canReviewPrices,
                'can_decide_items' => $canDecideItems,
                'can_view_hpp' => $canViewHpp,
                'can_create_requests' => $request->user()?->can('create', ShipRequest::class) ?? false,
                'can_process_requests' => $request->user()?->isOperationalAdmin() ?? false,
            ],
            'counts' => [
                'semua' => $semuaCount,
                'menunggu' => $menungguCount,
                'diproses' => $diprosesCount,
                'selesai' => $selesaiCount,
                'aktif' => $activeCount,
                'riwayat' => $historyCount,
            ],
            'activeTab' => $tab,
            'search' => $search ?? '',
        ]);
    }

    public function show(Request $request, string $id): Response
    {
        $isUuid = Str::isUuid($id);

        // 1. Try finding PortCall (Job) by ID or job_number
        $portCallQuery = PortCall::with([
            'ship.company',
            'port',
            'workOrder',
            'requests.ship.company',
            'requests.company',
            'requests.port',
            'requests.creator',
            'requests.invoices',
            'requests.items.product.vendor',
            'requests.items.vendor',
        ]);

        $portCall = $isUuid
            ? $portCallQuery->where('id', $id)->first()
            : $portCallQuery->where('job_number', $id)->first();

        $shipRequest = null;

        if ($portCall) {
            $reqQuery = $request->query('req');
            if ($reqQuery) {
                $shipRequest = $portCall->requests->first(function ($r) use ($reqQuery) {
                    return $r->id === $reqQuery || $r->request_number === $reqQuery;
                }) ?? $portCall->requests->first();
            } else {
                $shipRequest = $portCall->requests->first();
            }
        } else {
            // 2. Try finding ShipRequest by ID or request_number
            $shipRequestQuery = ShipRequest::with([
                'ship.company',
                'company',
                'port',
                'portCall.port',
                'portCall.workOrder',
                'portCall.ship.company',
                'portCall.requests.creator',
                'portCall.requests.invoices',
                'portCall.requests.items.product.vendor',
                'portCall.requests.items.vendor',
                'creator',
                'invoices',
                'items.product.vendor',
                'items.vendor',
            ]);

            $shipRequest = $isUuid
                ? $shipRequestQuery->where('id', $id)->firstOrFail()
                : $shipRequestQuery->where('request_number', $id)->firstOrFail();

            $portCall = $shipRequest->portCall;
        }

        $allRequests = $portCall ? $portCall->requests : ($shipRequest ? collect([$shipRequest]) : collect());

        $products = Product::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get([
                'id',
                'code',
                'name',
                'unit',
                'item_type',
                'selling_price_default',
                'hpp_default',
            ]);

        $canReviewPrices = $request->user()?->isOperationalAdmin() ?? false;
        $canDecideItems = $request->user()?->isDirector() ?? false;
        $canViewHpp = $canReviewPrices || $canDecideItems || ($request->user()?->isOwner() ?? false);

        if (! $canViewHpp) {
            if ($shipRequest) {
                $shipRequest->items->each->makeHidden('hpp_price');
            }
            foreach ($allRequests as $req) {
                $req->items->each->makeHidden('hpp_price');
            }
            $products->each->makeHidden('hpp_default');
        }

        return Inertia::render('Requests/Show', [
            'job' => $portCall,
            'requests' => $allRequests,
            'request' => $shipRequest ?? $allRequests->first(),
            'products' => $products,
            'capabilities' => [
                'can_review_prices' => $canReviewPrices,
                'can_decide_items' => $canDecideItems,
                'can_view_hpp' => $canViewHpp,
                'can_create_requests' => $request->user()?->can('create', ShipRequest::class) ?? false,
                'can_process_requests' => $request->user()?->isOperationalAdmin() ?? false,
            ],
        ]);
    }

    /**
     * Show 3-Step Wizard for Lapangan (Pak Prima)
     */
    public function create(Request $request): Response
    {
        Gate::authorize('create', ShipRequest::class);

        $companies = ShipCompany::where('is_active', true)->orderBy('name')->get();
        $ships = Ship::where('is_active', true)->with('company')->orderBy('name')->get();
        $portCalls = PortCall::query()
            ->whereHas('ship', fn ($query) => $query->where('is_active', true))
            ->whereIn('status', ['scheduled', 'anchored', 'berthed'])
            ->with([
                'ship.company',
                'port',
                'workOrder',
                'clearanceInRequests:id,port_call_id',
            ])
            ->orderByDesc('eta_at')
            ->orderByDesc('created_at')
            ->get()
            ->each(function (PortCall $portCall): void {
                $portCall->setAttribute('clearance_in_block_reason', $portCall->clearanceInBlockReason());
                $portCall->setAttribute('can_clearance_out', in_array($portCall->status, ['anchored', 'berthed'], true));
                $portCall->unsetRelation('clearanceInRequests');
            });
        $ports = Port::where('is_active', true)->orderBy('name')->get();
        $serviceTypes = ServiceType::where('is_active', true)->orderByDesc('is_default')->orderBy('name')->get();
        $products = Product::where('is_active', true)->with(['vendor', 'portPrices'])->orderBy('item_type')->orderBy('name')->get();

        return Inertia::render('Requests/Create', [
            'companies' => $companies,
            'ships' => $ships,
            'portCalls' => $portCalls,
            'ports' => $ports,
            'serviceTypes' => $serviceTypes,
            'products' => $products,
        ]);
    }

    /**
     * Store 3-Step Wizard submission with multi NeedItems
     */
    public function storeWizard(Request $request): RedirectResponse
    {
        Gate::authorize('create', ShipRequest::class);

        $validated = $request->validate([
            // Wizard 1: Perusahaan, Kapal, Type, Pelabuhan
            'company_id' => ['nullable', 'uuid', 'exists:ship_companies,id'],
            'is_new_company' => ['nullable', 'boolean'],
            'new_company_name' => ['nullable', 'required_if:is_new_company,true', 'string', 'max:255'],
            'ship_id' => ['nullable', 'uuid', 'exists:ships,id'],
            'port_call_id' => ['nullable', 'uuid', 'exists:port_calls,id'],
            'is_new_ship' => ['nullable', 'boolean'],
            'new_ship_name' => ['nullable', 'required_if:is_new_ship,true', 'string', 'max:255'],
            'new_ship_imo' => ['nullable', 'string', 'max:50'],
            'service_type' => ['required', 'string'], // 'Sandar' | 'Labuh'
            'port_id' => ['required', 'uuid', 'exists:ports,id'],

            // Wizard 2: NeedItems multiple
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.1'],
            'items.*.unit' => ['required', 'string', 'max:50'],
            'items.*.required_date' => ['nullable', 'date'],
            'items.*.required_time' => ['nullable', 'string'],
            'items.*.notes' => ['nullable', 'string', 'max:1000'],
            'items.*.is_urgent' => ['nullable', 'boolean'],

            // General notes
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($validated, $request) {
            // 1. Resolve Company
            $companyId = $validated['company_id'] ?? null;
            if (! empty($validated['is_new_company']) && ! empty($validated['new_company_name'])) {
                $code = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $validated['new_company_name']), 0, 3));
                $newComp = ShipCompany::create([
                    'name' => trim($validated['new_company_name']),
                    'code' => $code,
                    'is_active' => true,
                ]);
                $companyId = $newComp->id;
            }

            // 2. Resolve Ship
            $shipId = $validated['ship_id'] ?? null;
            if (! empty($validated['is_new_ship']) && ! empty($validated['new_ship_name'])) {
                $newShip = Ship::create([
                    'name' => trim($validated['new_ship_name']),
                    'imo_number' => $validated['new_ship_imo'] ?? null,
                    'ship_type' => null,
                    'status' => $validated['service_type'] === 'Labuh' ? 'Labuh' : 'Akan Datang',
                    'ship_company_id' => $companyId,
                    'is_active' => true,
                ]);
                $shipId = $newShip->id;
            }

            if (! $shipId) {
                return redirect()->back()->with('error', 'Silakan pilih atau tambahkan data kapal.');
            }

            // If company is not selected, get it from ship
            if (! $companyId) {
                $ship = Ship::find($shipId);
                $companyId = $ship?->ship_company_id;
            }

            // 3. Generate Request Number
            $lastReq = ShipRequest::orderByDesc('created_at')->first();
            $nextNum = 250;
            if ($lastReq && preg_match('/REQ-(\d+)/', $lastReq->request_number, $matches)) {
                $nextNum = (int) $matches[1] + 1;
            }
            $reqNumber = sprintf('REQ-%05d', $nextNum);

            // 4. Create ShipRequest
            $portCall = ! empty($validated['port_call_id'])
                ? PortCall::whereKey($validated['port_call_id'])->where('ship_id', $shipId)->first()
                : PortCall::where('ship_id', $shipId)->latest()->first();

            if (! empty($validated['port_call_id']) && ! $portCall) {
                throw ValidationException::withMessages([
                    'port_call_id' => 'Kunjungan / job tidak sesuai dengan kapal yang dipilih.',
                ]);
            }
            $newRequest = ShipRequest::create([
                'request_number' => $reqNumber,
                'ship_id' => $shipId,
                'company_id' => $companyId,
                'port_id' => $validated['port_id'],
                'port_call_id' => $portCall?->id,
                'service_type' => $validated['service_type'],
                'created_by' => $request->user()->id,
                'status' => 'Menunggu Approval',
                'request_date' => now()->toDateString(),
                'notes' => $validated['notes'] ?? null,
            ]);

            // 5. Create RequestItems
            foreach ($validated['items'] as $item) {
                $productId = $item['product_id'] ?? null;
                $hppPrice = 0.00;
                $sellingPrice = 0.00;
                $vendorId = null;
                $itemType = 'non_jasa';

                if ($productId) {
                    $prod = Product::find($productId);
                    if ($prod) {
                        $itemType = $prod->item_type;
                        $hppPrice = (float) $prod->hpp_default;
                        $vendorId = $prod->vendor_id;

                        // Check port price matrix
                        $portPrice = ProductPortPrice::where('product_id', $productId)
                            ->where('port_id', $validated['port_id'])
                            ->where('service_type', $validated['service_type'])
                            ->first();

                        if ($portPrice && $portPrice->selling_price > 0) {
                            $sellingPrice = (float) $portPrice->selling_price;
                        } elseif ($validated['service_type'] === 'Labuh' && $prod->price_labuh > 0) {
                            $sellingPrice = (float) $prod->price_labuh;
                        } elseif ($prod->price_sandar > 0) {
                            $sellingPrice = (float) $prod->price_sandar;
                        } else {
                            $sellingPrice = (float) $prod->selling_price_default;
                        }
                    }
                }

                RequestItem::create([
                    'request_id' => $newRequest->id,
                    'product_id' => $productId,
                    'vendor_id' => $vendorId,
                    'item_type' => $itemType,
                    'item_name' => $item['item_name'],
                    'unit' => $item['unit'],
                    'quantity' => $item['quantity'],
                    'required_date' => $item['required_date'] ?? now()->toDateString(),
                    'required_time' => $item['required_time'] ?? null,
                    'hpp_price' => $hppPrice,
                    'selling_price' => $sellingPrice,
                    'status' => 'pending',
                    'director_status' => 'pending',
                    'is_urgent' => ! empty($item['is_urgent']),
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            if (function_exists('activity')) {
                activity('request')
                    ->performedOn($newRequest)
                    ->causedBy($request->user())
                    ->log("Operasional mengajukan form kebutuhan {$reqNumber} (".count($validated['items']).' item)');
            }

            try {
                event(new ShipRequestSubmitted($newRequest));
            } catch (\Throwable) {
                // broadcast driver fallback
            }

            return redirect()->route('requests.index')->with('success', "Pengajuan {$reqNumber} berhasil diajukan.");
        });
    }

    /**
     * Store Multi-Kapal Submission (Alur Pengajuan Multi Kapal)
     */
    public function storeMulti(Request $request): RedirectResponse
    {
        Gate::authorize('create', ShipRequest::class);

        $validated = $request->validate([
            'ships' => ['required', 'array', 'min:1'],
            'ships.*.ship_id' => ['required', 'uuid', 'exists:ships,id'],
            'ships.*.port_call_id' => ['required', 'uuid', 'distinct', 'exists:port_calls,id'],
            'ships.*.request_type' => [
                'required',
                'string',
                Rule::in([
                    'Kedatangan (Clearance In)',
                    'Perpanjangan Surat / Endors Surat Laut',
                    'Keberangkatan (Clearance Out)',
                    'Kebutuhan Kapal',
                ]),
            ],
            'ships.*.department' => ['nullable', 'string'],
            'ships.*.order_date' => ['nullable', 'date'],
            'ships.*.requester_name' => ['nullable', 'string', 'max:255'],
            'ships.*.requester_phone' => ['nullable', 'string', 'max:50'],
            'ships.*.required_date' => ['nullable', 'date'],
            'ships.*.required_time' => ['nullable', 'string'],
            'ships.*.requested_port_call_status' => ['nullable', 'string', 'in:anchored,berthed,departed'],
            'ships.*.operational_occurred_at' => ['nullable', 'date', 'before_or_equal:today'],
            'ships.*.notes' => ['nullable', 'string', 'max:1000'],
            'ships.*.items' => ['nullable', 'array'],
            'ships.*.items.*.product_id' => ['nullable', 'uuid'],
            'ships.*.items.*.item_type' => ['nullable', 'string'],
            'ships.*.items.*.item_name' => ['required_with:ships.*.items', 'string', 'max:255'],
            'ships.*.items.*.quantity' => ['required_with:ships.*.items', 'numeric', 'min:0.1'],
            'ships.*.items.*.unit' => ['required_with:ships.*.items', 'string', 'max:50'],
            'ships.*.items.*.required_date' => ['nullable', 'date'],
            'ships.*.items.*.required_time' => ['nullable', 'string'],
            'ships.*.items.*.is_urgent' => ['nullable', 'boolean'],
            'ships.*.items.*.notes' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $year = now()->format('Y');
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $lastReq = ShipRequest::where('request_number', $like, "PGJ-{$year}-%")->orderByDesc('created_at')->first();
            $nextNum = 15;
            if ($lastReq && preg_match('/PGJ-\d{4}-(\d+)/i', $lastReq->request_number, $matches)) {
                $nextNum = (int) $matches[1] + 1;
            }
            $batchCode = sprintf('PGJ-%s-%04d', $year, $nextNum);

            $createdRequests = [];

            foreach ($validated['ships'] as $shipIndex => $shipData) {
                $portCall = PortCall::query()
                    ->with([
                        'ship.company',
                        'port',
                        'clearanceInRequests:id,port_call_id',
                    ])
                    ->lockForUpdate()
                    ->whereKey($shipData['port_call_id'])
                    ->where('ship_id', $shipData['ship_id'])
                    ->first();

                if (! $portCall) {
                    throw ValidationException::withMessages([
                        "ships.{$shipIndex}.port_call_id" => 'Kunjungan / job tidak sesuai dengan kapal yang dipilih.',
                    ]);
                }

                $ship = $portCall->ship;
                $requestType = $shipData['request_type'];
                $requestTypeLower = strtolower($requestType);
                $isClearanceIn = str_contains($requestTypeLower, 'clearance in') || str_contains($requestTypeLower, 'kedatangan');
                $isClearanceOut = str_contains($requestTypeLower, 'clearance out') || str_contains($requestTypeLower, 'keberangkatan');

                if ($isClearanceIn && ($blockReason = $portCall->clearanceInBlockReason())) {
                    throw ValidationException::withMessages([
                        "ships.{$shipIndex}.request_type" => $blockReason,
                    ]);
                }

                if ($isClearanceOut && ! in_array($portCall->status, ['anchored', 'berthed'], true)) {
                    throw ValidationException::withMessages([
                        "ships.{$shipIndex}.request_type" => 'Clearance Out hanya dapat diajukan ketika kapal berstatus Labuh atau Sandar.',
                    ]);
                }

                if (($isClearanceIn || $isClearanceOut) && empty($shipData['operational_occurred_at'])) {
                    throw ValidationException::withMessages([
                        "ships.{$shipIndex}.operational_occurred_at" => $isClearanceIn
                            ? 'Tanggal kedatangan aktual wajib diisi.'
                            : 'Tanggal keberangkatan aktual wajib diisi.',
                    ]);
                }

                if ($isClearanceIn && ! in_array($shipData['requested_port_call_status'] ?? null, ['anchored', 'berthed'], true)) {
                    throw ValidationException::withMessages([
                        "ships.{$shipIndex}.requested_port_call_status" => 'Pilih target status Labuh atau Sandar.',
                    ]);
                }

                if ($isClearanceOut) {
                    $hasActiveClearanceOut = ShipRequest::query()
                        ->where('port_call_id', $portCall->id)
                        ->whereIn('service_type', ['clearance_out', 'Keberangkatan (Clearance Out)'])
                        ->whereNotIn('status', ['Ditolak', 'Dibatalkan'])
                        ->exists();

                    if ($hasActiveClearanceOut) {
                        throw ValidationException::withMessages([
                            "ships.{$shipIndex}.request_type" => 'Pengajuan Clearance Out untuk kunjungan ini sudah ada dan masih diproses.',
                        ]);
                    }
                }

                $requestedPortCallStatus = $isClearanceIn
                    ? $shipData['requested_port_call_status']
                    : ($isClearanceOut ? 'departed' : null);
                $operationalOccurredAt = ($isClearanceIn || $isClearanceOut)
                    ? Carbon::parse($shipData['operational_occurred_at'], config('app.timezone'))->startOfDay()
                    : null;

                // In multi-ship submissions, all ships share the same PGJ batch number
                // while maintaining their own individual request record per vessel
                $reqNumber = $batchCode;

                $serviceType = 'Sandar';
                if ($isClearanceIn) {
                    $serviceType = 'clearance_in';
                } elseif ($isClearanceOut) {
                    $serviceType = 'clearance_out';
                } elseif (str_contains($requestTypeLower, 'perpanjangan') || str_contains($requestTypeLower, 'endors')) {
                    $serviceType = 'Perpanjangan Surat / Endors Surat Laut';
                } elseif (str_contains($requestTypeLower, 'kebutuhan')) {
                    $serviceType = 'Kebutuhan Kapal';
                }

                $notesPrefix = "Pengajuan {$shipData['request_type']}";
                if (! empty($shipData['department'])) {
                    $notesPrefix .= " (Bagian: {$shipData['department']})";
                }
                if (! empty($shipData['requester_name'])) {
                    $notesPrefix .= " Pemesan: {$shipData['requester_name']}";
                }
                $combinedNotes = trim($notesPrefix.(! empty($validated['notes']) ? ' — Catatan Bu Titik: '.$validated['notes'] : ''));

                $newRequest = ShipRequest::create([
                    'request_number' => $reqNumber,
                    'batch_number' => $batchCode,
                    'ship_id' => $ship->id,
                    'company_id' => $ship->ship_company_id,
                    'port_id' => $portCall->port_id,
                    'port_call_id' => $portCall->id,
                    'service_type' => $serviceType,
                    'requested_port_call_status' => $requestedPortCallStatus,
                    'operational_occurred_at' => $operationalOccurredAt,
                    'created_by' => $request->user()->id,
                    'status' => 'Menunggu Approval',
                    'request_date' => $shipData['required_date'] ?? now()->toDateString(),
                    'notes' => $combinedNotes,
                ]);

                // Create items if provided
                if (! empty($shipData['items']) && is_array($shipData['items'])) {
                    foreach ($shipData['items'] as $item) {
                        $productId = $item['product_id'] ?? null;
                        $hppPrice = 0.00;
                        $sellingPrice = 0.00;
                        $vendorId = null;
                        $itemType = $item['item_type'] ?? 'non_jasa';

                        if ($productId) {
                            $prod = Product::find($productId);
                            if ($prod) {
                                $itemType = $prod->item_type ?? 'non_jasa';
                                $hppPrice = (float) $prod->hpp_default;
                                $vendorId = $prod->vendor_id;
                                $sellingPrice = (float) $prod->selling_price_default;
                            }
                        }

                        RequestItem::create([
                            'request_id' => $newRequest->id,
                            'product_id' => $productId,
                            'vendor_id' => $vendorId,
                            'item_type' => $itemType,
                            'item_name' => $item['item_name'],
                            'quantity' => $item['quantity'],
                            'unit' => $item['unit'] ?? 'Unit',
                            'required_date' => $item['required_date'] ?? ($shipData['required_date'] ?? now()->toDateString()),
                            'required_time' => $item['required_time'] ?? ($shipData['required_time'] ?? null),
                            'hpp_price' => $hppPrice,
                            'selling_price' => $sellingPrice,
                            'status' => 'pending',
                            'director_status' => 'pending',
                            'is_urgent' => ! empty($item['is_urgent']),
                            'notes' => $item['notes'] ?? null,
                        ]);
                    }
                } else {
                    // Create primary service item
                    RequestItem::create([
                        'request_id' => $newRequest->id,
                        'item_type' => 'jasa',
                        'item_name' => $shipData['request_type'],
                        'quantity' => 1,
                        'unit' => 'Paket',
                        'required_date' => $shipData['required_date'] ?? now()->toDateString(),
                        'required_time' => $shipData['required_time'] ?? null,
                        'hpp_price' => 0.00,
                        'selling_price' => 0.00,
                        'status' => 'pending',
                        'director_status' => 'pending',
                        'is_urgent' => false,
                        'notes' => "Layanan {$shipData['request_type']} armada {$ship->name}",
                    ]);
                }

                $createdRequests[] = $newRequest;

                try {
                    event(new ShipRequestSubmitted($newRequest));
                } catch (\Throwable) {
                }
            }

            if (function_exists('activity')) {
                activity('request')
                    ->causedBy($request->user())
                    ->log("Staf lapangan mengajukan pengajuan multi kapal {$batchCode} (".count($createdRequests).' kapal)');
            }

            return redirect()->route('requests.index')->with([
                'success' => "Pengajuan {$batchCode} (".count($createdRequests).' Kapal) berhasil diajukan ke Bu Titik.',
                'submitted_request_number' => $batchCode,
                'submitted_request_id' => $createdRequests[0]->id ?? null,
            ]);
        });
    }

    /**
     * Backward-compatible simple store
     */
    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', ShipRequest::class);

        $validated = $request->validate([
            'ship_id' => ['required', 'exists:ships,id'],
            'need_type' => ['required', 'string'],
            'quantity' => ['required', 'numeric', 'min:1'],
            'unit' => ['required', 'string'],
            'required_at' => ['required', 'string'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $lastReq = ShipRequest::orderByDesc('created_at')->first();
        $nextNum = 246;
        if ($lastReq && preg_match('/REQ-(\d+)/', $lastReq->request_number, $matches)) {
            $nextNum = (int) $matches[1] + 1;
        }
        $reqNumber = sprintf('REQ-%05d', $nextNum);

        $newRequest = ShipRequest::create([
            'request_number' => $reqNumber,
            'ship_id' => $validated['ship_id'],
            'created_by' => $request->user()->id,
            'status' => 'Menunggu Approval',
            'request_date' => now()->toDateString(),
            'notes' => "{$validated['need_type']} {$validated['quantity']} {$validated['unit']} - Dibutuhkan: {$validated['required_at']}. Catatan: ".($validated['notes'] ?? '-'),
        ]);

        // Create initial request item
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
        $product = Product::where('name', $like, "%{$validated['need_type']}%")->first();
        RequestItem::create([
            'request_id' => $newRequest->id,
            'product_id' => $product?->id,
            'item_type' => $product?->item_type ?? 'non_jasa',
            'item_name' => $validated['need_type'],
            'unit' => $validated['unit'],
            'quantity' => $validated['quantity'],
            'required_date' => now()->toDateString(),
            'hpp_price' => $product?->hpp_default ?? 0,
            'selling_price' => $product?->selling_price_default ?? 0,
            'status' => 'pending',
            'director_status' => 'pending',
        ]);

        try {
            event(new ShipRequestSubmitted($newRequest));
        } catch (\Throwable) {
        }

        return redirect()->route('requests.detail', $newRequest)
            ->with('success', "Pengajuan {$reqNumber} berhasil diajukan dan sedang menunggu review.");
    }

    /**
     * Admin filters items, adjusts prices/vendor, and forwards selected items to Direktur.
     */
    public function forwardToDirector(Request $request, string $id): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'selected_items' => ['required', 'array', 'min:1'],
            'selected_items.*' => ['uuid', 'exists:request_items,id'],
            'item_prices' => ['nullable', 'array'],
            'item_prices.*.id' => ['required_with:item_prices', 'uuid', 'exists:request_items,id'],
            'item_prices.*.hpp_price' => ['nullable', 'numeric', 'min:0'],
            'item_prices.*.selling_price' => ['nullable', 'numeric', 'min:0'],
            'item_prices.*.vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($id, $validated, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);

            if (in_array($shipRequest->status, ['Dalam Proses', 'Selesai', 'Dibatalkan'], true)) {
                throw ValidationException::withMessages([
                    'selected_items' => "Pengajuan berstatus {$shipRequest->status} tidak dapat dikirim ulang ke Direktur.",
                ]);
            }

            $itemsById = $shipRequest->items->keyBy('id');
            $selectedItemIds = collect($validated['selected_items'])->unique()->values();

            if ($selectedItemIds->contains(fn (string $itemId): bool => ! $itemsById->has($itemId))) {
                throw ValidationException::withMessages([
                    'selected_items' => 'Terdapat item yang bukan bagian dari pengajuan ini.',
                ]);
            }

            $submittedPrices = collect($validated['item_prices'] ?? [])->keyBy('id');

            foreach ($selectedItemIds as $itemId) {
                /** @var RequestItem $item */
                $item = $itemsById->get($itemId);

                if ($item->isLocked()) {
                    throw ValidationException::withMessages([
                        'selected_items' => "Harga {$item->item_name} sudah dikunci oleh approval Direktur. Ajukan revisi terlebih dahulu.",
                    ]);
                }

                $price = $submittedPrices->get($itemId, []);
                $newHpp = isset($price['hpp_price']) && is_numeric($price['hpp_price'])
                    ? (float) $price['hpp_price']
                    : (float) $item->hpp_price;
                $newSelling = isset($price['selling_price']) && is_numeric($price['selling_price'])
                    ? (float) $price['selling_price']
                    : (float) $item->selling_price;

                if ($newHpp <= 0 || $newSelling <= 0) {
                    throw ValidationException::withMessages([
                        'selected_items' => "Item '{$item->item_name}' belum memiliki HPP atau Harga Jual yang valid (> Rp 0). Harap lengkapi harga terlebih dahulu sebelum diajukan ke Direktur.",
                    ]);
                }

                $oldPrices = [
                    'hpp_price' => (float) $item->hpp_price,
                    'selling_price' => (float) $item->selling_price,
                ];

                $item->update([
                    'hpp_price' => $newHpp,
                    'selling_price' => $newSelling,
                    'vendor_id' => $price['vendor_id'] ?? $item->vendor_id,
                    'status' => 'diajukan_ke_direktur',
                    'director_status' => 'pending',
                    'director_notes' => null,
                ]);

                activity('request-item-pricing')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'action' => 'submitted_to_director',
                        'old' => $oldPrices,
                        'new' => [
                            'hpp_price' => (float) $item->hpp_price,
                            'selling_price' => (float) $item->selling_price,
                        ],
                    ])
                    ->log('Harga item dikirim Admin kepada Direktur');
            }

            $shipRequest->items
                ->whereNotIn('id', $selectedItemIds)
                ->filter(fn (RequestItem $item): bool => ! $item->isLocked() && $item->director_status !== 'rejected' && $item->status !== 'diajukan_ke_direktur')
                ->each(fn (RequestItem $item) => $item->update([
                    'status' => 'pending',
                    'director_status' => 'pending',
                ]));

            $shipRequest->update([
                'status' => 'Menunggu Approval Direktur',
                'forwarded_to_director_at' => now(),
                'notes' => ! empty($validated['admin_notes'])
                    ? $shipRequest->notes."\n[Catatan Admin: {$validated['admin_notes']}]"
                    : $shipRequest->notes,
            ]);

            if (function_exists('activity')) {
                activity('request')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log('Admin memfilter '.count($validated['selected_items'])." item dan mengajukan {$shipRequest->request_number}");
            }

            return redirect()->back()->with('success', "Pengajuan {$shipRequest->request_number} (".count($validated['selected_items']).' item terpilih) berhasil diajukan.');
        });
    }

    public function requestItemRevision(Request $request, string $requestId, string $itemId): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($request, $requestId, $itemId, $validated): RedirectResponse {
            $shipRequest = ShipRequest::lockForUpdate()->findOrFail($requestId);
            $item = RequestItem::lockForUpdate()
                ->where('request_id', $shipRequest->id)
                ->findOrFail($itemId);

            if (! $item->isLocked()) {
                throw ValidationException::withMessages([
                    'reason' => 'Revisi hanya diperlukan untuk item yang sudah disetujui Direktur.',
                ]);
            }

            if ($item->is_invoiced) {
                throw ValidationException::withMessages([
                    'reason' => 'Item sudah masuk invoice. Lakukan koreksi invoice terlebih dahulu sebelum revisi harga.',
                ]);
            }

            activity('request-item-pricing')
                ->performedOn($item)
                ->causedBy($request->user())
                ->withProperties([
                    'request_id' => $shipRequest->id,
                    'action' => 'revision_requested',
                    'approved_snapshot' => [
                        'hpp_price' => (float) $item->hpp_price,
                        'selling_price' => (float) $item->selling_price,
                    ],
                    'reason' => $validated['reason'],
                ])
                ->log('Admin membuka revisi harga yang telah disetujui');

            $item->update([
                'status' => 'pending',
                'director_status' => 'pending',
                'director_notes' => "Revisi Admin: {$validated['reason']}",
            ]);

            $hasOtherApprovedItems = $shipRequest->items()
                ->where('id', '!=', $item->id)
                ->where('director_status', 'approved')
                ->exists();

            $shipRequest->update([
                'status' => $hasOtherApprovedItems ? 'Disetujui Sebagian' : 'Menunggu Approval',
                'director_reviewed_at' => null,
            ]);

            return redirect()->back()->with('success', "Revisi harga {$item->item_name} dibuka. Perbarui harga lalu kirim kembali ke Direktur.");
        });
    }

    /**
     * Shortcut for Clearance In Pelindo kedatangan invoice before ship arrival
     */
    public function createClearanceInInvoice(Request $request, string $id): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        return DB::transaction(function () use ($id) {
            $shipRequest = ShipRequest::with(['ship.company', 'items'])->lockForUpdate()->findOrFail($id);

            $companyId = $shipRequest->company_id ?? $shipRequest->ship?->ship_company_id;
            if (! $companyId) {
                return redirect()->back()->with('error', 'Data perusahaan pelayaran tidak ditemukan.');
            }

            // Find or calculate Clearance In Pelindo cost
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $clearanceItem = $shipRequest->items()
                ->where('director_status', 'approved')
                ->where('is_invoiced', false)
                ->where(function ($q) use ($like) {
                    $q->where('item_name', $like, '%Clearance In%')
                        ->orWhere('item_name', $like, '%Pelindo Kedatangan%');
                })
                ->whereDoesntHave('invoiceItem')
                ->lockForUpdate()
                ->first();

            if (! $clearanceItem) {
                return redirect()->back()->with('error', 'Invoice Clearance In hanya dapat dibuat dari item yang telah disetujui Direktur.');
            }

            $amount = $clearanceItem ? (float) $clearanceItem->selling_price : 18500000.00;

            $invCount = Invoice::where('invoice_type', 'reimburse')->count() + 1;
            $invNumber = sprintf('INV-CLR-IN-26-%04d', $invCount);

            $invoice = Invoice::create([
                'invoice_number' => $invNumber,
                'port_call_id' => $shipRequest->port_call_id,
                'company_id' => $companyId,
                'request_id' => $shipRequest->id,
                'invoice_type' => 'reimburse',
                'invoice_date' => now()->toDateString(),
                'due_date' => now()->addDays(3)->toDateString(),
                'subtotal' => $amount,
                'addon_total' => 0,
                'discount' => 0,
                'tax' => 0,
                'grand_total' => $amount,
                'paid_amount' => 0,
                'outstanding_amount' => $amount,
                'currency' => 'IDR',
                'status' => 'draft',
                'delivery_status' => 'pending',
                'notes' => 'Invoice Awal: Pembayaran Pelindo Kedatangan (Clearance In) wajib lunas sebelum kapal tiba di pelabuhan.',
                'version' => 1,
            ]);

            if ($clearanceItem) {
                $invoice->items()->create([
                    'request_item_id' => $clearanceItem->id,
                    'description' => $clearanceItem->item_name,
                    'quantity' => $clearanceItem->quantity,
                    'unit' => $clearanceItem->unit ?: 'Paket',
                    'unit_price' => $clearanceItem->selling_price,
                    'subtotal' => $amount,
                ]);
                $clearanceItem->update(['is_invoiced' => true]);
            }

            return redirect()->route('invoices.index')->with('success', "Invoice awal Pelindo kedatangan {$invNumber} sebesar Rp ".number_format($amount, 0, ',', '.').' berhasil dibuat.');
        });
    }

    /**
     * Automatic Dual-Invoice Splitting (Invoice Jasa & Invoice Reimburse)
     */
    public function splitInvoices(Request $request, string $id): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        return DB::transaction(function () use ($id) {
            $shipRequest = ShipRequest::with(['ship.company', 'items.product'])->lockForUpdate()->findOrFail($id);

            $companyId = $shipRequest->company_id ?? $shipRequest->ship?->ship_company_id;
            if (! $companyId) {
                return redirect()->back()->with('error', 'Data perusahaan pelayaran tidak ditemukan.');
            }

            $approvedItems = $shipRequest->items()
                ->where('director_status', 'approved')
                ->where('is_invoiced', false)
                ->whereDoesntHave('invoiceItem')
                ->lockForUpdate()
                ->get();

            if ($approvedItems->isEmpty()) {
                return redirect()->back()->with('error', 'Tidak ada item yang telah disetujui Direktur dan belum ditagihkan.');
            }

            $jasaItems = $approvedItems->filter(fn ($it) => $it->isJasa());
            $nonJasaItems = $approvedItems->filter(fn ($it) => ! $it->isJasa());

            $createdInvoices = [];

            // 1. Create Invoice Keagenan / Jasa (with PPh 23 deduction / materai)
            if ($jasaItems->isNotEmpty()) {
                $subtotalJasa = $jasaItems->sum(fn ($it) => (float) $it->selling_price * (float) $it->quantity);
                $taxJasa = $subtotalJasa * 0.02; // PPh 23 2%
                $materai = 10000.00;
                $grandTotalJasa = $subtotalJasa + $materai;

                $count = Invoice::where('invoice_type', 'agency')->count() + 1;
                $invNumberJasa = sprintf('INV-AGY-26-%04d', $count);

                $invJasa = Invoice::create([
                    'invoice_number' => $invNumberJasa,
                    'port_call_id' => $shipRequest->port_call_id,
                    'company_id' => $companyId,
                    'request_id' => $shipRequest->id,
                    'invoice_type' => 'agency',
                    'invoice_date' => now()->toDateString(),
                    'due_date' => now()->addDays(14)->toDateString(),
                    'subtotal' => $subtotalJasa,
                    'addon_total' => $materai,
                    'discount' => 0,
                    'tax' => $taxJasa,
                    'grand_total' => $grandTotalJasa,
                    'paid_amount' => 0,
                    'outstanding_amount' => $grandTotalJasa,
                    'currency' => 'IDR',
                    'status' => 'draft',
                    'delivery_status' => 'pending',
                    'notes' => 'Invoice Keagenan & Jasa Kapal (Termasuk PPh 23 dan Bea Meterai)',
                    'version' => 1,
                ]);

                foreach ($jasaItems as $ji) {
                    $invJasa->items()->create([
                        'request_item_id' => $ji->id,
                        'description' => $ji->item_name,
                        'quantity' => $ji->quantity,
                        'unit' => $ji->unit ?: 'Paket',
                        'unit_price' => $ji->selling_price,
                        'subtotal' => (float) $ji->selling_price * (float) $ji->quantity,
                    ]);
                    $ji->update(['is_invoiced' => true]);
                }
                $createdInvoices[] = $invNumberJasa;
            }

            // 2. Create Invoice Reimburse / Non-Jasa
            if ($nonJasaItems->isNotEmpty()) {
                $subtotalNonJasa = $nonJasaItems->sum(fn ($it) => (float) $it->selling_price * (float) $it->quantity);
                $countRmb = Invoice::where('invoice_type', 'reimburse')->count() + 1;
                $invNumberRmb = sprintf('INV-RMB-26-%04d', $countRmb);

                $invRmb = Invoice::create([
                    'invoice_number' => $invNumberRmb,
                    'port_call_id' => $shipRequest->port_call_id,
                    'company_id' => $companyId,
                    'request_id' => $shipRequest->id,
                    'invoice_type' => 'reimburse',
                    'invoice_date' => now()->toDateString(),
                    'due_date' => now()->addDays(7)->toDateString(),
                    'subtotal' => $subtotalNonJasa,
                    'addon_total' => 0,
                    'discount' => 0,
                    'tax' => 0,
                    'grand_total' => $subtotalNonJasa,
                    'paid_amount' => 0,
                    'outstanding_amount' => $subtotalNonJasa,
                    'currency' => 'IDR',
                    'status' => 'draft',
                    'delivery_status' => 'pending',
                    'notes' => 'Invoice Reimbursement Operasional Kapal (Air Tawar, BBM, Pelindo, Mooring Boat)',
                    'version' => 1,
                ]);

                foreach ($nonJasaItems as $ni) {
                    $invRmb->items()->create([
                        'request_item_id' => $ni->id,
                        'description' => $ni->item_name,
                        'quantity' => $ni->quantity,
                        'unit' => $ni->unit ?: 'Paket',
                        'unit_price' => $ni->selling_price,
                        'subtotal' => (float) $ni->selling_price * (float) $ni->quantity,
                    ]);
                    $ni->update(['is_invoiced' => true]);
                }
                $createdInvoices[] = $invNumberRmb;
            }

            return redirect()->route('invoices.index')->with('success', 'Berhasil memecah invoice menjadi: '.implode(' dan ', $createdInvoices));
        });
    }

    /**
     * Lapangan / Admin adds an additional need item to an existing active request
     */
    public function addItem(Request $request, string $id): RedirectResponse
    {
        $shipRequest = ShipRequest::findOrFail($id);
        Gate::authorize('addItem', $shipRequest);

        $validated = $request->validate([
            'item_name' => ['required', 'string', 'max:255'],
            'product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit' => ['required', 'string', 'max:50'],
            'required_date' => ['nullable', 'date'],
            'required_time' => ['nullable', 'string', 'max:20'],
            'is_urgent' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($shipRequest, $validated, $request) {

            $productId = $validated['product_id'] ?? null;
            $hppPrice = 0.00;
            $sellingPrice = 0.00;
            $itemType = 'non_jasa';
            $vendorId = null;

            if ($productId) {
                $product = Product::find($productId);
                if ($product) {
                    $itemType = $product->item_type;
                    $vendorId = $product->vendor_id;
                    $sellingPrice = (float) $product->selling_price_default;
                    $hppPrice = (float) $product->hpp_default;

                    // Port price lookup if applicable
                    if ($shipRequest->port_id) {
                        $portPrice = ProductPortPrice::where('product_id', $product->id)
                            ->where('port_id', $shipRequest->port_id)
                            ->where('service_type', $shipRequest->service_type ?? 'Sandar')
                            ->first();

                        if ($portPrice && $portPrice->selling_price > 0) {
                            $sellingPrice = (float) $portPrice->selling_price;
                            if ($portPrice->hpp_price > 0) {
                                $hppPrice = (float) $portPrice->hpp_price;
                            }
                        }
                    }
                }
            }

            $newItem = RequestItem::create([
                'request_id' => $shipRequest->id,
                'product_id' => $productId,
                'item_type' => $itemType,
                'item_name' => $validated['item_name'],
                'unit' => $validated['unit'],
                'quantity' => $validated['quantity'],
                'required_date' => $validated['required_date'] ?? now()->toDateString(),
                'required_time' => $validated['required_time'] ?? null,
                'hpp_price' => $hppPrice,
                'selling_price' => $sellingPrice,
                'vendor_id' => $vendorId,
                'status' => 'pending',
                'director_status' => 'pending',
                'is_urgent' => ! empty($validated['is_urgent']),
                'notes' => $validated['notes'] ?? null,
            ]);

            // Re-open status to Menunggu Approval if it was previously Selesai or Disetujui
            if (in_array($shipRequest->status, ['Selesai', 'Disetujui'])) {
                $shipRequest->update(['status' => 'Menunggu Approval']);
            }

            if (function_exists('activity')) {
                activity('request')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log("Menambahkan item kebutuhan susulan ({$validated['item_name']}) pada pengajuan {$shipRequest->request_number}");
            }

            try {
                event(new ShipRequestSubmitted($shipRequest));
            } catch (\Throwable) {
            }

            return redirect()->back()->with('success', "Item kebutuhan susulan '{$newItem->item_name}' berhasil ditambahkan ke {$shipRequest->request_number}.");
        });
    }

    public function batchForwardDirector(Request $request): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'selected_items' => ['required', 'array', 'min:1'],
            'selected_items.*' => ['uuid', 'exists:request_items,id'],
            'item_prices' => ['nullable', 'array'],
            'item_prices.*.id' => ['required_with:item_prices', 'uuid', 'exists:request_items,id'],
            'item_prices.*.hpp_price' => ['nullable', 'numeric', 'min:0'],
            'item_prices.*.selling_price' => ['nullable', 'numeric', 'min:0'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $selectedItemIds = collect($validated['selected_items'])->unique()->values();
            $items = RequestItem::lockForUpdate()->with('request')->whereIn('id', $selectedItemIds)->get();
            $submittedPrices = collect($validated['item_prices'] ?? [])->keyBy('id');

            $requestGroups = $items->groupBy('request_id');

            foreach ($requestGroups as $requestId => $groupItems) {
                $shipRequest = ShipRequest::lockForUpdate()->findOrFail($requestId);

                if (in_array($shipRequest->status, ['Dalam Proses', 'Selesai', 'Dibatalkan'], true)) {
                    continue;
                }

                foreach ($groupItems as $item) {
                    if ($item->isLocked()) {
                        continue;
                    }

                    $price = $submittedPrices->get($item->id, []);
                    $newHpp = isset($price['hpp_price']) && is_numeric($price['hpp_price'])
                        ? (float) $price['hpp_price']
                        : (float) $item->hpp_price;
                    $newSelling = isset($price['selling_price']) && is_numeric($price['selling_price'])
                        ? (float) $price['selling_price']
                        : (float) $item->selling_price;

                    if ($newHpp <= 0 || $newSelling <= 0) {
                        throw ValidationException::withMessages([
                            'selected_items' => "Item '{$item->item_name}' pada pengajuan {$shipRequest->request_number} belum memiliki HPP atau Harga Jual yang valid (> Rp 0). Harap lengkapi harga terlebih dahulu sebelum diajukan ke Direktur.",
                        ]);
                    }

                    $item->update([
                        'hpp_price' => $newHpp,
                        'selling_price' => $newSelling,
                        'status' => 'diajukan_ke_direktur',
                        'director_status' => 'pending',
                        'director_notes' => null,
                    ]);
                }

                $shipRequest->update([
                    'status' => 'Menunggu Approval Direktur',
                    'forwarded_to_director_at' => now(),
                    'notes' => ! empty($validated['admin_notes'])
                        ? $shipRequest->notes."\n[Catatan Batch Admin: {$validated['admin_notes']}]"
                        : $shipRequest->notes,
                ]);

                if (function_exists('activity')) {
                    activity('request')
                        ->performedOn($shipRequest)
                        ->causedBy($request->user())
                        ->withProperties([
                            'action' => 'batch_forward_director',
                            'item_count' => $groupItems->count(),
                        ])
                        ->log("Admin mengajukan {$groupItems->count()} item ke Direktur secara batch");
                }
            }

            return redirect()->back()->with('success', count($selectedItemIds).' item kebutuhan berhasil diajukan ke Direktur.');
        });
    }

    public function updateItemPrice(Request $request, string $requestId, string $itemId): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'hpp_price' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
        ]);

        return DB::transaction(function () use ($requestId, $itemId, $validated, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->findOrFail($requestId);
            $item = RequestItem::lockForUpdate()->where('request_id', $shipRequest->id)->findOrFail($itemId);

            if ($item->isLocked()) {
                throw ValidationException::withMessages([
                    'hpp_price' => "Harga {$item->item_name} sudah disetujui Direktur dan tidak dapat diubah tanpa proses revisi.",
                ]);
            }

            $oldHpp = (float) $item->hpp_price;
            $oldSelling = (float) $item->selling_price;

            $item->update([
                'hpp_price' => array_key_exists('hpp_price', $validated) ? $validated['hpp_price'] : $item->hpp_price,
                'selling_price' => array_key_exists('selling_price', $validated) ? $validated['selling_price'] : $item->selling_price,
                'vendor_id' => array_key_exists('vendor_id', $validated) ? $validated['vendor_id'] : $item->vendor_id,
            ]);

            if (function_exists('activity')) {
                activity('request-item-pricing')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'action' => 'price_updated',
                        'old' => ['hpp_price' => $oldHpp, 'selling_price' => $oldSelling],
                        'new' => ['hpp_price' => (float) $item->hpp_price, 'selling_price' => (float) $item->selling_price],
                    ])
                    ->log("Admin memperbarui harga {$item->item_name}");
            }

            return redirect()->back()->with('success', "Harga {$item->item_name} berhasil diperbarui.");
        });
    }

    public function batchUpdateItemPrices(Request $request): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'uuid', 'exists:request_items,id'],
            'items.*.hpp_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.selling_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
        ]);

        return DB::transaction(function () use ($validated) {
            $lockedItem = RequestItem::query()
                ->whereIn('id', collect($validated['items'])->pluck('id'))
                ->where('director_status', 'approved')
                ->first();

            if ($lockedItem) {
                throw ValidationException::withMessages([
                    'items' => "Harga {$lockedItem->item_name} sudah dikunci oleh approval Direktur. Ajukan revisi terlebih dahulu.",
                ]);
            }

            $updatedCount = 0;
            foreach ($validated['items'] as $itemData) {
                $item = RequestItem::lockForUpdate()->find($itemData['id']);
                if (! $item) {
                    continue;
                }

                $item->update([
                    'hpp_price' => $itemData['hpp_price'] ?? $item->hpp_price,
                    'selling_price' => $itemData['selling_price'] ?? $item->selling_price,
                    'vendor_id' => array_key_exists('vendor_id', $itemData) ? $itemData['vendor_id'] : $item->vendor_id,
                ]);
                $updatedCount++;
            }

            return redirect()->back()->with('success', "{$updatedCount} harga item berhasil disimpan.");
        });
    }

    private function authorizeAdminPricing(Request $request): void
    {
        if (! $request->user()?->isOperationalAdmin()) {
            abort(403, 'Hanya Admin yang dapat meninjau harga dan mengirim item kepada Direktur.');
        }
    }
}
