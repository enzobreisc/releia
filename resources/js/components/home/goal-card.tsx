import { useState } from 'react';
import { cardClass } from '@/components/card';
import { useTranslation } from '@/hooks/use-translation';
import type { YearGoal } from '@/types';
import { GoalForm } from './goal-form';
import { GoalTallies } from './goal-tallies';

export function GoalCard({
    goal,
    dailyGoal,
}: {
    goal: YearGoal;
    dailyGoal: number | null;
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const percent = goal.goal
        ? Math.min(100, Math.round((goal.finished / goal.goal) * 100))
        : null;

    return (
        <section
            aria-labelledby="goal-title"
            className={cardClass(
                'flex min-w-0 flex-[1_1_260px] flex-col gap-3 p-4.5',
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="goal-title" className="text-xs font-bold text-muted">
                    {t('Meta de :year', { year: goal.year })}
                </h2>
                <div className="flex items-baseline gap-3">
                    {percent !== null && (
                        <span className="font-mono text-xs text-muted">
                            {percent}%
                        </span>
                    )}
                    <button
                        type="button"
                        aria-expanded={editing}
                        onClick={() => setEditing(!editing)}
                        className="text-xs font-bold text-link hover:underline"
                    >
                        {editing ? t('fechar') : t('editar')}
                    </button>
                </div>
            </div>
            <p className="flex items-baseline gap-1.5">
                <span className="text-4xl leading-none font-extrabold tracking-tight">
                    {goal.finished}
                </span>
                {goal.goal !== null && (
                    <span className="text-[15px] font-semibold text-muted">
                        {t('de :count livros', { count: goal.goal })}
                    </span>
                )}
            </p>
            {goal.goal !== null && (
                <GoalTallies goal={goal.goal} finished={goal.finished} />
            )}
            <p className="text-xs font-medium text-muted">
                {t('No ritmo atual: :count livros até dezembro', {
                    count: goal.projected,
                })}
            </p>
            {dailyGoal !== null && (
                <p className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-[13px] font-semibold text-secondary">
                    <span>{t('Meta diária')}</span>
                    <span>
                        <strong className="font-extrabold text-text">
                            {t(':pages págs', { pages: dailyGoal })}
                        </strong>{' '}
                        {t('por dia')}
                    </span>
                </p>
            )}
            {editing && (
                <GoalForm
                    current={goal.goal}
                    currentDaily={dailyGoal}
                    onSaved={() => setEditing(false)}
                />
            )}
        </section>
    );
}
