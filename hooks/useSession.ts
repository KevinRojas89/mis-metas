'use client';

import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { getSupabase, supabaseConfigured } from '@/lib/supabase';

/** Sesión actual de Supabase Auth. `ready` es false mientras se comprueba. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    const auth = getSupabase().auth;
    auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, ready };
}
