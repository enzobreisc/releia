import { router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { DatePicker } from '@/components/date-picker';
import { Dialog, DialogChoice, DialogList } from '@/components/dialog';
import { Button, Input } from '@/components/form';
import { StarRating } from '@/components/star-rating';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { destroy as destroyBook, reread } from '@/routes/books';
import {
    abandon,
    dates,
    destroy as destroyReading,
    finish,
    reopen,
} from '@/routes/readings';
import type { ReadingHistory } from '@/types';

const options = { preserveScroll: true };

/** Days between two "YYYY-MM-DD" dates, counting both ends. */
function daysBetween(start: string, end: string): number {
    const ms =
        new Date(`${end}T12:00:00`).getTime() -
        new Date(`${start}T12:00:00`).getTime();

    return Math.round(ms / 86_400_000) + 1;
}

function DangerButton({
    children,
    onClick,
    disabled,
}: {
    children: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <Button
            variant="danger"
            onClick={onClick}
            disabled={disabled}
            className="h-10 text-[13px]"
        >
            {children}
        </Button>
    );
}

function CancelButton({
    onClick,
    autoFocus = false,
}: {
    onClick: () => void;
    autoFocus?: boolean;
}) {
    const { t } = useTranslation();

    return (
        <Button
            variant="ghost"
            autoFocus={autoFocus}
            onClick={onClick}
            className="h-10 bg-elevated text-[13px]"
        >
            {t('Cancelar')}
        </Button>
    );
}

function Chip({
    label,
    selected,
    onClick,
    tone = 'blue',
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
    tone?: 'blue' | 'warn';
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'h-9 rounded-full px-3.5 text-[13px] font-bold inset-ring',
                selected
                    ? tone === 'warn'
                        ? 'bg-warn-fill text-warn inset-ring-warn'
                        : 'bg-active text-text inset-ring-primary'
                    : 'text-secondary inset-ring-strong hover:bg-active',
            )}
        >
            {label}
        </button>
    );
}

/** ⌘↵ submits the dialog from any field. */
function useSubmitShortcut(submit: () => void, enabled: boolean) {
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (enabled && event.metaKey && event.key === 'Enter') {
                event.preventDefault();
                submit();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [submit, enabled]);
}

/**
 * Finish and rate: end date, rating and a one-line review.
 * "Skip" marks it as read today, without a rating.
 */
