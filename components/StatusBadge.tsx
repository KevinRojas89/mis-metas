import type { GoalStats } from '@/lib/goals';

const LABELS = { active: 'En curso', pending: 'Por empezar', finished: 'Finalizada' } as const;

export default function StatusBadge({ stats }: { stats: GoalStats }) {
  if (stats.completed) return <span className="badge completed">🏆 ¡Cumplida!</span>;
  return <span className={`badge ${stats.status}`}>{LABELS[stats.status]}</span>;
}
