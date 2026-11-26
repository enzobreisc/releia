const HALF = 0.5;

/** PHP's round(): halves move away from zero, and scaling first keeps 1.005-style values exact. */
export function phpRound(value: number, decimals = 0): number {
    const factor = 10 ** decimals;
    const scaled = Number((Math.abs(value) * factor).toPrecision(15));
    const rounded = Math.floor(scaled + HALF) / factor;

    return value < 0 ? -rounded : rounded;
}
