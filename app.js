/* ============ Rasm — daily routine tracker ============
   All data lives in localStorage on this device only. */

const STORAGE_KEYS = {
  categories: 'rasm_categories',
  tasks: 'rasm_tasks',
  logs: 'rasm_logs',
  settings: 'rasm_settings',
};

const CATEGORY_COLORS = ['#4FA095', '#D2A24C', '#C1666B', '#6B8CBF', '#8C7AAE', '#5C9E6F'];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

let state = {
  categories: [],
  tasks: [],
  logs: {},
  settings: { theme: 'dark', notifPermission: 'default' },
};

let calendarCursor = new Date(); // month currently shown in calendar view
let editingTaskId = null;
let editingCategoryId = null;
let pendingTaskDays = [0, 1, 2, 3, 4, 5, 6];
let pendingSubtasks = [];
let collapsedCategories = new Set();

function renderSubtaskEditor() {
  const holder = document.getElementById('subtaskEditor');
  holder.innerHTML = '';
  pendingSubtasks.forEach((st) => {
    const row = document.createElement('div');
    row.className = 'subtask-editor-row';
    row.innerHTML = `<input type="text" value="${escapeHtml(st.name)}" placeholder="e.g. Azkar"><button type="button" class="subtask-remove">✕</button>`;
    const input = row.querySelector('input');
    input.addEventListener('input', () => { st.name = input.value; });
    row.querySelector('.subtask-remove').addEventListener('click', () => {
      pendingSubtasks = pendingSubtasks.filter(s => s.id !== st.id);
      renderSubtaskEditor();
    });
    holder.appendChild(row);
  });
}
document.getElementById('addSubtaskBtn').addEventListener('click', () => {
  pendingSubtasks.push({ id: uid(), name: '', attachments: [] });
  renderSubtaskEditor();
  const inputs = document.querySelectorAll('#subtaskEditor input');
  if (inputs.length) inputs[inputs.length - 1].focus();
});

/* ---------- Storage ---------- */
function loadState() {
  try {
    const c = localStorage.getItem(STORAGE_KEYS.categories);
    const t = localStorage.getItem(STORAGE_KEYS.tasks);
    const l = localStorage.getItem(STORAGE_KEYS.logs);
    const s = localStorage.getItem(STORAGE_KEYS.settings);
    state.categories = c ? JSON.parse(c) : null;
    state.tasks = t ? JSON.parse(t) : null;
    state.logs = l ? JSON.parse(l) : {};
    state.settings = s ? JSON.parse(s) : { theme: 'dark', notifPermission: 'default' };
  } catch (e) {
    console.error('Failed to load state', e);
  }
  if (!state.categories) seedDefaults();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(state.categories));
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(state.logs));
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
    return true;
  } catch (e) {
    console.error('Failed to save state', e);
    return false;
  }
}

function seedDefaults() {
  const today = dateKey(new Date());
  state.categories = [
    { id: uid(), name: 'Religious', icon: '🕌', color: CATEGORY_COLORS[0] },
    { id: uid(), name: 'Educational', icon: '📘', color: CATEGORY_COLORS[3] },
    { id: uid(), name: 'Health', icon: '💪', color: CATEGORY_COLORS[5] },
    { id: uid(), name: 'Financial', icon: '💰', color: CATEGORY_COLORS[1] },
  ];
  const [rel, edu, health, fin] = state.categories;
  state.tasks = [
    task(rel.id, 'Fajr', '05:00', 'high', true, today, undefined, [{ id: uid(), name: 'Azkar' }]),
    task(rel.id, 'Dhuhr', '12:30', 'high', true, today),
    task(rel.id, 'Asr', '15:45', 'high', true, today),
    task(rel.id, 'Maghrib', '18:20', 'high', true, today),
    task(rel.id, 'Isha', '20:00', 'high', true, today),
    task(edu.id, 'Read 20 pages', '21:00', 'medium', false, today),
    task(health.id, 'Exercise 30 min', '07:00', 'medium', false, today),
    task(health.id, 'Drink 2L water', '', 'low', false, today),
    task(fin.id, 'Log today\'s expenses', '21:30', 'medium', false, today),
  ];
  state.logs = {};
  state.settings = { theme: 'dark', notifPermission: 'default' };
  saveState();
}

function task(categoryId, name, time, importance, notify, createdAt, days, subtasks, attachments) {
  return {
    id: uid(), categoryId, name, time, importance, notify: !!notify,
    days: days || [0, 1, 2, 3, 4, 5, 6], createdAt, subtasks: subtasks || [], attachments: attachments || [],
  };
}

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

/* ---------- Date helpers ---------- */
function dateKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fromKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }
function isSameDay(a, b) { return dateKey(a) === dateKey(b); }

