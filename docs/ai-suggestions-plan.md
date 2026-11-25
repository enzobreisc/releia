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

**Próximos passos:**

1. Instalar o Ollama, baixar o `nomic-embed-text` e validar numa cópia do banco; comparar com `bge-m3` se o resultado em pt-BR for ruim.
2. Etapa 5: botão para `ai.enabled` (decidir entre a página de configurações e a de sugestões) e indicador de disponibilidade.
3. Decidir se a etapa 6 (justificativa com LLM) será feita.
4. Etapa 7: `README.md` e `README.pt-BR.md`.
5. Publicar uma nova versão: o app empacotado só cria `book_embeddings` após o bump.

**Melhorias opcionais:** guardar os vetores em cache empacotados (`Vector::pack`) e pular o ranker quando a indexação acabou de falhar.
