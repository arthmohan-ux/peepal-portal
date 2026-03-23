// netlify/functions/email.js
// POST — sends dossier email via SendGrid

const { jwtVerify } = require('jose');

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
const IS_DEV = process.env.NEXTAUTH_URL?.includes('localhost');

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

const DEPT_ACCENT = {
  'TA': '#3949AB', 'BD': '#1565C0', 'Central Marketing': '#6A1B9A',
  'TAD': '#2E7D32', 'HR': '#F57F17', "Founder's Office": '#AD1457',
};
const DEPT_BG = {
  'TA': '#E8EAF6', 'BD': '#E3F2FD', 'Central Marketing': '#F3E5F5',
  'TAD': '#E8F5E9', 'HR': '#FFF9C4', "Founder's Office": '#FCE4EC',
};

// ── FEEDBACK PARSER (mirrors candidate.js) ──
function parseFeedbackEntries(remarks) {
  if (!remarks) return { entries: [], legacy: '' };
  const entries = [];
  const parts = remarks.split(/\n\n(?=\[)/);
  let legacy = '';
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith('[')) { legacy += (legacy ? '\n' : '') + trimmed; continue; }
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
    if (scoresRaw) { scoresRaw.split('·').forEach(s => { const [k,v] = s.split(':').map(x=>x.trim()); if(k&&v) scores[k]=v; }); }
    entries.push({ stage, date, author, notes, scores });
  }
  return { entries: entries.reverse(), legacy };
}

function buildEmailHtml({ candidate, stage, customMsg, includeProfile=true, includeFeedback=true, includeScores=true, sentBy }) {
  const DEPT_ACCENT = {'TA':'#3949AB','BD':'#1565C0','Central Marketing':'#6A1B9A','TAD':'#2E7D32','HR':'#F57F17',"Founder's Office":'#AD1457'};
  const DEPT_BG = {'TA':'#E8EAF6','BD':'#E3F2FD','Central Marketing':'#F3E5F5','TAD':'#E8F5E9','HR':'#FFF9C4',"Founder's Office":'#FCE4EC'};
  const accent = DEPT_ACCENT[candidate.department] || '#283593';
  const bg     = DEPT_BG[candidate.department]     || '#F5F5F5';

  const stageLabel = stage === 'all_rounds'
    ? 'Full Dossier — All Rounds'
    : stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const subject = `[${stageLabel}] ${candidate.name} — ${candidate.role} | Peepal Consulting`;

  const profileRows = includeProfile ? [
    ['Recruiter', candidate.recruiter], ['Manager', candidate.manager],
    ['Status', candidate.status], ['Experience', candidate.experience],
    ['Notice Period', candidate.noticePeriod], ['Last CTC', candidate.lastCtc],
    ['Expected CTC', candidate.expectedCtc], ['Location', candidate.location],
    ['Education', candidate.education],
  ].filter(([,v]) => v).map(([k,v]) => `
    <tr>
      <td style="padding:8px 12px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;width:40%;border-bottom:1px solid #eee">${k}</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155;border-bottom:1px solid #eee">${v}</td>
    </tr>`).join('') : '';

  const profileSection = includeProfile ? `
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;margin-bottom:20px;">
      ${profileRows}
    </table>` : '';

  const aptitudeSection = candidate.aptitudeScore ? `
    <div style="background:${bg};border-radius:8px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <span style="font-size:11px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px">Aptitude Score</span>
      <span style="font-size:20px;font-weight:800;color:#1A1A2E">${candidate.aptitudeScore}</span>
    </div>` : '';

  const { entries, legacy } = parseFeedbackEntries(candidate.remarks || '');
  const feedbackSection = includeFeedback && (entries.length > 0 || legacy) ? `
    <h3 style="font-size:11px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px;margin:0 0 10px">Feedback History</h3>
    ${legacy ? `<div style="background:#FFFBEB;border-left:3px solid #FCD34D;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:10px;font-size:11px;color:#334155;line-height:1.6">${legacy.replace(/\n/g,'<br>')}</div>` : ''}
    ${entries.map(e => `
      <div style="background:#f8fafc;border-radius:8px;padding:12px;border-left:3px solid ${accent};margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:4px">
          <span style="font-size:10px;font-weight:800;color:${accent};text-transform:uppercase">${e.stage}</span>
          <span style="font-size:10px;color:#94a3b8">by ${e.author} · ${e.date}</span>
        </div>
        ${includeScores && Object.keys(e.scores).length > 0 ? `
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
          ${Object.entries(e.scores).map(([k,v]) => `<span style="background:#EEF2FF;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:800;color:#4338CA">${k}: ${v}</span>`).join('')}
        </div>` : ''}
        ${e.notes ? `<p style="font-size:11px;line-height:1.6;color:#334155;margin:0">${e.notes.replace(/\n/g,'<br>')}</p>` : ''}
      </div>`).join('')}` : '';

  const customMsgSection = customMsg ? `
    <div style="background:#FFF8E1;border-left:3px solid #FFC107;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#334155">
      ${customMsg.replace(/\n/g,'<br>')}
    </div>` : '';

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
    ${customMsgSection}
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#1A1A2E">${candidate.name}</h2>
    <p style="margin:0 0 16px;font-size:12px;color:#64748b">${candidate.role} · ${candidate.department}</p>
    ${aptitudeSection}
    ${profileSection}
    ${feedbackSection}
    ${candidate.resumeLink ? `<a href="${candidate.resumeLink}" style="display:inline-block;background:${accent};color:white;padding:10px 20px;border-radius:8px;font-size:11px;font-weight:800;text-decoration:none;text-transform:uppercase">View Resume →</a>` : ''}
  </div>
  <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:10px;color:#94a3b8">Sent by <strong>${sentBy}</strong> via Peepal Hiring Portal · ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</p>
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

  const { candidate, stage, subject: customSubject, customMsg, includeProfile, includeFeedback, includeScores, to, cc } = JSON.parse(event.body || '{}');

  if (!candidate || !stage || !to || to.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  try {
    const { subject, html } = buildEmailHtml({
      candidate, stage, customMsg, includeProfile, includeFeedback, includeScores,
      sentBy: session.name || session.email,
    });

    const finalSubject = customSubject || subject;
    const fromEmail = process.env.GMAIL_SENDER || 'arth.mohan@peepalconsulting.com';

    // Send via SendGrid
    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: to.map(email => ({ email })), ...(cc?.length ? { cc: cc.map(email => ({ email })) } : {}) }],
        from: { email: fromEmail, name: 'Peepal Hiring Portal' },
        subject: finalSubject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!sgRes.ok) {
      const errText = await sgRes.text();
      throw new Error(`SendGrid error ${sgRes.status}: ${errText}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sentTo: to, sentCc: cc || [], subject: finalSubject }),
    };

  } catch (err) {
    console.error('Email error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
