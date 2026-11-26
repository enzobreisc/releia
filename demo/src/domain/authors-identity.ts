const ARTICLES = [
    'a',
    'o',
    'as',
    'os',
    'um',
    'uma',
    'uns',
    'umas',
    'the',
    'an',
];
const ARTICLE_PATTERN = ARTICLES.join('|');
const GENERATIONAL_SUFFIXES: ReadonlySet<string> = new Set([
    'jr',
    'junior',
    'filho',
    'neto',
    'sobrinho',
    'sr',
    'ii',
    'iii',
]);
const NAME_SUFFIX_PATTERN = /\b(jr|junior|filho|neto|sobrinho)\b/g;
const SUBTITLE_PATTERN = /\(.*?\)|:.*$/g;
const TRAILING_ARTICLE_PATTERN = new RegExp(
    `,\\s*(${ARTICLE_PATTERN})\\s*$`,
    'i',
);
const LEADING_ARTICLE_PATTERN = new RegExp(`^(${ARTICLE_PATTERN})\\s+(?=\\S)`);
const SUBTITLE_AFTER_PERIOD_PATTERN = /\.\s.*$/;
const COMBINING_MARKS = /\p{M}/gu;
const NON_ALPHANUMERIC = /[^a-z0-9 ]+/g;
const WHITESPACE_RUN = /\s+/g;
const NAME_SIMILARITY_PERCENT = 80;
const PERCENT = 100;

/** Plain ASCII letters folded to lower case, as the PHP side normalizes them. */
export function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .toLowerCase()
        .replace(NON_ALPHANUMERIC, ' ')
        .replace(WHITESPACE_RUN, ' ')
        .trim();
}

/** Catalogs often move the article to the end ("Morte De Ivan Ilitch, A"), so it is dropped from both places. */
export function normalizeTitle(title: string): string {
    const withoutSubtitle = title.replace(SUBTITLE_AFTER_PERIOD_PATTERN, '');
    const withoutSubtitleBlock = withoutSubtitle.replace(SUBTITLE_PATTERN, '');
    const withoutTrailingArticle = withoutSubtitleBlock.replace(
        TRAILING_ARTICLE_PATTERN,
        '',
    );

    return normalizeText(withoutTrailingArticle).replace(
        LEADING_ARTICLE_PATTERN,
        '',
    );
}

/** "WILDE, OSCAR" becomes "OSCAR WILDE"; a generational suffix after a comma is part of the name. */
export function givenNamesFirst(author: string): string {
    const parts = author.split(',').map((part) => part.trim());
    const [surname, givenNames] = parts;

    if (
        parts.length !== 2 ||
        surname === '' ||
        givenNames === '' ||
        GENERATIONAL_SUFFIXES.has(normalizeText(givenNames ?? ''))
    ) {
        return author;
    }

    return `${givenNames} ${surname}`;
}

/** Whether a title is just the author's full name or surname, as some catalog records are. */
export function isAuthorNameTitle(
    title: string,
    authors: readonly string[],
): boolean {
    const normalizedTitle = normalizeTitle(title);

    return authors.some((author) => {
        const name = normalizeText(givenNamesFirst(author));

        return (
            normalizedTitle === name ||
            normalizedTitle === name.slice(name.lastIndexOf(' ') + 1)
        );
    });
}

function nameWithoutSuffixes(name: string): string {
    return normalizeText(name).replace(NAME_SUFFIX_PATTERN, '').trim();
}

/** Same name, ignoring accents, case, punctuation and suffixes such as "Jr." and "Júnior". */
export function isSameName(left: string, right: string): boolean {
    const normalizedLeft = nameWithoutSuffixes(left);

    return (
        normalizedLeft !== '' && normalizedLeft === nameWithoutSuffixes(right)
    );
}

/** Allows for spellings in different languages (Tolstói / Tolstoy). */
export function isSimilarName(left: string, right: string): boolean {
    return (
        isSameName(left, right) ||
        similarityPercent(normalizeText(left), normalizeText(right)) >=
            NAME_SIMILARITY_PERCENT
    );
}

type CommonRun = { length: number; leftAt: number; rightAt: number };

function longestCommonRun(left: string, right: string): CommonRun {
    let best: CommonRun = { length: 0, leftAt: 0, rightAt: 0 };

    for (let leftIndex = 0; leftIndex < left.length; leftIndex++) {
        for (let rightIndex = 0; rightIndex < right.length; rightIndex++) {
            let length = 0;

            while (
                left[leftIndex + length] !== undefined &&
                left[leftIndex + length] === right[rightIndex + length]
            ) {
                length++;
            }

            if (length > best.length) {
                best = { length, leftAt: leftIndex, rightAt: rightIndex };
            }
        }
    }

    return best;
}

/** PHP's similar_text: matching characters found by recursively splitting at the longest common run. */
function similarCharacters(left: string, right: string): number {
    const run = longestCommonRun(left, right);

    if (run.length === 0) {
        return 0;
    }

    return (
        run.length +
        similarCharacters(
            left.slice(0, run.leftAt),
            right.slice(0, run.rightAt),
        ) +
        similarCharacters(
            left.slice(run.leftAt + run.length),
            right.slice(run.rightAt + run.length),
        )
    );
}

function similarityPercent(left: string, right: string): number {
    const total = left.length + right.length;

    return total === 0
        ? 0
        : (similarCharacters(left, right) * 2 * PERCENT) / total;
}
