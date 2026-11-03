import { ImgHTMLAttributes } from 'react';

export default function ApplicationLogo({
    className = '',
    alt = 'PT. Samudra Jaya Andalas',
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/images/sja-logo.png"
            alt={alt}
            className={`object-contain ${className}`}
            {...props}
        />
    );
}
