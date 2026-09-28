<?php

namespace App\Http\Controllers;

use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NeedController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status', 'semua');
        $search = $request->query('search');

        $query = ShipRequest::query()->with(['ship.company', 'creator', 'portCall.port']);

        if ($status === 'menunggu') {
            $query->where('status', 'Menunggu Approval');
        } elseif ($status === 'proses') {
            $query->whereIn('status', ['Dalam Proses', 'Disetujui', 'Diproses']);
        } elseif ($status === 'selesai') {
            $query->whereIn('status', ['Selesai', 'Dibatalkan']);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'ilike', "%{$search}%")
                    ->orWhere('notes', 'ilike', "%{$search}%")
                    ->orWhereHas('ship', function ($sq) use ($search) {
                        $sq->where('name', 'ilike', "%{$search}%");
                    });
            });
        }

        $needs = $query->orderByDesc('created_at')->get();

        $ships = Ship::where('is_active', true)->orderBy('name')->get();
        $portCalls = PortCall::with(['ship', 'port'])->whereIn('status', ['scheduled', 'anchored', 'berthed'])->get();

        return Inertia::render('Needs/Index', [
            'needs' => $needs,
            'ships' => $ships,
            'portCalls' => $portCalls,
            'counts' => [
                'semua' => ShipRequest::count(),
                'menunggu' => ShipRequest::where('status', 'Menunggu Approval')->count(),
                'proses' => ShipRequest::whereIn('status', ['Dalam Proses', 'Disetujui', 'Diproses'])->count(),
                'selesai' => ShipRequest::whereIn('status', ['Selesai', 'Dibatalkan'])->count(),
            ],
            'activeStatus' => $status,
            'search' => $search ?? '',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ship_id' => ['required', 'exists:ships,id'],
            'port_call_id' => ['nullable', 'exists:port_calls,id'],
            'need_type' => ['required', 'string'],
            'quantity' => ['required', 'numeric', 'min:1'],
            'unit' => ['required', 'string'],
            'required_at' => ['required', 'string'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $lastReq = ShipRequest::withTrashed()->orderByDesc('created_at')->first();
        $nextNum = 260;
        if ($lastReq && preg_match('/REQ-(?:SJA-26-)?(\d+)/', $lastReq->request_number, $matches)) {
            $nextNum = (int) $matches[1] + 1;
        }
        $reqNumber = sprintf('REQ-SJA-26-%04d', $nextNum);

        $newRequest = ShipRequest::create([
            'request_number' => $reqNumber,
            'ship_id' => $validated['ship_id'],
            'port_call_id' => $validated['port_call_id'] ?? null,
            'created_by' => $request->user()->id,
            'status' => 'Menunggu Approval',
            'request_date' => now()->toDateString(),
            'notes' => "{$validated['need_type']} {$validated['quantity']} {$validated['unit']} - Dibutuhkan: {$validated['required_at']}. Catatan: ".($validated['notes'] ?? '-'),
        ]);

        return redirect()->back()->with('success', "Kebutuhan {$reqNumber} berhasil dicatat dan siap ditinjau.");
    }

    public function updateStatus(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:Menunggu Approval,Dalam Proses,Selesai,Dibatalkan'],
        ]);

        $need = ShipRequest::findOrFail($id);
        $need->update([
            'status' => $validated['status'],
            'completed_at' => $validated['status'] === 'Selesai' ? now() : null,
            'cancelled_at' => $validated['status'] === 'Dibatalkan' ? now() : null,
        ]);

        return redirect()->back()->with('success', "Status kebutuhan {$need->request_number} diperbarui menjadi {$validated['status']}.");
    }
}
