// src/candidate.js
// Candidate side panel — full info view, pipeline timeline, scores, feedback form

// ── ROLE-BASED ACCESS CONFIG ──
let ACCESS = {
  admins:     ["arth.mohan@peepalconsulting.com","anish.k@peepalconsulting.com","renjith.k@peepalconsulting.com","sambhav.m@peepalconsulting.com"],
  recruiters: ["ramya.h@peepalconsulting.com","krishna.kumar@peepalconsulting.com","aditi.kaul@peepalconsulting.com","renjith.k@peepalconsulting.com"],
  managers:   ["ravi.kant.sharma@peepalconsulting.com","ambika.s@peepalconsulting.com","shiwala.dubey@peepalconsulting.com","parv.u@peepalconsulting.com","ramakrishna.d@peepalconsulting.com","rohan.p@peepalconsulting.com","rupa.moogi@peepalconsulting.com","mayank.bajaj@peepalconsulting.com"],
  kaveri:     ["kaveri.karnam@peepalconsulting.com"],
  vijay:      ["vijay@peepalconsulting.com"],
};

// Manager first-name → email map for matching sheet "Manager" column
let MANAGER_NAME_EMAIL = {
  'Kaveri':        'kaveri.karnam@peepalconsulting.com',
  'Ravikant':      'ravi.kant.sharma@peepalconsulting.com',
  'Ambika':        'ambika.s@peepalconsulting.com',
  'Shiwala':       'shiwala.dubey@peepalconsulting.com',
  'Parv':          'parv.u@peepalconsulting.com',
  'Ramakrishna':   'ramakrishna.d@peepalconsulting.com',
  'Rohan':         'rohan.p@peepalconsulting.com',
  'Rupa':          'rupa.moogi@peepalconsulting.com',
  'Mayank':        'mayank.bajaj@peepalconsulting.com',
  'Renjith':       'renjith.k@peepalconsulting.com',
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

function getPermittedFeedbackStages(email, candidate, availableRounds) {
  const role = getUserRole(email);
  const stageKeys = availableRounds.map(stage => ({
    label: stage,
    key: stage.toLowerCase().replace(/\s+/g, '_'),
  }));
  const recruiterHrStage = { label: 'Recruiter / HR Feedback', key: 'recruiter_hr_feedback' };

  if (role === 'admin' || role === 'recruiter') return [recruiterHrStage, ...stageKeys];
  if (role === 'kaveri') return stageKeys.filter(stage => stage.key === 'kaveri_round');
  if (role === 'vijay')  return stageKeys.filter(stage => stage.key === 'vijay_round');
  if (role === 'manager') {
    const managerEmail = MANAGER_NAME_EMAIL[candidate.manager];
    if (managerEmail !== email) return [];
    return stageKeys.filter(stage => stage.key === 'manager_round');
  }
  return [];
}

// ── KNOWN PEOPLE for recipient picker ──
let KNOWN_PEOPLE = [
  { name: 'Ramya',       email: 'ramya.h@peepalconsulting.com' },
  { name: 'Krishna',     email: 'krishna.kumar@peepalconsulting.com' },
  { name: 'Aditi',       email: 'aditi.kaul@peepalconsulting.com' },
  { name: 'Renjith',     email: 'renjith.k@peepalconsulting.com' },
  { name: 'Kaveri',      email: 'kaveri.karnam@peepalconsulting.com' },
  { name: 'Ravikant',    email: 'ravi.kant.sharma@peepalconsulting.com' },
  { name: 'Ambika',      email: 'ambika.s@peepalconsulting.com' },
  { name: 'Parv',        email: 'parv.u@peepalconsulting.com' },
  { name: 'Mayank',      email: 'mayank.bajaj@peepalconsulting.com' },
  { name: 'Anil',        email: 'anil.kumar.s@peepalconsulting.com' },
  { name: 'Vijay',       email: 'vijay@peepalconsulting.com' },
  { name: 'Arth',        email: 'arth.mohan@peepalconsulting.com' },
  { name: 'Anish',       email: 'anish.k@peepalconsulting.com' },
  { name: 'Rohan',       email: 'rohan.p@peepalconsulting.com' },
  { name: 'Shiwala',     email: 'shiwala.dubey@peepalconsulting.com' },
  { name: 'Ramakrishna', email: 'ramakrishna.d@peepalconsulting.com' },
  { name: 'Rupa',        email: 'rupa.moogi@peepalconsulting.com' },
];

function applyCandidateConfig() {
  const config = window.PORTAL_CONFIG || {};
  if (config.ACCESS) ACCESS = config.ACCESS;
  if (config.MANAGER_NAME_EMAIL) MANAGER_NAME_EMAIL = config.MANAGER_NAME_EMAIL;
  if (Array.isArray(config.KNOWN_PEOPLE)) KNOWN_PEOPLE = config.KNOWN_PEOPLE;
}

window.__applyCandidateConfig = applyCandidateConfig;
applyCandidateConfig();

const PORTAL_BASE_URL = window.location.origin;
const MIN_FEEDBACK_NOTES_WORDS = 30;
const ROUND_SCORE_LABEL = 'Round Score';
const DEFAULT_FEEDBACK_RUBRIC = {
  requireAllScores: false,
  sections: [
    {
      heading: 'Core Assessment',
      metrics: [
        { id: 'acumen', label: 'Business Acumen', storageLabel: 'Acumen' },
        { id: 'intel', label: 'Intelligence', storageLabel: 'Intel' },
        { id: 'hunger', label: 'Hunger / Drive', storageLabel: 'Hunger' },
      ],
    },
  ],
};
function createRubric(sectionDefs) {
  return {
    requireAllScores: true,
    sections: sectionDefs.map(([heading, metrics]) => ({
      heading,
      metrics: metrics.map(label => ({
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        label,
        storageLabel: label,
      })),
    })),
  };
}

const RUBRIC_FOUNDERS_OFFICE = createRubric([
  ['Intellect & Business Acumen', [
    'Structured thinking & ability to connect business dots',
    'Comfort with ambiguity & operating without a playbook',
  ]],
  ['Ownership & Execution', [
    'End-to-end project ownership & delivery',
    'Ability to drive change & see initiatives through',
  ]],
  ['Ambition & Drive', [
    'Hunger to create impact & challenge status quo',
    'Initiative & self-direction',
  ]],
  ['Values & Culture Fit', [
    "Strong cultural alignment with Peepal's ways",
    'Ownership mindset & people-first approach',
  ]],
]);

const RUBRIC_EXEC_SEARCH_TA = createRubric([
  ['Sales Acumen', [
    'Client acquisition track record',
    'C-suite level closure drive & revenue ownership',
  ]],
  ['Delivery & Process', [
    'Completely hands-on in recruitment (comfortable working independently)',
    'Executive staffing delivery knowledge',
    'SLA & pricing knowledge',
  ]],
  ['Team & Growth Orientation', [
    'Ability to build team and revenue from scratch',
    'Has owned PnL targets previously',
  ]],
  ['Values & Integrity', [
    'Empathy & relationship building',
    'Ownership mindset & cultural fit',
  ]],
]);

const RUBRIC_VP_TA = createRubric([
  ['Delivery & Process', [
    'Hands-on recruitment capability & delivery execution',
    'SLA tracking & reporting adherence',
    'GCC & general client handling experience',
  ]],
  ['Sales Acumen', [
    'New client acquisition capability',
    'Existing client penetration & revenue expansion capability',
  ]],
  ['Team & Growth', [
    'PnL target ownership',
    'Ability to build & scale team',
  ]],
  ['Values & Integrity', [
    'Empathy & relationship building',
    'Ownership mindset & cultural fit',
  ]],
]);

const RUBRIC_BD_HEAD = createRubric([
  ['Revenue & Growth', [
    'Closure drive & revenue ownership',
    'Long-term strategic thinking',
  ]],
  ['Sales Acumen', [
    'Communication & persuasion',
    'Hands On, Aggression & target orientation',
  ]],
  ['Delivery & Process', [
    'Sales-delivery alignment',
    'SLA & process discipline',
  ]],
  ['Values & Integrity', [
    'Empathy & relationship building',
    'Ownership mindset & cultural fit',
  ]],
]);

const RUBRIC_BD_EXEC_LEAD_MANAGER = createRubric([
  ['Revenue & Growth', [
    'Business & market awareness',
    'Structured thinking & intellect',
  ]],
  ['Sales Acumen', [
    'Communication & persuasion',
    'Sales pitch + targeting',
    'Hands-on & aggressive approach',
  ]],
  ['Values & Integrity', [
    'Empathy & relationship building',
    'Ownership mindset & cultural fit',
  ]],
]);

const RUBRIC_MARKETING_LEAD_CM = createRubric([
  ['Marketing Acumen', [
    'Brand thinking & creativity',
    'Overall marketing ownership',
  ]],
  ['Growth & Channels', [
    'B2B marketing & lead generation',
    'Data-driven thinking & ROI focus',
  ]],
  ['Delivery & Process', [
    'Structured execution capabilities',
    'Ability to holistically critique design',
  ]],
  ['Culture & Drive', [
    'Initiative & adaptability',
    'Zeal & intellectual curiosity',
  ]],
]);

const RUBRIC_MARKETING_EXEC_CM = createRubric([
  ['Marketing Delivery & Acumen', [
    'Brand thinking & creativity',
    'Design proficiency - static, video or motion',
    'Structured execution capabilities',
  ]],
  ['Growth & Channels', [
    'B2B marketing & lead generation',
    'Data-driven thinking & ROI focus',
  ]],
  ['Culture & Drive', [
    'Initiative & adaptability',
    'Zeal & intellectual curiosity',
  ]],
]);

const RUBRIC_MARKET_RESEARCH_CM = createRubric([
  ['Research & Analytical Thinking', [
    'Structured thinking & insight generation',
    'Primary & secondary research - sourcing, validating & integrating',
  ]],
  ['Output & Communication', [
    'Report & deck creation ability',
    'Data storytelling & simplification',
    'End-to-end report ownership - from brief to final output',
  ]],
  ['Tools & Execution', [
    'AI / LLM tool proficiency',
    'Excel, Sheets & presentation tools',
  ]],
  ['Culture & Drive', [
    'Curiosity & intellectual drive',
    'Speed & accuracy orientation',
  ]],
]);

const RUBRIC_BUSINESS_HEAD_C2H = createRubric([
  ['Sales Acumen', [
    'Client acquisition track record',
    'Closure drive & PnL targets ownership',
  ]],
  ['Delivery & Process', [
    'Ability to be hands-on in recruitment',
    'C2H / contract staffing delivery knowledge',
    'SLA & pricing knowledge',
  ]],
  ['Team & Growth Orientation', [
    'Ability to build and nurture team & revenue from scratch',
    'Adaptability - works across team sizes, structures & pace',
  ]],
  ['Values & Integrity', [
    'Empathy & relationship building',
    'Ownership mindset & cultural fit',
  ]],
]);

const RUBRIC_TAD_BD_CR = createRubric([
  ['Thinking & Problem Solving', [
    'Relationship building & responsiveness',
    'Problem solving & opportunity spotting',
    'Commercial thinking',
  ]],
  ['Sales Acumen', [
    'Communication & persuasion',
    'Sales pitch + targeting + lead gen',
    'Hands-on & aggressive approach',
  ]],
  ['Values & Integrity', [
    'Empathy & relationship building',
    'Ownership mindset & cultural fit',
  ]],
]);

const RUBRIC_TAD_MARKETING = createRubric([
  ['Marketing Delivery & Acumen', [
    'Brand thinking & creativity',
    'Design proficiency - static, video or motion',
    'Structured execution capabilities',
    'Idea generation & content relevance',
  ]],
  ['Growth & Channels', [
    'Sponsor acquisition & registration growth thinking',
    'Marketing innovation - ability to grow TAD reach',
  ]],
  ['Culture & Drive', [
    'Initiative & adaptability',
    'Zeal & intellectual curiosity',
  ]],
]);

const RUBRIC_TAD_EVENT_OPERATIONS = createRubric([
  ['Ownership & Execution', [
    'End-to-end event accountability',
    'Follow-through & attention to detail',
  ]],
  ['Thinking & Problem Solving', [
    'Cost-experience balancing & on-ground adaptability',
    'Audience experience prioritisation',
  ]],
  ['Communication & Stakeholder Management', [
    'Venue negotiation & vendor management',
    'Sponsor & partner coordination',
  ]],
  ['Role Capability', [
    'Attendee management',
    'Smooth execution under pressure',
  ]],
  ['Culture Fit', [
    'Initiative & ownership mindset',
  ]],
]);

const ROLE_FEEDBACK_RUBRICS = {
  "Founders Office": RUBRIC_FOUNDERS_OFFICE,
  'Exec Search - TA': RUBRIC_EXEC_SEARCH_TA,
  'VP - TA': RUBRIC_VP_TA,
  'Head - BD': RUBRIC_BD_HEAD,
  'Executive - BD': RUBRIC_BD_EXEC_LEAD_MANAGER,
  'Lead - BD': RUBRIC_BD_EXEC_LEAD_MANAGER,
  'Manager - BD': RUBRIC_BD_EXEC_LEAD_MANAGER,
  'Marketing Lead - Central Marketing': RUBRIC_MARKETING_LEAD_CM,
  'GD - Central Marketing': RUBRIC_MARKETING_EXEC_CM,
  'Video Editor - Central Marketing': RUBRIC_MARKETING_EXEC_CM,
  'Executive - Central Marketing': RUBRIC_MARKETING_EXEC_CM,
  'Market Research - Central Marketing': RUBRIC_MARKET_RESEARCH_CM,
  'Business Head - C2H': RUBRIC_BUSINESS_HEAD_C2H,
  'BD & CR - TAD': RUBRIC_TAD_BD_CR,
  'MT (BD & CR) - TAD': RUBRIC_TAD_BD_CR,
  'Marketing Executive - TAD': RUBRIC_TAD_MARKETING,
  'Marketing Lead - TAD': RUBRIC_TAD_MARKETING,
  'Event Operations - TAD': RUBRIC_TAD_EVENT_OPERATIONS,
};

function getFeedbackRubric(candidate) {
  return ROLE_FEEDBACK_RUBRICS[candidate?.role] || DEFAULT_FEEDBACK_RUBRIC;
}

function getFeedbackMetrics(candidate) {
  return getFeedbackRubric(candidate).sections.flatMap(section => section.metrics);
}

function getFeedbackMetricLabel(candidate, storageLabel) {
  const metric = getFeedbackMetrics(candidate).find(item => item.storageLabel === storageLabel);
  return metric?.label || storageLabel;
}

function getScoreInputId(metric) {
  return `score-${metric.id}`;
}

function parseScoreNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0 || num > 5) return null;
  return num;
}

