<?php

namespace App\Http\Controllers;

use App\Actions\ResolveClearanceProduct;
use App\Models\CompletionNote;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Product;
use App\Models\ProductPortPrice;
use App\Models\RequestItem;
use App\Models\ServiceType;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\Vendor;
use App\Models\WorkOrder;
use App\Support\WorkflowNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class RequestController extends Controller
{
    public function __construct(
        private readonly WorkflowNotifier $workflowNotifier,
        private readonly ResolveClearanceProduct $resolveClearanceProduct,
    ) {}

    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'semua');
        $search = $request->query('search');
        $companyId = $request->query('company_id');
        $shipId = $request->query('ship_id');
        $jobNumber = $request->query('job');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $includedStatuses = match ($tab) {
            'menunggu' => ['Menunggu Approval', 'Menunggu', 'pending'],
            'diproses' => ['Dalam Proses', 'Diproses', 'Disetujui', 'Disetujui Sebagian'],
            'selesai', 'riwayat' => ['Selesai', 'Dibatalkan'],
            default => null,
        };
        $excludedStatuses = $tab === 'aktif' ? ['Selesai', 'Dibatalkan'] : null;

        $query = ShipRequest::query()->with([
            'ship.company',
            'company',
            'port',
            'portCall.workOrder',
            'portCall.port',
            'creator',
            'invoices',
            'items.product.vendor',
            'items.vendor',
            'items.costDocumentItem.costDocument',
        ]);

        if ($includedStatuses) {
            $query->whereIn('status', $includedStatuses);
        } elseif ($excludedStatuses) {
            $query->whereNotIn('status', $excludedStatuses);
        }

        if ($companyId) {
            $query->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)
                    ->orWhereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId));
            });
        }

        if ($shipId) {
            $query->where('ship_id', $shipId);
        }

        if ($jobNumber) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($jobNumber, $like) {
                $q->where('request_number', $like, "%{$jobNumber}%")
                    ->orWhereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$jobNumber}%"));
            });
        }

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        if ($search) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $like) {
                $q->where('request_number', $like, "%{$search}%")
                    ->orWhere('notes', $like, "%{$search}%")
                    ->orWhere('admin_forward_notes', $like, "%{$search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$search}%"))
                    ->orWhereHas('items', fn ($iq) => $iq->where('item_name', $like, "%{$search}%"))
                    ->orWhereHas('portCall', fn ($pq) => $pq->where('job_number', $like, "%{$search}%"));
            });
        }

        $requests = $query->orderByDesc('created_at')->get();

        $portCallsQuery = PortCall::query()->with([
            'ship.company',
            'port',
            'workOrder',
        ]);

        if ($includedStatuses) {
            $portCallsQuery->whereHas('requests', fn ($query) => $query->whereIn('status', $includedStatuses));
        } elseif ($excludedStatuses) {
            $portCallsQuery->whereHas('requests', fn ($query) => $query->whereNotIn('status', $excludedStatuses));
        }

        if ($companyId) {
            $portCallsQuery->whereHas('ship', fn ($sq) => $sq->where('ship_company_id', $companyId));
        }

        if ($shipId) {
            $portCallsQuery->where('ship_id', $shipId);
        }

        if ($jobNumber) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $portCallsQuery->where('job_number', $like, "%{$jobNumber}%");
        }

        if ($startDate) {
            $portCallsQuery->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $portCallsQuery->whereDate('created_at', '<=', $endDate);
        }

        if ($search) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $portCallsQuery->where(function ($query) use ($search, $like) {
                $query->where('job_number', $like, "%{$search}%")
                    ->orWhereHas('ship', function ($shipQuery) use ($search, $like) {
                        $shipQuery->where('name', $like, "%{$search}%")
                            ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', $like, "%{$search}%"));
                    })
                    ->orWhereHas('port', fn ($portQuery) => $portQuery->where('name', $like, "%{$search}%"))
                    ->orWhereHas('requests', function ($requestQuery) use ($search, $like) {
                        $requestQuery->where('request_number', $like, "%{$search}%")
                            ->orWhere('notes', $like, "%{$search}%")
                            ->orWhere('admin_forward_notes', $like, "%{$search}%")
                            ->orWhereHas('items', fn ($itemQuery) => $itemQuery->where('item_name', $like, "%{$search}%"));
                    });
            });
        }

        $portCalls = $portCallsQuery->orderByDesc('created_at')->get();

        $countRows = function (?array $included = null, ?array $excluded = null): int {
            $portCallQuery = PortCall::query();
            $orphanRequestQuery = ShipRequest::query()->whereNull('port_call_id');

            if ($included) {
                $portCallQuery->whereHas('requests', fn ($query) => $query->whereIn('status', $included));
                $orphanRequestQuery->whereIn('status', $included);
            } elseif ($excluded) {
                $portCallQuery->whereHas('requests', fn ($query) => $query->whereNotIn('status', $excluded));
                $orphanRequestQuery->whereNotIn('status', $excluded);
            }

            return $portCallQuery->count() + $orphanRequestQuery->count();
        };

        $semuaCount = $countRows();
        $menungguCount = $countRows(['Menunggu Approval', 'Menunggu', 'pending']);
        $diprosesCount = $countRows(['Dalam Proses', 'Diproses', 'Disetujui', 'Disetujui Sebagian']);
        $selesaiCount = $countRows(['Selesai', 'Dibatalkan']);
        $activeCount = $countRows(null, ['Selesai', 'Dibatalkan']);
        $historyCount = $selesaiCount;

        $ships = Ship::query()->where('is_active', true)->with('company')->orderBy('name')->get();
        $companies = ShipCompany::query()->where('is_active', true)->orderBy('name')->get();
        $ports = Port::query()->where('is_active', true)->orderBy('name')->get();
        $products = Product::query()->where('is_active', true)->with('vendor')->orderBy('name')->get();
        $vendors = Vendor::query()->where('is_active', true)->orderBy('name')->get();

        $canReviewPrices = $request->user()?->isOperationalAdmin() ?? false;
        $canDecideItems = $request->user()?->isDirector() ?? false;
        $canViewHpp = $canReviewPrices || $canDecideItems || ($request->user()?->isOwner() ?? false);

        if (! $canViewHpp) {
            $requests->each(function ($req) {
                $req->items->each->makeHidden('hpp_price');
            });
            $products->each->makeHidden('hpp_default');
        }

        $this->prepareRequestItems($requests);
        $products->each->makeHidden('selling_price_default');

        $jobs = PortCall::query()->latest('created_at')->limit(100)->get(['id', 'job_number', 'ship_id']);

        return Inertia::render('Requests/Index', [
            'requests' => $requests,
            'portCalls' => $portCalls,
            'ships' => $ships,
            'companies' => $companies,
            'ports' => $ports,
            'products' => $products,
            'vendors' => $vendors,
            'jobs' => $jobs,
            'capabilities' => [
                'can_review_prices' => $canReviewPrices,
                'can_decide_items' => $canDecideItems,
                'can_view_hpp' => $canViewHpp,
                'can_create_requests' => $request->user()?->can('create', ShipRequest::class) ?? false,
                'can_process_requests' => $request->user()?->isOperationalAdmin() ?? false,
            ],
            'counts' => [
                'semua' => $semuaCount,
                'menunggu' => $menungguCount,
                'diproses' => $diprosesCount,
                'selesai' => $selesaiCount,
                'aktif' => $activeCount,
                'riwayat' => $historyCount,
            ],
            'activeTab' => $tab,
            'search' => $search ?? '',
            'filters' => [
                'search' => $search ?? '',
                'company_id' => $companyId ?? '',
                'ship_id' => $shipId ?? '',
                'job' => $jobNumber ?? '',
                'start_date' => $startDate ?? '',
                'end_date' => $endDate ?? '',
            ],
        ]);
    }

    public function show(Request $request, string $id): Response
    {
        $isUuid = Str::isUuid($id);

        // 1. Try finding PortCall (Job) by ID or job_number
        $portCallQuery = PortCall::with([
            'ship.company',
            'port',
            'workOrder',
            'completionNote:id,port_call_id,document_number,status',
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
                'portCall.completionNote:id,port_call_id,document_number,status',
                'portCall.requests' => fn ($query) => $query
                    ->orderByDesc('created_at')
                    ->orderByDesc('id'),
                'portCall.requests.creator',
                'portCall.requests.invoices',
                'portCall.requests.items.product.vendor',
                'portCall.requests.items.vendor',
                'portCall.requests.items.surplusSourceItem:id,item_name,hpp_price',
                'portCall.requests.items.costDocumentItem.costDocument',
                'creator',
                'invoices',
                'items.product.vendor',
                'items.vendor',
                'items.surplusSourceItem:id,item_name,hpp_price',
                'items.costDocumentItem.costDocument',
            ]);

            $shipRequest = $isUuid
                ? $shipRequestQuery->where('id', $id)->firstOrFail()
                : $shipRequestQuery->where('request_number', $id)->firstOrFail();

            $portCall = $shipRequest->portCall;
        }

        $allRequests = $portCall ? $portCall->requests : ($shipRequest ? collect([$shipRequest]) : collect());
        if ($shipRequest) {
            Gate::authorize('view', $shipRequest);
        }

        $products = Product::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get([
                'id',
                'code',
                'name',
                'unit',
                'item_type',
                'selling_price_default',
                'hpp_default',
            ]);
        $vendors = Vendor::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $canReviewPrices = $request->user()?->isOperationalAdmin() ?? false;
        $canDecideItems = $request->user()?->isDirector() ?? false;
        $canViewHpp = $canReviewPrices || $canDecideItems || ($request->user()?->isOwner() ?? false);
        $canCreateRequests = $request->user()?->can('create', ShipRequest::class) ?? false;
        $canCreateRequestsForJob = $canCreateRequests
            && (! $portCall || $portCall->acceptsNewRequests());
        $canPrintRequestReports = ($request->user()?->can('reports.view') ?? false)
            || ($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']) ?? false);

        if (! $canViewHpp) {
            if ($shipRequest) {
                $shipRequest->items->each->makeHidden('hpp_price');
            }
            foreach ($allRequests as $req) {
                $req->items->each->makeHidden('hpp_price');
            }
            $products->each->makeHidden('hpp_default');
        }

        $this->prepareRequestItems($allRequests);
        $products->each->makeHidden('selling_price_default');

        return Inertia::render('Requests/Show', [
            'job' => $portCall,
            'requests' => $allRequests,
            'request' => $shipRequest ?? $allRequests->first(),
            'products' => $products,
            'vendors' => $vendors,
            'capabilities' => [
                'can_review_prices' => $canReviewPrices,
                'can_decide_items' => $canDecideItems,
                'can_view_hpp' => $canViewHpp,
                'can_create_requests' => $canCreateRequestsForJob,
                'can_process_requests' => $request->user()?->isOperationalAdmin() ?? false,
                'can_create_completion_notes' => $request->user()?->can('create', CompletionNote::class) ?? false,
                'can_print_request_reports' => $canPrintRequestReports,
            ],
        ]);
    }

    /**
     * Show 3-Step Wizard for Lapangan (Pak Prima)
     */
    public function create(Request $request): Response
    {
        Gate::authorize('create', ShipRequest::class);

        $companies = ShipCompany::where('is_active', true)->orderBy('name')->get();
        $ships = Ship::where('is_active', true)->with('company')->orderBy('name')->get();
        $portCalls = PortCall::query()
            ->whereHas('ship', fn ($query) => $query->where('is_active', true))
            ->whereIn('status', ['scheduled', 'anchored', 'berthed'])
            ->with([
                'ship.company',
                'port',
                'workOrder',
                'clearanceInRequests:id,port_call_id,request_number',
            ])
            ->orderByDesc('eta_at')
            ->orderByDesc('created_at')
            ->get()
            ->each(function (PortCall $portCall): void {
                $portCall->setAttribute('clearance_in_block_reason', $portCall->clearanceInBlockReason());
                $portCall->setAttribute('active_clearance_in_request_number', $portCall->clearanceInRequests->first()?->request_number);
                $portCall->setAttribute('can_clearance_out', in_array($portCall->status, ['anchored', 'berthed'], true));
                $portCall->unsetRelation('clearanceInRequests');
            });
        $ports = Port::where('is_active', true)->orderBy('name')->get();
        $serviceTypes = ServiceType::where('is_active', true)->orderByDesc('is_default')->orderBy('name')->get();
        $products = Product::where('is_active', true)->with(['vendor', 'portPrices'])->orderBy('item_type')->orderBy('name')->get();

        $users = User::query()
            ->where('is_active', true)
            ->with('roles:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $user) => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'role' => $user->roles->first()?->name ?? 'Staff',
            ]);

        return Inertia::render('Requests/Create', [
            'companies' => $companies,
            'ships' => $ships,
            'portCalls' => $portCalls,
            'ports' => $ports,
            'serviceTypes' => $serviceTypes,
            'products' => $products,
            'users' => $users,
        ]);
    }

    /**
     * Store 3-Step Wizard submission with multi NeedItems
     */
    public function storeWizard(Request $request): RedirectResponse
    {
        Gate::authorize('create', ShipRequest::class);

        $validated = $request->validate([
            // Wizard 1: Perusahaan, Kapal, Type, Pelabuhan
            'company_id' => ['nullable', 'uuid', 'exists:ship_companies,id'],
            'is_new_company' => ['nullable', 'boolean'],
            'new_company_name' => ['nullable', 'required_if:is_new_company,true', 'string', 'max:255'],
            'ship_id' => ['nullable', 'uuid', 'exists:ships,id'],
            'port_call_id' => ['nullable', 'uuid', 'exists:port_calls,id'],
            'is_new_ship' => ['nullable', 'boolean'],
            'new_ship_name' => ['nullable', 'required_if:is_new_ship,true', 'string', 'max:255'],
            'new_ship_imo' => ['nullable', 'string', 'max:50'],
            'service_type' => ['required', 'string'], // 'Sandar' | 'Labuh'
            'port_id' => ['required', 'uuid', 'exists:ports,id'],

            // Wizard 2: NeedItems multiple
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.1'],
            'items.*.unit' => ['required', 'string', 'max:50'],
            'items.*.required_date' => ['nullable', 'date'],
            'items.*.required_time' => ['nullable', 'string'],
            'items.*.notes' => ['nullable', 'string', 'max:1000'],
            'items.*.is_urgent' => ['nullable', 'boolean'],
            'items.*.attachment' => ['nullable', 'file', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'extensions:pdf,doc,docx,jpg,jpeg,png', 'max:10240'],

            // General notes & creator
            'notes' => ['nullable', 'string', 'max:1000'],
            'created_by' => ['nullable', 'exists:users,id'],
        ]);

        $uploadedPaths = [];

        try {
            return DB::transaction(function () use ($validated, $request, &$uploadedPaths) {
                // 1. Resolve Company
                $companyId = $validated['company_id'] ?? null;
                if (! empty($validated['is_new_company']) && ! empty($validated['new_company_name'])) {
                    $code = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $validated['new_company_name']), 0, 3));
                    $newComp = ShipCompany::create([
                        'name' => trim($validated['new_company_name']),
                        'code' => $code,
                        'is_active' => true,
                    ]);
                    $companyId = $newComp->id;
                }

                // 2. Resolve Ship
                $shipId = $validated['ship_id'] ?? null;
                if (! empty($validated['is_new_ship']) && ! empty($validated['new_ship_name'])) {
                    $newShip = Ship::create([
                        'name' => trim($validated['new_ship_name']),
                        'imo_number' => $validated['new_ship_imo'] ?? null,
                        'ship_type' => null,
                        'status' => $validated['service_type'] === 'Labuh' ? 'Labuh' : 'Akan Datang',
                        'ship_company_id' => $companyId,
                        'is_active' => true,
                    ]);
                    $shipId = $newShip->id;
                }

                if (! $shipId) {
                    return redirect()->back()->with('error', 'Silakan pilih atau tambahkan data kapal.');
                }

                // If company is not selected, get it from ship
                if (! $companyId) {
                    $ship = Ship::find($shipId);
                    $companyId = $ship?->ship_company_id;
                }

                // 3. Generate Request Number
                $lastReq = ShipRequest::orderByDesc('created_at')->lockForUpdate()->first();
                $nextNum = 250;
                if ($lastReq && preg_match('/REQ-(\d+)/', $lastReq->request_number, $matches)) {
                    $nextNum = (int) $matches[1] + 1;
                }
                $reqNumber = sprintf('REQ-%05d', $nextNum);

                // 4. Create ShipRequest
                $portCall = ! empty($validated['port_call_id'])
                    ? PortCall::whereKey($validated['port_call_id'])->where('ship_id', $shipId)->lockForUpdate()->first()
                    : PortCall::where('ship_id', $shipId)->latest()->lockForUpdate()->first();

                if (! empty($validated['port_call_id']) && ! $portCall) {
                    throw ValidationException::withMessages([
                        'port_call_id' => 'Kunjungan / job tidak sesuai dengan kapal yang dipilih.',
                    ]);
                }

                if ($portCall && ! $portCall->acceptsNewRequests()) {
                    throw ValidationException::withMessages([
                        'port_call_id' => 'Pengajuan baru tidak dapat dibuat karena kunjungan / job sudah berstatus Selesai.',
                    ]);
                }
                $createdBy = (! empty($validated['created_by']) && ($request->user()?->isOperationalAdmin() || $request->user()?->isDirector() || $request->user()?->isOwner()))
                    ? $validated['created_by']
                    : $request->user()->id;

                $newRequest = ShipRequest::create([
                    'request_number' => $reqNumber,
                    'ship_id' => $shipId,
                    'company_id' => $companyId,
                    'port_id' => $validated['port_id'],
                    'port_call_id' => $portCall?->id,
                    'service_type' => $validated['service_type'],
                    'created_by' => $createdBy,
                    'status' => 'Menunggu Approval',
                    'request_date' => now()->toDateString(),
                    'notes' => $validated['notes'] ?? null,
                ]);

                // 5. Create RequestItems
                foreach ($validated['items'] as $item) {
                    $productId = $item['product_id'] ?? null;
                    $hppPrice = 0.00;
                    $vendorId = null;
                    $itemType = 'non_jasa';

                    if ($productId) {
                        $prod = Product::find($productId);
                        if ($prod) {
                            $itemType = $prod->item_type;
                            $hppPrice = (float) $prod->hpp_default;
                            $vendorId = $prod->vendor_id;

                            // Check port price matrix
                            $portPrice = ProductPortPrice::where('product_id', $productId)
                                ->where('port_id', $validated['port_id'])
                                ->where('service_type', $validated['service_type'])
                                ->first();

                        }
                    } elseif (! empty($item['item_name'])) {
                        $prod = Product::where('name', $item['item_name'])->first();
                        if ($prod) {
                            $productId = $prod->id;
                            $itemType = $prod->item_type;
                            $hppPrice = (float) $prod->hpp_default;
                            $vendorId = $prod->vendor_id;
                        }
                    }

                    $attachmentPath = null;
                    if (isset($item['attachment']) && $item['attachment'] instanceof UploadedFile) {
                        $attachmentPath = $item['attachment']->store('sja/request-items', 'local');
                        $uploadedPaths[] = $attachmentPath;
                    }

                    RequestItem::create([
                        'request_id' => $newRequest->id,
                        'product_id' => $productId,
                        'vendor_id' => $vendorId,
                        'item_type' => $itemType,
                        'item_name' => $item['item_name'],
                        'unit' => $item['unit'],
                        'quantity' => $item['quantity'],
                        'required_date' => $item['required_date'] ?? now()->toDateString(),
                        'required_time' => $item['required_time'] ?? null,
                        'hpp_price' => $hppPrice,
                        'selling_price' => 0,
                        'attachment_path' => $attachmentPath,
                        'status' => 'pending',
                        'director_status' => 'pending',
                        'is_urgent' => ! empty($item['is_urgent']),
                        'notes' => $item['notes'] ?? null,
                    ]);
                }

                if (function_exists('activity')) {
                    activity('request')
                        ->performedOn($newRequest)
                        ->causedBy($request->user())
                        ->log("Operasional mengajukan form kebutuhan {$reqNumber} (".count($validated['items']).' item)');
                }

                $this->workflowNotifier->notifySubmission($newRequest, $request->user());

                return redirect()->route('requests.index')->with('success', "Pengajuan {$reqNumber} berhasil diajukan.");
            });
        } catch (Throwable $exception) {
            foreach ($uploadedPaths as $path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }
    }

    /**
     * Store Multi-Kapal Submission (Alur Pengajuan Multi Kapal)
     */
    public function storeMulti(Request $request): RedirectResponse
    {
        Gate::authorize('create', ShipRequest::class);

        $validated = $request->validate([
            'ships' => ['required', 'array', 'min:1'],
            'ships.*.ship_id' => ['required', 'uuid', 'exists:ships,id'],
            'ships.*.port_call_id' => ['required', 'uuid', 'distinct', 'exists:port_calls,id'],
            'ships.*.request_type' => [
                'required',
                'string',
                Rule::in([
                    'Kedatangan (Clearance In)',
                    'Perpanjangan Surat / Endors Surat Laut',
                    'Keberangkatan (Clearance Out)',
                    'Kebutuhan Kapal',
                ]),
            ],
            'ships.*.department' => ['nullable', 'string'],
            'ships.*.order_date' => ['nullable', 'date'],
            'ships.*.requester_name' => ['nullable', 'string', 'max:255'],
            'ships.*.requester_phone' => ['nullable', 'string', 'max:50'],
            'ships.*.required_date' => ['nullable', 'date'],
            'ships.*.required_time' => ['nullable', 'string'],
            'ships.*.requested_port_call_status' => ['nullable', 'string', 'in:anchored,berthed,departed'],
            'ships.*.operational_occurred_at' => ['nullable', 'date', 'before_or_equal:today'],
            'ships.*.notes' => ['nullable', 'string', 'max:1000'],
            'ships.*.items' => ['nullable', 'array'],
            'ships.*.items.*.product_id' => ['nullable', 'uuid'],
            'ships.*.items.*.item_type' => ['nullable', 'string'],
            'ships.*.items.*.item_name' => ['required_with:ships.*.items', 'string', 'max:255'],
            'ships.*.items.*.quantity' => ['required_with:ships.*.items', 'numeric', 'min:0.1'],
            'ships.*.items.*.unit' => ['required_with:ships.*.items', 'string', 'max:50'],
            'ships.*.items.*.hpp_price' => ['nullable', 'numeric', 'min:0'],
            'ships.*.items.*.required_date' => ['nullable', 'date'],
            'ships.*.items.*.required_time' => ['nullable', 'string'],
            'ships.*.items.*.is_urgent' => ['nullable', 'boolean'],
            'ships.*.items.*.notes' => ['nullable', 'string', 'max:1000'],
            'ships.*.items.*.attachment' => ['nullable', 'file', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'extensions:pdf,doc,docx,jpg,jpeg,png', 'max:10240'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'created_by' => ['nullable', 'exists:users,id'],
        ]);

        $uploadedPaths = [];

        try {
            return DB::transaction(function () use ($validated, $request, &$uploadedPaths) {
                $year = now()->format('Y');
                $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                $lastReq = ShipRequest::where('request_number', $like, "PGJ-{$year}-%")->orderByDesc('created_at')->lockForUpdate()->first();
                $nextNum = 15;
                if ($lastReq && preg_match('/PGJ-\d{4}-(\d+)/i', $lastReq->request_number, $matches)) {
                    $nextNum = (int) $matches[1] + 1;
                }
                $batchCode = sprintf('PGJ-%s-%04d', $year, $nextNum);

                $masterProducts = Product::query()
                    ->where('is_active', true)
                    ->get();
                $products = $masterProducts->keyBy('id');
                $productsByCode = $masterProducts->keyBy('code');

                $createdRequests = [];

                foreach ($validated['ships'] as $shipIndex => $shipData) {
                    $portCall = PortCall::query()
                        ->with([
                            'ship.company',
                            'port',
                            'clearanceInRequests:id,port_call_id',
                        ])
                        ->lockForUpdate()
                        ->whereKey($shipData['port_call_id'])
                        ->where('ship_id', $shipData['ship_id'])
                        ->first();

                    if (! $portCall) {
                        throw ValidationException::withMessages([
                            "ships.{$shipIndex}.port_call_id" => 'Kunjungan / job tidak sesuai dengan kapal yang dipilih.',
                        ]);
                    }

                    if (! $portCall->acceptsNewRequests()) {
                        throw ValidationException::withMessages([
                            "ships.{$shipIndex}.port_call_id" => 'Pengajuan baru tidak dapat dibuat karena kunjungan / job sudah berstatus Selesai.',
                        ]);
                    }

                    if ($portCall->work_order_id) {
                        WorkOrder::query()
                            ->lockForUpdate()
                            ->find($portCall->work_order_id)
                            ?->fillMissingClientPic(
                                $shipData['requester_name'] ?? null,
                                $shipData['requester_phone'] ?? null,
                            );
                    }

                    $ship = $portCall->ship;
                    $requestType = $shipData['request_type'];
                    $requestTypeLower = strtolower($requestType);
                    $isClearanceIn = str_contains($requestTypeLower, 'clearance in') || str_contains($requestTypeLower, 'kedatangan');
                    $isClearanceOut = str_contains($requestTypeLower, 'clearance out') || str_contains($requestTypeLower, 'keberangkatan');

                    if ($isClearanceIn && ($blockReason = $portCall->clearanceInBlockReason())) {
                        throw ValidationException::withMessages([
                            "ships.{$shipIndex}.request_type" => $blockReason,
                        ]);
                    }

                    if ($isClearanceOut && ! in_array($portCall->status, ['anchored', 'berthed'], true)) {
                        throw ValidationException::withMessages([
                            "ships.{$shipIndex}.request_type" => 'Clearance Out hanya dapat diajukan ketika kapal berstatus Labuh atau Sandar.',
                        ]);
                    }

                    if (($isClearanceIn || $isClearanceOut) && empty($shipData['operational_occurred_at'])) {
                        throw ValidationException::withMessages([
                            "ships.{$shipIndex}.operational_occurred_at" => $isClearanceIn
                                ? 'Tanggal kedatangan aktual wajib diisi.'
                                : 'Tanggal keberangkatan aktual wajib diisi.',
                        ]);
                    }

                    if ($isClearanceIn && ! in_array($shipData['requested_port_call_status'] ?? null, ['anchored', 'berthed'], true)) {
                        throw ValidationException::withMessages([
                            "ships.{$shipIndex}.requested_port_call_status" => 'Pilih target status Labuh atau Sandar.',
                        ]);
                    }

                    if ($isClearanceOut) {
                        $hasActiveClearanceOut = ShipRequest::query()
                            ->where('port_call_id', $portCall->id)
                            ->whereIn('service_type', ['clearance_out', 'Keberangkatan (Clearance Out)'])
                            ->whereNotIn('status', ['Ditolak', 'Dibatalkan'])
                            ->exists();

                        if ($hasActiveClearanceOut) {
                            throw ValidationException::withMessages([
                                "ships.{$shipIndex}.request_type" => 'Pengajuan Clearance Out untuk kunjungan ini sudah ada dan masih diproses.',
                            ]);
                        }
                    }

                    $requestedPortCallStatus = $isClearanceIn
                        ? $shipData['requested_port_call_status']
                        : ($isClearanceOut ? 'departed' : null);
                    $operationalOccurredAt = ($isClearanceIn || $isClearanceOut)
                        ? Carbon::parse($shipData['operational_occurred_at'], config('app.timezone'))->startOfDay()
                        : null;

                    // In multi-ship submissions, all ships share the same PGJ batch number
                    // while maintaining their own individual request record per vessel
                    $reqNumber = $batchCode;

                    $serviceType = 'Sandar';
                    if ($isClearanceIn) {
                        $serviceType = 'clearance_in';
                    } elseif ($isClearanceOut) {
                        $serviceType = 'clearance_out';
                    } elseif (str_contains($requestTypeLower, 'perpanjangan') || str_contains($requestTypeLower, 'endors')) {
                        $serviceType = 'Perpanjangan Surat / Endors Surat Laut';
                    } elseif (str_contains($requestTypeLower, 'kebutuhan')) {
                        $serviceType = 'Kebutuhan Kapal';
                    }

                    $notesPrefix = "Pengajuan {$shipData['request_type']}";
                    if (! empty($shipData['department'])) {
                        $notesPrefix .= " (Bagian: {$shipData['department']})";
                    }
                    if (! empty($shipData['requester_name'])) {
                        $notesPrefix .= " Pemesan: {$shipData['requester_name']}";
                    }
                    $combinedNotes = trim($notesPrefix.(! empty($validated['notes']) ? ' — Catatan Bu Titik: '.$validated['notes'] : ''));

                    $createdBy = (! empty($validated['created_by']) && ($request->user()?->isOperationalAdmin() || $request->user()?->isDirector() || $request->user()?->isOwner()))
                        ? $validated['created_by']
                        : $request->user()->id;

                    $newRequest = ShipRequest::create([
                        'request_number' => $reqNumber,
                        'batch_number' => $batchCode,
                        'ship_id' => $ship->id,
                        'company_id' => $ship->ship_company_id,
                        'port_id' => $portCall->port_id,
                        'port_call_id' => $portCall->id,
                        'service_type' => $serviceType,
                        'requested_port_call_status' => $requestedPortCallStatus,
                        'operational_occurred_at' => $operationalOccurredAt,
                        'created_by' => $createdBy,
                        'status' => 'Menunggu Approval',
                        'request_date' => $shipData['required_date'] ?? now()->toDateString(),
                        'notes' => $combinedNotes,
                    ]);

                    if ($isClearanceIn || $isClearanceOut) {
                        $shipData['items'] = $this->clearanceItemsForTarget(
                            $isClearanceOut ? 'clearance_out' : 'clearance_in',
                            $requestedPortCallStatus,
                            $shipData,
                            $productsByCode,
                        );
                    }

                    // Create items if provided
                    if (! empty($shipData['items']) && is_array($shipData['items'])) {
                        foreach ($shipData['items'] as $item) {
                            $productId = $item['product_id'] ?? null;
                            $prod = null;

                            if ($productId && $products->has($productId)) {
                                $prod = $products->get($productId);
                            } else {
                                $nameLower = strtolower(trim($item['item_name'] ?? ''));
                                if (str_contains($nameLower, 'clearance in') || str_contains($nameLower, 'kedatangan')) {
                                    $prod = $productsByCode->get('PRD-CLR') ?? $this->resolveClearanceProduct->handle('clearance_in');
                                } elseif (str_contains($nameLower, 'taktis')) {
                                    $prod = $productsByCode->get('PRD-PLD-TAKTIS');
                                } elseif (str_contains($nameLower, 'epb') || str_contains($nameLower, 'pandu tunda')) {
                                    $prod = $productsByCode->get('PRD-PLD-EPB');
                                } elseif (str_contains($nameLower, 'clearance out') || str_contains($nameLower, 'keberangkatan')) {
                                    $prod = $productsByCode->get('PRD-CLR') ?? $this->resolveClearanceProduct->handle('clearance_out');
                                }

                                if (! $prod) {
                                    $prod = $masterProducts->first(fn ($p) => strtolower($p->name) === $nameLower)
                                        ?? $masterProducts->first(fn ($p) => str_contains(strtolower($p->name), $nameLower) || str_contains($nameLower, strtolower($p->name)));
                                }
                            }

                            if ($prod) {
                                $productId = $prod->id;
                                $itemType = $prod->item_type ?? 'jasa';
                                $vendorId = array_key_exists('vendor_id', $item)
                                    ? $item['vendor_id']
                                    : $prod->vendor_id;
                            } else {
                                $itemType = $item['item_type'] ?? 'non_jasa';
                                $vendorId = null;
                            }

                            // Automatically take price from master products (/master/products) if not custom-specified
                            if (isset($item['hpp_price']) && is_numeric($item['hpp_price']) && (float) $item['hpp_price'] > 0) {
                                $hppPrice = (float) $item['hpp_price'];
                            } elseif ($prod) {
                                $hppPrice = (float) $prod->hpp_default;
                            } else {
                                $hppPrice = (isset($item['hpp_price']) && is_numeric($item['hpp_price'])) ? (float) $item['hpp_price'] : 0.00;
                            }

                            $attachmentPath = null;
                            if (isset($item['attachment']) && $item['attachment'] instanceof UploadedFile) {
                                $attachmentPath = $item['attachment']->store('sja/request-items', 'local');
                                $uploadedPaths[] = $attachmentPath;
                            }

                            RequestItem::create([
                                'request_id' => $newRequest->id,
                                'product_id' => $productId,
                                'vendor_id' => $vendorId,
                                'item_type' => $itemType,
                                'item_name' => $item['item_name'],
                                'quantity' => $item['quantity'],
                                'unit' => $item['unit'] ?? ($prod?->unit ?? 'Unit'),
                                'required_date' => $item['required_date'] ?? ($shipData['required_date'] ?? now()->toDateString()),
                                'required_time' => $item['required_time'] ?? ($shipData['required_time'] ?? null),
                                'hpp_price' => $hppPrice,
                                'selling_price' => 0,
                                'attachment_path' => $attachmentPath,
                                'status' => 'pending',
                                'director_status' => 'pending',
                                'is_urgent' => ! empty($item['is_urgent']),
                                'notes' => $item['notes'] ?? null,
                            ]);
                        }
                    } else {
                        // Create primary service items directly from master products (/master/products)
                        if ($isClearanceIn) {
                            $prodClr = $productsByCode->get('PRD-CLR') ?? $this->resolveClearanceProduct->handle('clearance_in');
                            RequestItem::create([
                                'request_id' => $newRequest->id,
                                'product_id' => $prodClr?->id,
                                'vendor_id' => $prodClr?->vendor_id,
                                'item_type' => $prodClr?->item_type ?? 'jasa',
                                'item_name' => 'Clearance In (Syahbandar & Karantina)',
                                'quantity' => 1,
                                'unit' => $prodClr?->unit ?? 'Dokumen',
                                'required_date' => $shipData['required_date'] ?? now()->toDateString(),
                                'required_time' => $shipData['required_time'] ?? null,
                                'hpp_price' => (float) ($prodClr?->hpp_default ?? 2500000),
                                'selling_price' => 0.00,
                                'status' => 'pending',
                                'director_status' => 'pending',
                                'is_urgent' => true,
                                'notes' => "Layanan Clearance In armada {$ship->name}",
                            ]);

                            if ($requestedPortCallStatus === 'berthed') {
                                $prodTaktis = $productsByCode->get('PRD-PLD-TAKTIS');
                                $prodEpb = $productsByCode->get('PRD-PLD-EPB');

                                RequestItem::create([
                                    'request_id' => $newRequest->id,
                                    'product_id' => $prodTaktis?->id,
                                    'vendor_id' => null,
                                    'item_type' => $prodTaktis?->item_type ?? 'jasa',
                                    'item_name' => 'Taktis Penyandaran',
                                    'quantity' => 1,
                                    'unit' => $prodTaktis?->unit ?? 'Kegiatan',
                                    'required_date' => $shipData['required_date'] ?? now()->toDateString(),
                                    'required_time' => $shipData['required_time'] ?? null,
                                    'hpp_price' => (float) ($prodTaktis?->hpp_default ?? 0),
                                    'selling_price' => 0.00,
                                    'status' => 'pending',
                                    'director_status' => 'pending',
                                    'is_urgent' => true,
                                    'notes' => "Taktis Penyandaran armada {$ship->name}",
                                ]);

                                RequestItem::create([
                                    'request_id' => $newRequest->id,
                                    'product_id' => $prodEpb?->id,
                                    'vendor_id' => $prodEpb?->vendor_id,
                                    'item_type' => $prodEpb?->item_type ?? 'jasa',
                                    'item_name' => 'Pembayaran EPB (Pandu Tunda)',
                                    'quantity' => 1,
                                    'unit' => $prodEpb?->unit ?? 'Kegiatan',
                                    'required_date' => $shipData['required_date'] ?? now()->toDateString(),
                                    'required_time' => $shipData['required_time'] ?? null,
                                    'hpp_price' => (float) ($prodEpb?->hpp_default ?? 100000),
                                    'selling_price' => 0.00,
                                    'status' => 'pending',
                                    'director_status' => 'pending',
                                    'is_urgent' => true,
                                    'notes' => "Pembayaran EPB armada {$ship->name}",
                                ]);
                            }
                        } elseif ($isClearanceOut) {
                            $prodClr = $productsByCode->get('PRD-CLR') ?? $this->resolveClearanceProduct->handle('clearance_out');
                            RequestItem::create([
                                'request_id' => $newRequest->id,
                                'product_id' => $prodClr?->id,
                                'vendor_id' => $prodClr?->vendor_id,
                                'item_type' => $prodClr?->item_type ?? 'jasa',
                                'item_name' => 'Clearance Out (Syahbandar & Karantina)',
                                'quantity' => 1,
                                'unit' => $prodClr?->unit ?? 'Dokumen',
                                'required_date' => $shipData['required_date'] ?? now()->toDateString(),
                                'required_time' => $shipData['required_time'] ?? null,
                                'hpp_price' => (float) ($prodClr?->hpp_default ?? 2500000),
                                'selling_price' => 0.00,
                                'status' => 'pending',
                                'director_status' => 'pending',
                                'is_urgent' => true,
                                'notes' => "Layanan Clearance Out armada {$ship->name}",
                            ]);
                        } else {
                            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                            $product = Product::query()->where('is_active', true)->where('name', $like, "%{$shipData['request_type']}%")->first();

                            RequestItem::create([
                                'request_id' => $newRequest->id,
                                'product_id' => $product?->id,
                                'vendor_id' => $product?->vendor_id,
                                'item_type' => $product?->item_type ?? 'jasa',
                                'item_name' => $shipData['request_type'],
                                'quantity' => 1,
                                'unit' => $product?->unit ?? 'Paket',
                                'required_date' => $shipData['required_date'] ?? now()->toDateString(),
                                'required_time' => $shipData['required_time'] ?? null,
                                'hpp_price' => (float) ($product?->hpp_default ?? 0),
                                'selling_price' => 0.00,
                                'status' => 'pending',
                                'director_status' => 'pending',
                                'is_urgent' => false,
                                'notes' => "Layanan {$shipData['request_type']} armada {$ship->name}",
                            ]);
                        }
                    }

                    $createdRequests[] = $newRequest;
                }

                if (! empty($createdRequests)) {
                    $this->workflowNotifier->notifyBatchSubmission($createdRequests, $request->user(), $batchCode);
                }

                if (function_exists('activity')) {
                    activity('request')
                        ->causedBy($request->user())
                        ->log("Staf lapangan mengajukan pengajuan multi kapal {$batchCode} (".count($createdRequests).' kapal)');
                }

                return redirect()->route('requests.index')->with([
                    'success' => "Pengajuan {$batchCode} (".count($createdRequests).' Kapal) berhasil diajukan ke Bu Titik.',
                    'submitted_request_number' => $batchCode,
                    'submitted_request_id' => $createdRequests[0]->id ?? null,
                ]);
            });
        } catch (Throwable $exception) {
            foreach ($uploadedPaths as $path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }
    }

    /**
     * Build the authoritative clearance item set for the selected arrival target.
     *
     * @param  array<string, mixed>  $shipData
     * @param  Collection<string, Product>  $productsByCode
     * @return list<array<string, mixed>>
     */
    private function clearanceItemsForTarget(
        string $serviceType,
        ?string $requestedPortCallStatus,
        array $shipData,
        Collection $productsByCode,
    ): array {
        $requiredDate = $shipData['required_date'] ?? now()->toDateString();
        $requiredTime = $shipData['required_time'] ?? null;

        if ($serviceType === 'clearance_in' && $requestedPortCallStatus === 'berthed') {
            return collect([
                ['code' => 'PRD-PLD-TAKTIS', 'name' => 'Taktis Penyandaran', 'fallback_unit' => 'Kegiatan', 'fallback_hpp' => 0, 'vendor_id' => null],
                ['code' => 'PRD-PLD-EPB', 'name' => 'Pembayaran EPB (Pandu Tunda)', 'fallback_unit' => 'Kegiatan', 'fallback_hpp' => 100000],
            ])->map(function (array $definition) use ($productsByCode, $requiredDate, $requiredTime): array {
                $product = $productsByCode->get($definition['code']);

                return [
                    'product_id' => $product?->id,
                    'vendor_id' => array_key_exists('vendor_id', $definition)
                        ? $definition['vendor_id']
                        : $product?->vendor_id,
                    'item_name' => $definition['name'],
                    'item_type' => $product?->item_type ?? 'jasa',
                    'quantity' => 1,
                    'unit' => $product?->unit ?? $definition['fallback_unit'],
                    'hpp_price' => (float) ($product?->hpp_default ?? $definition['fallback_hpp']),
                    'required_date' => $requiredDate,
                    'required_time' => $requiredTime,
                    'is_urgent' => true,
                ];
            })->all();
        }

        $product = $productsByCode->get('PRD-CLR') ?? $this->resolveClearanceProduct->handle($serviceType);
        $isClearanceOut = $serviceType === 'clearance_out';

        return [[
            'product_id' => $product?->id,
            'item_name' => $isClearanceOut
                ? 'Clearance Out (Syahbandar & Karantina)'
                : 'Clearance In (Syahbandar & Karantina)',
            'item_type' => $product?->item_type ?? 'jasa',
            'quantity' => 1,
            'unit' => $product?->unit ?? 'Dokumen',
            'hpp_price' => (float) ($product?->hpp_default ?? 2500000),
            'required_date' => $requiredDate,
            'required_time' => $requiredTime,
            'is_urgent' => true,
        ]];
    }

    /**
     * Backward-compatible simple store
     */
    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', ShipRequest::class);

        $validated = $request->validate([
            'ship_id' => ['required', 'exists:ships,id'],
            'need_type' => ['required', 'string'],
            'quantity' => ['required', 'numeric', 'min:1'],
            'unit' => ['required', 'string'],
            'required_at' => ['required', 'string'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'created_by' => ['nullable', 'exists:users,id'],
        ]);

        $lastReq = ShipRequest::orderByDesc('created_at')->first();
        $nextNum = 246;
        if ($lastReq && preg_match('/REQ-(\d+)/', $lastReq->request_number, $matches)) {
            $nextNum = (int) $matches[1] + 1;
        }
        $reqNumber = sprintf('REQ-%05d', $nextNum);

        $createdBy = (! empty($validated['created_by']) && ($request->user()?->isOperationalAdmin() || $request->user()?->isDirector() || $request->user()?->isOwner()))
            ? $validated['created_by']
            : $request->user()->id;

        $newRequest = ShipRequest::create([
            'request_number' => $reqNumber,
            'ship_id' => $validated['ship_id'],
            'created_by' => $createdBy,
            'status' => 'Menunggu Approval',
            'request_date' => now()->toDateString(),
            'notes' => "{$validated['need_type']} {$validated['quantity']} {$validated['unit']} - Dibutuhkan: {$validated['required_at']}. Catatan: ".($validated['notes'] ?? '-'),
        ]);

        // Create initial request item
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
        $product = Product::where('name', $like, "%{$validated['need_type']}%")->first();
        RequestItem::create([
            'request_id' => $newRequest->id,
            'product_id' => $product?->id,
            'item_type' => $product?->item_type ?? 'non_jasa',
            'item_name' => $validated['need_type'],
            'unit' => $validated['unit'],
            'quantity' => $validated['quantity'],
            'required_date' => now()->toDateString(),
            'hpp_price' => $product?->hpp_default ?? 0,
            'selling_price' => 0,
            'status' => 'pending',
            'director_status' => 'pending',
        ]);

        $this->workflowNotifier->notifySubmission($newRequest, $request->user());

        return redirect()->route('requests.detail', $newRequest)
            ->with('success', "Pengajuan {$reqNumber} berhasil diajukan dan sedang menunggu review.");
    }

    /**
     * Admin filters items, adjusts prices/vendor, and forwards selected items to Direktur.
     */
    public function forwardToDirector(Request $request, string $id): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'selected_items' => ['required', 'array', 'min:1'],
            'selected_items.*' => ['uuid', 'exists:request_items,id'],
            'item_prices' => ['nullable', 'array'],
            'item_prices.*.id' => ['required_with:item_prices', 'uuid', 'exists:request_items,id'],
            'item_prices.*.hpp_price' => ['nullable', 'numeric', 'min:0'],
            'item_prices.*.vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($id, $validated, $request) {
            $shipRequest = ShipRequest::lockForUpdate()
                ->with(['items.product', 'items.costDocumentItem.costDocument'])
                ->findOrFail($id);

            if (in_array($shipRequest->status, ['Selesai', 'Dibatalkan'], true)) {
                throw ValidationException::withMessages([
                    'selected_items' => "Pengajuan berstatus {$shipRequest->status} tidak dapat dikirim ulang ke Direktur.",
                ]);
            }

            $itemsById = $shipRequest->items->keyBy('id');
            $selectedItemIds = collect($validated['selected_items'])->unique()->values();

            if ($selectedItemIds->contains(fn (string $itemId): bool => ! $itemsById->has($itemId))) {
                throw ValidationException::withMessages([
                    'selected_items' => 'Terdapat item yang bukan bagian dari pengajuan ini.',
                ]);
            }

            $submittedPrices = collect($validated['item_prices'] ?? [])->keyBy('id');

            foreach ($selectedItemIds as $itemId) {
                /** @var RequestItem $item */
                $item = $itemsById->get($itemId);

                if ($item->isLocked()) {
                    throw ValidationException::withMessages([
                        'selected_items' => "Harga {$item->item_name} sudah dikunci oleh approval Direktur. Ajukan revisi terlebih dahulu.",
                    ]);
                }

                $price = $submittedPrices->get($itemId, []);
                $newHpp = isset($price['hpp_price']) && is_numeric($price['hpp_price'])
                    ? (float) $price['hpp_price']
                    : (float) $item->hpp_price;
                $vendorId = $price['vendor_id'] ?? $item->vendor_id;
                $this->assertSupplierInvoiceReady($item, $vendorId);

                if ($newHpp <= 0) {
                    throw ValidationException::withMessages([
                        'selected_items' => "Item '{$item->item_name}' belum memiliki HPP yang valid (> Rp 0). Lengkapi biaya berdasarkan dokumen pendukung sebelum diajukan ke Direktur.",
                    ]);
                }

                $oldPrices = [
                    'hpp_price' => (float) $item->hpp_price,
                ];

                $item->update([
                    'hpp_price' => $newHpp,
                    'vendor_id' => $vendorId,
                    'status' => 'diajukan_ke_direktur',
                    'director_status' => 'pending',
                    'director_notes' => null,
                ]);

                activity('request-item-pricing')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'action' => 'submitted_to_director',
                        'old' => $oldPrices,
                        'new' => [
                            'hpp_price' => (float) $item->hpp_price,
                        ],
                    ])
                    ->log('Harga item dikirim Admin kepada Direktur');
            }

            $shipRequest->items
                ->whereNotIn('id', $selectedItemIds)
                ->filter(fn (RequestItem $item): bool => ! $item->isLocked() && $item->director_status !== 'rejected' && $item->status !== 'diajukan_ke_direktur')
                ->each(fn (RequestItem $item) => $item->update([
                    'status' => 'pending',
                    'director_status' => 'pending',
                ]));

            $requestItems = $shipRequest->items()
                ->get(['id', 'status', 'director_status']);

            $shipRequest->update([
                'status' => $shipRequest->resolveWorkflowStatus($requestItems),
                'forwarded_to_director_at' => now(),
                'director_reviewed_at' => null,
                'admin_forward_notes' => $validated['admin_notes'] ?? null,
            ]);

            if (function_exists('activity')) {
                activity('request')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log('Admin memfilter '.count($validated['selected_items'])." item dan mengajukan {$shipRequest->request_number}");
            }

            $this->workflowNotifier->notifyForwardedToDirector($shipRequest, $request->user(), count($validated['selected_items']));

            return redirect()->back()->with('success', "Pengajuan {$shipRequest->request_number} (".count($validated['selected_items']).' item terpilih) berhasil diajukan.');
        });
    }

    public function requestItemRevision(Request $request, string $requestId, string $itemId): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($request, $requestId, $itemId, $validated): RedirectResponse {
            $shipRequest = ShipRequest::lockForUpdate()->findOrFail($requestId);
            $item = RequestItem::lockForUpdate()
                ->where('request_id', $shipRequest->id)
                ->findOrFail($itemId);

            if (! $item->isLocked()) {
                throw ValidationException::withMessages([
                    'reason' => 'Revisi hanya diperlukan untuk item yang sudah disetujui Direktur.',
                ]);
            }

            if ($item->is_invoiced) {
                throw ValidationException::withMessages([
                    'reason' => 'Item sudah masuk invoice. Lakukan koreksi invoice terlebih dahulu sebelum revisi harga.',
                ]);
            }

            activity('request-item-pricing')
                ->performedOn($item)
                ->causedBy($request->user())
                ->withProperties([
                    'request_id' => $shipRequest->id,
                    'action' => 'revision_requested',
                    'approved_snapshot' => [
                        'hpp_price' => (float) $item->hpp_price,
                    ],
                    'reason' => $validated['reason'],
                ])
                ->log('Admin membuka revisi harga yang telah disetujui');

            $item->update([
                'status' => 'pending',
                'director_status' => 'pending',
                'director_notes' => "Revisi Admin: {$validated['reason']}",
            ]);

            $requestItems = $shipRequest->items()
                ->get(['id', 'status', 'director_status']);

            $shipRequest->update([
                'status' => $shipRequest->resolveWorkflowStatus($requestItems),
                'director_reviewed_at' => null,
            ]);

            return redirect()->back()->with('success', "Revisi harga {$item->item_name} dibuka. Perbarui harga lalu kirim kembali ke Direktur.");
        });
    }

    /**
     * Open the flexible invoice composer for this request's Job.
     */
    public function createClearanceInInvoice(Request $request, string $id): RedirectResponse
    {
        $this->authorizeAdminPricing($request);
        $shipRequest = ShipRequest::query()->findOrFail($id);

        return redirect()->route('invoices.create', ['job' => $shipRequest->port_call_id])
            ->with('success', 'Susun baris Clearance In dan Clearance Out pada draft invoice sesuai kebutuhan penagihan.');
    }

    /**
     * Open the flexible invoice composer instead of generating fixed invoice lines.
     */
    public function splitInvoices(Request $request, string $id): RedirectResponse
    {
        $this->authorizeAdminPricing($request);
        $shipRequest = ShipRequest::query()->findOrFail($id);

        return redirect()->route('invoices.create', ['job' => $shipRequest->port_call_id])
            ->with('success', 'Pilih tipe invoice lalu susun, gabungkan, atau pecah baris tagihan pada draft.');
    }

    /**
     * Lapangan / Admin adds an additional need item to an existing active request
     */
    public function addItem(Request $request, string $id): RedirectResponse
    {
        $shipRequest = ShipRequest::findOrFail($id);
        Gate::authorize('addItem', $shipRequest);

        $validated = $request->validate([
            'item_name' => ['required', 'string', 'max:255'],
            'product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'item_type' => ['nullable', 'string', 'in:jasa,non_jasa'],
            'save_as_master_product' => ['nullable', 'boolean'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit' => ['required', 'string', 'max:50'],
            'required_date' => ['nullable', 'date'],
            'required_time' => ['nullable', 'string', 'max:20'],
            'is_urgent' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'extensions:pdf,doc,docx,jpg,jpeg,png', 'max:10240'],
        ]);

        return DB::transaction(function () use ($shipRequest, $validated, $request) {

            $productId = $validated['product_id'] ?? null;
            $hppPrice = 0.00;
            $itemType = $validated['item_type'] ?? 'non_jasa';
            $vendorId = null;

            if ($productId) {
                $product = Product::find($productId);
                if ($product) {
                    $itemType = $product->item_type;
                    $vendorId = $product->vendor_id;
                    $hppPrice = (float) $product->hpp_default;

                    // Port price lookup if applicable
                    if ($shipRequest->port_id) {
                        $portPrice = ProductPortPrice::where('product_id', $product->id)
                            ->where('port_id', $shipRequest->port_id)
                            ->where('service_type', $shipRequest->service_type ?? 'Sandar')
                            ->first();

                        if ($portPrice && $portPrice->hpp_price > 0) {
                            $hppPrice = (float) $portPrice->hpp_price;
                        }
                    }
                }
            } elseif (! empty($validated['save_as_master_product'])) {
                // Save new master product so it can be reused across all requests
                $autoCode = 'PRD-'.strtoupper(Str::random(6));
                $newProduct = Product::create([
                    'code' => $autoCode,
                    'name' => $validated['item_name'],
                    'unit' => $validated['unit'],
                    'item_type' => $itemType,
                    'hpp_default' => 0.00,
                    'selling_price_default' => 0.00,
                    'is_active' => true,
                ]);
                $productId = $newProduct->id;
            }

            $newItem = RequestItem::create([
                'request_id' => $shipRequest->id,
                'product_id' => $productId,
                'item_type' => $itemType,
                'item_name' => $validated['item_name'],
                'unit' => $validated['unit'],
                'quantity' => $validated['quantity'],
                'required_date' => $validated['required_date'] ?? now()->toDateString(),
                'required_time' => $validated['required_time'] ?? null,
                'hpp_price' => $hppPrice,
                'selling_price' => 0,
                'vendor_id' => $vendorId,
                'attachment_path' => isset($validated['attachment'])
                    ? $validated['attachment']->store('sja/request-items', 'local')
                    : null,
                'status' => 'pending',
                'director_status' => 'pending',
                'is_urgent' => ! empty($validated['is_urgent']),
                'notes' => $validated['notes'] ?? null,
            ]);

            if (function_exists('activity')) {
                activity('request')
                    ->performedOn($shipRequest)
                    ->causedBy($request->user())
                    ->log("Menambahkan item kebutuhan susulan ({$validated['item_name']}) pada pengajuan {$shipRequest->request_number}");
            }

            $this->workflowNotifier->notifySubmission($shipRequest, $request->user());

            return redirect()->back()->with('success', "Item kebutuhan susulan '{$newItem->item_name}' berhasil ditambahkan ke {$shipRequest->request_number}.");
        });
    }

    /**
     * Submit additional request for tactical/clearance cost shortage (kekurangan biaya taktis / ngebon).
     */
    public function storeTaktisSupplement(Request $request, string $id): RedirectResponse
    {
        $parentRequest = ShipRequest::with(['portCall', 'items'])->findOrFail($id);
        Gate::authorize('create', ShipRequest::class);

        $validated = $request->validate([
            'item_name' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:1', 'max:9999999999999.99'],
            'required_date' => ['nullable', 'date'],
            'surplus_source_item_id' => ['nullable', 'uuid', 'exists:request_items,id'],
            'surplus_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'actualization_notes' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'max:10240'],
        ]);

        return DB::transaction(function () use ($parentRequest, $validated, $request) {
            $year = now()->format('Y');
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $lastReq = ShipRequest::where('request_number', $like, "PGJ-{$year}-%")->orderByDesc('created_at')->first();
            $nextNum = 15;
            if ($lastReq && preg_match('/PGJ-\d{4}-(\d+)/i', $lastReq->request_number, $matches)) {
                $nextNum = (int) $matches[1] + 1;
            }
            $requestNumber = sprintf('PGJ-%s-%04d', $year, $nextNum);

            // Find product for tactical berthing / clearance taktis
            $taktisProduct = Product::where('code', 'PRD-PLD-TAKTIS')
                ->orWhere('name', $like, '%taktis%')
                ->first();

            $attachmentPath = isset($validated['attachment'])
                ? $validated['attachment']->store('sja/request-items', 'local')
                : null;

            $supplementNote = "Pengajuan Tambahan Biaya Taktis (Kekurangan Realisasi). Ref: {$parentRequest->request_number}.";
            if (! empty($validated['notes'])) {
                $supplementNote .= ' '.$validated['notes'];
            }

            // Handle surplus transfer from another item on the same vessel
            $surplusSourceItem = null;
            if (! empty($validated['surplus_source_item_id'])) {
                $surplusSourceItem = RequestItem::find($validated['surplus_source_item_id']);
                if ($surplusSourceItem) {
                    $surplusVal = (float) ($validated['surplus_amount'] ?? 0);
                    $formattedSurplus = number_format($surplusVal, 0, ',', '.');
                    $existingNotes = $surplusSourceItem->notes ?? '';
                    $reallocationNotice = "[PENGALIHAN DANA] Surplus/sisa biaya Rp {$formattedSurplus} dialihkan untuk menutup kekurangan pada {$validated['item_name']} ({$requestNumber}).";
                    $surplusSourceItem->update([
                        'notes' => trim($existingNotes.' '.$reallocationNotice),
                    ]);
                    $supplementNote .= " (Ditutup pengalihan surplus Rp {$formattedSurplus} dari item: {$surplusSourceItem->item_name}).";
                }
            }

            if (! empty($validated['actualization_notes'])) {
                $supplementNote .= ' [Catatan Aktualisasi Riil: '.$validated['actualization_notes'].']';
            }

            $isDirectorOrAdmin = $request->user()->isDirector() || $request->user()->isOperationalAdmin();
            $itemStatus = $isDirectorOrAdmin ? 'diajukan_ke_direktur' : 'pending';
            $reqStatus = $isDirectorOrAdmin ? 'Menunggu Approval Direktur' : 'Menunggu Approval';

            $newRequest = ShipRequest::create([
                'request_number' => $requestNumber,
                'ship_id' => $parentRequest->ship_id ?? $parentRequest->portCall?->ship_id,
                'port_call_id' => $parentRequest->port_call_id,
                'service_type' => $parentRequest->service_type ?? 'clearance_in',
                'requested_port_call_status' => $parentRequest->requested_port_call_status,
                'operational_occurred_at' => $parentRequest->operational_occurred_at,
                'status' => $reqStatus,
                'request_date' => now(),
                'created_by' => $request->user()->id,
                'notes' => $supplementNote,
                'admin_forward_notes' => 'Pengajuan tambahan kekurangan biaya taktis clearance.',
                'forwarded_to_director_at' => $isDirectorOrAdmin ? now() : null,
            ]);

            $newItemNotes = 'Kekurangan realisasi biaya taktis Rp '.number_format((float) $validated['amount'], 0, ',', '.');
            if (! empty($validated['actualization_notes'])) {
                $newItemNotes .= ' | Aktualisasi: '.$validated['actualization_notes'];
            }
            if ($surplusSourceItem && ! empty($validated['surplus_amount'])) {
                $newItemNotes .= ' | Ditutup surplus Rp '.number_format((float) $validated['surplus_amount'], 0, ',', '.')." dari {$surplusSourceItem->item_name}";
            }

            $newItem = RequestItem::create([
                'request_id' => $newRequest->id,
                'product_id' => $taktisProduct?->id,
                'item_type' => 'jasa',
                'item_name' => $validated['item_name'],
                'unit' => $taktisProduct?->unit ?? 'Kegiatan',
                'quantity' => 1,
                'hpp_price' => (float) $validated['amount'],
                'original_hpp_price' => (float) $validated['amount'],
                'surplus_source_item_id' => $validated['surplus_source_item_id'] ?? null,
                'surplus_amount' => ! empty($validated['surplus_source_item_id']) ? (float) ($validated['surplus_amount'] ?? 0) : 0,
                'selling_price' => 0,
                'vendor_id' => null,
                'required_date' => $validated['required_date'] ?? now()->toDateString(),
                'status' => $itemStatus,
                'director_status' => 'pending',
                'is_urgent' => false,
                'attachment_path' => $attachmentPath,
                'notes' => $newItemNotes,
            ]);

            if (function_exists('activity')) {
                activity('request')
                    ->performedOn($newRequest)
                    ->causedBy($request->user())
                    ->withProperties([
                        'parent_request_id' => $parentRequest->id,
                        'parent_request_number' => $parentRequest->request_number,
                        'amount' => (float) $validated['amount'],
                        'surplus_source_item_id' => $validated['surplus_source_item_id'] ?? null,
                        'surplus_amount' => $validated['surplus_amount'] ?? null,
                        'actualization_notes' => $validated['actualization_notes'] ?? null,
                    ])
                    ->log("Membuat pengajuan tambahan taktis ({$newRequest->request_number}) sebesar Rp ".number_format((float) $validated['amount'], 0, ',', '.'));
            }

            $this->workflowNotifier->notifySubmission($newRequest, $request->user());

            return redirect()->back()->with(
                'success',
                'Pengajuan tambahan taktis sebesar Rp '.number_format((float) $validated['amount'], 0, ',', '.')." berhasil dibuat ({$newRequest->request_number}) dan siap diajukan ke Direktur."
            );
        });
    }

    public function batchForwardDirector(Request $request): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'selected_items' => ['required', 'array', 'min:1'],
            'selected_items.*' => ['uuid', 'exists:request_items,id'],
            'item_prices' => ['nullable', 'array'],
            'item_prices.*.id' => ['required_with:item_prices', 'uuid', 'exists:request_items,id'],
            'item_prices.*.hpp_price' => ['nullable', 'numeric', 'min:0'],
            'item_prices.*.vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $selectedItemIds = collect($validated['selected_items'])->unique()->values();
            $items = RequestItem::lockForUpdate()
                ->with(['product', 'request', 'costDocumentItem.costDocument'])
                ->whereIn('id', $selectedItemIds)
                ->get();
            $submittedPrices = collect($validated['item_prices'] ?? [])->keyBy('id');

            $requestGroups = $items->groupBy('request_id');
            $affectedRequests = collect();

            foreach ($requestGroups as $requestId => $groupItems) {
                $shipRequest = ShipRequest::lockForUpdate()->findOrFail($requestId);

                if (in_array($shipRequest->status, ['Selesai', 'Dibatalkan'], true)) {
                    continue;
                }

                foreach ($groupItems as $item) {
                    if ($item->isLocked()) {
                        continue;
                    }

                    $price = $submittedPrices->get($item->id, []);
                    $newHpp = isset($price['hpp_price']) && is_numeric($price['hpp_price'])
                        ? (float) $price['hpp_price']
                        : (float) $item->hpp_price;
                    $vendorId = $price['vendor_id'] ?? $item->vendor_id;
                    $this->assertSupplierInvoiceReady($item, $vendorId);

                    if ($newHpp <= 0) {
                        throw ValidationException::withMessages([
                            'selected_items' => "Item '{$item->item_name}' pada pengajuan {$shipRequest->request_number} belum memiliki HPP yang valid (> Rp 0).",
                        ]);
                    }

                    $item->update([
                        'hpp_price' => $newHpp,
                        'vendor_id' => $vendorId,
                        'status' => 'diajukan_ke_direktur',
                        'director_status' => 'pending',
                        'director_notes' => null,
                    ]);
                }

                $requestItems = $shipRequest->items()
                    ->get(['id', 'status', 'director_status']);

                $shipRequest->update([
                    'status' => $shipRequest->resolveWorkflowStatus($requestItems),
                    'forwarded_to_director_at' => now(),
                    'director_reviewed_at' => null,
                    'admin_forward_notes' => $validated['admin_notes'] ?? null,
                ]);

                if (function_exists('activity')) {
                    activity('request')
                        ->performedOn($shipRequest)
                        ->causedBy($request->user())
                        ->withProperties([
                            'action' => 'batch_forward_director',
                            'item_count' => $groupItems->count(),
                        ])
                        ->log("Admin mengajukan {$groupItems->count()} item ke Direktur secara batch");
                }

                $affectedRequests->push($shipRequest);
            }

            if ($affectedRequests->isNotEmpty()) {
                $this->workflowNotifier->notifyBatchForwardedToDirector($affectedRequests, $request->user(), $selectedItemIds->count());
            }

            return redirect()->back()->with('success', count($selectedItemIds).' item kebutuhan berhasil diajukan ke Direktur.');
        });
    }

    public function updateItemPrice(Request $request, string $requestId, string $itemId): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'hpp_price' => ['nullable', 'numeric', 'min:0'],
            'vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
        ]);

        return DB::transaction(function () use ($requestId, $itemId, $validated, $request) {
            $shipRequest = ShipRequest::lockForUpdate()->findOrFail($requestId);
            $item = RequestItem::lockForUpdate()
                ->with('product')
                ->where('request_id', $shipRequest->id)
                ->findOrFail($itemId);

            if ($item->isLocked()) {
                throw ValidationException::withMessages([
                    'hpp_price' => "Harga {$item->item_name} sudah disetujui Direktur dan tidak dapat diubah tanpa proses revisi.",
                ]);
            }

            $oldHpp = (float) $item->hpp_price;
            $item->update([
                'hpp_price' => array_key_exists('hpp_price', $validated) ? $validated['hpp_price'] : $item->hpp_price,
                'vendor_id' => array_key_exists('vendor_id', $validated) ? $validated['vendor_id'] : $item->vendor_id,
            ]);

            if (function_exists('activity')) {
                activity('request-item-pricing')
                    ->performedOn($item)
                    ->causedBy($request->user())
                    ->withProperties([
                        'request_id' => $shipRequest->id,
                        'action' => 'price_updated',
                        'old' => ['hpp_price' => $oldHpp],
                        'new' => ['hpp_price' => (float) $item->hpp_price],
                    ])
                    ->log("Admin memperbarui harga {$item->item_name}");
            }

            return redirect()->back()->with('success', "Harga {$item->item_name} berhasil diperbarui.");
        });
    }

    public function batchUpdateItemPrices(Request $request): RedirectResponse
    {
        $this->authorizeAdminPricing($request);

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'uuid', 'exists:request_items,id'],
            'items.*.hpp_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
        ]);

        return DB::transaction(function () use ($validated) {
            $lockedItem = RequestItem::query()
                ->whereIn('id', collect($validated['items'])->pluck('id'))
                ->where('director_status', 'approved')
                ->first();

            if ($lockedItem) {
                throw ValidationException::withMessages([
                    'items' => "Harga {$lockedItem->item_name} sudah dikunci oleh approval Direktur. Ajukan revisi terlebih dahulu.",
                ]);
            }

            $updatedCount = 0;
            foreach ($validated['items'] as $itemData) {
                $item = RequestItem::lockForUpdate()->with('product')->find($itemData['id']);
                if (! $item) {
                    continue;
                }

                $item->update([
                    'hpp_price' => $itemData['hpp_price'] ?? $item->hpp_price,
                    'vendor_id' => array_key_exists('vendor_id', $itemData) ? $itemData['vendor_id'] : $item->vendor_id,
                ]);
                $updatedCount++;
            }

            return redirect()->back()->with('success', "{$updatedCount} harga item berhasil disimpan.");
        });
    }

    public function downloadItemAttachment(Request $request, RequestItem $requestItem): StreamedResponse
    {
        $requestItem->loadMissing('request');
        Gate::authorize('view', $requestItem->request);
        abort_unless($requestItem->attachment_path, 404);

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($requestItem->attachment_path)) {
                return $request->boolean('download')
                    ? Storage::disk($disk)->download($requestItem->attachment_path)
                    : Storage::disk($disk)->response($requestItem->attachment_path);
            }
        }

        abort(404);
    }

    private function assertSupplierInvoiceReady(RequestItem $item, ?string $vendorId): void
    {
        if ($item->vendor_id !== $vendorId || ! $item->hasCompleteSupplierInvoice()) {
            throw ValidationException::withMessages([
                'selected_items' => "Nota invoice supplier untuk item '{$item->item_name}' belum lengkap. Isi HPP dan data nota, lalu unggah dokumennya sebelum diajukan ke Direktur. Vendor boleh dikosongkan.",
            ]);
        }
    }

    /** @param Collection<int, ShipRequest> $shipRequests */
    private function prepareRequestItems(Collection $shipRequests): void
    {
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

    private function authorizeAdminPricing(Request $request): void
    {
        if (! $request->user()?->isOperationalAdmin()) {
            abort(403, 'Hanya Admin yang dapat meninjau harga dan mengirim item kepada Direktur.');
        }
    }
}
