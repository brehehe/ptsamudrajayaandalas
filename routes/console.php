<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('receivables:send-due-reminders')
    ->dailyAt(config('sja.receivable_reminder_time', '08:00'))
    ->withoutOverlapping()
    ->onOneServer();
