<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('operational_activities')) {
            Schema::create('operational_activities', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->date('activity_date');
                $table->string('activity_time', 10)->nullable();
                $table->string('location_name');
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->boolean('is_vessel_related')->default(true);
                $table->uuid('ship_id')->nullable();
                $table->uuid('port_call_id')->nullable();
                $table->uuid('request_id')->nullable();
                $table->string('category')->default('Kegiatan Kapal');
                $table->string('title');
                $table->text('detail');
                $table->json('photos')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('ship_id')->references('id')->on('ships')->nullOnDelete();
                $table->foreign('port_call_id')->references('id')->on('port_calls')->nullOnDelete();
                $table->foreign('request_id')->references('id')->on('requests')->nullOnDelete();
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

                $table->index(['activity_date', 'created_at']);
                $table->index(['ship_id', 'activity_date']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('operational_activities');
    }
};
