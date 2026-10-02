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
        Schema::table('ships', function (Blueprint $table) {
            if (! Schema::hasColumn('ships', 'port_id')) {
                $table->uuid('port_id')->nullable()->after('ship_company_id');
                $table->foreign('port_id')->references('id')->on('ports')->nullOnDelete();
            }
            if (! Schema::hasColumn('ships', 'length')) {
                $table->decimal('length', 8, 2)->nullable()->after('gross_tonnage')->comment('Panjang kapal (LOA) dalam meter');
            }
            if (! Schema::hasColumn('ships', 'captain_name')) {
                $table->string('captain_name')->nullable()->after('call_sign')->comment('Nama Nahkoda');
            }
            if (! Schema::hasColumn('ships', 'captain_phone')) {
                $table->string('captain_phone')->nullable()->after('captain_name')->comment('Nomor Telepon Nahkoda');
            }
            if (! Schema::hasColumn('ships', 'arrival_notes')) {
                $table->text('arrival_notes')->nullable()->after('eta');
            }
            if (! Schema::hasColumn('ships', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('is_active');
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ships', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('ships', 'created_by')) {
                $table->dropForeign(['created_by']);
                $columnsToDrop[] = 'created_by';
            }
            if (Schema::hasColumn('ships', 'arrival_notes')) {
                $columnsToDrop[] = 'arrival_notes';
            }
            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
