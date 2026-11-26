import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { buttonClass } from '@/components/form';
import { toBrowserUrl } from '../server/base-path';
import { DOWNLOAD_URL, GITHUB_URL, WELCOME_PATH } from './constants';
import { DemoMenu } from './demo-menu';
import { LanguageSwitch } from './language-switch';
import { RestoreDialog } from './restore-dialog';
import { useShellCopy } from './use-shell-copy';

const TOP_LINK_CLASS =
    'inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-bold text-secondary hover:bg-active hover:text-text';
const DOWNLOAD_CLASS = buttonClass('primary', 'h-9 px-4 text-[13px]');

export function DemoTopBar() {
    const copy = useShellCopy().topBar;
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isRestoreOpen, setRestoreOpen] = useState(false);

    return (
        <>
            <header className="hidden min-h-[52px] flex-wrap items-center gap-3.5 border-b border-strong bg-elevated px-5 py-1.5 md:flex">
                <span className="size-2 rounded-full bg-accent" />
                <p className="text-[13px] font-extrabold">
                    {copy.demo}{' '}
                    <span className="font-medium text-secondary">
                        {copy.demoNote}
                    </span>
                </p>
                <div className="flex-1" />
                <LanguageSwitch />
                <Link
                    href={toBrowserUrl(WELCOME_PATH)}
                    className={TOP_LINK_CLASS}
                >
                    {copy.about}
                </Link>
                <button
                    type="button"
                    onClick={() => setRestoreOpen(true)}
                    className={TOP_LINK_CLASS}
                >
                    {copy.restore}
                </button>
                <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={TOP_LINK_CLASS}
                >
                    {copy.github}
                </a>
                <a
                    href={DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={DOWNLOAD_CLASS}
                >
                    {copy.download}
                </a>
            </header>

            <header className="flex h-12 items-center gap-2.5 border-b border-strong bg-elevated pr-2 pl-4 md:hidden">
                <span className="size-2 rounded-full bg-accent" />
                <p className="text-xs font-extrabold">{copy.demo}</p>
                <div className="flex-1" />
                <LanguageSwitch />
                <button
                    type="button"
                    aria-label={copy.options}
                    title={copy.options}
                    onClick={() => setMenuOpen(true)}
                    className="flex size-11 items-center justify-center rounded-full text-lg text-text hover:bg-active"
                >
                    ⋯
                </button>
            </header>

            {isMenuOpen && (
                <DemoMenu
                    onClose={() => setMenuOpen(false)}
                    onRestore={() => {
                        setMenuOpen(false);
                        setRestoreOpen(true);
                    }}
                />
            )}
            {isRestoreOpen && (
                <RestoreDialog onClose={() => setRestoreOpen(false)} />
            )}
        </>
    );
}
