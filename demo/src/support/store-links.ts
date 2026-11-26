import { translateText, type Locale } from '@/lib/i18n';
import { amazonIsbnLink, amazonTitleLink } from './amazon-link';
import { normalizeSearch } from './names';

type StoreLink = { key: string; label: string; url: string };

type StoreDefinition = { key: string; label: string };

const STORES: readonly StoreDefinition[] = [
    { key: 'amazon', label: 'Amazon' },
    { key: 'estante_virtual', label: 'Estante Virtual' },
    { key: 'mercado_livre', label: 'Mercado Livre' },
    { key: 'buscape', label: 'Buscapé (comparar preços)' },
    { key: 'americanas', label: 'Americanas' },
];

const ESTANTE_VIRTUAL_SEARCH = 'https://www.estantevirtual.com.br/busca?';
const MERCADO_LIVRE_LISTING = 'https://lista.mercadolivre.com.br/';
const BUSCAPE_SEARCH = 'https://www.buscape.com.br/search?';
const AMERICANAS_SEARCH = 'https://www.americanas.com.br/busca/';
const NON_SLUG_RUN = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;
const RFC3986_EXTRA = /[!'()*]/g;

function rawUrlEncode(text: string): string {
    return encodeURIComponent(text).replace(
        RFC3986_EXTRA,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
}

function slugify(text: string): string {
    return normalizeSearch(text)
        .replace(NON_SLUG_RUN, '-')
        .replace(EDGE_DASHES, '');
}

function queryFor(base: string, terms: string): string {
    return `${base}${new URLSearchParams({ q: terms }).toString()}`;
}

/** The ISBN finds the exact edition; without one, the title and author are searched. */
function storeLinkUrl(
    store: string,
    isbn: string | null,
    title: string,
    author = '',
): string | null {
    const terms = isbn ?? `${title} ${author}`.trim();

    switch (store) {
        case 'amazon':
            return isbn !== null
                ? amazonIsbnLink(isbn)
                : amazonTitleLink(title, author);
        case 'estante_virtual':
            return queryFor(ESTANTE_VIRTUAL_SEARCH, terms);
        case 'mercado_livre':
            return `${MERCADO_LIVRE_LISTING}${slugify(terms)}`;
        case 'buscape':
            return queryFor(BUSCAPE_SEARCH, terms);
        case 'americanas':
            return `${AMERICANAS_SEARCH}${rawUrlEncode(terms)}`;
        default:
            return null;
    }
}

/** StoreLinks::all: one search link per store, labels translated for the locale. */
export function storeLinks(
    isbn: string | null,
    title: string,
    author: string,
    locale: Locale,
): StoreLink[] {
    return STORES.map(({ key, label }) => ({
        key,
        label: translateText(locale, label),
        url: storeLinkUrl(key, isbn, title, author) ?? '',
    }));
}
