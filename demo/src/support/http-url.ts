export function isHttpUrl(text: string): boolean {
    try {
        const { protocol } = new URL(text);

        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
}
