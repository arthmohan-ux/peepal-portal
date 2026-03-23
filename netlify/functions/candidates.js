// netlify/functions/candidates.js
// GET — reads all rows from Master Tracker sheet

const { jwtVerify } = require('jose');
const { google }    = require('googleapis');

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

const COLS = {
  SOURCING_DATE: 0, NAME: 1, RESUME_LINK: 2, LINKEDIN: 3, CONTACT: 4,
  EMAIL: 5, LOCATION: 6, EDUCATION: 7, EXPERIENCE: 8, NOTICE_PERIOD: 9,
  OFFER_IN_HAND: 10, REASON_FOR_CHANGE: 11, LAST_CTC: 12, EXPECTED_CTC: 13,
  DEPARTMENT: 14, ROLE: 15, RECRUITER: 16, MANAGER: 17, STATUS: 18,
  REMARKS: 19, APTITUDE_DATE: 20, APTITUDE_SCORE: 21, ASSESSMENT_DATE: 22,
  MANAGER_ROUND_DATE: 23, KAVERI_ROUND_DATE: 24, VIJAY_ROUND_DATE: 25,
  OFFERED_DATE: 26, JOINING_DATE: 27,
};

const IS_DEV = process.env.NEXTAUTH_URL?.includes('localhost');

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
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

function rowToCandidate(row, rowIndex) {
  const get = (col) => {
    const val = row[col];
    return val !== undefined && val !== '' ? String(val).trim() : null;
  };
  return {
    _row: rowIndex + 4,
    sourcingDate: get(COLS.SOURCING_DATE), name: get(COLS.NAME),
    resumeLink: get(COLS.RESUME_LINK), linkedin: get(COLS.LINKEDIN),
    contact: get(COLS.CONTACT), email: get(COLS.EMAIL),
    location: get(COLS.LOCATION), education: get(COLS.EDUCATION),
    experience: get(COLS.EXPERIENCE), noticePeriod: get(COLS.NOTICE_PERIOD),
    offerInHand: get(COLS.OFFER_IN_HAND), reasonForChange: get(COLS.REASON_FOR_CHANGE),
    lastCtc: get(COLS.LAST_CTC), expectedCtc: get(COLS.EXPECTED_CTC),
    department: get(COLS.DEPARTMENT), role: get(COLS.ROLE),
    recruiter: get(COLS.RECRUITER), manager: get(COLS.MANAGER),
    status: get(COLS.STATUS), remarks: get(COLS.REMARKS),
    aptitudeDate: get(COLS.APTITUDE_DATE), aptitudeScore: get(COLS.APTITUDE_SCORE),
    assessmentDate: get(COLS.ASSESSMENT_DATE), managerRoundDate: get(COLS.MANAGER_ROUND_DATE),
    kaveriRoundDate: get(COLS.KAVERI_ROUND_DATE), vijayRoundDate: get(COLS.VIJAY_ROUND_DATE),
    offeredDate: get(COLS.OFFERED_DATE), joiningDate: get(COLS.JOINING_DATE),
  };
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const session = await getSession(event);
  if (!session) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorised' }) };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const sheets    = getSheetClient();
    const sheetName = process.env.MASTER_SHEET_NAME || 'Master Tracker';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `'${sheetName}'!A4:AB`,
    });

    const rows = response.data.values || [];
    const candidates = rows
      .map((row, i) => rowToCandidate(row, i))
      .filter(c => c.name && c.name.length > 0);

    return {
      statusCode: 200,
      headers: { ...headers, 'Cache-Control': 'no-store' },
      body: JSON.stringify({ success: true, count: candidates.length, candidates }),
    };

  } catch (err) {
    console.error('Candidates error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
