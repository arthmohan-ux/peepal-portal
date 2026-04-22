// src/app.js
// Dashboard — loads candidates, manages filters, renders grouped table

// ── DEPT PIPELINE CONFIG (mirrors GAS script) ──
const ROLE_PIPELINE = {
  'Consultant - TA':                     ['Screening','Aptitude','Manager Round','HR Round'],
  'Senior Consultant - TA':              ['Screening','Aptitude','Manager Round','Kaveri Round'],
  'ATL - TA':                            ['Screening','Aptitude','Manager Round','Kaveri Round'],
  'Management Trainee (Consultant)- TA': ['Screening','Aptitude','Manager Round','Kaveri Round'],
  'VP - TA':                             ['Screening','Kaveri Round','Vijay Round'],
  'Exec Search - TA':                    ['Screening','Kaveri Round','Vijay Round'],
  'Business Head - C2H':                 ['Screening','Kaveri Round','Vijay Round'],
  'Executive - BD':                      ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'Delivery - BD':                       ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'Analyst - BD':                        ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'Growth - BD':                         ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'Lead - BD':                           ['Screening','Aptitude','Kaveri Round','Vijay Round'],
  'Manager - BD':                        ['Screening','Aptitude','Kaveri Round','Vijay Round'],
  'Head - BD':                           ['Screening','Kaveri Round','Vijay Round'],
  'Executive - Central Marketing':       ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'GD - Central Marketing':              ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Market Research - Central Marketing': ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Marketing Lead - Central Marketing':  ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Video Editor - Central Marketing':    ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'BD & CR - TAD':                       ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'MT (BD & CR) - TAD':                  ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'GD - TAD':                            ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Marketing Executive - TAD':           ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Marketing Lead - TAD':                ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Event Operations - TAD':              ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'Operations - HR':                     ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'Senior TA - HR':                      ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  "Founders Office":                    ['Screening','Aptitude','AI Interview','Manager Round','Kaveri Round','Vijay Round'],
};

const DEPT_ROLES = {
  'TA':               ['Consultant - TA','Senior Consultant - TA','ATL - TA','Management Trainee (Consultant)- TA','VP - TA','Exec Search - TA','Business Head - C2H'],
  'BD':               ['Executive - BD','Delivery - BD','Analyst - BD','Growth - BD','Lead - BD','Manager - BD','Head - BD'],
  'Central Marketing':['Executive - Central Marketing','GD - Central Marketing','Market Research - Central Marketing','Marketing Lead - Central Marketing','Video Editor - Central Marketing'],
  'TAD':              ['BD & CR - TAD','MT (BD & CR) - TAD','GD - TAD','Marketing Executive - TAD','Marketing Lead - TAD','Event Operations - TAD'],
  'HR':               ['Operations - HR','Senior TA - HR'],
  "Founders Office": ["Founders Office"],
};

const REJECT_STATUSES  = ['Screen Reject','Aptitude Reject','Assessment Reject','AI Interview Reject','Manager Round Reject','HR Reject','Kaveri Reject','Vijay Reject','Offer Dropout','Drop'];
const PENDING_STATUSES = ['Aptitude Pending','Assessment Pending','Assesment Under Review','AI Interview Pending','Manager Round Pending','Manager Feedback Pending','HR Round Pending','HR Feedback Pending','Kaveri Round Pending','Kaveri Feedback Pending','Vijay Round Pending','Vijay Feedback Pending','Hold'];
const SELECT_STATUSES  = ['Aptitude Select','Final Select'];
const MULTI_SELECT_CONFIG = {
  filterDept:  { placeholder: 'All Departments', singular: 'Department', plural: 'Departments' },
  filterRole:  { placeholder: 'All Roles',       singular: 'Role',       plural: 'Roles' },
  filterWeek:  { placeholder: 'All Weeks',       singular: 'Week',       plural: 'Weeks' },
  filterMonth: { placeholder: 'All Months',      singular: 'Month',      plural: 'Months' },
};

