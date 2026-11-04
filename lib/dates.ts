/**
 * Utilidades de fechas. Todas las fechas se manejan como texto 'YYYY-MM-DD'
 * en la hora local del usuario, así se pueden comparar como strings.
 */

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const DAY_MS = 86_400_000;

export const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const makeKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

export const todayKey = () => toKey(new Date());

export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

/** Días entre dos fechas (b - a). */
export const diffDays = (a: string, b: string) =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / DAY_MS);

/** Un año completo a partir de `start` (ej: 4 nov 2026 → 3 nov 2027). */
export const oneYearFrom = (start: string) => {
  const d = fromKey(start);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return toKey(d);
};

export const isValidKey = (k: unknown): k is string =>
  typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && toKey(fromKey(k)) === k;

export const fmtShort = (k: string) =>
  fromKey(k).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export const fmtLong = (k: string) =>
  fromKey(k).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Posición del día 1 del mes con la semana empezando en lunes (0 = lunes). */
export const mondayOffset = (year: number, month: number) => (new Date(year, month, 1).getDay() + 6) % 7;

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
