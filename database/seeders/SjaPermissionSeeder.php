<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class SjaPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $rolePermissions = [
            'Owner' => [
                'dashboard.view', 'work-orders.view', 'ships.view', 'requests.view',
                'port-calls.view', 'daily-reports.view-all', 'expense-requests.view',
                'funding.view', 'outgoing-payments.view', 'invoices.view',
                'receivables.view', 'reports.view', 'reports.export', 'users.view',
                'users.create', 'users.update', 'users.delete', 'roles.view',
                'activity-logs.view', 'settings.manage', 'attachments.download',
            ],
            'Admin' => [
                'dashboard.view', 'work-orders.view', 'work-orders.create', 'work-orders.update',
                'ships.view', 'ships.manage', 'requests.view', 'requests.create', 'requests.update',
                'port-calls.view', 'port-calls.manage', 'daily-reports.view-all',
                'expense-requests.view', 'expense-requests.create', 'expense-requests.review',
                'funding.view', 'funding.manage', 'outgoing-payments.view', 'outgoing-payments.manage',
                'invoices.view', 'invoices.create', 'invoices.update', 'invoices.release',
                'receivables.view', 'reports.view', 'users.view', 'users.create',
                'users.update', 'users.delete', 'roles.view', 'masters.view',
                'masters.manage', 'attachments.download',
            ],
            'Direktur' => [
                'dashboard.view', 'work-orders.view', 'ships.view', 'requests.view',
                'port-calls.view', 'daily-reports.view-all', 'expense-requests.view',
                'expense-requests.approve', 'funding.view', 'funding.approve-kopra',
                'outgoing-payments.view', 'invoices.view', 'receivables.view',
                'reports.view', 'users.view', 'users.create', 'users.update',
                'users.delete', 'attachments.download',
            ],
            'Lapangan' => [
                'dashboard.view', 'work-orders.view', 'work-orders.create', 'work-orders.update-assigned',
                'ships.view', 'requests.view', 'requests.create', 'requests.update',
                'port-calls.view', 'port-calls.manage', 'daily-reports.view',
                'daily-reports.create', 'daily-reports.update', 'expense-requests.view-own',
                'expense-requests.create', 'funding.view-own', 'outgoing-payments.realize',
                'attachments.download',
            ],
        ];

        foreach ($rolePermissions as $roleName => $permissionNames) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $permissions = collect($permissionNames)->map(
                fn (string $permissionName) => Permission::firstOrCreate([
                    'name' => $permissionName,
                    'guard_name' => 'web',
                ]),
            );
            $role->syncPermissions($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
