<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkOrder extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'work_orders';

    protected $fillable = [
        'system_number',
        'client_number',
        'company_id',
        'document_date',
        'received_at',
        'source',
        'status',
        'revision_reason',
        'document_path',
        'client_pic_name',
        'client_pic_contact',
        'created_by',
        'assigned_to',
        'reviewed_by',
        'submitted_at',
        'reviewed_at',
        'planned_ship_id',
        'planned_port_id',
        'planned_eta_at',
        'planned_etd_at',
    ];

    protected function casts(): array
    {
        return [
            'document_date' => 'date',
            'received_at' => 'datetime',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'planned_eta_at' => 'datetime',
            'planned_etd_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(ShipCompany::class, 'company_id');
    }

    public function ship(): BelongsTo
    {
        return $this->belongsTo(Ship::class, 'planned_ship_id');
    }

    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'planned_port_id');
    }

    public function portCall(): HasOne
    {
        return $this->hasOne(PortCall::class, 'work_order_id');
    }
}
