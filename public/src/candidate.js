// src/candidate.js
// Candidate side panel — full info view, pipeline timeline, scores, feedback form

// ── ROLE-BASED ACCESS CONFIG ──
const ACCESS = {
  admins:     ['arth.mohan@peepalconsulting.com'],
  recruiters: ['ramya.h@peepalconsulting.com','krishna.kumar@peepalconsulting.com','aditi.kaul@peepalconsulting.com','subhiksha.k@peepalconsulting.com','renjith.k@peepalconsulting.com'],
  managers:   ['ravi.kant.sharma@peepalconsulting.com','ambika.s@peepalconsulting.com','shiwala.dubey@peepalconsulting.com','parv.u@peepalconsulting.com','saketh.a@peepalconsulting.com','ramakrishna.d@peepalconsulting.com','rohan.p@peepalconsulting.com','champa.v@peepalconsulting.com'],
  kaveri:     ['kaveri.karnam@peepalconsulting.com'],
  vijay:      ['vijay@peepalconsulting.com'],
};

// Manager first-name → email map for matching sheet "Manager" column
const MANAGER_NAME_EMAIL = {
  'Ravikant':  'ravi.kant.sharma@peepalconsulting.com',
  'Ambika':    'ambika.s@peepalconsulting.com',
  'Shiwala':   'shiwala.dubey@peepalconsulting.com',
  'Parv':      'parv.u@peepalconsulting.com',
  'Saketh':    'saketh.a@peepalconsulting.com',
  'Ramakrishna': 'ramakrishna.d@peepalconsulting.com',
  'Rohan':     'rohan.p@peepalconsulting.com',
  'Champa':    'champa.v@peepalconsulting.com',
};

function getUserRole(email) {
  if (!email) return 'viewer';
  if (ACCESS.admins.includes(email))     return 'admin';
  if (ACCESS.recruiters.includes(email)) return 'recruiter';
  if (ACCESS.kaveri.includes(email))     return 'kaveri';
  if (ACCESS.vijay.includes(email))      return 'vijay';
  if (ACCESS.managers.includes(email))   return 'manager';
  return 'viewer';
}

function canWriteFeedback(email, candidate, stage) {
  const role = getUserRole(email);
  if (role === 'admin' || role === 'recruiter') return true;
  if (role === 'kaveri') return stage === 'kaveri_round';
  if (role === 'vijay')  return stage === 'vijay_round';
  if (role === 'manager') {
    const managerEmail = MANAGER_NAME_EMAIL[candidate.manager];
    return managerEmail === email && stage === 'manager_round';
  }
  return false;
}

// ── KNOWN PEOPLE for recipient picker ──
const KNOWN_PEOPLE = [
  { name: 'Ramya',     email: 'ramya.h@peepalconsulting.com' },
  { name: 'Krishna',   email: 'krishna.kumar@peepalconsulting.com' },
  { name: 'Aditi',     email: 'aditi.kaul@peepalconsulting.com' },
  { name: 'Renjith',   email: 'renjith.k@peepalconsulting.com' },
  { name: 'Subhiksha', email: 'subhiksha.k@peepalconsulting.com' },
  { name: 'Kaveri',    email: 'kaveri.karnam@peepalconsulting.com' },
  { name: 'Ravikant',  email: 'ravikant@peepalconsulting.com' },
  { name: 'Ambika',    email: 'ambika@peepalconsulting.com' },
  { name: 'Saketh',    email: 'saketh@peepalconsulting.com' },
  { name: 'Parv',      email: 'parv@peepalconsulting.com' },
  { name: 'Mayank',    email: 'mayank@peepalconsulting.com' },
  { name: 'Anil',      email: 'anil@peepalconsulting.com' },
];

let currentCandidate = null;
let activeTab = 'info';

