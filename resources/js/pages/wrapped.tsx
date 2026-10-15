import { ComingSoon } from '@/components/coming-soon';
import { PageHeader } from '@/components/page-header';

export default function Wrapped() {
    return (
        <>
            <PageHeader
                title="Wrapped"
                description="A retrospectiva do seu ano de leitura"
            />
            <ComingSoon
                phase={4}
                items={[
                    'Destaque do ano e cartões',
                    'Top 5 por nota',
                    'Escolha do ano',
                    'Exportação como imagem',
                ]}
            />
        </>
    );
}
