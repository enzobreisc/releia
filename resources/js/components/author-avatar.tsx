import { cn } from '@/lib/utils';

const INITIALS_LENGTH = 2;

function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .slice(0, INITIALS_LENGTH)
        .join('')
        .toUpperCase();
}

/** Round author photo, or the initials when there is none. Decorative: the name is always next to it. */
export function AuthorAvatar({
    name,
    photoUrl,
    className,
}: {
    name: string;
    photoUrl: string | null;
    className?: string;
}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-active font-extrabold tracking-tight text-link inset-ring inset-ring-strong',
                className,
            )}
        >
            {photoUrl ? (
                <img
                    src={photoUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                />
            ) : (
                initialsOf(name)
            )}
        </span>
    );
}