// ── OPEN PANEL ──
function openCandidatePanelByRow(rowNum) {
  const candidates = window.allCandidates();
  const c = candidates.find(x => x._row === rowNum);
  if (!c) return;
  currentCandidate = c;
  activeTab = window.__autoOpenTab || 'info';
  window.__autoOpenTab = null;
  renderPanel(c);
  document.getElementById('candidate-panel-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Update URL to reflect open candidate
  window.history.replaceState({}, '', `/dashboard?candidate=${rowNum}&tab=${activeTab}`);
}

function closeCandidatePanel(e) {
  if (e && e.target !== document.getElementById('candidate-panel-overlay')) return;
  forceClosePanel();
}

function forceClosePanel() {
  document.getElementById('candidate-panel-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  currentCandidate = null;
  window.history.replaceState({}, '', '/dashboard');
}

// ── RENDER PANEL ──
function renderPanel(c) {
  const panel = document.getElementById('candidate-panel');
  if (!panel) return;

  const pipeline = window.ROLE_PIPELINE[c.role] || ['Screening'];
  const dept     = c.department || '';
  const deptClass = 'dept-' + dept.replace(/\s+/g, '-').replace(/'/g, '');

  panel.innerHTML = `
    <!-- Header -->
    <div class="panel-header">
      <div class="panel-header-top">
        <div>
          <div class="panel-name">${escHtml(c.name)}</div>
          <div class="panel-meta">
            <span class="dept-badge ${deptClass}">${escHtml(dept)}</span>
            <span style="font-size:11px;color:var(--slate-400);font-weight:600">${escHtml(c.role || '')}</span>
            ${c.status ? `<span class="status-pill ${getStatusClass(c.status)}">${escHtml(c.status)}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <button onclick="copyCandidateLink(${c._row})" id="copy-link-btn" style="
            background:var(--slate-100);border:1.5px solid var(--slate-200);border-radius:8px;
            padding:6px 12px;font-size:10px;font-weight:700;color:var(--slate-500);
            cursor:pointer;transition:all 0.15s;white-space:nowrap;
          " onmouseover="this.style.borderColor='#6366F1';this.style.color='#4338CA'"
             onmouseout="this.style.borderColor='var(--slate-200)';this.style.color='var(--slate-500)'">
            🔗 Copy Link
          </button>
          <button class="panel-close" onclick="forceClosePanel()">×</button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="panel-tabs">
      <button class="panel-tab ${activeTab === 'info'     ? 'active' : ''}" onclick="switchTab('info')">Profile</button>
      <button class="panel-tab ${activeTab === 'pipeline' ? 'active' : ''}" onclick="switchTab('pipeline')">Pipeline</button>
      <button class="panel-tab ${activeTab === 'feedback' ? 'active' : ''}" onclick="switchTab('feedback')">Feedback & Scores</button>
      <button class="panel-tab ${activeTab === 'email'    ? 'active' : ''}" onclick="switchTab('email')">Send Email</button>
    </div>

    <!-- Content -->
    <div class="panel-content">

      <!-- ── INFO TAB ── -->
      <div id="tab-info" class="panel-section ${activeTab === 'info' ? 'active' : ''}">
        <div class="info-grid">
          ${infoCard('Sourcing Date',    c.sourcingDate)}
          ${infoCard('Recruiter',        c.recruiter)}
          ${infoCard('Manager',          c.manager)}
          ${infoCard('Experience',       c.experience)}
          ${infoCard('Notice Period',    c.noticePeriod)}
          ${infoCard('Current Location', c.location)}
          ${infoCard('Offer in Hand',    c.offerInHand)}
          ${infoCard('Last CTC (F+V)',   c.lastCtc)}
          ${infoCard('Expected CTC',     c.expectedCtc)}
          ${infoCard('Education',        c.education)}
          ${infoCard('Reason for Change',c.reasonForChange)}
          ${infoCard('Contact',          c.contact)}
        </div>

        ${c.email ? `
        <div style="margin-bottom:12px">
          <div class="info-card-label">Email</div>
          <a href="mailto:${escHtml(c.email)}" class="info-card-link">${escHtml(c.email)}</a>
        </div>` : ''}

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${c.resumeLink ? `<a href="${escHtml(c.resumeLink)}" target="_blank" class="btn-manage" style="text-decoration:none">📄 Resume</a>` : ''}
          ${c.linkedin   ? `<a href="${escHtml(c.linkedin)}"   target="_blank" class="btn-manage" style="text-decoration:none">🔗 LinkedIn</a>` : ''}
        </div>
      </div>

      <!-- ── PIPELINE TAB ── -->
      <div id="tab-pipeline" class="panel-section ${activeTab === 'pipeline' ? 'active' : ''}">
        ${buildPipelineTimeline(c, pipeline)}
        ${buildPipelineDatesTable(c, pipeline)}
        ${buildPipelineActions(c, pipeline)}
      </div>

      <!-- ── FEEDBACK TAB ── -->
      <div id="tab-feedback" class="panel-section ${activeTab === 'feedback' ? 'active' : ''}">
        ${buildFeedbackForm(c)}
      </div>

      <!-- ── EMAIL TAB ── -->
      <div id="tab-email" class="panel-section ${activeTab === 'email' ? 'active' : ''}">
        ${buildEmailComposer(c, pipeline)}
      </div>

    </div>
  `;
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.panel-tab').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick').includes(`'${tab}'`));
  });
  document.querySelectorAll('.panel-section').forEach(el => {
    el.classList.remove('active');
  });
  const target = document.getElementById(`tab-${tab}`);
  if (target) target.classList.add('active');
  if (currentCandidate) {
    window.history.replaceState({}, '', `/dashboard?candidate=${currentCandidate._row}&tab=${tab}`);
  }
}

// ── INFO CARD HELPER ──
function infoCard(label, value) {
  if (!value) return `
    <div class="info-card">
      <div class="info-card-label">${escHtml(label)}</div>
      <div class="info-card-value" style="color:var(--slate-300)">—</div>
    </div>`;
  return `
    <div class="info-card">
      <div class="info-card-label">${escHtml(label)}</div>
      <div class="info-card-value">${escHtml(value)}</div>
    </div>`;
}

// ── PIPELINE TIMELINE ──
function buildPipelineTimeline(c, pipeline) {
  const currentStatus = c.status || '';

  // Determine how far through the pipeline we are
  const stageStateMap = {};
  const rejectedStages = {
    'Screen Reject':          'Screening',
    'Aptitude Reject':        'Aptitude',
    'Test Reject':            'Aptitude',
    'Assessment Reject':      'Assessment',
    'AI Interview Reject':    'AI Interview',
    'Manager Round Reject':   'Manager Round',
    'Kaveri Reject':          'Kaveri Round',
    'Vijay Reject':           'Vijay Round',
  };

  const rejectedAt = rejectedStages[currentStatus];
  const dateCols = {
    'Aptitude':      c.aptitudeDate,
    'Assessment':    c.assessmentDate,
    'AI Interview':  c.assessmentDate,
    'Manager Round': c.managerRoundDate,
    'Kaveri Round':  c.kaveriRoundDate,
    'Vijay Round':   c.vijayRoundDate,
    'Offered':       c.offeredDate,
    'Joined':        c.joiningDate,
  };

  pipeline.forEach((stage, i) => {
    if (rejectedAt === stage) {
      stageStateMap[stage] = 'rejected';
    } else if (dateCols[stage]) {
      stageStateMap[stage] = 'done';
    } else if (stage === 'Screening' && c.sourcingDate) {
      stageStateMap[stage] = 'done';
    } else {
      stageStateMap[stage] = 'upcoming';
    }
  });

  // Mark current/active stage
  const firstUpcoming = pipeline.find(s => stageStateMap[s] === 'upcoming');
  if (firstUpcoming && !rejectedAt) stageStateMap[firstUpcoming] = 'current';

  const stageIcons = {
    'Screening':     'S', 'Aptitude': 'A', 'Assessment': 'T',
    'AI Interview':  'AI','Manager Round': 'M', 'Kaveri Round': 'K',
    'Vijay Round':   'V', 'Offered': 'O', 'Joined': 'J',
  };

  let html = '<div class="pipeline-timeline">';
  pipeline.forEach((stage, i) => {
    const state = stageStateMap[stage];
    const icon  = stageIcons[stage] || stage[0];
    html += `
      <div class="pipeline-stage">
        <div class="stage-dot ${state}" title="${escHtml(stage)}">${icon}</div>
        <span class="stage-label">${escHtml(stage)}</span>
        ${i < pipeline.length - 1 ? `<div class="stage-connector ${state === 'done' ? 'done' : ''}"></div>` : ''}
      </div>`;
  });
  html += '</div>';
  return html;
}

// ── PIPELINE DATES TABLE ──
function buildPipelineDatesTable(c, pipeline) {
  const dateFields = {
    'Aptitude':      { label: 'Aptitude Test Date', value: c.aptitudeDate,       score: c.aptitudeScore },
    'Assessment':    { label: 'Assessment Date',     value: c.assessmentDate },
    'AI Interview':  { label: 'AI Interview Date',   value: c.assessmentDate },
    'Manager Round': { label: 'Manager Round Date',  value: c.managerRoundDate },
    'Kaveri Round':  { label: 'Kaveri Round Date',   value: c.kaveriRoundDate },
    'Vijay Round':   { label: 'Vijay Round Date',    value: c.vijayRoundDate },
  };

  let rows = '';
  pipeline.forEach(stage => {
    const field = dateFields[stage];
    if (!field) return;
    rows += `
      <tr>
        <td style="padding:8px 12px;font-size:11px;font-weight:700;color:var(--slate-500);border-bottom:1px solid var(--slate-100)">${escHtml(field.label)}</td>
        <td style="padding:8px 12px;font-size:12px;font-weight:700;color:var(--slate-800);border-bottom:1px solid var(--slate-100)">${escHtml(field.value || '—')}</td>
        ${field.score !== undefined ? `<td style="padding:8px 12px;font-size:12px;font-weight:800;color:#4338CA;border-bottom:1px solid var(--slate-100)">Score: ${escHtml(field.score || '—')}</td>` : '<td style="border-bottom:1px solid var(--slate-100)"></td>'}
      </tr>`;
  });

  // Always show offered + joining
  rows += `
    <tr>
      <td style="padding:8px 12px;font-size:11px;font-weight:700;color:var(--slate-500)">Offered Date</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:700;color:var(--slate-800)">${escHtml(c.offeredDate || '—')}</td>
      <td></td>
    </tr>
    <tr>
      <td style="padding:8px 12px;font-size:11px;font-weight:700;color:var(--slate-500)">Joining Date</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:700;color:var(--slate-800)">${escHtml(c.joiningDate || '—')}</td>
      <td></td>
    </tr>`;

  return `
    <div style="margin-top:20px">
      <div class="feedback-section-title">Stage Dates</div>
      <table style="width:100%;border-collapse:collapse;background:var(--slate-50);border-radius:10px;overflow:hidden;">
        ${rows}
      </table>
    </div>`;
}

// ── PIPELINE ACTIONS ──
function buildPipelineActions(c, pipeline) {
  const userEmail = window.__userEmail || '';
  const currentStatus = c.status || '';

  const role = getUserRole(userEmail);
  let canChangeStatus = false;
  if (role === 'admin' || role === 'recruiter') {
    canChangeStatus = true;
  } else if (role === 'manager') {
    const managerEmail = MANAGER_NAME_EMAIL[c.manager];
    canChangeStatus = managerEmail === userEmail;
  } else if (role === 'kaveri') {
    canChangeStatus = pipeline.includes('Kaveri Round');
  } else if (role === 'vijay') {
    canChangeStatus = pipeline.includes('Vijay Round');
  }

  if (!canChangeStatus) return '';

  // Build all valid statuses for this pipeline
  const STAGE_STATUSES = {
    'Screening':     ['Hold', 'Drop', 'Screen Reject'],
    'Aptitude':      ['Aptitude Pending', 'Aptitude Select', 'Aptitude Reject', 'Test Reject'],
    'Assessment':    ['Assessment Pending', 'Assesment Under Review', 'Assessment Reject'],
    'AI Interview':  ['AI Interview Pending', 'AI Interview Reject'],
    'Manager Round': ['Manager Round Pending', 'Manager Round Reject'],
    'Kaveri Round':  ['Kaveri Round Pending', 'Kaveri Feedback Pending', 'Kaveri Reject'],
    'Vijay Round':   ['Vijay Round Pending', 'Vijay Reject'],
  };
  const TERMINAL = ['Final Select', 'Offered', 'Offer Dropout', 'Joined'];

  const allStatuses = [];
  pipeline.forEach(stage => {
    (STAGE_STATUSES[stage] || []).forEach(s => {
      if (!allStatuses.includes(s)) allStatuses.push(s);
    });
  });
  TERMINAL.forEach(s => allStatuses.push(s));
  allStatuses.push('Drop');

  const options = allStatuses
    .filter(s => s !== currentStatus)
    .map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`)
    .join('');

  return `
    <div style="margin-top:24px">
      <div class="feedback-section-title">Update Pipeline Status</div>
      <div style="background:var(--slate-50);border-radius:12px;padding:16px">
        <div style="font-size:11px;color:var(--slate-500);margin-bottom:12px">
          Current: <strong style="color:var(--slate-700)">${escHtml(currentStatus || '—')}</strong>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select id="status-select-${c._row}" class="email-stage-select" style="flex:1;min-width:200px">
            <option value="">— Select new status —</option>
            ${options}
          </select>
          <button onclick="updateCandidateStatus(${c._row})"
            style="padding:8px 18px;background:#4338CA;color:white;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">
            Update Status
          </button>
        </div>
        <div id="status-update-msg-${c._row}" style="margin-top:10px"></div>
      </div>
    </div>`;
}

async function updateCandidateStatus(rowNum) {
  const newStatus = document.getElementById(`status-select-${rowNum}`)?.value;
  const msgEl = document.getElementById(`status-update-msg-${rowNum}`);

  if (!newStatus) {
    if (msgEl) msgEl.innerHTML = '<span style="font-size:11px;color:#B91C1C;font-weight:700">Please select a status first.</span>';
    return;
  }

  if (msgEl) msgEl.innerHTML = '<span style="font-size:11px;color:var(--slate-400)">Updating...</span>';

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row: rowNum, statusUpdate: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      if (msgEl) msgEl.innerHTML = `<span style="font-size:11px;color:#166534;font-weight:700">✓ Status updated to "${newStatus}"</span>`;
      await window.loadCandidates();
      const updated = window.allCandidates().find(x => x._row === rowNum);
      if (updated) { currentCandidate = updated; renderPanel(updated); switchTab('pipeline'); }
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (err) {
    if (msgEl) msgEl.innerHTML = `<span style="font-size:11px;color:#B91C1C;font-weight:700">Error: ${escHtml(err.message)}</span>`;
  }
}

// ── PARSE FEEDBACK ENTRIES from Remarks ──
function parseFeedbackEntries(remarks) {
  if (!remarks) return { entries: [], legacy: '' };
  const entries = [];
  const parts = remarks.split(/\n\n(?=\[)/);
  let legacy = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith('[')) {
      // Legacy plain remark — not in portal format
      legacy += (legacy ? '\n' : '') + trimmed;
      continue;
    }

    const headerMatch = trimmed.match(/^\[([^\]]+)\]/);
    if (!headerMatch) { legacy += (legacy ? '\n' : '') + trimmed; continue; }

    const header = headerMatch[1];
    const rest   = trimmed.slice(headerMatch[0].length).trim();
    const scoresMatch = rest.match(/^\[scores:([^\]]+)\]\s*/);
    const scoresRaw   = scoresMatch?.[1]?.trim() || '';
    const notes       = scoresMatch ? rest.slice(scoresMatch[0].length).trim() : rest;

    const headerParts = header.split(' — ');
    const stage  = headerParts[0]?.trim().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Note';
    const date   = headerParts[1]?.trim() || '';
    const author = headerParts[2]?.trim() || '';

    const scores = {};
    if (scoresRaw) {
      scoresRaw.split('·').forEach(s => {
        const [k, v] = s.split(':').map(x => x.trim());
        if (k && v) scores[k] = v;
      });
    }
    entries.push({ stage, date, author, notes, scores });
  }
  return { entries: entries.reverse(), legacy };
}

