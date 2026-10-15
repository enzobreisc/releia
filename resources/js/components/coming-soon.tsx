import { SectionTitle } from '@/components/page-header';

type ComingSoonProps = {
    phase: number;
    items: string[];
};

/** Tela ainda vazia: lista o que ela vai ter e em qual fase entra. */
export function ComingSoon({ phase, items }: ComingSoonProps) {
    return (
        <section className="flex flex-col gap-4 rounded-md border bg-surface p-5">
            <SectionTitle>{`em breve · fase ${phase}`}</SectionTitle>
            <ul className="flex flex-col gap-2 text-sm text-muted">
                {items.map((item) => (
                    <li key={item} className="flex gap-2">
                        <span className="font-mono text-faint">-</span>
                        {item}
                    </li>
                ))}
            </ul>
        </section>
    );
}
