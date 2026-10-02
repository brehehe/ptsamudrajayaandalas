<?php

namespace App\Http\Controllers;

use App\Events\ShipRequestSubmitted;
use App\Models\Invoice;
use App\Models\Port;
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
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RequestController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'semua');
        $search = $request->query('search');

        $query = ShipRequest::query()->with([
            'ship.company',
            'company',
            'port',
            'creator',
            'invoices',
            'items.product.vendor',
            'items.vendor',
        ]);

        if ($tab === 'menunggu') {
            $query->whereIn('status', ['Menunggu Approval', 'Menunggu', 'pending']);
        } elseif ($tab === 'diproses') {
            $query->whereIn('status', ['Dalam Proses', 'Diproses', 'Disetujui', 'Disetujui Sebagian']);
        } elseif ($tab === 'selesai' || $tab === 'riwayat') {
            $query->whereIn('status', ['Selesai', 'Dibatalkan']);
        } elseif ($tab === 'aktif') {
            $query->whereNotIn('status', ['Selesai', 'Dibatalkan']);
        }

        if ($search) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $like) {
                $q->where('request_number', $like, "%{$search}%")
                    ->orWhere('notes', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('items', fn ($iq) => $iq->where('item_name', $like, "%{$search}%"));
            });
        }

        $requests = $query->orderByDesc('created_at')->get();

        $semuaCount = ShipRequest::count();
        $menungguCount = ShipRequest::whereIn('status', ['Menunggu Approval', 'Menunggu', 'pending'])->count();
        $diprosesCount = ShipRequest::whereIn('status', ['Dalam Proses', 'Diproses', 'Disetujui', 'Disetujui Sebagian'])->count();
        $selesaiCount = ShipRequest::whereIn('status', ['Selesai', 'Dibatalkan'])->count();
        $activeCount = ShipRequest::whereNotIn('status', ['Selesai', 'Dibatalkan'])->count();
        $historyCount = $selesaiCount;

        $ships = Ship::query()->where('is_active', true)->with('company')->orderBy('name')->get();
        $companies = ShipCompany::query()->where('is_active', true)->orderBy('name')->get();
        $ports = Port::query()->where('is_active', true)->orderBy('name')->get();
        $products = Product::query()->where('is_active', true)->with('vendor')->orderBy('name')->get();
        $vendors = Vendor::query()->where('is_active', true)->orderBy('name')->get();

        return Inertia::render('Requests/Index', [
            'requests' => $requests,
            'ships' => $ships,
            'companies' => $companies,
            'ports' => $ports,
            'products' => $products,
            'vendors' => $vendors,
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

    public function show(Request $request, ShipRequest $shipRequest): Response
    {
        $shipRequest->load([
            'ship.company',
            'company',
            'port',
            'portCall.port',
            'creator',
            'invoices',
            'items.product.vendor',
            'items.vendor',
        ]);

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

        $canReviewPrices = $request->user()?->isOperationalAdmin() || $request->user()?->isOwner();
        $canDecideItems = $request->user()?->isDirector() || $request->user()?->isOwner();
        $canViewHpp = $canReviewPrices || $canDecideItems;

        if (! $canViewHpp) {
            $shipRequest->items->each->makeHidden('hpp_price');
            $products->each->makeHidden('hpp_default');
        }

        return Inertia::render('Requests/Show', [
            'request' => $shipRequest,
            'products' => $products,
            'capabilities' => [
                'can_review_prices' => $canReviewPrices,
                'can_decide_items' => $canDecideItems,
                'can_view_hpp' => $canViewHpp,
            ],
        ]);
    }

    /**
     * Show 3-Step Wizard for Lapangan (Pak Prima)
     */
    public function create(): Response
    {
        $companies = ShipCompany::where('is_active', true)->orderBy('name')->get();
        $ships = Ship::where('is_active', true)->with('company')->orderBy('name')->get();
        $ports = Port::where('is_active', true)->orderBy('name')->get();
        $serviceTypes = ServiceType::where('is_active', true)->orderByDesc('is_default')->orderBy('name')->get();
        $products = Product::where('is_active', true)->with(['vendor', 'portPrices'])->orderBy('item_type')->orderBy('name')->get();

        return Inertia::render('Requests/Create', [
            'companies' => $companies,
            'ships' => $ships,
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
        $validated = $request->validate([
            // Wizard 1: Perusahaan, Kapal, Type, Pelabuhan
            'company_id' => ['nullable', 'uuid', 'exists:ship_companies,id'],
            'is_new_company' => ['nullable', 'boolean'],
            'new_company_name' => ['nullable', 'required_if:is_new_company,true', 'string', 'max:255'],
            'ship_id' => ['nullable', 'uuid', 'exists:ships,id'],
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
                    'imo_number' => $validated['new_ship_imo'] ?? 'IMO-'.rand(1000000, 9999999),
                    'ship_type' => 'General Cargo',
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
            $newRequest = ShipRequest::create([
                'request_number' => $reqNumber,
                'ship_id' => $shipId,
                'company_id' => $companyId,
                'port_id' => $validated['port_id'],
                'service_type' => $validated['service_type'],
                'created_by' => $request->user()->id,
                'status' => 'Menunggu Approval',
                'request_date' => now()->toDateString(),
                'notes' => $validated['notes'] ?? 'Pengajuan operasional lapangan via Wizard Lapangan.',
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
        $validated = $request->validate([
            'ships' => ['required', 'array', 'min:1'],
            'ships.*.ship_id' => ['required', 'uuid', 'exists:ships,id'],
            'ships.*.request_type' => ['required', 'string'],
            'ships.*.department' => ['nullable', 'string'],
            'ships.*.order_date' => ['nullable', 'date'],
            'ships.*.requester_name' => ['nullable', 'string', 'max:255'],
            'ships.*.requester_phone' => ['nullable', 'string', 'max:50'],
            'ships.*.required_date' => ['nullable', 'date'],
            'ships.*.required_time' => ['nullable', 'string'],
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

            $defaultPort = Port::where('is_active', true)->first();
            $createdRequests = [];
            $shipIndex = 0;

            foreach ($validated['ships'] as $shipData) {
                $shipIndex++;
                $ship = Ship::with('company')->find($shipData['ship_id']);
                if (! $ship) {
                    continue;
                }

                // In multi-ship submissions, all ships share the same PGJ batch number
                // while maintaining their own individual request record per vessel
                $reqNumber = $batchCode;

                $serviceType = 'Sandar';
                $reqTypeLower = strtolower($shipData['request_type']);
                if (str_contains($reqTypeLower, 'clearance in') || str_contains($reqTypeLower, 'kedatangan')) {
                    $serviceType = 'Kedatangan (Clearance In)';
                } elseif (str_contains($reqTypeLower, 'clearance out') || str_contains($reqTypeLower, 'keberangkatan')) {
                    $serviceType = 'Keberangkatan (Clearance Out)';
                } elseif (str_contains($reqTypeLower, 'perpanjangan') || str_contains($reqTypeLower, 'endors')) {
                    $serviceType = 'Perpanjangan Surat / Endors Surat Laut';
                } elseif (str_contains($reqTypeLower, 'kebutuhan')) {
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
                    'port_id' => $defaultPort?->id,
                    'service_type' => $serviceType,
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
                $oldPrices = [
                    'hpp_price' => (float) $item->hpp_price,
                    'selling_price' => (float) $item->selling_price,
                ];

                $item->update([
                    'hpp_price' => $price['hpp_price'] ?? $item->hpp_price,
                    'selling_price' => $price['selling_price'] ?? $item->selling_price,
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
                ->filter(fn (RequestItem $item): bool => ! $item->isLocked() && $item->status !== 'diajukan_ke_direktur')
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
            $shipRequest = ShipRequest::with(['ship.company', 'items'])->findOrFail($id);

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
            $shipRequest = ShipRequest::with(['ship.company', 'items.product'])->findOrFail($id);

            $companyId = $shipRequest->company_id ?? $shipRequest->ship?->ship_company_id;
            if (! $companyId) {
                return redirect()->back()->with('error', 'Data perusahaan pelayaran tidak ditemukan.');
            }

            $approvedItems = $shipRequest->items()
                ->where('director_status', 'approved')
                ->where('is_invoiced', false)
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

        return DB::transaction(function () use ($id, $validated, $request) {
            $shipRequest = ShipRequest::findOrFail($id);

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

    private function authorizeAdminPricing(Request $request): void
    {
        if (! $request->user()?->isOperationalAdmin() && ! $request->user()?->isOwner()) {
            abort(403, 'Hanya Admin yang dapat meninjau harga dan mengirim item kepada Direktur.');
        }
    }
}
