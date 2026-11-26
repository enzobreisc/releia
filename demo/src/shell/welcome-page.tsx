import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { buttonClass } from '@/components/form';
import { LogoMark } from '@/components/icons';
import type { Locale } from '@/lib/i18n';
import { update as updateLocale } from '@/routes/locale';
import { DOWNLOAD_URL, LOCALE_TAGS } from './constants';
import { markDemoEntered } from './entry';
import { LanguageToggle } from './language-switch';
import { shellCopyFor } from './copy';
import hobbitCover from './covers/hobbit.png';
import sapiensCover from './covers/sapiens.png';
import tortoCover from './covers/torto.png';

const SHELF_COVERS = [
    { title: 'O Hobbit', src: hobbitCover, size: 'side' },
    { title: 'Torto Arado', src: tortoCover, size: 'center' },
    { title: 'Sapiens', src: sapiensCover, size: 'side' },
] as const;

const COVER_SIZE_CLASSES = {
    side: 'w-[90px] md:w-[150px]',
    center: 'w-[126px] md:w-[220px]',
} as const;

export function WelcomePage() {
    const { locale } = usePage().props;
    const [language, setLanguage] = useState<Locale>(locale);
    const copy = shellCopyFor(language);

    useEffect(() => {
        document.documentElement.lang = LOCALE_TAGS[language];
    }, [language]);

    const openDemo = () => {
        markDemoEntered();

        if (language === locale) {
            router.visit('/');

            return;
        }

        router.put(
            updateLocale.url(),
            { locale: language },
            { onSuccess: () => router.visit('/') },
        );
    };

    return (
        <div className="min-h-dvh bg-bg text-text">
            <header className="flex items-center gap-2.5 px-4.5 py-4.5 md:px-18 md:py-6.5">
                <LogoMark size={22} />
                <span className="font-brand text-[17px] font-bold">releia</span>
                <div className="flex-1" />
                <LanguageToggle value={language} onChange={setLanguage} />
            </header>

            <main className="mx-auto flex w-full max-w-340 flex-col gap-8 px-5 pt-5 pb-10 md:gap-18 md:px-18 md:pt-14 md:pb-16">
                <section className="flex flex-col gap-8 md:flex-row md:flex-wrap md:items-center md:gap-14">
                    <div className="flex min-w-0 flex-col gap-5 md:flex-1 md:basis-[460px]">
                        <h1 className="text-[36px] leading-[1.02] font-extrabold tracking-[-0.04em] md:text-[60px]">
                            {copy.welcome.headline}
                        </h1>
                        <p className="max-w-[56ch] text-base leading-[1.6] font-medium text-secondary">
                            {copy.welcome.intro}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={openDemo}
                                className={buttonClass('primary', 'h-12')}
                            >
                                {copy.welcome.open}
                            </button>
                            <a
                                href={DOWNLOAD_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonClass('ghost', 'h-12')}
                            >
                                {copy.welcome.download}
                            </a>
                        </div>
                        <span className="font-mono text-xs text-muted">
                            {copy.welcome.stack}
                        </span>
                    </div>

                    <div className="flex items-end justify-center gap-2.5 md:flex-1 md:basis-[420px] md:gap-4.5">
                        {SHELF_COVERS.map((cover) => (
                            <img
                                key={cover.title}
                                src={cover.src}
                                alt=""
                                className={`${COVER_SIZE_CLASSES[cover.size]} aspect-[2/3] rounded-cover object-cover shadow-cover`}
                            />
                        ))}
                    </div>
                </section>

                <section className="flex flex-col gap-8 md:flex-row md:flex-wrap md:gap-10">
                    {copy.welcome.points.map((point) => (
                        <div
                            key={point.title}
                            className="flex flex-col gap-2 border-t border-strong pt-4.5 md:flex-1 md:basis-[280px]"
                        >
                            <h2 className="text-[17px] font-extrabold">
                                {point.title}
                            </h2>
                            <p className="text-sm leading-[1.6] font-medium text-secondary">
                                {point.body}
                            </p>
                        </div>
                    ))}
                </section>
            </main>
        </div>
    );
}
