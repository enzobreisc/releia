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
    estatisticas,
    fila,
    inicio,
    notas,
    perfil,
    sugestoes,
    wrapped,
} from '@/routes';
import type { NavItem } from '@/types';

/** Grupos da barra lateral, na ordem do escopo (seção 3). */
export const navGroups: NavItem[][] = [
    [
        { title: 'Início', href: inicio.url(), icon: HomeIcon },
        { title: 'Biblioteca', href: biblioteca.url(), icon: LibraryIcon },
        { title: 'Notas', href: notas.url(), icon: NotesIcon },
        { title: 'Fila', href: fila.url(), icon: QueueIcon },
    ],
    [
        { title: 'Perfil', href: perfil.url(), icon: ProfileIcon },
        { title: 'Estatísticas', href: estatisticas.url(), icon: StatsIcon },
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
