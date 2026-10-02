<?php

namespace App\Http\Controllers;

use App\Models\CompletionNote;
use App\Models\CostDocument;
use App\Models\DailyReport;
use App\Models\ExpenseRequest;
use App\Models\FundingRequest;
use App\Models\Invoice;
use App\Models\OperationalActivity;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\RequestItem;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $today = today();

        $activePortCalls = PortCall::query()
            ->with(['ship.company', 'port'])
            ->whereIn('status', ['scheduled', 'anchored', 'berthed'])
            ->orderBy('eta_at')
            ->get();

        $shipsByStatus = [
            'akan_datang' => $activePortCalls->where('status', 'scheduled')->count(),
            'sandar' => $activePortCalls->where('status', 'berthed')->count(),
            'labuh' => $activePortCalls->where('status', 'anchored')->count(),
            'berangkat' => PortCall::query()->where('status', 'departed')->whereDate('departed_at', $today)->count(),
        ];

        $requestsByStatus = [
            'menunggu' => ShipRequest::query()->whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur'])->count(),
            'proses' => ShipRequest::query()->whereIn('status', ['Dalam Proses', 'Diproses', 'Disetujui'])->count(),
            'selesai' => ShipRequest::query()->where('status', 'Selesai')->count(),
        ];

        $latestRequests = ShipRequest::query()
            ->with(['ship', 'creator', 'items'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (ShipRequest $shipRequest): array => [
                'id' => (string) $shipRequest->id,
                'request_number' => $shipRequest->request_number,
                'date' => ($shipRequest->request_date ?? $shipRequest->created_at)->format('d M Y'),
                'time' => $shipRequest->created_at->format('H:i'),
                'ship_name' => $shipRequest->ship?->name ?? 'Kapal tidak tersedia',
                'ship_imo' => $shipRequest->ship?->imo_number ?? '-',
                'notes' => $shipRequest->notes ?? '-',
                'status' => $shipRequest->status,
                'items_count' => $shipRequest->items->count(),
                'estimated_cost' => (float) $shipRequest->items->sum(
                    fn ($item): float => (float) $item->selling_price * (float) $item->quantity,
                ),
            ])
            ->values();

        $needsToday = ShipRequest::query()
            ->with(['ship', 'items'])
            ->whereDate('request_date', $today)
            ->latest()
            ->get()
            ->flatMap(fn (ShipRequest $shipRequest) => $shipRequest->items->map(fn ($item): array => [
                'kapal' => $shipRequest->ship?->name ?? 'Kapal tidak tersedia',
                'kebutuhan' => $item->item_name,
                'jumlah' => rtrim(rtrim(number_format((float) $item->quantity, 2, ',', '.'), '0'), ',').' '.$item->unit,
                'jadwal' => $item->required_date?->format('d M Y') ?? 'Belum dijadwalkan',
                'status' => $item->status,
                'pengajuan' => $shipRequest->request_number,
            ]))
            ->take(20)
            ->values();

        $rawInvoices = Invoice::query()
            ->with(['company', 'portCall.ship.company', 'request.ship'])
            ->latest('invoice_date')
            ->get();
        $totalInvoiced = (float) $rawInvoices->sum('grand_total');
        $totalPaid = (float) $rawInvoices->sum('paid_amount');
        $totalOutstanding = (float) $rawInvoices->sum('outstanding_amount');
        $collectionRate = $totalInvoiced > 0 ? round(($totalPaid / $totalInvoiced) * 100, 1) : 0.0;

        $aging = ['current' => 0.0, 'overdue_30' => 0.0, 'overdue_60' => 0.0, 'total' => $totalOutstanding];
        foreach ($rawInvoices->where('outstanding_amount', '>', 0) as $invoice) {
            $amount = (float) $invoice->outstanding_amount;
            $daysOverdue = $invoice->due_date?->isPast() ? $invoice->due_date->diffInDays($today) : 0;
            if ($daysOverdue === 0) {
                $aging['current'] += $amount;
            } elseif ($daysOverdue <= 30) {
                $aging['overdue_30'] += $amount;
            } else {
                $aging['overdue_60'] += $amount;
            }
        }

        $months = collect(range(5, 0))->map(fn (int $offset): Carbon => now()->startOfMonth()->subMonths($offset));
        $financialChart = [
            'months' => $months->map(fn (Carbon $month): string => $month->locale('id')->translatedFormat('M Y'))->values(),
            'data' => $months->map(function (Carbon $month) use ($rawInvoices): array {
                $monthInvoices = $rawInvoices->filter(fn (Invoice $invoice): bool => $invoice->invoice_date?->isSameMonth($month) ?? false);

                return [
                    'month' => $month->locale('id')->translatedFormat('M'),
                    'invoiced' => (float) $monthInvoices->sum('grand_total'),
                    'collected' => (float) $monthInvoices->sum('paid_amount'),
                    'outstanding' => (float) $monthInvoices->sum('outstanding_amount'),
                ];
            })->values(),
        ];

        $recentInvoices = $rawInvoices->take(10)->map(fn (Invoice $invoice): array => [
            'id' => (string) $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'invoice_type' => $invoice->invoice_type,
            'company_name' => $invoice->company?->name ?? $invoice->portCall?->ship?->company?->name ?? 'Perusahaan tidak tersedia',
            'ship_name' => $invoice->portCall?->ship?->name ?? $invoice->request?->ship?->name ?? 'Kapal tidak tersedia',
            'invoice_date' => $invoice->invoice_date?->format('d M Y') ?? '-',
            'due_date' => $invoice->due_date?->format('d M Y') ?? '-',
            'is_overdue' => $invoice->due_date?->isPast() && (float) $invoice->outstanding_amount > 0,
            'grand_total' => (float) $invoice->grand_total,
            'paid_amount' => (float) $invoice->paid_amount,
            'outstanding_amount' => (float) $invoice->outstanding_amount,
            'status' => $invoice->status,
        ])->values();

        $todayShips = $activePortCalls
            ->filter(fn (PortCall $portCall): bool => $portCall->eta_at?->isToday() || in_array($portCall->status, ['anchored', 'berthed'], true))
            ->map(fn (PortCall $portCall): array => $this->portCallCard($portCall))
            ->values();
        $upcomingShips = $activePortCalls
            ->where('status', 'scheduled')
            ->filter(fn (PortCall $portCall): bool => $portCall->eta_at?->isFuture() ?? false)
            ->map(fn (PortCall $portCall): array => [
                ...$this->portCallCard($portCall),
                'imo' => $portCall->ship?->imo_number ?? '-',
                'type' => $portCall->ship?->ship_type ?? '-',
                'company_name' => $portCall->ship?->company?->name ?? '-',
                'port_name' => $portCall->port?->name ?? '-',
            ])
            ->values();

        $recentActivities = OperationalActivity::query()
            ->with(['ship', 'creator'])
            ->latest('activity_date')
            ->latest('activity_time')
            ->limit(10)
            ->get()
            ->map(fn (OperationalActivity $activity): array => [
                'id' => (string) $activity->id,
                'time' => $activity->activity_time,
                'title' => $activity->title,
                'subtitle' => $activity->ship ? $activity->ship->name.' · '.$activity->detail : $activity->detail,
                'ship_name' => $activity->ship?->name,
                'location_name' => $activity->location_name,
                'activity_date' => $activity->activity_date?->format('d M Y'),
                'photos' => $activity->photos ?? [],
                'type' => $activity->is_vessel_related ? 'ship' : 'document',
                'color' => '#0060F4',
                'bg' => '#E0F0FF',
                'link' => '/operations?tab=aktivitas',
            ])
            ->values();

        $pendingApprovals = ShipRequest::query()
            ->with(['ship', 'creator', 'items'])
            ->where('status', 'Menunggu Approval Direktur')
            ->latest()
            ->get()
            ->map(fn (ShipRequest $shipRequest): array => [
                'id' => (string) $shipRequest->id,
                'request_number' => $shipRequest->request_number,
                'ship_name' => $shipRequest->ship?->name ?? 'Kapal tidak tersedia',
                'date' => $shipRequest->created_at->format('d M Y H:i'),
                'creator_name' => $shipRequest->creator?->name ?? 'Pengguna tidak tersedia',
                'notes' => $shipRequest->notes ?? '-',
                'estimated_cost' => (float) $shipRequest->items->sum(
                    fn ($item): float => (float) $item->hpp_price * (float) $item->quantity,
                ),
                'status' => $shipRequest->status,
            ])
            ->values();

        $financialOverview = [
            'total_invoiced' => $totalInvoiced,
            'total_collected' => $totalPaid,
            'total_outstanding' => $totalOutstanding,
            'collection_rate' => $collectionRate,
            'aging' => $aging,
            'chart' => $financialChart,
            'recent_invoices' => $recentInvoices,
        ];

        $canViewFinancials = $user->isOperationalAdmin() || $user->isDirector() || $user->isOwner();
        $canViewApprovals = $user->isDirector() || $user->isOwner();

        $myRequests = ShipRequest::query()->where('created_by', $user->id);
        $pendingCount = (clone $myRequests)->whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur'])->count();
        $days = collect(range(6, 0))->map(fn (int $offset): Carbon => today()->subDays($offset));
        $activityChart = [
            'period' => '7 Hari Terakhir',
            'days' => $days->map(fn (Carbon $day): string => $day->locale('id')->translatedFormat('d M'))->values(),
            'data' => $days->map(function (Carbon $day): array {
                $requests = ShipRequest::query()->whereDate('created_at', $day)->get();

                return [
                    'day' => $day->locale('id')->translatedFormat('d M'),
                    'dibuat' => $requests->count(),
                    'disetujui' => $requests->whereIn('status', ['Disetujui', 'Dalam Proses', 'Selesai'])->count(),
                    'diproses' => $requests->whereIn('status', ['Dalam Proses', 'Diproses'])->count(),
                    'selesai' => $requests->where('status', 'Selesai')->count(),
                ];
            })->values(),
        ];

        return Inertia::render('Dashboard', [
            'kpi' => [
                'kapal_aktif' => $activePortCalls->count(),
                'ships_by_status' => $shipsByStatus,
                'total_pengajuan' => ShipRequest::query()->count(),
                'requests_by_status' => $requestsByStatus,
                'total_nilai_pengajuan' => (float) ShipRequest::query()->with('items')->get()->sum(
                    fn (ShipRequest $shipRequest): float => (float) $shipRequest->items->sum(
                        fn ($item): float => (float) $item->selling_price * (float) $item->quantity,
                    ),
                ),
                'pendapatan_diterima' => $totalPaid,
                'total_pendapatan_diterima' => $totalPaid,
                'total_piutang' => $totalOutstanding,
                'total_invoiced' => $totalInvoiced,
                'collection_rate' => $collectionRate,
                'kapal_sandar_hari_ini' => PortCall::query()->where('status', 'berthed')->whereDate('berthed_at', $today)->count(),
            ],
            'latest_requests' => $latestRequests,
            'attention_ships' => $activePortCalls->map(fn (PortCall $portCall): array => $this->portCallCard($portCall))->values(),
            'schedules' => $activePortCalls->map(fn (PortCall $portCall): array => [
                'time' => $portCall->eta_at?->format('H:i') ?? '-',
                'ship_name' => $portCall->ship?->name ?? 'Kapal tidak tersedia',
                'status' => $this->portCallStatusLabel($portCall->status),
            ])->values(),
            'notifications' => [],
            'activity_chart' => $activityChart,
            'needs_today' => $needsToday,
            'my_requests_stats' => [
                'total' => (clone $myRequests)->count(),
                'menunggu' => $pendingCount,
                'diproses' => (clone $myRequests)->whereIn('status', ['Dalam Proses', 'Diproses'])->count(),
                'disetujui' => (clone $myRequests)->whereIn('status', ['Disetujui', 'Selesai'])->count(),
            ],
            'ships' => Ship::query()->where('is_active', true)->orderBy('name')->get(),
            'summary_today' => [
                'kapal_hari_ini' => $todayShips->count(),
                'aktivitas_hari_ini' => OperationalActivity::query()->whereDate('activity_date', $today)->count(),
                'kebutuhan_menunggu' => ShipRequest::query()->whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur'])->count(),
                'pengajuan_diproses' => ShipRequest::query()->whereIn('status', ['Dalam Proses', 'Diproses'])->count(),
            ],
            'today_ships' => $todayShips,
            'upcoming_ships' => $upcomingShips,
            'recent_activities' => $recentActivities,
            'submission_info' => [
                'count' => $pendingCount,
                'title' => $pendingCount.' pengajuan menunggu persetujuan',
                'subtitle' => 'Buka daftar pengajuan untuk melihat status dan tindak lanjut.',
                'action_text' => 'Lihat Detail',
                'action_url' => '/requests',
            ],
            'prima_header' => [
                'greeting' => $this->greeting(),
                'user_name' => $user->name,
                'role_name' => $user->getPrimaryRoleName() ?: 'Pengguna',
                'date' => now()->locale('id')->translatedFormat('d F Y'),
                'location' => null,
                'temperature' => null,
                'weather' => null,
                'banner_image' => '/images/prima-banner.jpg',
            ],
            'ports' => Port::query()->where('is_active', true)->select('id', 'name', 'code', 'city')->orderBy('name')->get(),
            'companies' => ShipCompany::query()->where('is_active', true)->select('id', 'name', 'code')->orderBy('name')->get(),
            'all_ships' => Ship::query()->with(['company', 'port'])->where('is_active', true)->orderBy('name')->get(),
            'current_role' => $user->getPrimaryRoleName(),
            'pending_approvals' => $canViewApprovals ? $pendingApprovals : [],
            'financial_overview' => $canViewFinancials ? $financialOverview : null,
            'role_dashboard' => $this->roleDashboard(
                $user,
                $activePortCalls,
                $pendingApprovals,
                $financialOverview,
            ),
        ]);
    }

    /**
     * Build the role-specific dashboard summary without exposing actions that do not
     * belong to the authenticated user's area of responsibility.
     *
     * @param  Collection<int, PortCall>  $activePortCalls
     * @param  Collection<int, array<string, mixed>>  $pendingApprovals
     * @param  array<string, mixed>  $financialOverview
     * @return array<string, mixed>
     */
    private function roleDashboard(
        User $user,
        Collection $activePortCalls,
        Collection $pendingApprovals,
        array $financialOverview,
    ): array {
        $activeWorkOrders = WorkOrder::query()->whereNotIn('status', ['closed'])->count();
        $pendingNeeds = RequestItem::query()
            ->where('is_invoiced', false)
            ->whereNotIn('status', ['Selesai', 'Dibatalkan'])
            ->count();
        $vendorInvoicesToVerify = CostDocument::query()->where('status', 'received')->count();
        $vendorInvoicesWaitingBatch = CostDocument::query()
            ->where('status', 'verified')
            ->whereIn('payment_status', ['unpaid', 'partially_paid'])
            ->count();
        $adminFundingReviews = ExpenseRequest::query()->where('status', 'waiting_admin_review')->count();
        $directorFundingReviews = ExpenseRequest::query()->where('status', 'waiting_director')->count();
        $kopraApprovals = FundingRequest::query()->where('status', 'kopra_submitted')->count();
        $fundingInProgress = FundingRequest::query()
            ->whereNotIn('status', ['completed', 'kopra_rejected'])
            ->count();
        $completionNotesPending = PortCall::query()
            ->where('status', 'departed')
            ->whereDoesntHave('completionNote')
            ->count()
            + CompletionNote::query()->whereNotIn('status', ['reconciled'])->count();
        $overdueCompletionNotes = PortCall::query()
            ->where('status', 'departed')
            ->where('completion_note_due_at', '<', now())
            ->whereDoesntHave('completionNote')
            ->count()
            + CompletionNote::query()
                ->where('due_at', '<', now())
                ->whereNotIn('status', ['reconciled'])
                ->count();
        $unpaidClientInvoices = Invoice::query()->where('outstanding_amount', '>', 0)->count();
        $activitiesToday = OperationalActivity::query()->whereDate('activity_date', today())->count();
        $reportsToday = DailyReport::query()->whereDate('report_date', today())->count();
        $myOpenRequests = ShipRequest::query()
            ->where('created_by', $user->id)
            ->whereNotIn('status', ['Selesai', 'Ditolak', 'Dibatalkan'])
            ->count();
        $activeUsers = User::query()->where('is_active', true)->count();

        $commonPipeline = [
            ['label' => 'SPK Aktif', 'value' => $activeWorkOrders, 'href' => '/work-orders'],
            ['label' => 'Kapal Aktif', 'value' => $activePortCalls->count(), 'href' => '/vessels'],
            ['label' => 'Kebutuhan Belum Berinvoice', 'value' => $pendingNeeds, 'href' => '/needs'],
            ['label' => 'Pendanaan Berjalan', 'value' => $fundingInProgress, 'href' => '/funding'],
            ['label' => 'Nota Rampung Tertunda', 'value' => $completionNotesPending, 'href' => '/completion-notes'],
            ['label' => 'Invoice Klien Belum Lunas', 'value' => $unpaidClientInvoices, 'href' => '/receivables'],
        ];

        if ($user->isStaff()) {
            return [
                'role' => 'operasional',
                'eyebrow' => 'Operasional Lapangan',
                'title' => 'Kendali pekerjaan hari ini',
                'subtitle' => 'Pantau kapal, catat aktivitas, dan selesaikan kebutuhan lapangan dari satu tempat.',
                'primary_action' => ['label' => 'Catat Aktivitas', 'href' => '/operations'],
                'metrics' => [
                    ['key' => 'active_ships', 'label' => 'Kapal Terpantau', 'value' => $activePortCalls->count(), 'format' => 'number', 'hint' => 'Akan datang, labuh, dan sandar'],
                    ['key' => 'activities', 'label' => 'Aktivitas Hari Ini', 'value' => $activitiesToday, 'format' => 'number', 'hint' => 'Pembaruan operasional tercatat'],
                    ['key' => 'needs', 'label' => 'Kebutuhan Terbuka', 'value' => $pendingNeeds, 'format' => 'number', 'hint' => 'Perlu tindak lanjut lapangan'],
                    ['key' => 'requests', 'label' => 'Pengajuan Saya', 'value' => $myOpenRequests, 'format' => 'number', 'hint' => 'Masih dalam proses'],
                ],
                'priorities' => [
                    ['title' => 'Kapal aktif', 'description' => 'Perbarui posisi dan status kegiatan kapal.', 'count' => $activePortCalls->count(), 'href' => '/vessels', 'tone' => 'blue'],
                    ['title' => 'Kebutuhan terbuka', 'description' => 'Pastikan kebutuhan kapal dipenuhi tepat waktu.', 'count' => $pendingNeeds, 'href' => '/needs', 'tone' => 'amber'],
                    ['title' => 'Laporan harian', 'description' => 'Laporan yang sudah tercatat hari ini.', 'count' => $reportsToday, 'href' => '/operations', 'tone' => 'green'],
                ],
                'quick_actions' => [
                    ['label' => 'Aktivitas Lapangan', 'description' => 'Catat progres dan dokumentasi', 'href' => '/operations', 'icon' => 'activity'],
                    ['label' => 'Buat Kebutuhan', 'description' => 'Ajukan barang atau layanan', 'href' => '/needs', 'icon' => 'package'],
                    ['label' => 'Pengajuan Biaya', 'description' => 'Pantau dana operasional', 'href' => '/funding', 'icon' => 'wallet'],
                    ['label' => 'Daftar Kapal', 'description' => 'Lihat jadwal dan posisi', 'href' => '/vessels', 'icon' => 'ship'],
                ],
                'pipeline' => array_slice($commonPipeline, 0, 4),
                'charts' => [
                    [
                        'key' => 'vessel_status',
                        'type' => 'donut',
                        'title' => 'Posisi Kapal Terpantau',
                        'subtitle' => 'Komposisi posisi fisik kapal yang perlu dipantau hari ini.',
                        'format' => 'number',
                        'center_label' => 'kapal',
                        'segments' => [
                            ['label' => 'Akan Datang', 'value' => $activePortCalls->where('status', 'scheduled')->count(), 'color' => '#0060F4'],
                            ['label' => 'Labuh', 'value' => $activePortCalls->where('status', 'anchored')->count(), 'color' => '#F59E0B'],
                            ['label' => 'Sandar', 'value' => $activePortCalls->where('status', 'berthed')->count(), 'color' => '#16A36A'],
                            ['label' => 'Berangkat Hari Ini', 'value' => PortCall::query()->where('status', 'departed')->whereDate('departed_at', today())->count(), 'color' => '#7C3AED'],
                        ],
                    ],
                    $this->operationalActivityChart($user),
                    $this->requestStatusChart($user->id),
                ],
            ];
        }

        if ($user->isDirector()) {
            return [
                'role' => 'direktur',
                'eyebrow' => 'Direktur',
                'title' => 'Meja keputusan dan pengawasan',
                'subtitle' => 'Prioritaskan persetujuan, kontrol pendanaan Kopra, dan pantau kesehatan arus kas.',
                'primary_action' => ['label' => 'Buka Meja Approval', 'href' => '/approvals'],
                'metrics' => [
                    ['key' => 'approvals', 'label' => 'Menunggu Keputusan', 'value' => $pendingApprovals->count() + $directorFundingReviews, 'format' => 'number', 'hint' => 'Pengajuan dan pendanaan'],
                    ['key' => 'kopra', 'label' => 'Approval Kopra', 'value' => $kopraApprovals, 'format' => 'number', 'hint' => 'Menunggu otorisasi tahap kedua'],
                    ['key' => 'collected', 'label' => 'Kas Diterima', 'value' => $financialOverview['total_collected'], 'format' => 'currency', 'hint' => 'Pembayaran klien tercatat'],
                    ['key' => 'receivables', 'label' => 'Total Piutang', 'value' => $financialOverview['total_outstanding'], 'format' => 'currency', 'hint' => $financialOverview['collection_rate'].'% kolektibilitas'],
                ],
                'priorities' => [
                    ['title' => 'Pengajuan menunggu keputusan', 'description' => 'Tinjau kebutuhan dan estimasi anggaran.', 'count' => $pendingApprovals->count(), 'href' => '/approvals', 'tone' => 'amber'],
                    ['title' => 'Pendanaan menunggu Direktur', 'description' => 'Putuskan pengajuan sebelum proses Kopra.', 'count' => $directorFundingReviews, 'href' => '/funding', 'tone' => 'blue'],
                    ['title' => 'Approval Kopra', 'description' => 'Otorisasi pengajuan yang sudah masuk Kopra.', 'count' => $kopraApprovals, 'href' => '/funding', 'tone' => 'red'],
                ],
                'quick_actions' => [
                    ['label' => 'Approval Anggaran', 'description' => 'Putuskan pengajuan kebutuhan', 'href' => '/approvals', 'icon' => 'approval'],
                    ['label' => 'Pendanaan & Kopra', 'description' => 'Otorisasi dan pantau pencairan', 'href' => '/funding', 'icon' => 'bank'],
                    ['label' => 'Monitoring Piutang', 'description' => 'Pantau tagihan klien', 'href' => '/receivables', 'icon' => 'receivable'],
                    ['label' => 'Laporan Eksekutif', 'description' => 'Lihat ringkasan perusahaan', 'href' => '/reports', 'icon' => 'report'],
                ],
                'pipeline' => $commonPipeline,
                'charts' => [
                    [
                        'key' => 'approval_queue',
                        'type' => 'donut',
                        'title' => 'Komposisi Antrean Keputusan',
                        'subtitle' => 'Dokumen yang memerlukan keputusan Direktur di sistem SJA dan Kopra.',
                        'format' => 'number',
                        'center_label' => 'keputusan',
                        'segments' => [
                            ['label' => 'Pengajuan Kapal', 'value' => $pendingApprovals->count(), 'color' => '#F59E0B'],
                            ['label' => 'Pendanaan SJA', 'value' => $directorFundingReviews, 'color' => '#0060F4'],
                            ['label' => 'Approval Kopra', 'value' => $kopraApprovals, 'color' => '#7C3AED'],
                        ],
                    ],
                    $this->financialTrendChart($financialOverview),
                    $this->receivableAgingChart($financialOverview),
                ],
            ];
        }

        if ($user->isOwner()) {
            return [
                'role' => 'owner',
                'eyebrow' => 'Owner',
                'title' => 'Ringkasan strategis perusahaan',
                'subtitle' => 'Pantau performa operasional, arus kas, piutang, dan tata kelola pengguna secara menyeluruh.',
                'primary_action' => ['label' => 'Lihat Laporan', 'href' => '/reports'],
                'metrics' => [
                    ['key' => 'work_orders', 'label' => 'SPK Aktif', 'value' => $activeWorkOrders, 'format' => 'number', 'hint' => 'Kegiatan belum ditutup'],
                    ['key' => 'invoiced', 'label' => 'Nilai Tagihan', 'value' => $financialOverview['total_invoiced'], 'format' => 'currency', 'hint' => 'Total invoice klien'],
                    ['key' => 'collected', 'label' => 'Kas Diterima', 'value' => $financialOverview['total_collected'], 'format' => 'currency', 'hint' => $financialOverview['collection_rate'].'% kolektibilitas'],
                    ['key' => 'receivables', 'label' => 'Total Piutang', 'value' => $financialOverview['total_outstanding'], 'format' => 'currency', 'hint' => $unpaidClientInvoices.' invoice belum lunas'],
                ],
                'priorities' => [
                    ['title' => 'Piutang klien', 'description' => 'Tagihan yang masih perlu ditagih.', 'count' => $unpaidClientInvoices, 'href' => '/receivables', 'tone' => 'red'],
                    ['title' => 'Nota Rampung tertunda', 'description' => 'Dokumen belum selesai atau direkonsiliasi.', 'count' => $completionNotesPending, 'href' => '/completion-notes', 'tone' => 'amber'],
                    ['title' => 'Pengguna aktif', 'description' => 'Akun aktif dalam sistem perusahaan.', 'count' => $activeUsers, 'href' => '/master/users', 'tone' => 'green'],
                ],
                'quick_actions' => [
                    ['label' => 'Laporan Perusahaan', 'description' => 'Tinjau operasional dan keuangan', 'href' => '/reports', 'icon' => 'report'],
                    ['label' => 'Monitoring Piutang', 'description' => 'Pantau umur dan status tagihan', 'href' => '/receivables', 'icon' => 'receivable'],
                    ['label' => 'Manajemen Pengguna', 'description' => 'Kelola akun dan peran', 'href' => '/master/users', 'icon' => 'users'],
                    ['label' => 'Audit Proses', 'description' => 'Pantau alur pekerjaan berjalan', 'href' => '/work-orders', 'icon' => 'audit'],
                ],
                'pipeline' => $commonPipeline,
                'charts' => [
                    $this->financialTrendChart($financialOverview),
                    [
                        'key' => 'collection_mix',
                        'type' => 'donut',
                        'title' => 'Komposisi Penagihan Klien',
                        'subtitle' => 'Perbandingan kas yang sudah diterima dengan saldo piutang berjalan.',
                        'format' => 'currency',
                        'center_label' => 'total tagihan',
                        'segments' => [
                            ['label' => 'Sudah Diterima', 'value' => $financialOverview['total_collected'], 'color' => '#16A36A'],
                            ['label' => 'Masih Piutang', 'value' => $financialOverview['total_outstanding'], 'color' => '#E5484D'],
                        ],
                    ],
                    $this->workflowChart($commonPipeline, 'business_pipeline', 'Kesehatan Alur Bisnis', 'Posisi pekerjaan aktif dari SPK sampai invoice klien dilunasi.'),
                ],
            ];
        }

        return [
            'role' => 'admin',
            'eyebrow' => 'Administrasi Operasional',
            'title' => 'Pusat kendali administrasi',
            'subtitle' => 'Kelola SPK, invoice vendor, pendanaan, Nota Rampung, dan penagihan dari satu alur kerja.',
            'primary_action' => ['label' => 'Buat SPK Baru', 'href' => '/work-orders/create'],
            'metrics' => [
                ['key' => 'work_orders', 'label' => 'SPK Aktif', 'value' => $activeWorkOrders, 'format' => 'number', 'hint' => 'Kegiatan belum ditutup'],
                ['key' => 'needs', 'label' => 'Menunggu Invoice', 'value' => $pendingNeeds, 'format' => 'number', 'hint' => 'Kebutuhan belum berinvoice'],
                ['key' => 'vendor_invoices', 'label' => 'Invoice Perlu Diproses', 'value' => $vendorInvoicesToVerify + $vendorInvoicesWaitingBatch, 'format' => 'number', 'hint' => 'Verifikasi atau masukkan batch'],
                ['key' => 'receivables', 'label' => 'Total Piutang', 'value' => $financialOverview['total_outstanding'], 'format' => 'currency', 'hint' => $unpaidClientInvoices.' invoice belum lunas'],
            ],
            'priorities' => [
                ['title' => 'Invoice vendor perlu verifikasi', 'description' => 'Periksa dokumen sebelum masuk pendanaan.', 'count' => $vendorInvoicesToVerify, 'href' => '/vendor-invoices', 'tone' => 'amber'],
                ['title' => 'Pengajuan perlu pemeriksaan Admin', 'description' => 'Teruskan pengajuan valid kepada Direktur.', 'count' => $adminFundingReviews, 'href' => '/funding', 'tone' => 'blue'],
                ['title' => 'Nota Rampung melewati tenggat', 'description' => 'Tindak lanjuti dokumen Pelindo yang terlambat.', 'count' => $overdueCompletionNotes, 'href' => '/completion-notes', 'tone' => 'red'],
            ],
            'quick_actions' => [
                ['label' => 'SPK & Kapal', 'description' => 'Kelola pekerjaan dan kunjungan', 'href' => '/work-orders', 'icon' => 'work_order'],
                ['label' => 'Invoice Vendor', 'description' => 'Verifikasi dokumen vendor', 'href' => '/vendor-invoices', 'icon' => 'invoice'],
                ['label' => 'Pendanaan & Kopra', 'description' => 'Susun batch dan pencairan', 'href' => '/funding', 'icon' => 'bank'],
                ['label' => 'Nota Rampung', 'description' => 'Unggah dan rekonsiliasi', 'href' => '/completion-notes', 'icon' => 'completion'],
            ],
            'pipeline' => $commonPipeline,
            'charts' => [
                $this->workflowChart($commonPipeline, 'workflow_pipeline', 'Alur Dokumen Perusahaan', 'Jumlah pekerjaan pada tahapan utama dari SPK hingga penagihan klien.'),
                [
                    'key' => 'vendor_invoices',
                    'type' => 'donut',
                    'title' => 'Status Invoice Vendor',
                    'subtitle' => 'Dokumen vendor yang diterima, siap masuk batch, dan sudah dibayar.',
                    'format' => 'number',
                    'center_label' => 'invoice',
                    'segments' => [
                        ['label' => 'Perlu Verifikasi', 'value' => $vendorInvoicesToVerify, 'color' => '#F59E0B'],
                        ['label' => 'Menunggu Batch', 'value' => $vendorInvoicesWaitingBatch, 'color' => '#0060F4'],
                        ['label' => 'Sudah Dibayar', 'value' => CostDocument::query()->where('payment_status', 'paid')->count(), 'color' => '#16A36A'],
                    ],
                ],
                $this->requestStatusChart(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function operationalActivityChart(User $user): array
    {
        $days = collect(range(6, 0))->map(fn (int $offset): Carbon => today()->subDays($offset));
        $firstDay = $days->first();
        $lastDay = $days->last();

        $activityCounts = OperationalActivity::query()
            ->where('created_by', $user->id)
            ->whereBetween('activity_date', [$firstDay, $lastDay])
            ->get(['activity_date'])
            ->countBy(fn (OperationalActivity $activity): string => $activity->activity_date->toDateString());

        $reportCounts = DailyReport::query()
            ->where('officer_id', $user->id)
            ->whereBetween('report_date', [$firstDay, $lastDay])
            ->get(['report_date'])
            ->countBy(fn (DailyReport $report): string => $report->report_date->toDateString());

        return [
            'key' => 'field_activity',
            'type' => 'bars',
            'title' => 'Catatan Lapangan 7 Hari',
            'subtitle' => 'Aktivitas dan laporan harian yang Anda catat selama tujuh hari terakhir.',
            'format' => 'number',
            'series' => [
                ['key' => 'activities', 'label' => 'Aktivitas', 'color' => '#0060F4'],
                ['key' => 'reports', 'label' => 'Laporan Harian', 'color' => '#16A36A'],
            ],
            'points' => $days->map(fn (Carbon $day): array => [
                'label' => $day->locale('id')->translatedFormat('d M'),
                'values' => [
                    'activities' => $activityCounts->get($day->toDateString(), 0),
                    'reports' => $reportCounts->get($day->toDateString(), 0),
                ],
            ])->values(),
        ];
    }

    /** @return array<string, mixed> */
    private function requestStatusChart(?int $createdBy = null): array
    {
        $requests = ShipRequest::query()
            ->when($createdBy, fn ($query) => $query->where('created_by', $createdBy));

        return [
            'key' => 'request_status',
            'type' => 'donut',
            'title' => $createdBy ? 'Status Pengajuan Saya' : 'Status Pengajuan Kapal',
            'subtitle' => $createdBy
                ? 'Komposisi pengajuan yang Anda buat berdasarkan status prosesnya.'
                : 'Komposisi seluruh pengajuan kapal yang sedang dikelola perusahaan.',
            'format' => 'number',
            'center_label' => 'pengajuan',
            'segments' => [
                [
                    'label' => 'Menunggu',
                    'value' => (clone $requests)->whereIn('status', ['Menunggu Approval', 'Menunggu Approval Direktur'])->count(),
                    'color' => '#F59E0B',
                ],
                [
                    'label' => 'Diproses',
                    'value' => (clone $requests)->whereIn('status', ['Dalam Proses', 'Diproses', 'Disetujui'])->count(),
                    'color' => '#0060F4',
                ],
                ['label' => 'Selesai', 'value' => (clone $requests)->where('status', 'Selesai')->count(), 'color' => '#16A36A'],
            ],
        ];
    }

    /** @param  array<string, mixed>  $financialOverview
     * @return array<string, mixed>
     */
    private function financialTrendChart(array $financialOverview): array
    {
        return [
            'key' => 'financial_trend',
            'type' => 'bars',
            'title' => 'Tren Tagihan 6 Bulan',
            'subtitle' => 'Perbandingan invoice klien, kas diterima, dan saldo piutang per bulan.',
            'format' => 'currency',
            'series' => [
                ['key' => 'invoiced', 'label' => 'Ditagihkan', 'color' => '#0060F4'],
                ['key' => 'collected', 'label' => 'Diterima', 'color' => '#16A36A'],
                ['key' => 'outstanding', 'label' => 'Piutang', 'color' => '#E5484D'],
            ],
            'points' => collect($financialOverview['chart']['data'])->map(fn (array $month): array => [
                'label' => $month['month'],
                'values' => [
                    'invoiced' => $month['invoiced'],
                    'collected' => $month['collected'],
                    'outstanding' => $month['outstanding'],
                ],
            ])->values(),
        ];
    }

    /** @param  array<string, mixed>  $financialOverview
     * @return array<string, mixed>
     */
    private function receivableAgingChart(array $financialOverview): array
    {
        return [
            'key' => 'receivables_aging',
            'type' => 'donut',
            'title' => 'Umur Piutang Klien',
            'subtitle' => 'Sebaran saldo piutang berdasarkan lama keterlambatan pembayaran.',
            'format' => 'currency',
            'center_label' => 'total piutang',
            'segments' => [
                ['label' => 'Belum Jatuh Tempo', 'value' => $financialOverview['aging']['current'], 'color' => '#16A36A'],
                ['label' => 'Terlambat 1–30 Hari', 'value' => $financialOverview['aging']['overdue_30'], 'color' => '#F59E0B'],
                ['label' => 'Terlambat >30 Hari', 'value' => $financialOverview['aging']['overdue_60'], 'color' => '#E5484D'],
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<string, mixed>
     */
    private function workflowChart(array $items, string $key, string $title, string $subtitle): array
    {
        return [
            'key' => $key,
            'type' => 'flow',
            'title' => $title,
            'subtitle' => $subtitle,
            'format' => 'number',
            'items' => $items,
        ];
    }

    /** @return array<string, mixed> */
    private function portCallCard(PortCall $portCall): array
    {
        return [
            'id' => (string) $portCall->id,
            'ship_id' => (string) $portCall->ship_id,
            'name' => $portCall->ship?->name ?? 'Kapal tidak tersedia',
            'status' => $this->portCallStatusLabel($portCall->status),
            'status_variant' => match ($portCall->status) {
                'berthed' => 'success',
                'anchored' => 'info',
                'scheduled' => 'waiting',
                default => 'processing',
            },
            'eta' => $portCall->eta_at?->format('d M Y H:i') ?? '-',
            'port' => $portCall->port?->name ?? '-',
            'company' => $portCall->ship?->company?->name ?? '-',
            'captain_name' => $portCall->ship?->captain_name,
            'captain_phone' => $portCall->ship?->captain_phone,
            'call_sign' => $portCall->ship?->call_sign,
            'gross_tonnage' => $portCall->ship?->gross_tonnage,
            'length' => $portCall->ship?->length,
            'image_url' => $portCall->ship?->image,
        ];
    }

    private function portCallStatusLabel(string $status): string
    {
        return match ($status) {
            'scheduled' => 'Akan Datang',
            'anchored' => 'Labuh',
            'berthed' => 'Sandar',
            'departed' => 'Berangkat',
            default => ucfirst($status),
        };
    }

    private function greeting(): string
    {
        return match (true) {
            now()->hour >= 4 && now()->hour < 11 => 'Selamat Pagi,',
            now()->hour < 15 => 'Selamat Siang,',
            now()->hour < 18 => 'Selamat Sore,',
            default => 'Selamat Malam,',
        };
    }
}
