<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddEventColumnToActivityLogTable extends Migration
{
    public function up()
    {
        $connection = config('activitylog.database_connection');
        $tableName = config('activitylog.table_name');

        if (Schema::connection($connection)->hasTable($tableName) && ! Schema::connection($connection)->hasColumn($tableName, 'event')) {
            Schema::connection($connection)->table($tableName, function (Blueprint $table) {
                $table->string('event')->nullable()->after('subject_type');
            });
        }
    }

    public function down()
    {
        Schema::connection(config('activitylog.database_connection'))->table(config('activitylog.table_name'), function (Blueprint $table) {
            $table->dropColumn('event');
        });
    }
}
