const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { google } = require('googleapis');

const GAS_CONFIG_SHEET = '⚙ GAS Config';
const CACHE_MS = 60 * 1000;

let defaultConfigCache = null;
let sheetConfigCache = null;

function splitList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseJson(value, fallback) {
  try {
    if (!String(value || '').trim()) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getDefaultPortalConfig() {
  if (defaultConfigCache) return deepClone(defaultConfigCache);

  const configPath = path.join(__dirname, '../../public/src/config.js');
  const source = fs.readFileSync(configPath, 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'public/src/config.js' });
  defaultConfigCache = sandbox.window.PORTAL_CONFIG;
  return deepClone(defaultConfigCache);
}

function getSheetClient({ readonly = true } = {}) {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!privateKey || !clientEmail) throw new Error('Google service account is not configured');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: [readonly ? 'https://www.googleapis.com/auth/spreadsheets.readonly' : 'https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function rawRowsToMap(rows) {
  const raw = {};
  for (const row of rows || []) {
    const key = String(row?.[0] || '').trim();
    if (!key || key === 'KEY') continue;
    raw[key] = String(row?.[1] || '').trim();
  }
  return raw;
}

function applyPrefixList(raw, prefix) {
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith(prefix)) continue;
    out[key.slice(prefix.length)] = splitList(value);
  }
  return out;
}

function applyPrefixValues(raw, prefix) {
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith(prefix)) continue;
    out[key.slice(prefix.length)] = value;
  }
  return out;
}

function buildConfigFromRaw(raw, fallback = getDefaultPortalConfig()) {
  const config = deepClone(fallback);

  const deptOrder = splitList(raw.DEPT_ORDER);
  if (deptOrder.length) config.DEPT_ORDER = deptOrder;

  const recruiters = splitList(raw.RECRUITERS);
  if (recruiters.length) config.RECRUITERS = recruiters;

  const deptRoles = applyPrefixList(raw, 'DEPT_ROLES_');
  if (Object.keys(deptRoles).length) config.DEPT_ROLES = deptRoles;

  const rolePipeline = applyPrefixList(raw, 'ROLE_PIPELINE_');
  if (Object.keys(rolePipeline).length) config.ROLE_PIPELINE = rolePipeline;

  const roleManagers = applyPrefixList(raw, 'ROLE_MANAGERS_');
  if (Object.keys(roleManagers).length) config.ROLE_MANAGERS = roleManagers;

  const thresholds = {};
  for (const [status, days] of Object.entries(applyPrefixValues(raw, 'THRESHOLD_'))) {
    const parsed = parseInt(days, 10);
    if (!Number.isNaN(parsed)) thresholds[status] = parsed;
  }
  if (Object.keys(thresholds).length) config.GAS.STATUS_THRESHOLD = thresholds;

  const managerEmails = applyPrefixValues(raw, 'MANAGER_EMAIL_');
  if (Object.keys(managerEmails).length) config.GAS.MANAGER_EMAILS = managerEmails;

  const recruiterEmails = applyPrefixValues(raw, 'RECRUITER_EMAIL_');
  if (Object.keys(recruiterEmails).length) config.GAS.RECRUITER_EMAILS = recruiterEmails;

  if (raw.RENJITH_EMAIL) config.GAS.RENJITH = raw.RENJITH_EMAIL;
  if (raw.KAVERI_EMAIL) config.GAS.KAVERI = raw.KAVERI_EMAIL;
  if (raw.VIJAY_EMAIL) config.GAS.VIJAY = raw.VIJAY_EMAIL;
  if (raw.PORTAL_URL) config.GAS.PORTAL_URL = raw.PORTAL_URL;

  const access = {
    admins: splitList(raw.ACCESS_ADMINS),
    recruiters: splitList(raw.ACCESS_RECRUITERS),
    managers: splitList(raw.ACCESS_MANAGERS),
    kaveri: splitList(raw.ACCESS_KAVERI),
    vijay: splitList(raw.ACCESS_VIJAY),
  };
  if (Object.values(access).some(list => list.length)) {
    config.ACCESS = Object.fromEntries(
      Object.entries(config.ACCESS || {}).map(([role, existing]) => [role, access[role]?.length ? access[role] : existing])
    );
  }

  const adminEmails = splitList(raw.ADMIN_EMAILS);
  if (adminEmails.length) config.ADMIN_EMAILS = adminEmails;

  const managerNameEmailRows = applyPrefixValues(raw, 'MANAGER_NAME_EMAIL_');
  const managerNameEmailJson = parseJson(raw.MANAGER_NAME_EMAIL_JSON, null);
  if (managerNameEmailJson && typeof managerNameEmailJson === 'object') {
    config.MANAGER_NAME_EMAIL = managerNameEmailJson;
  } else if (Object.keys(managerNameEmailRows).length) {
    config.MANAGER_NAME_EMAIL = managerNameEmailRows;
  }

  const knownPeople = parseJson(raw.KNOWN_PEOPLE_JSON, null);
  if (Array.isArray(knownPeople)) config.KNOWN_PEOPLE = knownPeople;

  return config;
}

async function readGasConfigRows() {
  const sheets = getSheetClient({ readonly: true });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${GAS_CONFIG_SHEET}'!A:C`,
  });
  return response.data.values || [];
}

async function getPortalConfig({ force = false } = {}) {
  const now = Date.now();
  if (!force && sheetConfigCache && now - sheetConfigCache.loadedAt < CACHE_MS) {
    return deepClone(sheetConfigCache.config);
  }

  try {
    const rows = await readGasConfigRows();
    const config = buildConfigFromRaw(rawRowsToMap(rows));
    sheetConfigCache = { loadedAt: now, config };
    return deepClone(config);
  } catch (error) {
    console.warn('Using fallback portal config:', error.message);
    return getDefaultPortalConfig();
  }
}

module.exports = {
  GAS_CONFIG_SHEET,
  buildConfigFromRaw,
  getDefaultPortalConfig,
  getPortalConfig,
  getSheetClient,
  rawRowsToMap,
};
