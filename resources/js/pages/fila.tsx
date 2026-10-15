import { ComingSoon } from '@/components/coming-soon';
import { PageHeader } from '@/components/page-header';

export default function Fila() {
    return (
        <>
            <PageHeader
                title="Fila"
                description="Planeje as próximas leituras e compras"
            />
            <ComingSoon
                phase={3}
                items={[
                    'Próximos a ler, ordenados por arrastar',
                    'Estimativa de dias no seu ritmo',
                    'Lista de compras com tipo de loja e preço estimado',
                    'Total estimado da lista',
                ]}
            />
        </>
    );
}
