'use client';

import { useCallback, useEffect, useState } from 'react';
import { type Goal, loadGoals, saveGoals } from '@/lib/goals';

/**
 * Estado de las metas, guardado automáticamente en localStorage.
 * Los datos se leen después de montar el componente porque localStorage
 * solo existe en el navegador (no en el servidor de Next.js).
 */
export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setGoals(loadGoals());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) setSaveFailed(!saveGoals(goals));
  }, [goals, loaded]);

  const addGoal = useCallback((goal: Goal) => setGoals(gs => [...gs, goal]), []);
  const updateGoal = useCallback((goal: Goal) => setGoals(gs => gs.map(g => (g.id === goal.id ? goal : g))), []);
  const removeGoal = useCallback((id: string) => setGoals(gs => gs.filter(g => g.id !== id)), []);
  const replaceAll = useCallback((next: Goal[]) => setGoals(next), []);

  return { goals, loaded, saveFailed, addGoal, updateGoal, removeGoal, replaceAll };
}
