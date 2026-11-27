<?php

namespace App\Services\Ai;

final class InterpreterPrompt
{
    public const SYSTEM = <<<'TEXT'
Você converte um pedido de leitura em filtros de busca. Não recomende livros.
- authors: autores que a pessoa QUER ler, com o nome completo e correto.
- excluded_authors: autores que a pessoa NÃO quer.
- max_pages: limite de páginas se ela der um número; "curto" ou "pequeno" = 250; senão null.
- understood: false se o pedido não for um pedido de livro, ou se pedir apenas assunto, gênero, autor novo ou livro parecido com outro.
Um pedido genérico de sugestão é entendido, com listas vazias.
Não invente nada que o pedido não diga. Listas vazias quando não se aplica.
TEXT;

    /**
     * @var list<array{request: string, filters: array{authors?: list<string>, excluded_authors?: list<string>, max_pages?: int|null, understood?: bool}}>
     */
    private const EXAMPLES = [
        ['request' => 'mais livros da Clarice Lispector', 'filters' => ['authors' => ['Clarice Lispector']]],
        ['request' => 'nada de Machado de Assis', 'filters' => ['excluded_authors' => ['Machado de Assis']]],
        ['request' => 'algo curto da Jane Austen', 'filters' => ['authors' => ['Jane Austen'], 'max_pages' => 250]],
        ['request' => 'um livro com no máximo 300 páginas', 'filters' => ['max_pages' => 300]],
        ['request' => 'me sugere qualquer coisa', 'filters' => []],
        ['request' => 'Machado não, pode ser Clarice Lispector', 'filters' => ['authors' => ['Clarice Lispector'], 'excluded_authors' => ['Machado de Assis']]],
        ['request' => 'um livro de fantasia', 'filters' => ['understood' => false]],
        ['request' => 'algo parecido com Dom Casmurro', 'filters' => ['understood' => false]],
        ['request' => 'como faço um bolo?', 'filters' => ['understood' => false]],
    ];

    /**
     * @return list<array{role: string, content: string}>
     */
    public static function messages(string $text): array
    {
        $messages = [['role' => 'system', 'content' => self::SYSTEM]];

        foreach (self::EXAMPLES as $example) {
            $messages[] = ['role' => 'user', 'content' => $example['request']];
            $messages[] = ['role' => 'assistant', 'content' => json_encode(self::answerOf($example['filters']), JSON_THROW_ON_ERROR)];
        }

        $messages[] = ['role' => 'user', 'content' => $text];

        return $messages;
    }

    /**
     * Every field is written out, so the model answers in the same shape it is asked for.
     *
     * @param  array{authors?: list<string>, excluded_authors?: list<string>, max_pages?: int|null, understood?: bool}  $filters
     * @return array{authors: list<string>, excluded_authors: list<string>, max_pages: int|null, understood: bool}
     */
    private static function answerOf(array $filters): array
    {
        return [
            'authors' => $filters['authors'] ?? [],
            'excluded_authors' => $filters['excluded_authors'] ?? [],
            'max_pages' => $filters['max_pages'] ?? null,
            'understood' => $filters['understood'] ?? true,
        ];
    }
}
