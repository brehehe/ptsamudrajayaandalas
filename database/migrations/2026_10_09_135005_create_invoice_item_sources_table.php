<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropUnique('invoice_items_request_item_id_unique');
            $table->uuid('request_item_id')->nullable()->change();
            $table->unsignedInteger('sort_order')->default(0)->after('invoice_id');
            $table->boolean('is_custom')->default(false)->after('sort_order');
        });

        Schema::create('invoice_item_sources', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_item_id')->constrained('invoice_items')->cascadeOnDelete();
            $table->foreignUuid('request_item_id')->constrained('request_items')->restrictOnDelete();
            $table->decimal('allocated_quantity', 12, 2)->default(0);
            $table->decimal('source_cost', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['invoice_item_id', 'request_item_id'], 'invoice_line_source_unique');
            $table->index(['request_item_id', 'invoice_item_id'], 'invoice_source_request_index');
        });

        DB::table('invoice_items')
            ->whereNotNull('request_item_id')
            ->orderBy('created_at')
            ->each(function (object $invoiceItem): void {
                $requestItem = DB::table('request_items')->where('id', $invoiceItem->request_item_id)->first();

                DB::table('invoice_item_sources')->insert([
                    'id' => (string) Str::uuid(),
                    'invoice_item_id' => $invoiceItem->id,
                    'request_item_id' => $invoiceItem->request_item_id,
                    'allocated_quantity' => $requestItem?->quantity ?? 0,
                    'source_cost' => ((float) ($requestItem?->hpp_price ?? 0)) * ((float) ($requestItem?->quantity ?? 0)),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('invoice_items')
            ->whereNull('request_item_id')
            ->update([
                'request_item_id' => DB::raw('(select request_item_id from invoice_item_sources where invoice_item_sources.invoice_item_id = invoice_items.id limit 1)'),
            ]);

        DB::table('invoice_items')->whereNull('request_item_id')->delete();
        Schema::dropIfExists('invoice_item_sources');

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn(['sort_order', 'is_custom']);
            $table->uuid('request_item_id')->nullable(false)->change();
            $table->unique('request_item_id');
        });
    }
};
