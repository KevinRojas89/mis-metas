import { addDays, diffDays, isValidKey } from './dates';

export const STORAGE_KEY = 'mis-metas-v1';

export const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#84cc16'];

export type Checkin = { note: string };

export type Goal = {
  id: string;
  name: string;
  description: string;
  /** 'YYYY-MM-DD' */
  start: string;
  /** 'YYYY-MM-DD' */
  end: string;
  /** Días que hay que cumplir para lograr la meta */
  target: number;
  color: string;
  createdAt: string;
  /** Días cumplidos: clave 'YYYY-MM-DD' */
  checkins: Record<string, Checkin>;
};

export type GoalInput = Pick<Goal, 'name' | 'description' | 'start' | 'end' | 'target' | 'color'>;

export type DayStatus = 'out' | 'done' | 'future' | 'pending' | 'missed';

export type GoalStatus = 'pending' | 'active' | 'finished';

export type GoalStats = {
  total: number;
  target: number;
  done: number;
  pct: number;
  missed: number;
  daysLeft: number;
  streak: number;
  best: number;
  status: GoalStatus;
  completed: boolean;
  remaining: number;
};

/** Id en formato UUID (el que usa la columna id de Supabase). */
export const uid = () => crypto.randomUUID();

export const periodLength = (start: string, end: string) => diffDays(start, end) + 1;

/** Valida y limpia una meta que viene de localStorage o de un archivo importado. */
export function sanitizeGoal(raw: unknown): Goal | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  if (!isValidKey(g.start) || !isValidKey(g.end) || g.end < g.start) return null;

  const checkins: Record<string, Checkin> = {};
  if (g.checkins && typeof g.checkins === 'object') {
    for (const [k, v] of Object.entries(g.checkins as Record<string, unknown>)) {
      if (isValidKey(k)) {
        const note = v && typeof v === 'object' ? (v as Record<string, unknown>).note : '';
        checkins[k] = { note: String(note ?? '').slice(0, 300) };
      }
    }
  }

  const total = periodLength(g.start, g.end);
  const target = parseInt(String(g.target), 10) || total;
  return {
    id: String(g.id || uid()),
    name: String(g.name || 'Meta sin nombre').slice(0, 80),
    description: String(g.description || '').slice(0, 300),
    start: g.start,
    end: g.end,
    target: Math.max(1, Math.min(total, target)),
    color: typeof g.color === 'string' && COLORS.includes(g.color) ? g.color : COLORS[0],
    createdAt: typeof g.createdAt === 'string' ? g.createdAt : new Date().toISOString(),
    checkins,
  };
}

export function dayStatus(g: Goal, k: string, today: string): DayStatus {
  if (k < g.start || k > g.end) return 'out';
  if (g.checkins[k]) return 'done';
  if (k > today) return 'future';
  if (k === today) return 'pending';
  return 'missed';
}

export function goalStatus(g: Goal, today: string): GoalStatus {
  return today < g.start ? 'pending' : today > g.end ? 'finished' : 'active';
}

export function goalStats(g: Goal, today: string): GoalStats {
  const total = periodLength(g.start, g.end);
  const target = g.target || total;
  const keys = Object.keys(g.checkins).filter(k => k >= g.start && k <= g.end).sort();
  const done = keys.length;
  const pct = Math.min(100, Math.round((done / target) * 100));

  // Días pasados (sin contar hoy) que no se marcaron
  const yesterday = addDays(today, -1);
  const lastPast = yesterday < g.end ? yesterday : g.end;
  const pastDays = lastPast >= g.start ? diffDays(g.start, lastPast) + 1 : 0;
  const donePast = keys.filter(k => k <= lastPast).length;
  const missed = Math.max(0, pastDays - donePast);

  // Días que todavía quedan (incluye hoy si no se ha marcado)
  const firstLeft = today > g.start ? today : g.start;
  const todayDone = today >= g.start && !!g.checkins[today];
  const daysLeft = firstLeft <= g.end ? diffDays(firstLeft, g.end) + 1 - (todayDone ? 1 : 0) : 0;

  // Racha actual (si hoy aún no se marcó, cuenta desde ayer)
  let streak = 0;
  let d = g.checkins[today] ? today : yesterday;
  while (g.checkins[d] && d >= g.start) {
    streak++;
    d = addDays(d, -1);
  }

  // Mejor racha
  let best = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const k of keys) {
    cur = prev && diffDays(prev, k) === 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
    prev = k;
  }

  return {
    total, target, done, pct, missed, daysLeft, streak, best,
    status: goalStatus(g, today),
    completed: done >= target,
    remaining: Math.max(0, target - done),
  };
}

/** Devuelve una copia de la meta con el día marcado o desmarcado. */
export function withCheckin(g: Goal, key: string, done: boolean, note = ''): Goal {
  const checkins = { ...g.checkins };
  if (done) checkins[key] = { note: note.trim().slice(0, 300) };
  else delete checkins[key];
  return { ...g, checkins };
}

/* ---------- Datos de la versión anterior (guardados en el navegador) ---------- */

/** Metas que quedaron en localStorage antes de usar Supabase (para migrarlas). */
export function loadLocalGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.goals)) {
      return data.goals.map(sanitizeGoal).filter((g: Goal | null): g is Goal => g !== null);
    }
  } catch (e) {
    console.error('No se pudieron leer los datos locales', e);
  }
  return [];
}

export function clearLocalGoals() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin acceso a localStorage */
  }
}

/** Lee un archivo de copia de seguridad (mismo formato que la versión HTML). */
export function parseBackup(text: string): Goal[] {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.goals)) throw new Error('Formato inválido');
  return data.goals.map(sanitizeGoal).filter((g: Goal | null): g is Goal => g !== null);
}

/** Copia de las metas con ids nuevos (las versiones anteriores no usaban UUID). */
export const withNewIds = (goals: Goal[]): Goal[] => goals.map(g => ({ ...g, id: uid() }));
