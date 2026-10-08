<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCompletionNoteRequest;
use App\Models\CompletionNote;
use App\Models\PortCall;
use App\Models\ShipCompany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

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
                'portCall.workOrder:id,company_id',
                'portCall.workOrder.company:id,name',
                'uploader:id,name',
            ])
            ->when($status !== 'all' && $status !== 'waiting' && $status !== 'overdue', fn ($query) => $query->where('status', $status))
            ->when($status === 'waiting', fn ($query) => $query->whereRaw('1 = 0'))
            ->when($status === 'overdue', fn ($query) => $query->where('due_at', '<', now()))
            ->when($search, fn ($query, $value) => $query->where(function ($scope) use ($like, $value) {
                $scope->where('document_number', $like, "%{$value}%")
                    ->orWhereHas('portCall.ship', fn ($ship) => $ship->where('name', $like, "%{$value}%"));
            }))
            ->latest('uploaded_at')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('CompletionNotes/Index', [
            'notes' => $notes,
            'filters' => ['search' => $search ?? '', 'status' => $status],
            'abilities' => [
                'create' => Gate::allows('create', CompletionNote::class),
            ],
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', CompletionNote::class);

        $portCalls = PortCall::query()
            ->with([
                'ship:id,name,ship_company_id',
                'ship.company:id,name',
                'port:id,name',
                'workOrder:id,company_id,client_number',
                'workOrder.company:id,name',
            ])
            ->where('status', 'departed')
            ->whereDoesntHave('completionNote')
            ->latest('departed_at')
            ->get(['id', 'job_number', 'ship_id', 'port_id', 'work_order_id', 'departed_at'])
            ->map(fn (PortCall $portCall): array => [
                'id' => $portCall->id,
                'job_number' => $portCall->job_number,
                'client_spk_number' => $portCall->workOrder?->client_number,
                'company_id' => $portCall->workOrder?->company_id ?? $portCall->ship?->ship_company_id,
                'company' => ($portCall->workOrder?->company ?? $portCall->ship?->company)?->only(['id', 'name']),
                'ship' => $portCall->ship?->only(['id', 'name']),
                'port' => $portCall->port?->only(['id', 'name']),
                'departed_at' => $portCall->departed_at?->toISOString(),
            ]);

        return Inertia::render('CompletionNotes/Create', [
            'companies' => ShipCompany::query()
                ->whereIn('id', $portCalls->pluck('company_id')->filter()->unique())
                ->orderBy('name')
                ->get(['id', 'name']),
            'portCalls' => $portCalls,
        ]);
    }

    public function store(StoreCompletionNoteRequest $request): RedirectResponse
    {
        Gate::authorize('create', CompletionNote::class);
        $validated = $request->validated();

        $documentPath = $request->file('document')->store('sja/completion-notes', 'local');

        try {
            $note = DB::transaction(function () use ($request, $validated, $documentPath): CompletionNote {
                $portCall = PortCall::query()
                    ->with('workOrder:id,status')
                    ->lockForUpdate()
                    ->findOrFail($validated['port_call_id']);

                if ($portCall->status !== 'departed' || ! $portCall->departed_at) {
                    throw ValidationException::withMessages(['port_call_id' => 'Nota Rampung hanya dapat diunggah setelah kapal berangkat.']);
                }
                if (CompletionNote::withTrashed()->where('port_call_id', $portCall->id)->exists()) {
                    throw ValidationException::withMessages(['port_call_id' => 'Nota Rampung untuk Kunjungan/Job ini sudah dicatat.']);
                }

                $note = CompletionNote::create([
                    'port_call_id' => $portCall->id,
                    'document_number' => sprintf('NR-SJA-%s-%s', now()->format('ymd'), Str::upper(Str::random(6))),
                    'departed_at' => $portCall->departed_at,
                    'issued_at' => now()->toDateString(),
                    'uploaded_at' => now(),
                    'due_at' => $portCall->completion_note_due_at,
                    'document_path' => $documentPath,
                    'actual_amount' => '0.00',
                    'status' => 'uploaded',
                    'uploaded_by' => $request->user()->id,
                ]);

                $portCall->update(['financial_status' => 'billing']);
                $portCall->workOrder?->update(['status' => 'billing']);

                activity('completion-note')
                    ->performedOn($note)
                    ->causedBy($request->user())
                    ->withProperties(['original_filename' => $request->file('document')->getClientOriginalName()])
                    ->log('Nota Rampung diunggah untuk Job');

                return $note;
            }, attempts: 3);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($documentPath);

            throw $exception;
        }

        return redirect()->route('completion-notes.index')
            ->with('success', "Nota Rampung {$note->document_number} berhasil diunggah.");
    }

    public function download(Request $request, CompletionNote $completionNote): StreamedResponse
    {
        Gate::authorize('view', $completionNote);
        abort_unless(Storage::disk('local')->exists($completionNote->document_path), 404);

        return $request->boolean('view')
            ? Storage::disk('local')->response($completionNote->document_path)
            : Storage::disk('local')->download($completionNote->document_path);
    }
}
