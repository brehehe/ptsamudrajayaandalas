<?php

namespace App\Events;

use App\Models\ShipRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShipRequestSubmitted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $requestId;

    public string $requestNumber;

    public string $shipName;

    public string $companyName;

    public int $itemsCount;

    public string $creatorName;

    public string $serviceType;

    public string $submittedAt;

    public function __construct(ShipRequest $shipRequest)
    {
        $this->requestId = $shipRequest->id;
        $this->requestNumber = $shipRequest->request_number;
        $this->shipName = $shipRequest->ship?->name ?? 'Kapal';
        $this->companyName = $shipRequest->company?->name ?? '-';
        $this->itemsCount = $shipRequest->items()->count();
        $this->creatorName = $shipRequest->creator?->name ?? 'Pak Prima (Lapangan)';
        $this->serviceType = $shipRequest->service_type ?? 'Sandar';
        $this->submittedAt = now()->toIso8601String();
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('sja-operations'),
            new Channel('sja-requests'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ship.request.submitted';
    }

    public function broadcastWith(): array
    {
        return [
            'type' => 'request_submitted',
            'title' => "Pengajuan Baru: {$this->requestNumber}",
            'message' => "{$this->creatorName} mengajukan {$this->itemsCount} item untuk {$this->shipName} ({$this->serviceType}).",
            'request_id' => $this->requestId,
            'request_number' => $this->requestNumber,
            'ship_name' => $this->shipName,
            'submitted_at' => $this->submittedAt,
        ];
    }
}
