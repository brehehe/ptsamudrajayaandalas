<?php

return [
    'receivable_reminder_days' => array_values(array_filter(
        array_map('intval', explode(',', (string) env('SJA_RECEIVABLE_REMINDER_DAYS', '2,1'))),
        fn (int $day): bool => $day >= 0,
    )),
    'receivable_reminder_time' => env('SJA_RECEIVABLE_REMINDER_TIME', '08:00'),
];
