import { ComingSoon } from '@/components/coming-soon';
import { PageHeader } from '@/components/page-header';

export default function Sugestoes() {
    return (
        <>
            <PageHeader
                title="Sugestões"
                description="Livros novos, sempre com o motivo"
            />
            <ComingSoon
                phase={5}
                items={[
                    'Sugestões a partir dos livros que você avaliou com 4 ou 5',
                    'Motivo e o livro que originou cada sugestão',
                    'Ações: quero ler, já li, sem interesse',
                ]}
            />
        </>
    );
}
