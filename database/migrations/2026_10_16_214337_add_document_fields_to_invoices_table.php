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
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('subject')->nullable()->after('invoice_type');
            $table->string('origin_port_name')->nullable()->after('subject');
            $table->string('destination_port_name')->nullable()->after('origin_port_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['subject', 'origin_port_name', 'destination_port_name']);
        });
    }
};
