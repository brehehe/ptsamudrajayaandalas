<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateInvoiceDocumentSettingRequest;
use App\Models\InvoiceDocumentSetting;
use App\Support\InvoiceDocumentSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceDocumentSettingController extends Controller
{
    public function __construct(private InvoiceDocumentSettings $invoiceDocumentSettings) {}

    public function index(): Response
    {
        Gate::authorize('viewAny', InvoiceDocumentSetting::class);

        return Inertia::render('Master/InvoiceSettings/Index', [
            'settings' => $this->invoiceDocumentSettings->all(),
            'usesEnvironmentDefaults' => $this->invoiceDocumentSettings->usesEnvironmentDefaults(),
        ]);
    }

    public function update(UpdateInvoiceDocumentSettingRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $setting = InvoiceDocumentSetting::query()
                ->where('setting_key', InvoiceDocumentSetting::DOCUMENT_KEY)
                ->lockForUpdate()
                ->first();

            if ($setting) {
                Gate::authorize('update', $setting);
            } else {
                Gate::authorize('create', InvoiceDocumentSetting::class);
                $setting = new InvoiceDocumentSetting([
                    'setting_key' => InvoiceDocumentSetting::DOCUMENT_KEY,
                ]);
            }

            $setting->fill($request->safe()->only(InvoiceDocumentSettings::FIELDS));
            $changedFields = array_values(array_diff(
                array_keys($setting->getDirty()),
                ['setting_key', 'updated_by', 'updated_at'],
            ));
            $setting->updated_by = $request->user()->id;
            $setting->save();

            activity('invoice-settings')
                ->performedOn($setting)
                ->causedBy($request->user())
                ->withProperties(['changed_fields' => $changedFields])
                ->log('Pengaturan dokumen invoice diperbarui');
        }, attempts: 3);

        return back()->with('success', 'Pengaturan invoice berhasil disimpan dan dipakai untuk dokumen berikutnya.');
    }
}
