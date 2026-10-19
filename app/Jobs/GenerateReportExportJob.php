<?php

namespace App\Jobs;

use App\Models\ReportExport;
use App\Support\ReportExportManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class GenerateReportExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 180;

    public int $tries = 3;

    public function __construct(public string $exportId) {}

    public function handle(ReportExportManager $manager): void
    {
        $export = ReportExport::query()->find($this->exportId);
        if (! $export || $export->status === 'completed') {
            return;
        }

        $export->update(['status' => 'processing']);

        try {
            $result = $manager->generate(
                $export->report_type,
                $export->format,
                $export->parameters ?? [],
                $export->job_number
            );

            $export->update([
                'status' => 'completed',
                'filename' => $result['filename'],
                'file_path' => $result['file_path'],
                'completed_at' => now(),
            ]);
        } catch (Throwable $e) {
            $export->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
