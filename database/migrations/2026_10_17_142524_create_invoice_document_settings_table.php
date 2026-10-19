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
        Schema::create('invoice_document_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('setting_key', 64)->unique();
            $table->string('company_name');
            $table->string('business_label');
            $table->text('office_address');
            $table->string('phone', 100);
            $table->string('email');
            $table->string('city', 100);
            $table->string('bank_account_name');
            $table->string('bank_account_number', 100);
            $table->string('bank_name');
            $table->string('signatory_title', 100);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_document_settings');
    }
};
