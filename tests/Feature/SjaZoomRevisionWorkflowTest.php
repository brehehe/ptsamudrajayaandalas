<?php

use App\Models\ClientReceipt;
use App\Models\CompletionNote;
use App\Models\DailyReport;
use App\Models\ExpenseRequest;
use App\Models\Invoice;
use App\Models\OperationalActivity;
use App\Models\OutgoingPayment;
use App\Models\Port;
use App\Models\PortCall;
use App\Models\Ship;
use App\Models\ShipCompany;
use App\Models\ShipRequest;
use App\Models\User;
use App\Models\WorkOrder;
use App\Notifications\ReceivableDueReminder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function zoomRevisionUser(string $role): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']));

    return $user;
}

/**
 * @return array{company: ShipCompany, ship: Ship, port: Port, workOrder: WorkOrder, portCall: PortCall}
 */
function zoomRevisionJob(User $admin, string $suffix = '001'): array
{
    $company = ShipCompany::create(['name' => "PT Revisi Zoom {$suffix}", 'is_active' => true]);
    $ship = Ship::create(['name' => "KM Revisi Zoom {$suffix}", 'ship_company_id' => $company->id, 'is_active' => true]);
    $port = Port::create(['code' => "R{$suffix}", 'name' => "Pelabuhan Revisi {$suffix}", 'city' => 'Gresik', 'is_active' => true]);
    $workOrder = WorkOrder::create([
        'system_number' => "SPK-SJA-REV-{$suffix}",
        'client_number' => "SPK/KLIEN/REV/{$suffix}",
        'company_id' => $company->id,
        'document_date' => today(),
        'received_at' => now(),
        'status' => 'billing',
        'document_path' => "sja/spk/revisi-{$suffix}.pdf",
        'created_by' => $admin->id,
        'assigned_to' => $admin->id,
        'planned_ship_id' => $ship->id,
        'planned_port_id' => $port->id,
        'planned_eta_at' => today()->addDay(),
    ]);
    $workOrder->items()->create(['name' => 'Keagenan kapal']);
    $portCall = PortCall::create([
        'job_number' => "JOB-SPK-SJA-REV-{$suffix}",
        'work_order_id' => $workOrder->id,
        'ship_id' => $ship->id,
        'port_id' => $port->id,
        'status' => 'departed',
        'eta_at' => today()->addDay(),
        'departed_at' => now(),
        'financial_status' => 'billing',
    ]);

    return compact('company', 'ship', 'port', 'workOrder', 'portCall');
}

test('authorized user edits spk dates and replaces the private document', function () {
    Storage::fake('local');
    $admin = zoomRevisionUser('Admin');
    $job = zoomRevisionJob($admin, 'EDIT');
    Storage::disk('local')->put($job['workOrder']->document_path, 'old document');

    $response = $this->actingAs($admin)->patch(route('work-orders.update', $job['workOrder']), [
        'client_number' => 'SPK/KLIEN/REV/EDIT-2',
        'company_id' => $job['company']->id,
        'ship_id' => $job['ship']->id,
        'port_id' => $job['port']->id,
        'document_date' => today()->toDateString(),
        'received_at' => now()->format('Y-m-d H:i:s'),
        'eta_at' => today()->addDays(2)->toDateString(),
        'etd_at' => today()->addDays(4)->toDateString(),
        'activity_name' => 'Keagenan kapal diperbarui',
        'activity_description' => 'Koreksi data SPK klien.',
        'assigned_to' => $admin->id,
        'document' => UploadedFile::fake()->create('spk-revisi.pdf', 20, 'application/pdf'),
    ]);

    $response->assertRedirect(route('work-orders.detail', $job['workOrder']))->assertSessionHasNoErrors();

    $workOrder = $job['workOrder']->fresh();
    expect($workOrder->client_number)->toBe('SPK/KLIEN/REV/EDIT-2')
        ->and($workOrder->planned_eta_at->toDateString())->toBe(today()->addDays(2)->toDateString())
        ->and($workOrder->portCall->eta_at->toDateString())->toBe(today()->addDays(2)->toDateString())
        ->and($workOrder->items()->value('name'))->toBe('Keagenan kapal diperbarui');
    Storage::disk('local')->assertMissing('sja/spk/revisi-EDIT.pdf');
    Storage::disk('local')->assertExists($workOrder->document_path);
});

