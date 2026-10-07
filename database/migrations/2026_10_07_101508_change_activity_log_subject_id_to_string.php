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
        $connection = config('activitylog.database_connection');
        $tableName = config('activitylog.table_name', 'activity_log');

        Schema::connection($connection)->table($tableName, function (Blueprint $table) {
            $table->string('subject_id')
                ->nullable()
                ->using('subject_id::text')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $connection = config('activitylog.database_connection');
        $tableName = config('activitylog.table_name', 'activity_log');

        if (DB::connection($connection)->table($tableName)->whereNotNull('subject_id')->exists()) {
            throw new RuntimeException('Cannot restore activity_log.subject_id to BIGINT after UUID activities have been recorded.');
        }

        Schema::connection($connection)->table($tableName, function (Blueprint $table) {
            $table->unsignedBigInteger('subject_id')
                ->nullable()
                ->using('subject_id::bigint')
                ->change();
        });
    }
};
