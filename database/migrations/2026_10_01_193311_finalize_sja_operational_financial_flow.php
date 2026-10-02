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
        $this->addLifecycleColumns();
        $this->createPaymentAllocations();
        $this->createCompletionNotes();
        $this->createCostReconciliations();
        $this->createClientReceiptAllocations();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_receipt_allocations');
        Schema::dropIfExists('cost_reconciliations');
        Schema::dropIfExists('completion_notes');
        Schema::dropIfExists('outgoing_payment_allocations');
    }

    private function addLifecycleColumns(): void
    {
        $this->addColumns('users', [
            'account_status' => fn (Blueprint $table) => $table->string('account_status')->default('active')->index(),
            'invitation_sent_at' => fn (Blueprint $table) => $table->timestamp('invitation_sent_at')->nullable(),
            'activated_at' => fn (Blueprint $table) => $table->timestamp('activated_at')->nullable(),
            'last_login_at' => fn (Blueprint $table) => $table->timestamp('last_login_at')->nullable(),
        ]);

        $this->addColumns('work_orders', [
            'operational_completed_at' => fn (Blueprint $table) => $table->timestamp('operational_completed_at')->nullable(),
            'closed_at' => fn (Blueprint $table) => $table->timestamp('closed_at')->nullable(),
        ]);

        $this->addColumns('port_calls', [
            'completion_note_due_at' => fn (Blueprint $table) => $table->timestamp('completion_note_due_at')->nullable()->index(),
            'reconciled_at' => fn (Blueprint $table) => $table->timestamp('reconciled_at')->nullable(),
        ]);

        $this->addColumns('cost_documents', [
            'due_date' => fn (Blueprint $table) => $table->date('due_date')->nullable(),
            'tax_amount' => fn (Blueprint $table) => $table->decimal('tax_amount', 15, 2)->default(0),
            'payment_status' => fn (Blueprint $table) => $table->string('payment_status')->default('unpaid')->index(),
            'paid_amount' => fn (Blueprint $table) => $table->decimal('paid_amount', 15, 2)->default(0),
            'paid_at' => fn (Blueprint $table) => $table->timestamp('paid_at')->nullable(),
        ]);

        $this->addColumns('invoices', [
            'printed_at' => fn (Blueprint $table) => $table->timestamp('printed_at')->nullable(),
            'signed_at' => fn (Blueprint $table) => $table->timestamp('signed_at')->nullable(),
            'sent_at' => fn (Blueprint $table) => $table->timestamp('sent_at')->nullable(),
            'paid_at' => fn (Blueprint $table) => $table->timestamp('paid_at')->nullable(),
            'delivery_proof_path' => fn (Blueprint $table) => $table->string('delivery_proof_path')->nullable(),
        ]);

        $this->addColumns('operational_activities', [
            'vessel_position' => fn (Blueprint $table) => $table->string('vessel_position')->nullable(),
            'cargo_activity' => fn (Blueprint $table) => $table->string('cargo_activity')->nullable(),
            'cargo_quantity' => fn (Blueprint $table) => $table->decimal('cargo_quantity', 15, 2)->nullable(),
            'cargo_unit' => fn (Blueprint $table) => $table->string('cargo_unit')->nullable(),
            'progress_percent' => fn (Blueprint $table) => $table->unsignedSmallInteger('progress_percent')->nullable(),
            'constraints' => fn (Blueprint $table) => $table->text('constraints')->nullable(),
            'next_plan' => fn (Blueprint $table) => $table->text('next_plan')->nullable(),
        ]);
    }

    private function createPaymentAllocations(): void
    {
        if (Schema::hasTable('outgoing_payment_allocations')) {
            return;
        }

        Schema::create('outgoing_payment_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('outgoing_payment_id')->constrained('outgoing_payments')->cascadeOnDelete();
            $table->foreignUuid('cost_document_id')->constrained('cost_documents')->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->timestamps();
            $table->unique(['outgoing_payment_id', 'cost_document_id'], 'payment_cost_document_unique');
            $table->index(['cost_document_id', 'amount']);
        });
    }

    private function createCompletionNotes(): void
    {
        if (Schema::hasTable('completion_notes')) {
            return;
        }

        Schema::create('completion_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('port_call_id')->unique()->constrained('port_calls')->cascadeOnDelete();
            $table->string('document_number')->unique();
            $table->timestamp('departed_at');
            $table->date('issued_at');
            $table->date('downloaded_at')->nullable();
            $table->timestamp('uploaded_at');
            $table->timestamp('due_at')->nullable()->index();
            $table->string('document_path');
            $table->decimal('actual_amount', 15, 2);
            $table->string('status')->default('uploaded')->index();
            $table->text('notes')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    private function createCostReconciliations(): void
    {
        if (Schema::hasTable('cost_reconciliations')) {
            return;
        }

        Schema::create('cost_reconciliations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('port_call_id')->unique()->constrained('port_calls')->cascadeOnDelete();
            $table->foreignUuid('completion_note_id')->unique()->constrained('completion_notes')->restrictOnDelete();
            $table->decimal('initial_total', 15, 2);
            $table->decimal('actual_total', 15, 2);
            $table->decimal('variance', 15, 2);
            $table->decimal('adjustment', 15, 2)->default(0);
            $table->string('status')->default('completed')->index();
            $table->text('notes')->nullable();
            $table->foreignId('reconciled_by')->constrained('users');
            $table->timestamp('reconciled_at');
            $table->timestamps();
        });
    }

    private function createClientReceiptAllocations(): void
    {
        if (Schema::hasTable('client_receipt_allocations')) {
            return;
        }

        Schema::create('client_receipt_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('client_receipt_id')->constrained('client_receipts')->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->constrained('invoices')->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->timestamps();
            $table->unique(['client_receipt_id', 'invoice_id'], 'client_receipt_invoice_unique');
            $table->index(['invoice_id', 'amount']);
        });
    }

    /** @param array<string, callable(Blueprint): void> $columns */
    private function addColumns(string $tableName, array $columns): void
    {
        if (! Schema::hasTable($tableName)) {
            return;
        }

        foreach ($columns as $column => $definition) {
            if (! Schema::hasColumn($tableName, $column)) {
                Schema::table($tableName, $definition);
            }
        }
    }
};
