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
        Schema::create('report_exports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('report_type'); // vessel_daily_expenses, margin, invoices, receivables, expenses, activities, requests
            $table->string('format'); // pdf, xlsx
            $table->string('status')->default('pending'); // pending, processing, completed, failed
            $table->string('filename');
            $table->string('file_path')->nullable();
            $table->text('error_message')->nullable();
            $table->json('parameters')->nullable();
            $table->string('job_number')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['report_type', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_exports');
    }
};
