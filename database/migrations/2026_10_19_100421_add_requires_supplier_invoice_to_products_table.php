<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('requires_supplier_invoice')->default(true)->after('vendor_id');
        });

        $tacticalBerthingProductId = DB::table('products')
            ->where('code', 'PRD-PLD-TAKTIS')
            ->value('id');

        if ($tacticalBerthingProductId === null) {
            return;
        }

        DB::table('products')
            ->where('id', $tacticalBerthingProductId)
            ->update([
                'vendor_id' => null,
                'requires_supplier_invoice' => false,
            ]);

        DB::table('request_items')
            ->where('product_id', $tacticalBerthingProductId)
            ->update(['vendor_id' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('requires_supplier_invoice');
        });
    }
};
