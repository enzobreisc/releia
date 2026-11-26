import { normalizeSearch } from './names';

type GenreRule = { name: string; keywords: readonly string[] };

/** Ordered from most specific to most general: on a tie, the first genre wins. */
const CATALOG: readonly GenreRule[] = [
    {
        name: 'Infantojuvenil',
        keywords: [
            'juvenile',
            'children',
            'young adult',
            'infantil',
            'infantojuvenil',
            'juvenil',
            'crianca',
            'adolescente',
        ],
    },
    {
        name: 'Quadrinhos e mangá',
        keywords: ['comic', 'graphic novel', 'manga', 'quadrinho', 'hq'],
    },
    {
        name: 'Ficção científica',
        keywords: [
            'science fiction',
            'sci-fi',
            'ficcao cientifica',
            'distopia',
            'dystopia',
            'cyberpunk',
        ],
    },
    { name: 'Fantasia', keywords: ['fantasy', 'fantasia', 'dragon', 'wizard'] },
    {
        name: 'Terror',
        keywords: ['horror', 'terror', 'ghost', 'vampire', 'gothic'],
    },
    {
        name: 'Policial e suspense',
        keywords: [
            'mystery',
            'detective',
            'crime',
            'thriller',
            'suspense',
            'policial',
            'misterio',
            'espionage',
        ],
    },
    {
        name: 'Poesia',
        keywords: ['poetry', 'poems', 'poesia', 'poema', 'poetic', 'verse'],
    },
    {
        name: 'Contos',
        keywords: ['short stories', 'short story', 'contos', 'conto'],
    },
    {
        name: 'Crônicas',
        keywords: ['cronicas', 'cronica', 'essays', 'ensaios', 'ensaio'],
    },
    {
        name: 'Teatro',
        keywords: ['drama', 'plays', 'teatro', 'theater', 'theatre'],
    },
    {
        name: 'Biografia e memórias',
        keywords: [
            'biography',
            'autobiography',
            'memoir',
            'biografia',
            'memorias',
            'autobiografia',
            'diaries',
        ],
    },
    {
        name: 'História',
        keywords: [
            'history',
            'historia',
            'historical',
            'historico',
            'war',
            'guerra',
        ],
    },
    {
        name: 'Filosofia',
        keywords: [
            'philosophy',
            'filosofia',
            'ethics',
            'etica',
            'stoic',
            'estoic',
        ],
    },
    {
        name: 'Psicologia',
        keywords: [
            'psychology',
            'psicologia',
            'psychoanalysis',
            'psicanalise',
            'mental health',
            'saude mental',
        ],
    },
    {
        name: 'Religião e espiritualidade',
        keywords: [
            'religion',
            'religiao',
            'spiritual',
            'bible',
            'biblia',
            'christian',
            'crista',
            'evangelho',
            'theology',
            'teologia',
            'deus',
            'igreja',
            'church',
        ],
    },
    {
        name: 'Autoajuda',
        keywords: [
            'self-help',
            'self help',
            'autoajuda',
            'auto-ajuda',
            'personal development',
            'desenvolvimento pessoal',
            'habits',
            'habitos',
            'motivation',
            'motivacao',
            'success',
            'sucesso',
        ],
    },
    {
        name: 'Negócios e finanças',
        keywords: [
            'business',
            'economics',
            'economia',
            'finance',
            'financas',
            'negocios',
            'management',
            'administracao',
            'marketing',
            'leadership',
            'lideranca',
            'investing',
            'investimentos',
            'empreendedorismo',
            'entrepreneur',
        ],
    },
    {
        name: 'Tecnologia',
        keywords: [
            'computer',
            'computing',
            'programming',
            'software',
            'tecnologia',
            'technology',
            'informatica',
            'programacao',
            'artificial intelligence',
            'inteligencia artificial',
            'engineering',
        ],
    },
    {
        name: 'Ciências',
        keywords: [
            'science',
            'ciencia',
            'physics',
            'fisica',
            'biology',
            'biologia',
            'chemistry',
            'quimica',
            'mathematics',
            'matematica',
            'nature',
            'natureza',
            'meio ambiente',
            'ecology',
            'ecologia',
            'medicine',
            'medicina',
            'astronomy',
            'astronomia',
        ],
    },
    {
        name: 'Política e sociedade',
        keywords: [
            'politic',
            'sociology',
            'sociologia',
            'social science',
            'ciencias sociais',
            'society',
            'sociedade',
            'racism',
            'racismo',
            'feminism',
            'feminismo',
            'direito',
            'law',
        ],
    },
    {
        name: 'Educação',
        keywords: [
            'education',
            'educacao',
            'teaching',
            'ensino',
            'pedagogia',
            'pedagogy',
            'language arts',
            'linguistica',
            'linguistics',
        ],
    },
    {
        name: 'Artes',
        keywords: [
            'art',
            'arte',
            'artes',
            'music',
            'musica',
            'cinema',
            'photography',
            'fotografia',
            'architecture',
            'arquitetura',
            'design',
        ],
    },
    {
        name: 'Culinária',
        keywords: [
            'cooking',
            'cookbook',
            'culinaria',
            'receitas',
            'recipes',
            'gastronomia',
            'food',
        ],
    },
    {
        name: 'Saúde e bem-estar',
        keywords: [
            'health',
            'saude',
            'fitness',
            'nutrition',
            'nutricao',
            'wellness',
            'bem-estar',
            'diet',
        ],
    },
    {
        name: 'Viagem',
        keywords: ['travel', 'viagem', 'viagens', 'voyages', 'guia turistico'],
    },
    {
        name: 'Romance',
        keywords: [
            'romance',
            'novel',
            'novels',
            'romances',
            'fiction',
            'ficcao',
            'literature',
            'literatura',
            'domestic',
            'magic realism',
            'realismo',
            'love stories',
            'literary',
        ],
    },
];

/** "Romance" means prose fiction in Portuguese, so it is too general to beat a specific genre. */
const GENERAL_GENRE = 'Romance';
const GENERAL_WEIGHT = 0.5;
const SPECIFIC_WEIGHT = 1;
const SUBJECT_SEPARATOR = /[/;]/;

export function genreNames(): string[] {
    return CATALOG.map((rule) => rule.name).sort((left, right) =>
        left.localeCompare(right, 'pt-BR'),
    );
}

function termsOf(subjects: readonly string[]): string[] {
    return subjects
        .flatMap((subject) => subject.split(SUBJECT_SEPARATOR))
        .map(normalizeSearch)
        .filter((term) => term !== '');
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termMentions(term: string, keyword: string): boolean {
    return new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(term);
}

function ruleFor(term: string): GenreRule | undefined {
    return CATALOG.find((rule) =>
        rule.keywords.some((keyword) => termMentions(term, keyword)),
    );
}

function weightOf(name: string): number {
    return name === GENERAL_GENRE ? GENERAL_WEIGHT : SPECIFIC_WEIGHT;
}

/** The genre the subjects point to, or null when none matches the catalog: no genre beats a noisy one. */
export function genreFromSubjects(subjects: readonly string[]): string | null {
    const scores = new Map<string, number>();

    for (const term of termsOf(subjects)) {
        const rule = ruleFor(term);

        if (rule !== undefined) {
            scores.set(
                rule.name,
                (scores.get(rule.name) ?? 0) + weightOf(rule.name),
            );
        }
    }

    let best: string | null = null;
    let bestScore = 0;

    for (const rule of CATALOG) {
        const score = scores.get(rule.name) ?? 0;

        if (score > bestScore) {
            best = rule.name;
            bestScore = score;
        }
    }

    return best;
}
