const SEED = 5381;
const MULTIPLIER = 33;

export function hash(text: string): number {
    let value = SEED;

    for (const char of text) {
        value = (value * MULTIPLIER + char.charCodeAt(0)) >>> 0;
    }

    return value;
}
