import type { DemoState } from '../state/types';
import type { ReadModel } from './read-model';

function parseStoredValue(text: string | null): unknown {
    if (text === null) {
        return null;
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
}

/** Setting::get: the decoded JSON value, or null when the setting is absent. */
export function readSetting(model: ReadModel, key: string): unknown {
    const row = model.state.tables.settings.find(
        (setting) => setting.key === key,
    );

    return parseStoredValue(row?.value ?? null);
}

export function readIntegerSetting(
    model: ReadModel,
    key: string,
): number | null {
    const value = readSetting(model, key);

    return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/** Setting::put: replaces the row for the key, or adds it. */
export function writeSetting(
    state: DemoState,
    key: string,
    value: unknown,
    day: string,
): void {
    const stamp = `${day} 00:00:00`;
    const row = {
        key,
        value: JSON.stringify(value),
        created_at: stamp,
        updated_at: stamp,
    };
    const settings = state.tables.settings;
    const index = settings.findIndex((setting) => setting.key === key);

    if (index === -1) {
        settings.push(row);

        return;
    }

    settings[index] = {
        ...row,
        created_at: settings[index]?.created_at ?? stamp,
    };
}
