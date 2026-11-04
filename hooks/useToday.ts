'use client';

import { useEffect, useState } from 'react';
import { todayKey } from '@/lib/dates';

/** Fecha de hoy ('YYYY-MM-DD'). Se actualiza sola si la página queda abierta al cambiar el día. */
export function useToday() {
  const [today, setToday] = useState(todayKey);

  useEffect(() => {
    const id = setInterval(() => setToday(todayKey()), 60_000);
    return () => clearInterval(id);
  }, []);

  return today;
}
