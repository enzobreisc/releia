<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * The app shows curated genres instead of the noisy subjects the sources return.
 */
final class Genres
{
    /**
     * Ordered from most specific to most general: on a tie, the first one wins.
     * `subject` is the Open Library subject used for suggestions, since their search is in English.
     *
     * @var array<string, array{subject: string|null, keywords: list<string>}>
     */
    private const CATALOG = [
        'Infantojuvenil' => ['subject' => 'Juvenile fiction', 'keywords' => ['juvenile', 'children', 'young adult', 'infantil', 'infantojuvenil', 'juvenil', 'crianca', 'adolescente']],
        'Quadrinhos e mangá' => ['subject' => 'Comics', 'keywords' => ['comic', 'graphic novel', 'manga', 'quadrinho', 'hq']],
        'Ficção científica' => ['subject' => 'Science fiction', 'keywords' => ['science fiction', 'sci-fi', 'ficcao cientifica', 'distopia', 'dystopia', 'cyberpunk']],
        'Fantasia' => ['subject' => 'Fantasy', 'keywords' => ['fantasy', 'fantasia', 'dragon', 'wizard']],
        'Terror' => ['subject' => 'Horror', 'keywords' => ['horror', 'terror', 'ghost', 'vampire', 'gothic']],
        'Policial e suspense' => ['subject' => 'Mystery', 'keywords' => ['mystery', 'detective', 'crime', 'thriller', 'suspense', 'policial', 'misterio', 'espionage']],
        'Poesia' => ['subject' => 'Poetry', 'keywords' => ['poetry', 'poems', 'poesia', 'poema', 'poetic', 'verse']],
        'Contos' => ['subject' => 'Short stories', 'keywords' => ['short stories', 'short story', 'contos', 'conto']],
        'Crônicas' => ['subject' => null, 'keywords' => ['cronicas', 'cronica', 'essays', 'ensaios', 'ensaio']],
        'Teatro' => ['subject' => 'Drama', 'keywords' => ['drama', 'plays', 'teatro', 'theater', 'theatre']],
        'Biografia e memórias' => ['subject' => 'Biography', 'keywords' => ['biography', 'autobiography', 'memoir', 'biografia', 'memorias', 'autobiografia', 'diaries']],
        'História' => ['subject' => 'History', 'keywords' => ['history', 'historia', 'historical', 'historico', 'war', 'guerra']],
        'Filosofia' => ['subject' => 'Philosophy', 'keywords' => ['philosophy', 'filosofia', 'ethics', 'etica', 'stoic', 'estoic']],
        'Psicologia' => ['subject' => 'Psychology', 'keywords' => ['psychology', 'psicologia', 'psychoanalysis', 'psicanalise', 'mental health', 'saude mental']],
        'Religião e espiritualidade' => ['subject' => 'Religion', 'keywords' => ['religion', 'religiao', 'spiritual', 'bible', 'biblia', 'christian', 'crista', 'evangelho', 'theology', 'teologia', 'deus', 'igreja', 'church']],
        'Autoajuda' => ['subject' => 'Self-help', 'keywords' => ['self-help', 'self help', 'autoajuda', 'auto-ajuda', 'personal development', 'desenvolvimento pessoal', 'habits', 'habitos', 'motivation', 'motivacao', 'success', 'sucesso']],
        'Negócios e finanças' => ['subject' => 'Business', 'keywords' => ['business', 'economics', 'economia', 'finance', 'financas', 'negocios', 'management', 'administracao', 'marketing', 'leadership', 'lideranca', 'investing', 'investimentos', 'empreendedorismo', 'entrepreneur']],
        'Tecnologia' => ['subject' => 'Computer science', 'keywords' => ['computer', 'computing', 'programming', 'software', 'tecnologia', 'technology', 'informatica', 'programacao', 'artificial intelligence', 'inteligencia artificial', 'engineering']],
        'Ciências' => ['subject' => 'Science', 'keywords' => ['science', 'ciencia', 'physics', 'fisica', 'biology', 'biologia', 'chemistry', 'quimica', 'mathematics', 'matematica', 'nature', 'natureza', 'meio ambiente', 'ecology', 'ecologia', 'medicine', 'medicina', 'astronomy', 'astronomia']],
        'Política e sociedade' => ['subject' => 'Politics', 'keywords' => ['politic', 'sociology', 'sociologia', 'social science', 'ciencias sociais', 'society', 'sociedade', 'racism', 'racismo', 'feminism', 'feminismo', 'direito', 'law']],
        'Educação' => ['subject' => 'Education', 'keywords' => ['education', 'educacao', 'teaching', 'ensino', 'pedagogia', 'pedagogy', 'language arts', 'linguistica', 'linguistics']],
        'Artes' => ['subject' => 'Art', 'keywords' => ['art', 'arte', 'artes', 'music', 'musica', 'cinema', 'photography', 'fotografia', 'architecture', 'arquitetura', 'design']],
        'Culinária' => ['subject' => 'Cooking', 'keywords' => ['cooking', 'cookbook', 'culinaria', 'receitas', 'recipes', 'gastronomia', 'food']],
        'Saúde e bem-estar' => ['subject' => 'Health', 'keywords' => ['health', 'saude', 'fitness', 'nutrition', 'nutricao', 'wellness', 'bem-estar', 'diet']],
        'Viagem' => ['subject' => 'Travel', 'keywords' => ['travel', 'viagem', 'viagens', 'voyages', 'guia turistico']],
        // Most general, last: "romance" in Portuguese means prose fiction.
        'Romance' => ['subject' => null, 'keywords' => ['romance', 'novel', 'novels', 'romances', 'fiction', 'ficcao', 'literature', 'literatura', 'domestic', 'magic realism', 'realismo', 'love stories', 'literary']],
    ];

