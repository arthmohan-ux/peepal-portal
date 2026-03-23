// src/app.js
// Dashboard — loads candidates, manages filters, renders grouped table

// ── DEPT PIPELINE CONFIG (mirrors GAS script) ──
const ROLE_PIPELINE = {
  'Consultant - TA':                     ['Screening','Aptitude','Manager Round','Kaveri Round'],
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
  'GD - Central Marketing':             ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Market Research - Central Marketing': ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Marketing Lead - Central Marketing':  ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Video Editor - Central Marketing':    ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'BD & CR - TAD':                       ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'MT (BD & CR) - TAD':                  ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'GD - TAD':                            ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Marketing Executive - TAD':           ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Marketing Lead - TAD':               ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Operations - HR':                     ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'Senior TA - HR':                      ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  "Founder's Office":                    ['Screening','Aptitude','AI Interview','Manager Round','Kaveri Round','Vijay Round'],
};

const DEPT_ROLES = {
  'TA':               ['Consultant - TA','Senior Consultant - TA','ATL - TA','Management Trainee (Consultant)- TA','VP - TA','Exec Search - TA','Business Head - C2H'],
  'BD':               ['Executive - BD','Delivery - BD','Analyst - BD','Growth - BD','Lead - BD','Manager - BD','Head - BD'],
  'Central Marketing':['Executive - Central Marketing','GD - Central Marketing','Market Research - Central Marketing','Marketing Lead - Central Marketing','Video Editor - Central Marketing'],
  'TAD':              ['BD & CR - TAD','MT (BD & CR) - TAD','GD - TAD','Marketing Executive - TAD','Marketing Lead - TAD'],
  'HR':               ['Operations - HR','Senior TA - HR'],
  "Founder's Office": ["Founder's Office"],
};

const REJECT_STATUSES  = ['Screen Reject','Aptitude Reject','Test Reject','Assessment Reject','AI Interview Reject','Manager Round Reject','Kaveri Reject','Vijay Reject','Offer Dropout','Drop'];
const PENDING_STATUSES = ['Aptitude Pending','Assessment Pending','Assesment Under Review','AI Interview Pending','Manager Round Pending','Kaveri Round Pending','Kaveri Feedback Pending','Vijay Round Pending','Hold'];
const SELECT_STATUSES  = ['Aptitude Select','Final Select'];

