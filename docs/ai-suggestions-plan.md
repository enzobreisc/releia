# Sugestões com IA local no Releia

## Context

O Releia já tem um motor de sugestões "camada 1" (Open Library + pontuação por afinidade/popularidade) e uma interface `CandidateRanker` marcada como "extension point for layers 2 and 3 (embeddings and AI)". A ideia é encaixar embeddings/LLM locais ali, sem enviar dados para fora e sem quebrar o comportamento offline-first.

## Achados do projeto

- **Stack:** PHP 8.4, Laravel 13, Inertia 3 + React 19 + TS + Tailwind 4; empacotado com NativePHP Desktop 2 (Electron), só macOS Apple Silicon. Testes Pest, Pint, PHPStan.
- **Banco:** SQLite local. `books` (título, subtítulo, gênero único, description, ISBNs, páginas, ano, série, editora), `authors`, `readings` (status, rating 1–5, review, datas), `notes`, `queue_items`, `shopping_items`, `recommendations` (reason, based_on_book_id, status new/want_to_read/dismissed), `settings` (chave/valor JSON).
- **Já existe e ajuda:** nota + review por leitura, status/datas, descrição, gênero, autores, fila de leitura, feedback de sugestões (dismissed/want_to_read).
- **Falta:** armazenamento de embeddings; múltiplos gêneros/assuntos por livro (`Genres::fromSubjects` colapsa em um); idioma; tags por livro (tags só existem em notas).
- **Arquitetura:** lógica em `app/Services` (`Recommendation/`: `SourceBooks` → `CandidateFinder` → `SuggestionCollector` → `CandidateRanker` → `PortugueseEditions` → `PendingRecommendations`). `SuggestionGenerator` tem `CandidateRanker $ranker = new ScoredRanker` por padrão (nada ligado no container). Disparo por `POST /suggestions/generate` e `php artisan releia:suggestions`, com orçamento de 20 s (`SearchBudget`).
- **HTTP externo:** `Http` facade, providers atrás de `MetadataProvider` (OpenLibrary, GoogleBooks, BrasilApi), timeouts 4/8 s, falha → `[]` + log, cache de 7–30 dias, testes com `Http::fake` e `preventStrayRequests`.
- **Ambiente:** Ollama NÃO instalado. Apple M2, 8 GB RAM, 8,9 GiB livres em disco. Isso descarta modelos de 7–8B (~5 GB, disputam RAM com Electron + PHP) para uso confortável.

## Comparativo

|              | A) Embeddings                                                              | B) LLM sugere livros novos                                   | C) Híbrido                                         |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Esforço      | Baixo–médio                                                                | Alto                                                         | Médio (A + extra)                                  |
| Qualidade    | Boa em similaridade temática; sem "descoberta" fora do catálogo/candidatos | Imprevisível; alucinação, ruim em pt-BR com modelos pequenos | Boa; razão em texto natural                        |
| Dados novos  | Tabela de embeddings; texto por livro (título+autor+gênero+descrição)      | Perfil resumido; nada no banco                               | Igual a A                                          |
| Hardware     | `nomic-embed-text` ~270 MB, roda fácil em 8 GB                             | 7–8B inviável com folga; 3–4B fraco                          | Embeddings + modelo 3–4B (~2–3 GB), só sob demanda |
| Dependências | Ollama + 1 provider HTTP                                                   | Ollama + validação Open Library/Google (já existem)          | Ollama + 2 modelos                                 |
| Risco        | Baixo                                                                      | Alto                                                         | Médio                                              |

## Recomendação

**A primeiro, depois C opcional. Evitar B.**

- Casa com o que já existe: implementa-se um `EmbeddingRanker` como novo `CandidateRanker`, reaproveitando o pipeline Open Library (candidatos) e ordenando por similaridade ao perfil (média dos embeddings dos livros nota 4–5, ponderados pela nota, subtraindo rejeitados). Também ranqueia a fila/lista de desejos.
- Sem alucinação, tamanho de modelo pequeno, tolerante a falhas (fallback para `ScoredRanker`).
- B duplica o que o pipeline já faz melhor (candidatos reais) e exige modelo grande que a máquina não comporta bem.
- C vem depois: um modelo 3–4B (ex.: `qwen2.5:3b`/`gemma3:4b`) só para reescrever a `reason` já existente, com fallback para o texto determinístico atual.

**Primeiro passo:** instalar Ollama, `ollama pull nomic-embed-text`, e validar a qualidade em pt-BR com um script descartável sobre os livros reais antes de escrever código de produção.

## Plano em etapas (cada uma = um commit)

