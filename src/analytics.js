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

const DEPT_COLOURS = {
  'TA':               '#6366F1',
  'BD':               '#1565C0',
  'Central Marketing':'#6A1B9A',
  'TAD':              '#2E7D32',
  'HR':               '#F57F17',
  "Founder's Office": '#AD1457',
};

// ── STATE ──
let rawCandidates = [];
let filtered = [];

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
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
  // Recruiters
  const recEl = document.getElementById('filterRecruiter');
  const recruiters = [...new Set(rawCandidates.map(c => c.recruiter).filter(Boolean))].sort();
  recEl.innerHTML = '<option value="">All Recruiters</option>';
  recruiters.forEach(r => { const o = document.createElement('option'); o.value = r; o.textContent = r; recEl.appendChild(o); });

  // Months (from sourcingDate)
  const monthEl = document.getElementById('filterMonth');
  const months = [...new Set(rawCandidates.map(c => getMonthLabel(c.sourcingDate)).filter(Boolean))];
  months.sort((a, b) => new Date('1 ' + a) - new Date('1 ' + b));
  monthEl.innerHTML = '<option value="">All Months</option>';
  months.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; monthEl.appendChild(o); });
}

function onDeptChange() {
  const dept = document.getElementById('filterDept').value;
  const roleEl = document.getElementById('filterRole');
  const roles = dept ? (DEPT_ROLES[dept] || []) : Object.values(DEPT_ROLES).flat();
  roleEl.innerHTML = '<option value="">All Roles</option>';
  roles.forEach(r => { const o = document.createElement('option'); o.value = r; o.textContent = r; roleEl.appendChild(o); });
  roleEl.value = '';
  applyFilters();
}

function applyFilters() {
  const dept      = document.getElementById('filterDept')?.value || '';
  const role      = document.getElementById('filterRole')?.value || '';
  const recruiter = document.getElementById('filterRecruiter')?.value || '';
  const month     = document.getElementById('filterMonth')?.value || '';

  filtered = rawCandidates.filter(c => {
    if (dept      && c.department !== dept)                        return false;
    if (role      && c.role       !== role)                        return false;
    if (recruiter && c.recruiter  !== recruiter)                   return false;
    if (month     && getMonthLabel(c.sourcingDate) !== month)      return false;
    return true;
  });

  renderAll();
}

