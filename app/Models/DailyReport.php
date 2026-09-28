<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DailyReport extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'daily_reports';

    protected $fillable = [
        'port_call_id',
        'officer_id',
        'report_date',
        'status',
        'no_activity',
        'summary',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'no_activity' => 'boolean',
            'submitted_at' => 'datetime',
        ];
    }

    public function portCall(): BelongsTo
    {
        return $this->belongsTo(PortCall::class, 'port_call_id');
    }

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }
}
