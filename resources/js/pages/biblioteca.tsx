import { ComingSoon } from '@/components/coming-soon';
import { PageHeader } from '@/components/page-header';

export default function Biblioteca() {
    return (
        <>
            <PageHeader
                title="Biblioteca"
                description="Navegue e busque nos seus livros"
            />
            <ComingSoon
                phase={1}
                items={[
                    'Busca por título, autor ou ISBN (⌘F)',
                    'Filtros por gênero e ordenação',
                    'Abas por estante: lendo, quero ler, lidos e abandonados',
                    'Grade de capas',
                ]}
            />
        </>
    );
}
