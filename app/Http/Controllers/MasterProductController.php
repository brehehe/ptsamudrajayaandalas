<?php

namespace App\Http\Controllers;

use App\Models\Port;
use App\Models\Product;
use App\Models\ProductPortPrice;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterProductController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $itemType = $request->query('type', 'all'); // 'all' | 'jasa' | 'non_jasa'
        $category = $request->query('category', 'all');

        $query = Product::query()->with(['vendor', 'portPrices.port'])->where('is_active', true);

        if ($itemType !== 'all') {
            $query->where('item_type', $itemType);
        }

        if ($category !== 'all') {
            $query->where('category', $category);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%")
                    ->orWhere('category', 'ilike', "%{$search}%")
                    ->orWhereHas('vendor', fn ($vq) => $vq->where('name', 'ilike', "%{$search}%"));
            });
        }

        $products = $query->orderBy('item_type')->orderBy('name')->get();

        $stats = [
            'total' => Product::where('is_active', true)->count(),
            'jasa' => Product::where('is_active', true)->where('item_type', 'jasa')->count(),
            'non_jasa' => Product::where('is_active', true)->where('item_type', 'non_jasa')->count(),
        ];

        $categories = Product::where('is_active', true)->distinct()->pluck('category');
        $vendors = Vendor::where('is_active', true)->orderBy('name')->get();
        $ports = Port::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('Master/Products/Index', [
            'products' => $products,
            'vendors' => $vendors,
            'ports' => $ports,
            'categories' => $categories,
            'stats' => $stats,
            'filters' => [
                'search' => $search ?? '',
                'type' => $itemType,
                'category' => $category,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:products,code'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'item_type' => ['required', 'in:jasa,non_jasa'],
            'unit' => ['required', 'string', 'max:50'],
            'hpp_default' => ['required', 'numeric', 'min:0'],
            'selling_price_default' => ['required', 'numeric', 'min:0'],
            'price_sandar' => ['nullable', 'numeric', 'min:0'],
            'price_labuh' => ['nullable', 'numeric', 'min:0'],
            'vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
            'description' => ['nullable', 'string', 'max:1000'],
            'port_prices' => ['nullable', 'array'],
            'port_prices.*.port_id' => ['required_with:port_prices', 'uuid', 'exists:ports,id'],
            'port_prices.*.service_type' => ['required_with:port_prices', 'in:Sandar,Labuh'],
            'port_prices.*.selling_price' => ['required_with:port_prices', 'numeric', 'min:0'],
        ]);

        $product = Product::create([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'category' => $validated['category'],
            'item_type' => $validated['item_type'],
            'unit' => $validated['unit'],
            'hpp_default' => $validated['hpp_default'],
            'selling_price_default' => $validated['selling_price_default'],
            'price_sandar' => $validated['price_sandar'] ?? $validated['selling_price_default'],
            'price_labuh' => $validated['price_labuh'] ?? $validated['selling_price_default'],
            'tax_rate' => $validated['item_type'] === 'jasa' ? 2.00 : 0.00,
            'vendor_id' => $validated['vendor_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        if (! empty($validated['port_prices'])) {
            foreach ($validated['port_prices'] as $pp) {
                ProductPortPrice::create([
                    'product_id' => $product->id,
                    'port_id' => $pp['port_id'],
                    'service_type' => $pp['service_type'],
                    'selling_price' => $pp['selling_price'],
                    'hpp_price' => $validated['hpp_default'],
                ]);
            }
        }

        return redirect()->route('master.products.index')->with('success', "Produk master {$product->name} berhasil ditambahkan.");
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:products,code,'.$product->id],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'item_type' => ['required', 'in:jasa,non_jasa'],
            'unit' => ['required', 'string', 'max:50'],
            'hpp_default' => ['required', 'numeric', 'min:0'],
            'selling_price_default' => ['required', 'numeric', 'min:0'],
            'price_sandar' => ['nullable', 'numeric', 'min:0'],
            'price_labuh' => ['nullable', 'numeric', 'min:0'],
            'vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
            'description' => ['nullable', 'string', 'max:1000'],
            'port_prices' => ['nullable', 'array'],
            'port_prices.*.port_id' => ['required_with:port_prices', 'uuid', 'exists:ports,id'],
            'port_prices.*.service_type' => ['required_with:port_prices', 'in:Sandar,Labuh'],
            'port_prices.*.selling_price' => ['required_with:port_prices', 'numeric', 'min:0'],
        ]);

        $product->update([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'category' => $validated['category'],
            'item_type' => $validated['item_type'],
            'unit' => $validated['unit'],
            'hpp_default' => $validated['hpp_default'],
            'selling_price_default' => $validated['selling_price_default'],
            'price_sandar' => $validated['price_sandar'] ?? $product->price_sandar,
            'price_labuh' => $validated['price_labuh'] ?? $product->price_labuh,
            'vendor_id' => $validated['vendor_id'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        if (isset($validated['port_prices'])) {
            foreach ($validated['port_prices'] as $pp) {
                ProductPortPrice::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'port_id' => $pp['port_id'],
                        'service_type' => $pp['service_type'],
                    ],
                    [
                        'selling_price' => $pp['selling_price'],
                        'hpp_price' => $validated['hpp_default'],
                    ]
                );
            }
        }

        return redirect()->back()->with('success', "Data produk {$product->name} berhasil diperbarui.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $product = Product::findOrFail($id);
        $name = $product->name;
        $product->delete();

        return redirect()->back()->with('success', "Produk master {$name} berhasil dinonaktifkan.");
    }

    public function lookupPrice(Request $request): JsonResponse
    {
        $productId = $request->query('product_id');
        $portId = $request->query('port_id');
        $serviceType = $request->query('service_type', 'Sandar');

        if (! $productId) {
            return response()->json(['error' => 'Product ID is required'], 400);
        }

        $product = Product::with('vendor')->find($productId);
        if (! $product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        $sellingPrice = (float) $product->selling_price_default;
        $hppPrice = (float) $product->hpp_default;

        // Check specific port price
        if ($portId) {
            $portPrice = ProductPortPrice::where('product_id', $productId)
                ->where('port_id', $portId)
                ->where('service_type', $serviceType)
                ->first();

            if ($portPrice && $portPrice->selling_price > 0) {
                $sellingPrice = (float) $portPrice->selling_price;
                if ($portPrice->hpp_price > 0) {
                    $hppPrice = (float) $portPrice->hpp_price;
                }
            }
        } elseif ($serviceType === 'Sandar' && $product->price_sandar > 0) {
            $sellingPrice = (float) $product->price_sandar;
        } elseif ($serviceType === 'Labuh' && $product->price_labuh > 0) {
            $sellingPrice = (float) $product->price_labuh;
        }

        $data = [
            'product_id' => $product->id,
            'name' => $product->name,
            'unit' => $product->unit,
            'item_type' => $product->item_type,
            'selling_price' => $sellingPrice,
            'hpp_price' => $hppPrice,
            'vendor_id' => $product->vendor_id,
            'vendor_name' => $product->vendor?->name,
        ];

        return response()->json(array_merge([
            'success' => true,
            'data' => $data,
        ], $data));
    }
}
