'use client';

import type { Session } from '@supabase/supabase-js';
import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/hooks/useToast';
import { useToday } from '@/hooks/useToday';
import { fromKey } from '@/lib/dates';
import {
  type Goal, type GoalInput, clearLocalGoals, goalStats, loadLocalGoals, parseBackup, withCheckin, withNewIds,
} from '@/lib/goals';
import { getSupabase, supabaseConfigured } from '@/lib/supabase';
import AuthScreen from './AuthScreen';
import CalendarView from './CalendarView';
import DayDialog from './DayDialog';
import GoalFormDialog from './GoalFormDialog';
import GoalList from './GoalList';

type View = { name: 'list' } | { name: 'calendar'; goalId: string; year: number; month: number };

/** Formulario abierto: `null` = cerrado, `{ goal: null }` = nueva meta. */
type GoalFormState = { goal: Goal | null } | null;

function Topbar({ onHome, children }: { onHome?: () => void; children?: ReactNode }) {
  return (
    <header className="topbar">
      <button className="brand" title="Ir a mis metas" onClick={onHome}>
        🎯 <span>Mis Metas</span>
      </button>
      {children && <div className="top-actions">{children}</div>}
    </header>
  );
}

/** Decide qué mostrar: falta configuración, cargando sesión, login o la app. */
export default function GoalsApp() {
  const { session, ready } = useSession();

  if (!supabaseConfigured) {
    return (
      <>
        <Topbar />
        <main>
          <section className="empty">
            <div className="big-emoji">🔌</div>
            <h2>Falta conectar Supabase</h2>
            <p>
              Completa el archivo <code>.env.local</code> (si no existe, copia <code>.env.example</code>) con tu
              <code> NEXT_PUBLIC_SUPABASE_URL</code> y tu <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, y reinicia
              <code> npm run dev</code>.
            </p>
          </section>
        </main>
      </>
    );
  }

  if (!ready) {
    return (
      <>
        <Topbar />
        <main><p className="loading muted">Cargando…</p></main>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Topbar />
        <main><AuthScreen /></main>
      </>
    );
  }

  return <Dashboard key={session.user.id} session={session} />;
}