function formatScoreValue(value) {
  const num = parseScoreNumber(String(value).replace('/5', '').trim());
  if (num === null) return String(value || '').trim();
  return Number.isInteger(num) ? `${num}` : num.toFixed(1).replace(/\.0$/, '');
}

function calculateRoundScore(metricScores) {
  if (!metricScores.length) return '';
  const sum = metricScores.reduce((total, value) => total + value, 0);
  const average = sum / metricScores.length;
  return `${average.toFixed(1).replace(/\.0$/, '')}/5`;
}

function getOrderedScoreEntries(scores, candidate) {
  const scoreMap = scores || {};
  const orderedLabels = getFeedbackMetrics(candidate).map(metric => metric.storageLabel);
  const seen = new Set();
  const regular = [];

  orderedLabels.forEach(label => {
    const value = scoreMap[label];
    if (!String(value || '').trim()) return;
    regular.push([label, value]);
    seen.add(label);
  });

  Object.entries(scoreMap).forEach(([label, value]) => {
    if (label === ROUND_SCORE_LABEL || seen.has(label) || !String(value || '').trim()) return;
    regular.push([label, value]);
  });

  const roundScore = String(scoreMap[ROUND_SCORE_LABEL] || '').trim();
  return {
    regular,
    roundScore: roundScore ? [ROUND_SCORE_LABEL, roundScore] : null,
  };
}

