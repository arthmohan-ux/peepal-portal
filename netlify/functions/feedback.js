// netlify/functions/feedback.js
// POST — writes scores + notes back to candidate row in sheet

const { jwtVerify } = require('jose');
const { google }    = require('googleapis');

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

const IS_DEV = process.env.NEXTAUTH_URL?.includes('localhost');
const ACCESS = {
  admins: ['arth.mohan@peepalconsulting.com'],
  recruiters: ['ramya.h@peepalconsulting.com', 'krishna.kumar@peepalconsulting.com', 'aditi.kaul@peepalconsulting.com', 'subhiksha.k@peepalconsulting.com', 'renjith.k@peepalconsulting.com'],
  managers: ['ravi.kant.sharma@peepalconsulting.com', 'ambika.s@peepalconsulting.com', 'shiwala.dubey@peepalconsulting.com', 'parv.u@peepalconsulting.com', 'saketh.a@peepalconsulting.com', 'ramakrishna.d@peepalconsulting.com', 'rohan.p@peepalconsulting.com', 'champa.v@peepalconsulting.com'],
  kaveri: ['kaveri.karnam@peepalconsulting.com'],
  vijay: ['vijay@peepalconsulting.com'],
};
const MANAGER_NAME_EMAIL = {
  Ravikant: 'ravi.kant.sharma@peepalconsulting.com',
  Ambika: 'ambika.s@peepalconsulting.com',
  Shiwala: 'shiwala.dubey@peepalconsulting.com',
  Parv: 'parv.u@peepalconsulting.com',
  Saketh: 'saketh.a@peepalconsulting.com',
  Ramakrishna: 'ramakrishna.d@peepalconsulting.com',
  Rohan: 'rohan.p@peepalconsulting.com',
  Champa: 'champa.v@peepalconsulting.com',
};

async function getSession(event) {
  if (IS_DEV) return { email: 'dev@peepalconsulting.com', name: 'Dev User' };
  const cookie = event.headers.cookie || '';
  const match  = cookie.match(/peepal_session=([^;]+)/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], SECRET);
    return payload;
  } catch { return null; }
}

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

function colToLetter(col) {
  let letter = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function getUserRole(email) {
  if (!email) return 'viewer';
  if (ACCESS.admins.includes(email)) return 'admin';
  if (ACCESS.recruiters.includes(email)) return 'recruiter';
  if (ACCESS.kaveri.includes(email)) return 'kaveri';
  if (ACCESS.vijay.includes(email)) return 'vijay';
  if (ACCESS.managers.includes(email)) return 'manager';
  return 'viewer';
}

function canWriteFeedback(email, managerName, stage) {
  const role = getUserRole(email);
  if (role === 'admin' || role === 'recruiter') return true;
  if (role === 'kaveri') return stage === 'kaveri_round';
  if (role === 'vijay') return stage === 'vijay_round';
  if (role === 'manager') {
    const managerEmail = MANAGER_NAME_EMAIL[managerName];
    return managerEmail === email && stage === 'manager_round';
  }
  return false;
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  const session = await getSession(event);
  if (!session) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorised' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { row, stage, notes, scores, statusUpdate } = JSON.parse(event.body || '{}');

  if (!row || row < 4) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid row number' }) };
  }

  if (statusUpdate) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Pipeline status updates are disabled in the portal. Please update status directly in the sheet.' }),
    };
  }

  if (!notes && !scores?.acumen && !scores?.intel && !scores?.hunger) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No data to update' }) };
  }

  const sheetName = process.env.MASTER_SHEET_NAME || 'Master Tracker';

  try {
    const sheets  = getSheetClient();
    const updates = [];
    const managerRange = `'${sheetName}'!R${row}`;
    const managerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: managerRange,
    });
    const candidateManager = managerRes.data.values?.[0]?.[0] || '';

    if (!canWriteFeedback(session.email, candidateManager, stage)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'You do not have permission to add feedback for this round or candidate.' }),
      };
    }

    // Build scores line if any scores provided
    const scoreParts = [];
    if (scores?.acumen) scoreParts.push(`Acumen: ${scores.acumen}/5`);
    if (scores?.intel)  scoreParts.push(`Intel: ${scores.intel}/5`);
    if (scores?.hunger) scoreParts.push(`Hunger: ${scores.hunger}/5`);
    const scoresLine = scoreParts.length > 0 ? `[scores: ${scoreParts.join(' · ')}] ` : '';

    const timestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const prefix    = stage ? `[${stage} — ${timestamp} — ${session.name}]` : `[${timestamp} — ${session.name}]`;
    const entry     = `${prefix} ${scoresLine}${notes || ''}`.trim();

    const colLetter   = colToLetter(20); // Remarks = col 20
    const range       = `'${sheetName}'!${colLetter}${row}`;
    const existing    = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.SHEET_ID, range });
    const existingVal = existing.data.values?.[0]?.[0] || '';
    updates.push({ range, values: [[existingVal ? `${existingVal}\n\n${entry}` : entry]] });

    // Write to Feedback Log sheet
    const logSheet = '📝 Feedback Log';
    const [nameRes, roleRes, deptRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.SHEET_ID, range: `'${sheetName}'!B${row}` }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.SHEET_ID, range: `'${sheetName}'!P${row}` }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.SHEET_ID, range: `'${sheetName}'!O${row}` }),
    ]);
    const candidateName = nameRes.data.values?.[0]?.[0] || '';
    const candidateRole = roleRes.data.values?.[0]?.[0] || '';
    const candidateDept = deptRes.data.values?.[0]?.[0] || '';
    const stageLabel    = stage ? stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';

    // Write remarks to Master Tracker
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
    });

    // Append row to Feedback Log
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: `'${logSheet}'!A:K`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[
        timestamp,
        session.name || session.email,
        candidateName,
        candidateRole,
        candidateDept,
        stageLabel,
        notes || '',
        scores?.acumen || '',
        scores?.intel  || '',
        scores?.hunger || '',
        '',
      ]] },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, updatedRow: row, updatedBy: session.email }),
    };

  } catch (err) {
    console.error('Feedback error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