function isTaskDone(t, key) {
  const log = state.logs[key];
  if (t.subtasks && t.subtasks.length > 0) {
    const sd = log && log.subtasksDone && log.subtasksDone[t.id];
    if (!sd) return false;
    return t.subtasks.every(st => sd[st.id]);
  }
  return !!(log && log.done && log.done[t.id]);
}

function subtaskDoneCount(t, key) {
  if (!t.subtasks || t.subtasks.length === 0) return 0;
  const log = state.logs[key];
  const sd = log && log.subtasksDone && log.subtasksDone[t.id];
  if (!sd) return 0;
  return t.subtasks.filter(st => sd[st.id]).length;
}

/* ---------- Stats ---------- */
function tasksForDate(dateObj) {
  const key = dateKey(dateObj);
  const weekday = dateObj.getDay();
  return state.tasks.filter(t => t.days.includes(weekday) && t.createdAt <= key);
}

function dayStats(dateObj) {
  const key = dateKey(dateObj);
  const scheduled = tasksForDate(dateObj);
  const completed = scheduled.filter(t => isTaskDone(t, key)).length;
  const total = scheduled.length;
  const pct = total === 0 ? null : Math.round((completed / total) * 100);
  return { total, completed, pct, scheduled, key };
}

function computeStreak() {
  let streak = 0;
  let cursor = new Date();
  let guard = 0;
  while (guard < 3650) { // safety cap: never look back more than 10 years
    guard++;
    const { total, pct } = dayStats(cursor);
    if (total === 0) { cursor = addDays(cursor, -1); continue; } // skip days with nothing scheduled
    if (pct === 100) { streak++; cursor = addDays(cursor, -1); }
    else break;
  }
  return streak;
}

function computeBestStreak30() {
  let best = 0, cur = 0;
  for (let i = 29; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const { total, pct } = dayStats(d);
    if (total === 0) continue;
    if (pct === 100) { cur++; best = Math.max(best, cur); } else { cur = 0; }
  }
  return best;
}

/* ---------- Daily background art (rotates automatically, fully offline) ---------- */
const RING_BG_ARTS = [
  // Crescent moon with stars
  `<svg viewBox="0 0 200 200"><path d="M122 55a48 48 0 1 0 8 84 58 58 0 0 1-8-84Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M152 38l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="currentColor" stroke="none"/><path d="M58 140l3.5 8 8 3.5-8 3.5-3.5 8-3.5-8-8-3.5 8-3.5Z" fill="currentColor" stroke="none"/></svg>`,
  // Mosque silhouette
  `<svg viewBox="0 0 200 200"><path d="M42 168v-48h18v-18a8 8 0 0 1 16 0v18h48v-18a8 8 0 0 1 16 0v18h18v48Z" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="100" cy="72" r="22" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M100 50V32" stroke="currentColor" stroke-width="2.5"/><path d="M52 120V64M148 120V64" stroke="currentColor" stroke-width="2.5"/></svg>`,
  // 8-point star (echoes the app logo)
  `<svg viewBox="0 0 200 200"><rect x="55" y="55" width="90" height="90" fill="none" stroke="currentColor" stroke-width="3"/><rect x="55" y="55" width="90" height="90" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(45 100 100)"/></svg>`,
  // Arabesque flowing vine
  `<svg viewBox="0 0 200 200"><path d="M28 100c20-42 62-42 72 0s52 42 72 0M28 100c20 42 62 42 72 0s52-42 72 0" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="100" cy="100" r="4" fill="currentColor"/></svg>`,
  // Ramadan lantern (fanous)
  `<svg viewBox="0 0 200 200"><path d="M85 48h30M100 48V38M74 60h52l-9 68H83Z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M82 128h36l-7 22H89Z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M92 150v16M108 150v16" stroke="currentColor" stroke-width="2.5"/><path d="M88 78h24M83 98h34M88 118h24" stroke="currentColor" stroke-width="2"/></svg>`,
  // Mihrab arch with radiating light (a day's five prayers, sunrise to night)
  `<svg viewBox="0 0 200 200"><path d="M58 162V96a42 42 0 0 1 84 0v66" fill="none" stroke="currentColor" stroke-width="3"/><path d="M100 58V26M68 68 46 46M132 68l22-22" stroke="currentColor" stroke-width="2.5"/></svg>`,
  // Twelve-point geometric rosette
  `<svg viewBox="0 0 200 200"><g fill="none" stroke="currentColor" stroke-width="2.5"><rect x="58" y="58" width="84" height="84"/><rect x="58" y="58" width="84" height="84" transform="rotate(30 100 100)"/><rect x="58" y="58" width="84" height="84" transform="rotate(60 100 100)"/></g></svg>`,
];

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function renderRingBgArt() {
  const el = document.getElementById('ringBgArt');
  if (!el) return;
  const idx = dayOfYear(new Date()) % RING_BG_ARTS.length;
  el.innerHTML = RING_BG_ARTS[idx];
}

