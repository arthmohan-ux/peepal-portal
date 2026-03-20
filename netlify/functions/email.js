// netlify/functions/email.js
// POST — sends dossier email via Gmail API

const { jwtVerify } = require('jose');
const { google }    = require('googleapis');

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

async function getSession(event) {
  const cookie = event.headers.cookie || '';
  const match  = cookie.match(/peepal_session=([^;]+)/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], SECRET);
    return payload;
  } catch { return null; }
}

function getGmailClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    subject: process.env.GMAIL_SENDER,
  });
  return google.gmail({ version: 'v1', auth });
}

const DEPT_ACCENT = {
  'TA': '#3949AB', 'BD': '#1565C0', 'Central Marketing': '#6A1B9A',
  'TAD': '#2E7D32', 'HR': '#F57F17', "Founder's Office": '#AD1457',
};
const DEPT_BG = {
  'TA': '#E8EAF6', 'BD': '#E3F2FD', 'Central Marketing': '#F3E5F5',
  'TAD': '#E8F5E9', 'HR': '#FFF9C4', "Founder's Office": '#FCE4EC',
};

function buildEmailHtml({ candidate, stage, feedback, scores, sentBy }) {
  const accent = DEPT_ACCENT[candidate.department] || '#283593';
  const bg     = DEPT_BG[candidate.department]     || '#F5F5F5';
  const stageLabel = stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const subject    = `[${stageLabel}] ${candidate.name} — ${candidate.role} | Peepal Consulting`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
<div style="max-width:620px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:#1A1A2E;padding:24px 28px;">
    <p style="margin:0;color:#A0A8C8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Peepal Consulting — Hiring Portal</p>
    <h1 style="margin:6px 0 0;color:white;font-size:20px;font-weight:800">${stageLabel} Dossier</h1>
  </div>
  <div style="background:${bg};padding:12px 28px;border-left:5px solid ${accent};">
    <span style="font-size:11px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px">${candidate.department || ''}</span>
  </div>
  <div style="padding:24px 28px;">
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#1A1A2E">${candidate.name}</h2>
    <p style="margin:0 0 20px;font-size:12px;color:#64748b">${candidate.role} · ${candidate.department}</p>
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:8px 12px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;width:40%;border-bottom:1px solid #eee">Recruiter</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155;border-bottom:1px solid #eee">${candidate.recruiter || '—'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;border-bottom:1px solid #eee">Manager</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155;border-bottom:1px solid #eee">${candidate.manager || '—'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;border-bottom:1px solid #eee">Status</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155;border-bottom:1px solid #eee">${candidate.status || '—'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;border-bottom:1px solid #eee">Experience</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155;border-bottom:1px solid #eee">${candidate.experience || '—'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;border-bottom:1px solid #eee">Notice Period</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155;border-bottom:1px solid #eee">${candidate.noticePeriod || '—'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;border-bottom:1px solid #eee">Last CTC</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155;border-bottom:1px solid #eee">${candidate.lastCtc || '—'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Expected CTC</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155">${candidate.expectedCtc || '—'}</td></tr>
    </table>
    ${scores && (scores.acumen || scores.intel || scores.hunger) ? `
    <h3 style="font-size:11px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Round Scores</h3>
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:8px 12px;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">Business Acumen</td><td style="padding:8px 12px;font-size:12px;font-weight:800;color:${accent};border-bottom:1px solid #eee">${scores.acumen || '—'} / 5</td></tr>
      <tr><td style="padding:8px 12px;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">Intelligence</td><td style="padding:8px 12px;font-size:12px;font-weight:800;color:${accent};border-bottom:1px solid #eee">${scores.intel || '—'} / 5</td></tr>
      <tr><td style="padding:8px 12px;font-size:12px;color:#555;font-weight:600">Hunger / Drive</td><td style="padding:8px 12px;font-size:12px;font-weight:800;color:${accent}">${scores.hunger || '—'} / 5</td></tr>
    </table>` : ''}
    ${candidate.aptitudeScore ? `<div style="background:${bg};border-radius:8px;padding:12px 16px;margin-bottom:20px;"><span style="font-size:11px;font-weight:800;color:${accent};text-transform:uppercase">Aptitude Score</span><span style="font-size:20px;font-weight:800;color:#1A1A2E;margin-left:12px">${candidate.aptitudeScore}</span></div>` : ''}
    <h3 style="font-size:11px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">${stageLabel} Feedback</h3>
    <div style="background:#f8fafc;border-radius:8px;padding:16px;border-left:4px solid ${accent};font-size:13px;line-height:1.7;color:#334155;margin-bottom:20px;">${feedback ? feedback.replace(/\n/g, '<br>') : '<em style="color:#94a3b8">No feedback provided</em>'}</div>
    ${candidate.remarks ? `<h3 style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin:0 0 8px">Previous Notes</h3><div style="background:#fafafa;border-radius:8px;padding:16px;font-size:12px;line-height:1.6;color:#64748b;margin-bottom:20px;">${candidate.remarks.replace(/\n/g, '<br>')}</div>` : ''}
    ${candidate.resumeLink ? `<a href="${candidate.resumeLink}" style="display:inline-block;background:${accent};color:white;padding:10px 20px;border-radius:8px;font-size:11px;font-weight:800;text-decoration:none;text-transform:uppercase">View Resume →</a>` : ''}
  </div>
  <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:10px;color:#94a3b8">Sent by <strong>${sentBy}</strong> via Peepal Hiring Portal · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
  </div>
</div></body></html>`;

  return { subject, html };
}

function encodeEmail({ to, cc, subject, html }) {
  const toStr = Array.isArray(to) ? to.join(', ') : to;
  const ccStr = cc && cc.length > 0 ? (Array.isArray(cc) ? cc.join(', ') : cc) : null;
  const from  = `Peepal Hiring Portal <${process.env.GMAIL_SENDER}>`;
  const raw   = [
    `From: ${from}`, `To: ${toStr}`,
    ccStr ? `Cc: ${ccStr}` : null,
    `Subject: ${subject}`, 'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8', '', html,
  ].filter(Boolean).join('\r\n');
  return Buffer.from(raw).toString('base64url');
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

  const { candidate, stage, feedback, scores, to, cc } = JSON.parse(event.body || '{}');

  if (!candidate || !stage || !to || to.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  try {
    const { subject, html } = buildEmailHtml({
      candidate, stage, feedback, scores,
      sentBy: session.name || session.email,
    });

    const gmail   = getGmailClient();
    const encoded = encodeEmail({ to, cc, subject, html });

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sentTo: to, sentCc: cc || [], subject }),
    };

  } catch (err) {
    console.error('Email error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
