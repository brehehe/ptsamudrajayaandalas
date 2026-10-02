<?php

namespace App\Http\Controllers;

use App\Models\Ship;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MasterVesselController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $query = Ship::query()
            ->with('company:id,name,code')
            ->withCount('portCalls')
            ->where('is_active', true);

        if ($search) {
            $query->where(function ($shipQuery) use ($search, $like) {
                $shipQuery->where('name', $like, "%{$search}%")
                    ->orWhere('imo_number', $like, "%{$search}%")
                    ->orWhere('call_sign', $like, "%{$search}%")
                    ->orWhere('ship_type', $like, "%{$search}%")
                    ->orWhereHas('company', function ($companyQuery) use ($search, $like) {
                        $companyQuery->where('name', $like, "%{$search}%")
                            ->orWhere('code', $like, "%{$search}%");
                    });
            });
        }

        return Inertia::render('Master/Vessels/Index', [
            'vessels' => $query->orderBy('name')->orderBy('id')->get(),
            'search' => $search ?? '',
        ]);
    }
}
