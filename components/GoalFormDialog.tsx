'use client';

import { type FormEvent, useState } from 'react';
import { addDays, isValidKey, oneYearFrom, todayKey } from '@/lib/dates';
import { COLORS, type Goal, type GoalInput, periodLength } from '@/lib/goals';
import Modal from './Modal';

type Props = {
  goal: Goal | null;
  usedColors: string[];
  onClose: () => void;
  onSave: (data: GoalInput) => void;
};

const RANGES = [
  { id: '30', label: '30 días' },
  { id: '90', label: '3 meses' },
  { id: '180', label: '6 meses' },
  { id: 'year', label: '1 año' },
  { id: 'thisyear', label: 'Este año' },
];

export default function GoalFormDialog({ goal, usedColors, onClose, onSave }: Props) {
  const today = todayKey();
  const [name, setName] = useState(goal?.name ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [start, setStart] = useState(goal?.start ?? today);
  const [end, setEnd] = useState(goal?.end ?? oneYearFrom(today));
  const [targetText, setTargetText] = useState(goal ? String(goal.target) : '');
  // Si el usuario no cambió los días a cumplir, se usan todos los días del periodo
  const [targetTouched, setTargetTouched] = useState(
    goal ? goal.target !== periodLength(goal.start, goal.end) : false,
  );
  const [color, setColor] = useState(
    goal?.color ?? COLORS.find(c => !usedColors.includes(c)) ?? COLORS[usedColors.length % COLORS.length],
  );
  const [error, setError] = useState('');

  const total = isValidKey(start) && isValidKey(end) && end >= start ? periodLength(start, end) : 0;
  const target = targetTouched ? targetText : total ? String(total) : '';

  const applyRange = (range: string) => {
    if (range === 'thisyear') {
      const y = new Date().getFullYear();
      setStart(`${y}-01-01`);
      setEnd(`${y}-12-31`);
    } else {
      const from = isValidKey(start) ? start : today;
      setStart(from);
      setEnd(range === 'year' ? oneYearFrom(from) : addDays(from, Number(range) - 1));
    }
    setTargetTouched(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const targetNum = parseInt(target, 10);

    if (!cleanName) return setError('Escribe un nombre para tu meta.');
    if (!isValidKey(start) || !isValidKey(end)) return setError('Elige las fechas de inicio y fin.');
    if (end < start) return setError('La fecha de fin debe ser igual o posterior a la de inicio.');
    if (!targetNum || targetNum < 1 || targetNum > total) {
      return setError(`Los días a cumplir deben estar entre 1 y ${total}.`);
    }

    onSave({ name: cleanName, description: description.trim(), start, end, target: targetNum, color });
  };

  return (
    <Modal onClose={onClose} labelledBy="goal-dialog-title">
      <form onSubmit={submit} noValidate>
        <h2 id="goal-dialog-title">{goal ? 'Editar meta' : 'Nueva meta'}</h2>

        <label className="field">
          <span>Nombre de la meta *</span>
          <input
            type="text"
            maxLength={80}
            placeholder="Ej: Hacer ejercicio 30 minutos"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </label>

        <label className="field">
          <span>Descripción (opcional)</span>
          <textarea
            rows={2}
            maxLength={300}
            placeholder="¿Por qué es importante para ti?"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </label>

        <div className="field">
          <span>Duración rápida</span>
          <div className="chips">
            {RANGES.map(r => (
              <button key={r.id} type="button" className="chip" onClick={() => applyRange(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <label className="field">
            <span>Fecha de inicio *</span>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>Fecha de fin *</span>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>Días que quieres cumplir *</span>
          <input
            type="number"
            min={1}
            max={total || undefined}
            step={1}
            value={target}
            onChange={e => {
              setTargetTouched(true);
              setTargetText(e.target.value);
            }}
          />
          {total > 0 && (
            <small className="muted">
              El periodo tiene {total} días. Pon un número menor si no necesitas cumplirla todos los días (ej: 3
              veces por semana).
            </small>
          )}
        </label>

        <div className="field">
          <span>Color</span>
          <div className="swatches">
            {COLORS.map(c => (
              <label key={c} title={c}>
                <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} />
                <span style={{ background: c }} />
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

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
