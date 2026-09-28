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
use Inertia\Inertia;
use Inertia\Response;

class RequestController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'aktif');
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

        if ($tab === 'aktif') {
            $query->whereNotIn('status', ['Selesai', 'Dibatalkan']);
        } else {
            $query->whereIn('status', ['Selesai', 'Dibatalkan']);
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

        $activeCount = ShipRequest::whereNotIn('status', ['Selesai', 'Dibatalkan'])->count();
        $historyCount = ShipRequest::whereIn('status', ['Selesai', 'Dibatalkan'])->count();

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
                'aktif' => $activeCount,
                'riwayat' => $historyCount,
            ],
            'activeTab' => $tab,
            'search' => $search ?? '',
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
                    ->log("Pak Prima mengajukan form kebutuhan {$reqNumber} (".count($validated['items']).' item)');
            }

            try {
                event(new ShipRequestSubmitted($newRequest));
            } catch (\Throwable) {
                // broadcast driver fallback
            }

            return redirect()->route('requests.index')->with('success', "Pengajuan {$reqNumber} berhasil diajukan dan diteruskan ke Bu Titik (Admin) untuk filter harga.");
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

        return redirect()->back()->with('success', "Pengajuan {$reqNumber} berhasil diajukan dan sedang menunggu review.");
    }

    /**
     * Admin (Bu Titik) filters items, adjusts prices/vendor, and forwards selected items to Direktur
     */
    public function forwardToDirector(Request $request, string $id): RedirectResponse
    {
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
            $shipRequest = ShipRequest::with('items')->findOrFail($id);

            // Update item prices and vendor if submitted
            if (! empty($validated['item_prices'])) {
                foreach ($validated['item_prices'] as $ip) {
                    $item = RequestItem::find($ip['id']);
                    if ($item) {
                        $item->update([
                            'hpp_price' => $ip['hpp_price'] ?? $item->hpp_price,
                            'selling_price' => $ip['selling_price'] ?? $item->selling_price,
                            'vendor_id' => $ip['vendor_id'] ?? $item->vendor_id,
                        ]);
                    }
                }
            }

            // Mark selected items as ready for director approval
            foreach ($shipRequest->items as $item) {
                if (in_array($item->id, $validated['selected_items'])) {
                    $item->update([
                        'status' => 'diajukan_ke_direktur',
                        'director_status' => 'pending',
                    ]);
                } else {
                    $item->update([
                        'status' => 'pending',
                        'director_status' => 'pending',
                    ]);
                }
            }

            $shipRequest->update([
                'status' => 'Menunggu Approval Direktur',
                'forwarded_to_director_at' => now(),
                'notes' => ! empty($validated['admin_notes'])
                    ? $shipRequest->notes."\n[Catatan Admin Bu Titik: {$validated['admin_notes']}]"
                    : $shipRequest->notes,
            ]);

            if (function_exists('activity')) {
                activity('request')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log('Bu Titik memfilter '.count($validated['selected_items'])." item dan mengirim pengajuan {$shipRequest->request_number} ke Direktur");
            }

            return redirect()->back()->with('success', "Pengajuan {$shipRequest->request_number} (".count($validated['selected_items']).' item terpilih) telah diteruskan ke Direktur.');
        });
    }

    /**
     * Shortcut for Clearance In Pelindo kedatangan invoice before ship arrival
     */
    public function createClearanceInInvoice(Request $request, string $id): RedirectResponse
    {
        return DB::transaction(function () use ($id) {
            $shipRequest = ShipRequest::with(['ship.company', 'items'])->findOrFail($id);

            $companyId = $shipRequest->company_id ?? $shipRequest->ship?->ship_company_id;
            if (! $companyId) {
                return redirect()->back()->with('error', 'Data perusahaan pelayaran tidak ditemukan.');
            }

            // Find or calculate Clearance In Pelindo cost
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $clearanceItem = $shipRequest->items()
                ->where(function ($q) use ($like) {
                    $q->where('item_name', $like, '%Clearance In%')
                        ->orWhere('item_name', $like, '%Pelindo Kedatangan%');
                })
                ->first();

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

            // Update request status if all invoiced
            $remaining = $shipRequest->items()->where('is_invoiced', false)->count();
            if ($remaining === 0) {
                $shipRequest->update(['status' => 'Selesai']);
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
}
