import { type SupabaseClient, createClient } from '@supabase/supabase-js';

// Se aceptan también URLs copiadas con "/rest/v1/" al final (Supabase las necesita sin eso)
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** true cuando .env.local tiene la URL y la clave pública reales. */
export const supabaseConfigured = url.startsWith('https://') && key.length > 20 && !key.includes('PEGA');

let client: SupabaseClient | null = null;

/** Cliente de Supabase para el navegador (guarda la sesión en localStorage). */
export function getSupabase(): SupabaseClient {
  if (!supabaseConfigured) throw new Error('Supabase no está configurado (.env.local)');
  client ??= createClient(url, key);
  return client;
}
