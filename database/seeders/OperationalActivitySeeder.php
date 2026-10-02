<?php

namespace Database\Seeders;

use App\Models\OperationalActivity;
use App\Models\Ship;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class OperationalActivitySeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        $sarana = Ship::where('name', 'like', '%Sarana%')->first();
        $amigo = Ship::where('name', 'like', '%Amigo%')->first();
        $clarity = Ship::where('name', 'like', '%Clarity%')->first();

        $today = Carbon::today()->toDateString();
        $yesterday = Carbon::yesterday()->toDateString();

        $activities = [
            [
                'activity_date' => $today,
                'activity_time' => '10:35',
                'location_name' => 'Dermaga A',
                'latitude' => -7.153401,
                'longitude' => 112.656391,
                'is_vessel_related' => true,
                'ship_id' => $sarana?->id,
                'category' => 'Bongkar Muat',
                'title' => 'Bongkar Muat',
                'detail' => 'Proses bongkar muat sedang berlangsung. Total muatan hingga saat ini mencapai kurang lebih 120 ton.',
                'photos' => ['/images/vessel-sarana.jpg', '/images/harbor-banner.jpg'],
                'created_by' => $user?->id,
            ],
            [
                'activity_date' => $today,
                'activity_time' => '09:15',
                'location_name' => 'Area Bongkar Muat',
                'latitude' => -7.154100,
                'longitude' => 112.657200,
                'is_vessel_related' => false,
                'ship_id' => null,
                'category' => 'Kendala Operasional',
                'title' => 'Kendala Operasional',
                'detail' => 'Truk mengalami patah as roda karena kelebihan beban. Aktivitas di area tersebut sementara dihentikan.',
                'photos' => ['/images/port-bg.jpg', '/images/harbor-banner.jpg', '/images/vessel-sarana.jpg'],
                'created_by' => $user?->id,
            ],
            [
                'activity_date' => $today,
                'activity_time' => '08:50',
                'location_name' => 'Dermaga B',
                'latitude' => -7.152800,
                'longitude' => 112.655900,
                'is_vessel_related' => true,
                'ship_id' => $amigo?->id,
                'category' => 'Kegiatan Kapal',
                'title' => 'Kegiatan Kapal',
                'detail' => 'Pengisian air tawar ke kapal dalam proses pengiriman.',
                'photos' => ['/images/vessel-amigo.jpg'],
                'created_by' => $user?->id,
            ],
            [
                'activity_date' => $yesterday,
                'activity_time' => '16:20',
                'location_name' => 'Dermaga C',
                'latitude' => -7.151900,
                'longitude' => 112.654800,
                'is_vessel_related' => true,
                'ship_id' => $clarity?->id,
                'category' => 'Aktivitas Lainnya',
                'title' => 'Aktivitas Lainnya',
                'detail' => 'Kondisi area dermaga normal dan kegiatan berjalan sesuai jadwal.',
                'photos' => ['/images/vessel-ocean-star.jpg'],
                'created_by' => $user?->id,
            ],
        ];

        foreach ($activities as $act) {
            OperationalActivity::firstOrCreate(
                [
                    'activity_date' => $act['activity_date'],
                    'activity_time' => $act['activity_time'],
                    'title' => $act['title'],
                ],
                $act
            );
        }
    }
}
