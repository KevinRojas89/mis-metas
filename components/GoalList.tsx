'use client';

import { fmtLong } from '@/lib/dates';
import { type Goal, goalStats } from '@/lib/goals';
import GoalCard from './GoalCard';

type Props = {
  goals: Goal[];
  today: string;
  onNew: () => void;
  onToggleToday: (goal: Goal) => void;
  onOpenCalendar: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
};

export default function GoalList({ goals, today, onNew, ...cardActions }: Props) {
  if (!goals.length) {
    return (
      <section className="empty">
        <div className="big-emoji">🎯</div>
        <h2>Aún no tienes metas</h2>
        <p>Crea tu primera meta, marca cada día que la cumplas y mira cómo avanza tu progreso en el calendario.</p>
        <button className="btn primary" onClick={onNew}>
          + Crear mi primera meta
        </button>
      </section>
    );
  }

  const stats = goals.map(g => goalStats(g, today));
  const active = goals.filter((_, i) => stats[i].status === 'active');
  const doneToday = active.filter(g => g.checkins[today]).length;
  const completed = stats.filter(s => s.completed).length;
  const bestStreak = Math.max(0, ...stats.map(s => s.streak));

  return (
    <>
      <section className="summary">
        <div className="stat">
          <div className="label">Metas en curso</div>
          <div className="value">{active.length}</div>
        </div>
        <div className="stat">
          <div className="label">Cumplidas hoy</div>
          <div className="value">
            {doneToday} / {active.length}
          </div>
        </div>
        <div className="stat">
          <div className="label">Metas logradas</div>
          <div className="value">🏆 {completed}</div>
        </div>
        <div className="stat">
          <div className="label">Mejor racha actual</div>
          <div className="value">🔥 {bestStreak}</div>
        </div>
      </section>

      <div className="section-title">
        <h2>Mis metas</h2>
        <span className="muted small">Hoy es {fmtLong(today)}</span>
      </div>

      <section className="grid">
        {goals.map((g, i) => (
          <GoalCard key={g.id} goal={g} stats={stats[i]} today={today} {...cardActions} />
        ))}
      </section>
    </>
  );
}
