import { router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { DatePicker } from '@/components/date-picker';
import { Dialog, DialogChoice, DialogList } from '@/components/dialog';
import { Button, Input } from '@/components/form';
import { StarRating } from '@/components/star-rating';
import { plural, shortDate, today } from '@/lib/dates';
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

/** Dias entre duas datas "AAAA-MM-DD", contando as duas pontas. */
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
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="h-10 rounded-sm bg-danger-fill px-4 text-[13px] font-semibold text-white hover:bg-danger-fill/90 disabled:opacity-60"
        >
            {children}
        </button>
    );
}

function CancelButton({
    onClick,
    autoFocus = false,
}: {
    onClick: () => void;
    autoFocus?: boolean;
}) {
    return (
        <Button
            variant="ghost"
            autoFocus={autoFocus}
            onClick={onClick}
            className="h-10 bg-elevated text-[13px]"
        >
            Cancelar
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
                'h-9 rounded-full border px-3 text-[13px]',
                selected
                    ? tone === 'warn'
                        ? 'border-warn bg-warn-fill'
                        : 'border-primary bg-active'
                    : 'hover:bg-active',
            )}
        >
            {label}
        </button>
    );
}

/** ⌘↵ envia o diálogo de qualquer campo. */
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
 * Terminar e avaliar (D5): data de término, nota e uma linha de resenha.
 * "Pular" marca como lido hoje, sem nota.
 */
