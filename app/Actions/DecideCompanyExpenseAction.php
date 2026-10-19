<?php

namespace App\Actions;

use App\Models\ExpenseRequest;
use App\Models\User;
use App\Support\WorkflowNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DecideCompanyExpenseAction
{
    public function __construct(
        private readonly WorkflowNotifier $workflowNotifier
    ) {}

    /**
     * @throws ValidationException
     */
    public function execute(
        User $user,
        ExpenseRequest $expenseRequest,
        string $decision,
        ?string $notes = null,
        ?string $source = null
    ): ExpenseRequest {
        $decidedExpense = DB::transaction(function () use ($user, $expenseRequest, $decision, $notes, $source): ExpenseRequest {
            /** @var ExpenseRequest $lockedExpense */
            $lockedExpense = ExpenseRequest::query()->lockForUpdate()->findOrFail($expenseRequest->id);

            if ($lockedExpense->scope !== 'company' || $lockedExpense->status !== 'waiting_director') {
                throw ValidationException::withMessages([
                    'decision' => 'Pengajuan ini sudah diputuskan atau tidak lagi tersedia.',
                ]);
            }

            $lockedExpense->update([
                'status' => $decision === 'approve' ? 'approved' : 'rejected',
                'notes' => $notes ?? $lockedExpense->notes,
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
            ]);

            $logMessage = match ($decision) {
                'approve' => $source === 'approval'
                    ? 'Biaya nonkapal disetujui Direktur dari menu Approval'
                    : 'Biaya nonkapal disetujui Direktur',
                default => $source === 'approval'
                    ? 'Biaya nonkapal ditolak Direktur dari menu Approval'
                    : 'Biaya nonkapal ditolak Direktur',
            };

            activity('company-expense')
                ->performedOn($lockedExpense)
                ->causedBy($user)
                ->withProperties([
                    'decision' => $decision,
                    'notes' => $notes,
                ])
                ->log($logMessage);

            return $lockedExpense;
        }, attempts: 3);

        $this->workflowNotifier->notifyCompanyExpenseDecision($decidedExpense, $user);

        return $decidedExpense;
    }
}
