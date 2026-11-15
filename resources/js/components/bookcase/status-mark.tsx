const MARK_CLASSES: Record<string, string> = {
    reading: 'size-1.5 rounded-full bg-accent',
    want_to_read: 'size-1.5 rounded-full border border-current',
    abandoned: 'h-0.5 w-2 bg-current',
};

/** Blue dot: reading. Ring: want to read. Dash: abandoned. Read books carry none. */
export function StatusMark({ status }: { status: string | null }) {
    const markClass = status === null ? undefined : MARK_CLASSES[status];

    return (
        <span aria-hidden className="flex h-1.5 shrink-0 items-center">
            {markClass && <span className={markClass} />}
        </span>
    );
}