// ── FEEDBACK FORM ──
function buildFeedbackForm(c) {
  const userEmail = window.__userEmail || '';
  const pipeline  = window.ROLE_PIPELINE[c.role] || [];

  // Interview rounds only — no Aptitude, no Screening
  const INTERVIEW_ROUNDS = ['Assessment', 'AI Interview', 'Manager Round', 'Kaveri Round', 'Vijay Round'];
  const availableRounds = pipeline.filter(s => INTERVIEW_ROUNDS.includes(s));

  const stageOptions = availableRounds
    .map(s => `<option value="${s.toLowerCase().replace(/\s+/g,'_')}">${escHtml(s)}</option>`)
    .join('');

  if (availableRounds.length === 0) {
    return `<div style="padding:24px;text-align:center;color:var(--slate-400);font-size:13px">No interview rounds in this candidate's pipeline.</div>`;
  }

  const firstStage = availableRounds[0]?.toLowerCase().replace(/\s+/g,'_') || '';
  const canWrite   = canWriteFeedback(userEmail, c, firstStage);

  // Parse existing feedback entries
  const { entries, legacy } = parseFeedbackEntries(c.remarks);

  const legacyHtml = legacy ? `
    <div style="margin-top:20px">
      <div class="feedback-section-title">Previous Notes</div>
      <div style="background:#FFFBEB;border-left:3px solid #FCD34D;border-radius:0 8px 8px 0;padding:12px 14px;font-size:12px;line-height:1.6;color:var(--slate-700);white-space:pre-wrap">${escHtml(legacy)}</div>
    </div>` : '';

  const historyHtml = entries.length > 0 ? `
    <div style="margin-top:28px">
      <div class="feedback-section-title">Feedback History</div>
      ${entries.map(e => `
        <div style="background:white;border:1.5px solid var(--slate-200);border-radius:12px;padding:14px 16px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
            <span style="font-size:11px;font-weight:800;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px">${escHtml(e.stage)}</span>
            <div style="display:flex;gap:10px;align-items:center">
              <span style="font-size:10px;font-weight:700;color:var(--slate-600)">by ${escHtml(e.author)}</span>
              <span style="font-size:10px;color:var(--slate-300)">·</span>
              <span style="font-size:10px;color:var(--slate-400)">${escHtml(e.date)}</span>
            </div>
          </div>
          ${Object.keys(e.scores).length > 0 ? `
          <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
            ${Object.entries(e.scores).map(([k,v]) => `
              <span style="background:#EEF2FF;border-radius:6px;padding:3px 10px;font-size:10px;font-weight:800;color:#4338CA">
                ${escHtml(k)}: ${escHtml(v)}
              </span>`).join('')}
          </div>` : ''}
          ${e.notes ? `<p style="font-size:12px;line-height:1.6;color:var(--slate-700);margin:0;white-space:pre-wrap">${escHtml(e.notes)}</p>` : ''}
        </div>`).join('')}
    </div>` : '';

  const writeForm = canWrite ? `
    <div style="margin-bottom:14px">
      <div class="feedback-section-title">Round</div>
      <select id="feedback-stage" class="email-stage-select" onchange="onFeedbackStageChange(this.value, '${escHtml(JSON.stringify(c).replace(/'/g,"&#39;"))}')">
        ${stageOptions}
      </select>
    </div>

    <div style="margin-bottom:14px" id="scores-section">
      <div class="feedback-section-title">Scores (out of 5)</div>
      <div class="score-row">
        <span class="score-label">Business Acumen</span>
        <div class="score-input-wrap">
          <input type="number" id="score-acumen" class="score-field" min="0" max="5" placeholder="—">
          <span class="score-max">/ 5</span>
        </div>
      </div>
      <div class="score-row">
        <span class="score-label">Intelligence</span>
        <div class="score-input-wrap">
          <input type="number" id="score-intel" class="score-field" min="0" max="5" placeholder="—">
          <span class="score-max">/ 5</span>
        </div>
      </div>
      <div class="score-row">
        <span class="score-label">Hunger / Drive</span>
        <div class="score-input-wrap">
          <input type="number" id="score-hunger" class="score-field" min="0" max="5" placeholder="—">
          <span class="score-max">/ 5</span>
        </div>
      </div>
    </div>

    <div style="margin-bottom:6px">
      <div class="feedback-section-title">Notes / Feedback</div>
      <textarea
        id="feedback-notes"
        class="feedback-textarea"
        placeholder="Write your observations, strengths, concerns..."
        oninput="updateWordCount()"
      ></textarea>
      <div class="word-count" id="word-count">0 words</div>
    </div>

    <div id="feedback-msg"></div>

    <button class="btn-save-feedback" id="btn-save-feedback" onclick="saveFeedback()">
      💾 Save Feedback
    </button>` : `
    <div style="background:var(--slate-50);border-radius:10px;padding:16px;text-align:center;color:var(--slate-400);font-size:12px;font-weight:600">
      You can only add feedback for rounds assigned to you.
    </div>`;

  return `<div>${writeForm}${legacyHtml}${historyHtml}</div>`;
}

