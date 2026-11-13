<?php

namespace Database\Seeders;

use App\Models\Port;
use App\Models\Ship;
use App\Models\ShipCompany;
use Illuminate\Database\Seeder;

class SjaDemoFleetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Khusus data dummy kapal dan perusahaan klien untuk keperluan pengujian / demo armada.
     */
    public function run(): void
    {
        // 1. Perusahaan / Klien Demo
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

        // 2. Kapal Demo
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
            $company = $savedCompanies[$ship['company_code']] ?? null;
            $port = Port::where('code', $ship['port_code'])->first();

            if (! $company || ! $port) {
                continue;
            }

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
    }
}

