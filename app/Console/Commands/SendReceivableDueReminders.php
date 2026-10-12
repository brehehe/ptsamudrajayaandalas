<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\User;
use App\Notifications\ReceivableDueReminder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('receivables:send-due-reminders')]
#[Description('Kirim pengingat invoice klien yang mendekati tanggal jatuh tempo')]
class SendReceivableDueReminders extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        /** @var list<int> $reminderDays */
        $reminderDays = config('sja.receivable_reminder_days', [2, 1]);
        $recipients = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($query) => $query->whereIn('name', ['Admin', 'Admin Sistem']))
            ->get();
        $sent = 0;

        if ($recipients->isEmpty()) {
            $this->components->warn('Tidak ada Admin aktif untuk menerima pengingat piutang.');

            return self::SUCCESS;
        }

        foreach ($reminderDays as $daysUntilDue) {
            $dueDate = today()->addDays($daysUntilDue)->toDateString();
            $invoices = Invoice::query()
                ->whereDate('due_date', $dueDate)
                ->where('outstanding_amount', '>', 0)
                ->whereIn('status', ['released', 'sent'])
                ->get();

            foreach ($invoices as $invoice) {
                foreach ($recipients as $recipient) {
                    $alreadySent = $recipient->notifications()
                        ->where('type', 'receivable-due-reminder')
                        ->where('data->invoice_id', $invoice->id)
                        ->where('data->reminder_date', today()->toDateString())
                        ->exists();

                    if ($alreadySent) {
                        continue;
                    }

                    $recipient->notify(new ReceivableDueReminder($invoice, $daysUntilDue));
                    $sent++;
                }
            }
        }

        $this->components->info("{$sent} pengingat jatuh tempo dikirim.");

        return self::SUCCESS;
    }
}
