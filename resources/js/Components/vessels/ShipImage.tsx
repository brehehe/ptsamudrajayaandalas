import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { Ship } from 'lucide-react';

interface ShipImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
    placeholderIconClassName?: string;
}

export default function ShipImage({
    src,
    alt = '',
    className = '',
    placeholderIconClassName = 'size-7',
    onError,
    ...imageProps
}: ShipImageProps) {
    const [hasLoadError, setHasLoadError] = useState(false);

    useEffect(() => {
        setHasLoadError(false);
    }, [src]);

    if (src && !hasLoadError) {
        return (
            <img
                src={src}
                alt={alt}
                className={className}
                onError={(event) => {
                    setHasLoadError(true);
                    onError?.(event);
                }}
                {...imageProps}
            />
        );
    }

    return (
        <span
            className={`flex items-center justify-center bg-[#E0F0FF] text-[#0060F4] dark:bg-[#132847] dark:text-[#60A5FA] ${className}`}
            role={alt ? 'img' : undefined}
            aria-label={alt ? `${alt} — foto belum tersedia` : undefined}
            aria-hidden={alt ? undefined : true}
        >
            <Ship aria-hidden="true" className={placeholderIconClassName} />
        </span>
    );
}