    /** Very general subjects count half, so they do not beat a specific genre on a tie. */
    private const GENERAL = 'Romance';

    /**
     * @return list<string>
     */
    public static function names(): array
    {
        $names = array_keys(self::CATALOG);
        sort($names, SORT_LOCALE_STRING);

        return $names;
    }

    /**
     * Null when no subject matches the catalog: no genre is better than a noisy one.
     *
     * @param  array<mixed>  $subjects
     */
    public static function fromSubjects(array $subjects): ?string
    {
        $scores = [];

        foreach (self::terms($subjects) as $term) {
            foreach (self::CATALOG as $name => $genre) {
                foreach ($genre['keywords'] as $keyword) {
                    if (preg_match('/\b'.preg_quote($keyword, '/').'\b/', $term) === 1) {
                        $scores[$name] = ($scores[$name] ?? 0) + ($name === self::GENERAL ? 0.5 : 1);

                        continue 2;
                    }
                }
            }
        }

        if ($scores === []) {
            return null;
        }

        // Catalog order breaks ties: arsort is stable since PHP 8.
        $ordered = array_intersect_key(array_map(fn ($name) => 0, self::CATALOG), $scores);
        $scores = array_replace($ordered, $scores);
        arsort($scores);

        return (string) array_key_first($scores);
    }

    public static function openLibrarySubject(?string $genre): ?string
    {
        return $genre !== null ? (self::CATALOG[$genre]['subject'] ?? null) : null;
    }

    /**
     * @param  array<mixed>  $subjects
     * @return list<string>
     */
    private static function terms(array $subjects): array
    {
        $terms = [];

        foreach ($subjects as $subject) {
            if (! is_string($subject)) {
                continue;
            }

            foreach (preg_split('~[/;]~', $subject) ?: [] as $part) {
                $term = Str::of($part)->ascii()->lower()->squish()->toString();

                if ($term !== '') {
                    $terms[] = $term;
                }
            }
        }

        return $terms;
    }
}
