// netlify/functions/admin-deploy.js
// POST — commits portal files to GitHub AND writes config to ⚙ GAS Config sheet
// Called by Admin Panel "Deploy" button

const { jwtVerify } = require('jose');
const { google }    = require('googleapis');
const { ACCESS }    = require('../lib/access');

const SECRET        = new TextEncoder().encode(process.env.SESSION_SECRET);
const IS_DEV        = process.env.NEXTAUTH_URL?.includes('localhost');
const ADMIN_EMAILS  = ACCESS.admins;
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.BRANCH || process.env.GITHUB_BRANCH || 'main';
const GAS_CONFIG_SHEET = '⚙ GAS Config';

async function getSession(event) {
  if (IS_DEV) return { email: 'arth.mohan@peepalconsulting.com', name: 'Arth Mohan' };
  const cookie = event.headers.cookie || '';
  const match  = cookie.match(/peepal_session=([^;]+)/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], SECRET);
    return payload;
  } catch { return null; }
}

// ── GITHUB HELPERS ──

async function getFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error getting ${path}: ${res.status}`);
  const data = await res.json();
  return {
    sha: data.sha,
    content: Buffer.from(data.content, 'base64').toString('utf8'),
  };
}

async function commitFile(path, content, author) {
  const existing = await getFile(path);
  const body = {
    message: `config: update ${path.split('/').pop()} via Admin Panel [${author}]`,
    content: Buffer.from(content).toString('base64'),
    branch: GITHUB_BRANCH,
  };
  if (existing?.sha) body.sha = existing.sha;
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub commit failed for ${path}: ${res.status} — ${err}`);
  }
  return await res.json();
}

// ── GOOGLE SHEETS HELPER ──

function getSheetClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function buildGasConfigRows(config) {
  const stamp = new Date().toISOString();
  const rows = [
    ['KEY', 'VALUE', 'LAST_UPDATED'],
    ['RENJITH_EMAIL',  config.gas.renjith,  stamp],
    ['KAVERI_EMAIL',   config.gas.kaveri,   stamp],
    ['VIJAY_EMAIL',    config.gas.vijay,    stamp],
    ['PORTAL_URL',     config.gas.portalUrl, stamp],
    ['RECRUITERS',     config.recruiters.join(','), stamp],
    ['ACCESS_ADMINS',     (config.access?.admins || []).join(','), stamp],
    ['ACCESS_RECRUITERS', (config.access?.recruiters || []).join(','), stamp],
    ['ACCESS_MANAGERS',   (config.access?.managers || []).join(','), stamp],
    ['ACCESS_KAVERI',     (config.access?.kaveri || []).join(','), stamp],
    ['ACCESS_VIJAY',      (config.access?.vijay || []).join(','), stamp],
    ['ADMIN_EMAILS',      (config.adminEmails || []).join(','), stamp],
    ['KNOWN_PEOPLE_JSON', JSON.stringify(config.knownPeople || []), stamp],
    ['MANAGER_NAME_EMAIL_JSON', JSON.stringify(config.managerNameEmail || {}), stamp],
  ];

  for (const [status, days] of Object.entries(config.gas.thresholds)) {
    rows.push([`THRESHOLD_${status}`, String(days), stamp]);
  }
  for (const [name, email] of Object.entries(config.gas.managerEmails)) {
    rows.push([`MANAGER_EMAIL_${name}`, email, stamp]);
  }
  for (const [name, email] of Object.entries(config.gas.recruiterEmails)) {
    rows.push([`RECRUITER_EMAIL_${name}`, email, stamp]);
  }
  for (const [name, email] of Object.entries(config.managerNameEmail || {})) {
    rows.push([`MANAGER_NAME_EMAIL_${name}`, email, stamp]);
  }
  for (const [dept, roles] of Object.entries(config.deptRoles)) {
    rows.push([`DEPT_ROLES_${dept}`, roles.join(','), stamp]);
  }
  for (const [role, stages] of Object.entries(config.rolePipeline)) {
    rows.push([`ROLE_PIPELINE_${role}`, stages.join(','), stamp]);
  }
  for (const [role, managers] of Object.entries(config.roleManagers)) {
    rows.push([`ROLE_MANAGERS_${role}`, managers.join(','), stamp]);
  }
  rows.push([`DEPT_ORDER`, config.deptOrder.join(','), stamp]);
  return rows;
}

