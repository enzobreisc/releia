import { copyFileSync, existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig, lazyPlugins } from 'vite-plus';

const repositoryRoot = fileURLToPath(new URL('./', import.meta.url));
const outputDirectory = join(repositoryRoot, 'dist-demo');
const DEMO_STATIC_FILES = [
    'favicon.ico',
    'favicon.svg',
    'apple-touch-icon.png',
];
const RESOURCES_DIRECTORY = join(repositoryRoot, 'resources/js');
const DEMO_EXPORT_FILE = join(repositoryRoot, 'demo/data/state.json');
const DEMO_BASE_PATH = '/releia';
const WAYFINDER_DIRECTORIES = ['routes', 'actions'].map((name) =>
    join(RESOURCES_DIRECTORY, name),
);
const MODULE_REPLACEMENTS: Record<string, string> = {
    [join(RESOURCES_DIRECTORY, 'components/suggestions/ai-ranking-panel.tsx')]:
        join(repositoryRoot, 'demo/src/shell/ai-ranking-panel.tsx'),
    [join(RESOURCES_DIRECTORY, 'components/profile/google-books-key-form.tsx')]:
        join(repositoryRoot, 'demo/src/shell/google-books-key-form.tsx'),
    [join(RESOURCES_DIRECTORY, 'components/mobile-menu-sheet.tsx')]: join(
        repositoryRoot,
        'demo/src/shell/mobile-menu-sheet.tsx',
    ),
};

/**
 * GitHub Pages serves 404.html for unknown paths, so a deep link such as /releia/library
 * loads the app and the router takes over. The favicons come from public/, which Vite
 * does not serve for this build.
 */
function demoStaticFiles(): Plugin {
    return {
        name: 'releia-demo-static-files',
        apply: 'build',
        closeBundle() {
            copyFileSync(
                join(outputDirectory, 'index.html'),
                join(outputDirectory, '404.html'),
            );

            for (const file of DEMO_STATIC_FILES) {
                copyFileSync(
                    join(repositoryRoot, 'public', file),
                    join(outputDirectory, file),
                );
            }
        },
    };
}

/**
 * Without the export the library would be empty, so the build would ship a demo with no books.
 * Type checks and tests do not need it, so the guard runs for the build only.
 */
function requireDemoExport(): Plugin {
    return {
        name: 'releia-demo-require-export',
        apply: 'build',
        configResolved() {
            if (!existsSync(DEMO_EXPORT_FILE)) {
                throw new Error(
                    'demo/data/state.json is missing. Run `bash demo/export/run.sh` (needs PHP and `composer install`) before `npm run demo:build`.',
                );
            }
        },
    };
}

function resolveImportTarget(
    source: string,
    importer: string | undefined,
): string | null {
    if (isAbsolute(source)) {
        return source;
    }

    if (source.startsWith('@/')) {
        return join(RESOURCES_DIRECTORY, source.slice(2));
    }

    if (importer !== undefined && source.startsWith('.')) {
        return resolve(dirname(importer), source);
    }

    return null;
}

/**
 * Wayfinder writes URLs such as "/library" for the site root. The demo is served from
 * /releia/, so its generated helpers get the base, and every rendered href follows.
 */
function demoWayfinderBasePath(): Plugin {
    return {
        name: 'releia-demo-wayfinder-base-path',
        enforce: 'pre',
        transform(code, id) {
            if (
                !WAYFINDER_DIRECTORIES.some((directory) =>
                    id.startsWith(`${directory}/`),
                )
            ) {
                return null;
            }

            return code.replace(/\burl: '\//g, `url: '${DEMO_BASE_PATH}/`);
        },
    };
}

function demoModuleReplacements(): Plugin {
    return {
        name: 'releia-demo-module-replacements',
        enforce: 'pre',
        resolveId(source, importer) {
            const target = resolveImportTarget(source, importer);

            return target === null
                ? null
                : (MODULE_REPLACEMENTS[`${target}.tsx`] ?? null);
        },
    };
}

export default defineConfig({
    root: 'demo',
    base: '/releia/',
    publicDir: false,
    plugins: lazyPlugins(() => [
        inertia(),
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
        requireDemoExport(),
        demoStaticFiles(),
        demoModuleReplacements(),
        demoWayfinderBasePath(),
    ]),
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    build: {
        outDir: outputDirectory,
        emptyOutDir: true,
    },
});
