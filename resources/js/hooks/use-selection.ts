import { useState } from 'react';

/** A set of selected ids, toggled one by one or added in batches. */
export function useSelection() {
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
        () => new Set(),
    );

    function toggle(id: number) {
        const next = new Set(selectedIds);

        if (!next.delete(id)) {
            next.add(id);
        }

        setSelectedIds(next);
    }

    function select(ids: number[]) {
        setSelectedIds(new Set([...selectedIds, ...ids]));
    }

    function clear() {
        setSelectedIds(new Set());
    }

    return {
        isSelected: (id: number) => selectedIds.has(id),
        toggle,
        select,
        clear,
    };
}