/* ---------- Rendering: Today ---------- */
function renderToday() {
  const now = new Date();
  document.getElementById('todayDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  renderRingBgArt();

  const { total, completed, pct } = dayStats(now);
  const circumference = 377; // 2*pi*60
  const ring = document.getElementById('ringProgress');
  const offset = pct === null ? circumference : circumference - (circumference * pct / 100);
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = pct === 100 ? 'var(--accent-strong)' : 'var(--accent)';
  document.getElementById('ringPercent').textContent = total === 0 ? '—' : `${pct}%`;

  document.getElementById('streakCount').textContent = computeStreak();

  renderBeadChain('beadChain', 7, false);

  const cats = state.categories;
  const container = document.getElementById('todayCategories');
  container.innerHTML = '';
  const weekday = now.getDay();
  const key = dateKey(now);

  let anyTasks = false;

  cats.forEach(cat => {
    const catTasks = state.tasks.filter(t => t.categoryId === cat.id && t.days.includes(weekday) && t.createdAt <= key);
    if (catTasks.length === 0) return;
    anyTasks = true;
    const done = catTasks.filter(t => isTaskDone(t, key)).length;
    const isCollapsed = collapsedCategories.has(cat.id);
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="category-header">
        <button class="cat-toggle ${isCollapsed ? 'collapsed' : ''}" data-cat-toggle="${cat.id}">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
        </button>
        <span class="category-icon">${cat.icon}</span>
        <h3>${escapeHtml(cat.name)}</h3>
        <span class="cat-pct">${done}/${catTasks.length}</span>
      </div>
      <div class="tasks-holder" ${isCollapsed ? 'hidden' : ''}></div>
    `;
    card.querySelector('.cat-toggle').addEventListener('click', () => {
      if (collapsedCategories.has(cat.id)) collapsedCategories.delete(cat.id);
      else collapsedCategories.add(cat.id);
      renderToday();
    });
    const holder = card.querySelector('.tasks-holder');
    catTasks
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
      .forEach(t => {
        const isDone = isTaskDone(t, key);
        const hasSubtasks = t.subtasks && t.subtasks.length > 0;
        const block = document.createElement('div');
        block.className = 'task-block';
        const row = document.createElement('div');
        row.className = 'task-row';
        row.innerHTML = `
          <div class="task-check ${isDone ? 'done' : ''} ${hasSubtasks ? 'derived' : ''}" data-task="${t.id}">
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="m9 16.2-3.5-3.5L4 14.2 9 19.2l11-11-1.5-1.5z"/></svg>
          </div>
          <div class="task-info">
            <div class="task-name ${isDone ? 'done-text' : ''}">${escapeHtml(t.name)}</div>
            <div class="task-meta">
              <span class="importance-flag importance-${t.importance}"></span>
              ${t.time ? `<span>${t.time}</span>` : ''}
              ${t.notify ? `<svg class="notify-icon" viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/></svg>` : ''}
              ${hasSubtasks ? `<span>${subtaskDoneCount(t, key)}/${t.subtasks.length} steps</span>` : ''}
            </div>
          </div>
          <button class="attach-btn" data-attach-task="${t.id}"><svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20.5 12.5 12 21a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L9.9 19a2 2 0 0 1-3-3l7.6-7.6"/></svg>${t.attachments && t.attachments.length ? `<span class="attach-badge">${t.attachments.length}</span>` : ''}</button>
        `;
        row.querySelector('.task-check').addEventListener('click', (e) => {
          e.stopPropagation();
          toggleTaskDone(t.id, key);
        });
        row.querySelector('.attach-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          openResourceModal(t.id, null);
        });
        row.addEventListener('click', () => openTaskModal(t));
        block.appendChild(row);

        if (hasSubtasks) {
          const subList = document.createElement('div');
          subList.className = 'subtask-list';
          t.subtasks.forEach(st => {
            const sd = state.logs[key] && state.logs[key].subtasksDone && state.logs[key].subtasksDone[t.id];
            const stDone = !!(sd && sd[st.id]);
            const srow = document.createElement('div');
            srow.className = 'subtask-row';
            srow.innerHTML = `<div class="subtask-check ${stDone ? 'done' : ''}"></div><span class="${stDone ? 'done-text' : ''}">${escapeHtml(st.name)}</span><button class="attach-btn" data-attach-task="${t.id}" data-attach-subtask="${st.id}"><svg viewBox="0 0 24 24" width="13" height="13"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20.5 12.5 12 21a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L9.9 19a2 2 0 0 1-3-3l7.6-7.6"/></svg>${st.attachments && st.attachments.length ? `<span class="attach-badge">${st.attachments.length}</span>` : ''}</button>`;
            srow.addEventListener('click', (e) => {
              if (e.target.closest('.attach-btn')) return;
              toggleSubtask(t.id, st.id, key);
            });
            srow.querySelector('.attach-btn').addEventListener('click', (e) => {
              e.stopPropagation();
              openResourceModal(t.id, st.id);
            });
            subList.appendChild(srow);
          });
          block.appendChild(subList);
        }

        holder.appendChild(block);
      });
    container.appendChild(card);
  });

  document.getElementById('emptyToday').hidden = anyTasks;
}

