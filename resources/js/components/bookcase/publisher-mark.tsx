import type { SpineDevice } from '@/lib/shelf/publisher-identity';

const LINE_COUNTS: Partial<Record<SpineDevice, number>> = {
    double: 2,
    triple: 3,
};

/** Each publisher repeats one mark at the head of all its spines: the family resemblance on the shelf. */
export function PublisherMark({ device }: { device: SpineDevice }) {
    return (
        <span
            aria-hidden
            className="flex h-3 w-full shrink-0 flex-col items-center justify-center gap-0.75"
        >
            {device === 'heavy' && <span className="h-1.5 w-full bg-current" />}
            {device === 'base' && (
                <span className="h-1 w-1/2 rounded-full bg-current" />
            )}
            {device === 'square' && (
                <span className="size-2 rounded-[2px] bg-current" />
            )}
            {device === 'label' && (
                <span className="h-2.5 w-3/5 rounded-full border border-current" />
            )}
            {Array.from({ length: LINE_COUNTS[device] ?? 0 }, (_, index) => (
                <span key={index} className="h-px w-full bg-current" />
            ))}
        </span>
    );
}
