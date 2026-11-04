'use client';

import { MONTHS, daysInMonth, makeKey, mondayOffset } from '@/lib/dates';
import { type Goal, dayStatus } from '@/lib/goals';

type Props = {
  goal: Goal;
  today: string;
  year: number;
  month: number;
  onShiftYear: (delta: number) => void;
  onSelectMonth: (month: number) => void;
};

export default function YearOverview({ goal, today, year, month, onShiftYear, onSelectMonth }: Props) {
  const months = MONTHS.map((name, m) => {
    const cells = Array.from({ length: daysInMonth(year, m) }, (_, i) => {
      const key = makeKey(year, m, i + 1);
      return { key, status: dayStatus(goal, key, today) };
    });
    return { name, m, cells, offset: mondayOffset(year, m), count: cells.filter(c => c.status === 'done').length };
  });
  const yearDone = months.reduce((sum, x) => sum + x.count, 0);

  return (
    <section className="panel">
      <div className="month-nav">
        <button className="btn icon" title="Año anterior" aria-label="Año anterior" onClick={() => onShiftYear(-1)}>
          ◀
        </button>
        <h3>
          Año {year} · {yearDone} ✓
        </h3>
        <button className="btn icon" title="Año siguiente" aria-label="Año siguiente" onClick={() => onShiftYear(1)}>
          ▶
        </button>
      </div>

      <div className="year-grid">
        {months.map(({ name, m, cells, offset, count }) => (
          <button
            key={m}
            className={`mini${m === month ? ' current' : ''}`}
            title={`${name} ${year}`}
            onClick={() => onSelectMonth(m)}
          >
            <span className="mini-title">
              <span>{name.slice(0, 3)}</span>
              <span className="count">{count ? `${count} ✓` : ''}</span>
            </span>
            <span className="mini-grid">
              {Array.from({ length: offset }, (_, i) => (
                <i key={`b${i}`} className="blank" />
              ))}
              {cells.map(c => (
                <i key={c.key} className={c.status} />
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
