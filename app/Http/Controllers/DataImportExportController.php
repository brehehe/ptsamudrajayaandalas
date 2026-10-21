<?php

namespace App\Http\Controllers;

use App\Services\DataImportExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DataImportExportController extends Controller
{
    public function __construct(
        protected DataImportExportService $importExportService
    ) {}

    /**
     * Download Excel template with 1-2 realistic sample rows.
     */
    public function template(string $resource): BinaryFileResponse
    {
        return $this->importExportService->downloadTemplate($resource);
    }

    /**
     * Export existing database records to Excel.
     */
    public function export(string $resource): BinaryFileResponse
    {
        return $this->importExportService->export($resource);
    }

    /**
     * Import records from an uploaded Excel or CSV file.
     */
    public function import(Request $request, string $resource): JsonResponse|RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv,txt,xls', 'max:20480'],
        ]);

        $file = $request->file('file');
        $user = $request->user();

        $result = $this->importExportService->import($resource, $file, $user);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json($result, $result['success'] ? 200 : 422);
        }

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }

        return back()->with('error', $result['message'])->withErrors(['import' => $result['errors']]);
    }
}
