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
        Schema::table('requests', function (Blueprint $table) {
            $table->string('service_type', 150)->nullable()->change();

            if (! Schema::hasColumn('requests', 'batch_number')) {
                $table->string('batch_number', 50)->nullable()->index();
            }
        });

        try {
            Schema::table('requests', function (Blueprint $table) {
                $table->dropUnique('requests_request_number_unique');
                $table->index('request_number');
            });
        } catch (Throwable) {
            // Already dropped or index name differed
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            if (Schema::hasColumn('requests', 'batch_number')) {
                $table->dropColumn('batch_number');
            }
            $table->string('service_type', 30)->nullable()->change();
        });

        try {
            Schema::table('requests', function (Blueprint $table) {
                $table->dropIndex(['request_number']);
                $table->unique('request_number');
            });
        } catch (Throwable) {
            //
        }
    }
};
