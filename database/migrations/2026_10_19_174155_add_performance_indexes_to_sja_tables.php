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
        Schema::table('port_calls', function (Blueprint $table) {
            $table->index('status');
            $table->index('port_id');
            $table->index('work_order_id');
        });

        Schema::table('requests', function (Blueprint $table) {
            $table->index('port_call_id');
            $table->index('request_date');
        });

        Schema::table('request_items', function (Blueprint $table) {
            $table->index('status');
            $table->index('product_id');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->index('port_call_id');
            $table->index('company_id');
            $table->index('status');
            $table->index('due_date');
            $table->index('invoice_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['port_call_id']);
            $table->dropIndex(['company_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['due_date']);
            $table->dropIndex(['invoice_date']);
        });

        Schema::table('request_items', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['product_id']);
        });

        Schema::table('requests', function (Blueprint $table) {
            $table->dropIndex(['port_call_id']);
            $table->dropIndex(['request_date']);
        });

        Schema::table('port_calls', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['port_id']);
            $table->dropIndex(['work_order_id']);
        });
    }
};
