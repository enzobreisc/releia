<p align="center">
  <img src="material-marca/releia-logo-pack/png/app-icon/app-icon-escuro-macos-512.png" alt="releia" width="112">
</p>

<h1 align="center">releia</h1>

<p align="center">
  App pessoal para Mac que cataloga os livros físicos que você lê e transforma a leitura em estatísticas, notas e sugestões.
</p>

<p align="center">
  <a href="https://github.com/enzobreisc/releia/actions/workflows/tests.yml"><img src="https://github.com/enzobreisc/releia/actions/workflows/tests.yml/badge.svg" alt="tests"></a>
  <img src="https://img.shields.io/badge/PHP-8.4-777BB4?logo=php&logoColor=white" alt="PHP 8.4">
  <img src="https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white" alt="Laravel 13">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="Licença MIT">
</p>

<p align="center">
  <a href="README.md">English</a> · Português
</p>

![Início](docs/screenshots/home.png)

## Funcionalidades

- **Adicione livros em segundos** por ISBN ou título: metadados e capas vêm da Open Library, do Google Books e da BrasilAPI, e ficam em cache local.
- **Registre sessões de leitura** pela janela principal ou por uma janela na barra de menu, aberta com um atalho global (`⌘⇧L`), sem sair do que você está fazendo.
- **Biblioteca** em grade de capas ou numa estante tipográfica, com busca, filtros por status e gênero, e ordenação.
- **Página do livro** com todas as leituras, suas sessões, notas em Markdown e uma resenha por leitura; releituras são registradas separadamente.
- **Estatísticas**: livros e páginas por mês, ritmo, previsão da meta anual, gêneros e autores mais lidos e um calendário de leitura.
- **Wrapped**: um resumo do ano que pode ser exportado como imagem.
- **Fila, lista de compras e sugestões**: planeje a próxima leitura, acompanhe o menor preço de uma edição desejada e receba sugestões explicadas pelos livros que você avaliou bem.
- **Autores e linha do tempo**: estatísticas de leitura por autor, com fotos da Open Library ou da Wikipedia, e uma linha do tempo das leituras por ano.
- **Interface bilíngue** em português e inglês, incluindo datas, números e valores.
- **Offline primeiro**: tudo fica num banco SQLite local e as capas são baixadas para o disco, então o app continua funcionando sem conexão.

## Telas

| Biblioteca                                  | Livro                               |
| ------------------------------------------- | ----------------------------------- |
| ![Biblioteca](docs/screenshots/library.png) | ![Livro](docs/screenshots/book.png) |

| Estatísticas                                | Wrapped                                  |
| ------------------------------------------- | ---------------------------------------- |
| ![Estatísticas](docs/screenshots/stats.png) | ![Wrapped](docs/screenshots/wrapped.png) |

| Perfil                                  |
| --------------------------------------- |
| ![Perfil](docs/screenshots/profile.png) |

<sub>As telas usam a biblioteca de demonstração (`php artisan db:seed --class=DemoSeeder`).</sub>

## Destaques técnicos

- **Um app Laravel entregue como app nativo.** O [NativePHP](https://nativephp.com) empacota o PHP e o app no Electron, então o mesmo código renderiza a interface em Inertia + React e controla a janela, o ícone da barra de menu e o atalho global ([`app/Native/QuickLog.php`](app/Native/QuickLog.php)).
- **Busca de metadados atrás de um único contrato.** Cada fonte implementa [`MetadataProvider`](app/Services/BookLookup/MetadataProvider.php). O [`BookLookupService`](app/Services/BookLookupService.php) consulta a Open Library primeiro e usa a BrasilAPI e o Google Books para completar ou como reserva, com cache dos resultados; uma nova fonte é só uma classe.
- **Sugestões explicáveis.** O [`RecommendationService`](app/Services/RecommendationService.php) parte dos livros que você avaliou bem, busca outras obras dos mesmos autores e assuntos e ordena os candidatos com um [`CandidateRanker`](app/Services/Recommendation/CandidateRanker.php) plugável. Cada sugestão traz o motivo, e as buscas têm limite de tempo e cache.
- **Controllers enxutos, serviços ricos.** As regras de negócio ficam nos serviços, e os presenters definem as props que cada página Inertia recebe.
- **i18n com o texto original como chave.** Os textos são escritos em português e traduzidos em [`lang/en.json`](lang/en.json); o type check falha se faltar uma chave no React, e um teste falha se faltar uma chave no PHP.
- **Qualidade garantida no CI.** Testes de feature com Pest, PHPStan, Pint, lint e formatação com Vite+ e `tsc` rodam a cada push.

## Stack

| Camada    | Escolha                                  |
| --------- | ---------------------------------------- |
| Backend   | Laravel 13, PHP 8.4                      |
| Desktop   | NativePHP Desktop 2 (Electron)           |
| Banco     | SQLite                                   |
| Front-end | Inertia 3, React 19, TypeScript          |
| Estilo    | Tailwind CSS 4                           |
| Qualidade | Pest, PHPStan, Pint, Vite+ lint/fmt, tsc |

## Instalação

Baixe o `.dmg` mais recente em [Releases](https://github.com/enzobreisc/releia/releases/latest) (Apple Silicon) e arraste o **releia** para Aplicativos.

O app não é notarizado pela Apple, então o macOS bloqueia a primeira abertura. Abra **Ajustes do Sistema → Privacidade e Segurança** e clique em **Abrir Mesmo Assim**. Se o macOS disser que o app está danificado, remova a marca de quarentena:

```bash
xattr -dr com.apple.quarantine /Applications/releia.app
```

## Desenvolvimento

Requisitos: PHP 8.4, Composer, Node 22+.

```bash
composer setup        # instala dependências, gera APP_KEY, migra e faz o build
composer native:dev   # abre o app numa janela nativa (precisa de terminal interativo)
composer dev          # ou só o servidor web em http://localhost:8000
```

Para explorar o app com dados, rode a biblioteca de demonstração:

```bash
php artisan db:seed --class=DemoSeeder
```

Em desenvolvimento (`APP_DEBUG=true`) o app nativo usa `database/nativephp.sqlite`, separado do `database/database.sqlite` usado pelo `composer dev`. Ele é criado e migrado na primeira execução; depois de criar migrations novas, rode `php artisan native:migrate`.

| Comando                        | O que roda                         |
| ------------------------------ | ---------------------------------- |
| `composer test`                | Pint, PHPStan e Pest               |
| `npm run check`                | lint e formatação do front-end     |
| `npm run types:check`          | checagem de tipos do TypeScript    |
| `php artisan native:build mac` | gera o `.app`, o `.dmg` e o `.zip` |

## Estrutura

```
app/
  Enums/                ReadingStatus, BookSource, Locale…
  Http/Controllers/     um controller enxuto por tela
  Http/Presenters/      formatam as props enviadas a cada página Inertia
  Models/               Book, Reading, ReadingSession, Note…
  Native/               janela da barra de menu e atalho global
  Services/             regras de domínio: busca, leituras, estatísticas, sugestões…
    BookLookup/         fontes de metadados (Open Library, Google Books, BrasilAPI)
    Recommendation/     ordenação das sugestões
resources/js/
  pages/                uma página Inertia por tela
  components/           componentes compartilhados
  hooks/                lógica extraída dos componentes
lang/en.json            traduções para inglês
tests/Feature/          testes de comportamento por funcionalidade
```

## Licença

[MIT](LICENSE)
