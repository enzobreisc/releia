import { ComingSoon } from '@/components/coming-soon';
import { PageHeader } from '@/components/page-header';

export default function Notas() {
    return (
        <>
            <PageHeader
                title="Notas"
                description="Guarde trechos e ideias por livro"
            />
            <ComingSoon
                phase={3}
                items={[
                    'Trechos, reflexões e citações em Markdown',
                    'Tags no formato #tag',
                    'Busca (⌘F)',
                    'Revisão do dia com trechos antigos',
                ]}
            />
        </>
    );
}
