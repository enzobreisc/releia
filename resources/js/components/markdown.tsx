import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

/**
 * Markdown das notas. HTML cru no texto não é renderizado (padrão do react-markdown),
 * então o conteúdo digitado não vira marcação na tela.
 */
export function Markdown({
    source,
    className,
}: {
    source: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'text-[15px] leading-relaxed text-text [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_code]:font-mono [&_code]:text-[13px] [&_h1]:mb-2 [&_h1]:font-mono [&_h1]:text-xl [&_h2]:mb-2 [&_h2]:font-mono [&_h2]:text-lg [&_h3]:mb-2 [&_h3]:font-mono [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:mb-3 [&_p:last-child]:mb-0',
                className,
            )}
        >
            <ReactMarkdown>{source}</ReactMarkdown>
        </div>
    );
}
