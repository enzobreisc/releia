import { ComingSoon } from '@/components/coming-soon';
import { PageHeader } from '@/components/page-header';

export default function Adicionar() {
    return (
        <>
            <PageHeader
                title="Adicionar livro"
                crumb="adicionar livro"
                description="Cadastre por ISBN, título ou manualmente"
            />
            <ComingSoon
                phase={1}
                items={[
                    'Busca por ISBN ou título na Open Library e no Google Books',
                    'Resultados com capa e metadados',
                    'Prévia editável antes de salvar',
                    'Escolha da estante',
                ]}
            />
        </>
    );
}
