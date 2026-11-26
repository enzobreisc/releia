// Every other module in this folder registers its routes when it is loaded.
import.meta.glob(['./*.ts', '!./index.ts'], {
    eager: true,
});
