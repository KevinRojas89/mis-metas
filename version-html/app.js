'use strict';

/* =========================================================
   Mis Metas — los datos se guardan en el navegador (localStorage)
   ========================================================= */

const STORAGE_KEY = 'mis-metas-v1';
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#84cc16'];

const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- Utilidades de fechas (clave = 'YYYY-MM-DD' en hora local) ---------- */
const pad = n => String(n).padStart(2, '0');
const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const todayKey = () => toKey(new Date());
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
const diffDays = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);
const fmtShort = k => fromKey(k).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtLong = k => fromKey(k).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const isValidKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && toKey(fromKey(k)) === k;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- Estado ---------- */
let state = load();
let view = { name: 'list', goalId: null, year: 0, month: 0 };
const shownPct = {}; // para animar la barra de progreso desde su valor anterior

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.goals)) return { goals: data.goals.map(sanitizeGoal).filter(Boolean) };
    }
  } catch (e) {
    console.error('No se pudieron leer los datos guardados', e);
  }
  return { goals: [] };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('⚠ No se pudo guardar. ¿El navegador está en modo privado?');
  }
}

function sanitizeGoal(g) {
  if (!g || typeof g !== 'object' || !isValidKey(g.start) || !isValidKey(g.end)) return null;
  const checkins = {};
  if (g.checkins && typeof g.checkins === 'object') {
    for (const [k, v] of Object.entries(g.checkins)) {
      if (isValidKey(k)) checkins[k] = { note: String(v?.note ?? '').slice(0, 300) };
    }
  }
  const total = diffDays(g.start, g.end) + 1;
  return {
    id: String(g.id || uid()),
    name: String(g.name || 'Meta sin nombre').slice(0, 80),
    description: String(g.description || '').slice(0, 300),
    start: g.start,
    end: g.end,
    target: Math.max(1, Math.min(total, parseInt(g.target, 10) || total)),
    color: COLORS.includes(g.color) ? g.color : COLORS[0],
    createdAt: g.createdAt || new Date().toISOString(),
    checkins,
  };
}

const getGoal = id => state.goals.find(g => g.id === id);

/* ---------- Cálculos ---------- */
function dayClass(g, k, today = todayKey()) {
  if (k < g.start || k > g.end) return 'out';
  if (g.checkins[k]) return 'done';
  if (k > today) return 'future';
  if (k === today) return 'pending';
  return 'missed';
}

function goalStats(g) {
  const today = todayKey();
  const total = diffDays(g.start, g.end) + 1;
  const target = g.target || total;
  const keys = Object.keys(g.checkins).filter(k => k >= g.start && k <= g.end).sort();
  const done = keys.length;
  const pct = Math.min(100, Math.round((done / target) * 100));

  // Días pasados (sin contar hoy) que no se marcaron
  const yesterday = addDays(today, -1);
  const lastPast = yesterday < g.end ? yesterday : g.end;
  const pastDays = lastPast >= g.start ? diffDays(g.start, lastPast) + 1 : 0;
  const donePast = keys.filter(k => k <= lastPast).length;
  const missed = Math.max(0, pastDays - donePast);

  // Días que todavía quedan (incluye hoy si no se ha marcado)
  const firstLeft = today > g.start ? today : g.start;
  const daysLeft = firstLeft <= g.end ? diffDays(firstLeft, g.end) + 1 - (g.checkins[today] && today >= g.start ? 1 : 0) : 0;

  // Racha actual
  let streak = 0;
  let d = g.checkins[today] ? today : yesterday;
  while (g.checkins[d] && d >= g.start) { streak++; d = addDays(d, -1); }

  // Mejor racha
  let best = 0, cur = 0, prev = null;
  for (const k of keys) {
    cur = prev && diffDays(prev, k) === 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
    prev = k;
  }

  const status = today < g.start ? 'pending' : today > g.end ? 'finished' : 'active';
  return { total, target, done, pct, missed, daysLeft, streak, best, status, completed: done >= target, remaining: Math.max(0, target - done) };
}

