const { jwtVerify } = require('jose');

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || '');
const IS_DEV = process.env.NEXTAUTH_URL?.includes('localhost');

async function getSession(event) {
  if (IS_DEV) return { email: 'arth.mohan@peepalconsulting.com', name: 'Arth Mohan' };

  const cookie = event.headers.cookie || '';
  const match = cookie.match(/peepal_session=([^;]+)/);
  if (!match) return null;

  try {
    const { payload } = await jwtVerify(match[1], SECRET);
    return payload;
  } catch {
    return null;
  }
}

module.exports = { getSession, IS_DEV };