function onFeedbackStageChange(stage, candidateJson) {
  // No scores section needed — scores removed as requested
}

function updateWordCount() {
  const textarea = document.getElementById('feedback-notes');
  const counter  = document.getElementById('word-count');
  if (!textarea || !counter) return;
  const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
  counter.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  counter.className = 'word-count' + (words > 0 && words < 10 ? ' warn' : '');
}

async function saveFeedback() {
  if (!currentCandidate) return;

  const stage   = document.getElementById('feedback-stage')?.value;
  const notes   = document.getElementById('feedback-notes')?.value?.trim();
  const acumen  = document.getElementById('score-acumen')?.value;
  const intel   = document.getElementById('score-intel')?.value;
  const hunger  = document.getElementById('score-hunger')?.value;
  const btn     = document.getElementById('btn-save-feedback');
  const msgEl   = document.getElementById('feedback-msg');

  // Role check
  const userEmail = window.__userEmail || '';
  if (!canWriteFeedback(userEmail, currentCandidate, stage)) {
    if (msgEl) msgEl.innerHTML = '<div class="send-error">You don\'t have permission to log feedback for this round.</div>';
    return;
  }

  if (!notes && !acumen && !intel && !hunger) {
    if (msgEl) msgEl.innerHTML = '<div class="send-error">Please add notes or scores before saving.</div>';
    return;
  }

  btn.disabled     = true;
  btn.textContent  = 'Saving...';
  if (msgEl) msgEl.innerHTML = '';

  try {
    const res = await fetch('/api/feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        row:    currentCandidate._row,
        stage,
        notes,
        scores: { acumen, intel, hunger },
      }),
    });

    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();

    if (data.success) {
      if (msgEl) msgEl.innerHTML = '<div class="send-success">✓ Saved successfully</div>';
      // Force fresh fetch by adding cache-bust param
      const freshRes = await fetch('/api/candidates?t=' + Date.now());
      if (freshRes.ok) {
        const freshData = await freshRes.json();
        window.__allCandidates = freshData.candidates || [];
      }
      const updated = window.allCandidates().find(x => x._row === currentCandidate._row);
      if (updated) {
        currentCandidate = updated;
        renderPanel(updated);
        switchTab('feedback');
      }
      btn.textContent = '💾 Save Feedback';
      btn.disabled    = false;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (err) {
    if (msgEl) msgEl.innerHTML = `<div class="send-error">Error: ${escHtml(err.message)}</div>`;
    btn.textContent = '💾 Save Feedback';
    btn.disabled    = false;
  }
}

