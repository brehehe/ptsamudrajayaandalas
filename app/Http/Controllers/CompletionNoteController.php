<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCompletionNoteRequest;
use App\Http\Requests\UpdateCompletionNoteRequest;
use App\Models\CompletionNote;
use App\Models\CostReconciliation;
use App\Models\PortCall;
use App\Models\RequestItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CompletionNoteController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', CompletionNote::class);
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:all,waiting,uploaded,verified,reconciled,overdue'],
        ]);
        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? 'all';
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $notes = CompletionNote::query()
            ->with([
                'portCall.ship:id,name',
                'portCall.port:id,name',
                'portCall.requests:id,port_call_id',
                'portCall.requests.items:id,request_id,quantity,hpp_price,director_status',
                'portCall.costDocuments:id,port_call_id,verified_total,status',
                'uploader:id,name',
                'verifier:id,name',
                'reconciliation',
            ])
            ->when($status === 'waiting', fn ($query) => $query->whereRaw('1 = 0'))
            ->when($status !== 'all' && $status !== 'waiting' && $status !== 'overdue', fn ($query) => $query->where('status', $status))
            ->when($status === 'overdue', fn ($query) => $query->where('due_at', '<', now())->whereNot('status', 'reconciled'))
            ->when($search, fn ($query, $value) => $query->where(function ($scope) use ($like, $value) {
                $scope->where('document_number', $like, "%{$value}%")
                    ->orWhereHas('portCall.ship', fn ($ship) => $ship->where('name', $like, "%{$value}%"));
            }))
            ->latest('uploaded_at')
            ->paginate(12)
            ->withQueryString()
            ->through(function (CompletionNote $note): CompletionNote {
                $this->attachFinancialSummary($note->portCall, $note);

                return $note;
            });

        $waitingPortCalls = PortCall::query()
            ->with([
                'ship:id,name',
                'port:id,name',
                'workOrder:id,system_number',
                'requests:id,port_call_id',
                'requests.items:id,request_id,quantity,hpp_price,director_status',
                'costDocuments:id,port_call_id,verified_total,status',
            ])
            ->where('status', 'departed')
            ->whereDoesntHave('completionNote')
            ->when($status === 'overdue', fn ($query) => $query->where('completion_note_due_at', '<', now()))
            ->latest('departed_at')
            ->get(['id', 'job_number', 'ship_id', 'port_id', 'work_order_id', 'departed_at', 'completion_note_due_at'])
            ->each(fn (PortCall $portCall) => $this->attachFinancialSummary($portCall));

        return Inertia::render('CompletionNotes/Index', [
            'notes' => $notes,
            'waitingPortCalls' => $waitingPortCalls,
            'filters' => ['search' => $search ?? '', 'status' => $status],
            'abilities' => [
                'create' => Gate::allows('create', CompletionNote::class),
                'manage' => $request->user()->isOperationalAdmin(),
            ],
        ]);
    }

    public function store(StoreCompletionNoteRequest $request): RedirectResponse
    {
        Gate::authorize('create', CompletionNote::class);
        $validated = $request->validated();

        $note = DB::transaction(function () use ($request, $validated): CompletionNote {
            $portCall = PortCall::query()->lockForUpdate()->findOrFail($validated['port_call_id']);
            if ($portCall->status !== 'departed' || ! $portCall->departed_at) {
                throw ValidationException::withMessages(['port_call_id' => 'Nota Rampung hanya dapat dicatat setelah kapal berangkat.']);
            }
            if (CompletionNote::query()->where('port_call_id', $portCall->id)->exists()) {
                throw ValidationException::withMessages(['port_call_id' => 'Nota Rampung untuk Kunjungan/Job ini sudah dicatat.']);
            }

            $note = CompletionNote::create([
                'port_call_id' => $portCall->id,
                'document_number' => $validated['document_number'],
                'departed_at' => $portCall->departed_at,
                'issued_at' => $validated['issued_at'],
                'downloaded_at' => $validated['downloaded_at'] ?? null,
                'uploaded_at' => now(),
                'due_at' => $portCall->completion_note_due_at,
                'document_path' => $request->file('document')->store('sja/completion-notes', 'local'),
                'actual_amount' => $validated['actual_amount'],
                'status' => 'uploaded',
                'notes' => $validated['notes'] ?? null,
                'uploaded_by' => $request->user()->id,
            ]);
            $portCall->update(['financial_status' => 'completion_note_uploaded']);

            activity('completion-note')
                ->performedOn($note)
                ->causedBy($request->user())
                ->log('Nota Rampung diunggah');

            return $note;
        });

        return back()->with('success', "Nota Rampung {$note->document_number} berhasil diunggah.");
    }

    public function update(UpdateCompletionNoteRequest $request, CompletionNote $completionNote): RedirectResponse
    {
        Gate::authorize('update', $completionNote);
        $validated = $request->validated();

        DB::transaction(function () use ($request, $completionNote, $validated): void {
            $note = CompletionNote::query()->lockForUpdate()->findOrFail($completionNote->id);
            $portCall = PortCall::query()->lockForUpdate()->findOrFail($note->port_call_id);

            if ($validated['action'] === 'verify') {
                if ($note->status !== 'uploaded') {
                    throw ValidationException::withMessages(['action' => 'Nota Rampung sudah diverifikasi atau direkonsiliasi.']);
                }
                $note->update([
                    'status' => 'verified',
                    'verified_by' => $request->user()->id,
                    'verified_at' => now(),
                    'notes' => $validated['notes'] ?? $note->notes,
                ]);
                $portCall->update(['financial_status' => 'waiting_reconciliation']);
            } else {
                if ($note->status !== 'verified') {
                    throw ValidationException::withMessages(['action' => 'Nota Rampung harus diverifikasi sebelum rekonsiliasi.']);
                }
                if (CostReconciliation::where('port_call_id', $portCall->id)->exists()) {
                    throw ValidationException::withMessages(['action' => 'Rekonsiliasi untuk kunjungan ini sudah tersimpan.']);
                }

                $initial = (float) RequestItem::query()
                    ->where('director_status', 'approved')
                    ->whereHas('request', fn ($query) => $query->where('port_call_id', $portCall->id))
                    ->selectRaw('COALESCE(SUM(quantity * hpp_price), 0) AS total')
                    ->value('total');
                $actual = (float) $validated['actual_total'];
                $adjustment = (float) ($validated['adjustment'] ?? 0);
                CostReconciliation::create([
                    'port_call_id' => $portCall->id,
                    'completion_note_id' => $note->id,
                    'initial_total' => $initial,
                    'actual_total' => $actual,
                    'variance' => $actual - $initial,
                    'adjustment' => $adjustment,
                    'status' => 'completed',
                    'notes' => $validated['notes'] ?? null,
                    'reconciled_by' => $request->user()->id,
                    'reconciled_at' => now(),
                ]);
                $note->update(['status' => 'reconciled']);
                $portCall->update(['financial_status' => 'billing', 'reconciled_at' => now()]);
                $portCall->workOrder?->update(['status' => 'billing']);
            }

            activity('completion-note')
                ->performedOn($note)
                ->causedBy($request->user())
                ->withProperties(['action' => $validated['action']])
                ->log('Tahap Nota Rampung diperbarui');
        });

        return back()->with('success', 'Tahap Nota Rampung dan rekonsiliasi berhasil diperbarui.');
    }

    public function download(Request $request, CompletionNote $completionNote): StreamedResponse
    {
        Gate::authorize('view', $completionNote);
        abort_unless(Storage::disk('local')->exists($completionNote->document_path), 404);

        return $request->boolean('view')
            ? Storage::disk('local')->response($completionNote->document_path)
            : Storage::disk('local')->download($completionNote->document_path);
    }

    private function attachFinancialSummary(PortCall $portCall, ?CompletionNote $completionNote = null): void
    {
        $approvedItems = $portCall->requests
            ->flatMap->items
            ->where('director_status', 'approved');
        $approvedTotal = $approvedItems->sum(
            fn (RequestItem $requestItem): float => (float) $requestItem->hpp_price * (float) $requestItem->quantity,
        );
        $verifiedDocumentsTotal = $portCall->costDocuments
            ->where('status', 'verified')
            ->sum(fn ($document): float => (float) $document->verified_total);

        $portCall->setAttribute('approved_request_item_count', $approvedItems->count());
        $portCall->setAttribute('approved_cost_total', $approvedTotal);
        $portCall->setAttribute(
            'recorded_cost_total',
            $verifiedDocumentsTotal + (float) ($completionNote?->actual_amount ?? 0),
        );
        $portCall->unsetRelation('requests');
        $portCall->unsetRelation('costDocuments');
    }
}
