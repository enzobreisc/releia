import { ComingSoon } from '@/components/coming-soon';
import { PageHeader } from '@/components/page-header';

export default function Perfil() {
    return (
        <>
            <PageHeader title="Perfil" description="Sua identidade de leitor" />
            <ComingSoon
                phase={4}
                items={[
                    'Livros fixados',
                    'Mapa de calor do ano',
                    'Atividade recente',
                    'Sequência de dias lendo',
                ]}
            />
        </>
    );
}
