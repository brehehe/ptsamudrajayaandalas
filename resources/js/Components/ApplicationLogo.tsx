import { SVGAttributes } from 'react';

export default function ApplicationLogo(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Golden Sun / Horizon ring */}
            <circle
                cx="22"
                cy="18"
                r="10"
                stroke="#F5A623"
                strokeWidth="2"
                strokeDasharray="3 2"
                fill="#FFF9E6"
            />
            <circle cx="22" cy="18" r="5" fill="#F5A623" />

            {/* Ocean waves / Chevron maritime hull */}
            <path d="M6 26L22 17L38 26L22 34L6 26Z" fill="#0060F4" />
            <path d="M10 30L22 23L34 30L22 37L10 30Z" fill="#19B5F7" />
            <path d="M14 34L22 29L30 34L22 40L14 34Z" fill="#082870" />
        </svg>
    );
}