// ── STATE ──
let allCandidates = [];
let filteredCandidates = [];
let multiSelectState = {
  filterDept: [],
  filterRole: [],
  filterWeek: [],
  filterMonth: [],
};

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  initMultiSelects();
  populateDepartmentFilter();
  rebuildStatusDropdown(null);
  setupRoleFilter();
  // Fetch logged-in user info for role-based access
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const user = await res.json();
      window.__userEmail = user.email;
      window.__userName  = user.name;
      const nameEl = document.getElementById('user-name');
      if (nameEl) nameEl.textContent = user.name || user.email;
    }
  } catch {}
  loadCandidates();
});

// ── LOAD FROM API ──
async function loadCandidates() {
  setSyncBadge('connecting');
  showLoading(true);

  try {
    const res  = await fetch('/api/candidates');
    if (res.status === 401) {
      if (window.location.hostname !== 'localhost') {
        const candidate = new URLSearchParams(window.location.search).get('candidate');
        window.location.href = candidate ? `/api/auth/login?candidate=${candidate}` : '/login';
      }
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    allCandidates = data.candidates || [];
    window.__allCandidates = allCandidates;
    populateDateFilters();
    setSyncBadge('live');
    applyFilters();
    renderStats();

    // ── Auto-open candidate from URL param ──
    const urlParams = new URLSearchParams(window.location.search);
    const candidateRow = parseInt(urlParams.get('candidate'));
    const tabParam = urlParams.get('tab') || 'info';
    if (candidateRow && !isNaN(candidateRow)) {
      const found = allCandidates.find(c => c._row === candidateRow);
      if (found) {
        window.__autoOpenTab = tabParam;
        openCandidatePanelByRow(candidateRow);
      }
    }

  } catch (err) {
    setSyncBadge('error');
    showError('Failed to load candidates: ' + err.message);
  } finally {
    showLoading(false);
  }
}

// ── FILTERS ──
function applyFilters() {
  const search    = document.getElementById('search')?.value.toLowerCase() || '';
  const dept      = getMultiSelectValues('filterDept');
  const role      = getMultiSelectValues('filterRole');
  const recruiter = document.getElementById('filterRecruiter')?.value || '';
  const week      = getMultiSelectValues('filterWeek');
  const month     = getMultiSelectValues('filterMonth');
  const status    = document.getElementById('filterStatus')?.value || '';
  const groupBy   = document.getElementById('groupBy')?.value || 'none';

  filteredCandidates = allCandidates.filter(c => {
    if (search && ![c.name, c.email, c.role, c.recruiter, c.manager].some(
      v => v && v.toLowerCase().includes(search)
    )) return false;
    if (dept.length && !dept.includes(c.department))    return false;
    if (role.length && !role.includes(c.role))          return false;
    if (recruiter && c.recruiter  !== recruiter) return false;
    if (week.length && !week.includes(getWeekLabel(c.sourcingDate)))   return false;
    if (month.length && !month.includes(getMonthLabel(c.sourcingDate))) return false;
    if (status    && c.status     !== status)    return false;
    return true;
  });

  renderTable(filteredCandidates, groupBy);
  renderActivePills({ search, dept, role, recruiter, week, month, status });
  renderStats();
}

function clearFilters() {
  ['search','filterRecruiter','filterStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['filterDept','filterRole','filterWeek','filterMonth'].forEach(id => setMultiSelectValues(id, []));
  const groupEl = document.getElementById('groupBy');
  if (groupEl) groupEl.value = 'none';
  rebuildRoleFilter();
  rebuildStatusDropdown(getMultiSelectValues('filterRole'));
  applyFilters();
}

// ── ROLE FILTER (cascades from dept) ──
// ── STATUS FILTER (cascades from role) ──
const STAGE_STATUSES = {
  'Screening':     ['Screen Reject', 'Hold', 'Drop'],
  'Aptitude':      ['Aptitude Pending', 'Aptitude Reject', 'Aptitude Select'],
  'Assessment':    ['Assessment Pending', 'Assessment Reject', 'Assesment Under Review'],
  'AI Interview':  ['AI Interview Pending', 'AI Interview Reject'],
  'Manager Round': ['Manager Round Pending', 'Manager Feedback Pending', 'Manager Round Reject'],
  'HR Round':      ['HR Round Pending', 'HR Feedback Pending', 'HR Reject'],
  'Kaveri Round':  ['Kaveri Round Pending', 'Kaveri Feedback Pending', 'Kaveri Reject'],
  'Vijay Round':   ['Vijay Round Pending', 'Vijay Feedback Pending', 'Vijay Reject'],
};
const TERMINAL_STATUSES = ['Final Select', 'Offered', 'Offer Dropout', 'Joined'];

function getValidStatusesForRoles(roles) {
  const selectedRoles = Array.isArray(roles) ? roles : (roles ? [roles] : []);
  const statuses = [];
  selectedRoles.forEach(role => {
    const pipeline = ROLE_PIPELINE[role] || [];
    pipeline.forEach(stage => {
      (STAGE_STATUSES[stage] || []).forEach(s => {
        if (!statuses.includes(s)) statuses.push(s);
      });
    });
  });
  TERMINAL_STATUSES.forEach(s => { if (!statuses.includes(s)) statuses.push(s); });
  return statuses;
}

function rebuildStatusDropdown(roles) {
  const statusEl = document.getElementById('filterStatus');
  if (!statusEl) return;
  const roleList = Array.isArray(roles) ? roles : (roles ? [roles] : []);
  const statuses = roleList.length ? getValidStatusesForRoles(roleList) : null;
  const current  = statusEl.value;

  statusEl.innerHTML = '<option value="">All Statuses</option>';
  const list = statuses || [
    'Screen Reject','Aptitude Pending','Aptitude Reject','Aptitude Select',
    'Assessment Pending','Assessment Reject','Assesment Under Review',
    'AI Interview Pending','AI Interview Reject',
    'Manager Round Pending','Manager Feedback Pending','Manager Round Reject',
    'HR Round Pending','HR Feedback Pending','HR Reject',
    'Kaveri Round Pending','Kaveri Feedback Pending','Kaveri Reject',
    'Vijay Round Pending','Vijay Feedback Pending','Vijay Reject',
    'Final Select','Offered','Offer Dropout','Joined','Hold','Drop',
  ];
  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    statusEl.appendChild(opt);
  });
  // Restore selection if still valid
  if (current && list.includes(current)) statusEl.value = current;
  else statusEl.value = '';
}

