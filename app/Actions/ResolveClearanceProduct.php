<?php

namespace App\Actions;

use App\Models\Product;
use Illuminate\Support\Facades\DB;

class ResolveClearanceProduct
{
    public function handle(string $serviceType): ?Product
    {
        $productByCode = Product::query()
            ->where('is_active', true)
            ->where('code', 'PRD-CLR')
            ->first();

        if ($productByCode) {
            return $productByCode;
        }

        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
        $label = $serviceType === 'clearance_out' ? 'Clearance Out' : 'Clearance In';

        $exactLabelProduct = Product::query()
            ->where('is_active', true)
            ->where('name', $like, "%{$label}%")
            ->first();

        if ($exactLabelProduct) {
            return $exactLabelProduct;
        }

        return Product::query()
            ->where('is_active', true)
            ->where('name', $like, '%Clearance%')
            ->where('name', $like, '%In%')
            ->where('name', $like, '%Out%')
            ->first();
    }
}