function toggleTaskDone(taskId, key) {
  const t = state.tasks.find(x => x.id === taskId);
  if (t && t.subtasks && t.subtasks.length > 0) {
    // Completion for tasks with subtasks is derived entirely from the subtasks below —
    // tapping the parent checkbox no longer force-completes them.
    showToast('Complete the steps below to finish this task');
    return;
  }
  if (!state.logs[key]) state.logs[key] = { done: {}, subtasksDone: {} };
  if (!state.logs[key].done) state.logs[key].done = {};
  state.logs[key].done[taskId] = !state.logs[key].done[taskId];
  saveState();
  renderAll();
}

function toggleSubtask(taskId, subtaskId, key) {
  if (!state.logs[key]) state.logs[key] = { done: {}, subtasksDone: {} };
  if (!state.logs[key].subtasksDone) state.logs[key].subtasksDone = {};
  if (!state.logs[key].subtasksDone[taskId]) state.logs[key].subtasksDone[taskId] = {};
  state.logs[key].subtasksDone[taskId][subtaskId] = !state.logs[key].subtasksDone[taskId][subtaskId];
  saveState();
  renderAll();
}

function renderBeadChain(containerId, count, showDateLabel) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  const today = new Date();
  // Show the current week Sun..Sat
  const weekStart = addDays(today, -today.getDay());
  for (let i = 0; i < count; i++) {
    const d = addDays(weekStart, i);
    const { total, pct } = dayStats(d);
    const bead = document.createElement('div');
    bead.className = 'bead' + (isSameDay(d, today) ? ' today' : '');
    bead.style.setProperty('--pct', total === 0 ? 0 : pct);
    bead.innerHTML = `<div class="fill"></div>`;
    bead.title = `${d.toLocaleDateString(undefined, { weekday: 'short' })}: ${total === 0 ? 'no tasks' : pct + '%'}`;
    if (d <= today) {
      bead.style.cursor = 'pointer';
      bead.addEventListener('click', () => openDayModal(d));
    } else {
      bead.style.opacity = '0.35';
    }
    el.appendChild(bead);
  }
}

/* ---------- Rendering: Calendar ---------- */
function renderCalendar() {
  const label = calendarCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  document.getElementById('monthLabel').textContent = label;
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  const year = calendarCursor.getFullYear(), month = calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    grid.appendChild(empty);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const { total, pct } = dayStats(d);
    const cell = document.createElement('div');
    let band = 'band-none';
    if (total > 0) {
      if (pct === 100) band = 'band-full';
      else if (pct >= 50) band = 'band-mid';
      else band = 'band-low';
    }
    cell.className = `cal-cell ${band}${isSameDay(d, today) ? ' today' : ''}`;
    cell.textContent = day;
    if (d <= today) cell.addEventListener('click', () => openDayModal(d));
    grid.appendChild(cell);
  }
}

/* ---------- Rendering: Insights ---------- */
function renderInsights() {
  renderBeadChain('weekBeadChain', 7, true);

  const barsContainer = document.getElementById('monthBars');
  barsContainer.innerHTML = '';
  for (let i = 29; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const { total, pct } = dayStats(d);
    const bar = document.createElement('div');
    let band = 'band-none';
    if (total > 0) {
      if (pct === 100) band = 'band-full'; else if (pct >= 50) band = 'band-mid'; else band = 'band-low';
    }
    bar.className = `month-bar ${band}`;
    bar.style.height = total === 0 ? '4px' : `${Math.max(6, pct * 0.84)}px`;
    bar.title = `${d.toLocaleDateString()}: ${total === 0 ? 'no tasks' : pct + '%'}`;
    barsContainer.appendChild(bar);
  }

  // category breakdown over last 30 days
  const breakdown = document.getElementById('categoryBreakdown');
  breakdown.innerHTML = '';
  state.categories.forEach(cat => {
    let totalScheduled = 0, totalDone = 0;
    for (let i = 29; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const key = dateKey(d);
      const weekday = d.getDay();
      const catTasks = state.tasks.filter(t => t.categoryId === cat.id && t.days.includes(weekday) && t.createdAt <= key);
      totalScheduled += catTasks.length;
      totalDone += catTasks.filter(t => isTaskDone(t, key)).length;
    }
    const pct = totalScheduled === 0 ? 0 : Math.round((totalDone / totalScheduled) * 100);
    const row = document.createElement('div');
    row.className = 'cat-bar-row';
    row.innerHTML = `
      <div class="cat-bar-label">${cat.icon} ${escapeHtml(cat.name)}</div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%; background:${cat.color}"></div></div>
      <div class="cat-bar-pct">${totalScheduled === 0 ? '—' : pct + '%'}</div>
    `;
    breakdown.appendChild(row);
  });

  // stat cards
  document.getElementById('statBestStreak').textContent = computeBestStreak30();
  let sumPct = 0, countedDays = 0, perfectDays = 0;
  for (let i = 29; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const { total, pct } = dayStats(d);
    if (total === 0) continue;
    sumPct += pct; countedDays++;
    if (pct === 100) perfectDays++;
  }
  document.getElementById('statAvg30').textContent = countedDays === 0 ? '—' : `${Math.round(sumPct / countedDays)}%`;
  document.getElementById('statPerfectDays').textContent = perfectDays;
}

