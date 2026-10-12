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
        Schema::table('expense_requests', function (Blueprint $table) {
            $table->foreignUuid('port_call_id')->nullable()->change();
            $table->string('scope')->default('vessel')->index()->after('request_number');
            $table->string('category')->nullable()->index()->after('scope');
            $table->string('supporting_document_path')->nullable()->after('notes');
            $table->decimal('realized_amount', 15, 2)->nullable()->after('supporting_document_path');
            $table->date('realized_date')->nullable()->after('realized_amount');
            $table->string('payment_reference')->nullable()->after('realized_date');
            $table->string('payment_proof_path')->nullable()->after('payment_reference');
            $table->foreignId('realized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('realized_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expense_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('realized_by');
            $table->dropColumn([
                'scope',
                'category',
                'supporting_document_path',
                'realized_amount',
                'realized_date',
                'payment_reference',
                'payment_proof_path',
                'realized_at',
            ]);
            $table->foreignUuid('port_call_id')->nullable(false)->change();
        });
    }
};
