import { translateText, type Locale } from '@/lib/i18n';
import { isRecord } from '../support/json-fields';

type ShellCopy = {
    topBar: {
        demo: string;
        demoNote: string;
        language: string;
        about: string;
        restore: string;
        github: string;
        download: string;
        options: string;
        languageChanged: string;
    };
    menu: {
        title: string;
        close: string;
        demo: string;
        quickLog: string;
        onlyInApp: string;
    };
    restore: {
        title: string;
        body: string;
        cancel: string;
        confirm: string;
        sampleEyebrow: string;
    };
    notice: {
        howItWorks: string;
    };
    bookKeyNotice: {
        title: string;
        body: string;
    };
    suggestionRequestNotice: {
        title: string;
        body: string;
    };
    welcome: {
        headline: string;
        intro: string;
        open: string;
        download: string;
        stack: string;
        points: { title: string; body: string }[];
    };
    onlyInApp: {
        title: string;
        mobileTitle: string;
        description: string;
        mobileDescription: string;
        download: string;
        features: { title: string; body: string; visual: OnlyInAppVisual }[];
        visuals: {
            menubarTitle: string;
            menubarLog: string;
            menubarMore: string;
            lockEyebrow: string;
            lockTime: string;
            lockReading: string;
            folder: string;
            database: string;
            covers: string;
        };
    };
};

export type OnlyInAppVisual = 'menubar' | 'phone' | 'local';

/** Portuguese is the source: each string is its own key in lang/en.json. */
const SHELL_COPY_SOURCE: ShellCopy = {
    topBar: {
        demo: 'Demonstração',
        demoNote:
            '· biblioteca de exemplo, o que você mudar fica só neste navegador',
        language: 'Idioma',
        about: 'Sobre o projeto',
        restore: 'Restaurar dados',
        github: 'Código no GitHub',
        download: 'Baixar para macOS',
        options: 'Opções da demonstração',
        languageChanged: 'Idioma alterado',
    },
    menu: {
        title: 'Mais',
        close: 'Fechar',
        demo: 'Demonstração',
        quickLog: 'Leitura do dia',
        onlyInApp: 'Só no app',
    },
    restore: {
        title: 'Restaurar os dados de exemplo?',
        body: 'Os livros, sessões e notas que você criou nesta demonstração serão apagados deste navegador.',
        cancel: 'Cancelar',
        confirm: 'Restaurar',
        sampleEyebrow: 'Confirmação ao restaurar',
    },
    notice: {
        howItWorks: 'Como funciona',
    },
    bookKeyNotice: {
        title: 'Chave do Google Books: só no app',
        body: 'No app você cola a sua chave aqui e ela fica criptografada no banco local. A demonstração não pede nem guarda chaves.',
    },
    suggestionRequestNotice: {
        title: 'Nesta demonstração as sugestões já vêm prontas',
        body: 'No app, você escreve o pedido e um modelo no seu computador o transforma em busca na Open Library.',
    },
    welcome: {
        headline: 'Um catálogo dos livros físicos que você lê.',
        intro: 'releia é um app pessoal para macOS que guarda sua estante, registra cada leitura e transforma isso em estatísticas, notas e sugestões. Aqui você usa uma versão no navegador, com uma biblioteca de exemplo e sem instalar nada.',
        open: 'Abrir a demonstração',
        download: 'Baixar para macOS',
        stack: 'código aberto · Laravel · NativePHP · React · SQLite',
        points: [
            {
                title: 'Registrar sem atrapalhar a leitura',
                body: 'Sessão com cronômetro, janela na barra de menu (⌘⇧L) e o mesmo registro no celular.',
            },
            {
                title: 'Transformar páginas em ritmo',
                body: 'Meta anual, previsão, calendário de leitura e um Wrapped do ano, calculados das suas sessões.',
            },
            {
                title: 'Escolher o próximo livro, com motivo',
                body: 'As sugestões partem do que você avaliou bem ou quer ler, e cada uma diz por quê.',
            },
        ],
    },
    onlyInApp: {
        title: 'Só no app para macOS',
        mobileTitle: 'Só no app',
        description:
            'O navegador não tem barra de menu nem servidor. Veja como o app resolve.',
        mobileDescription: 'O que precisa do seu Mac',
        download: 'Baixar para macOS',
        features: [
            {
                title: 'Janela na barra de menu',
                body: '⌘⇧L abre um registro rápido por cima do que você estiver fazendo.',
                visual: 'menubar',
            },
            {
                title: 'Registro pelo celular',
                body: 'O mesmo registro vira um app na tela de início e conversa com o Mac pelo Tailscale. Há um widget de tela bloqueada.',
                visual: 'phone',
            },
            {
                title: 'Tudo no seu computador',
                body: 'Banco SQLite e capas em disco. A chave do Google Books fica criptografada no banco local.',
                visual: 'local',
            },
        ],
        visuals: {
            menubarTitle: '▪ releia  ⌘⇧L',
            menubarLog: 'Registrar',
            menubarMore: 'Brás Cubas · p. 146',
            lockEyebrow: 'Tela bloqueada',
            lockTime: '18:42',
            lockReading: 'Brás Cubas · sessão em andamento',
            folder: '~/Library/Application Support/releia',
            database: 'database/database.sqlite',
            covers: 'storage/covers/',
        },
    },
};

/** A string the translator must not look up: a visual token, not text. */
const UNTRANSLATED_KEYS: ReadonlySet<string> = new Set(['visual']);

function translateTree(locale: Locale, node: unknown, key = ''): unknown {
    if (typeof node === 'string') {
        return UNTRANSLATED_KEYS.has(key) ? node : translateText(locale, node);
    }

    if (Array.isArray(node)) {
        return node.map((item) => translateTree(locale, item));
    }

    if (isRecord(node)) {
        return Object.fromEntries(
            Object.entries(node).map(([name, child]) => [
                name,
                translateTree(locale, child, name),
            ]),
        );
    }

    return node;
}

export function shellCopyFor(locale: Locale): ShellCopy {
    return translateTree(locale, SHELL_COPY_SOURCE) as ShellCopy;
}