/* ---------- Rendering: Manage ---------- */
function renderManage() {
  const list = document.getElementById('manageList');
  list.innerHTML = '';
  state.categories.forEach(cat => {
    const catTasks = state.tasks.filter(t => t.categoryId === cat.id);
    const block = document.createElement('div');
    block.className = 'manage-category';
    block.innerHTML = `
      <div class="manage-cat-header">
        <span class="category-icon">${cat.icon}</span>
        <h4>${escapeHtml(cat.name)}</h4>
        <button class="edit-link" data-editcat="${cat.id}">Edit</button>
      </div>
      <div class="tasks-holder"></div>
      <button class="add-task-link" data-addtask="${cat.id}">+ Add task to ${escapeHtml(cat.name)}</button>
    `;
    const holder = block.querySelector('.tasks-holder');
    catTasks.forEach(t => {
      const row = document.createElement('div');
      row.className = 'manage-task-row';
      row.innerHTML = `
        <span class="importance-flag importance-${t.importance}"></span>
        <span class="name">${escapeHtml(t.name)}${t.time ? ' · ' + t.time : ''}${t.subtasks && t.subtasks.length ? ` · ${t.subtasks.length} subtask${t.subtasks.length > 1 ? 's' : ''}` : ''}</span>
        <button class="edit-link" data-edittask="${t.id}">Edit</button>
      `;
      holder.appendChild(row);
    });
    list.appendChild(block);
  });

  list.querySelectorAll('[data-editcat]').forEach(btn => btn.addEventListener('click', () => {
    const cat = state.categories.find(c => c.id === btn.dataset.editcat);
    openCategoryModal(cat);
  }));
  list.querySelectorAll('[data-edittask]').forEach(btn => btn.addEventListener('click', () => {
    const t = state.tasks.find(x => x.id === btn.dataset.edittask);
    openTaskModal(t);
  }));
  list.querySelectorAll('[data-addtask]').forEach(btn => btn.addEventListener('click', () => {
    openTaskModal(null, btn.dataset.addtask);
  }));

  const notifStatus = document.getElementById('notifStatus');
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  notifStatus.textContent = perm === 'granted' ? 'Enabled on this device' : perm === 'unsupported' ? 'Not supported in this browser' : 'Not enabled yet';
  document.getElementById('enableNotifBtn').hidden = perm === 'granted' || perm === 'unsupported';
}

function renderAll() {
  renderToday();
  renderCalendar();
  renderInsights();
  renderManage();
}

/* ---------- Day detail modal ---------- */
function openDayModal(dateObj) {
  const { scheduled, key } = dayStats(dateObj);
  document.getElementById('dayModalTitle').textContent = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const body = document.getElementById('dayModalBody');
  body.innerHTML = '';
  if (scheduled.length === 0) {
    body.innerHTML = '<div class="day-detail-empty">Nothing was scheduled this day.</div>';
  } else {
    scheduled
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
      .forEach(t => {
        const isDone = isTaskDone(t, key);
        const cat = state.categories.find(c => c.id === t.categoryId);
        const row = document.createElement('div');
        row.className = 'day-detail-row';
        row.innerHTML = `<span class="dd-check ${isDone ? 'done' : 'missed'}"></span><span>${cat ? cat.icon : ''} ${escapeHtml(t.name)}${t.time ? ' · ' + t.time : ''}</span>`;
        body.appendChild(row);
        if (t.subtasks && t.subtasks.length > 0) {
          const sd = state.logs[key] && state.logs[key].subtasksDone && state.logs[key].subtasksDone[t.id];
          t.subtasks.forEach(st => {
            const stDone = !!(sd && sd[st.id]);
            const srow = document.createElement('div');
            srow.className = 'day-detail-row';
            srow.style.paddingLeft = '24px';
            srow.innerHTML = `<span class="dd-check ${stDone ? 'done' : 'missed'}" style="width:12px;height:12px"></span><span style="font-size:12px;color:var(--text-muted)">${escapeHtml(st.name)}</span>`;
            body.appendChild(srow);
          });
        }
      });
  }
  document.getElementById('dayModal').hidden = false;
}
document.getElementById('closeDayBtn').addEventListener('click', () => document.getElementById('dayModal').hidden = true);

