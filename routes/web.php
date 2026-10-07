<?php

use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\CompletionNoteController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FundingWorkflowController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\MasterCompanyController;
use App\Http\Controllers\MasterPortController;
use App\Http\Controllers\MasterProductController;
use App\Http\Controllers\MasterRoleController;
use App\Http\Controllers\MasterUserController;
use App\Http\Controllers\MasterVendorController;
use App\Http\Controllers\MasterVesselController;
use App\Http\Controllers\NeedController;
use App\Http\Controllers\OperationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReceivableController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RequestController;
use App\Http\Controllers\ServiceTypeController;
use App\Http\Controllers\VendorInvoiceController;
use App\Http\Controllers\VesselController;
use App\Http\Controllers\WorkOrderController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // SPK / Work Order
    Route::get('/work-orders', [WorkOrderController::class, 'index'])->name('work-orders.index');
    Route::get('/work-orders/create', [WorkOrderController::class, 'create'])->name('work-orders.create');
    Route::post('/work-orders', [WorkOrderController::class, 'store'])->name('work-orders.store');
    Route::get('/work-orders/{workOrder}/detail', [WorkOrderController::class, 'show'])->name('work-orders.detail');
    Route::patch('/work-orders/{workOrder}/status', [WorkOrderController::class, 'updateStatus'])->name('work-orders.status');
    Route::get('/work-orders/{workOrder}/document', [WorkOrderController::class, 'download'])->name('work-orders.document');

    // Kedatangan kapal
    Route::get('/vessels', [VesselController::class, 'index'])->name('vessels.index');
    Route::post('/vessels', [VesselController::class, 'store'])->name('vessels.store');
    Route::post('/ship-arrivals', [VesselController::class, 'storeArrival'])->name('ship-arrivals.store');
    Route::post('/companies', [VesselController::class, 'storeCompany'])->name('companies.store');
    Route::get('/vessels/{id}', [VesselController::class, 'show'])->name('vessels.show');
    Route::redirect('/master/ships', '/master/vessels')->name('master.ships.index');

    // Kebutuhan (Logistik Armada)
    Route::get('/needs', [NeedController::class, 'index'])->name('needs.index');
    Route::post('/needs', [NeedController::class, 'store'])->name('needs.store');
    Route::patch('/needs/{id}/status', [NeedController::class, 'updateStatus'])->name('needs.update-status');

    // Requests / Pengajuan Kebutuhan (Form Wizard 3-Langkah Lapangan & Admin Actions)
    Route::get('/requests', [RequestController::class, 'index'])->name('requests.index');
    Route::get('/requests/create', [RequestController::class, 'create'])->name('requests.create');
    Route::get('/requests/{id}/detail', [RequestController::class, 'show'])->name('requests.detail');
    Route::get('/requests/{id}', [RequestController::class, 'show'])->name('requests.show');
    Route::post('/requests', [RequestController::class, 'store'])->name('requests.store');
    Route::post('/requests/wizard', [RequestController::class, 'storeWizard'])->name('requests.store-wizard');
    Route::post('/requests/multi', [RequestController::class, 'storeMulti'])->name('requests.store-multi');
    Route::post('/requests/batch-forward-director', [RequestController::class, 'batchForwardDirector'])->name('requests.batch-forward-director');
    Route::post('/requests/{id}/forward-director', [RequestController::class, 'forwardToDirector'])->name('requests.forward-director');
    Route::post('/requests/{requestId}/items/{itemId}/revision', [RequestController::class, 'requestItemRevision'])->name('requests.items.revision');
    Route::post('/requests/{requestId}/items/{itemId}/update-price', [RequestController::class, 'updateItemPrice'])->name('requests.items.update-price');
    Route::post('/requests/items/batch-update-prices', [RequestController::class, 'batchUpdateItemPrices'])->name('requests.items.batch-update-prices');
    Route::post('/requests/{id}/create-clearance-in-invoice', [RequestController::class, 'createClearanceInInvoice'])->name('requests.clearance-in-invoice');
    Route::post('/requests/{id}/split-invoices', [RequestController::class, 'splitInvoices'])->name('requests.split-invoices');
    Route::post('/requests/{id}/items', [RequestController::class, 'addItem'])->name('requests.items.store');

    // Approval Direktur & Otorisasi Dana Kopra
    Route::get('/approvals', [ApprovalController::class, 'index'])->name('approvals.index');
    Route::get('/approvals/{id}/detail', [ApprovalController::class, 'show'])->name('approvals.detail');
    Route::post('/approvals/requests/batch-item-decision', [ApprovalController::class, 'batchItemDecision'])->name('approvals.requests.batch-item-decision');
    Route::post('/approvals/requests/{id}/approve', [ApprovalController::class, 'approveRequest'])->name('approvals.requests.approve');
    Route::post('/approvals/requests/{id}/reject', [ApprovalController::class, 'rejectRequest'])->name('approvals.requests.reject');
    Route::post('/approvals/requests/{id}/item-decision', [ApprovalController::class, 'itemDecision'])->name('approvals.requests.item-decision');
    Route::post('/approvals/items/{id}', [ApprovalController::class, 'singleItemDecision'])->name('approvals.items.decision');
    Route::post('/approvals/payments/{id}/verify', [ApprovalController::class, 'verifyPayment'])->name('approvals.payments.verify');

    // Operasional & Laporan Lapangan Pak Prima
    Route::get('/operations', [OperationController::class, 'index'])->name('operations.index');
    Route::post('/operations/activities', [OperationController::class, 'storeActivity'])->name('operations.activities.store');
    Route::post('/operations/daily-reports', [OperationController::class, 'storeDailyReport'])->name('operations.daily-reports.store');
    Route::patch('/operations/port-calls/{id}/status', [OperationController::class, 'updateStatus'])->name('operations.port-calls.status');

    // Pengeluaran / Disbursement
    Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');

    // Pengajuan dana operasional, approval Direktur, pencatatan proses eksternal Kopra, pencairan, dan realisasi.
    Route::get('/funding', [FundingWorkflowController::class, 'index'])->name('funding.index');
    Route::post('/funding/requests', [FundingWorkflowController::class, 'store'])->name('funding.requests.store');
    Route::post('/funding/batches', [FundingWorkflowController::class, 'storeBatch'])->name('funding.batches.store');
    Route::post('/funding/expense-requests/{expenseRequest}/admin-review', [FundingWorkflowController::class, 'adminReview'])->name('funding.admin-review');
    Route::post('/funding/expense-requests/{expenseRequest}/director-review', [FundingWorkflowController::class, 'directorReview'])->name('funding.director-review');
    Route::post('/funding/requests/{fundingRequest}/transition', [FundingWorkflowController::class, 'updateFunding'])->name('funding.transition');
    Route::post('/funding/payments/{payment}/transition', [FundingWorkflowController::class, 'updatePayment'])->name('funding.payments.transition');
    Route::get('/funding/documents/{type}/{id}', [FundingWorkflowController::class, 'download'])->name('funding.documents.download');

    // Invoice vendor dibuat dari item pengajuan, diverifikasi, lalu dibayar melalui menu Pengeluaran.
    Route::get('/vendor-invoices', [VendorInvoiceController::class, 'index'])->name('vendor-invoices.index');
    Route::post('/vendor-invoices', [VendorInvoiceController::class, 'store'])->name('vendor-invoices.store');
    Route::post('/vendor-invoices/{costDocument}/verify', [VendorInvoiceController::class, 'verify'])->name('vendor-invoices.verify');
    Route::get('/vendor-invoices/{costDocument}/document', [VendorInvoiceController::class, 'download'])->name('vendor-invoices.document');

    // Nota Rampung Pelindo dan rekonsiliasi biaya per Kunjungan/Job.
    Route::get('/completion-notes', [CompletionNoteController::class, 'index'])->name('completion-notes.index');
    Route::post('/completion-notes', [CompletionNoteController::class, 'store'])->name('completion-notes.store');
    Route::post('/completion-notes/{completionNote}/transition', [CompletionNoteController::class, 'update'])->name('completion-notes.transition');
    Route::get('/completion-notes/{completionNote}/document', [CompletionNoteController::class, 'download'])->name('completion-notes.document');

    // Invoice & Tagihan (Dual Invoices: Keagenan & Reimburse)
    Route::get('/invoices', [InvoiceController::class, 'index'])->name('invoices.index');
    Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
    Route::post('/invoices/{id}/release', [InvoiceController::class, 'release'])->name('invoices.release');
    Route::post('/invoices/{id}/mark-sent', [InvoiceController::class, 'markSent'])->name('invoices.mark-sent');
    Route::get('/invoices/{invoice}/generated-document', [InvoiceController::class, 'generatedDocument'])->name('invoices.documents.generated');
    Route::get('/invoices/{invoice}/documents/{type}', [InvoiceController::class, 'download'])->name('invoices.documents.download');

    // Piutang Klien & Aging
    Route::get('/receivables', [ReceivableController::class, 'index'])->name('receivables.index');
    Route::post('/receivables/receipts', [ReceivableController::class, 'storeReceipt'])->name('receivables.receipts.store');
    Route::get('/receivables/receipts/{clientReceipt}/document', [ReceivableController::class, 'downloadReceipt'])->name('receivables.receipts.document');

    // Laporan Rekonsiliasi & Operasional
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');

    // Master Data 1-8:
    // 1. Kapal (/master/vessels)
    Route::get('/master/vessels', [MasterVesselController::class, 'index'])->name('master.vessels.index');
    Route::post('/master/vessels', [MasterVesselController::class, 'store'])->name('master.vessels.store');
    Route::patch('/master/vessels/{ship}', [MasterVesselController::class, 'update'])->name('master.vessels.update');
    Route::delete('/master/vessels/{ship}', [MasterVesselController::class, 'destroy'])->name('master.vessels.destroy');

    // 2. Perusahaan (/master/companies)
    Route::get('/master/companies', [MasterCompanyController::class, 'index'])->name('master.companies.index');
    Route::post('/master/companies', [MasterCompanyController::class, 'store'])->name('master.companies.store');
    Route::put('/master/companies/{id}', [MasterCompanyController::class, 'update'])->name('master.companies.update');
    Route::delete('/master/companies/{id}', [MasterCompanyController::class, 'destroy'])->name('master.companies.destroy');

    // 3. Role (/master/roles - Owner, Direktur, Admin, Lapangan)
    Route::get('/master/roles', [MasterRoleController::class, 'index'])->name('master.roles.index');

    // 4. User (/master/users - Owner, Direktur, Bu Titik, Pak Prima)
    Route::get('/master/users', [MasterUserController::class, 'index'])->name('master.users.index');
    Route::post('/master/users', [MasterUserController::class, 'store'])->name('master.users.store');
    Route::put('/master/users/{id}', [MasterUserController::class, 'update'])->name('master.users.update');
    Route::delete('/master/users/{id}', [MasterUserController::class, 'destroy'])->name('master.users.destroy');

    // 5. Pelabuhan (/master/ports)
    Route::get('/master/ports', [MasterPortController::class, 'index'])->name('master.ports.index');
    Route::post('/master/ports', [MasterPortController::class, 'store'])->name('master.ports.store');
    Route::put('/master/ports/{id}', [MasterPortController::class, 'update'])->name('master.ports.update');
    Route::delete('/master/ports/{id}', [MasterPortController::class, 'destroy'])->name('master.ports.destroy');

    // 6. Vendor (/master/vendors)
    Route::get('/master/vendors', [MasterVendorController::class, 'index'])->name('master.vendors.index');
    Route::post('/master/vendors', [MasterVendorController::class, 'store'])->name('master.vendors.store');
    Route::put('/master/vendors/{id}', [MasterVendorController::class, 'update'])->name('master.vendors.update');
    Route::delete('/master/vendors/{id}', [MasterVendorController::class, 'destroy'])->name('master.vendors.destroy');

    // 7. Type Layanan (Sandar / Labuh via tautan khusus)
    Route::get('/master/service-types', [ServiceTypeController::class, 'index'])->name('master.service-types.index');
    Route::post('/master/service-types', [ServiceTypeController::class, 'store'])->name('master.service-types.store');
    Route::put('/master/service-types/{id}', [ServiceTypeController::class, 'update'])->name('master.service-types.update');
    Route::delete('/master/service-types/{id}', [ServiceTypeController::class, 'destroy'])->name('master.service-types.destroy');

    // 8. Produk (/master/products - HPP, Harga Sandar/Labuh, Vendor info, Jasa vs Non-Jasa)
    Route::get('/master/products', [MasterProductController::class, 'index'])->name('master.products.index');
    Route::post('/master/products', [MasterProductController::class, 'store'])->name('master.products.store');
    Route::put('/master/products/{id}', [MasterProductController::class, 'update'])->name('master.products.update');
    Route::delete('/master/products/{id}', [MasterProductController::class, 'destroy'])->name('master.products.destroy');
    Route::get('/master/products/lookup', [MasterProductController::class, 'lookupPrice'])->name('master.products.lookup');
    Route::get('/api/products/lookup-price', [MasterProductController::class, 'lookupPrice'])->name('api.products.lookup-price');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // SJA Corporate Maritime Component Library Showcase
    Route::get('/components', fn () => Inertia::render('DesignSystem/Showcase'))->name('components.showcase');
});

require __DIR__.'/auth.php';

Route::redirect('/', 'dashboard');