// ── EMAIL COMPOSER ──
function buildEmailComposer(c, pipeline) {
  const stageOptions = [
    `<option value="all_rounds">📋 All Rounds (full dossier)</option>`,
    ...pipeline.map(s => `<option value="${s.toLowerCase().replace(/\s+/g,'_')}">${escHtml(s)}</option>`)
  ].join('');

  const suggested = new Set();
  if (c.manager)   { const m = KNOWN_PEOPLE.find(p => p.name === c.manager);   if (m) suggested.add(m.email); }
  if (c.recruiter) { const r = KNOWN_PEOPLE.find(p => p.name === c.recruiter); if (r) suggested.add(r.email); }

  const recipientChips = KNOWN_PEOPLE.map(p => `
    <div class="recipient-chip ${suggested.has(p.email) ? 'selected' : ''}"
         data-email="${escHtml(p.email)}" onclick="toggleRecipient(this)">
      <span class="chip-check">${suggested.has(p.email) ? '✓' : ''}</span>
      <span>${escHtml(p.name)}</span>
    </div>`).join('');

  // Build initial preview
  const initialPreview = buildEmailPreviewHtml(c, 'all_rounds', '', true, true, true);

  return `
    <div style="display:flex;gap:0;height:100%;min-height:600px;margin:-24px;overflow:hidden;border-radius:0 0 0 0">

      <!-- LEFT: Composer controls -->
      <div style="width:320px;flex-shrink:0;padding:20px;overflow-y:auto;border-right:1px solid var(--slate-200);background:var(--slate-50)">

        <div style="margin-bottom:14px">
          <div class="feedback-section-title">Stage / Round</div>
          <select id="email-stage" class="email-stage-select" onchange="refreshEmailPreview()">
            ${stageOptions}
          </select>
        </div>

        <div style="margin-bottom:14px">
          <div class="feedback-section-title">Subject</div>
          <input type="text" id="email-subject-input" class="filter-input" style="width:100%;height:36px"
            value="[Full Dossier — All Rounds] ${escHtml(c.name)} — ${escHtml(c.role)} | Peepal Consulting"
            oninput="refreshEmailPreview()">
        </div>

        <div style="margin-bottom:14px">
          <div class="feedback-section-title">Include Sections</div>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px;font-weight:600;color:var(--slate-600);cursor:pointer">
            <input type="checkbox" id="include-profile" checked onchange="refreshEmailPreview()"> Candidate Profile
          </label>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px;font-weight:600;color:var(--slate-600);cursor:pointer">
            <input type="checkbox" id="include-feedback" checked onchange="refreshEmailPreview()"> Feedback History
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--slate-600);cursor:pointer">
            <input type="checkbox" id="include-scores" checked onchange="refreshEmailPreview()"> Scores
          </label>
        </div>

        <div style="margin-bottom:14px">
          <div class="feedback-section-title">Custom Message</div>
          <textarea id="email-custom-msg" class="feedback-textarea" style="min-height:80px"
            placeholder="Add a personal note or context at the top of the email..."
            oninput="refreshEmailPreview()"></textarea>
        </div>

        <div style="margin-bottom:14px">
          <div class="recipient-picker">
            <div class="recipient-picker-label">To — Recipients</div>
            <div class="recipient-list" id="recipient-list-to">${recipientChips}</div>
            <div class="email-add-custom">
              <input type="email" id="custom-recipient" class="email-custom-input" placeholder="Add another email...">
              <button class="btn-add-recipient" onclick="addCustomRecipient()">+ Add</button>
            </div>
          </div>
        </div>

        <div id="email-send-msg"></div>

        <button class="btn-send-email" id="btn-send-email" onclick="sendEmail()">
          ✉️ Send Email
        </button>

      </div>

      <!-- RIGHT: Live preview -->
      <div style="flex:1;overflow-y:auto;background:#e8eaf0;padding:20px">
        <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--slate-400);margin-bottom:10px">Live Preview</div>
        <div id="email-live-preview" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
          ${initialPreview}
        </div>
      </div>

    </div>`;
}