async function writeGasConfig(config) {
  const sheets = getSheetClient();
  const sheetId = process.env.SHEET_ID;

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existingSheets = meta.data.sheets.map(s => s.properties.title);

  if (!existingSheets.includes(GAS_CONFIG_SHEET)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: GAS_CONFIG_SHEET,
              tabColor: { red: 0.2, green: 0.6, blue: 0.9 },
            },
          },
        }],
      },
    });
  }

  const rows = buildGasConfigRows(config);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `'${GAS_CONFIG_SHEET}'!A:C`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${GAS_CONFIG_SHEET}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
  return rows.length - 1;
}

// ── GENERATE FILE CONTENTS ──

function generateConfigJs(config) {
  const d = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  return `// ============================================================
// PEEPAL HIRING PORTAL — config.js
// Generated by Admin Panel on ${d}
// ============================================================

window.PORTAL_CONFIG = {

  DEPT_ORDER: ${JSON.stringify(config.deptOrder)},

  DEPT_ROLES: ${fmtObj(config.deptRoles)},

  ROLE_PIPELINE: ${fmtObj(config.rolePipeline)},

  ROLE_MANAGERS: ${fmtObj(config.roleManagers)},

  RECRUITERS: ${JSON.stringify(config.recruiters)},

  ACCESS: {
    admins:     ${JSON.stringify(config.access.admins||[])},
    recruiters: ${JSON.stringify(config.access.recruiters||[])},
    managers:   ${JSON.stringify(config.access.managers||[])},
    kaveri:     ${JSON.stringify(config.access.kaveri||[])},
    vijay:      ${JSON.stringify(config.access.vijay||[])},
  },

  MANAGER_NAME_EMAIL: ${fmtObj(config.managerNameEmail)},

  KNOWN_PEOPLE: ${JSON.stringify(config.knownPeople, null, 4)},

  GAS: {
    RENJITH:     '${config.gas.renjith}',
    KAVERI:      '${config.gas.kaveri}',
    VIJAY:       '${config.gas.vijay}',
    PORTAL_URL:  '${config.gas.portalUrl}',
    STATUS_THRESHOLD: ${fmtObj(config.gas.thresholds)},
    MANAGER_EMAILS:   ${fmtObj(config.gas.managerEmails)},
    RECRUITER_EMAILS: ${fmtObj(config.gas.recruiterEmails)},
  },

  ADMIN_EMAILS: ${JSON.stringify(config.adminEmails)},
};`;
}

function generateAccessJs(config) {
  const entries = Object.entries(config.managerNameEmail);
  const displayEntries = entries.map(([k,v]) => `  '${k}': '${v}',`).join('\n');
  const lowerEntries = entries
    .filter(([k]) => k !== k.toLowerCase())
    .map(([k,v]) => `  '${k.toLowerCase()}': '${v}',`).join('\n');

  return `// netlify/lib/access.js
// Single source of truth for all access control.
// DO NOT edit manually — generated by Admin Panel.

const ACCESS = {
  admins:     ${JSON.stringify(config.access.admins||[])},
  recruiters: ${JSON.stringify(config.access.recruiters||[])},
  managers:   ${JSON.stringify(config.access.managers||[])},
  kaveri:     ${JSON.stringify(config.access.kaveri||[])},
  vijay:      ${JSON.stringify(config.access.vijay||[])},
};

const MANAGER_NAME_EMAIL = {
${displayEntries}
${lowerEntries}
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/\\s+/g, ' ');
}

function getUserRole(email) {
  const e = normalizeEmail(email);
  if (!e) return 'viewer';
  if (ACCESS.admins.includes(e))     return 'admin';
  if (ACCESS.recruiters.includes(e)) return 'recruiter';
  if (ACCESS.kaveri.includes(e))     return 'kaveri';
  if (ACCESS.vijay.includes(e))      return 'vijay';
  if (ACCESS.managers.includes(e))   return 'manager';
  return 'viewer';
}

function getManagerEmail(managerName) {
  if (!managerName) return null;
  const raw = String(managerName).trim();
  if (raw.includes('@')) return normalizeEmail(raw);
  return MANAGER_NAME_EMAIL[raw] || MANAGER_NAME_EMAIL[normalizeName(raw)] || null;
}

function isAssignedManager(email, candidate) {
  return getManagerEmail(candidate?.manager) === normalizeEmail(email);
}

function canViewCandidate(email, candidate) {
  const role = getUserRole(email);
  if (role === 'manager') return isAssignedManager(email, candidate);
  return role !== 'viewer';
}

function filterCandidatesForUser(email, candidates) {
  const role = getUserRole(email);
  if (role === 'manager') return candidates.filter(c => isAssignedManager(email, c));
  if (role === 'viewer')  return [];
  return candidates;
}

module.exports = {
  ACCESS,
  MANAGER_NAME_EMAIL,
  canViewCandidate,
  filterCandidatesForUser,
  getManagerEmail,
  getUserRole,
  isAssignedManager,
  normalizeEmail,
};`;
}

