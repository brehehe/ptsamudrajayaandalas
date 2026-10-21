<?php

use App\Models\ReportExport;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $this->admin = User::factory()->create();
    $this->admin->syncRoles(['Admin']);
});

test('report export status returns relative download url with filename', function () {
    $export = ReportExport::create([
        'user_id' => $this->admin->id,
        'report_type' => 'requests',
        'format' => 'pdf',
        'status' => 'completed',
        'filename' => 'laporan-pengajuan-test.pdf',
        'parameters' => [],
    ]);

    $response = $this->actingAs($this->admin)->getJson(route('reports.exports.status', $export));

    $response->assertOk();
    $data = $response->json();
    expect($data['download_url'])->toEndWith('/download/laporan-pengajuan-test.pdf')
        ->and($data['download_url'])->toStartWith('/reports/exports/');
});

test('downloading an export regenerates on the fly when file is missing from disk', function () {
    $export = ReportExport::create([
        'user_id' => $this->admin->id,
        'report_type' => 'requests',
        'format' => 'pdf',
        'status' => 'completed',
        'filename' => 'laporan-pengajuan-test.pdf',
        'file_path' => 'exports/non-existent-uuid.pdf',
        'parameters' => [
            'from' => now()->startOfMonth()->toDateString(),
            'to' => now()->endOfMonth()->toDateString(),
        ],
    ]);

    // Ensure the fake path does not exist
    Storage::disk('local')->delete('exports/non-existent-uuid.pdf');

    $response = $this->actingAs($this->admin)->get(route('reports.exports.download', [
        'reportExport' => $export,
        'filename' => $export->filename,
    ]));

    // Should NOT return 404, but 200 with application/pdf!
    $response->assertOk();
    $response->assertHeader('content-type', 'application/pdf');
    expect($response->headers->get('content-disposition'))->toContain('attachment;')
        ->and($response->headers->get('content-disposition'))->toContain('.pdf');
});
