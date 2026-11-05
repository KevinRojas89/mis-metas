'use client';

import { type FormEvent, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

type Mode = 'login' | 'signup';

function authErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos.';
  if (/invalid api key/i.test(message)) return 'La clave de Supabase no es válida. Revisa NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.';
  if (/email not confirmed/i.test(message)) return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.';
  if (/already registered|already exists/i.test(message)) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (/password should be at least/i.test(message)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit|too many/i.test(message)) return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
  if (/fetch|network/i.test(message)) return 'Sin conexión con Supabase. Revisa tu internet.';
  return message;
}

/** Inicio de sesión y registro con correo y contraseña (Supabase Auth). */
export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim() || !password) return setError('Escribe tu correo y tu contraseña.');

    setBusy(true);
    const auth = getSupabase().auth;
    try {
      if (mode === 'login') {
        const { error: err } = await auth.signInWithPassword({ email: email.trim(), password });
        if (err) setError(authErrorMessage(err.message));
      } else {
        const { data, error: err } = await auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) setError(authErrorMessage(err.message));
        else if (!data.session) {
          setInfo('✉️ Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego inicia sesión aquí.');
          setMode('login');
        }
      }
    } catch (err) {
      setError(authErrorMessage(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  return (
    <section className="auth">
      <div className="auth-card">
        <div className="big-emoji">🎯</div>
        <h1>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>
        <p className="muted">Tus metas se guardan en tu cuenta y las puedes ver desde cualquier dispositivo.</p>

        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            Iniciar sesión
          </button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>
            Registrarme
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Correo</span>
            <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : ''}
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          {info && <p className="form-info" role="status">{info}</p>}

          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </section>
  );
}
