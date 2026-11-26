import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import en from '../../lang/en.json';
import { shellCopyFor } from '../src/shell/copy';
import { storeLinks } from '../src/support/store-links';

const SOURCE_ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const QUOTED = String.raw`'((?:[^'\\\n]|\\.)*)'`;
const TRANSLATE_CALL = new RegExp(
    String.raw`translate(?:Text|For)\(\s*[^,()]+,\s*(?:${QUOTED}|([A-Za-z_]\w*))`,
    'g',
);
const INVALID_INPUT = new RegExp(String.raw`\binvalid\(\s*${QUOTED}`, 'g');
const STRING_CONSTANT = new RegExp(
    String.raw`\bconst\s+([A-Z_][A-Z0-9_]*)\s*=\s*${QUOTED}`,
    'g',
);
const LABEL_MAP = new RegExp(
    String.raw`\bconst\s+([A-Z_][A-Z0-9_]*)\b[^=]*=\s*\{([^}]*)\}`,
    'g',
);
const KNOWN_LITERALS = [
    'Informe a data.',
    'Tipo de nota inválido.',
    'Data do término inválida.',
    'Endereço da capa inválido.',
    'Status inválido.',
];
const VISUAL_KEY = 'visual';

function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = `${directory}${entry.name}`;

        if (entry.isDirectory()) {
            return sourceFiles(`${path}/`);
        }

        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

function unescape(literal: string): string {
    return literal.replace(/\\(.)/g, '$1');
}

function allMatches(pattern: RegExp, text: string): RegExpExecArray[] {
    return [...text.matchAll(pattern)];
}

function translatedLiterals(): string[] {
    const literals = new Set<string>();

    for (const file of sourceFiles(SOURCE_ROOT)) {
        const text = readFileSync(file, 'utf8');
        const constants = new Map(
            allMatches(STRING_CONSTANT, text).map((match) => [
                match[1],
                unescape(match[2]),
            ]),
        );
        const labelMaps = new Map(
            allMatches(LABEL_MAP, text).map((match) => [
                match[1],
                allMatches(new RegExp(QUOTED, 'g'), match[2]).map((literal) =>
                    unescape(literal[1]),
                ),
            ]),
        );

        for (const match of allMatches(TRANSLATE_CALL, text)) {
            if (match[1] !== undefined) {
                literals.add(unescape(match[1]));
            } else if (constants.has(match[2])) {
                literals.add(constants.get(match[2]) ?? '');
            } else {
                for (const label of labelMaps.get(match[2]) ?? []) {
                    literals.add(label);
                }
            }
        }

        for (const match of allMatches(INVALID_INPUT, text)) {
            literals.add(unescape(match[1]));
        }
    }

    return [...literals].sort();
}

function shellCopyTexts(node: unknown, key = ''): string[] {
    if (typeof node === 'string') {
        return key === VISUAL_KEY ? [] : [node];
    }

    if (Array.isArray(node)) {
        return node.flatMap((item) => shellCopyTexts(item));
    }

    if (typeof node === 'object' && node !== null) {
        return Object.entries(node).flatMap(([name, child]) =>
            shellCopyTexts(child, name),
        );
    }

    return [];
}

const englishKeys: Record<string, string> = en;

describe('demo translations', () => {
    it('has an English entry for every literal the demo translates', () => {
        const literals = translatedLiterals();
        const missing = literals.filter(
            (text) => !Object.hasOwn(englishKeys, text),
        );

        expect(missing).toEqual([]);
    });

    it('finds the literals that are passed to the translator', () => {
        expect(translatedLiterals()).toEqual(
            expect.arrayContaining(KNOWN_LITERALS),
        );
    });

    it('has an English entry for every string of the shell copy', () => {
        const missing = shellCopyTexts(shellCopyFor('pt_BR')).filter(
            (text) => !Object.hasOwn(englishKeys, text),
        );

        expect(missing).toEqual([]);
    });

    it('has an English entry for every store label', () => {
        const missing = storeLinks(null, 'Título', 'Autor', 'pt_BR')
            .map((store) => store.label)
            .filter((label) => !Object.hasOwn(englishKeys, label));

        expect(missing).toEqual([]);
    });
});
