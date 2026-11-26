const AMAZON_BASE = 'https://www.amazon.com.br';
const SEARCH_CATEGORY = 'stripbooks';
const AMAZON_HOST =
    /(^|\.)amazon\.(com|co|ca|de|fr|es|it|in|nl|se|pl|sg|ae|sa|eg)(\.[a-z]{2})?$/;

function amazonSearch(terms: string): string {
    const query = new URLSearchParams({ k: terms, i: SEARCH_CATEGORY });

    return `${AMAZON_BASE}/s?${query.toString()}`;
}

/** The ISBN search always opens: /dp/ answers 404 when the edition is not sold in Brazil. */
export function amazonIsbnLink(isbn13: string): string {
    return amazonSearch(isbn13);
}

export function amazonTitleLink(title: string, author = ''): string {
    return amazonSearch(`${title} ${author}`.trim());
}

export function isAmazonUrl(url: string): boolean {
    try {
        return AMAZON_HOST.test(new URL(url).hostname.toLowerCase());
    } catch {
        return false;
    }
}
