'use client';

import { type ChangeEvent, useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useToast } from '@/hooks/useToast';
import { useToday } from '@/hooks/useToday';
import { fromKey } from '@/lib/dates';
import { type Goal, type GoalInput, goalStats, parseBackup, uid, withCheckin } from '@/lib/goals';
import CalendarView from './CalendarView';
import DayDialog from './DayDialog';
import GoalFormDialog from './GoalFormDialog';
import GoalList from './GoalList';

type View = { name: 'list' } | { name: 'calendar'; goalId: string; year: number; month: number };

/** Formulario abierto: `null` = cerrado, `{ goal: null }` = nueva meta. */
type GoalFormState = { goal: Goal | null } | null;

export default function GoalsApp() {
  const { goals, loaded, saveFailed, addGoal, updateGoal, removeGoal, replaceAll } = useGoals();
  const today = useToday();
  const toast = useToast();

  const [view, setView] = useState<View>({ name: 'list' });
  const [goalForm, setGoalForm] = useState<GoalFormState>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);

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
  const saveCheckin = (goal: Goal, key: string, done: boolean, note = '') => {
    const updated = withCheckin(goal, key, done, note);
    const justCompleted = !goalStats(goal, today).completed && goalStats(updated, today).completed;
    updateGoal(updated);
    return justCompleted;
  };

  const toggleToday = (goal: Goal) => {
    if (today < goal.start || today > goal.end) return;
    const checked = !!goal.checkins[today];
    const justCompleted = saveCheckin(goal, today, !checked);
    if (justCompleted) toast.show(`🎉 ¡Felicidades! Lograste tu meta "${goal.name}"`);
    else toast.show(checked ? 'Marca de hoy eliminada' : '💪 ¡Bien hecho! Avance de hoy registrado');
  };

  const saveDay = (done: boolean, note: string) => {
    if (!calendarGoal || !dayKey) return;
    const justCompleted = saveCheckin(calendarGoal, dayKey, done, note);
    if (justCompleted) toast.show(`🎉 ¡Felicidades! Lograste tu meta "${calendarGoal.name}"`);
    else toast.show(done ? '✅ Día registrado como cumplido' : 'Día marcado como no cumplido');
    setDayKey(null);
  };

  /* ---------- Crear / editar / eliminar ---------- */
  const saveGoal = (data: GoalInput) => {
    const editing = goalForm?.goal;
    if (editing) {
      updateGoal({ ...editing, ...data });
      toast.show('Meta actualizada');
    } else {
      addGoal({ id: uid(), createdAt: new Date().toISOString(), checkins: {}, ...data });
      toast.show('🎯 ¡Meta creada! Ahora a cumplirla');
    }
    setGoalForm(null);
  };

  const deleteGoal = (goal: Goal) => {
    const ok = confirm(
      `¿Eliminar la meta "${goal.name}"?\nSe borrará también todo su historial. Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    removeGoal(goal.id);
    if (view.name === 'calendar' && view.goalId === goal.id) goHome();
    toast.show('Meta eliminada');
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
    try {
      const imported = parseBackup(await file.text());
      if (!confirm(`Se encontraron ${imported.length} meta(s).\n¿Reemplazar tus metas actuales con las del archivo?`)) return;
      replaceAll(imported);
      goHome();
      toast.show('Datos importados correctamente');
    } catch {
      toast.show('⚠ El archivo no es una copia válida de Mis Metas');
    }
  };

  /* ---------- Render ---------- */
  return (
    <>
      <header className="topbar">
        <button className="brand" title="Ir a mis metas" onClick={goHome}>
          🎯 <span>Mis Metas</span>
        </button>
        <div className="top-actions">
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
        </div>
      </header>

      <main>
        {saveFailed && (
          <p className="banner">⚠ No se pudieron guardar los cambios. ¿El navegador está en modo privado?</p>
        )}

        {!loaded ? (
          <p className="loading muted">Cargando tus metas…</p>
        ) : view.name === 'calendar' && calendarGoal ? (
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
        ) : (
          <GoalList
            goals={goals}
            today={today}
            onNew={() => setGoalForm({ goal: null })}
            onToggleToday={toggleToday}
            onOpenCalendar={openCalendar}
            onEdit={goal => setGoalForm({ goal })}
            onDelete={deleteGoal}
          />
        )}
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
