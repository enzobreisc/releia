import { hash } from './hash';

export type SpineDevice =
    | 'double'
    | 'heavy'
    | 'label'
    | 'square'
    | 'triple'
    | 'base';

export type TitleFace = 'sans' | 'grotesk' | 'serif';

export type PublisherIdentity = {
    /** The bands or mark every spine of the publisher repeats. */
    device: SpineDevice;
    face: TitleFace;
    /** Typical trade format: height of the books, in centimetres. */
    heightCm: number;
    /** The spine takes the cover's title color as its ground, and the cover's cream becomes the mark. */
    groundFromAccent: boolean;
};

const DEVICES: SpineDevice[] = [
    'double',
    'heavy',
    'label',
    'square',
    'triple',
    'base',
];
const FACES: TitleFace[] = ['sans', 'grotesk', 'serif'];
const HEIGHTS_CM = [20, 21, 23];
const DEFAULT_HEIGHT_CM = 21;
const NEUTRAL: PublisherIdentity = {
    device: 'double',
    face: 'sans',
    heightCm: DEFAULT_HEIGHT_CM,
    groundFromAccent: false,
};

/** Looks chosen from the publishers' real covers and formats; others are derived from the name. */
const KNOWN: Record<string, PublisherIdentity> = {
    'editora 34': {
        device: 'square',
        face: 'serif',
        heightCm: 21,
        groundFromAccent: true,
    },
    'companhia das letras': {
        device: 'heavy',
        face: 'grotesk',
        heightCm: 20.8,
        groundFromAccent: false,
    },
    'penguin-companhia': {
        device: 'triple',
        face: 'serif',
        heightCm: 19.8,
        groundFromAccent: false,
    },
    intrinseca: {
        device: 'base',
        face: 'grotesk',
        heightCm: 23,
        groundFromAccent: false,
    },
    edipro: {
        device: 'double',
        face: 'sans',
        heightCm: 21,
        groundFromAccent: false,
    },
    rocco: {
        device: 'label',
        face: 'serif',
        heightCm: 21,
        groundFromAccent: false,
    },
    aleph: {
        device: 'label',
        face: 'sans',
        heightCm: 23,
        groundFromAccent: false,
    },
    vozes: {
        device: 'double',
        face: 'serif',
        heightCm: 23,
        groundFromAccent: false,
    },
    'l&pm': {
        device: 'heavy',
        face: 'sans',
        heightCm: 17.5,
        groundFromAccent: false,
    },
};

export function identityFor(publisherKey: string): PublisherIdentity {
    if (publisherKey === '') {
        return NEUTRAL;
    }

    return (
        KNOWN[publisherKey] ?? {
            device: DEVICES[hash(publisherKey) % DEVICES.length],
            face: FACES[hash(`${publisherKey}:face`) % FACES.length],
            heightCm:
                HEIGHTS_CM[hash(`${publisherKey}:size`) % HEIGHTS_CM.length],
            groundFromAccent: false,
        }
    );
}