export function FinishDialog({
    title,
    reading,
    previous,
    onClose,
}: {
    title: string;
    reading: ReadingHistory;
    /** Leitura anterior terminada, para comparar ("da 1ª vez você levou 9 dias"). */
    previous: ReadingHistory | null;
    onClose: () => void;
}) {
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
              ? 'O término não pode ser depois de hoje.'
              : minimum && date < minimum
                ? `${reading.last_session_on === minimum ? 'A última sessão foi' : 'A leitura começou'} em ${shortDate(minimum)}. Escolha essa data ou depois.`
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
        <Dialog title={`## terminou ${title}`} onClose={onClose}>
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-sm bg-bg px-3 py-2.5 font-mono text-xs text-nav">
                {days !== null && <span>{plural(days, 'dia', 'dias')}</span>}
                <span>
                    {plural(reading.sessions_count, 'sessão', 'sessões')}
                </span>
                {pace !== null && <span>{pace} págs/dia</span>}
                {previous?.days && (
                    <span className="text-muted">
                        da {previous.number}ª vez: {previous.days} dias
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Terminou em</span>
                <div className="flex flex-wrap gap-1.5">
                    <Chip
                        label="hoje"
                        selected={choice === 'today'}
                        onClick={() => setChoice('today')}
                    />
                    <Chip
                        label="ontem"
                        selected={choice === 'yesterday'}
                        onClick={() => setChoice('yesterday')}
                    />
                    <Chip
                        label="outra data…"
                        selected={choice === 'other'}
                        onClick={() => setChoice('other')}
                    />
                    <Chip
                        label="sem data"
                        selected={undated}
                        onClick={() => setChoice('undated')}
                    />
                </div>
                {choice === 'other' && (
                    <DatePicker
                        aria-label="Data de término"
                        max={today()}
                        min={minimum}
                        value={form.data.finished_on}
                        onChange={(value) => form.setData('finished_on', value)}
                        className={cn(
                            'h-10 bg-bg',
                            clientError && 'border-danger-line',
                        )}
                    />
                )}
                {undated && (
                    <span className="text-[11px] text-faint">
                        Fica como lido, mas não entra nas estatísticas por
                        período nem na meta do ano.
                    </span>
                )}
                {(clientError ?? form.errors.finished_on) && (
                    <span role="alert" className="text-xs text-danger">
                        {clientError ?? form.errors.finished_on}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-xs text-muted">Sua nota</span>
                <StarRating
                    value={form.data.rating || null}
                    onChange={(value) => form.setData('rating', value ?? 0)}
                />
            </div>

            <label className="flex flex-col gap-1.5 text-xs text-muted">
                Em uma linha (opcional)
                <Input
                    value={form.data.line}
                    maxLength={280}
                    onChange={(event) =>
                        form.setData('line', event.target.value)
                    }
                    placeholder="O que ficou do livro?"
                    className="h-10.5 bg-bg text-sm"
                />
                <span className="text-[11px] text-faint">
                    Vira o começo da resenha. A resenha completa fica na aba
                    Resenha.
                </span>
            </label>

            <div className="flex items-center justify-between gap-2">
                <Button
                    variant="ghost"
                    onClick={skip}
                    disabled={form.processing}
                    className="h-10 border-transparent bg-transparent text-[13px] text-muted"
                >
                    Pular
                </Button>
                <Button
                    autoFocus
                    onClick={save}
                    disabled={form.processing || clientError !== null}
                    className="h-10 text-[13px]"
                >
                    {form.processing ? 'Salvando…' : 'Salvar'}
                    <span className="font-mono text-[11px] opacity-85">⌘↵</span>
                </Button>
            </div>
        </Dialog>
    );
}

const REASONS = ['não prendeu', 'sem tempo agora', 'não era o momento'];

/** Abandonar (D6): motivo opcional e, se quiser, uma nota. A página fica guardada. */
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
    const [choice, setChoice] = useState<string | null>(null);
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
                reason: choice === 'outro' ? other.trim() || null : choice,
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
        <Dialog title={`## abandonar ${title}?`} onClose={onClose}>
            <p className="text-sm leading-relaxed text-[#c9d3e3]">
                Você parou na p. {reading.current_page}
                {pages ? ` de ${pages}` : ''}
                {percent !== null ? ` (${percent}%)` : ''}. A página fica
                guardada para retomar.
            </p>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Por quê? (opcional)</span>
                <div className="flex flex-wrap gap-1.5">
                    {[...REASONS, 'outro'].map((reason) => (
                        <Chip
                            key={reason}
                            label={reason}
                            tone="warn"
                            selected={choice === reason}
                            onClick={() =>
                                setChoice(choice === reason ? null : reason)
                            }
                        />
                    ))}
                </div>
                {choice === 'outro' && (
                    <Input
                        autoFocus
                        aria-label="Outro motivo"
                        maxLength={120}
                        value={other}
                        onChange={(event) => setOther(event.target.value)}
                        placeholder="Conte em poucas palavras"
                        className="h-10 bg-bg"
                    />
                )}
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#c9d3e3]">
                <input
                    type="checkbox"
                    checked={rate}
                    onChange={(event) => setRate(event.target.checked)}
                    className="size-4 accent-primary"
                />
                Dar uma nota mesmo assim
            </label>
            {rate && <StarRating value={rating} onChange={setRating} />}
            <div className="flex justify-end gap-2">
                <CancelButton onClick={onClose} />
                <button
                    type="button"
                    autoFocus
                    onClick={submit}
                    disabled={processing}
                    className="h-10 rounded-sm border border-warn-line bg-warn-fill px-4 text-[13px] font-semibold text-warn disabled:opacity-60"
                >
                    Abandonar
                </button>
            </div>
        </Dialog>
    );
}

/** Ler de novo: hoje ou depois (quero ler, no fim da fila). */
export function RereadDialog({
    bookId,
    onClose,
}: {
    bookId: number;
    onClose: () => void;
}) {
    function start(status: 'reading' | 'want_to_read') {
        router.post(
            reread(bookId).url,
            { status },
            { ...options, onSuccess: onClose },
        );
    }

    return (
        <Dialog title="## ler de novo" onClose={onClose}>
            <p className="text-sm leading-relaxed text-[#c9d3e3]">
                Uma nova leitura, com sessões, nota e resenha próprias. A
                anterior fica no histórico.
            </p>
            <DialogChoice
                autoFocus
                recommended
                title="Começar hoje"
                description="Vai para Lendo, a partir da p. 0."
                onClick={() => start('reading')}
            />
            <DialogChoice
                title="Quero reler depois"
                description="Vai para Quero ler e entra no fim da fila."
                onClick={() => start('want_to_read')}
            />
            <div className="flex justify-end">
                <CancelButton onClick={onClose} />
            </div>
        </Dialog>
    );
}

/** Lido → Lendo (D1): ler de novo (padrão) ou corrigir uma marcação errada. */
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
    const summary = [
        reading.days && plural(reading.days, 'dia', 'dias'),
        reading.rating && '★'.repeat(reading.rating),
    ]
        .filter(Boolean)
        .join(', ');

    return (
        <Dialog title={`## voltar a ler ${title}?`} onClose={onClose}>
            <p className="text-sm leading-relaxed text-[#c9d3e3]">
                Você terminou este livro
                {reading.finished_at
                    ? ` em ${shortDate(reading.finished_at)}`
                    : ''}
                . O que quer fazer?
            </p>
            <DialogChoice
                autoFocus
                recommended
                title="Ler de novo"
                badge="recomendado"
                description={`Começa uma ${reading.number + 1}ª leitura hoje, da página 0. A ${reading.number}ª${summary ? ` (${summary})` : ''} fica guardada no histórico.`}
                onClick={onReread}
            />
            <DialogChoice
                title="Corrigir: ainda não terminei"
                description={`Reabre a mesma leitura na p. ${reading.current_page} e apaga a data de término. Use se marcou como lido por engano.`}
                onClick={onCorrect}
            />
            <div className="flex justify-end">
                <CancelButton onClick={onClose} />
            </div>
        </Dialog>
    );
}

