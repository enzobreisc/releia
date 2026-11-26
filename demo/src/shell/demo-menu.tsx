import { Link, usePage } from '@inertiajs/react';
import { buttonClass } from '@/components/form';
import { SidebarReadingCard } from '@/components/sidebar-reading';
import { useTranslation } from '@/hooks/use-translation';
import { navGroups } from '@/lib/navigation';
import {
    DOWNLOAD_URL,
    GITHUB_URL,
    ONLY_IN_APP_PATH,
    QUICK_LOG_PATH,
    WELCOME_PATH,
} from './constants';
import { toBrowserUrl } from '../server/base-path';
import { useEscapeKey } from './use-escape-key';
import { useShellCopy } from './use-shell-copy';

export function DemoMenu({
    onClose,
    onRestore,
}: {
    onClose: () => void;
    onRestore: () => void;
}) {
    const shell = useShellCopy();
    const copy = shell.menu;
    const topCopy = shell.topBar;
    const { t } = useTranslation();
    const { props } = usePage();

    useEscapeKey(onClose);

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={onClose}
                className="absolute inset-0 bg-bg/70"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={copy.title}
                className="relative flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-lg border-t border-strong bg-elevated px-4.5 pt-5 pb-6"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-extrabold">{copy.title}</h2>
                    <button
                        type="button"
                        aria-label={copy.close}
                        onClick={onClose}
                        className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-active hover:text-text"
                    >
                        ✕
                    </button>
                </div>

                {props.reading_now && (
                    <SidebarReadingCard
                        reading={props.reading_now}
                        hasLiveSession={props.has_live_session}
                    />
                )}
                {navGroups.map((group, index) => (
                    <div key={index} className="flex flex-col gap-2">
                        {group.title && (
                            <h3 className="text-xs font-bold text-faint">
                                {t(group.title)}
                            </h3>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            {group.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className="flex h-12 items-center gap-2.5 rounded-sm border border-border bg-surface px-3 text-sm font-semibold"
                                >
                                    <item.icon
                                        aria-hidden="true"
                                        className="size-4.5 shrink-0 text-accent"
                                    />
                                    {t(item.title)}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="flex flex-col gap-2 border-t border-strong pt-4">
                    <h3 className="text-xs font-bold text-faint">
                        {copy.demo}
                    </h3>
                    <Link
                        href={toBrowserUrl(QUICK_LOG_PATH)}
                        onClick={onClose}
                        className={buttonClass('ghost', 'w-full')}
                    >
                        {copy.quickLog}
                    </Link>
                    <Link
                        href={toBrowserUrl(ONLY_IN_APP_PATH)}
                        onClick={onClose}
                        className={buttonClass('ghost', 'w-full')}
                    >
                        {copy.onlyInApp}
                    </Link>
                    <Link
                        href={toBrowserUrl(WELCOME_PATH)}
                        onClick={onClose}
                        className={buttonClass('ghost', 'w-full')}
                    >
                        {topCopy.about}
                    </Link>
                    <button
                        type="button"
                        onClick={onRestore}
                        className={buttonClass('ghost', 'w-full')}
                    >
                        {topCopy.restore}
                    </button>
                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass('ghost', 'w-full')}
                    >
                        {topCopy.github}
                    </a>
                    <a
                        href={DOWNLOAD_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass('ghost', 'w-full')}
                    >
                        {topCopy.download}
                    </a>
                </div>
            </div>
        </div>
    );
}
