import React from 'react';
import Card from '../ui/Card';
import Skeleton from './Skeleton';

export type PageLoadingSkeletonVariant = 'dashboard' | 'list' | 'form' | 'detail';

interface PageLoadingSkeletonProps {
    variant?: PageLoadingSkeletonVariant;
}

function PageHeadingSkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-8 w-3/4 max-w-md rounded-xl" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-full opacity-70" />
        </div>
    );
}

function StatSkeletons() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-3">
                            <Skeleton className="h-3 w-2/3 rounded-full" />
                            <Skeleton className="h-7 w-1/2 rounded-lg opacity-80" />
                        </div>
                        <Skeleton className="size-11 shrink-0 rounded-xl opacity-80" />
                    </div>
                </Card>
            ))}
        </div>
    );
}

function RowsSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="divide-y divide-[#DCEAF8] dark:divide-[#1E3A5F]">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                    <Skeleton className="size-10 shrink-0 rounded-xl opacity-80" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3 rounded-full" />
                        <Skeleton className="h-3 w-2/5 rounded-full opacity-70" />
                    </div>
                    <Skeleton className="h-7 w-16 shrink-0 rounded-full opacity-70" />
                </div>
            ))}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <>
            <StatSkeletons />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Card className="p-4 sm:p-5">
                    <Skeleton className="h-5 w-40 rounded-lg" />
                    <Skeleton className="mt-5 h-64 w-full rounded-xl opacity-60" />
                </Card>
                <Card className="p-4 sm:p-5">
                    <Skeleton className="h-5 w-32 rounded-lg" />
                    <div className="mt-5">
                        <RowsSkeleton rows={4} />
                    </div>
                </Card>
            </div>
        </>
    );
}

function ListSkeleton() {
    return (
        <>
            <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Skeleton className="h-11 flex-1 rounded-xl" />
                    <Skeleton className="h-11 w-full rounded-xl sm:w-44" />
                    <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
                </div>
            </Card>
            <Card className="p-4 sm:p-5">
                <RowsSkeleton />
            </Card>
        </>
    );
}

function FormSkeleton() {
    return (
        <>
            <div className="hidden grid-cols-4 gap-px overflow-hidden rounded-2xl border border-[#DCEAF8] bg-[#DCEAF8] md:grid dark:border-[#1E3A5F] dark:bg-[#1E3A5F]">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white p-4 dark:bg-[#0C1D36]">
                        <Skeleton className="size-9 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-3 w-2/3 rounded-full" />
                            <Skeleton className="h-3 w-full rounded-full opacity-60" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Card className="overflow-hidden">
                    <div className="border-b border-[#DCEAF8] p-5 dark:border-[#1E3A5F]">
                        <Skeleton className="h-5 w-40 rounded-lg" />
                        <Skeleton className="mt-2 h-3 w-2/3 rounded-full opacity-70" />
                    </div>
                    <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="space-y-2">
                                <Skeleton className="h-3 w-24 rounded-full" />
                                <Skeleton className="h-11 w-full rounded-xl opacity-70" />
                            </div>
                        ))}
                    </div>
                </Card>
                <Card className="p-5">
                    <Skeleton className="size-11 rounded-xl" />
                    <Skeleton className="mt-4 h-5 w-2/3 rounded-lg" />
                    <div className="mt-5">
                        <RowsSkeleton rows={4} />
                    </div>
                </Card>
            </div>
        </>
    );
}

function DetailSkeleton() {
    return (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <Skeleton className="size-14 shrink-0 rounded-2xl" />
                        <div className="min-w-0 flex-1 space-y-3">
                            <Skeleton className="h-5 w-1/2 rounded-lg" />
                            <Skeleton className="h-3 w-3/4 rounded-full opacity-70" />
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <RowsSkeleton />
                </Card>
            </div>
            <Card className="p-5">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <div className="mt-5">
                    <RowsSkeleton rows={4} />
                </div>
            </Card>
        </div>
    );
}

export default function PageLoadingSkeleton({ variant = 'list' }: PageLoadingSkeletonProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Memuat halaman"
            className="mx-auto w-full max-w-7xl space-y-5 py-1"
        >
            <span className="sr-only">Memuat halaman…</span>
            <PageHeadingSkeleton />
            {variant === 'dashboard' && <DashboardSkeleton />}
            {variant === 'list' && <ListSkeleton />}
            {variant === 'form' && <FormSkeleton />}
            {variant === 'detail' && <DetailSkeleton />}
        </div>
    );
}
