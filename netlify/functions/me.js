// netlify/functions/me.js
// GET — returns the logged-in user's email and name from session

const { jwtVerify } = require('jose');

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
const IS_DEV = process.env.NEXTAUTH_URL?.includes('localhost');

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (IS_DEV) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ email: 'arth.mohan@peepalconsulting.com', name: 'Arth Mohan' }),
    };
  }

  const cookie = event.headers.cookie || '';
  const match  = cookie.match(/peepal_session=([^;]+)/);
  if (!match) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorised' }) };

  try {
    const { payload } = await jwtVerify(match[1], SECRET);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ email: payload.email, name: payload.name }),
    };
  } catch {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorised' }) };
  }
};