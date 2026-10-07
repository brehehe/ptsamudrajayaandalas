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
        Schema::table('cost_document_items', function (Blueprint $table) {
            $table->unique('request_item_id', 'cost_document_items_request_item_unique');
        });

        Schema::table('expense_request_items', function (Blueprint $table) {
            $table->unique('cost_document_item_id', 'expense_request_items_cost_item_unique');
            $table->unique('request_item_id', 'expense_request_items_request_item_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expense_request_items', function (Blueprint $table) {
            $table->dropUnique('expense_request_items_cost_item_unique');
            $table->dropUnique('expense_request_items_request_item_unique');
        });

        Schema::table('cost_document_items', function (Blueprint $table) {
            $table->dropUnique('cost_document_items_request_item_unique');
        });
    }
};
