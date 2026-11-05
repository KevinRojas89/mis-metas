'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as db from '@/lib/db';
import { type Goal, type GoalInput, uid, withCheckin } from '@/lib/goals';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Metas del usuario guardadas en Supabase.
 * Los cambios se muestran al instante (optimista) y se guardan en segundo plano;
 * si la base devuelve un error, se avisa y se vuelve a cargar lo que hay en Supabase.
 */
export function useGoals(userId: string | null, onError: (message: string) => void) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [loadError, setLoadError] = useState('');
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reload = useCallback(async () => {
    setStatus('loading');
    try {
      setGoals(await db.fetchGoals());
      setLoadError('');
      setStatus('ready');
    } catch (e) {
      setLoadError(db.dbErrorMessage(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    setGoals([]);
    if (userId) reload();
    else setStatus('idle');
  }, [userId, reload]);

  /** Aplica el cambio en pantalla y lo guarda; si falla, avisa y recarga desde la base. */
  const persist = useCallback(
    async (optimistic: (gs: Goal[]) => Goal[], save: () => Promise<void>) => {
      setGoals(optimistic);
      try {
        await save();
        return true;
      } catch (e) {
        onErrorRef.current(`⚠ No se guardó: ${db.dbErrorMessage(e)}`);
        reload();
        return false;
      }
    },
    [reload],
  );

  const createGoal = useCallback(
    (input: GoalInput) => {
      const goal: Goal = { id: uid(), createdAt: new Date().toISOString(), checkins: {}, ...input };
      return persist(gs => [...gs, goal], () => db.insertGoals([goal]));
    },
    [persist],
  );

  const editGoal = useCallback(
    (id: string, input: GoalInput) =>
      persist(gs => gs.map(g => (g.id === id ? { ...g, ...input } : g)), () => db.updateGoalRow(id, input)),
    [persist],
  );

  const removeGoal = useCallback(
    (id: string) => persist(gs => gs.filter(g => g.id !== id), () => db.deleteGoalRow(id)),
    [persist],
  );

  const setCheckin = useCallback(
    (goalId: string, key: string, done: boolean, note = '') =>
      persist(
        gs => gs.map(g => (g.id === goalId ? withCheckin(g, key, done, note) : g)),
        () => (done ? db.upsertCheckin(goalId, key, note.trim().slice(0, 300)) : db.deleteCheckin(goalId, key)),
      ),
    [persist],
  );

  /** Sube metas importadas. `replace` borra antes todas las del usuario. */
  const importGoals = useCallback(
    (incoming: Goal[], mode: 'replace' | 'append') =>
      persist(
        gs => (mode === 'replace' ? incoming : [...gs, ...incoming]),
        async () => {
          if (mode === 'replace') await db.deleteAllGoals();
          await db.insertGoals(incoming);
        },
      ),
    [persist],
  );

  return { goals, status, loadError, reload, createGoal, editGoal, removeGoal, setCheckin, importGoals };
}
