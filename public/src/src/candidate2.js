// src/candidate.js
// Candidate side panel — full info view, pipeline timeline, scores, feedback form

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
  // Use auto-open tab if set (e.g. from shared link), otherwise default to info
  activeTab = window.__autoOpenTab || 'info';
  window.__autoOpenTab = null; // clear after use
  renderPanel(c);
  document.getElementById('candidate-panel-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCandidatePanel(e) {
  if (e && e.target !== document.getElementById('candidate-panel-overlay')) return;
  forceClosePanel();
}

function forceClosePanel() {
  document.getElementById('candidate-panel-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  currentCandidate = null;
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

        ${c.remarks ? `
        <div style="margin-top:20px">
          <div class="feedback-section-title">Remarks / Notes</div>
          <div class="remarks-block">${escHtml(c.remarks)}</div>
        </div>` : ''}
      </div>

      <!-- ── PIPELINE TAB ── -->
      <div id="tab-pipeline" class="panel-section ${activeTab === 'pipeline' ? 'active' : ''}">
        ${buildPipelineTimeline(c, pipeline)}
        ${buildPipelineDatesTable(c, pipeline)}
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

// ── FEEDBACK FORM ──
function buildFeedbackForm(c) {
  const pipeline = window.ROLE_PIPELINE[c.role] || [];
  const stageOptions = pipeline
    .filter(s => s !== 'Screening')
    .map(s => `<option value="${s.toLowerCase().replace(/\s+/g,'_')}">${escHtml(s)}</option>`)
    .join('');

  return `
    <div>
      <div style="margin-bottom:14px">
        <div class="feedback-section-title">Round</div>
        <select id="feedback-stage" class="email-stage-select">
          ${stageOptions}
        </select>
      </div>

      <div style="margin-bottom:14px">
        <div class="feedback-section-title">Scores (out of 5)</div>
        <div class="score-row">
          <span class="score-label">Business Acumen</span>
          <div class="score-input-wrap">
            <input type="number" id="score-acumen" class="score-field" value="" min="0" max="5" placeholder="—">
            <span class="score-max">/ 5</span>
          </div>
        </div>
        <div class="score-row">
          <span class="score-label">Intelligence</span>
          <div class="score-input-wrap">
            <input type="number" id="score-intel" class="score-field" value="" min="0" max="5" placeholder="—">
            <span class="score-max">/ 5</span>
          </div>
        </div>
        <div class="score-row">
          <span class="score-label">Hunger / Drive</span>
          <div class="score-input-wrap">
            <input type="number" id="score-hunger" class="score-field" value="" min="0" max="5" placeholder="—">
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
        💾 Save to Sheet
      </button>

      ${c.remarks ? `
      <div style="margin-top:20px">
        <div class="feedback-section-title">Existing Notes on File</div>
        <div class="remarks-block">${escHtml(c.remarks)}</div>
      </div>` : ''}
    </div>`;
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
        row:          currentCandidate._row,
        stage:        stage,
        notes:        notes,
        aptitudeScore: stage === 'aptitude' ? acumen : undefined,
        scores:        { acumen, intel, hunger },
      }),
    });

    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();

    if (data.success) {
      if (msgEl) msgEl.innerHTML = '<div class="send-success">✓ Saved to sheet</div>';
      // Refresh candidate data
      await window.loadCandidates();
      // Re-find updated candidate
      const updated = window.allCandidates().find(x => x._row === currentCandidate._row);
      if (updated) { currentCandidate = updated; }
      btn.textContent = '💾 Save to Sheet';
      btn.disabled    = false;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (err) {
    if (msgEl) msgEl.innerHTML = `<div class="send-error">Error: ${escHtml(err.message)}</div>`;
    btn.textContent = '💾 Save to Sheet';
    btn.disabled    = false;
  }
}

// ── EMAIL COMPOSER ──
function buildEmailComposer(c, pipeline) {
  const stageOptions = pipeline
    .filter(s => s !== 'Screening')
    .map(s => `<option value="${s.toLowerCase().replace(/\s+/g,'_')}">${escHtml(s)}</option>`)
    .join('');

  // Suggest recipients based on role — manager + recruiter always shown
  const suggested = new Set();
  if (c.manager) {
    const m = KNOWN_PEOPLE.find(p => p.name === c.manager);
    if (m) suggested.add(m.email);
  }
  if (c.recruiter) {
    const r = KNOWN_PEOPLE.find(p => p.name === c.recruiter);
    if (r) suggested.add(r.email);
  }

  const recipientChips = KNOWN_PEOPLE.map(p => `
    <div class="recipient-chip ${suggested.has(p.email) ? 'selected' : ''}"
         data-email="${escHtml(p.email)}"
         onclick="toggleRecipient(this)">
      <span class="chip-check">${suggested.has(p.email) ? '✓' : ''}</span>
      <span>${escHtml(p.name)}</span>
    </div>`).join('');

  return `
    <div class="email-composer">

      <div>
        <div class="feedback-section-title">Stage / Round</div>
        <select id="email-stage" class="email-stage-select" onchange="updateEmailPreview()">
          ${stageOptions}
        </select>
      </div>

      <div>
        <div class="recipient-picker">
          <div class="recipient-picker-label">To — Recipients</div>
          <div class="recipient-list" id="recipient-list-to">
            ${recipientChips}
          </div>
          <div class="email-add-custom">
            <input type="email" id="custom-recipient" class="email-custom-input" placeholder="Add another email...">
            <button class="btn-add-recipient" onclick="addCustomRecipient()">+ Add</button>
          </div>
        </div>
      </div>

      <div>
        <div class="feedback-section-title">Subject Preview</div>
        <div class="email-preview-box">
          <div class="email-preview-subject" id="email-subject-preview">
            [Manager Round] ${escHtml(c.name)} — ${escHtml(c.role)} | Peepal Consulting
          </div>
          <div style="margin-top:4px;font-size:10px;color:var(--slate-400)">
            Dossier includes: candidate profile · round scores · feedback notes · previous remarks
          </div>
        </div>
      </div>

      <div id="email-send-msg"></div>

      <button class="btn-send-email" id="btn-send-email" onclick="sendEmail()">
        ✉️ Send Dossier Email
      </button>

    </div>`;
}

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
  if (!currentCandidate) return;
  const stage = document.getElementById('email-stage')?.value || '';
  const label = stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const preview = document.getElementById('email-subject-preview');
  if (preview) {
    preview.textContent = `[${label}] ${currentCandidate.name} — ${currentCandidate.role} | Peepal Consulting`;
  }
}

async function sendEmail() {
  if (!currentCandidate) return;

  const stage      = document.getElementById('email-stage')?.value;
  const recipients = getSelectedRecipients();
  const btn        = document.getElementById('btn-send-email');
  const msgEl      = document.getElementById('email-send-msg');

  if (recipients.length === 0) {
    if (msgEl) msgEl.innerHTML = '<div class="send-error">Please select at least one recipient.</div>';
    return;
  }

  // Gather scores from feedback tab if filled
  const scores = {
    acumen: document.getElementById('score-acumen')?.value || null,
    intel:  document.getElementById('score-intel')?.value  || null,
    hunger: document.getElementById('score-hunger')?.value || null,
  };
  const feedback = document.getElementById('feedback-notes')?.value?.trim() || null;

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
        feedback,
        scores,
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
    btn.textContent = '✉️ Send Dossier Email';
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