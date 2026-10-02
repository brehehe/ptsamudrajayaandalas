import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    animated?: boolean;
}

export default function Skeleton({ animated = true, className = '', ...props }: SkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={`bg-[#DCEAF8] dark:bg-[#1E3A5F] ${animated ? 'animate-pulse motion-reduce:animate-none' : ''} ${className}`}
            {...props}
        />
    );
}
