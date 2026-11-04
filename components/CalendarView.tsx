'use client';

import type { CSSProperties } from 'react';
import { fmtShort } from '@/lib/dates';
import { type Goal, goalStats } from '@/lib/goals';
import MonthCalendar from './MonthCalendar';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';
import YearOverview from './YearOverview';

type Props = {
  goal: Goal;
  goals: Goal[];
  today: string;
  year: number;
  month: number;
  onNavigate: (year: number, month: number) => void;
  onSwitchGoal: (id: string) => void;
  onBack: () => void;
  onEdit: (goal: Goal) => void;
  onDayClick: (key: string) => void;
};

export default function CalendarView({
  goal, goals, today, year, month, onNavigate, onSwitchGoal, onBack, onEdit, onDayClick,
}: Props) {
  const s = goalStats(goal, today);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onNavigate(d.getFullYear(), d.getMonth());
  };

  const goToday = () => {
    const d = new Date();
    onNavigate(d.getFullYear(), d.getMonth());
  };

  const stats = [
    { label: '✅ Cumplidos', value: s.done },
    { label: '❌ Sin cumplir', value: s.missed },
    { label: '🔥 Racha actual', value: s.streak },
    { label: '🏆 Mejor racha', value: s.best },
    { label: '🎯 Faltan para la meta', value: s.remaining },
    { label: '📆 Días restantes', value: s.daysLeft },
  ];

  return (
    <div style={{ '--goal': goal.color } as CSSProperties}>
      <div className="cal-header">
        <button className="btn ghost" onClick={onBack}>
          ← Volver
        </button>
        <select aria-label="Elegir meta" value={goal.id} onChange={e => onSwitchGoal(e.target.value)}>
          {goals.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <button className="btn ghost" onClick={() => onEdit(goal)}>
          ✏️ Editar meta
        </button>
      </div>

      <section className="goal-overview">
        <div className="card-head" style={{ marginBottom: 12 }}>
          <div>
            <div className="muted small">
              {fmtShort(goal.start)} → {fmtShort(goal.end)} · {s.total} días en total
            </div>
            {goal.description && (
              <p className="desc" style={{ marginTop: 4 }}>
                {goal.description}
              </p>
            )}
          </div>
          <StatusBadge stats={s} />
        </div>

        <div className="progress-info">
          <span>
            <strong>{s.done}</strong> de {s.target} días cumplidos
          </span>
          <span className="pct">{s.pct}%</span>
        </div>
        <ProgressBar pct={s.pct} big />

        <div className="mini-stats">
          {stats.map(x => (
            <div key={x.label}>
              <div className="label">{x.label}</div>
              <div className="value">{x.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="cal-layout">
        <MonthCalendar
          goal={goal}
          today={today}
          year={year}
          month={month}
          onShiftMonth={shiftMonth}
          onGoToday={goToday}
          onDayClick={onDayClick}
        />
        <YearOverview
          goal={goal}
          today={today}
          year={year}
          month={month}
          onShiftYear={delta => onNavigate(year + delta, month)}
          onSelectMonth={m => onNavigate(year, m)}
        />
      </div>
    </div>
  );
}
