<?php

namespace App\Events;

use App\Models\ShipRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DirectorApprovalCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $requestId;

    public string $requestNumber;

    public string $shipName;

    public string $status;

    public int $approvedItemsCount;

    public int $rejectedItemsCount;

    public ?string $directorNotes;

    public string $reviewedAt;

    public function __construct(ShipRequest $shipRequest, ?string $directorNotes = null)
    {
        $this->requestId = $shipRequest->id;
        $this->requestNumber = $shipRequest->request_number;
        $this->shipName = $shipRequest->ship?->name ?? 'Kapal';
        $this->status = $shipRequest->status;
        $this->approvedItemsCount = $shipRequest->items()->where('director_status', 'approved')->count();
        $this->rejectedItemsCount = $shipRequest->items()->where('director_status', 'rejected')->count();
        $this->directorNotes = $directorNotes;
        $this->reviewedAt = now()->toIso8601String();
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('sja-operations'),
            new Channel('sja-approvals'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'director.approval.completed';
    }

    public function broadcastWith(): array
    {
        return [
            'type' => 'director_approval',
            'title' => "Approval Direktur: {$this->requestNumber}",
            'message' => "Pak Ryan (Direktur) telah meninjau pengajuan {$this->requestNumber} untuk {$this->shipName} ({$this->approvedItemsCount} disetujui, {$this->rejectedItemsCount} ditolak).",
            'status' => $this->status,
            'request_id' => $this->requestId,
            'request_number' => $this->requestNumber,
            'ship_name' => $this->shipName,
            'approved_items_count' => $this->approvedItemsCount,
            'rejected_items_count' => $this->rejectedItemsCount,
            'reviewed_at' => $this->reviewedAt,
        ];
    }
}
