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
        Schema::table('request_items', function (Blueprint $table) {
            $table->string('supplier_invoice_number')->nullable()->after('attachment_path');
            $table->date('supplier_invoice_date')->nullable()->after('supplier_invoice_number');
            $table->date('supplier_invoice_received_date')->nullable()->after('supplier_invoice_date');
            $table->date('supplier_invoice_due_date')->nullable()->after('supplier_invoice_received_date');
            $table->string('supplier_invoice_path')->nullable()->after('supplier_invoice_due_date');
            $table->foreignId('supplier_invoice_uploaded_by')
                ->nullable()
                ->after('supplier_invoice_path')
                ->constrained('users')
                ->nullOnDelete();
            $table->index(
                ['vendor_id', 'supplier_invoice_number'],
                'request_items_supplier_invoice_lookup',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->dropIndex('request_items_supplier_invoice_lookup');
            $table->dropConstrainedForeignId('supplier_invoice_uploaded_by');
            $table->dropColumn([
                'supplier_invoice_number',
                'supplier_invoice_date',
                'supplier_invoice_received_date',
                'supplier_invoice_due_date',
                'supplier_invoice_path',
            ]);
        });
    }
};
