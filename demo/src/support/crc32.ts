const POLYNOMIAL = 0xedb88320;
const BYTE_MASK = 0xff;
const ALL_BITS = 0xffffffff;
const BITS_PER_BYTE = 8;

const TABLE: readonly number[] = Array.from({ length: 256 }, (_, index) => {
    let value = index;

    for (let bit = 0; bit < BITS_PER_BYTE; bit++) {
        value = value & 1 ? POLYNOMIAL ^ (value >>> 1) : value >>> 1;
    }

    return value >>> 0;
});

/** Same value as PHP's crc32(): the unsigned CRC-32 of the UTF-8 bytes. */
export function crc32(text: string): number {
    let crc = ALL_BITS;

    for (const byte of new TextEncoder().encode(text)) {
        const index = (crc ^ byte) & BYTE_MASK;
        crc = (TABLE[index] ?? 0) ^ (crc >>> BITS_PER_BYTE);
    }

    return (crc ^ ALL_BITS) >>> 0;
}