function buildEmailPreviewHtml(c, stage, customMsg, includeProfile, includeFeedback, includeScores) {
  const DEPT_ACCENT = {
    'TA': '#3949AB', 'BD': '#1565C0', 'Central Marketing': '#6A1B9A',
    'TAD': '#2E7D32', 'HR': '#F57F17', "Founder's Office": '#AD1457',
  };
  const DEPT_BG = {
    'TA': '#E8EAF6', 'BD': '#E3F2FD', 'Central Marketing': '#F3E5F5',
    'TAD': '#E8F5E9', 'HR': '#FFF9C4', "Founder's Office": '#FCE4EC',
  };
  const accent = DEPT_ACCENT[c.department] || '#283593';
  const bg     = DEPT_BG[c.department]     || '#F5F5F5';
  const stageLabel = stage === 'all_rounds'
    ? 'Full Dossier — All Rounds'
    : stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const profileSection = includeProfile ? `
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;margin-bottom:16px;">
      ${[
        ['Recruiter', c.recruiter], ['Manager', c.manager], ['Status', c.status],
        ['Experience', c.experience], ['Notice Period', c.noticePeriod],
        ['Last CTC', c.lastCtc], ['Expected CTC', c.expectedCtc],
        ['Location', c.location], ['Education', c.education],
      ].filter(([,v]) => v).map(([k,v]) => `
        <tr>
          <td style="padding:6px 12px;font-size:11px;color:#94a3b8;font-weight:700;width:40%;border-bottom:1px solid #eee">${k}</td>
          <td style="padding:6px 12px;font-size:11px;font-weight:700;color:#334155;border-bottom:1px solid #eee">${v}</td>
        </tr>`).join('')}
    </table>` : '';

  const { entries: feedbackEntries, legacy: legacyNote } = parseFeedbackEntries(c.remarks || '');
  const feedbackSection = includeFeedback && (feedbackEntries.length > 0 || legacyNote) ? `
    <h3 style="font-size:11px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px;margin:0 0 10px">Feedback History</h3>
    ${legacyNote ? `<div style="background:#FFFBEB;border-left:3px solid #FCD34D;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:10px;font-size:11px;color:#334155;line-height:1.6">${legacyNote}</div>` : ''}
    ${feedbackEntries.map(e => `
      <div style="background:#f8fafc;border-radius:8px;padding:12px;border-left:3px solid ${accent};margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:10px;font-weight:800;color:${accent};text-transform:uppercase">${e.stage}</span>
          <span style="font-size:10px;color:#94a3b8">by ${e.author} · ${e.date}</span>
        </div>
        ${includeScores && Object.keys(e.scores).length > 0 ? `
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
          ${Object.entries(e.scores).map(([k,v]) => `<span style="background:#EEF2FF;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:800;color:#4338CA">${k}: ${v}</span>`).join('')}
        </div>` : ''}
        ${e.notes ? `<p style="font-size:11px;line-height:1.6;color:#334155;margin:0">${e.notes}</p>` : ''}
      </div>`).join('')}` : '';

  return `
    <div style="background:#1A1A2E;padding:20px 24px">
      <p style="margin:0;color:#A0A8C8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Peepal Consulting — Hiring Portal</p>
      <h1 style="margin:4px 0 0;color:white;font-size:18px;font-weight:800">${stageLabel} Dossier</h1>
    </div>
    <div style="background:${bg};padding:10px 24px;border-left:4px solid ${accent}">
      <span style="font-size:10px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px">${c.department || ''}</span>
    </div>
    <div style="padding:20px 24px">
      ${customMsg ? `<div style="background:#FFF8E1;border-left:3px solid #FFC107;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#334155">${customMsg.replace(/\n/g,'<br>')}</div>` : ''}
      <h2 style="margin:0 0 2px;font-size:18px;font-weight:800;color:#1A1A2E">${c.name}</h2>
      <p style="margin:0 0 16px;font-size:11px;color:#64748b">${c.role} · ${c.department}</p>
      ${c.aptitudeScore ? `
      <div style="background:${bg};border-radius:8px;padding:10px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <span style="font-size:10px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px">Aptitude Score</span>
        <span style="font-size:18px;font-weight:800;color:#1A1A2E">${c.aptitudeScore}</span>
      </div>` : ''}
      ${profileSection}
      ${feedbackSection}
      ${c.resumeLink ? `<a href="${c.resumeLink}" style="display:inline-block;background:${accent};color:white;padding:8px 16px;border-radius:6px;font-size:10px;font-weight:800;text-decoration:none;text-transform:uppercase">View Resume →</a>` : ''}
    </div>
    <div style="background:#f8fafc;padding:12px 24px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:10px;color:#94a3b8">Sent via Peepal Hiring Portal · ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</p>
    </div>`;
}

