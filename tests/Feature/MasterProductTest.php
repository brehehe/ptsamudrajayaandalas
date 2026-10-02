<?php

use App\Models\Port;
use App\Models\Product;
use App\Models\ProductPortPrice;
use App\Models\User;
use App\Models\Vendor;
use Spatie\Permission\Models\Role;

test('authenticated user can view master products index', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/master/products');

    $response->assertStatus(200);
});

test('user can create a product with port price matrix', function () {
    $user = User::factory()->create();
    $vendor = Vendor::create([
        'code' => 'VND-TEST-01',
        'name' => 'PT Pertamina Patra Niaga Palembang',
        'is_active' => true,
    ]);
    $port = Port::create([
        'code' => 'IDPLM',
        'name' => 'Pelabuhan Boom Baru Palembang',
        'city' => 'Palembang',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);

    $postData = [
        'code' => 'PRD-MFO-01',
        'name' => 'Marine Fuel Oil (MFO 380)',
        'category' => 'BBM',
        'item_type' => 'non_jasa',
        'unit' => 'Liter',
        'hpp_default' => 12500,
        'selling_price_default' => 14000,
        'vendor_id' => $vendor->id,
        'price_sandar' => 14000,
        'price_labuh' => 14800,
        'tax_rate' => 0.00,
        'description' => 'Bahan bakar kapal standar ISO 8217',
        'port_prices' => [
            [
                'port_id' => $port->id,
                'service_type' => 'Sandar',
                'selling_price' => 14200,
                'hpp_price' => 12600,
            ],
            [
                'port_id' => $port->id,
                'service_type' => 'Labuh',
                'selling_price' => 15000,
                'hpp_price' => 13000,
            ],
        ],
    ];

    $response = $this->actingAs($user)->post('/master/products', $postData);

    $response->assertRedirect('/master/products');

    $this->assertDatabaseHas('products', [
        'code' => 'PRD-MFO-01',
        'name' => 'Marine Fuel Oil (MFO 380)',
        'vendor_id' => $vendor->id,
        'item_type' => 'non_jasa',
    ]);

    $product = Product::where('code', 'PRD-MFO-01')->first();

    $this->assertDatabaseHas('product_port_prices', [
        'product_id' => $product->id,
        'port_id' => $port->id,
        'service_type' => 'Sandar',
        'selling_price' => 14200,
    ]);
});

test('product lookup endpoint returns price based on port and service type', function () {
    $user = User::factory()->create();
    $port = Port::create([
        'code' => 'IDJKT',
        'name' => 'Tanjung Priok',
        'city' => 'Jakarta',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);

    $product = Product::create([
        'code' => 'PRD-WATER-01',
        'name' => 'Air Bersih Dermaga',
        'category' => 'Air',
        'item_type' => 'non_jasa',
        'unit' => 'Ton',
        'hpp_default' => 40000,
        'selling_price_default' => 55000,
        'price_sandar' => 55000,
        'price_labuh' => 70000,
        'is_active' => true,
    ]);

    ProductPortPrice::create([
        'product_id' => $product->id,
        'port_id' => $port->id,
        'service_type' => 'Labuh',
        'selling_price' => 75000,
        'hpp_price' => 50000,
    ]);

    // Request with matching port price
    $response = $this->actingAs($user)->getJson("/master/products/lookup?product_id={$product->id}&port_id={$port->id}&service_type=Labuh");

    $response->assertStatus(200);
    $response->assertJson([
        'success' => true,
        'data' => [
            'selling_price' => 75000,
            'hpp_price' => 50000,
        ],
    ]);
});

test('authenticated user can view master companies and roles', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']));

    $compResponse = $this->actingAs($user)->get('/master/companies');
    $compResponse->assertStatus(200);

    $roleResponse = $this->actingAs($user)->get('/master/roles');
    $roleResponse->assertStatus(200);

    $typeResponse = $this->actingAs($user)->get('/master/service-types');
    $typeResponse->assertStatus(200);
});
