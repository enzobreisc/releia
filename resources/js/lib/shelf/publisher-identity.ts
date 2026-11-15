import { hash } from './hash';

export type SpineDevice =
    | 'double'
    | 'heavy'
    | 'label'
    | 'square'
    | 'triple'
    | 'base';

export type PublisherIdentity = {
    /** The bands or mark every spine of the publisher repeats. */
    device: SpineDevice;
    /** Typical trade format: height of the books, in centimetres. */
    heightCm: number;
    /** OKLCH hue that tints every spine of the publisher; null keeps the app's neutral surface. */
    hue: number | null;
};

const DEVICES: SpineDevice[] = [
    'double',
    'heavy',
    'label',
    'square',
    'triple',
    'base',
];
const HEIGHTS_CM = [20, 21, 23];
const HUES = [20, 55, 95, 140, 175, 210, 250, 290, 330];
const DEFAULT_HEIGHT_CM = 21;
const NEUTRAL: PublisherIdentity = {
    device: 'double',
    heightCm: DEFAULT_HEIGHT_CM,
    hue: null,
};

/** Looks chosen from the publishers' real covers and formats; others are derived from the name. */
const KNOWN: Record<string, PublisherIdentity> = {
    'editora 34': { device: 'square', heightCm: 21, hue: 95 },
    'companhia das letras': { device: 'heavy', heightCm: 20.8, hue: 250 },
    'penguin-companhia': { device: 'triple', heightCm: 19.8, hue: 55 },
    intrinseca: { device: 'base', heightCm: 23, hue: 330 },
    edipro: { device: 'double', heightCm: 21, hue: 210 },
    rocco: { device: 'label', heightCm: 21, hue: 20 },
    aleph: { device: 'label', heightCm: 23, hue: 290 },
    vozes: { device: 'double', heightCm: 23, hue: 140 },
    'l&pm': { device: 'heavy', heightCm: 17.5, hue: 175 },
};

export function identityFor(publisherKey: string): PublisherIdentity {
    if (publisherKey === '') {
        return NEUTRAL;
    }

    return (
        KNOWN[publisherKey] ?? {
            device: DEVICES[hash(publisherKey) % DEVICES.length],
            heightCm:
                HEIGHTS_CM[hash(`${publisherKey}:size`) % HEIGHTS_CM.length],
            hue: HUES[hash(`${publisherKey}:hue`) % HUES.length],
        }
    );
}