function Dashboard({ session }: { session: Session }) {
  const today = useToday();
  const toast = useToast();
  const { goals, status, loadError, reload, createGoal, editGoal, removeGoal, setCheckin, importGoals } = useGoals(
    session.user.id,
    toast.show,
  );

  const [view, setView] = useState<View>({ name: 'list' });
  const [goalForm, setGoalForm] = useState<GoalFormState>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [localGoals, setLocalGoals] = useState<Goal[]>([]);

  // Metas de la versión anterior (guardadas solo en este navegador)
  useEffect(() => {
    setLocalGoals(loadLocalGoals());
  }, []);

  const calendarGoal = view.name === 'calendar' ? goals.find(g => g.id === view.goalId) : undefined;

  /* ---------- Navegación ---------- */
  const goHome = () => setView({ name: 'list' });

  const openCalendar = (goal: Goal) => {
    // Mostrar el mes de hoy, o el más cercano dentro del periodo de la meta
    const ref = today < goal.start ? goal.start : today > goal.end ? goal.end : today;
    const d = fromKey(ref);
    setView({ name: 'calendar', goalId: goal.id, year: d.getFullYear(), month: d.getMonth() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ---------- Registrar avances ---------- */
  const saveCheckin = async (goal: Goal, key: string, done: boolean, note: string, okMessage: string) => {
    const justCompleted =
      !goalStats(goal, today).completed && goalStats(withCheckin(goal, key, done, note), today).completed;
    if (await setCheckin(goal.id, key, done, note)) {
      toast.show(justCompleted ? `🎉 ¡Felicidades! Lograste tu meta "${goal.name}"` : okMessage);
    }
  };

  const toggleToday = (goal: Goal) => {
    if (today < goal.start || today > goal.end) return;
    const checked = !!goal.checkins[today];
    saveCheckin(goal, today, !checked, '', checked ? 'Marca de hoy eliminada' : '💪 ¡Bien hecho! Avance de hoy registrado');
  };

  const saveDay = (done: boolean, note: string) => {
    if (!calendarGoal || !dayKey) return;
    saveCheckin(calendarGoal, dayKey, done, note, done ? '✅ Día registrado como cumplido' : 'Día marcado como no cumplido');
    setDayKey(null);
  };

  /* ---------- Crear / editar / eliminar ---------- */
  const saveGoal = async (data: GoalInput) => {
    const editing = goalForm?.goal;
    setGoalForm(null);
    if (editing) {
      if (await editGoal(editing.id, data)) toast.show('Meta actualizada');
    } else if (await createGoal(data)) {
      toast.show('🎯 ¡Meta creada! Ahora a cumplirla');
    }
  };

  const deleteGoal = async (goal: Goal) => {
    const ok = confirm(
      `¿Eliminar la meta "${goal.name}"?\nSe borrará también todo su historial. Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    if (view.name === 'calendar' && view.goalId === goal.id) goHome();
    if (await removeGoal(goal.id)) toast.show('Meta eliminada');
  };

  /* ---------- Copia de seguridad ---------- */
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ goals }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mis-metas-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast.show('Copia de seguridad descargada');
  };

  const importData = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let imported: Goal[];
    try {
      imported = withNewIds(parseBackup(await file.text()));
    } catch {
      toast.show('⚠ El archivo no es una copia válida de Mis Metas');
      return;
    }
    if (!confirm(`Se encontraron ${imported.length} meta(s).\n¿Reemplazar TODAS tus metas actuales con las del archivo?`)) return;
    goHome();
    if (await importGoals(imported, 'replace')) toast.show('Datos importados correctamente');
  };

  const migrateLocal = async () => {
    if (await importGoals(withNewIds(localGoals), 'append')) {
      clearLocalGoals();
      setLocalGoals([]);
      toast.show(`☁️ ${localGoals.length} meta(s) subidas a tu cuenta`);
    }
  };

  const discardLocal = () => {
    if (!confirm('¿Descartar las metas guardadas en este navegador? No se subirán a tu cuenta.')) return;
    clearLocalGoals();
    setLocalGoals([]);
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
  };

  /* ---------- Render ---------- */
  let content: ReactNode;
  if (status === 'loading' || status === 'idle') {
    content = <p className="loading muted">Cargando tus metas…</p>;
  } else if (status === 'error') {
    content = (
      <section className="empty">
        <div className="big-emoji">⚠️</div>
        <h2>No se pudieron cargar tus metas</h2>
        <p>{loadError}</p>
        <button className="btn primary" onClick={reload}>Reintentar</button>
      </section>
    );
  } else if (view.name === 'calendar' && calendarGoal) {
    content = (
      <CalendarView
        goal={calendarGoal}
        goals={goals}
        today={today}
        year={view.year}
        month={view.month}
        onNavigate={(year, month) => setView({ ...view, year, month })}
        onSwitchGoal={id => {
          const g = goals.find(x => x.id === id);
          if (g) openCalendar(g);
        }}
        onBack={goHome}
        onEdit={goal => setGoalForm({ goal })}
        onDayClick={setDayKey}
      />
    );
  } else {
    content = (
      <GoalList
        goals={goals}
        today={today}
        onNew={() => setGoalForm({ goal: null })}
        onToggleToday={toggleToday}
        onOpenCalendar={openCalendar}
        onEdit={goal => setGoalForm({ goal })}
        onDelete={deleteGoal}
      />
    );
  }

  return (
    <>
      <Topbar onHome={goHome}>
        <span className="user-email muted small" title={session.user.email}>{session.user.email}</span>
        <button className="btn ghost" title="Descargar una copia de seguridad" onClick={exportData}>
          ⬇ Exportar
        </button>
        <label className="btn ghost" htmlFor="file-import" title="Cargar una copia de seguridad">
          ⬆ Importar
        </label>
        <input id="file-import" type="file" accept="application/json,.json" hidden onChange={importData} />
        <button className="btn primary" onClick={() => setGoalForm({ goal: null })}>
          + Nueva meta
        </button>
        <button className="btn ghost" onClick={signOut} title="Cerrar sesión">
          Salir
        </button>
      </Topbar>

      <main>
        {status === 'ready' && localGoals.length > 0 && (
          <div className="banner info">
            <span>
              Tienes <b>{localGoals.length}</b> meta(s) guardadas solo en este navegador (versión anterior).
            </span>
            <span className="banner-actions">
              <button className="btn primary" onClick={migrateLocal}>☁️ Subir a mi cuenta</button>
              <button className="btn ghost" onClick={discardLocal}>Descartar</button>
            </span>
          </div>
        )}
        {content}
      </main>

      {goalForm && (
        <GoalFormDialog
          key={goalForm.goal?.id ?? 'new'}
          goal={goalForm.goal}
          usedColors={goals.map(g => g.color)}
          onClose={() => setGoalForm(null)}
          onSave={saveGoal}
        />
      )}

      {calendarGoal && dayKey && (
        <DayDialog
          key={dayKey}
          goal={calendarGoal}
          dateKey={dayKey}
          onClose={() => setDayKey(null)}
          onSave={saveDay}
        />
      )}

      <div id="toast" className={toast.visible ? 'show' : ''} role="status" aria-live="polite">
        {toast.message}
      </div>
    </>
  );
}
