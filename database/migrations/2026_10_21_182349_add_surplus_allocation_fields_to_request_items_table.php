<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->uuid('surplus_source_item_id')->nullable()->after('vendor_id');
            $table->decimal('surplus_amount', 15, 2)->default(0)->after('surplus_source_item_id');
            $table->decimal('original_hpp_price', 15, 2)->nullable()->after('surplus_amount');

            $table->foreign('surplus_source_item_id')
                ->references('id')
                ->on('request_items')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->dropForeign(['surplus_source_item_id']);
            $table->dropColumn([
                'surplus_source_item_id',
                'surplus_amount',
                'original_hpp_price',
            ]);
        });
    }
};