function statusBadge(s) {
  if (s.completed) return '<span class="badge completed">🏆 ¡Cumplida!</span>';
  const label = { active: 'En curso', pending: 'Por empezar', finished: 'Finalizada' }[s.status];
  return `<span class="badge ${s.status}">${label}</span>`;
}

/* ---------- Render ---------- */
const app = $('#app');

function render() {
  if (view.name === 'calendar' && getGoal(view.goalId)) renderCalendar();
  else { view.name = 'list'; renderList(); }
  animateBars();
}

function progressBar(g, pct, big = false) {
  const from = shownPct[g.id] ?? 0;
  return `<div class="progress ${big ? 'big' : ''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <div class="bar" data-id="${g.id}" data-pct="${pct}" style="width:${from}%"></div></div>`;
}

function animateBars() {
  void app.offsetWidth; // forzar reflow para que la transición se vea
  requestAnimationFrame(() => {
    app.querySelectorAll('.bar[data-pct]').forEach(b => {
      b.style.width = b.dataset.pct + '%';
      shownPct[b.dataset.id] = Number(b.dataset.pct);
    });
  });
}

function renderList() {
  if (!state.goals.length) {
    app.innerHTML = `
      <section class="empty">
        <div class="big-emoji">🎯</div>
        <h2>Aún no tienes metas</h2>
        <p>Crea tu primera meta, marca cada día que la cumplas y mira cómo avanza tu progreso en el calendario.</p>
        <button class="btn primary" data-action="new">+ Crear mi primera meta</button>
      </section>`;
    return;
  }

  const today = todayKey();
  const stats = state.goals.map(goalStats);
  const active = state.goals.filter((g, i) => stats[i].status === 'active');
  const doneToday = active.filter(g => g.checkins[today]).length;
  const completed = stats.filter(s => s.completed).length;
  const bestStreak = Math.max(0, ...stats.map(s => s.streak));

  app.innerHTML = `
    <section class="summary">
      <div class="stat"><div class="label">Metas en curso</div><div class="value">${active.length}</div></div>
      <div class="stat"><div class="label">Cumplidas hoy</div><div class="value">${doneToday} / ${active.length}</div></div>
      <div class="stat"><div class="label">Metas logradas</div><div class="value">🏆 ${completed}</div></div>
      <div class="stat"><div class="label">Mejor racha actual</div><div class="value">🔥 ${bestStreak}</div></div>
    </section>
    <div class="section-title">
      <h2>Mis metas</h2>
      <span class="muted small">Hoy es ${esc(fmtLong(today))}</span>
    </div>
    <section class="grid">${state.goals.map((g, i) => cardHTML(g, stats[i], today)).join('')}</section>`;
}

function cardHTML(g, s, today) {
  const checked = !!g.checkins[today];
  const inRange = s.status === 'active';
  let todayLabel = checked ? '✔ Cumplido hoy · deshacer' : '✅ Hoy cumplí';
  if (!inRange) todayLabel = s.status === 'pending' ? `Empieza el ${fmtShort(g.start)}` : 'Meta finalizada';

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
    .map(k => `<span class="dot ${dayClass(g, k, today)}" title="${esc(fmtShort(k))}"></span>`).join('');

  return `
    <article class="card" style="--goal:${g.color}">
      <div class="card-head">
        <div>
          <h3>${esc(g.name)}</h3>
          <div class="muted small">${esc(fmtShort(g.start))} → ${esc(fmtShort(g.end))}</div>
        </div>
        ${statusBadge(s)}
      </div>
      ${g.description ? `<p class="desc">${esc(g.description)}</p>` : ''}
      <div>
        <div class="progress-info"><span><strong>${s.done}</strong> de ${s.target} días</span><span class="pct">${s.pct}%</span></div>
        ${progressBar(g, s.pct)}
      </div>
      <div class="card-stats">
        <span>🔥 Racha <b>${s.streak}</b></span>
        <span>🏆 Mejor <b>${s.best}</b></span>
        <span>❌ Sin cumplir <b>${s.missed}</b></span>
        <span>🎯 Faltan <b>${s.remaining}</b></span>
      </div>
      <div class="dots"><span class="dots-label">Últimos 14 días</span>${last14}</div>
      <div class="card-actions">
        <button class="btn ${checked ? 'success' : 'primary'} grow" data-action="toggle-today" data-id="${g.id}" ${inRange ? '' : 'disabled'}>${esc(todayLabel)}</button>
        <button class="btn icon" data-action="calendar" data-id="${g.id}" title="Ver calendario">📅</button>
        <button class="btn icon" data-action="edit" data-id="${g.id}" title="Editar">✏️</button>
        <button class="btn icon danger" data-action="delete" data-id="${g.id}" title="Eliminar">🗑️</button>
      </div>
    </article>`;
}

