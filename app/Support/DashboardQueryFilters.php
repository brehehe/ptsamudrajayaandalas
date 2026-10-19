<?php

namespace App\Support;

use App\Http\Requests\DashboardIndexRequest;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardQueryFilters
{
    public function __construct(
        public readonly ?string $search = null,
        public readonly ?string $shipId = null,
        public readonly ?string $companyId = null,
        public readonly ?string $portId = null,
        public readonly ?string $period = null,
        public readonly ?string $startDateStr = null,
        public readonly ?string $endDateStr = null,
        public readonly ?Carbon $startDate = null,
        public readonly ?Carbon $endDate = null,
    ) {}

    public static function fromRequest(DashboardIndexRequest|Request $request): self
    {
        $validated = $request instanceof DashboardIndexRequest
            ? $request->validated()
            : $request->validate([
                'search' => ['nullable', 'string', 'max:100'],
                'ship_id' => ['nullable', 'uuid'],
                'company_id' => ['nullable', 'uuid'],
                'port_id' => ['nullable', 'uuid'],
                'period' => ['nullable', 'string', 'in:semua,hari_ini,7_hari,bulan_ini,custom'],
                'start_date' => ['nullable', 'date_format:Y-m-d'],
                'end_date' => ['nullable', 'date_format:Y-m-d'],
            ]);

        $period = $validated['period'] ?? null;
        $startDateStr = $validated['start_date'] ?? null;
        $endDateStr = $validated['end_date'] ?? null;

        $startDate = null;
        $endDate = null;

        if ($period === 'hari_ini') {
            $startDate = today()->startOfDay();
            $endDate = today()->endOfDay();
        } elseif ($period === '7_hari') {
            $startDate = today()->subDays(6)->startOfDay();
            $endDate = today()->endOfDay();
        } elseif ($period === 'bulan_ini') {
            $startDate = today()->startOfMonth()->startOfDay();
            $endDate = today()->endOfMonth()->endOfDay();
        } elseif ($period === 'custom' || ($startDateStr && $endDateStr)) {
            $startDate = $startDateStr ? Carbon::parse($startDateStr)->startOfDay() : null;
            $endDate = $endDateStr ? Carbon::parse($endDateStr)->endOfDay() : null;
        }

        return new self(
            search: $validated['search'] ?? null,
            shipId: $validated['ship_id'] ?? null,
            companyId: $validated['company_id'] ?? null,
            portId: $validated['port_id'] ?? null,
            period: $period,
            startDateStr: $startDateStr,
            endDateStr: $endDateStr,
            startDate: $startDate,
            endDate: $endDate,
        );
    }

    public function applyToPortCalls(Builder $query): Builder
    {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        if ($this->shipId) {
            $query->where('ship_id', $this->shipId);
        }
        if ($this->companyId) {
            $query->whereHas('ship', fn ($q) => $q->where('ship_company_id', $this->companyId));
        }
        if ($this->portId) {
            $query->where('port_id', $this->portId);
        }
        if ($this->search) {
            $query->where(function ($q) use ($like) {
                $q->where('job_number', $like, "%{$this->search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', $like, "%{$this->search}%"));
            });
        }
        if ($this->startDate && $this->endDate && $this->period !== 'semua') {
            $query->where(function ($q) {
                $q->whereBetween('eta_at', [$this->startDate, $this->endDate])
                    ->orWhereBetween('berthed_at', [$this->startDate, $this->endDate]);
            });
        }

        return $query;
    }

    public function applyToRequests(Builder $query): Builder
    {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        if ($this->shipId) {
            $query->where('ship_id', $this->shipId);
        }
        if ($this->companyId) {
            $query->where(function ($q) {
                $q->where('company_id', $this->companyId)
                    ->orWhereHas('ship', fn ($sq) => $sq->where('ship_company_id', $this->companyId));
            });
        }
        if ($this->portId) {
            $query->where('port_id', $this->portId);
        }
        if ($this->search) {
            $query->where(function ($q) use ($like) {
                $q->where('request_number', $like, "%{$this->search}%")
                    ->orWhere('notes', $like, "%{$this->search}%")
                    ->orWhereHas('ship', fn ($sq) => $sq->where('name', $like, "%{$this->search}%"));
            });
        }
        if ($this->startDate && $this->endDate && $this->period !== 'semua') {
            $query->whereBetween('request_date', [$this->startDate, $this->endDate]);
        }

        return $query;
    }

    public function applyToInvoices(Builder $query): Builder
    {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        if ($this->companyId) {
            $query->where('company_id', $this->companyId);
        }
        if ($this->shipId) {
            $query->where(function ($q) {
                $q->whereHas('portCall', fn ($pq) => $pq->where('ship_id', $this->shipId))
                    ->orWhereHas('request', fn ($rq) => $rq->where('ship_id', $this->shipId));
            });
        }
        if ($this->search) {
            $query->where(function ($q) use ($like) {
                $q->where('invoice_number', $like, "%{$this->search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', $like, "%{$this->search}%"));
            });
        }
        if ($this->startDate && $this->endDate && $this->period !== 'semua') {
            $query->whereBetween('invoice_date', [$this->startDate, $this->endDate]);
        }

        return $query;
    }

    /**
     * @return array<string, string>
     */
    public function toFilterProps(): array
    {
        return [
            'search' => $this->search ?? '',
            'ship_id' => $this->shipId ?? '',
            'company_id' => $this->companyId ?? '',
            'port_id' => $this->portId ?? '',
            'period' => $this->period ?? 'semua',
            'start_date' => $this->startDateStr ?? '',
            'end_date' => $this->endDateStr ?? '',
        ];
    }
}
