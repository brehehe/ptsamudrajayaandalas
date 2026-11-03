<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestHistory extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'request_histories';

    protected $fillable = [
        'request_id',
        'user_id',
        'actor_name',
        'actor_role',
        'action',
        'title',
        'notes',
        'submission_date',
        'action_date',
        'items_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'submission_date' => 'date:Y-m-d',
            'action_date' => 'datetime',
            'items_snapshot' => 'array',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(ShipRequest::class, 'request_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