function refreshEmailPreview() {
  if (!currentCandidate) return;
  const stage          = document.getElementById('email-stage')?.value || 'all_rounds';
  const customMsg      = document.getElementById('email-custom-msg')?.value || '';
  const includeProfile = document.getElementById('include-profile')?.checked ?? true;
  const includeFeedback= document.getElementById('include-feedback')?.checked ?? true;
  const includeScores  = document.getElementById('include-scores')?.checked ?? true;

  // Update subject
  const stageLabel = stage === 'all_rounds'
    ? 'Full Dossier — All Rounds'
    : stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const subjectInput = document.getElementById('email-subject-input');
  if (subjectInput && !subjectInput.dataset.userEdited) {
    subjectInput.value = `[${stageLabel}] ${currentCandidate.name} — ${currentCandidate.role} | Peepal Consulting`;
  }

  const preview = document.getElementById('email-live-preview');
  if (preview) {
    preview.innerHTML = buildEmailPreviewHtml(currentCandidate, stage, customMsg, includeProfile, includeFeedback, includeScores);
  }
}

// Mark subject as user-edited if they type in it
document.addEventListener('input', e => {
  if (e.target?.id === 'email-subject-input') e.target.dataset.userEdited = '1';
});

function toggleRecipient(el) {
  el.classList.toggle('selected');
  const check = el.querySelector('.chip-check');
  if (check) check.textContent = el.classList.contains('selected') ? '✓' : '';
}

