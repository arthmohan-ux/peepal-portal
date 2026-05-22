// netlify/functions/admin-page.js
// Serves /admin — restricted to ADMIN_EMAILS only

const { jwtVerify } = require('jose');
const fs   = require('fs');
const path = require('path');
const { getRuntimeAccessConfig, normalizeEmail } = require('../lib/access');

const SECRET     = new TextEncoder().encode(process.env.SESSION_SECRET);
const IS_DEV     = process.env.NEXTAUTH_URL?.includes('localhost');

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

exports.handler = async (event) => {
  const session = await getSession(event);

  if (!session) {
    return { statusCode: 302, headers: { Location: '/login?redirect=/admin' }, body: '' };
  }

  const accessConfig = await getRuntimeAccessConfig();
  const adminEmails = accessConfig.adminEmails.map(normalizeEmail);

  if (!adminEmails.includes(normalizeEmail(session.email))) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F8FAFC">
        <div style="text-align:center;padding:40px;max-width:400px">
          <div style="font-size:48px;margin-bottom:16px">🔒</div>
          <h2 style="color:#1A1A2E;margin:0 0 8px;font-size:20px">Access Denied</h2>
          <p style="color:#64748B;margin:0 0 24px;font-size:13px">You don't have permission to access the admin panel.</p>
          <a href="/dashboard" style="background:#4F46E5;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Back to Dashboard</a>
        </div>
      </body></html>`,
    };
  }

  const htmlPath = path.join(__dirname, 'admin.html');
  const html     = fs.readFileSync(htmlPath, 'utf8');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    body: html,
  };
};