// ── STATE ──
let allCandidates = [];
let filteredCandidates = [];

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  rebuildStatusDropdown(null); // populate full status list on load
  loadCandidates();
  setupRoleFilter();
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
    setSyncBadge('live');
    applyFilters();
    renderStats();

    // ── Auto-open candidate from URL param ──
    const urlParams = new URLSearchParams(window.location.search);
    const candidateRow = parseInt(urlParams.get('candidate'));
    if (candidateRow && !isNaN(candidateRow)) {
      const found = allCandidates.find(c => c._row === candidateRow);
      if (found) {
        // Open on Feedback & Scores tab
        window.__autoOpenTab = 'feedback';
        openCandidatePanelByRow(candidateRow);
        // Clean URL without reloading
        window.history.replaceState({}, '', '/dashboard');
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
  const dept      = document.getElementById('filterDept')?.value || '';
  const role      = document.getElementById('filterRole')?.value || '';
  const recruiter = document.getElementById('filterRecruiter')?.value || '';
  const status    = document.getElementById('filterStatus')?.value || '';
  const groupBy   = document.getElementById('groupBy')?.value || 'none';

  filteredCandidates = allCandidates.filter(c => {
    if (search && ![c.name, c.email, c.role, c.recruiter, c.manager].some(
      v => v && v.toLowerCase().includes(search)
    )) return false;
    if (dept      && c.department !== dept)      return false;
    if (role      && c.role       !== role)      return false;
    if (recruiter && c.recruiter  !== recruiter) return false;
    if (status    && c.status     !== status)    return false;
    return true;
  });

  renderTable(filteredCandidates, groupBy);
  renderActivePills({ search, dept, role, recruiter, status });
  renderStats();
}

function clearFilters() {
  ['search','filterDept','filterRole','filterRecruiter','filterStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const groupEl = document.getElementById('groupBy');
  if (groupEl) groupEl.value = 'none';
  applyFilters();
}

// ── ROLE FILTER (cascades from dept) ──
// ── STATUS FILTER (cascades from role) ──
const STAGE_STATUSES = {
  'Screening':     ['Screen Reject', 'Hold', 'Drop'],
  'Aptitude':      ['Aptitude Pending', 'Aptitude Reject', 'Test Reject', 'Aptitude Select'],
  'Assessment':    ['Assessment Pending', 'Assessment Reject', 'Assesment Under Review'],
  'AI Interview':  ['AI Interview Pending', 'AI Interview Reject'],
  'Manager Round': ['Manager Round Pending', 'Manager Round Reject'],
  'Kaveri Round':  ['Kaveri Round Pending', 'Kaveri Feedback Pending', 'Kaveri Reject'],
  'Vijay Round':   ['Vijay Round Pending', 'Vijay Reject'],
};
const TERMINAL_STATUSES = ['Final Select', 'Offered', 'Offer Dropout', 'Joined'];

function getValidStatusesForRole(role) {
  const pipeline = ROLE_PIPELINE[role] || [];
  const statuses = [];
  pipeline.forEach(stage => {
    (STAGE_STATUSES[stage] || []).forEach(s => {
      if (!statuses.includes(s)) statuses.push(s);
    });
  });
  TERMINAL_STATUSES.forEach(s => { if (!statuses.includes(s)) statuses.push(s); });
  return statuses;
}

function rebuildStatusDropdown(role) {
  const statusEl = document.getElementById('filterStatus');
  if (!statusEl) return;
  const statuses = role ? getValidStatusesForRole(role) : null;
  const current  = statusEl.value;

  statusEl.innerHTML = '<option value="">All Statuses</option>';
  const list = statuses || [
    'Screen Reject','Aptitude Pending','Aptitude Reject','Test Reject','Aptitude Select',
    'Assessment Pending','Assessment Reject','Assesment Under Review',
    'AI Interview Pending','AI Interview Reject',
    'Manager Round Pending','Manager Round Reject',
    'Kaveri Round Pending','Kaveri Feedback Pending','Kaveri Reject',
    'Vijay Round Pending','Vijay Reject',
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
  const deptEl   = document.getElementById('filterDept');
  const roleEl   = document.getElementById('filterRole');
  if (!deptEl || !roleEl) return;

  deptEl.addEventListener('change', () => {
    const dept  = deptEl.value;
    const roles = dept ? (DEPT_ROLES[dept] || []) : Object.values(DEPT_ROLES).flat();

    roleEl.innerHTML = '<option value="">All Roles</option>';
    roles.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r;
      roleEl.appendChild(opt);
    });
    roleEl.value = '';
    rebuildStatusDropdown(null); // reset status when dept changes
  });

  roleEl.addEventListener('change', () => {
    const role = roleEl.value;
    rebuildStatusDropdown(role || null);
    // Clear status selection when role changes
    const statusEl = document.getElementById('filterStatus');
    if (statusEl) statusEl.value = '';
    applyFilters();
  });
}

// ── TABLE RENDER ──
function renderTable(candidates, groupBy) {
  const tbody  = document.getElementById('candidate-tbody');
  const table  = document.getElementById('candidate-table');
  const empty  = document.getElementById('table-empty');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (candidates.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  table.classList.remove('hidden');
  empty.classList.add('hidden');

  if (groupBy === 'none') {
    candidates.forEach(c => tbody.appendChild(buildRow(c)));
    return;
  }

  // Group candidates
  const grouped = {};
  candidates.forEach(c => {
    const key = c[groupBy] || '—';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  // Sort group keys — use DEPT_ORDER for dept grouping
  let keys = Object.keys(grouped);
  if (groupBy === 'department') {
    const order = ['TA','BD','Central Marketing','TAD','HR',"Founder's Office"];
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

// ── STATS BAR ──
function renderStats() {
  const total    = filteredCandidates.length;
  const joined   = filteredCandidates.filter(c => c.status === 'Joined').length;
  const selected = filteredCandidates.filter(c => ['Final Select','Offered'].includes(c.status)).length;
  const active   = filteredCandidates.filter(c => PENDING_STATUSES.includes(c.status)).length;

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
    recruiter: 'Recruiter', status: 'Status'
  };

  Object.entries(filters).forEach(([key, val]) => {
    if (!val) return;
    const pill = document.createElement('div');
    pill.className = 'filter-pill';
    pill.innerHTML = `
      <span>${labels[key]}: <strong>${escHtml(val)}</strong></span>
      <button onclick="clearFilter('${key}')" title="Remove filter">×</button>
    `;
    container.appendChild(pill);
  });
}

function clearFilter(key) {
  const map = {
    search: 'search', dept: 'filterDept', role: 'filterRole',
    recruiter: 'filterRecruiter', status: 'filterStatus'
  };
  const el = document.getElementById(map[key]);
  if (el) { el.value = ''; applyFilters(); }
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
window.allCandidates  = () => allCandidates;
window.ROLE_PIPELINE  = ROLE_PIPELINE;
window.getStatusClass = getStatusClass;
window.escHtml        = escHtml;
window.loadCandidates = loadCandidates;
window.logout         = logout;
window.clearFilters   = clearFilters;
window.applyFilters   = applyFilters;