test('company expense is approved and realized once without a vessel job', function () {
    Storage::fake('local');
    Notification::fake();
    $admin = zoomRevisionUser('Admin');
    $director = zoomRevisionUser('Direktur');

    $this->actingAs($admin)->post(route('expenses.company.store'), [
        'category' => 'Internet',
        'description' => 'Internet kantor Oktober',
        'amount' => 1500000,
        'notes' => 'Tagihan operasional kantor.',
        'supporting_document' => UploadedFile::fake()->create('tagihan-internet.pdf', 20, 'application/pdf'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $expense = ExpenseRequest::query()->sole();
    expect($expense->scope)->toBe('company')
        ->and($expense->port_call_id)->toBeNull()
        ->and($expense->status)->toBe('waiting_director');

    $this->actingAs($director)->post(route('expenses.company.decision', $expense), [
        'decision' => 'approve',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($admin)->post(route('expenses.company.realize', $expense), [
        'realized_amount' => 1450000,
        'realized_date' => today()->toDateString(),
        'payment_reference' => 'TRF-INTERNET-001',
        'payment_proof' => UploadedFile::fake()->image('bukti-transfer.jpg'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($expense->fresh()->status)->toBe('realized')
        ->and((float) $expense->fresh()->realized_amount)->toBe(1450000.0);

    $this->post(route('expenses.company.realize', $expense), [
        'realized_amount' => 1450000,
        'realized_date' => today()->toDateString(),
        'payment_reference' => 'TRF-INTERNET-002',
        'payment_proof' => UploadedFile::fake()->image('bukti-transfer-ulang.jpg'),
    ])->assertSessionHasErrors('realized_amount');
});

test('flexible client invoice can merge source costs and add a custom billing line', function () {
    $admin = zoomRevisionUser('Admin');
    $job = zoomRevisionJob($admin, 'INV');
    CompletionNote::create([
        'port_call_id' => $job['portCall']->id,
        'document_number' => 'NR-REV-INV',
        'departed_at' => now(),
        'issued_at' => today(),
        'uploaded_at' => now(),
        'document_path' => 'sja/completion-notes/revisi-invoice.pdf',
        'actual_amount' => 800000,
        'status' => 'reconciled',
        'uploaded_by' => $admin->id,
    ]);
    $shipRequest = ShipRequest::create([
        'request_number' => 'PGJ-REV-INV',
        'ship_id' => $job['ship']->id,
        'company_id' => $job['company']->id,
        'port_id' => $job['port']->id,
        'port_call_id' => $job['portCall']->id,
        'created_by' => $admin->id,
        'status' => 'Disetujui',
        'request_date' => today(),
    ]);
    $clearanceIn = $shipRequest->items()->create([
        'item_name' => 'Clearance In',
        'item_type' => 'jasa',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 300000,
        'selling_price' => 0,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    $clearanceOut = $shipRequest->items()->create([
        'item_name' => 'Clearance Out',
        'item_type' => 'jasa',
        'unit' => 'Dokumen',
        'quantity' => 1,
        'hpp_price' => 250000,
        'selling_price' => 0,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);

    $this->actingAs($admin)->post(route('invoices.store'), [
        'port_call_id' => $job['portCall']->id,
        'company_id' => $job['company']->id,
        'invoice_type' => 'agency',
        'due_date' => today()->addDays(14)->toDateString(),
        'lines' => [
            [
                'description' => 'Clearance In dan Out',
                'quantity' => 1,
                'unit' => 'Paket',
                'unit_price' => 1250000,
                'source_item_ids' => [$clearanceIn->id, $clearanceOut->id],
            ],
            [
                'description' => 'Administrasi Dokumen',
                'quantity' => 1,
                'unit' => 'Paket',
                'unit_price' => 100000,
                'source_item_ids' => [],
            ],
        ],
    ])->assertRedirect(route('invoices.index'))->assertSessionHasNoErrors();

    $invoice = Invoice::query()->with('items.sources')->sole();
    expect($invoice->items)->toHaveCount(2)
        ->and($invoice->items->first()->description)->toBe('Clearance In dan Out')
        ->and($invoice->items->first()->request_item_id)->toBeNull()
        ->and($invoice->items->first()->sources)->toHaveCount(2)
        ->and($invoice->items->last()->is_custom)->toBeTrue()
        ->and((float) $invoice->grand_total)->toBe(1350000.0)
        ->and($clearanceIn->fresh()->is_invoiced)->toBeTrue()
        ->and($clearanceOut->fresh()->is_invoiced)->toBeTrue();
});

test('due reminder is sent once per invoice and reminder date', function () {
    Notification::fake();
    $admin = zoomRevisionUser('Admin');
    $company = ShipCompany::create(['name' => 'PT Piutang Reminder', 'is_active' => true]);
    $invoice = Invoice::create([
        'invoice_number' => 'INV-DUE-REMINDER-001',
        'company_id' => $company->id,
        'invoice_type' => 'agency',
        'invoice_date' => today(),
        'due_date' => today()->addDay(),
        'subtotal' => 1000000,
        'grand_total' => 1000000,
        'outstanding_amount' => 1000000,
        'status' => 'sent',
    ]);

    $this->artisan('receivables:send-due-reminders')->assertSuccessful();
    Notification::assertSentTo($admin, ReceivableDueReminder::class, fn (ReceivableDueReminder $notification): bool => $notification->invoice->is($invoice)
        && $notification->daysUntilDue === 1);

    DB::table('notifications')->insert([
        'id' => (string) Str::uuid(),
        'type' => 'receivable-due-reminder',
        'notifiable_type' => User::class,
        'notifiable_id' => $admin->id,
        'data' => json_encode([
            'invoice_id' => $invoice->id,
            'reminder_date' => today()->toDateString(),
        ], JSON_THROW_ON_ERROR),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    Notification::fake();
    $this->artisan('receivables:send-due-reminders')->assertSuccessful();
    Notification::assertNothingSent();
});

test('company report subtracts vessel hpp and realized non-vessel expenses from revenue', function () {
    $owner = zoomRevisionUser('Owner');
    $job = zoomRevisionJob($owner, 'RPT');
    $shipRequest = ShipRequest::create([
        'request_number' => 'PGJ-REV-RPT',
        'ship_id' => $job['ship']->id,
        'company_id' => $job['company']->id,
        'port_id' => $job['port']->id,
        'port_call_id' => $job['portCall']->id,
        'created_by' => $owner->id,
        'status' => 'Disetujui',
        'request_date' => today(),
    ]);
    $shipRequest->items()->create([
        'item_name' => 'Biaya Operasional Kapal',
        'unit' => 'Paket',
        'quantity' => 2,
        'hpp_price' => 400000,
        'selling_price' => 0,
        'status' => 'disetujui',
        'director_status' => 'approved',
    ]);
    Invoice::create([
        'invoice_number' => 'INV-REV-RPT',
        'port_call_id' => $job['portCall']->id,
        'company_id' => $job['company']->id,
        'request_id' => $shipRequest->id,
        'invoice_type' => 'agency',
        'invoice_date' => today(),
        'due_date' => today()->addDays(14),
        'subtotal' => 1400000,
        'grand_total' => 1400000,
        'outstanding_amount' => 1400000,
        'status' => 'released',
    ]);
    ExpenseRequest::create([
        'request_number' => 'PNG-REV-RPT',
        'scope' => 'company',
        'category' => 'ATK',
        'status' => 'realized',
        'total' => 200000,
        'realized_amount' => 200000,
        'realized_date' => today(),
        'created_by' => $owner->id,
    ]);

    $this->actingAs($owner)
        ->get(route('reports.index', [
            'from' => today()->startOfMonth()->toDateString(),
            'to' => today()->endOfMonth()->toDateString(),
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Index')
            ->where('summary.total_invoiced', 1400000)
            ->where('summary.total_hpp', 800000)
            ->where('summary.ship_margin', 600000)
            ->where('summary.non_vessel_expenses', 200000)
            ->where('summary.company_net_result', 400000)
            ->where('portCalls.data.0.margin', 600000)
            ->where('portCalls.data.0.margin_percentage', 42.86)
            ->where('portCalls.data.0.agency_invoiced', 1400000)
            ->where('portCalls.data.0.reimbursement_invoiced', 0)
            ->where('portCalls.data.0.invoice_count', 1)
            ->where('portCalls.data.0.request_count', 1));
});

test('report search includes client SPK while field staff remains unauthorized', function () {
    $owner = zoomRevisionUser('Owner');
    $fieldStaff = zoomRevisionUser('Lapangan');
    $job = zoomRevisionJob($owner, 'SEARCH');

    Invoice::create([
        'invoice_number' => 'INV-REV-SEARCH',
        'port_call_id' => $job['portCall']->id,
        'company_id' => $job['company']->id,
        'invoice_type' => 'agency',
        'invoice_date' => today(),
        'due_date' => today()->addDays(14),
        'subtotal' => 2000000,
        'grand_total' => 2000000,
        'outstanding_amount' => 2000000,
        'status' => 'released',
    ]);

    $this->actingAs($fieldStaff)
        ->get(route('reports.index'))
        ->assertForbidden();

    $this->actingAs($fieldStaff)
        ->get(route('reports.margin'))
        ->assertForbidden();

    $this->actingAs($owner)
        ->get(route('reports.index', [
            'from' => today()->startOfMonth()->toDateString(),
            'to' => today()->endOfMonth()->toDateString(),
            'search' => 'SPK/KLIEN/REV/SEARCH',
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Index')
            ->has('portCalls.data', 1)
            ->where('portCalls.data.0.client_spk', 'SPK/KLIEN/REV/SEARCH')
            ->has('invoiceReport.rows.data', 1)
            ->where('invoiceReport.rows.data.0.invoice_number', 'INV-REV-SEARCH')
            ->where('filters.search', 'SPK/KLIEN/REV/SEARCH'));
});

test('dedicated report routes select their own report section', function (string $routeName, string $reportSection) {
    $owner = zoomRevisionUser('Owner');

    $this->actingAs($owner)
        ->get(route($routeName))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Index')
            ->where('filters.tab', $reportSection));
})->with([
    'margin' => ['reports.margin', 'ringkasan_margin'],
    'invoice' => ['reports.invoices', 'invoice'],
    'piutang' => ['reports.receivables', 'piutang'],
    'pengeluaran' => ['reports.expenses', 'pengeluaran'],
    'aktivitas' => ['reports.activities', 'aktivitas'],
    'laba rugi' => ['reports.profit-loss', 'laba_rugi'],
    'arus kas' => ['reports.cash-flow', 'keuangan_kas'],
    'operasional' => ['reports.operations', 'operasional'],
]);

test('company report finance summary uses confirmed cash records and the active company filter', function () {
    $owner = zoomRevisionUser('Owner');
    $selectedJob = zoomRevisionJob($owner, 'CASH-A');
    $otherJob = zoomRevisionJob($owner, 'CASH-B');

    Invoice::create([
        'invoice_number' => 'INV-REV-CASH-A',
        'port_call_id' => $selectedJob['portCall']->id,
        'company_id' => $selectedJob['company']->id,
        'invoice_type' => 'agency',
        'invoice_date' => today(),
        'due_date' => today()->addDays(14),
        'subtotal' => 1000000,
        'grand_total' => 1000000,
        'paid_amount' => 600000,
        'outstanding_amount' => 400000,
        'status' => 'released',
    ]);
    Invoice::create([
        'invoice_number' => 'INV-REV-CASH-B',
        'port_call_id' => $otherJob['portCall']->id,
        'company_id' => $otherJob['company']->id,
        'invoice_type' => 'agency',
        'invoice_date' => today(),
        'due_date' => today()->addDays(14),
        'subtotal' => 2000000,
        'grand_total' => 2000000,
        'paid_amount' => 0,
        'outstanding_amount' => 2000000,
        'status' => 'released',
    ]);
    ClientReceipt::create([
        'company_id' => $selectedJob['company']->id,
        'received_date' => today(),
        'amount' => 600000,
        'bank_reference' => 'BANK-REV-CASH-A',
        'status' => 'confirmed',
        'recorded_by' => $owner->id,
    ]);
    ClientReceipt::create([
        'company_id' => $otherJob['company']->id,
        'received_date' => today(),
        'amount' => 900000,
        'bank_reference' => 'BANK-REV-CASH-B',
        'status' => 'confirmed',
        'recorded_by' => $owner->id,
    ]);
    OutgoingPayment::create([
        'port_call_id' => $selectedJob['portCall']->id,
        'payment_type' => 'Vendor',
        'payment_date' => today(),
        'amount' => 250000,
        'recipient' => 'Vendor A',
        'reference_number' => 'OUT-REV-CASH-A',
        'verification_status' => 'verified',
        'recorded_by' => $owner->id,
    ]);
    OperationalActivity::create([
        'activity_date' => today(),
        'activity_time' => '09:30',
        'location_name' => 'Dermaga A',
        'is_vessel_related' => true,
        'ship_id' => $selectedJob['ship']->id,
        'port_call_id' => $selectedJob['portCall']->id,
        'category' => 'Kegiatan Kapal',
        'title' => 'Pemeriksaan dokumen kapal',
        'detail' => 'Dokumen kedatangan diperiksa.',
        'created_by' => $owner->id,
        'progress_percent' => 75,
    ]);
    DailyReport::create([
        'port_call_id' => $selectedJob['portCall']->id,
        'officer_id' => $owner->id,
        'report_date' => today(),
        'status' => 'submitted',
        'no_activity' => false,
        'summary' => 'Pemeriksaan dokumen selesai dicatat.',
        'submitted_at' => now(),
    ]);
    OutgoingPayment::create([
        'port_call_id' => $selectedJob['portCall']->id,
        'payment_type' => 'Vendor',
        'payment_date' => today(),
        'amount' => 750000,
        'recipient' => 'Vendor Pending',
        'reference_number' => 'OUT-REV-CASH-PENDING',
        'verification_status' => 'pending',
        'recorded_by' => $owner->id,
    ]);
    OutgoingPayment::create([
        'port_call_id' => $otherJob['portCall']->id,
        'payment_type' => 'Vendor',
        'payment_date' => today(),
        'amount' => 400000,
        'recipient' => 'Vendor B',
        'reference_number' => 'OUT-REV-CASH-B',
        'verification_status' => 'verified',
        'recorded_by' => $owner->id,
    ]);

    $this->actingAs($owner)
        ->get(route('reports.index', [
            'from' => today()->startOfMonth()->toDateString(),
            'to' => today()->endOfMonth()->toDateString(),
            'company_id' => $selectedJob['company']->id,
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Index')
            ->has('portCalls.data', 1)
            ->where('summary.total_invoiced', 1000000)
            ->where('summary.ar_paid', 600000)
            ->where('summary.ar_outstanding', 400000)
            ->where('summary.cash_in', 600000)
            ->where('summary.cash_out', 250000)
            ->where('summary.net_cash_flow', 350000)
            ->where('financialTrend.key', 'report_financial_trend')
            ->where('financialTrend.series.0.key', 'invoiced')
            ->where('financialTrend.series.1.key', 'cash_in')
            ->where('financialTrend.series.2.key', 'cash_out')
            ->where('financialTrend.points', fn ($points): bool => collect($points)->sum(fn (array $point): float => (float) $point['values']['invoiced']) === 1000000.0)
            ->where('invoiceReport.summary.total_documents', 1)
            ->where('invoiceReport.summary.outstanding_amount', 400000)
            ->has('invoiceReport.rows.data', 1)
            ->where('invoiceReport.chart.key', 'report_invoice_status')
            ->where('receivableReport.summary.open_documents', 1)
            ->where('receivableReport.summary.outstanding_amount', 400000)
            ->has('receivableReport.rows.data', 1)
            ->where('receivableReport.chart.key', 'report_receivable_aging')
            ->where('expenseReport.summary.total_documents', 2)
            ->where('expenseReport.summary.verified_amount', 250000)
            ->where('expenseReport.summary.pending_amount', 750000)
            ->has('expenseReport.rows.data', 2)
            ->where('expenseReport.chart.key', 'report_expense_status')
            ->where('activityReport.summary.total_activities', 1)
            ->where('activityReport.summary.daily_reports', 1)
            ->where('activityReport.summary.ships_covered', 1)
            ->has('activityReport.rows.data', 1)
            ->where('activityReport.chart.key', 'report_activity_trend')
            ->where('filters.company_id', $selectedJob['company']->id));

    $this->actingAs($owner)
        ->get(route('reports.index', [
            'from' => today()->startOfMonth()->toDateString(),
            'to' => today()->endOfMonth()->toDateString(),
            'company_id' => $selectedJob['company']->id,
            'tab' => 'pengeluaran',
            'sort' => 'amount',
            'direction' => 'asc',
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.tab', 'pengeluaran')
            ->where('filters.sort', 'amount')
            ->where('filters.direction', 'asc')
            ->where('expenseReport.rows.data.0.amount', 250000)
            ->where('expenseReport.rows.data.1.amount', 750000));
});
