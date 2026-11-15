import { SVGAttributes } from 'react';

/** A simple clock mark. */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 2.5" />
            <path d="M10 2h4" />
        </svg>
    );
}
