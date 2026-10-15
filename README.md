# releia

App pessoal para Mac que cataloga os livros físicos que você lê, registra a leitura e a transforma em estatísticas, notas e sugestões.

- Escopo: [`material-marca/releia-escopo.pdf`](material-marca/releia-escopo.pdf)
- Telas (wireframes): artefato privado no Claude, `claude.ai/artifact/1Tc8UiiQKTBcuzA7ssZwor`
- Marca: [`material-marca/releia-logo-pack`](material-marca/releia-logo-pack)

## Stack

| camada    | escolha                                           |
| --------- | ------------------------------------------------- |
| Backend   | Laravel 13, PHP 8.3+                              |
| Desktop   | NativePHP Desktop 2 (Electron), Node 22+          |
| Banco     | SQLite                                            |
| Front-end | Inertia 3 + React 19 + TypeScript                 |
| Estilo    | Tailwind CSS 4, JetBrains Mono + fonte do sistema |
| Testes    | Pest, PHPStan, Pint                               |

## Começando

```bash
composer setup        # instala dependências, gera APP_KEY, migra e faz o build
composer native:dev   # abre o app numa janela nativa (precisa de terminal interativo)
composer dev          # alternativa: só o servidor web em http://localhost:8000
```

Em desenvolvimento (`APP_DEBUG=true`) o app nativo usa `database/nativephp.sqlite`, separado do `database/database.sqlite` usado pelo `composer dev`. Ele é criado e migrado sozinho na primeira execução; depois de criar migrations novas, rode `php artisan native:migrate`.

Checagens: `composer test` (Pint, PHPStan e Pest) e `npm run check` (lint e formatação do front-end).

Build do `.app`: `php artisan native:build mac`.

## Estrutura

```
app/
  Enums/                                   ReadingStatus, BookSource
  Http/Controllers/                        LibraryController, BookController, ReadingController…
  Http/Presenters/                         BookPresenter (formato enviado às páginas)
  Models/                                  Book, Reading, ReadingSession…
  Providers/NativeAppServiceProvider.php   janela, barra de menu, atalho global
  Services/                                BookLookupService, LibraryService, ReadingService, StatsService…
config/nativephp.php                       id do app, versão, updater (via NATIVEPHP_* no .env)
resources/
  css/app.css                              tokens da identidade (cores, fontes, raios)
  js/pages/                                uma página Inertia por tela, com nome em inglês
                                           (home, library, add-book, book, notes…)
  js/layouts/                              layout com barra lateral
  js/components/                           componentes compartilhados
  images/                                  símbolo e wordmark em SVG
public/
  icon.png                                 ícone do app (NativePHP)
  menubar/releiaTemplate*.png              ícone da barra de menu (fase 2)
material-marca/                            escopo e pacote de logos (fonte)
```

## Roteiro

| fase                    | entrega                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| 0 · Fundação            | Laravel + NativePHP + SQLite, layout com barra lateral, tema escuro, telas vazias |
| 1 · Catálogo            | books, authors, readings, BookLookupService; Adicionar, Biblioteca, Detalhe       |
| 2 · Registro de leitura | sessões, Início, janela da barra de menu, atalho global                           |
| 3 · Notas e Fila        | notas em Markdown, revisão do dia, fila, lista de compras                         |
| 4 · Estatísticas        | StatsService, Perfil, Wrapped                                                     |
| 5 · Sugestões           | camada 1 com motivo                                                               |
| 6 · Acabamento          | backup, exportação, atalhos configuráveis, build                                  |