function buildScoreTableHtml(scores, candidate, { compact = false } = {}) {
  const { regular, roundScore } = getOrderedScoreEntries(scores, candidate);
  if (!regular.length && !roundScore) return '';

  const rows = [];
  for (let index = 0; index < regular.length; index += 2) {
    const pair = regular.slice(index, index + 2);
    rows.push(`
      <tr>
        ${pair.map(([label, value]) => `
          <td style="width:50%;padding:${compact ? '8px 10px' : '10px 12px'};border:1px solid #DBE4F0;vertical-align:top;background:#fff">
            <div style="font-size:${compact ? '10px' : '11px'};font-weight:700;color:#64748B;line-height:1.4">${escHtml(getFeedbackMetricLabel(candidate, label))}</div>
            <div style="margin-top:4px;font-size:${compact ? '12px' : '13px'};font-weight:800;color:#4338CA">${escHtml(String(value))}</div>
          </td>`).join('')}
        ${pair.length === 1 ? `<td style="width:50%;padding:${compact ? '8px 10px' : '10px 12px'};border:1px solid #DBE4F0;background:#F8FAFC"></td>` : ''}
      </tr>`);
  }

  return `
    <div style="margin-bottom:${compact ? '8px' : '10px'}">
      ${roundScore ? `
        <div style="display:inline-flex;align-items:center;gap:8px;background:#EEF2FF;border:1px solid #C7D2FE;border-radius:999px;padding:${compact ? '5px 10px' : '6px 12px'};margin-bottom:${compact ? '8px' : '10px'}">
          <span style="font-size:${compact ? '10px' : '11px'};font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:0.6px">${ROUND_SCORE_LABEL}</span>
          <span style="font-size:${compact ? '12px' : '14px'};font-weight:900;color:#312E81">${escHtml(roundScore[1])}</span>
        </div>` : ''}
      ${regular.length ? `
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#F8FAFC;border-radius:10px;overflow:hidden">
          <tbody>${rows.join('')}</tbody>
        </table>` : ''}
    </div>`;
}

