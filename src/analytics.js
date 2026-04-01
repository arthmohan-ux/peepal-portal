// src/analytics.js
// Analytics dashboard — pipeline funnel, TAT, dept breakdown, recruiter perf, trends

// ── CONFIG (mirrors app.js) ──
const DEPT_ORDER = ['TA','BD','Central Marketing','TAD','HR',"Founder's Office"];

const DEPT_ROLES = {
  'TA':               ['Consultant - TA','Senior Consultant - TA','ATL - TA','Management Trainee (Consultant)- TA','VP - TA','Exec Search - TA','Business Head - C2H'],
  'BD':               ['Executive - BD','Delivery - BD','Analyst - BD','Growth - BD','Lead - BD','Manager - BD','Head - BD'],
  'Central Marketing':['Executive - Central Marketing','GD - Central Marketing','Market Research - Central Marketing','Marketing Lead - Central Marketing','Video Editor - Central Marketing'],
  'TAD':              ['BD & CR - TAD','MT (BD & CR) - TAD','GD - TAD','Marketing Executive - TAD','Marketing Lead - TAD'],
  'HR':               ['Operations - HR','Senior TA - HR'],
  "Founder's Office": ["Founder's Office"],
};

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
  'Marketing Lead - TAD':                ['Screening','Aptitude','Assessment','Manager Round','Kaveri Round','Vijay Round'],
  'Operations - HR':                     ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  'Senior TA - HR':                      ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'],
  "Founder's Office":                    ['Screening','Aptitude','AI Interview','Manager Round','Kaveri Round','Vijay Round'],
};

const FUNNEL_STATUS_ORDER = [
  'Screen Reject',
  'Aptitude Pending','Aptitude Reject','Test Reject','Aptitude Select',
  'Assessment Pending','Assessment Reject','Assesment Under Review',
  'AI Interview Pending','AI Interview Reject',
  'Manager Round Pending','Manager Feedback Pending','Manager Round Reject',
  'Kaveri Round Pending','Kaveri Feedback Pending','Kaveri Reject',
  'Vijay Round Pending','Vijay Feedback Pending','Vijay Reject',
  'Final Select','Offered','Offer Dropout','Joined','Hold','Drop',
];
const VALID_FUNNEL_STATUSES = new Set(FUNNEL_STATUS_ORDER);

const STATUS_FC_CLASS = {
  'Screen Reject':'fc-reject','Aptitude Reject':'fc-reject','Test Reject':'fc-reject',
  'Assessment Reject':'fc-reject','AI Interview Reject':'fc-reject',
  'Manager Round Reject':'fc-reject','Kaveri Reject':'fc-reject','Vijay Reject':'fc-reject',
  'Offer Dropout':'fc-reject','Drop':'fc-drop',
  'Aptitude Pending':'fc-pending','Assessment Pending':'fc-pending','Assesment Under Review':'fc-pending',
  'AI Interview Pending':'fc-pending','Manager Round Pending':'fc-pending','Manager Feedback Pending':'fc-pending',
  'Kaveri Round Pending':'fc-pending','Kaveri Feedback Pending':'fc-pending',
  'Vijay Round Pending':'fc-pending','Vijay Feedback Pending':'fc-pending','Hold':'fc-hold',
  'Aptitude Select':'fc-select','Final Select':'fc-select',
  'Joined':'fc-joined','Offered':'fc-offered',
};

const DEFAULT_ROLE_PIPELINE = ['Screening','Aptitude','Manager Round','Kaveri Round','Vijay Round'];

const ACTIVE_POST_APTITUDE_STATUSES = new Set([
  'Assessment Pending',
  'Assesment Under Review',
  'AI Interview Pending',
  'Manager Round Pending',
  'Manager Feedback Pending',
  'Kaveri Round Pending',
  'Kaveri Feedback Pending',
  'Vijay Round Pending',
  'Vijay Feedback Pending',
]);

const ROLE_DROPDOWN_STATUSES = new Set([
  'Assessment Pending',
  'Assesment Under Review',
  'AI Interview Pending',
  'Manager Round Pending',
  'Manager Feedback Pending',
  'Kaveri Round Pending',
  'Kaveri Feedback Pending',
  'Vijay Round Pending',
  'Vijay Feedback Pending',
  'Final Select',
  'Offered',
  'Joined',
  'Hold',
]);

const OPEN_STAGE_ORDER = [
  'Assessment Pending',
  'Assesment Under Review',
  'AI Interview Pending',
  'Manager Round Pending',
  'Manager Feedback Pending',
  'Kaveri Round Pending',
  'Kaveri Feedback Pending',
  'Vijay Round Pending',
  'Vijay Feedback Pending',
];

const STAGE_DATE_FIELD = {
  'Aptitude':      'aptitudeDate',
  'Assessment':    'assessmentDate',
  'AI Interview':  'assessmentDate',
  'Manager Round': 'managerRoundDate',
  'Kaveri Round':  'kaveriRoundDate',
  'Vijay Round':   'vijayRoundDate',
  'Offered':       'offeredDate',
  'Joined':        'joiningDate',
};

const CURRENT_STATUS_TO_STAGE = {
  'Screen Reject': 'Screening',
  'Hold': 'Screening',
  'Drop': 'Screening',
  'Aptitude Pending': 'Aptitude',
  'Aptitude Reject': 'Aptitude',
  'Test Reject': 'Aptitude',
  'Aptitude Select': 'Aptitude',
  'Assessment Pending': 'Assessment',
  'Assessment Reject': 'Assessment',
  'Assesment Under Review': 'Assessment',
  'AI Interview Pending': 'AI Interview',
  'AI Interview Reject': 'AI Interview',
  'Manager Round Pending': 'Manager Round',
  'Manager Feedback Pending': 'Manager Round',
  'Manager Round Reject': 'Manager Round',
  'Kaveri Round Pending': 'Kaveri Round',
  'Kaveri Feedback Pending': 'Kaveri Round',
  'Kaveri Reject': 'Kaveri Round',
  'Vijay Round Pending': 'Vijay Round',
  'Vijay Feedback Pending': 'Vijay Round',
  'Vijay Reject': 'Vijay Round',
};

