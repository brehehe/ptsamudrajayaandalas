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
        Schema::table('work_orders', function (Blueprint $table) {
            $table->date('planned_eta_at')->nullable()->change();
            $table->date('planned_etd_at')->nullable()->change();
        });

        Schema::table('port_calls', function (Blueprint $table) {
            $table->date('eta_at')->nullable()->change();
            $table->date('etd_at')->nullable()->change();
        });

        Schema::table('ships', function (Blueprint $table) {
            $table->date('eta')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->timestamp('planned_eta_at')->nullable()->change();
            $table->timestamp('planned_etd_at')->nullable()->change();
        });

        Schema::table('port_calls', function (Blueprint $table) {
            $table->timestamp('eta_at')->nullable()->change();
            $table->timestamp('etd_at')->nullable()->change();
        });

        Schema::table('ships', function (Blueprint $table) {
            $table->timestamp('eta')->nullable()->change();
        });
    }
};