/** Corrigir: o único caminho que apaga a data de término. */
export function CorrectDialog({
    reading,
    onClose,
}: {
    reading: ReadingHistory;
    onClose: () => void;
}) {
    const year = reading.finished_at?.slice(0, 4);

    return (
        <Dialog title="## desmarcar como lido?" onClose={onClose}>
            <p className="text-sm leading-relaxed text-[#c9d3e3]">
                A leitura volta para <strong>Lendo</strong>, na p.{' '}
                {reading.current_page}. Isto apaga:
            </p>
            <DialogList
                items={[
                    `a data de término${reading.finished_at ? ` (${shortDate(reading.finished_at)})` : ''}`,
                    `a contagem do livro nos lidos de ${year ?? 'seu ano'}`,
                ]}
            />
            <p className="text-xs text-muted">
                Nota, resenha e sessões continuam. Para ler o livro outra vez,
                use "Ler de novo".
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
                    Desmarcar como lido
                </DangerButton>
            </div>
        </Dialog>
    );
}

/**
 * Datas da leitura. Lendo: só o início. Lida ou abandonada: início e fim.
 * Sessões fora do período não bloqueiam: o aviso oferece a correção.
 */
export function DatesDialog({
    reading,
    onClose,
}: {
    reading: ReadingHistory;
    onClose: () => void;
}) {
    const closed = reading.status === 'read' || reading.status === 'abandoned';
    // Só uma leitura lida pode ficar sem datas (lida há muito tempo).
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
              ? 'Informe o término.'
              : end > today()
                ? `O término não pode ser depois de hoje (${shortDate(today())}).`
                : end < start
                  ? 'O término não pode ser antes do início.'
                  : reading.last_session_on && end < reading.last_session_on
                    ? `A última sessão foi em ${shortDate(reading.last_session_on)}. Escolha essa data ou depois.`
                    : null
          : start > today()
            ? 'O início não pode ser depois de hoje.'
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
            title={`## datas da ${reading.number}ª leitura`}
            onClose={onClose}
        >
            <form onSubmit={save} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 text-xs text-muted">
                        Começou em
                        <DatePicker
                            aria-label="Data de início"
                            max={today()}
                            clearable={undated}
                            value={start}
                            onChange={(value) =>
                                form.setData('started_at', value)
                            }
                            className={cn(
                                'h-10.5 bg-bg text-sm',
                                earlySessions.length > 0 && 'border-warn',
                            )}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs text-muted">
                        Terminou em
                        <DatePicker
                            aria-label="Data de término"
                            max={today()}
                            disabled={!closed || undated}
                            value={closed && !undated ? end : ''}
                            onChange={(value) =>
                                form.setData('finished_at', value)
                            }
                            className={cn(
                                'h-10.5 bg-bg text-sm',
                                closed && error && 'border-danger-line',
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
                        Sem data de término (lido há muito tempo)
                    </label>
                )}

                {earlySessions.length > 0 && reading.first_session_on && (
                    <div className="flex flex-col items-start gap-2 rounded-sm border border-warn-line bg-[#1a1610] px-3 py-2.5 text-xs leading-relaxed text-warn">
                        <span>
                            {plural(
                                earlySessions.length,
                                'sessão fica',
                                'sessões ficam',
                            )}{' '}
                            antes do novo início ({shortDate(start)}).
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                form.setData(
                                    'started_at',
                                    reading.first_session_on!,
                                )
                            }
                            className="h-8 rounded-sm border border-warn-line px-2.5 hover:bg-warn-fill"
                        >
                            Usar {shortDate(reading.first_session_on)} como
                            início
                        </button>
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
                        {plural(daysBetween(start, end), 'dia', 'dias')} ·{' '}
                        {plural(reading.sessions_count, 'sessão', 'sessões')}{' '}
                        dentro do período
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
                        Salvar datas
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

/** Remover livro (D4): diz o que vai junto. Não tem desfazer. */
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
    const items = [
        removal.readings > 1
            ? `${plural(removal.readings, 'leitura', 'leituras')} (${removal.finished} ${removal.finished === 1 ? 'terminada' : 'terminadas'})`
            : plural(removal.readings, 'leitura', 'leituras'),
        removal.sessions > 0 &&
            `${plural(removal.sessions, 'sessão', 'sessões')} · ${plural(removal.pages, 'página', 'páginas')}`,
        removal.notes > 0 && plural(removal.notes, 'nota', 'notas'),
        queued && 'a posição na fila',
    ].filter((item): item is string => typeof item === 'string');

    return (
        <Dialog title="## remover livro?" onClose={onClose}>
            <p className="text-sm leading-relaxed text-[#c9d3e3]">
                <strong>{title}</strong> sai da biblioteca junto com tudo o que
                foi registrado nele:
            </p>
            <DialogList items={items} />
            <p className="text-xs text-muted">
                Não dá para desfazer.
                {removal.finished > 0 &&
                    ' As estatísticas dos anos em que você leu este livro vão mudar.'}
            </p>
            <div className="flex justify-end gap-2">
                <CancelButton autoFocus onClick={onClose} />
                <DangerButton onClick={() => router.visit(destroyBook(bookId))}>
                    Remover livro
                </DangerButton>
            </div>
        </Dialog>
    );
}

/** Apagar uma leitura do histórico, com as sessões dela. */
export function DeleteReadingDialog({
    reading,
    title,
    onClose,
}: {
    reading: ReadingHistory;
    title: string;
    onClose: () => void;
}) {
    return (
        <Dialog
            title={`## apagar a ${reading.number}ª leitura?`}
            onClose={onClose}
        >
            <p className="text-sm leading-relaxed text-[#c9d3e3]">
                A {reading.number}ª leitura de <strong>{title}</strong> sai do
                histórico com:
            </p>
            <DialogList
                items={[
                    plural(reading.sessions_count, 'sessão', 'sessões'),
                    reading.rating
                        ? `a nota (${'★'.repeat(reading.rating)})`
                        : 'sem nota',
                    reading.review ? 'a resenha' : 'sem resenha',
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
                    Apagar leitura
                </DangerButton>
            </div>
        </Dialog>
    );
}
