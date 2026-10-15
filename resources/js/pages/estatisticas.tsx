import { ComingSoon } from '@/components/coming-soon';
import { PageHeader } from '@/components/page-header';

export default function Estatisticas() {
    return (
        <>
            <PageHeader
                title="Estatísticas"
                description="Os números da sua leitura"
            />
            <ComingSoon
                phase={4}
                items={[
                    'Livros e páginas por período',
                    'Ritmo, gêneros e autores',
                    'Livros por mês',
                    'Calendário de dias lidos',
                ]}
            />
        </>
    );
}