/* ---------- Task modal ---------- */
function openTaskModal(t, presetCategoryId) {
  editingTaskId = t ? t.id : null;
  document.getElementById('taskModalTitle').textContent = t ? 'Edit task' : 'Add task';
  document.getElementById('taskName').value = t ? t.name : '';
  document.getElementById('taskTime').value = t ? t.time : '';
  document.getElementById('taskImportance').value = t ? t.importance : 'medium';
  document.getElementById('taskNotify').checked = t ? t.notify : false;
  pendingTaskDays = t ? [...t.days] : [0, 1, 2, 3, 4, 5, 6];
  pendingSubtasks = t && t.subtasks ? t.subtasks.map(st => ({ ...st })) : [];
  renderSubtaskEditor();

  const sel = document.getElementById('taskCategory');
  sel.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join('');
  sel.value = t ? t.categoryId : (presetCategoryId || state.categories[0]?.id);

  document.querySelectorAll('#taskDays button').forEach(b => {
    b.classList.toggle('active', pendingTaskDays.includes(Number(b.dataset.day)));
  });

  document.getElementById('deleteTaskBtn').hidden = !t;
  document.getElementById('taskModal').hidden = false;
}
document.getElementById('addTaskFab').addEventListener('click', () => {
  if (state.categories.length === 0) { showToast('Add a category first'); switchView('manage'); return; }
  openTaskModal(null);
});
document.getElementById('cancelTaskBtn').addEventListener('click', () => document.getElementById('taskModal').hidden = true);
document.querySelectorAll('#taskDays button').forEach(b => {
  b.addEventListener('click', () => {
    const day = Number(b.dataset.day);
    if (pendingTaskDays.includes(day)) pendingTaskDays = pendingTaskDays.filter(d => d !== day);
    else pendingTaskDays.push(day);
    b.classList.toggle('active');
  });
});
document.getElementById('saveTaskBtn').addEventListener('click', () => {
  const name = document.getElementById('taskName').value.trim();
  if (!name) { showToast('Give the task a name'); return; }
  if (pendingTaskDays.length === 0) { showToast('Pick at least one day'); return; }
  const categoryId = document.getElementById('taskCategory').value;
  const time = document.getElementById('taskTime').value;
  const importance = document.getElementById('taskImportance').value;
  const notify = document.getElementById('taskNotify').checked;
  const subtasks = pendingSubtasks.map(s => ({ id: s.id, name: s.name.trim(), attachments: s.attachments || [] })).filter(s => s.name);

  if (editingTaskId) {
    const t = state.tasks.find(x => x.id === editingTaskId);
    Object.assign(t, { name, categoryId, time, importance, notify, days: [...pendingTaskDays], subtasks });
  } else {
    state.tasks.push(task(categoryId, name, time, importance, notify, dateKey(new Date()), [...pendingTaskDays], subtasks));
  }
  saveState();
  document.getElementById('taskModal').hidden = true;
  renderAll();
  scheduleTodayNotifications();
});
document.getElementById('deleteTaskBtn').addEventListener('click', () => {
  if (!editingTaskId) return;
  state.tasks = state.tasks.filter(t => t.id !== editingTaskId);
  saveState();
  document.getElementById('taskModal').hidden = true;
  renderAll();
});

/* ---------- Category modal ---------- */
function openCategoryModal(cat) {
  editingCategoryId = cat ? cat.id : null;
  document.getElementById('categoryModalTitle').textContent = cat ? 'Edit category' : 'Add category';
  document.getElementById('categoryIcon').value = cat ? cat.icon : '⭐';
  document.getElementById('categoryName').value = cat ? cat.name : '';

  const picker = document.getElementById('categoryColor');
  picker.innerHTML = CATEGORY_COLORS.map(c => `<div class="color-swatch" data-color="${c}" style="background:${c}"></div>`).join('');
  const selectedColor = cat ? cat.color : CATEGORY_COLORS[0];
  picker.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === selectedColor);
    sw.addEventListener('click', () => {
      picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
  });

  document.getElementById('deleteCategoryBtn').hidden = !cat;
  document.getElementById('categoryModal').hidden = false;
}
document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal(null));
document.getElementById('cancelCategoryBtn').addEventListener('click', () => document.getElementById('categoryModal').hidden = true);
document.getElementById('saveCategoryBtn').addEventListener('click', () => {
  const name = document.getElementById('categoryName').value.trim();
  if (!name) { showToast('Give the category a name'); return; }
  const icon = document.getElementById('categoryIcon').value.trim() || '⭐';
  const activeSwatch = document.querySelector('.color-swatch.active');
  const color = activeSwatch ? activeSwatch.dataset.color : CATEGORY_COLORS[0];

  if (editingCategoryId) {
    const cat = state.categories.find(c => c.id === editingCategoryId);
    Object.assign(cat, { name, icon, color });
  } else {
    state.categories.push({ id: uid(), name, icon, color });
  }
  saveState();
  document.getElementById('categoryModal').hidden = true;
  renderAll();
});
document.getElementById('deleteCategoryBtn').addEventListener('click', () => {
  if (!editingCategoryId) return;
  if (!confirm('Delete this category and all its tasks?')) return;
  state.tasks = state.tasks.filter(t => t.categoryId !== editingCategoryId);
  state.categories = state.categories.filter(c => c.id !== editingCategoryId);
  saveState();
  document.getElementById('categoryModal').hidden = true;
  renderAll();
});

