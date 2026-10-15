const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

/** Centavos inteiros para exibição em reais (R$ 34,90). */
export function formatBRL(cents: number): string {
    return formatter.format(cents / 100);
}
