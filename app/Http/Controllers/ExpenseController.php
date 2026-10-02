<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOutgoingPaymentRequest;
use App\Models\OutgoingPayment;
use App\Models\PortCall;
use App\Models\Vendor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']), 403);
        $type = $request->query('type', 'all');
        $status = $request->query('status', 'all');
        $search = $request->query('search');

        $query = OutgoingPayment::query()->with(['portCall.ship', 'portCall.port', 'recorder', 'verifier']);

        if ($type !== 'all') {
            $query->where('payment_type', 'ilike', "%{$type}%");
        }

        if ($status === 'verified') {
            $query->where('verification_status', 'verified');
        } elseif ($status === 'pending') {
            $query->where('verification_status', 'pending');
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'ilike', "%{$search}%")
                    ->orWhere('recipient', 'ilike', "%{$search}%")
                    ->orWhere('payment_type', 'ilike', "%{$search}%")
                    ->orWhereHas('portCall.ship', fn ($sq) => $sq->where('name', 'ilike', "%{$search}%"));
            });
        }

        $expenses = $query->orderByDesc('payment_date')->get();

        $totalAmount = OutgoingPayment::sum('amount');
        $verifiedAmount = OutgoingPayment::where('verification_status', 'verified')->sum('amount');
        $pendingAmount = OutgoingPayment::where('verification_status', 'pending')->sum('amount');

        $portCalls = PortCall::with(['ship', 'port'])->whereIn('status', ['scheduled', 'anchored', 'berthed'])->get();
        $vendors = Vendor::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('Expenses/Index', [
            'expenses' => $expenses,
            'portCalls' => $portCalls,
            'vendors' => $vendors,
            'stats' => [
                'total' => (float) $totalAmount,
                'verified' => (float) $verifiedAmount,
                'pending' => (float) $pendingAmount,
                'count' => OutgoingPayment::count(),
            ],
            'filters' => [
                'type' => $type,
                'status' => $status,
                'search' => $search ?? '',
            ],
        ]);
    }

    public function store(StoreOutgoingPaymentRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        OutgoingPayment::create([
            'port_call_id' => $validated['port_call_id'],
            'payment_type' => $validated['payment_type'],
            'recipient' => $validated['recipient'],
            'amount' => $validated['amount'],
            'currency' => 'IDR',
            'payment_date' => $validated['payment_date'],
            'reference_number' => $validated['reference_number'],
            'proof_path' => $request->file('proof')->store('sja/outgoing-payments', 'local'),
            'verification_status' => 'pending',
            'recorded_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', "Disbursement {$validated['reference_number']} berhasil dicatat dan menunggu verifikasi bukti.");
    }
}
