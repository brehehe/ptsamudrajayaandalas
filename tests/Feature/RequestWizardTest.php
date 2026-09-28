<?php

use App\Models\Port;
use App\Models\Product;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;

test('authenticated user can view request wizard creation page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/requests/create');

    $response->assertStatus(200);
});

test('lapangan user can submit wizard request with multiple items', function () {
    $user = User::factory()->create();
    $port = Port::create([
        'code' => 'IDJKT',
        'name' => 'Pelabuhan Tanjung Priok',
        'city' => 'Jakarta Utara',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);

    $jasaProduct = Product::create([
        'code' => 'SRV-TEST-01',
        'name' => 'Jasa Keagenan Kapal',
        'category' => 'Jasa Keagenan',
        'item_type' => 'jasa',
        'unit' => 'Pkt',
        'hpp_default' => 5000000,
        'selling_price_default' => 8500000,
        'price_sandar' => 8500000,
        'price_labuh' => 6500000,
        'tax_rate' => 2.00,
        'is_active' => true,
    ]);

    $nonJasaProduct = Product::create([
        'code' => 'BRG-TEST-01',
        'name' => 'Air Tawar (Fresh Water)',
        'category' => 'Perbekalan',
        'item_type' => 'non_jasa',
        'unit' => 'Ton',
        'hpp_default' => 45000,
        'selling_price_default' => 60000,
        'price_sandar' => 60000,
        'price_labuh' => 75000,
        'tax_rate' => 0.00,
        'is_active' => true,
    ]);

    $postData = [
        'port_id' => $port->id,
        'service_type' => 'Sandar',
        'is_new_company' => true,
        'new_company_name' => 'PT Pelayaran Samudra Nusantara',
        'is_new_ship' => true,
        'new_ship_name' => 'TB Nusantara Glory 01',
        'new_ship_imo' => 'IMO9988771',
        'notes' => 'Pengajuan mendesak untuk bunkering dan clearance',
        'items' => [
            [
                'product_id' => $jasaProduct->id,
                'item_name' => 'Jasa Keagenan Kapal',
                'item_type' => 'jasa',
                'quantity' => 1,
                'unit' => 'Pkt',
                'required_date' => now()->addDay()->toDateString(),
                'required_time' => '09:00',
                'is_urgent' => true,
                'notes' => 'Harap proses clearance secepatnya',
            ],
            [
                'product_id' => $nonJasaProduct->id,
                'item_name' => 'Air Tawar (Fresh Water)',
                'item_type' => 'non_jasa',
                'quantity' => 50,
                'unit' => 'Ton',
                'required_date' => now()->addDay()->toDateString(),
                'required_time' => '10:00',
                'is_urgent' => false,
                'notes' => 'Dermaga 03 utara',
            ],
        ],
    ];

    $response = $this->actingAs($user)->post('/requests/wizard', $postData);

    $response->assertRedirect('/requests');

    $this->assertDatabaseHas('ship_companies', [
        'name' => 'PT Pelayaran Samudra Nusantara',
    ]);

    $this->assertDatabaseHas('ships', [
        'name' => 'TB Nusantara Glory 01',
    ]);

    $this->assertDatabaseHas('requests', [
        'service_type' => 'Sandar',
        'status' => 'Menunggu Approval',
    ]);

    $this->assertDatabaseHas('request_items', [
        'item_name' => 'Jasa Keagenan Kapal',
        'quantity' => 1,
        'is_urgent' => true,
    ]);

    $this->assertDatabaseHas('request_items', [
        'item_name' => 'Air Tawar (Fresh Water)',
        'quantity' => 50,
        'is_urgent' => false,
    ]);
});

test('admin can forward selected items to director and split invoices', function () {
    $user = User::factory()->create();
    $company = ShipCompany::create([
        'code' => 'MSA',
        'name' => 'PT Mitra Samudra Agency',
        'is_active' => true,
    ]);
    $ship = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM Andalas Express',
        'imo_number' => 'IMO9123456',
        'status' => 'Sandar',
        'is_active' => true,
    ]);
    $port = Port::create([
        'code' => 'IDPLM',
        'name' => 'Pelabuhan Boom Baru Palembang',
        'city' => 'Palembang',
        'country' => 'Indonesia',
        'is_active' => true,
    ]);

    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-TEST-001',
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

    $itemJasa = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_name' => 'Jasa Keagenan & Clearance',
        'item_type' => 'jasa',
        'unit' => 'Pkt',
        'quantity' => 1,
        'selling_price' => 5000000,
        'hpp_price' => 3000000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);

    $itemReimburse = RequestItem::create([
        'request_id' => $shipRequest->id,
        'item_name' => 'BBM Solar Industri HSD',
        'item_type' => 'non_jasa',
        'unit' => 'Liter',
        'quantity' => 1000,
        'selling_price' => 15000000,
        'hpp_price' => 14000000,
        'status' => 'pending',
        'director_status' => 'pending',
    ]);

    // 1. Admin forwards to director
    $response = $this->actingAs($user)->post("/requests/{$shipRequest->id}/forward-director", [
        'selected_items' => [$itemJasa->id, $itemReimburse->id],
        'items' => [
            $itemJasa->id => [
                'selling_price' => 5500000,
                'hpp_price' => 3000000,
            ],
            $itemReimburse->id => [
                'selling_price' => 15500000,
                'hpp_price' => 14000000,
            ],
        ],
    ]);

    $response->assertRedirect();
    $shipRequest->refresh();
    expect($shipRequest->status)->toBe('Menunggu Approval Direktur');

    // 2. Direktur approves items
    $this->actingAs($user)->post("/approvals/items/{$itemJasa->id}", [
        'decision' => 'approved',
        'notes' => 'Disetujui untuk diproses',
    ]);
    $this->actingAs($user)->post("/approvals/items/{$itemReimburse->id}", [
        'decision' => 'approved',
        'notes' => 'Disetujui untuk dipesan ke vendor',
    ]);

    $itemJasa->refresh();
    $itemReimburse->refresh();
    expect($itemJasa->director_status)->toBe('approved');
    expect($itemReimburse->director_status)->toBe('approved');

    // 3. Admin splits invoices into Keagenan and Reimburse
    $splitResponse = $this->actingAs($user)->post("/requests/{$shipRequest->id}/split-invoices", [
        'invoice_type' => 'both',
        'materai' => 10000,
    ]);

    $splitResponse->assertRedirect();

    $this->assertDatabaseHas('invoices', [
        'company_id' => $company->id,
        'invoice_type' => 'agency',
    ]);

    $this->assertDatabaseHas('invoices', [
        'company_id' => $company->id,
        'invoice_type' => 'reimburse',
    ]);
});

test('user can append additional need items to an existing active request', function () {
    $user = User::factory()->create();
    $ship = Ship::create([
        'name' => 'KM Glory 88',
        'imo_number' => 'IMO8877665',
        'status' => 'Sandar',
        'is_active' => true,
    ]);

    $shipRequest = ShipRequest::create([
        'request_number' => 'REQ-TEST-SUSULAN',
        'ship_id' => $ship->id,
        'created_by' => $user->id,
        'status' => 'Menunggu Approval',
        'request_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($user)->post("/requests/{$shipRequest->id}/items", [
        'item_name' => 'Emergency Mooring Boat Support',
        'quantity' => 2,
        'unit' => 'Unit',
        'notes' => 'Permintaan susulan dari Nahkoda saat kapal bersiap lepas tali dermaga',
        'is_urgent' => true,
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('request_items', [
        'request_id' => $shipRequest->id,
        'item_name' => 'Emergency Mooring Boat Support',
        'quantity' => 2,
        'is_urgent' => true,
    ]);
});