/* ---------- Resource / attachment modal ---------- */
let resourceContext = { taskId: null, subtaskId: null };
let resourceType = 'note';

function getResourceOwner() {
  const t = state.tasks.find(x => x.id === resourceContext.taskId);
  if (!t) return null;
  if (resourceContext.subtaskId) return t.subtasks.find(s => s.id === resourceContext.subtaskId) || null;
  return t;
}

function openResourceModal(taskId, subtaskId) {
  resourceContext = { taskId, subtaskId };
  const owner = getResourceOwner();
  if (!owner) return;
  document.getElementById('resourceModalTitle').textContent = `Attachments — ${owner.name}`;
  if (!owner.attachments) owner.attachments = [];
  renderResourceList();
  setResourceType('note');
  document.getElementById('resourceModal').hidden = false;
}

function renderResourceList() {
  const owner = getResourceOwner();
  const list = document.getElementById('resourceList');
  list.innerHTML = '';
  const items = (owner && owner.attachments) || [];
  if (items.length === 0) {
    list.innerHTML = '<div class="resource-empty">No attachments yet.</div>';
    return;
  }
  items.forEach(r => {
    const row = document.createElement('div');
    row.className = 'resource-item';
    const canExpand = r.type === 'image' || r.type === 'note' || r.type === 'video';
    let inner = '';
    if (r.type === 'note') inner = `<div class="resource-note" data-expand="${r.id}">${escapeHtml(r.content)}</div>`;
    else if (r.type === 'image') inner = `<img src="${r.content}" class="resource-image" alt="attachment" data-expand="${r.id}">`;
    else if (r.type === 'audio') inner = `<audio controls src="${r.content}"></audio>`;
    else if (r.type === 'video') inner = `<video controls src="${r.content}" class="resource-video" data-expand="${r.id}"></video>`;
    else if (r.type === 'link') inner = `<a href="${escapeHtml(r.content)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title || r.content)}</a>`;
    row.innerHTML = `
      <div class="resource-actions">
        ${canExpand ? `<button class="resource-action-btn resource-expand-btn" data-expand-btn="${r.id}" title="View full screen">⤢</button>` : ''}
        <button class="resource-action-btn resource-delete" data-id="${r.id}" title="Remove">✕</button>
      </div>
      ${r.title && r.type !== 'link' ? `<div class="resource-title">${escapeHtml(r.title)}</div>` : ''}
      ${inner}
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('.resource-delete').forEach(btn => btn.addEventListener('click', () => removeResource(btn.dataset.id)));
  list.querySelectorAll('[data-expand], [data-expand-btn]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.expand || el.dataset.expandBtn;
      const r = items.find(x => x.id === id);
      if (r) openFullscreen(r);
    });
  });
}

function openFullscreen(resource) {
  const el = document.getElementById('fullscreenContent');
  if (resource.type === 'image') el.innerHTML = `<img src="${resource.content}" alt="attachment">`;
  else if (resource.type === 'video') el.innerHTML = `<video src="${resource.content}" controls autoplay></video>`;
  else if (resource.type === 'note') el.innerHTML = `<div class="fullscreen-note">${escapeHtml(resource.content)}</div>`;
  else return;
  document.getElementById('fullscreenViewer').hidden = false;
}
document.getElementById('closeFullscreenBtn').addEventListener('click', () => {
  document.getElementById('fullscreenViewer').hidden = true;
  document.getElementById('fullscreenContent').innerHTML = '';
});

function removeResource(resId) {
  const owner = getResourceOwner();
  if (!owner) return;
  owner.attachments = (owner.attachments || []).filter(r => r.id !== resId);
  saveState();
  renderResourceList();
  renderAll();
}

function setResourceType(type) {
  resourceType = type;
  document.querySelectorAll('#resourceTypeTabs button').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  document.querySelectorAll('.resource-field').forEach(f => f.hidden = f.dataset.for !== type);
}
document.querySelectorAll('#resourceTypeTabs button').forEach(b => b.addEventListener('click', () => setResourceType(b.dataset.type)));
document.getElementById('closeResourceBtn').addEventListener('click', () => document.getElementById('resourceModal').hidden = true);

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxWidth = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('saveResourceBtn').addEventListener('click', async () => {
  const owner = getResourceOwner();
  if (!owner) return;
  if (!owner.attachments) owner.attachments = [];

  let newResource = null;
  try {
    if (resourceType === 'note') {
      const val = document.getElementById('resInputNote').value.trim();
      if (!val) { showToast('Write something first'); return; }
      newResource = { id: uid(), type: 'note', content: val, createdAt: Date.now() };
    } else if (resourceType === 'link') {
      const url = document.getElementById('resInputLinkUrl').value.trim();
      const title = document.getElementById('resInputLinkTitle').value.trim();
      if (!url) { showToast('Paste a link first'); return; }
      newResource = { id: uid(), type: 'link', content: url, title, createdAt: Date.now() };
    } else if (resourceType === 'image') {
      const file = document.getElementById('resInputImage').files[0];
      if (!file) { showToast('Choose an image first'); return; }
      const dataUrl = await compressImage(file);
      newResource = { id: uid(), type: 'image', content: dataUrl, createdAt: Date.now() };
    } else {
      const inputId = resourceType === 'audio' ? 'resInputAudio' : 'resInputVideo';
      const file = document.getElementById(inputId).files[0];
      if (!file) { showToast('Choose a file first'); return; }
      if (file.size > 3 * 1024 * 1024) { showToast('That file is too big for on-device storage (3MB limit) — try a Link instead'); return; }
      const dataUrl = await fileToDataUrl(file);
      newResource = { id: uid(), type: resourceType, content: dataUrl, createdAt: Date.now() };
    }
  } catch (e) {
    showToast('Could not read that file');
    return;
  }

  owner.attachments.push(newResource);
  const ok = saveState();
  if (!ok) {
    owner.attachments.pop();
    showToast('Device storage is full — remove some attachments or use a Link instead');
    return;
  }
  ['resInputNote', 'resInputLinkTitle', 'resInputLinkUrl'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['resInputImage', 'resInputAudio', 'resInputVideo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderResourceList();
  renderAll();
  showToast('Attachment added');
});

/* ---------- Navigation ---------- */
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
}
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));

document.getElementById('prevMonth').addEventListener('click', () => { calendarCursor.setMonth(calendarCursor.getMonth() - 1); renderCalendar(); });
document.getElementById('nextMonth').addEventListener('click', () => { calendarCursor.setMonth(calendarCursor.getMonth() + 1); renderCalendar(); });

/* ---------- Theme ---------- */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme);
}
document.getElementById('themeToggle').addEventListener('click', () => {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  saveState();
  applyTheme();
});

/* ---------- Notifications ---------- */
document.getElementById('enableNotifBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) { showToast('Notifications not supported here'); return; }
  const perm = await Notification.requestPermission();
  state.settings.notifPermission = perm;
  saveState();
  renderManage();
  if (perm === 'granted') { showToast('Notifications enabled'); scheduleTodayNotifications(); }
});

let scheduledTimers = [];
function scheduleTodayNotifications() {
  scheduledTimers.forEach(id => clearTimeout(id));
  scheduledTimers = [];
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const weekday = now.getDay();
  const key = dateKey(now);
  state.tasks
    .filter(t => t.notify && t.time && t.days.includes(weekday) && t.createdAt <= key)
    .forEach(t => {
      const [h, m] = t.time.split(':').map(Number);
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
      const diff = target.getTime() - now.getTime();
      if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
        const id = setTimeout(() => {
          if (!isTaskDone(t, key)) new Notification('Rasm', { body: t.name, icon: 'icon.svg' });
        }, diff);
        scheduledTimers.push(id);
      }
    });
}

/* ---------- Backup ---------- */
document.getElementById('exportBtn').addEventListener('click', () => {
  const data = { categories: state.categories, tasks: state.tasks, logs: state.logs, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `rasm-backup-${dateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('importInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.categories || !data.tasks) throw new Error('bad format');
      state.categories = data.categories;
      state.tasks = data.tasks;
      state.logs = data.logs || {};
      saveState();
      renderAll();
      showToast('Backup imported');
    } catch (err) {
      showToast('Could not read that file');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('This erases all categories, tasks and history on this device. Continue?')) return;
  localStorage.removeItem(STORAGE_KEYS.categories);
  localStorage.removeItem(STORAGE_KEYS.tasks);
  localStorage.removeItem(STORAGE_KEYS.logs);
  localStorage.removeItem(STORAGE_KEYS.settings);
  loadState();
  applyTheme();
  renderAll();
  showToast('All data erased');
});

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.hidden = true, 2200);
}

/* ---------- Utility ---------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Init ---------- */
loadState();
applyTheme();
renderAll();
scheduleTodayNotifications();
setInterval(() => { renderToday(); }, 60 * 1000); // keep "today" fresh across midnight etc.

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
