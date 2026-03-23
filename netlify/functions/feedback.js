// netlify/functions/feedback.js
// POST — writes scores + notes back to candidate row in sheet

const { jwtVerify } = require('jose');
const { google }    = require('googleapis');

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

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

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  const session = await getSession(event);
  if (!session) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorised' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { row, stage, notes, scores } = JSON.parse(event.body || '{}');

  if (!row || row < 4) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid row number' }) };
  }

  if (!notes && !scores?.acumen && !scores?.intel && !scores?.hunger) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No data to update' }) };
  }

  const sheetName = process.env.MASTER_SHEET_NAME || 'Master Tracker';

  try {
    const sheets  = getSheetClient();
    const updates = [];

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

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
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
