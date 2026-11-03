<?php

namespace App\Http\Controllers;

use App\Actions\CreateVendorInvoiceFromApprovedItem;
use App\Actions\DecideCompanyExpenseAction;
use App\Models\ExpenseRequest;
use App\Models\OutgoingPayment;
use App\Models\PortCall;
use App\Models\RequestHistory;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Support\RequestItemHistoryBuilder;
use App\Support\WorkflowNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    public function __construct(
        private readonly WorkflowNotifier $workflowNotifier,
        private readonly CreateVendorInvoiceFromApprovedItem $createVendorInvoiceFromApprovedItem,
    ) {}

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'tab' => ['nullable', 'in:menunggu,disetujui,ditolak,semua'],
            'status' => ['nullable', 'string', 'max:50'],
            'search' => ['nullable', 'string', 'max:100'],
            'company_id' => ['nullable', 'string'],
            'ship_id' => ['nullable', 'string'],
            'job' => ['nullable', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);
        $tab = $validated['tab'] ?? ($validated['status'] ?? 'menunggu');
        $search = $validated['search'] ?? null;
        $companyId = $validated['company_id'] ?? null;
        $shipId = $validated['ship_id'] ?? null;
        $job = $validated['job'] ?? null;
        $startDate = $validated['start_date'] ?? null;
        $endDate = $validated['end_date'] ?? null;
        $date = $validated['date'] ?? null;

        $requestsQuery = ShipRequest::query()->with([
            'ship.company',
            'company',
            'port',
            'portCall.workOrder',
            'portCall.port',
            'portCall.ship.company',
            'creator',
            'items.product.vendor',
            'items.vendor',
            'items.surplusSourceItem:id,item_name,hpp_price',
            'items.costDocumentItem.costDocument',
        ]);

        $paymentsQuery = OutgoingPayment::query()->with([
            'portCall.ship',
            'portCall.port',
            'recorder',
            'verifier',
        ]);

        $companyExpensesQuery = ExpenseRequest::query()->where('scope', 'company')->with([
            'creator:id,name',
            'reviewer:id,name',
            'realizer:id,name',
            // 'items:id,expense_request_id,description,amount,currency',
            'items:id,expense_request_id,description,amount',
        ]);

        if ($startDate) {
            $requestsQuery->whereDate('request_date', '>=', $startDate);
            $paymentsQuery->whereDate('payment_date', '>=', $startDate);
            $companyExpensesQuery->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $requestsQuery->whereDate('request_date', '<=', $endDate);
            $paymentsQuery->whereDate('payment_date', '<=', $endDate);
            $companyExpensesQuery->whereDate('created_at', '<=', $endDate);
        }

        if ($date && ! $startDate && ! $endDate) {
            $requestsQuery->whereDate('request_date', $date);
            $paymentsQuery->whereDate('payment_date', $date);
            $companyExpensesQuery->whereDate('created_at', $date);
        }

        if ($companyId) {
            $requestsQuery->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)
                    ->orWhereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId));
            });
            $paymentsQuery->whereHas('portCall.ship', fn ($sq) => $sq->where('ship_company_id', $companyId));
        }

        if ($shipId) {
            $requestsQuery->where('ship_id', $shipId);
            $paymentsQuery->whereHas('portCall', fn ($pq) => $pq->where('ship_id', $shipId));
        }

        if ($job) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $requestsQuery->whereHas('portCall', function ($pq) use ($job, $like): void {
                $pq->where('job_number', $like, "%{$job}%");
                if (Str::isUuid($job)) {
                    $pq->orWhere('id', $job);
                }
            });
            $paymentsQuery->whereHas('portCall', function ($pq) use ($job, $like): void {
                $pq->where('job_number', $like, "%{$job}%");
                if (Str::isUuid($job)) {
                    $pq->orWhere('id', $job);
                }
            });
        }

        if ($tab === 'menunggu') {
            $requestsQuery->where(function ($query) {
                $query->where('status', 'Menunggu Approval Direktur')
                    ->orWhereHas('items', fn ($itemQuery) => $itemQuery
                        ->where('status', 'diajukan_ke_direktur')
                        ->where(fn ($dq) => $dq->where('director_status', 'pending')->orWhereNull('director_status')));
            });
            $paymentsQuery->where('verification_status', 'pending');
            $companyExpensesQuery->where('status', 'waiting_director');
        } elseif ($tab === 'disetujui') {
            $requestsQuery->whereIn('status', ['Disetujui', 'Disetujui Sebagian', 'Dalam Proses', 'Selesai']);
            $paymentsQuery->where('verification_status', 'verified');
            $companyExpensesQuery->whereIn('status', ['approved', 'realized']);
        } elseif ($tab === 'ditolak') {
            $requestsQuery->where('status', 'Ditolak');
            $paymentsQuery->where('verification_status', 'rejected');
            $companyExpensesQuery->where('status', 'rejected');
        }

        if ($search) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $requestsQuery->where(function ($q) use ($search, $like) {
                $q->where('request_number', $like, "%{$search}%")
                    ->orWhere('notes', $like, "%{$search}%")
                    ->orWhere('admin_forward_notes', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$search}%"));
            });

            $paymentsQuery->where(function ($q) use ($search, $like) {
                $q->where('reference_number', $like, "%{$search}%")
                    ->orWhere('recipient', $like, "%{$search}%")
                    ->orWhere('payment_type', $like, "%{$search}%");
            });

            $companyExpensesQuery->where(function ($q) use ($search, $like) {
                $q->where('request_number', $like, "%{$search}%")
                    ->orWhere('category', $like, "%{$search}%")
                    ->orWhere('notes', $like, "%{$search}%");
            });
        }

        $pendingRequests = $requestsQuery->orderByDesc('created_at')->get();
        $pendingPayments = $paymentsQuery->orderByDesc('created_at')->get();
        $pendingCompanyExpenses = $companyExpensesQuery->orderByDesc('created_at')->get();
        $this->prepareApprovalItems($pendingRequests);

        $summaryDate = $date ?? now()->toDateString();
        $dailyRequests = ShipRequest::query()
            ->whereDate('request_date', $summaryDate)
            ->with('items:id,request_id,quantity,hpp_price,director_status')
            ->get(['id', 'port_call_id', 'request_date']);
        $dailySummary = [
            'date' => $summaryDate,
            'ship_count' => $dailyRequests->pluck('port_call_id')->filter()->unique()->count(),
            'request_count' => $dailyRequests->count(),
            'item_count' => $dailyRequests->sum(fn (ShipRequest $shipRequest): int => $shipRequest->items->count()),
            'total_hpp' => (float) $dailyRequests->sum(fn (ShipRequest $shipRequest): float => (float) $shipRequest->items->sum(
                fn (RequestItem $item): float => (float) $item->hpp_price * (float) $item->quantity,
            )),
            'approved_hpp' => (float) $dailyRequests->sum(fn (ShipRequest $shipRequest): float => (float) $shipRequest->items
                ->where('director_status', 'approved')
                ->sum(fn (RequestItem $item): float => (float) $item->hpp_price * (float) $item->quantity)),
        ];

        $counts = [
            'semua' => ShipRequest::count() + OutgoingPayment::count() + ExpenseRequest::where('scope', 'company')->count(),
            'menunggu' => ShipRequest::query()
                ->where(function ($query) {
                    $query->where('status', 'Menunggu Approval Direktur')
                        ->orWhereHas('items', fn ($itemQuery) => $itemQuery
                            ->where('status', 'diajukan_ke_direktur')
                            ->where(fn ($dq) => $dq->where('director_status', 'pending')->orWhereNull('director_status')));
                })
                ->count() + OutgoingPayment::where('verification_status', 'pending')->count() + ExpenseRequest::where('scope', 'company')->where('status', 'waiting_director')->count(),
            'disetujui' => ShipRequest::whereIn('status', ['Disetujui', 'Disetujui Sebagian', 'Dalam Proses', 'Selesai'])->count() + OutgoingPayment::where('verification_status', 'verified')->count() + ExpenseRequest::where('scope', 'company')->whereIn('status', ['approved', 'realized'])->count(),
            'ditolak' => ShipRequest::where('status', 'Ditolak')->count() + OutgoingPayment::where('verification_status', 'rejected')->count() + ExpenseRequest::where('scope', 'company')->where('status', 'rejected')->count(),
        ];

        $baseItemsQuery = RequestItem::query()->whereHas('request', function ($q) use ($startDate, $endDate, $date, $companyId, $shipId, $job, $search) {
            if ($startDate) {
                $q->whereDate('request_date', '>=', $startDate);
            }
            if ($endDate) {
                $q->whereDate('request_date', '<=', $endDate);
            }
            if ($date && ! $startDate && ! $endDate) {
                $q->whereDate('request_date', $date);
            }
            if ($companyId) {
                $q->where(function ($sub) use ($companyId) {
                    $sub->where('company_id', $companyId)
                        ->orWhereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId));
                });
            }
            if ($shipId) {
                $q->where('ship_id', $shipId);
            }
            if ($job) {
                $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                $q->whereHas('portCall', function ($pq) use ($job, $like): void {
                    $pq->where('job_number', $like, "%{$job}%");
                    if (Str::isUuid($job)) {
                        $pq->orWhere('id', $job);
                    }
                });
            }
            if ($search) {
                $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                $q->where(function ($sq) use ($search, $like) {
                    $sq->where('request_number', $like, "%{$search}%")
                        ->orWhere('notes', $like, "%{$search}%")
                        ->orWhere('admin_forward_notes', $like, "%{$search}%")
                        ->orWhereHas('ship', fn ($sq2) => $sq2->where('name', $like, "%{$search}%"))
                        ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"))
                        ->orWhereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$search}%"));
                });
            }
        });

        $allRequestsTotalHpp = (float) (clone $baseItemsQuery)->sum(DB::raw('hpp_price * quantity'));

        $waitingRequestsTotalHpp = (float) (clone $baseItemsQuery)->where(function ($query) {
            $query->where('status', 'diajukan_ke_direktur')
                ->where(function ($sub) {
                    $sub->where('director_status', 'pending')
                        ->orWhereNull('director_status');
                });
        })->sum(DB::raw('hpp_price * quantity'));

        $approvedRequestsTotalHpp = (float) (clone $baseItemsQuery)
            ->where('director_status', 'approved')
            ->sum(DB::raw('hpp_price * quantity'));

        $rejectedRequestsTotalHpp = (float) (clone $baseItemsQuery)
            ->where('director_status', 'rejected')
            ->sum(DB::raw('hpp_price * quantity'));

        $companies = ShipCompany::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $ships = Ship::where('is_active', true)->orderBy('name')->get(['id', 'name', 'ship_company_id']);
        $jobs = PortCall::query()->latest('created_at')->limit(100)->get(['id', 'job_number', 'ship_id']);

        return Inertia::render('Approvals/Index', [
            'requests' => $pendingRequests,
            'payments' => $pendingPayments,
            'companyExpenses' => $pendingCompanyExpenses,
            'companies' => $companies,
            'ships' => $ships,
            'jobs' => $jobs,
            'counts' => $counts,
            'activeTab' => $tab,
            'search' => $search ?? '',
            'filters' => [
                'tab' => $tab,
                'status' => $tab,
                'search' => $search ?? '',
                'company_id' => $companyId ?? '',
                'ship_id' => $shipId ?? '',
                'job' => $job ?? '',
                'start_date' => $startDate ?? '',
                'end_date' => $endDate ?? '',
                'date' => $date ?? '',
            ],
            'date' => $date ?? '',
            'dailySummary' => $dailySummary,
            'all_requests_total_hpp' => $allRequestsTotalHpp,
            'waiting_requests_total_hpp' => $waitingRequestsTotalHpp,
            'approved_requests_total_hpp' => $approvedRequestsTotalHpp,
            'rejected_requests_total_hpp' => $rejectedRequestsTotalHpp,
            'capabilities' => [
                'can_decide_items' => $request->user()?->isDirector() ?? false,
                'can_view_hpp' => true,
                'is_director' => (bool) $request->user()?->isDirector(),
                'can_process_requests' => $request->user()?->isOperationalAdmin() ?? false,
            ],
        ]);
    }

    public function show(Request $request, string $id): Response|RedirectResponse
    {
        $isUuid = Str::isUuid($id);

        // 1. Try finding PortCall (Job) by ID or job_number
        $portCallQuery = PortCall::with([
            'ship.company',
            'port',
            'workOrder',
            'requests' => fn ($query) => $query
                ->orderByDesc('created_at')
                ->orderByDesc('id'),
            'requests.ship.company',
            'requests.company',
            'requests.port',
            'requests.creator',
            'requests.invoices',
            'requests.items.product.vendor',
            'requests.items.vendor',
            'requests.items.surplusSourceItem:id,item_name,hpp_price',
            'requests.items.costDocumentItem.costDocument',
            'requests.histories',
        ]);

        $portCall = $isUuid
            ? $portCallQuery->where('id', $id)->first()
            : $portCallQuery->where('job_number', $id)->first();

        $shipRequest = null;

        if ($portCall) {
            $reqQuery = $request->query('req');
            if ($reqQuery) {
                $shipRequest = $portCall->requests->first(function ($r) use ($reqQuery) {
                    return $r->id === $reqQuery || $r->request_number === $reqQuery;
                }) ?? $portCall->requests->first();
            } else {
                $shipRequest = $portCall->requests->first();
            }
        } else {
            // 2. Try finding ShipRequest by ID or request_number
            $shipRequestQuery = ShipRequest::with([
                'ship.company',
                'company',
                'port',
                'portCall.port',
                'portCall.workOrder',
                'portCall.ship.company',
                'portCall.requests' => fn ($query) => $query
                    ->orderByDesc('created_at')
                    ->orderByDesc('id'),
                'portCall.requests.creator',
                'portCall.requests.invoices',
                'portCall.requests.items.product.vendor',
                'portCall.requests.items.vendor',
                'portCall.requests.items.surplusSourceItem:id,item_name,hpp_price',
                'portCall.requests.items.costDocumentItem.costDocument',
                'portCall.requests.histories',
                'creator',
                'invoices',
                'items.product.vendor',
                'items.vendor',
                'items.surplusSourceItem:id,item_name,hpp_price',
                'items.costDocumentItem.costDocument',
                'histories',
            ]);

            $shipRequest = $isUuid
                ? (clone $shipRequestQuery)->where('id', $id)->first()
                : (clone $shipRequestQuery)->where('request_number', $id)
                    ->orderByRaw('CASE WHEN ship_id IS NULL AND port_call_id IS NULL THEN 0 ELSE 1 END')
                    ->first();

            if (! $shipRequest) {
                $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                $item = RequestItem::where('item_name', $like, "%{$id}%")->first();
                if ($item) {
                    $shipRequest = (clone $shipRequestQuery)->where('id', $item->request_id)->first();
                }
            }

            if (! $shipRequest) {
                $shipRequest = (clone $shipRequestQuery)->first();
                abort_unless($shipRequest, 404);
            }

            // When a ship request is accessed via /approvals/{request_number}/detail,
            // redirect to its Job detail URL so the user always sees it via its Job / SPK number.
            if ($shipRequest->portCall && ! empty($shipRequest->portCall->job_number)) {
                return redirect()->route('approvals.detail', [
                    'id' => $shipRequest->portCall->job_number,
                    'req' => $shipRequest->request_number,
                ]);
            }

            $portCall = $shipRequest->portCall;
        }

        $allRequests = $portCall ? $portCall->requests : ($shipRequest ? collect([$shipRequest]) : collect());
        $this->prepareApprovalItems($allRequests);

        $canDecideItems = $request->user()?->isDirector() ?? false;

        // Calculate summary figures
        $totalHppPending = 0;
        $totalHppApproved = 0;
        $totalHppRejected = 0;
        $totalHppAll = 0;
        $pendingItemsCount = 0;
        $approvedItemsCount = 0;
        $rejectedItemsCount = 0;
        $totalItemsCount = 0;

        foreach ($allRequests as $req) {
            foreach ($req->items as $item) {
                $qty = (float) $item->quantity;
                $hpp = (float) $item->hpp_price;
                $lineHpp = $qty * $hpp;

                $totalHppAll += $lineHpp;
                $totalItemsCount++;

                if ($item->director_status === 'approved') {
                    $totalHppApproved += $lineHpp;
                    $approvedItemsCount++;
                } elseif ($item->director_status === 'rejected') {
                    $totalHppRejected += $lineHpp;
                    $rejectedItemsCount++;
                } elseif ($item->status === 'diajukan_ke_direktur' && ($item->director_status === 'pending' || is_null($item->director_status))) {
                    $totalHppPending += $lineHpp;
                    $pendingItemsCount++;
                }
            }
        }

        return Inertia::render('Approvals/Show', [
            'job' => $portCall,
            'requests' => $allRequests,
            'request' => $shipRequest ?? $allRequests->first(),
            'capabilities' => [
                'can_decide_items' => $canDecideItems,
                'can_view_hpp' => true,
                'is_director' => (bool) $request->user()?->isDirector(),
                'can_process_requests' => $request->user()?->isOperationalAdmin() ?? false,
            ],
            'summary' => [
                'total_hpp_pending' => $totalHppPending,
                'total_hpp_approved' => $totalHppApproved,
                'total_hpp_rejected' => $totalHppRejected,
                'total_hpp_all' => $totalHppAll,
                'pending_items_count' => $pendingItemsCount,
                'approved_items_count' => $approvedItemsCount,
                'rejected_items_count' => $rejectedItemsCount,
                'total_items_count' => $totalItemsCount,
            ],
        ]);
    }

    public function itemDecision(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'decisions' => ['required', 'array', 'min:1'],
            'decisions.*.item_id' => ['required', 'uuid', 'exists:request_items,id'],
            'decisions.*.status' => ['required', 'in:approved,rejected,pending'],
            'decisions.*.director_notes' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($id, $validated, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);
            $this->authorizeDirectorDecision($request);
            $decidedItemIds = collect();

            if (in_array($shipRequest->status, ['Selesai', 'Dibatalkan'], true)) {
                return redirect()->back()->with('error', 'Pengajuan ini belum dikirim Admin atau sudah selesai ditinjau.');
            }

            $itemIds = collect($validated['decisions'])->pluck('item_id');
            $items = RequestItem::lockForUpdate()
                ->where('request_id', $shipRequest->id)
                ->whereIn('id', $itemIds)
                ->get()
                ->keyBy('id');

            foreach ($validated['decisions'] as $dec) {
                /** @var RequestItem|null $item */
                $item = $items->get($dec['item_id']);
                if (! $item) {
                    abort(404);
                }

                if ($item->status !== 'diajukan_ke_direktur') {
                    continue;
                }

                $status = $dec['status'];
                $item->update([
                    'director_status' => $status,
                    'director_notes' => $dec['director_notes'] ?? $item->director_notes,
                    'status' => match ($status) {
                        'approved' => 'disetujui',
                        'rejected' => 'ditolak',
                        default => 'pending',
                    },
                ]);

                if ($status === 'approved') {
                    $this->createVendorInvoiceWithoutBlockingApproval($item, $request);
                }

                $decidedItemIds->push($item->id);

                activity('request-item-approval')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'decision' => $status,
                        'hpp_price' => (float) $item->hpp_price,
                        'notes' => $dec['director_notes'] ?? null,
                    ])
                    ->log('Direktur memberikan keputusan pada item pengajuan');
            }

            $returnedItems = $decidedItemIds->isNotEmpty()
                ? $this->returnUnselectedItemsToAdmin($shipRequest, $decidedItemIds, $request)
                : collect();
            $returnedItemCount = $returnedItems->count();

            $requestStatus = $this->syncRequestApprovalStatus($shipRequest);

            if ($decidedItemIds->isNotEmpty()) {
                $decidedItems = $shipRequest->items()->whereIn('id', $decidedItemIds)->get();
                $involvedItems = $decidedItems->concat($returnedItems);
                $this->recordApprovalHistory($shipRequest, $involvedItems, $request);
            }

            if (function_exists('activity')) {
                activity('approval')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log("Direktur memutuskan persetujuan item pada pengajuan {$shipRequest->request_number}");
            }

            if ($requestStatus !== 'Menunggu Approval Direktur') {
                $this->workflowNotifier->notifyDirectorDecision($shipRequest, $request->user());
            }

            $message = "Keputusan item pengajuan {$shipRequest->request_number} berhasil disimpan.";
            if ($returnedItemCount > 0) {
                $message .= " {$returnedItemCount} item yang tidak dipilih dikembalikan ke Admin untuk diajukan ulang.";
            }

            return redirect()->back()->with('success', $message);
        });
    }

    public function approveRequest(Request $request, string $id): RedirectResponse
    {
        return DB::transaction(function () use ($id, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);
            $this->authorizeDirectorDecision($request);

            if (in_array($shipRequest->status, ['Selesai', 'Dibatalkan'], true)) {
                return redirect()->back()->with('error', "Pengajuan {$shipRequest->request_number} sudah diproses sebelumnya (Status: {$shipRequest->status}).");
            }

            $forwardedItems = $shipRequest->items()
                ->where('status', 'diajukan_ke_direktur')
                ->where('director_status', 'pending')
                ->lockForUpdate()
                ->get();

            if ($forwardedItems->isEmpty()) {
                return redirect()->back()->with('error', 'Tidak ada item kiriman Admin yang menunggu keputusan Direktur.');
            }

            foreach ($forwardedItems as $item) {
                $item->update([
                    'director_status' => 'approved',
                    'status' => 'disetujui',
                ]);

                $this->createVendorInvoiceWithoutBlockingApproval($item, $request);

                activity('request-item-approval')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'decision' => 'approved',
                        'hpp_price' => (float) $item->hpp_price,
                    ])
                    ->log('Direktur menyetujui item dan mengunci harga');
            }

            $this->syncRequestApprovalStatus($shipRequest);
            $this->recordApprovalHistory($shipRequest, $forwardedItems, $request, 'Menyetujui seluruh item');

            if (function_exists('activity')) {
                activity('approval')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log("Direktur menyetujui seluruh item pengajuan {$shipRequest->request_number}");
            }

            $this->workflowNotifier->notifyDirectorDecision($shipRequest, $request->user());

            return redirect()->back()->with('success', "Pengajuan {$shipRequest->request_number} berhasil disetujui oleh Direktur.");
        });
    }

    public function rejectRequest(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($validated, $id, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->with('items')->findOrFail($id);
            $this->authorizeDirectorDecision($request);

            if (in_array($shipRequest->status, ['Selesai', 'Dibatalkan'], true)) {
                return redirect()->back()->with('error', "Pengajuan {$shipRequest->request_number} tidak dapat ditolak karena berstatus {$shipRequest->status}.");
            }

            $forwardedItems = $shipRequest->items()
                ->where('status', 'diajukan_ke_direktur')
                ->where('director_status', 'pending')
                ->lockForUpdate()
                ->get();

            if ($forwardedItems->isEmpty()) {
                return redirect()->back()->with('error', 'Tidak ada item kiriman Admin yang dapat ditolak.');
            }

            foreach ($forwardedItems as $item) {
                $item->update([
                    'director_status' => 'rejected',
                    'status' => 'ditolak',
                    'director_notes' => $validated['reason'] ?? 'Ditolak oleh Direktur',
                ]);

                activity('request-item-approval')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'decision' => 'rejected',
                        'hpp_price' => (float) $item->hpp_price,
                        'notes' => $validated['reason'] ?? null,
                    ])
                    ->log('Direktur menolak item pengajuan');
            }

            $note = $shipRequest->notes;
            if (! empty($validated['reason'])) {
                $note .= " [Alasan Penolakan Direktur: {$validated['reason']}]";
            }

            $shipRequest->update(['notes' => $note]);
            $this->syncRequestApprovalStatus($shipRequest);
            $this->recordApprovalHistory($shipRequest, $forwardedItems, $request, $validated['reason'] ?? 'Ditolak oleh Direktur');
            $this->workflowNotifier->notifyDirectorDecision($shipRequest, $request->user());

            return redirect()->back()->with('success', "Pengajuan {$shipRequest->request_number} telah ditolak.");
        });
    }

    public function verifyPayment(Request $request, string $id): RedirectResponse
    {
        $this->authorizeDirectorDecision($request);

        return DB::transaction(function () use ($request, $id) {
            $payment = OutgoingPayment::lockForUpdate()->findOrFail($id);

            if ($payment->verification_status === 'verified') {
                return redirect()->back()->with('error', "Pembayaran {$payment->reference_number} sudah diverifikasi sebelumnya.");
            }

            $payment->update([
                'verification_status' => 'verified',
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
            ]);

            return redirect()->back()->with('success', "Pembayaran {$payment->reference_number} telah diverifikasi.");
        });
    }

    public function singleItemDecision(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected,pending'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($id, $validated, $request) {
            $item = RequestItem::query()->lockForUpdate()->with('request')->findOrFail($id);
            $this->authorizeDirectorDecision($request);

            if (! $item->request || $item->status !== 'diajukan_ke_direktur') {
                return redirect()->back()->with('error', 'Item ini belum dikirim Admin atau sudah diputuskan sebelumnya.');
            }

            if (in_array($item->request->status, ['Selesai', 'Dibatalkan'], true)) {
                return redirect()->back()->with('error', 'Pengajuan ini belum dikirim Admin atau sudah selesai ditinjau.');
            }

            $status = $validated['decision'];
            $item->update([
                'director_status' => $status,
                'director_notes' => $validated['notes'] ?? $item->director_notes,
                'status' => match ($status) {
                    'approved' => 'disetujui',
                    'rejected' => 'ditolak',
                    default => 'diajukan_ke_direktur',
                },
            ]);

            if ($status === 'approved') {
                $this->createVendorInvoiceWithoutBlockingApproval($item, $request);
            }

            activity('request-item-approval')
                ->performedOn($item)
                ->causedBy($request->user())
                ->withProperties([
                    'request_id' => $item->request->id,
                    'decision' => $status,
                    'hpp_price' => (float) $item->hpp_price,
                    'notes' => $validated['notes'] ?? null,
                ])
                ->log('Direktur memberikan keputusan pada item pengajuan');

            $requestStatus = $this->syncRequestApprovalStatus($item->request);
            $this->recordApprovalHistory($item->request, collect([$item]), $request, $validated['notes'] ?? null);

            if ($requestStatus !== 'Menunggu Approval Direktur') {
                $this->workflowNotifier->notifyDirectorDecision($item->request, $request->user());
            }

            return redirect()->back()->with('success', "Status item {$item->item_name} berhasil diubah menjadi {$status}.");
        });
    }

    private function authorizeDirectorDecision(Request $request): void
    {
        if (! $request->user()?->isDirector()) {
            abort(403, 'Hanya Direktur yang dapat memberikan keputusan pengajuan.');
        }
    }

    /**
     * Approval Direktur tetap berlaku meskipun invoice vendor otomatis perlu ditinjau Admin.
     */
    private function createVendorInvoiceWithoutBlockingApproval(RequestItem $item, Request $request): void
    {
        try {
            $this->createVendorInvoiceFromApprovedItem->handle($item, $request->user());
        } catch (ValidationException $exception) {
            logger()->warning('Invoice vendor otomatis tidak dibuat setelah approval item.', [
                'request_item_id' => $item->id,
                'request_id' => $item->request_id,
                'validation_errors' => $exception->errors(),
            ]);
        }
    }

    private function syncRequestApprovalStatus(ShipRequest $shipRequest): string
    {
        $items = $shipRequest->items()->get(['status', 'director_status']);
        $awaitingDirector = $items->where('status', 'diajukan_ke_direktur')
            ->where('director_status', 'pending')
            ->count();
        $status = $shipRequest->resolveWorkflowStatus($items);

        $shipRequest->update([
            'status' => $status,
            'director_reviewed_at' => $awaitingDirector === 0 ? now() : null,
            'cancelled_at' => $status === 'Ditolak' ? now() : null,
        ]);

        return $status;
    }

    /**
     * @param  Collection<int, string>  $decidedItemIds
     * @return Collection<int, RequestItem>
     */
    private function returnUnselectedItemsToAdmin(
        ShipRequest $shipRequest,
        Collection $decidedItemIds,
        Request $request
    ): Collection {
        $unselectedItems = $shipRequest->items()
            ->where('status', 'diajukan_ke_direktur')
            ->where('director_status', 'pending')
            ->whereNotIn('id', $decidedItemIds)
            ->lockForUpdate()
            ->get();

        foreach ($unselectedItems as $item) {
            $item->update([
                'status' => 'pending',
                'director_status' => 'pending',
                'director_notes' => 'Belum diputuskan Direktur. Silakan ajukan ulang setelah ditinjau Admin.',
            ]);

            if (function_exists('activity')) {
                activity('request-item-approval')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'decision' => 'returned_to_admin',
                    ])
                    ->log('Item yang tidak dipilih Direktur dikembalikan ke Admin');
            }
        }

        return $unselectedItems;
    }

    /**
     * @param  Collection<int, RequestItem>  $affectedItems
     */
    private function recordApprovalHistory(
        ShipRequest $shipRequest,
        Collection $affectedItems,
        Request $request,
        ?string $generalNotes = null
    ): void {
        if ($affectedItems->isEmpty()) {
            return;
        }

        $approvedCount = $affectedItems->where('director_status', 'approved')->count();
        $rejectedCount = $affectedItems->where('director_status', 'rejected')->count();
        $returnedCount = $affectedItems->filter(fn ($it) => $it->director_status !== 'approved' && $it->director_status !== 'rejected')->count();

        if ($approvedCount > 0 && ($returnedCount > 0 || $rejectedCount > 0)) {
            $action = 'director_partial_approval';
            $title = 'Keputusan Direktur: Disetujui Sebagian oleh Pak Ryan';
        } elseif ($approvedCount === $affectedItems->count()) {
            $action = 'director_approved';
            $title = 'Disetujui Penuh oleh Pak Ryan (Direktur)';
        } elseif ($rejectedCount === $affectedItems->count()) {
            $action = 'director_rejected';
            $title = 'Ditolak oleh Pak Ryan (Direktur)';
        } else {
            $action = 'returned_to_admin';
            $title = 'Item Dikembalikan ke Bu Titik (Admin) oleh Pak Ryan';
        }

        $summaryParts = [];
        if ($approvedCount > 0) {
            $summaryParts[] = "{$approvedCount} item disetujui";
        }
        if ($returnedCount > 0) {
            $summaryParts[] = "{$returnedCount} item dikembalikan ke Bu Titik";
        }
        if ($rejectedCount > 0) {
            $summaryParts[] = "{$rejectedCount} item ditolak";
        }
        $summary = implode(', ', $summaryParts);

        $notes = $generalNotes ? "{$generalNotes} ({$summary})" : $summary;

        $snapshot = $affectedItems->map(fn ($it) => [
            'item_id' => $it->id,
            'item_name' => $it->item_name,
            'quantity' => (float) $it->quantity,
            'unit' => $it->unit,
            'hpp_price' => (float) $it->hpp_price,
            'status' => $it->status,
            'director_status' => $it->director_status,
            'director_notes' => $it->director_notes,
        ])->values()->all();

        RequestHistory::create([
            'request_id' => $shipRequest->id,
            'user_id' => $request->user()?->id,
            'actor_name' => $request->user()?->name ?? 'Pak Ryan',
            'actor_role' => 'Direktur',
            'action' => $action,
            'title' => $title,
            'notes' => $notes,
            'submission_date' => now()->toDateString(),
            'action_date' => now(),
            'items_snapshot' => $snapshot,
        ]);
    }

    /** @param Collection<int, ShipRequest> $shipRequests */
    private function prepareApprovalItems(Collection $shipRequests): void
    {
        RequestItemHistoryBuilder::attachHistoryToRequests($shipRequests);

        RequestItemHistoryBuilder::attachHistoryToRequests($shipRequests);

        $shipRequests->each(function (ShipRequest $shipRequest): void {
            $shipRequest->items->each(function (RequestItem $item): void {
                $costDocument = $item->costDocumentItem?->costDocument;
                $attachmentExtension = Str::lower(pathinfo((string) $item->attachment_path, PATHINFO_EXTENSION));
                $supplierInvoiceExtension = Str::lower(pathinfo((string) $item->supplier_invoice_path, PATHINFO_EXTENSION));
                $item->setAttribute('attachment_url', $item->attachment_path
                    ? route('request-items.attachment', $item)
                    : null);
                $item->setAttribute('attachment_is_image', in_array($attachmentExtension, ['jpg', 'jpeg', 'png', 'webp'], true));
                $item->setAttribute('supplier_invoice_url', $item->supplier_invoice_path
                    ? route('request-items.supplier-invoice.show', $item)
                    : null);
                $item->setAttribute('supplier_invoice_is_image', in_array($supplierInvoiceExtension, ['jpg', 'jpeg', 'png', 'webp'], true));
                $item->setAttribute('supplier_invoice_complete', $item->hasCompleteSupplierInvoice());
                $item->setAttribute(
                    'vendor_invoice_url',
                    $costDocument?->document_type === 'vendor_invoice'
                        ? route('vendor-invoices.document', $costDocument)
                        : null,
                );
                $item->setAttribute('surplus_source_item_name', $item->surplusSourceItem?->item_name);
                $item->setAttribute('surplus_amount', (float) ($item->surplus_amount ?? 0));
                $item->setAttribute('original_hpp_price', (float) ($item->original_hpp_price ?? $item->hpp_price));
                $item->makeHidden(['selling_price', 'attachment_path', 'supplier_invoice_path']);
            });
        });
    }

    public function batchItemDecision(Request $request): RedirectResponse
    {
        $this->authorizeDirectorDecision($request);

        $validated = $request->validate([
            'decisions' => ['required', 'array', 'min:1'],
            'decisions.*.item_id' => ['required', 'uuid', 'exists:request_items,id'],
            'decisions.*.status' => ['required', 'in:approved,pending,rejected'],
            'decisions.*.director_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $result = DB::transaction(function () use ($validated, $request): array {
            $itemIds = collect($validated['decisions'])->pluck('item_id');
            $items = RequestItem::lockForUpdate()->whereIn('id', $itemIds)->get()->keyBy('id');
            $decidedItemIdsByRequest = collect();
            $approvedItemCount = 0;
            $returnedItemCount = 0;

            foreach ($validated['decisions'] as $dec) {
                /** @var RequestItem|null $item */
                $item = $items->get($dec['item_id']);
                if (! $item || $item->status !== 'diajukan_ke_direktur') {
                    continue;
                }

                $status = $dec['status'];
                $directorNotes = $status === 'pending'
                    ? ($dec['director_notes'] ?? 'Belum diputuskan Direktur. Silakan ajukan ulang setelah ditinjau Admin.')
                    : ($dec['director_notes'] ?? $item->director_notes);

                $item->update([
                    'director_status' => $status,
                    'director_notes' => $directorNotes,
                    'status' => match ($status) {
                        'approved' => 'disetujui',
                        'rejected' => 'ditolak',
                        default => 'pending',
                    },
                ]);

                if ($status === 'approved') {
                    $approvedItemCount++;
                    $this->createVendorInvoiceWithoutBlockingApproval($item, $request);
                } elseif ($status === 'pending') {
                    $returnedItemCount++;
                }

                if (function_exists('activity')) {
                    activity('request-item-approval')
                        ->performedOn($item)
                        ->causedBy($request->user())
                        ->withProperties([
                            'request_id' => $item->request_id,
                            'decision' => $status,
                            'hpp_price' => (float) $item->hpp_price,
                            'notes' => $dec['director_notes'] ?? null,
                        ])
                        ->log($status === 'pending'
                            ? 'Item yang tidak dipilih Direktur dikembalikan ke Admin'
                            : 'Direktur memberikan keputusan pada item pengajuan');
                }

                $requestItemIds = $decidedItemIdsByRequest->get($item->request_id, collect());
                $requestItemIds->push($item->id);
                $decidedItemIdsByRequest->put($item->request_id, $requestItemIds);
            }

            $decidedRequests = collect();

            foreach ($decidedItemIdsByRequest as $requestId => $decidedItemIds) {
                $shipRequest = ShipRequest::lockForUpdate()->find($requestId);
                if ($shipRequest) {
                    $returnedItems = $this->returnUnselectedItemsToAdmin(
                        $shipRequest,
                        $decidedItemIds,
                        $request
                    );
                    $returnedItemCount += $returnedItems->count();
                    $requestStatus = $this->syncRequestApprovalStatus($shipRequest);
                    if ($requestStatus !== 'Menunggu Approval Direktur') {
                        $decidedRequests->push($shipRequest);
                    }

                    $decidedItems = $shipRequest->items()->whereIn('id', $decidedItemIds)->get();
                    $involvedItems = $decidedItems->concat($returnedItems);
                    $this->recordApprovalHistory($shipRequest, $involvedItems, $request);
                }
            }

            $message = 'Keputusan Direktur berhasil disimpan.';
            if ($returnedItemCount > 0) {
                $message .= " {$returnedItemCount} item yang tidak dipilih dikembalikan ke Admin untuk diajukan ulang.";
            }

            return [
                'approved_item_count' => $approvedItemCount,
                'returned_item_count' => $returnedItemCount,
                'decided_requests' => $decidedRequests,
                'message' => $message,
            ];
        });

        if ($result['decided_requests']->isNotEmpty()) {
            $this->workflowNotifier->notifyBatchDirectorDecision(
                $result['decided_requests'],
                $request->user(),
                $result['approved_item_count'],
                $result['returned_item_count'],
            );
        }

        return redirect()->back()->with('success', $result['message']);
    }

    public function decideCompanyExpense(Request $request, ExpenseRequest $expenseRequest, DecideCompanyExpenseAction $action): RedirectResponse
    {
        abort_unless($request->user()?->isDirector(), 403);
        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'notes' => ['nullable', 'required_if:decision,reject', 'string', 'max:1000'],
        ]);

        $action->execute(
            $request->user(),
            $expenseRequest,
            $validated['decision'],
            $validated['notes'] ?? null,
            'approval'
        );

        return redirect()->back()->with('success', 'Keputusan pengajuan biaya perusahaan berhasil disimpan.');
    }
}