function setupRoleFilter() {
  rebuildRoleFilter();
}

function populateDepartmentFilter() {
  setMultiSelectOptions('filterDept', Object.keys(DEPT_ROLES));
}

function rebuildRoleFilter() {
  const selectedDepts = getMultiSelectValues('filterDept');
  const currentRoles = getMultiSelectValues('filterRole');
  const roles = selectedDepts.length
    ? [...new Set(selectedDepts.reduce((allRoles, dept) => {
        allRoles.push(...(DEPT_ROLES[dept] || []));
        return allRoles;
      }, []))]
    : [...new Set(Object.values(DEPT_ROLES).flat())];
  const preservedRoles = currentRoles.filter(role => roles.includes(role));
  setMultiSelectOptions('filterRole', roles, preservedRoles);
}

function populateDateFilters() {
  const currentWeek = getMultiSelectValues('filterWeek');
  const currentMonth = getMultiSelectValues('filterMonth');

  const weekMap = new Map();
  const monthMap = new Map();

  allCandidates.forEach(candidate => {
    const date = parseDate(candidate.sourcingDate);
    if (!date) return;

    const week = getWeekLabel(date);
    const month = getMonthLabel(date);
    if (week && !weekMap.has(week)) weekMap.set(week, getWeekBucketTimestamp(date));
    if (month && !monthMap.has(month)) monthMap.set(month, new Date(date.getFullYear(), date.getMonth(), 1).getTime());
  });

  const weeks = [...weekMap.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label);
  const months = [...monthMap.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label);

  setMultiSelectOptions('filterWeek', weeks, currentWeek.filter(week => weeks.includes(week)));
  setMultiSelectOptions('filterMonth', months, currentMonth.filter(month => months.includes(month)));
}

