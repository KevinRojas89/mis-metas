'use client';

import type { CSSProperties } from 'react';
import { addDays, fmtShort } from '@/lib/dates';
import { type Goal, type GoalStats, dayStatus } from '@/lib/goals';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';

type Props = {
  goal: Goal;
  stats: GoalStats;
  today: string;
  onToggleToday: (goal: Goal) => void;
  onOpenCalendar: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
};

export default function GoalCard({ goal, stats, today, onToggleToday, onOpenCalendar, onEdit, onDelete }: Props) {
  const checkedToday = !!goal.checkins[today];
  const active = stats.status === 'active';

  let todayLabel = checkedToday ? '✔ Cumplido hoy · deshacer' : '✅ Hoy cumplí';
  if (!active) todayLabel = stats.status === 'pending' ? `Empieza el ${fmtShort(goal.start)}` : 'Meta finalizada';

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));

  return (
    <article className="card" style={{ '--goal': goal.color } as CSSProperties}>
      <div className="card-head">
        <div>
          <h3>{goal.name}</h3>
          <div className="muted small">
            {fmtShort(goal.start)} → {fmtShort(goal.end)}
          </div>
        </div>
        <StatusBadge stats={stats} />
      </div>

      {goal.description && <p className="desc">{goal.description}</p>}

      <div>
        <div className="progress-info">
          <span>
            <strong>{stats.done}</strong> de {stats.target} días
          </span>
          <span className="pct">{stats.pct}%</span>
        </div>
        <ProgressBar pct={stats.pct} />
      </div>

      <div className="card-stats">
        <span>🔥 Racha <b>{stats.streak}</b></span>
        <span>🏆 Mejor <b>{stats.best}</b></span>
        <span>❌ Sin cumplir <b>{stats.missed}</b></span>
        <span>🎯 Faltan <b>{stats.remaining}</b></span>
      </div>

      <div className="dots">
        <span className="dots-label">Últimos 14 días</span>
        {last14.map(k => (
          <span key={k} className={`dot ${dayStatus(goal, k, today)}`} title={fmtShort(k)} />
        ))}
      </div>

      <div className="card-actions">
        <button
          className={`btn ${checkedToday ? 'success' : 'primary'} grow`}
          disabled={!active}
          onClick={() => onToggleToday(goal)}
        >
          {todayLabel}
        </button>
        <button className="btn icon" title="Ver calendario" aria-label="Ver calendario" onClick={() => onOpenCalendar(goal)}>
          📅
        </button>
        <button className="btn icon" title="Editar" aria-label="Editar" onClick={() => onEdit(goal)}>
          ✏️
        </button>
        <button className="btn icon danger" title="Eliminar" aria-label="Eliminar" onClick={() => onDelete(goal)}>
          🗑️
        </button>
      </div>
    </article>
  );
}
