<?php

namespace App\Http\Controllers;

use App\Models\DailyReport;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OperationController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'kunjungan'); // 'kunjungan' | 'laporan'
        $search = $request->query('search');

        $portCallsQuery = PortCall::query()
            ->with(['ship.company', 'port', 'workOrder', 'dailyReports.officer'])
            ->orderByDesc('created_at');

        $dailyReportsQuery = DailyReport::query()
            ->with(['portCall.ship', 'portCall.port', 'officer'])
            ->orderByDesc('report_date')
            ->orderByDesc('created_at');

        if ($search) {
            $portCallsQuery->where(function ($q) use ($search) {
                $q->where('job_number', 'ilike', "%{$search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', 'ilike', "%{$search}%"))
                    ->orWhereHas('port', fn ($pq) => $pq->where('name', 'ilike', "%{$search}%"));
            });

            $dailyReportsQuery->where(function ($q) use ($search) {
                $q->where('summary', 'ilike', "%{$search}%")
                    ->orWhereHas('portCall.ship', fn ($sq) => $sq->where('name', 'ilike', "%{$search}%"))
                    ->orWhereHas('officer', fn ($oq) => $oq->where('name', 'ilike', "%{$search}%"));
            });
        }

        $portCalls = $portCallsQuery->get();
        $dailyReports = $dailyReportsQuery->get();
        $ships = Ship::where('is_active', true)->orderBy('name')->get();
        $ports = Port::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('Operations/Index', [
            'portCalls' => $portCalls,
            'dailyReports' => $dailyReports,
            'ships' => $ships,
            'ports' => $ports,
            'counts' => [
                'kunjungan' => PortCall::count(),
                'laporan' => DailyReport::count(),
                'berthed' => PortCall::where('status', 'berthed')->count(),
                'anchored' => PortCall::where('status', 'anchored')->count(),
            ],
            'activeTab' => $tab,
            'search' => $search ?? '',
        ]);
    }

    public function storeDailyReport(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'port_call_id' => ['required', 'exists:port_calls,id'],
            'report_date' => ['required', 'date'],
            'summary' => ['required', 'string', 'min:5', 'max:2000'],
            'no_activity' => ['nullable', 'boolean'],
        ]);

        DailyReport::create([
            'port_call_id' => $validated['port_call_id'],
            'officer_id' => $request->user()->id,
            'report_date' => $validated['report_date'],
            'summary' => $validated['summary'],
            'no_activity' => $validated['no_activity'] ?? false,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Laporan harian lapangan berhasil dikirim.');
    }

    public function updateStatus(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:scheduled,anchored,berthed,departed,completed'],
        ]);

        $portCall = PortCall::findOrFail($id);
        $updateData = ['status' => $validated['status']];

        if ($validated['status'] === 'anchored' && ! $portCall->arrived_at) {
            $updateData['arrived_at'] = now();
        } elseif ($validated['status'] === 'berthed') {
            $updateData['berthed_at'] = now();
        } elseif ($validated['status'] === 'departed') {
            $updateData['departed_at'] = now();
        }

        $portCall->update($updateData);

        // Also sync ship status
        $shipStatusMap = [
            'scheduled' => 'Akan Datang',
            'anchored' => 'Labuh',
            'berthed' => 'Sandar',
            'departed' => 'Selesai',
            'completed' => 'Selesai',
        ];
        if (isset($shipStatusMap[$validated['status']])) {
            $portCall->ship?->update(['status' => $shipStatusMap[$validated['status']]]);
        }

        return redirect()->back()->with('success', "Status kunjungan {$portCall->job_number} diperbarui menjadi {$validated['status']}.");
    }
}
