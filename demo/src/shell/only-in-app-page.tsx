import { cardClass } from '@/components/card';
import { buttonClass } from '@/components/form';
import { cn } from '@/lib/utils';
import { DOWNLOAD_URL } from './constants';
import type { OnlyInAppVisual } from './copy';
import { useShellCopy } from './use-shell-copy';

const SAMPLE_BOX_CLASS =
    'flex h-[150px] flex-col justify-center gap-2 rounded-sm border border-border bg-bg p-4';
const SAMPLE_PILL_CLASS =
    'inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-bold inset-ring inset-ring-strong';

/** Also the fallback for unknown addresses: the page says what the browser demo leaves out. */
export function OnlyInAppPage() {
    const copy = useShellCopy();
    const { onlyInApp, restore } = copy;

    return (
        <>
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-3xl leading-none font-extrabold tracking-tighter md:text-[44px]">
                        <span className="md:hidden">
                            {onlyInApp.mobileTitle}
                        </span>
                        <span className="hidden md:inline">
                            {onlyInApp.title}
                        </span>
                    </h1>
                    <p className="text-[15px] font-medium text-muted">
                        <span className="md:hidden">
                            {onlyInApp.mobileDescription}
                        </span>
                        <span className="hidden md:inline">
                            {onlyInApp.description}
                        </span>
                    </p>
                </div>
                <a
                    href={DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass('primary', 'hidden md:inline-flex')}
                >
                    {onlyInApp.download}
                </a>
            </header>

            <section className="grid gap-4 md:grid-cols-2">
                {onlyInApp.features.map((feature) => (
                    <article
                        key={feature.title}
                        className={cardClass('flex flex-col gap-3.5 p-4.5')}
                    >
                        <SampleVisual visual={feature.visual} />
                        <h2 className="text-[17px] font-extrabold">
                            {feature.title}
                        </h2>
                        <p className="text-[13px] leading-normal font-medium text-secondary">
                            {feature.body}
                        </p>
                    </article>
                ))}
            </section>

            <section className="flex flex-col gap-3">
                <p className="text-xs font-bold tracking-widest text-muted uppercase">
                    {restore.sampleEyebrow}
                </p>
                <div
                    aria-hidden="true"
                    className="flex w-full max-w-110 flex-col gap-3.5 rounded-md bg-elevated p-6 inset-ring inset-ring-strong"
                >
                    <p className="text-xl font-extrabold">{restore.title}</p>
                    <p className="text-sm leading-relaxed font-medium text-secondary">
                        {restore.body}
                    </p>
                    <div className="flex justify-end gap-2.5">
                        <span
                            className={cn(
                                SAMPLE_PILL_CLASS,
                                'bg-elevated text-text',
                            )}
                        >
                            {restore.cancel}
                        </span>
                        <span
                            className={cn(SAMPLE_PILL_CLASS, 'bg-text text-bg')}
                        >
                            {restore.confirm}
                        </span>
                    </div>
                </div>
            </section>
        </>
    );
}

function SampleVisual({ visual }: { visual: OnlyInAppVisual }) {
    const { visuals } = useShellCopy().onlyInApp;

    if (visual === 'menubar') {
        return (
            <div aria-hidden="true" className={SAMPLE_BOX_CLASS}>
                <span className="font-mono text-xs text-muted">
                    {visuals.menubarTitle}
                </span>
                <span className="text-[15px] font-extrabold">
                    {visuals.menubarMore}
                </span>
                <span className="flex gap-2">
                    <span className={cn(SAMPLE_PILL_CLASS, 'bg-elevated')}>
                        +10
                    </span>
                    <span className={cn(SAMPLE_PILL_CLASS, 'bg-elevated')}>
                        +20
                    </span>
                    <span className={cn(SAMPLE_PILL_CLASS, 'bg-text text-bg')}>
                        {visuals.menubarLog}
                    </span>
                </span>
            </div>
        );
    }

    if (visual === 'phone') {
        return (
            <div
                aria-hidden="true"
                className={cn(SAMPLE_BOX_CLASS, 'items-center text-center')}
            >
                <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
                    {visuals.lockEyebrow}
                </span>
                <span className="text-4xl font-extrabold">
                    {visuals.lockTime}
                </span>
                <span className="text-xs font-semibold text-secondary">
                    {visuals.lockReading}
                </span>
            </div>
        );
    }

    if (visual === 'local') {
        return (
            <div aria-hidden="true" className={cn(SAMPLE_BOX_CLASS, 'gap-2')}>
                <span className="font-mono text-[11px] text-muted">
                    {visuals.folder}
                </span>
                <span className="font-mono text-[13px]">
                    {visuals.database}
                </span>
                <span className="font-mono text-[13px]">{visuals.covers}</span>
            </div>
        );
    }

    return (
        <div aria-hidden="true" className={cn(SAMPLE_BOX_CLASS, 'gap-2')}>
            <span className="font-mono text-[13px]">
                {visuals.ollamaCommand}
            </span>
            <span className="font-mono text-[11px] text-muted">
                {visuals.ollamaStatus}
            </span>
        </div>
    );
}