export function FinishDialog({
    title,
    reading,
    previous,
    onClose,
}: {
    title: string;
    reading: ReadingHistory;
    /** Previous finished reading, for comparison ("the 1st time it took 9 days"). */
    previous: ReadingHistory | null;
    onClose: () => void;
}) {
    const { t, plural, shortDate, ordinal } = useTranslation();
    const [choice, setChoice] = useState<
        'today' | 'yesterday' | 'other' | 'undated'
    >('today');
    const form = useForm({
        finished_on: today(),
        rating: reading.rating ?? 0,
        line: '',
    });

    const undated = choice === 'undated';
    const date = undated
        ? null
        : choice === 'today'
          ? today()
          : choice === 'yesterday'
            ? today(-1)
            : form.data.finished_on;
    const minimum = [reading.started_at, reading.last_session_on]
        .filter((value): value is string => value !== null)
        .sort()
        .at(-1);
    const clientError =
        date === null
            ? null
            : date > today()
              ? t('O término não pode ser depois de hoje.')
              : minimum && date < minimum
                ? reading.last_session_on === minimum
                    ? t(
                          'A última sessão foi em :date. Escolha essa data ou depois.',
                          { date: shortDate(minimum) },
                      )
                    : t(
                          'A leitura começou em :date. Escolha essa data ou depois.',
                          { date: shortDate(minimum) },
                      )
                : null;
    const days =
        reading.started_at && date !== null
            ? daysBetween(reading.started_at, date)
            : null;
    const pace =
        days && reading.current_page
            ? Math.round(reading.current_page / days)
            : null;

    function save() {
        if (clientError) {
            return;
        }

        form.transform((data) => ({
            ...data,
            finished_on: date,
            undated,
            rating: data.rating || null,
        }));
        form.post(finish(reading.id).url, { ...options, onSuccess: onClose });
    }

    function skip() {
        router.post(
            finish(reading.id).url,
            { finished_on: today() },
            { ...options, onSuccess: onClose },
        );
    }

    useSubmitShortcut(save, !form.processing);

    return (
        <Dialog
            title={`## ${t('terminou :title', { title })}`}
            onClose={onClose}
        >
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-sm bg-bg px-3 py-2.5 font-mono text-xs text-nav">
                {days !== null && <span>{plural(days, 'dia', 'dias')}</span>}
                <span>
                    {plural(reading.sessions_count, 'sessão', 'sessões')}
                </span>
                {pace !== null && (
                    <span>{t(':pages págs/dia', { pages: pace })}</span>
                )}
                {previous?.days && (
                    <span className="text-muted">
                        {t('da :ordinal vez: :duration', {
                            ordinal: ordinal(previous.number, 'feminine'),
                            duration: plural(previous.days, 'dia', 'dias'),
                        })}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">{t('Terminou em')}</span>
                <div className="flex flex-wrap gap-1.5">
                    <Chip
                        label={t('hoje')}
                        selected={choice === 'today'}
                        onClick={() => setChoice('today')}
                    />
                    <Chip
                        label={t('ontem')}
                        selected={choice === 'yesterday'}
                        onClick={() => setChoice('yesterday')}
                    />
                    <Chip
                        label={t('outra data…')}
                        selected={choice === 'other'}
                        onClick={() => setChoice('other')}
                    />
                    <Chip
                        label={t('sem data')}
                        selected={undated}
                        onClick={() => setChoice('undated')}
                    />
                </div>
                {choice === 'other' && (
                    <DatePicker
                        aria-label={t('Data de término')}
                        max={today()}
                        min={minimum}
                        value={form.data.finished_on}
                        onChange={(value) => form.setData('finished_on', value)}
                        className={cn(
                            'h-10 bg-bg',
                            clientError && 'inset-ring-danger-line',
                        )}
                    />
                )}
                {undated && (
                    <span className="text-[11px] text-faint">
                        {t(
                            'Fica como lido, mas não entra nas estatísticas por período nem na meta do ano.',
                        )}
                    </span>
                )}
                {(clientError ?? form.errors.finished_on) && (
                    <span role="alert" className="text-xs text-danger">
                        {clientError ?? form.errors.finished_on}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-xs text-muted">{t('Sua nota')}</span>
                <StarRating
                    value={form.data.rating || null}
                    onChange={(value) => form.setData('rating', value ?? 0)}
                />
            </div>

            <label className="flex flex-col gap-1.5 text-xs text-muted">
                {t('Em uma linha (opcional)')}
                <Input
                    value={form.data.line}
                    maxLength={280}
                    onChange={(event) =>
                        form.setData('line', event.target.value)
                    }
                    placeholder={t('O que ficou do livro?')}
                    className="h-10.5 bg-bg text-sm"
                />
                <span className="text-[11px] text-faint">
                    {t(
                        'Vira o começo da resenha. A resenha completa fica na aba Resenha.',
                    )}
                </span>
            </label>

            <div className="flex items-center justify-between gap-2">
                <Button
                    variant="ghost"
                    onClick={skip}
                    disabled={form.processing}
                    className="h-10 border-transparent bg-transparent text-[13px] text-muted"
                >
                    {t('Pular')}
                </Button>
                <Button
                    autoFocus
                    onClick={save}
                    disabled={form.processing || clientError !== null}
                    className="h-10 text-[13px]"
                >
                    {form.processing ? t('Salvando…') : t('Salvar')}
                    <span className="font-mono text-[11px] opacity-85">⌘↵</span>
                </Button>
            </div>
        </Dialog>
    );
}

const REASONS: TranslationKey[] = [
    'não prendeu',
    'sem tempo agora',
    'não era o momento',
];

const OTHER_REASON: TranslationKey = 'outro';

/** Abandon: optional reason and, if wanted, a rating. The page is kept. */
export function AbandonDialog({
    title,
    reading,
    pages,
    onClose,
}: {
    title: string;
    reading: ReadingHistory;
    pages: number | null;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [choice, setChoice] = useState<TranslationKey | null>(null);
    const [other, setOther] = useState('');
    const [rate, setRate] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);
    const percent = pages
        ? Math.round((reading.current_page / pages) * 100)
        : null;

    function submit() {
        router.post(
            abandon(reading.id).url,
            {
                reason:
                    choice === OTHER_REASON
                        ? other.trim() || null
                        : choice && t(choice),
                rating: rate ? rating : null,
            },
            {
                ...options,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: onClose,
            },
        );
    }

    return (
        <Dialog
            title={`## ${t('abandonar :title?', { title })}`}
            onClose={onClose}
        >
            <p className="text-sm leading-relaxed text-secondary">
                {t('Você parou na p. :page.', {
                    page: `${reading.current_page}${pages ? ` ${t('de')} ${pages}` : ''}${percent !== null ? ` (${percent}%)` : ''}`,
                })}{' '}
                {t('A página fica guardada para retomar.')}
            </p>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">
                    {t('Por quê? (opcional)')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                    {[...REASONS, OTHER_REASON].map((reason) => (
                        <Chip
                            key={reason}
                            label={t(reason)}
                            tone="warn"
                            selected={choice === reason}
                            onClick={() =>
                                setChoice(choice === reason ? null : reason)
                            }
                        />
                    ))}
                </div>
                {choice === OTHER_REASON && (
                    <Input
                        autoFocus
                        aria-label={t('Outro motivo')}
                        maxLength={120}
                        value={other}
                        onChange={(event) => setOther(event.target.value)}
                        placeholder={t('Conte em poucas palavras')}
                        className="h-10 bg-bg"
                    />
                )}
            </div>
            <label className="flex items-center gap-2 text-[13px] text-secondary">
                <input
                    type="checkbox"
                    checked={rate}
                    onChange={(event) => setRate(event.target.checked)}
                    className="size-4 accent-primary"
                />
                {t('Dar uma nota mesmo assim')}
            </label>
            {rate && <StarRating value={rating} onChange={setRating} />}
            <div className="flex justify-end gap-2">
                <CancelButton onClick={onClose} />
                <Button
                    variant="ghost"
                    autoFocus
                    onClick={submit}
                    disabled={processing}
                    className="h-10 bg-warn-fill text-[13px] text-warn inset-ring-warn-line hover:bg-warn-fill/80"
                >
                    {t('Abandonar')}
                </Button>
            </div>
        </Dialog>
    );
}

/** Read again: today or later (want to read, at the end of the queue). */
export function RereadDialog({
    bookId,
    onClose,
}: {
    bookId: number;
    onClose: () => void;
}) {
    const { t } = useTranslation();

    function start(status: 'reading' | 'want_to_read') {
        router.post(
            reread(bookId).url,
            { status },
            { ...options, onSuccess: onClose },
        );
    }

    return (
        <Dialog title={`## ${t('ler de novo')}`} onClose={onClose}>
            <p className="text-sm leading-relaxed text-secondary">
                {t(
                    'Uma nova leitura, com sessões, nota e resenha próprias. A anterior fica no histórico.',
                )}
            </p>
            <DialogChoice
                autoFocus
                recommended
                title={t('Começar hoje')}
                description={t('Vai para Lendo, a partir da p. 0.')}
                onClick={() => start('reading')}
            />
            <DialogChoice
                title={t('Quero reler depois')}
                description={t('Vai para Quero ler e entra no fim da fila.')}
                onClick={() => start('want_to_read')}
            />
            <div className="flex justify-end">
                <CancelButton onClick={onClose} />
            </div>
        </Dialog>
    );
}

/** Read → Reading: read again (default) or fix a wrong mark. */
export function BackToReadingDialog({
    title,
    reading,
    onReread,
    onCorrect,
    onClose,
}: {
    title: string;
    reading: ReadingHistory;
    onReread: () => void;
    onCorrect: () => void;
    onClose: () => void;
}) {
    const { t, plural, shortDate, ordinal } = useTranslation();
    const summary = [
        reading.days && plural(reading.days, 'dia', 'dias'),
        reading.rating && '★'.repeat(reading.rating),
    ]
        .filter(Boolean)
        .join(', ');

    return (
        <Dialog
            title={`## ${t('voltar a ler :title?', { title })}`}
            onClose={onClose}
        >
            <p className="text-sm leading-relaxed text-secondary">
                {reading.finished_at
                    ? t(
                          'Você terminou este livro em :date. O que quer fazer?',
                          {
                              date: shortDate(reading.finished_at),
                          },
                      )
                    : t('Você terminou este livro. O que quer fazer?')}
            </p>
            <DialogChoice
                autoFocus
                recommended
                title={t('Ler de novo')}
                badge={t('recomendado')}
                description={t(
                    'Começa uma :next leitura hoje, da página 0. A :current:summary fica guardada no histórico.',
                    {
                        next: ordinal(reading.number + 1, 'feminine'),
                        current: ordinal(reading.number, 'feminine'),
                        summary: summary ? ` (${summary})` : '',
                    },
                )}
                onClick={onReread}
            />
            <DialogChoice
                title={t('Corrigir: ainda não terminei')}
                description={t(
                    'Reabre a mesma leitura na p. :page e apaga a data de término. Use se marcou como lido por engano.',
                    { page: reading.current_page },
                )}
                onClick={onCorrect}
            />
            <div className="flex justify-end">
                <CancelButton onClick={onClose} />
            </div>
        </Dialog>
    );
}

/** Fix: the only path that clears the end date. */
export function CorrectDialog({
    reading,
    onClose,
}: {
    reading: ReadingHistory;
    onClose: () => void;
}) {
    const { t, shortDate } = useTranslation();
    const year = reading.finished_at?.slice(0, 4);

    return (
        <Dialog title={`## ${t('desmarcar como lido?')}`} onClose={onClose}>
            <p className="text-sm leading-relaxed text-secondary">
                {t('A leitura volta para Lendo, na p. :page. Isto apaga:', {
                    page: reading.current_page,
                })}
            </p>
            <DialogList
                items={[
                    reading.finished_at
                        ? t('a data de término (:date)', {
                              date: shortDate(reading.finished_at),
                          })
                        : t('a data de término'),
                    t('a contagem do livro nos lidos de :year', {
                        year: year ?? t('seu ano'),
                    }),
                ]}
            />
            <p className="text-xs text-muted">
                {t(
                    'Nota, resenha e sessões continuam. Para ler o livro outra vez, use "Ler de novo".',
                )}
            </p>
            <div className="flex justify-end gap-2">
                <CancelButton autoFocus onClick={onClose} />
                <DangerButton
                    onClick={() =>
                        router.post(
                            reopen(reading.id).url,
                            {},
                            {
                                ...options,
                                onSuccess: onClose,
                            },
                        )
                    }
                >
                    {t('Desmarcar como lido')}
                </DangerButton>
            </div>
        </Dialog>
    );
}

/**
 * Reading dates. Reading: start only. Read or abandoned: start and end.
 * Sessions outside the period do not block: the notice offers the fix.
 */
export function DatesDialog({
    reading,
    onClose,
}: {
    reading: ReadingHistory;
    onClose: () => void;
}) {
    const { t, plural, shortDate, ordinal } = useTranslation();
    const closed = reading.status === 'read' || reading.status === 'abandoned';
    // Only a read reading can have no dates (read long ago).
    const canBeUndated = reading.status === 'read';
    const form = useForm({
        started_at:
            reading.started_at ??
            (canBeUndated && reading.finished_at === null ? '' : today()),
        finished_at: reading.finished_at ?? '',
        undated: canBeUndated && reading.finished_at === null,
    });
    const { started_at: start, finished_at: end, undated } = form.data;

    const error = undated
        ? null
        : closed
          ? end === ''
              ? t('Informe o término.')
              : end > today()
                ? t('O término não pode ser depois de hoje (:date).', {
                      date: shortDate(today()),
                  })
                : end < start
                  ? t('O término não pode ser antes do início.')
                  : reading.last_session_on && end < reading.last_session_on
                    ? t(
                          'A última sessão foi em :date. Escolha essa data ou depois.',
                          { date: shortDate(reading.last_session_on) },
                      )
                    : null
          : start > today()
            ? t('O início não pode ser depois de hoje.')
            : null;
    const earlySessions =
        start !== '' &&
        reading.first_session_on &&
        reading.first_session_on < start
            ? reading.sessions.filter((session) => session.read_on < start)
            : [];

    function save(event?: FormEvent) {
        event?.preventDefault();

        if (error) {
            return;
        }

        form.transform((data) => ({
            started_at: data.started_at || null,
            finished_at: closed && !data.undated ? data.finished_at : null,
        }));
        form.patch(dates(reading.id).url, { ...options, onSuccess: onClose });
    }

    return (
        <Dialog
            title={`## ${t('datas da :ordinal leitura', { ordinal: ordinal(reading.number, 'feminine') })}`}
            onClose={onClose}
        >
            <form onSubmit={save} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 text-xs text-muted">
                        {t('Começou em')}
                        <DatePicker
                            aria-label={t('Data de início')}
                            max={today()}
                            clearable={undated}
                            value={start}
                            onChange={(value) =>
                                form.setData('started_at', value)
                            }
                            className={cn(
                                'h-10.5 bg-bg text-sm',
                                earlySessions.length > 0 && 'inset-ring-warn',
                            )}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs text-muted">
                        {t('Terminou em')}
                        <DatePicker
                            aria-label={t('Data de término')}
                            max={today()}
                            disabled={!closed || undated}
                            value={closed && !undated ? end : ''}
                            onChange={(value) =>
                                form.setData('finished_at', value)
                            }
                            className={cn(
                                'h-10.5 bg-bg text-sm',
                                closed && error && 'inset-ring-danger-line',
                            )}
                        />
                    </div>
                </div>

                {canBeUndated && (
                    <label className="flex items-center gap-2 text-xs text-muted">
                        <input
                            type="checkbox"
                            checked={undated}
                            onChange={(event) =>
                                form.setData('undated', event.target.checked)
                            }
                            className="accent-primary"
                        />
                        {t('Sem data de término (lido há muito tempo)')}
                    </label>
                )}

                {earlySessions.length > 0 && reading.first_session_on && (
                    <div className="flex flex-col items-start gap-2 rounded-sm bg-warn-fill px-3.5 py-3 text-xs leading-relaxed text-warn inset-ring inset-ring-warn-line">
                        <span>
                            {t(':sessions antes do novo início (:date).', {
                                sessions: plural(
                                    earlySessions.length,
                                    'sessão fica',
                                    'sessões ficam',
                                ),
                                date: shortDate(start),
                            })}
                        </span>
                        <Button
                            variant="ghost"
                            onClick={() =>
                                form.setData(
                                    'started_at',
                                    reading.first_session_on!,
                                )
                            }
                            className="h-8 px-3.5 text-xs text-warn inset-ring-warn-line"
                        >
                            {t('Usar :date como início', {
                                date: shortDate(reading.first_session_on),
                            })}
                        </Button>
                    </div>
                )}

                {(error ??
                    form.errors.started_at ??
                    form.errors.finished_at) && (
                    <span role="alert" className="text-xs text-danger">
                        {error ??
                            form.errors.started_at ??
                            form.errors.finished_at}
                    </span>
                )}

                {!error && earlySessions.length === 0 && closed && (
                    <span className="text-xs text-muted">
                        {t(':days · :sessions dentro do período', {
                            days: plural(
                                daysBetween(start, end),
                                'dia',
                                'dias',
                            ),
                            sessions: plural(
                                reading.sessions_count,
                                'sessão',
                                'sessões',
                            ),
                        })}
                    </span>
                )}

                <div className="flex justify-end gap-2">
                    <CancelButton onClick={onClose} />
                    <Button
                        type="submit"
                        autoFocus
                        disabled={form.processing || error !== null}
                        className="h-10 text-[13px]"
                    >
                        {t('Salvar datas')}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

export type Removal = {
    readings: number;
    finished: number;
    sessions: number;
    pages: number;
    notes: number;
};

/** Remove book: says what goes with it. There is no undo. */
export function RemoveBookDialog({
    bookId,
    title,
    removal,
    queued,
    onClose,
}: {
    bookId: number;
    title: string;
    removal: Removal;
    queued: boolean;
    onClose: () => void;
}) {
    const { t, plural } = useTranslation();
    const items = [
        removal.readings > 1
            ? t(':readings (:finished)', {
                  readings: plural(removal.readings, 'leitura', 'leituras'),
                  finished: plural(removal.finished, 'terminada', 'terminadas'),
              })
            : plural(removal.readings, 'leitura', 'leituras'),
        removal.sessions > 0 &&
            `${plural(removal.sessions, 'sessão', 'sessões')} · ${plural(removal.pages, 'página', 'páginas')}`,
        removal.notes > 0 && plural(removal.notes, 'nota', 'notas'),
        queued && t('a posição na fila'),
    ].filter((item): item is string => typeof item === 'string');

    return (
        <Dialog title={`## ${t('remover livro?')}`} onClose={onClose}>
            <p className="text-sm leading-relaxed text-secondary">
                {t(
                    ':title sai da biblioteca junto com tudo o que foi registrado nele:',
                    { title },
                )}
            </p>
            <DialogList items={items} />
            <p className="text-xs text-muted">
                {t('Não dá para desfazer.')}
                {removal.finished > 0 &&
                    ` ${t('As estatísticas dos anos em que você leu este livro vão mudar.')}`}
            </p>
            <div className="flex justify-end gap-2">
                <CancelButton autoFocus onClick={onClose} />
                <DangerButton onClick={() => router.visit(destroyBook(bookId))}>
                    {t('Remover livro')}
                </DangerButton>
            </div>
        </Dialog>
    );
}

/** Deletes a reading from the history, with its sessions. */
export function DeleteReadingDialog({
    reading,
    title,
    onClose,
}: {
    reading: ReadingHistory;
    title: string;
    onClose: () => void;
}) {
    const { t, plural, ordinal } = useTranslation();
    const readingOrdinal = ordinal(reading.number, 'feminine');

    return (
        <Dialog
            title={`## ${t('apagar a :ordinal leitura?', { ordinal: readingOrdinal })}`}
            onClose={onClose}
        >
            <p className="text-sm leading-relaxed text-secondary">
                {t('A :ordinal leitura de :title sai do histórico com:', {
                    ordinal: readingOrdinal,
                    title,
                })}
            </p>
            <DialogList
                items={[
                    plural(reading.sessions_count, 'sessão', 'sessões'),
                    reading.rating
                        ? t('a nota (:stars)', {
                              stars: '★'.repeat(reading.rating),
                          })
                        : t('sem nota'),
                    reading.review ? t('a resenha') : t('sem resenha'),
                ]}
            />
            <div className="flex justify-end gap-2">
                <CancelButton autoFocus onClick={onClose} />
                <DangerButton
                    onClick={() =>
                        router.visit(destroyReading(reading.id), {
                            ...options,
                            onSuccess: onClose,
                        })
                    }
                >
                    {t('Apagar leitura')}
                </DangerButton>
            </div>
        </Dialog>
    );
}
