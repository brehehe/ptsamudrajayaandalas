import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    ...props
}) => {
    const sizeClasses = {
        sm: 'h-9 px-3 text-xs gap-1.5 rounded-[10px]',
        md: 'h-11 px-4 text-sm gap-2 rounded-[12px]',
        lg: 'h-12 px-6 text-base gap-2.5 rounded-[12px]',
    };

    const variantClasses = {
        primary:
            'bg-[#0060F4] hover:bg-[#0050D0] active:bg-[#082870] dark:bg-[#2563EB] ' +
            'dark:hover:bg-[#1D4ED8] text-white shadow-sm font-medium transition-colors ' +
            'focus:ring-2 focus:ring-[#0060F4]/30',
        secondary:
            'bg-[#E0F0FF] dark:bg-[#152E52] hover:bg-[#D0E6FC] dark:hover:bg-[#1E3D6B] ' +
            'active:bg-[#BCE0FD] text-[#0060F4] dark:text-[#60A5FA] font-medium ' +
            'transition-colors',
        outline:
            'border border-[#DCEAF8] dark:border-[#1E3A5F] hover:border-[#0060F4] ' +
            'dark:hover:border-[#38BDF8] hover:bg-[#F0F8FF] dark:hover:bg-[#132847] ' +
            'text-[#0B1F63] dark:text-[#F1F5F9] font-medium transition-colors bg-white ' +
            'dark:bg-[#0C1D36]',
        ghost:
            'hover:bg-[#E0F0FF]/50 dark:hover:bg-[#152E52]/50 text-[#0B1F63] dark:text-[#F1F5F9] ' +
            'hover:text-[#0060F4] dark:hover:text-[#38BDF8] font-medium transition-colors',
        danger: 'bg-[#C62840] hover:bg-[#B01F35] text-white font-medium shadow-sm transition-colors',
    };

    return (
        <button
            className={`inline-flex items-center justify-center select-none font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <svg
                    className="size-4 animate-spin text-current motion-reduce:animate-none"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d={
                            'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 01' +
                            '4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        }
                    />
                </svg>
            ) : (
                leftIcon
            )}
            {children}
            {!isLoading && rightIcon}
        </button>
    );
};

export default Button;
