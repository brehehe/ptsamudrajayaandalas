<?php

namespace Database\Seeders;

use App\Models\Port;
use App\Models\Product;
use App\Models\ProductPortPrice;
use App\Models\ServiceType;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SjaMasterSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles: Owner, Direktur, Admin, Lapangan
        $roles = [
            'Owner' => 'Pemilik perusahaan dengan wewenang monitoring total seluruh transaksi dan laporan.',
            'Direktur' => 'Direktur operasional dengan wewenang approval anggaran dan verifikasi pengajuan.',
            'Admin' => 'Staf administrasi & keuangan (Bu Titik) pengelola invoice, harga, dan operasional keagenan.',
            'Lapangan' => 'Petugas operasional lapangan (Pak Prima) penanggung jawab armada kapal dan pengajuan logistik.',
        ];

        foreach ($roles as $roleName => $desc) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        // 2. Default Users
        $defaultUsers = [
            [
                'name' => 'Hendra Wijaya',
                'email' => 'owner@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'Owner',
            ],
            [
                'name' => 'Pak Ryan',
                'email' => 'ryan@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'Direktur',
            ],
            [
                'name' => 'Bu Titik',
                'email' => 'titik@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'Admin',
            ],
            [
                'name' => 'Pak Prima',
                'email' => 'prima@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'Lapangan',
            ],
        ];

        foreach ($defaultUsers as $u) {
            $user = User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => $u['password'],
                    'email_verified_at' => now(),
                ]
            );
            $user->syncRoles([$u['role']]);
        }

        // 3. Perusahaan / Klien (data pengembangan, bukan data produksi)
        $companyData = [
            [
                'code' => 'DEMO-CLIENT-01',
                'name' => 'PT Pelayaran Demo Nusantara',
                'address' => null,
                'phone' => null,
                'email' => null,
                'is_active' => true,
            ],
            [
                'code' => 'DEMO-CLIENT-02',
                'name' => 'PT Armada Demo Indonesia',
                'address' => null,
                'phone' => null,
                'email' => null,
                'is_active' => true,
            ],
        ];

        $savedCompanies = [];
        foreach ($companyData as $company) {
            $savedCompany = ShipCompany::withTrashed()->updateOrCreate(
                ['code' => $company['code']],
                $company,
            );
            $savedCompany->restore();
            $savedCompanies[$company['code']] = $savedCompany;
        }

        // 4. Pelabuhan
        $portData = [
            ['code' => 'IDGRS', 'name' => 'Pelabuhan Gresik', 'city' => 'Gresik', 'country' => 'ID', 'timezone' => 'Asia/Jakarta', 'is_active' => true],
            ['code' => 'IDSUB', 'name' => 'Pelabuhan Tanjung Perak', 'city' => 'Surabaya', 'country' => 'ID', 'timezone' => 'Asia/Jakarta', 'is_active' => true],
            ['code' => 'IDMYR', 'name' => 'Pelabuhan Manyar (JIIPE)', 'city' => 'Gresik', 'country' => 'ID', 'timezone' => 'Asia/Jakarta', 'is_active' => true],
            ['code' => 'IDPKG', 'name' => 'Dermaga Khusus Petrokimia Gresik', 'city' => 'Gresik', 'country' => 'ID', 'timezone' => 'Asia/Jakarta', 'is_active' => true],
        ];

        $savedPorts = [];
        foreach ($portData as $port) {
            $savedPort = Port::withTrashed()->updateOrCreate(
                ['code' => $port['code']],
                $port,
            );
            $savedPort->restore();
            $savedPorts[$port['code']] = $savedPort;
        }

        // 5. Kapal (data pengembangan, tanpa identitas IMO rekaan)
        $shipData = [
            [
                'company_code' => 'DEMO-CLIENT-01',
                'port_code' => 'IDGRS',
                'name' => 'MV Demo Nusantara',
                'ship_type' => 'General Cargo',
                'flag' => 'Indonesia',
            ],
            [
                'company_code' => 'DEMO-CLIENT-01',
                'port_code' => 'IDSUB',
                'name' => 'MT Demo Andalas',
                'ship_type' => 'Tanker',
                'flag' => 'Indonesia',
            ],
            [
                'company_code' => 'DEMO-CLIENT-02',
                'port_code' => 'IDMYR',
                'name' => 'TB Demo Bahari',
                'ship_type' => 'Tugboat',
                'flag' => 'Indonesia',
            ],
            [
                'company_code' => 'DEMO-CLIENT-02',
                'port_code' => 'IDPKG',
                'name' => 'KM Demo Samudra',
                'ship_type' => 'Supply Vessel',
                'flag' => 'Indonesia',
            ],
        ];

        foreach ($shipData as $ship) {
            $company = $savedCompanies[$ship['company_code']];
            $port = $savedPorts[$ship['port_code']];
            $savedShip = Ship::withTrashed()->updateOrCreate(
                [
                    'ship_company_id' => $company->id,
                    'name' => $ship['name'],
                ],
                [
                    'port_id' => $port->id,
                    'imo_number' => null,
                    'call_sign' => null,
                    'flag' => $ship['flag'],
                    'ship_type' => $ship['ship_type'],
                    'status' => 'Akan Datang',
                    'eta' => null,
                    'agent_name' => null,
                    'image' => null,
                    'is_active' => true,
                ],
            );
            $savedShip->restore();
        }

        // 6. Service Types (Default Sandar & Labuh)
        $serviceTypes = [
            ['code' => 'SDR', 'name' => 'Sandar', 'description' => 'Kegiatan kapal bersandar di dermaga pelabuhan.', 'is_default' => true],
            ['code' => 'LBH', 'name' => 'Labuh', 'description' => 'Kegiatan kapal berlabuh jangkar di area perairan / anchorage.', 'is_default' => true],
            ['code' => 'BM', 'name' => 'Bongkar Muat', 'description' => 'Kegiatan bongkar muat kargo atau muatan curah/kontainer.', 'is_default' => false],
            ['code' => 'BNK', 'name' => 'Bunkering', 'description' => 'Kegiatan pengisian bahan bakar kapal di perairan / dermaga.', 'is_default' => false],
        ];

        foreach ($serviceTypes as $st) {
            ServiceType::updateOrCreate(['code' => $st['code']], $st);
        }

        // 7. Vendors
        $vendorData = [
            ['code' => 'VND-PELINDO', 'name' => 'PT Pelabuhan Indonesia (Persero)', 'phone' => '031-3298631', 'email' => 'pelayanan@pelindo.co.id', 'address' => 'Jl. Tanjung Perak Timur No. 610, Surabaya'],
            ['code' => 'VND-PERTAMINA', 'name' => 'PT Pertamina Patra Niaga', 'phone' => '135', 'email' => 'bunker@pertamina.com', 'address' => 'Jl. Perak Barat No. 277, Surabaya'],
            ['code' => 'VND-TIRTA', 'name' => 'PT Tirta Samudra Suplai', 'phone' => '031-7992144', 'email' => 'order@tirtasamudra.co.id', 'address' => 'Kawasan Pelabuhan Gresik Kav. 12'],
            ['code' => 'VND-BAHARI', 'name' => 'CV Bahari Perkasa Marine Supply', 'phone' => '081234567890', 'email' => 'sales@bahariperkasa.co.id', 'address' => 'Jl. Kalimas Baru No. 88, Surabaya'],
            ['code' => 'VND-NELAYAN', 'name' => 'Koperasi Motor Boat Mandiri', 'phone' => '081399887766', 'email' => 'info@boatmandiri.id', 'address' => 'Dermaga Rakyat Manyar, Gresik'],
        ];

        $savedVendors = [];
        foreach ($vendorData as $vd) {
            $savedVendors[$vd['code']] = Vendor::updateOrCreate(['code' => $vd['code']], $vd);
        }

        // 8. Ports for product price references
        $ports = Port::where('is_active', true)->get();
        $gresikPort = $ports->firstWhere('code', 'IDGRS') ?? $ports->first();
        $perakPort = $ports->firstWhere('code', 'IDSUB') ?? $ports->skip(1)->first();

        // 9. Master Products (Jasa & Non-Jasa)
        $products = [
            // JASA
            [
                'code' => 'PRD-AGY',
                'name' => 'Jasa Keagenan Kapal (Agency Fee)',
                'category' => 'Jasa Keagenan',
                'item_type' => 'jasa',
                'unit' => 'Paket',
                'hpp_default' => 1500000.00,
                'selling_price_default' => 3500000.00,
                'price_sandar' => 3500000.00,
                'price_labuh' => 2800000.00,
                'tax_rate' => 2.00, // PPh 23
                'vendor_code' => null,
                'description' => 'Jasa pengurusan izin keagenan kapal dan administrasi pelabuhan.',
            ],
            [
                'code' => 'PRD-CLR',
                'name' => 'Clearance In / Out (Syahbandar & Karantina)',
                'category' => 'Clearance',
                'item_type' => 'jasa',
                'unit' => 'Paket',
                'hpp_default' => 2500000.00,
                'selling_price_default' => 4200000.00,
                'price_sandar' => 4200000.00,
                'price_labuh' => 3800000.00,
                'tax_rate' => 2.00,
                'vendor_code' => null,
                'description' => 'Pengurusan dokumen izin kedatangan (Clearance In) dan keberangkatan (Clearance Out).',
            ],
            [
                'code' => 'PRD-SDR',
                'name' => 'Jasa Sandar & Tambat Dermaga',
                'category' => 'Jasa Keagenan',
                'item_type' => 'jasa',
                'unit' => 'Kegiatan',
                'hpp_default' => 3000000.00,
                'selling_price_default' => 5000000.00,
                'price_sandar' => 5000000.00,
                'price_labuh' => 0.00,
                'tax_rate' => 2.00,
                'vendor_code' => null,
                'description' => 'Jasa koordinasi pemanduan dan penyandaran kapal di dermaga.',
            ],
            [
                'code' => 'PRD-LBH',
                'name' => 'Jasa Labuh Jangkar & Pengawasan',
                'category' => 'Jasa Keagenan',
                'item_type' => 'jasa',
                'unit' => 'Hari',
                'hpp_default' => 1800000.00,
                'selling_price_default' => 3000000.00,
                'price_sandar' => 0.00,
                'price_labuh' => 3000000.00,
                'tax_rate' => 2.00,
                'vendor_code' => null,
                'description' => 'Jasa keagenan pemantauan kapal selama berada di area labuh jangkar.',
            ],
            [
                'code' => 'PRD-CREW',
                'name' => 'Crew Transport & Airport Handling',
                'category' => 'Crew Transport',
                'item_type' => 'jasa',
                'unit' => 'Orang',
                'hpp_default' => 400000.00,
                'selling_price_default' => 750000.00,
                'price_sandar' => 750000.00,
                'price_labuh' => 850000.00,
                'tax_rate' => 2.00,
                'vendor_code' => null,
                'description' => 'Transportasi dan pengurusan sertifikat sign on/sign off kru kapal.',
            ],

            // NON-JASA / REIMBURSEMENT
            [
                'code' => 'PRD-FW',
                'name' => 'Air Tawar Kapal (Fresh Water Supply)',
                'category' => 'Air',
                'item_type' => 'non_jasa',
                'unit' => 'Ton',
                'hpp_default' => 45000.00,
                'selling_price_default' => 70000.00,
                'price_sandar' => 70000.00,
                'price_labuh' => 85000.00,
                'tax_rate' => 0.00,
                'vendor_code' => 'VND-TIRTA',
                'description' => 'Pengisian air tawar berkualitas untuk kebutuhan awak kapal via pipa/tongkang air.',
            ],
            [
                'code' => 'PRD-MGO',
                'name' => 'Bahan Bakar Kapal (MGO Fuel Bunker)',
                'category' => 'Bahan Bakar',
                'item_type' => 'non_jasa',
                'unit' => 'Liter',
                'hpp_default' => 12500.00,
                'selling_price_default' => 15500.00,
                'price_sandar' => 15500.00,
                'price_labuh' => 16000.00,
                'tax_rate' => 0.00,
                'vendor_code' => 'VND-PERTAMINA',
                'description' => 'Pengisian bahan bakar solar industri Marine Gas Oil resmi Pertamina.',
            ],
            [
                'code' => 'PRD-PRH',
                'name' => 'Perahu Motor Pandu / Motor Boat Penyeberangan',
                'category' => 'Perahu',
                'item_type' => 'non_jasa',
                'unit' => 'Trip',
                'hpp_default' => 600000.00,
                'selling_price_default' => 1000000.00,
                'price_sandar' => 1000000.00,
                'price_labuh' => 1200000.00,
                'tax_rate' => 0.00,
                'vendor_code' => 'VND-NELAYAN',
                'description' => 'Sewa perahu motor untuk antar jemput dokumen dan kru antar darat dan kapal.',
            ],
            [
                'code' => 'PRD-ROPE',
                'name' => 'Tali Tambat (Mooring Line Polypropylene 8-Strand)',
                'category' => 'Sparepart',
                'item_type' => 'non_jasa',
                'unit' => 'Roll',
                'hpp_default' => 3200000.00,
                'selling_price_default' => 4800000.00,
                'price_sandar' => 4800000.00,
                'price_labuh' => 4800000.00,
                'tax_rate' => 0.00,
                'vendor_code' => 'VND-BAHARI',
                'description' => 'Tali tambat kapal standar maritim internasional dengan sertifikasi beban tarik.',
            ],
            [
                'code' => 'PRD-PLD-ARR',
                'name' => 'Jasa Pelindo Kedatangan (Clearance In Pilotage & Towage)',
                'category' => 'Pelindo Resmi',
                'item_type' => 'non_jasa',
                'unit' => 'Kegiatan',
                'hpp_default' => 18500000.00,
                'selling_price_default' => 18500000.00,
                'price_sandar' => 18500000.00,
                'price_labuh' => 14200000.00,
                'tax_rate' => 0.00,
                'vendor_code' => 'VND-PELINDO',
                'description' => 'Tagihan resmi Pelindo untuk biaya pandu, tunda, dan tambat awal kedatangan kapal (Wajib dibayar di awal).',
            ],
        ];

        foreach ($products as $pData) {
            $vendorId = ! empty($pData['vendor_code']) && isset($savedVendors[$pData['vendor_code']])
                ? $savedVendors[$pData['vendor_code']]->id
                : null;

            $product = Product::updateOrCreate(
                ['code' => $pData['code']],
                [
                    'name' => $pData['name'],
                    'category' => $pData['category'],
                    'item_type' => $pData['item_type'],
                    'unit' => $pData['unit'],
                    'hpp_default' => $pData['hpp_default'],
                    'selling_price_default' => $pData['selling_price_default'],
                    'price_sandar' => $pData['price_sandar'],
                    'price_labuh' => $pData['price_labuh'],
                    'tax_rate' => $pData['tax_rate'],
                    'vendor_id' => $vendorId,
                    'description' => $pData['description'],
                    'is_active' => true,
                ]
            );

            // Seed port price matrix if ports exist
            if ($gresikPort) {
                ProductPortPrice::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'port_id' => $gresikPort->id,
                        'service_type' => 'Sandar',
                    ],
                    [
                        'selling_price' => $pData['price_sandar'],
                        'hpp_price' => $pData['hpp_default'],
                    ]
                );

                ProductPortPrice::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'port_id' => $gresikPort->id,
                        'service_type' => 'Labuh',
                    ],
                    [
                        'selling_price' => $pData['price_labuh'],
                        'hpp_price' => $pData['hpp_default'],
                    ]
                );
            }

            if ($perakPort) {
                ProductPortPrice::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'port_id' => $perakPort->id,
                        'service_type' => 'Sandar',
                    ],
                    [
                        'selling_price' => $pData['price_sandar'],
                        'hpp_price' => $pData['hpp_default'],
                    ]
                );

                ProductPortPrice::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'port_id' => $perakPort->id,
                        'service_type' => 'Labuh',
                    ],
                    [
                        'selling_price' => $pData['price_labuh'],
                        'hpp_price' => $pData['hpp_default'],
                    ]
                );
            }
        }
    }
}
