<?php

use App\Models\CompletionNote;
use App\Models\CostDocument;
use App\Models\ExpenseRequest;
use App\Models\User;
use App\Models\WorkOrder;
use Spatie\Permission\Models\Role;

test('owner can monitor business data but cannot mutate operational or financial workflows', function () {
    $owner = User::factory()->create();
    $owner->assignRole(Role::firstOrCreate(['name' => 'Owner', 'guard_name' => 'web']));

    expect($owner->can('viewAny', WorkOrder::class))->toBeTrue()
        ->and($owner->can('create', WorkOrder::class))->toBeFalse()
        ->and($owner->can('create', CompletionNote::class))->toBeFalse()
        ->and($owner->can('create', CostDocument::class))->toBeFalse()
        ->and($owner->can('create', ExpenseRequest::class))->toBeFalse();

    $this->actingAs($owner)->get('/dashboard')->assertOk();
    $this->actingAs($owner)->get('/work-orders')->assertOk();
    $this->actingAs($owner)->get('/vendor-invoices')->assertOk();
    $this->actingAs($owner)->get('/funding')->assertOk();
    $this->actingAs($owner)->get('/invoices')->assertOk();
    $this->actingAs($owner)->get('/receivables')->assertOk();

    $this->actingAs($owner)->post('/work-orders')->assertForbidden();
    $this->actingAs($owner)->post('/completion-notes')->assertForbidden();
    $this->actingAs($owner)->post('/vendor-invoices')->assertForbidden();
    $this->actingAs($owner)->post('/funding/batches')->assertForbidden();
    $this->actingAs($owner)->post('/funding/requests')->assertForbidden();
    $this->actingAs($owner)->post('/expenses')->assertForbidden();
    $this->actingAs($owner)->post('/invoices')->assertForbidden();
    $this->actingAs($owner)->post('/receivables/receipts')->assertForbidden();
    $this->actingAs($owner)->post('/operations/activities')->assertForbidden();
});
