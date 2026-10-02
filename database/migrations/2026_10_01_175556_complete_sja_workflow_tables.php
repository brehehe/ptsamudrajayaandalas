<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addUserProfileColumns();

        if (! Schema::hasTable('work_order_items')) {
            Schema::create('work_order_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('work_order_id')->constrained('work_orders')->cascadeOnDelete();
                $table->uuid('service_id')->nullable()->index();
                $table->string('name');
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('cost_documents')) {
            Schema::create('cost_documents', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('port_call_id')->constrained('port_calls')->cascadeOnDelete();
                $table->foreignUuid('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
                $table->string('document_type')->index();
                $table->string('document_number')->nullable();
                $table->string('issuer_name');
                $table->date('document_date');
                $table->date('received_date');
                $table->string('currency', 3)->default('IDR');
                $table->decimal('estimated_total', 15, 2)->nullable();
                $table->decimal('verified_total', 15, 2);
                $table->string('status')->default('received')->index();
                $table->string('document_path')->nullable();
                $table->foreignId('recorded_by')->constrained('users');
                $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
                $table->unique(['vendor_id', 'document_number'], 'cost_documents_vendor_number_unique');
            });
        }

        if (! Schema::hasTable('cost_document_items')) {
            Schema::create('cost_document_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('cost_document_id')->constrained('cost_documents')->cascadeOnDelete();
                $table->foreignUuid('request_item_id')->nullable()->constrained('request_items')->nullOnDelete();
                $table->string('description');
                $table->decimal('quantity', 12, 2)->default(1);
                $table->string('unit')->default('Paket');
                $table->decimal('amount', 15, 2);
                $table->boolean('billable')->default(true);
                $table->string('billing_classification')->default('reimburse');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('expense_requests')) {
            Schema::create('expense_requests', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('request_number')->unique();
                $table->foreignUuid('port_call_id')->constrained('port_calls')->cascadeOnDelete();
                $table->unsignedInteger('version')->default(1);
                $table->string('status')->default('draft')->index();
                $table->string('currency', 3)->default('IDR');
                $table->decimal('total', 15, 2);
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->constrained('users');
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('submitted_at')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('expense_request_items')) {
            Schema::create('expense_request_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('expense_request_id')->constrained('expense_requests')->cascadeOnDelete();
                $table->foreignUuid('cost_document_item_id')->nullable()->constrained('cost_document_items')->nullOnDelete();
                $table->foreignUuid('request_item_id')->nullable()->constrained('request_items')->nullOnDelete();
                $table->string('description');
                $table->decimal('amount', 15, 2);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('funding_requests')) {
            Schema::create('funding_requests', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('expense_request_id')->unique()->constrained('expense_requests')->cascadeOnDelete();
                $table->string('kopra_reference')->nullable()->unique();
                $table->date('submitted_date')->nullable();
                $table->decimal('requested_amount', 15, 2);
                $table->decimal('approved_amount', 15, 2)->nullable();
                $table->string('status')->default('approved_director')->index();
                $table->string('document_path')->nullable();
                $table->foreignId('created_by')->constrained('users');
                $table->foreignId('authorized_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('authorized_at')->nullable();
                $table->timestamp('kopra_submitted_at')->nullable();
                $table->timestamp('kopra_approved_at')->nullable();
                $table->timestamp('disbursed_at')->nullable();
                $table->string('destination_account')->nullable();
                $table->text('decision_notes')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('funding_receipts')) {
            Schema::create('funding_receipts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('funding_request_id')->constrained('funding_requests')->cascadeOnDelete();
                $table->date('received_date');
                $table->decimal('amount', 15, 2);
                $table->string('destination_account');
                $table->string('reference_number')->unique();
                $table->string('proof_path');
                $table->foreignId('recorded_by')->constrained('users');
                $table->timestamps();
            });
        }

        $this->addFundingColumns();
        $this->addOutgoingPaymentColumns();
    }

    public function down(): void
    {
        Schema::table('outgoing_payments', function (Blueprint $table) {
            $columns = [
                'funding_request_id',
                'beneficiary_user_id',
                'payment_destination',
                'notes',
                'actual_amount',
                'remaining_amount',
                'usage_proof_path',
                'realized_at',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('outgoing_payments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::dropIfExists('funding_receipts');
        Schema::dropIfExists('funding_requests');
        Schema::dropIfExists('expense_request_items');
        Schema::dropIfExists('expense_requests');
        Schema::dropIfExists('cost_document_items');
        Schema::dropIfExists('cost_documents');
        Schema::dropIfExists('work_order_items');
    }

    private function addFundingColumns(): void
    {
        $columns = [
            'kopra_submitted_at' => fn (Blueprint $table) => $table->timestamp('kopra_submitted_at')->nullable(),
            'kopra_approved_at' => fn (Blueprint $table) => $table->timestamp('kopra_approved_at')->nullable(),
            'disbursed_at' => fn (Blueprint $table) => $table->timestamp('disbursed_at')->nullable(),
            'destination_account' => fn (Blueprint $table) => $table->string('destination_account')->nullable(),
            'decision_notes' => fn (Blueprint $table) => $table->text('decision_notes')->nullable(),
        ];

        foreach ($columns as $column => $definition) {
            if (! Schema::hasColumn('funding_requests', $column)) {
                Schema::table('funding_requests', $definition);
            }
        }
    }

    private function addUserProfileColumns(): void
    {
        $columns = [
            'employee_id' => fn (Blueprint $table) => $table->string('employee_id')->nullable()->unique(),
            'phone' => fn (Blueprint $table) => $table->string('phone')->nullable(),
            'job_title' => fn (Blueprint $table) => $table->string('job_title')->nullable(),
            'is_active' => fn (Blueprint $table) => $table->boolean('is_active')->default(true)->index(),
            'deleted_at' => fn (Blueprint $table) => $table->softDeletes(),
        ];

        foreach ($columns as $column => $definition) {
            if (! Schema::hasColumn('users', $column)) {
                Schema::table('users', $definition);
            }
        }
    }

    private function addOutgoingPaymentColumns(): void
    {
        $columns = [
            'funding_request_id' => fn (Blueprint $table) => $table->uuid('funding_request_id')->nullable()->index(),
            'beneficiary_user_id' => fn (Blueprint $table) => $table->unsignedBigInteger('beneficiary_user_id')->nullable()->index(),
            'payment_destination' => fn (Blueprint $table) => $table->string('payment_destination')->nullable()->index(),
            'notes' => fn (Blueprint $table) => $table->text('notes')->nullable(),
            'actual_amount' => fn (Blueprint $table) => $table->decimal('actual_amount', 15, 2)->nullable(),
            'remaining_amount' => fn (Blueprint $table) => $table->decimal('remaining_amount', 15, 2)->nullable(),
            'usage_proof_path' => fn (Blueprint $table) => $table->string('usage_proof_path')->nullable(),
            'realized_at' => fn (Blueprint $table) => $table->timestamp('realized_at')->nullable(),
        ];

        foreach ($columns as $column => $definition) {
            if (! Schema::hasColumn('outgoing_payments', $column)) {
                Schema::table('outgoing_payments', $definition);
            }
        }
    }
};