// ── TABLE RENDER ──
function renderTable(candidates, groupBy) {
  const tbody  = document.getElementById('candidate-tbody');
  const table  = document.getElementById('candidate-table');
  const empty  = document.getElementById('table-empty');
  if (!tbody) return;
  const sortedCandidates = [...candidates].sort(compareCandidatesByNewest);

  tbody.innerHTML = '';

  if (sortedCandidates.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  table.classList.remove('hidden');
  empty.classList.add('hidden');

  if (groupBy === 'none') {
    sortedCandidates.forEach(c => tbody.appendChild(buildRow(c)));
    return;
  }

  // Group candidates
  const grouped = {};
  sortedCandidates.forEach(c => {
    const key = c[groupBy] || '—';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  // Sort group keys — use DEPT_ORDER for dept grouping
  let keys = Object.keys(grouped);
  if (groupBy === 'department') {
    const order = ['TA','BD','Central Marketing','TAD','HR',"Founders Office"];
    keys.sort((a, b) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  } else {
    keys.sort();
  }

  keys.forEach(key => {
    // Group header
    const groupTr = document.createElement('tr');
    groupTr.className = 'group-header';
    groupTr.innerHTML = `<td colspan="9">${escHtml(key)} <span style="font-weight:500;color:var(--slate-400)">(${grouped[key].length})</span></td>`;
    tbody.appendChild(groupTr);

    grouped[key].forEach(c => tbody.appendChild(buildRow(c)));
  });
}

function buildRow(c) {
  const tr = document.createElement('tr');

  const deptClass = 'dept-' + (c.department || '').replace(/\s+/g, '-').replace(/'/g, '');
  const statusClass = getStatusClass(c.status);

  tr.innerHTML = `
    <td>
      <div class="cand-name">${escHtml(c.name || '—')}</div>
      ${c.email ? `<div class="cand-email">${escHtml(c.email)}</div>` : ''}
    </td>
    <td style="font-size:11px;font-weight:600;color:var(--slate-600);max-width:180px">${escHtml(c.role || '—')}</td>
    <td><span class="dept-badge ${deptClass}">${escHtml(c.department || '—')}</span></td>
    <td style="font-size:11px;color:var(--slate-500)">${escHtml(c.recruiter || '—')}</td>
    <td style="font-size:11px;color:var(--slate-500)">${escHtml(c.manager || '—')}</td>
    <td><span class="status-pill ${statusClass}">${escHtml(c.status || 'Active')}</span></td>
    <td style="font-size:11px;color:var(--slate-400);white-space:nowrap">${escHtml(c.sourcingDate || '—')}</td>
    <td>
      ${c.aptitudeScore
        ? `<span class="aptitude-score">${escHtml(c.aptitudeScore)}</span>`
        : `<span class="aptitude-na">—</span>`}
    </td>
    <td><button class="btn-manage" onclick="openCandidatePanel(event)">Manage</button></td>
  `;

  // Store candidate data on the row for easy retrieval
  tr.dataset.candidateRow = c._row;
  tr.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-manage')) return;
    openCandidatePanelByRow(c._row);
  });

  // Attach manage button
  tr.querySelector('.btn-manage').addEventListener('click', (e) => {
    e.stopPropagation();
    openCandidatePanelByRow(c._row);
  });

  // Remove the onclick attribute now event listener is set
  tr.querySelector('.btn-manage').removeAttribute('onclick');

  return tr;
}

function compareCandidatesByNewest(a, b) {
  const dateA = parseDate(a?.sourcingDate);
  const dateB = parseDate(b?.sourcingDate);

  if (dateA && dateB) {
    return dateB.getTime() - dateA.getTime();
  }
  if (dateA) return -1;
  if (dateB) return 1;

  return (b?._row || 0) - (a?._row || 0);
}

// ── STATS BAR ──
function renderStats() {
  const total    = filteredCandidates.length;
  const joined   = filteredCandidates.filter(c => c.status === 'Joined').length;
  const selected = filteredCandidates.filter(c => ['Final Select','Offered'].includes(c.status)).length;
  const active   = filteredCandidates.filter(c => c.status && !REJECT_STATUSES.includes(c.status) && c.status !== 'Drop' && c.status !== 'Joined').length;

  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set('stat-total',    `<strong>${total}</strong> candidates`);
  set('stat-active',   `<strong>${active}</strong> in pipeline`);
  set('stat-selected', `<strong>${selected}</strong> selected / offered`);
  set('stat-joined',   `<strong>${joined}</strong> joined`);
}

// ── ACTIVE FILTER PILLS ──
function renderActivePills(filters) {
  const container = document.getElementById('active-filters');
  if (!container) return;
  container.innerHTML = '';

  const labels = {
    search: 'Search', dept: 'Dept', role: 'Role',
    recruiter: 'Recruiter', week: 'Week', month: 'Month', status: 'Status'
  };

  Object.entries(filters).forEach(([key, val]) => {
    if (!val || (Array.isArray(val) && !val.length)) return;
    const pill = document.createElement('div');
    pill.className = 'filter-pill';
    pill.innerHTML = `
      <span>${labels[key]}: <strong>${escHtml(formatFilterValue(val))}</strong></span>
      <button onclick="clearFilter('${key}')" title="Remove filter">×</button>
    `;
    container.appendChild(pill);
  });
}

function clearFilter(key) {
  const map = {
    search: 'search', dept: 'filterDept', role: 'filterRole',
    recruiter: 'filterRecruiter', week: 'filterWeek', month: 'filterMonth', status: 'filterStatus'
  };
  const el = document.getElementById(map[key]);
  if (!el) return;

  if (['dept','role','week','month'].includes(key)) {
    setMultiSelectValues(map[key], []);
    if (key === 'dept') rebuildRoleFilter();
    if (key === 'dept' || key === 'role') rebuildStatusDropdown(getMultiSelectValues('filterRole'));
  } else {
    el.value = '';
  }
  applyFilters();
}

function formatFilterValue(val) {
  if (!Array.isArray(val)) return val;
  if (val.length <= 2) return val.join(', ');
  return `${val.length} selected`;
}

function initMultiSelects() {
  Object.keys(MULTI_SELECT_CONFIG).forEach(id => {
    const root = document.getElementById(id);
    const menu = root?.querySelector('.multi-select-menu');
    if (!root || !menu) return;
    menu.addEventListener('change', () => handleMultiSelectChange(id));
  });

  document.addEventListener('click', (event) => {
    document.querySelectorAll('.multi-select.open').forEach(el => {
      if (!el.contains(event.target)) el.classList.remove('open');
    });
  });
}

function toggleMultiSelect(id, event) {
  event?.stopPropagation();
  const root = document.getElementById(id);
  if (!root) return;
  if (id === 'filterRole') rebuildRoleFilter();
  const isOpen = root.classList.contains('open');
  document.querySelectorAll('.multi-select.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) root.classList.add('open');
}

function handleMultiSelectChange(id) {
  const root = document.getElementById(id);
  if (root) {
    multiSelectState[id] = [...root.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
  }
  updateMultiSelectTrigger(id);
  if (id === 'filterDept') {
    rebuildRoleFilter();
    rebuildStatusDropdown(getMultiSelectValues('filterRole'));
  } else if (id === 'filterRole') {
    rebuildStatusDropdown(getMultiSelectValues('filterRole'));
  }
  applyFilters();
}

function setMultiSelectOptions(id, options, selectedValues = []) {
  const root = document.getElementById(id);
  const menu = root?.querySelector('.multi-select-menu');
  if (!root || !menu) return;

  const normalized = options.map(option => typeof option === 'string' ? { value: option, label: option } : option);
  const selected = new Set(selectedValues);
  multiSelectState[id] = [...selected];
  menu.innerHTML = normalized.map(option => `
    <label class="multi-select-option">
      <input type="checkbox" value="${escHtml(option.value)}" ${selected.has(option.value) ? 'checked' : ''}>
      <span>${escHtml(option.label)}</span>
    </label>
  `).join('');

  updateMultiSelectTrigger(id);
}

function setMultiSelectValues(id, values) {
  const root = document.getElementById(id);
  const inputs = root?.querySelectorAll('input[type="checkbox"]');
  if (!inputs) return;
  const selected = new Set(values);
  multiSelectState[id] = [...selected];
  inputs.forEach(input => { input.checked = selected.has(input.value); });
  updateMultiSelectTrigger(id);
}

function getMultiSelectValues(id) {
  return [...(multiSelectState[id] || [])];
}

function updateMultiSelectTrigger(id) {
  const root = document.getElementById(id);
  const trigger = root?.querySelector('.multi-select-trigger');
  const config = MULTI_SELECT_CONFIG[id];
  if (!trigger || !config) return;

  const selected = getMultiSelectValues(id);
  if (!selected.length) {
    trigger.textContent = config.placeholder;
  } else if (selected.length === 1) {
    trigger.textContent = selected[0];
  } else {
    trigger.textContent = `${selected.length} ${config.plural}`;
  }
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function getWeekNumberInMonth(val) {
  const date = parseDate(val);
  if (!date) return null;
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function getWeekBucketTimestamp(val) {
  const date = parseDate(val);
  const weekNumber = getWeekNumberInMonth(val);
  if (!date || !weekNumber) return null;
  return new Date(date.getFullYear(), date.getMonth(), ((weekNumber - 1) * 7) + 1).getTime();
}

function getWeekLabel(val) {
  const date = parseDate(val);
  const weekNumber = getWeekNumberInMonth(val);
  if (!date || !weekNumber) return null;
  return `Week ${weekNumber} ${date.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' })}`;
}

function getMonthLabel(val) {
  const d = parseDate(val);
  if (!d) return null;
  return d.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' });
}

// ── STATUS CLASS HELPER ──
function getStatusClass(status) {
  if (!status) return '';
  if (REJECT_STATUSES.includes(status))  return 'status-reject';
  if (PENDING_STATUSES.includes(status)) return 'status-pending';
  if (SELECT_STATUSES.includes(status))  return 'status-select';
  if (status === 'Joined')               return 'status-joined';
  if (status === 'Offered')              return 'status-offered';
  if (status === 'Hold')                 return 'status-hold';
  if (status === 'Drop')                 return 'status-drop';
  return '';
}

// ── SYNC BADGE ──
function setSyncBadge(state) {
  const el = document.getElementById('sync-badge');
  if (!el) return;
  const states = {
    connecting: ['Connecting...', 'sync-badge sync-connecting'],
    live:       ['Live',          'sync-badge sync-live'],
    error:      ['Sync Error',    'sync-badge sync-error'],
  };
  const [text, cls] = states[state] || states.connecting;
  el.textContent = text;
  el.className   = cls;
}

// ── UI HELPERS ──
function showLoading(show) {
  const el = document.getElementById('table-loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showError(msg) {
  const el = document.getElementById('table-error');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function logout() {
  document.cookie = 'peepal_session=; Max-Age=0; Path=/';
  window.location.href = '/login';
}

// ── EXPOSE GLOBALS needed by candidate.js ──
window.allCandidates  = () => window.__allCandidates || allCandidates;
window.__allCandidates = allCandidates;
window.ROLE_PIPELINE  = ROLE_PIPELINE;
window.getStatusClass = getStatusClass;
window.escHtml        = escHtml;
window.loadCandidates = loadCandidates;
window.logout         = logout;
window.clearFilters   = clearFilters;
window.applyFilters   = applyFilters;
window.toggleMultiSelect = toggleMultiSelect;
