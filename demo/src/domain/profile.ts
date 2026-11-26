import { readSetting } from './settings';
import type { ReadModel } from './read-model';

const READER_SETTING = 'reader';

/** ProfileService::reader()['name']: null until a name is saved. */
export function readerName(model: ReadModel): string | null {
    const reader = readSetting(model, READER_SETTING);

    if (typeof reader !== 'object' || reader === null) {
        return null;
    }

    const name = (reader as Record<string, unknown>).name;

    return typeof name === 'string' ? name : null;
}
