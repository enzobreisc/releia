const BLOCK_BYTES = 64;
const WORDS_PER_BLOCK = 16;
const SCHEDULE_LENGTH = 80;
const LENGTH_FIELD_BYTES = 8;
const BYTE_BITS = 8;
const WORD_BITS = 32;
const UINT32 = 2 ** WORD_BITS;
const INITIAL_STATE = [
    0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0,
];

const ROUND_CONSTANTS = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];

function rotateLeft(value: number, bits: number): number {
    return ((value << bits) | (value >>> (WORD_BITS - bits))) >>> 0;
}

function padMessage(bytes: Uint8Array): DataView {
    const bitLength = bytes.length * BYTE_BITS;
    const paddedLength =
        Math.ceil((bytes.length + 1 + LENGTH_FIELD_BYTES) / BLOCK_BYTES) *
        BLOCK_BYTES;
    const padded = new Uint8Array(paddedLength);
    const view = new DataView(padded.buffer);

    padded.set(bytes);
    padded[bytes.length] = 0x80;
    view.setUint32(
        paddedLength - LENGTH_FIELD_BYTES,
        Math.floor(bitLength / UINT32),
    );
    view.setUint32(paddedLength - 4, bitLength >>> 0);

    return view;
}

function roundOperation(
    round: number,
    b: number,
    c: number,
    d: number,
): number {
    switch (round) {
        case 0:
            return (b & c) | (~b & d);
        case 2:
            return (b & c) | (b & d) | (c & d);
        default:
            return b ^ c ^ d;
    }
}

function compressBlock(view: DataView, offset: number, state: number[]): void {
    const schedule: number[] = [];

    for (let index = 0; index < WORDS_PER_BLOCK; index++) {
        schedule.push(view.getUint32(offset + index * 4));
    }

    for (let index = WORDS_PER_BLOCK; index < SCHEDULE_LENGTH; index++) {
        const mixed =
            (schedule[index - 3] ?? 0) ^
            (schedule[index - 8] ?? 0) ^
            (schedule[index - 14] ?? 0) ^
            (schedule[index - 16] ?? 0);
        schedule.push(rotateLeft(mixed, 1));
    }

    let [a, b, c, d, e] = state as [number, number, number, number, number];

    for (let index = 0; index < SCHEDULE_LENGTH; index++) {
        const round = Math.floor(index / 20);
        const constant = ROUND_CONSTANTS[round] ?? 0;
        const temp =
            (rotateLeft(a, 5) +
                roundOperation(round, b, c, d) +
                e +
                constant +
                (schedule[index] ?? 0)) >>>
            0;
        e = d;
        d = c;
        c = rotateLeft(b, 30);
        b = a;
        a = temp;
    }

    [a, b, c, d, e].forEach((value, position) => {
        state[position] = ((state[position] ?? 0) + value) >>> 0;
    });
}

/** Same digest as PHP's sha1() in hex, so labels derived from ids match the app. */
export function sha1Hex(text: string): string {
    const view = padMessage(new TextEncoder().encode(text));
    const state = [...INITIAL_STATE];

    for (let offset = 0; offset < view.byteLength; offset += BLOCK_BYTES) {
        compressBlock(view, offset, state);
    }

    return state.map((word) => word.toString(16).padStart(8, '0')).join('');
}
