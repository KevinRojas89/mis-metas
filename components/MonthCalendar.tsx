'use client';

import { MONTHS, WEEKDAYS, daysInMonth, makeKey, mondayOffset } from '@/lib/dates';
import { type Goal, dayStatus } from '@/lib/goals';

type Props = {
  goal: Goal;
  today: string;
  year: number;
  month: number;
  onShiftMonth: (delta: number) => void;
  onGoToday: () => void;
  onDayClick: (key: string) => void;
};

const MARKS: Partial<Record<string, string>> = { done: '✓', missed: '✕', pending: '•' };

export default function MonthCalendar({ goal, today, year, month, onShiftMonth, onGoToday, onDayClick }: Props) {
  const offset = mondayOffset(year, month);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);

  return (
    <section className="panel">
      <div className="month-nav">
        <button className="btn icon" title="Mes anterior" aria-label="Mes anterior" onClick={() => onShiftMonth(-1)}>
          ◀
        </button>
        <h3>
          {MONTHS[month]} {year}
        </h3>
        <button className="btn icon" title="Mes siguiente" aria-label="Mes siguiente" onClick={() => onShiftMonth(1)}>
          ▶
        </button>
        <button className="btn ghost" onClick={onGoToday}>
          Hoy
        </button>
      </div>

      <div className="weekdays">
        {WEEKDAYS.map(w => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="month-grid">
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} className="day empty-cell" />
        ))}
        {days.map(d => {
          const key = makeKey(year, month, d);
          const status = dayStatus(goal, key, today);
          const clickable = status !== 'out' && status !== 'future';
          const note = goal.checkins[key]?.note;
          const title =
            status === 'out' ? 'Fuera del periodo de la meta'
            : status === 'future' ? 'Día futuro'
            : note ? `Nota: ${note}` : 'Clic para registrar';

          return (
            <button
              key={key}
              className={`day ${status}${key === today ? ' is-today' : ''}`}
              title={title}
              disabled={!clickable}
              onClick={() => onDayClick(key)}
            >
              {note && <span className="note-flag">📝</span>}
              <span className="num">{d}</span>
              <span className="mark">{MARKS[status] ?? ''}</span>
            </button>
          );
        })}
      </div>

      <div className="legend">
        <span><i className="dot done" />Cumplido</span>
        <span><i className="dot missed" />Sin cumplir</span>
        <span><i className="dot pending" />Hoy (pendiente)</span>
        <span><i className="dot" />Futuro</span>
        <span>📝 Con nota</span>
      </div>

      <p className="hint">
        💡 Haz clic en cualquier día (hoy o pasado) para marcarlo como cumplido, quitar la marca o agregar una nota.
        Ideal si se te olvidó registrarlo.
      </p>
    </section>
  );
}
