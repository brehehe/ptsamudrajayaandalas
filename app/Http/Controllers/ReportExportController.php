<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateReportExportJob;
use App\Models\ReportExport;
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

        return response()->json([
            'id' => $reportExport->id,
            'status' => $reportExport->status,
            'filename' => $reportExport->filename,
            'download_url' => $reportExport->isCompleted() ? route('reports.exports.download', $reportExport) : null,
            'error' => $reportExport->error_message,
        ]);
    }

    public function download(ReportExport $reportExport): BinaryFileResponse
    {
        abort_unless($reportExport->isCompleted(), 400, 'Dokumen belum selesai diproses.');
        abort_unless($reportExport->file_path && Storage::disk('local')->exists($reportExport->file_path), 404, 'Berkas ekspor tidak ditemukan.');

        $mime = $reportExport->format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        $fullPath = Storage::disk('local')->path($reportExport->file_path);

        return response()->download($fullPath, $reportExport->filename, [
            'Content-Type' => $mime,
            'Cache-Control' => 'max-age=0, no-store, private',
        ]);
    }

    private function canExport(Request $request): bool
    {
        return ($request->user()?->can('reports.export') ?? false)
            || ($request->user()?->hasAnyRole(['Owner', 'Direktur', 'Admin', 'Admin Sistem']) ?? false);
    }
}