// ── CANDIDATE.JS TOP BLOCK GENERATOR + PATCHER ──

// Generates only the config block that lives at the top of candidate.js
function generateCandidateJsTop(config) {
  const lines = [];
  lines.push('// src/candidate.js');
  lines.push('// Candidate side panel — full info view, pipeline timeline, scores, feedback form');
  lines.push('');
  lines.push('// ── ROLE-BASED ACCESS CONFIG ──');
  lines.push('const ACCESS = {');
  lines.push(`  admins:     ${JSON.stringify(config.access.admins||[])},`);
  lines.push(`  recruiters: ${JSON.stringify(config.access.recruiters||[])},`);
  lines.push(`  managers:   ${JSON.stringify(config.access.managers||[])},`);
  lines.push(`  kaveri:     ${JSON.stringify(config.access.kaveri||[])},`);
  lines.push(`  vijay:      ${JSON.stringify(config.access.vijay||[])},`);
  lines.push('};');
  lines.push('');
  lines.push('// Manager first-name → email map for matching sheet "Manager" column');
  lines.push('const MANAGER_NAME_EMAIL = {');
  Object.entries(config.managerNameEmail).forEach(([k,v]) => {
    lines.push(`  '${k}':  '${v}',`);
  });
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

// Fetches current candidate.js from GitHub, replaces the config block at the top,
// leaves everything from PORTAL_BASE_URL onwards untouched.
async function patchCandidateJs(config, author) {
const ANCHOR = '// ── KNOWN PEOPLE for recipient picker ──';
  const file = await getFile('public/src/candidate.js');
  if (!file) throw new Error('candidate.js not found in repo');

  const anchorIndex = file.content.indexOf(ANCHOR);
  if (anchorIndex === -1) {
    throw new Error(`Anchor "${ANCHOR}" not found in candidate.js — cannot patch safely`);
  }

  const tail = file.content.slice(anchorIndex); // everything from PORTAL_BASE_URL onwards
  const newTop = generateCandidateJsTop(config);
  const newContent = newTop + tail;

  // Commit the patched file
  const body = {
    message: `config: update candidate.js access config via Admin Panel [${author}]`,
    content: Buffer.from(newContent).toString('base64'),
    branch: GITHUB_BRANCH,
    sha: file.sha,
  };

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/public/src/candidate.js`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub commit failed for candidate.js: ${res.status} — ${err}`);
  }
  return await res.json();
}

function fmtObj(obj) {
  const lines = Object.entries(obj).map(([k,v]) => `  '${k}': ${JSON.stringify(v)},`);
  return '{\n' + lines.join('\n') + '\n}';
}

// ── HANDLER ──

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  const session = await getSession(event);
  if (!session) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorised' }) };
  if (!ADMIN_EMAILS.includes(session.email)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin only' }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (!GITHUB_TOKEN || !GITHUB_REPO) return { statusCode: 500, headers, body: JSON.stringify({ error: 'GITHUB_TOKEN or GITHUB_REPO not configured' }) };

  let config;
  try {
    config = JSON.parse(event.body || '{}').config;
    if (!config) throw new Error('No config provided');
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const author = session.name || session.email;
  const results = { github: { committed: [], failed: [] }, sheet: null };

  // 1. Commit the fallback browser config. Runtime source of truth is still ⚙ GAS Config.
  const filesToCommit = [
    { path: 'public/src/config.js',  content: generateConfigJs(config) },
  ];

  for (const file of filesToCommit) {
    try {
      await commitFile(file.path, file.content, author);
      results.github.committed.push(file.path);
    } catch(err) {
      console.error(`GitHub commit failed for ${file.path}:`, err.message);
      results.github.failed.push({ path: file.path, error: err.message });
    }
  }

  // 2. Write config to ⚙ GAS Config sheet. Access/candidate code reads this at runtime.
  try {
    const rowCount = await writeGasConfig(config);
    results.sheet = { success: true, rows: rowCount };
  } catch(err) {
    console.error('Sheet write failed:', err.message);
    results.sheet = { success: false, error: err.message };
  }

  const allGithubFailed = results.github.failed.length > 0 && results.github.committed.length === 0;
  if (allGithubFailed) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'All GitHub commits failed', results }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      results,
      branch: GITHUB_BRANCH,
      repo: GITHUB_REPO,
    }),
  };
};
