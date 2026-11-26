# Web demo

The web demo runs the same React UI in the browser against a fixed sample library. It is built from `demo/src` and `resources/js`, and its pages are checked against goldens recorded from the Laravel app, so the demo shows what the app renders.

Published at https://enzobreisc.github.io/releia/ by `.github/workflows/pages.yml` on every push to `main`.

## Fresh clone

A fresh clone has no `demo/data/state.json` and no `demo/golden/`. Both are generated, and neither is committed. Before `npm run demo:dev`, `demo:test` or `demo:build`, run:

```bash
composer install
npm ci
bash demo/export/run.sh
```

`demo:build` stops with a message when `demo/data/state.json` is missing, so it never ships an empty library. `demo:test` fails without the export because the tests read it. The type check and lint run without it. `demo/data/covers.json` is committed and is the only file under `demo/data` that is.

## Export

```bash
bash demo/export/run.sh
```

Requires PHP 8.4 with the Composer dependencies and a `.env` (copy `.env.example` and run `php artisan key:generate`).

The script migrates a throwaway SQLite database inside a temporary `releia-demo` directory, then:

- `seed.php` builds the sample library and writes `demo/data/state.json`. It reads `demo/data/covers.json`, which pins the Open Library cover URL of each book, so covers are not searched again on every run. The cover images are not fetched: the seed fakes that download, and the demo links to the remote URL.
- `dump.php` renders each page as Inertia JSON into `demo/golden/pt-BR` and `demo/golden/en`, and writes `demo/golden/manifest.json`.
- `scenarios.php` plays the user flows (add, read, shop, undo) against the app and writes `demo/golden/scenarios.json` and `demo/golden/scenarios/`.

The output is deterministic: the clock is fixed, Faker is seeded and the Inertia version is pinned in `demo/export/support.php`. Running the script twice gives the same files, so a diff after a run means the sample data or the app's rendering changed. Review it before committing.

## Test

```bash
npm run demo:test
```

Vitest runs `demo/tests`. The golden tests render every page from `demo/data/state.json` and compare it with `demo/golden`; the scenario tests replay `demo/golden/scenarios.json` step by step. Run the export first when the app or the sample data changed.

## Build

```bash
npm run demo:build     # writes dist-demo/, served under /releia/
npm run demo:dev       # local dev server
npm run demo:preview   # serves dist-demo/ after a build
```

The build sets the base path to `/releia/` and copies `index.html` to `404.html`, so deep links work on GitHub Pages.

## CI

`.github/workflows/pages.yml` runs, in order: `composer install`, `.env` and key, `npm ci`, `demo/export/run.sh`, `php artisan wayfinder:generate --with-form`, `npm run types:check`, `npm run demo:test`, `npm run demo:build`, and then deploys `dist-demo` to GitHub Pages.
