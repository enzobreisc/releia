import type { QueueItemRow } from '../state/types';
import type { ReadModel } from './read-model';

export function nextInQueue(model: ReadModel): QueueItemRow | null {
    return model.queueItems[0] ?? null;
}

export function queueTotal(model: ReadModel): number {
    return model.queueItems.length;
}