1. **Cliente Ollama:** `app/Services/Ai/EmbeddingProvider.php` (interface), `OllamaEmbeddingProvider.php` (`Http::post /api/embed`, timeout curto, exceção tipada `EmbeddingUnavailable`); `config/services.php` (`ollama.url`, `ollama.embedding_model`); binding em `AppServiceProvider`. Teste com `Http::fake`.
2. **Migração + modelo:** tabela `book_embeddings` (`book_id` FK cascade, `model`, `vector` BLOB, `source_hash`, timestamps); `app/Models/BookEmbedding.php`. Vetor como float32 empacotado; cosseno em PHP (suficiente para milhares de livros, sem `sqlite-vec`). Testes unitários de cosseno/pack.
3. **Indexação:** `app/Services/Ai/BookEmbeddingIndexer.php` (monta o texto, reindexa só se `source_hash` mudou) + comando `releia:embed`; chamada incremental ao salvar/avaliar livro (ou só sob demanda, para não travar a UI).
4. **Perfil e ranker:** `app/Services/Recommendation/TasteProfile.php` e `EmbeddingRanker.php` implementando `CandidateRanker`; embeddings dos candidatos calculados na hora (título+autor+descrição quando houver); combinação com `ScoredRanker` (score híbrido) e fallback se Ollama estiver off. Binding do ranker no container escolhendo por setting.
5. **Setting + UI:** chave `ai.enabled` em `settings` (+ `SettingsController`/Form Request), indicador "IA local ativa/indisponível" na página `suggestions.tsx`; strings em `lang/en.json`.
6. **(Opcional) Justificativa com LLM:** `ReasonWriter` interface + `OllamaReasonWriter`; só ao exibir/gerar, cache em `recommendations.reason`; fallback no texto atual.
7. **Docs:** README (seção de IA local, offline-first mantido), `.env.example`.

Migração: apenas a da etapa 2 (nova tabela, sem alterar `books`). Melhoria futura opcional: guardar assuntos/idioma da Open Library para enriquecer o texto do embedding.

## Riscos e atenção

- **Ollama parado/ausente:** nunca falhar a página; checar com timeout curto (~1 s no health check), cair no `ScoredRanker`, mostrar aviso discreto.
- **Orçamento de 20 s (`SearchBudget`):** embeddings de candidatos novos consomem tempo; cachear por `source_hash`/ISBN e limitar nº de candidatos.
- **RAM/disco (8 GB / 8,9 GiB livres):** manter só `nomic-embed-text`; LLM 3–4B apenas sob demanda; evitar 7–8B.
- **Qualidade pt-BR:** `nomic-embed-text` é majoritariamente inglês; validar na etapa de teste, alternativa `bge-m3`/`multilingual-e5` (maior).
- **Descrições curtas/ausentes** pioram o embedding; usar título+autor+gênero como base.
- **Privacidade:** tudo em `localhost`; Open Library continua recebendo só termos de busca já existentes, nunca o perfil. Documentar no README.
- **Distribuição NativePHP:** o app não embute Ollama; é pré-requisito opcional do usuário. Recurso desligado por padrão.
- **Convenções do projeto:** comentários mínimos, tipagem estrita, strings em pt-BR com chave em `en.json`, Pint/PHPStan/Pest passando.

## Verificação (quando implementado)

- `composer ci:check` (Pint, PHPStan, Pest, `vp check`, `tsc`).
- Testes Pest com `Http::fake` para Ollama (sucesso, timeout, modelo ausente) e para o ranker (ordem por similaridade; fallback).
- Manual: gerar sugestões com Ollama ligado e desligado; conferir tempo < 20 s e razões coerentes.

## Andamento (25/11/2026)

**Feito:** etapas 1 a 4, com revisão de código e correções. Pint, PHPStan, testes, `vp check` e `tsc` passando.

**Ainda não validado:** nada rodou contra um Ollama real (todos os testes usam `Http::fake`). A qualidade em pt-BR é desconhecida.

**Decisões que mudaram o plano:**

- A similaridade é a do livro curtido mais próximo (ponderada pela nota), não a média do perfil.
- O texto do embedding usa título, autor e gênero, sem descrição, porque os candidatos não a têm.
- Sugestões rejeitadas não são sinal negativo: "já li" também as marca como rejeitadas.
- Ao gerar sugestões, só os livros com nota 4–5 são indexados, com limite de 5 s; `releia:embed` indexa a biblioteca toda.
- Os vetores dos candidatos ficam no cache do Laravel por 30 dias.

## Validação com Ollama real (25/11/2026)

Feita numa cópia do banco, com Ollama 0.40.18 e `nomic-embed-text`.