function buildScoreInputSections(candidate) {
  const rubric = getFeedbackRubric(candidate);
  if (!rubric.sections.length) return '';

  return rubric.sections.map(section => `
    <div style="margin-bottom:14px">
      <div class="feedback-section-title">${escHtml(section.heading)}</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">
        <tbody>
          ${section.metrics.map(metric => `
            <tr>
              <td style="padding:11px 12px;border-bottom:1px solid #E2E8F0;font-size:12px;font-weight:700;color:var(--slate-700);line-height:1.5">${escHtml(metric.label)}</td>
              <td style="width:120px;padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right">
                <div style="display:inline-flex;align-items:center;gap:8px">
                  <input
                    type="number"
                    id="${getScoreInputId(metric)}"
                    class="score-field"
                    min="0"
                    max="5"
                    step="1"
                    placeholder="—"
                    oninput="updateRoundScore()"
                    style="width:64px;text-align:center"
                  >
                  <span class="score-max">/ 5</span>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');
}

function collectFeedbackScores(candidate) {
  const rubric = getFeedbackRubric(candidate);
  const metrics = getFeedbackMetrics(candidate);
  const scores = {};
  const missing = [];
  const valuesForAverage = [];

  metrics.forEach(metric => {
    const rawValue = document.getElementById(getScoreInputId(metric))?.value?.trim() || '';
    if (!rawValue) {
      if (rubric.requireAllScores) missing.push(metric.label);
      return;
    }

    const parsedValue = parseScoreNumber(rawValue);
    if (parsedValue === null) {
      missing.push(metric.label);
      return;
    }

    const displayValue = `${formatScoreValue(parsedValue)}/5`;
    scores[metric.storageLabel] = displayValue;
    valuesForAverage.push(parsedValue);
  });

  if (valuesForAverage.length) {
    scores[ROUND_SCORE_LABEL] = calculateRoundScore(valuesForAverage);
  }

  return { scores, missing };
}

function updateRoundScore() {
  const summary = document.getElementById('round-score-summary');
  if (!summary || !currentCandidate) return;

  const metrics = getFeedbackMetrics(currentCandidate);
  if (!metrics.length) {
    summary.textContent = '';
    return;
  }

  const values = metrics
    .map(metric => parseScoreNumber(document.getElementById(getScoreInputId(metric))?.value?.trim()))
    .filter(value => value !== null);

  if (!values.length) {
    summary.textContent = 'Round Score: —';
    return;
  }

  const rubric = getFeedbackRubric(currentCandidate);
  if (rubric.requireAllScores && values.length !== metrics.length) {
    summary.textContent = `Round Score: fill all ${metrics.length} scores`;
    return;
  }

  summary.textContent = `Round Score: ${calculateRoundScore(values)}`;
}

function isTaRoleCandidate(candidate) {
  if (!candidate) return false;
  const dept = String(candidate.department || '').trim();
  const role = String(candidate.role || '').trim();
  return dept === 'TA' || /(?:^|[\s(])TA(?:\)|\s*)$/.test(role) || /\s-\sTA$/.test(role);
}

function getFeedbackMinimumWords(candidate) {
  return isTaRoleCandidate(candidate) ? 0 : MIN_FEEDBACK_NOTES_WORDS;
}

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

function getCandidateProfileUrl(candidate) {
  if (!candidate?._row) return '';
  return `${PORTAL_BASE_URL}/dashboard?candidate=${candidate._row}`;
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

  const stageStateMap = {};
  const rejectedStages = {
    'Screen Reject':          'Screening',
    'Aptitude Reject':        'Aptitude',
    'Assessment Reject':      'Assessment',
    'AI Interview Reject':    'AI Interview',
    'Manager Round Reject':   'Manager Round',
    'HR Reject':              'HR Round',
    'Kaveri Reject':          'Kaveri Round',
    'Vijay Reject':           'Vijay Round',
  };

  const rejectedAt = rejectedStages[currentStatus];
  const dateCols = {
    'Aptitude':      c.aptitudeDate,
    'Assessment':    c.assessmentDate,
    'AI Interview':  c.assessmentDate,
    'Manager Round': c.managerRoundDate,
    'HR Round':      c.kaveriRoundDate,
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

  const firstUpcoming = pipeline.find(s => stageStateMap[s] === 'upcoming');
  if (firstUpcoming && !rejectedAt) stageStateMap[firstUpcoming] = 'current';

  const stageIcons = {
    'Screening':     'S', 'Aptitude': 'A', 'Assessment': 'T',
    'AI Interview':  'AI','Manager Round': 'M', 'HR Round': 'HR', 'Kaveri Round': 'K',
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
    'HR Round':      { label: 'HR Round Date',       value: c.kaveriRoundDate },
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

// ── PARSE FEEDBACK ENTRIES from Remarks ──
function parseFeedbackEntries(remarks) {
  if (!remarks) return { entries: [], legacy: '' };
  const entries = [];
  const parts = remarks.split(/\n\n(?=\[)/);
  let legacy = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith('[')) {
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

  const INTERVIEW_ROUNDS = ['Assessment', 'AI Interview', 'Manager Round', 'HR Round', 'Kaveri Round', 'Vijay Round'];
  const availableRounds = pipeline.filter(s => INTERVIEW_ROUNDS.includes(s));
  const permittedRounds = getPermittedFeedbackStages(userEmail, c, availableRounds);

  const stageOptions = permittedRounds
    .map(({ key, label }) => `<option value="${key}">${escHtml(label)}</option>`)
    .join('');

  if (availableRounds.length === 0 && permittedRounds.length === 0) {
    return `<div style="padding:24px;text-align:center;color:var(--slate-400);font-size:13px">No interview rounds in this candidate's pipeline.</div>`;
  }

  const firstStage = permittedRounds[0]?.key || '';
  const canWrite   = permittedRounds.length > 0 && canWriteFeedback(userEmail, c, firstStage);

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
          ${Object.keys(e.scores).length > 0 ? buildScoreTableHtml(e.scores, c) : ''}
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
      ${buildScoreInputSections(c)}
      <div id="round-score-summary" style="margin-top:8px;font-size:12px;font-weight:800;color:#4338CA">Round Score: —</div>
    </div>

    <div style="margin-bottom:6px">
      <div class="feedback-section-title">Notes / Feedback</div>
      <textarea
        id="feedback-notes"
        class="feedback-textarea"
        placeholder="${getFeedbackMinimumWords(c) > 0 ? `Write at least ${getFeedbackMinimumWords(c)} words covering observations, strengths, concerns, and recommendation...` : 'Write observations, strengths, concerns, and recommendation...'}"
        oninput="updateWordCount()"
      ></textarea>
      <div class="word-count" id="word-count">${getFeedbackMinimumWords(c) > 0 ? `0 words. ${getFeedbackMinimumWords(c)} minimum required` : 'No minimum word count for TA roles'}</div>
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
  updateRoundScore();
}

function updateWordCount() {
  const textarea = document.getElementById('feedback-notes');
  const counter  = document.getElementById('word-count');
  if (!textarea || !counter) return;
  const words = countWords(textarea.value);
  const minWords = getFeedbackMinimumWords(currentCandidate);
  counter.textContent = minWords > 0
    ? `${words} words. ${minWords} minimum required`
    : `${words} words. No minimum for TA roles`;
  counter.className = 'word-count' + (minWords > 0 && words < minWords ? ' warn' : '');
}

async function saveFeedback() {
  if (!currentCandidate) return;

  const stage   = document.getElementById('feedback-stage')?.value;
  const notes   = document.getElementById('feedback-notes')?.value?.trim();
  const btn     = document.getElementById('btn-save-feedback');
  const msgEl   = document.getElementById('feedback-msg');
  const { scores, missing } = collectFeedbackScores(currentCandidate);
  const rubric = getFeedbackRubric(currentCandidate);

  const userEmail = window.__userEmail || '';
  if (!canWriteFeedback(userEmail, currentCandidate, stage)) {
    if (msgEl) msgEl.innerHTML = '<div class="send-error">You don\'t have permission to log feedback for this round.</div>';
    return;
  }

  const minWords = getFeedbackMinimumWords(currentCandidate);
  const noteWords = countWords(notes);
  if (minWords > 0 && noteWords < minWords) {
    if (msgEl) msgEl.innerHTML = `<div class="send-error">Please add at least ${minWords} words in Notes / Feedback before saving.</div>`;
    return;
  }

  if (rubric.requireAllScores && missing.length) {
    if (msgEl) msgEl.innerHTML = `<div class="send-error">Please fill all score fields for this role before saving.</div>`;
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
        scores,
      }),
    });

    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();

    if (data.success) {
      if (msgEl) msgEl.innerHTML = '<div class="send-success">✓ Saved successfully</div>';
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
    `<option value="all_rounds">📋 All Rounds Summary</option>`,
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
            value="[All Rounds Summary] ${escHtml(c.name)} — ${escHtml(c.role)} | Peepal Consulting"
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
    'TAD': '#2E7D32', 'HR': '#F57F17', "Founders Office": '#AD1457',
  };
  const DEPT_BG = {
    'TA': '#E8EAF6', 'BD': '#E3F2FD', 'Central Marketing': '#F3E5F5',
    'TAD': '#E8F5E9', 'HR': '#FFF9C4', "Founders Office": '#FCE4EC',
  };
  const accent = DEPT_ACCENT[c.department] || '#283593';
  const bg     = DEPT_BG[c.department]     || '#F5F5F5';
  const stageLabel = stage === 'all_rounds'
    ? 'All Rounds Summary'
    : stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const candidateProfileUrl = getCandidateProfileUrl(c);

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
        ${includeScores && Object.keys(e.scores).length > 0 ? buildScoreTableHtml(e.scores, c, { compact: true }) : ''}
        ${e.notes ? `<p style="font-size:11px;line-height:1.6;color:#334155;margin:0">${e.notes}</p>` : ''}
      </div>`).join('')}` : '';

  const actionButtons = [
    c.resumeLink
      ? `<a href="${c.resumeLink}" style="display:inline-block;background:${accent};color:white;padding:8px 16px;border-radius:6px;font-size:10px;font-weight:800;text-decoration:none;text-transform:uppercase">View Resume →</a>`
      : '',
    c.linkedin
      ? `<a href="${c.linkedin}" style="display:inline-block;background:#0A66C2;color:white;padding:8px 16px;border-radius:6px;font-size:10px;font-weight:800;text-decoration:none;text-transform:uppercase">View LinkedIn →</a>`
      : '',
    candidateProfileUrl
      ? `<a href="${candidateProfileUrl}" style="display:inline-block;background:#0F172A;color:white;padding:8px 16px;border-radius:6px;font-size:10px;font-weight:800;text-decoration:none;text-transform:uppercase">Open Candidate Profile →</a>`
      : '',
  ].filter(Boolean).join('');

  return `
    <div style="background:#1A1A2E;padding:20px 24px">
      <p style="margin:0;color:#A0A8C8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Peepal Consulting — Hiring Portal</p>
      <h1 style="margin:4px 0 0;color:white;font-size:18px;font-weight:800">${stageLabel}</h1>
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
      ${actionButtons ? `<div style="display:flex;flex-wrap:wrap;gap:10px">${actionButtons}</div>` : ''}
    </div>
    <div style="background:#f8fafc;padding:12px 24px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:10px;color:#94a3b8">Sent via Peepal Hiring Portal · ${new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day:'numeric', month:'short', year:'numeric' })}</p>
    </div>`;
}

function refreshEmailPreview() {
  if (!currentCandidate) return;
  const stage          = document.getElementById('email-stage')?.value || 'all_rounds';
  const customMsg      = document.getElementById('email-custom-msg')?.value || '';
  const includeProfile = document.getElementById('include-profile')?.checked ?? true;
  const includeFeedback= document.getElementById('include-feedback')?.checked ?? true;
  const includeScores  = document.getElementById('include-scores')?.checked ?? true;

  const stageLabel = stage === 'all_rounds'
    ? 'All Rounds Summary'
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
    prompt('Copy this link:', url);
  });
}

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
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
window.updateRoundScore        = updateRoundScore;
window.copyCandidateLink       = copyCandidateLink;
window.onFeedbackStageChange   = onFeedbackStageChange;
window.getUserRole             = getUserRole;
