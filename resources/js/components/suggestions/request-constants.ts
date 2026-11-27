import type { TranslationKey } from '@/lib/i18n';

/** Matches InputLimits::SUGGESTION_TEXT on the server. */
export const SUGGESTION_TEXT_MAX_LENGTH = 200;

export const REQUEST_EXAMPLES: readonly TranslationKey[] = [
    'Mais do Dostoiévski, mas curto',
    'Orwell e Bradbury',
    'Camus até 150 páginas',
    'Sem Kafka desta vez',
];