function renderCalendar() {
  const g = getGoal(view.goalId);
  const s = goalStats(g);
  const today = todayKey();
  const { year, month } = view;

  // Cuadrícula del mes
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes primero
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let cells = '<button class="day empty-cell" disabled tabindex="-1"></button>'.repeat(offset);
  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${year}-${pad(month + 1)}-${pad(d)}`;
    const cls = dayClass(g, k, today);
    const clickable = cls !== 'out' && cls !== 'future';
    const mark = { done: '✓', missed: '✕', pending: '•' }[cls] || '';
    const note = g.checkins[k]?.note;
    const title = cls === 'out' ? 'Fuera del periodo de la meta'
      : cls === 'future' ? 'Día futuro' : (note ? `Nota: ${note}` : 'Clic para registrar');
    cells += `<button class="day ${cls} ${k === today ? 'is-today' : ''}" data-action="day" data-key="${k}"
      title="${esc(title)}" ${clickable ? '' : 'disabled'}>
      ${note ? '<span class="note-flag">📝</span>' : ''}
      <span class="num">${d}</span><span class="mark">${mark}</span></button>`;
  }

  // Resumen anual
  let yearDone = 0;
  const minis = MONTHS.map((name, m) => {
    const off = (new Date(year, m, 1).getDay() + 6) % 7;
    const dim = new Date(year, m + 1, 0).getDate();
    let cnt = 0, html = '<i class="blank"></i>'.repeat(off);
    for (let d = 1; d <= dim; d++) {
      const k = `${year}-${pad(m + 1)}-${pad(d)}`;
      const cls = dayClass(g, k, today);
      if (cls === 'done') cnt++;
      html += `<i class="${cls}"></i>`;
    }
    yearDone += cnt;
    return `<button class="mini ${m === month ? 'current' : ''}" data-action="goto-month" data-month="${m}" title="${name} ${year}">
      <div class="mini-title"><span>${name.slice(0, 3)}</span><span class="count">${cnt ? cnt + ' ✓' : ''}</span></div>
      <div class="mini-grid">${html}</div></button>`;
  }).join('');

  const options = state.goals.map(x =>
    `<option value="${x.id}" ${x.id === g.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');

  app.innerHTML = `
    <div class="cal-header">
      <button class="btn ghost" data-action="home">← Volver</button>
      <select data-action="switch-goal" aria-label="Elegir meta">${options}</select>
      <span class="spacer"></span>
      <button class="btn ghost" data-action="edit" data-id="${g.id}">✏️ Editar meta</button>
    </div>

    <section class="goal-overview" style="--goal:${g.color}">
      <div class="card-head" style="margin-bottom:12px">
        <div>
          <div class="muted small">${esc(fmtShort(g.start))} → ${esc(fmtShort(g.end))} · ${s.total} días en total</div>
          ${g.description ? `<p class="desc" style="margin-top:4px">${esc(g.description)}</p>` : ''}
        </div>
        ${statusBadge(s)}
      </div>
      <div class="progress-info"><span><strong>${s.done}</strong> de ${s.target} días cumplidos</span><span class="pct">${s.pct}%</span></div>
      ${progressBar(g, s.pct, true)}
      <div class="mini-stats">
        <div><div class="label">✅ Cumplidos</div><div class="value">${s.done}</div></div>
        <div><div class="label">❌ Sin cumplir</div><div class="value">${s.missed}</div></div>
        <div><div class="label">🔥 Racha actual</div><div class="value">${s.streak}</div></div>
        <div><div class="label">🏆 Mejor racha</div><div class="value">${s.best}</div></div>
        <div><div class="label">🎯 Faltan para la meta</div><div class="value">${s.remaining}</div></div>
        <div><div class="label">📆 Días restantes</div><div class="value">${s.daysLeft}</div></div>
      </div>
    </section>

    <div class="cal-layout">
      <section class="panel" style="--goal:${g.color}">
        <div class="month-nav">
          <button class="btn icon" data-action="prev-month" title="Mes anterior">◀</button>
          <h3>${MONTHS[month]} ${year}</h3>
          <button class="btn icon" data-action="next-month" title="Mes siguiente">▶</button>
          <button class="btn ghost" data-action="this-month">Hoy</button>
        </div>
        <div class="weekdays">${WEEKDAYS.map(w => `<div>${w}</div>`).join('')}</div>
        <div class="month-grid">${cells}</div>
        <div class="legend">
          <span><i class="dot done" style="background:${g.color};border-color:${g.color}"></i>Cumplido</span>
          <span><i class="dot missed"></i>Sin cumplir</span>
          <span><i class="dot pending" style="border-color:${g.color}"></i>Hoy (pendiente)</span>
          <span><i class="dot"></i>Futuro</span>
          <span>📝 Con nota</span>
        </div>
        <p class="hint">💡 Haz clic en cualquier día (hoy o pasado) para marcarlo como cumplido, quitar la marca o agregar una nota. Ideal si se te olvidó registrarlo.</p>
      </section>

      <section class="panel" style="--goal:${g.color}">
        <div class="month-nav">
          <button class="btn icon" data-action="prev-year" title="Año anterior">◀</button>
          <h3>Año ${year} · ${yearDone} ✓</h3>
          <button class="btn icon" data-action="next-year" title="Año siguiente">▶</button>
        </div>
        <div class="year-grid">${minis}</div>
      </section>
    </div>`;
}

/* ---------- Acciones ---------- */
function openCalendar(id) {
  const g = getGoal(id);
  if (!g) return;
  const today = todayKey();
  const ref = today < g.start ? g.start : today > g.end ? g.end : today;
  const d = fromKey(ref);
  view = { name: 'calendar', goalId: id, year: d.getFullYear(), month: d.getMonth() };
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setCheckin(g, key, done, note = '') {
  const before = goalStats(g).completed;
  if (done) g.checkins[key] = { note: note.trim().slice(0, 300) };
  else delete g.checkins[key];
  save();
  const after = goalStats(g).completed;
  if (!before && after) toast(`🎉 ¡Felicidades! Lograste tu meta "${g.name}"`);
  return after;
}

function toggleToday(id) {
  const g = getGoal(id);
  const k = todayKey();
  if (!g || k < g.start || k > g.end) return;
  if (g.checkins[k]) {
    setCheckin(g, k, false);
    toast('Marca de hoy eliminada');
  } else {
    const wasCompleted = goalStats(g).completed;
    setCheckin(g, k, true);
    if (wasCompleted || !goalStats(g).completed) toast('💪 ¡Bien hecho! Avance de hoy registrado');
  }
  render();
}

function deleteGoal(id) {
  const g = getGoal(id);
  if (!g) return;
  if (!confirm(`¿Eliminar la meta "${g.name}"?\nSe borrará también todo su historial. Esta acción no se puede deshacer.`)) return;
  state.goals = state.goals.filter(x => x.id !== id);
  delete shownPct[id];
  save();
  if (view.goalId === id) view = { name: 'list', goalId: null, year: 0, month: 0 };
  render();
  toast('Meta eliminada');
}

function shiftMonth(delta) {
  const d = new Date(view.year, view.month + delta, 1);
  view.year = d.getFullYear();
  view.month = d.getMonth();
  render();
}

app.addEventListener('change', e => {
  if (e.target.matches('[data-action="switch-goal"]')) openCalendar(e.target.value);
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled || el.tagName === 'SELECT') return;
  const id = el.dataset.id;
  switch (el.dataset.action) {
    case 'home': view = { name: 'list', goalId: null, year: 0, month: 0 }; render(); break;
    case 'new': openGoalDialog(); break;
    case 'edit': openGoalDialog(getGoal(id)); break;
    case 'delete': deleteGoal(id); break;
    case 'calendar': openCalendar(id); break;
    case 'toggle-today': toggleToday(id); break;
    case 'prev-month': shiftMonth(-1); break;
    case 'next-month': shiftMonth(1); break;
    case 'prev-year': shiftMonth(-12); break;
    case 'next-year': shiftMonth(12); break;
    case 'this-month': { const d = new Date(); view.year = d.getFullYear(); view.month = d.getMonth(); render(); break; }
    case 'goto-month': view.month = Number(el.dataset.month); render(); break;
    case 'day': openDayDialog(el.dataset.key); break;
  }
});

/* ---------- Diálogo: crear / editar meta ---------- */
const goalDialog = $('#goalDialog');
const goalForm = $('#goalForm');
const goalError = $('#goalError');
const targetHint = $('#targetHint');
let editingId = null;
let targetTouched = false;

$('#swatches').innerHTML = COLORS.map((c, i) =>
  `<label title="${c}"><input type="radio" name="color" value="${c}" ${i === 0 ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('');

function periodDays() {
  const { start, end } = goalForm.elements;
  if (!isValidKey(start.value) || !isValidKey(end.value) || end.value < start.value) return 0;
  return diffDays(start.value, end.value) + 1;
}

function updateTargetHint() {
  const total = periodDays();
  const target = goalForm.elements.target;
  if (total) {
    target.max = total;
    if (!targetTouched) target.value = total;
    targetHint.textContent = `El periodo tiene ${total} días. Pon un número menor si no necesitas cumplirla todos los días (ej: 3 veces por semana).`;
  } else {
    targetHint.textContent = '';
  }
}

function openGoalDialog(g = null) {
  editingId = g ? g.id : null;
  goalForm.reset();
  goalError.textContent = '';
  $('#goalDialogTitle').textContent = g ? 'Editar meta' : 'Nueva meta';
  const f = goalForm.elements;
  const today = todayKey();
  if (g) {
    f.name.value = g.name;
    f.description.value = g.description;
    f.start.value = g.start;
    f.end.value = g.end;
    f.target.value = g.target;
    targetTouched = g.target !== diffDays(g.start, g.end) + 1;
    const radio = goalForm.querySelector(`input[name="color"][value="${g.color}"]`);
    if (radio) radio.checked = true;
  } else {
    f.start.value = today;
    const d = fromKey(today); d.setFullYear(d.getFullYear() + 1); d.setDate(d.getDate() - 1);
    f.end.value = toKey(d);
    targetTouched = false;
    const used = new Set(state.goals.map(x => x.color));
    const color = COLORS.find(c => !used.has(c)) || COLORS[state.goals.length % COLORS.length];
    goalForm.querySelector(`input[name="color"][value="${color}"]`).checked = true;
  }
  updateTargetHint();
  goalDialog.showModal();
  f.name.focus();
}

goalForm.addEventListener('click', e => {
  const chip = e.target.closest('[data-range]');
  if (!chip) return;
  const f = goalForm.elements;
  const range = chip.dataset.range;
  if (range === 'thisyear') {
    const y = new Date().getFullYear();
    f.start.value = `${y}-01-01`;
    f.end.value = `${y}-12-31`;
  } else {
    const start = isValidKey(f.start.value) ? f.start.value : todayKey();
    f.start.value = start;
    if (range === 'year') {
      const d = fromKey(start); d.setFullYear(d.getFullYear() + 1); d.setDate(d.getDate() - 1);
      f.end.value = toKey(d);
    } else {
      f.end.value = addDays(start, Number(range) - 1);
    }
  }
  targetTouched = false;
  updateTargetHint();
});

goalForm.elements.start.addEventListener('change', updateTargetHint);
goalForm.elements.end.addEventListener('change', updateTargetHint);
goalForm.elements.target.addEventListener('input', () => { targetTouched = true; });

goalForm.addEventListener('submit', e => {
  e.preventDefault();
  const f = goalForm.elements;
  const name = f.name.value.trim();
  const start = f.start.value;
  const end = f.end.value;
  const total = periodDays();
  const target = parseInt(f.target.value, 10);

  if (!name) return showGoalError('Escribe un nombre para tu meta.', f.name);
  if (!isValidKey(start) || !isValidKey(end)) return showGoalError('Elige las fechas de inicio y fin.', f.start);
  if (end < start) return showGoalError('La fecha de fin debe ser igual o posterior a la de inicio.', f.end);
  if (!target || target < 1 || target > total) return showGoalError(`Los días a cumplir deben estar entre 1 y ${total}.`, f.target);

  const data = {
    name,
    description: f.description.value.trim(),
    start, end, target,
    color: goalForm.querySelector('input[name="color"]:checked')?.value || COLORS[0],
  };

  if (editingId) {
    Object.assign(getGoal(editingId), data);
    toast('Meta actualizada');
  } else {
    state.goals.push({ id: uid(), createdAt: new Date().toISOString(), checkins: {}, ...data });
    toast('🎯 ¡Meta creada! Ahora a cumplirla');
  }
  save();
  goalDialog.close();
  render();
});

function showGoalError(msg, field) {
  goalError.textContent = msg;
  field?.focus();
}

/* ---------- Diálogo: registrar un día ---------- */
const dayDialog = $('#dayDialog');
const dayForm = $('#dayForm');
let editingDay = null;

function openDayDialog(key) {
  const g = getGoal(view.goalId);
  if (!g || key < g.start || key > g.end || key > todayKey()) return;
  editingDay = key;
  $('#dayGoalName').textContent = g.name;
  $('#dayTitle').textContent = fmtLong(key);
  dayForm.elements.done.checked = !!g.checkins[key];
  dayForm.elements.note.value = g.checkins[key]?.note || '';
  dayDialog.showModal();
}

// Si escribe una nota, se marca automáticamente como cumplido
dayForm.elements.note.addEventListener('input', () => {
  if (dayForm.elements.note.value.trim()) dayForm.elements.done.checked = true;
});

dayForm.addEventListener('submit', e => {
  e.preventDefault();
  const g = getGoal(view.goalId);
  if (!g || !editingDay) return;
  const done = dayForm.elements.done.checked;
  const wasCompleted = goalStats(g).completed;
  const nowCompleted = setCheckin(g, editingDay, done, dayForm.elements.note.value);
  if (wasCompleted || !nowCompleted) toast(done ? '✅ Día registrado como cumplido' : 'Día marcado como no cumplido');
  dayDialog.close();
  render();
});

// Botones "Cancelar" y clic fuera del diálogo
document.querySelectorAll('dialog').forEach(dlg => {
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
});

/* ---------- Exportar / importar ---------- */
$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mis-metas-${todayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Copia de seguridad descargada');
});

$('#fileImport').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.goals)) throw new Error('formato');
    const goals = data.goals.map(sanitizeGoal).filter(Boolean);
    if (!confirm(`Se encontraron ${goals.length} meta(s).\n¿Reemplazar tus metas actuales con las del archivo?`)) return;
    state = { goals };
    save();
    view = { name: 'list', goalId: null, year: 0, month: 0 };
    render();
    toast('Datos importados correctamente');
  } catch {
    toast('⚠ El archivo no es una copia válida de Mis Metas');
  }
});

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// Si la página queda abierta y cambia el día, se actualiza sola
let lastDay = todayKey();
setInterval(() => {
  if (todayKey() !== lastDay) { lastDay = todayKey(); render(); }
}, 60000);

render();
