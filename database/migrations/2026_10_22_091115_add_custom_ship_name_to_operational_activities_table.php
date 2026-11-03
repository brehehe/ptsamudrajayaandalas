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
        Schema::table('operational_activities', function (Blueprint $table) {
            $table->string('custom_ship_name')->nullable()->after('ship_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('operational_activities', function (Blueprint $table) {
            $table->dropColumn('custom_ship_name');
        });
    }
};
