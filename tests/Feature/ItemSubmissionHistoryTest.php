<?php

use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestHistory;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use App\Support\RequestItemHistoryBuilder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->withoutVite();
});

test('items have submission history tracking rounds and previous unselected status across approvals and requests', function () {
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Direktur', 'guard_name' => 'web']);

    $admin = User::factory()->create(['name' => 'Bu Titik']);
    $admin->assignRole('Admin');

    $direktur = User::factory()->create(['name' => 'Pak Ryan']);
    $direktur->assignRole('Direktur');

    $company = ShipCompany::create([
        'code' => 'HIST-'.Str::upper(Str::random(4)),
        'name' => 'PT Pelayaran History Test',
        'is_active' => true,
    ]);

    $ship = Ship::create([
        'ship_company_id' => $company->id,
        'name' => 'KM Uji Riwayat',
        'status' => 'Sandar',
        'is_active' => true,
    ]);

    $port = Port::create([
        'code' => Str::upper(Str::random(6)),
        'name' => 'Pelabuhan Manyar',
        'city' => 'Gresik',
        'country' => 'ID',
        'is_active' => true,
    ]);

    $workOrder = WorkOrder::create([
        'system_number' => 'SPK-'.Str::upper(Str::random(6)),
        'client_number' => 'CLIENT-HIST-01',
        'company_id' => $company->id,
        'status' => 'accepted',
        'created_by' => $admin->id,
    ]);

    $portCall = PortCall::create([
        'job_number' => 'JOB-HIST-'.Str::upper(Str::random(5)),
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'berthed',
        'eta_at' => today()->subDays(2),
        'etd_at' => today()->addDays(2),
    ]);

    $req = ShipRequest::create([
        'request_number' => 'PGJ-HIST-'.Str::upper(Str::random(5)),
        'ship_id' => $ship->id,
        'company_id' => $company->id,
        'port_id' => $port->id,
        'port_call_id' => $portCall->id,
        'request_type' => 'deck',
        'status' => 'diajukan_ke_direktur',
        'request_date' => today()->toDateString(),
        'created_by' => $admin->id,
    ]);

    // Item 1: Disetujui pada putaran 1
    $item1 = RequestItem::create([
        'request_id' => $req->id,
        'item_name' => 'Jasa Labuh Putaran 1',
        'item_type' => 'deck',
        'quantity' => 1,
        'unit' => 'Hari',
        'hpp_price' => 1500000,
        'director_status' => 'approved',
        'status' => 'disetujui',
        'required_date' => today()->toDateString(),
    ]);

    // Item 2: Belum dipilih pada putaran 1, lalu diajukan ulang pada putaran 2
    $item2 = RequestItem::create([
        'request_id' => $req->id,
        'item_name' => 'Tali Tambat Putaran 2',
        'item_type' => 'deck',
        'quantity' => 2,
        'unit' => 'Roll',
        'hpp_price' => 3000000,
        'director_status' => 'pending',
        'status' => 'diajukan_ke_direktur',
        'required_date' => today()->toDateString(),
    ]);

    // Log History Putaran 1: Pengajuan awal oleh Bu Titik
    RequestHistory::create([
        'request_id' => $req->id,
        'user_id' => $admin->id,
        'actor_name' => 'Bu Titik',
        'actor_role' => 'Admin',
        'action' => 'submitted_to_director',
        'title' => 'Pengajuan Dikirim ke Pak Ryan (Direktur)',
        'submission_date' => today()->subDay()->toDateString(),
        'action_date' => now()->subDay(),
        'items_snapshot' => [
            ['item_id' => $item1->id, 'item_name' => $item1->item_name, 'hpp_price' => 1500000, 'status' => 'diajukan_ke_direktur', 'director_status' => 'pending'],
            ['item_id' => $item2->id, 'item_name' => $item2->item_name, 'hpp_price' => 3000000, 'status' => 'diajukan_ke_direktur', 'director_status' => 'pending'],
        ],
    ]);

    // Log History Putaran 1: Keputusan Pak Ryan (hanya item 1 disetujui, item 2 tidak dipilih)
    RequestHistory::create([
        'request_id' => $req->id,
        'user_id' => $direktur->id,
        'actor_name' => 'Pak Ryan',
        'actor_role' => 'Direktur',
        'action' => 'director_partial_approval',
        'title' => 'Keputusan Direktur: Disetujui Sebagian oleh Pak Ryan',
        'notes' => '1 item disetujui, 1 item dikembalikan ke Bu Titik',
        'submission_date' => today()->subDay()->toDateString(),
        'action_date' => now()->subDay()->addMinutes(30),
        'items_snapshot' => [
            ['item_id' => $item1->id, 'item_name' => $item1->item_name, 'hpp_price' => 1500000, 'status' => 'disetujui', 'director_status' => 'approved'],
            ['item_id' => $item2->id, 'item_name' => $item2->item_name, 'hpp_price' => 3000000, 'status' => 'pending', 'director_status' => 'pending', 'director_notes' => 'Belum dipilih Direktur.'],
        ],
    ]);

    // Log History Putaran 2: Bu Titik mengajukan ulang item 2
    RequestHistory::create([
        'request_id' => $req->id,
        'user_id' => $admin->id,
        'actor_name' => 'Bu Titik',
        'actor_role' => 'Admin',
        'action' => 'resubmitted_to_director',
        'title' => 'Pengajuan Ulang ke Pak Ryan (Direktur)',
        'submission_date' => today()->toDateString(),
        'action_date' => now(),
        'items_snapshot' => [
            ['item_id' => $item2->id, 'item_name' => $item2->item_name, 'hpp_price' => 3000000, 'status' => 'diajukan_ke_direktur', 'director_status' => 'pending'],
        ],
    ]);

    // Test Builder logic directly
    $freshReq = ShipRequest::with(['items', 'histories'])->find($req->id);
    RequestItemHistoryBuilder::attachHistoryToRequestItems($freshReq);

    $freshItem1 = $freshReq->items->firstWhere('id', $item1->id);
    $freshItem2 = $freshReq->items->firstWhere('id', $item2->id);

    expect($freshItem1->submission_count)->toBe(1)
        ->and($freshItem1->submission_round_label)->toBe('Pengajuan Pertama')
        ->and($freshItem1->was_previously_unselected)->toBeFalse();

    expect($freshItem2->submission_count)->toBe(2)
        ->and($freshItem2->submission_round_label)->toContain('Pengajuan Kedua')
        ->and($freshItem2->was_previously_unselected)->toBeTrue()
        ->and(count($freshItem2->submission_history))->toBe(2)
        ->and($freshItem2->submission_history[0]['decision_status'])->toBe('unselected')
        ->and($freshItem2->submission_history[1]['decision_status'])->toBe('pending');

    // Test Approvals Show endpoint
    $this->actingAs($direktur)
        ->get(route('approvals.detail', $portCall->job_number))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Approvals/Show')
            ->has('requests.0.items', 2)
            ->where('requests.0.items.1.submission_count', 2)
            ->where('requests.0.items.1.was_previously_unselected', true)
        );

    // Test Requests Show endpoint
    $this->actingAs($admin)
        ->get(route('requests.detail', $portCall->job_number))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->has('requests.0.items', 2)
            ->where('requests.0.items.1.submission_count', 2)
            ->where('requests.0.items.1.was_previously_unselected', true)
        );
});
