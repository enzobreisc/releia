import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

/** Ícones de linha, 16 px, traço de 1,5 px (identidade, seção 8). */
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
            <path d="M2 7.5 8 2.5l6 5" />
            <path d="M3.5 6.5v7h3.5v-3.5h2v3.5h3.5v-7" />
        </LineIcon>
    );
}

export function LibraryIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M2 3.5h4a2 2 0 0 1 2 2V13a1.5 1.5 0 0 0-1.5-1.5H2z" />
            <path d="M14 3.5h-4a2 2 0 0 0-2 2V13a1.5 1.5 0 0 1 1.5-1.5H14z" />
        </LineIcon>
    );
}

export function NotesIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M3.5 2h6l3 3v9h-9z" />
            <path d="M9.5 2v3h3" />
            <path d="M5.5 8.5h5M5.5 11h5" />
        </LineIcon>
    );
}

export function QueueIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="m2.5 4.2 1.2 1.2 2-2.4" />
            <path d="m2.5 10.2 1.2 1.2 2-2.4" />
            <path d="M8 4.5h5.5M8 10.5h5.5" />
        </LineIcon>
    );
}

export function CartIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M1.5 2.5h2l1.6 7.2h6.6l1.3-5H4.2" />
            <circle cx="6" cy="12.8" r="0.9" />
            <circle cx="10.8" cy="12.8" r="0.9" />
        </LineIcon>
    );
}

export function ProfileIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <circle cx="8" cy="5.5" r="2.5" />
            <path d="M3 13.5c.5-2.5 2.5-3.8 5-3.8s4.5 1.3 5 3.8" />
        </LineIcon>
    );
}

export function StatsIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M2.5 13.5h11" />
            <path d="M4.5 11V8M8 11V3.5M11.5 11V6" />
        </LineIcon>
    );
}

export function WrappedIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
            <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
            <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
            <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
        </LineIcon>
    );
}

export function SparkleIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <path d="M8 2.5 9.4 6.6 13.5 8 9.4 9.4 8 13.5 6.6 9.4 2.5 8 6.6 6.6z" />
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

/** Alça de arrastar: seis pontos, preenchidos. */
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

export function SidebarIcon(props: IconProps) {
    return (
        <LineIcon {...props}>
            <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
            <path d="M6.5 3v10" />
        </LineIcon>
    );
}

/** Símbolo da releia: grade 3×3 em tons de azul do mapa de calor. */
export function LogoMark({ size = 24 }: { size?: number }) {
    const cells = [
        ['#17365F', '#1F55A8', '#5B9BFF'],
        ['#1F55A8', '#5B9BFF', '#1F55A8'],
        ['#5B9BFF', '#1F55A8', '#17365F'],
    ];

    return (
        <svg
            role="img"
            aria-label="Logo da releia"
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
            <path d="M13 2.5c-4 .5-7 3-8.5 7L3 13.5l4-1.5c3-1 5.500-3.500 6-9.500z" />
            <path d="M4 12.500 9 7.500" />
        </LineIcon>
    );
}
