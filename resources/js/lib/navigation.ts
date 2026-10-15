import {
    HomeIcon,
    LibraryIcon,
    NotesIcon,
    PlusIcon,
    ProfileIcon,
    QueueIcon,
    SparkleIcon,
    StatsIcon,
    WrappedIcon,
} from '@/components/icons';
import {
    adicionar,
    biblioteca,
    fila,
    inicio,
    notas,
    sugestoes,
} from '@/routes';
import { show as profile } from '@/routes/profile';
import { index as stats } from '@/routes/stats';
import { show as wrapped } from '@/routes/wrapped';
import type { NavItem } from '@/types';

/** Grupos da barra lateral, na ordem do escopo (seção 3). */
export const navGroups: NavItem[][] = [
    [
        { title: 'Início', href: inicio.url(), icon: HomeIcon },
        {
            title: 'Biblioteca',
            href: biblioteca.url(),
            icon: LibraryIcon,
            count: 'books',
        },
        { title: 'Notas', href: notas.url(), icon: NotesIcon },
        { title: 'Fila', href: fila.url(), icon: QueueIcon },
    ],
    [
        { title: 'Perfil', href: profile.url(), icon: ProfileIcon },
        { title: 'Estatísticas', href: stats.url(), icon: StatsIcon },
        { title: 'Wrapped', href: wrapped.url(), icon: WrappedIcon },
    ],
    [{ title: 'Sugestões', href: sugestoes.url(), icon: SparkleIcon }],
];

export const addBookItem: NavItem = {
    title: 'Adicionar livro',
    href: adicionar.url(),
    icon: PlusIcon,
};

/** Tudo o que o "Ir para" (⌘P) encontra. Livros entram na fase 1. */
export const commandItems: NavItem[] = [...navGroups.flat(), addBookItem];

export function isActive(currentUrl: string, href: string): boolean {
    const path = currentUrl.split('?')[0];

    return href === '/' ? path === '/' : path.startsWith(href);
}
