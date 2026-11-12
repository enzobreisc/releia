# Releia – Engineering Standards

This project doubles as a portfolio piece. Every change must meet the standards below.

## Language

- Code, identifiers, file names, routes, commit messages, PR descriptions and comments are in **English**.
- Only user-facing copy (UI text, labels, validation messages) is in **pt-BR**.

## Comments

- Do not write unnecessary comments. Code must explain itself through naming and structure.
- Allowed: a short comment explaining *why* something non-obvious is done (workaround, external API quirk, business rule). Never *what* the code does.
- When touching a file, **delete** any comment that restates the code, is stale, is commented-out code, or is in another language (translate the rare ones worth keeping).
- No `TODO`/`FIXME` left behind without an issue reference.

## Clean Code

- Names reveal intent: functions are verbs (`findOverdueBooks`), booleans read as questions (`isOwned`, `hasCover`), no abbreviations or noise words (`data`, `info`, `manager`).
- Functions are small, do one thing and stay at one level of abstraction. Prefer early returns over nesting.
- Max ~3 parameters; group related ones into an object/DTO.
- No magic numbers or strings: use constants, enums or config.
- No duplication (DRY), but do not abstract prematurely (YAGNI).
- Command–query separation: a function either changes state or returns a value.
- Keep controllers thin: validation in Form Requests, business logic in actions/services, persistence in models/queries.
- Follow SOLID; depend on abstractions at boundaries (external APIs, providers).
- Prefer composition over inheritance. Keep React components small, presentational vs. data-fetching separated, logic extracted into hooks.
- Strict typing everywhere: PHP return/param types, TypeScript with no `any`.
- Leave the code cleaner than found (boy-scout rule), within the scope of the task.

## Internationalization

- Supported languages: pt-BR (default and source language) and English. The choice is stored in `settings` (`locale`) and applied by the `SetLocale` middleware.
- Translation keys are the pt-BR text itself. PHP uses `__('Quero ler')`, React uses `t('Quero ler')` from `useTranslation()`; `lang/en.json` holds the English text. Placeholders are `:name` on both sides.
- Every new user-facing string needs an entry in `lang/en.json`: `npm run types:check` fails on a missing React key and `tests/Feature/LocaleTest.php` fails on a missing PHP key.
- Dates, ordinals and amounts go through `useTranslation()` (React) or `DateLabel`, `Ordinal` and `Money` (PHP), never hard-coded locales.

## Stack conventions

- Laravel (PHP): format with Pint (`pint.json`), analyse with PHPStan (`phpstan.neon`).
- React + Inertia + TypeScript: `npm run check` and `npm run types:check` must pass.
- Tests (PHPUnit) accompany new behavior and bug fixes; test names describe behavior.

## Git

- Conventional Commits: `type(scope): imperative English subject` (`feat`, `fix`, `refactor`, `test`, `docs`, `style`, `build`, `chore`, `perf`, `ci`). Subject ≤ 72 chars, no trailing period.
- Small, logical commits: one concern per commit; never mix refactors with features.
- Body (when needed) explains *why*, not *what*.
- Never commit secrets, `.env`, or generated artifacts.
- Commit and push only when asked.

## Definition of done

Before declaring work finished: formatter, static analysis, type check and tests pass; no unnecessary comments remain in touched files; no dead code or unused imports.

## Working agreement

- **When in doubt, ask.** Ask the user about any ambiguity (requirements, naming, design trade-offs) before implementing; do not guess.
- **Consult documentation** (official docs for Laravel, Inertia, React, Tailwind, third-party APIs) whenever unsure about an API or best practice, instead of relying on memory.
- Re-read this file whenever it changes.