- A API responde no formato esperado (768 dimensões; modelo ausente retorna 404).
- Os 29 livros foram indexados em menos de 1 s. Ordenar 34 candidatos levou 0,66 s sem cache e 0,04 s com cache.
- **Bug (corrigido):** a similaridade era multiplicada pelo peso da nota. Como os cossenos ficam entre 0,63 e 0,94, os livros 4★ eram praticamente ignorados. Depois da correção, o livro mais próximo de 34 candidatos foi um 5★ em 20 casos e um 4★ em 14.
- Com os pesos atuais, livros 3★ e 2★ não foram o mais próximo de nenhum candidato.
- **Adiado:** os pesos ficam como estão até haver uma amostra maior e mais diversa de livros avaliados. Alternativa testada para depois: pesos 1 / 0,8 / 0,6 / 0,2 com o 2º e o 3º vizinhos reforçando o melhor (`nota + (1 − nota) × 0,3 × vizinho`), o que fez um 3★ participar de 11 em 34 candidatos. Só aumentar os pesos fez um 3★ ser o melhor vizinho em no máximo 2.
- A similaridade deixou de ser renormalizada a cada busca, para preservar os pesos. Com isso a IA altera ainda menos a ordem. O peso da similaridade na combinação precisa ser calibrado na medição.
- A comparação ordenou os candidatos antes da verificação de edições. Parte deles era de livros já na biblioteca em outro idioma, o que infla a similaridade; o app os descarta depois, mas eles consomem tentativas de verificação.
- A discriminação é baixa: para um livro sobre o Holocausto, um terror sem relação ficou acima de outro livro sobre a mesma época. A causa provável é o tema não estar no texto analisado.
- Candidatos com título em russo tiveram similaridade baixa, mesmo sendo de autores curtidos.
- A ordem das sugestões mudou pouco em relação à pontuação atual.
- Não medido: tempo da busca completa e comparação com `bge-m3`.

## Desenho fechado

Substitui, onde houver conflito, a recomendação e as etapas 5 e 6 acima.

**Escala do leitor:** 5 = apaixonou; 4 = muito bom; 3 = bom; 2 = indica pouco; 1 = repele.

| Tema                            | Decisão                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| Prioridade                      | Não perder um livro que o leitor amaria                                     |
| Acerto                          | Um livro que seria avaliado com 3 ou mais                                   |
| Autor lido                      | Busca a partir de 4★ e 5★, valendo a melhor nota no autor                   |
| Interesse                       | "Quero ler" e lista de compras disparam buscas, com peso de 4★              |
| Variedade                       | No máximo 3 obras por autor em cada busca                                   |
| Motivo                          | Toda sugestão diz por que apareceu e permite pesquisar em fontes reais      |
| Nota na similaridade            | Vale o melhor vizinho; a proximidade é medida acima do piso antes do peso   |
| Pesos iniciais                  | 5 = 1,0; 4 = 0,6; 3 = 0,3; 2 = 0,1; sem repulsão enquanto não houver nota 1 |
| Tema                            | Incluir os assuntos da Open Library no texto analisado                      |
| Justificativa por LLM (etapa 6) | Descartada, pelo risco de inventar fatos                                    |
| Botão da IA (etapa 5)           | Página de sugestões, com indicador de disponibilidade                       |

O peso de 4★ para o interesse e o local do botão são padrões propostos, ainda revisáveis.

**Proximidade:** `(cosseno − piso) / (teto − piso)`, limitada entre 0 e 1. Piso 0,63 e teto 0,94 foram observados com `nomic-embed-text` e precisam ser recalibrados se o modelo mudar.

**Condição para a IA permanecer:** com ela, os livros que o leitor amaria precisam aparecer mais entre os 20 primeiros.

## Buscas por interesse (25/11/2026)

- Livros em "Quero ler" e itens da lista de compras disparam buscas pelo autor, com o peso de um 4★. Das 6 fontes de cada busca, 2 são reservadas para o interesse, e um lado completa o que o outro não preencher.
- Sugestões por interesse não têm livro de origem: `recommendations.based_on_book_id` passou a aceitar nulo.
- Numa cópia nova do banco, duas buscas trouxeram 27 sugestões (15,1 s e 10,2 s), nenhuma com título igual ao de um livro da biblioteca e sem passar de 3 obras por autor.
- Com 10 autores de interesse e 2 vagas sorteadas, um autor específico pode levar várias buscas para aparecer.
- Ruídos observados: a busca por assunto trouxe livros didáticos, e um título com erro de digitação escapou da detecção de duplicados.
- Corrigido: uma edição que trazia a editora no lugar do autor fazia um livro já na biblioteca voltar como sugestão.
- Um autor com livro 4★ ou 5★ só é buscado quando esse livro é sorteado, mesmo que também esteja na lista de interesse.

## Próximos passos

1. Confirmar se a Open Library traz assuntos úteis para os livros da biblioteca.
2. Medir a cobertura (esconder um livro 4★ ou 5★ entre candidatos reais e ver se fica entre os 20 primeiros), considerando só os candidatos que passam pela verificação de edições: só pontuação, `nomic-embed-text` e `bge-m3`.
3. **Feito:** buscas por interesse e limite de 3 obras por autor (funcionam sem IA). Falta, se a medição justificar, incluir assuntos no embedding.
4. Decidir se sugestões pendentes antigas de livros que já estão na biblioteca devem ser removidas. A detecção atual já as bloqueia; as encontradas são anteriores à correção que ignora artigos nos títulos.
5. Botão `ai.enabled` na página de sugestões (etapa 5).
6. `README.md` e `README.pt-BR.md` (etapa 7).
7. Publicar uma nova versão. É obrigatório: o app empacotado só roda as migrações quando a versão muda, e sem elas as sugestões por interesse falham ao serem gravadas.

**Melhorias opcionais:** guardar os vetores em cache empacotados (`Vector::pack`) e pular o ranker quando a indexação acabou de falhar.
