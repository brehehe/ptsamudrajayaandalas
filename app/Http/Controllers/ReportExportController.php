<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateReportExportJob;
use App\Models\ReportExport;
use App\Support\ReportExportManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportExportController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        abort_unless($this->canExport($request), 403, 'Anda tidak memiliki hak akses untuk mengekspor laporan.');

        $validated = $request->validate([
            'report_type' => [
                'required',
                'string',
                Rule::in([
                    'vessel_daily_expenses',
                    'vessel_summary',
                    'margin',
                    'invoices',
                    'receivables',
                    'expenses',
                    'activities',
                    'requests',
                ]),
            ],
            'format' => ['required', 'string', Rule::in(['pdf', 'xlsx'])],
            'parameters' => ['nullable', 'array'],
            'job_number' => ['nullable', 'string', 'max:100'],
        ]);

        $reportExport = ReportExport::create([
            'user_id' => $request->user()?->id,
            'report_type' => $validated['report_type'],
            'format' => $validated['format'],
            'status' => 'pending',
            'filename' => 'menyiapkan-laporan.'.$validated['format'],
            'parameters' => $validated['parameters'] ?? [],
            'job_number' => $validated['job_number'] ?? null,
        ]);

        // Dispatch to background queue
        GenerateReportExportJob::dispatch($reportExport->id);

        return response()->json([
            'id' => $reportExport->id,
            'status' => 'pending',
            'message' => 'Laporan dimasukkan ke antrean ekspor.',
        ], 202);
    }

    public function status(ReportExport $reportExport): JsonResponse
    {
        // Fallback for local development or delayed workers:
        // if still pending after 1 second, run inline so the user is never stuck
        if ($reportExport->status === 'pending' && $reportExport->created_at->diffInSeconds(now()) >= 1) {
            try {
                dispatch_sync(new GenerateReportExportJob($reportExport->id));
                $reportExport->refresh();
            } catch (\Throwable $e) {
                // Handled in job
            }
        }

        $downloadUrl = null;
        if ($reportExport->isCompleted()) {
            $downloadUrl = route('reports.exports.download', [
                'reportExport' => $reportExport,
                'filename' => $reportExport->filename,
            ], false);
        }

        return response()->json([
            'id' => $reportExport->id,
            'status' => $reportExport->status,
            'filename' => $reportExport->filename,
            'download_url' => $downloadUrl,
            'error' => $reportExport->error_message,
        ]);
    }

    public function download(ReportExport $reportExport, ?string $filename = null): BinaryFileResponse
    {
        $storage = Storage::disk('local');
        $needsGeneration = ! $reportExport->file_path || ! $storage->exists($reportExport->file_path);

        if ($needsGeneration) {
            try {
                $manager = app(ReportExportManager::class);
                $result = $manager->generate(
                    $reportExport->report_type,
                    $reportExport->format,
                    $reportExport->parameters ?? [],
                    $reportExport->job_number
                );

                $reportExport->update([
                    'status' => 'completed',
                    'filename' => $result['filename'],
                    'file_path' => $result['file_path'],
                    'completed_at' => now(),
                ]);
                $reportExport->refresh();
            } catch (\Throwable $e) {
                abort(500, 'Gagal membuat berkas laporan: '.$e->getMessage());
            }
        }

        $fullPath = $storage->path($reportExport->file_path);
        $downloadFilename = $reportExport->filename ?: ($filename ?: "laporan-{$reportExport->report_type}.{$reportExport->format}");

        $mime = $reportExport->format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        return response()->download($fullPath, $downloadFilename, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'attachment; filename="'.$downloadFilename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
        ]);
    }

    private function canExport(Request $request): bool
    {
        return ($request->user()?->can('reports.export') ?? false)
            || ($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']) ?? false);
    }
}
