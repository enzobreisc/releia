import type { SVGProps } from 'react';
import { useTranslation } from '@/hooks/use-translation';

export type IconProps = SVGProps<SVGSVGElement>;

/** Line icons, 16 px, 1.5 px stroke. */
function LineIcon({ children, ...props }: IconProps) {
    return (
        <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
            {...props}
        >
            {children}
        </svg>
    );
}

export function HomeIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M2 12.5h12" />
            <path d="M4.5 12.5a3.5 3.5 0 0 1 7 0" />
            <path d="M8 3.5v2M3.6 6.6l1.3 1.1M12.4 6.6l-1.3 1.1" />
        </LineIcon>
    );
}

export function LibraryIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M2 13.5h12" />
            <rect x="3" y="3.5" width="2.5" height="10" />
            <rect x="6.5" y="5.5" width="2.5" height="8" />
            <path d="m10.2 6.2 2.3-.6 2 7.3-2.3.6z" />
        </LineIcon>
    );
}

export function QueueIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <rect x="2.5" y="10.5" width="11" height="3" />
            <rect x="3.5" y="6.75" width="9" height="3" />
            <rect x="2.5" y="3" width="10" height="3" />
        </LineIcon>
    );
}

export function ShoppingIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M3.5 5.5h9l-.8 8H4.3z" />
            <path d="M6 5.5v-1a2 2 0 0 1 4 0v1" />
        </LineIcon>
    );
}

export function ProfileIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <circle cx="8" cy="8" r="6" />
            <circle cx="8" cy="6.8" r="2" />
            <path d="M4.4 12.3c.8-1.5 2-2.2 3.6-2.2s2.8.7 3.6 2.2" />
        </LineIcon>
    );
}

export function StatsIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M2.5 13.5h11" />
            <path d="m3 10.5 3-3 2.5 2 4.5-5" />
        </LineIcon>
    );
}

export function WrappedIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <circle cx="8" cy="6.5" r="3.5" />
            <path d="m6 9.6-1 3.9 3-1.5 3 1.5-1-3.9" />
        </LineIcon>
    );
}

export function SuggestionsIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <circle cx="8" cy="8" r="5.5" />
            <path d="m10.4 5.6-1.5 3.3-3.3 1.5 1.5-3.3z" />
        </LineIcon>
    );
}

export function SearchIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <circle cx="7" cy="7" r="4" />
            <path d="m10 10 3.5 3.5" />
        </LineIcon>
    );
}

export function PlusIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M8 3v10M3 8h10" />
        </LineIcon>
    );
}

export function PencilIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M10.5 2.5l3 3-8 8H2.5v-3z" />
        </LineIcon>
    );
}

export function ClockIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3.5l2 1.5" />
        </LineIcon>
    );
}

/** Drag handle: six filled dots. */
export function GripIcon(props: IconProps) {
    return (
        <svg
            aria-hidden="true"
            width="12"
            height="16"
            viewBox="0 0 12 16"
            fill="currentColor"
            className="shrink-0"
            {...props}
        >
            {[3, 8, 13].flatMap((y) =>
                [3.5, 8.5].map((x) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />
                )),
            )}
        </svg>
    );
}

export function SidebarCollapseIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
            <path d="M6.5 3v10" />
            <path d="M11 6l-2 2 2 2" />
        </LineIcon>
    );
}

export function SidebarExpandIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
            <path d="M6.5 3v10" />
            <path d="M9 6l2 2-2 2" />
        </LineIcon>
    );
}

/** The releia mark: a 3×3 grid in the heat map's blues. */
export function LogoMark({ size = 24 }: { size?: number }) {
    const { t } = useTranslation();
    const cells = [
        ['#17365F', '#1F55A8', '#5B9BFF'],
        ['#1F55A8', '#5B9BFF', '#1F55A8'],
        ['#5B9BFF', '#1F55A8', '#17365F'],
    ];

    return (
        <svg
            role="img"
            aria-label={t('Logo da releia')}
            width={size}
            height={size}
            viewBox="0 0 64 64"
            className="shrink-0"
        >
            {cells.flatMap((row, y) =>
                row.map((fill, x) => (
                    <rect
                        key={`${x}-${y}`}
                        x={7 + x * 18}
                        y={7 + y * 18}
                        width="14"
                        height="14"
                        rx="3"
                        fill={fill}
                    />
                )),
            )}
        </svg>
    );
}

export function AuthorsIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M13.5 2.5C8.5 3 5.5 6.5 4.5 11.5" />
            <path d="M13.5 2.5c-.5 4-3 6.6-7.2 7.6" />
            <path d="M2.5 13.5l2-2" />
        </LineIcon>
    );
}

export function TimelineIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M2 8h12" />
            <circle cx="4" cy="8" r="1.6" />
            <circle cx="8.5" cy="8" r="1.6" />
            <path d="M12.5 5.5v5" />
        </LineIcon>
    );
}

/** Five-point star; pass `fill="currentColor"` for the filled state. */
export function StarIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="m8 1.8 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
        </LineIcon>
    );
}