const DEPT_COLOURS = {
  'TA':               '#6366F1',
  'BD':               '#1565C0',
  'Central Marketing':'#6A1B9A',
  'TAD':              '#2E7D32',
  'HR':               '#F57F17',
  "Founder's Office": '#AD1457',
};

const MULTI_SELECT_CONFIG = {
  filterDept: { placeholder: 'All Departments', singular: 'Department', plural: 'Departments' },
  filterRole: { placeholder: 'All Roles', singular: 'Role', plural: 'Roles' },
  filterMonth: { placeholder: 'All Months', singular: 'Month', plural: 'Months' },
};

// ── STATE ──
let rawCandidates = [];
let filtered = [];
let tatScope = 'filtered';
let analyticsMainTab = 'pipeline';
let multiSelectState = {
  filterDept: [],
  filterRole: [],
  filterMonth: [],
};

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  initMultiSelects();
  // Auth check
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const user = await res.json();
      window.__userEmail = user.email;
      const nameEl = document.getElementById('user-name');
      if (nameEl) nameEl.textContent = user.name || user.email;
    } else if (window.location.hostname !== 'localhost') {
      window.location.href = '/login';
      return;
    }
  } catch {}
  loadData();
});

async function loadData() {
  setSyncBadge('connecting');
  document.getElementById('main-loading').style.display = 'flex';
  document.getElementById('analytics-content').innerHTML = `
    <div class="analytics-loading" id="main-loading">
      <div class="spinner"></div>Loading analytics...
    </div>`;

  try {
    const res = await fetch('/api/candidates');
    if (res.status === 401) {
      if (window.location.hostname !== 'localhost') {
        window.location.href = '/login'; return;
      }
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    rawCandidates = data.candidates || [];
    setSyncBadge('live');
    populateFilterDropdowns();
    applyFilters();
  } catch (err) {
    setSyncBadge('error');
    document.getElementById('analytics-content').innerHTML =
      `<div class="analytics-loading" style="color:#B91C1C">Failed to load data: ${escHtml(err.message)}</div>`;
  }
}

// ── FILTER HELPERS ──
function populateFilterDropdowns() {
  populateDepartmentFilter();

  // Recruiters
  const recEl = document.getElementById('filterRecruiter');
  const recruiters = [...new Set(rawCandidates.map(c => c.recruiter).filter(Boolean))].sort();
  recEl.innerHTML = '<option value="">All Recruiters</option>';
  recruiters.forEach(r => { const o = document.createElement('option'); o.value = r; o.textContent = r; recEl.appendChild(o); });

  // Months (from sourcingDate)
  const months = [...new Set(rawCandidates.map(c => getMonthLabel(c.sourcingDate)).filter(Boolean))];
  months.sort((a, b) => new Date('1 ' + a) - new Date('1 ' + b));
  const currentMonths = getMultiSelectValues('filterMonth');
  setMultiSelectOptions('filterMonth', months, currentMonths.filter(month => months.includes(month)));
}

function populateDepartmentFilter() {
  setMultiSelectOptions('filterDept', Object.keys(DEPT_ROLES), getMultiSelectValues('filterDept'));
  rebuildRoleFilter();
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

function applyFilters() {
  filtered = getCandidatesMatchingFilters({ monthMode: 'sourcing' });
  renderAll();
}

function clearFilters() {
  ['filterRecruiter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setMultiSelectValues('filterDept', []);
  setMultiSelectValues('filterRole', []);
  setMultiSelectValues('filterMonth', []);
  rebuildRoleFilter();
  applyFilters();
}

// ── RENDER ALL SECTIONS ──
function renderAll() {
  const content = document.getElementById('analytics-content');
  content.innerHTML = '';

  content.appendChild(renderSummaryStats());
  content.appendChild(renderMainTabsSection());
}

// ── 1. SUMMARY STATS ──
function renderSummaryStats() {
  const total    = filtered.length;
  const joined   = filtered.filter(c => c.status === 'Joined').length;
  const selected = filtered.filter(c => ['Final Select','Offered'].includes(c.status)).length;
  const months   = getMultiSelectValues('filterMonth');
  const monthLabel = months.length === 1 ? months[0] : '';
  const activePool = getCandidatesMatchingFilters({ includeMonth: false }).filter(c => ACTIVE_POST_APTITUDE_STATUSES.has(c.status));
  const activeMonth = monthLabel || getLatestMonthLabel(activePool.map(c => getCandidateLastActivityDate(c)));
  const active   = activePool.filter(c => !activeMonth || getMonthLabel(getCandidateLastActivityDate(c)) === activeMonth).length;
  const convRate = total > 0 ? Math.round(((joined + selected) / total) * 100) : 0;
  const activeSub = months.length > 1
    ? `latest activity across ${months.length} selected months`
    : activeMonth
      ? `latest activity in ${escHtml(activeMonth)}`
      : 'pending at a stage';

  const selectedDepts = getMultiSelectValues('filterDept');
  const activeDepts = selectedDepts.length
    ? selectedDepts
    : DEPT_ORDER.filter(d => filtered.some(c => c.department === d));

  const wrap = document.createElement('div');
  wrap.className = 'analytics-section';
  wrap.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Summary</div>
        <div class="section-subtitle">${total} candidates · ${activeDepts.length} dept${activeDepts.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <div class="section-body">
      <div class="stats-strip">
        <div class="stat-card">
          <div class="stat-card-label">Total Sourced</div>
          <div class="stat-card-value">${total}</div>
          <div class="stat-card-sub">candidates tracked</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Active in Pipeline</div>
          <div class="stat-card-value" style="color:#4338CA">${active}</div>
          <div class="stat-card-sub">${activeSub}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Selected / Offered</div>
          <div class="stat-card-value" style="color:#166534">${selected}</div>
          <div class="stat-card-sub">final select + offered</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Joined</div>
          <div class="stat-card-value" style="color:#065F46">${joined}</div>
          <div class="stat-card-sub">confirmed joinees</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Conversion Rate</div>
          <div class="stat-card-value" style="color:${convRate >= 20 ? '#166534' : convRate >= 10 ? '#92400E' : '#B91C1C'}">${convRate}%</div>
          <div class="stat-card-sub">joined+selected / total</div>
        </div>
      </div>
    </div>`;
  return wrap;
}

function renderMainTabsSection() {
  const wrap = document.createElement('div');
  wrap.className = 'page-tabs-shell';

  const tabs = document.createElement('div');
  tabs.className = 'page-tabs';
  tabs.innerHTML = `
    <button class="page-tab ${analyticsMainTab === 'pipeline' ? 'active' : ''}" onclick="switchAnalyticsMainTab(this,'pipeline-panel','pipeline')">Pipeline Funnel</button>
    <button class="page-tab ${analyticsMainTab === 'tat' ? 'active' : ''}" onclick="switchAnalyticsMainTab(this,'tat-panel','tat')">TAT</button>
    <button class="page-tab ${analyticsMainTab === 'ratios' ? 'active' : ''}" onclick="switchAnalyticsMainTab(this,'ratios-panel','ratios')">Ratios</button>
  `;

  const pipelinePanel = document.createElement('div');
  pipelinePanel.id = 'pipeline-panel';
  pipelinePanel.className = `page-tab-panel ${analyticsMainTab === 'pipeline' ? 'active' : ''}`;
  pipelinePanel.appendChild(renderFunnelSection());
  pipelinePanel.appendChild(renderOpenStageAgingSection());

  const pipelineRow = document.createElement('div');
  pipelineRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:28px;';
  pipelineRow.appendChild(renderDeptBreakdown());
  pipelineRow.appendChild(renderRecruiterPerformance());
  pipelinePanel.appendChild(pipelineRow);

  const pipelineTrendWrap = document.createElement('div');
  pipelineTrendWrap.style.marginTop = '28px';
  pipelineTrendWrap.appendChild(renderMonthTrend());
  pipelinePanel.appendChild(pipelineTrendWrap);

  const tatPanel = document.createElement('div');
  tatPanel.id = 'tat-panel';
  tatPanel.className = `page-tab-panel ${analyticsMainTab === 'tat' ? 'active' : ''}`;
  tatPanel.appendChild(renderTATSection());

  const ratioPanel = document.createElement('div');
  ratioPanel.id = 'ratios-panel';
  ratioPanel.className = `page-tab-panel ${analyticsMainTab === 'ratios' ? 'active' : ''}`;
  ratioPanel.appendChild(renderRatiosSection());

  wrap.appendChild(tabs);
  wrap.appendChild(pipelinePanel);
  wrap.appendChild(tatPanel);
  wrap.appendChild(ratioPanel);

  return wrap;
}

// ── 2. PIPELINE FUNNEL ──
function renderFunnelSection() {
  const wrap = document.createElement('div');
  wrap.className = 'analytics-section';

  // Build stage counts per role
  const stageCounts = {};
  const roleCandidates = {};
  for (const c of filtered) {
    if (!c.role) continue;
    if (ROLE_DROPDOWN_STATUSES.has(c.status)) {
      if (!roleCandidates[c.role]) roleCandidates[c.role] = [];
      roleCandidates[c.role].push(c);
    }
    if (!c.status) continue;
    if (!VALID_FUNNEL_STATUSES.has(c.status)) continue;
    if (!stageCounts[c.role]) stageCounts[c.role] = {};
    stageCounts[c.role][c.status] = (stageCounts[c.role][c.status] || 0) + 1;
  }

  // Get all present statuses in funnel order
  const presentStatuses = new Set();
  Object.values(stageCounts).forEach(sc => Object.keys(sc).forEach(s => presentStatuses.add(s)));
  const orderedStatuses = [
    ...FUNNEL_STATUS_ORDER.filter(s => presentStatuses.has(s)),
    ...[...presentStatuses].filter(s => !FUNNEL_STATUS_ORDER.includes(s)).sort(),
  ];

  // Roles in dept order
  const rolesToShow = DEPT_ORDER.flatMap(d => (DEPT_ROLES[d] || []).filter(r => stageCounts[r]));

  if (rolesToShow.length === 0) {
    wrap.innerHTML = `<div class="section-header"><div class="section-title">Pipeline Funnel</div></div><div class="empty-state">No data for current filters.</div>`;
    return wrap;
  }

  // Build table HTML
  let headerCells = `<th>Role</th><th>Dept</th><th style="background:#283593">Sourced</th>`;
  orderedStatuses.forEach(s => { headerCells += `<th>${escHtml(s)}</th>`; });
  headerCells += `<th style="background:#283593">Total</th>`;

  let bodyRows = '';
  let prevDept = null;
  for (const rl of rolesToShow) {
    const dept = getDept(rl);
    if (dept !== prevDept) {
      bodyRows += `<tr class="dept-row"><td colspan="${orderedStatuses.length + 4}">${escHtml(dept)}</td></tr>`;
      prevDept = dept;
    }
    const counts = stageCounts[rl];
    const total  = Object.values(counts).reduce((a, b) => a + b, 0);
    const sourced = total;
    bodyRows += `<tr><td>${buildRoleCell(rl, roleCandidates[rl] || [])}</td><td><span class="dept-badge dept-${dept.replace(/\s+/g,'-').replace(/'/g,'')}">${escHtml(dept)}</span></td>`;
    bodyRows += `<td><span class="sourced-count">${sourced}</span></td>`;
    orderedStatuses.forEach(s => {
      const cnt = counts[s] || 0;
      const cls = STATUS_FC_CLASS[s] || '';
      bodyRows += cnt > 0
        ? `<td><span class="funnel-count ${cls}">${cnt}</span></td>`
        : `<td></td>`;
    });
    bodyRows += `<td><span class="funnel-total">${total}</span></td></tr>`;
  }

  wrap.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Pipeline Funnel — Candidates by Stage</div>
        <div class="section-subtitle">All roles with active candidates · colour coded by status type</div>
      </div>
    </div>
    <div class="section-body">
      <div class="table-scroll-shell">
        <table class="funnel-table">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background:#FEE2E2"></div>Reject / Drop</div>
        <div class="legend-item"><div class="legend-dot" style="background:#FEF9C3"></div>Pending</div>
        <div class="legend-item"><div class="legend-dot" style="background:#DCFCE7"></div>Select</div>
        <div class="legend-item"><div class="legend-dot" style="background:#DBEAFE"></div>Offered</div>
        <div class="legend-item"><div class="legend-dot" style="background:#D1FAE5"></div>Joined</div>
        <div class="legend-item"><div class="legend-dot" style="background:#FEF3C7"></div>Hold</div>
      </div>
    </div>`;
  return wrap;
}

// ── 3. TAT ANALYSIS ──
function renderTATSection() {
  const wrap = document.createElement('div');
  wrap.className = 'analytics-section';
  const sourceCandidates = tatScope === 'all' ? rawCandidates : filtered;
  const tatData = buildTatData(sourceCandidates);

  // Determine which roles to show based on filter
  const filterDepts = getMultiSelectValues('filterDept');
  const filterRoles = getMultiSelectValues('filterRole');
  let tatRoles = filterRoles.length
    ? filterRoles.filter(r => tatData[r])
    : filterDepts.length
      ? filterDepts.flatMap(dept => (DEPT_ROLES[dept] || []).filter(r => tatData[r]))
      : DEPT_ORDER.flatMap(d => (DEPT_ROLES[d] || []).filter(r => tatData[r]));
  tatRoles = [...new Set(tatRoles)];

  if (tatRoles.length === 0) {
    wrap.innerHTML = `<div class="section-header"><div class="section-title">Average TAT (Days)</div></div><div class="empty-state">No TAT data available — fill in stage dates in the sheet.</div>`;
    return wrap;
  }

  // All transitions across shown roles in pipeline order
  const pipelineOrder = ['Screening','Aptitude','Assessment','AI Interview','Manager Round','Kaveri Round','Vijay Round','Offered','Joined'];
  const allTransSet = new Set();
  tatRoles.forEach(rl => {
    const pl = getRolePipeline(rl);
    for (let i = 0; i < pl.length - 1; i++) allTransSet.add(`${pl[i]} → ${pl[i+1]}`);
  });
  const allTrans = [...allTransSet].sort((a, b) => {
    const ai = pipelineOrder.indexOf(a.split(' → ')[0]);
    const bi = pipelineOrder.indexOf(b.split(' → ')[0]);
    return ai !== bi ? ai - bi : pipelineOrder.indexOf(a.split(' → ')[1]) - pipelineOrder.indexOf(b.split(' → ')[1]);
  });

  let headerCells = `<th>Role</th><th>Dept</th>`;
  allTrans.forEach(t => { headerCells += `<th>${escHtml(t)}</th>`; });

  let bodyRows = '';
  let prevDept = null;
  for (const rl of tatRoles) {
    const dept = getDept(rl);
    if (dept !== prevDept) {
      bodyRows += `<tr class="dept-row"><td colspan="${allTrans.length + 2}">${escHtml(dept)}</td></tr>`;
      prevDept = dept;
    }
    const pl = getRolePipeline(rl);
    const roleTransSet = new Set();
    for (let i = 0; i < pl.length - 1; i++) roleTransSet.add(`${pl[i]} → ${pl[i+1]}`);

    bodyRows += `<tr><td>${escHtml(rl)}</td><td><span class="dept-badge dept-${dept.replace(/\s+/g,'-').replace(/'/g,'')}">${escHtml(dept)}</span></td>`;
    allTrans.forEach(t => {
      if (!roleTransSet.has(t)) {
        bodyRows += `<td style="background:#F5F5F5"></td>`;
        return;
      }
      const arr = tatData[rl]?.[t];
      if (arr && arr.length > 0) {
        const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        const cls = avg <= 3 ? 'tat-green' : avg <= 7 ? 'tat-yellow' : 'tat-red';
        bodyRows += `<td><span class="tat-cell ${cls}">${avg}d <span style="font-weight:500;opacity:0.7">(n=${arr.length})</span></span></td>`;
      } else {
        bodyRows += `<td><span class="tat-na">no data</span></td>`;
      }
    });
    bodyRows += `</tr>`;
  }

  wrap.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Average TAT (Days) — Stage to Stage</div>
        <div class="section-subtitle">${tatScope === 'all' ? 'Calculated across all candidates in the sheet' : 'Calculated on the currently filtered candidate set'} · Green ≤3d · Yellow 4–7d · Red >7d · n = sample size</div>
      </div>
    </div>
    <div class="section-tabs">
      <button class="section-tab ${tatScope === 'filtered' ? 'active' : ''}" onclick="switchTatScope(this,'filtered')">Current Filters</button>
      <button class="section-tab ${tatScope === 'all' ? 'active' : ''}" onclick="switchTatScope(this,'all')">All Data</button>
    </div>
    <div class="section-body">
      <div class="table-scroll-shell">
        <table class="tat-table">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>`;
  return wrap;
}

// ── 4. OPEN STAGE AGING ──
function renderOpenStageAgingSection() {
  const wrap = document.createElement('div');
  wrap.className = 'analytics-section';

  const stageStats = {};
  for (const c of filtered) {
    const info = getOpenStageAging(c);
    if (!info) continue;

    if (!stageStats[info.stage]) {
      stageStats[info.stage] = { count: 0, totalDays: 0, fresh: 0, watch: 0, stale: 0, oldest: 0 };
    }

    const stat = stageStats[info.stage];
    stat.count++;
    stat.totalDays += info.days;
    stat.oldest = Math.max(stat.oldest, info.days);
    if (info.days <= 3) stat.fresh++;
    else if (info.days <= 7) stat.watch++;
    else stat.stale++;
  }

  const stages = OPEN_STAGE_ORDER.filter(stage => stageStats[stage]);
  if (stages.length === 0) {
    wrap.innerHTML = `
      <div class="section-header">
        <div>
          <div class="section-title">Open Stage Aging</div>
          <div class="section-subtitle">Current filtered pipeline only · based on existing stage dates and current status</div>
        </div>
      </div>
      <div class="empty-state">No post-aptitude pending candidates in the current filters.</div>`;
    return wrap;
  }

  const rows = stages.map(stage => {
    const stat = stageStats[stage];
    const avg = Math.round(stat.totalDays / stat.count);
    const cls = avg <= 3 ? 'tat-green' : avg <= 7 ? 'tat-yellow' : 'tat-red';
    return `
      <tr>
        <td>${escHtml(stage)}</td>
        <td>${stat.count}</td>
        <td><span class="tat-cell ${cls}">${avg}d</span></td>
        <td>${stat.fresh}</td>
        <td>${stat.watch}</td>
        <td>${stat.stale}</td>
        <td>${stat.oldest}d</td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Open Stage Aging</div>
        <div class="section-subtitle">Current filtered pipeline only · age is inferred from the previous completed stage or the round date for feedback-pending statuses</div>
      </div>
    </div>
    <div class="section-body">
      <table class="tat-table">
        <thead>
          <tr>
            <th>Open Stage</th>
            <th>Candidates</th>
            <th>Avg Age</th>
            <th>0-3d</th>
            <th>4-7d</th>
            <th>8+d</th>
            <th>Oldest</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  return wrap;
}

// ── 4A. DEPT BREAKDOWN ──
function renderDeptBreakdown() {
  const wrap = document.createElement('div');
  wrap.className = 'analytics-section';

  const deptCounts = {};
  for (const c of filtered) {
    const dept = c.department || 'Unknown';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  }
  const total = filtered.length;

  const sorted = DEPT_ORDER.filter(d => deptCounts[d])
    .concat(Object.keys(deptCounts).filter(d => !DEPT_ORDER.includes(d)).sort())
    .map(d => ({ dept: d, count: deptCounts[d] }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    wrap.innerHTML = `<div class="section-header"><div class="section-title">By Department</div></div><div class="empty-state">No data.</div>`;
    return wrap;
  }

  const maxCount = sorted[0].count;
  const bars = sorted.map(({ dept, count }) => {
    const pct = Math.round((count / maxCount) * 100);
    const colour = DEPT_COLOURS[dept] || '#6366F1';
    const share  = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="bar-row">
        <div class="bar-label" title="${escHtml(dept)}">${escHtml(dept)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${colour}">
            <span>${share}%</span>
          </div>
        </div>
        <div class="bar-count">${count}</div>
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="section-header">
      <div class="section-title">By Department</div>
      <div class="section-subtitle">${sorted.length} active depts</div>
    </div>
    <div class="section-body"><div class="bar-chart">${bars}</div></div>`;
  return wrap;
}

// ── 4B. RECRUITER PERFORMANCE ──
function renderRecruiterPerformance() {
  const wrap = document.createElement('div');
  wrap.className = 'analytics-section';

  const recStats = {};
  for (const c of filtered) {
    const r = c.recruiter || 'Unknown';
    if (!recStats[r]) recStats[r] = { total: 0, active: 0, selected: 0, joined: 0, rejected: 0 };
    recStats[r].total++;
    if (c.status === 'Joined') recStats[r].joined++;
    else if (['Final Select','Offered'].includes(c.status)) recStats[r].selected++;
    else if (['Screen Reject','Aptitude Reject','Test Reject','Assessment Reject','AI Interview Reject',
      'Manager Round Reject','Kaveri Reject','Vijay Reject','Offer Dropout','Drop'].includes(c.status)) recStats[r].rejected++;
    else recStats[r].active++;
  }

  const sorted = Object.entries(recStats).sort((a, b) => b[1].total - a[1].total);

  if (sorted.length === 0) {
    wrap.innerHTML = `<div class="section-header"><div class="section-title">Recruiter Performance</div></div><div class="empty-state">No data.</div>`;
    return wrap;
  }

  const rows = sorted.map(([name, s]) => {
    const conv = s.total > 0 ? Math.round(((s.joined + s.selected) / s.total) * 100) : 0;
    const convClass = conv >= 20 ? 'conv-high' : conv >= 10 ? 'conv-mid' : 'conv-low';
    return `
      <tr>
        <td><div class="recruiter-name">${escHtml(name)}</div></td>
        <td>${s.total}</td>
        <td style="color:#4338CA;font-weight:700">${s.active}</td>
        <td style="color:#166534;font-weight:700">${s.selected}</td>
        <td style="color:#065F46;font-weight:700">${s.joined}</td>
        <td style="color:#B91C1C;font-weight:700">${s.rejected}</td>
        <td><span class="conv-rate ${convClass}">${conv}%</span></td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="section-header">
      <div class="section-title">Recruiter Performance</div>
    </div>
    <div class="section-body" style="overflow-x:auto">
      <table class="recruiter-table">
        <thead>
          <tr>
            <th>Recruiter</th><th>Total</th><th>Active</th>
            <th>Selected</th><th>Joined</th><th>Rejected</th><th>Conv %</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  return wrap;
}

// ── 5. MONTH-OVER-MONTH TREND ──
function renderMonthTrend() {
  const wrap = document.createElement('div');
  wrap.className = 'analytics-section';

  const monthData = {};
  for (const c of filtered) {
    const sourcingDate = parseDate(c.sourcingDate);
    bumpMonthCount(monthData, sourcingDate, 'sourced');
    if (['Final Select','Offered'].includes(c.status)) bumpMonthCount(monthData, sourcingDate, 'selected');
    if (c.status === 'Joined') bumpMonthCount(monthData, sourcingDate, 'joined');
  }

  const months = sortMonthLabels(Object.keys(monthData));

  if (months.length === 0) {
    wrap.innerHTML = `<div class="section-header"><div class="section-title">Month-over-Month</div></div><div class="empty-state">No event date data available.</div>`;
    return wrap;
  }

  // Sub-tabs: Sourced / Joined / Selected
  const buildGrid = (key, colour) => months.map(m => {
    const val = monthData[m][key] || 0;
    return `
      <div class="trend-month">
        <div class="trend-month-label">${escHtml(m)}</div>
        <div class="trend-month-count" style="color:${colour}">${val}</div>
        <div class="trend-month-sub">${escHtml(key)}</div>
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="section-header">
      <div class="section-title">Month-over-Month Trend</div>
      <div class="section-subtitle">Current filtered candidate set grouped by sourcing month · ${months.length} months of data</div>
    </div>
    <div class="section-tabs">
      <button class="section-tab active" onclick="switchTrendTab(this,'tab-sourced')">Sourced</button>
      <button class="section-tab" onclick="switchTrendTab(this,'tab-selected')">Selected / Offered</button>
      <button class="section-tab" onclick="switchTrendTab(this,'tab-joined')">Joined</button>
    </div>
    <div class="section-tab-content active" id="tab-sourced">
      <div class="trend-grid">${buildGrid('sourced','#4338CA')}</div>
    </div>
    <div class="section-tab-content" id="tab-selected">
      <div class="trend-grid">${buildGrid('selected','#166534')}</div>
    </div>`;
  wrap.innerHTML += `
    <div class="section-tab-content" id="tab-joined">
      <div class="trend-grid">${buildGrid('joined','#065F46')}</div>
    </div>`;
  return wrap;
}

function renderRatiosSection() {
  const wrap = document.createElement('div');
  wrap.className = 'analytics-section';

  const metrics = buildRatioMetrics(filtered);
  const cards = metrics.map(renderRatioCard).join('');

  wrap.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Conversion Ratios</div>
        <div class="section-subtitle">Every card respects the current global filters and counts each candidate only once per metric</div>
      </div>
    </div>
    <div class="section-body">
      <div class="ratio-grid">${cards}</div>
    </div>`;

  return wrap;
}

function renderRatioCard(metric) {
  const hasData = metric.denominator > 0;
  const percentage = hasData ? `${Math.round((metric.numerator / metric.denominator) * 100)}%` : '—';
  const cardClass = `ratio-card${hasData ? '' : ' empty'}`;
  const meta = hasData ? `${metric.numerator} / ${metric.denominator}` : 'No applicable candidates';

  return `
    <article class="${cardClass}">
      <div class="ratio-card-head">
        <div class="ratio-card-label">${escHtml(metric.label)}</div>
        <div class="ratio-card-meta">${escHtml(meta)}</div>
      </div>
      <div class="ratio-card-value">${percentage}</div>
      <div class="ratio-card-breakdown">${escHtml(metric.breakdown)}</div>
      <div class="ratio-card-note">${escHtml(metric.note)}</div>
    </article>`;
}

function buildRatioMetrics(candidates) {
  const totalSourced = candidates.length;
  const interviewCount = candidates.filter(hasAnyInterview).length;
  const managerCandidates = candidates.filter(c => hasReachedStage(c, 'Manager Round')).length;
  const managerSelected = candidates.filter(c => hasClearedStage(c, 'Manager Round')).length;
  const kaveriCandidates = candidates.filter(c => hasReachedStage(c, 'Kaveri Round')).length;
  const kaveriSelected = candidates.filter(c => hasClearedStage(c, 'Kaveri Round')).length;
  const vijayCandidates = candidates.filter(c => hasReachedStage(c, 'Vijay Round')).length;
  const vijaySelected = candidates.filter(c => hasClearedStage(c, 'Vijay Round')).length;
  const everOffered = candidates.filter(hasEverBeenOffered).length;
  const joined = candidates.filter(hasJoined).length;
  const offeredFromInterviews = candidates.filter(c => hasAnyInterview(c) && hasEverBeenOffered(c)).length;
  const joinedFromInterviews = candidates.filter(c => hasAnyInterview(c) && hasJoined(c)).length;
  const offerDropouts = candidates.filter(c => hasEverBeenOffered(c) && isOfferDeclined(c)).length;

  return [
    {
      label: 'CV to Interview Rate',
      numerator: interviewCount,
      denominator: totalSourced,
      breakdown: `${interviewCount} interviewed out of ${totalSourced} sourced`,
      note: 'Counts a candidate once if they reached any interview round at least once.',
    },
    {
      label: 'Manager Select Rate',
      numerator: managerSelected,
      denominator: managerCandidates,
      breakdown: `${managerSelected} selected after manager out of ${managerCandidates} who reached manager`,
      note: 'Later-stage movement or later-stage rejection still counts as manager selected.',
    },
    {
      label: 'Kaveri Select Rate',
      numerator: kaveriSelected,
      denominator: kaveriCandidates,
      breakdown: `${kaveriSelected} selected after Kaveri out of ${kaveriCandidates} who reached Kaveri`,
      note: 'Any later Vijay or terminal stage counts as clearing the Kaveri round.',
    },
    {
      label: 'Vijay Select Rate',
      numerator: vijaySelected,
      denominator: vijayCandidates,
      breakdown: `${vijaySelected} selected after Vijay out of ${vijayCandidates} who reached Vijay`,
      note: 'Final Select, Offered, Offer Dropout, or Joined counts as clearing Vijay.',
    },
    {
      label: 'Interview to Offer Rate',
      numerator: offeredFromInterviews,
      denominator: interviewCount,
      breakdown: `${offeredFromInterviews} offered out of ${interviewCount} interviewed`,
      note: 'Uses candidates who ever had an interview and ever had Offered at any point.',
    },
    {
      label: 'Interview to Joining Rate',
      numerator: joinedFromInterviews,
      denominator: interviewCount,
      breakdown: `${joinedFromInterviews} joined out of ${interviewCount} interviewed`,
      note: 'Counts a candidate once if they had any interview and eventually joined.',
    },
    {
      label: 'Offer to Joining Rate',
      numerator: joined,
      denominator: everOffered,
      breakdown: `${joined} joined out of ${everOffered} ever offered`,
      note: 'Offer denominator includes current or past offered candidates within the active filters.',
    },
    {
      label: 'Offer Decline Rate',
      numerator: offerDropouts,
      denominator: everOffered,
      breakdown: `${offerDropouts} offer dropouts out of ${everOffered} ever offered`,
      note: 'Counts candidates who had Offered at some point and are currently at Offer Dropout.',
    },
    {
      label: 'Overall CV to Joining Rate',
      numerator: joined,
      denominator: totalSourced,
      breakdown: `${joined} joined out of ${totalSourced} sourced`,
      note: 'The broadest top-of-funnel conversion across the currently filtered population.',
    },
  ];
}

function switchTatScope(btn, scope) {
  tatScope = scope;
  renderAll();
}

function switchAnalyticsMainTab(btn, panelId, tabKey) {
  analyticsMainTab = tabKey;
  const shell = btn.closest('.page-tabs-shell');
  if (!shell) return;
  shell.querySelectorAll('.page-tab').forEach(tab => tab.classList.remove('active'));
  shell.querySelectorAll('.page-tab-panel').forEach(panel => panel.classList.remove('active'));
  btn.classList.add('active');
  shell.querySelector('#' + panelId)?.classList.add('active');
}

function switchTrendTab(btn, tabId) {
  const section = btn.closest('.analytics-section');
  section.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
  section.querySelectorAll('.section-tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  section.querySelector('#' + tabId).classList.add('active');
}

function buildRoleCell(role, candidates) {
  const sortedCandidates = [...candidates].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  if (!sortedCandidates.length) {
    return `<div class="role-cell"><div class="role-title">${escHtml(role)}</div></div>`;
  }

  const rows = sortedCandidates.map(candidate => `
    <tr>
      <td>
        <a class="role-candidate-name" href="${escAttr(getCandidateAnalyticsLink(candidate))}" target="_blank" rel="noopener noreferrer">
          ${escHtml(candidate.name || 'Unnamed Candidate')}
        </a>
      </td>
      <td class="role-candidate-status">${escHtml(candidate.status || 'Unknown')}</td>
    </tr>
  `).join('');

  return `
    <div class="role-cell">
      <div class="role-title">${escHtml(role)}</div>
      <details class="role-candidates">
        <summary>View candidates</summary>
        <div class="role-candidate-list">
          <table class="role-candidate-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>
    </div>`;
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
  if (id === 'filterDept') rebuildRoleFilter();
  updateMultiSelectTrigger(id);
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

function buildTatData(candidates) {
  const tatData = {};
  for (const c of candidates) {
    const pipeline = getRolePipeline(c.role);
    if (!tatData[c.role]) tatData[c.role] = {};
    for (let i = 0; i < pipeline.length - 1; i++) {
      const from = pipeline[i];
      const to   = pipeline[i + 1];
      const fromDate = from === 'Screening' ? parseDate(c.sourcingDate) : getStageDate(c, from);
      const toDate   = to   === 'Screening' ? parseDate(c.sourcingDate) : getStageDate(c, to);
      if (fromDate && toDate && toDate >= fromDate) {
        const days = Math.round((toDate - fromDate) / 86400000);
        if (days > 365) continue;
        const key = `${from} → ${to}`;
        if (!tatData[c.role][key]) tatData[c.role][key] = [];
        tatData[c.role][key].push(days);
      }
    }
  }
  return tatData;
}

function getOpenStageAging(candidate) {
  const status = candidate.status || '';
  const pipeline = getRolePipeline(candidate.role);
  const today = startOfDay(new Date());
  let startDate = null;

  switch (status) {
    case 'Assessment Pending':
    case 'Assesment Under Review':
      startDate = getStageEntryDate(candidate, 'Assessment', pipeline);
      break;
    case 'AI Interview Pending':
      startDate = getStageEntryDate(candidate, 'AI Interview', pipeline);
      break;
    case 'Manager Round Pending':
      startDate = getStageEntryDate(candidate, 'Manager Round', pipeline);
      break;
    case 'Manager Feedback Pending':
      startDate = getStageDate(candidate, 'Manager Round') || getStageEntryDate(candidate, 'Manager Round', pipeline);
      break;
    case 'Kaveri Round Pending':
      startDate = getStageEntryDate(candidate, 'Kaveri Round', pipeline);
      break;
    case 'Kaveri Feedback Pending':
      startDate = getStageDate(candidate, 'Kaveri Round') || getStageEntryDate(candidate, 'Kaveri Round', pipeline);
      break;
    case 'Vijay Round Pending':
      startDate = getStageEntryDate(candidate, 'Vijay Round', pipeline);
      break;
    case 'Vijay Feedback Pending':
      startDate = getStageDate(candidate, 'Vijay Round') || getStageEntryDate(candidate, 'Vijay Round', pipeline);
      break;
    default:
      return null;
  }

  if (!startDate) return null;
  const days = Math.max(0, Math.round((today - startOfDay(startDate)) / 86400000));
  return { stage: status, days };
}

// ── HELPERS ──
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function getCandidatesMatchingFilters({ includeMonth = true, monthMode = 'sourcing' } = {}) {
  const depts     = getMultiSelectValues('filterDept');
  const roles     = getMultiSelectValues('filterRole');
  const recruiter = document.getElementById('filterRecruiter')?.value || '';
  const months    = getMultiSelectValues('filterMonth');

  return rawCandidates.filter(c => {
    if (depts.length && !depts.includes(c.department)) return false;
    if (roles.length && !roles.includes(c.role)) return false;
    if (recruiter && c.recruiter  !== recruiter) return false;
    if (!includeMonth || !months.length) return true;

    const monthDate = monthMode === 'lastActivity'
      ? getCandidateLastActivityDate(c)
      : parseDate(c.sourcingDate);
    return months.includes(getMonthLabel(monthDate));
  });
}

function getMonthLabel(val) {
  const d = parseDate(val);
  if (!d) return null;
  return d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
}

function getLatestMonthLabel(dates) {
  const validDates = dates.map(parseDate).filter(Boolean).sort((a, b) => b - a);
  return validDates.length ? getMonthLabel(validDates[0]) : '';
}

function sortMonthLabels(labels) {
  return [...labels].sort((a, b) => new Date('1 ' + a) - new Date('1 ' + b));
}

function getRolePipeline(role) {
  return ROLE_PIPELINE[role] || DEFAULT_ROLE_PIPELINE;
}

function getStageDate(candidate, stage) {
  return parseDate(candidate?.[STAGE_DATE_FIELD[stage]]);
}

function getStageEntryDate(candidate, stage, pipeline = getRolePipeline(candidate.role)) {
  const index = pipeline.indexOf(stage);
  if (index <= 0) return parseDate(candidate.sourcingDate);

  const previousStage = pipeline[index - 1];
  if (previousStage === 'Screening') return parseDate(candidate.sourcingDate);
  return getStageDate(candidate, previousStage);
}

function getCandidateLastActivityDate(candidate) {
  const dates = [
    parseDate(candidate.sourcingDate),
    parseDate(candidate.aptitudeDate),
    parseDate(candidate.assessmentDate),
    parseDate(candidate.managerRoundDate),
    parseDate(candidate.kaveriRoundDate),
    parseDate(candidate.vijayRoundDate),
    parseDate(candidate.offeredDate),
    parseDate(candidate.joiningDate),
  ].filter(Boolean);
  return dates.sort((a, b) => b - a)[0] || null;
}

function hasAnyInterview(candidate) {
  return ['Assessment', 'AI Interview', 'Manager Round', 'Kaveri Round', 'Vijay Round']
    .some(stage => hasReachedStage(candidate, stage));
}

function hasReachedStage(candidate, stage) {
  const pipeline = getRolePipeline(candidate.role);
  if (!pipeline.includes(stage)) return false;
  const exactMaxIndex = getHistoryMaxStageIndex(candidate, pipeline);
  if (exactMaxIndex !== null) return exactMaxIndex >= pipeline.indexOf(stage);
  if (getStageDate(candidate, stage)) return true;
  return getMaxReachedStageIndex(candidate, pipeline) >= pipeline.indexOf(stage);
}

function hasClearedStage(candidate, stage) {
  const pipeline = getRolePipeline(candidate.role);
  const stageIndex = pipeline.indexOf(stage);
  if (stageIndex === -1 || !hasReachedStage(candidate, stage)) return false;
  const exactMaxIndex = getHistoryMaxStageIndex(candidate, pipeline);
  if (exactMaxIndex !== null) return exactMaxIndex > stageIndex;

  for (let i = stageIndex + 1; i < pipeline.length; i++) {
    if (hasReachedStage(candidate, pipeline[i])) return true;
  }

  return hasTerminalStageBeyondPipeline(candidate);
}

function hasEverBeenOffered(candidate) {
  if (hasSeenStatus(candidate, 'Offered')) return true;
  return Boolean(parseDate(candidate.offeredDate)) || ['Offered', 'Offer Dropout', 'Joined'].includes(candidate.status);
}

function hasJoined(candidate) {
  if (hasSeenStatus(candidate, 'Joined')) return true;
  return Boolean(parseDate(candidate.joiningDate)) || candidate.status === 'Joined';
}

function isOfferDeclined(candidate) {
  return candidate.status === 'Offer Dropout';
}

function getStatusTimeline(candidate) {
  const history = Array.isArray(candidate?.statusHistory) ? candidate.statusHistory : [];
  const statuses = history
    .map(entry => String(entry?.status || '').trim())
    .filter(Boolean);

  const currentStatus = String(candidate?.status || '').trim();
  if (currentStatus && !statuses.includes(currentStatus)) statuses.push(currentStatus);
  return statuses;
}

function hasRealStatusHistory(candidate) {
  return Array.isArray(candidate?.statusHistory) && candidate.statusHistory.length > 0;
}

function hasSeenStatus(candidate, status) {
  return getStatusTimeline(candidate).includes(status);
}

function getHistoryMaxStageIndex(candidate, pipeline = getRolePipeline(candidate.role)) {
  if (!hasRealStatusHistory(candidate)) return null;

  let maxIndex = -1;
  getStatusTimeline(candidate).forEach(status => {
    const idx = getStatusStageIndex(status, pipeline);
    if (idx > maxIndex) maxIndex = idx;
  });

  return maxIndex;
}

function getStatusStageIndex(status, pipeline) {
  if (!status) return -1;
  if (['Final Select', 'Offered', 'Offer Dropout', 'Joined'].includes(status)) return pipeline.length - 1;

  const stage = CURRENT_STATUS_TO_STAGE[status];
  if (!stage) return -1;
  return pipeline.indexOf(stage);
}

function getMaxReachedStageIndex(candidate, pipeline = getRolePipeline(candidate.role)) {
  let maxIndex = parseDate(candidate.sourcingDate) ? 0 : -1;

  pipeline.forEach((stage, index) => {
    if (stage === 'Screening') return;
    if (getStageDate(candidate, stage)) maxIndex = Math.max(maxIndex, index);
  });

  const currentStageIndex = getCurrentStageIndex(candidate, pipeline);
  return Math.max(maxIndex, currentStageIndex);
}

function getCurrentStageIndex(candidate, pipeline = getRolePipeline(candidate.role)) {
  if (['Final Select', 'Offered', 'Offer Dropout', 'Joined'].includes(candidate.status)) {
    return pipeline.length - 1;
  }
  const stage = CURRENT_STATUS_TO_STAGE[candidate.status];
  if (!stage) return -1;
  return pipeline.indexOf(stage);
}

function hasTerminalStageBeyondPipeline(candidate) {
  return ['Final Select', 'Offered', 'Offer Dropout', 'Joined'].includes(candidate.status) || hasEverBeenOffered(candidate) || hasJoined(candidate);
}

function bumpMonthCount(monthData, date, key) {
  const label = getMonthLabel(date);
  if (!label) return;
  if (!monthData[label]) monthData[label] = { sourced: 0, joined: 0, selected: 0 };
  monthData[label][key] = (monthData[label][key] || 0) + 1;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDept(role) {
  for (const dept of DEPT_ORDER) {
    if ((DEPT_ROLES[dept] || []).includes(role)) return dept;
  }
  return 'Other';
}

function getCandidateAnalyticsLink(candidate) {
  if (!candidate?._row) return '/dashboard';
  return `${window.location.origin}/dashboard?candidate=${candidate._row}`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  return escHtml(str).replace(/'/g, '&#39;');
}

function setSyncBadge(state) {
  const el = document.getElementById('sync-badge');
  if (!el) return;
  const map = {
    connecting: ['Loading...', 'sync-badge sync-connecting'],
    live:       ['Live',       'sync-badge sync-live'],
    error:      ['Error',      'sync-badge sync-error'],
  };
  const [text, cls] = map[state] || map.connecting;
  el.textContent = text;
  el.className   = cls;
}

function logout() {
  document.cookie = 'peepal_session=; Max-Age=0; Path=/';
  window.location.href = '/login';
}
