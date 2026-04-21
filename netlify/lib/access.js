const ACCESS = {
  admins: ['arth.mohan@peepalconsulting.com', 'anish.k@peepalconsulting.com'],
  recruiters: [
    'ramya.h@peepalconsulting.com',
    'krishna.kumar@peepalconsulting.com',
    'aditi.kaul@peepalconsulting.com',
    'renjith.k@peepalconsulting.com',
  ],
  managers: [
    'ravi.kant.sharma@peepalconsulting.com',
    'ambika.s@peepalconsulting.com',
    'shiwala.dubey@peepalconsulting.com',
    'parv.u@peepalconsulting.com',
    'ramakrishna.d@peepalconsulting.com',
    'rohan.p@peepalconsulting.com',
    'rupa.moogi@peepalconsulting.com',
    'mayank.bajaj@peepalconsulting.com',
  ],
  kaveri: ['kaveri.karnam@peepalconsulting.com'],
  vijay: ['vijay@peepalconsulting.com'],
};

const MANAGER_NAME_EMAIL = {
  ravikant: 'ravi.kant.sharma@peepalconsulting.com',
  'ravi kant sharma': 'ravi.kant.sharma@peepalconsulting.com',
  ambika: 'ambika.s@peepalconsulting.com',
  'ambika s': 'ambika.s@peepalconsulting.com',
  shiwala: 'shiwala.dubey@peepalconsulting.com',
  'shiwala dubey': 'shiwala.dubey@peepalconsulting.com',
  parv: 'parv.u@peepalconsulting.com',
  'parv u': 'parv.u@peepalconsulting.com',
  ramakrishna: 'ramakrishna.d@peepalconsulting.com',
  'ramakrishna d': 'ramakrishna.d@peepalconsulting.com',
  rohan: 'rohan.p@peepalconsulting.com',
  'rohan p': 'rohan.p@peepalconsulting.com',
  rupa: 'rupa.moogi@peepalconsulting.com',
  'rupa moogi': 'rupa.moogi@peepalconsulting.com',
  mayank: 'mayank.bajaj@peepalconsulting.com',
  'mayank bajaj': 'mayank.bajaj@peepalconsulting.com',
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getUserRole(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return 'viewer';
  if (ACCESS.admins.includes(normalizedEmail)) return 'admin';
  if (ACCESS.recruiters.includes(normalizedEmail)) return 'recruiter';
  if (ACCESS.kaveri.includes(normalizedEmail)) return 'kaveri';
  if (ACCESS.vijay.includes(normalizedEmail)) return 'vijay';
  if (ACCESS.managers.includes(normalizedEmail)) return 'manager';
  return 'viewer';
}

function getManagerEmail(managerName) {
  const normalizedManager = normalizeEmail(managerName);
  if (!normalizedManager) return null;
  if (normalizedManager.includes('@')) return normalizedManager;
  return MANAGER_NAME_EMAIL[normalizeName(managerName)] || null;
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
  if (role === 'manager') {
    return candidates.filter(candidate => isAssignedManager(email, candidate));
  }
  if (role === 'viewer') return [];
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
};
