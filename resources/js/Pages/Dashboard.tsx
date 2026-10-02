import React, { useEffect, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';
import RoleDashboardView, { type RoleDashboardData } from './Dashboard/RoleDashboardView';
import { type PageProps } from '@/types';

interface DashboardProps {
    kpi: any;
    latest_requests?: any[];
    needs_today?: any[];
    attention_ships?: any[];
    recent_activities?: any[];
    pending_approvals?: any[];
    financial_overview?: any;
    role_dashboard: RoleDashboardData;
}

export default function Dashboard({
    kpi,
    latest_requests = [],
    needs_today = [],
    attention_ships = [],
    recent_activities = [],
    pending_approvals = [],
    financial_overview,
    role_dashboard,
}: DashboardProps) {
    const { auth } = usePage<PageProps>().props;
    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);

        return () => window.clearInterval(timer);
    }, []);

    const liveDate = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(currentTime);
    const liveTime = `${new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(currentTime)} WIB`;
    const pendingRequestsCount = Number(kpi?.requests_by_status?.menunggu ?? 0);
    const pendingApprovalsCount = pending_approvals.length;

    return (
        <AppLayout
            title="Dashboard"
            pendingRequestsCount={pendingRequestsCount}
            pendingApprovalsCount={pendingApprovalsCount}
        >
            <Head title={`${role_dashboard.eyebrow} Dashboard — PT Samudra Jaya Andalas`} />

            <RoleDashboardView
                dashboard={role_dashboard}
                userName={auth?.user?.name || 'Pengguna'}
                liveDate={liveDate}
                liveTime={liveTime}
                latestRequests={latest_requests}
                needsToday={needs_today}
                activeShips={attention_ships}
                recentActivities={recent_activities}
                pendingApprovals={pending_approvals}
                financialOverview={financial_overview}
            />
        </AppLayout>
    );
}
