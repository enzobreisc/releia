import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

const demoRoot = fileURLToPath(new URL('../', import.meta.url));
const resourcesRoot = fileURLToPath(
    new URL('../../resources/js', import.meta.url),
);

/**
 * Runs the demo's fake server in Node. Only the aliases and Vite's import.meta
 * helpers the server code uses are set up; no UI plugins are loaded.
 */
export default defineConfig({
    root: demoRoot,
    base: '/releia/',
    resolve: {
        alias: {
            '@': resourcesRoot,
        },
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
    },
});
