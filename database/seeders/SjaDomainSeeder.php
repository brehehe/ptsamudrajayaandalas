<?php

namespace Database\Seeders;

use App\Models\ClientReceipt;
use App\Models\DailyReport;
use App\Models\Invoice;
use App\Models\OutgoingPayment;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\Vendor;
use App\Models\WorkOrder;
use Illuminate\Database\Seeder;

class SjaDomainSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Ports
        $portsData = [
            ['code' => 'IDGRS', 'name' => 'Pelabuhan Gresik', 'city' => 'Gresik', 'country' => 'ID', 'timezone' => 'Asia/Jakarta'],
            ['code' => 'IDSUB', 'name' => 'Tanjung Perak Port', 'city' => 'Surabaya', 'country' => 'ID', 'timezone' => 'Asia/Jakarta'],
            ['code' => 'IDMYR', 'name' => 'Manyar Port (JIIPE)', 'city' => 'Gresik', 'country' => 'ID', 'timezone' => 'Asia/Jakarta'],
            ['code' => 'IDPKG', 'name' => 'Dermaga Khusus Petrokimia', 'city' => 'Gresik', 'country' => 'ID', 'timezone' => 'Asia/Jakarta'],
        ];

        $ports = [];
        foreach ($portsData as $p) {
            $ports[$p['code']] = Port::firstOrCreate(['code' => $p['code']], $p);
        }

        // 2. Seed Vendors
        $vendorsData = [
            [
                'code' => 'VND-001',
                'name' => 'PT Sumber Rejeki Marine',
                'email' => 'order@sumberrejekimarine.co.id',
                'phone' => '+62 31 398 1234',
                'address' => 'Jl. Kapten Dulasim No. 45, Gresik',
            ],
            [
                'code' => 'VND-002',
                'name' => 'PT Petro Laut Bunker',
                'email' => 'bunker@petrolaut.com',
                'phone' => '+62 31 398 5678',
                'address' => 'Kawasan Industri Gresik Blok B-12',
            ],
            [
                'code' => 'VND-003',
                'name' => 'Koperasi Nelayan & Perahu Tambat Gresik',
                'email' => 'kopnel.gresik@gmail.com',
                'phone' => '+62 812 3456 7890',
                'address' => 'Pelabuhan Rakyat Gresik Dermaga 2',
            ],
            [
                'code' => 'VND-004',
                'name' => 'PT Bahari Boga Samudra',
                'email' => 'supply@bahariboga.co.id',
                'phone' => '+62 31 740 9988',
                'address' => 'Jl. Veteran No. 102, Gresik',
            ],
            [
                'code' => 'VND-005',
                'name' => 'PT Sentosa Tehnik Maritim',
                'email' => 'workshop@sentosatehnik.com',
                'phone' => '+62 31 397 2233',
                'address' => 'Jl. Raya Manyar Km 11, Gresik',
            ],
        ];

        foreach ($vendorsData as $v) {
            Vendor::firstOrCreate(['code' => $v['code']], $v);
        }

        // Retrieve reference users and ships
        $prima = User::where('email', 'prima@gmail.com')->first() ?? User::first();
        $titik = User::where('email', 'titik@gmail.com')->first() ?? User::first();
        $gresikPort = $ports['IDGRS'] ?? Port::first();
        $ships = Ship::with('company')->get();

        // 3. Seed WorkOrders (SPK) & Port Calls
        if ($gresikPort && $ships->isNotEmpty()) {
            foreach ($ships as $idx => $ship) {
                $jobNum = sprintf('JOB-2026-%04d', $idx + 1);
                $spkSystemNum = sprintf('SPK-SJA-26-%04d', $idx + 1);
                $spkClientNum = sprintf('SPK/%s/%02d/2026', $ship->company ? ($ship->company->code ?? 'SJA') : 'SJA', $idx + 1);

                $status = match ($ship->status) {
                    'Sandar' => 'berthed',
                    'Labuh' => 'anchored',
                    'Akan Datang' => 'scheduled',
                    default => 'in_progress',
                };

                // Create Work Order (SPK)
                $workOrder = WorkOrder::firstOrCreate(
                    ['system_number' => $spkSystemNum],
                    [
                        'client_number' => $spkClientNum,
                        'company_id' => $ship->ship_company_id ?? ($ships[0]->ship_company_id ?? null),
                        'document_date' => now()->subDays(5 - $idx)->toDateString(),
                        'received_at' => now()->subDays(5 - $idx)->setTime(9, 0),
                        'source' => 'email',
                        'status' => 'accepted',
                        'client_pic_name' => 'Capt. Hendra Gunawan',
                        'client_pic_contact' => '+62 811 2233 4455',
                        'created_by' => $titik->id ?? 1,
                        'assigned_to' => $prima->id ?? 1,
                        'reviewed_by' => $titik->id ?? 1,
                        'submitted_at' => now()->subDays(5 - $idx)->setTime(10, 0),
                        'reviewed_at' => now()->subDays(5 - $idx)->setTime(11, 0),
                        'planned_ship_id' => $ship->id,
                        'planned_port_id' => $gresikPort->id,
                        'planned_eta_at' => now()->addDays($idx - 2)->setTime(8 + $idx * 2, 0),
                        'planned_etd_at' => now()->addDays($idx + 3)->setTime(16, 0),
                    ]
                );

                // Create Port Call linked to Work Order
                $portCall = PortCall::firstOrCreate(
                    ['job_number' => $jobNum],
                    [
                        'work_order_id' => $workOrder->id,
                        'ship_id' => $ship->id,
                        'port_id' => $gresikPort->id,
                        'status' => $status,
                        'eta_at' => now()->addDays($idx - 2)->setTime(8 + $idx * 2, 0),
                        'etd_at' => now()->addDays($idx + 3)->setTime(16, 0),
                        'arrived_at' => $status !== 'scheduled' ? now()->subDays(2 - $idx) : null,
                        'berthed_at' => $status === 'berthed' ? now()->subDay() : null,
                        'financial_status' => 'pending_reconciliation',
                    ]
                );

                // Attach port_call_id to existing ShipRequests if available
                $existingRequest = ShipRequest::withTrashed()->where('ship_id', $ship->id)->first();
                if ($existingRequest) {
                    if ($existingRequest->trashed()) {
                        $existingRequest->restore();
                    }
                    $existingRequest->update(['port_call_id' => $portCall->id]);
                } else {
                    $reqNum = sprintf('REQ-SJA-26-%04d', $idx + 1);
                    $existingRequest = ShipRequest::withTrashed()->where('request_number', $reqNum)->first();
                    if ($existingRequest) {
                        if ($existingRequest->trashed()) {
                            $existingRequest->restore();
                        }
                        $existingRequest->update(['port_call_id' => $portCall->id, 'ship_id' => $ship->id]);
                    } else {
                        $existingRequest = ShipRequest::create([
                            'request_number' => $reqNum,
                            'ship_id' => $ship->id,
                            'created_by' => $prima->id ?? 1,
                            'status' => 'Menunggu Approval',
                            'request_date' => now()->toDateString(),
                            'notes' => 'Kebutuhan logistik operasional rutin armada',
                            'port_call_id' => $portCall->id,
                        ]);
                    }
                }

                // 4. Seed Daily Reports for field officer (Pak Prima)
                if ($prima && $idx < 4) {
                    DailyReport::firstOrCreate(
                        [
                            'port_call_id' => $portCall->id,
                            'report_date' => now()->subDays($idx)->toDateString(),
                        ],
                        [
                            'officer_id' => $prima->id,
                            'status' => 'submitted',
                            'no_activity' => false,
                            'summary' => "Pengawasan kegiatan kapal {$ship->name}. Koordinasi pengisian air tawar dan pengecekan perizinan dermaga. Kondisi cuaca cerah, operasional lancar.",
                            'submitted_at' => now()->subDays($idx)->setTime(17, 30),
                        ]
                    );
                }

                // 5. Seed Invoices (Keagenan & Reimburse)
                $companyId = $ship->ship_company_id ?? ($ship->company ? $ship->company->id : ShipCompany::first()->id);
                if ($companyId && $idx < 4 && $existingRequest) {
                    // Invoice Keagenan / Jasa
                    $invAgencyNum = sprintf('INV-AGY-26-%04d', $idx + 1);
                    Invoice::firstOrCreate(
                        ['invoice_number' => $invAgencyNum],
                        [
                            'request_id' => $existingRequest->id,
                            'company_id' => $companyId,
                            'port_call_id' => $portCall->id,
                            'invoice_type' => 'agency',
                            'invoice_date' => now()->subDays(3)->toDateString(),
                            'due_date' => now()->addDays(14)->toDateString(),
                            'subtotal' => 15000000,
                            'addon_total' => 10000, // Materai
                            'discount' => 0,
                            'tax' => 1650000, // PPN 11%
                            'grand_total' => 16660000,
                            'paid_amount' => $idx === 0 ? 16660000 : 0,
                            'outstanding_amount' => $idx === 0 ? 0 : 16660000,
                            'version' => 1,
                            'currency' => 'IDR',
                            'status' => $idx === 0 ? 'paid' : ($idx === 1 ? 'sent' : 'released'),
                            'delivery_status' => $idx === 0 || $idx === 1 ? 'delivered' : 'pending',
                            'notes' => "Jasa keagenan kapal {$ship->name} selama sandar di Pelabuhan Gresik.",
                            'released_at' => now()->subDays(2),
                        ]
                    );

                    // Invoice Reimburse (Biaya Pihak Ketiga)
                    $invReimbNum = sprintf('INV-RMB-26-%04d', $idx + 1);
                    Invoice::firstOrCreate(
                        ['invoice_number' => $invReimbNum],
                        [
                            'request_id' => $existingRequest->id,
                            'company_id' => $companyId,
                            'port_call_id' => $portCall->id,
                            'invoice_type' => 'reimburse',
                            'invoice_date' => now()->subDays(3)->toDateString(),
                            'due_date' => now()->addDays(14)->toDateString(),
                            'subtotal' => 28500000,
                            'addon_total' => 10000,
                            'discount' => 0,
                            'tax' => 0,
                            'grand_total' => 28510000,
                            'paid_amount' => $idx === 0 ? 28510000 : 0,
                            'outstanding_amount' => $idx === 0 ? 0 : 28510000,
                            'version' => 1,
                            'currency' => 'IDR',
                            'status' => $idx === 0 ? 'paid' : 'sent',
                            'delivery_status' => 'delivered',
                            'notes' => "Reimbursement biaya Pelindo kedatangan, air tawar 20 ton, dan perahu tambat kapal {$ship->name}.",
                            'released_at' => now()->subDays(2),
                        ]
                    );

                    // 6. Seed Outgoing Payments (Disbursement)
                    OutgoingPayment::firstOrCreate(
                        ['reference_number' => sprintf('TRF-OUT-2026-%04d', $idx + 1)],
                        [
                            'port_call_id' => $portCall->id,
                            'payment_type' => $idx % 2 === 0 ? 'Pelindo Kedatangan' : 'Vendor Air Tawar',
                            'payment_date' => now()->subDays(4)->toDateString(),
                            'amount' => $idx % 2 === 0 ? 12500000 : 4200000,
                            'currency' => 'IDR',
                            'recipient' => $idx % 2 === 0 ? 'PT Pelabuhan Indonesia (Persero)' : 'PT Sumber Rejeki Marine',
                            'reference_number' => sprintf('TRF-OUT-2026-%04d', $idx + 1),
                            'proof_path' => 'proofs/trf-sample.pdf',
                            'verification_status' => 'verified',
                            'recorded_by' => $titik->id ?? 1,
                            'verified_by' => $titik->id ?? 1,
                            'verified_at' => now()->subDays(4)->setTime(11, 0),
                        ]
                    );

                    // 7. Seed Client Receipts (Penerimaan Piutang)
                    if ($idx === 0) {
                        ClientReceipt::firstOrCreate(
                            ['bank_reference' => 'MDR-TRF-99881122'],
                            [
                                'company_id' => $companyId,
                                'received_date' => now()->subDay()->toDateString(),
                                'amount' => 45170000,
                                'currency' => 'IDR',
                                'destination_account' => 'Bank Mandiri 142-00-8899776-5 a.n. PT Samudra Jaya Andalas',
                                'proof_path' => 'proofs/rcpt-sample.pdf',
                                'status' => 'confirmed',
                                'recorded_by' => $titik->id ?? 1,
                            ]
                        );
                    }
                }
            }
        }
    }
}
