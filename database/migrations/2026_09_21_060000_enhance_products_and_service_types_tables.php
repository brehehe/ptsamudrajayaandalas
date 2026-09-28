<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Service Types table (Sandar, Labuh, dll.)
        if (! Schema::hasTable('service_types')) {
            Schema::create('service_types', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('code', 20)->unique();
                $table->string('name', 100);
                $table->text('description')->nullable();
                $table->boolean('is_default')->default(false);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Enhance or create products table
        if (! Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('code', 30)->unique();
                $table->string('name');
                $table->string('category', 50)->default('Umum');
                $table->string('item_type', 30)->default('non_jasa')->index(); // 'jasa' | 'non_jasa'
                $table->string('unit', 30)->default('unit');
                $table->decimal('hpp_default', 15, 2)->default(0.00);
                $table->decimal('selling_price_default', 15, 2)->default(0.00);
                $table->uuid('vendor_id')->nullable()->index();
                $table->decimal('price_sandar', 15, 2)->nullable();
                $table->decimal('price_labuh', 15, 2)->nullable();
                $table->decimal('tax_rate', 5, 2)->default(0.00);
                $table->string('image')->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        } else {
            Schema::table('products', function (Blueprint $table) {
                if (! Schema::hasColumn('products', 'item_type')) {
                    $table->string('item_type', 30)->default('non_jasa')->index(); // 'jasa' | 'non_jasa'
                }
                if (! Schema::hasColumn('products', 'vendor_id')) {
                    $table->uuid('vendor_id')->nullable()->index();
                }
                if (! Schema::hasColumn('products', 'price_sandar')) {
                    $table->decimal('price_sandar', 15, 2)->nullable();
                }
                if (! Schema::hasColumn('products', 'price_labuh')) {
                    $table->decimal('price_labuh', 15, 2)->nullable();
                }
                if (! Schema::hasColumn('products', 'tax_rate')) {
                    $table->decimal('tax_rate', 5, 2)->default(0.00); // e.g. 2.00 for PPh 23 or 11.00 for PPN
                }
            });
        }

        // 3. Product Port Prices matrix table
        if (! Schema::hasTable('product_port_prices')) {
            Schema::create('product_port_prices', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('product_id')->index();
                $table->uuid('port_id')->index();
                $table->string('service_type', 30)->default('Sandar')->index(); // 'Sandar' | 'Labuh'
                $table->decimal('selling_price', 15, 2)->default(0.00);
                $table->decimal('hpp_price', 15, 2)->nullable();
                $table->timestamps();
            });
        }

        // 4. Enhance requests table with operational attributes
        if (Schema::hasTable('requests')) {
            Schema::table('requests', function (Blueprint $table) {
                if (! Schema::hasColumn('requests', 'port_id')) {
                    $table->uuid('port_id')->nullable()->index();
                }
                if (! Schema::hasColumn('requests', 'service_type')) {
                    $table->string('service_type', 30)->default('Sandar')->index();
                }
                if (! Schema::hasColumn('requests', 'company_id')) {
                    $table->uuid('company_id')->nullable()->index();
                }
                if (! Schema::hasColumn('requests', 'forwarded_to_director_at')) {
                    $table->timestamp('forwarded_to_director_at')->nullable();
                }
                if (! Schema::hasColumn('requests', 'director_reviewed_at')) {
                    $table->timestamp('director_reviewed_at')->nullable();
                }
            });
        }

        // 5. Enhance request_items table
        if (Schema::hasTable('request_items')) {
            Schema::table('request_items', function (Blueprint $table) {
                if (! Schema::hasColumn('request_items', 'vendor_id')) {
                    $table->uuid('vendor_id')->nullable()->index();
                }
                if (! Schema::hasColumn('request_items', 'attachment_path')) {
                    $table->string('attachment_path')->nullable();
                }
                if (! Schema::hasColumn('request_items', 'director_status')) {
                    $table->string('director_status', 30)->default('pending')->index(); // pending | approved | rejected
                }
                if (! Schema::hasColumn('request_items', 'director_notes')) {
                    $table->text('director_notes')->nullable();
                }
                if (! Schema::hasColumn('request_items', 'is_invoiced')) {
                    $table->boolean('is_invoiced')->default(false);
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_port_prices');
        Schema::dropIfExists('service_types');
    }
};