function clearFilters() {
  ['filterDept','filterRole','filterRecruiter','filterMonth'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const roleEl = document.getElementById('filterRole');
  if (roleEl) {
    roleEl.innerHTML = '<option value="">All Roles</option>';
    Object.values(DEPT_ROLES).flat().forEach(r => {
      const o = document.createElement('option'); o.value = r; o.textContent = r; roleEl.appendChild(o);
    });
  }
  applyFilters();
}

// ── RENDER ALL SECTIONS ──
function renderAll() {
  const content = document.getElementById('analytics-content');
  content.innerHTML = '';

  // 1. Summary stats
  content.appendChild(renderSummaryStats());

  // 2. Pipeline funnel
  content.appendChild(renderFunnelSection());

  // 3. TAT analysis
  content.appendChild(renderTATSection());

  // 4. Dept + recruiter (side by side on wide screens)
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:28px;';
  row.appendChild(renderDeptBreakdown());
  row.appendChild(renderRecruiterPerformance());
  content.appendChild(row);

  // 5. Month-over-month trend
  content.appendChild(renderMonthTrend());
}

// ── 1. SUMMARY STATS ──
function renderSummaryStats() {
  const total    = filtered.length;
  const joined   = filtered.filter(c => c.status === 'Joined').length;
  const selected = filtered.filter(c => ['Final Select','Offered'].includes(c.status)).length;
  const active   = filtered.filter(c => !['Joined','Final Select','Offered','Offer Dropout','Drop',
    'Screen Reject','Aptitude Reject','Test Reject','Assessment Reject','AI Interview Reject',
    'Manager Round Reject','Kaveri Reject','Vijay Reject'].includes(c.status)).length;
  const convRate = total > 0 ? Math.round(((joined + selected) / total) * 100) : 0;

  const dept = document.getElementById('filterDept')?.value;
  const activeDepts = dept ? [dept] : DEPT_ORDER.filter(d => filtered.some(c => c.department === d));

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
          <div class="stat-card-sub">pending at a stage</div>
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

// ── 2. PIPELINE FUNNEL ──
function renderFunnelSection() {
  const wrap = document.createElement('div');
  wrap.className = 'analytics-section';

  // Build stage counts per role
  const stageCounts = {};
  const invalidStatuses = new Set();
  for (const c of filtered) {
    if (!c.role || !c.status) continue;
    if (!VALID_FUNNEL_STATUSES.has(c.status)) {
      invalidStatuses.add(c.status);
      continue;
    }
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
    bodyRows += `<tr><td>${escHtml(rl)}</td><td><span class="dept-badge dept-${dept.replace(/\s+/g,'-').replace(/'/g,'')}">${escHtml(dept)}</span></td>`;
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
      <table class="funnel-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      ${invalidStatuses.size ? `<div class="empty-state" style="margin-top:12px">Ignored invalid status values in source data: ${escHtml([...invalidStatuses].sort().join(', '))}</div>` : ''}
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

  // Compute TAT across all raw candidates (not filtered) — same as GAS script
  const tatData = {};
  for (const c of rawCandidates) {
    const pipeline = ROLE_PIPELINE[c.role];
    if (!pipeline) continue;
    if (!tatData[c.role]) tatData[c.role] = {};
    for (let i = 0; i < pipeline.length - 1; i++) {
      const from = pipeline[i];
      const to   = pipeline[i + 1];
      const fromDate = from === 'Screening' ? parseDate(c.sourcingDate) : parseDate(c[STAGE_DATE_FIELD[from]]);
      const toDate   = to   === 'Screening' ? parseDate(c.sourcingDate) : parseDate(c[STAGE_DATE_FIELD[to]]);
      if (fromDate && toDate && toDate >= fromDate) {
        const days = Math.round((toDate - fromDate) / 86400000);
        if (days > 365) continue; // sanity check
        const key = `${from} → ${to}`;
        if (!tatData[c.role][key]) tatData[c.role][key] = [];
        tatData[c.role][key].push(days);
      }
    }
  }

  // Determine which roles to show based on filter
  const filterDept = document.getElementById('filterDept')?.value;
  const filterRole = document.getElementById('filterRole')?.value;
  let tatRoles = filterRole
    ? [filterRole].filter(r => tatData[r])
    : filterDept
      ? (DEPT_ROLES[filterDept] || []).filter(r => tatData[r])
      : DEPT_ORDER.flatMap(d => (DEPT_ROLES[d] || []).filter(r => tatData[r]));

  if (tatRoles.length === 0) {
    wrap.innerHTML = `<div class="section-header"><div class="section-title">Average TAT (Days)</div></div><div class="empty-state">No TAT data available — fill in stage dates in the sheet.</div>`;
    return wrap;
  }

  // All transitions across shown roles in pipeline order
  const pipelineOrder = ['Screening','Aptitude','Assessment','AI Interview','Manager Round','Kaveri Round','Vijay Round','Offered','Joined'];
  const allTransSet = new Set();
  tatRoles.forEach(rl => {
    const pl = ROLE_PIPELINE[rl] || [];
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
    const pl = ROLE_PIPELINE[rl] || [];
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
        <div class="section-subtitle">Calculated across all data (not filtered) · Green ≤3d · Yellow 4–7d · Red >7d · n = sample size</div>
      </div>
    </div>
    <div class="section-body">
      <table class="tat-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
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
    const m = getMonthLabel(c.sourcingDate);
    if (!m) continue;
    if (!monthData[m]) monthData[m] = { sourced: 0, joined: 0, selected: 0 };
    monthData[m].sourced++;
    if (c.status === 'Joined') monthData[m].joined++;
    if (['Final Select','Offered'].includes(c.status)) monthData[m].selected++;
  }

  const months = Object.keys(monthData).sort((a, b) => new Date('1 ' + a) - new Date('1 ' + b));

  if (months.length === 0) {
    wrap.innerHTML = `<div class="section-header"><div class="section-title">Month-over-Month</div></div><div class="empty-state">No sourcing date data available.</div>`;
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
      <div class="section-subtitle">Based on sourcing date · ${months.length} months of data</div>
    </div>
    <div class="section-tabs">
      <button class="section-tab active" onclick="switchTrendTab(this,'tab-sourced')">Sourced</button>
      <button class="section-tab" onclick="switchTrendTab(this,'tab-joined')">Joined</button>
      <button class="section-tab" onclick="switchTrendTab(this,'tab-selected')">Selected</button>
    </div>
    <div class="section-tab-content active" id="tab-sourced">
      <div class="trend-grid">${buildGrid('sourced','#4338CA')}</div>
    </div>
    <div class="section-tab-content" id="tab-joined">
      <div class="trend-grid">${buildGrid('joined','#065F46')}</div>
    </div>
    <div class="section-tab-content" id="tab-selected">
      <div class="trend-grid">${buildGrid('selected','#166534')}</div>
    </div>`;
  return wrap;
}

function switchTrendTab(btn, tabId) {
  const section = btn.closest('.analytics-section');
  section.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
  section.querySelectorAll('.section-tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  section.querySelector('#' + tabId).classList.add('active');
}

// ── HELPERS ──
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function getMonthLabel(val) {
  const d = parseDate(val);
  if (!d) return null;
  return d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
}

function getDept(role) {
  for (const dept of DEPT_ORDER) {
    if ((DEPT_ROLES[dept] || []).includes(role)) return dept;
  }
  return 'Other';
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
