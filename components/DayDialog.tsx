'use client';

import { type FormEvent, useState } from 'react';
import { fmtLong } from '@/lib/dates';
import type { Goal } from '@/lib/goals';
import Modal from './Modal';

type Props = {
  goal: Goal;
  dateKey: string;
  onClose: () => void;
  onSave: (done: boolean, note: string) => void;
};

/** Registrar (o corregir) si se cumplió la meta en un día concreto. */
export default function DayDialog({ goal, dateKey, onClose, onSave }: Props) {
  const [done, setDone] = useState(!!goal.checkins[dateKey]);
  const [note, setNote] = useState(goal.checkins[dateKey]?.note ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(done, note);
  };

  return (
    <Modal onClose={onClose} labelledBy="day-dialog-title">
      <form onSubmit={submit}>
        <p className="muted small">{goal.name}</p>
        <h2 id="day-dialog-title">{fmtLong(dateKey)}</h2>

        <label className="switch-row">
          <input type="checkbox" checked={done} onChange={e => setDone(e.target.checked)} />
          <span className="switch" aria-hidden="true" />
          <span>Cumplí con mi meta este día</span>
        </label>

        <label className="field">
          <span>Nota (opcional)</span>
          <textarea
            rows={3}
            maxLength={300}
            placeholder="¿Qué hiciste? ¿Cómo te sentiste?"
            value={note}
            onChange={e => {
              setNote(e.target.value);
              // Si escribe una nota, se marca automáticamente como cumplido
              if (e.target.value.trim()) setDone(true);
            }}
          />
        </label>

        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn primary">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
