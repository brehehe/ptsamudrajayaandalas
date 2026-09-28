<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ship_companies')) {
            Schema::create('ship_companies', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('code')->nullable();
                $table->string('name')->index();
                $table->text('address')->nullable();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('ships')) {
            Schema::create('ships', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('ship_company_id')->nullable()->references('id')->on('ship_companies')->nullOnDelete();
                $table->string('imo_number')->nullable()->index();
                $table->string('name')->index();
                $table->string('call_sign')->nullable();
                $table->string('flag')->nullable();
                $table->string('ship_type')->nullable();
                $table->integer('gross_tonnage')->nullable();
                $table->string('status')->default('Akan Datang')->index();
                $table->timestamp('eta')->nullable();
                $table->string('agent_name')->nullable();
                $table->string('image')->nullable();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('port_calls')) {
            Schema::create('port_calls', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('job_number')->nullable()->index();
                $table->uuid('work_order_id')->nullable();
                $table->uuid('ship_id')->nullable()->index();
                $table->uuid('port_id')->nullable();
                $table->string('status')->default('scheduled');
                $table->timestamp('eta_at')->nullable();
                $table->timestamp('etd_at')->nullable();
                $table->timestamp('arrived_at')->nullable();
                $table->timestamp('berthed_at')->nullable();
                $table->timestamp('departed_at')->nullable();
                $table->string('financial_status')->nullable();
                $table->boolean('arrival_payment_exception')->default(false);
                $table->text('arrival_payment_exception_note')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('requests')) {
            Schema::create('requests', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('request_number')->unique();
                $table->uuid('ship_id')->index();
                $table->unsignedBigInteger('created_by')->nullable()->index();
                $table->string('status')->default('Menunggu Approval')->index();
                $table->date('request_date')->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->uuid('port_call_id')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('request_items')) {
            Schema::create('request_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('request_id')->index();
                $table->uuid('product_id')->nullable();
                $table->uuid('service_id')->nullable();
                $table->string('item_type')->nullable();
                $table->string('item_name');
                $table->string('unit')->nullable();
                $table->decimal('quantity', 10, 2)->default(1);
                $table->date('required_date')->nullable();
                $table->string('required_time')->nullable();
                $table->decimal('hpp_price', 15, 2)->nullable();
                $table->decimal('selling_price', 15, 2)->nullable();
                $table->string('status')->default('pending');
                $table->boolean('is_urgent')->default(false);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('ports')) {
            Schema::create('ports', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('code', 10)->unique();
                $table->string('name')->index();
                $table->string('city');
                $table->string('country', 2)->default('ID');
                $table->string('timezone')->default('Asia/Jakarta');
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('vendors')) {
            Schema::create('vendors', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('code', 20)->unique();
                $table->string('name')->index();
                $table->string('email')->nullable();
                $table->string('phone')->nullable();
                $table->text('address')->nullable();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('work_orders')) {
            Schema::create('work_orders', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('system_number')->unique();
                $table->string('client_number')->nullable();
                $table->uuid('company_id')->nullable();
                $table->date('document_date')->nullable();
                $table->timestamp('received_at')->nullable();
                $table->string('source')->default('email');
                $table->string('status')->default('accepted');
                $table->text('revision_reason')->nullable();
                $table->string('document_path')->nullable();
                $table->string('client_pic_name')->nullable();
                $table->string('client_pic_contact')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('assigned_to')->nullable();
                $table->unsignedBigInteger('reviewed_by')->nullable();
                $table->timestamp('submitted_at')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->uuid('planned_ship_id')->nullable();
                $table->uuid('planned_port_id')->nullable();
                $table->timestamp('planned_eta_at')->nullable();
                $table->timestamp('planned_etd_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('invoices')) {
            Schema::create('invoices', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('invoice_number')->unique();
                $table->uuid('port_call_id')->nullable();
                $table->uuid('company_id')->nullable();
                $table->uuid('request_id')->nullable();
                $table->string('invoice_type')->default('agency');
                $table->date('invoice_date')->nullable();
                $table->date('due_date')->nullable();
                $table->decimal('subtotal', 15, 2)->default(0);
                $table->decimal('addon_total', 15, 2)->default(0);
                $table->decimal('discount', 15, 2)->default(0);
                $table->decimal('tax', 15, 2)->default(0);
                $table->decimal('grand_total', 15, 2)->default(0);
                $table->decimal('paid_amount', 15, 2)->default(0);
                $table->decimal('outstanding_amount', 15, 2)->default(0);
                $table->string('currency', 3)->default('IDR');
                $table->string('status')->default('draft');
                $table->string('delivery_status')->default('pending');
                $table->string('signed_document_path')->nullable();
                $table->integer('version')->default(1);
                $table->text('notes')->nullable();
                $table->timestamp('released_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('outgoing_payments')) {
            Schema::create('outgoing_payments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('port_call_id')->nullable();
                $table->string('payment_type');
                $table->date('payment_date')->nullable();
                $table->decimal('amount', 15, 2)->default(0);
                $table->string('currency', 3)->default('IDR');
                $table->string('recipient');
                $table->string('reference_number')->unique();
                $table->string('proof_path')->nullable();
                $table->string('verification_status')->default('pending');
                $table->unsignedBigInteger('recorded_by')->nullable();
                $table->unsignedBigInteger('verified_by')->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('client_receipts')) {
            Schema::create('client_receipts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('company_id')->nullable();
                $table->date('received_date')->nullable();
                $table->decimal('amount', 15, 2)->default(0);
                $table->string('currency', 3)->default('IDR');
                $table->string('destination_account')->nullable();
                $table->string('bank_reference')->unique();
                $table->string('proof_path')->nullable();
                $table->string('status')->default('confirmed');
                $table->unsignedBigInteger('recorded_by')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('daily_reports')) {
            Schema::create('daily_reports', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('port_call_id')->nullable();
                $table->unsignedBigInteger('officer_id')->nullable();
                $table->date('report_date')->nullable();
                $table->string('status')->default('submitted');
                $table->boolean('no_activity')->default(false);
                $table->text('summary');
                $table->timestamp('submitted_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('request_items');
        Schema::dropIfExists('requests');
        Schema::dropIfExists('port_calls');
        Schema::dropIfExists('ships');
    }
};
