/**
 * Lectura y escritura de metas en Supabase.
 * Tablas: public.metas y public.registrosmetas (ver supabase/politicas.sql).
 * El user_id lo pone la base automáticamente (default auth.uid()).
 */
import type { PostgrestError } from '@supabase/supabase-js';
import { type Goal, type GoalInput, sanitizeGoal } from './goals';
import { getSupabase } from './supabase';

const T_METAS = 'metas';
const T_REGISTROS = 'registrosmetas';
const PAGE = 1000; // Supabase devuelve como máximo 1000 filas por consulta

type MetaRow = {
  id: string;
  nombre: string | null;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  dias_objetivo: number | null;
  color: string | null;
  creado_en: string | null;
};

type RegistroRow = { meta_id: string; fecha: string; nota: string | null };

/** Convierte los errores de Supabase en mensajes entendibles. */
export function dbErrorMessage(e: unknown): string {
  const err = e as Partial<PostgrestError> & { message?: string };
  const msg = err?.message ?? String(e);
  if (err?.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Sin permiso en la base. Ejecuta supabase/politicas.sql en el SQL Editor.';
  }
  if (err?.code === 'PGRST205' || err?.code === '42P01') {
    return 'No se encontró la tabla en Supabase. Revisa que existan "metas" y "registrosmetas".';
  }
  if (err?.code === '42703' || err?.code === 'PGRST204') {
    return `Falta una columna en la base: ${msg}`;
  }
  if (/fetch|network/i.test(msg)) return 'Sin conexión con Supabase. Revisa tu internet.';
  return msg;
}

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw res.error;
  return res.data;
}

async function fetchAll<T>(table: string, columns: string, orderBy: string): Promise<T[]> {
  const sb = getSupabase();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = check(
      await sb.from(table).select(columns).order(orderBy).order('id').range(from, from + PAGE - 1),
    ) as unknown as T[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

const toMetaRow = (input: GoalInput) => ({
  nombre: input.name,
  descripcion: input.description,
  fecha_inicio: input.start,
  fecha_fin: input.end,
  dias_objetivo: input.target,
  color: input.color,
});

/* ---------- Lectura ---------- */

export async function fetchGoals(): Promise<Goal[]> {
  const [metas, registros] = await Promise.all([
    fetchAll<MetaRow>(T_METAS, 'id,nombre,descripcion,fecha_inicio,fecha_fin,dias_objetivo,color,creado_en', 'creado_en'),
    fetchAll<RegistroRow>(T_REGISTROS, 'meta_id,fecha,nota', 'fecha'),
  ]);

  const checkinsByGoal = new Map<string, Record<string, { note: string }>>();
  for (const r of registros) {
    const map = checkinsByGoal.get(r.meta_id) ?? {};
    map[r.fecha] = { note: r.nota ?? '' };
    checkinsByGoal.set(r.meta_id, map);
  }

  return metas
    .map(m =>
      sanitizeGoal({
        id: m.id,
        name: m.nombre,
        description: m.descripcion,
        start: m.fecha_inicio,
        end: m.fecha_fin,
        target: m.dias_objetivo,
        color: m.color,
        createdAt: m.creado_en,
        checkins: checkinsByGoal.get(m.id) ?? {},
      }),
    )
    .filter((g): g is Goal => g !== null);
}

/* ---------- Metas ---------- */

export async function insertGoals(goals: Goal[]): Promise<void> {
  if (!goals.length) return;
  const sb = getSupabase();
  check(await sb.from(T_METAS).insert(goals.map(g => ({ id: g.id, ...toMetaRow(g) }))));

  const registros = goals.flatMap(g =>
    Object.entries(g.checkins).map(([fecha, c]) => ({ meta_id: g.id, fecha, nota: c.note })),
  );
  for (let i = 0; i < registros.length; i += 500) {
    check(await sb.from(T_REGISTROS).insert(registros.slice(i, i + 500)));
  }
}

export async function updateGoalRow(id: string, input: GoalInput): Promise<void> {
  check(await getSupabase().from(T_METAS).update(toMetaRow(input)).eq('id', id));
}

export async function deleteGoalRow(id: string): Promise<void> {
  const sb = getSupabase();
  // Primero los registros, por si la llave foránea no tiene "on delete cascade"
  check(await sb.from(T_REGISTROS).delete().eq('meta_id', id));
  check(await sb.from(T_METAS).delete().eq('id', id));
}

/** Borra todas las metas del usuario (RLS limita el borrado a las suyas). */
export async function deleteAllGoals(): Promise<void> {
  const sb = getSupabase();
  check(await sb.from(T_REGISTROS).delete().not('meta_id', 'is', null));
  check(await sb.from(T_METAS).delete().not('id', 'is', null));
}

/* ---------- Días cumplidos ---------- */

export async function upsertCheckin(goalId: string, fecha: string, nota: string): Promise<void> {
  check(
    await getSupabase()
      .from(T_REGISTROS)
      .upsert({ meta_id: goalId, fecha, nota }, { onConflict: 'meta_id,fecha' }),
  );
}

export async function deleteCheckin(goalId: string, fecha: string): Promise<void> {
  check(await getSupabase().from(T_REGISTROS).delete().eq('meta_id', goalId).eq('fecha', fecha));
}
