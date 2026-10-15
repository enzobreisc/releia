import { ComingSoon } from '@/components/coming-soon';
import { PageHeader } from '@/components/page-header';

function greeting(hour: number): string {
    if (hour >= 5 && hour < 12) {
        return 'Bom dia';
    }

    return hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Home() {
    return (
        <>
            <PageHeader
                title={greeting(new Date().getHours())}
                headTitle="Início"
                crumb="início"
                description="Um resumo rápido da sua leitura"
            />
            <ComingSoon
                phase={2}
                items={[
                    'Lendo agora, com progresso e botão para registrar leitura',
                    'Meta do ano e previsão no ritmo atual',
                    'Sugestão do dia, com o motivo',
                    'Últimos livros terminados',
                ]}
            />
        </>
    );
}
