<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('products')
            ->select(['id', 'vendor_id', 'hpp_default'])
            ->whereNotNull('hpp_default')
            ->orderBy('id')
            ->each(function (object $product): void {
                DB::table('request_items')
                    ->where('product_id', $product->id)
                    ->whereNull('hpp_price')
                    ->update(['hpp_price' => $product->hpp_default]);

                if ($product->vendor_id) {
                    DB::table('request_items')
                        ->where('product_id', $product->id)
                        ->whereNull('vendor_id')
                        ->update(['vendor_id' => $product->vendor_id]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void {}
};