function addCustomRecipient() {
  const input = document.getElementById('custom-recipient');
  const list  = document.getElementById('recipient-list-to');
  if (!input || !list) return;
  const email = input.value.trim();
  if (!email || !email.includes('@')) return;

  const chip = document.createElement('div');
  chip.className = 'recipient-chip selected';
  chip.dataset.email = email;
  chip.setAttribute('onclick', 'toggleRecipient(this)');
  chip.innerHTML = `<span class="chip-check">✓</span><span>${escHtml(email)}</span>`;
  list.appendChild(chip);
  input.value = '';
}

function getSelectedRecipients() {
  return [...document.querySelectorAll('#recipient-list-to .recipient-chip.selected')]
    .map(el => el.dataset.email)
    .filter(Boolean);
}

function updateEmailPreview() {
  refreshEmailPreview();
}

async function sendEmail() {
  if (!currentCandidate) return;

  const stage      = document.getElementById('email-stage')?.value;
  const subject    = document.getElementById('email-subject-input')?.value?.trim();
  const customMsg  = document.getElementById('email-custom-msg')?.value?.trim() || '';
  const includeProfile  = document.getElementById('include-profile')?.checked ?? true;
  const includeFeedback = document.getElementById('include-feedback')?.checked ?? true;
  const includeScores   = document.getElementById('include-scores')?.checked ?? true;
  const recipients = getSelectedRecipients();
  const btn        = document.getElementById('btn-send-email');
  const msgEl      = document.getElementById('email-send-msg');

  if (recipients.length === 0) {
    if (msgEl) msgEl.innerHTML = '<div class="send-error">Please select at least one recipient.</div>';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Sending...';
  if (msgEl) msgEl.innerHTML = '';

  try {
    const res = await fetch('/api/email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        candidate: currentCandidate,
        stage,
        subject,
        customMsg,
        includeProfile,
        includeFeedback,
        includeScores,
        to: recipients,
      }),
    });

    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();

    if (data.success) {
      if (msgEl) msgEl.innerHTML = `<div class="send-success">✓ Email sent to ${data.sentTo.join(', ')}</div>`;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (err) {
    if (msgEl) msgEl.innerHTML = `<div class="send-error">Error: ${escHtml(err.message)}</div>`;
  } finally {
    btn.disabled    = false;
    btn.textContent = '✉️ Send Email';
  }
}

// ── COPY SHAREABLE LINK ──
function copyCandidateLink(row) {
  const url = `${window.location.origin}/dashboard?candidate=${row}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('copy-link-btn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copied!';
      btn.style.color = '#166534';
      btn.style.borderColor = '#86EFAC';
      btn.style.background = '#DCFCE7';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.background = '';
      }, 2000);
    }
  }).catch(() => {
    // Fallback for browsers without clipboard API
    prompt('Copy this link:', url);
  });
}

// ── EXPOSE GLOBALS ──
window.openCandidatePanelByRow = openCandidatePanelByRow;
window.closeCandidatePanel     = closeCandidatePanel;
window.forceClosePanel         = forceClosePanel;
window.switchTab               = switchTab;
window.saveFeedback            = saveFeedback;
window.updateWordCount         = updateWordCount;
window.sendEmail               = sendEmail;
window.toggleRecipient         = toggleRecipient;
window.addCustomRecipient      = addCustomRecipient;
window.updateEmailPreview      = updateEmailPreview;
window.copyCandidateLink       = copyCandidateLink;
window.updateCandidateStatus    = updateCandidateStatus;
window.onFeedbackStageChange     = onFeedbackStageChange;
window.getUserRole             = getUserRole;
